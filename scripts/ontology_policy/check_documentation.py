"""Fail closed on projection loss and identified historical-snapshot drift."""

from __future__ import annotations

import hashlib
import json
import re

from rdflib import URIRef

from .documentation_extract import (
    documentation_context,
    rdf_projection,
    rule_characteristics_graph,
)
from .documentation_model import DocumentationModel
from .namespaces import REPOSITORY_ROOT
from .policy import Policy

ARCHIVE = REPOSITORY_ROOT / "docs" / "reviews" / "editing-policy-design"


def preservation_report(
    policy: Policy, model: DocumentationModel, markdown: str
) -> dict:
    """Compare actual output fields to source and recheck the frozen migration bytes.

    The original report's mismatched digest remains a historical uncertainty.
    This check establishes preservation of the identified retained snapshot only.
    """
    baseline = json.loads(
        (
            REPOSITORY_ROOT / "docs/editing-policy/source/baseline-policy-docs.json"
        ).read_text(encoding="utf-8")
    )
    raw = (ARCHIVE / "verification/source-snapshot.md").read_bytes()
    if hashlib.sha256(raw).hexdigest() != baseline["sourceSha256"]:
        raise ValueError("Historical policy snapshot bytes changed")
    technical = markdown.split("## Technical reference\n", 1)[1]
    blocks = [
        re.sub(r"^#{2,3} ", "", block)
        for block in re.split(r"\n\s*\n", raw.decode("utf-8").strip())
        if not block.startswith("# ")
    ]
    missing_blocks = [block for block in blocks if block not in technical]
    headings = re.findall(r"^### (EP-[A-Z0-9-]+)$", technical, re.M)
    expected = set(policy.requirement_ids().values())
    missing = sorted(expected - set(headings))
    duplicates = sorted(
        {identifier for identifier in headings if headings.count(identifier) != 1}
    )
    unrepresented = []
    shared_section = technical.split("**Shared policy metadata and prefixes:**\n", 1)[
        1
    ].split("\n### EP-", 1)[0]
    shared_matches = re.findall(r"```json\n(.*?)\n```", shared_section, re.S)
    if len(shared_matches) != 1 or json.loads(shared_matches[0]) != rdf_projection(
        documentation_context(policy)
    ):
        raise ValueError("Shared policy declarations are missing or changed")
    for rule in model.rules:
        marker = f"### {rule.identifier}\n"
        if marker not in technical:
            continue
        section = technical.split(marker, 1)[1].split("\n### ", 1)[0]
        matches = re.findall(r"```json\n(.*?)\n```", section, re.S)
        if len(matches) != 1 or json.loads(matches[0]) != rdf_projection(
            rule_characteristics_graph(policy, URIRef(rule.resource_iri))
        ):
            unrepresented.append(rule.identifier)
    result = {
        "activeRules": len(expected),
        "renderedRules": len(headings),
        "missingRules": missing,
        "duplicateRules": duplicates,
        "unexpectedRules": sorted(set(headings) - expected),
        "sourceBlocksExpected": len(blocks),
        "sourceBlocksPreserved": len(blocks) - len(missing_blocks),
        "missingSourceBlocks": missing_blocks,
        "executableCharacteristicsUnrepresented": unrepresented,
        "historicalReportSourceSha256": baseline["historicalReportSourceSha256"],
        "checkedSnapshotSha256": baseline["sourceSha256"],
        "historicalDigestReconciliation": "Original reported digest has no identified matching bytes; preservation rerun against retained snapshot. Original report retained unchanged.",
    }
    if (
        missing
        or duplicates
        or result["unexpectedRules"]
        or missing_blocks
        or unrepresented
        or set(baseline["ruleIds"]) - expected
    ):
        raise ValueError(
            "Documentation preservation failed: "
            + json.dumps(result, ensure_ascii=False)
        )
    return result
