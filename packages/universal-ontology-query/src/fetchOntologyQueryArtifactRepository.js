/**
 * Reads generated ontology query artifacts through same-origin Fetch.
 * This adapter owns URL containment and raw response bytes; digest, JSON, and
 * ontology semantics remain inside the shared query module.
 */

import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
} from "./ontologyQueryArtifactLimits.js";
import {
  ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE,
  parseContainedOntologyQueryArtifactRelativePath,
} from "./ontologyQueryArtifactRelativePath.js";

const EXPECTED_ORIGIN_ERROR_MESSAGE =
  "expectedOrigin must be a canonical HTTP(S) origin string.";
const ONTOLOGY_QUERY_ROOT_ERROR_MESSAGE =
  "ontologyQueryRootIri must be a same-origin, slash-terminated HTTP(S) URL without credentials, search, or fragment.";

function isJsonMediaType(contentType) {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  return (
    mediaType === "application/json" ||
    /^application\/[^\s/;]+\+json$/u.test(mediaType ?? "")
  );
}

function createByteLimitError(responseDescription, maximumByteLength) {
  return new RangeError(
    `The ${responseDescription} response exceeds the ${maximumByteLength}-byte limit.`,
  );
}

function validateArtifactResponse(response) {
  if (response.status !== 200) {
    throw new Error(
      "The ontology query artifact response must have status 200.",
    );
  }

  if (response.redirected) {
    throw new Error(
      "The ontology query artifact response must not be redirected.",
    );
  }

  if (!isJsonMediaType(response.headers.get("Content-Type"))) {
    throw new Error(
      "The ontology query artifact response must have a JSON Content-Type.",
    );
  }

  if (!response.body) {
    throw new Error(
      "The ontology query artifact response must have a readable body.",
    );
  }
}

async function readBoundedResponseBytes(
  response,
  { maximumByteLength, responseDescription, signal },
) {
  signal?.throwIfAborted();
  const declaredContentLength = response.headers.get("Content-Length");

  if (/^\d+$/u.test(declaredContentLength ?? "")) {
    const parsedContentLength = Number(declaredContentLength);

    if (
      Number.isSafeInteger(parsedContentLength) &&
      parsedContentLength > maximumByteLength
    ) {
      throw createByteLimitError(responseDescription, maximumByteLength);
    }
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalByteLength = 0;
  const handleAbort = () => {
    // Fetch normally aborts its body stream itself. Cancelling the reader here
    // also makes the boundary correct for injected Fetch implementations.
    void reader.cancel(signal.reason).catch(() => {});
  };

  signal?.addEventListener("abort", handleAbort, { once: true });

  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();

      if (done) {
        break;
      }

      if (!(value instanceof Uint8Array)) {
        throw new TypeError(
          "The ontology query artifact response body must provide byte chunks.",
        );
      }

      totalByteLength += value.byteLength;

      if (totalByteLength > maximumByteLength) {
        const byteLimitError = createByteLimitError(
          responseDescription,
          maximumByteLength,
        );

        try {
          await reader.cancel(byteLimitError);
        } catch {
          // Reader cleanup must not replace the stable size-bound failure.
        }

        throw byteLimitError;
      }

      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener("abort", handleAbort);
  }

  const bytes = new Uint8Array(totalByteLength);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  signal?.throwIfAborted();
  return bytes;
}

function parseExpectedOrigin(expectedOrigin) {
  let expectedOriginUrl;

  try {
    expectedOriginUrl = new URL(expectedOrigin);
  } catch {
    throw new TypeError(EXPECTED_ORIGIN_ERROR_MESSAGE);
  }

  if (
    !["http:", "https:"].includes(expectedOriginUrl.protocol) ||
    expectedOrigin !== expectedOriginUrl.origin
  ) {
    throw new TypeError(EXPECTED_ORIGIN_ERROR_MESSAGE);
  }

  return expectedOriginUrl.origin;
}

function parseOntologyQueryRoot(ontologyQueryRootIri, expectedOrigin) {
  let ontologyQueryRootUrl;

  try {
    ontologyQueryRootUrl = new URL(ontologyQueryRootIri);
  } catch {
    throw new TypeError(ONTOLOGY_QUERY_ROOT_ERROR_MESSAGE);
  }

  if (
    !["http:", "https:"].includes(ontologyQueryRootUrl.protocol) ||
    ontologyQueryRootUrl.origin !== expectedOrigin ||
    ontologyQueryRootUrl.username !== "" ||
    ontologyQueryRootUrl.password !== "" ||
    ontologyQueryRootUrl.search !== "" ||
    ontologyQueryRootUrl.hash !== "" ||
    !ontologyQueryRootUrl.pathname.endsWith("/")
  ) {
    throw new TypeError(ONTOLOGY_QUERY_ROOT_ERROR_MESSAGE);
  }

  return ontologyQueryRootUrl;
}

function parseFetchRelativePath(relativePath) {
  const segments =
    parseContainedOntologyQueryArtifactRelativePath(relativePath);

  // The filesystem vocabulary may legitimately contain these characters, but
  // Fetch must reject them before URL parsing can decode or reinterpret them.
  if (/[%?#]/u.test(relativePath)) {
    throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
  }

  return segments.join("/");
}

/**
 * Create the Fetch adapter for the ontology query-artifact repository port.
 * The query root is resolved once; individual reads accept only catalog-owned
 * normalized paths and never a caller-controlled absolute URL.
 */
export function createFetchOntologyQueryArtifactRepository({
  ontologyQueryRootIri,
  expectedOrigin,
  fetchImplementation = globalThis.fetch,
}) {
  const canonicalExpectedOrigin = parseExpectedOrigin(expectedOrigin);
  const ontologyQueryRootUrl = parseOntologyQueryRoot(
    ontologyQueryRootIri,
    canonicalExpectedOrigin,
  );

  async function read(
    relativePath,
    { cache, maximumByteLength, responseDescription, signal },
  ) {
    signal?.throwIfAborted();
    const containedRelativePath = parseFetchRelativePath(relativePath);
    const artifactUrl = new URL(containedRelativePath, ontologyQueryRootUrl);

    // Validate again after URL resolution. Lexical validation and resolved-URL
    // containment protect different interpretations of the same path bytes.
    if (
      artifactUrl.origin !== canonicalExpectedOrigin ||
      !artifactUrl.pathname.startsWith(ontologyQueryRootUrl.pathname)
    ) {
      throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
    }

    const response = await fetchImplementation(artifactUrl.href, {
      cache,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal,
    });
    signal?.throwIfAborted();
    validateArtifactResponse(response);
    return readBoundedResponseBytes(response, {
      maximumByteLength,
      responseDescription,
      signal,
    });
  }

  return Object.freeze({
    /** Revalidate the mutable catalog before selecting immutable artifacts. */
    readOntologyQueryCatalog({ signal } = {}) {
      return read("catalog.json", {
        cache: "no-cache",
        maximumByteLength: MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
        responseDescription: "ontology query catalog",
        signal,
      });
    },

    /** Read one catalog-selected content-addressed release index. */
    readOntologyReleaseQueryIndex({ relativePath, signal }) {
      return read(relativePath, {
        cache: "force-cache",
        maximumByteLength: MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
        responseDescription: "ontology release query index",
        signal,
      });
    },
  });
}
