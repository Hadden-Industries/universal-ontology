import { jest } from "@jest/globals";

import {
  createUniversalOntologyMcpFetchHandler,
  UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES,
} from "../src/universalOntologyMcpHttpHandlers.js";

const MCP_URL = "http://127.0.0.1:8000/mcp";
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

function createOntologyQueryStub() {
  return {
    searchOntologyEntities: jest.fn(async (input) => ({
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
    resolveOntologyEntity: jest.fn(async (input) => ({
      outcome: "success",
      resultKind: "ontology_entity_resolution",
      resolutionStatus: "not_found",
      requestedEntityIdentifier: input.entityIdentifier,
      preferredLanguageTags: input.preferredLanguageTags,
      resolvedOntologyReleases: [RESOLVED_RELEASE],
      ontologyEntities: [],
    })),
  };
}

function createHandler() {
  const ontologyQuery = createOntologyQueryStub();
  const onError = jest.fn();
  const responseModeWarning = jest
    .spyOn(console, "warn")
    .mockImplementation(() => {});
  let handler;

  try {
    handler = createUniversalOntologyMcpFetchHandler({
      ontologyQuery,
      onError,
    });
  } finally {
    responseModeWarning.mockRestore();
  }

  return { handler, ontologyQuery, onError };
}

function modernEnvelope(
  method,
  params = {},
  protocolVersion = MODERN_PROTOCOL_VERSION,
) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: protocolVersion,
        [CLIENT_INFO_META_KEY]: {
          name: "universal-ontology-wire-test",
          version: "1.0.0",
        },
        [CLIENT_CAPABILITIES_META_KEY]: {},
      },
    },
  };
}

function modernRequest(
  method,
  params = {},
  {
    protocolVersion = MODERN_PROTOCOL_VERSION,
    bodyProtocolVersion = protocolVersion,
    headers = {},
    body,
  } = {},
) {
  const requestHeaders = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-protocol-version": protocolVersion,
    "mcp-method": method,
    ...headers,
  });

  if (method === "tools/call" && params.name) {
    requestHeaders.set("mcp-name", params.name);
  }

  return new Request(MCP_URL, {
    method: "POST",
    headers: requestHeaders,
    body:
      body ??
      JSON.stringify(modernEnvelope(method, params, bodyProtocolVersion)),
  });
}

async function readJsonResponse(response) {
  return {
    response,
    body: await response.json(),
  };
}

describe("Universal Ontology MCP HTTP handler", () => {
  test("accepts complete modern metadata and never creates a session", async () => {
    const { handler } = createHandler();

    try {
      for (const [method, params] of [
        ["server/discover", {}],
        ["tools/list", {}],
        [
          "tools/call",
          { name: "search_entities", arguments: { queryText: "Person" } },
        ],
      ]) {
        const request = modernRequest(method, params, {
          headers: { "mcp-session-id": "incoming-affinity-only" },
        });
        const { response, body } = await readJsonResponse(
          await handler.fetch(request),
        );

        expect(response.status).toBe(200);
        expect(body).toHaveProperty("result");
        expect(response.headers.has("mcp-session-id")).toBe(false);
      }
    } finally {
      await handler.close();
    }
  });

  test.each([
    ["missing protocol header", { "mcp-protocol-version": "" }],
    ["missing method header", { "mcp-method": "" }],
    ["malformed protocol header", { "mcp-protocol-version": "not a version" }],
  ])("rejects %s as a HeaderMismatch", async (_label, headerOverrides) => {
    const { handler } = createHandler();

    try {
      const { response, body } = await readJsonResponse(
        await handler.fetch(
          modernRequest("tools/list", {}, { headers: headerOverrides }),
        ),
      );
      expect(response.status).toBe(400);
      expect(body.error).toMatchObject({ code: -32020 });
      expect(body.error.code).not.toBe(-32002);
    } finally {
      await handler.close();
    }
  });

  test("rejects header/body metadata disagreement", async () => {
    const { handler } = createHandler();

    try {
      const { response, body } = await readJsonResponse(
        await handler.fetch(
          modernRequest(
            "tools/list",
            {},
            {
              headers: { "mcp-method": "server/discover" },
            },
          ),
        ),
      );
      expect(response.status).toBe(400);
      expect(body.error).toMatchObject({ code: -32020 });
    } finally {
      await handler.close();
    }
  });

  test("reports the stable unsupported-version correction payload", async () => {
    const { handler } = createHandler();

    try {
      const requested = "2099-01-01";
      const { response, body } = await readJsonResponse(
        await handler.fetch(
          modernRequest("server/discover", {}, { protocolVersion: requested }),
        ),
      );
      expect(response.status).toBe(400);
      expect(body.error).toMatchObject({
        code: -32022,
        data: {
          requested,
          supported: [MODERN_PROTOCOL_VERSION],
        },
      });
    } finally {
      await handler.close();
    }
  });

  test("uses modern method and parameter error codes", async () => {
    const { handler } = createHandler();

    try {
      const unknownMethod = await readJsonResponse(
        await handler.fetch(modernRequest("ontology/unknown")),
      );
      expect(unknownMethod.response.status).toBe(404);
      expect(unknownMethod.body.error).toMatchObject({ code: -32601 });

      const unknownTool = await readJsonResponse(
        await handler.fetch(
          modernRequest("tools/call", {
            name: "unknown_tool",
            arguments: {},
          }),
        ),
      );
      expect(unknownTool.body.error).toMatchObject({ code: -32602 });
      expect(unknownTool.body.error.code).not.toBe(-32002);

      const malformedCall = await readJsonResponse(
        await handler.fetch(modernRequest("tools/call", {})),
      );
      expect(malformedCall.body.error).toMatchObject({ code: -32602 });
    } finally {
      await handler.close();
    }
  });

  test.each([
    ["wrong content type", { "content-type": "text/plain" }, undefined, 415],
    ["malformed JSON", {}, "{", 400],
  ])(
    "rejects %s without invoking the query module",
    async (_label, headers, body, expectedStatus) => {
      const { handler, ontologyQuery } = createHandler();

      try {
        const response = await handler.fetch(
          modernRequest("tools/list", {}, { headers, body }),
        );
        expect(response.status).toBe(expectedStatus);
        expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
        expect(ontologyQuery.resolveOntologyEntity).not.toHaveBeenCalled();
      } finally {
        await handler.close();
      }
    },
  );

  test("retains native era-specific handling of an incomplete Accept header", async () => {
    const { handler } = createHandler();
    try {
      // The client still owes both media types. The modern server is not
      // required to reproduce the legacy transport's 406 for this bad client.
      const modern = await handler.fetch(
        modernRequest(
          "tools/list",
          {},
          { headers: { accept: "application/json" } },
        ),
      );
      expect(modern.status).toBe(200);
      expect(
        (await modern.json()).result.tools.map(({ name }) => name),
      ).toEqual(["search_entities", "resolve_entity"]);
      const legacy = await handler.fetch(
        new Request(MCP_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-11-25",
              capabilities: {},
              clientInfo: {
                name: "legacy-representation-test",
                version: "1.0.0",
              },
            },
          }),
        }),
      );
      expect(legacy.status).toBe(406);
      expect((await legacy.json()).error.code).toBe(-32000);
    } finally {
      await handler.close();
    }
  });

  test("uses original Fetch bytes even when a caller supplies an unrelated parsedBody", async () => {
    const { handler, ontologyQuery } = createHandler();
    try {
      const response = await handler.fetch(
        modernRequest("tools/list", {}, { body: "{" }),
        { parsedBody: modernEnvelope("tools/list") },
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe(-32700);
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
    } finally {
      await handler.close();
    }
  });

  test.each([
    [131072, 200],
    [131073, 413],
  ])(
    "bounds standalone UTF-8 Fetch streams at %i bytes",
    async (byteLength, expectedStatus) => {
      const { handler } = createHandler();
      const message = modernEnvelope("tools/list");
      message.params._meta["example.test/padding"] = "é";
      const encodedMessage = new TextEncoder().encode(JSON.stringify(message));
      const bytes = new Uint8Array(byteLength).fill(32);
      bytes.set(encodedMessage);
      let cancelled = false;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.subarray(0, 65536));
          controller.enqueue(bytes.subarray(65536));
          // Keep the oversized stream open: the guard must cancel after crossing
          // the limit rather than waiting for an attacker to finish sending.
          if (expectedStatus === 200) controller.close();
        },
        cancel() {
          cancelled = true;
        },
      });
      try {
        const response = await handler.fetch(
          new Request(MCP_URL, {
            method: "POST",
            headers: modernRequest("tools/list").headers,
            body: stream,
            duplex: "half",
          }),
        );
        expect(response.status).toBe(expectedStatus);
        expect(cancelled).toBe(expectedStatus === 413);
        if (expectedStatus === 200)
          expect((await response.json()).result.tools).toHaveLength(2);
        else expect(response.headers.get("connection")).toBe("close");
      } finally {
        await handler.close();
      }
    },
  );

  test("bounds streamed request bytes before SDK JSON parsing", async () => {
    const { handler, ontologyQuery } = createHandler();
    const oversizedBody = "x".repeat(
      UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES + 1,
    );

    try {
      const { response, body } = await readJsonResponse(
        await handler.fetch(
          modernRequest("tools/list", {}, { body: oversizedBody }),
        ),
      );
      expect(response.status).toBe(413);
      expect(response.headers.get("connection")).toBe("close");
      expect(body).toEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: "Request body exceeds 131072 bytes.",
        },
      });
      expect(ontologyQuery.searchOntologyEntities).not.toHaveBeenCalled();
    } finally {
      await handler.close();
    }
  });

  test("retains stateless legacy POST support and rejects session operations", async () => {
    const { handler } = createHandler();
    const legacyHeaders = {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    };

    try {
      const initializeResponse = await handler.fetch(
        new Request(MCP_URL, {
          method: "POST",
          headers: legacyHeaders,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "legacy-test", version: "1.0.0" },
            },
          }),
        }),
      );
      expect(initializeResponse.status).toBe(200);
      expect(initializeResponse.headers.has("mcp-session-id")).toBe(false);

      for (const method of ["GET", "DELETE"]) {
        const response = await handler.fetch(
          new Request(MCP_URL, { method, headers: legacyHeaders }),
        );
        expect(response.status).toBe(405);
        expect(response.headers.has("mcp-session-id")).toBe(false);
      }
    } finally {
      await handler.close();
    }
  });
});
