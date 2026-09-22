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


def discover_units(tests_dir: Path, pattern: str, granularity: str):
    """Return (label, argv) units, largest module first, without running anything."""
    tests_dir = tests_dir.resolve()
    modules = []
    for path in sorted(tests_dir.glob(pattern)):
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
                )
            )
            continue
        sys.path.insert(0, str(REPOSITORY_ROOT))
        sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
        try:
            suite = unittest.defaultTestLoader.discover(
                str(tests_dir), pattern=path.name, top_level_dir=str(REPOSITORY_ROOT)
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
                )
            )
    return units


def execute(unit):
    label, argv = unit
    started = time.monotonic()
    completed = run(
        argv,
        cwd=str(REPOSITORY_ROOT),
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
    passed = completed.returncode == 0 and ran is not None and bool(outcome)
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
