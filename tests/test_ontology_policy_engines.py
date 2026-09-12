"""Cross-engine parity: Apache Jena must agree with pySHACL on rule/focus/path/value/severity.

The second engine is an explicit qualification input. Without
UNIVERSAL_ONTOLOGY_JENA_HOME and UNIVERSAL_ONTOLOGY_JAVA_HOME the tests are
skipped and the skip is a recorded gap, not a pass.
"""
import sys
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
sys.path.insert(0, str(REPOSITORY_ROOT))

from ontology_policy import RunPurpose, validate_sources  # noqa: E402
from ontology_policy.jena import JenaRuntime, JenaUnavailable, comparable, validate_with_jena  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from tests.test_ontology_policy import assert_matches_expected, expected, fixture_source  # noqa: E402


def jena_runtime_or_skip(test: unittest.TestCase) -> JenaRuntime:
    try:
        return JenaRuntime.from_environment()
    except JenaUnavailable as exc:
        test.skipTest(f"second engine not provisioned: {exc}")


class CreatedTimestampCrossEngineTest(unittest.TestCase):
    def setUp(self):
        self.runtime = jena_runtime_or_skip(self)
        self.policy = load_policy()

    def test_jena_reproduces_the_independent_expectation(self):
        source = fixture_source("entity-created/created.ttl")
        outcome = validate_with_jena([source], RunPurpose.DRAFT, self.policy, self.runtime)
        assert_matches_expected(self, outcome, expected("entity-created/created.expected.json"))

    def test_both_engines_agree_on_rule_focus_path_value_and_severity(self):
        from tests.test_ontology_policy import FIXTURES, module_from_expectation
        import json

        fixtures = ["entity-created/created.owl"]
        fixtures += [p.relative_to(FIXTURES).as_posix().replace(".expected.json", ".ttl") for p in sorted(FIXTURES.rglob("*.expected.json"))]
        for relative in fixtures:
            with self.subTest(fixture=relative):
                expectation_path = FIXTURES / relative.replace(".ttl", ".expected.json").replace(".owl", ".expected.json")
                module = module_from_expectation(json.loads(expectation_path.read_text(encoding="utf-8")))
                source = fixture_source(relative, module)
                pyshacl_outcome = validate_sources([source], RunPurpose.DRAFT, self.policy)
                jena_outcome = validate_with_jena([source], RunPurpose.DRAFT, self.policy, self.runtime)
                self.assertEqual(comparable(pyshacl_outcome.results), comparable(jena_outcome.results))
                self.assertEqual(pyshacl_outcome.conforms, jena_outcome.conforms)
                # Anonymous focus nodes must not be lost: compare their multiplicity per rule.
                for rule in {r.requirement_id for r in pyshacl_outcome.results}:
                    self.assertEqual(
                        sum(1 for r in pyshacl_outcome.results if r.requirement_id == rule and r.focus_node.startswith("_:")),
                        sum(1 for r in jena_outcome.results if r.requirement_id == rule and r.focus_node.startswith("_:")),
                        rule,
                    )

    def test_runtime_identity_is_the_qualified_jena_and_jdk(self):
        identity = self.runtime.identity()
        self.assertEqual(identity["jena"], "6.2.0")
        self.assertIn("25.", identity["java"])


if __name__ == "__main__":
    unittest.main()
