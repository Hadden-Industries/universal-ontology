"""The OASIS XML catalogs next to each working file resolve its owned imports locally.

Protégé and similar tools read ``<module>/catalog-v001.xml`` to find imported
ontologies without the network. Every dated Hadden Industries version IRI in a
module's ``owl:imports`` closure must therefore have a catalog entry, and the
entry's target must be a tracked dated artifact. A version increment that
re-pins imports without touching the catalogs fails here.
"""
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))

from ontology_policy.modules import load_owned_modules  # noqa: E402

CATALOG_NS = "{urn:oasis:names:tc:entity:xmlns:xml:catalog}"
OWL_IMPORTS = "{http://www.w3.org/2002/07/owl#}imports"
RDF_RESOURCE = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource"
OWNED_PREFIX = "https://haddenindustries.com/ontology/"


def direct_imports(document: Path) -> set[str]:
    root = ElementTree.parse(document).getroot()
    return {element.get(RDF_RESOURCE) for element in root.iter(OWL_IMPORTS) if element.get(RDF_RESOURCE)}


def catalog_entries(catalog: Path) -> dict[str, str]:
    root = ElementTree.parse(catalog).getroot()
    return {element.get("name"): element.get("uri") for element in root.iter(f"{CATALOG_NS}uri") if element.get("name")}


def artifact_for(version_iri: str) -> Path:
    """The tracked dated artifact a version IRI denotes: src/<path after the ontology prefix>."""
    return REPOSITORY_ROOT / "src" / version_iri[len(OWNED_PREFIX):]


class ImportCatalogTest(unittest.TestCase):
    def setUp(self):
        self.modules = {module.working_path: module for module in load_owned_modules()}

    def owned_import_closure(self, working_path: str) -> set[str]:
        """Dated owned version IRIs reachable through owl:imports, following each into its src artifact."""
        closure, frontier = set(), direct_imports(REPOSITORY_ROOT / working_path)
        while frontier:
            iri = frontier.pop()
            if not iri.startswith(OWNED_PREFIX) or iri in closure:
                continue
            closure.add(iri)
            artifact = artifact_for(iri)
            self.assertTrue(artifact.is_file(), f"{working_path} imports {iri} but src/ has no such dated artifact")
            frontier |= direct_imports(artifact)
        return closure

    def test_every_owned_import_in_the_closure_has_a_local_catalog_entry(self):
        for working_path in self.modules:
            catalog = REPOSITORY_ROOT / Path(working_path).parent / "catalog-v001.xml"
            closure = self.owned_import_closure(working_path)
            with self.subTest(module=working_path):
                if not closure:
                    continue  # a module without owned imports needs no catalog entry for them
                self.assertTrue(catalog.is_file(), f"{working_path} has owned imports but no {catalog.name}")
                entries = catalog_entries(catalog)
                for iri in sorted(closure):
                    self.assertIn(iri, entries, f"{catalog} lacks an entry for {iri}; update it with the version increment")
                    target = entries[iri].replace("\\", "/")
                    expected = "../dist/" + iri[len(OWNED_PREFIX):]
                    self.assertEqual(target, expected, f"{catalog} maps {iri} to {target}, expected {expected}")

    def test_catalog_entries_for_owned_versions_are_not_stale(self):
        """No catalog keeps an entry for a superseded owned version that the module no longer imports."""
        for working_path in self.modules:
            catalog = REPOSITORY_ROOT / Path(working_path).parent / "catalog-v001.xml"
            if not catalog.is_file():
                continue
            closure = self.owned_import_closure(working_path)
            with self.subTest(module=working_path):
                owned_entries = {name for name in catalog_entries(catalog) if name.startswith(OWNED_PREFIX) and name[len(OWNED_PREFIX):].rsplit("/", 1)[-1].isdigit()}
                self.assertEqual(owned_entries, closure, f"{catalog} owned entries differ from the import closure")


if __name__ == "__main__":
    unittest.main()
