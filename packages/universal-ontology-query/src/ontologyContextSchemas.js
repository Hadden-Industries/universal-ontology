import * as z from "zod";

const iri = z.string().regex(/^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/u);
const digest = z.string().regex(/^[0-9a-f]{64}$/u);
const snapshotId = z.string().regex(/^urn:uo:snapshot:[0-9a-f]{64}$/u);

/** Exact immutable graph selection returned to the caller for follow-up calls. */
export const OntologySnapshotReferenceSchema = z.strictObject({
  catalogSha256: digest,
  rootSnapshotId: snapshotId,
  snapshotIds: z.array(snapshotId).min(1).max(16),
  graphSelection: z.enum([
    "source_graph",
    "catalogued_imports",
    "selected_graphs",
  ]),
  selectionSha256: digest,
});

export const ContextRdfTermSchema = z.discriminatedUnion("termType", [
  z.strictObject({ termType: z.literal("NamedNode"), value: iri }),
  z.strictObject({
    termType: z.literal("BlankNode"),
    value: z.string().min(1),
  }),
  z.strictObject({
    termType: z.literal("Literal"),
    value: z.string(),
    language: z.string(),
    datatype: iri,
  }),
]);
const assertionShape = {
  assertionRef: digest,
  subject: ContextRdfTermSchema,
  predicateIri: iri,
  object: ContextRdfTermSchema,
  sourceGraph: iri,
};
const sourceDescription = z.strictObject({
  statements: z.array(z.strictObject(assertionShape)).max(32),
  complete: z.boolean(),
});
export const ContextAssertionSchema = z.strictObject({
  ...assertionShape,
  sourceDescription: sourceDescription.optional(),
});
const sourceEvidence = z.strictObject({
  term: ContextRdfTermSchema,
  annotationGraph: iri,
  description: sourceDescription.optional(),
});
export const DefinitionSourceStatusSchema = z.enum([
  "definition_source_recorded",
  "entity_source_only",
  "no_recorded_source",
  "source_evidence_incomplete",
]);
export const ContextDefinitionSchema = z.strictObject({
  definitionAssertionRef: digest,
  predicateIri: iri,
  term: ContextRdfTermSchema,
  definitionGraph: iri,
  sourceStatus: DefinitionSourceStatusSchema,
  definitionSources: z.array(sourceEvidence),
  entitySources: z.array(ContextAssertionSchema),
  sourceQuality: z.literal("not_evaluated"),
});
export const ContextNodeSchema = z.strictObject({
  detailsOmitted: z.boolean(),
  entityIri: iri,
  descriptionAvailable: z.boolean(),
  kinds: z.array(ContextRdfTermSchema),
  labels: z.array(ContextAssertionSchema),
  definitions: z.array(ContextDefinitionSchema),
  notes: z.array(
    z.strictObject({ ...assertionShape, sources: z.array(sourceEvidence) }),
  ),
  entitySources: z.array(ContextAssertionSchema),
});
const restriction = z.strictObject({
  operator: z.string(),
  cardinality: z.string().nullable(),
  qualified: z.boolean(),
  inverseProperty: z.boolean(),
  entailsExistence: z.literal(false),
  value: ContextRdfTermSchema,
  filler: ContextRdfTermSchema,
});
export const ContextConnectionSchema = z.strictObject({
  connectionRef: digest,
  kind: z.enum(["asserted", "structural"]),
  sourceIri: iri,
  targetIri: iri,
  predicateIri: iri,
  role: z.enum([
    "assertion",
    "restriction_filler",
    "restriction_property",
    "expression_reference",
  ]),
  expressionRef: digest.nullable(),
  expressionPath: z.array(iri).optional(),
  restriction: restriction.nullable(),
  witnesses: z.array(ContextAssertionSchema),
});
export const OntologyContextProjectionSchema = z.strictObject({
  entityIri: iri,
  nodes: z.array(ContextNodeSchema).max(200),
  connections: z.array(ContextConnectionSchema).max(1000),
  expressions: z.array(
    z.strictObject({
      expressionRef: digest,
      root: ContextRdfTermSchema,
      attachment: ContextAssertionSchema,
      statements: z.array(ContextAssertionSchema).max(256),
      diagnostics: z.array(z.string()),
    }),
  ),
  completeness: z.strictObject({
    requestedDepth: z.number().int().min(0).max(4),
    completedExpansionDepth: z.number().int().min(0).max(4),
    returnedNodeCount: z.number().int().nonnegative(),
    returnedConnectionCount: z.number().int().nonnegative(),
    candidateConnectionCount: z.number().int().min(0).max(10000),
    truncationReasons: z.array(z.string()),
    frontierHints: z.array(iri).max(10),
    inference: z.literal("none"),
  }),
});
