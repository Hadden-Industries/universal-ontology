import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createUniversalOntologyMcpServer } from "../src/createUniversalOntologyMcpServer.js";
import { loadOntologyDocument } from "../../universal-ontology-query/src/loadOntologyDocument.js";
import { createOntologyDocumentWorkspace } from "../../universal-ontology-query/src/createOntologyDocumentWorkspace.js";

const vocabulary = "https://example.org/vocabulary/";

test("different local bindings retain distinct, immutable closure handles", async () => {
  const workspace = createOntologyDocumentWorkspace();
  const observer = createServer((_request, response) => {
    attempts++;
    response.end();
  });
  let attempts = 0;
  await new Promise((ready) => observer.listen(0, "127.0.0.1", ready));
  const origin = "http://127.0.0.1:" + observer.address().port;
  const aliases = [origin + "/first", origin + "/second"];
  const input = {
    format: "turtle",
    documentIRI: "urn:root",
    bytes: Buffer.from(
      `<urn:root> a <http://www.w3.org/2002/07/owl#Ontology>; <http://www.w3.org/2002/07/owl#imports> <${aliases[0]}>, <${aliases[1]}> .`,
    ),
  };
  try {
    const handles = [];
    for (const importIRI of aliases) {
      handles.push(
        await workspace.open({
          ...input,
          imports: [
            {
              importIRI,
              documentIRI: "urn:bound",
              format: "turtle",
              bytes: Buffer.from(
                "<urn:bound> a <http://www.w3.org/2002/07/owl#Ontology> . <urn:C> a <http://www.w3.org/2002/07/owl#Class> .",
              ),
            },
          ],
        }),
      );
    }
    expect(handles[0].ontologyId).not.toBe(handles[1].ontologyId);
    for (const [index, { snapshotRef }] of handles.entries()) {
      const result = workspace.getOntologyEntityContext({
        snapshotRef,
        depth: 0,
        entityIdentifier: {
          identifierKind: "entity_iri",
          identifierValue: "urn:C",
        },
      });
      const [missing] = result.importCoverage.flatMap(
        (record) => record.unresolved,
      );
      expect(missing.importIri).toBe(aliases[1 - index]);
      expect(() => {
        missing.importIri = "urn:other";
      }).toThrow(TypeError);
    }
    expect(attempts).toBe(0);
  } finally {
    workspace.close();
    await new Promise((done) => observer.close(done));
  }
});
const fixture = new URL(
  "../../universal-ontology-query/tests/fixtures/direct-ontology/definition-occurrences.ttl",
  import.meta.url,
);

test("both rejected opens retain the previous context and its snapshot handle", async () => {
  const workspace = createOntologyDocumentWorkspace();
  try {
    const capture = {
      bytes: await readFile(fixture),
      documentIRI: fixture.href,
      format: "turtle",
    };
    const { snapshotId } = await workspace.open(capture);
    const input = {
      rootSnapshotId: snapshotId,
      entityIdentifier: {
        identifierKind: "entity_iri",
        identifierValue: vocabulary + "Record",
      },
      depth: 0,
    };
    const expected = workspace.getOntologyEntityContext(input);
    for (const parsingMode of ["preserve", "compatible"]) {
      await expect(
        workspace.open({
          ...capture,
          bytes: Buffer.from("invalid Turtle !"),
          parsingMode,
        }),
      ).rejects.toMatchObject({
        errorCode: "ONTOLOGY_DOCUMENT_REFUSED",
        message: expect.stringContaining(parsingMode),
      });
      expect(workspace.getOntologyEntityContext(input)).toEqual(expected);
    }
  } finally {
    workspace.close();
  }
});

test("reports the legacy OWL-Time mapping refusal and permits an explicit compatible retry", async () => {
  const source = new URL("../../../src/external/time.rdf", import.meta.url);
  const capture = {
    bytes: await readFile(source),
    documentIRI: source.href,
    format: "rdfxml",
  };
  await expect(
    loadOntologyDocument({ ...capture, parsingMode: "preserve" }),
  ).rejects.toMatchObject({
    errorCode: "ONTOLOGY_DOCUMENT_REFUSED",
    message: expect.stringContaining("RDF_LEGACY_CLASS_RECOVERY"),
  });
  const view = await loadOntologyDocument({
    ...capture,
    parsingMode: "compatible",
  });
  try {
    const term = "http://www.w3.org/2006/time#TemporalEntity";
    const result = view.getContext({
      entityIdentifier: { identifierKind: "entity_iri", identifierValue: term },
      depth: 0,
    });
    expect(result.context.nodes[0].entityIri).toBe(term);
  } finally {
    view.close();
  }
});

test("the chosen mapping mode governs an admitted OWL-Time import", async () => {
  const source = new URL("../../../src/external/time.rdf", import.meta.url);
  const capture = {
    bytes: Buffer.from(
      "<urn:calendar> a <http://www.w3.org/2002/07/owl#Ontology>; <http://www.w3.org/2002/07/owl#imports> <http://www.w3.org/2006/time> .",
    ),
    documentIRI: "urn:calendar",
    format: "turtle",
    imports: [
      {
        importIRI: "http://www.w3.org/2006/time",
        bytes: await readFile(source),
        documentIRI: source.href,
        format: "rdfxml",
      },
    ],
  };
  await expect(
    loadOntologyDocument({ ...capture, parsingMode: "preserve" }),
  ).rejects.toMatchObject({
    errorCode: "ONTOLOGY_DOCUMENT_REFUSED",
    message: expect.stringContaining("RDF_LEGACY_CLASS_RECOVERY"),
  });
  const view = await loadOntologyDocument(capture);
  try {
    const term = "http://www.w3.org/2006/time#TemporalEntity";
    const result = view.getContext({
      entityIdentifier: { identifierKind: "entity_iri", identifierValue: term },
      depth: 0,
    });
    expect(result.snapshotRef.snapshotIds).toHaveLength(2);
    expect(result.context.nodes[0].entityIri).toBe(term);
  } finally {
    view.close();
  }
});

test.each(["compatible", "preserve"])(
  "returns original definition occurrences through MCP after a %s load",
  async (parsingMode) => {
    const view = await loadOntologyDocument({
      bytes: await readFile(fixture),
      documentIRI: fixture.href,
      format: "turtle",
      parsingMode,
    });
    const server = createUniversalOntologyMcpServer({
      ontologyQuery: {
        getOntologyEntityContext: (input) => view.getContext(input),
        resolveOntologyEntity: () => {
          throw new Error("Unexpected resolution");
        },
        searchOntologyEntities: () => {
          throw new Error("Unexpected search");
        },
      },
    });
    const client = new Client({
      name: "direct-document-qualification",
      version: "1",
    });
    const [local, remote] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(remote);
      await client.connect(local);
      const response = await client.callTool({
        name: "get_entity_context",
        arguments: {
          entityIdentifier: {
            identifierKind: "entity_iri",
            identifierValue: vocabulary + "Record",
          },
          depth: 0,
        },
      });
      expect(response.isError).not.toBe(true);
      const [definition] =
        response.structuredContent.context.nodes[0].definitions;
      expect(definition.term.value).toBe("A recorded entry.");
      expect(
        definition.occurrences
          .map(({ annotations }) => [
            annotations.find(
              (q) => q.predicateIri === "https://schema.org/position",
            ).object.value,
            annotations.find(
              (q) => q.predicateIri === "http://purl.org/dc/terms/source",
            ).object.value,
          ])
          .sort(),
      ).toEqual([
        ["1", vocabulary + "citationA"],
        ["2", vocabulary + "citationB"],
      ]);
    } finally {
      await client.close();
      await server.close();
      view.close();
    }
  },
);
