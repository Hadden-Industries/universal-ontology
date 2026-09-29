"""Contracts of the parallel unittest runner at its command-line boundary.

Each test builds its own tests directory, so the runner is never pointed at the
suite that is running it. Expected identifiers and outcomes come from the
fixture source written here, not from the runner.
"""

import contextlib
import importlib.util
import io
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
RUNNER_PATH = REPOSITORY_ROOT / "scripts" / "runTestsInParallel.py"

FIXTURE_MODULE = "test_parallel_runner_fixture"
FIXTURE_SOURCE = textwrap.dedent(
    """
    import unittest


    class Sample(unittest.TestCase):
        def test_passes(self):
            self.assertTrue(True)

        def test_fails(self):
            self.assertTrue(False)
    """
)


def load_runner():
    specification = importlib.util.spec_from_file_location(
        "run_tests_in_parallel_under_test", RUNNER_PATH
    )
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


class PerTestGranularityTest(unittest.TestCase):
    def setUp(self):
        self.runner = load_runner()
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.tests_dir = Path(temporary.name)
        (self.tests_dir / f"{FIXTURE_MODULE}.py").write_text(
            FIXTURE_SOURCE, encoding="utf-8"
        )
        self.addCleanup(sys.modules.pop, FIXTURE_MODULE, None)

    def test_discovers_each_test_method_in_a_non_package_directory(self):
        units = self.runner.discover_units(self.tests_dir, "test_*.py", "test")

        self.assertEqual(
            sorted(unit[0] for unit in units),
            [
                f"{FIXTURE_MODULE}.Sample.test_fails",
                f"{FIXTURE_MODULE}.Sample.test_passes",
            ],
        )

    def test_each_unit_runs_alone_and_reports_its_own_outcome(self):
        units = self.runner.discover_units(self.tests_dir, "test_*.py", "test")
        results = {unit[0]: self.runner.execute(unit) for unit in units}

        passing = results[f"{FIXTURE_MODULE}.Sample.test_passes"]
        self.assertTrue(passing["passed"], passing["output"])
        self.assertEqual(passing["ran"], 1)

        failing = results[f"{FIXTURE_MODULE}.Sample.test_fails"]
        self.assertFalse(failing["passed"], failing["output"])
        self.assertEqual(failing["ran"], 1)
        self.assertEqual(failing["counts"]["failures"], 1)

    def test_command_reports_the_failing_method_and_exits_non_zero(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status = self.runner.main(
                ["--tests-dir", str(self.tests_dir), "--granularity", "test"]
            )

        self.assertEqual(status, 1)
        self.assertRegex(
            output.getvalue(),
            rf"FAILED +[\d.]+s {FIXTURE_MODULE}\.Sample\.test_fails\n",
        )
        self.assertIn("Ran 2 tests across 2 tests", output.getvalue())


if __name__ == "__main__":
    unittest.main()
