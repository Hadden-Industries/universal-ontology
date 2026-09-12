"""Independent execution of the same policy on Apache Jena's SHACL engine.

Used for qualification and cross-engine comparison only; ordinary hooks never
require Java. The engine location and JDK are explicit inputs, never guessed.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from rdflib import SH, Graph, Literal

from .context import RunPurpose, build_validation_graph
from .policy import Policy
from .reports import PolicyResult, extract_results
from .snapshots import ModuleSource, lexical_literals

JENA_HOME_VARIABLE = "UNIVERSAL_ONTOLOGY_JENA_HOME"
JAVA_HOME_VARIABLE = "UNIVERSAL_ONTOLOGY_JAVA_HOME"


class JenaUnavailable(Exception):
    """The second engine is not provisioned; qualification records a gap, never a pass."""


@dataclass(frozen=True)
class JenaRuntime:
    jena_home: Path
    java_home: Path

    @classmethod
    def from_environment(cls) -> "JenaRuntime":
        jena_home = os.environ.get(JENA_HOME_VARIABLE)
        java_home = os.environ.get(JAVA_HOME_VARIABLE)
        if not jena_home or not java_home:
            raise JenaUnavailable(f"Set {JENA_HOME_VARIABLE} and {JAVA_HOME_VARIABLE} to run the second engine.")
        runtime = cls(Path(jena_home), Path(java_home))
        if not runtime.java.is_file() or not (runtime.jena_home / "lib").is_dir():
            raise JenaUnavailable(f"Jena/JDK paths are not usable: {runtime}")
        return runtime

    @property
    def java(self) -> Path:
        name = "java.exe" if os.name == "nt" else "java"
        return self.java_home / "bin" / name

    def identity(self) -> dict[str, str]:
        java_version = subprocess.run([str(self.java), "-version"], capture_output=True, text=True, check=True).stderr.strip()
        jena_version = subprocess.run(
            [str(self.java), "-cp", str(self.jena_home / "lib" / "*"), "jena.version"], capture_output=True, text=True, check=True
        ).stdout.strip()
        return {"java": java_version.splitlines()[0], "jena": jena_version}


@dataclass(frozen=True)
class JenaOutcome:
    conforms: bool
    results: tuple[PolicyResult, ...]
    report_graph: Graph
    diagnostics: tuple[str, ...] = ()


def validate_with_jena(sources: list[ModuleSource], purpose: RunPurpose, policy: Policy, runtime: JenaRuntime) -> JenaOutcome:
    """Run Jena on exactly the graphs pySHACL saw; blank nodes survive through one Turtle file each."""
    data, _ = build_validation_graph(sources, purpose)
    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        shapes_path = directory / "shapes.ttl"
        data_path = directory / "data.ttl"
        shapes_path.write_bytes(policy.rules.serialize(format="turtle").encode("utf-8"))
        data_path.write_bytes(data.serialize(format="turtle").encode("utf-8"))
        completed = subprocess.run(
            [
                str(runtime.java), "-cp", str(runtime.jena_home / "lib" / "*"), "shacl.shacl", "validate",
                "--shapes", shapes_path.resolve().as_uri(), "--data", data_path.resolve().as_uri(),
            ],
            capture_output=True, text=True, encoding="utf-8",
        )
    if completed.returncode not in (0, 1) or not completed.stdout.strip():
        raise RuntimeError(f"Jena shacl failed ({completed.returncode}): {completed.stderr.strip()}")
    diagnostics, report_text = split_log_prefix(completed.stdout)
    report = Graph()
    with lexical_literals():
        report.parse(data=report_text, format="turtle")
    results = tuple(extract_results(report, policy))
    conforms = any(obj == Literal(True) for obj in report.objects(None, SH.conforms))
    return JenaOutcome(conforms=conforms and not results, results=results, report_graph=report, diagnostics=diagnostics)


def split_log_prefix(stdout: str) -> tuple[tuple[str, ...], str]:
    """Jena writes riot/log4j lines to stdout before the Turtle report; keep them as evidence."""
    lines = stdout.splitlines()
    for index, line in enumerate(lines):
        if line.startswith(("PREFIX", "@prefix", "[", "<", "_:")):
            return tuple(lines[:index]), chr(10).join(lines[index:])
    raise RuntimeError("Jena produced no Turtle report:" + chr(10) + stdout)


def comparable(results) -> set[tuple[str, str, str, str, str]]:
    """The mandatory parity identity: rule, focus, path, value and severity.

    Blank-node focus nodes keep no engine-specific label. ``sh:uniqueLang``
    results have no ``sh:value`` in the SHACL specification (Jena supplies one,
    pySHACL does not), so that value is blanked. Constraint-component
    multiplicity is engine granularity and is reported separately.
    """
    return {
        (
            r.requirement_id,
            "_:" if r.focus_node.startswith("_:") else r.focus_node,
            r.path,
            "" if r.constraint_component == "sh:UniqueLangConstraintComponent" else r.value,
            r.severity,
        )
        for r in results
    }


def component_multiplicity(results) -> dict[tuple[str, str, str], int]:
    """How many constraint components each engine raised per (rule, focus, path); evidence, not parity."""
    counts: dict[tuple[str, str, str], int] = {}
    for r in results:
        key = (r.requirement_id, "_:" if r.focus_node.startswith("_:") else r.focus_node, r.path)
        counts[key] = counts.get(key, 0) + 1
    return counts
