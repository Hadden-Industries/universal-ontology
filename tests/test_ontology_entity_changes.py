"""DEC-016 change facts: rooted closures compared natively, independent of physical paths."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from rdflib import URIRef

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
sys.path.insert(0, str(REPOSITORY_ROOT))

from ontology_policy.changes import ChangeKind, classify_changes, rooted_closure  # noqa: E402
from ontology_policy.snapshots import parse_module_bytes, read_module_source  # noqa: E402
from tests.test_ontology_policy import FIXTURE_MODULE  # noqa: E402

EX = "https://example.org/fixtures/entity/"
PREFIXES = """@prefix ex: <https://example.org/fixtures/entity/> . @prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . @prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
ex: a owl:Ontology ; owl:versionIRI ex:20260101 ; owl:versionInfo "2026-01-01" .
"""


def graph(turtle: str, name="g.ttl"):
    return parse_module_bytes(FIXTURE_MODULE, name, (PREFIXES + turtle).encode("utf-8"), "turtle")


def kinds(previous: str, current: str):
    facts = classify_changes(graph(current, "current.ttl"), graph(previous, "previous.ttl"))
    return {str(subject).replace(EX, "ex:"): kind for subject, kind in facts.items()}


BASE = """
ex:A a owl:Class ; rdfs:label "A"@en ; rdfs:subClassOf [ a owl:Restriction ; owl:onProperty ex:p ; owl:someValuesFrom ex:B ] .
ex:B a owl:Class ; rdfs:label "B"@en .
ex:C a owl:Class ; rdfs:label "C"@en ; owl:unionOf ( ex:A ex:B ) .
ex:p a owl:ObjectProperty ; rdfs:range ex:A .
[] a owl:Axiom ; owl:annotatedSource ex:A ; owl:annotatedProperty rdfs:label ; owl:annotatedTarget "A"@en ; rdfs:comment "note"@en .
"""


class ClosureClassificationTest(unittest.TestCase):
    def test_serialisation_prefix_order_and_blank_node_labels_do_not_count(self):
        reordered = """
ex:p a owl:ObjectProperty ; rdfs:range ex:A .
ex:C a owl:Class ; owl:unionOf ( ex:A ex:B ) ; rdfs:label "C"@en .
ex:B rdfs:label "B"@en ; a owl:Class .
_:x a owl:Axiom ; owl:annotatedProperty rdfs:label ; owl:annotatedSource ex:A ; owl:annotatedTarget "A"@en ; rdfs:comment "note"@en .
ex:A rdfs:subClassOf _:r ; a owl:Class ; rdfs:label "A"@en .
_:r a owl:Restriction ; owl:someValuesFrom ex:B ; owl:onProperty ex:p .
"""
        self.assertEqual(set(kinds(BASE, reordered).values()), {ChangeKind.UNCHANGED})

    def test_outgoing_assertion_change_marks_only_the_subject(self):
        changed = BASE.replace('ex:B a owl:Class ; rdfs:label "B"@en .', 'ex:B a owl:Class ; rdfs:label "B renamed"@en .')
        result = kinds(BASE, changed)
        self.assertEqual(result["ex:B"], ChangeKind.CHANGED)
        self.assertEqual(result["ex:A"], ChangeKind.UNCHANGED)
        self.assertEqual(result["ex:C"], ChangeKind.UNCHANGED)

    def test_changing_a_range_changes_the_property_not_its_targets(self):
        changed = BASE.replace("rdfs:range ex:A", "rdfs:range ex:B")
        result = kinds(BASE, changed)
        self.assertEqual(result["ex:p"], ChangeKind.CHANGED)
        self.assertEqual(result["ex:A"], ChangeKind.UNCHANGED)
        self.assertEqual(result["ex:B"], ChangeKind.UNCHANGED)

    def test_attached_restriction_and_list_edits_change_their_owner(self):
        restriction = BASE.replace("owl:someValuesFrom ex:B", "owl:someValuesFrom ex:C")
        self.assertEqual(kinds(BASE, restriction)["ex:A"], ChangeKind.CHANGED)
        listed = BASE.replace("owl:unionOf ( ex:A ex:B )", "owl:unionOf ( ex:B ex:A )")
        self.assertEqual(kinds(BASE, listed)["ex:C"], ChangeKind.CHANGED)

    def test_axiom_annotation_edit_changes_the_annotated_source(self):
        changed = BASE.replace('rdfs:comment "note"@en', 'rdfs:comment "different note"@en')
        result = kinds(BASE, changed)
        self.assertEqual(result["ex:A"], ChangeKind.CHANGED)
        self.assertEqual(result["ex:B"], ChangeKind.UNCHANGED)

    def test_shared_structure_edit_affects_every_owner(self):
        shared = BASE + """
ex:D a owl:Class ; rdfs:subClassOf ex:shared .
ex:E a owl:Class ; rdfs:subClassOf ex:shared .
ex:shared a owl:Class ; owl:equivalentClass [ a owl:Restriction ; owl:onProperty ex:p ; owl:hasValue ex:B ] .
"""
        edited = shared.replace("owl:hasValue ex:B", "owl:hasValue ex:C")
        result = kinds(shared, edited)
        self.assertEqual(result["ex:shared"], ChangeKind.CHANGED)
        # incoming links alone do not change D and E
        self.assertEqual(result["ex:D"], ChangeKind.UNCHANGED)
        self.assertEqual(result["ex:E"], ChangeKind.UNCHANGED)

    def test_shared_anonymous_structure_changes_each_owner_that_attaches_it(self):
        shared = BASE + """
ex:D a owl:Class ; rdfs:subClassOf _:s .
ex:E a owl:Class ; rdfs:subClassOf _:s .
_:s a owl:Restriction ; owl:onProperty ex:p ; owl:hasValue ex:B .
"""
        edited = shared.replace("owl:hasValue ex:B", "owl:hasValue ex:C")
        result = kinds(shared, edited)
        self.assertEqual(result["ex:D"], ChangeKind.CHANGED)
        self.assertEqual(result["ex:E"], ChangeKind.CHANGED)

    def test_added_deleted_and_revert(self):
        with_new = BASE + 'ex:New a owl:Class ; rdfs:label "New"@en .\n'
        self.assertEqual(kinds(BASE, with_new)["ex:New"], ChangeKind.ADDED)
        self.assertEqual(kinds(with_new, BASE)["ex:New"], ChangeKind.DELETED)
        self.assertEqual(kinds(BASE, BASE.replace('"B"@en', '"B"@en')), kinds(BASE, BASE))
        self.assertTrue(all(kind == ChangeKind.UNCHANGED for kind in kinds(BASE, BASE).values()))

    def test_closure_contents_are_exactly_the_owned_structure(self):
        source = graph(BASE)
        closure = rooted_closure(source.graph, URIRef(EX + "A"))
        predicates = {str(p).rsplit("#", 1)[-1].rsplit("/", 1)[-1] for _, p, _ in closure}
        self.assertTrue({"type", "label", "subClassOf", "onProperty", "someValuesFrom", "annotatedSource", "comment"} <= predicates)
        self.assertNotIn(URIRef(EX + "B"), set(closure.subjects()))


class GitSnapshotSelectionTest(unittest.TestCase):
    """Exact bytes come from the index or a commit, never from an unstaged worktree substitution."""

    def test_staged_and_worktree_bytes_are_distinguished_in_both_directions(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
            subprocess.run(["git", "-C", str(repo), "config", "user.email", "t@example.org"], check=True)
            subprocess.run(["git", "-C", str(repo), "config", "user.name", "t"], check=True)
            path = repo / "module.ttl"
            path.write_text(PREFIXES + BASE, encoding="utf-8")
            subprocess.run(["git", "-C", str(repo), "add", "module.ttl"], check=True)
            subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "base"], check=True)
            committed = read_module_source(FIXTURE_MODULE, "module.ttl", revision="HEAD", repository=repo)
            # stage a change, then alter the worktree differently
            path.write_text(PREFIXES + BASE.replace('"B"@en', '"B staged"@en'), encoding="utf-8")
            subprocess.run(["git", "-C", str(repo), "add", "module.ttl"], check=True)
            path.write_text(PREFIXES + BASE.replace('"B"@en', '"B worktree"@en'), encoding="utf-8")
            staged = read_module_source(FIXTURE_MODULE, "module.ttl", revision="", repository=repo)
            worktree = read_module_source(FIXTURE_MODULE, "module.ttl", repository=repo)
            self.assertIn(b"B staged", staged.raw)
            self.assertIn(b"B worktree", worktree.raw)
            self.assertNotEqual(staged.digest, worktree.digest)
            self.assertEqual(classify_changes(staged, committed)[URIRef(EX + "B")], ChangeKind.CHANGED)
            self.assertEqual(classify_changes(committed, committed)[URIRef(EX + "B")], ChangeKind.UNCHANGED)
            # a renamed path with identical bytes is not a graph change
            renamed = read_module_source(FIXTURE_MODULE, "module.ttl", revision="HEAD", repository=repo)
            self.assertTrue(all(kind == ChangeKind.UNCHANGED for kind in classify_changes(renamed, committed).values()))
            from ontology_policy.snapshots import InputError

            with self.assertRaises(InputError):
                read_module_source(FIXTURE_MODULE, "missing.ttl", revision="HEAD", repository=repo)


if __name__ == "__main__":
    unittest.main()


class ConditionalModifiedTest(unittest.TestCase):
    """EP-MODIFIED's change obligation is decided by SHACL over trusted change facts."""

    PREVIOUS = """
ex:A a owl:Class ; rdfs:label "A"@en ; skos:prefLabel "A"@en ; dcterms:modified "2026-01-01"^^xsd:date .
ex:B a owl:Class ; rdfs:label "B"@en ; skos:prefLabel "B"@en .
ex:C a owl:Class ; rdfs:label "C"@en ; skos:prefLabel "C"@en ; dcterms:modified "2026-01-01"^^xsd:date .
ex:D a owl:Class ; rdfs:label "D"@en ; skos:prefLabel "D"@en .
ex:F a owl:Class ; rdfs:label "F"@en ; skos:prefLabel "F"@en ; rdfs:subClassOf ex:D .
ex:G a owl:Class ; skos:prefLabel "G"@en .
"""
    CURRENT = """
ex:A a owl:Class ; rdfs:label "A changed"@en ; skos:prefLabel "A"@en ; dcterms:modified "2026-01-01"^^xsd:date .
ex:B a owl:Class ; rdfs:label "B changed"@en ; skos:prefLabel "B"@en .
ex:C a owl:Class ; rdfs:label "C"@en ; skos:prefLabel "C"@en ; dcterms:modified "2026-01-01"^^xsd:date .
ex:E a owl:Class ; rdfs:label "E"@en ; skos:prefLabel "E"@en .
ex:F a owl:Class ; rdfs:label "F"@en ; skos:prefLabel "F"@en ; rdfs:subClassOf ex:D .
ex:G a owl:Class ; skos:prefLabel "G"@en .
"""

    def setUp(self):
        from ontology_policy.policy import load_policy
        from tests.test_ontology_policy import FIXTURE_AUTHORITIES

        self.policy = load_policy()
        self.authorities = FIXTURE_AUTHORITIES
        self.current = graph(self.CURRENT, "current.ttl")
        self.previous = graph(self.PREVIOUS, "previous.ttl")

    def run_policy(self, purpose, comparisons, policy=None, **kwargs):
        from ontology_policy import validate_sources

        return validate_sources([self.current], purpose, policy or self.policy, authorities_directory=self.authorities,
                                comparisons=comparisons, **kwargs)

    def modified_results(self, outcome):
        return {r.focus_node.replace(EX, "ex:") for r in outcome.results if r.requirement_id == "EP-MODIFIED"}

    def test_changed_entity_without_modified_fails_while_unchanged_value_new_entity_and_untouched_pass(self):
        from ontology_policy import RunPurpose

        outcome = self.run_policy(RunPurpose.DRAFT, {FIXTURE_MODULE.iri: self.previous})
        self.assertEqual(self.modified_results(outcome), {"ex:B"})
        self.assertEqual(outcome.comparisons[0][1].split()[0], "previous.ttl")
        self.assertFalse(outcome.qualifies)

    def test_without_a_comparison_the_obligation_is_reported_unevaluated_not_invented(self):
        from ontology_policy import RunPurpose

        outcome = self.run_policy(RunPurpose.LATEST_ACTIVE, {FIXTURE_MODULE.iri: None})
        self.assertEqual(self.modified_results(outcome), set())
        self.assertEqual(outcome.unevaluated_change_obligations, (str(FIXTURE_MODULE.iri),))

    def test_candidate_qualification_requires_a_comparison(self):
        from ontology_policy import RunPurpose
        from ontology_policy.context import ContextError

        with self.assertRaises(ContextError):
            self.run_policy(RunPurpose.CANDIDATE, {FIXTURE_MODULE.iri: None})
        outcome = self.run_policy(RunPurpose.CANDIDATE, {FIXTURE_MODULE.iri: self.previous})
        self.assertIn("ex:B", self.modified_results(outcome))
        self.assertEqual(outcome.status, 1)

    def test_removing_the_shacl_applicability_removes_the_obligation_although_the_facts_remain(self):
        """Python supplies uoc:changeKind facts only; the obligation exists in the policy alone."""
        from ontology_policy import RunPurpose
        from ontology_policy.policy import load_policy
        from tests.test_ontology_policy import mutated_policy_directory

        with tempfile.TemporaryDirectory() as temporary:
            directory = mutated_policy_directory(
                temporary, "entity-policy.ttl",
                "            ?this uoc:changeKind uoc:Changed .",
                "            ?this uoc:changeKind uoc:Unchanged .",
            )
            outcome = self.run_policy(RunPurpose.DRAFT, {FIXTURE_MODULE.iri: self.previous}, policy=load_policy(directory))
        self.assertEqual(self.modified_results(outcome), set())
        # the classifier facts were still supplied
        from ontology_policy.context import build_validation_graph
        from ontology_policy.namespaces import UOC

        _, context = build_validation_graph([self.current], RunPurpose.DRAFT, {FIXTURE_MODULE.iri: self.previous})
        self.assertEqual(context.value(URIRef(EX + "B"), UOC.changeKind), UOC.Changed)
        self.assertEqual(context.value(URIRef(EX + "A"), UOC.changeKind), UOC.Changed)
        self.assertEqual(context.value(URIRef(EX + "E"), UOC.changeKind), UOC.Added)
        self.assertIn((URIRef(EX + "F"), UOC.refersToDeleted, URIRef(EX + "D")), context)

    def test_critical_fix_scope_limits_results_and_never_qualifies(self):
        from ontology_policy import RunPurpose
        from ontology_policy.context import ContextError

        with self.assertRaises(ContextError):
            self.run_policy(RunPurpose.CRITICAL_FIX, {FIXTURE_MODULE.iri: self.previous})
        outcome = self.run_policy(RunPurpose.CRITICAL_FIX, {FIXTURE_MODULE.iri: self.previous}, scope_reference="Issue #99 approved scope")
        focus = {r.focus_node.replace(EX, "ex:") for r in outcome.results}
        self.assertIn("ex:B", focus)
        self.assertNotIn("ex:G", focus, "an untouched historic defect is outside the fix scope")
        self.assertFalse(outcome.qualifies)
        draft = self.run_policy(RunPurpose.DRAFT, {FIXTURE_MODULE.iri: self.previous})
        self.assertIn("ex:G", {r.focus_node.replace(EX, "ex:") for r in draft.results})
