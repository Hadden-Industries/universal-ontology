"""Contracts of the parallel unittest runner at its command-line boundary.

Each test builds its own tests directory, so the runner is never pointed at the
suite that is running it. Expected identifiers and outcomes come from the
fixture source written here, not from the runner.
"""

import contextlib
import importlib.util
import io
import os
import subprocess
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


class NativeModuleFamiliesTest(unittest.TestCase):
    def setUp(self):
        self.runner = load_runner()
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.tests_dir = Path(temporary.name)
        self.modules = (
            "test_import_catalogs.py",
            "test_set_up_agent_skills.py",
            "test_new_unknown.py",
        )
        for name in self.modules:
            (self.tests_dir / name).write_text(
                "import unittest\nclass Obligation(unittest.TestCase):\n def test_native(self): self.assertTrue(True)\n",
                encoding="utf-8",
            )
            self.addCleanup(sys.modules.pop, Path(name).stem, None)

    def test_native_partition_union_has_no_missing_or_duplicate_module(self):
        all_units = self.runner.discover_units(self.tests_dir, "test_*.py", "module")
        pure = self.runner.discover_units(
            self.tests_dir, "test_*.py", "module", "python-only"
        )
        backed = self.runner.discover_units(
            self.tests_dir, "test_*.py", "module", "node-backed"
        )
        self.assertEqual([unit[0] for unit in pure], ["test_import_catalogs"])
        self.assertEqual(
            {unit[0] for unit in backed},
            {"test_set_up_agent_skills", "test_new_unknown"},
        )
        self.assertEqual(
            sorted(unit[0] for unit in all_units),
            sorted(unit[0] for unit in pure + backed),
        )
        self.assertEqual(len(all_units), len({unit[0] for unit in pure + backed}))

    def test_per_test_granularity_preserves_native_family_selection(self):
        units = self.runner.discover_units(
            self.tests_dir, "test_*.py", "test", "python-only"
        )
        self.assertEqual(
            [unit[0] for unit in units], ["test_import_catalogs.Obligation.test_native"]
        )
        result = self.runner.execute(units[0])
        self.assertTrue(result["passed"], result["output"])
        self.assertEqual(result["ran"], 1)

    def test_actual_cli_executes_each_family_and_default_all(self):
        for family, expected in (("python-only", 1), ("node-backed", 2), ("all", 3)):
            with self.subTest(family=family):
                output = io.StringIO()
                arguments = ["--tests-dir", str(self.tests_dir)]
                if family != "all":
                    arguments += ["--family", family]
                with contextlib.redirect_stdout(output):
                    status = self.runner.main(arguments)
                self.assertEqual(status, 0, output.getvalue())
                self.assertIn(
                    f"Ran {expected} tests across {expected} modules", output.getvalue()
                )

    def test_empty_selected_family_cannot_report_success(self):
        (self.tests_dir / "test_import_catalogs.py").unlink()
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(
                self.runner.main(
                    ["--tests-dir", str(self.tests_dir), "--family", "python-only"]
                ),
                5,
            )

    def test_family_inventory_matches_reviewed_runtime_contract(self):
        self.assertEqual(len(self.runner.PYTHON_ONLY_MODULES), 12)
        self.assertEqual(
            self.runner.NODE_BACKED_MODULES,
            frozenset(
                (
                    "test_set_up_agent_skills.py",
                    "test_set_up_mcp_servers.py",
                    "test_upload_to_s3.py",
                )
            ),
        )
        self.assertFalse(
            self.runner.PYTHON_ONLY_MODULES & self.runner.NODE_BACKED_MODULES
        )

    def test_empty_native_module_is_a_failure_even_with_other_passing_work(self):
        (self.tests_dir / "test_empty_native.py").write_text(
            "import unittest\n", encoding="utf-8"
        )
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status = self.runner.main(["--tests-dir", str(self.tests_dir)])
        self.assertEqual(status, 1, output.getvalue())
        self.assertIn("FAILED", output.getvalue())

    def test_real_python_family_runs_without_node_or_npm(self):
        (self.tests_dir / "test_set_up_agent_skills.py").write_text(
            "import unittest,shutil\nclass NodeObligation(unittest.TestCase):\n def test_requires_node(self): self.assertIsNotNone(shutil.which('node'))\n",
            encoding="utf-8",
        )
        environment = dict(os.environ, PATH="")
        for family, expected_status in (("python-only", 0), ("node-backed", 1)):
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNNER_PATH),
                    "--tests-dir",
                    str(self.tests_dir),
                    "--family",
                    family,
                ],
                env=environment,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(
                result.returncode, expected_status, result.stdout + result.stderr
            )


if __name__ == "__main__":
    unittest.main()
