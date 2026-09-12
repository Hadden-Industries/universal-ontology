"""Native SHACL results presented with stable rule identity."""
from __future__ import annotations

from dataclasses import dataclass

from rdflib import SH, BNode, Graph, Literal, URIRef

from .policy import Policy

_SEVERITY_NAMES = {SH.Violation: "Violation", SH.Warning: "Warning", SH.Info: "Info"}


def _term(value) -> str:
    if value is None:
        return ""
    if isinstance(value, BNode):
        return f"_:{value}"
    if isinstance(value, Literal):
        return value.n3()
    return str(value)


@dataclass(frozen=True, order=True)
class PolicyResult:
    """One validation result keyed by requirement identifier."""

    requirement_id: str
    severity: str
    focus_node: str
    path: str
    value: str
    constraint_component: str
    message: str
    source_shape: str

    @property
    def blocks(self) -> bool:
        return self.severity == "Violation"


def extract_results(results_graph: Graph, policy: Policy) -> list[PolicyResult]:
    ids = policy.requirement_ids()
    results = []
    # Only the report's top-level results carry requirement identity; nested
    # sh:node details are engine-specific explanations, not additional results.
    top_level = [result for report in results_graph.subjects(SH.conforms, None) for result in results_graph.objects(report, SH.result)]
    for result in top_level:
        shape = results_graph.value(result, SH.sourceShape)
        owner = policy.requirement_for_shape(shape)
        requirement_id = ids.get(owner, "UNIDENTIFIED-RULE")
        severity = results_graph.value(result, SH.resultSeverity)
        messages = sorted(str(value) for value in results_graph.objects(result, SH.resultMessage))
        results.append(
            PolicyResult(
                requirement_id=requirement_id,
                severity=_SEVERITY_NAMES.get(severity, _term(severity)),
                focus_node=_term(results_graph.value(result, SH.focusNode)),
                path=_term(results_graph.value(result, SH.resultPath)),
                value=_term(results_graph.value(result, SH.value)),
                constraint_component=_term(results_graph.value(result, SH.sourceConstraintComponent)).replace(str(SH), "sh:"),
                message="; ".join(messages),
                source_shape=_term(shape),
            )
        )
    return sorted(results)


def format_results(results: list[PolicyResult]) -> str:
    lines = []
    for result in results:
        lines.append(f"{result.severity:<9} {result.requirement_id:<28} {result.focus_node}")
        if result.path:
            lines.append(f"          path {result.path}" + (f" value {result.value}" if result.value else ""))
        if result.message:
            lines.append(f"          {result.message}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Retained native reports and qualification receipts
# ---------------------------------------------------------------------------

import hashlib
import json
import platform
import re
import sys
from dataclasses import dataclass as _dataclass
from datetime import datetime, timezone
from pathlib import Path

import pyshacl
import rdflib

from .namespaces import REPOSITORY_ROOT

REPORT_DIRECTORY = REPOSITORY_ROOT / ".sdlc" / "runtime" / "policy-reports"
RECEIPT_FILENAME = "qualification-receipt.json"
GENERATED_POLICY_RELATIVE = "docs/policy/Editing-Policy.generated.md"


def policy_anchor(requirement_id: str, name: str, strength: str, human: bool = False) -> str:
    """GitHub heading anchor of the rule in the generated policy document."""
    heading = f"{requirement_id} — {name} ({strength}{', human review' if human else ''})"
    slug = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
    return f"{GENERATED_POLICY_RELATIVE}#{slug}"


def github_annotation(level: str, requirement_id: str, focus_node: str, message: str) -> str:
    """One workflow annotation line; message text is data and is escaped, never interpreted."""
    text = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    focus = focus_node.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    return f"::{level}::{requirement_id} {focus}: {text}"


def lock_identity(root: Path = REPOSITORY_ROOT) -> str:
    lock = root / "requirements.lock.txt"
    return "sha256:" + hashlib.sha256(lock.read_bytes()).hexdigest() if lock.is_file() else "unavailable"


@_dataclass(frozen=True)
class WrittenReport:
    directory: Path
    summary_path: Path
    graph_path: Path
    receipt_path: Path | None


def report_document(outcome, policy) -> dict:
    ids = policy.requirement_ids()
    by_id = {value: node for node, value in ids.items()}
    from rdflib import RDF, SH

    from .namespaces import UOP

    def describe(requirement_id: str) -> dict:
        node = by_id.get(requirement_id)
        if node is None:
            return {"policyAnchor": "", "repairGuidance": ""}
        name = str(policy.rules.value(node, SH.name) or "")
        strength = str(policy.rules.value(node, UOP.normativeStrength) or "")
        human = (node, RDF.type, UOP.HumanClause) in policy.rules
        return {"policyAnchor": policy_anchor(requirement_id, name, strength, human), "repairGuidance": str(policy.rules.value(node, SH.description) or "")}

    return {
        "reportVersion": 1,
        "purpose": outcome.purpose.value,
        "status": outcome.status,
        "qualifies": outcome.qualifies,
        "conforms": outcome.conforms,
        "policyIdentity": outcome.policy_identity,
        "lockIdentity": lock_identity(),
        "runtime": {
            "python": platform.python_version(), "pyshacl": pyshacl.__version__, "rdflib": rdflib.__version__,
            "platform": platform.platform(),
        },
        "modules": [{"module": module, "locator": locator, "digest": digest} for module, locator, digest in outcome.module_identities],
        "authorities": [{"name": name, "digest": digest} for name, digest in outcome.authority_identities],
        "comparisons": [{"module": module, "comparedWith": compared} for module, compared in outcome.comparisons],
        "unevaluatedChangeObligations": list(outcome.unevaluated_change_obligations),
        "scopeReference": outcome.scope_reference,
        "targetedOwnedEntities": outcome.targeted_focus_count,
        "counts": {"violations": len(outcome.violations), "warnings": len(outcome.warnings)},
        "results": [
            {
                "requirementId": r.requirement_id, "severity": r.severity, "focusNode": r.focus_node, "path": r.path,
                "value": r.value, "constraintComponent": r.constraint_component, "message": r.message,
                "sourceShape": r.source_shape, **describe(r.requirement_id),
            }
            for r in outcome.results
        ],
    }


def write_report(outcome, directory: Path = REPORT_DIRECTORY, policy=None) -> WrittenReport:
    """Retain the native results graph and a JSON summary; write a receipt only for a qualifying run.

    The run directory name carries the UTC time; the receipt is keyed to the
    exact module, policy and authority identities, not to the time.
    """
    from .policy import load_policy

    policy = policy or load_policy()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_directory = directory / f"{stamp}-{outcome.purpose.value}"
    run_directory.mkdir(parents=True, exist_ok=True)
    summary = report_document(outcome, policy)
    summary_path = run_directory / "report.json"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    graph_path = run_directory / "results.ttl"
    graph_path.write_bytes(outcome.results_graph.serialize(format="turtle").encode("utf-8"))
    receipt_path = None
    if outcome.qualifies:
        receipt = {
            "receiptVersion": 1,
            "purpose": outcome.purpose.value,
            "qualifies": True,
            "policyIdentity": outcome.policy_identity,
            "lockIdentity": summary["lockIdentity"],
            "modules": summary["modules"],
            "authorities": summary["authorities"],
            "comparisons": summary["comparisons"],
            "report": str(summary_path.relative_to(directory)).replace("\\", "/"),
            "issuedAt": stamp,
        }
        receipt_path = directory / RECEIPT_FILENAME
        receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    return WrittenReport(run_directory, summary_path, graph_path, receipt_path)
