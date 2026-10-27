import { expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
const register = JSON.parse(
  readFileSync(
    new URL("../../docs/uml/mapping-register.v1.json", import.meta.url),
    "utf8",
  ),
);
import { exportOntologyUmlXmi } from "../../scripts/uml/exportOntologyUmlXmi.js";
import { loadMetadataWitness, witnessContext } from "./metadataWitness.js";

// Each hand-authored native OWL scenario witnesses a distinct structural row.
const cases = [
  [
    "S01",
    "SubObjectPropertyOf(ObjectPropertyChain(<urn:q> <urn:p>) <urn:r>)",
    "OWLSubPropertyChainOfAxiom",
  ],
  [
    "S02",
    "SubObjectPropertyOf(ObjectPropertyChain(<urn:q> <urn:p>) <urn:r>)",
    "OWLSubPropertyChainOfAxiom",
  ],
  [
    "S03",
    "Declaration(Class(<urn:C>)) ClassAssertion(<urn:C> <urn:C>)",
    "OWLClassAssertionAxiom",
  ],
  [
    "S04",
    "ObjectPropertyDomain(<urn:p> ObjectUnionOf(<urn:C> <urn:D>))",
    "OWLObjectPropertyDomainAxiom",
  ],
  [
    "S05",
    "DataPropertyRange(<urn:d> DataUnionOf(<http://www.w3.org/2001/XMLSchema#string> <http://www.w3.org/2001/XMLSchema#integer>))",
    "OWLDataPropertyRangeAxiom",
  ],
  [
    "S06",
    'SubClassOf(Annotation(<urn:note> "owner") <urn:C> ObjectSomeValuesFrom(<urn:p> <urn:D>))',
    "OWLSubClassOfAxiom",
  ],
  [
    "S07",
    "SubDataPropertyOf(<urn:d> <urn:e>) SubAnnotationPropertyOf(<urn:a> <urn:b>)",
    "OWLSubDataPropertyOfAxiom",
  ],
  [
    "S08",
    'DatatypeDefinition(<urn:t> DatatypeRestriction(<http://www.w3.org/2001/XMLSchema#string> <http://www.w3.org/2001/XMLSchema#pattern> "a.*"))',
    "OWLFacetRestriction",
  ],
  [
    "S09",
    "SubClassOf(<urn:C> ObjectAllValuesFrom(<urn:p> <urn:D>))",
    "OWLObjectAllValuesFrom",
  ],
  [
    "S10",
    'SubClassOf(Annotation(Annotation(<urn:nested> "inner") <urn:note> "first") <urn:C> <urn:D>) SubClassOf(Annotation(<urn:note> "second") <urn:C> <urn:E>)',
    "OWLAnnotation",
  ],
  [
    "S11",
    'SubClassOf(Annotation(<urn:note> "first") <urn:C> <urn:D>) SubClassOf(Annotation(<urn:note> "second") <urn:C> <urn:E>)',
    "OWLSubClassOfAxiom",
  ],
  [
    "S12",
    'AnnotationAssertion(Annotation(<urn:note> "first") <urn:a> <urn:C> "01"^^<http://www.w3.org/2001/XMLSchema#integer>) AnnotationAssertion(Annotation(<urn:note> "second") <urn:a> <urn:C> "1"^^<http://www.w3.org/2001/XMLSchema#integer>)',
    "OWLAnnotationAssertionAxiom",
  ],
  [
    "S13",
    "SubClassOf(<urn:C> ObjectExactCardinality(2 <urn:p>))",
    "OWLObjectExactCardinality",
  ],
  [
    "S14",
    "DifferentIndividuals(<urn:a> <urn:b>)",
    "OWLDifferentIndividualsAxiom",
  ],
  [
    "S15",
    "DisjointClasses(<urn:C> ObjectSomeValuesFrom(<urn:p> <urn:D>))",
    "OWLDisjointClassesAxiom",
  ],
  [
    "S16",
    "DifferentIndividuals(<urn:a> <urn:b> <urn:c>)",
    "OWLDifferentIndividualsAxiom",
  ],
  [
    "S17",
    "EquivalentClasses(<urn:C> ObjectUnionOf(<urn:D> <urn:E>))",
    "OWLEquivalentClassesAxiom",
  ],
  [
    "S18",
    "EquivalentObjectProperties(<urn:p> <urn:q>)",
    "OWLEquivalentObjectPropertiesAxiom",
  ],
  [
    "S19",
    'SubClassOf(<urn:C> DataHasValue(<urn:d> "01"^^<http://www.w3.org/2001/XMLSchema#integer>))',
    "OWLDataHasValue",
  ],
  [
    "S20",
    "InverseObjectProperties(<urn:p> <urn:q>) SubClassOf(<urn:C> ObjectSomeValuesFrom(ObjectInverseOf(<urn:p>) <urn:D>))",
    "OWLObjectInverseOf",
  ],
  [
    "S21",
    "SubClassOf(<urn:C> ObjectMaxCardinality(3 <urn:p>))",
    "OWLObjectMaxCardinality",
  ],
  [
    "S22",
    "SubClassOf(<urn:C> ObjectMaxCardinality(3 <urn:p> <urn:D>))",
    "OWLObjectMaxCardinality",
  ],
  [
    "S23",
    "DisjointObjectProperties(<urn:p> <urn:q> <urn:r>)",
    "OWLDisjointObjectPropertiesAxiom",
  ],
  [
    "S24",
    "SubClassOf(<urn:C> ObjectMinCardinality(2 <urn:p> <urn:D>))",
    "OWLObjectMinCardinality",
  ],
  [
    "S25",
    "SubClassOf(<urn:C> ObjectExactCardinality(2 <urn:p> ObjectUnionOf(<urn:D> <urn:E>)))",
    "OWLObjectUnionOf",
  ],
  [
    "S26",
    "SubClassOf(<urn:C> DataMaxCardinality(2 <urn:d> DataUnionOf(<http://www.w3.org/2001/XMLSchema#string> <http://www.w3.org/2001/XMLSchema#integer>)))",
    "OWLDataUnionOf",
  ],
  [
    "S27",
    'DatatypeDefinition(<urn:t> DatatypeRestriction(<http://www.w3.org/2001/XMLSchema#string> <http://www.w3.org/2001/XMLSchema#pattern> "a.*"))',
    "OWLDatatypeRestriction",
  ],
  [
    "S28",
    "SubClassOf(<urn:C> ObjectSomeValuesFrom(ObjectInverseOf(<urn:p>) <urn:D>))",
    "OWLObjectInverseOf",
  ],
  [
    "S29",
    "DisjointDataProperties(<urn:d> <urn:e>)",
    "OWLDisjointDataPropertiesAxiom",
  ],
  [
    "S30",
    "SubClassOf(<urn:C> DataExactCardinality(2 <urn:d> <http://www.w3.org/2001/XMLSchema#integer>))",
    "OWLDataExactCardinality",
  ],
  ["S31", "SameIndividual(<urn:a> <urn:b>)", "OWLSameIndividualAxiom"],
  [
    "S32",
    "SubClassOf(<urn:C> DataSomeValuesFrom(<urn:d> <http://www.w3.org/2001/XMLSchema#integer>))",
    "OWLDataSomeValuesFrom",
  ],
  [
    "S33",
    "SubClassOf(<urn:C> ObjectUnionOf(<urn:D> <urn:E>))",
    "OWLObjectUnionOf",
  ],
  [
    "S34",
    'DatatypeDefinition(<urn:t> DatatypeRestriction(<http://www.w3.org/2001/XMLSchema#integer> <http://www.w3.org/2001/XMLSchema#minInclusive> "01"^^<http://www.w3.org/2001/XMLSchema#integer>))',
    "OWLFacetRestriction",
  ],
];

test.each(cases)(
  "structural-%s retains the complete owning expression",
  async (id, body, expectedKind) => {
    expect(register.rows.find((r) => r.id === id)?.fixture).toBe(
      `structural-${id}`,
    );
    const ontology = await loadMetadataWitness(
      `Ontology(<urn:structure> ${body})`,
    );
    const result = await exportOntologyUmlXmi({
      ontology,
      context: witnessContext,
    });
    const nodes = new Map(
      result.recovery.records.map((record) => [record.id, record]),
    );
    const kind = (record) => record.fields.kind?.[0]?.scalar;
    expect(
      result.recovery.records.some((record) => kind(record) === expectedKind),
    ).toBe(true);
    if (["S01", "S02"].includes(id)) {
      const chain = result.recovery.records.find(
        (record) => kind(record) === "OWLSubPropertyChainOfAxiom",
      );
      const sequence = nodes.get(chain.fields.chain[0].reference);
      expect(sequence.fields.collection[0].scalar).toBe("sequence");
      const iri = (index) => {
        const property = nodes.get(
          sequence.fields[`index:${index}`][0].reference,
        );
        return nodes.get(property.fields.iri[0].reference).fields.value[0]
          .scalar;
      };
      expect([iri(0), iri(1)]).toEqual(["string:urn:q", "string:urn:p"]);
    }
    if (["S12", "S19", "S34"].includes(id))
      expect(result.recovery.literals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lexical: "01",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          }),
        ]),
      );
    if (id === "S16") {
      const axiom = result.recovery.records.find(
        (record) => kind(record) === expectedKind,
      );
      const individuals = nodes.get(axiom.fields.individuals[0].reference);
      expect(individuals.fields.member).toHaveLength(3);
    }
  },
);
