import { McpServer } from "@modelcontextprotocol/server";

import {
  isOntologyQueryError,
  OntologyQueryError,
} from "universal-ontology-query";
import {
  RESOLVE_ENTITY_TOOL_NAME,
  SEARCH_ENTITIES_TOOL_NAME,
  GET_ENTITY_CONTEXT_TOOL_NAME,
  FIND_ENTITY_CONNECTIONS_TOOL_NAME,
  UNIVERSAL_ONTOLOGY_MCP_INSTRUCTIONS,
  UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO,
} from "./universalOntologyMcpMetadata.js";
import {
  OntologyToolFailureSchema,
  RESOLVE_ENTITY_TOOL_CONFIGURATION,
  ResolveEntityToolOutputSchema,
  SEARCH_ENTITIES_TOOL_CONFIGURATION,
  SearchEntitiesToolOutputSchema,
  GET_ENTITY_CONTEXT_TOOL_CONFIGURATION,
  FIND_ENTITY_CONNECTIONS_TOOL_CONFIGURATION,
  EntityContextToolOutputSchema,
  EntityConnectionsToolOutputSchema,
} from "./universalOntologyToolSchemas.js";
import {
  ONTOLOGY_AUTHORED_CONTENT_WARNING,
  renderOntologyToolResultAsText,
} from "./renderOntologyToolResultAsText.js";

function reportWithoutBreakingToolSafety(reportUnhandledToolError, error) {
  try {
    reportUnhandledToolError(error);
  } catch {
    // Observability must never turn a private exception into the SDK's generic
    // handler error, whose message could expose the original exception.
  }
}

function toStructuredFailure(error) {
  const safeError = isOntologyQueryError(error)
    ? error
    : new OntologyQueryError("INTERNAL_QUERY_FAILURE");

  // The SDK skips output-schema validation when `isError` is true. Parse the
  // failure arm here so both success and failure outputs cross a validation
  // boundary before reaching the wire.
  return OntologyToolFailureSchema.parse({
    outcome: "failure",
    error: {
      errorCode: safeError.errorCode,
      message: safeError.message,
      retryable: safeError.retryable,
    },
  });
}

function createApplicationToolResult(structuredContent, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: renderOntologyToolResultAsText(structuredContent),
      },
    ],
    structuredContent,
    ...(isError ? { isError: true } : {}),
  };
}

function createInternalFailureResult() {
  const structuredContent = toStructuredFailure(
    new OntologyQueryError("INTERNAL_QUERY_FAILURE"),
  );

  try {
    return createApplicationToolResult(structuredContent, true);
  } catch {
    // This path also contains no private exception text. It is deliberately
    // independent of the renderer so even a renderer defect remains safe.
    return {
      content: [
        {
          type: "text",
          text: `${ONTOLOGY_AUTHORED_CONTENT_WARNING}\nOntology query failed: INTERNAL_QUERY_FAILURE\nMessage: The ontology query failed unexpectedly.\nRetryable: no`,
        },
      ],
      structuredContent,
      isError: true,
    };
  }
}

function fitApplicationResult(structuredContent, maximumResultBytes) {
  let result = createApplicationToolResult(structuredContent);
  while (
    Buffer.byteLength(JSON.stringify(result), "utf8") > maximumResultBytes
  ) {
    const projection = structuredContent.context;
    const detailedExpression = projection?.expressions.find(
      (expression) => expression.statements.length > 0,
    );
    if (detailedExpression) {
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
      result = createApplicationToolResult(structuredContent);
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
      result = createApplicationToolResult(structuredContent);
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
    result = createApplicationToolResult(structuredContent);
  }
  return result;
}

async function executeOntologyToolSafely({
  execute,
  outputSchema,
  reportUnhandledToolError,
  maximumResultBytes = 32 * 1024,
}) {
  try {
    const structuredContent = outputSchema.parse(await execute());
    return fitApplicationResult(structuredContent, maximumResultBytes);
  } catch (error) {
    if (!isOntologyQueryError(error)) {
      reportWithoutBreakingToolSafety(reportUnhandledToolError, error);
      return createInternalFailureResult();
    }

    try {
      return createApplicationToolResult(toStructuredFailure(error), true);
    } catch (rendererError) {
      reportWithoutBreakingToolSafety(reportUnhandledToolError, rendererError);
      return createInternalFailureResult();
    }
  }
}

/**
 * Register the search and resolution tools on a per-request server.
 *
 * The injected query module owns file I/O and immutable-index caching. This
 * factory only adapts validated MCP calls and therefore performs no startup
 * reads and creates no request-specific semantic state.
 */
export function createUniversalOntologyMcpServer({
  ontologyQuery,
  reportUnhandledToolError = () => {},
  serverLifecycleSignal,
}) {
  if (
    !ontologyQuery ||
    typeof ontologyQuery.searchOntologyEntities !== "function" ||
    typeof ontologyQuery.resolveOntologyEntity !== "function"
  ) {
    throw new TypeError(
      "ontologyQuery must implement searchOntologyEntities and resolveOntologyEntity.",
    );
  }

  if (typeof reportUnhandledToolError !== "function") {
    throw new TypeError("reportUnhandledToolError must be a function.");
  }

  if (
    serverLifecycleSignal !== undefined &&
    !(
      typeof serverLifecycleSignal.aborted === "boolean" &&
      typeof serverLifecycleSignal.addEventListener === "function"
    )
  ) {
    throw new TypeError("serverLifecycleSignal must be an AbortSignal.");
  }

  function createOntologyQuerySignal(requestSignal) {
    if (!serverLifecycleSignal) {
      return requestSignal;
    }

    // A request cancellation must not terminate sibling work, while process
    // shutdown must reach every request. AbortSignal.any preserves whichever
    // of those two reasons triggered this individual invocation first.
    return AbortSignal.any([requestSignal, serverLifecycleSignal]);
  }

  const server = new McpServer(UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO, {
    instructions: UNIVERSAL_ONTOLOGY_MCP_INSTRUCTIONS,
    cacheHints: {
      // These descriptions are deployment-wide public metadata, not user
      // data. Modern clients may safely reuse them for one hour.
      "server/discover": { ttlMs: 3_600_000, cacheScope: "public" },
      "tools/list": { ttlMs: 3_600_000, cacheScope: "public" },
    },
  });

  // Tool order is observable. Register broad discovery first so hosts present
  // the intended search-then-resolve workflow deterministically.
  server.registerTool(
    SEARCH_ENTITIES_TOOL_NAME,
    SEARCH_ENTITIES_TOOL_CONFIGURATION,
    async (input, context) =>
      executeOntologyToolSafely({
        reportUnhandledToolError,
        outputSchema: SearchEntitiesToolOutputSchema,
        maximumResultBytes: input.maximumResultBytes,
        execute: () =>
          ontologyQuery.searchOntologyEntities(input, {
            signal: createOntologyQuerySignal(context.mcpReq.signal),
          }),
      }),
  );

  server.registerTool(
    RESOLVE_ENTITY_TOOL_NAME,
    RESOLVE_ENTITY_TOOL_CONFIGURATION,
    async (input, context) =>
      executeOntologyToolSafely({
        reportUnhandledToolError,
        outputSchema: ResolveEntityToolOutputSchema,
        execute: () =>
          ontologyQuery.resolveOntologyEntity(input, {
            signal: createOntologyQuerySignal(context.mcpReq.signal),
          }),
      }),
  );

  for (const [name, configuration, outputSchema, method] of [
    [
      GET_ENTITY_CONTEXT_TOOL_NAME,
      GET_ENTITY_CONTEXT_TOOL_CONFIGURATION,
      EntityContextToolOutputSchema,
      "getOntologyEntityContext",
    ],
    [
      FIND_ENTITY_CONNECTIONS_TOOL_NAME,
      FIND_ENTITY_CONNECTIONS_TOOL_CONFIGURATION,
      EntityConnectionsToolOutputSchema,
      "findOntologyEntityConnections",
    ],
  ]) {
    server.registerTool(name, configuration, async (input, context) =>
      executeOntologyToolSafely({
        reportUnhandledToolError,
        outputSchema,
        maximumResultBytes: input.maximumResultBytes,
        execute: () => {
          if (typeof ontologyQuery[method] !== "function")
            throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE", {
              message:
                "This operation requires local context artifacts and the filesystem MCP entry point.",
            });
          return ontologyQuery[method](input, {
            signal: createOntologyQuerySignal(context.mcpReq.signal),
          });
        },
      }),
    );
  }
  return server;
}
