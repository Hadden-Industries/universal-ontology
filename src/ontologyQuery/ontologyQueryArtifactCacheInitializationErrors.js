const INITIALIZATION_ERROR_DEFINITIONS = Object.freeze({
  UNSAFE_CACHE_DIRECTORY:
    "The ontology query-artifact cache directory is unsafe or unusable.",
  UNSUPPORTED_CACHE_FILE_SYSTEM:
    "The ontology query-artifact cache filesystem does not support required no-clobber semantics.",
});

export const ONTOLOGY_QUERY_ARTIFACT_CACHE_INITIALIZATION_ERROR_CODE_VALUES =
  Object.freeze(Object.keys(INITIALIZATION_ERROR_DEFINITIONS));

/**
 * Path-redacted operational failure raised before a cache can be trusted.
 * Platform details remain available only through `cause`; callers must render
 * the closed safe code and fixed message rather than the private exception.
 */
export class OntologyQueryArtifactCacheInitializationError extends Error {
  constructor(safeErrorCode, options = {}) {
    const message = INITIALIZATION_ERROR_DEFINITIONS[safeErrorCode];

    if (!message) {
      throw new TypeError(
        `Unknown ontology query-artifact cache initialization error code: ${safeErrorCode}`,
      );
    }

    super(message, { cause: options.cause });
    this.name = "OntologyQueryArtifactCacheInitializationError";
    this.safeErrorCode = safeErrorCode;
  }
}
