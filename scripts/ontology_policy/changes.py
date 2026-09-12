"""DEC-016 change facts: rooted closures compared with native RDF isomorphism.

An entity's content is its outgoing assertions, every blank node reachable
from them (restrictions, lists, nested expressions) and its axiom annotations.
Shared anonymous structure belongs to every owner that attaches it; incoming
links alone never change their target. Comparison ignores serialisation,
prefixes, triple order and blank-node labels. These are trusted facts for the
policy; the obligation they trigger lives in SHACL.
"""
from __future__ import annotations

from enum import Enum

from rdflib import OWL, BNode, Graph, URIRef
from rdflib.compare import isomorphic

from .context import owned_subjects
from .snapshots import ModuleSource


class ChangeKind(Enum):
    ADDED = "added"
    CHANGED = "changed"
    DELETED = "deleted"
    UNCHANGED = "unchanged"


def rooted_closure(graph: Graph, root: URIRef) -> Graph:
    """The entity's own structure: outgoing triples, attached blank nodes and its axiom annotations."""
    closure = Graph()
    pending = [root]
    seen = set()
    while pending:
        node = pending.pop()
        if node in seen:
            continue
        seen.add(node)
        for predicate, obj in graph.predicate_objects(node):
            closure.add((node, predicate, obj))
            if isinstance(obj, BNode):
                pending.append(obj)
    for axiom in graph.subjects(OWL.annotatedSource, root):
        for predicate, obj in graph.predicate_objects(axiom):
            closure.add((axiom, predicate, obj))
            if isinstance(obj, BNode) and obj not in seen:
                pending.append(obj)
        # blank nodes attached to the axiom itself
        while pending:
            node = pending.pop()
            if node in seen:
                continue
            seen.add(node)
            for predicate, obj in graph.predicate_objects(node):
                closure.add((node, predicate, obj))
                if isinstance(obj, BNode):
                    pending.append(obj)
    return closure


def _named_roots(source: ModuleSource) -> set[URIRef]:
    return {subject for subject in owned_subjects(source) if isinstance(subject, URIRef)}


def classify_changes(current: ModuleSource, previous: ModuleSource) -> dict[URIRef, ChangeKind]:
    """Classify every owned IRI subject of either snapshot relative to the previous snapshot."""
    current_roots = _named_roots(current)
    previous_roots = _named_roots(previous)
    facts: dict[URIRef, ChangeKind] = {}
    for root in current_roots | previous_roots:
        if root not in previous_roots:
            facts[root] = ChangeKind.ADDED
        elif root not in current_roots:
            facts[root] = ChangeKind.DELETED
        else:
            same = isomorphic(rooted_closure(current.graph, root), rooted_closure(previous.graph, root))
            facts[root] = ChangeKind.UNCHANGED if same else ChangeKind.CHANGED
    return facts
