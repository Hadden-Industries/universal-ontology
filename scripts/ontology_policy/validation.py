"""Execute the canonical policy against exact module sources with the native engine."""
from __future__ import annotations

from dataclasses import dataclass, field

from pathlib import Path

import pyshacl
from rdflib import Graph

from .authorities import AUTHORITIES_DIRECTORY, AuthorityError, authority_identities, load_authority_graph
from .context import ContextError, RunPurpose, build_validation_graph
from .namespaces import UOP
from .modules import PolicyDefinitionError
from .policy import Policy, load_policy
from .reports import PolicyResult, extract_results
from .snapshots import InputError, ModuleSource

STATUS_SUCCESS = 0
STATUS_VIOLATIONS = 1
STATUS_ERROR = 2


@dataclass(frozen=True)
class ValidationOutcome:
    purpose: RunPurpose
    policy_identity: str
    module_identities: tuple[tuple[str, str, str], ...]  # (module IRI, locator, digest)
    conforms: bool
    results: tuple[PolicyResult, ...]
    results_graph: Graph = field(compare=False, repr=False)
    targeted_focus_count: int = 0
    authority_identities: tuple[tuple[str, str], ...] = ()

    @property
    def violations(self) -> tuple[PolicyResult, ...]:
        return tuple(result for result in self.results if result.blocks)

    @property
    def warnings(self) -> tuple[PolicyResult, ...]:
        return tuple(result for result in self.results if not result.blocks)

    @property
    def status(self) -> int:
        """0: required checks succeeded without blockers; 1: MUST violations; 2: error (raised, never returned)."""
        return STATUS_VIOLATIONS if self.violations else STATUS_SUCCESS

    @property
    def qualifies(self) -> bool:
        """Only a complete qualification purpose without blockers can qualify activation."""
        return self.purpose.qualifies and self.status == STATUS_SUCCESS


def _prove_context(context: Graph, policy: Policy) -> None:
    conforms, _, text = pyshacl.validate(context, shacl_graph=policy.context_shapes, advanced=True, inference="none")
    if not conforms:
        raise ContextError(f"Validation context is invalid:\n{text}")


def required_authorities(policy: Policy) -> tuple[str, ...]:
    return tuple(sorted(str(name) for name in policy.rules.objects(None, UOP.snapshotName)))


def validate_sources(
    sources: list[ModuleSource], purpose: RunPurpose, policy: Policy | None = None,
    authorities_directory: Path = AUTHORITIES_DIRECTORY,
) -> ValidationOutcome:
    """Validate the complete supplied corpus; every owned subject receives every static rule.

    Raises ``ContextError``, ``InputError``, ``AuthorityError`` or
    ``PolicyDefinitionError`` for status 2 conditions rather than reporting
    them as (non-)conformance.
    """
    policy = policy or load_policy()
    data, context = build_validation_graph(sources, purpose)
    _prove_context(context, policy)
    required = required_authorities(policy)
    if required:
        data += load_authority_graph(authorities_directory, required)
    try:
        conforms, results_graph, _ = pyshacl.validate(
            data, shacl_graph=policy.rules, advanced=True, inference="none", allow_warnings=False
        )
    except Exception as exc:  # engine failure is an error, never a pass
        raise PolicyDefinitionError(f"SHACL engine failure: {type(exc).__name__}: {exc}") from exc
    results = tuple(extract_results(results_graph, policy))
    targeted = _count_targeted(data, policy)
    if targeted == 0:
        raise ContextError("The policy selected zero focus nodes from a nonempty corpus; ownership or targets are broken.")
    return ValidationOutcome(
        purpose=purpose,
        policy_identity=policy.identity,
        module_identities=tuple((str(s.module.iri), s.locator, s.digest) for s in sources),
        authority_identities=authority_identities(authorities_directory, required) if required else (),
        conforms=conforms and not results,
        results=results,
        results_graph=results_graph,
        targeted_focus_count=targeted,
    )


def _count_targeted(data: Graph, policy: Policy) -> int:
    """Independent count of owned entity focus nodes, used to refuse zero-target success."""
    from .context import ENTITY_KINDS
    from .namespaces import UOC
    from rdflib import RDF

    owned = set(data.subjects(UOC.ownedBy, None))
    return sum(1 for subject in owned if any((subject, RDF.type, kind) in data for kind in ENTITY_KINDS))


__all__ = [
    "AuthorityError",
    "ContextError",
    "InputError",
    "PolicyDefinitionError",
    "RunPurpose",
    "STATUS_ERROR",
    "STATUS_SUCCESS",
    "STATUS_VIOLATIONS",
    "ValidationOutcome",
    "validate_sources",
]
