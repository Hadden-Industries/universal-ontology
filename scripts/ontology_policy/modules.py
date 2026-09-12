"""Reviewed owned modules and their latest active versions (policy/activation.ttl)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rdflib import RDF, RDFS, Graph, URIRef

from .namespaces import ACTIVATION_FILENAME, POLICY_DIRECTORY, UOP


class PolicyDefinitionError(Exception):
    """The policy or activation graph is unusable; exit status 2, never a policy result."""


@dataclass(frozen=True)
class OwnedModule:
    iri: URIRef
    label: str
    ontology_iri: URIRef
    owned_namespaces: tuple[str, ...]
    working_path: str
    active_version_iri: URIRef | None
    active_artifact_path: str | None
    active_content_digest: str | None = None  # sha256 of the activated artifact bytes, recorded at activation
    iso_naming: bool = False

    def owns(self, subject: URIRef) -> bool:
        text = str(subject)
        return any(text.startswith(namespace) for namespace in self.owned_namespaces)


def _single(graph: Graph, subject: URIRef, predicate: URIRef, *, required: bool = True):
    values = list(graph.objects(subject, predicate))
    if len(values) > 1:
        raise PolicyDefinitionError(f"{subject} has {len(values)} values for {predicate}; expected one.")
    if not values:
        if required:
            raise PolicyDefinitionError(f"{subject} lacks {predicate}.")
        return None
    return values[0]


def load_owned_modules(policy_directory: Path = POLICY_DIRECTORY) -> tuple[OwnedModule, ...]:
    """Read the reviewed module registry; every module must be fully described."""
    graph = Graph().parse(policy_directory / ACTIVATION_FILENAME, format="turtle")
    modules = []
    for module_iri in sorted(graph.subjects(RDF.type, UOP.OwnedModule)):
        namespaces = tuple(sorted(str(value) for value in graph.objects(module_iri, UOP.ownedNamespace)))
        if not namespaces:
            raise PolicyDefinitionError(f"{module_iri} declares no owned namespace.")
        active_version = _single(graph, module_iri, UOP.activeVersionIri, required=False)
        active_path = _single(graph, module_iri, UOP.activeArtifactPath, required=False)
        active_digest = _single(graph, module_iri, UOP.activeContentDigest, required=False)
        modules.append(
            OwnedModule(
                iri=module_iri,
                label=str(_single(graph, module_iri, RDFS.label)),
                ontology_iri=URIRef(str(_single(graph, module_iri, UOP.ontologyIri))),
                owned_namespaces=namespaces,
                working_path=str(_single(graph, module_iri, UOP.workingPath)),
                active_version_iri=URIRef(str(active_version)) if active_version is not None else None,
                active_artifact_path=str(active_path) if active_path is not None else None,
                active_content_digest=str(active_digest) if active_digest is not None else None,
                iso_naming=bool(_single(graph, module_iri, UOP.isoNaming, required=False) or False),
            )
        )
    if not modules:
        raise PolicyDefinitionError(f"{ACTIVATION_FILENAME} declares no owned modules.")
    return tuple(modules)


def module_for_working_path(modules: tuple[OwnedModule, ...], path: str) -> OwnedModule | None:
    normalized = path.replace("\\", "/")
    for module in modules:
        if module.working_path == normalized or module.active_artifact_path == normalized:
            return module
    return None
