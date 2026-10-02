import { OWLManager } from "owlapi/apibinding";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import { StringDocumentSource } from "owlapi/io";
import { ontologyStructuralFingerprint } from "./ontologyStructuralFingerprint.js";
import { assertLosslessOntologyLoad } from "./assertLosslessOntologyLoad.js";

/** Reload exact serialized text in a fresh manager with no external resolution authority. */
export async function verifyStandaloneOntology({
  expectedOntology,
  serializedText,
  format,
}) {
  let externalCalls = 0;
  const manager = OWLManager.createOWLOntologyManager({
    documentLoader: {
      load() {
        externalCalls += 1;
        throw new Error("Offline verifier forbids external document loading");
      },
    },
  });
  const configuration = new OWLOntologyLoaderConfiguration({
    format,
    parsingMode: "strict",
    loadAnnotationAxioms: true,
    remoteImports: false,
    remoteJsonLdContexts: false,
    missingImportHandling: "throw",
    rdfDatasetGraphPolicy: "requireSingleGraph",
    collectWarnings: true,
  });
  const result = await manager.loadOntologyGraphFromOntologyDocument(
    new StringDocumentSource(serializedText, { format }),
    configuration,
  );
  assertLosslessOntologyLoad(result);
  const reloaded = result.ontology;
  const expectedID = expectedOntology.getOntologyID();
  const actualID = reloaded.getOntologyID();
  if (
    expectedID.ontologyIRI?.value !== actualID.ontologyIRI?.value ||
    expectedID.versionIRI?.value !== actualID.versionIRI?.value
  )
    throw new Error("Offline artifact ontology identity differs");
  if (
    externalCalls !== 0 ||
    reloaded.getImportsDeclarations().size !== 0 ||
    manager.getImportsClosure(reloaded).size !== 1
  )
    throw new Error("Offline artifact has external ontology dependencies");
  if (
    (await ontologyStructuralFingerprint(expectedOntology)) !==
    (await ontologyStructuralFingerprint(reloaded))
  )
    throw new Error(
      "Offline artifact differs structurally from the expected ontology",
    );
  return reloaded;
}
