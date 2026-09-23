import { mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createOntologyQueryArtifacts } from "../../../scripts/build/createOntologyQueryArtifacts.js";
import { buildUniversalOntologyMcpApplicationBundle } from "../scripts/buildUniversalOntologyMcpApplicationBundle.js";
import { createLocalUniversalOntologyMcpServer } from "../scripts/runLocalOntologyMcpServer.js";
import { createNodeOntologyQueryModule } from "universal-ontology-query/node";
import { createFileSystemOntologyQueryArtifactRepository } from "universal-ontology-query/repositories/file-system";

const core = "https://haddenindustries.com/ontology/universal/core/";
const identifier = (name) => ({
  identifierKind: "entity_iri",
  identifierValue: core + name,
});
let root;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "uo-context-transports-"));
  const artifacts = await createOntologyQueryArtifacts({
    ontologySources: [
      {
        sourcePath: fileURLToPath(
          new URL("../../../src/universal/core/20260912", import.meta.url),
        ),
        outputPath: "universal/core/20260912",
      },
    ],
    workerCount: 1,
  });
  for (const [path, bytes] of artifacts.artifactContentsByRelativePath) {
    const target = join(root, "query", path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  await buildUniversalOntologyMcpApplicationBundle();
  await mkdir(join(root, "application"));
  for (const name of [
    "universal-ontology-mcp-server.mjs",
    "ontologyStoreWorker.cjs",
    "node_bg.wasm",
  ])
    await copyFile(
      new URL(`../dist/${name}`, import.meta.url),
      join(root, "application", name),
    );
}, 20000);
afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

test.each(["source_stdio", "packaged_stdio", "http"])(
  "reviews the real core definitions through %s",
  async (mode) => {
    const client = new Client({
      name: "ontology-context-review",
      version: "1.0.0",
    });
    let server;
    let query;
    try {
      if (mode === "http") {
        query = createNodeOntologyQueryModule({
          ontologyQueryArtifactRepository:
            createFileSystemOntologyQueryArtifactRepository({
              queryRoot: join(root, "query"),
            }),
        });
        server = createLocalUniversalOntologyMcpServer({
          ontologyQuery: query,
          catalogReady: true,
          writeLogEvent: () => {},
        });
        const { port } = await server.listen({ port: 0 });
        await client.connect(
          new StreamableHTTPClientTransport(
            new URL(`http://127.0.0.1:${port}/mcp`),
          ),
        );
      } else {
        const entry =
          mode === "packaged_stdio"
            ? join(root, "application", "universal-ontology-mcp-server.mjs")
            : fileURLToPath(
                new URL(
                  "../scripts/runUniversalOntologyMcpStdioServer.js",
                  import.meta.url,
                ),
              );
        await client.connect(
          new StdioClientTransport({
            command: process.execPath,
            args: [
              entry,
              "--query-artifact-source=file-system",
              `--query-artifact-root-directory=${join(root, "query")}`,
            ],
            cwd: root,
            stderr: "pipe",
          }),
        );
      }
      const first = await client.callTool({
        name: "get_entity_context",
        arguments: {
          entityIdentifier: identifier("AddressRelationship"),
          graphSelection: "source_graph",
        },
      });
      expect(first.isError).not.toBe(true);
      expect(
        Buffer.byteLength(
          JSON.stringify({
            content: first.content,
            structuredContent: first.structuredContent,
          }),
        ),
      ).toBeLessThanOrEqual(32768);
      const roles = first.structuredContent.context.connections.filter(
        (connection) => connection.role === "restriction_filler",
      );
      expect(
        roles.map((role) => role.predicateIri.slice(core.length)).sort(),
      ).toEqual(["hasAddressIs", "hasAddressOf", "hasAddressRelationshipType"]);
      expect(
        roles.every(
          (role) =>
            role.restriction.operator === "qualifiedCardinality" &&
            role.restriction.cardinality === "1",
        ),
      ).toBe(true);
      const activity = await client.callTool({
        name: "get_entity_context",
        arguments: {
          entityIdentifier: identifier("Activity"),
          snapshotRef: first.structuredContent.snapshotRef,
        },
      });
      expect(activity.isError).not.toBe(true);
      const definition = activity.structuredContent.context.nodes.find(
        (node) => node.entityIri === `${core}Activity`,
      ).definitions[0];
      expect(definition.sourceStatus).toBe("definition_source_recorded");
      expect(definition.definitionSources).toHaveLength(2);
      const path = await client.callTool({
        name: "find_entity_connections",
        arguments: {
          entityIdentifier: identifier("AddressRelationship"),
          targetEntityIdentifier: identifier("Address"),
          snapshotRef: first.structuredContent.snapshotRef,
          direction: "outgoing",
        },
      });
      expect(path.isError).not.toBe(true);
      expect(path.structuredContent.status).toBe("paths_found");
      expect(path.structuredContent.paths).toHaveLength(2);
      const search = await client.callTool({
        name: "search_entities",
        arguments: {
          queryText: "AddressRelationship",
          definitionSourceStatus: "no_recorded_source",
          snapshotRef: first.structuredContent.snapshotRef,
        },
      });
      expect(search.isError).not.toBe(true);
      expect(
        search.structuredContent.matches[0].matchingDefinitions[0].term.value,
      ).toBe("Way in which Addresses are connected");
    } finally {
      await client.close();
      await server?.shutdown();
      await query?.close();
    }
  },
  20000,
);
