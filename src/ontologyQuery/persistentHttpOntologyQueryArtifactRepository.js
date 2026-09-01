import { randomUUID } from "node:crypto";

import { createWaiterAwareSharedOperation } from "./createWaiterAwareSharedOperation.js";
import {
  calculateSha256,
  verifyCanonicalArtifactReference,
} from "./ontologyQueryArtifactCanonicalBytes.js";
import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
} from "./ontologyQueryArtifactLimits.js";
import {
  parseOntologyQueryCatalogBytes,
  parseOntologyQueryChannelManifestBytes,
  parseOntologyReleaseQueryIndexBytes,
} from "./ontologyQueryArtifactParsing.js";
import {
  parseOntologyQueryChannelManifestRelativePath,
  parseOntologyReleaseQueryIndexRelativePath,
} from "./ontologyQueryArtifactRelativePath.js";
import { OntologyQueryArtifactChannelNameSchema } from "./ontologyQueryChannelManifestSchemas.js";
import {
  isOntologyQueryError,
  OntologyQueryError,
} from "./ontologyQueryErrors.js";
import { HttpOntologyQueryArtifactReadError } from "./httpOntologyQueryArtifactReader.js";
import { OntologyQueryArtifactCacheInitializationError } from "./ontologyQueryArtifactCacheInitializationErrors.js";

const SHA_256_HEXADECIMAL_PATTERN = /^[0-9a-f]{64}$/u;

function requirePort(value, methodNames, portName) {
  if (
    !value ||
    methodNames.some((methodName) => typeof value[methodName] !== "function")
  ) {
    throw new TypeError(
      `${portName} must implement ${methodNames.join(", ")}.`,
    );
  }

  return value;
}

function requireSha256(value, fieldName) {
  if (typeof value !== "string" || !SHA_256_HEXADECIMAL_PATTERN.test(value)) {
    throw new TypeError(
      `${fieldName} must be a lowercase SHA-256 hexadecimal digest.`,
    );
  }

  return value;
}

function createCatalogSchemaError(message, cause) {
  return new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
    message,
    cause,
  });
}

function validateCatalogReleaseReferences(catalog) {
  const releaseIdentities = new Set();
  const queryIndexRelativePaths = new Set();

  for (const release of catalog.releases) {
    let parsedRelativePath;

    try {
      parsedRelativePath = parseOntologyReleaseQueryIndexRelativePath(
        release.queryIndexRelativePath,
      );
    } catch (error) {
      throw createCatalogSchemaError(
        "The ontology query catalog contains an invalid release-index path.",
        error,
      );
    }

    if (
      parsedRelativePath.ontologyArtifactFamilyId !==
        release.ontologyArtifactFamilyId ||
      parsedRelativePath.versionTag !== release.versionTag ||
      parsedRelativePath.sha256 !== release.queryIndexSha256
    ) {
      throw createCatalogSchemaError(
        "The ontology query catalog release-index path disagrees with its release identity.",
      );
    }

    const releaseIdentity = `${release.ontologyArtifactFamilyId}\u0000${release.versionTag}`;

    if (
      releaseIdentities.has(releaseIdentity) ||
      queryIndexRelativePaths.has(release.queryIndexRelativePath)
    ) {
      throw createCatalogSchemaError(
        "The ontology query catalog contains duplicate release identities or index paths.",
      );
    }

    releaseIdentities.add(releaseIdentity);
    queryIndexRelativePaths.add(release.queryIndexRelativePath);
  }

  return catalog;
}

function parseAndValidateCatalogBytes(bytes) {
  return validateCatalogReleaseReferences(
    parseOntologyQueryCatalogBytes(bytes),
  );
}

function validateReleaseIndexIdentity(catalogRelease, queryIndex) {
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

  return queryIndex;
}

function isCancellation(error, signal) {
  return (
    signal?.aborted ||
    error?.name === "AbortError" ||
    error?.code === "ABORT_ERR"
  );
}

function isEligibleRetainedSnapshotFallback(error, signal) {
  if (
    isCancellation(error, signal) ||
    error instanceof OntologyQueryArtifactCacheInitializationError
  ) {
    return false;
  }

  if (error instanceof HttpOntologyQueryArtifactReadError) {
    if (error.failureKind !== "http_status") {
      return true;
    }

    return (
      [404, 410, 429].includes(error.httpStatus) || error.httpStatus >= 500
    );
  }

  return isOntologyQueryError(error);
}

function createCatalogUnavailableError(error) {
  return isOntologyQueryError(error)
    ? error
    : new OntologyQueryError("QUERY_INDEX_CATALOG_UNAVAILABLE", {
        cause: error,
      });
}

/**
 * Compose a private verified cache and fixed-origin HTTP reader into the byte
 * repository consumed by the unchanged ontology query module.
 */
export function createPersistentHttpOntologyQueryArtifactRepository({
  ontologyQueryArtifactChannelName,
  ontologyQueryArtifactBaseUrlSha256,
  persistentOntologyQueryArtifactCache,
  httpOntologyQueryArtifactReader,
  writeOperationalEvent = () => {},
  monotonicTimeMilliseconds = () => performance.now(),
  createCorrelationIdentifier = randomUUID,
}) {
  const parsedChannelName = OntologyQueryArtifactChannelNameSchema.parse(
    ontologyQueryArtifactChannelName,
  );
  requireSha256(
    ontologyQueryArtifactBaseUrlSha256,
    "ontologyQueryArtifactBaseUrlSha256",
  );
  const cache = requirePort(
    persistentOntologyQueryArtifactCache,
    [
      "readVerifiedArtifact",
      "installVerifiedArtifact",
      "readLastKnownGoodChannelState",
      "installLastKnownGoodChannelState",
      "withArtifactPopulationLease",
      "prune",
    ],
    "persistentOntologyQueryArtifactCache",
  );
  const httpReader = requirePort(
    httpOntologyQueryArtifactReader,
    ["read"],
    "httpOntologyQueryArtifactReader",
  );

  if (typeof writeOperationalEvent !== "function") {
    throw new TypeError("writeOperationalEvent must be a function.");
  }

  if (
    typeof monotonicTimeMilliseconds !== "function" ||
    typeof createCorrelationIdentifier !== "function"
  ) {
    throw new TypeError(
      "Time and correlation-identifier dependencies must be functions.",
    );
  }

  const channelManifestRelativePath = `channels/${parsedChannelName}.json`;
  parseOntologyQueryChannelManifestRelativePath(channelManifestRelativePath);
  let pinnedCatalogSnapshot;
  const runSharedCatalogInitialization = createWaiterAwareSharedOperation();
  const runSharedArtifactPopulation = createWaiterAwareSharedOperation();

  async function emitRetainedSnapshotFallback(error, startedAtMilliseconds) {
    let safeErrorCode = "ARTIFACT_VALIDATION_FAILED";

    if (error instanceof HttpOntologyQueryArtifactReadError) {
      safeErrorCode =
        error.failureKind === "http_status"
          ? `ORIGIN_HTTP_${error.httpStatus}`
          : error.failureKind === "timeout"
            ? "ORIGIN_REQUEST_TIMEOUT"
            : "ORIGIN_REQUEST_FAILED";
    }

    const elapsedMilliseconds = Math.max(
      0,
      Math.floor(monotonicTimeMilliseconds() - startedAtMilliseconds),
    );

    try {
      await writeOperationalEvent(
        Object.freeze({
          eventName: "ontology_query_artifact_retained_snapshot_selected",
          severity: "warning",
          outcome: "fallback",
          safeErrorCode,
          channel: parsedChannelName,
          cacheOutcome: "last_known_good",
          byteCount: 0,
          elapsedMilliseconds,
          correlationIdentifier: String(createCorrelationIdentifier()).slice(
            0,
            128,
          ),
        }),
      );
    } catch {
      // Event delivery is best effort and must not disable verified fallback.
    }
  }

  async function readCachedArtifact(reference, signal) {
    return cache.readVerifiedArtifact({
      expectedByteLength: reference.byteLength,
      expectedSha256: reference.sha256,
      signal,
    });
  }

  async function readRetainedCatalogSnapshot(state, signal) {
    if (!state) {
      return null;
    }

    const manifestBytes = await readCachedArtifact(
      state.ontologyQueryChannelManifestReference,
      signal,
    );
    const catalogBytes = await readCachedArtifact(
      state.ontologyQueryCatalogReference,
      signal,
    );

    if (!manifestBytes || !catalogBytes) {
      return null;
    }

    try {
      const manifest = parseOntologyQueryChannelManifestBytes(manifestBytes);

      if (
        manifest.ontologyQueryArtifactChannelName !== parsedChannelName ||
        manifest.ontologyQueryCatalogReference.relativePath !==
          state.ontologyQueryCatalogReference.relativePath ||
        manifest.ontologyQueryCatalogReference.sha256 !==
          state.ontologyQueryCatalogReference.sha256 ||
        manifest.ontologyQueryCatalogReference.byteLength !==
          state.ontologyQueryCatalogReference.byteLength
      ) {
        return null;
      }

      const catalog = parseAndValidateCatalogBytes(catalogBytes);
      return Object.freeze({
        catalog,
        catalogBytes,
        manifest,
        manifestBytes,
        state,
      });
    } catch {
      return null;
    }
  }

  async function readArtifactFromCacheOrOrigin({
    reference,
    maximumDecodedByteLength,
    validateArtifactBytesForRequest,
    signal,
  }) {
    const cachedBytes = await readCachedArtifact(reference, signal);

    if (cachedBytes) {
      validateArtifactBytesForRequest(cachedBytes);
      return cachedBytes;
    }

    // Population is shared by digest alone, so it may only establish
    // properties of the immutable bytes: retrieval, transfer bounds,
    // integrity, and cache installation. Interpreting those bytes under the
    // initiating caller's release identity here would let one incompatible
    // catalog alias reject every coalesced waiter, valid ones included.
    const populatedBytes = await runSharedArtifactPopulation({
      operationKey: reference.sha256,
      signal,
      executeOperation: ({ signal: sharedSignal }) =>
        cache.withArtifactPopulationLease({
          expectedSha256: reference.sha256,
          signal: sharedSignal,
          async operation() {
            const raceWinnerBytes = await readCachedArtifact(
              reference,
              sharedSignal,
            );

            if (raceWinnerBytes) {
              return raceWinnerBytes;
            }

            const response = await httpReader.read({
              relativePath: reference.relativePath,
              maximumDecodedByteLength: Math.min(
                maximumDecodedByteLength,
                reference.byteLength,
              ),
              signal: sharedSignal,
            });

            if (response.retrievalStatus !== "fetched") {
              throw new HttpOntologyQueryArtifactReadError("invalid_response");
            }

            await verifyCanonicalArtifactReference({
              bytes: response.bytes,
              expectedByteLength: reference.byteLength,
              expectedSha256: reference.sha256,
            });
            await cache.installVerifiedArtifact({
              bytes: response.bytes,
              expectedByteLength: reference.byteLength,
              expectedSha256: reference.sha256,
              signal: sharedSignal,
            });
            return response.bytes;
          },
        }),
    });

    // A digest normally identifies one semantic artifact, but an untrusted
    // catalog could repeat that digest under incompatible release identities
    // or byte-length declarations. Shared population removes duplicate I/O;
    // it must never remove validation against each caller's exact reference.
    await verifyCanonicalArtifactReference({
      bytes: populatedBytes,
      expectedByteLength: reference.byteLength,
      expectedSha256: reference.sha256,
    });
    validateArtifactBytesForRequest(populatedBytes);
    return populatedBytes;
  }

  async function createFreshCatalogSnapshot(manifestResponse, signal) {
    const manifestBytes = manifestResponse.bytes;
    const manifest = parseOntologyQueryChannelManifestBytes(manifestBytes);

    if (manifest.ontologyQueryArtifactChannelName !== parsedChannelName) {
      throw createCatalogSchemaError(
        "The ontology query channel manifest names a different channel.",
      );
    }

    const catalogReference = manifest.ontologyQueryCatalogReference;
    const catalogBytes = await readArtifactFromCacheOrOrigin({
      reference: catalogReference,
      maximumDecodedByteLength: MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
      validateArtifactBytesForRequest: parseAndValidateCatalogBytes,
      signal,
    });
    const catalog = parseAndValidateCatalogBytes(catalogBytes);
    const manifestReference = {
      sha256: await calculateSha256(manifestBytes),
      byteLength: manifestBytes.byteLength,
    };

    if (
      manifestReference.byteLength < 1 ||
      manifestReference.byteLength >
        MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH
    ) {
      throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
        message: "The ontology query channel manifest exceeds its byte limit.",
      });
    }

    await cache.installVerifiedArtifact({
      bytes: manifestBytes,
      expectedByteLength: manifestReference.byteLength,
      expectedSha256: manifestReference.sha256,
      signal,
    });
    const state = {
      persistentCacheStateKind:
        "universal_ontology_query_channel_last_known_good_state",
      persistentCacheStateFormatVersion: 1,
      ontologyQueryArtifactBaseUrlSha256,
      ontologyQueryArtifactChannelName: parsedChannelName,
      ontologyQueryChannelManifestReference: manifestReference,
      ontologyQueryCatalogReference: catalogReference,
      channelManifestHttpValidator: manifestResponse.responseValidator,
    };
    await cache.installLastKnownGoodChannelState({ state, signal });
    await cache.prune({ protectedArtifactSha256Values: [], signal });

    return Object.freeze({
      catalog,
      catalogBytes,
      manifest,
      manifestBytes,
      state,
    });
  }

  async function initializeCatalogSnapshot(signal) {
    const startedAtMilliseconds = monotonicTimeMilliseconds();
    const retainedState = await cache.readLastKnownGoodChannelState({
      ontologyQueryArtifactChannelName: parsedChannelName,
      signal,
    });
    const retainedSnapshot = await readRetainedCatalogSnapshot(
      retainedState,
      signal,
    );

    try {
      const manifestResponse = await httpReader.read({
        relativePath: channelManifestRelativePath,
        maximumDecodedByteLength:
          MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH,
        conditionalRequestValidator:
          retainedSnapshot?.state.channelManifestHttpValidator,
        signal,
      });

      if (manifestResponse.retrievalStatus === "not_modified") {
        if (!retainedSnapshot) {
          throw new HttpOntologyQueryArtifactReadError("invalid_response");
        }

        return retainedSnapshot;
      }

      return await createFreshCatalogSnapshot(manifestResponse, signal);
    } catch (error) {
      if (
        retainedSnapshot &&
        isEligibleRetainedSnapshotFallback(error, signal)
      ) {
        await emitRetainedSnapshotFallback(error, startedAtMilliseconds);
        return retainedSnapshot;
      }

      if (isCancellation(error, signal)) {
        throw signal?.reason ?? error;
      }

      throw createCatalogUnavailableError(error);
    }
  }

  function loadCatalogSnapshot(signal) {
    signal?.throwIfAborted();

    if (pinnedCatalogSnapshot) {
      return Promise.resolve(pinnedCatalogSnapshot);
    }

    return runSharedCatalogInitialization({
      operationKey: parsedChannelName,
      signal,
      async executeOperation({ signal: sharedSignal }) {
        const snapshot = await initializeCatalogSnapshot(sharedSignal);
        pinnedCatalogSnapshot = snapshot;
        return snapshot;
      },
    });
  }

  async function readOntologyQueryCatalog({ signal } = {}) {
    return (await loadCatalogSnapshot(signal)).catalogBytes;
  }

  async function readOntologyReleaseQueryIndex({ relativePath, signal }) {
    signal?.throwIfAborted();
    let parsedRelativePath;

    try {
      parsedRelativePath =
        parseOntologyReleaseQueryIndexRelativePath(relativePath);
    } catch (error) {
      throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE", {
        cause: error,
      });
    }

    const catalogSnapshot = await loadCatalogSnapshot(signal);
    const catalogRelease = catalogSnapshot.catalog.releases.find(
      (release) => release.queryIndexRelativePath === relativePath,
    );

    if (
      !catalogRelease ||
      catalogRelease.queryIndexSha256 !== parsedRelativePath.sha256 ||
      catalogRelease.ontologyArtifactFamilyId !==
        parsedRelativePath.ontologyArtifactFamilyId ||
      catalogRelease.versionTag !== parsedRelativePath.versionTag
    ) {
      throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE");
    }

    const reference = {
      relativePath,
      sha256: catalogRelease.queryIndexSha256,
      byteLength: catalogRelease.queryIndexByteLength,
    };

    try {
      const bytes = await readArtifactFromCacheOrOrigin({
        reference,
        maximumDecodedByteLength: MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
        validateArtifactBytesForRequest(indexBytes) {
          return validateReleaseIndexIdentity(
            catalogRelease,
            parseOntologyReleaseQueryIndexBytes(indexBytes),
          );
        },
        signal,
      });
      await cache.prune({
        protectedArtifactSha256Values: [catalogRelease.queryIndexSha256],
        signal,
      });
      return bytes;
    } catch (error) {
      if (isCancellation(error, signal)) {
        throw signal?.reason ?? error;
      }

      if (isOntologyQueryError(error)) {
        throw error;
      }

      throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE", {
        cause: error,
      });
    }
  }

  return Object.freeze({
    readOntologyQueryCatalog,
    readOntologyReleaseQueryIndex,
  });
}
