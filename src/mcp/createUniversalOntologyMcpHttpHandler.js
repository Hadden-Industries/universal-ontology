import { createMcpHandler } from "@modelcontextprotocol/server";

import { createUniversalOntologyMcpServer } from "./createUniversalOntologyMcpServer.js";

export const UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES = 128 * 1024;

function jsonRpcHttpError(status, code, message, headers = {}) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code, message },
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    },
  );
}

function mediaTypeEssence(value) {
  return value?.split(";", 1)[0].trim().toLowerCase();
}

function acceptsRequiredPostResponseTypes(acceptHeader) {
  const acceptedMediaTypes = new Set(
    (acceptHeader ?? "")
      .split(",")
      .map((value) => mediaTypeEssence(value))
      .filter(Boolean),
  );

  // Streamable HTTP POST clients advertise both possible response forms even
  // though this read-only server deliberately selects JSON terminal results.
  return (
    acceptedMediaTypes.has("application/json") &&
    acceptedMediaTypes.has("text/event-stream")
  );
}

function validatePostRepresentationHeaders(request) {
  if (request.method !== "POST") {
    return null;
  }

  if (
    mediaTypeEssence(request.headers.get("content-type")) !== "application/json"
  ) {
    return jsonRpcHttpError(
      415,
      -32000,
      "Content-Type must be application/json.",
      {
        connection: "close",
      },
    );
  }

  if (!acceptsRequiredPostResponseTypes(request.headers.get("accept"))) {
    return jsonRpcHttpError(
      406,
      -32000,
      "Accept must include application/json and text/event-stream.",
      { connection: "close" },
    );
  }

  return null;
}

async function bufferRequestBodyWithinLimit(request, maximumByteCount) {
  if (request.method !== "POST" || request.body === null) {
    return { request };
  }

  const declaredLength = request.headers.get("content-length");

  if (
    declaredLength !== null &&
    /^\d+$/u.test(declaredLength) &&
    Number(declaredLength) > maximumByteCount
  ) {
    return { rejected: true };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let byteCount = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    byteCount += value.byteLength;

    if (byteCount > maximumByteCount) {
      // Stop pulling immediately. The Node response also carries
      // `Connection: close`, so unread bytes cannot be interpreted as a
      // pipelined request on the same socket.
      await reader.cancel("MCP request body limit exceeded.");
      return { rejected: true };
    }

    chunks.push(value);
  }

  const body = new Uint8Array(byteCount);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    request: new Request(request, { body }),
  };
}

/**
 * Create the stateless HTTP protocol adapter shared by local and production
 * runners.
 *
 * The pinned SDK 2.0.0 has no request-body limit option, so this adapter
 * bounds the byte stream before SDK parsing and rebuilds an equivalent
 * request from the accepted bytes. Protocol metadata, argument validation,
 * and modern/legacy classification remain owned by the official SDK.
 */
export function createUniversalOntologyMcpHttpHandler({
  ontologyQuery,
  onError = () => {},
}) {
  if (typeof onError !== "function") {
    throw new TypeError("onError must be a function.");
  }

  const sdkHandler = createMcpHandler(
    () =>
      createUniversalOntologyMcpServer({
        ontologyQuery,
        reportUnhandledToolError: onError,
      }),
    {
      legacy: "stateless",
      responseMode: "json",
      onerror: onError,
    },
  );

  return Object.freeze({
    bus: sdkHandler.bus,
    notify: sdkHandler.notify,
    close: () => sdkHandler.close(),
    async fetch(request, options) {
      const representationHeaderFailure =
        validatePostRepresentationHeaders(request);

      if (representationHeaderFailure) {
        return representationHeaderFailure;
      }

      const buffered = await bufferRequestBodyWithinLimit(
        request,
        UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES,
      );

      if (buffered.rejected) {
        return jsonRpcHttpError(
          413,
          -32000,
          `Request body exceeds ${UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES} bytes.`,
          { connection: "close" },
        );
      }

      return sdkHandler.fetch(buffered.request, options);
    },
  });
}
