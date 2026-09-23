import { readFile } from "node:fs/promises";
import oxigraph from "oxigraph";
import {
  queryOntologyContext,
  findOntologyConnections,
} from "../src/ontologyContextQueries.js";

let store;
const core = "https://haddenindustries.com/ontology/universal/core/";
beforeAll(async () => {
  store = new oxigraph.Store();
  store.load(
    await readFile(
      new URL("../../../src/universal/core/20260912", import.meta.url),
    ),
    {
      format: "application/rdf+xml",
      to_graph_name: oxigraph.namedNode("urn:core"),
    },
  );
});
afterAll(() => store.free());

test("keeps parallel restriction qualifiers and uses selected import property declarations", () => {
  const fixture = new oxigraph.Store();
  fixture.load(
    "@prefix owl:<http://www.w3.org/2002/07/owl#>. @prefix rdfs:<http://www.w3.org/2000/01/rdf-schema#>. <urn:a> rdfs:subClassOf [owl:intersectionOf ([a owl:Restriction;owl:onProperty <urn:p>;owl:onClass <urn:b>;owl:minQualifiedCardinality 1] [a owl:Restriction;owl:onProperty <urn:p>;owl:onClass <urn:b>;owl:maxQualifiedCardinality 2])]. <urn:c> <urn:q> <urn:d>.",
    { format: "text/turtle", to_graph_name: oxigraph.namedNode("urn:root") },
  );
  fixture.load("<urn:q> a <http://www.w3.org/2002/07/owl#ObjectProperty>.", {
    format: "text/turtle",
    to_graph_name: oxigraph.namedNode("urn:import"),
  });
  try {
    const context = queryOntologyContext(fixture, {
      entityIri: "urn:a",
      depth: 1,
      direction: "outgoing",
    });
    const restrictions = context.connections.filter(
      ({ role }) => role === "restriction_filler",
    );
    expect(
      restrictions.map(({ restriction }) => [
        restriction.operator,
        restriction.cardinality,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["minQualifiedCardinality", "1"],
        ["maxQualifiedCardinality", "2"],
      ]),
    );
    expect(restrictions).toHaveLength(2);
    const path = findOntologyConnections(fixture, {
      entityIri: "urn:c",
      targetEntityIri: "urn:d",
      depth: 1,
      direction: "outgoing",
    });
    expect(path.paths).toHaveLength(1);
    expect(path.context.connections[0].witnesses[0].sourceGraph).toBe(
      "urn:root",
    );
  } finally {
    fixture.free();
  }
});

test("preserves exact literal citation matching across selected graphs and flags blank evidence", () => {
  const fixture = new oxigraph.Store();
  fixture.load(
    '@prefix skos: <http://www.w3.org/2004/02/skos/core#> . <urn:a> skos:definition "same"@en, "same"@fr, "third" . <urn:b> skos:definition "blank source" .',
    {
      format: "text/turtle",
      to_graph_name: oxigraph.namedNode("urn:definitions"),
    },
  );
  fixture.load(
    '@prefix owl: <http://www.w3.org/2002/07/owl#> . @prefix dct: <http://purl.org/dc/terms/> . @prefix skos: <http://www.w3.org/2004/02/skos/core#> . [] a owl:Axiom; owl:annotatedSource <urn:a>; owl:annotatedProperty skos:definition; owl:annotatedTarget "same"@en; dct:source "printed dictionary" . <urn:b> dct:source [dct:title "source record"] .',
    {
      format: "text/turtle",
      to_graph_name: oxigraph.namedNode("urn:citations"),
    },
  );
  try {
    const definitions = queryOntologyContext(fixture, {
      entityIri: "urn:a",
      depth: 0,
    }).nodes[0].definitions;
    expect(
      definitions.find((definition) => definition.term.language === "en"),
    ).toMatchObject({
      sourceStatus: "definition_source_recorded",
      definitionSources: [
        {
          annotationGraph: "urn:citations",
          term: { termType: "Literal", value: "printed dictionary" },
        },
      ],
    });
    expect(
      definitions.find((definition) => definition.term.language === "fr")
        .sourceStatus,
    ).toBe("no_recorded_source");
    expect(
      definitions.find((definition) => definition.term.value === "third")
        .sourceStatus,
    ).toBe("no_recorded_source");
    expect(
      new Set(
        definitions.map((definition) => definition.definitionAssertionRef),
      ).size,
    ).toBe(3);
    const blankSourceDefinition = queryOntologyContext(fixture, {
      entityIri: "urn:b",
      depth: 0,
    }).nodes[0].definitions[0];
    expect(blankSourceDefinition.sourceStatus).toBe("entity_source_only");
    expect(
      blankSourceDefinition.entitySources[0].sourceDescription,
    ).toMatchObject({
      complete: true,
      statements: [{ object: { value: "source record" } }],
    });
    fixture.load("<urn:b> <http://purl.org/dc/terms/source> _:unresolved .", {
      format: "text/turtle",
      to_graph_name: oxigraph.namedNode("urn:missing"),
    });
    expect(
      queryOntologyContext(fixture, { entityIri: "urn:b", depth: 0 }).nodes[0]
        .definitions[0].sourceStatus,
    ).toBe("source_evidence_incomplete");
  } finally {
    fixture.free();
  }
});

test("traverses incoming qualified restrictions without reversing their asserted meaning", () => {
  const result = queryOntologyContext(store, {
    entityIri: `${core}Address`,
    depth: 1,
    direction: "incoming",
    predicateIris: [`${core}hasAddressIs`, `${core}hasAddressOf`],
  });
  expect(
    result.connections
      .filter((connection) => connection.role === "restriction_filler")
      .map((connection) => [
        connection.sourceIri,
        connection.targetIri,
        connection.predicateIri,
      ])
      .sort(),
  ).toEqual([
    [`${core}AddressRelationship`, `${core}Address`, `${core}hasAddressIs`],
    [`${core}AddressRelationship`, `${core}Address`, `${core}hasAddressOf`],
  ]);
});

test("keeps universal, inverse and negated structures distinct and terminates cyclic lists", () => {
  const fixture = new oxigraph.Store();
  fixture.load(
    "@prefix owl: <http://www.w3.org/2002/07/owl#> . @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> . <urn:a> rdfs:subClassOf [a owl:Restriction; owl:onProperty [owl:inverseOf <urn:p>]; owl:allValuesFrom <urn:b>], [owl:complementOf <urn:c>], [owl:unionOf _:list] . _:list rdf:first <urn:d>; rdf:rest _:list .",
    {
      format: "text/turtle",
      to_graph_name: oxigraph.namedNode("urn:structure"),
    },
  );
  try {
    const result = queryOntologyContext(fixture, {
      entityIri: "urn:a",
      depth: 1,
      direction: "outgoing",
    });
    expect(
      result.connections.find((connection) => connection.targetIri === "urn:b")
        .restriction,
    ).toMatchObject({
      operator: "allValuesFrom",
      inverseProperty: true,
      entailsExistence: false,
    });
    expect(
      result.connections.find((connection) => connection.targetIri === "urn:c"),
    ).toMatchObject({
      kind: "structural",
      role: "expression_reference",
      expressionPath: ["http://www.w3.org/2002/07/owl#complementOf"],
    });
    expect(
      result.expressions.some((expression) =>
        expression.diagnostics.includes("repeated_or_cyclic_structure"),
      ),
    ).toBe(true);
    expect(
      result.connections.some(
        (connection) =>
          connection.kind === "asserted" && connection.predicateIri === "urn:p",
      ),
    ).toBe(false);
  } finally {
    fixture.free();
  }
});

test("finds both shortest relationship chains and distinguishes bounded absence", () => {
  const fixture = new oxigraph.Store();
  fixture.load(
    "<urn:a> <urn:p> <urn:b> . <urn:a> <urn:q> <urn:b> . <urn:b> <urn:p> <urn:c> . <urn:c> <urn:p> <urn:a> .",
    { format: "text/turtle", to_graph_name: oxigraph.namedNode("urn:fixture") },
  );
  try {
    const input = {
      entityIri: "urn:a",
      targetEntityIri: "urn:c",
      depth: 2,
      direction: "outgoing",
      relationProfile: "all_asserted",
      maximumNodes: 40,
      maximumConnections: 120,
      maximumPaths: 3,
    };
    const result = findOntologyConnections(fixture, input);
    expect(result.status).toBe("paths_found");
    expect(result.paths).toHaveLength(2);
    expect(result.paths.map((path) => path.length)).toEqual([2, 2]);
    expect(
      findOntologyConnections(fixture, { ...input, depth: 1 }).status,
    ).toBe("no_path_within_depth");
    expect(
      findOntologyConnections(fixture, { ...input, maximumNodes: 1 }).status,
    ).toBe("search_incomplete");
  } finally {
    fixture.free();
  }
});

test("returns distinct qualified Address roles with source evidence and unavailable external descriptions", () => {
  const result = queryOntologyContext(store, {
    entityIri: `${core}AddressRelationship`,
    depth: 1,
    direction: "both",
    relationProfile: "definition_review",
    maximumNodes: 40,
    maximumConnections: 120,
  });
  const seed = result.nodes.find(
    ({ entityIri }) => entityIri === `${core}AddressRelationship`,
  );
  expect(seed.definitions[0].term.value).toBe(
    "Way in which Addresses are connected",
  );
  expect(seed.definitions[0].sourceStatus).toBe("no_recorded_source");
  const restrictions = result.connections.filter(
    ({ role }) => role === "restriction_filler",
  );
  expect(
    restrictions
      .map(({ predicateIri, targetIri, restriction }) => [
        predicateIri.split("/").at(-1),
        targetIri.split("/").at(-1),
        restriction.operator,
        restriction.cardinality,
      ])
      .sort(),
  ).toEqual([
    ["hasAddressIs", "Address", "qualifiedCardinality", "1"],
    ["hasAddressOf", "Address", "qualifiedCardinality", "1"],
    [
      "hasAddressRelationshipType",
      "AddressRelationshipType",
      "qualifiedCardinality",
      "1",
    ],
  ]);
  expect(
    result.nodes.find(({ entityIri }) =>
      entityIri.endsWith("/AddressRelationshipType"),
    ).descriptionAvailable,
  ).toBe(false);
  expect(
    result.connections.some(
      ({ kind, predicateIri }) =>
        kind === "asserted" && predicateIri === `${core}hasAddressIs`,
    ),
  ).toBe(false);
});

test("retains Activity citations, hierarchy and qualified minimum zero without asserting existence", () => {
  const result = queryOntologyContext(store, {
    entityIri: `${core}Activity`,
    depth: 1,
    direction: "both",
    relationProfile: "definition_review",
    maximumNodes: 40,
    maximumConnections: 120,
  });
  const seed = result.nodes.find(
    ({ entityIri }) => entityIri === `${core}Activity`,
  );
  expect(seed.definitions[0].sourceStatus).toBe("definition_source_recorded");
  expect(seed.definitions[0].definitionSources).toHaveLength(2);
  expect(result.nodes.map(({ entityIri }) => entityIri)).toEqual(
    expect.arrayContaining([
      `${core}Event`,
      `${core}Payment`,
      `${core}Process`,
      `${core}Resource`,
    ]),
  );
  expect(
    result.connections.find(
      ({ role, targetIri }) =>
        role === "restriction_filler" && targetIri === `${core}Resource`,
    ).restriction,
  ).toMatchObject({
    operator: "minQualifiedCardinality",
    cardinality: "0",
    entailsExistence: false,
  });
});
