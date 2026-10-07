#!/usr/bin/env python3
"""Run unittest suites across worker processes and report every unit truthfully.

Each unit is executed in its own interpreter with the same isolated invocation
the serial suite uses. Units start in descending order of their module's size
so long-running work overlaps early, and a worker pulls the next unit as soon
as it is free. Nothing is skipped, retried or reordered within a unit; a failing
unit prints its complete output.
"""

import argparse
import os
import re
import sys
import time
import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from subprocess import run

RAN = re.compile(r"^Ran (\d+) tests? in [\d.]+s$", re.MULTILINE)
OUTCOME = re.compile(r"^(OK|FAILED)(?: \((.*)\))?$", re.MULTILINE)
COUNTED = ("failures", "errors", "skipped", "expected failures", "unexpected successes")

REPOSITORY_ROOT = Path(__file__).resolve().parent.parent

# Reviewed native module families. New modules retain full Node-backed setup
# until their runtime dependencies have been assessed explicitly.
PYTHON_ONLY_MODULES = frozenset(
    (
        "test_editing_policy_rendering.py",
        "test_import_catalogs.py",
        "test_ontology_entity_changes.py",
        "test_ontology_policy.py",
        "test_ontology_policy_cli.py",
        "test_ontology_policy_coverage.py",
        "test_ontology_policy_engines.py",
        "test_ontology_policy_reports.py",
        "test_policy_authorities.py",
        "test_publication_gate.py",
        "test_run_tests_in_parallel.py",
        "test_validate_ontologies.py",
    )
)
NODE_BACKED_MODULES = frozenset(
    (
        "test_set_up_agent_skills.py",
        "test_set_up_mcp_servers.py",
        "test_upload_to_s3.py",
    )
)


def module_family(path: Path):
    if PYTHON_ONLY_MODULES & NODE_BACKED_MODULES:
        raise ValueError("Python module families overlap")
    return "python-only" if path.name in PYTHON_ONLY_MODULES else "node-backed"


def parse_arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--tests-dir",
        type=Path,
        default=REPOSITORY_ROOT / "tests",
        help="Tests directory path (default: tests/)",
    )
    parser.add_argument(
        "--pattern",
        default="test_*.py",
        help="Test filename glob pattern (default: test_*.py)",
    )
    parser.add_argument(
        "--family",
        choices=("all", "python-only", "node-backed"),
        default="all",
        help="Native module family; unknown modules retain Node-backed setup",
    )
    parser.add_argument(
        "--granularity",
        choices=("module", "test"),
        default="module",
        help="Unit granularity: module (entire test file) or test (single test method)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=min(8, os.cpu_count() or 1),
        help="Concurrent worker count; defaults to min(8, CPU count)",
    )
    return parser.parse_args(argv)


def iterate_tests(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from iterate_tests(item)
        else:
            yield item


def discover_units(tests_dir: Path, pattern: str, granularity: str, family="all"):
    """Return (label, argv, environment) units, largest module first, without running anything.

    Module units rely on ``unittest discover -s`` to put the tests directory on
    ``sys.path``. Per-test units name a method as ``module.Class.method``, so their
    environment prepends the tests directory to ``PYTHONPATH`` instead; ``None``
    means the worker inherits this process's environment unchanged.
    """
    if family not in ("all", "python-only", "node-backed"):
        raise ValueError("Unknown Python module family")
    tests_dir = tests_dir.resolve()
    per_test_environment = dict(os.environ)
    per_test_environment["PYTHONPATH"] = os.pathsep.join(
        filter(None, (str(tests_dir), os.environ.get("PYTHONPATH")))
    )
    modules = []
    for path in sorted(tests_dir.glob(pattern)):
        if family != "all" and module_family(path) != family:
            continue
        modules.append((path.stat().st_size, path))
    modules.sort(key=lambda item: (-item[0], item[1].name))
    units = []
    for _size, path in modules:
        if granularity == "module":
            units.append(
                (
                    path.stem,
                    [
                        sys.executable,
                        "-B",
                        "-m",
                        "unittest",
                        "discover",
                        "-s",
                        str(tests_dir),
                        "-p",
                        path.name,
                    ],
                    None,
                )
            )
            continue
        sys.path.insert(0, str(REPOSITORY_ROOT))
        sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
        try:
            suite = unittest.defaultTestLoader.discover(
                str(tests_dir), pattern=path.name, top_level_dir=str(tests_dir)
            )
        finally:
            if str(REPOSITORY_ROOT) in sys.path:
                sys.path.remove(str(REPOSITORY_ROOT))
            if str(REPOSITORY_ROOT / "scripts") in sys.path:
                sys.path.remove(str(REPOSITORY_ROOT / "scripts"))
        for test in iterate_tests(suite):
            identifier = test.id()
            units.append(
                (
                    identifier,
                    [
                        sys.executable,
                        "-B",
                        "-m",
                        "unittest",
                        identifier,
                    ],
                    per_test_environment,
                )
            )
    return units


def execute(unit):
    label, argv, environment = unit
    started = time.monotonic()
    completed = run(
        argv,
        cwd=str(REPOSITORY_ROOT),
        env=environment,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    elapsed = time.monotonic() - started
    output = completed.stdout + completed.stderr
    ran = RAN.search(output)
    outcome = OUTCOME.findall(output)
    counts = dict.fromkeys(COUNTED, 0)
    if outcome:
        for part in (outcome[-1][1] or "").split(","):
            name, _, value = part.strip().rpartition("=")
            if name in counts:
                counts[name] += int(value)
    passed = (
        completed.returncode == 0
        and ran is not None
        and int(ran.group(1)) > 0
        and bool(outcome)
    )
    return {
        "label": label,
        "seconds": elapsed,
        "ran": int(ran.group(1)) if ran else 0,
        "counts": counts,
        "passed": passed,
        "output": output,
    }


def main(argv=None):
    arguments = parse_arguments(argv)
    units = discover_units(
        arguments.tests_dir,
        arguments.pattern,
        arguments.granularity,
        arguments.family,
    )
    if not units:
        print("No tests were discovered; refusing to report success", file=sys.stderr)
        return 5
    workers = max(1, min(arguments.workers, len(units)))
    started = time.monotonic()
    results = []
    print(
        f"Running {len(units)} test {arguments.granularity}s with {workers} parallel workers...",
        flush=True,
    )
    with ThreadPoolExecutor(workers) as pool:
        for future in as_completed([pool.submit(execute, unit) for unit in units]):
            result = future.result()
            results.append(result)
            status = "ok" if result["passed"] else "FAILED"
            print(
                f"  {status:6} {result['seconds']:6.1f}s {result['label']}", flush=True
            )
            if not result["passed"]:
                print(result["output"], flush=True)
    expected = [unit[0] for unit in units]
    completed = [result["label"] for result in results]
    if len(set(expected)) != len(expected) or sorted(expected) != sorted(completed):
        print(
            "Native Python execution inventory is incomplete or duplicate",
            file=sys.stderr,
        )
        return 5
    wall = time.monotonic() - started
    ran = sum(item["ran"] for item in results)
    totals = {name: sum(item["counts"][name] for item in results) for name in COUNTED}
    failed = [item["label"] for item in results if not item["passed"]]
    details = ", ".join(f"{name}={count}" for name, count in totals.items() if count)
    verdict = f"FAILED ({len(failed)} units)" if failed else "OK"
    print(
        f"\nRan {ran} tests across {len(units)} {arguments.granularity}s in {wall:.1f}s wall "
        f"({sum(item['seconds'] for item in results):.1f}s serial sum) "
        f"with {workers} workers" + (f"; {details}" if details else "") + f": {verdict}"
    )
    if ran == 0:
        return 5
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
