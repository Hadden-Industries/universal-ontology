import * as z from "zod";

import { ONTOLOGY_QUERY_ERROR_CODE_VALUES } from "universal-ontology-query";
import {
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
  ResolveOntologyEntityInputSchema,
  SearchOntologyEntitiesInputSchema,
  GetOntologyEntityContextInputSchema,
  FindOntologyEntityConnectionsInputSchema,
  OntologyEntityContextSuccessSchema,
  OntologyEntityConnectionsSuccessSchema,
} from "universal-ontology-query/schemas";

/** Stable application failure arm returned inside a successful MCP exchange. */
export const OntologyToolFailureSchema = z.strictObject({
  outcome: z.literal("failure"),
  error: z.strictObject({
    errorCode: z.enum(ONTOLOGY_QUERY_ERROR_CODE_VALUES),
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

/** Tool definition for lexical ontology discovery. */
export const SEARCH_ENTITIES_TOOL_CONFIGURATION = Object.freeze({
  title: "Search Universal Ontology entities",
  description:
    "Discover ontology entities by optional text, entity kind, ownership, or recorded-source status. Returns exact matching definition assertions and a pinned snapshot. Follow nextCursor unchanged for further pages; repeated entity groups continue that entity's definitions. Source status describes recorded evidence, not source quality. For a known entity, call get_entity_context directly. No inference or external IRI dereferencing.",
  inputSchema: SearchOntologyEntitiesInputSchema,
  outputSchema: SearchEntitiesToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});

export const EntityContextToolOutputSchema = z.union([
  OntologyEntityContextSuccessSchema,
  OntologyToolFailureSchema,
]);
export const EntityConnectionsToolOutputSchema = z.union([
  OntologyEntityConnectionsSuccessSchema,
  OntologyToolFailureSchema,
]);
export const GET_ENTITY_CONTEXT_TOOL_CONFIGURATION = Object.freeze({
  title: "Get ontology entity context",
  description:
    "Review a known entity directly by typed identifier. Returns exact definitions, recorded sources, notes, asserted neighbours and qualified OWL structural references. Choose one root ontology; the default includes only locally catalogued imports. Reuse snapshotRef for a stable follow-up. Depth counts named-resource hops. OWL restrictions are structural evidence, never inferred factual edges. Inspect completeness and import coverage before drawing conclusions.",
  inputSchema: GetOntologyEntityContextInputSchema,
  outputSchema: EntityContextToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});
export const FIND_ENTITY_CONNECTIONS_TOOL_CONFIGURATION = Object.freeze({
  title: "Find ontology entity connections",
  description:
    "Find bounded shortest chains between two typed entity identifiers in one pinned ontology selection. Preserves original relationship directions, predicates, OWL qualifiers and graph witnesses. no_path_within_depth is reported only for a complete bounded search; search_incomplete establishes no absence. No inference or network acquisition.",
  inputSchema: FindOntologyEntityConnectionsInputSchema,
  outputSchema: EntityConnectionsToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});

/** Tool definition for exact typed-identifier resolution. */
export const RESOLVE_ENTITY_TOOL_CONFIGURATION = Object.freeze({
  title: "Resolve a Universal Ontology entity",
  description:
    "Resolve an exact ontology entity IRI, UUID URN, or preferred label in selected immutable releases. A preferred label can be ambiguous; use search_entities first when the intended entity is not already known. By default each entity carries only the selected label and definition; set entityDetailLevel to full to include every source-artifact assertion and complete provenance.",
  inputSchema: ResolveOntologyEntityInputSchema,
  outputSchema: ResolveEntityToolOutputSchema,
  annotations: READ_ONLY_ONTOLOGY_TOOL_ANNOTATIONS,
});
