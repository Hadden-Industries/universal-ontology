"""Rule coverage reconciliation: sets of stable IDs, never counts.

Every executable rule must be documented, have at least one fixture subject
that passes it and at least one that fails it, and resolve to a stable report
identity. Human clauses need documentation only.
"""
import sys
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.coverage import CoverageLedger, reconcile_coverage  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.rendering import render_editing_policy  # noqa: E402


class CoverageReconciliationTest(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy()
        self.ledger: CoverageLedger = reconcile_coverage(self.policy, render_editing_policy(self.policy))

    def test_every_executable_rule_is_documented_with_positive_and_negative_fixtures(self):
        self.assertEqual(self.ledger.executable, self.ledger.documented_executable)
        self.assertEqual(self.ledger.executable, self.ledger.positive)
        self.assertEqual(self.ledger.executable, self.ledger.negative)
        self.assertEqual(self.ledger.problems, ())

    def test_every_human_clause_is_documented_and_has_no_fixture_claim(self):
        self.assertEqual(self.ledger.human, self.ledger.documented_human)
        self.assertFalse(self.ledger.human & (self.ledger.positive | self.ledger.negative))

    def test_a_fixture_claiming_an_unknown_rule_is_reported(self):
        ledger = reconcile_coverage(self.policy, render_editing_policy(self.policy), extra_claims={"EP-DOES-NOT-EXIST": {"positive"}})
        self.assertTrue(any("EP-DOES-NOT-EXIST" in problem for problem in ledger.problems))

    def test_a_duplicate_and_an_omission_do_not_cancel_out(self):
        omitted = sorted(self.ledger.executable)[-1]
        same_size_wrong_members = (set(self.ledger.executable) - {omitted}) | {"EP-EXTRA-DUPLICATE"}
        self.assertEqual(len(same_size_wrong_members), len(self.ledger.executable))
        ledger = reconcile_coverage(self.policy, render_editing_policy(self.policy), override_negative=same_size_wrong_members)
        self.assertNotEqual(ledger.negative, ledger.executable)


if __name__ == "__main__":
    unittest.main()
