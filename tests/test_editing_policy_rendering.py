"""Rendering contract: the whole Editing Policy page is a checked projection of the policy graph."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.rendering import (  # noqa: E402
    GENERATED_DOCUMENT_PATH,
    render_editing_policy,
)
from render_editing_policy import format_generated_document  # noqa: E402

RENDER_SCRIPT = REPOSITORY_ROOT / "scripts" / "render_editing_policy.py"
PYTHON = sys.executable


class CanonicalFormatterFailureTest(unittest.TestCase):
    def test_excluded_generated_document_preserves_input_bytes(self):
        rendered = "# Policy\n\nFirst sentence. Second sentence.\n"
        # Prove that policy selection, rather than already-clean input, preserves bytes.
        with patch(
            "render_editing_policy.GENERATED_DOCUMENT_PATH",
            REPOSITORY_ROOT / "docs" / "policy" / "README.md",
        ):
            self.assertNotEqual(
                format_generated_document(rendered), rendered.encode("utf-8")
            )
        self.assertEqual(format_generated_document(rendered), rendered.encode("utf-8"))

    def test_non_object_native_report_is_an_operation_failure(self):
        with patch(
            "render_editing_policy.subprocess.run",
            return_value=subprocess.CompletedProcess([], 0, stdout="[]", stderr=""),
        ):
            with self.assertRaisesRegex(RuntimeError, "canonical Markdown quality"):
                format_generated_document("# Policy\n")

    def test_logical_reply_cannot_change_request_or_document_identity(self):
        for field in ("requestId", "path"):
            with self.subTest(field=field):

                def mismatched_reply(*args, input, **kwargs):
                    request = json.loads(input)
                    request[field] += "-wrong"
                    return subprocess.CompletedProcess(
                        args,
                        0,
                        stdout=json.dumps(
                            {
                                "exitCode": 0,
                                "operation": "format",
                                "written": [],
                                "errors": [],
                                "document": request,
                            }
                        ),
                        stderr="",
                    )

                with patch(
                    "render_editing_policy.subprocess.run", side_effect=mismatched_reply
                ):
                    with self.assertRaisesRegex(
                        RuntimeError, "canonical Markdown quality"
                    ):
                        format_generated_document("# Policy\n")


def run_renderer(*arguments, cwd=REPOSITORY_ROOT):
    return subprocess.run(
        [PYTHON, "-B", str(RENDER_SCRIPT), *arguments],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


class RenderedPolicyContentTest(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy()
        self.text = render_editing_policy(self.policy)

    def test_every_requirement_id_appears_exactly_once_as_a_heading(self):
        for requirement_id in self.policy.requirement_ids().values():
            self.assertEqual(
                self.text.count(f"### {requirement_id} "), 1, requirement_id
            )

    def test_creation_timestamp_rule_renders_its_facts_and_prose(self):
        section = self.text.split("### EP-ENTITY-CREATED ")[1].split("\n### ")[0]
        self.assertIn("MUST", section)
        self.assertIn("`dcterms:created`", section)
        self.assertIn("exactly one value", section)
        self.assertIn("`xsd:dateTime`", section)
        self.assertIn("lexical `Z` designator", section)
        self.assertIn("Wiki W05", section)

    def test_human_clause_is_rendered_with_a_review_obligation_not_a_check(self):
        section = self.text.split("### EP-HUMAN-CONCEPT-REUSE ")[1].split("\n### ")[0]
        self.assertIn("human review", section.lower())
        self.assertNotIn("Executable constraints", section)

    def test_output_is_byte_stable_lf_utf8_and_carries_policy_identity_without_timestamps(
        self,
    ):
        again = render_editing_policy(self.policy)
        self.assertEqual(self.text, again)
        self.assertNotIn("\r", self.text)
        self.assertIn(self.policy.identity, self.text)
        self.assertNotRegex(self.text, r"(?i)generated (on|at)")
        self.assertNotIn("Editing-Policy.generated.md", self.text)
        self.assertTrue(self.text.endswith("\n"))

    def test_markdown_special_characters_in_policy_text_are_rendered_safely(self):
        from ontology_policy.rendering import markdown_inline

        self.assertEqual(markdown_inline("a | b"), "a \\| b")
        self.assertEqual(markdown_inline("<b>bold</b>"), "\\<b\\>bold\\</b\\>")
        self.assertEqual(markdown_inline("x `y` z"), "x \\`y\\` z")

    def test_code_spans_fence_embedded_backticks_per_commonmark(self):
        """Expectations follow CommonMark 0.31.2 section 6.1 (code spans)."""
        from ontology_policy.rendering import code

        cases = {
            "simple": "`simple`",
            "foo`bar": "``foo`bar``",
            "a``b": "```a``b```",
            "`start": "`` `start ``",
            "end`": "`` end` ``",
            " spaced ": "`  spaced  `",
            "  ": "`  `",
        }
        for text, rendered in cases.items():
            with self.subTest(text=text):
                self.assertEqual(code(text), rendered)


class RendererCommandTest(unittest.TestCase):
    def test_check_mode_passes_for_the_committed_document_and_writes_nothing(self):
        before = GENERATED_DOCUMENT_PATH.read_bytes()
        completed = run_renderer("--check")
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertEqual(GENERATED_DOCUMENT_PATH.read_bytes(), before)

    def test_check_mode_fails_for_a_hand_edited_document(self):
        with tempfile.TemporaryDirectory() as temporary:
            stale = Path(temporary) / "Editing-Policy.generated.md"
            stale.write_bytes(
                GENERATED_DOCUMENT_PATH.read_bytes().replace(
                    b"exactly one", b"at least one", 1
                )
            )
            completed = run_renderer("--check", "--output", str(stale))
            self.assertEqual(completed.returncode, 1)
            self.assertIn("stale", completed.stdout + completed.stderr)

    def test_check_mode_fails_when_policy_metadata_changes_but_the_document_does_not(
        self,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            policy_directory = Path(temporary) / "policy"
            policy_directory.mkdir()
            for path in (REPOSITORY_ROOT / "policy").glob("*.ttl"):
                text = path.read_text(encoding="utf-8")
                if path.name == "entity-policy.ttl":
                    text = text.replace(
                        'sh:name "Creation timestamp"@en',
                        'sh:name "Creation time stamp"@en',
                    )
                (policy_directory / path.name).write_text(text, encoding="utf-8")
            completed = run_renderer(
                "--check", "--policy-directory", str(policy_directory)
            )
            self.assertEqual(completed.returncode, 1)

    def test_generate_mode_writes_the_document_deterministically(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "out.md"
            first = run_renderer("--output", str(output))
            self.assertEqual(first.returncode, 0, first.stderr)
            produced = output.read_bytes()
            second = run_renderer("--output", str(output))
            self.assertEqual(second.returncode, 0)
            self.assertEqual(output.read_bytes(), produced)
            self.assertEqual(produced, GENERATED_DOCUMENT_PATH.read_bytes())

    def test_a_broken_policy_is_a_definition_error_with_status_2(self):
        with tempfile.TemporaryDirectory() as temporary:
            policy_directory = Path(temporary) / "policy"
            policy_directory.mkdir()
            for path in (REPOSITORY_ROOT / "policy").glob("*.ttl"):
                text = path.read_text(encoding="utf-8")
                if path.name == "entity-policy.ttl":
                    text = text.replace(
                        'uop:requirementId "EP-ENTITY-CREATED"',
                        'uop:requirementId "EP-HUMAN-CONCEPT-REUSE"',
                    )
                (policy_directory / path.name).write_text(text, encoding="utf-8")
            completed = run_renderer(
                "--check", "--policy-directory", str(policy_directory)
            )
            self.assertEqual(completed.returncode, 2)


if __name__ == "__main__":
    unittest.main()
