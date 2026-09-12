"""The publication gate binds the exact active-set bytes and derived outputs to a qualifying receipt."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.publication import PublicationRefusal, check_publication_gate  # noqa: E402

MODULE = "https://haddenindustries.com/ontology/policy/activation/core"


def sha(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


class PublicationGateTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "src" / "universal" / "core").mkdir(parents=True)
        (self.root / "dist" / "universal" / "core").mkdir(parents=True)
        self.source = self.root / "src" / "universal" / "core" / "20260714"
        self.source.write_bytes(b"<rdf/>core-bytes")
        (self.root / "dist" / "universal" / "core" / "20260714").write_bytes(b"<rdf/>core-bytes")
        self.reports = self.root / "reports"
        self.reports.mkdir()
        self.receipt = {
            "receiptVersion": 1, "purpose": "latest-active", "qualifies": True,
            "policyIdentity": "sha256:policy", "lockIdentity": "sha256:lock",
            "modules": [{"module": MODULE, "locator": "src/universal/core/20260714", "digest": sha(b"<rdf/>core-bytes")}],
            "authorities": [{"name": "iana-media-types", "digest": "sha256:auth"}],
            "comparisons": [], "report": "run/report.json", "issuedAt": "20260912T000000Z",
        }
        self.active = {MODULE: "src/universal/core/20260714"}
        self.write_receipt()

    def tearDown(self):
        self.temporary.cleanup()

    def write_receipt(self):
        (self.reports / "qualification-receipt.json").write_text(json.dumps(self.receipt), encoding="utf-8")

    def gate(self, **overrides):
        arguments = dict(repository=self.root, report_directory=self.reports, active_artifacts=self.active,
                         policy_identity="sha256:policy", authority_identities=(("iana-media-types", "sha256:auth"),),
                         lock_identity="sha256:lock", dist_directory=self.root / "dist")
        arguments.update(overrides)
        return check_publication_gate(**arguments)

    def test_a_current_qualifying_receipt_with_matching_bytes_passes(self):
        verdict = self.gate()
        self.assertEqual(verdict.receipt_purpose, "latest-active")
        self.assertEqual(verdict.bound_artifacts, ("src/universal/core/20260714",))

    def test_missing_receipt_is_refused(self):
        (self.reports / "qualification-receipt.json").unlink()
        with self.assertRaisesRegex(PublicationRefusal, "receipt"):
            self.gate()

    def test_changed_source_bytes_since_qualification_are_refused(self):
        self.source.write_bytes(b"<rdf/>edited-after-qualification")
        with self.assertRaisesRegex(PublicationRefusal, "differs"):
            self.gate()

    def test_changed_policy_or_authorities_or_lock_are_refused(self):
        with self.assertRaisesRegex(PublicationRefusal, "policy"):
            self.gate(policy_identity="sha256:newer-policy")
        with self.assertRaisesRegex(PublicationRefusal, "authorit"):
            self.gate(authority_identities=(("iana-media-types", "sha256:other"),))
        with self.assertRaisesRegex(PublicationRefusal, "lock"):
            self.gate(lock_identity="sha256:other-lock")

    def test_non_qualifying_or_diagnostic_receipt_is_refused(self):
        self.receipt["qualifies"] = False
        self.write_receipt()
        with self.assertRaisesRegex(PublicationRefusal, "qualif"):
            self.gate()
        self.receipt["qualifies"] = True
        self.receipt["purpose"] = "draft"
        self.write_receipt()
        with self.assertRaisesRegex(PublicationRefusal, "purpose"):
            self.gate()

    def test_partially_prepared_module_set_is_refused(self):
        self.active["https://haddenindustries.com/ontology/policy/activation/extended"] = "src/universal/extended/20260714"
        with self.assertRaisesRegex(PublicationRefusal, "extended"):
            self.gate()

    def test_mismatched_derived_output_is_refused(self):
        (self.root / "dist" / "universal" / "core" / "20260714").write_bytes(b"<rdf/>stale-dist")
        with self.assertRaisesRegex(PublicationRefusal, "derived"):
            self.gate()
        (self.root / "dist" / "universal" / "core" / "20260714").unlink()
        with self.assertRaisesRegex(PublicationRefusal, "derived"):
            self.gate()


if __name__ == "__main__":
    unittest.main()
