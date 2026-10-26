import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { AddOntologyAnnotation, IRI } from "owlapi/model";
import { exportOntologyUmlXmi } from "../../scripts/uml/exportOntologyUmlXmi.js";
import { recoverOntologyMetadata } from "../../scripts/uml/recoverOntologyMetadata.js";
import { ontologyStructuralFingerprint } from "../../scripts/ontology/ontologyStructuralFingerprint.js";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { UML_METADATA_CONTRACT as contract } from "../../scripts/uml/umlMetadataContract.js";
import { loadMetadataWitness, witnessContext } from "./metadataWitness.js";

test("retains exact metadata in a self-contained typed UML model", async () => {
  const manager = OWLManager.createOWLOntologyManager({
    behaviorProfileId: "normative-v1",
  });
  const factory = manager.getOWLDataFactory();
  const ontology = manager.createOntology(
    factory.getOWLOntologyID(IRI.create("urn:witness:ontology")),
  );
  manager.applyChange(
    new AddOntologyAnnotation(
      ontology,
      factory.getOWLAnnotation(
        factory.getRDFSLabel(),
        factory.getOWLLiteral("e\u0301\r\n\t😀", "es"),
      ),
    ),
  );
  const result = await exportOntologyUmlXmi({
    ontology,
    context: {
      behaviorProfileId: manager.getBehaviorProfileId(),
      owlapi: "npm:@hadden-industries/owlapi@0.1.0-rc.2",
      pairedOwlSha256: "0".repeat(64),
    },
  });
  expect(result.xmi).toContain('xmi:version="2.1"');
  expect(result.recovery.literals).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ lexical: "e\u0301\r\n\t😀", language: "es" }),
    ]),
  );
});

test("uses native UML 2.1 coordinates and owned metaclass imports", async () => {
  const result = await exportOntologyUmlXmi({
    ontology: await loadMetadataWitness(),
    context: witnessContext,
  });
  const doc = new DOMParser().parseFromString(result.xmi, "application/xml");
  expect(doc.documentElement.lookupNamespaceURI("uml")).toBe(
    "http://schema.omg.org/spec/UML/2.1.1/uml.xml",
  );
  expect(
    doc.documentElement.getAttributeNS(
      "http://www.w3.org/2001/XMLSchema-instance",
      "schemaLocation",
    ),
  ).toBe(`${contract.profile} #profileDefinition`);
  const all = [...doc.getElementsByTagName("*")];
  expect(all.some((element) => element.hasAttribute("URI"))).toBe(false);
  const profile = doc.getElementsByTagNameNS(contract.uml, "Profile")[0];
  const imported = [...profile.getElementsByTagName("elementImport")].find(
    (element) =>
      element.getAttributeNS(contract.xmi, "id") ===
      profile.getAttribute("metaclassReference"),
  );
  expect(imported).toBeDefined();
  expect(
    imported.getElementsByTagName("importedElement")[0].getAttribute("href"),
  ).toBe("http://schema.omg.org/spec/UML/2.1.1/uml.xml#InstanceSpecification");
  expect(await recoverOntologyMetadata(result.xmi)).toEqual(result.recovery);
});

test("recovers unknown predicates, distinct literal kinds and complete nested attachments", async () => {
  const ontology = await loadMetadataWitness();
  const before = await ontologyStructuralFingerprint(ontology);
  const result = await exportOntologyUmlXmi({
    ontology,
    context: witnessContext,
  });
  expect(await ontologyStructuralFingerprint(ontology)).toBe(before);
  expect(result.recovery.semanticModelSha256).toBe(before);
  expect(result.recovery.literals).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        lexical: "01",
        datatype: "http://www.w3.org/2001/XMLSchema#integer",
      }),
      expect.objectContaining({
        lexical: "1",
        datatype: "http://www.w3.org/2001/XMLSchema#integer",
      }),
      expect.objectContaining({ lexical: "", datatype: "urn:new-datatype" }),
      expect.objectContaining({
        lexical: "urn:person",
        datatype: "http://www.w3.org/2001/XMLSchema#anyURI",
      }),
    ]),
  );
  const recovered = await recoverOntologyMetadata(result.xmi);
  const byId = new Map(recovered.records.map((r) => [r.id, r]));
  const kind = (r) => r.fields.kind?.[0]?.scalar;
  const children = (r, field) =>
    (r.fields[field] ?? []).map((v) => byId.get(v.reference));
  const scalar = (r, field) => r.fields[field]?.[0]?.scalar;
  const annotations = (r) => children(children(r, "annotations")[0], "member");
  const literal = (r) =>
    scalar(children(r, "value")[0], "lexicalForm").slice(7);
  const axioms = recovered.records.filter(
    (r) => kind(r) === "OWLSubClassOfAxiom",
  );
  expect(axioms).toHaveLength(2);
  expect(axioms.map((r) => annotations(r).map(literal)[0]).sort()).toEqual([
    "first",
    "second",
  ]);
  const second = annotations(
    axioms.find((r) => annotations(r).some((a) => literal(a) === "second")),
  )[0];
  expect(annotations(second).map(literal)).toEqual(["inner"]);
  expect(
    recovered.records.some(
      (r) => scalar(r, "value") === "string:urn:new-field",
    ),
  ).toBe(true);
  expect(
    recovered.records.some(
      (r) => scalar(r, "value") === "string:urn:witness:v1",
    ),
  ).toBe(true);
});

test("is deterministic across repeated export, anonymous renaming and unordered input", async () => {
  const first = await loadMetadataWitness(
    "Ontology(<urn:test> ClassAssertion(<urn:C> _:a) ObjectPropertyAssertion(<urn:p> _:a _:b) ClassAssertion(<urn:C> _:b))",
  );
  const second = await loadMetadataWitness(
    "Ontology(<urn:test> ClassAssertion(<urn:C> _:y) ClassAssertion(<urn:C> _:x) ObjectPropertyAssertion(<urn:p> _:x _:y))",
  );
  const a = await exportOntologyUmlXmi({
    ontology: first,
    context: witnessContext,
  });
  expect(
    (await exportOntologyUmlXmi({ ontology: first, context: witnessContext }))
      .xmi,
  ).toBe(a.xmi);
  expect(
    (await exportOntologyUmlXmi({ ontology: second, context: witnessContext }))
      .xmi,
  ).toBe(a.xmi);
});

test.each(["external-schema", "unqualified-schema", "nested-schema"])(
  "rejects %s resolution declarations before native consumers",
  async (mutation) => {
    const result = await exportOntologyUmlXmi({
      ontology: await loadMetadataWitness(),
      context: witnessContext,
    });
    const doc = new DOMParser().parseFromString(result.xmi, "application/xml");
    const xsi = "http://www.w3.org/2001/XMLSchema-instance";
    const target =
      mutation === "nested-schema"
        ? doc.getElementsByTagNameNS(contract.uml, "Model")[0]
        : doc.documentElement;
    target.setAttributeNS(
      xsi,
      mutation === "unqualified-schema"
        ? "xsi:noNamespaceSchemaLocation"
        : "xsi:schemaLocation",
      "urn:unregistered file://unregistered.invalid/share/model.ecore",
    );
    await expect(
      recoverOntologyMetadata(new XMLSerializer().serializeToString(doc)),
    ).rejects.toThrow("schema location");
  },
);

test.each([
  "payload",
  "datatype",
  "attachment",
  "reference",
  "duplicate-id",
  "version",
  "base64",
])("rejects a realistic %s mutation", async (mutation) => {
  const result = await exportOntologyUmlXmi({
    ontology: await loadMetadataWitness(),
    context: witnessContext,
  });
  const doc = new DOMParser().parseFromString(result.xmi, "application/xml");
  const all = [...doc.getElementsByTagName("*")];
  const scalar = (value) =>
    all.find(
      (n) => n.getAttribute("value") === Buffer.from(value).toString("base64"),
    );
  if (mutation === "payload")
    scalar("string:first").setAttribute(
      "value",
      Buffer.from("string:changed").toString("base64"),
    );
  if (mutation === "datatype")
    scalar("string:urn:new-datatype").setAttribute(
      "value",
      Buffer.from("string:urn:other").toString("base64"),
    );
  if (mutation === "attachment") {
    const axioms = result.recovery.records.filter(
      (r) => r.fields.kind?.[0]?.scalar === "OWLSubClassOfAxiom",
    );
    const annotationProperty = all
      .find(
        (n) =>
          n.getAttribute("name") ===
          "urn:universal-ontology:structural-verification:annotations",
      )
      .getAttributeNS(contract.xmi, "id");
    const targets = axioms.map(
      (r) =>
        [
          ...all.find((n) => n.getAttributeNS(contract.xmi, "id") === r.id)
            .childNodes,
        ].find(
          (n) =>
            n.nodeType === 1 &&
            n.getAttribute("definingFeature") === annotationProperty,
        ).firstChild,
    );
    const a = targets[0].getAttribute("instance");
    targets[0].setAttribute("instance", targets[1].getAttribute("instance"));
    targets[1].setAttribute("instance", a);
  }
  if (mutation === "reference")
    all
      .find((n) => n.hasAttribute("instance"))
      .setAttribute("instance", "missing");
  if (mutation === "duplicate-id")
    all
      .find(
        (n) =>
          n.hasAttributeNS(contract.xmi, "id") &&
          n.getAttributeNS(contract.xmi, "id") !== "model",
      )
      .setAttributeNS(contract.xmi, "xmi:id", "model");
  if (mutation === "version")
    scalar("1").setAttribute("value", Buffer.from("2").toString("base64"));
  if (mutation === "base64")
    scalar("string:first").setAttribute("value", "Zh==");
  await expect(
    recoverOntologyMetadata(new XMLSerializer().serializeToString(doc)),
  ).rejects.toThrow();
});

test("rejects entity acquisition and excessive XML nesting before DOM loading", async () => {
  await expect(
    recoverOntologyMetadata(
      '<!DOCTYPE x [<!ENTITY a SYSTEM "https://example.com/">]><x/>',
    ),
  ).rejects.toThrow(/DOCTYPE/u);
  await expect(
    recoverOntologyMetadata("<x>".repeat(129) + "</x>".repeat(129)),
  ).rejects.toThrow(/limit/u);
});

test("projects named classes and justified properties without inventing cardinality or Actor semantics", async () => {
  const ontology = await loadMetadataWitness(`Ontology(<urn:projection>
    Annotation(<urn:creator> <urn:person>)
    Declaration(Class(<urn:A>)) Declaration(Class(<urn:B>))
    Declaration(ObjectProperty(<urn:p>)) Declaration(ObjectProperty(<urn:ambiguous>))
    ObjectPropertyDomain(<urn:p> <urn:A>) ObjectPropertyRange(<urn:p> <urn:B>)
    ObjectPropertyDomain(<urn:ambiguous> <urn:A>) ObjectPropertyDomain(<urn:ambiguous> <urn:B>)
    ObjectPropertyRange(<urn:ambiguous> <urn:B>)
    SubClassOf(<urn:A> <urn:B>)
  )`);
  const { xmi } = await exportOntologyUmlXmi({
    ontology,
    context: witnessContext,
  });
  const doc = new DOMParser().parseFromString(xmi, "application/xml");
  const domain = [...doc.getElementsByTagName("packagedElement")].find(
    (n) => n.getAttributeNS(contract.xmi, "id") === "projection",
  );
  const elements = [...domain.getElementsByTagName("packagedElement")];
  expect(
    elements.filter(
      (n) => n.getAttributeNS(contract.xmi, "type") === "uml:Class",
    ),
  ).toHaveLength(2);
  expect(
    elements.filter(
      (n) => n.getAttributeNS(contract.xmi, "type") === "uml:Association",
    ),
  ).toHaveLength(1);
  expect(
    [...domain.getElementsByTagName("lowerValue")].map((n) =>
      n.getAttribute("value"),
    ),
  ).toEqual(["0", "0"]);
  expect(
    [...domain.getElementsByTagName("upperValue")].map((n) =>
      n.getAttribute("value"),
    ),
  ).toEqual(["*", "*"]);
  expect(domain.getElementsByTagName("generalization").length).toBe(1);
  expect(
    elements.some(
      (n) => n.getAttributeNS(contract.xmi, "type") === "uml:Actor",
    ),
  ).toBe(false);
});

test("retains qualified restrictions, ordered property chains and punned identities without strengthening UML", async () => {
  const ontology = await loadMetadataWitness(`Ontology(<urn:structure>
    Declaration(Class(<urn:C>)) Declaration(NamedIndividual(<urn:C>))
    ClassAssertion(<urn:C> <urn:C>)
    Declaration(ObjectProperty(<urn:p>)) Declaration(ObjectProperty(<urn:q>))
    ObjectPropertyDomain(<urn:p> <urn:C>) ObjectPropertyRange(<urn:p> <urn:C>)
    SubClassOf(<urn:C> ObjectMinCardinality(2 <urn:p> <urn:C>))
    SubClassOf(<urn:C> ObjectMaxCardinality(5 <urn:p> <urn:C>))
    SubObjectPropertyOf(ObjectPropertyChain(<urn:p> <urn:q>) <urn:p>)
  )`);
  const result = await exportOntologyUmlXmi({
    ontology,
    context: witnessContext,
  });
  const kinds = result.recovery.records.map((r) => r.fields.kind?.[0]?.scalar);
  expect(kinds).toEqual(
    expect.arrayContaining([
      "OWLObjectMinCardinality",
      "OWLObjectMaxCardinality",
      "OWLSubPropertyChainOfAxiom",
      "OWLClass",
      "OWLNamedIndividual",
    ]),
  );
  expect(
    result.recovery.records.some(
      (r) => r.fields["index:0"] && r.fields["index:1"],
    ),
  ).toBe(true);
  expect(
    result.recovery.records
      .flatMap((r) => r.fields.cardinality ?? [])
      .map((v) => v.scalar)
      .sort(),
  ).toEqual(["number:2", "number:5"]);
  const doc = new DOMParser().parseFromString(result.xmi, "application/xml");
  const domain = [...doc.getElementsByTagName("packagedElement")].find(
    (n) => n.getAttributeNS(contract.xmi, "id") === "projection",
  );
  const elements = [...domain.getElementsByTagName("packagedElement")];
  const klass = elements.find(
    (n) => n.getAttributeNS(contract.xmi, "type") === "uml:Class",
  );
  const individual = elements.find(
    (n) =>
      n.getAttributeNS(contract.xmi, "type") === "uml:InstanceSpecification",
  );
  expect(individual.getAttributeNS(contract.xmi, "id")).not.toBe(
    klass.getAttributeNS(contract.xmi, "id"),
  );
  expect(
    [...domain.getElementsByTagName("upperValue")].every(
      (n) => n.getAttribute("value") === "*",
    ),
  ).toBe(true);
});
