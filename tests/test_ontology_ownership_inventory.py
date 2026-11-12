"""Exercise the real ownership bridge with the repository's Python environment."""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
OWNERSHIP_BRIDGE = (
    REPOSITORY_ROOT / "scripts" / "build" / "readOntologyOwnershipInventory.js"
)


class OntologyOwnershipInventoryTests(unittest.TestCase):
    def test_reads_owned_modules_without_pythonpath_from_an_unrelated_directory(self):
        environment = {
            key: value
            for key, value in os.environ.items()
            if key.upper() != "PYTHONPATH"
        }
        script = """
            const { readOntologyOwnershipInventory } = await import(process.argv[1]);
            const inventory = await readOntologyOwnershipInventory(process.argv[2]);
            await inventory.assertUnchanged();
            process.stdout.write(JSON.stringify(inventory.modules));
        """
        with tempfile.TemporaryDirectory(prefix="uo-ownership-bridge-") as directory:
            result = subprocess.run(
                [
                    "node",
                    "--input-type=module",
                    "--eval",
                    script,
                    OWNERSHIP_BRIDGE.as_uri(),
                    str(REPOSITORY_ROOT),
                ],
                cwd=directory,
                env=environment,
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=40,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        modules = json.loads(result.stdout)
        core_iri = "https://haddenindustries.com/ontology/universal/core/"
        core = next(module for module in modules if module["ontologyIri"] == core_iri)
        self.assertEqual(core["workingPath"], "core/universal-core.owl")
        self.assertIn(core_iri, core["ownedNamespaces"])


if __name__ == "__main__":
    unittest.main()
