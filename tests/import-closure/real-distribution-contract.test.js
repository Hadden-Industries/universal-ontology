import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { OWLManager } from "owlapi/apibinding";
import {
  AddOntologyAnnotation,
  OWLOntologyLoaderConfiguration,
} from "owlapi/model";
import { OWLDocumentFormats } from "owlapi/formats";
import { targets } from "../../scripts/createFullVersions.js";
import { materializeImportClosure } from "../../scripts/materializeImportClosure.js";
import { OasisXmlCatalogIRIMapper } from "../../scripts/ontology/oasisXmlCatalogIRIMapper.js";
import { OntologyDocumentLoader } from "../../scripts/ontology/ontologyDocumentLoader.js";
import { assertLosslessOntologyLoad } from "../../scripts/ontology/assertLosslessOntologyLoad.js";
import { verifyStandaloneOntology } from "../../scripts/ontology/verifyStandaloneOntology.js";

const directories = [];
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const remoteImports = new Set([
  "https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/20260714",
  "https://haddenindustries.com/ontology/universal/reference-data/20260714",
  "https://haddenindustries.com/ontology/universal/core/20260714",
]);

function assertDocumentOrigin(document) {
  if (document.candidates[0].startsWith("file:")) {
    // A missing catalog mapping must never silently substitute a web copy in
    // this real-source regression. The loader's fallback has separate tests.
    expect(document.resolved).toBe(document.candidates[0]);
    const path = relative(repositoryRoot, fileURLToPath(document.resolved));
    expect(isAbsolute(path) || path.startsWith("..")).toBe(false);
  } else {
    expect(remoteImports.has(document.authored)).toBe(true);
    expect(document.resolved).toBe(document.authored);
  }
}
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true });
});

test.each(targets)(
  "real source $input preserves the full closure contract",
  async (target) => {
    // src contains the exact published root bytes copied to dist by the build;
    // using it avoids a build prerequisite. The three dated module imports are
    // intentionally remote, as in production; mapped vocabulary files stay local.
    const inputPath = fileURLToPath(
      new URL(target.input.replace("../dist/", "../../src/"), import.meta.url),
    );
    const catalogPath = fileURLToPath(
      new URL(target.catalog.replace("../", "../../"), import.meta.url),
    );
    const directory = await mkdtemp(join(tmpdir(), "uo-real-contract-"));
    directories.push(directory);
    const outputPath = join(directory, "standalone.owl");
    const generatedDocuments = [];
    await materializeImportClosure({
      inputPath,
      outputPath,
      catalogPath,
      format: "rdfxml",
      onDocument(document) {
        assertDocumentOrigin(document);
        if (document.kind !== "catalog")
          generatedDocuments.push([document.authored, document.sha256]);
      },
    });
    const configuration = new OWLOntologyLoaderConfiguration({
      parsingMode: "strict",
      loadAnnotationAxioms: true,
      remoteImports: true,
      remoteJsonLdContexts: true,
      missingImportHandling: "throw",
      rdfDatasetGraphPolicy: "requireSingleGraph",
      collectWarnings: true,
    });
    const expectedDocuments = [];
    const loader = new OntologyDocumentLoader({
      iriMapper: await OasisXmlCatalogIRIMapper.fromFile(catalogPath),
      onDocument(document) {
        assertDocumentOrigin(document);
        expectedDocuments.push([document.authored, document.sha256]);
      },
    });
    const manager = OWLManager.createOWLOntologyManager({
      documentLoader: loader,
    });
    const loaded = await manager.loadOntologyGraphFromOntologyDocument(
      await loader.loadRootDocument(inputPath, { config: configuration }),
      configuration,
    );
    assertLosslessOntologyLoad(loaded);
    expect(expectedDocuments.sort()).toEqual(generatedDocuments.sort());
    const root = loaded.ontology;
    // Build the independent expected direct-axiom union without using the merger
    // or the application collapse function exercised by materialization.
    const expectedManager = OWLManager.createOWLOntologyManager();
    const expected = expectedManager.createOntology(root.getOntologyID());
    for (const ontology of manager.getImportsClosure(root))
      expectedManager.addAxioms(expected, ontology.getAxioms());
    for (const annotation of root.getAnnotations())
      expectedManager.applyChange(
        new AddOntologyAnnotation(expected, annotation),
      );
    const actual = await verifyStandaloneOntology({
      expectedOntology: expected,
      serializedText: await readFile(outputPath, "utf8"),
      format: OWLDocumentFormats.RDF_XML,
    });
    expect(actual.getOntologyID().equals(root.getOntologyID())).toBe(true);
    expect(actual.getImportsDeclarations().size).toBe(0);
    expect(actual.getAxioms().size).toBe(expected.getAxioms().size);
    expect(await readdir(directory)).toEqual(["standalone.owl"]);
  },
  180000,
);

test("real-source checks reject fallback from a missing local mapping", () => {
  expect(() =>
    assertDocumentOrigin({
      candidates: [
        "file:///missing/skos.rdf",
        "http://www.w3.org/2004/02/skos/core",
      ],
      authored: "http://www.w3.org/2004/02/skos/core",
      resolved: "http://www.w3.org/2004/02/skos/core",
    }),
  ).toThrow();
});
