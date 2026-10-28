"""Immutable documentation projection; canonical RDF remains its only authority."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentationObligation:
    """Independent policy dimensions for one constraint or declared human clause.

    Presence describes this constraint's own property requirement; other scoped
    obligations can impose additional conditions. Context references identify
    dependencies, never an observed evaluation outcome.
    """

    constraint_iri: str | None
    normative_strength: str
    presence: str
    assessment: str
    evaluation_dependencies: tuple[str, ...]
    severity_iri: str | None


@dataclass(frozen=True)
class DocumentationRule:
    """One primary requirement with an independently addressable technical body."""

    identifier: str
    resource_iri: str
    source_module: str
    title: str
    strength: str
    group: str
    order: int
    human: bool
    fingerprint: str
    characteristics_json: str
    obligations: tuple[DocumentationObligation, ...]


@dataclass(frozen=True)
class DocumentationModel:
    """Frozen policy projection used by rendering and preservation checks."""

    policy_identity: str
    rules: tuple[DocumentationRule, ...]
    policy_graph_json: str
    shared_context_json: str

    def fingerprints(self) -> dict[str, str]:
        """Return rule identities for checking reviewed explanatory material."""
        return {rule.identifier: rule.fingerprint for rule in self.rules}
