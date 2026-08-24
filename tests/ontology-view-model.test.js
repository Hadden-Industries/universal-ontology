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
        { "@value": "Example Ontology", "@language": "en" },
      ],
      [`${NS.dcterms}modified`]: [{ "@value": "2026-08-22" }],
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
    title: "Example Ontology",
    modified: "2026-08-22",
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

test("merges definition-axiom sources into the displayed class sources", () => {
  const viewModel = createOntologyViewModel([
    {
      "@id": CLASS_IRI,
      "@type": [`${NS.owl}Class`],
      [`${NS.dcterms}source`]: [
        { "@id": "https://haddenindustries.com/source/direct" },
      ],
    },
    {
      "@id": "_:axiom",
      "@type": [`${NS.owl}Axiom`],
      [`${NS.owl}annotatedSource`]: [{ "@id": CLASS_IRI }],
      [`${NS.owl}annotatedProperty`]: [{ "@id": `${NS.skos}definition` }],
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
