"""Extract complete RDF characteristics without depending on parser node labels.

Named resources retain their IRIs. Anonymous nodes receive document-local numeric
references, assigned from RDFLib's canonical graph, never public rule anchors.
Literal lexical values, datatypes and language tags remain distinct. The table
preserves shared and cyclic anonymous structures rather than flattening them.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter

from rdflib import RDF, SH, BNode, Graph, Literal, URIRef
from rdflib.compare import to_canonical_graph

from .documentation_model import (
    DocumentationModel,
    DocumentationObligation,
    DocumentationRule,
)
from .namespaces import RULE_FILENAMES, UOP
from .policy import Policy


def english_text(graph: Graph, subject, predicate) -> str:
    """Select a deterministic English display value without dropping other literals."""
    values = sorted(
        graph.objects(subject, predicate),
        key=lambda value: (str(getattr(value, "language", "") or ""), str(value)),
    )
    english = [
        value
        for value in values
        if isinstance(value, Literal)
        and (value.language or "").lower().startswith("en")
    ]
    return str((english or values)[0]) if values else ""


def documentation_order(graph: Graph, subject) -> int:
    """Use the canonical SHACL presentation order and a stable absent fallback."""
    value = graph.value(subject, SH.order)
    return int(value) if value is not None else 1_000_000


def rdf_projection(graph: Graph) -> dict:
    """Encode an RDF graph losslessly with deterministic document-local references."""
    canonical = to_canonical_graph(graph)
    anonymous = sorted(
        {str(t) for triple in canonical for t in triple if isinstance(t, BNode)}
    )
    indices = {node: index for index, node in enumerate(anonymous)}

    def term(value):
        if isinstance(value, BNode):
            return {"anonymous": indices[str(value)]}
        if isinstance(value, Literal):
            return {
                "literal": str(value),
                "datatype": str(value.datatype) if value.datatype else None,
                "language": value.language,
            }
        return {"iri": str(value)}

    triples = [[term(s), term(p), term(o)] for s, p, o in canonical]
    return {
        "triples": sorted(
            triples,
            key=lambda triple: json.dumps(triple, sort_keys=True, ensure_ascii=False),
        )
    }


def rule_graph(policy: Policy, requirement) -> Graph:
    """Include constraints, targets, lists and parts; retain shared authority as IRIs.

    Prefix declarations and group presentation are dependencies of this rule.
    Other primary requirements are references, so unrelated rule edits do not
    stale it. Prefix changes must stale SPARQL-backed guidance as well.
    """
    source = policy.rules
    result = Graph()
    pending = [requirement, *source.subjects(UOP.partOf, requirement)]
    visited = set()
    while pending:
        subject = pending.pop()
        if subject in visited:
            continue
        visited.add(subject)
        for predicate, obj in source.predicate_objects(subject):
            result.add((subject, predicate, obj))
            if predicate == UOP.partOf:
                continue
            if isinstance(obj, (BNode, URIRef)) and (obj, None, None) in source:
                if obj != requirement and (obj, UOP.requirementId, None) in source:
                    continue
                pending.append(obj)
    return result


def extract_documentation(policy: Policy) -> DocumentationModel:
    """Extract every loader-admitted requirement and its complete technical graph."""
    modules = {
        filename: Graph().parse(policy.directory / filename, format="turtle")
        for filename in RULE_FILENAMES
    }
    rules = []
    shared = documentation_context(policy)
    for resource, identifier in sorted(
        policy.requirement_ids().items(), key=lambda entry: entry[1]
    ):
        owners = [
            name
            for name, graph in modules.items()
            if (resource, UOP.requirementId, None) in graph
        ]
        if len(owners) != 1:
            raise ValueError(f"{identifier}: expected exactly one source module")
        graph = rule_graph(policy, resource)
        human = (resource, RDF.type, UOP.HumanClause) in policy.rules
        strength = str(policy.rules.value(resource, UOP.normativeStrength))
        obligations = []
        # These are constraint-local cardinalities, not a clause-wide inference
        # from MUST/SHOULD. Conditional targets and logical expressions remain
        # available in the complete graph and can add further obligations.
        constraints = {
            resource,
            *policy.rules.objects(resource, SH.property),
            *policy.rules.subjects(UOP.partOf, resource),
        }
        for constraint in sorted(
            constraints,
            key=lambda value: json.dumps(
                rdf_projection(_subject_graph(graph, value)), sort_keys=True
            ),
        ):
            minimum = graph.value(constraint, SH.minCount)
            qualified_minimum = graph.value(constraint, SH.qualifiedMinCount)
            maximum = graph.value(constraint, SH.maxCount)
            presence = "not applicable"
            if graph.value(constraint, SH.path) is not None:
                presence = (
                    "required"
                    if (minimum is not None and int(minimum) > 0)
                    or (qualified_minimum is not None and int(qualified_minimum) > 0)
                    or graph.value(constraint, SH.hasValue) is not None
                    else "prohibited"
                    if maximum is not None and int(maximum) == 0
                    else "optional in this constraint"
                )
            elif graph.value(constraint, SH.sparql) is not None:
                presence = "conditional; see target and exact requirement"
            dependencies = (
                ("Trusted ownership and run context; see complete target queries",)
                if any(graph.objects(constraint, SH.target))
                else ()
            )
            obligations.append(
                DocumentationObligation(
                    str(constraint) if isinstance(constraint, URIRef) else None,
                    strength,
                    presence,
                    "human review"
                    if human
                    else "executable; prose may add human obligations",
                    dependencies,
                    None
                    if human
                    else str(graph.value(constraint, SH.severity) or SH.Violation),
                )
            )
        fingerprint_projection = json.dumps(
            rdf_projection(graph),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        projection = json.dumps(
            rdf_projection(graph - shared),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        rules.append(
            DocumentationRule(
                identifier,
                str(resource),
                "policy/" + owners[0],
                english_text(policy.rules, resource, SH.name),
                strength,
                str(policy.rules.value(resource, SH.group)),
                documentation_order(policy.rules, resource),
                human,
                "sha256:"
                + hashlib.sha256(fingerprint_projection.encode("utf-8")).hexdigest(),
                projection,
                tuple(obligations),
            )
        )
    return DocumentationModel(
        policy.identity,
        tuple(rules),
        json.dumps(
            rdf_projection(policy.rules),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ),
        json.dumps(
            rdf_projection(shared),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ),
    )


def documentation_context(policy: Policy) -> Graph:
    """Factor shared root/prefix/group declarations out of repeated rule payloads.

    Fingerprints still include each rule's actual context dependencies. The page
    carries shared declarations once, preserving their meaning without repeating
    the namespace and policy-module inventory under every requirement.
    """
    source = policy.rules
    result = Graph()
    occurrences = Counter()
    for requirement in policy.requirement_ids():
        occurrences.update(rule_graph(policy, requirement))
    for triple, count in occurrences.items():
        if count > 1:
            result.add(triple)
    # Unreachable declarations still belong to the canonical graph. Keeping
    # them here makes whole-graph reconstruction detect omissions as well.
    for triple in source:
        if triple not in occurrences:
            result.add(triple)
    pending = [
        node
        for kind in (UOP.Policy, UOP.PolicyModule, SH.PropertyGroup)
        for node in source.subjects(RDF.type, kind)
    ]
    visited = set()
    while pending:
        node = pending.pop()
        if node in visited:
            continue
        visited.add(node)
        for triple in source.triples((node, None, None)):
            result.add(triple)
            if isinstance(triple[2], BNode):
                pending.append(triple[2])
    # A shared anonymous component must stay in one local-reference table,
    # including incoming edges. Splitting it would duplicate its identity when
    # independently decoded rule blocks are reunited.
    pending = [term for triple in result for term in triple if isinstance(term, BNode)]
    visited = set()
    while pending:
        node = pending.pop()
        if node in visited:
            continue
        visited.add(node)
        for triple in (
            *source.triples((node, None, None)),
            *source.triples((None, None, node)),
        ):
            result.add(triple)
            pending.extend(
                term
                for term in triple
                if isinstance(term, BNode) and term not in visited
            )
    return result


def rule_characteristics_graph(policy: Policy, requirement) -> Graph:
    """Return rule-local payload; shared declarations live in the same document."""
    return rule_graph(policy, requirement) - documentation_context(policy)


def _subject_graph(graph: Graph, subject) -> Graph:
    """Return a subject's anonymous closure for deterministic constraint ordering."""
    result = Graph()
    pending = [subject]
    visited = set()
    while pending:
        node = pending.pop()
        if node in visited:
            continue
        visited.add(node)
        for triple in graph.triples((node, None, None)):
            result.add(triple)
            if isinstance(triple[2], BNode):
                pending.append(triple[2])
    return result
