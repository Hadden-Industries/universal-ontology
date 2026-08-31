import { jest } from "@jest/globals";

import {
  HttpOntologyQueryArtifactReadError,
  createHttpOntologyQueryArtifactReader,
} from "../../src/ontologyQuery/httpOntologyQueryArtifactReader.js";
import { calculateSha256 } from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { createOntologyQueryArtifactHttpFixture } from "../fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js";

const HTTPS_ARTIFACT_BASE_URL =
  "https://artifacts.example.test/ontology/query/v1/";

function createReader(overrides = {}) {
  return createHttpOntologyQueryArtifactReader({
    ontologyQueryArtifactBaseUrl: HTTPS_ARTIFACT_BASE_URL,
    allowInsecureLoopbackOntologyQueryArtifactOrigin: false,
    fetchImplementation: jest.fn(),
    ...overrides,
  });
}

function createJsonResponse(body = "{}\n", options = {}) {
  const headers = new Headers(options.headers);
  headers.set(
    "Content-Type",
    headers.get("Content-Type") ?? "application/json",
  );
  return new Response(body, { ...options, headers });
}

function markResponseAsRedirected(response) {
  Object.defineProperty(response, "redirected", { value: true });
  return response;
}

describe("HTTP ontology query-artifact reader URL boundary", () => {
  test.each([
    "https://artifacts.example.test/ontology/query/v1",
    "https://user@artifacts.example.test/ontology/query/v1/",
    "https://artifacts.example.test/ontology/query/v1/?selection=stable",
    "https://artifacts.example.test/ontology/query/v1/#fragment",
    "ftp://artifacts.example.test/ontology/query/v1/",
    "http://artifacts.example.test/ontology/query/v1/",
    "http://localhost.example/ontology/query/v1/",
    "http://127.0.0.2/ontology/query/v1/",
  ])(
    "rejects an unsafe artifact base URL: %s",
    (ontologyQueryArtifactBaseUrl) => {
      expect(() =>
        createReader({
          ontologyQueryArtifactBaseUrl,
          allowInsecureLoopbackOntologyQueryArtifactOrigin: true,
        }),
      ).toThrow(
        "ontologyQueryArtifactBaseUrl must be a slash-terminated HTTPS URL without credentials, search, or fragment.",
      );
    },
  );

  test.each([
    "http://localhost/ontology/query/v1/",
    "http://127.0.0.1/ontology/query/v1/",
    "http://[::1]/ontology/query/v1/",
  ])(
    "permits an exact HTTP loopback origin only with the development flag: %s",
    (ontologyQueryArtifactBaseUrl) => {
      expect(() => createReader({ ontologyQueryArtifactBaseUrl })).toThrow();
      expect(() =>
        createReader({
          ontologyQueryArtifactBaseUrl,
          allowInsecureLoopbackOntologyQueryArtifactOrigin: true,
        }),
      ).not.toThrow();
    },
  );

  test.each([
    "../catalog.json",
    "catalogs/../catalog.json",
    "catalogs\\artifact.json",
    "/ontology/query/v1/catalog.json",
    "catalogs/%2e%2e/artifact.json",
    "catalogs/%2fartifact.json",
    "catalogs/artifact.json?query=private",
    "catalogs/artifact.json#fragment",
  ])("rejects a non-contained HTTP artifact path: %s", async (relativePath) => {
    const fetchImplementation = jest.fn();
    const reader = createReader({ fetchImplementation });

    await expect(
      reader.read({ relativePath, maximumDecodedByteLength: 1_024 }),
    ).rejects.toThrow(
      "The repository relative path must be a normalized contained POSIX path.",
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid decoded-byte limit before Fetch: %s",
    async (maximumDecodedByteLength) => {
      const fetchImplementation = jest.fn();
      const reader = createReader({ fetchImplementation });

      await expect(
        reader.read({
          relativePath: "channels/stable.json",
          maximumDecodedByteLength,
        }),
      ).rejects.toThrow(
        "maximumDecodedByteLength must be a positive safe integer.",
      );
      expect(fetchImplementation).not.toHaveBeenCalled();
    },
  );
});

describe("HTTP ontology query-artifact reader requests", () => {
  test("returns decoded response bytes without sending credentials or URL search", async () => {
    const expectedBytes = Uint8Array.from([0x7b, 0x7d, 0x0a]);
    const fetchImplementation = jest.fn().mockResolvedValue(
      createJsonResponse(expectedBytes, {
        headers: { ETag: '"representation-1"' },
      }),
    );
    const reader = createReader({ fetchImplementation });
    const controller = new AbortController();

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
        signal: controller.signal,
      }),
    ).resolves.toEqual({
      retrievalStatus: "fetched",
      bytes: expectedBytes,
      responseValidator: {
        entityTag: '"representation-1"',
        lastModifiedHttpDate: null,
      },
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://artifacts.example.test/ontology/query/v1/channels/stable.json",
      {
        credentials: "omit",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: expect.any(AbortSignal),
      },
    );
    expect(fetchImplementation.mock.calls[0][0]).not.toContain("?");
    expect(fetchImplementation.mock.calls[0][1].signal).not.toBe(
      controller.signal,
    );
  });

  test.each([201, 304, 401, 403, 404, 410, 429, 500, 503])(
    "rejects unsupported status %s with structured body-redacted metadata",
    async (httpStatus) => {
      const privateResponseBody = "private-origin-details";
      const response =
        httpStatus === 304
          ? new Response(null, {
              status: httpStatus,
              headers: { "Content-Type": "application/json" },
            })
          : createJsonResponse(privateResponseBody, { status: httpStatus });
      const reader = createReader({
        fetchImplementation: jest.fn().mockResolvedValue(response),
      });
      const error = await reader
        .read({
          relativePath: "channels/stable.json",
          maximumDecodedByteLength: 1_024,
        })
        .catch((caughtError) => caughtError);

      expect(error).toBeInstanceOf(HttpOntologyQueryArtifactReadError);
      expect(error).toMatchObject({ failureKind: "http_status", httpStatus });
      expect(error.message).not.toContain(privateResponseBody);
    },
  );

  test.each([
    [
      "a redirected response",
      () => markResponseAsRedirected(createJsonResponse()),
    ],
    ["a missing content type", () => new Response("{}\n")],
    [
      "a non-JSON content type",
      () => new Response("{}\n", { headers: { "Content-Type": "text/plain" } }),
    ],
    [
      "a missing response body",
      () => createJsonResponse(null, { status: 200 }),
    ],
  ])(
    "rejects %s as an invalid response",
    async (_description, createResponse) => {
      const reader = createReader({
        fetchImplementation: jest.fn().mockResolvedValue(createResponse()),
      });

      await expect(
        reader.read({
          relativePath: "channels/stable.json",
          maximumDecodedByteLength: 1_024,
        }),
      ).rejects.toMatchObject({
        name: "HttpOntologyQueryArtifactReadError",
        failureKind: "invalid_response",
      });
    },
  );

  test("rejects a body stream that produces a non-byte chunk", async () => {
    let bodyWasCancelled = false;
    const response = {
      status: 200,
      redirected: false,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: {
        getReader() {
          return {
            async read() {
              return { done: false, value: "not bytes" };
            },
            async cancel() {
              bodyWasCancelled = true;
            },
            releaseLock() {},
          };
        },
      },
    };
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(response),
    });

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "invalid_response" });
    expect(bodyWasCancelled).toBe(true);
  });

  test("cancels a body returned concurrently with caller cancellation", async () => {
    let bodyCancellationReason;
    const controller = new AbortController();
    const callerReason = new DOMException("caller stopped", "AbortError");
    const body = new ReadableStream({
      cancel(reason) {
        bodyCancellationReason = reason;
      },
    });
    const reader = createReader({
      async fetchImplementation() {
        controller.abort(callerReason);
        return createJsonResponse(body);
      },
    });

    await expect(
      reader.read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
        signal: controller.signal,
      }),
    ).rejects.toBe(callerReason);
    expect(bodyCancellationReason).toBe(callerReason);
  });

  test("classifies an injected body-stream failure and releases the reader", async () => {
    let bodyReaderWasReleased = false;
    const privateStreamError = new Error("private stream failure");
    const response = {
      status: 200,
      redirected: false,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: {
        getReader() {
          return {
            async read() {
              throw privateStreamError;
            },
            async cancel() {},
            releaseLock() {
              bodyReaderWasReleased = true;
            },
          };
        },
      },
    };
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(response),
    });
    const error = await reader
      .read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
      })
      .catch((caughtError) => caughtError);

    expect(error).toMatchObject({ failureKind: "network" });
    expect(error.cause).toBe(privateStreamError);
    expect(bodyReaderWasReleased).toBe(true);
  });

  test("accepts a structured application JSON media type", async () => {
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(
        new Response("{}\n", {
          headers: {
            "Content-Type":
              "application/vnd.universal-ontology.query+json; charset=utf-8",
          },
        }),
      ),
    });

    await expect(
      reader.read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).resolves.toMatchObject({ retrievalStatus: "fetched" });
  });

  test("sends both bounded conditional validators and accepts only then a 304", async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      new Response(null, {
        status: 304,
        headers: {
          ETag: 'W/"representation-2"',
          "Last-Modified": "Mon, 31 Aug 2026 10:00:00 GMT",
        },
      }),
    );
    const reader = createReader({ fetchImplementation });

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
        conditionalRequestValidator: {
          entityTag: '"representation-1"',
          lastModifiedHttpDate: "Sun, 30 Aug 2026 10:00:00 GMT",
        },
      }),
    ).resolves.toEqual({
      retrievalStatus: "not_modified",
      responseValidator: {
        entityTag: 'W/"representation-2"',
        lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
      },
    });
    expect(fetchImplementation.mock.calls[0][1].headers).toEqual({
      Accept: "application/json",
      "If-None-Match": '"representation-1"',
      "If-Modified-Since": "Sun, 30 Aug 2026 10:00:00 GMT",
    });
  });

  test("rejects malformed conditional metadata before Fetch", async () => {
    const fetchImplementation = jest.fn();
    const reader = createReader({ fetchImplementation });

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
        conditionalRequestValidator: {
          entityTag: "not-an-entity-tag",
          lastModifiedHttpDate: null,
        },
      }),
    ).rejects.toThrow();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("ignores each malformed response validator without discarding the valid peer", async () => {
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(
        createJsonResponse("{}\n", {
          headers: {
            ETag: "not-an-entity-tag",
            "Last-Modified": "Mon, 31 Aug 2026 10:00:00 GMT",
          },
        }),
      ),
    });

    await expect(
      reader.read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).resolves.toMatchObject({
      responseValidator: {
        entityTag: null,
        lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
      },
    });
  });

  test("cancels a decoded body immediately after it exceeds the byte ceiling", async () => {
    let cancellationReason;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1_024));
        controller.enqueue(Uint8Array.of(1));
      },
      cancel(reason) {
        cancellationReason = reason;
      },
    });
    const reader = createReader({
      fetchImplementation: jest
        .fn()
        .mockResolvedValue(createJsonResponse(body)),
    });

    await expect(
      reader.read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "decoded_body_too_large" });
    expect(cancellationReason).toBeInstanceOf(
      HttpOntologyQueryArtifactReadError,
    );
  });

  test("distinguishes its fixed timeout from a caller cancellation", async () => {
    const fetchImplementation = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const reader = createReader({
      fetchImplementation,
      requestTimeoutMilliseconds: 20,
    });

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({
      name: "HttpOntologyQueryArtifactReadError",
      failureKind: "timeout",
    });

    const callerController = new AbortController();
    const callerReason = new DOMException("caller stopped", "AbortError");
    const callerRead = reader.read({
      relativePath: "channels/stable.json",
      maximumDecodedByteLength: 1_024,
      signal: callerController.signal,
    });
    callerController.abort(callerReason);
    await expect(callerRead).rejects.toBe(callerReason);
  });

  test("cancels and releases an acquired body reader when the caller stops", async () => {
    let cancellationReason;
    let bodyReaderWasReleased = false;
    let pendingReadResolve;
    let readInvocationCount = 0;
    const response = {
      status: 200,
      redirected: false,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: {
        getReader() {
          return {
            async read() {
              readInvocationCount += 1;

              if (readInvocationCount === 1) {
                return { done: false, value: Uint8Array.of(0x7b) };
              }

              return new Promise((resolve) => {
                pendingReadResolve = resolve;
              });
            },
            async cancel(reason) {
              cancellationReason = reason;
              pendingReadResolve?.({ done: true, value: undefined });
            },
            releaseLock() {
              bodyReaderWasReleased = true;
            },
          };
        },
      },
    };
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(response),
    });
    const controller = new AbortController();
    const callerReason = new DOMException("caller stopped", "AbortError");
    const read = reader.read({
      relativePath: "catalogs/artifact.json",
      maximumDecodedByteLength: 1_024,
      signal: controller.signal,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort(callerReason);

    await expect(read).rejects.toBe(callerReason);
    expect(cancellationReason).toBe(callerReason);
    expect(bodyReaderWasReleased).toBe(true);
  });

  test("cancels and releases an acquired body reader on timeout", async () => {
    let cancellationReason;
    let bodyReaderWasReleased = false;
    let pendingReadResolve;
    const response = {
      status: 200,
      redirected: false,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: {
        getReader() {
          return {
            read() {
              return new Promise((resolve) => {
                pendingReadResolve = resolve;
              });
            },
            async cancel(reason) {
              cancellationReason = reason;
              pendingReadResolve?.({ done: true, value: undefined });
            },
            releaseLock() {
              bodyReaderWasReleased = true;
            },
          };
        },
      },
    };
    const reader = createReader({
      fetchImplementation: jest.fn().mockResolvedValue(response),
      requestTimeoutMilliseconds: 20,
    });

    await expect(
      reader.read({
        relativePath: "catalogs/artifact.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "timeout" });
    expect(cancellationReason).toMatchObject({ failureKind: "timeout" });
    expect(bodyReaderWasReleased).toBe(true);
  });

  test("rejects an already-cancelled caller before Fetch", async () => {
    const fetchImplementation = jest.fn();
    const reader = createReader({ fetchImplementation });
    const controller = new AbortController();
    const cancellationReason = new DOMException("cancelled", "AbortError");
    controller.abort(cancellationReason);

    await expect(
      reader.read({
        relativePath: "channels/stable.json",
        maximumDecodedByteLength: 1_024,
        signal: controller.signal,
      }),
    ).rejects.toBe(cancellationReason);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});

describe("HTTP ontology query-artifact reader loopback integration", () => {
  let fixture;

  beforeEach(async () => {
    fixture = await createOntologyQueryArtifactHttpFixture();
  });

  afterEach(async () => {
    await fixture.close();
  });

  function createLoopbackReader(overrides = {}) {
    return createHttpOntologyQueryArtifactReader({
      ontologyQueryArtifactBaseUrl: fixture.ontologyQueryArtifactBaseUrl,
      allowInsecureLoopbackOntologyQueryArtifactOrigin: true,
      requestTimeoutMilliseconds: 1_000,
      ...overrides,
    });
  }

  test("returns identical canonical bytes and digest for identity, Gzip, and Brotli", async () => {
    const canonicalBytes = Buffer.from(
      `${JSON.stringify({ payload: "compressible".repeat(128) })}\n`,
      "utf8",
    );

    for (const contentEncoding of ["identity", "gzip", "br"]) {
      fixture.setResponse(`${contentEncoding}.json`, {
        bodyBytes: canonicalBytes,
        contentEncoding,
      });
    }

    const reader = createLoopbackReader();
    const expectedSha256 = await calculateSha256(canonicalBytes);

    for (const contentEncoding of ["identity", "gzip", "br"]) {
      const result = await reader.read({
        relativePath: `${contentEncoding}.json`,
        maximumDecodedByteLength: canonicalBytes.byteLength,
      });
      expect(result.retrievalStatus).toBe("fetched");
      expect(Buffer.from(result.bytes)).toEqual(canonicalBytes);
      expect(await calculateSha256(result.bytes)).toBe(expectedSha256);
    }

    expect(
      fixture.requestRecords.map(({ requestTarget }) => requestTarget),
    ).toEqual([
      "/ontology/query/v1/identity.json",
      "/ontology/query/v1/gzip.json",
      "/ontology/query/v1/br.json",
    ]);
    expect(JSON.stringify(fixture.requestRecords)).not.toContain("queryText");
  });

  test("bounds decoded chunked bytes rather than compressed Content-Length", async () => {
    const canonicalBytes = Buffer.from(
      `${JSON.stringify({ payload: "z".repeat(4_096) })}\n`,
      "utf8",
    );
    fixture.setResponse("compressed.json", {
      bodyBytes: canonicalBytes,
      contentEncoding: "br",
      chunkByteLength: 7,
    });
    fixture.setResponse("oversized.json", {
      bodyBytes: Buffer.alloc(1_025, 0x20),
      chunkByteLength: 256,
    });
    const reader = createLoopbackReader();

    await expect(
      reader.read({
        relativePath: "compressed.json",
        maximumDecodedByteLength: canonicalBytes.byteLength,
      }),
    ).resolves.toMatchObject({ retrievalStatus: "fetched" });
    await expect(
      reader.read({
        relativePath: "oversized.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "decoded_body_too_large" });
  });

  test("reads a true chunked response without a declared length", async () => {
    const canonicalBytes = Buffer.from('{"chunked":true}\n', "utf8");
    fixture.setResponse("chunked.json", {
      bodyBytes: canonicalBytes,
      chunkByteLength: 2,
      omitContentLength: true,
    });
    const reader = createLoopbackReader();

    const result = await reader.read({
      relativePath: "chunked.json",
      maximumDecodedByteLength: canonicalBytes.byteLength,
    });
    expect(Buffer.from(result.bytes)).toEqual(canonicalBytes);
  });

  test("rejects a truncated identity response as a transport failure", async () => {
    fixture.setResponse("truncated.json", {
      bodyBytes: Buffer.from('{"complete":true}\n', "utf8"),
      truncateAfterByteLength: 4,
    });
    const reader = createLoopbackReader();

    await expect(
      reader.read({
        relativePath: "truncated.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "network" });
  });

  test("times out a delayed origin and records no URL search component", async () => {
    fixture.setResponse("delayed.json", {
      bodyBytes: Buffer.from("{}\n", "utf8"),
      delayBeforeHeadersMilliseconds: 200,
    });
    const reader = createLoopbackReader({ requestTimeoutMilliseconds: 30 });

    await expect(
      reader.read({
        relativePath: "delayed.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "timeout" });
    await fixture.waitForRequestCount(1);
    expect(fixture.requestRecords[0].requestTarget).toBe(
      "/ontology/query/v1/delayed.json",
    );
  });

  test("refuses an actual redirect without requesting its target", async () => {
    fixture.setResponse("redirected.json", {
      status: 302,
      headers: {
        Location: `${fixture.ontologyQueryArtifactBaseUrl}target.json`,
      },
    });
    fixture.setResponse("target.json", {
      bodyBytes: Buffer.from("{}\n", "utf8"),
    });
    const reader = createLoopbackReader();

    await expect(
      reader.read({
        relativePath: "redirected.json",
        maximumDecodedByteLength: 1_024,
      }),
    ).rejects.toMatchObject({ failureKind: "network" });
    expect(
      fixture.requestRecords.map(({ requestTarget }) => requestTarget),
    ).toEqual(["/ontology/query/v1/redirected.json"]);
  });

  test("performs an actual conditional request and returns 304 metadata", async () => {
    fixture.setResponse("conditional.json", (requestRecord) => {
      if (
        requestRecord.headers["if-none-match"] === '"current"' &&
        requestRecord.headers["if-modified-since"] ===
          "Sun, 30 Aug 2026 10:00:00 GMT"
      ) {
        return {
          status: 304,
          headers: {
            ETag: '"current"',
            "Last-Modified": "Mon, 31 Aug 2026 10:00:00 GMT",
          },
        };
      }

      return { status: 412 };
    });
    const reader = createLoopbackReader();

    await expect(
      reader.read({
        relativePath: "conditional.json",
        maximumDecodedByteLength: 1_024,
        conditionalRequestValidator: {
          entityTag: '"current"',
          lastModifiedHttpDate: "Sun, 30 Aug 2026 10:00:00 GMT",
        },
      }),
    ).resolves.toEqual({
      retrievalStatus: "not_modified",
      responseValidator: {
        entityTag: '"current"',
        lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
      },
    });
  });
});
