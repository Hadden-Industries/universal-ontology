import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { request as requestHttp } from "node:http";
import { connect as connectTcp } from "node:net";
import { resolve } from "node:path";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { jest } from "@jest/globals";

import {
  createLocalUniversalOntologyMcpServer,
  installLocalOntologyMcpShutdownSignalHandlers,
  LOCAL_ONTOLOGY_MCP_BIND_ADDRESS,
  LOCAL_ONTOLOGY_MCP_HEALTH_PATH,
  LOCAL_ONTOLOGY_MCP_PATH,
  readLocalOntologyMcpServerConfiguration,
  runLocalOntologyMcpServer,
} from "../../scripts/runLocalOntologyMcpServer.js";
import { UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES } from "../../src/mcp/createUniversalOntologyMcpHttpHandler.js";

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
const CLIENT_INFO_META_KEY = "io.modelcontextprotocol/clientInfo";
const CLIENT_CAPABILITIES_META_KEY =
  "io.modelcontextprotocol/clientCapabilities";
const RESOLVED_RELEASE = Object.freeze({
  ontologyArtifactFamilyId: "universal/core",
  versionTag: "20260830",
  sourceArtifactUrl:
    "https://haddenindustries.com/ontology/universal/core/20260830",
  sourceArtifactSha256: "a".repeat(64),
  ontologyIri: "https://haddenindustries.com/ontology/universal/core",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260830",
});

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createOntologyQueryStub(overrides = {}) {
  return {
    searchOntologyEntities: jest.fn(
      overrides.searchOntologyEntities ??
        (async (input) => ({
          outcome: "success",
          resultKind: "ontology_entity_search",
          queryText: input.queryText.trim(),
          preferredLanguageTags: input.preferredLanguageTags,
          resolvedOntologyReleases: [RESOLVED_RELEASE],
          totalMatchedEntityCount: 0,
          returnedEntityCount: 0,
          resultSetTruncated: false,
          matches: [],
        })),
    ),
    resolveOntologyEntity: jest.fn(
      overrides.resolveOntologyEntity ??
        (async (input) => ({
          outcome: "success",
          resultKind: "ontology_entity_resolution",
          resolutionStatus: "not_found",
          requestedEntityIdentifier: input.entityIdentifier,
          preferredLanguageTags: input.preferredLanguageTags,
          resolvedOntologyReleases: [RESOLVED_RELEASE],
          ontologyEntities: [],
        })),
    ),
  };
}

function modernEnvelope(id, method, params = {}) {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
        [CLIENT_INFO_META_KEY]: {
          name: "local-server-integration-test",
          version: "1.0.0",
        },
        [CLIENT_CAPABILITIES_META_KEY]: {},
      },
    },
  };
}

function modernFetchOptions(id, method, params = {}) {
  const headers = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-protocol-version": MODERN_PROTOCOL_VERSION,
    "mcp-method": method,
  };

  if (method === "tools/call" && params.name) {
    headers["mcp-name"] = params.name;
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify(modernEnvelope(id, method, params)),
  };
}

async function startServer(options = {}) {
  const responseModeWarning = jest
    .spyOn(console, "warn")
    .mockImplementation(() => {});
  let localServer;

  try {
    localServer = createLocalUniversalOntologyMcpServer({
      ontologyQuery: options.ontologyQuery ?? createOntologyQueryStub(),
      catalogReady: true,
      writeLogEvent: () => {},
      ...options,
    });
  } finally {
    responseModeWarning.mockRestore();
  }

  const address = await localServer.listen({ port: 0 });
  return {
    localServer,
    address,
    mcpUrl: new URL(
      LOCAL_ONTOLOGY_MCP_PATH,
      `http://${LOCAL_ONTOLOGY_MCP_BIND_ADDRESS}:${address.port}`,
    ),
  };
}

async function rawHttpRequest({
  port,
  path = "/mcp",
  method = "POST",
  headers,
  body = "",
}) {
  return new Promise((resolve, reject) => {
    const request = requestHttp(
      {
        host: LOCAL_ONTOLOGY_MCP_BIND_ADDRESS,
        port,
        path,
        method,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    request.end(body);
  });
}

async function rawPipelinedExchange({ port, bytes }) {
  return new Promise((resolve, reject) => {
    const socket = connectTcp({
      host: LOCAL_ONTOLOGY_MCP_BIND_ADDRESS,
      port,
    });
    const chunks = [];
    socket.on("connect", () => socket.write(bytes));
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    socket.on("error", reject);
  });
}

async function connectClient(mcpUrl, modern) {
  const client = new Client(
    { name: "local-server-official-client", version: "1.0.0" },
    modern ? { versionNegotiation: { mode: "auto" } } : undefined,
  );
  const transport = new StreamableHTTPClientTransport(mcpUrl);
  await client.connect(transport);
  return client;
}

function spawnShutdownFixture() {
  const child = spawn(
    process.execPath,
    [resolve("tests", "fixtures", "mcp", "localOntologyMcpShutdownFixture.js")],
    {
      cwd: resolve("."),
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      windowsHide: true,
    },
  );
  const messages = [];
  const waiters = [];
  let standardError = "";
  let exitResult;

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    standardError += chunk;
  });

  child.on("message", (message) => {
    messages.push(message);
    const waiterIndex = waiters.findIndex(
      ({ messageType }) => message.type === messageType,
    );

    if (waiterIndex !== -1) {
      const [waiter] = waiters.splice(waiterIndex, 1);
      waiter.resolve(message);
    }
  });

  const exitPromise = new Promise((resolvePromise) => {
    child.once("exit", (exitCode, signalName) => {
      exitResult = { exitCode, signalName };
      resolvePromise(exitResult);

      for (const waiter of waiters.splice(0)) {
        waiter.reject(
          new Error(
            `Shutdown fixture exited before ${waiter.messageType}: ${standardError}`,
          ),
        );
      }
    });
  });

  function waitForMessage(messageType) {
    const queuedMessage = messages.find(
      (message) =>
        message.type === messageType && message.__testConsumed !== true,
    );

    if (queuedMessage) {
      // The marker is private test bookkeeping and never crosses IPC again.
      Object.defineProperty(queuedMessage, "__testConsumed", { value: true });
      return Promise.resolve(queuedMessage);
    }

    if (exitResult) {
      return Promise.reject(
        new Error(
          `Shutdown fixture exited before ${messageType}: ${standardError}`,
        ),
      );
    }

    return new Promise((resolvePromise, rejectPromise) => {
      waiters.push({
        messageType,
        resolve(message) {
          Object.defineProperty(message, "__testConsumed", { value: true });
          resolvePromise(message);
        },
        reject: rejectPromise,
      });
    });
  }

  async function terminateIfRunning() {
    if (exitResult) {
      return;
    }

    child.kill();
    await exitPromise;
  }

  return {
    child,
    messages,
    exitPromise,
    waitForMessage,
    terminateIfRunning,
  };
}

describe("local Universal Ontology MCP server socket seam", () => {
  test("reuses one shutdown promise across repeated termination signals", async () => {
    const signalEmitter = new EventEmitter();
    const shutdown = createDeferred();
    const localServer = {
      shutdown: jest.fn(() => shutdown.promise),
    };
    const observedExitCodes = [];
    const registration = installLocalOntologyMcpShutdownSignalHandlers({
      localServer,
      signalEmitter,
      setProcessExitCode: (exitCode) => observedExitCodes.push(exitCode),
    });

    signalEmitter.emit("SIGTERM");
    const firstShutdown = registration.beginShutdown();
    signalEmitter.emit("SIGINT");
    const repeatedShutdown = registration.beginShutdown();

    expect(firstShutdown).toBe(repeatedShutdown);
    expect(localServer.shutdown).toHaveBeenCalledTimes(1);
    shutdown.resolve({ forced: true });
    await expect(firstShutdown).resolves.toEqual({ forced: true });
    expect(observedExitCodes).toEqual([1]);

    registration.remove();
    signalEmitter.emit("SIGTERM");
    expect(localServer.shutdown).toHaveBeenCalledTimes(1);
  });

  test("requires an explicit boolean catalog readiness state", () => {
    expect(() =>
      createLocalUniversalOntologyMcpServer({
        ontologyQuery: createOntologyQueryStub(),
        catalogReady: "true",
        writeLogEvent: () => {},
      }),
    ).toThrow("catalogReady must be a boolean");
  });

  test("validates the narrow environment contract without exposing a bind override", () => {
    const projectRoot = resolve("test-project-root");
    expect(
      readLocalOntologyMcpServerConfiguration({
        projectRoot,
        environment: {
          UNIVERSAL_ONTOLOGY_MCP_PORT: "8123",
          UNIVERSAL_ONTOLOGY_QUERY_ROOT: "test-query-root",
          UNIVERSAL_ONTOLOGY_QUERY_CACHE_MAXIMUM_BYTES: "1048576",
          UNIVERSAL_ONTOLOGY_MCP_BIND_ADDRESS: "0.0.0.0",
        },
      }),
    ).toEqual({
      port: 8123,
      queryRoot: resolve("test-query-root"),
      maximumCacheByteSize: 1_048_576,
    });

    for (const environment of [
      { UNIVERSAL_ONTOLOGY_MCP_PORT: "0" },
      { UNIVERSAL_ONTOLOGY_MCP_PORT: "65536" },
      { UNIVERSAL_ONTOLOGY_MCP_PORT: "not-a-port" },
      { UNIVERSAL_ONTOLOGY_QUERY_CACHE_MAXIMUM_BYTES: "0" },
    ]) {
      expect(() =>
        readLocalOntologyMcpServerConfiguration({ environment, projectRoot }),
      ).toThrow();
    }
  });

  test("fails readiness before listening when the query root is unavailable", async () => {
    await expect(
      runLocalOntologyMcpServer({
        arguments: [],
        environment: {
          UNIVERSAL_ONTOLOGY_MCP_PORT: "65535",
          UNIVERSAL_ONTOLOGY_QUERY_ROOT: resolve(
            "tests",
            "fixtures",
            "mcp",
            "absent-query-root",
          ),
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
    });
  });

  test("binds loopback and serves health plus both protocol eras", async () => {
    const { localServer, address, mcpUrl } = await startServer();
    const clients = [];

    try {
      expect(address.address).toBe(LOCAL_ONTOLOGY_MCP_BIND_ADDRESS);
      const healthResponse = await fetch(
        new URL(LOCAL_ONTOLOGY_MCP_HEALTH_PATH, mcpUrl),
      );
      expect(healthResponse.status).toBe(200);
      await expect(healthResponse.json()).resolves.toEqual({
        status: "ready",
        catalogReady: true,
        primaryMcpProtocolVersion: MODERN_PROTOCOL_VERSION,
      });
      expect((await fetch(new URL("/missing", mcpUrl))).status).toBe(404);

      const results = [];

      for (const modern of [true, false]) {
        const client = await connectClient(mcpUrl, modern);
        clients.push(client);
        const searchResult = await client.callTool({
          name: "search_entities",
          arguments: { queryText: "Person" },
        });
        const resolveResult = await client.callTool({
          name: "resolve_entity",
          arguments: {
            entityIdentifier: {
              identifierKind: "preferred_label",
              identifierValue: "Missing",
            },
          },
        });
        results.push({
          search: searchResult.structuredContent,
          resolve: resolveResult.structuredContent,
        });
      }

      expect(results[0]).toEqual(results[1]);
    } finally {
      await Promise.all(clients.map((client) => client.close()));
      await localServer.shutdown();
    }
  });

  test("emits redacted structured events for accepted and rejected requests", async () => {
    const logEvents = [];
    const { localServer, mcpUrl } = await startServer({
      writeLogEvent: (event) => logEvents.push(event),
    });
    let client;

    try {
      expect((await fetch(new URL("/missing", mcpUrl))).status).toBe(404);
      client = await connectClient(mcpUrl, true);
      await client.callTool({
        name: "search_entities",
        arguments: { queryText: "DO_NOT_LOG_THIS_ONTOLOGY_QUERY" },
      });
    } finally {
      await client?.close();
      await localServer.shutdown();
    }

    expect(logEvents.map(({ eventName }) => eventName)).toEqual(
      expect.arrayContaining([
        "mcp_http_request_rejected",
        "mcp_request_completed",
        "mcp_server_shutdown",
      ]),
    );

    for (const event of logEvents) {
      expect(event).toEqual(
        expect.objectContaining({
          timestamp: expect.any(String),
          severity: expect.stringMatching(/^(?:info|warning|error)$/u),
          eventName: expect.any(String),
          correlationId: expect.any(String),
          durationMilliseconds: expect.any(Number),
          outcome: expect.any(String),
        }),
      );
      expect(
        event.safeErrorCode === null || typeof event.safeErrorCode === "string",
      ).toBe(true);
    }

    const serializedEvents = JSON.stringify(logEvents);
    expect(serializedEvents).not.toContain("DO_NOT_LOG_THIS_ONTOLOGY_QUERY");
    expect(serializedEvents).not.toContain(resolve("."));
  });

  test("keeps private failures and absolute repository paths off the wire", async () => {
    const privatePath = resolve("private", "ontology-index.json");
    const reportedErrors = [];
    const ontologyQuery = createOntologyQueryStub({
      async searchOntologyEntities() {
        throw new Error(`Private index failure at ${privatePath}`);
      },
    });
    const { localServer, mcpUrl } = await startServer({
      ontologyQuery,
      onError: (error) => reportedErrors.push(error),
    });

    try {
      const response = await fetch(
        mcpUrl,
        modernFetchOptions(1, "tools/call", {
          name: "search_entities",
          arguments: { queryText: "Person" },
        }),
      );
      const wireRepresentation = JSON.stringify({
        headers: Object.fromEntries(response.headers),
        body: await response.text(),
      });

      expect(response.status).toBe(200);
      expect(wireRepresentation).not.toContain(privatePath);
      expect(wireRepresentation).not.toContain(
        privatePath.replaceAll("\\", "/"),
      );
      expect(wireRepresentation).not.toContain(resolve("."));
      expect(reportedErrors).toHaveLength(1);
      expect(reportedErrors[0].message).toContain(privatePath);
    } finally {
      await localServer.shutdown();
    }
  });

  test.each([
    ["host", { host: "attacker.example" }],
    ["origin", { host: "127.0.0.1", origin: "https://attacker.example" }],
    ["opaque origin", { host: "127.0.0.1", origin: "null" }],
  ])("rejects hostile %s before querying", async (_label, hostileHeaders) => {
    const ontologyQuery = createOntologyQueryStub();
    const { localServer, address } = await startServer({ ontologyQuery });

    try {
      const response = await rawHttpRequest({
        port: address.port,
        headers: {
          ...hostileHeaders,
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          "content-length": "1",
        },
        body: "{",
      });
      expect(response.statusCode).toBe(403);
      expect(response.headers.connection).toBe("close");
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
      expect(ontologyQuery.resolveOntologyEntity).not.toHaveBeenCalled();
    } finally {
      await localServer.shutdown();
    }
  });

  test("allows a non-browser request with no Origin", async () => {
    const { localServer, mcpUrl } = await startServer();

    try {
      const response = await fetch(
        mcpUrl,
        modernFetchOptions(1, "server/discover"),
      );
      expect(response.status).toBe(200);
    } finally {
      await localServer.shutdown();
    }
  });

  test("enforces representation, JSON, batch, and byte bounds on the real listener", async () => {
    const ontologyQuery = createOntologyQueryStub();
    const { localServer, mcpUrl } = await startServer({ ontologyQuery });

    try {
      const wrongContentType = await fetch(mcpUrl, {
        ...modernFetchOptions(1, "server/discover"),
        headers: {
          ...modernFetchOptions(1, "server/discover").headers,
          "content-type": "text/plain",
        },
      });
      expect(wrongContentType.status).toBe(415);

      const incompleteAccept = await fetch(mcpUrl, {
        ...modernFetchOptions(2, "server/discover"),
        headers: {
          ...modernFetchOptions(2, "server/discover").headers,
          accept: "text/event-stream",
        },
      });
      expect(incompleteAccept.status).toBe(406);

      const malformed = await fetch(mcpUrl, {
        ...modernFetchOptions(3, "server/discover"),
        body: "{",
      });
      expect(malformed.status).toBe(400);
      await expect(malformed.json()).resolves.toMatchObject({
        error: { code: -32_700 },
      });

      const batch = await fetch(mcpUrl, {
        ...modernFetchOptions(4, "server/discover"),
        body: JSON.stringify([
          modernEnvelope(4, "server/discover"),
          modernEnvelope(5, "tools/list"),
        ]),
      });
      expect(batch.status).toBe(400);
      await expect(batch.json()).resolves.toMatchObject({
        error: { code: -32_600 },
      });

      const oversized = await fetch(mcpUrl, {
        ...modernFetchOptions(6, "server/discover"),
        body: "x".repeat(UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES + 1),
      });
      expect(oversized.status).toBe(413);
      expect(oversized.headers.get("connection")).toBe("close");
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
      expect(ontologyQuery.resolveOntologyEntity).not.toHaveBeenCalled();
    } finally {
      await localServer.shutdown();
    }
  });

  test("applies concurrency admission before reading or dispatching the ninth body", async () => {
    const allEntered = createDeferred();
    const releaseQueries = createDeferred();
    let enteredCount = 0;
    const ontologyQuery = createOntologyQueryStub({
      async searchOntologyEntities(input, { signal }) {
        enteredCount += 1;

        if (enteredCount === 8) {
          allEntered.resolve();
        }

        await Promise.race([
          releaseQueries.promise,
          new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
          }),
        ]);

        return createOntologyQueryStub().searchOntologyEntities(input);
      },
    });
    const { localServer, mcpUrl } = await startServer({ ontologyQuery });

    try {
      const activeRequests = Array.from({ length: 8 }, (_, index) =>
        fetch(
          mcpUrl,
          modernFetchOptions(index + 1, "tools/call", {
            name: "search_entities",
            arguments: { queryText: "Person" },
          }),
        ),
      );
      await allEntered.promise;
      const ninthResponse = await fetch(
        mcpUrl,
        modernFetchOptions(9, "tools/call", {
          name: "search_entities",
          arguments: { queryText: "Person" },
        }),
      );
      expect(ninthResponse.status).toBe(503);
      expect(ninthResponse.headers.get("retry-after")).toBe("1");
      expect(ninthResponse.headers.get("connection")).toBe("close");
      expect(enteredCount).toBe(8);

      releaseQueries.resolve();
      const completedResponses = await Promise.all(activeRequests);
      expect(completedResponses.every(({ status }) => status === 200)).toBe(
        true,
      );
    } finally {
      releaseQueries.resolve();
      await localServer.shutdown();
    }
  });

  test("refills the per-loopback token bucket only from injected monotonic time", async () => {
    let monotonicMilliseconds = 0;
    const { localServer, mcpUrl } = await startServer({
      readMonotonicMilliseconds: () => monotonicMilliseconds,
      rateLimitRequestsPerMinute: 60,
      rateLimitBurst: 1,
    });

    try {
      expect(
        (await fetch(mcpUrl, modernFetchOptions(1, "server/discover"))).status,
      ).toBe(200);
      const exhausted = await fetch(
        mcpUrl,
        modernFetchOptions(2, "server/discover"),
      );
      expect(exhausted.status).toBe(429);
      expect(exhausted.headers.get("retry-after")).toBe("1");

      monotonicMilliseconds += 1_000;
      expect(
        (await fetch(mcpUrl, modernFetchOptions(3, "server/discover"))).status,
      ).toBe(200);
    } finally {
      await localServer.shutdown();
    }
  });

  test("closes admission-rejected raw pipelines before a second request can route", async () => {
    const ontologyQuery = createOntologyQueryStub();
    const { localServer, address, mcpUrl } = await startServer({
      ontologyQuery,
      rateLimitRequestsPerMinute: 60,
      rateLimitBurst: 1,
      readMonotonicMilliseconds: () => 0,
    });
    const firstBody = "xxxx";
    const bytes =
      `POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:${address.port}\r\n` +
      `Content-Length: ${firstBody.length}\r\n\r\n${firstBody}` +
      `GET /healthz HTTP/1.1\r\nHost: 127.0.0.1:${address.port}\r\n\r\n`;

    try {
      expect(
        (await fetch(mcpUrl, modernFetchOptions(1, "server/discover"))).status,
      ).toBe(200);
      const responseText = await rawPipelinedExchange({
        port: address.port,
        bytes,
      });
      expect(responseText.match(/HTTP\/1\.1/gu)).toHaveLength(1);
      expect(responseText).toContain(" 429 ");
      expect(responseText.toLowerCase()).toContain("connection: close");
      expect(responseText).not.toContain('"status":"ready"');
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
    } finally {
      await localServer.shutdown();
    }
  });

  test("closes a guard-rejected raw pipeline before a second request can route", async () => {
    const ontologyQuery = createOntologyQueryStub();
    const { localServer, address } = await startServer({ ontologyQuery });
    const firstBody = "xxxx";
    const bytes =
      `POST /mcp HTTP/1.1\r\nHost: attacker.example\r\n` +
      `Content-Length: ${firstBody.length}\r\n\r\n${firstBody}` +
      `GET /healthz HTTP/1.1\r\nHost: 127.0.0.1:${address.port}\r\n\r\n`;

    try {
      const responseText = await rawPipelinedExchange({
        port: address.port,
        bytes,
      });
      expect(responseText.match(/HTTP\/1\.1/gu)).toHaveLength(1);
      expect(responseText).toContain(" 403 ");
      expect(responseText.toLowerCase()).toContain("connection: close");
      expect(responseText).not.toContain('"status":"ready"');
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
    } finally {
      await localServer.shutdown();
    }
  });

  test("propagates socket cancellation into the active ontology query", async () => {
    const queryEntered = createDeferred();
    const queryCancelled = createDeferred();
    let observedSignal;
    const ontologyQuery = createOntologyQueryStub({
      searchOntologyEntities: async (_input, { signal }) => {
        observedSignal = signal;
        queryEntered.resolve();
        return new Promise((resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              queryCancelled.resolve();
              reject(signal.reason);
            },
            { once: true },
          );
        });
      },
    });
    const { localServer, mcpUrl } = await startServer({ ontologyQuery });
    const controller = new AbortController();
    const requestPromise = fetch(mcpUrl, {
      ...modernFetchOptions(1, "tools/call", {
        name: "search_entities",
        arguments: { queryText: "Person" },
      }),
      signal: controller.signal,
    });

    try {
      await queryEntered.promise;
      controller.abort(new DOMException("caller cancelled", "AbortError"));
      await expect(requestPromise).rejects.toMatchObject({
        name: "AbortError",
      });
      await queryCancelled.promise;
      expect(observedSignal.aborted).toBe(true);
    } finally {
      controller.abort();
      await localServer.shutdown();
    }
  });

  test("drains active work before the shutdown deadline", async () => {
    const queryEntered = createDeferred();
    const releaseQuery = createDeferred();
    const deadline = createDeferred();
    let observedSignal;
    let queryCompleted = false;
    let cancelledWhileActive = false;
    const ontologyQuery = createOntologyQueryStub({
      async searchOntologyEntities(input, { signal }) {
        observedSignal = signal;
        signal.addEventListener(
          "abort",
          () => {
            if (!queryCompleted) {
              cancelledWhileActive = true;
            }
          },
          { once: true },
        );
        queryEntered.resolve();
        await releaseQuery.promise;
        const result =
          await createOntologyQueryStub().searchOntologyEntities(input);
        queryCompleted = true;
        return result;
      },
    });
    const { localServer, mcpUrl } = await startServer({
      ontologyQuery,
      waitForShutdownDeadline: () => deadline.promise,
    });
    const requestPromise = fetch(
      mcpUrl,
      modernFetchOptions(1, "tools/call", {
        name: "search_entities",
        arguments: { queryText: "Person" },
      }),
    );
    await queryEntered.promise;
    const firstShutdown = localServer.shutdown();
    const repeatedShutdown = localServer.shutdown();

    expect(firstShutdown).toBe(repeatedShutdown);
    expect(localServer.isDraining()).toBe(true);
    expect(observedSignal.aborted).toBe(false);
    releaseQuery.resolve();
    expect((await requestPromise).status).toBe(200);
    await expect(firstShutdown).resolves.toEqual({ forced: false });
    expect(cancelledWhileActive).toBe(false);
  });

  test("aborts active work only after the shutdown deadline", async () => {
    const queryEntered = createDeferred();
    const deadline = createDeferred();
    let observedSignal;
    const ontologyQuery = createOntologyQueryStub({
      searchOntologyEntities: async (_input, { signal }) => {
        observedSignal = signal;
        queryEntered.resolve();
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });
      },
    });
    const { localServer, mcpUrl } = await startServer({
      ontologyQuery,
      waitForShutdownDeadline: () => deadline.promise,
    });
    const requestPromise = fetch(
      mcpUrl,
      modernFetchOptions(1, "tools/call", {
        name: "search_entities",
        arguments: { queryText: "Person" },
      }),
    );
    await queryEntered.promise;
    const shutdownPromise = localServer.shutdown();

    expect(observedSignal.aborted).toBe(false);
    deadline.resolve();
    await expect(shutdownPromise).resolves.toEqual({ forced: true });
    expect(observedSignal.aborted).toBe(true);
    await expect(requestPromise).rejects.toBeDefined();
  });

  test("a spawned runner drains a pending request after SIGTERM without an orphan", async () => {
    const fixture = spawnShutdownFixture();

    try {
      const { port } = await fixture.waitForMessage("ready");
      const requestPromise = fetch(
        `http://${LOCAL_ONTOLOGY_MCP_BIND_ADDRESS}:${port}${LOCAL_ONTOLOGY_MCP_PATH}`,
        modernFetchOptions(1, "tools/call", {
          name: "search_entities",
          arguments: { queryText: "Person" },
        }),
      );
      await fixture.waitForMessage("query_entered");
      fixture.child.send({ type: "emit_sigterm" });
      await fixture.waitForMessage("listener_close_called");
      fixture.child.send({ type: "release_query" });

      const response = await requestPromise;
      expect(response.status).toBe(200);
      await response.text();
      await fixture.waitForMessage("query_completed");
      await fixture.waitForMessage("ontology_query_closed");
      const shutdownResult = await fixture.waitForMessage("shutdown_result");
      await expect(fixture.exitPromise).resolves.toEqual({
        exitCode: 0,
        signalName: null,
      });
      expect(shutdownResult.forced).toBe(false);
      expect(fixture.messages.map(({ type }) => type)).not.toContain(
        "query_cancelled",
      );

      const eventOrder = fixture.messages.map(({ type }) => type);
      expect(eventOrder.indexOf("listener_close_called")).toBeLessThan(
        eventOrder.indexOf("query_completed"),
      );
      expect(eventOrder.indexOf("query_completed")).toBeLessThan(
        eventOrder.indexOf("ontology_query_closed"),
      );
    } finally {
      await fixture.terminateIfRunning();
    }
  });

  test("a spawned runner cancels only after the SIGTERM deadline and exits non-zero", async () => {
    const fixture = spawnShutdownFixture();

    try {
      const { port } = await fixture.waitForMessage("ready");
      const requestPromise = fetch(
        `http://${LOCAL_ONTOLOGY_MCP_BIND_ADDRESS}:${port}${LOCAL_ONTOLOGY_MCP_PATH}`,
        modernFetchOptions(1, "tools/call", {
          name: "search_entities",
          arguments: { queryText: "Person" },
        }),
      );
      await fixture.waitForMessage("query_entered");
      fixture.child.send({ type: "emit_sigterm" });
      await fixture.waitForMessage("listener_close_called");
      await fixture.waitForMessage("shutdown_deadline_armed");
      expect(fixture.messages.map(({ type }) => type)).not.toContain(
        "query_cancelled",
      );
      fixture.child.send({ type: "expire_shutdown_deadline" });
      await fixture.waitForMessage("query_cancelled");
      await expect(requestPromise).rejects.toBeDefined();
      await fixture.waitForMessage("ontology_query_closed");
      const shutdownResult = await fixture.waitForMessage("shutdown_result");
      await expect(fixture.exitPromise).resolves.toEqual({
        exitCode: 1,
        signalName: null,
      });
      expect(shutdownResult.forced).toBe(true);

      const eventOrder = fixture.messages.map(({ type }) => type);
      expect(eventOrder.indexOf("shutdown_deadline_expired")).toBeLessThan(
        eventOrder.indexOf("query_cancelled"),
      );
      expect(eventOrder.indexOf("query_cancelled")).toBeLessThan(
        eventOrder.indexOf("ontology_query_closed"),
      );
    } finally {
      await fixture.terminateIfRunning();
    }
  });
});
