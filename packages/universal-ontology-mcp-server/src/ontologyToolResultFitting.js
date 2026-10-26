import { OntologyQueryError } from "universal-ontology-query";
import { renderOntologyToolResultAsText } from "./renderOntologyToolResultAsText.js";

function serializedByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function createApplicationToolResult(
  structuredContent,
  isError = false,
) {
  return {
    content: [
      { type: "text", text: renderOntologyToolResultAsText(structuredContent) },
    ],
    structuredContent,
    ...(isError ? { isError: true } : {}),
  };
}

/** Retain the first fitting state in the existing ordered pruning policy. */
export function fitApplicationResult(structuredContent, maximumResultBytes) {
  let structuredByteLength = serializedByteLength(structuredContent);
  while (true) {
    // The application result includes these bytes verbatim. States whose
    // structured content alone exceeds the budget cannot fit. No assumption
    // about monotonic size, escaping or rendered text is needed to skip them.
    if (structuredByteLength <= maximumResultBytes) {
      const result = createApplicationToolResult(structuredContent);
      if (serializedByteLength(result) <= maximumResultBytes) return result;
    }
    const projection = structuredContent.context;
    const detailedExpression = projection?.expressions.find(
      (expression) => expression.statements.length > 0,
    );
    if (detailedExpression) {
      const precedingBytes =
        serializedByteLength(detailedExpression) +
        serializedByteLength(projection.completeness);
      detailedExpression.statements = [];
      detailedExpression.diagnostics.push(
        "raw_structure_omitted_for_byte_limit",
      );
      if (
        !projection.completeness.truncationReasons.includes(
          "expression_detail_byte_limit",
        )
      )
        projection.completeness.truncationReasons.push(
          "expression_detail_byte_limit",
        );
      structuredByteLength +=
        serializedByteLength(detailedExpression) +
        serializedByteLength(projection.completeness) -
        precedingBytes;
      continue;
    }
    const peripheralDetail = projection?.nodes.findLast(
      (node) =>
        node.entityIri !== projection.entityIri &&
        (node.definitions.length ||
          node.notes.length ||
          node.entitySources.length),
    );
    if (peripheralDetail) {
      const precedingBytes =
        serializedByteLength(peripheralDetail) +
        serializedByteLength(projection.completeness);
      peripheralDetail.definitions = [];
      peripheralDetail.notes = [];
      peripheralDetail.entitySources = [];
      peripheralDetail.detailsOmitted = true;
      if (
        !projection.completeness.truncationReasons.includes(
          "neighbour_detail_byte_limit",
        )
      )
        projection.completeness.truncationReasons.push(
          "neighbour_detail_byte_limit",
        );
      structuredByteLength +=
        serializedByteLength(peripheralDetail) +
        serializedByteLength(projection.completeness) -
        precedingBytes;
      continue;
    }
    if (!projection || projection.nodes.length <= 1)
      throw new OntologyQueryError("RESULT_SIZE_EXCEEDED");
    const removed = projection.nodes.pop();
    projection.connections = projection.connections.filter(
      (connection) =>
        connection.sourceIri !== removed.entityIri &&
        connection.targetIri !== removed.entityIri,
    );
    const retainedExpressions = new Set(
      projection.connections.map((connection) => connection.expressionRef),
    );
    projection.expressions = projection.expressions.filter((expression) =>
      retainedExpressions.has(expression.expressionRef),
    );
    const completeness = projection.completeness;
    if (!completeness.truncationReasons.includes("byte_limit"))
      completeness.truncationReasons.push("byte_limit");
    completeness.completedExpansionDepth = 0;
    completeness.returnedNodeCount = projection.nodes.length;
    completeness.returnedConnectionCount = projection.connections.length;
    if (completeness.frontierHints.length < 10)
      completeness.frontierHints.push(removed.entityIri);
    if (structuredContent.paths) {
      const retainedConnections = new Set(
        projection.connections.map((connection) => connection.connectionRef),
      );
      structuredContent.paths = structuredContent.paths.filter((path) =>
        path.every((connection) =>
          retainedConnections.has(connection.connectionRef),
        ),
      );
      structuredContent.status = "search_incomplete";
      structuredContent.shortestPathsEstablished = false;
    }
    // Graph repair changes several collections. Recapture that complete state
    // rather than estimating its connections, expressions, paths or counters.
    structuredByteLength = serializedByteLength(structuredContent);
  }
}
