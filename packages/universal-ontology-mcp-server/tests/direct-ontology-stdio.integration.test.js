import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileOntologyWorkspace } from "universal-ontology-query/node";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "node:url";

test("the source stdio process opens a supplied file and follows a search hit", async () => {
  const source = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/definition-occurrences.ttl",
      import.meta.url,
    ),
  );
  const entry = fileURLToPath(
    new URL(
      "../scripts/runUniversalOntologyMcpStdioServer.js",
      import.meta.url,
    ),
  );
  const client = new Client({ name: "direct-stdio-agent", version: "1" });
  try {
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [entry, "--ontology-file=" + source],
        stderr: "pipe",
      }),
    );
    const call = async (name, args = {}) => {
      const r = await client.callTool({ name, arguments: args });
      expect(r.isError).not.toBe(true);
      return r.structuredContent;
    };
    const { ontologies } = await call("list_ontologies");
    expect(ontologies).toHaveLength(1);
    const { matches } = await call("search_entities", { queryText: "record" });
    expect(matches[0].label).toBe("record");
    const handle = matches[0].entityHandle;
    const resolved = await call("resolve_entity", { name: "record" });
    expect(resolved.matches[0].entityHandle).toEqual(handle);
    const card = await call("get_entity_context", {
      entityHandle: handle,
      depth: 0,
    });
    expect(card.context.nodes[0].definitions[0].occurrences).toHaveLength(2);
    const connections = await call("find_entity_connections", {
      entityHandle: handle,
      targetEntityHandle: handle,
      depth: 1,
    });
    expect(connections.context.entityIri).toBe(handle.iri);
    const denied = await client.callTool({
      name: "open_ontology",
      arguments: { path: entry },
    });
    expect(denied.isError).toBe(true);
    expect((await call("list_ontologies")).ontologies).toHaveLength(1);
  } finally {
    await client.close();
  }
}, 20000);

test("RDF/XML can be browsed from an unrelated working directory after rejected opens", async () => {
  const temp = await mkdtemp(join(tmpdir(), "ontology-stdio-"));
  const root = join(temp, "Données autorisées");
  const outside = join(temp, "outside");
  const source = join(root, "édition de référence");
  const rdf = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:dct="http://purl.org/dc/terms/" xmlns:skos="http://www.w3.org/2004/02/skos/core#"><owl:Ontology rdf:about="urn:test:edition"><dct:title>${"Épreuve".repeat(1000)}</dct:title></owl:Ontology><owl:Class rdf:about="urn:test:Example"><dct:identifier>ISBN:123</dct:identifier><skos:prefLabel xml:lang="fr">Épreuve</skos:prefLabel><skos:definition>${"Long definition. ".repeat(150)}</skos:definition></owl:Class></rdf:RDF>`;
  const client = new Client({ name: "file-admission", version: "1" });
  try {
    await Promise.all([mkdir(root), mkdir(outside)]);
    await Promise.all([
      writeFile(source, rdf),
      writeFile(join(outside, "other.rdf"), rdf),
      writeFile(join(root, "broken.rdf"), "<unfinished"),
      writeFile(join(root, "large.rdf"), ""),
    ]);
    await truncate(join(root, "large.rdf"), 32 * 1024 * 1024 + 1);
    await symlink(
      outside,
      join(root, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const entry = fileURLToPath(
      new URL(
        "../scripts/runUniversalOntologyMcpStdioServer.js",
        import.meta.url,
      ),
    );
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [entry, "--ontology-file=" + source, "--ontology-root=" + root],
        cwd: temp,
        stderr: "pipe",
      }),
    );
    const call = (name, args = {}) =>
      client.callTool({ name, arguments: args });
    const { ontologies } = (await call("list_ontologies")).structuredContent;
    expect(ontologies[0].title).toHaveLength(160);
    const handle = (await call("resolve_entity", { name: "Épreuve" }))
      .structuredContent.matches[0].entityHandle;
    expect(
      (await call("resolve_entity", { name: "ISBN:123" })).structuredContent
        .matches[0].entityHandle,
    ).toEqual(handle);
    expect(
      (await call("resolve_entity", { name: "urn:test:EXAMPLE" }))
        .structuredContent.matches,
    ).toEqual([]);
    expect(
      (
        await call("search_entities", {
          queryText: "Épreuve",
          maximumResultCount: 1,
        })
      ).structuredContent.matches[0].source,
    ).toHaveLength(160);
    for (const [path, errorCode] of [
      [join(outside, "other.rdf"), "ONTOLOGY_SOURCE_DENIED"],
      [join(root, "linked", "other.rdf"), "ONTOLOGY_SOURCE_DENIED"],
      [join(root, "missing.rdf"), "ONTOLOGY_SOURCE_UNAVAILABLE"],
      [join(root, "broken.rdf"), "ONTOLOGY_DOCUMENT_REFUSED"],
      [join(root, "large.rdf"), "DATASET_LIMIT_EXCEEDED"],
    ]) {
      const result = await call("open_ontology", { path });
      expect(result.structuredContent.error.errorCode).toBe(errorCode);
      const card = await call("get_entity_context", {
        entityHandle: handle,
        depth: 0,
      });
      expect(card.structuredContent.context.nodes[0].entityIri).toBe(
        "urn:test:Example",
      );
      expect(
        (await call("list_ontologies")).structuredContent.ontologies,
      ).toEqual(ontologies);
    }
    expect(
      (
        await call("get_entity_context", {
          entityHandle: handle,
          depth: 0,
          maximumResultBytes: 1024,
        })
      ).structuredContent.error.errorCode,
    ).toBe("RESULT_SIZE_EXCEEDED");
    expect(
      (await call("close_ontology", { ontologyId: handle.ontologyId }))
        .structuredContent.closed,
    ).toBe(true);
  } finally {
    await client.close();
    await rm(temp, { recursive: true, force: true });
  }
}, 30000);

test("cancelling active work evicts its worker and permits reopening", async () => {
  const file = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/definition-occurrences.ttl",
      import.meta.url,
    ),
  );
  const workspace = await createFileOntologyWorkspace({ file });
  try {
    const controller = new AbortController();
    const read = workspace.request(
      "search",
      { queryText: "record" },
      controller.signal,
    );
    controller.abort();
    await expect(read).rejects.toMatchObject({ errorCode: "QUERY_CANCELLED" });
    expect(workspace.list().ontologies).toHaveLength(0);
    await workspace.openDocument({ path: file });
    expect(
      (await workspace.request("search", { queryText: "record" })).matches[0]
        .label,
    ).toBe("record");
  } finally {
    await workspace.close();
  }
}, 20000);

test("a cancelled first open returns a startup diagnostic", async () => {
  const file = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/definition-occurrences.ttl",
      import.meta.url,
    ),
  );
  const controller = new AbortController();
  const startup = createFileOntologyWorkspace({
    file,
    signal: controller.signal,
  });
  controller.abort();
  await expect(startup).rejects.toMatchObject({ errorCode: "QUERY_CANCELLED" });
});
