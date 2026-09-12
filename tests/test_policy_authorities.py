"""Authority snapshots: native ingestion, provenance, reconciliation and trusted membership."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.authorities import (  # noqa: E402
    AUTHORITY_SPECIFICATIONS,
    AuthorityError,
    derive_snapshot,
    load_authority_graph,
    reconcile_snapshot,
)

FIXTURE_RAW = REPOSITORY_ROOT / "tests" / "fixtures" / "ontology-policy" / "authorities" / "raw"


def rights(source_name: str) -> dict:
    return {"licence": "fixture licence", "rightsDecision": "fixture decision reference", "retrievedOn": "2026-09-12"}


class IngestionTest(unittest.TestCase):
    def test_each_authority_derives_members_with_provenance_from_its_native_format(self):
        expected_counts = {"iana-media-types": 3, "loc-iso639-1": 3, "eu-file-type": 2}
        with tempfile.TemporaryDirectory() as temporary:
            for name, specification in AUTHORITY_SPECIFICATIONS.items():
                raw = FIXTURE_RAW / specification.raw_filename
                snapshot = derive_snapshot(name, raw.read_bytes(), Path(temporary), rights(name))
                self.assertEqual(snapshot.member_count, expected_counts[name], name)
                provenance = json.loads((Path(temporary) / f"{name}.provenance.json").read_text(encoding="utf-8"))
                self.assertEqual(provenance["rawSha256"], hashlib.sha256(raw.read_bytes()).hexdigest())
                self.assertEqual(provenance["memberCount"], expected_counts[name])
                self.assertEqual(provenance["sourceUrl"], specification.source_url)
                self.assertIn(provenance["parser"], ("rdflib", "defusedxml"))
                self.assertTrue(provenance["parserVersion"])
                self.assertEqual(provenance["derivedSha256"], hashlib.sha256((Path(temporary) / f"{name}.members.ttl").read_bytes()).hexdigest())
                self.assertEqual(reconcile_snapshot(name, raw.read_bytes(), Path(temporary)), ())

    def test_members_keep_their_exact_iris(self):
        with tempfile.TemporaryDirectory() as temporary:
            derive_snapshot("loc-iso639-1", (FIXTURE_RAW / "loc-iso639-1.rdf").read_bytes(), Path(temporary), rights("loc"))
            graph = load_authority_graph(Path(temporary), required=("loc-iso639-1",))
            members = {str(o) for o in graph.objects()} | {str(s) for s in graph.subjects()}
            self.assertIn("http://id.loc.gov/vocabulary/iso639-1/en", members)
            self.assertIn("http://id.loc.gov/vocabulary/iso639-1/de", members)

    def test_a_tampered_derived_file_or_changed_payload_does_not_reconcile(self):
        raw = (FIXTURE_RAW / "eu-file-type.rdf").read_bytes()
        with tempfile.TemporaryDirectory() as temporary:
            derive_snapshot("eu-file-type", raw, Path(temporary), rights("eu"))
            members = Path(temporary) / "eu-file-type.members.ttl"
            members.write_bytes(members.read_bytes() + b"\n<http://publications.europa.eu/resource/authority/file-type/FAKE> <https://haddenindustries.com/ontology/policy#memberOf> <https://haddenindustries.com/ontology/policy/authority/eu-file-type> .\n")
            self.assertTrue(reconcile_snapshot("eu-file-type", raw, Path(temporary)))
            derive_snapshot("eu-file-type", raw, Path(temporary), rights("eu"))
            self.assertTrue(reconcile_snapshot("eu-file-type", raw + b"<!-- changed -->", Path(temporary)))

    def test_missing_or_corrupt_snapshot_is_an_error_not_an_empty_authority(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(AuthorityError):
                load_authority_graph(Path(temporary), required=("iana-media-types",))
            derive_snapshot("iana-media-types", (FIXTURE_RAW / "iana-media-types.xml").read_bytes(), Path(temporary), rights("iana"))
            (Path(temporary) / "iana-media-types.members.ttl").write_bytes(b"corrupt")
            with self.assertRaises(AuthorityError):
                load_authority_graph(Path(temporary), required=("iana-media-types",))

    def test_raw_payload_that_is_not_the_expected_format_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(AuthorityError):
                derive_snapshot("iana-media-types", b"not xml at all", Path(temporary), rights("iana"))
            with self.assertRaises(AuthorityError):
                derive_snapshot("loc-iso639-1", b"<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'/>", Path(temporary), rights("loc"))


if __name__ == "__main__":
    unittest.main()
