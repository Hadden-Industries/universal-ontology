import {
  createMcpHandler,
  isJsonContentType,
} from "@modelcontextprotocol/server";

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
 * Compose the official stateless HTTP protocol handler with the ontology tools.
 * Each mounting ingress must bound its original bytes before calling this
 * protocol layer. Node uses its bounded parser and the SDK's parsedBody input;
 * standalone Fetch callers use createUniversalOntologyMcpFetchHandler below.
 */
export function createUniversalOntologyMcpHttpProtocolHandler({
  ontologyQuery,
  onError = () => {},
}) {
  if (typeof onError !== "function") {
    throw new TypeError("onError must be a function.");
  }

  return createMcpHandler(
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
}

/** Bound a standalone Fetch request before handing protocol ownership to the SDK. */
export function createUniversalOntologyMcpFetchHandler(options) {
  const sdkHandler = createUniversalOntologyMcpHttpProtocolHandler(options);

  return Object.freeze({
    bus: sdkHandler.bus,
    notify: sdkHandler.notify,
    close: () => sdkHandler.close(),
    async fetch(request, { authInfo } = {}) {
      if (
        request.method === "POST" &&
        !isJsonContentType(request.headers.get("content-type"))
      ) {
        return jsonRpcHttpError(
          415,
          -32000,
          "Content-Type must be application/json.",
          { connection: "close" },
        );
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

      // parsedBody is deliberately not accepted at this ingress: an arbitrary
      // supplied value cannot replace the original bounded Fetch request.
      return sdkHandler.fetch(buffered.request, { authInfo });
    },
  });
}
