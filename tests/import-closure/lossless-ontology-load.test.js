import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { IRI, OWLOntologyLoaderConfiguration } from "owlapi/model";
import { StringDocumentSource } from "owlapi/io";
import { assertLosslessOntologyLoad } from "../../scripts/ontology/assertLosslessOntologyLoad.js";
import { ontologyStructuralFingerprint } from "../../scripts/ontology/ontologyStructuralFingerprint.js";

const document = (diagnostics = [], metadata) => ({
  context: {
    diagnostics,
    format: {
      isRdf: metadata !== undefined,
      getOntologyLoaderMetaData: () => metadata,
    },
  },
});
test.each([
  { ontology: {}, documents: [] },
  { ontology: {}, documents: [{ context: { format: { isRdf: false } } }] },
  {
    ontology: {},
    documents: [document([{ code: "UNKNOWN", severity: "warning" }])],
  },
  {
    ontology: {},
    documents: [
      document([], {
        getUnparsedTriples: () => [{}],
        getGuessedDeclarations: () => [],
      }),
    ],
  },
  {
    ontology: {},
    documents: [
      document([], {
        getUnparsedTriples: () => [],
        getGuessedDeclarations: () => [{}],
      }),
    ],
  },
  {
    ontology: {},
    documents: [
      {
        context: {
          diagnostics: [],
          format: { isRdf: true, getOntologyLoaderMetaData: () => undefined },
        },
      },
    ],
  },
])("rejects incomplete or lossy load evidence %#", (result) => {
  expect(() => assertLosslessOntologyLoad(result)).toThrow();
});
test("checks imported document diagnostics, not just the root", () => {
  expect(() =>
    assertLosslessOntologyLoad({
      ontology: {},
      documents: [
        document(),
        document([{ code: "MISSING_IMPORT", severity: "warning" }]),
      ],
    }),
  ).toThrow();
});
test("identifies a root diagnostic even when imported documents exist", () => {
  const root = {};
  try {
    assertLosslessOntologyLoad({
      ontology: root,
      documents: [
        { ontology: {}, ...document() },
        {
          ontology: root,
          ...document([{ code: "ROOT_WARNING", severity: "warning" }]),
        },
      ],
    });
    throw new Error("Expected root diagnostic rejection");
  } catch (error) {
    expect(error.documentRole).toBe("root");
  }
});
test.each([
  "Ontology(<urn:root> Declaration(Class(<urn:C>)))",
  '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#"><owl:Ontology rdf:about="urn:root"/></rdf:RDF>',
])("accepts complete clean public manager results %#", async (text) => {
  const result =
    await OWLManager.createOWLOntologyManager().loadOntologyGraphFromOntologyDocument(
      new StringDocumentSource(text),
      new OWLOntologyLoaderConfiguration({
        parsingMode: "strict",
        collectWarnings: true,
      }),
    );
  expect(() => assertLosslessOntologyLoad(result)).not.toThrow();
});

test("reconciles inferred entity roles without accepting synthesized declaration axioms", async () => {
  const manager = OWLManager.createOWLOntologyManager();
  const result = await manager.loadOntologyGraphFromOntologyDocument(
    new StringDocumentSource(
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#"><owl:Ontology rdf:about="urn:root"/><owl:Class rdf:about="urn:C"/><rdf:Description rdf:about="urn:i"><rdf:type rdf:resource="urn:C"/></rdf:Description></rdf:RDF>',
    ),
    new OWLOntologyLoaderConfiguration({
      parsingMode: "strict",
      collectWarnings: true,
    }),
  );
  const guesses = result.documents[0].context.format
    .getOntologyLoaderMetaData()
    .getGuessedDeclarations();
  expect(
    guesses.map(({ iri, entityType }) => [iri.value, entityType]),
  ).toContainEqual(["urn:i", "OWLNamedIndividual"]);
  expect(
    [...result.ontology.getAxioms()]
      .filter((axiom) => axiom.kind === "OWLDeclarationAxiom")
      .map((axiom) => axiom.entity.iri.value),
  ).toEqual(["urn:C"]);
  expect(() => assertLosslessOntologyLoad(result)).not.toThrow();
  const factory = manager.getOWLDataFactory();
  manager.addAxiom(
    result.ontology,
    factory.getOWLDeclarationAxiom(
      factory.getOWLNamedIndividual(IRI.create("urn:i")),
    ),
  );
  expect(() => assertLosslessOntologyLoad(result)).toThrow(/declaration/i);
});

test.each([
  [
    "OWLClass",
    '<owl:ObjectProperty rdf:about="urn:p"><rdfs:domain rdf:resource="urn:C"/></owl:ObjectProperty>',
    "Declaration(ObjectProperty(<urn:p>)) ObjectPropertyDomain(<urn:p> <urn:C>)",
  ],
  [
    "OWLDatatype",
    '<owl:AnnotationProperty rdf:about="urn:label"/><rdf:Description rdf:about="urn:s"><label xmlns="urn:" rdf:datatype="http://www.w3.org/2001/XMLSchema#date">2017-01-20</label></rdf:Description>',
    'Declaration(AnnotationProperty(<urn:label>)) AnnotationAssertion(<urn:label> <urn:s> "2017-01-20"^^<http://www.w3.org/2001/XMLSchema#date>)',
  ],
])(
  "reconciles %s against independently specified structural axioms",
  async (kind, body, expectedAxioms) => {
    const text = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:owl="http://www.w3.org/2002/07/owl#"><owl:Ontology rdf:about="urn:root"/>${body}</rdf:RDF>`;
    const manager = OWLManager.createOWLOntologyManager();
    const result = await manager.loadOntologyGraphFromOntologyDocument(
      new StringDocumentSource(text),
      new OWLOntologyLoaderConfiguration({
        parsingMode: "strict",
        collectWarnings: true,
      }),
    );
    expect(
      result.documents[0].context.format
        .getOntologyLoaderMetaData()
        .getGuessedDeclarations()
        .some((g) => g.entityType === kind),
    ).toBe(true);
    expect(() => assertLosslessOntologyLoad(result)).not.toThrow();
    const expected =
      await OWLManager.createOWLOntologyManager().loadOntologyFromOntologyDocument(
        new StringDocumentSource(`Ontology(<urn:root> ${expectedAxioms})`),
      );
    expect(await ontologyStructuralFingerprint(result.ontology)).toBe(
      await ontologyStructuralFingerprint(expected),
    );
  },
);

test.each(["OWLObjectProperty", "OWLDataProperty", "OWLAnnotationProperty"])(
  "rejects unqualified inferred property roles: %s",
  (entityType) => {
    const ontology = { getAxioms: () => new Set() };
    const result = {
      ontology,
      documents: [
        {
          ontology,
          ...document([], {
            getUnparsedTriples: () => [],
            getGuessedDeclarations: () => [
              { iri: { value: "urn:p" }, entityType },
            ],
          }),
        },
      ],
    };
    expect(() => assertLosslessOntologyLoad(result)).toThrow(/Unqualified/);
  },
);
