import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { AXIOM_KINDS, IRI, OWLObjectKind } from "owlapi/model";
import { OWLDocumentFormats } from "owlapi/formats";
import { StringDocumentSource, StringDocumentTarget } from "owlapi/io";
import { verifyStandaloneOntology } from "../../scripts/ontology/verifyStandaloneOntology.js";

// Hand-authored OWL Functional Syntax exercises each supported axiom family.
// Changing urn:A changes a semantic argument, independently of the fingerprint's encoding.
const axioms = [
  "Declaration(Class(<urn:A>))",
  "SubClassOf(<urn:A> <urn:B>)",
  "EquivalentClasses(<urn:A> <urn:B>)",
  "DisjointClasses(<urn:A> <urn:B>)",
  "DisjointUnion(<urn:A> <urn:B> <urn:C>)",
  "SubObjectPropertyOf(<urn:A> <urn:p>)",
  "SubObjectPropertyOf(ObjectPropertyChain(<urn:A> <urn:p>) <urn:q>)",
  "EquivalentObjectProperties(<urn:A> <urn:p>)",
  "DisjointObjectProperties(<urn:A> <urn:p>)",
  "ObjectPropertyDomain(<urn:p> <urn:A>)",
  "ObjectPropertyRange(<urn:p> <urn:A>)",
  "InverseObjectProperties(<urn:A> <urn:p>)",
  "FunctionalObjectProperty(<urn:A>)",
  "InverseFunctionalObjectProperty(<urn:A>)",
  "ReflexiveObjectProperty(<urn:A>)",
  "IrreflexiveObjectProperty(<urn:A>)",
  "SymmetricObjectProperty(<urn:A>)",
  "AsymmetricObjectProperty(<urn:A>)",
  "TransitiveObjectProperty(<urn:A>)",
  "SubDataPropertyOf(<urn:A> <urn:d>)",
  "EquivalentDataProperties(<urn:A> <urn:d>)",
  "DisjointDataProperties(<urn:A> <urn:d>)",
  "DataPropertyDomain(<urn:d> <urn:A>)",
  "DataPropertyRange(<urn:d> <urn:A>)",
  "FunctionalDataProperty(<urn:A>)",
  "DatatypeDefinition(<urn:A> <http://www.w3.org/2001/XMLSchema#string>)",
  "HasKey(<urn:A> (<urn:p>) (<urn:d>))",
  "SameIndividual(<urn:A> <urn:i>)",
  "DifferentIndividuals(<urn:A> <urn:i>)",
  "ClassAssertion(<urn:A> _:person)",
  "ObjectPropertyAssertion(<urn:p> <urn:A> _:person)",
  "NegativeObjectPropertyAssertion(<urn:p> <urn:A> _:person)",
  'DataPropertyAssertion(<urn:d> <urn:A> "01"^^<http://www.w3.org/2001/XMLSchema#integer>)',
  'NegativeDataPropertyAssertion(<urn:d> <urn:A> "chat"@fr)',
  'AnnotationAssertion(<urn:label> <urn:A> "value")',
  "SubAnnotationPropertyOf(<urn:A> <urn:label>)",
  "AnnotationPropertyDomain(<urn:label> <urn:A>)",
  "AnnotationPropertyRange(<urn:label> <urn:A>)",
];

const expressions = [
  "ObjectIntersectionOf(<urn:A> <urn:B>)",
  "ObjectUnionOf(<urn:A> <urn:B>)",
  "ObjectComplementOf(<urn:A>)",
  "ObjectOneOf(<urn:A> _:person)",
  "ObjectSomeValuesFrom(ObjectInverseOf(<urn:p>) <urn:A>)",
  "ObjectAllValuesFrom(<urn:p> <urn:A>)",
  "ObjectHasValue(<urn:p> <urn:A>)",
  "ObjectHasSelf(<urn:A>)",
  "ObjectMinCardinality(1 <urn:p> <urn:A>)",
  "ObjectMaxCardinality(2 <urn:p> <urn:A>)",
  "ObjectExactCardinality(3 <urn:p> <urn:A>)",
  "DataSomeValuesFrom(<urn:d> <urn:A>)",
  "DataAllValuesFrom(<urn:d> <urn:A>)",
  'DataHasValue(<urn:d> "literal"^^<urn:A>)',
  "DataMinCardinality(1 <urn:d> <urn:A>)",
  "DataMaxCardinality(2 <urn:d> <urn:A>)",
  "DataExactCardinality(3 <urn:d> <urn:A>)",
  "DataSomeValuesFrom(<urn:d> DataIntersectionOf(<urn:A> <urn:type>))",
  "DataSomeValuesFrom(<urn:d> DataUnionOf(<urn:A> <urn:type>))",
  "DataSomeValuesFrom(<urn:d> DataComplementOf(<urn:A>))",
  'DataSomeValuesFrom(<urn:d> DataOneOf("01"^^<urn:A> "02"^^<urn:A>))',
  'DataSomeValuesFrom(<urn:d> DatatypeRestriction(<urn:A> <http://www.w3.org/2001/XMLSchema#minInclusive> "1"^^<http://www.w3.org/2001/XMLSchema#integer>))',
];

async function load(axiom) {
  const manager = OWLManager.createOWLOntologyManager();
  const ontology = await manager.loadOntologyFromOntologyDocument(
    new StringDocumentSource(`Ontology(<urn:root> <urn:version> ${axiom})`),
  );
  return { manager, ontology };
}

test.each([
  ...axioms,
  ...expressions.map((value) => `SubClassOf(<urn:Subject> ${value})`),
])("offline verification preserves and distinguishes %s", async (axiom) => {
  const { manager, ontology } = await load(axiom);
  expect(ontology.getAxioms().size).toBe(1);
  const target = new StringDocumentTarget();
  await manager.saveOntology(ontology, OWLDocumentFormats.FUNCTIONAL, target);
  await expect(
    verifyStandaloneOntology({
      expectedOntology: ontology,
      serializedText: target.toString(),
      format: OWLDocumentFormats.FUNCTIONAL,
    }),
  ).resolves.toBeDefined();
  await expect(
    verifyStandaloneOntology({
      expectedOntology: ontology,
      serializedText: `Ontology(<urn:root> <urn:version> ${axiom.replaceAll("urn:A", "urn:Changed")})`,
      format: OWLDocumentFormats.FUNCTIONAL,
    }),
  ).rejects.toThrow("differs structurally");
});

test("fixtures reach every advertised structural kind and axiom kind", async () => {
  const seen = new Set();
  const axiomKinds = new Set();
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.kind) seen.add(value.kind);
    for (const child of Object.values(value)) {
      if (Array.isArray(child) || child instanceof Set)
        [...child].forEach(visit);
      else visit(child);
    }
  }
  const { manager, ontology } = await load(
    [
      'Annotation(Annotation(<urn:meta> "nested") <urn:label> "root")',
      ...axioms,
      ...expressions.map((value) => `SubClassOf(<urn:Subject> ${value})`),
    ].join(" "),
  );
  visit(ontology.getOntologyID());
  for (const axiom of ontology.getAxioms()) {
    axiomKinds.add(axiom.kind);
    visit(axiom);
  }
  for (const annotation of ontology.getAnnotations()) visit(annotation);
  // Imports are forbidden in standalone outputs, but must still affect the oracle.
  visit(
    manager
      .getOWLDataFactory()
      .getOWLImportsDeclaration(IRI.create("urn:dependency")),
  );
  expect([...axiomKinds].sort()).toEqual([...AXIOM_KINDS].sort());
  expect([...seen].sort()).toEqual(Object.values(OWLObjectKind).sort());
});

test.each([OWLDocumentFormats.FUNCTIONAL, OWLDocumentFormats.RDF_XML])(
  "nested ontology and axiom annotations preserve exact literal metadata in %s",
  async (format) => {
    const { manager, ontology } = await load(`
      Annotation(Annotation(<urn:meta> "bonjour"@fr) <urn:label> "01"^^<http://www.w3.org/2001/XMLSchema#integer>)
      Declaration(AnnotationProperty(<urn:meta>))
      Declaration(AnnotationProperty(<urn:label>))
      Declaration(Class(<urn:A>)) Declaration(Class(<urn:B>))
      SubClassOf(Annotation(Annotation(<urn:meta> "nested") <urn:label> "qualified") <urn:A> <urn:B>)
      AnnotationAssertion(<urn:meta> <urn:A> <file:///authored-content>)
    `);
    const target = new StringDocumentTarget();
    await manager.saveOntology(ontology, format, target);
    const reloaded = await verifyStandaloneOntology({
      expectedOntology: ontology,
      serializedText: target.toString(),
      format,
    });
    const annotation = [...reloaded.getAnnotations()][0];
    expect(annotation.value.lexicalForm).toBe("01");
    expect(annotation.value.datatype.iri.value).toBe(
      "http://www.w3.org/2001/XMLSchema#integer",
    );
    expect(annotation.annotations[0].value.language).toBe("fr");
    expect(
      [...reloaded.getAxioms()].find(
        (axiom) => axiom.kind === "OWLSubClassOfAxiom",
      ).annotations[0].annotations[0].value.lexicalForm,
    ).toBe("nested");
  },
);
