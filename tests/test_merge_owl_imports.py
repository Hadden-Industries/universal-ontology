"""Atomic-write contract of scripts/merge_owl_imports.py.

Covers only how the command stages and publishes its output file: a successful
run leaves exactly the output, and a failed serialisation exits 1 with the
original error logged and no staging file left behind. Import resolution and
graph canonicalisation are outside this module's scope.
"""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from rdflib import Graph

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

import merge_owl_imports  # noqa: E402

BASE_ONTOLOGY = """\
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

<https://example.org/merge-fixture> a owl:Ontology .
<https://example.org/merge-fixture#Thing> a owl:Class ;
    rdfs:label "Thing" .
"""


class AtomicOutputTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.input_path = self.directory / "base.ttl"
        self.input_path.write_text(BASE_ONTOLOGY, encoding="utf-8")
        self.output_path = self.directory / "merged.owl"

    def run_merge(self):
        # A catalog path that does not exist keeps the run from searching the
        # temporary directory's ancestors for an unrelated catalog.
        argv = [
            "merge_owl_imports.py",
            str(self.input_path),
            str(self.output_path),
            "--catalog",
            str(self.directory / "absent-catalog-v001.xml"),
        ]
        with mock.patch.object(sys, "argv", argv):
            merge_owl_imports.main()

    def test_success_publishes_only_the_output_file(self):
        self.run_merge()

        self.assertEqual(
            sorted(path.name for path in self.directory.iterdir()),
            ["base.ttl", "merged.owl"],
        )
        merged = Graph().parse(self.output_path, format="xml")
        self.assertIn("Thing", {str(label) for label in merged.objects()})

    def test_serialisation_failure_exits_1_logs_the_cause_and_leaves_no_staging_file(
        self,
    ):
        failure = OSError("simulated disk failure during serialisation")
        with (
            mock.patch.object(Graph, "serialize", side_effect=failure),
            self.assertLogs(level="ERROR") as logs,
            self.assertRaises(SystemExit) as exit_,
        ):
            self.run_merge()

        self.assertEqual(exit_.exception.code, 1)
        self.assertIn("simulated disk failure during serialisation", logs.output[-1])
        self.assertEqual([path.name for path in self.directory.iterdir()], ["base.ttl"])


if __name__ == "__main__":
    unittest.main()
