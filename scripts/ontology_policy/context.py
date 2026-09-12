"""Trusted validation context: run purpose, module identities and ownership facts.

The context is RDF in the reserved ``uoc:`` namespace. Authored ontology data
that uses that namespace is rejected as impersonation before any rule runs.
"""
from __future__ import annotations

from enum import Enum

from rdflib import OWL, RDF, Graph, Literal, URIRef

from .namespaces import UOC
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


def reject_context_impersonation(source: ModuleSource) -> None:
    namespace = str(UOC)
    for subject, predicate, obj in source.graph:
        for term in (subject, predicate, obj):
            if isinstance(term, URIRef) and str(term).startswith(namespace):
                raise ContextError(
                    f"{source.locator}: authored data uses the reserved context namespace ({term}); "
                    "context facts are supplied by the runner only."
                )


def owned_subjects(source: ModuleSource):
    """Owned entities, the module's own ontology header and its axiom nodes.

    Ownership of an IRI subject is its declared type in this document plus the
    module's reviewed namespaces. Axioms are owned when their annotated source is
    an owned subject; anonymous axioms keep their original blank-node identity.
    """
    graph = source.graph
    module = source.module
    owned: set = set()
    for kind in ENTITY_KINDS:
        for subject in graph.subjects(RDF.type, kind):
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


def build_validation_graph(sources: list[ModuleSource], purpose: RunPurpose) -> tuple[Graph, Graph]:
    """Assemble the engine input: the union of all module graphs plus the context graph.

    The union is what the engine evaluates, so targets can combine ownership facts
    with asserted types. Blank nodes keep their in-process identity, so anonymous
    axioms are reachable from the context facts that name them.
    """
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

    union = Graph()
    for source in sources:
        union += source.graph
    union += context
    return union, context
