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
import {
  discoverFullOntologyCandidates,
  createLocalMapper,
} from "../../scripts/build/fullOntologyAssets.js";
import { materializeImportClosure } from "../../scripts/materializeImportClosure.js";
import { OntologyDocumentLoader } from "../../scripts/ontology/ontologyDocumentLoader.js";
import { assertLosslessOntologyLoad } from "../../scripts/ontology/assertLosslessOntologyLoad.js";
import { verifyStandaloneOntology } from "../../scripts/ontology/verifyStandaloneOntology.js";

const directories = [];
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const discovery = await discoverFullOntologyCandidates({
  repositoryDirectory: repositoryRoot,
});
const targets = discovery.candidates
  .filter((source) => source.imports.length)
  .map((source) => ({
    input: source.outputPath,
    sourcePath: source.sourcePath,
  }));
const mapper = await createLocalMapper(
  { repositoryDirectory: repositoryRoot },
  discovery.sources,
  {},
);
function assertDocumentOrigin(document) {
  expect(document.candidates[0].startsWith("file:")).toBe(true);
  // A missing catalog mapping must never silently substitute a web copy in
  // this real-source regression. The loader's fallback has separate tests.
  expect(document.resolved).toBe(document.candidates[0]);
  const path = relative(repositoryRoot, fileURLToPath(document.resolved));
  expect(isAbsolute(path) || path.startsWith("..")).toBe(false);
}
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true });
});

test.each(targets)(
  "real source $input preserves the full closure contract",
  async (target) => {
    // Read current authored roots directly and resolve their closure locally, without requiring dist.
    const inputPath = target.sourcePath;
    const directory = await mkdtemp(join(tmpdir(), "uo-real-contract-"));
    directories.push(directory);
    const outputPath = join(directory, "standalone.owl");
    const generatedDocuments = [];
    await materializeImportClosure({
      inputPath,
      outputPath,
      iriMapper: mapper,
      loaderConfiguration: new OWLOntologyLoaderConfiguration({
        remoteImports: false,
        remoteJsonLdContexts: false,
      }),
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
      remoteImports: false,
      remoteJsonLdContexts: false,
      missingImportHandling: "throw",
      rdfDatasetGraphPolicy: "requireSingleGraph",
      collectWarnings: true,
    });
    const expectedDocuments = [];
    const loader = new OntologyDocumentLoader({
      iriMapper: mapper,
      onDocument(document) {
        assertDocumentOrigin(document);
        expectedDocuments.push([document.authored, document.sha256]);
      },
    });
    const manager = OWLManager.createOWLOntologyManager({
      documentLoader: loader,
      iriMappers: [mapper],
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

test("real discovered targets match the independently stated accepted eight-case inventory", () => {
  const expected = [
    "iso-iec/11179/-3/ed-4",
    "universal/core",
    "universal/extended",
    "universal/reference-data",
  ]
    .flatMap((family) => [`${family}/20260714`, `${family}/20260912`])
    .sort();
  expect(targets.map((t) => t.input).sort()).toEqual(expected);
  expect(
    discovery.candidates.find((c) => c.outputPath === "iso/31073/ed-1/20260912")
      .imports,
  ).toEqual([]);
});

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
