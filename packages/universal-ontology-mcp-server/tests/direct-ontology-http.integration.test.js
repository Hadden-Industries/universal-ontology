import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runLocalOntologyMcpServer } from "../scripts/runLocalOntologyMcpServer.js";

test("two HTTP agents share admitted views and cannot widen the operator's source authority", async () => {
  const source = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/definition-occurrences.ttl",
      import.meta.url,
    ),
  );
  const signals = ["SIGTERM", "SIGINT"].map((signal) => [
    signal,
    new Set(process.listeners(signal)),
  ]);
  const server = await runLocalOntologyMcpServer({
    environment: {},
    arguments: [`--ontology-file=${source}`],
    configuration: { port: 0 },
  });
  const url = new URL(
    `http://127.0.0.1:${server.httpServer.address().port}/mcp`,
  );
  const clients = [1, 2].map(
    (n) => new Client({ name: `local-http-agent-${n}`, version: "1" }),
  );
  try {
    for (const c of clients)
      await c.connect(new StreamableHTTPClientTransport(url));
    const call = async (n, name, args = {}) =>
      clients[n].callTool({ name, arguments: args });
    const found = await call(0, "search_entities", { queryText: "record" });
    const handle = found.structuredContent.matches[0].entityHandle;
    const exact = await call(1, "resolve_entity", {
      name: handle.iri,
      ontologyId: handle.ontologyId,
    });
    expect(exact.structuredContent.matches[0].entityHandle).toEqual(handle);
    expect(
      (await call(1, "get_entity_context", { entityHandle: handle, depth: 0 }))
        .structuredContent.context.entityIri,
    ).toBe(handle.iri);
    expect(
      (
        await call(0, "find_entity_connections", {
          entityHandle: handle,
          targetEntityHandle: handle,
          depth: 0,
        })
      ).structuredContent.status,
    ).toBe("paths_found");
    expect(
      (await call(1, "open_ontology", { path: fileURLToPath(import.meta.url) }))
        .structuredContent.error.errorCode,
    ).toBe("ONTOLOGY_SOURCE_DENIED");
    expect(
      (await call(1, "list_ontologies")).structuredContent.ontologies[0]
        .ontologyId,
    ).toBe(handle.ontologyId);
  } finally {
    await Promise.all(clients.map((c) => c.close()));
    await server.shutdown();
    for (const [signal, original] of signals)
      for (const handler of process.listeners(signal))
        if (!original.has(handler)) process.off(signal, handler);
  }
}, 30000);

test("stdio and loopback HTTP return equivalent search pages, cards, citations and recovery", async () => {
  const file = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/community-glossary.ttl",
      import.meta.url,
    ),
  );
  const root = dirname(file);
  const secondFile = join(root, "definition-occurrences.ttl");
  const args = [`--ontology-file=${file}`, `--ontology-root=${root}`];
  const entry = fileURLToPath(
    new URL(
      "../scripts/runUniversalOntologyMcpStdioServer.js",
      import.meta.url,
    ),
  );
  const signals = ["SIGINT", "SIGTERM"].map((s) => [
    s,
    new Set(process.listeners(s)),
  ]);
  const server = await runLocalOntologyMcpServer({
    environment: {},
    arguments: args,
    configuration: { port: 0 },
  });
  const clients = [0, 1].map(
    (n) => new Client({ name: `transport-parity-${n}`, version: "1" }),
  );
  try {
    await clients[0].connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [entry, ...args],
        stderr: "pipe",
      }),
    );
    await clients[1].connect(
      new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${server.httpServer.address().port}/mcp`),
      ),
    );
    async function journey(client) {
      const call = async (name, args = {}) =>
        client.callTool({ name, arguments: args });
      const initial = (await call("list_ontologies")).structuredContent
        .ontologies[0];
      const open = await call("open_ontology", { path: file });
      expect(open.structuredContent.ontologyId).toBe(initial.ontologyId);
      const second = (await call("open_ontology", { path: secondFile }))
        .structuredContent;
      const only = (
        await call("search_entities", {
          queryText: "record",
          ontologyIds: [second.ontologyId],
        })
      ).structuredContent;
      expect(
        only.matches.every(
          (hit) => hit.entityHandle.ontologyId === second.ontologyId,
        ),
      ).toBe(true);
      const pg = await call("search_entities", {
        ontologyIds: [second.ontologyId, initial.ontologyId],
        queryText: "record",
        maximumResultCount: 1,
      });
      const third = (
        await call("open_ontology", {
          path: secondFile,
          parsingMode: "preserve",
        })
      ).structuredContent;
      expect(third.ontologyId).not.toBe(second.ontologyId);
      const next = await call("search_entities", {
        cursor: pg.structuredContent.nextCursor,
        maximumResultCount: 1,
      });
      const gathered = [
        ...pg.structuredContent.matches,
        ...next.structuredContent.matches,
      ];
      let cursor = next.structuredContent.nextCursor;
      while (cursor) {
        const page = (await call("search_entities", { cursor }))
          .structuredContent;
        gathered.push(...page.matches);
        cursor = page.nextCursor;
      }
      expect(new Set(gathered.map((m) => m.entityHandle.ontologyId))).toEqual(
        new Set([initial.ontologyId, second.ontologyId]),
      );
      const otherCard = (
        await call("get_entity_context", {
          entityHandle: only.matches[0].entityHandle,
          depth: 0,
        })
      ).structuredContent;
      expect(otherCard.context.nodes[0].definitions[0].term.value).toBe(
        "A recorded entry.",
      );
      const exact = await call("resolve_entity", {
        name: "G.1",
        ontologyId: initial.ontologyId,
      });
      const handle = exact.structuredContent.matches[0].entityHandle;
      const card = await call("get_entity_context", {
        entityHandle: handle,
        depth: 0,
      });
      const citation =
        card.structuredContent.context.nodes[0].entitySources.find(
          (s) => s.object.termType === "BlankNode",
        ).sourceDescription;
      const source = await call("get_entity_context", {
        resourceHandle: citation.resourceHandle,
      });
      const links = await call("find_entity_connections", {
        entityHandle: handle,
        targetEntityHandle: handle,
        depth: 0,
      });
      await call("close_ontology", { ontologyId: initial.ontologyId });
      const expired = await call("get_entity_context", {
        entityHandle: handle,
        depth: 0,
      });
      return {
        hits: [pg, next].map(
          (p) => p.structuredContent.matches[0].entityHandle.iri,
        ),
        card: card.content[0].text.includes("A written account."),
        source: source.structuredContent.statements[0].object.value,
        links: links.structuredContent.status,
        error: expired.structuredContent.error,
      };
    }
    const [stdio, http] = await Promise.all(clients.map(journey));
    expect(stdio).toEqual(http);
    expect(stdio.card).toBe(true);
    expect(stdio.source).toBe("Community handbook, 4");
    expect(stdio.error.errorCode).toBe("UNKNOWN_ONTOLOGY_RELEASE");
  } finally {
    await Promise.all(clients.map((c) => c.close()));
    await server.shutdown();
    for (const [s, old] of signals)
      for (const fn of process.listeners(s))
        if (!old.has(fn)) process.off(s, fn);
  }
}, 30000);
