"""Lossless projection, stale guidance and migration preservation contracts."""

import dataclasses
import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from rdflib import SH, BNode, Graph, Literal, Namespace, URIRef
from rdflib.compare import isomorphic
from rdflib.namespace import DCAT, DCTERMS, SKOS

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ontology_policy import RunPurpose, validate_sources  # noqa: E402
from ontology_policy.documentation_extract import (  # noqa: E402
    extract_documentation,
    rdf_projection,
    rule_characteristics_graph,
)
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.reader_guidance import GUIDANCE_DIRECTORY, load_guidance  # noqa: E402
from ontology_policy.rendering import render_editing_policy  # noqa: E402
from ontology_policy.snapshots import parse_module_bytes  # noqa: E402

from tests.test_ontology_policy import FIXTURE_AUTHORITIES, FIXTURE_MODULE  # noqa: E402


def decode_projection(projection):
    """Independent reconstruction verifies RDF identity, including shared blanks."""
    blanks = {}

    def term(spec):
        if "anonymous" in spec:
            return blanks.setdefault(spec["anonymous"], BNode())
        if "iri" in spec:
            return URIRef(spec["iri"])
        return Literal(
            spec["literal"],
            lang=spec["language"],
            datatype=URIRef(spec["datatype"]) if spec["datatype"] else None,
            normalize=False,
        )

    result = Graph()
    for triple in projection["triples"]:
        result.add(tuple(term(spec) for spec in triple))
    return result


class DocumentationExtractionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = load_policy()
        cls.model = extract_documentation(cls.policy)

    def test_projection_preserves_typed_language_shared_and_cyclic_rdf(self):
        ns = Namespace("urn:test:")
        graph = Graph()
        shared = BNode("parser-specific")
        graph.add((ns.a, ns.p, shared))
        graph.add((ns.b, ns.p, shared))
        graph.add((shared, ns.p, shared))
        graph.add((shared, ns.label, Literal("colour", lang="en-GB")))
        graph.add(
            (shared, ns["count"], Literal("01", datatype=ns.integer, normalize=False))
        )
        encoded = rdf_projection(graph)
        self.assertTrue(isomorphic(graph, decode_projection(encoded)))
        renamed = Graph()
        for triple in reversed(list(graph)):
            renamed.add(
                tuple(
                    BNode("other-parser") if term == shared else term for term in triple
                )
            )
        self.assertEqual(encoded, rdf_projection(renamed))
        self.assertNotIn("parser-specific", json.dumps(encoded))

    def test_all_rule_graphs_round_trip_with_no_lost_characteristics(self):
        self.assertEqual(
            {rule.identifier for rule in self.model.rules},
            set(self.policy.requirement_ids().values()),
        )
        for rule in self.model.rules:
            with self.subTest(rule=rule.identifier):
                self.assertTrue(
                    isomorphic(
                        rule_characteristics_graph(
                            self.policy, URIRef(rule.resource_iri)
                        ),
                        decode_projection(json.loads(rule.characteristics_json)),
                    )
                )

    def test_severity_and_constraint_mutations_change_the_rule_fingerprint(self):
        altered = Graph()
        altered += self.policy.rules
        resource = URIRef(
            "https://haddenindustries.com/ontology/policy/editing/EP-DISTRIBUTION-MEDIA"
        )
        altered.set((resource, SH.severity, SH.Warning))
        changed = extract_documentation(dataclasses.replace(self.policy, rules=altered))
        self.assertNotEqual(
            self.model.fingerprints()["EP-DISTRIBUTION-MEDIA"],
            changed.fingerprints()["EP-DISTRIBUTION-MEDIA"],
        )

    def test_presence_is_independent_of_strength_and_tracks_qualified_counts(self):
        rules = {rule.identifier: rule for rule in self.model.rules}
        media = rules["EP-DISTRIBUTION-MEDIA"]
        uuid = rules["EP-ENTITY-UUID"]
        self.assertEqual(media.strength, uuid.strength)
        self.assertTrue(
            any(obligation.presence == "required" for obligation in uuid.obligations)
        )
        self.assertTrue(
            any(
                obligation.presence == "optional in this constraint"
                for obligation in media.obligations
            )
        )

    def test_changed_rule_and_unresolved_guidance_fail_closed(self):
        changed = dataclasses.replace(
            self.model,
            rules=tuple(
                dataclasses.replace(rule, fingerprint="sha256:changed")
                if rule.identifier == "EP-DEFINITION"
                else rule
                for rule in self.model.rules
            ),
        )
        with self.assertRaisesRegex(ValueError, "stale"):
            load_guidance(changed)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for path in GUIDANCE_DIRECTORY.iterdir():
                if path.is_file():
                    shutil.copyfile(path, root / path.name)
            path = root / "reader-guidance.ttl"
            path.write_text(
                path.read_text(encoding="utf-8").replace(
                    '"EP-DEFINITION"', '"EP-UNKNOWN"'
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "unknown requirement"):
                load_guidance(self.model, root)

    def test_guidance_validation_does_not_change_production_policy(self):
        before = rdf_projection(self.policy.rules)
        summaries = load_guidance(self.model)
        self.assertEqual(len(summaries), 6)
        self.assertEqual(before, rdf_projection(self.policy.rules))
        self.assertFalse(
            any(
                "urn:universal-ontology:docs:" in str(term)
                for triple in self.policy.rules
                for term in triple
            )
        )

    def test_required_contributor_task_cannot_disappear_with_its_review_record(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for path in GUIDANCE_DIRECTORY.iterdir():
                if path.is_file():
                    shutil.copyfile(path, directory / path.name)
            graph = Graph().parse(directory / "reader-guidance.ttl", format="turtle")
            graph.remove(
                (
                    URIRef("urn:universal-ontology:docs:editing-policy:meaning"),
                    None,
                    None,
                )
            )
            (directory / "reader-guidance.ttl").write_bytes(
                graph.serialize(format="turtle").encode("utf-8")
            )
            path = directory / "guidance-reviews.json"
            reviews = json.loads(path.read_text(encoding="utf-8"))
            del reviews["meaning"]
            path.write_bytes(json.dumps(reviews).encode("utf-8"))
            with self.assertRaisesRegex(ValueError, "Reader guidance contract failed"):
                load_guidance(self.model, directory)

    def test_rendered_constraint_data_reconstructs_every_source_rule(self):
        text = render_editing_policy(self.policy)
        shared = text.split("**Shared policy metadata and prefixes:**\n", 1)[1].split(
            "\n### EP-", 1
        )[0]
        reconstructed = decode_projection(
            json.loads(re.search(r"```json\n(.*?)\n```", shared, re.S).group(1))
        )
        for rule in self.model.rules:
            section = text.split(f"### {rule.identifier}\n", 1)[1].split("\n### ", 1)[0]
            projection = json.loads(
                re.search(r"```json\n(.*?)\n```", section, re.S).group(1)
            )
            self.assertTrue(
                isomorphic(
                    rule_characteristics_graph(self.policy, URIRef(rule.resource_iri)),
                    decode_projection(projection),
                )
            )
            reconstructed += decode_projection(projection)
        self.assertTrue(
            isomorphic(self.policy.rules, reconstructed),
            "The complete rendered projection must reconstruct the entire canonical graph",
        )


class ProductionGoldenMutationTest(unittest.TestCase):
    """Whole-result assertions through the production loader/context/report path.

    The existing fixture suite owns exhaustive rule-family expectations. These
    golden mutations close the correlated/unexpected-result question at the
    documentation's highest-risk examples without duplicating that suite.
    """

    @classmethod
    def setUpClass(cls):
        cls.policy = load_policy()
        cls.module = dataclasses.replace(
            FIXTURE_MODULE,
            owned_namespaces=(
                *FIXTURE_MODULE.owned_namespaces,
                "https://haddenindustries.com/ontology/dataset/",
                "https://haddenindustries.com/ontology/distribution/",
            ),
        )
        cls.raw = (
            (ROOT / "tests/fixtures/ontology-policy/complete/complete.ttl").read_bytes()
            + b"\n"
            + (ROOT / "docs/editing-policy/fixtures/golden/dcat.ttl").read_bytes()
        )
        cls.baseline = parse_module_bytes(cls.module, "golden.ttl", cls.raw)
        cls.entity = URIRef("https://example.org/fixtures/entity/Colour")
        cls.distribution = URIRef(
            "https://haddenindustries.com/ontology/distribution/9f1c0a52-3b7e-4d21-8a6f-2c4e5b7d9a10"
        )

    def run_graph(self, graph, *, comparison=False):
        source = parse_module_bytes(
            self.module, "mutated.ttl", graph.serialize(format="turtle").encode("utf-8")
        )
        return validate_sources(
            [source],
            RunPurpose.DRAFT,
            self.policy,
            comparisons={self.module.iri: self.baseline} if comparison else None,
            authorities_directory=FIXTURE_AUTHORITIES,
        )

    def test_valid_golden_targets_entities_and_specialist_resources_without_results(
        self,
    ):
        outcome = self.run_graph(self.baseline.graph)
        self.assertEqual(outcome.results, ())
        self.assertEqual(outcome.targeted_focus_count, 7)

    def test_single_mutations_have_exact_rule_focus_severity_and_no_unexpected_results(
        self,
    ):
        cases = [
            (
                "EP-ENTITY-UUID",
                self.entity,
                DCTERMS.identifier,
                None,
                False,
                SH.Violation,
            ),
            (
                "EP-ENTITY-CREATED",
                self.entity,
                DCTERMS.created,
                None,
                False,
                SH.Violation,
            ),
            (
                "EP-ENTITY-CREATOR",
                self.entity,
                DCTERMS.creator,
                Literal("not an ORCID"),
                False,
                SH.Violation,
            ),
            (
                "EP-PREFLABEL-LANGUAGE",
                self.entity,
                SKOS.prefLabel,
                None,
                False,
                SH.Violation,
            ),
            ("EP-DEFINITION", self.entity, SKOS.definition, None, False, SH.Violation),
            ("EP-MODIFIED", self.entity, DCTERMS.modified, None, True, SH.Violation),
            (
                "EP-DISTRIBUTION-MEDIA",
                self.distribution,
                DCAT.mediaType,
                URIRef("https://example.org/not-a-pinned-media-type"),
                False,
                SH.Violation,
            ),
            (
                "EP-DISTRIBUTION-REQUIRED",
                self.distribution,
                DCAT.accessURL,
                None,
                False,
                SH.Violation,
            ),
            (
                "EP-DISTRIBUTION-LICENCE",
                self.distribution,
                DCTERMS.license,
                Literal("not an IRI"),
                False,
                SH.Violation,
            ),
            (
                "EP-DISTRIBUTION-RIGHTS",
                self.distribution,
                DCTERMS.rights,
                Literal("literal rights"),
                False,
                SH.Warning,
            ),
        ]
        for identifier, focus, predicate, value, comparison, severity in cases:
            with self.subTest(rule=identifier):
                graph = Graph()
                graph += self.baseline.graph
                # Every mutation starts from the same independently authored,
                # conforming graph, preserving target types and ownership.
                self.assertTrue(
                    any(
                        graph.objects(
                            focus,
                            URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                        )
                    )
                )
                graph.remove((focus, predicate, None))
                if value is not None:
                    graph.add((focus, predicate, value))
                outcome = self.run_graph(graph, comparison=comparison)
                observed = set()
                for report in outcome.results_graph.subjects(SH.conforms, None):
                    for result in outcome.results_graph.objects(report, SH.result):
                        owner = self.policy.requirement_for_shape(
                            outcome.results_graph.value(result, SH.sourceShape)
                        )
                        self.assertIsNotNone(
                            owner,
                            "Every result must resolve through the production owner resolver",
                        )
                        observed.add(
                            (
                                self.policy.requirement_ids()[owner],
                                str(outcome.results_graph.value(result, SH.focusNode)),
                                str(
                                    outcome.results_graph.value(
                                        result, SH.resultSeverity
                                    )
                                ),
                            )
                        )
                # Removing every preferred label violates both its presence and
                # the separately required local-name correspondence (canonical
                # EP-PREFLABEL-IRI description and FILTER NOT EXISTS query).
                expected_rules = (
                    {"EP-PREFLABEL-LANGUAGE", "EP-PREFLABEL-IRI"}
                    if identifier == "EP-PREFLABEL-LANGUAGE"
                    else {identifier}
                )
                self.assertEqual(
                    observed,
                    {(rule, str(focus), str(severity)) for rule in expected_rules},
                )

    def test_unavailable_comparison_remains_unevaluated_with_no_fabricated_failure(
        self,
    ):
        graph = Graph()
        graph += self.baseline.graph
        graph.remove((self.entity, DCTERMS.modified, None))
        outcome = self.run_graph(graph)
        self.assertEqual(outcome.results, ())
        self.assertEqual(
            outcome.unevaluated_change_obligations, (str(self.module.iri),)
        )


if __name__ == "__main__":
    unittest.main()
