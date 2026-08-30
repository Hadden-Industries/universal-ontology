import * as z from "zod";

import {
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
  ResolveOntologyEntityInputSchema,
  SearchOntologyEntitiesInputSchema,
} from "../ontologyQuery/ontologyQuerySchemas.js";

export const ONTOLOGY_TOOL_ERROR_CODE_VALUES = Object.freeze([
  "UNKNOWN_ONTOLOGY_ARTIFACT_FAMILY",
  "UNKNOWN_ONTOLOGY_RELEASE",
  "QUERY_INDEX_CATALOG_UNAVAILABLE",
  "QUERY_INDEX_SCHEMA_UNSUPPORTED",
  "QUERY_INDEX_DIGEST_MISMATCH",
  "QUERY_CANCELLED",
  "INTERNAL_QUERY_FAILURE",
]);

/** Stable application failure arm returned inside a successful MCP exchange. */
export const OntologyToolFailureSchema = z.strictObject({
  outcome: z.literal("failure"),
  error: z.strictObject({
    errorCode: z.enum(ONTOLOGY_TOOL_ERROR_CODE_VALUES),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

/** Complete declared output for `search_entities`. */
export const SearchEntitiesToolOutputSchema = z.union([
  OntologyEntitySearchSuccessSchema,
  OntologyToolFailureSchema,
]);

/** Complete declared output for `resolve_entity`. */
export const ResolveEntityToolOutputSchema = z.union([
  OntologyEntityResolutionSuccessSchema,
  OntologyToolFailureSchema,
]);

const READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

/** Full v1 catalog definition for lexical ontology discovery. */
export const SEARCH_ENTITIES_TOOL_CONFIGURATION = Object.freeze({
  title: "Search Universal Ontology entities",
  description:
    "Search authored labels, identifiers, IRI local names, and lexical definitions in selected immutable ontology releases. Returns ranked entity matches, asserted lexical definitions, and release provenance. This tool performs no inference and never dereferences external IRIs.",
  inputSchema: SearchOntologyEntitiesInputSchema,
  outputSchema: SearchEntitiesToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});

/** Full v1 catalog definition for exact typed-identifier resolution. */
export const RESOLVE_ENTITY_TOOL_CONFIGURATION = Object.freeze({
  title: "Resolve a Universal Ontology entity",
  description:
    "Resolve an exact ontology entity IRI, UUID URN, or preferred label in selected immutable releases. A preferred label can be ambiguous; use search_entities first when the intended entity is not already known.",
  inputSchema: ResolveOntologyEntityInputSchema,
  outputSchema: ResolveEntityToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});
