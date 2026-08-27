import { serializeOntologyRowsAsCsv } from "../src/ontologyCsv.js";

const HEADERS =
  "Entity Type,UUID,URI,Preferred Label,Definition,Sources,References,Creator,Created At,Modified At,Superclasses,Class of Named Individual";

test("serializes ontology rows using the established CSV column order", () => {
  expect(
    serializeOntologyRowsAsCsv([
      {
        entityType: "class",
        uuid: "uuid",
        uri: "uri",
        preferredLabel: "label",
        definition: "definition",
        sources: ["source"],
        references: ["reference"],
        creator: "creator",
        createdAt: "created",
        modifiedAt: "modified",
        superclasses: ["superclass"],
        classOfNamedIndividual: "individual",
      },
    ]),
  ).toBe(
    `${
      HEADERS
    }\nclass,uuid,uri,label,definition,source,reference,creator,created,modified,superclass,individual`,
  );
});

test("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
  expect(
    serializeOntologyRowsAsCsv([
      {
        entityType: "=entity",
        uuid: "+uuid",
        uri: "-uri",
        preferredLabel: "@label",
        definition: 'comma, quote " and\nnewline',
        sources: ["first", "second"],
        references: ["third", "fourth"],
        creator: null,
        createdAt: undefined,
        modifiedAt: "",
        superclasses: [],
        classOfNamedIndividual: null,
      },
    ]),
  ).toBe(
    `${
      HEADERS
    }\n'=entity,'+uuid,'-uri,'@label,"comma, quote "" and\nnewline","first\nsecond","third\nfourth",,,,,`,
  );
});

test("returns a header-only document for an empty row set", () => {
  expect(serializeOntologyRowsAsCsv([])).toBe(HEADERS);
});
