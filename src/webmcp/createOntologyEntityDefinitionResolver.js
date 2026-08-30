import { createOntologyQueryModule } from "../ontologyQuery/createOntologyQueryModule.js";
import { createFetchOntologyReleaseIndexRepository } from "../ontologyQuery/fetchOntologyReleaseIndexRepository.js";
import {
  OntologyQueryError,
  isOntologyQueryError,
} from "../ontologyQuery/ontologyQueryErrors.js";
import {
  AbsoluteIriSchema,
  ONTOLOGY_ENTITY_KIND_VALUES,
  NonBlankOntologyLookupTextSchema,
  UuidUrnSchema,
  deepFreeze,
} from "../ontologyQuery/ontologyQuerySchemas.js";
import {
  MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES,
  MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS,
  MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS,
  ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE,
  ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
  OntologyEntityDefinitionResultSchema,
} from "./ontologyEntityDefinitionResultSchemas.js";

const PREFERRED_LANGUAGE_TAGS = Object.freeze(["en-GB", "en"]);
const DISPLAYED_RELEASE_IDENTITY_MISMATCH_MESSAGE =
  "The displayed ontology release does not match the selected query index.";
const ontologyEntityKindOrder = new Map(
  ONTOLOGY_ENTITY_KIND_VALUES.map((entityKind, index) => [entityKind, index]),
);

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function createSpecifiedReleaseSelection(displayedOntologyReleaseContext) {
  return {
    selectionKind: "specified_releases",
    ontologyReleases: [
      {
        ontologyArtifactFamilyId:
          displayedOntologyReleaseContext.ontologyArtifactFamilyId,
        versionTag: displayedOntologyReleaseContext.versionTag,
      },
    ],
  };
}

async function resolveTypedEntityIdentifier({
  ontologyQuery,
  displayedOntologyReleaseContext,
  entityIdentifier,
  signal,
}) {
  return ontologyQuery.resolveOntologyEntity(
    {
      entityIdentifier,
      ontologyReleaseSelection: createSpecifiedReleaseSelection(
        displayedOntologyReleaseContext,
      ),
      preferredLanguageTags: PREFERRED_LANGUAGE_TAGS,
    },
    { signal },
  );
}

async function resolveClassifiedEntityReference({
  ontologyQuery,
  displayedOntologyReleaseContext,
  requestedEntityReference,
  signal,
}) {
  const absoluteIriResult = AbsoluteIriSchema.safeParse(
    requestedEntityReference,
  );
  const authoredUuidUrnResult = UuidUrnSchema.safeParse(
    requestedEntityReference,
  );

  if (absoluteIriResult.success) {
    const entityIriResult = await resolveTypedEntityIdentifier({
      ontologyQuery,
      displayedOntologyReleaseContext,
      entityIdentifier: {
        identifierKind: "entity_iri",
        identifierValue: requestedEntityReference,
      },
      signal,
    });

    if (
      entityIriResult.resolutionStatus !== "not_found" ||
      !authoredUuidUrnResult.success
    ) {
      return { queryResult: entityIriResult, matchedBy: "entity_iri" };
    }

    return {
      queryResult: await resolveTypedEntityIdentifier({
        ontologyQuery,
        displayedOntologyReleaseContext,
        entityIdentifier: {
          identifierKind: "uuid_urn",
          identifierValue: requestedEntityReference.toLowerCase(),
        },
        signal,
      }),
      matchedBy: "uuid",
    };
  }

  const bareUuidUrnResult = UuidUrnSchema.safeParse(
    `urn:uuid:${requestedEntityReference}`,
  );

  if (bareUuidUrnResult.success) {
    return {
      queryResult: await resolveTypedEntityIdentifier({
        ontologyQuery,
        displayedOntologyReleaseContext,
        entityIdentifier: {
          identifierKind: "uuid_urn",
          identifierValue: bareUuidUrnResult.data.toLowerCase(),
        },
        signal,
      }),
      matchedBy: "uuid",
    };
  }

  // Preferred labels retain the shared query module's exact maximum and
  // normalization contract; the outer WebMCP transport ceiling is broader.
  if (
    !NonBlankOntologyLookupTextSchema.safeParse(requestedEntityReference)
      .success
  ) {
    return { invalidReference: true };
  }

  return {
    queryResult: await resolveTypedEntityIdentifier({
      ontologyQuery,
      displayedOntologyReleaseContext,
      entityIdentifier: {
        identifierKind: "preferred_label",
        identifierValue: requestedEntityReference,
      },
      signal,
    }),
    matchedBy: "preferred_label",
  };
}

function findMatchingDisplayedRelease(
  resolvedOntologyReleases,
  displayedOntologyReleaseContext,
) {
  const resolvedOntologyRelease = resolvedOntologyReleases[0];

  if (
    resolvedOntologyReleases.length !== 1 ||
    resolvedOntologyRelease.ontologyArtifactFamilyId !==
      displayedOntologyReleaseContext.ontologyArtifactFamilyId ||
    resolvedOntologyRelease.versionTag !==
      displayedOntologyReleaseContext.versionTag ||
    resolvedOntologyRelease.ontologyIri !==
      displayedOntologyReleaseContext.ontologyIri ||
    resolvedOntologyRelease.versionIri !==
      displayedOntologyReleaseContext.versionIri
  ) {
    return null;
  }

  return resolvedOntologyRelease;
}

function compactSelectedLexicalAssertion(selectedAssertion) {
  if (selectedAssertion === null) {
    return null;
  }

  const { assertionPropertyIri, literalValue, selectionBasis } =
    selectedAssertion;
  return { assertionPropertyIri, literalValue, selectionBasis };
}

function createBoundedProjection(values, maximumReturnedCount) {
  const sortedValues = [...new Set(values)].sort(compareBinary);

  return {
    values: sortedValues.slice(0, maximumReturnedCount),
    totalCount: sortedValues.length,
    truncated: sortedValues.length > maximumReturnedCount,
  };
}

function projectOntologyEntityKinds(sourceArtifactDescriptions) {
  const entityKindSet = new Set();

  for (const sourceDescription of sourceArtifactDescriptions) {
    for (const entityKind of sourceDescription.entityKinds) {
      entityKindSet.add(entityKind);
    }
  }

  return [...entityKindSet].sort(
    (left, right) =>
      ontologyEntityKindOrder.get(left) - ontologyEntityKindOrder.get(right),
  );
}

function projectOntologyEntity(ontologyEntity) {
  const uuidUrnValues = [];
  const sourceIriValues = [];

  for (const sourceDescription of ontologyEntity.sourceArtifactDescriptions) {
    for (const { objectValue } of sourceDescription.identifierAssertions) {
      const identifierValue =
        objectValue.termKind === "named_node"
          ? objectValue.iri
          : objectValue.value.lexicalForm;

      if (UuidUrnSchema.safeParse(identifierValue).success) {
        uuidUrnValues.push(identifierValue.toLowerCase());
      }
    }

    sourceIriValues.push(...sourceDescription.entitySourceIris);
  }

  const uuidUrnProjection = createBoundedProjection(
    uuidUrnValues,
    MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS,
  );
  const sourceIriProjection = createBoundedProjection(
    sourceIriValues,
    MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS,
  );

  return {
    entityIri: ontologyEntity.entityIri,
    entityKinds: projectOntologyEntityKinds(
      ontologyEntity.sourceArtifactDescriptions,
    ),
    uuidUrns: uuidUrnProjection.values,
    uuidUrnCount: uuidUrnProjection.totalCount,
    uuidUrnsTruncated: uuidUrnProjection.truncated,
    selectedPreferredLabel: compactSelectedLexicalAssertion(
      ontologyEntity.selectedPreferredLabel,
    ),
    selectedLexicalDefinition: compactSelectedLexicalAssertion(
      ontologyEntity.selectedLexicalDefinition,
    ),
    sourceIris: sourceIriProjection.values,
    sourceIriCount: sourceIriProjection.totalCount,
    sourceIrisTruncated: sourceIriProjection.truncated,
  };
}

function createFailureResult(errorCode, message, retryable) {
  return {
    resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
    status: "failure",
    error: { errorCode, message, retryable },
  };
}

function createInvalidReferenceResult() {
  return {
    resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
    status: "invalid_input",
    errorCode: "invalid_entity_reference",
    message: ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE,
  };
}

function projectQueryResult({
  requestedEntityReference,
  matchedBy,
  queryResult,
  displayedOntologyReleaseContext,
}) {
  const resolvedOntologyRelease = findMatchingDisplayedRelease(
    queryResult.resolvedOntologyReleases,
    displayedOntologyReleaseContext,
  );

  if (resolvedOntologyRelease === null) {
    return createFailureResult(
      "DISPLAYED_RELEASE_IDENTITY_MISMATCH",
      DISPLAYED_RELEASE_IDENTITY_MISMATCH_MESSAGE,
      false,
    );
  }

  const commonResult = {
    resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
    requestedEntityReference,
    matchedBy,
    displayedOntologyRelease: {
      ...displayedOntologyReleaseContext,
      sourceArtifactUrl: resolvedOntologyRelease.sourceArtifactUrl,
      sourceArtifactSha256: resolvedOntologyRelease.sourceArtifactSha256,
    },
  };

  if (queryResult.resolutionStatus === "not_found") {
    return { ...commonResult, status: "not_found" };
  }

  if (queryResult.resolutionStatus === "ambiguous") {
    const candidates = queryResult.ontologyEntities
      .map((ontologyEntity) => ({
        entityIri: ontologyEntity.entityIri,
        entityKinds: projectOntologyEntityKinds(
          ontologyEntity.sourceArtifactDescriptions,
        ),
        preferredLabelLexicalForm:
          ontologyEntity.selectedPreferredLabel?.literalValue.lexicalForm ??
          null,
      }))
      .sort(({ entityIri: left }, { entityIri: right }) =>
        compareBinary(left, right),
      );

    return {
      ...commonResult,
      status: "ambiguous",
      candidateCount: candidates.length,
      candidatesTruncated:
        candidates.length > MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES,
      candidates: candidates.slice(
        0,
        MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES,
      ),
    };
  }

  if (
    queryResult.resolutionStatus !== "found" ||
    queryResult.ontologyEntities.length !== 1
  ) {
    throw new Error("The query returned an inconsistent resolution result.");
  }

  return {
    ...commonResult,
    status: "resolved",
    ontologyEntity: projectOntologyEntity(queryResult.ontologyEntities[0]),
  };
}

function parseAndFreezeResult(result) {
  return deepFreeze(OntologyEntityDefinitionResultSchema.parse(result));
}

/**
 * Create the WebMCP-specific semantic adapter over the shared query module.
 * The returned interface intentionally exposes one use-case operation only.
 */
export function createOntologyEntityDefinitionResolver({
  ontologyQuery,
  displayedOntologyReleaseContext,
  reportUnhandledError = () => {},
}) {
  return Object.freeze({
    async resolveOntologyEntityDefinition(entityReference, { signal } = {}) {
      signal?.throwIfAborted();

      if (typeof entityReference !== "string") {
        return parseAndFreezeResult(createInvalidReferenceResult());
      }

      const requestedEntityReference = entityReference.trim();

      try {
        const classifiedResolution = await resolveClassifiedEntityReference({
          ontologyQuery,
          displayedOntologyReleaseContext,
          requestedEntityReference,
          signal,
        });

        if (classifiedResolution.invalidReference) {
          return parseAndFreezeResult(createInvalidReferenceResult());
        }

        signal?.throwIfAborted();
        return parseAndFreezeResult(
          projectQueryResult({
            requestedEntityReference,
            matchedBy: classifiedResolution.matchedBy,
            queryResult: classifiedResolution.queryResult,
            displayedOntologyReleaseContext,
          }),
        );
      } catch (error) {
        // Query cancellation is transport lifecycle, not a serializable domain
        // result. Re-throw the signal's original reason when it caused failure.
        signal?.throwIfAborted();

        if (isOntologyQueryError(error)) {
          return parseAndFreezeResult(
            createFailureResult(
              error.errorCode,
              error.message,
              error.retryable,
            ),
          );
        }

        try {
          await reportUnhandledError(error);
        } catch {
          // Error reporting is observational and must never replace the stable
          // public result with a second private exception.
        }

        const internalFailure = new OntologyQueryError(
          "INTERNAL_QUERY_FAILURE",
        );
        return parseAndFreezeResult(
          createFailureResult(
            internalFailure.errorCode,
            internalFailure.message,
            internalFailure.retryable,
          ),
        );
      }
    },
  });
}

/** Production composition root shared by lazy WebMCP executions. */
export function createBrowserOntologyEntityDefinitionResolver({
  displayedOntologyReleaseContext,
  ontologyQueryRootIri,
  expectedOrigin,
  fetchImplementation,
  reportUnhandledError,
}) {
  const ontologyReleaseIndexRepository =
    createFetchOntologyReleaseIndexRepository({
      ontologyQueryRootIri,
      expectedOrigin,
      fetchImplementation,
    });
  const ontologyQuery = createOntologyQueryModule({
    ontologyReleaseIndexRepository,
  });

  return createOntologyEntityDefinitionResolver({
    ontologyQuery,
    displayedOntologyReleaseContext,
    reportUnhandledError,
  });
}
