import { readFile } from "node:fs/promises";
import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import { StringDocumentSource } from "owlapi/io";
import { assertLosslessOntologyLoad } from "../../scripts/ontology/assertLosslessOntologyLoad.js";

test("the maintained Protege DC module has one document identity and retains all DC annotation definitions", async () => {
  const text = await readFile(
    new URL("../../src/external/protege-dc.owl", import.meta.url),
    "utf8",
  );
  const manager = OWLManager.createOWLOntologyManager({
    documentLoader: {
      load() {
        throw new Error("Unexpected secondary acquisition");
      },
    },
  });
  const result = await manager.loadOntologyGraphFromOntologyDocument(
    new StringDocumentSource(text, {
      documentIRI: "http://protege.stanford.edu/plugins/owl/dc/protege-dc.owl",
      contentType: "application/rdf+xml",
    }),
    new OWLOntologyLoaderConfiguration({
      parsingMode: "preserve",
      remoteImports: false,
      remoteJsonLdContexts: false,
    }),
  );
  expect(result.ontology.getOntologyID().ontologyIRI.value).toBe(
    "http://protege.stanford.edu/plugins/owl/dc/protege-dc.owl",
  );
  expect(result.documents).toHaveLength(1);
  expect(result.ontology.getImportsDeclarations().size).toBe(0);
  expect(result.ontology.getAxiomCount()).toBe(75);
  const properties = [
    ...result.ontology.getAnnotationPropertiesInSignature(),
  ].map((property) => property.iri.value);
  for (const name of [
    "title",
    "creator",
    "subject",
    "description",
    "publisher",
    "contributor",
    "date",
    "type",
    "format",
    "identifier",
    "source",
    "language",
    "relation",
    "coverage",
    "rights",
  ])
    expect(properties).toContain(`http://purl.org/dc/elements/1.1/${name}`);
  expect(() => assertLosslessOntologyLoad(result)).not.toThrow();
});
