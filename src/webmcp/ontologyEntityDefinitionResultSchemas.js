import * as z from "zod";

import { ONTOLOGY_QUERY_ERROR_CODE_VALUES } from "../ontologyQuery/ontologyQueryErrors.js";
import {
  AbsoluteIriSchema,
  ONTOLOGY_ENTITY_KIND_VALUES,
  OntologyArtifactFamilyIdSchema,
  OntologyEntityKindSchema,
  OntologyVersionTagSchema,
  SelectedLexicalAssertionSchema,
  UuidUrnSchema,
} from "../ontologyQuery/ontologyQuerySchemas.js";

export const ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION = 1;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES = 5;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS = 5;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS = 5;
export const ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE =
  "Provide exactly one entityReference string containing 1 to 512 Unicode code points.";
export const ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE =
  "The entityReference must be a non-blank entity IRI, UUID, or preferred label accepted by the ontology query.";

export const ONTOLOGY_ENTITY_DEFINITION_FAILURE_CODE_VALUES = Object.freeze([
  ...ONTOLOGY_QUERY_ERROR_CODE_VALUES,
  "DISPLAYED_RELEASE_IDENTITY_MISMATCH",
]);

const ontologyEntityKindOrder = new Map(
  ONTOLOGY_ENTITY_KIND_VALUES.map((entityKind, index) => [entityKind, index]),
);

function valuesAreStrictlyAscending(values, project = (value) => value) {
  return values.every(
    (value, index) =>
      index === 0 || project(values[index - 1]) < project(value),
  );
}

const OrderedOntologyEntityKindsSchema = z
  .array(OntologyEntityKindSchema)
  .min(1)
  .max(ONTOLOGY_ENTITY_KIND_VALUES.length)
  .refine(
    (entityKinds) =>
      valuesAreStrictlyAscending(entityKinds, (entityKind) =>
        ontologyEntityKindOrder.get(entityKind),
      ),
    "Entity kinds must be unique and follow the canonical entity-kind order.",
  );

const CanonicalUuidUrnSchema = UuidUrnSchema.refine(
  (uuidUrn) => uuidUrn === uuidUrn.toLowerCase(),
  "UUID URNs must use the canonical lowercase representation.",
);

const CompactSelectedLexicalAssertionSchema =
  SelectedLexicalAssertionSchema.omit({ resolvedOntologyRelease: true });

const DisplayedOntologyReleaseSchema = z.strictObject({
  ontologyArtifactFamilyId: OntologyArtifactFamilyIdSchema,
  versionTag: OntologyVersionTagSchema,
  ontologyIri: AbsoluteIriSchema,
  ontologyTitle: z.string().nullable(),
  versionIri: AbsoluteIriSchema,
  versionInfo: z.string().nullable(),
  priorVersionIri: AbsoluteIriSchema.nullable(),
  ontologyDocumentIri: AbsoluteIriSchema,
  documentVersionAlias: z.enum(["latest", "latest-unstable"]).nullable(),
  sourceArtifactUrl: AbsoluteIriSchema,
  sourceArtifactSha256: z.string().regex(/^[0-9a-f]{64}$/u),
});

const ResolutionResultCommonShape = {
  resultSchemaVersion: z.literal(
    ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
  ),
  requestedEntityReference: z.string().min(1),
  matchedBy: z.enum(["entity_iri", "uuid", "preferred_label"]),
  displayedOntologyRelease: DisplayedOntologyReleaseSchema,
};

function validateBoundedProjection(
  { values, totalCount, truncated, maximumReturnedCount, projectionName },
  context,
) {
  const expectedReturnedCount = Math.min(totalCount, maximumReturnedCount);

  if (values.length !== expectedReturnedCount) {
    context.addIssue({
      code: "custom",
      message:
        `${projectionName} must contain exactly ${expectedReturnedCount} ` +
        "returned values for its total count.",
    });
  }

  if (truncated !== totalCount > maximumReturnedCount) {
    context.addIssue({
      code: "custom",
      message: `${projectionName} truncation does not match its total count.`,
    });
  }
}

const CompactResolvedOntologyEntitySchema = z
  .strictObject({
    entityIri: AbsoluteIriSchema,
    entityKinds: OrderedOntologyEntityKindsSchema,
    uuidUrns: z
      .array(CanonicalUuidUrnSchema)
      .max(MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS)
      .refine(
        (uuidUrns) => valuesAreStrictlyAscending(uuidUrns),
        "UUID URNs must be unique and sorted in ascending code-unit order.",
      ),
    uuidUrnCount: z.number().int().nonnegative(),
    uuidUrnsTruncated: z.boolean(),
    selectedPreferredLabel: CompactSelectedLexicalAssertionSchema.nullable(),
    selectedLexicalDefinition: CompactSelectedLexicalAssertionSchema.nullable(),
    sourceIris: z
      .array(AbsoluteIriSchema)
      .max(MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS)
      .refine(
        (sourceIris) => valuesAreStrictlyAscending(sourceIris),
        "Source IRIs must be unique and sorted in ascending code-unit order.",
      ),
    sourceIriCount: z.number().int().nonnegative(),
    sourceIrisTruncated: z.boolean(),
  })
  .superRefine((ontologyEntity, context) => {
    validateBoundedProjection(
      {
        values: ontologyEntity.uuidUrns,
        totalCount: ontologyEntity.uuidUrnCount,
        truncated: ontologyEntity.uuidUrnsTruncated,
        maximumReturnedCount: MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS,
        projectionName: "uuidUrns",
      },
      context,
    );
    validateBoundedProjection(
      {
        values: ontologyEntity.sourceIris,
        totalCount: ontologyEntity.sourceIriCount,
        truncated: ontologyEntity.sourceIrisTruncated,
        maximumReturnedCount: MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS,
        projectionName: "sourceIris",
      },
      context,
    );
  });

const AmbiguousOntologyEntityCandidateSchema = z.strictObject({
  entityIri: AbsoluteIriSchema,
  entityKinds: OrderedOntologyEntityKindsSchema,
  preferredLabelLexicalForm: z.string().nullable(),
});

export const OntologyEntityDefinitionResolvedResultSchema = z.strictObject({
  ...ResolutionResultCommonShape,
  status: z.literal("resolved"),
  ontologyEntity: CompactResolvedOntologyEntitySchema,
});

export const OntologyEntityDefinitionNotFoundResultSchema = z.strictObject({
  ...ResolutionResultCommonShape,
  status: z.literal("not_found"),
});

export const OntologyEntityDefinitionAmbiguousResultSchema = z
  .strictObject({
    ...ResolutionResultCommonShape,
    status: z.literal("ambiguous"),
    candidateCount: z.number().int().min(2),
    candidatesTruncated: z.boolean(),
    candidates: z
      .array(AmbiguousOntologyEntityCandidateSchema)
      .min(2)
      .max(MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES)
      .refine(
        (candidates) =>
          valuesAreStrictlyAscending(candidates, ({ entityIri }) => entityIri),
        "Candidates must have unique IRIs in ascending code-unit order.",
      ),
  })
  .superRefine((result, context) => {
    validateBoundedProjection(
      {
        values: result.candidates,
        totalCount: result.candidateCount,
        truncated: result.candidatesTruncated,
        maximumReturnedCount: MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES,
        projectionName: "candidates",
      },
      context,
    );
  });

export const OntologyEntityDefinitionInvalidInputResultSchema =
  z.discriminatedUnion("errorCode", [
    z.strictObject({
      resultSchemaVersion: z.literal(
        ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
      ),
      status: z.literal("invalid_input"),
      errorCode: z.literal("invalid_tool_input"),
      message: z.literal(ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE),
    }),
    z.strictObject({
      resultSchemaVersion: z.literal(
        ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
      ),
      status: z.literal("invalid_input"),
      errorCode: z.literal("invalid_entity_reference"),
      message: z.literal(ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE),
    }),
  ]);

export const OntologyEntityDefinitionFailureResultSchema = z.strictObject({
  resultSchemaVersion: z.literal(
    ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
  ),
  status: z.literal("failure"),
  error: z.strictObject({
    errorCode: z.enum(ONTOLOGY_ENTITY_DEFINITION_FAILURE_CODE_VALUES),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
});

/** Strict compact output contract returned directly to WebMCP callers. */
export const OntologyEntityDefinitionResultSchema = z.union([
  OntologyEntityDefinitionResolvedResultSchema,
  OntologyEntityDefinitionNotFoundResultSchema,
  OntologyEntityDefinitionAmbiguousResultSchema,
  OntologyEntityDefinitionInvalidInputResultSchema,
  OntologyEntityDefinitionFailureResultSchema,
]);
