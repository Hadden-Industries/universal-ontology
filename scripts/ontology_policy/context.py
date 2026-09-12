"""Trusted validation context: run purpose, module identities and ownership facts.

The context is RDF in the reserved ``uoc:`` namespace. Authored ontology data
that uses that namespace is rejected as impersonation before any rule runs.
"""
from __future__ import annotations

from enum import Enum

from rdflib import OWL, RDF, Graph, Literal, URIRef

from .namespaces import UOC, UOP
from .snapshots import InputError, ModuleSource

ENTITY_KINDS = (OWL.Class, OWL.NamedIndividual, OWL.ObjectProperty, OWL.DatatypeProperty)


class RunPurpose(Enum):
    LATEST_ACTIVE = "latest-active"
    CANDIDATE = "candidate"
    DRAFT = "draft"
    CRITICAL_FIX = "critical-fix"

    @property
    def iri(self) -> URIRef:
        return {
            RunPurpose.LATEST_ACTIVE: UOC.LatestActiveQualification,
            RunPurpose.CANDIDATE: UOC.CandidateQualification,
            RunPurpose.DRAFT: UOC.DraftDiagnostics,
            RunPurpose.CRITICAL_FIX: UOC.CriticalHistoricalFix,
        }[self]

    @property
    def qualifies(self) -> bool:
        """Only complete latest-active/candidate runs can produce a qualification result."""
        return self in (RunPurpose.LATEST_ACTIVE, RunPurpose.CANDIDATE)


class ContextError(Exception):
    """Required facts are missing, contradictory or impersonated; exit status 2."""


RESERVED_NAMESPACES = (str(UOC), str(UOP), "https://haddenindustries.com/ontology/policy/authority/")


def reject_context_impersonation(source: ModuleSource) -> None:
    """Authored data may not carry context facts, policy vocabulary or authority membership."""
    for subject, predicate, obj in source.graph:
        for term in (subject, predicate, obj):
            if isinstance(term, URIRef) and str(term).startswith(RESERVED_NAMESPACES):
                raise ContextError(
                    f"{source.locator}: authored data uses a reserved policy namespace ({term}); "
                    "context and authority facts are supplied by the runner only."
                )


def owned_subjects(source: ModuleSource):
    """Owned subjects, the module's own ontology header and its axiom nodes.

    An IRI subject of any triple in this document is owned when it lies in one
    of the module's reviewed namespaces; the asserted type only selects which
    rules apply, so dropping a type can never remove a subject from ownership.
    Axioms are owned when their annotated source is an owned subject; anonymous
    axioms keep their original blank-node identity.
    """
    graph = source.graph
    module = source.module
    owned: set = set()
    for subject in set(graph.subjects()):
        if isinstance(subject, URIRef) and module.owns(subject):
            owned.add(subject)
    for subject in graph.subjects(RDF.type, OWL.Ontology):
        if isinstance(subject, URIRef) and str(subject).rstrip("/") == str(module.ontology_iri).rstrip("/"):
            owned.add(subject)
    for axiom in graph.subjects(RDF.type, OWL.Axiom):
        for annotated in graph.objects(axiom, OWL.annotatedSource):
            if annotated in owned or (isinstance(annotated, URIRef) and module.owns(annotated)):
                owned.add(axiom)
                break
    return owned


def build_validation_graph(
    sources: list[ModuleSource], purpose: RunPurpose, comparisons: dict | None = None
) -> tuple[Graph, Graph]:
    """Assemble the engine input: the union of all module graphs plus the context graph.

    The union is what the engine evaluates, so targets can combine ownership facts
    with asserted types. Blank nodes keep their in-process identity, so anonymous
    axioms are reachable from the context facts that name them. ``comparisons``
    maps a module IRI to the previous ``ModuleSource`` (or ``None`` when no
    comparison exists); change kinds are asserted only where a comparison is
    available, so an absent comparison is visible, never invented.
    """
    from .changes import ChangeKind, classify_changes

    comparisons = comparisons or {}
    if not sources:
        raise ContextError("No module sources were supplied; a nonempty corpus is required.")
    seen = set()
    for source in sources:
        reject_context_impersonation(source)
        if source.module.iri in seen:
            raise ContextError(f"Module {source.module.iri} appears more than once in one run.")
        seen.add(source.module.iri)

    context = Graph()
    run = UOC.run
    context.add((UOC.context, UOC.run, run))
    context.add((run, RDF.type, UOC.Run))
    context.add((run, UOC.purpose, purpose.iri))
    for source in sources:
        module = source.module
        context.add((run, UOC.module, module.iri))
        context.add((module.iri, RDF.type, UOC.Module))
        context.add((module.iri, UOC.ontologyIri, module.ontology_iri))
        for namespace in module.owned_namespaces:
            context.add((module.iri, UOC.ownedNamespace, URIRef(namespace)))
        if module.iso_naming:
            context.add((module.iri, UOC.isoNaming, Literal(True)))
        context.add((module.iri, UOC.sourceDigest, Literal(source.digest)))
        context.add((module.iri, UOC.sourceLocator, Literal(source.locator)))
        for subject in owned_subjects(source):
            context.add((subject, UOC.ownedBy, module.iri))
        previous = comparisons.get(module.iri)
        if previous is None:
            context.add((module.iri, UOC.comparison, UOC.Unavailable))
            continue
        context.add((module.iri, UOC.comparison, UOC.Available))
        context.add((module.iri, UOC.comparedWith, Literal(f"{previous.locator} {previous.digest}")))
        deleted = set()
        for subject, kind in classify_changes(source, previous).items():
            if kind == ChangeKind.DELETED:
                deleted.add(subject)
                context.add((module.iri, UOC.deletedSubject, subject))
            else:
                context.add((subject, UOC.changeKind, {
                    ChangeKind.ADDED: UOC.Added, ChangeKind.CHANGED: UOC.Changed, ChangeKind.UNCHANGED: UOC.Unchanged,
                }[kind]))
        for gone in deleted:
            for referrer in set(source.graph.subjects(None, gone)):
                if isinstance(referrer, URIRef):
                    context.add((referrer, UOC.refersToDeleted, gone))

    union = Graph()
    for source in sources:
        union += source.graph
    union += context
    return union, context
