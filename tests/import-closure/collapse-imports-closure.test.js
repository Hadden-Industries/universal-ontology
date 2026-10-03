import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import { StringDocumentSource } from "owlapi/io";
import { collapseImportsClosure } from "../../scripts/ontology/collapseImportsClosure.js";

test("preserves full root identity, root-only metadata and the complete axiom union", async () => {
  const requested = [];
  const documents = {
    "urn:a":
      'Ontology(<urn:a> Import(<urn:b>) Annotation(<urn:label> "imported") Declaration(Class(<urn:C>)) ClassAssertion(<urn:C> _:same) ObjectPropertyAssertion(<urn:p> _:same _:same) AnnotationAssertion(<urn:label> <urn:a> "axiom"))',
    "urn:b":
      "Ontology(<urn:b> Import(<urn:a>) Declaration(Class(<urn:C>)) ClassAssertion(<urn:C> _:same) ObjectPropertyAssertion(<urn:p> _:same _:same))",
  };
  const inputManager = OWLManager.createOWLOntologyManager({
    documentLoader: {
      load: async (iri) => {
        requested.push(iri.value);
        return new StringDocumentSource(documents[iri.value], {
          documentIRI: iri,
        });
      },
    },
  });
  const root = await inputManager.loadOntologyFromOntologyDocument(
    new StringDocumentSource(
      'Ontology(<urn:root> <urn:version> Import(<urn:a>) Import(<urn:b>) Annotation(<urn:label> "root") Declaration(Class(<urn:R>)))',
    ),
    new OWLOntologyLoaderConfiguration({ remoteImports: true }),
  );
  const outputManager = OWLManager.createOWLOntologyManager();
  const result = collapseImportsClosure({
    inputManager,
    outputManager,
    rootOntology: root,
  });
  expect(result.getOntologyID().equals(root.getOntologyID())).toBe(true);
  expect(result.getAnnotations()).toEqual(root.getAnnotations());
  expect(result.getImportsDeclarations().size).toBe(0);
  expect(inputManager.getImportsClosure(root).size).toBe(3);
  expect(requested.sort()).toEqual(["urn:a", "urn:b"]);
  expect(result.getAxioms().size).toBe(7);
  const assertions = [...result.getAxioms()].filter(
    (axiom) => axiom.kind === "OWLObjectPropertyAssertionAxiom",
  );
  expect(assertions).toHaveLength(2);
  expect(assertions[0].subject.equals(assertions[0].value)).toBe(true);
  expect(assertions[0].subject.equals(assertions[1].subject)).toBe(false);
  expect(outputManager.getImportsClosure(result).size).toBe(1);
});

test("an anonymous root remains anonymous", async () => {
  const inputManager = OWLManager.createOWLOntologyManager();
  const rootOntology = await inputManager.loadOntologyFromOntologyDocument(
    new StringDocumentSource("Ontology()"),
  );
  const result = collapseImportsClosure({
    inputManager,
    rootOntology,
    outputManager: OWLManager.createOWLOntologyManager(),
  });
  expect(result.getOntologyID().ontologyIRI).toBeUndefined();
  expect(result.getOntologyID().versionIRI).toBeUndefined();
});
