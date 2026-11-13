import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createUniversalOntologyMcpServer } from "../../src/createUniversalOntologyMcpServer.js";
import { loadOntologyDocument } from "../../../universal-ontology-query/src/loadOntologyDocument.js";

/** Measure one real document through the same MCP schema and context projection
 * as the packaged server. The operator supplies an exact file and known entity.
 * Output identifies the input and counts evidence without printing private text.
 */
const [path, format, parsingMode, entityIri] = process.argv.slice(2);
const source = pathToFileURL(resolve(path));
const start = performance.now();
const bytes = await readFile(source);
const capture = {
  bytes,
  documentIRI: source.href,
  format,
  parsingMode,
};
const view = await loadOntologyDocument(capture);
const loadMilliseconds = Math.round(performance.now() - start);
const unused = () => {
  throw new Error("Qualification calls get_entity_context only.");
};
const server = createUniversalOntologyMcpServer({
  ontologyQuery: {
    getOntologyEntityContext: (input) => view.getContext(input),
    searchOntologyEntities: unused,
    resolveOntologyEntity: unused,
  },
});
const client = new Client({
  name: "direct-ontology-qualification",
  version: "1",
});
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const input = {
    entityIdentifier: {
      identifierKind: "entity_iri",
      identifierValue: entityIri,
    },
    depth: 0,
  };
  const durations = [];
  let card;
  for (let attempt = 0; attempt < 101; attempt += 1) {
    const queryStart = performance.now();
    const result = await client.callTool({
      name: "get_entity_context",
      arguments: input,
    });
    if (result.isError)
      throw new Error(
        result.structuredContent?.error?.errorCode ?? "Context request failed",
      );
    durations.push(Math.round((performance.now() - queryStart) * 10) / 10);
    card = result.structuredContent.context.nodes.find(
      (n) => n.entityIri === entityIri,
    );
    if (!card?.descriptionAvailable) throw new Error("Missing expected entity");
  }
  const refreshes = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    const began = performance.now();
    const replacement = await loadOntologyDocument(capture);
    const overlapRssKiB = Math.round(process.memoryUsage().rss / 1024);
    replacement.close();
    const old = view.getContext(input);
    if (old.context.entityIri !== entityIri)
      throw new Error("Original view lost after close");
    refreshes.push({
      milliseconds: Math.round(performance.now() - began),
      overlapRssKiB,
    });
  }
  console.log(
    JSON.stringify({
      sha256: createHash("sha256").update(bytes).digest("hex"),
      parsingMode,
      format,
      bytes: bytes.length,
      classes: view.classCount,
      definitions: card.definitions.length,
      occurrences: card.definitions.flatMap((d) => d.occurrences ?? []).length,
      loadMilliseconds,
      firstQueryMilliseconds: durations[0],
      warmSamples: durations.length - 1,
      warmP50Milliseconds: durations.slice(1).sort((a, b) => a - b)[49],
      warmP95Milliseconds: durations.slice(1).sort((a, b) => a - b)[94],
      peakRssKiB: process.resourceUsage().maxRSS,
      refreshes,
    }),
  );
} finally {
  await client.close();
  await server.close();
  view.close();
}
