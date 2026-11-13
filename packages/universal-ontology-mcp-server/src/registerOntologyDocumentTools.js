import * as z from "zod";
import { OntologyResourceHandleSchema } from "universal-ontology-query/schemas";
import {
  isOntologyQueryError,
  OntologyQueryError,
} from "universal-ontology-query";
import { OntologyToolFailureSchema } from "./universalOntologyToolSchemas.js";
import {
  renderOntologyToolResultAsText,
  ONTOLOGY_AUTHORED_CONTENT_WARNING,
} from "./renderOntologyToolResultAsText.js";
const id = z.string().regex(/^[0-9a-f]{64}$/u);
const iri = z.string().min(1).max(8192);
const handle = z.strictObject({ ontologyId: id, iri });
const languages = z.array(z.string().min(1).max(64)).max(12).optional();
const bound = {
  depth: z.number().int().min(0).max(4).default(1),
  maximumNodes: z.number().int().min(1).max(200).default(40),
  maximumConnections: z.number().int().min(1).max(1000).default(120),
};
const mode = z.enum(["compatible", "preserve"]);
const budget = z.number().int().min(1024).max(131072).default(32768);

/** Register the agent-facing document operations against an operator workspace.
 * Path authority stays at the filesystem adapter. Responses carry the handle
 * of the source that supplied each hit and never dereference ontology text.
 */
export function registerOntologyDocumentTools(server, workspace, lifecycle) {
  function register(name, description, fields, run, render) {
    server.registerTool(
      name,
      {
        description,
        inputSchema:
          fields instanceof z.ZodType ? fields : z.strictObject(fields),
        annotations: {
          readOnlyHint: !["open_ontology", "close_ontology"].includes(name),
          openWorldHint: false,
        },
      },
      async (input, context) => {
        try {
          const signal = lifecycle
            ? AbortSignal.any([lifecycle, context.mcpReq.signal])
            : context.mcpReq.signal;
          const result = await run(input, signal);
          const text = render ? render(result) : JSON.stringify(result);
          const reply = {
            content: [
              {
                type: "text",
                text:
                  name === "get_entity_context"
                    ? text
                    : `${ONTOLOGY_AUTHORED_CONTENT_WARNING}\n${text}`,
              },
            ],
            structuredContent: result,
          };
          if (
            Buffer.byteLength(JSON.stringify(reply)) >
            (input.maximumResultBytes ?? 32768)
          )
            return fail(
              "RESULT_SIZE_EXCEEDED",
              "Use a smaller result count or a shallower depth.",
            );
          return reply;
        } catch (error) {
          return isOntologyQueryError(error)
            ? fail(error.errorCode, error.message)
            : fail("INTERNAL_QUERY_FAILURE", "Ontology request failed.");
        }
      },
    );
  }
  function fail(errorCode, message) {
    return {
      isError: true,
      content: [{ type: "text", text: message }],
      structuredContent: OntologyToolFailureSchema.parse({
        outcome: "failure",
        error: {
          errorCode,
          message,
          retryable: new OntologyQueryError(errorCode).retryable,
        },
      }),
    };
  }
  register(
    "open_ontology",
    "Open or refresh an authorized local ontology file. A failed open leaves existing handles usable.",
    {
      path: z.string().min(1).max(32768),
      parsingMode: mode.optional(),
      format: z.enum(["turtle", "rdfxml"]).optional(),
    },
    (input, signal) => workspace.openDocument(input, { signal }),
  );
  register(
    "list_ontologies",
    "List the open ontologies and their handles.",
    {},
    () => workspace.list(),
  );
  register(
    "close_ontology",
    "Release one open ontology.",
    { ontologyId: id },
    (input) => workspace.closeView(input),
  );
  const lexical = {
    ontologyId: id.optional(),
    preferredLanguageTags: languages,
    maximumResultBytes: budget,
  };
  register(
    "search_entities",
    "Search labels, identifiers and definitions across selected ontologyIds. Continue with cursor only. Follow a hit’s entityHandle to its term card.",
    z
      .strictObject({
        ...lexical,
        queryText: z.string().min(1).max(1024).optional(),
        ontologyIds: z.array(id).min(1).max(8).optional(),
        cursor: z
          .string()
          .regex(/^[0-9a-f]{48}$/)
          .optional(),
        maximumResultCount: z.number().int().min(1).max(20).default(10),
      })
      .refine(
        (input) =>
          input.cursor
            ? !input.queryText &&
              !input.ontologyIds &&
              !input.ontologyId &&
              !input.preferredLanguageTags
            : Boolean(input.queryText) &&
              !(input.ontologyIds && input.ontologyId),
        {
          message:
            "Use a query and one source selector, or continue using only the cursor and result limits.",
        },
      )
      .refine(
        (input) =>
          !input.ontologyIds ||
          new Set(input.ontologyIds).size === input.ontologyIds.length,
        { message: "Select each ontology only once." },
      ),
    (input, signal) => workspace.request("search", input, signal),
    (r) =>
      r.matches.map((m) => `${m.label} (${m.source})`).join("\n") ||
      "No matching terms.",
  );
  register(
    "resolve_entity",
    "Resolve an exact designation, IRI or identifier in a selected ontology.",
    { ...lexical, name: iri },
    (input, signal) => workspace.request("resolve", input, signal),
    (r) =>
      r.matches.map((m) => `${m.label} ${m.entityHandle.iri}`).join("\n") ||
      "No matching term.",
  );
  register(
    "get_entity_context",
    "Read the definition, authored citations and related terms for an entity handle.",
    z
      .strictObject({
        entityHandle: handle.optional(),
        resourceHandle: OntologyResourceHandleSchema.optional(),
        ...bound,
        maximumResultBytes: budget.default(65536),
      })
      .refine(
        (input) =>
          Boolean(input.entityHandle) !== Boolean(input.resourceHandle),
        "Supply exactly one entity or resource handle.",
      ),
    (input, signal) =>
      workspace.request(
        input.resourceHandle ? "resource" : "context",
        input,
        signal,
      ),
    (r) =>
      r.resourceHandle
        ? `${ONTOLOGY_AUTHORED_CONTENT_WARNING}\n${
            r.resolved
              ? r.statements
                  .map((row) => `${row.predicateIri} ${row.object.value}`)
                  .join("\n")
              : "No description in this source."
          }`
        : renderOntologyToolResultAsText(r),
  );
  register(
    "find_entity_connections",
    "Find bounded, asserted or structural connections between two terms in one view.",
    {
      entityHandle: handle,
      targetEntityHandle: handle,
      ...bound,
      maximumResultBytes: budget,
      maximumPaths: z.number().int().min(1).max(10).default(3),
    },
    (input, signal) => {
      if (input.entityHandle.ontologyId !== input.targetEntityHandle.ontologyId)
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
      return workspace.request("connections", input, signal);
    },
    (r) => `${r.status} (${r.paths.length} paths)`,
  );
}
