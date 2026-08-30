import { McpServer } from "@modelcontextprotocol/server";

import {
  isOntologyQueryError,
  OntologyQueryError,
} from "../ontologyQuery/createOntologyQueryModule.js";
import {
  RESOLVE_ENTITY_TOOL_NAME,
  SEARCH_ENTITIES_TOOL_NAME,
  UNIVERSAL_ONTOLOGY_MCP_INSTRUCTIONS,
  UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO,
} from "./universalOntologyMcpMetadata.js";
import {
  OntologyToolFailureSchema,
  RESOLVE_ENTITY_TOOL_CONFIGURATION,
  ResolveEntityToolOutputSchema,
  SEARCH_ENTITIES_TOOL_CONFIGURATION,
  SearchEntitiesToolOutputSchema,
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

async function executeOntologyToolSafely({
  execute,
  outputSchema,
  reportUnhandledToolError,
}) {
  try {
    const structuredContent = outputSchema.parse(await execute());
    return createApplicationToolResult(structuredContent);
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
 * Register the complete v1 tool catalog on a cheap per-request server.
 *
 * The injected query module owns file I/O and immutable-index caching. This
 * factory only adapts validated MCP calls and therefore performs no startup
 * reads and creates no request-specific semantic state.
 */
export function createUniversalOntologyMcpServer({
  ontologyQuery,
  reportUnhandledToolError = () => {},
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
        execute: () =>
          ontologyQuery.searchOntologyEntities(input, {
            signal: context.mcpReq.signal,
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
            signal: context.mcpReq.signal,
          }),
      }),
  );

  return server;
}
