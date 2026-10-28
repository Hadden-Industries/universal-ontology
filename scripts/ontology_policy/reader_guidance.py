"""Validate separately authored explanations without merging production graphs."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import pyshacl
from rdflib import RDF, Graph, Namespace

from .documentation_model import DocumentationModel
from .namespaces import REPOSITORY_ROOT

DOC = Namespace("urn:universal-ontology:docs:editing-policy:")
GUIDANCE_DIRECTORY = REPOSITORY_ROOT / "docs" / "editing-policy" / "source"


@dataclass(frozen=True)
class ContributorSummary:
    """Reviewed explanatory unit with active requirement references."""

    identifier: str
    title: str
    text: str
    references: tuple[str, ...]
    order: int


def load_guidance(
    model: DocumentationModel, directory: Path = GUIDANCE_DIRECTORY
) -> tuple[ContributorSummary, ...]:
    """Reject invalid, unlinked or stale summaries before rendering any output."""
    try:
        graph = Graph().parse(directory / "reader-guidance.ttl", format="turtle")
        shapes = Graph().parse(
            directory / "reader-guidance-shapes.ttl", format="turtle"
        )
    except Exception as error:
        raise ValueError(f"Invalid reader-guidance metadata: {error}") from error
    conforms, _, report = pyshacl.validate(
        graph, shacl_graph=shapes, inference="none", meta_shacl=True
    )
    if not conforms:
        raise ValueError(f"Reader guidance contract failed: {report}")
    reviews = json.loads(
        (directory / "guidance-reviews.json").read_text(encoding="utf-8")
    )
    if not isinstance(reviews, dict):
        raise ValueError("Guidance reviews must be an object keyed by summary identity")
    fingerprints = model.fingerprints()
    summaries = []
    for node in graph.subjects(RDF.type, DOC.ContributorSummary):
        identifier = str(node).removeprefix(str(DOC))
        references = tuple(
            sorted(
                str(value) for value in graph.objects(node, DOC.referencesRequirement)
            )
        )
        text = str(graph.value(node, DOC.summary)).strip()
        if not set(re.findall(r"\bEP-[A-Z0-9-]+\b", text)) <= set(references):
            raise ValueError(
                f"{identifier}: summary contains an unlinked policy reference"
            )
        expected = {
            identifier: fingerprints.get(identifier) for identifier in references
        }
        if None in expected.values():
            raise ValueError(f"{identifier}: unknown requirement reference")
        if reviews.get(identifier) != expected:
            raise ValueError(
                f"{identifier}: linked policy changed; summary review is stale"
            )
        summaries.append(
            ContributorSummary(
                identifier,
                str(graph.value(node, DOC.title)),
                text,
                references,
                int(graph.value(node, DOC.order)),
            )
        )
    if set(reviews) != {summary.identifier for summary in summaries}:
        raise ValueError("Guidance reviews must match the complete summary inventory")
    return tuple(
        sorted(summaries, key=lambda summary: (summary.order, summary.identifier))
    )
