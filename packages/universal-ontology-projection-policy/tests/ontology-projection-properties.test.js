import * as projectionProperties from "../src/ontologyProjectionProperties.js";

const FIELD_NAMES = ["preferredLabel", "definition", "creator"];

function completeFields(fieldHistory) {
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, fieldHistory]));
}

function validDeclaration() {
  return {
    defaultPropertyIris: {
      preferredLabel: "https://example.com/default-label",
      definition: "https://example.com/default-definition",
      creator: "https://example.com/default-creator",
    },
    legacySourceInterpretations: [],
    ontologySeries: [
      {
        pathPrefix: "/example/series/",
        fieldPropertyHistories: completeFields({
          initialPropertyIri: "https://example.com/property/initial",
          transitions: [
            {
              fromVersion: "20200101",
              propertyIri: "https://example.com/property/second",
            },
            {
              fromVersion: "20250101",
              propertyIri: "https://example.com/property/third",
            },
          ],
        }),
      },
    ],
  };
}

test("resolves any number of property transitions for an ontology series", () => {
  const resolve =
    projectionProperties.createOntologyProjectionPropertyResolver(
      validDeclaration(),
    );

  expect(resolve("example/series/20191231").preferredLabel).toBe(
    "https://example.com/property/initial",
  );
  expect(resolve("example/series/20200101").preferredLabel).toBe(
    "https://example.com/property/second",
  );
  expect(resolve("example/series/20270101").preferredLabel).toBe(
    "https://example.com/property/third",
  );
});

test("resolves only property IRIs applicable by the publication version", () => {
  const resolve =
    projectionProperties.createApplicableOntologyProjectionPropertyIriResolver(
      validDeclaration(),
    );

  expect(resolve("example/series/20191231", "definition")).toEqual([
    "https://example.com/property/initial",
  ]);
  expect(resolve("example/series/20200101", "definition")).toEqual([
    "https://example.com/property/initial",
    "https://example.com/property/second",
  ]);
  expect(resolve("example/series/20270101", "definition")).toEqual([
    "https://example.com/property/initial",
    "https://example.com/property/second",
    "https://example.com/property/third",
  ]);
});

test("resolves legacy source interpretations only through their final version", () => {
  const declaration = validDeclaration();
  declaration.legacySourceInterpretations.push({
    pathPrefix: "/example/series/",
    throughVersion: "20200101",
    observedPropertyIri: "https://example.com/property/references",
    valueIriPrefix: "urn:example:standard",
    interpretedAsPropertyIri: "https://example.com/property/source",
  });
  const resolve =
    projectionProperties.createLegacySourceInterpretationResolver(declaration);

  expect(resolve("example/series/20200101")).toEqual([
    declaration.legacySourceInterpretations[0],
  ]);
  expect(resolve("example/series/20200102")).toEqual([]);
  expect(resolve("example/series/latest")).toEqual([]);
});

test.each([
  [
    "a missing default field",
    (declaration) => delete declaration.defaultPropertyIris.creator,
    /defaultPropertyIris\.creator/u,
  ],
  [
    "a missing series field history",
    (declaration) =>
      delete declaration.ontologySeries[0].fieldPropertyHistories.definition,
    /fieldPropertyHistories\.definition/u,
  ],
  [
    "a duplicate series path",
    (declaration) =>
      declaration.ontologySeries.push(
        structuredClone(declaration.ontologySeries[0]),
      ),
    /duplicate pathPrefix/u,
  ],
  [
    "overlapping series paths",
    (declaration) => {
      const overlapping = structuredClone(declaration.ontologySeries[0]);
      overlapping.pathPrefix = "/example/";
      declaration.ontologySeries.push(overlapping);
    },
    /overlapping pathPrefix/u,
  ],
  [
    "an invalid calendar-date version",
    (declaration) => {
      declaration.ontologySeries[0].fieldPropertyHistories.creator.transitions[0].fromVersion =
        "20260230";
    },
    /invalid fromVersion/u,
  ],
  [
    "transitions in descending order",
    (declaration) => {
      declaration.ontologySeries[0].fieldPropertyHistories.creator.transitions.reverse();
    },
    /strictly ascending/u,
  ],
  [
    "a transition that repeats the preceding property",
    (declaration) => {
      declaration.ontologySeries[0].fieldPropertyHistories.creator.transitions[0].propertyIri =
        "https://example.com/property/initial";
    },
    /repeats the preceding propertyIri/u,
  ],
  [
    "a non-absolute property IRI",
    (declaration) => {
      declaration.ontologySeries[0].fieldPropertyHistories.creator.initialPropertyIri =
        "relative/property";
    },
    /absolute IRI/u,
  ],
  [
    "a missing legacy source interpretation list",
    (declaration) => delete declaration.legacySourceInterpretations,
    /legacySourceInterpretations must be an array/u,
  ],
  [
    "an invalid legacy source interpretation version",
    (declaration) => {
      declaration.legacySourceInterpretations.push({
        pathPrefix: "/example/series/",
        throughVersion: "20260230",
        observedPropertyIri: "https://example.com/property/references",
        valueIriPrefix: "urn:example:standard",
        interpretedAsPropertyIri: "https://example.com/property/source",
      });
    },
    /invalid throughVersion/u,
  ],
  [
    "a legacy source interpretation for an undeclared series",
    (declaration) => {
      declaration.legacySourceInterpretations.push({
        pathPrefix: "/undeclared/series/",
        throughVersion: "20260101",
        observedPropertyIri: "https://example.com/property/references",
        valueIriPrefix: "urn:example:standard",
        interpretedAsPropertyIri: "https://example.com/property/source",
      });
    },
    /must identify a declared ontology series/u,
  ],
])("rejects %s", (_, mutate, expectedMessage) => {
  const declaration = validDeclaration();
  mutate(declaration);

  expect(() =>
    projectionProperties.createOntologyProjectionPropertyResolver(declaration),
  ).toThrow(expectedMessage);
});

test.each([
  [
    "universal/core/20260610",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "universal/core/20260625",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
  [
    "universal/core/latest",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
  [
    "universal/extended/20260610",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "universal/extended/20260626",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
  [
    "universal/reference-data/20260610",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "universal/reference-data/20260624",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
  [
    "iso-iec/11179/-3/ed-3/20230510",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso-iec/11179/-3/ed-3/v1",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso-iec/11179/-3/ed-4/20260610",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso-iec/11179/-3/ed-4/20260618",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso-iec/11179/-3/ed-4/20260623",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
  [
    "iso/31073/ed-1/20260420",
    "http://purl.org/dc/terms/title",
    "http://purl.org/dc/terms/description",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso/31073/ed-1/20260512",
    "http://purl.org/dc/terms/title",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/elements/1.1/creator",
  ],
  [
    "iso/31073/ed-1/20260626",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
    "http://www.w3.org/2004/02/skos/core#definition",
    "http://purl.org/dc/terms/creator",
  ],
])(
  "resolves the declared property history for %s",
  (ontologyPath, preferredLabel, definition, creator) => {
    expect(
      projectionProperties.resolveOntologyProjectionProperties(ontologyPath),
    ).toEqual({ preferredLabel, definition, creator });
  },
);

test.each([
  ["universal/core/20260423", true],
  ["universal/core/20260511", false],
  ["universal/reference-data/20260507", true],
  ["universal/reference-data/20260511", false],
  ["universal/extended/20260610", true],
  ["universal/extended/20260626", false],
  ["iso-iec/11179/-3/ed-4/20260618", false],
])(
  "resolves the declared legacy source interpretation boundary for %s",
  (ontologyPath, hasInterpretation) => {
    const interpretations =
      projectionProperties.resolveLegacySourceInterpretations(ontologyPath);

    expect(interpretations.length > 0).toBe(hasInterpretation);

    if (hasInterpretation) {
      expect(interpretations[0]).toEqual(
        expect.objectContaining({
          observedPropertyIri: "http://purl.org/dc/terms/references",
          valueIriPrefix: "urn:iso:std",
          interpretedAsPropertyIri: "http://purl.org/dc/terms/source",
        }),
      );
    }
  },
);
