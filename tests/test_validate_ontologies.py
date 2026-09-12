"""Exercise the ontology runner's selection contract with real Git comparisons in disposable checkouts.

The runner has one selection contract shared by ``--plan`` and the actual
editing-policy run (``select_ontology_validation``), so these tests prove the
selection through ``--plan``, which prints the chosen documents and runs no
policy. What the policy does with the selected bytes is proven separately by
``tests/test_ontology_policy_cli.py`` against the real repository.
"""

import ast
import os
import re
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
RUNNER = REPOSITORY_ROOT / "scripts/validate_ontologies.py"
CURRENT_SOURCES = (
    "core/universal-core.owl",
    "extended/universal-extended.owl",
    "reference-data/reference-data.owl",
    "iso-31073/iso-31073.owl",
    "iso-iec11179-3/iso-iec11179-3.owl",
)
SELECTED_LINE = re.compile(r"^Selected ontology files: (?P<paths>\[.*\])$", re.M)


class OntologyValidationRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory(prefix="ontology-runner-")
        self.addCleanup(self.temporary_directory.cleanup)
        self.root = Path(self.temporary_directory.name)
        self.env = {
            name: value for name, value in os.environ.items()
            if not name.upper().startswith(("GIT_", "GITHUB_"))
        }
        self.env.update(
            GIT_CONFIG_NOSYSTEM="1",
            GIT_CONFIG_GLOBAL=str(self.root / "empty-global-config"),
            PYTHONDONTWRITEBYTECODE="1",
            PYTHONIOENCODING="utf-8",
        )
        self.write("empty-global-config", "")
        self.git("init", "--initial-branch=main")
        for path in CURRENT_SOURCES:
            self.write(path, "fixture ontology\n")
        self.base = self.commit(*CURRENT_SOURCES)

    def write(self, relative_path, content):
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def git(self, *args):
        result = subprocess.run(
            ["git", *args], cwd=self.root, env=self.env, capture_output=True,
            text=True, encoding="utf-8", check=True,
        )
        return result.stdout.strip()

    def commit(self, *paths):
        self.git("add", "--", *paths)
        self.git(
            "-c", "user.name=Ontology runner fixture",
            "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false",
            "commit", "-m", "Record fixture inputs",
        )
        return self.git("rev-parse", "HEAD")

    def run_runner(self, *args, cwd=None, input_text=None):
        return subprocess.run(
            [sys.executable, "-B", str(RUNNER), *args],
            cwd=cwd or self.root, env=self.env, input=input_text,
            capture_output=True, text=True, encoding="utf-8",
        )

    def plan(self, *args, cwd=None, input_text=None):
        """Run the selection contract only; the result carries the selected documents."""
        return self.run_runner(*args, "--plan", cwd=cwd, input_text=input_text)

    @staticmethod
    def selected(result):
        match = SELECTED_LINE.search(result.stderr)
        return ast.literal_eval(match.group("paths")) if match else []

    def test_invalid_base_fails_instead_of_substituting_a_parent_commit(self):
        self.write("unrelated.md", "second commit supplies a real HEAD parent\n")
        head = self.commit("unrelated.md")
        self.assertEqual(self.git("rev-parse", "HEAD^"), self.base)

        result = self.run_runner("--diff-base", "missing-base", "--diff-head", head)

        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("missing-base", result.stderr)
        self.assertEqual(self.selected(result), [])

    def test_changed_release_source_is_selected_without_unchanged_documents(self):
        historical = "src/universal/core/20260801"
        changed = "src/universal/core/20260907"
        self.write(historical, "unchanged historical release\n")
        base = self.commit(historical)
        self.write(changed, "changed release\n")
        head = self.commit(changed)

        result = self.plan("--diff-base", base, "--diff-head", head)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.selected(result), [changed])

    def test_validator_change_selects_current_sources_and_changed_release(self):
        changed = "src/iso-iec/11179/-3/ed-4/v1"
        self.write(changed, "changed release\n")
        self.write("requirements.txt", "dependency contract changed\n")
        head = self.commit(changed, "requirements.txt")

        result = self.plan("--diff-base", self.base, "--diff-head", head)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(self.selected(result)), {*CURRENT_SOURCES, changed})
        self.assertEqual(len(self.selected(result)), 6)

    def test_plan_reports_the_selection_without_running_the_policy(self):
        changed = CURRENT_SOURCES[0]
        self.write(changed, "changed ontology\n")
        head = self.commit(changed)

        result = self.plan("--diff-base", self.base, "--diff-head", head)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "validation_required=true\nvalidator_changed=false\n")
        for diagnostic in (changed, self.base, head):
            self.assertIn(diagnostic, result.stderr)
        self.assertNotIn("Run purpose", result.stdout)

    def test_the_actual_run_validates_exactly_the_planned_selection(self):
        """The plan and the run share one selection; the run then parses the selected bytes."""
        changed = CURRENT_SOURCES[0]
        self.write(changed, "changed ontology\n")
        head = self.commit(changed)

        plan = self.plan("--diff-base", self.base, "--diff-head", head)
        result = self.run_runner("--diff-base", self.base, "--diff-head", head)

        self.assertEqual(self.selected(result), self.selected(plan))
        # The fixture text is not RDF/XML, so the policy run must fail as an
        # input error rather than report an empty success.
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("POLICY_VALIDATION_ERROR", result.stderr)
        self.assertNotIn("qualifies", result.stdout)

    def test_removal_only_is_applicable_without_claiming_document_validation(self):
        removed = CURRENT_SOURCES[0]
        (self.root / removed).unlink()
        head = self.commit(removed)

        plan = self.plan("--diff-base", self.base, "--diff-head", head)
        result = self.run_runner("--diff-base", self.base, "--diff-head", head)

        self.assertEqual(plan.returncode, 0, plan.stderr)
        self.assertEqual(plan.stdout, "validation_required=true\nvalidator_changed=false\n")
        self.assertIn(removed, plan.stderr)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("removed", (result.stdout + result.stderr).lower())
        self.assertNotIn("qualifies", result.stdout)
        self.assertEqual(self.selected(result), [])

    def test_all_supported_release_path_families_preserve_document_selection(self):
        paths = (
            "src/iso/31073/ed-2/20260907",
            "src/iso-iec/11179/-3/ed-4/20260907",
            "src/iso-iec/11179/-3/ed-4/v1",
            "src/universal/reference-data/20260907",
            "src/universal/extended/20260907",
            "dist/iso/31073/ed-2/20260907",
            "dist/iso-iec/11179/-3/ed-4/v1",
            "dist/universal/reference-data/20260907",
            "dist/universal/core/20260907",
            "dist/universal/extended/20260907",
        )
        for path in paths:
            self.write(path, "fixture release\n")
        head = self.commit(*paths)
        result = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(self.selected(result)), set(paths))

    def test_ontology_and_accepted_baseline_select_only_the_changed_document(self):
        changed = CURRENT_SOURCES[0]
        baseline = "docs/sdlc/baselines/issue-1/v1.json"
        self.write(changed, "changed document\n")
        self.write(baseline, "{}\n")
        head = self.commit(changed, baseline)
        plan = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(plan.stdout, "validation_required=true\nvalidator_changed=false\n")
        self.assertEqual(self.selected(plan), [changed])

    def test_each_validator_input_selects_all_current_sources(self):
        for path in (
            ".github/workflows/ontology-validation.yml", "scripts/validate_ontologies.py",
            "tests/test_validate_ontologies.py", "requirements.txt", "requirements.lock.txt",
            ".python-version", ".java-version", "policy/entity-policy.ttl",
            "policy/authorities/loc-iso639-1.members.ttl", "scripts/ontology_policy/validation.py",
        ):
            with self.subTest(path=path):
                base = self.git("rev-parse", "HEAD")
                self.write(path, "input changed\n")
                head = self.commit(path)
                plan = self.plan("--diff-base", base, "--diff-head", head)
                self.assertEqual(plan.returncode, 0, plan.stderr)
                self.assertEqual(plan.stdout, "validation_required=true\nvalidator_changed=true\n")
                self.assertEqual(set(self.selected(plan)), set(CURRENT_SOURCES))

    def test_a_retired_legacy_validator_path_is_not_a_validator_input(self):
        self.write("tests/universalontologytest.py", "legacy validator reintroduced by mistake\n")
        head = self.commit("tests/universalontologytest.py")
        plan = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(plan.returncode, 0, plan.stderr)
        self.assertEqual(plan.stdout, "validation_required=false\nvalidator_changed=false\n")

    def test_rename_reports_removed_source_and_selects_new_source(self):
        old = "src/universal/core/20260801"
        new = "src/universal/core/20260907"
        self.write(old, "identical release content\n")
        base = self.commit(old)
        (self.root / old).rename(self.root / new)
        head = self.commit(old, new)
        result = self.plan("--diff-base", base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(old, result.stderr)
        self.assertEqual(self.selected(result), [new])

    def test_rename_out_of_supported_paths_remains_applicable(self):
        old = CURRENT_SOURCES[0]
        new = "archived.owl"
        (self.root / old).rename(self.root / new)
        head = self.commit(old, new)
        result = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "validation_required=true\nvalidator_changed=false\n")
        self.assertIn(old, result.stderr)

    def test_staged_changes_and_removals_use_the_same_selection_contract(self):
        changed, removed = CURRENT_SOURCES[:2]
        self.write(changed, "staged change\n")
        (self.root / removed).unlink()
        self.git("add", "--", changed, removed)
        plan = self.plan("--staged")
        self.assertEqual(plan.stdout, "validation_required=true\nvalidator_changed=false\n")
        self.assertIn(removed, plan.stderr)
        self.assertEqual(self.selected(plan), [changed])

    def test_manual_validation_selects_five_current_sources_not_history(self):
        self.write("src/universal/core/20260801", "historical source\n")
        plan = self.plan("--all-current")
        self.assertEqual(plan.stdout, "validation_required=true\nvalidator_changed=true\n")
        self.assertEqual(set(self.selected(plan)), set(CURRENT_SOURCES))

    def test_missing_current_source_fails_without_emitting_plan_assignments(self):
        missing = CURRENT_SOURCES[0]
        (self.root / missing).unlink()
        result = self.plan("--all-current")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn(missing, result.stderr)

    def test_missing_explicit_source_is_not_reported_as_success(self):
        missing = CURRENT_SOURCES[0]
        (self.root / missing).unlink()
        result = self.run_runner(missing)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(missing, result.stderr)

    def test_unchanged_or_unsupported_sources_need_no_validator_dependencies(self):
        paths = (
            "README.md", "src/universal/core/20260907-full",
            "dist/universal/core/20260907-full", "src/universal/core/not-a-release",
        )
        for path in paths:
            self.write(path, "not selected\n")
        head = self.commit(*paths)
        result = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "validation_required=false\nvalidator_changed=false\n")
        result = self.run_runner("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("No target ontology files", result.stdout)

    def test_positional_and_stdin_paths_keep_the_existing_interfaces(self):
        path = CURRENT_SOURCES[0]
        result = self.plan(path, path, "README.md")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.selected(result), [path])
        result = self.plan(input_text=CURRENT_SOURCES[1] + "\n")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.selected(result), [CURRENT_SOURCES[1]])

    def test_unsupported_explicit_paths_are_an_input_error_not_a_pass(self):
        result = self.run_runner("README.md")
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("POLICY_VALIDATION_ERROR", result.stderr)

    def test_filenames_are_nul_delimited_and_not_trimmed(self):
        suffix = "café ' with spaces " if os.name == "nt" else "café ' with\nnewline "
        path = "dist/universal/core/" + suffix + ".owl"
        self.write(path, "unusual path\n")
        head = self.commit(path)
        result = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.selected(result), [path])

    def test_git_errors_and_invalid_revisions_never_emit_successful_plans(self):
        # A real directory outside the fixture checkout is needed: a child
        # directory would still be discovered as part of the valid Git root.
        with tempfile.TemporaryDirectory(prefix="ontology-runner-non-git-") as non_git:
            cases = (
                (("--staged", "--plan"), non_git),
                (("--diff-base", "0" * 40, "--diff-head", self.base, "--plan"), self.root),
                (("--diff-base", self.base, "--diff-head", "missing-head", "--plan"), self.root),
                (("--diff-base", "", "--plan"), self.root),
                (("--diff-base", self.base, "--diff-head", "", "--plan"), self.root),
                (("--diff-head", self.base, "--plan"), self.root),
            )
            for args, cwd in cases:
                with self.subTest(args=args):
                    result = self.run_runner(*args, cwd=cwd)
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertEqual(result.stdout, "")

    def test_wrong_checkout_does_not_validate_files_from_another_head(self):
        self.write("unrelated.md", "change\n")
        self.commit("unrelated.md")
        result = self.plan("--diff-base", self.base, "--diff-head", self.base)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn("checkout", result.stderr)

    def test_native_diff_error_after_commit_resolution_is_not_empty_success(self):
        self.write("unrelated.md", "change\n")
        head = self.commit("unrelated.md")
        tree = self.git("rev-parse", head + "^{tree}")
        tree_object = self.root / ".git/objects" / tree[:2] / tree[2:]
        self.assertTrue(tree_object.is_file())
        # Git creates read-only loose objects on Windows. Only this deliberately
        # disposable object's attribute changes for the native error fixture.
        tree_object.chmod(stat.S_IWRITE | stat.S_IREAD)
        tree_object.unlink()
        self.assertEqual(self.git("rev-parse", "--verify", head + "^{commit}"), head)
        result = self.plan("--diff-base", self.base, "--diff-head", head)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn("Git comparison failed", result.stderr)


if __name__ == "__main__":
    unittest.main()
