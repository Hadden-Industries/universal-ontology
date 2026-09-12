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
    for result in results_graph.subjects(SH.sourceShape, None):
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
