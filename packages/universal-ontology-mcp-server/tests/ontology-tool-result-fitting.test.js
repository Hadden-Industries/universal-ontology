import {
  OntologyEntityContextSuccessSchema,
  OntologyEntityConnectionsSuccessSchema,
} from "universal-ontology-query/schemas";
import {
  createApplicationToolResult,
  fitApplicationResult,
} from "../src/ontologyToolResultFitting.js";
import { createContextFittingFixture } from "./fixtures/createContextFittingFixture.js";

const byteLength = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");

test("keeps an exact-fit application result and counts escaped UTF-8 bytes", () => {
  const input = OntologyEntityContextSuccessSchema.parse(
    createContextFittingFixture(),
  );
  const expected = createApplicationToolResult(input);
  expect(
    fitApplicationResult(structuredClone(input), byteLength(expected)),
  ).toEqual(expected);
  expect(byteLength(expected)).toBeGreaterThan(JSON.stringify(expected).length);
});

test("returns the first legal fitting expression state without over-pruning", () => {
  const input = OntologyEntityContextSuccessSchema.parse(
    createContextFittingFixture(),
  );
  const expected = structuredClone(input);
  expected.context.expressions[0].statements = [];
  expected.context.expressions[0].diagnostics = [
    "raw_structure_omitted_for_byte_limit",
  ];
  expected.context.completeness.truncationReasons = [
    "expression_detail_byte_limit",
  ];
  const expectedResult = createApplicationToolResult(expected);
  const budget = byteLength(expectedResult);
  expect(byteLength(createApplicationToolResult(input))).toBeGreaterThan(
    budget,
  );
  const actual = fitApplicationResult(structuredClone(input), budget);
  expect(actual).toEqual(expectedResult);
  expect(byteLength(actual)).toBe(budget);
  expect(
    OntologyEntityContextSuccessSchema.parse(actual.structuredContent),
  ).toEqual(expected);
  const tighter = fitApplicationResult(structuredClone(input), budget - 1);
  expect(tighter.structuredContent.context.expressions[1].statements).toEqual(
    [],
  );
  expect(
    tighter.structuredContent.context.expressions[2].statements,
  ).not.toEqual([]);
  expect(byteLength(tighter)).toBeLessThanOrEqual(budget - 1);
});

test("repairs graph references and shortest-path claims after peripheral removal", () => {
  const input = createContextFittingFixture({ expressionCount: 0 });
  input.resultKind = "ontology_entity_connections";
  input.targetEntityIri = "urn:b";
  input.status = "paths_found";
  input.paths = [[input.context.connections[1]]];
  input.additionalShortestPathsOmitted = false;
  input.shortestPathsEstablished = true;
  OntologyEntityConnectionsSuccessSchema.parse(input);
  const expected = structuredClone(input);
  expected.context.nodes.pop();
  expected.context.connections.pop();
  Object.assign(expected.context.completeness, {
    truncationReasons: ["byte_limit"],
    completedExpansionDepth: 0,
    returnedNodeCount: 2,
    returnedConnectionCount: 1,
    frontierHints: ["urn:b"],
  });
  expected.paths = [];
  expected.status = "search_incomplete";
  expected.shortestPathsEstablished = false;
  const expectedResult = createApplicationToolResult(expected);
  const actual = fitApplicationResult(
    structuredClone(input),
    byteLength(expectedResult),
  );
  expect(actual).toEqual(expectedResult);
  expect(
    OntologyEntityConnectionsSuccessSchema.parse(actual.structuredContent),
  ).toEqual(expected);
});

test("omits only the last peripheral description before removing any node", () => {
  const input = createContextFittingFixture({ expressionCount: 0 });
  const evidence = structuredClone(input.context.connections[0].witnesses[0]);
  evidence.object.value = "A long recorded source 漢字".repeat(100);
  input.context.nodes[1].entitySources = [structuredClone(evidence)];
  input.context.nodes[2].entitySources = [evidence];
  const expected = structuredClone(input);
  expected.context.nodes[2].entitySources = [];
  expected.context.nodes[2].detailsOmitted = true;
  expected.context.completeness.truncationReasons = [
    "neighbour_detail_byte_limit",
  ];
  const expectedResult = createApplicationToolResult(expected);
  const actual = fitApplicationResult(
    structuredClone(input),
    byteLength(expectedResult),
  );
  expect(actual).toEqual(expectedResult);
  expect(actual.structuredContent.context.nodes).toHaveLength(3);
  OntologyEntityContextSuccessSchema.parse(actual.structuredContent);
});

test("accounts for diagnostics growing after tiny expression omissions and refuses irreducible budgets", () => {
  const input = createContextFittingFixture({ statementLength: 0 });
  const budget = byteLength(createApplicationToolResult(input)) - 1;
  const result = fitApplicationResult(structuredClone(input), budget);
  expect(byteLength(result)).toBeLessThanOrEqual(budget);
  expect(() => fitApplicationResult(structuredClone(input), 1)).toThrow(
    expect.objectContaining({ errorCode: "RESULT_SIZE_EXCEEDED" }),
  );
});
