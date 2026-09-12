"""Native reports and qualification receipts: retained evidence keyed to exact inputs."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

from rdflib import Graph

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
sys.path.insert(0, str(REPOSITORY_ROOT))

from ontology_policy import RunPurpose, validate_sources  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.reports import github_annotation, write_report  # noqa: E402
from tests.test_ontology_policy import FIXTURE_AUTHORITIES, fixture_source  # noqa: E402


class ReportWritingTest(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy()

    def test_a_run_writes_a_native_graph_and_a_json_summary_keyed_to_inputs(self):
        outcome = validate_sources([fixture_source("entity-created/created.ttl")], RunPurpose.DRAFT, self.policy, authorities_directory=FIXTURE_AUTHORITIES)
        with tempfile.TemporaryDirectory() as temporary:
            written = write_report(outcome, Path(temporary))
            report = json.loads(written.summary_path.read_text(encoding="utf-8"))
            self.assertEqual(report["purpose"], "draft")
            self.assertEqual(report["status"], 1)
            self.assertFalse(report["qualifies"])
            self.assertEqual(report["policyIdentity"], self.policy.identity)
            self.assertTrue(report["modules"][0]["digest"].startswith("sha256:"))
            self.assertIn("iana-media-types", {a["name"] for a in report["authorities"]})
            self.assertTrue(report["runtime"]["pyshacl"])
            self.assertTrue(report["lockIdentity"].startswith("sha256:"))
            first = [r for r in report["results"] if r["requirementId"] == "EP-ENTITY-CREATED"][0]
            self.assertTrue(first["policyAnchor"].startswith("docs/policy/Editing-Policy.generated.md#"))
            self.assertIn("dcterms:created", first["repairGuidance"])
            graph = Graph().parse(written.graph_path, format="turtle")
            self.assertGreater(len(graph), 0)
            self.assertEqual(report["counts"]["violations"], len(outcome.violations))

    def test_a_qualifying_run_writes_a_receipt_bound_to_exact_module_bytes(self):
        outcome = validate_sources([fixture_source("complete/complete.ttl")], RunPurpose.LATEST_ACTIVE, self.policy, authorities_directory=FIXTURE_AUTHORITIES)
        with tempfile.TemporaryDirectory() as temporary:
            written = write_report(outcome, Path(temporary))
            self.assertIsNotNone(written.receipt_path)
            receipt = json.loads(written.receipt_path.read_text(encoding="utf-8"))
            self.assertTrue(receipt["qualifies"])
            self.assertEqual(receipt["modules"][0]["locator"], "complete/complete.ttl")
            self.assertEqual(receipt["policyIdentity"], self.policy.identity)

    def test_a_non_qualifying_run_writes_no_receipt_but_keeps_its_failure_report(self):
        outcome = validate_sources([fixture_source("entity-created/created.ttl")], RunPurpose.LATEST_ACTIVE, self.policy, authorities_directory=FIXTURE_AUTHORITIES)
        with tempfile.TemporaryDirectory() as temporary:
            written = write_report(outcome, Path(temporary))
            self.assertIsNone(written.receipt_path)
            self.assertTrue(written.summary_path.is_file())
            self.assertTrue(written.graph_path.is_file())

    def test_github_annotations_escape_untrusted_message_text(self):
        line = github_annotation("error", "EP-X", "https://example.org/a", "first line\nsecond %% line\r::error::fake")
        self.assertEqual(line.count("\n"), 0)
        self.assertNotIn("\n::error::fake", line)
        self.assertIn("%0A", line)
        self.assertIn("%25", line)


if __name__ == "__main__":
    unittest.main()
