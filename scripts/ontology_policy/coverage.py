"""Reconcile the executable rule set with fixtures, documentation and report identity.

Fixture expectations (``tests/fixtures/ontology-policy/**/*.expected.json``)
declare the rules they cover in ``rules``. A rule has negative coverage when
some expected result names it, and positive coverage when some targeted focus
node has no result for it (or the fixture lists it under ``passing_rules``).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from rdflib import RDF, SH

from .namespaces import REPOSITORY_ROOT, UOP
from .policy import Policy

FIXTURE_ROOT = REPOSITORY_ROOT / "tests" / "fixtures" / "ontology-policy"
_HEADING = re.compile(r"^### (EP-[A-Z0-9-]+) — .*\((MUST|SHOULD|MAY)(, human review)?\)$", re.M)


@dataclass(frozen=True)
class CoverageLedger:
    executable: frozenset[str]
    human: frozenset[str]
    documented_executable: frozenset[str]
    documented_human: frozenset[str]
    positive: frozenset[str]
    negative: frozenset[str]
    problems: tuple[str, ...] = field(default=())


def fixture_claims(root: Path = FIXTURE_ROOT) -> dict[str, set[str]]:
    """Map rule id -> {"positive", "negative"} claims across every expectation file."""
    claims: dict[str, set[str]] = {}
    for path in sorted(root.rglob("*.expected.json")):
        expectation = json.loads(path.read_text(encoding="utf-8"))
        covered = set(expectation.get("rules", []))
        results = expectation.get("results", [])
        targeted = set(expectation.get("targeted_focus_nodes", []))
        for rule in covered:
            failing = {result["focus_node"] for result in results if result["requirement_id"] == rule}
            entry = claims.setdefault(rule, set())
            if failing:
                entry.add("negative")
            if (targeted - failing) or rule in set(expectation.get("passing_rules", [])):
                entry.add("positive")
        for result in results:
            if result["requirement_id"] not in covered:
                claims.setdefault(result["requirement_id"], set()).add("undeclared-result")
    return claims


def reconcile_coverage(policy: Policy, rendered_markdown: str, *, extra_claims=None, override_negative=None) -> CoverageLedger:
    ids = policy.requirement_ids()
    human = frozenset(ids[node] for node in ids if (node, RDF.type, UOP.HumanClause) in policy.rules)
    executable = frozenset(ids[node] for node in ids if (node, RDF.type, SH.NodeShape) in policy.rules)
    documented = {match.group(1): bool(match.group(3)) for match in _HEADING.finditer(rendered_markdown)}
    documented_human = frozenset(rule for rule, is_human in documented.items() if is_human)
    documented_executable = frozenset(rule for rule, is_human in documented.items() if not is_human)
    claims = fixture_claims()
    for rule, kinds in (extra_claims or {}).items():
        claims.setdefault(rule, set()).update(kinds)
    positive = frozenset(rule for rule, kinds in claims.items() if "positive" in kinds)
    negative = frozenset(rule for rule, kinds in claims.items() if "negative" in kinds)
    if override_negative is not None:
        negative = frozenset(override_negative)
    problems = []
    for rule in sorted(set(claims) - set(ids.values())):
        problems.append(f"fixture claims unknown rule {rule}")
    for rule, kinds in sorted(claims.items()):
        if "undeclared-result" in kinds:
            problems.append(f"fixture expects results for {rule} without declaring it in 'rules'")
    for rule in sorted(executable - positive):
        problems.append(f"{rule} has no passing fixture subject")
    for rule in sorted(executable - negative):
        problems.append(f"{rule} has no failing fixture subject")
    for rule in sorted(executable - documented_executable):
        problems.append(f"{rule} is not rendered as an executable requirement")
    for rule in sorted(human - documented_human):
        problems.append(f"{rule} is not rendered as a human clause")
    for rule in sorted(set(documented) - set(ids.values())):
        problems.append(f"documentation renders unknown rule {rule}")
    return CoverageLedger(executable, human, documented_executable, documented_human, positive, negative, tuple(problems))
