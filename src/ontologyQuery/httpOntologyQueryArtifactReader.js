import {
  ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE,
  parseContainedOntologyQueryArtifactRelativePath,
} from "./ontologyQueryArtifactRelativePath.js";
import { OntologyQueryChannelManifestHttpValidatorSchema } from "./ontologyQueryPersistentCacheSchemas.js";

const ARTIFACT_BASE_URL_ERROR_MESSAGE =
  "ontologyQueryArtifactBaseUrl must be a slash-terminated HTTPS URL without credentials, search, or fragment.";
const HTTP_LOOPBACK_HOSTNAME_VALUES = Object.freeze([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);
const HTTP_READ_ERROR_MESSAGES = Object.freeze({
  network: "The ontology query-artifact request failed.",
  timeout: "The ontology query-artifact request timed out.",
  http_status:
    "The ontology query-artifact origin returned an unsupported status.",
  invalid_response: "The ontology query-artifact response is invalid.",
  decoded_body_too_large:
    "The ontology query-artifact response exceeds its decoded-byte limit.",
});

/** Safe, structured failure vocabulary consumed by the persistent repository. */
export class HttpOntologyQueryArtifactReadError extends Error {
  constructor(failureKind, { cause, httpStatus = null } = {}) {
    const message = HTTP_READ_ERROR_MESSAGES[failureKind];

    if (!message) {
      throw new TypeError(
        `Unknown HTTP ontology query-artifact read failure kind: ${failureKind}`,
      );
    }

    super(message, { cause });
    this.name = "HttpOntologyQueryArtifactReadError";
    this.failureKind = failureKind;
    this.httpStatus = httpStatus;
  }
}

function requirePositiveSafeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${fieldName} must be a positive safe integer.`);
  }

  return value;
}

function parseArtifactBaseUrl({
  ontologyQueryArtifactBaseUrl,
  allowInsecureLoopbackOntologyQueryArtifactOrigin,
}) {
  let baseUrl;

  try {
    baseUrl = new URL(ontologyQueryArtifactBaseUrl);
  } catch {
    throw new TypeError(ARTIFACT_BASE_URL_ERROR_MESSAGE);
  }

  const insecureLoopbackIsAllowed =
    allowInsecureLoopbackOntologyQueryArtifactOrigin === true &&
    baseUrl.protocol === "http:" &&
    HTTP_LOOPBACK_HOSTNAME_VALUES.includes(baseUrl.hostname);

  if (
    (baseUrl.protocol !== "https:" && !insecureLoopbackIsAllowed) ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== "" ||
    !baseUrl.pathname.endsWith("/")
  ) {
    throw new TypeError(ARTIFACT_BASE_URL_ERROR_MESSAGE);
  }

  return baseUrl;
}

function parseHttpArtifactRelativePath(relativePath) {
  const segments =
    parseContainedOntologyQueryArtifactRelativePath(relativePath);

  // The transport-neutral parser deliberately permits URL-significant
  // characters. This adapter rejects them before URL parsing can decode or
  // reinterpret the repository-owned relative path.
  if (/[%?#]/u.test(relativePath)) {
    throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
  }

  return segments.join("/");
}

function isJsonMediaType(contentType) {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  return (
    mediaType === "application/json" ||
    /^application\/[^\s/;]+\+json$/u.test(mediaType ?? "")
  );
}

function parseResponseValidator(headers) {
  const entityTagCandidate = headers.get("ETag");
  const lastModifiedCandidate = headers.get("Last-Modified");
  const parsedEntityTag =
    OntologyQueryChannelManifestHttpValidatorSchema.safeParse({
      entityTag: entityTagCandidate,
      lastModifiedHttpDate: null,
    });
  const parsedLastModified =
    OntologyQueryChannelManifestHttpValidatorSchema.safeParse({
      entityTag: null,
      lastModifiedHttpDate: lastModifiedCandidate,
    });

  return Object.freeze({
    entityTag: parsedEntityTag.success ? entityTagCandidate : null,
    lastModifiedHttpDate: parsedLastModified.success
      ? lastModifiedCandidate
      : null,
  });
}

async function cancelResponseBody(response, reason) {
  try {
    await response.body?.cancel(reason);
  } catch {
    // Cleanup must not replace the stable, structured validation failure.
  }
}

function readDeclaredIdentityByteLength(response) {
  const contentEncoding = response.headers.get("Content-Encoding");

  if (
    contentEncoding !== null &&
    contentEncoding.trim().toLowerCase() !== "identity"
  ) {
    return null;
  }

  const contentLength = response.headers.get("Content-Length");

  if (!/^\d+$/u.test(contentLength ?? "")) {
    return null;
  }

  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function readBoundedDecodedBody({
  response,
  maximumDecodedByteLength,
  signal,
}) {
  if (signal.aborted) {
    await cancelResponseBody(response, signal.reason);
    signal.throwIfAborted();
  }

  if (!response.body) {
    throw new HttpOntologyQueryArtifactReadError("invalid_response");
  }

  const declaredIdentityByteLength = readDeclaredIdentityByteLength(response);

  if (
    declaredIdentityByteLength !== null &&
    declaredIdentityByteLength > maximumDecodedByteLength
  ) {
    const error = new HttpOntologyQueryArtifactReadError(
      "decoded_body_too_large",
    );
    await cancelResponseBody(response, error);
    throw error;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let decodedByteLength = 0;
  const handleAbort = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", handleAbort, { once: true });

  if (signal.aborted) {
    handleAbort();
  }

  try {
    while (true) {
      signal.throwIfAborted();
      let readResult;

      try {
        readResult = await reader.read();
      } catch (error) {
        signal.throwIfAborted();
        throw new HttpOntologyQueryArtifactReadError("network", {
          cause: error,
        });
      }

      signal.throwIfAborted();

      if (readResult.done) {
        break;
      }

      if (!(readResult.value instanceof Uint8Array)) {
        const error = new HttpOntologyQueryArtifactReadError(
          "invalid_response",
        );

        try {
          await reader.cancel(error);
        } catch {
          // Preserve the fixed malformed-chunk failure if cleanup fails.
        }

        throw error;
      }

      decodedByteLength += readResult.value.byteLength;

      if (decodedByteLength > maximumDecodedByteLength) {
        const error = new HttpOntologyQueryArtifactReadError(
          "decoded_body_too_large",
        );

        try {
          await reader.cancel(error);
        } catch {
          // Preserve the stable decoded-byte failure if cancellation fails.
        }

        throw error;
      }

      if (readResult.value.byteLength > 0) {
        chunks.push(readResult.value);
      }
    }
  } finally {
    signal.removeEventListener("abort", handleAbort);
    reader.releaseLock();
  }

  if (
    declaredIdentityByteLength !== null &&
    declaredIdentityByteLength !== decodedByteLength
  ) {
    throw new HttpOntologyQueryArtifactReadError("invalid_response");
  }

  const bytes = new Uint8Array(decodedByteLength);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  signal.throwIfAborted();
  return bytes;
}

function parseConditionalRequestValidator(conditionalRequestValidator) {
  if (
    conditionalRequestValidator === undefined ||
    conditionalRequestValidator === null
  ) {
    return null;
  }

  return OntologyQueryChannelManifestHttpValidatorSchema.parse(
    conditionalRequestValidator,
  );
}

/**
 * Create one fixed-origin reader for bounded canonical JSON artifact bytes.
 * Query text and entity identifiers never enter this interface or any URL.
 */
export function createHttpOntologyQueryArtifactReader({
  ontologyQueryArtifactBaseUrl,
  allowInsecureLoopbackOntologyQueryArtifactOrigin = false,
  fetchImplementation = globalThis.fetch,
  requestTimeoutMilliseconds = 15_000,
}) {
  if (typeof allowInsecureLoopbackOntologyQueryArtifactOrigin !== "boolean") {
    throw new TypeError(
      "allowInsecureLoopbackOntologyQueryArtifactOrigin must be a boolean.",
    );
  }

  if (typeof fetchImplementation !== "function") {
    throw new TypeError("fetchImplementation must be a function.");
  }

  requirePositiveSafeInteger(
    requestTimeoutMilliseconds,
    "requestTimeoutMilliseconds",
  );
  const artifactBaseUrl = parseArtifactBaseUrl({
    ontologyQueryArtifactBaseUrl,
    allowInsecureLoopbackOntologyQueryArtifactOrigin,
  });

  async function read({
    relativePath,
    maximumDecodedByteLength,
    conditionalRequestValidator,
    signal,
  }) {
    signal?.throwIfAborted();
    requirePositiveSafeInteger(
      maximumDecodedByteLength,
      "maximumDecodedByteLength",
    );
    const containedRelativePath = parseHttpArtifactRelativePath(relativePath);
    const parsedConditionalValidator = parseConditionalRequestValidator(
      conditionalRequestValidator,
    );
    const artifactUrl = new URL(containedRelativePath, artifactBaseUrl);

    if (
      artifactUrl.origin !== artifactBaseUrl.origin ||
      !artifactUrl.pathname.startsWith(artifactBaseUrl.pathname) ||
      artifactUrl.search !== "" ||
      artifactUrl.hash !== ""
    ) {
      throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
    }

    const requestHeaders = { Accept: "application/json" };

    if (parsedConditionalValidator?.entityTag) {
      requestHeaders["If-None-Match"] = parsedConditionalValidator.entityTag;
    }

    if (parsedConditionalValidator?.lastModifiedHttpDate) {
      requestHeaders["If-Modified-Since"] =
        parsedConditionalValidator.lastModifiedHttpDate;
    }

    const timeoutController = new AbortController();
    const timeoutError = new HttpOntologyQueryArtifactReadError("timeout");
    const timeout = setTimeout(
      () => timeoutController.abort(timeoutError),
      requestTimeoutMilliseconds,
    );
    timeout.unref?.();
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;
    let response;

    try {
      try {
        response = await fetchImplementation(artifactUrl.href, {
          credentials: "omit",
          headers: requestHeaders,
          redirect: "error",
          signal: requestSignal,
        });
      } catch (error) {
        requestSignal.throwIfAborted();
        throw new HttpOntologyQueryArtifactReadError("network", {
          cause: error,
        });
      }

      if (requestSignal.aborted) {
        await cancelResponseBody(response, requestSignal.reason);
        requestSignal.throwIfAborted();
      }

      if (response.redirected) {
        const error = new HttpOntologyQueryArtifactReadError(
          "invalid_response",
        );
        await cancelResponseBody(response, error);
        throw error;
      }

      const responseValidator = parseResponseValidator(response.headers);
      const conditionalRequestWasSent =
        parsedConditionalValidator !== null &&
        (parsedConditionalValidator.entityTag !== null ||
          parsedConditionalValidator.lastModifiedHttpDate !== null);

      if (response.status === 304 && conditionalRequestWasSent) {
        await cancelResponseBody(response);
        return Object.freeze({
          retrievalStatus: "not_modified",
          responseValidator,
        });
      }

      if (response.status !== 200) {
        const error = new HttpOntologyQueryArtifactReadError("http_status", {
          httpStatus: response.status,
        });
        await cancelResponseBody(response, error);
        throw error;
      }

      if (!isJsonMediaType(response.headers.get("Content-Type"))) {
        const error = new HttpOntologyQueryArtifactReadError(
          "invalid_response",
        );
        await cancelResponseBody(response, error);
        throw error;
      }

      const bytes = await readBoundedDecodedBody({
        response,
        maximumDecodedByteLength,
        signal: requestSignal,
      });

      return Object.freeze({
        retrievalStatus: "fetched",
        bytes,
        responseValidator,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({ read });
}
