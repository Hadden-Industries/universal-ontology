"""Loading and self-checking the canonical policy graph."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

import pyshacl
from rdflib import RDF, SH, Graph, Literal, URIRef

from .modules import PolicyDefinitionError
from .namespaces import (
    CONTEXT_SHAPES_FILENAME,
    POLICY_DIRECTORY,
    POLICY_METADATA_SHAPES_FILENAME,
    RULE_FILENAMES,
    UOP,
)


@dataclass(frozen=True)
class Policy:
    directory: Path
    rules: Graph
    context_shapes: Graph
    metadata_shapes: Graph
    identity: str

    def requirement_ids(self) -> dict[URIRef, str]:
        """Stable requirement identifier by shape/clause node."""
        return {node: str(value) for node, value in self.rules.subject_objects(UOP.requirementId)}

    def requirement_for_shape(self, shape) -> URIRef | None:
        """Resolve a result's source shape to the requirement that owns it."""
        if (shape, UOP.requirementId, None) in self.rules:
            return shape
        for owner in self.rules.subjects(SH.property, shape):
            if (owner, UOP.requirementId, None) in self.rules:
                return owner
        for owner in self.rules.subjects(SH.node, shape):
            if (owner, UOP.requirementId, None) in self.rules:
                return owner
        return None


def _read(directory: Path, filename: str, *, required: bool) -> bytes | None:
    path = directory / filename
    if not path.is_file():
        if required:
            raise PolicyDefinitionError(f"Policy file is missing: {path}")
        return None
    return path.read_bytes()


def load_policy(policy_directory: Path = POLICY_DIRECTORY) -> Policy:
    """Parse the policy files, prove the policy graph's own contract, then return it.

    A policy that fails Meta-SHACL or the documentary metadata contract is a
    policy-definition error: it cannot silently produce fewer executed rules.
    """
    rules = Graph()
    digest = hashlib.sha256()
    for filename in RULE_FILENAMES:
        raw = _read(policy_directory, filename, required=filename == RULE_FILENAMES[0])
        if raw is None:
            continue
        digest.update(filename.encode("utf-8") + b"\0" + raw + b"\0")
        try:
            rules.parse(data=raw, format="turtle")
        except Exception as exc:
            raise PolicyDefinitionError(f"{filename}: {type(exc).__name__}: {exc}") from exc
    context_shapes = Graph().parse(data=_read(policy_directory, CONTEXT_SHAPES_FILENAME, required=True), format="turtle")
    metadata_shapes = Graph().parse(data=_read(policy_directory, POLICY_METADATA_SHAPES_FILENAME, required=True), format="turtle")
    for graph_name in (CONTEXT_SHAPES_FILENAME, POLICY_METADATA_SHAPES_FILENAME):
        digest.update(graph_name.encode("utf-8") + b"\0" + (policy_directory / graph_name).read_bytes() + b"\0")
    policy = Policy(policy_directory, rules, context_shapes, metadata_shapes, "sha256:" + digest.hexdigest())
    _prove_policy_contract(policy)
    return policy


def _prove_policy_contract(policy: Policy) -> None:
    conforms, _, text = pyshacl.validate(
        policy.rules, shacl_graph=policy.metadata_shapes, advanced=True, meta_shacl=True, inference="none"
    )
    if not conforms:
        raise PolicyDefinitionError(f"Policy metadata contract failed:\n{text}")
    ids = list(policy.rules.objects(None, UOP.requirementId))
    duplicates = sorted({str(value) for value in ids if ids.count(value) > 1})
    if duplicates:
        raise PolicyDefinitionError(f"Duplicate requirement identifiers: {duplicates}")
    _reject_unsupported_vocabulary(policy.rules)


# A misspelled SHACL predicate would otherwise document a rule that never executes.
_SHACL_NAMESPACE = str(SH)


def _shacl_vocabulary() -> set[URIRef]:
    """Terms the SHACL vocabulary shipped with pySHACL defines (shacl.ttl)."""
    graph = Graph().parse(Path(pyshacl.__file__).parent / "assets" / "shacl.ttl", format="turtle")
    return {subject for subject in graph.subjects() if isinstance(subject, URIRef) and str(subject).startswith(_SHACL_NAMESPACE)}


def _reject_unsupported_vocabulary(rules: Graph) -> None:
    vocabulary = _shacl_vocabulary()
    unknown = set()
    for _, predicate, obj in rules:
        for term in (predicate, obj):
            if isinstance(term, URIRef) and str(term).startswith(_SHACL_NAMESPACE) and term not in vocabulary:
                unknown.add(str(term))
    if unknown:
        raise PolicyDefinitionError(f"Unknown SHACL vocabulary in policy (typo?): {sorted(unknown)}")
