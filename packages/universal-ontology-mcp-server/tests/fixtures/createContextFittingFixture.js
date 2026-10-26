const digest = (n) => n.toString(16).padStart(64, "0");
const literal = (value) => ({
  termType: "Literal",
  value,
  language: "en",
  datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
});

/** Independent, schema-valid graph with large escaped expression evidence. */
export function createContextFittingFixture({
  expressionCount = 4,
  statementLength = 1024,
} = {}) {
  const assertion = (n, value) => ({
    assertionRef: digest(n),
    subject: { termType: "NamedNode", value: "urn:root" },
    predicateIri: "urn:predicate",
    object: literal(value),
    sourceGraph: "urn:graph",
  });
  const nodes = ["urn:root", "urn:a", "urn:b"].map((entityIri) => ({
    entityIri,
    detailsOmitted: false,
    descriptionAvailable: true,
    kinds: [],
    labels: [],
    definitions: [],
    notes: [],
    entitySources: [],
  }));
  const connections = ["urn:a", "urn:b"].map((targetIri, n) => ({
    connectionRef: digest(100 + n),
    kind: "asserted",
    sourceIri: "urn:root",
    targetIri,
    predicateIri: "urn:predicate",
    role: "assertion",
    expressionRef: expressionCount ? digest(200 + (n % expressionCount)) : null,
    restriction: null,
    witnesses: [assertion(300 + n, targetIri)],
  }));
  return {
    outcome: "success",
    resultKind: "ontology_entity_context",
    snapshotRef: {
      catalogSha256: digest(1),
      rootSnapshotId: `urn:uo:snapshot:${digest(2)}`,
      snapshotIds: [`urn:uo:snapshot:${digest(2)}`],
      graphSelection: "source_graph",
      selectionSha256: digest(3),
    },
    selectedDefinitionAssertionRef: null,
    importCoverage: [],
    context: {
      entityIri: "urn:root",
      nodes,
      connections,
      expressions: Array.from({ length: expressionCount }, (_, n) => ({
        expressionRef: digest(200 + n),
        root: { termType: "BlankNode", value: `b${n}` },
        attachment: assertion(400 + n, "attachment"),
        statements: [assertion(500 + n, '漢字😀\\"\n'.repeat(statementLength))],
        diagnostics: [],
      })),
      completeness: {
        requestedDepth: 1,
        completedExpansionDepth: 1,
        returnedNodeCount: 3,
        returnedConnectionCount: 2,
        candidateConnectionCount: 2,
        truncationReasons: [],
        frontierHints: [],
        inference: "none",
      },
    },
  };
}
