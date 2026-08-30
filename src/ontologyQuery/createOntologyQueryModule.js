import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { resolveOntologyProjectionProperties } from "../ontologyProjectionProperties.js";
import {
  DEFAULT_ONTOLOGY_ARTIFACT_FAMILY_IDS,
  ONTOLOGY_ENTITY_MATCH_BASIS_VALUES,
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
  UuidUrnSchema,
  deepFreeze,
  parseResolveOntologyEntityInput,
  parseSearchOntologyEntitiesInput,
} from "./ontologyQuerySchemas.js";

const DEFAULT_MAXIMUM_CACHE_BYTE_SIZE = 64 * 1024 * 1024;
const NON_LITERAL_LANGUAGE_RANK = 1_000_000;
const FALLBACK_LANGUAGE_RANK = 100_000;
const MATCH_BASIS_ORDER = new Map(
  ONTOLOGY_ENTITY_MATCH_BASIS_VALUES.map((basis, index) => [basis, index]),
);

const ONTOLOGY_QUERY_ERROR_DEFINITIONS = Object.freeze({
  UNKNOWN_ONTOLOGY_ARTIFACT_FAMILY: {
    retryable: false,
    defaultMessage: "The requested ontology artifact family is not cataloged.",
  },
  UNKNOWN_ONTOLOGY_RELEASE: {
    retryable: false,
    defaultMessage: "The requested ontology release is not cataloged.",
  },
  QUERY_INDEX_CATALOG_UNAVAILABLE: {
    retryable: true,
    defaultMessage: "The ontology query-index catalog is unavailable.",
  },
  QUERY_INDEX_SCHEMA_UNSUPPORTED: {
    retryable: false,
    defaultMessage: "The ontology query-index format is unsupported.",
  },
  QUERY_INDEX_DIGEST_MISMATCH: {
    retryable: false,
    defaultMessage: "Ontology query-index integrity verification failed.",
  },
  QUERY_CANCELLED: {
    retryable: true,
    defaultMessage: "The ontology query was cancelled.",
  },
  INTERNAL_QUERY_FAILURE: {
    retryable: false,
    defaultMessage: "The ontology query failed unexpectedly.",
  },
});

/** Stable, safe failure raised by the deep query module. */
export class OntologyQueryError extends Error {
  constructor(errorCode, options = {}) {
    const definition = ONTOLOGY_QUERY_ERROR_DEFINITIONS[errorCode];

    if (!definition) {
      throw new TypeError(`Unknown ontology query error code: ${errorCode}`);
    }

    super(options.message ?? definition.defaultMessage, {
      cause: options.cause,
    });
    this.name = "OntologyQueryError";
    this.errorCode = errorCode;
    this.retryable = options.retryable ?? definition.retryable;
  }
}

/** Whether an exception is already a safe query-domain failure. */
export function isOntologyQueryError(error) {
  return error instanceof OntologyQueryError;
}

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function throwIfCancelled(signal) {
  if (signal?.aborted) {
    throw new OntologyQueryError("QUERY_CANCELLED", {
      cause: signal.reason,
    });
  }
}

function isCancellation(error, signal) {
  return (
    signal?.aborted ||
    error?.name === "AbortError" ||
    error?.code === "ABORT_ERR"
  );
}

function normalizeLexicalSearchValue(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, " ")
    .trim();
}

function tokenizeNormalizedValue(normalizedValue) {
  return normalizedValue === "" ? [] : normalizedValue.split(" ");
}

function extractIriLocalName(iri) {
  const lastHash = iri.lastIndexOf("#");
  const lastSlash = iri.lastIndexOf("/");
  const lastSeparator = Math.max(lastHash, lastSlash);
  return lastSeparator === -1 ? iri : iri.slice(lastSeparator + 1);
}

function canonicalizeUuidUrn(value) {
  const parsed = UuidUrnSchema.safeParse(value);
  return parsed.success ? value.toLowerCase() : null;
}

function parseJsonBytes(bytes, unsupportedMessage) {
  let parsed;

  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: unsupportedMessage,
      cause: error,
    });
  }

  return parsed;
}

function parseCatalogBytes(bytes) {
  const parsed = parseJsonBytes(
    bytes,
    "The ontology query-index catalog is not valid JSON.",
  );

  if (
    parsed?.queryArtifactKind !== "universal_ontology_query_catalog" ||
    parsed?.queryArtifactFormatVersion !== 1
  ) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: "The ontology query-index catalog format is unsupported.",
    });
  }

  try {
    return deepFreeze(OntologyQueryCatalogSchema.parse(parsed));
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: "The ontology query-index catalog schema is unsupported.",
      cause: error,
    });
  }
}

function parseReleaseIndexBytes(bytes) {
  const parsed = parseJsonBytes(
    bytes,
    "The ontology release query index is not valid JSON.",
  );

  if (
    parsed?.queryArtifactKind !== "universal_ontology_release_query_index" ||
    parsed?.queryArtifactFormatVersion !== 1
  ) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: "The ontology release query-index format is unsupported.",
    });
  }

  try {
    return deepFreeze(OntologyReleaseQueryIndexSchema.parse(parsed));
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: "The ontology release query-index schema is unsupported.",
      cause: error,
    });
  }
}

function chooseCatalogReleases(catalog, ontologyReleaseSelection) {
  const releasesByFamily = new Map();

  for (const release of catalog.releases) {
    const familyReleases =
      releasesByFamily.get(release.ontologyArtifactFamilyId) ?? [];
    familyReleases.push(release);
    releasesByFamily.set(release.ontologyArtifactFamilyId, familyReleases);
  }

  const selection = ontologyReleaseSelection ?? {
    selectionKind: "latest_stable_releases",
    ontologyArtifactFamilyIds: DEFAULT_ONTOLOGY_ARTIFACT_FAMILY_IDS,
  };
  const selectedReleases = [];
  const selectedReleaseKeys = new Set();

  function appendSelectedRelease(release) {
    const key = `${release.ontologyArtifactFamilyId}\u0000${release.versionTag}\u0000${release.queryIndexSha256}`;

    // Repeated caller references are idempotent. Retaining the first
    // occurrence preserves caller order without loading or reporting an
    // immutable release more than once.
    if (!selectedReleaseKeys.has(key)) {
      selectedReleaseKeys.add(key);
      selectedReleases.push(release);
    }
  }

  if (selection.selectionKind === "latest_stable_releases") {
    const requestedFamilyIds =
      selection.ontologyArtifactFamilyIds ??
      DEFAULT_ONTOLOGY_ARTIFACT_FAMILY_IDS;

    for (const familyId of requestedFamilyIds) {
      const familyReleases = releasesByFamily.get(familyId);

      if (!familyReleases) {
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_ARTIFACT_FAMILY", {
          message: `Ontology artifact family "${familyId}" is not cataloged.`,
        });
      }

      const stableRelease = familyReleases.find(
        ({ latestStableRelease }) => latestStableRelease,
      );

      if (!stableRelease) {
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
          message:
            `Ontology artifact family "${familyId}" has no cataloged ` +
            "latest stable release.",
        });
      }

      appendSelectedRelease(stableRelease);
    }
  } else {
    for (const requestedRelease of selection.ontologyReleases) {
      const familyReleases = releasesByFamily.get(
        requestedRelease.ontologyArtifactFamilyId,
      );

      if (!familyReleases) {
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_ARTIFACT_FAMILY", {
          message:
            `Ontology artifact family "${requestedRelease.ontologyArtifactFamilyId}" ` +
            "is not cataloged.",
        });
      }

      const selectedRelease = familyReleases.find(
        ({ versionTag }) => versionTag === requestedRelease.versionTag,
      );

      if (!selectedRelease) {
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
          message:
            `Ontology release "${requestedRelease.ontologyArtifactFamilyId}/` +
            `${requestedRelease.versionTag}" is not cataloged.`,
        });
      }

      appendSelectedRelease(selectedRelease);
    }
  }

  return selectedReleases;
}

function verifyEmbeddedReleaseIdentity(catalogRelease, queryIndex) {
  const embeddedRelease = queryIndex.resolvedOntologyRelease;

  if (
    embeddedRelease.ontologyArtifactFamilyId !==
      catalogRelease.ontologyArtifactFamilyId ||
    embeddedRelease.versionTag !== catalogRelease.versionTag ||
    embeddedRelease.sourceArtifactUrl !== catalogRelease.sourceArtifactUrl ||
    embeddedRelease.sourceArtifactSha256 !== catalogRelease.sourceArtifactSha256
  ) {
    throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH", {
      message:
        "Ontology release query-index identity does not match its catalog entry.",
    });
  }
}

function buildRuntimeReleaseIndex(queryIndex) {
  const descriptionsByEntityIri = new Map();
  const searchCandidates = [];
  const uuidEntityIris = new Map();

  function addUuidEntityIri(authoredValue, entityIri) {
    const canonicalUuid = canonicalizeUuidUrn(authoredValue);

    if (!canonicalUuid) {
      return;
    }

    const entityIris = uuidEntityIris.get(canonicalUuid) ?? new Set();
    entityIris.add(entityIri);
    uuidEntityIris.set(canonicalUuid, entityIris);
  }

  function addLiteralCandidate({
    candidateKind,
    entityIri,
    assertionPropertyIri,
    literalValue,
  }) {
    const normalizedValue = normalizeLexicalSearchValue(
      literalValue.lexicalForm,
    );
    searchCandidates.push({
      candidateKind,
      entityIri,
      assertionPropertyIri,
      literalValue,
      normalizedValue,
      normalizedTokens: tokenizeNormalizedValue(normalizedValue),
    });
  }

  for (const description of queryIndex.ontologyEntityDescriptions) {
    descriptionsByEntityIri.set(description.entityIri, description);

    for (const assertion of description.preferredLabelAssertions) {
      addLiteralCandidate({
        candidateKind: "preferred_label",
        entityIri: description.entityIri,
        ...assertion,
      });
    }

    for (const assertion of description.alternativeLabelAssertions) {
      addLiteralCandidate({
        candidateKind: "alternative_label",
        entityIri: description.entityIri,
        ...assertion,
      });
    }

    for (const assertion of description.lexicalDefinitionAssertions) {
      addLiteralCandidate({
        candidateKind: "lexical_definition",
        entityIri: description.entityIri,
        ...assertion,
      });
    }

    for (const assertion of description.identifierAssertions) {
      if (assertion.objectValue.termKind === "literal") {
        addLiteralCandidate({
          candidateKind: "identifier_literal",
          entityIri: description.entityIri,
          assertionPropertyIri: assertion.assertionPropertyIri,
          literalValue: assertion.objectValue.value,
        });
        addUuidEntityIri(
          assertion.objectValue.value.lexicalForm,
          description.entityIri,
        );
      } else {
        const iri = assertion.objectValue.iri;
        searchCandidates.push({
          candidateKind: "identifier_iri",
          entityIri: description.entityIri,
          assertionPropertyIri: assertion.assertionPropertyIri,
          iri,
          normalizedValue: normalizeLexicalSearchValue(iri),
          normalizedTokens: [],
        });
        addUuidEntityIri(iri, description.entityIri);
      }
    }

    const iriLocalName = extractIriLocalName(description.entityIri);
    searchCandidates.push({
      candidateKind: "iri_local_name",
      entityIri: description.entityIri,
      assertionPropertyIri: null,
      iri: description.entityIri,
      normalizedValue: normalizeLexicalSearchValue(iriLocalName),
      normalizedTokens: [],
    });
  }

  return Object.freeze({
    queryIndex,
    descriptionsByEntityIri,
    searchCandidates: Object.freeze(searchCandidates),
    uuidEntityIris,
  });
}

function languageSelection(literalValue, preferredLanguageTags) {
  const authoredLanguageTag = literalValue.languageTag?.toLowerCase() ?? null;

  for (
    let preferenceIndex = 0;
    preferenceIndex < preferredLanguageTags.length;
    preferenceIndex += 1
  ) {
    let lookupTag = preferredLanguageTags[preferenceIndex].toLowerCase();
    let lookupDepth = 0;

    while (lookupTag) {
      if (authoredLanguageTag === lookupTag) {
        return {
          rank: preferenceIndex * 100 + lookupDepth,
          selectionBasis:
            lookupDepth === 0
              ? "preferred_language_exact"
              : "preferred_language_lookup",
        };
      }

      const separatorIndex = lookupTag.lastIndexOf("-");
      lookupTag =
        separatorIndex === -1 ? "" : lookupTag.slice(0, separatorIndex);
      lookupDepth += 1;
    }
  }

  if (authoredLanguageTag === null) {
    return {
      rank: preferredLanguageTags.length * 100 + 1,
      selectionBasis: "untagged",
    };
  }

  return {
    rank: FALLBACK_LANGUAGE_RANK,
    selectionBasis: "deterministic_fallback",
  };
}

function evaluateSearchCandidate(candidate, normalizedQuery, queryTokens) {
  const exact = candidate.normalizedValue === normalizedQuery;
  const prefix =
    normalizedQuery !== "" &&
    candidate.normalizedValue.startsWith(normalizedQuery);
  const substring =
    normalizedQuery !== "" &&
    candidate.normalizedValue.includes(normalizedQuery);

  switch (candidate.candidateKind) {
    case "preferred_label":
      return exact
        ? "preferred_label_exact"
        : prefix
          ? "preferred_label_prefix"
          : substring
            ? "preferred_label_substring"
            : null;
    case "alternative_label":
      return exact
        ? "alternative_label_exact"
        : prefix
          ? "alternative_label_prefix"
          : substring
            ? "alternative_label_substring"
            : null;
    case "identifier_literal":
    case "identifier_iri":
      return exact ? "identifier_exact" : null;
    case "iri_local_name":
      return exact ? "iri_local_name_exact" : null;
    case "lexical_definition": {
      if (exact) {
        return "lexical_definition_exact";
      }

      const candidateTokenSet = new Set(candidate.normalizedTokens);

      if (
        queryTokens.length > 0 &&
        queryTokens.every((token) => candidateTokenSet.has(token))
      ) {
        return "lexical_definition_token_coverage";
      }

      return substring ? "lexical_definition_substring" : null;
    }
    default:
      throw new TypeError(
        `Unknown search candidate kind: ${candidate.candidateKind}`,
      );
  }
}

function toMatchedOntologyValue(candidate) {
  if (candidate.literalValue) {
    return {
      matchedValueKind: "rdf_literal",
      assertionPropertyIri: candidate.assertionPropertyIri,
      literalValue: candidate.literalValue,
    };
  }

  return {
    matchedValueKind: "named_node_iri",
    assertionPropertyIri: candidate.assertionPropertyIri,
    iri: candidate.iri,
  };
}

function compareEvaluatedCandidates(left, right) {
  return (
    MATCH_BASIS_ORDER.get(left.matchBasis) -
      MATCH_BASIS_ORDER.get(right.matchBasis) ||
    left.languageRank - right.languageRank ||
    left.candidate.normalizedValue.length -
      right.candidate.normalizedValue.length ||
    compareBinary(
      left.candidate.normalizedValue,
      right.candidate.normalizedValue,
    ) ||
    compareBinary(left.candidate.entityIri, right.candidate.entityIri) ||
    compareBinary(
      left.candidate.assertionPropertyIri ?? "",
      right.candidate.assertionPropertyIri ?? "",
    )
  );
}

function compareSelectedLexicalCandidates(left, right) {
  return (
    left.languageSelection.rank - right.languageSelection.rank ||
    left.historicalPropertyRank - right.historicalPropertyRank ||
    compareBinary(
      left.assertion.literalValue.languageTag ?? "",
      right.assertion.literalValue.languageTag ?? "",
    ) ||
    compareBinary(
      left.assertion.literalValue.lexicalForm,
      right.assertion.literalValue.lexicalForm,
    ) ||
    compareBinary(
      left.assertion.assertionPropertyIri,
      right.assertion.assertionPropertyIri,
    ) ||
    compareBinary(
      left.description.resolvedOntologyRelease.ontologyArtifactFamilyId,
      right.description.resolvedOntologyRelease.ontologyArtifactFamilyId,
    ) ||
    compareBinary(
      left.description.resolvedOntologyRelease.versionTag,
      right.description.resolvedOntologyRelease.versionTag,
    )
  );
}

function selectLexicalAssertion({
  descriptions,
  assertionField,
  projectionField,
  preferredLanguageTags,
}) {
  const candidates = [];

  for (const description of descriptions) {
    const release = description.resolvedOntologyRelease;
    const currentProperties = resolveOntologyProjectionProperties(
      `${release.ontologyArtifactFamilyId}/${release.versionTag}`,
    );

    for (const assertion of description[assertionField]) {
      candidates.push({
        description,
        assertion,
        languageSelection: languageSelection(
          assertion.literalValue,
          preferredLanguageTags,
        ),
        historicalPropertyRank:
          assertion.assertionPropertyIri === currentProperties[projectionField]
            ? 0
            : 1,
      });
    }
  }

  const selected = candidates.sort(compareSelectedLexicalCandidates)[0];

  if (!selected) {
    return null;
  }

  return {
    resolvedOntologyRelease: selected.description.resolvedOntologyRelease,
    assertionPropertyIri: selected.assertion.assertionPropertyIri,
    literalValue: selected.assertion.literalValue,
    selectionBasis: selected.languageSelection.selectionBasis,
  };
}

function stripIndexedEntityIri(description) {
  const sourceArtifactDescription = { ...description };
  delete sourceArtifactDescription.entityIri;
  return sourceArtifactDescription;
}

function aggregateOntologyEntity({
  entityIri,
  descriptions,
  preferredLanguageTags,
}) {
  return {
    entityIri,
    selectedPreferredLabel: selectLexicalAssertion({
      descriptions,
      assertionField: "preferredLabelAssertions",
      projectionField: "preferredLabel",
      preferredLanguageTags,
    }),
    selectedLexicalDefinition: selectLexicalAssertion({
      descriptions,
      assertionField: "lexicalDefinitionAssertions",
      projectionField: "definition",
      preferredLanguageTags,
    }),
    sourceArtifactDescriptions: descriptions.map(stripIndexedEntityIri),
  };
}

function collectDescriptionsByEntityIri(runtimeIndexes) {
  const descriptionsByEntityIri = new Map();

  for (const runtimeIndex of runtimeIndexes) {
    for (const [
      entityIri,
      description,
    ] of runtimeIndex.descriptionsByEntityIri) {
      const descriptions = descriptionsByEntityIri.get(entityIri) ?? [];
      descriptions.push(description);
      descriptionsByEntityIri.set(entityIri, descriptions);
    }
  }

  return descriptionsByEntityIri;
}

/**
 * Create the two-operation ontology query module over a byte repository.
 *
 * Raw bytes are digest-verified before JSON parsing, then completely schema
 * validated and cross-checked against the catalog. Parsed immutable indexes
 * share concurrent loads and live in an LRU cache bounded by their validated
 * byte lengths. No repository-specific object or exception escapes this seam.
 */
export function createOntologyQueryModule({
  ontologyReleaseIndexRepository,
  maximumCacheByteSize = DEFAULT_MAXIMUM_CACHE_BYTE_SIZE,
}) {
  if (
    !ontologyReleaseIndexRepository ||
    typeof ontologyReleaseIndexRepository.readOntologyQueryCatalog !==
      "function" ||
    typeof ontologyReleaseIndexRepository.readOntologyReleaseQueryIndex !==
      "function"
  ) {
    throw new TypeError(
      "ontologyReleaseIndexRepository must implement both byte-read methods.",
    );
  }

  if (!Number.isSafeInteger(maximumCacheByteSize) || maximumCacheByteSize < 1) {
    throw new TypeError(
      "maximumCacheByteSize must be a positive safe integer.",
    );
  }

  let catalogValue;
  let catalogLoadEntry;
  let cacheByteSize = 0;
  let accessSequence = 0;
  const cacheEntries = new Map();

  function loadCatalog(signal) {
    throwIfCancelled(signal);

    if (catalogValue) {
      return Promise.resolve(catalogValue);
    }

    if (
      catalogLoadEntry?.abortController.signal.aborted &&
      catalogLoadEntry.waiterCount === 0
    ) {
      // A fully abandoned load is not reusable by a later caller. Its promise
      // will still settle independently, but it no longer occupies the shared
      // catalog slot.
      catalogLoadEntry = undefined;
    }

    if (!catalogLoadEntry) {
      const entry = {
        loading: true,
        abortController: new AbortController(),
        waiterCount: 0,
        noWaitersAbortMessage: "All ontology catalog readers cancelled.",
        promise: undefined,
      };
      catalogLoadEntry = entry;
      entry.promise = (async () => {
        const internalSignal = entry.abortController.signal;

        try {
          const bytes =
            await ontologyReleaseIndexRepository.readOntologyQueryCatalog({
              signal: internalSignal,
            });
          throwIfCancelled(internalSignal);
          catalogValue = parseCatalogBytes(bytes);
          entry.loading = false;
          return catalogValue;
        } catch (error) {
          if (catalogLoadEntry === entry) {
            catalogLoadEntry = undefined;
          }

          if (isOntologyQueryError(error)) {
            throw error;
          }

          if (isCancellation(error, internalSignal)) {
            throw new OntologyQueryError("QUERY_CANCELLED", { cause: error });
          }

          throw new OntologyQueryError("QUERY_INDEX_CATALOG_UNAVAILABLE", {
            cause: error,
          });
        }
      })();
    }

    return waitForSharedLoad(catalogLoadEntry, signal);
  }

  function evictIndexesToBudget(protectedKey) {
    while (cacheByteSize > maximumCacheByteSize) {
      const evictionCandidates = [...cacheEntries.entries()]
        .filter(
          ([key, entry]) =>
            key !== protectedKey && !entry.loading && entry.byteSize > 0,
        )
        .sort(
          ([, left], [, right]) =>
            left.lastAccessSequence - right.lastAccessSequence,
        );
      const candidate = evictionCandidates[0];

      if (!candidate) {
        const protectedEntry = cacheEntries.get(protectedKey);

        if (protectedEntry?.byteSize > maximumCacheByteSize) {
          cacheEntries.delete(protectedKey);
          cacheByteSize -= protectedEntry.byteSize;
        }

        break;
      }

      const [key, entry] = candidate;
      cacheEntries.delete(key);
      cacheByteSize -= entry.byteSize;
    }
  }

  function waitForSharedLoad(entry, signal) {
    throwIfCancelled(signal);
    entry.waiterCount += 1;

    return new Promise((resolve, reject) => {
      let settled = false;

      function releaseWaiter() {
        if (settled) {
          return false;
        }

        settled = true;
        signal?.removeEventListener("abort", handleAbort);
        entry.waiterCount -= 1;

        // A shared read must survive cancellation by one of several callers.
        // Abort the repository operation only when no caller is still waiting;
        // each caller nevertheless receives its own cancellation promptly.
        if (entry.waiterCount === 0 && entry.loading) {
          entry.abortController.abort(
            new DOMException(entry.noWaitersAbortMessage, "AbortError"),
          );
        }

        return true;
      }

      function handleAbort() {
        if (releaseWaiter()) {
          reject(
            new OntologyQueryError("QUERY_CANCELLED", {
              cause: signal.reason,
            }),
          );
        }
      }

      signal?.addEventListener("abort", handleAbort, { once: true });
      entry.promise.then(
        (value) => {
          if (releaseWaiter()) {
            resolve(value);
          }
        },
        (error) => {
          if (releaseWaiter()) {
            reject(error);
          }
        },
      );
    });
  }

  async function loadRuntimeIndex(catalogRelease, signal) {
    throwIfCancelled(signal);
    const cacheKey =
      `${catalogRelease.ontologyArtifactFamilyId}\u0000` +
      `${catalogRelease.versionTag}\u0000${catalogRelease.queryIndexSha256}`;
    let cachedEntry = cacheEntries.get(cacheKey);

    if (
      cachedEntry?.abortController.signal.aborted &&
      cachedEntry.waiterCount === 0
    ) {
      cacheEntries.delete(cacheKey);
      cachedEntry = undefined;
    }

    if (cachedEntry) {
      cachedEntry.lastAccessSequence = accessSequence += 1;
      return waitForSharedLoad(cachedEntry, signal);
    }

    const entry = {
      loading: true,
      byteSize: 0,
      lastAccessSequence: (accessSequence += 1),
      abortController: new AbortController(),
      waiterCount: 0,
      noWaitersAbortMessage: "All ontology index readers cancelled.",
      promise: undefined,
    };
    entry.promise = (async () => {
      const internalSignal = entry.abortController.signal;

      try {
        const bytes =
          await ontologyReleaseIndexRepository.readOntologyReleaseQueryIndex({
            relativePath: catalogRelease.queryIndexRelativePath,
            signal: internalSignal,
          });
        throwIfCancelled(internalSignal);

        if (sha256(bytes) !== catalogRelease.queryIndexSha256) {
          throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
        }

        const queryIndex = parseReleaseIndexBytes(bytes);
        verifyEmbeddedReleaseIdentity(catalogRelease, queryIndex);
        const runtimeIndex = buildRuntimeReleaseIndex(queryIndex);
        entry.byteSize = bytes.byteLength;
        entry.loading = false;
        cacheByteSize += entry.byteSize;
        evictIndexesToBudget(cacheKey);
        return runtimeIndex;
      } catch (error) {
        if (cacheEntries.get(cacheKey) === entry) {
          cacheEntries.delete(cacheKey);
        }

        if (isOntologyQueryError(error)) {
          throw error;
        }

        if (isCancellation(error, internalSignal)) {
          throw new OntologyQueryError("QUERY_CANCELLED", { cause: error });
        }

        throw new OntologyQueryError("INTERNAL_QUERY_FAILURE", {
          cause: error,
        });
      }
    })();
    cacheEntries.set(cacheKey, entry);
    return waitForSharedLoad(entry, signal);
  }

  async function loadSelection(ontologyReleaseSelection, signal) {
    // Once loaded, the immutable catalog can be consumed synchronously. This is
    // important for cancellation isolation: a second caller can register as a
    // waiter on an already-running release read before its invocation returns.
    const catalog = catalogValue ?? (await loadCatalog(signal));
    throwIfCancelled(signal);
    const catalogReleases = chooseCatalogReleases(
      catalog,
      ontologyReleaseSelection,
    );
    const runtimeIndexes = await Promise.all(
      catalogReleases.map((release) => loadRuntimeIndex(release, signal)),
    );
    throwIfCancelled(signal);
    return { catalogReleases, runtimeIndexes };
  }

  return Object.freeze({
    /** Search authored lexical and identifier values with deterministic ranks. */
    async searchOntologyEntities(input, { signal } = {}) {
      const parsedInput = parseSearchOntologyEntitiesInput(input);
      const queryText = parsedInput.queryText.trim();
      const normalizedQuery = normalizeLexicalSearchValue(queryText);
      const queryTokens = tokenizeNormalizedValue(normalizedQuery);
      const { runtimeIndexes } = await loadSelection(
        parsedInput.ontologyReleaseSelection,
        signal,
      );
      const descriptionsByEntityIri =
        collectDescriptionsByEntityIri(runtimeIndexes);
      const bestCandidateByEntityIri = new Map();
      let candidateCount = 0;

      for (const runtimeIndex of runtimeIndexes) {
        for (const candidate of runtimeIndex.searchCandidates) {
          candidateCount += 1;

          if (candidateCount % 128 === 0) {
            throwIfCancelled(signal);
          }

          const descriptions = descriptionsByEntityIri.get(candidate.entityIri);

          if (
            parsedInput.entityKinds &&
            !descriptions.some((description) =>
              description.entityKinds.some((kind) =>
                parsedInput.entityKinds.includes(kind),
              ),
            )
          ) {
            continue;
          }

          const matchBasis = evaluateSearchCandidate(
            candidate,
            normalizedQuery,
            queryTokens,
          );

          if (!matchBasis) {
            continue;
          }

          const evaluatedCandidate = {
            candidate,
            matchBasis,
            languageRank: candidate.literalValue
              ? languageSelection(
                  candidate.literalValue,
                  parsedInput.preferredLanguageTags,
                ).rank
              : NON_LITERAL_LANGUAGE_RANK,
          };
          const preceding = bestCandidateByEntityIri.get(candidate.entityIri);

          if (
            !preceding ||
            compareEvaluatedCandidates(evaluatedCandidate, preceding) < 0
          ) {
            bestCandidateByEntityIri.set(
              candidate.entityIri,
              evaluatedCandidate,
            );
          }
        }
      }

      throwIfCancelled(signal);
      const rankedCandidates = [...bestCandidateByEntityIri.values()].sort(
        compareEvaluatedCandidates,
      );
      const returnedCandidates = rankedCandidates.slice(
        0,
        parsedInput.maximumResultCount,
      );
      const result = OntologyEntitySearchSuccessSchema.parse({
        outcome: "success",
        resultKind: "ontology_entity_search",
        queryText,
        preferredLanguageTags: parsedInput.preferredLanguageTags,
        resolvedOntologyReleases: runtimeIndexes.map(
          ({ queryIndex }) => queryIndex.resolvedOntologyRelease,
        ),
        totalMatchedEntityCount: rankedCandidates.length,
        returnedEntityCount: returnedCandidates.length,
        resultSetTruncated: returnedCandidates.length < rankedCandidates.length,
        matches: returnedCandidates.map((evaluatedCandidate, index) => ({
          matchRank: index + 1,
          matchBasis: evaluatedCandidate.matchBasis,
          matchedOntologyValue: toMatchedOntologyValue(
            evaluatedCandidate.candidate,
          ),
          ontologyEntity: aggregateOntologyEntity({
            entityIri: evaluatedCandidate.candidate.entityIri,
            descriptions: descriptionsByEntityIri.get(
              evaluatedCandidate.candidate.entityIri,
            ),
            preferredLanguageTags: parsedInput.preferredLanguageTags,
          }),
        })),
      });

      return deepFreeze(result);
    },

    /** Resolve exactly one typed IRI, UUID URN, or preferred-label value. */
    async resolveOntologyEntity(input, { signal } = {}) {
      const parsedInput = parseResolveOntologyEntityInput(input);
      const requestedEntityIdentifier =
        parsedInput.entityIdentifier.identifierKind === "preferred_label"
          ? {
              ...parsedInput.entityIdentifier,
              identifierValue:
                parsedInput.entityIdentifier.identifierValue.trim(),
            }
          : parsedInput.entityIdentifier;
      const { runtimeIndexes } = await loadSelection(
        parsedInput.ontologyReleaseSelection,
        signal,
      );
      const descriptionsByEntityIri =
        collectDescriptionsByEntityIri(runtimeIndexes);
      const resolvedEntityIris = new Set();

      switch (requestedEntityIdentifier.identifierKind) {
        case "entity_iri":
          if (
            descriptionsByEntityIri.has(
              requestedEntityIdentifier.identifierValue,
            )
          ) {
            resolvedEntityIris.add(requestedEntityIdentifier.identifierValue);
          }
          break;
        case "uuid_urn": {
          const canonicalUuid = canonicalizeUuidUrn(
            requestedEntityIdentifier.identifierValue,
          );

          for (const runtimeIndex of runtimeIndexes) {
            for (const entityIri of runtimeIndex.uuidEntityIris.get(
              canonicalUuid,
            ) ?? []) {
              resolvedEntityIris.add(entityIri);
            }
          }
          break;
        }
        case "preferred_label": {
          const normalizedLabel = normalizeLexicalSearchValue(
            requestedEntityIdentifier.identifierValue,
          );
          let descriptionCount = 0;

          for (const [entityIri, descriptions] of descriptionsByEntityIri) {
            descriptionCount += 1;

            if (descriptionCount % 128 === 0) {
              throwIfCancelled(signal);
            }

            if (
              descriptions.some((description) =>
                description.preferredLabelAssertions.some(
                  ({ literalValue }) =>
                    normalizeLexicalSearchValue(literalValue.lexicalForm) ===
                    normalizedLabel,
                ),
              )
            ) {
              resolvedEntityIris.add(entityIri);
            }
          }
          break;
        }
        default:
          throw new TypeError(
            `Unknown identifier kind: ${requestedEntityIdentifier.identifierKind}`,
          );
      }

      throwIfCancelled(signal);
      const sortedEntityIris = [...resolvedEntityIris].sort(compareBinary);
      const resolutionStatus =
        sortedEntityIris.length === 0
          ? "not_found"
          : sortedEntityIris.length === 1
            ? "found"
            : "ambiguous";
      const result = OntologyEntityResolutionSuccessSchema.parse({
        outcome: "success",
        resultKind: "ontology_entity_resolution",
        resolutionStatus,
        requestedEntityIdentifier,
        preferredLanguageTags: parsedInput.preferredLanguageTags,
        resolvedOntologyReleases: runtimeIndexes.map(
          ({ queryIndex }) => queryIndex.resolvedOntologyRelease,
        ),
        ontologyEntities: sortedEntityIris.map((entityIri) =>
          aggregateOntologyEntity({
            entityIri,
            descriptions: descriptionsByEntityIri.get(entityIri),
            preferredLanguageTags: parsedInput.preferredLanguageTags,
          }),
        ),
      });

      return deepFreeze(result);
    },
  });
}
