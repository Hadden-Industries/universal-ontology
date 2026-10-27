import { expect, test } from "@jest/globals";
import { loadMetadataWitness, witnessContext } from "./metadataWitness.js";
import { exportOntologyUmlXmi } from "../../scripts/uml/exportOntologyUmlXmi.js";
import { compareOntologyMetadata } from "../../scripts/uml/qualification/compareOntologyMetadata.js";

const source = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:a="urn:annotation:">
 <owl:Ontology rdf:about="urn:oracle"><owl:versionIRI rdf:resource="urn:oracle:v1"/><a:creator rdf:resource="urn:person"/></owl:Ontology>
 <owl:AnnotationProperty rdf:about="urn:annotation:creator"/><owl:AnnotationProperty rdf:about="urn:annotation:note"/><owl:AnnotationProperty rdf:about="urn:annotation:nested"/>
 <owl:Class rdf:about="urn:C"><rdfs:label xml:lang="es">é😀</rdfs:label><rdfs:subClassOf rdf:resource="urn:D"/><rdfs:subClassOf rdf:resource="urn:E"/></owl:Class><owl:Class rdf:about="urn:D"/><owl:Class rdf:about="urn:E"/>
 <owl:Axiom rdf:nodeID="first"><owl:annotatedSource rdf:resource="urn:C"/><owl:annotatedProperty rdf:resource="http://www.w3.org/2000/01/rdf-schema#subClassOf"/><owl:annotatedTarget rdf:resource="urn:D"/><a:note>first</a:note></owl:Axiom>
 <owl:Axiom rdf:nodeID="second"><owl:annotatedSource rdf:resource="urn:C"/><owl:annotatedProperty rdf:resource="http://www.w3.org/2000/01/rdf-schema#subClassOf"/><owl:annotatedTarget rdf:resource="urn:E"/><a:note>second</a:note></owl:Axiom>
 <owl:Annotation rdf:nodeID="nested"><owl:annotatedSource rdf:nodeID="second"/><owl:annotatedProperty rdf:resource="urn:annotation:note"/><owl:annotatedTarget>second</owl:annotatedTarget><a:nested>inner</a:nested></owl:Annotation>
</rdf:RDF>`;

test("the independent RDF oracle compares exact values and complete annotation sets", async () => {
  const { recovery } = await exportOntologyUmlXmi({
    ontology: await loadMetadataWitness(source),
    context: witnessContext,
  });
  const compare = (candidate) =>
    compareOntologyMetadata({
      rdfXml: source,
      recovery: candidate,
      sourceName: "hand-authored-oracle",
      fallbackBaseIri: "urn:oracle",
    });
  const baseline = await compare(recovery);
  expect(baseline.expectedRecords).toBe(6);
  expect(baseline.recoveredRecords).toBe(6);
  expect(baseline.missing).toEqual([]);
  expect(baseline.extra).toEqual([]);
  const corruptValue = structuredClone(recovery);
  corruptValue.records.find(
    (r) => r.fields.lexicalForm?.[0]?.scalar === "string:first",
  ).fields.lexicalForm[0].scalar = "string:changed";
  const valueDifference = await compare(corruptValue);
  expect(valueDifference.missing.length).toBeGreaterThan(0);
  expect(valueDifference.extra.length).toBeGreaterThan(0);
  const corruptAttachment = structuredClone(recovery);
  const nodes = new Map(corruptAttachment.records.map((r) => [r.id, r]));
  const axioms = corruptAttachment.records.filter(
    (r) => r.fields.kind?.[0]?.scalar === "OWLSubClassOfAxiom",
  );
  const collections = axioms.map((a) =>
    nodes.get(a.fields.annotations[0].reference),
  );
  collections[0].fields.member.push(...collections[1].fields.member);
  const attachmentDifference = await compare(corruptAttachment);
  expect(attachmentDifference.missing.length).toBeGreaterThan(0);
  expect(attachmentDifference.equality.attachment).toBe(false);
});

test("the oracle exposes native coalescing of distinct equal-base RDF reifications", async () => {
  const equalBase = source.replaceAll("urn:E", "urn:D");
  const { recovery } = await exportOntologyUmlXmi({
    ontology: await loadMetadataWitness(equalBase),
    context: witnessContext,
  });
  const difference = await compareOntologyMetadata({
    rdfXml: equalBase,
    recovery,
    sourceName: "equal-base-native-limit",
    fallbackBaseIri: "urn:oracle",
  });
  expect(difference.missing.length).toBeGreaterThan(0);
  expect(difference.equality.attachment).toBe(false);
});
