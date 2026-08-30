/**
 * Defines the safe, transport-independent ontology-query failure vocabulary.
 * Private adapter exceptions remain attached only as causes and are never part
 * of the public error code, message, or retryability contract.
 */

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
  QUERY_INDEX_UNAVAILABLE: {
    retryable: true,
    defaultMessage: "The ontology release query index is unavailable.",
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

/**
 * Canonical ordered error-code vocabulary shared by every outer adapter.
 * Deriving it here prevents transports from silently maintaining stale copies.
 */
export const ONTOLOGY_QUERY_ERROR_CODE_VALUES = Object.freeze(
  Object.keys(ONTOLOGY_QUERY_ERROR_DEFINITIONS),
);

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
