import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { brotliCompressSync, gzipSync } from "node:zlib";

const FIXTURE_BASE_PATH = "/ontology/query/v1/";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function encodeResponseBody(bodyBytes, contentEncoding) {
  const bytes = Buffer.from(bodyBytes ?? Buffer.from("{}\n", "utf8"));

  switch (contentEncoding) {
    case undefined:
    case "identity":
      return { wireBytes: bytes, contentEncoding: null };
    case "gzip":
      return { wireBytes: gzipSync(bytes), contentEncoding };
    case "br":
      return { wireBytes: brotliCompressSync(bytes), contentEncoding };
    default:
      throw new TypeError(
        `Unsupported ontology query-artifact fixture encoding: ${contentEncoding}`,
      );
  }
}

function createRequestRecord(request) {
  return {
    method: request.method,
    requestTarget: request.url,
    headers: Object.freeze({ ...request.headers }),
    requestAborted: false,
    responseClosed: false,
  };
}

/**
 * Start a deterministic loopback origin for exercising Node Fetch behavior.
 * Definitions describe canonical decoded bytes; the fixture alone applies
 * wire compression, chunking, delay, or truncation.
 */
export async function createOntologyQueryArtifactHttpFixture() {
  const responseDefinitions = new Map();
  const requestRecords = [];
  const requestCountWaiters = new Set();
  const sockets = new Set();
  let closed = false;

  function notifyRequestCountWaiters() {
    for (const waiter of requestCountWaiters) {
      if (requestRecords.length >= waiter.expectedCount) {
        clearTimeout(waiter.timeout);
        requestCountWaiters.delete(waiter);
        waiter.resolve();
      }
    }
  }

  async function handleRequest(request, response) {
    const requestRecord = createRequestRecord(request);
    requestRecords.push(requestRecord);
    notifyRequestCountWaiters();
    request.on("aborted", () => {
      requestRecord.requestAborted = true;
    });
    response.on("close", () => {
      requestRecord.responseClosed = true;
    });

    const configuredDefinition = responseDefinitions.get(request.url);

    if (!configuredDefinition) {
      response.writeHead(404, {
        Connection: "close",
        "Content-Type": "application/json",
      });
      response.end("{}\n");
      return;
    }

    const definition =
      typeof configuredDefinition === "function"
        ? await configuredDefinition(requestRecord)
        : configuredDefinition;
    const status = definition.status ?? 200;
    const { wireBytes, contentEncoding } = encodeResponseBody(
      definition.bodyBytes,
      definition.contentEncoding,
    );
    const headers = {
      Connection: "close",
      "Content-Type": "application/json",
      ...definition.headers,
    };

    if (contentEncoding) {
      headers["Content-Encoding"] = contentEncoding;
    }

    if (!definition.omitContentLength && status !== 304) {
      headers["Content-Length"] = String(wireBytes.byteLength);
    }

    if (definition.delayBeforeHeadersMilliseconds) {
      await delay(definition.delayBeforeHeadersMilliseconds);
    }

    if (response.destroyed) {
      return;
    }

    response.writeHead(status, headers);

    if (status === 304) {
      response.end();
      return;
    }

    if (definition.truncateAfterByteLength !== undefined) {
      response.write(wireBytes.subarray(0, definition.truncateAfterByteLength));
      response.socket?.destroy();
      return;
    }

    const chunkByteLength =
      definition.chunkByteLength ?? Math.max(1, wireBytes.byteLength);

    for (
      let offset = 0;
      offset < wireBytes.byteLength;
      offset += chunkByteLength
    ) {
      if (response.destroyed) {
        return;
      }

      response.write(wireBytes.subarray(offset, offset + chunkByteLength));

      if (definition.delayBetweenChunksMilliseconds) {
        await delay(definition.delayBetweenChunksMilliseconds);
      }
    }

    response.end();
  }

  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      if (!response.headersSent) {
        response.writeHead(500, {
          Connection: "close",
          "Content-Type": "application/json",
        });
      }

      response.end(
        `${JSON.stringify({ fixtureErrorName: error?.name ?? "Error" })}\n`,
      );
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("The ontology query-artifact fixture has no TCP address.");
  }

  return Object.freeze({
    ontologyQueryArtifactBaseUrl: `http://127.0.0.1:${address.port}${FIXTURE_BASE_PATH}`,
    requestRecords,

    setResponse(relativePath, definition) {
      if (
        typeof relativePath !== "string" ||
        relativePath === "" ||
        relativePath.startsWith("/")
      ) {
        throw new TypeError("Fixture relativePath must be a relative string.");
      }

      responseDefinitions.set(
        `${FIXTURE_BASE_PATH}${relativePath}`,
        definition,
      );
    },

    waitForRequestCount(expectedCount, timeoutMilliseconds = 5_000) {
      if (requestRecords.length >= expectedCount) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const waiter = {
          expectedCount,
          resolve,
          reject,
          timeout: setTimeout(() => {
            requestCountWaiters.delete(waiter);
            reject(
              new Error(
                `Timed out waiting for ${expectedCount} fixture requests.`,
              ),
            );
          }, timeoutMilliseconds),
        };
        requestCountWaiters.add(waiter);
      });
    },

    async close() {
      if (closed) {
        return;
      }

      closed = true;
      for (const waiter of requestCountWaiters) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("The HTTP fixture closed."));
      }
      requestCountWaiters.clear();

      for (const socket of sockets) {
        socket.destroy();
      }

      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },
  });
}
