import { createOntologyViewModel } from "../src/ontologyViewModel.js";

const NS = {
  owl: "http://www.w3.org/2002/07/owl#",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
};

const CLASS_IRI =
  "https://haddenindustries.com/ontology/universal/core/TestClass";

test("creates a display row from mixed literal and IRI JSON-LD values", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": "https://haddenindustries.com/ontology/universal/core/",
      "@type": [`${NS.owl}Ontology`],
      [`${NS.dcterms}title`]: [
        {
          "@value": "Hadden Industries Universal Core Ontology",
          "@language": "en",
        },
      ],
      [`${NS.owl}versionIRI`]: [
        {
          "@id":
            "https://haddenindustries.com/ontology/universal/core/20260714",
        },
      ],
      [`${NS.owl}versionInfo`]: [{ "@value": "2026-07-14" }],
      [`${NS.owl}priorVersion`]: [
        {
          "@id":
            "https://haddenindustries.com/ontology/universal/core/20260625",
        },
      ],
      [`${NS.dcterms}modified`]: [{ "@value": "2026-07-14" }],
    },
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.dcterms}identifier`]: [
        { "@value": "urn:uuid:11111111-1111-1111-1111-111111111111" },
      ],
      [`${NS.skos}prefLabel`]: [
        { "@value": "Classe de test", "@language": "fr" },
        { "@value": "Test Class", "@language": "en-GB" },
      ],
      [`${NS.skos}definition`]: [
        { "@value": "A class used by the test.", "@language": "en" },
      ],
      [`${NS.dcterms}source`]: [
        { "@value": "Literal Source Title", "@language": "en" },
        { "@id": "https://haddenindustries.com/ontology/ref/1" },
      ],
      [`${NS.dcterms}creator`]: [
        { "@id": "https://haddenindustries.com/people/example" },
      ],
      [`${NS.dcterms}created`]: [{ "@value": "2026-08-01" }],
      [`${NS.dcterms}modified`]: [{ "@value": "2026-08-22" }],
      [`${NS.rdfs}subClassOf`]: [
        { "@id": "_:restriction" },
        {
          "@id":
            "https://haddenindustries.com/ontology/universal/core/ParentClass",
        },
      ],
    },
  ]);

  expect(viewModel).toEqual({
    ontology: {
      ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
      ontologyTitle: "Hadden Industries Universal Core Ontology",
      versionIri:
        "https://haddenindustries.com/ontology/universal/core/20260714",
      versionInfo: "2026-07-14",
      priorVersionIri:
        "https://haddenindustries.com/ontology/universal/core/20260625",
      modifiedAt: "2026-07-14",
    },
    rows: [
      {
        entityType: "Class",
        uuid: "11111111-1111-1111-1111-111111111111",
        uri: CLASS_IRI,
        preferredLabel: "Test Class",
        definition: "A class used by the test.",
        sources: [
          "Literal Source Title",
          "https://haddenindustries.com/ontology/ref/1",
        ],
        references: [],
        creator: "https://haddenindustries.com/people/example",
        createdAt: "2026-08-01",
        modifiedAt: "2026-08-22",
        superclasses: [
          "https://haddenindustries.com/ontology/universal/core/ParentClass",
        ],
        classOfNamedIndividual: "",
      },
    ],
  });
});

test("represents absent authored ontology metadata with explicit nulls", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
    },
  ]);

  expect(viewModel.ontology).toEqual({
    ontologyIri: null,
    ontologyTitle: null,
    versionIri: null,
    versionInfo: null,
    priorVersionIri: null,
    modifiedAt: null,
  });
});

test("merges definition-axiom sources into the displayed class sources", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.skos}definition`]: [
        { "@value": "A class used by the test.", "@language": "en" },
      ],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/direct" },
      ],
    },
    {
      "@id": "_:axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
      [`${NS.owl}annotatedTarget`]: [
        { "@value": "A class used by the test.", "@language": "en" },
      ],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/axiom" },
        { "@id": "https://haddenindustries.com/source/direct" },
      ],
    },
  ]);

  expect(viewModel.rows[0].sources).toEqual([
    "https://haddenindustries.com/source/direct",
    "https://haddenindustries.com/source/axiom",
  ]);
});

test("merges sources from legacy description axioms before the definition migration", () => {
  const viewModel = createOntologyViewModel(
    [
      {
        "@id": CLASS_IRI,
        "@type": [`${NS.owl}Class`],
        [`${NS.dcterms}description`]: [{ "@value": "Legacy definition" }],
      },
      {
        "@id": "_:legacy-axiom",
        "@type": [`${NS.owl}Axiom`],
        [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
        [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.dcterms}description` }],
        [`${NS.owl}annotatedTarget`]: [{ "@value": "Legacy definition" }],
        [`${NS.dcterms}source`]: [
          { "@id": "https://haddenindustries.com/source/legacy-definition" },
        ],
      },
    ],
    { ontologyPath: "universal/core/20260610" },
  );

  expect(viewModel.rows[0].sources).toEqual([
    "https://haddenindustries.com/source/legacy-definition",
  ]);
});

test("preserves a retained legacy definition Axiom after the property transition", () => {
  const viewModel = createOntologyViewModel(
    [
      {
        "@id": CLASS_IRI,
        "@type": [`${NS.owl}Class`],
        [`${NS.dcterms}description`]: [
          { "@value": "Transition definition", "@language": "en" },
        ],
        [`${NS.skos}definition`]: [
          { "@value": "Transition definition", "@language": "en" },
        ],
      },
      {
        "@id": "_:retained-legacy-axiom",
        "@type": [`${NS.owl}Axiom`],
        [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
        [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.dcterms}description` }],
        [`${NS.owl}annotatedTarget`]: [
          { "@value": "Transition definition", "@language": "en" },
        ],
        [`${NS.dcterms}source`]: [
          { "@id": "https://haddenindustries.com/source/transition" },
        ],
      },
    ],
    { ontologyPath: "universal/extended/20260626" },
  );

  expect(viewModel.rows[0].definition).toBe("Transition definition");
  expect(viewModel.rows[0].sources).toEqual([
    "https://haddenindustries.com/source/transition",
  ]);
});

test("does not associate a removed legacy definition Axiom after the property transition", () => {
  const viewModel = createOntologyViewModel(
    [
      {
        "@id": CLASS_IRI,
        "@type": [`${NS.owl}Class`],
        [`${NS.skos}definition`]: [
          { "@value": "Transition definition", "@language": "en" },
        ],
      },
      {
        "@id": "_:removed-legacy-axiom",
        "@type": [`${NS.owl}Axiom`],
        [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
        [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.dcterms}description` }],
        [`${NS.owl}annotatedTarget`]: [
          { "@value": "Transition definition", "@language": "en" },
        ],
        [`${NS.dcterms}source`]: [
          { "@id": "https://haddenindustries.com/source/removed-legacy" },
        ],
      },
    ],
    { ontologyPath: "universal/extended/20260626" },
  );

  expect(viewModel.rows[0].sources).toEqual([]);
});

test("does not associate an Axiom whose annotated target is a different definition", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.skos}definition`]: [{ "@value": "Current definition" }],
    },
    {
      "@id": "_:stale-axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
      [`${NS.owl}annotatedTarget`]: [{ "@value": "Superseded definition" }],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/stale" },
      ],
    },
  ]);

  expect(viewModel.rows[0].sources).toEqual([]);
});

test("distinguishes Axiom target language tags with the same lexical value", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.skos}definition`]: [
        { "@value": "Shared text", "@language": "en" },
      ],
    },
    {
      "@id": "_:different-language-axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
      [`${NS.owl}annotatedTarget`]: [
        { "@value": "Shared text", "@language": "fr" },
      ],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/french" },
      ],
    },
  ]);

  expect(viewModel.rows[0].sources).toEqual([]);
});

test("distinguishes Axiom target datatypes with the same lexical value", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.skos}definition`]: [
        { "@value": "Shared text", "@type": "https://example.com/type/one" },
      ],
    },
    {
      "@id": "_:different-datatype-axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
      [`${NS.owl}annotatedTarget`]: [
        { "@value": "Shared text", "@type": "https://example.com/type/two" },
      ],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/other-datatype" },
      ],
    },
  ]);

  expect(viewModel.rows[0].sources).toEqual([]);
});

test("matches equivalent native JSON-LD values by their inferred RDF datatype", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.skos}definition`]: [{ "@value": 7 }],
    },
    {
      "@id": "_:native-value-axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
      [`${NS.owl}annotatedTarget`]: [7],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/native-value" },
      ],
    },
  ]);

  expect(viewModel.rows[0].sources).toEqual([
    "https://haddenindustries.com/source/native-value",
  ]);
});

test("promotes only declared legacy references into normalized sources", () => {
  const isoReference = "urn:iso:std:iso:9000:ed-4:v1:en:term:3.1";
  const dictionaryReference = "https://example.com/dictionary/term";
  const viewModel = createOntologyViewModel(
    [
      {
        "@id": CLASS_IRI,
        "@type": [`${NS.owl}Class`],
        [`${NS.dcterms}source`]: [
          { "@id": "https://example.com/explicit-source" },
        ],
        [`${NS.dcterms}references`]: [
          { "@id": isoReference },
          { "@id": dictionaryReference },
        ],
      },
    ],
    { ontologyPath: "universal/core/20260423" },
  );

  expect(viewModel.rows[0].sources).toEqual([
    "https://example.com/explicit-source",
    isoReference,
  ]);
  expect(viewModel.rows[0].references).toEqual([dictionaryReference]);
});

test.each([
  ["universal/core/20260511", "a Universal version after the declaration"],
  [
    "iso-iec/11179/-3/ed-4/20260618",
    "an ontology series without a declaration",
  ],
])("retains ISO references for %s (%s)", (ontologyPath) => {
  const isoReference = "urn:iso:std:iso-iec:11179:-3:ed-4:v1:clause:9.2.2";
  const viewModel = createOntologyViewModel(
    [
      {
        "@id": CLASS_IRI,
        "@type": [`${NS.owl}Class`],
        [`${NS.dcterms}references`]: [{ "@id": isoReference }],
      },
    ],
    { ontologyPath },
  );

  expect(viewModel.rows[0].sources).toEqual([]);
  expect(viewModel.rows[0].references).toEqual([isoReference]);
});
