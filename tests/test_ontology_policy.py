"""Contracts of the SHACL editing policy at the ontology_policy package boundary.

Expected results are authored independently in *.expected.json next to each
fixture; the shapes under test are never the oracle.
"""
import json
import sys
import unittest
from pathlib import Path

from rdflib import Graph, URIRef
from rdflib.compare import isomorphic

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy import OwnedModule, RunPurpose, validate_sources  # noqa: E402
from ontology_policy.context import ContextError  # noqa: E402
from ontology_policy.modules import PolicyDefinitionError  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.snapshots import parse_module_bytes  # noqa: E402

FIXTURES = REPOSITORY_ROOT / "tests" / "fixtures" / "ontology-policy"

FIXTURE_MODULE = OwnedModule(
    iri=URIRef("https://example.org/policy-fixture/module/entity"),
    label="Fixture entity module",
    ontology_iri=URIRef("https://example.org/fixtures/entity/"),
    owned_namespaces=("https://example.org/fixtures/entity/",),
    working_path="fixture/entity.ttl",
    active_version_iri=None,
    active_artifact_path=None,
)


def fixture_source(relative: str, module: OwnedModule = FIXTURE_MODULE):
    path = FIXTURES / relative
    return parse_module_bytes(module, relative, path.read_bytes())


def expected(relative: str) -> dict:
    return json.loads((FIXTURES / relative).read_text(encoding="utf-8"))


def observed_triples(outcome):
    return {(r.requirement_id, r.focus_node, r.severity) for r in outcome.results}


def assert_matches_expected(test: unittest.TestCase, outcome, expectation: dict) -> None:
    wanted = {(e["requirement_id"], e["focus_node"], e["severity"]) for e in expectation["results"]}
    test.assertEqual(observed_triples(outcome), wanted)
    for entry in expectation["results"]:
        components = {
            r.constraint_component
            for r in outcome.results
            if (r.requirement_id, r.focus_node) == (entry["requirement_id"], entry["focus_node"])
        }
        test.assertTrue(
            set(entry["minimum_components"]) <= components,
            f"{entry['focus_node']}: expected {entry['minimum_components']} within {sorted(components)}",
        )
    for focus in expectation.get("not_targeted", []):
        test.assertFalse(any(r.focus_node == focus for r in outcome.results), focus)


class PolicySelfContractTest(unittest.TestCase):
    def test_policy_loads_and_proves_its_own_metadata_contract(self):
        policy = load_policy()
        self.assertIn("EP-ENTITY-CREATED", set(policy.requirement_ids().values()))
        self.assertTrue(policy.identity.startswith("sha256:"))


class CreatedTimestampRuleTest(unittest.TestCase):
    """EP-ENTITY-CREATED through the real validation path, both serializations."""

    def setUp(self):
        self.policy = load_policy()
        self.expectation = expected("entity-created/created.expected.json")

    def test_turtle_fixture_matches_independent_expectation(self):
        outcome = validate_sources([fixture_source("entity-created/created.ttl")], RunPurpose.DRAFT, self.policy)
        assert_matches_expected(self, outcome, self.expectation)
        self.assertEqual(outcome.status, 1)
        self.assertFalse(outcome.qualifies)
        self.assertEqual(outcome.targeted_focus_count, len(self.expectation["targeted_focus_nodes"]))

    def test_rdfxml_twin_yields_the_same_results(self):
        turtle = fixture_source("entity-created/created.ttl")
        xml = fixture_source("entity-created/created.owl")
        self.assertTrue(isomorphic(turtle.graph, xml.graph), "fixture twins must be the same RDF graph")
        outcome = validate_sources([xml], RunPurpose.DRAFT, self.policy)
        assert_matches_expected(self, outcome, self.expectation)

    def test_every_result_carries_rule_focus_path_value_severity_and_source(self):
        outcome = validate_sources([fixture_source("entity-created/created.ttl")], RunPurpose.DRAFT, self.policy)
        by_focus = {r.focus_node: r for r in outcome.results}
        offset = by_focus["https://example.org/fixtures/entity/OffsetInsteadOfZ"]
        self.assertEqual(offset.path, "http://purl.org/dc/terms/created")
        self.assertIn("+00:00", offset.value)
        self.assertEqual(offset.severity, "Violation")
        self.assertTrue(offset.source_shape)
        self.assertTrue(offset.message)

    def test_valid_only_corpus_qualifies_under_a_qualification_purpose(self):
        graph = fixture_source("entity-created/created.ttl").graph
        valid = Graph()
        for triple in graph:
            if any(str(triple[0]).endswith(name) for name in ("ValidClass", "ValidIndividual", "validObjectProperty", "validDatatypeProperty", "entity/")):
                valid.add(triple)
        source = parse_module_bytes(FIXTURE_MODULE, "valid.ttl", valid.serialize(format="turtle").encode("utf-8"))
        outcome = validate_sources([source], RunPurpose.LATEST_ACTIVE, self.policy)
        self.assertEqual(outcome.results, ())
        self.assertEqual(outcome.status, 0)
        self.assertTrue(outcome.qualifies)


class ContextContractTest(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy()

    def test_authored_context_facts_are_rejected_as_impersonation(self):
        forged = fixture_source("entity-created/created.ttl").graph
        forged.add((
            URIRef("https://example.org/fixtures/entity/MissingCreated"),
            URIRef("https://haddenindustries.com/ontology/policy/context#ownedBy"),
            URIRef("https://example.org/other-module"),
        ))
        source = parse_module_bytes(FIXTURE_MODULE, "forged.ttl", forged.serialize(format="turtle").encode("utf-8"))
        with self.assertRaises(ContextError):
            validate_sources([source], RunPurpose.DRAFT, self.policy)

    def test_a_corpus_that_targets_nothing_is_an_error_not_a_pass(self):
        foreign_only = OwnedModule(
            iri=URIRef("https://example.org/policy-fixture/module/none"),
            label="Owns nothing in the fixture",
            ontology_iri=URIRef("https://example.org/nothing/"),
            owned_namespaces=("https://example.org/nothing/",),
            working_path="fixture/nothing.ttl",
            active_version_iri=None,
            active_artifact_path=None,
        )
        with self.assertRaises(ContextError):
            validate_sources([fixture_source("entity-created/created.ttl", foreign_only)], RunPurpose.DRAFT, self.policy)

    def test_draft_purpose_never_qualifies_even_when_clean(self):
        clean = b"""@prefix ex: <https://example.org/fixtures/entity/> . @prefix owl: <http://www.w3.org/2002/07/owl#> .
            @prefix dcterms: <http://purl.org/dc/terms/> . @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
            ex:Only a owl:Class ; dcterms:created "2026-01-02T03:04:05Z"^^xsd:dateTime ."""
        source = parse_module_bytes(FIXTURE_MODULE, "clean-draft.ttl", clean, "turtle")
        outcome = validate_sources([source], RunPurpose.DRAFT, self.policy)
        self.assertEqual(outcome.status, 0)
        self.assertFalse(outcome.qualifies)


def mutated_policy_directory(temporary: str, filename: str, old: str, new: str) -> Path:
    """Copy the policy with one textual mutation applied to one file."""
    directory = Path(temporary)
    mutated = False
    for path in (REPOSITORY_ROOT / "policy").glob("*.ttl"):
        text = path.read_text(encoding="utf-8")
        if path.name == filename:
            assert old in text, f"mutation anchor {old!r} missing from {filename}"
            text = text.replace(old, new, 1)
            mutated = True
        (directory / path.name).write_text(text, encoding="utf-8")
    assert mutated
    return directory


class PolicyDefinitionGuardTest(unittest.TestCase):
    def test_a_misspelled_shacl_predicate_is_a_policy_definition_error(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            directory = mutated_policy_directory(temporary, "entity-policy.ttl", "sh:minCount", "sh:minCuont")
            with self.assertRaises(PolicyDefinitionError):
                load_policy(directory)

    def test_a_must_rule_downgraded_to_warning_is_a_policy_definition_error(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            directory = mutated_policy_directory(
                temporary, "entity-policy.ttl", "    sh:minCount 1 ;", "    sh:severity sh:Warning ; sh:minCount 1 ;"
            )
            with self.assertRaises(PolicyDefinitionError):
                load_policy(directory)


class TargetMutationControlTest(unittest.TestCase):
    """The independent expectation must notice when a rule loses its target."""

    def test_a_rule_without_its_target_no_longer_reproduces_the_expected_report(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            directory = mutated_policy_directory(
                temporary, "entity-policy.ttl", "    sh:target ep:OwnedEntityTarget ;", ""
            )
            policy = load_policy(directory)
            outcome = validate_sources([fixture_source("entity-created/created.ttl")], RunPurpose.DRAFT, policy)
            wanted = {(e["requirement_id"], e["focus_node"], e["severity"]) for e in expected("entity-created/created.expected.json")["results"]}
            self.assertNotEqual(observed_triples(outcome), wanted)
            self.assertEqual(outcome.results, ())


if __name__ == "__main__":
    unittest.main()
