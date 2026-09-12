"""The retained operational command routes --purpose runs to the SHACL policy with the documented status contract."""
import subprocess
import sys
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.cli import SelectedSource, assemble_comparisons, assemble_sources, module_for_path  # noqa: E402
from ontology_policy.context import ContextError, RunPurpose  # noqa: E402
from ontology_policy.modules import load_owned_modules  # noqa: E402

COMMAND = [sys.executable, "-B", str(REPOSITORY_ROOT / "scripts" / "validate_ontologies.py")]
FIXTURE_AUTHORITIES = str(REPOSITORY_ROOT / "tests" / "fixtures" / "ontology-policy" / "authorities" / "derived")


def run_command(*arguments, cwd=REPOSITORY_ROOT):
    return subprocess.run([*COMMAND, *arguments], cwd=cwd, capture_output=True, text=True, encoding="utf-8", stdin=subprocess.DEVNULL)


class SourceAssemblyTest(unittest.TestCase):
    def setUp(self):
        self.modules = load_owned_modules()

    def test_working_and_dated_paths_map_to_their_module_but_full_artifacts_do_not(self):
        core = module_for_path(self.modules, "core/universal-core.owl")
        self.assertEqual(core.label, "Universal Core")
        self.assertEqual(module_for_path(self.modules, "src/universal/core/20260912").label, "Universal Core")
        self.assertEqual(module_for_path(self.modules, "src/iso-iec/11179/-3/ed-4/20260912").label, "ISO/IEC 11179-3 (edition 4)")
        self.assertIsNone(module_for_path(self.modules, "src/universal/core/20260912-full"))
        self.assertIsNone(module_for_path(self.modules, "docs/README.md"))

    def test_latest_active_uses_exactly_the_recorded_active_artifacts(self):
        sources = assemble_sources(RunPurpose.LATEST_ACTIVE, [SelectedSource("extended/universal-extended.owl", None)], self.modules, REPOSITORY_ROOT)
        locators = sorted(source.locator for source in sources)
        self.assertEqual(locators, sorted(module.active_artifact_path for module in self.modules))

    def test_candidate_replaces_only_the_selected_module_and_keeps_the_rest_active(self):
        sources = assemble_sources(RunPurpose.CANDIDATE, [SelectedSource("extended/universal-extended.owl", None)], self.modules, REPOSITORY_ROOT)
        by_label = {source.module.label: source.locator for source in sources}
        self.assertEqual(by_label["Universal Extended"], "extended/universal-extended.owl")
        self.assertEqual(by_label["Universal Core"], "src/universal/core/20260912")
        self.assertEqual(len(sources), len(self.modules))

    def test_comparisons_come_from_the_active_artifact_or_the_base_commit_and_never_for_latest_active(self):
        selected = [SelectedSource("extended/universal-extended.owl", None)]
        comparisons = assemble_comparisons(RunPurpose.CANDIDATE, selected, self.modules, REPOSITORY_ROOT)
        by_label = {module.label: comparisons[module.iri] for module in self.modules}
        self.assertEqual(by_label["Universal Extended"].locator, "src/universal/extended/20260912")
        self.assertEqual(by_label["Universal Core"].locator, "src/universal/core/20260912")
        self.assertTrue(all(value is None for value in assemble_comparisons(RunPurpose.LATEST_ACTIVE, selected, self.modules, REPOSITORY_ROOT).values()))
        based = assemble_comparisons(RunPurpose.DRAFT, [SelectedSource("extended/universal-extended.owl", None, "HEAD")], self.modules, REPOSITORY_ROOT)
        self.assertTrue(by_label["Universal Extended"].locator != based[[m for m in self.modules if m.label == "Universal Extended"][0].iri].locator)
        self.assertTrue(based[[m for m in self.modules if m.label == "Universal Extended"][0].iri].locator.startswith("HEAD:"))

    def test_an_active_artifact_whose_bytes_drift_from_the_activation_digest_is_refused(self):
        import dataclasses
        core = [m for m in self.modules if m.label == "Universal Core"][0]
        self.assertTrue(core.active_content_digest and core.active_content_digest.startswith("sha256:"))
        drifted = tuple(dataclasses.replace(m, active_content_digest="sha256:" + "0" * 64) if m is core else m for m in self.modules)
        with self.assertRaisesRegex(ContextError, "no longer matches the activation record"):
            assemble_sources(RunPurpose.LATEST_ACTIVE, [], drifted, REPOSITORY_ROOT)

    def test_an_input_outside_the_reviewed_modules_is_a_context_error(self):
        with self.assertRaises(ContextError):
            assemble_sources(RunPurpose.DRAFT, [SelectedSource("tests/fixtures/ontology-policy/entity-created/created.ttl", None)], self.modules, REPOSITORY_ROOT)

    def test_two_inputs_for_one_module_are_a_context_error(self):
        with self.assertRaises(ContextError):
            assemble_sources(
                RunPurpose.DRAFT,
                [SelectedSource("core/universal-core.owl", None), SelectedSource("src/universal/core/20260912", None)],
                self.modules, REPOSITORY_ROOT,
            )


class CommandContractTest(unittest.TestCase):
    def test_latest_active_purpose_runs_the_complete_active_set_through_the_normal_command(self):
        completed = run_command("--purpose", "latest-active", "--authorities", FIXTURE_AUTHORITIES)
        self.assertIn(completed.returncode, (0, 1), completed.stderr)
        self.assertIn("authority iana-media-types sha256:", completed.stdout)
        self.assertIn("Run purpose: latest-active", completed.stdout)
        self.assertIn("src/universal/core/20260912 sha256:", completed.stdout)
        self.assertIn("Targeted owned entities: ", completed.stdout)
        self.assertNotIn("universalontologytest", completed.stdout + completed.stderr)

    def test_missing_authority_snapshots_are_an_execution_error(self):
        completed = run_command("--purpose", "latest-active", "--authorities", str(REPOSITORY_ROOT / "does-not-exist"))
        self.assertEqual(completed.returncode, 2)
        self.assertIn("AuthorityError", completed.stderr)

    def test_draft_purpose_with_an_unowned_explicit_file_exits_2(self):
        completed = run_command("--purpose", "draft", "tests/fixtures/ontology-policy/entity-created/created.ttl")
        self.assertEqual(completed.returncode, 2)
        self.assertIn("POLICY_VALIDATION_ERROR", completed.stderr)

    def test_purpose_and_plan_remain_compatible_with_pre_install_selection(self):
        completed = run_command("--purpose", "draft", "--all-current", "--plan")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("validation_required=true", completed.stdout)

    def test_draft_run_reports_change_obligations_and_comparisons(self):
        # The working files are the coherent 20260912 replacement set: each
        # re-pinned owl:imports needs its dependency in the same run (DEC-030),
        # so the draft selects all five current sources rather than one file.
        completed = run_command("--purpose", "draft", "--authorities", FIXTURE_AUTHORITIES, "--all-current")
        self.assertIn(completed.returncode, (0, 1), completed.stderr)
        self.assertIn("comparison https://haddenindustries.com/ontology/policy/activation/extended: src/universal/extended/20260912 sha256:", completed.stdout)
        self.assertIn("(diagnostic purpose)", completed.stdout)

    def test_pre_install_planning_needs_no_rdf_dependencies(self):
        """--plan runs before dependencies are installed in CI; the SHACL package must load lazily."""
        import ast

        tree = ast.parse((REPOSITORY_ROOT / "scripts" / "validate_ontologies.py").read_text(encoding="utf-8"))
        top_level = {
            name.split(".")[0]
            for node in tree.body
            if isinstance(node, (ast.Import, ast.ImportFrom))
            for name in ([alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or ""])
        }
        self.assertNotIn("ontology_policy", top_level)
        self.assertNotIn("rdflib", top_level)
        self.assertNotIn("pyshacl", top_level)
        completed = subprocess.run(
            [sys.executable, "-B", "-I", str(REPOSITORY_ROOT / "scripts" / "validate_ontologies.py"), "--all-current", "--plan"],
            cwd=REPOSITORY_ROOT, capture_output=True, text=True, stdin=subprocess.DEVNULL,
            env={"PATH": "", "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", "")},
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("validation_required=true", completed.stdout)

    def test_legacy_path_is_unchanged_without_a_purpose(self):
        completed = run_command("--all-current", "--plan")
        self.assertEqual(completed.returncode, 0)
        self.assertIn("validator_changed=true", completed.stdout)


if __name__ == "__main__":
    unittest.main()
