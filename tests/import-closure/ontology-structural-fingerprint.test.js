import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { StringDocumentSource } from "owlapi/io";
import { ontologyStructuralFingerprint } from "../../scripts/ontology/ontologyStructuralFingerprint.js";

async function fingerprint(text) {
  const ontology =
    await OWLManager.createOWLOntologyManager().loadOntologyFromOntologyDocument(
      new StringDocumentSource(text),
    );
  return ontologyStructuralFingerprint(ontology);
}

test("fingerprints a large named taxonomy without artificial blank-node ambiguity", async () => {
  const axioms = Array.from(
    { length: 10000 },
    (_, index) =>
      `SubClassOf(Annotation(<urn:label> "shared annotation") <urn:class:${index}> ObjectSomeValuesFrom(<urn:property> <urn:shared>))`,
  );
  const left = await fingerprint(`Ontology(<urn:root> ${axioms.join(" ")})`);
  expect(left).toBe(
    await fingerprint(`Ontology(<urn:root> ${axioms.toReversed().join(" ")})`),
  );
  axioms[600] = axioms[600].replace("<urn:shared>", "<urn:different>");
  expect(left).not.toBe(
    await fingerprint(`Ontology(<urn:root> ${axioms.join(" ")})`),
  );
}, 30000);
test("fingerprints anonymous identity modulo a single consistent bijection", async () => {
  const left =
    "Ontology(<urn:root> ObjectPropertyAssertion(<urn:p> _:a _:b) ObjectPropertyAssertion(<urn:p> _:b _:b))";
  const right =
    "Ontology(<urn:root> ObjectPropertyAssertion(<urn:p> _:x _:x) ObjectPropertyAssertion(<urn:p> _:z _:x))";
  expect(await fingerprint(left)).toBe(await fingerprint(right));
  expect(await fingerprint(left)).not.toBe(
    await fingerprint(right.replace("_:z _:x", "_:z _:z")),
  );
});
test.each([
  ["Declaration(Class(<urn:C>))", "Declaration(Class(<urn:D>))"],
  ['Annotation(<urn:label> "01")', 'Annotation(<urn:label> "1")'],
  ['Annotation(<urn:label> "text"@en)', 'Annotation(<urn:label> "text"@fr)'],
  [
    'Annotation(<urn:label> "1"^^<urn:type>)',
    'Annotation(<urn:label> "1"^^<urn:other>)',
  ],
  ["SubClassOf(<urn:A> <urn:B>)", "SubClassOf(<urn:B> <urn:A>)"],
])("detects authored structural differences: %s", async (left, right) => {
  expect(await fingerprint(`Ontology(<urn:root> ${left})`)).not.toBe(
    await fingerprint(`Ontology(<urn:root> ${right})`),
  );
});
test("ignores set order but preserves property chain order and occurrences", async () => {
  expect(
    await fingerprint("Ontology(EquivalentClasses(<urn:A> <urn:B>))"),
  ).toBe(await fingerprint("Ontology(EquivalentClasses(<urn:B> <urn:A>))"));
  expect(
    await fingerprint(
      "Ontology(SubObjectPropertyOf(ObjectPropertyChain(<urn:a> <urn:b>) <urn:p>))",
    ),
  ).not.toBe(
    await fingerprint(
      "Ontology(SubObjectPropertyOf(ObjectPropertyChain(<urn:b> <urn:a>) <urn:p>))",
    ),
  );
});
test("anonymous ontology process tokens do not affect equality", async () => {
  expect(await fingerprint("Ontology()")).toBe(await fingerprint("Ontology()"));
  expect(await fingerprint("Ontology()")).not.toBe(
    await fingerprint("Ontology(<urn:root>)"),
  );
});

test.each(["<urn:individual>", "_:individual"])(
  "public model set duplicates compare consistently for %s",
  async (individual) => {
    const restriction = `ObjectHasValue(<urn:p> ${individual})`;
    const text = (members) =>
      `Ontology(SubClassOf(<urn:A> ObjectIntersectionOf(<urn:B> ${members})))`;
    expect(await fingerprint(text(`${restriction} ${restriction}`))).toBe(
      await fingerprint(text(restriction)),
    );
  },
);

test("property-chain duplicate occurrences remain significant", async () => {
  const text = (chain) =>
    `Ontology(SubObjectPropertyOf(ObjectPropertyChain(${chain}) <urn:super>))`;
  expect(await fingerprint(text("<urn:p> <urn:q> <urn:q>"))).not.toBe(
    await fingerprint(text("<urn:p> <urn:q>")),
  );
});
