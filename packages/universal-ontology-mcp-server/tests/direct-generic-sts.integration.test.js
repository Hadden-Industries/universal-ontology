import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "node:url";
import { createFileOntologyWorkspace } from "universal-ontology-query/node";
import { renderOntologyToolResultAsText } from "../src/renderOntologyToolResultAsText.js";
import { OntologyContextProjectionSchema } from "../../universal-ontology-query/src/ontologyContextSchemas.js";

test("a community glossary preserves designation, citation and field occurrence scope", async () => {
  const file = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/community-glossary.ttl",
      import.meta.url,
    ),
  );
  const ws = await createFileOntologyWorkspace({ file });
  const request = (name, input) =>
    ws.request(name, { ...input, maximumResultBytes: 131072 });
  try {
    const { matches } = await request("resolve", { name: "record" });
    expect(matches).toHaveLength(2);
    const hit = (
      await request("search", {
        queryText: "G.1",
        preferredLanguageTags: ["fr"],
      })
    ).matches.find((m) => m.entityHandle.iri === "urn:community:Topic");
    expect(hit.label).toBe("notice");
    const card = await request("context", {
      entityHandle: hit.entityHandle,
      depth: 0,
    });
    const node = OntologyContextProjectionSchema.parse(card.context).nodes[0];
    expect(node.membership[0].object.value).toBe("urn:community:glossary");
    expect(node.annotations.map((a) => a.object.value)).toContain(
      "Keep this field",
    );
    const hidden = node.designations.find((d) => d.role === "hidden");
    expect(
      hidden.occurrences[0].annotations.map((a) => a.object.value),
    ).toContain("true");
    const evidence = hidden.occurrences[0].annotations.find(
      (a) => a.description,
    ).description.statements;
    expect(evidence.map((a) => a.object.value)).toEqual(
      expect.arrayContaining(["variant", "old wording", "G.1/designation/2"]),
    );
    expect(node.notes.map((a) => a.object.value)).not.toContain(
      "Local wording added",
    );
    const citation = node.entitySources.find(
      (a) => a.object.termType === "BlankNode",
    );
    const followed = await request("resource", {
      resourceHandle: citation.sourceDescription.resourceHandle,
    });
    expect(followed.resolved).toBe(true);
    expect(followed.statements[0].object.value).toBe("Community handbook, 4");
    expect(citation.sourceDescription.statements[0].object.value).toBe(
      "Community handbook, 4",
    );
    expect(citation.occurrences[0].annotations[0].object.value).toBe(
      "Local wording added",
    );
    expect(
      node.entitySources.find((a) => a.object.termType === "NamedNode")
        .occurrences,
    ).toEqual([]);
    const fig = node.definitions
      .find((d) => d.term.value === "A written account.")
      .occurrences[0].annotations.find((a) => a.description);
    expect(fig.description.statements.map((a) => a.object.value)).toEqual(
      expect.arrayContaining(["Ledger", "Two columns", "fig-2"]),
    );
    const known = node.references.find(
      (r) => r.object.value === "urn:community:Another",
    );
    expect(known.occurrences[0].annotations[0].object.value).toBe(
      "reference evidence",
    );
    expect(
      (
        await request("context", {
          entityHandle: known.description.entityHandle,
          depth: 0,
        })
      ).context.entityIri,
    ).toBe("urn:community:Another");
    expect(
      node.annotations.find((q) => q.predicateIri === "urn:community:extension")
        .occurrences[0].annotations[0].object.value,
    ).toBe("extension evidence");
    const rendered = renderOntologyToolResultAsText(card);
    expect(rendered.indexOf("Definition 1: Zebra")).toBeLessThan(
      rendered.indexOf("Definition 5: Alpha"),
    );
    expect(rendered.match(/Definition 5: Alpha/g)).toHaveLength(2);
    expect(rendered).toContain("Definition (position unspecified): Unnumbered");
    const example = node.notes.find((n) => n.object.value === "Ledger");
    expect(
      example.occurrences[0].annotations.map((a) => a.object.value),
    ).toEqual(
      expect.arrayContaining([
        "3",
        "urn:community:Another",
        "urn:community:unresolved",
      ]),
    );
    expect(renderOntologyToolResultAsText(card)).toContain(
      "Source modification: Local wording added",
    );
    const chain = await request("connections", {
      entityHandle: hit.entityHandle,
      targetEntityHandle: matches.find((m) =>
        m.entityHandle.iri.endsWith(":Another"),
      ).entityHandle,
      depth: 1,
    });
    expect(chain.status).toBe("no_path_within_depth");
    expect(
      chain.context.nodes[0].references[0].description.entityHandle,
    ).toEqual(known.description.entityHandle);
  } finally {
    await ws.close();
  }
}, 20000);

test("the default MCP context budget fits the community term card", async () => {
  const file = fileURLToPath(
    new URL(
      "../../universal-ontology-query/tests/fixtures/direct-ontology/community-glossary.ttl",
      import.meta.url,
    ),
  );
  const entry = fileURLToPath(
    new URL(
      "../scripts/runUniversalOntologyMcpStdioServer.js",
      import.meta.url,
    ),
  );
  const client = new Client({ name: "card-reader", version: "1" });
  try {
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [entry, `--ontology-file=${file}`],
        stderr: "pipe",
      }),
    );
    const found = await client.callTool({
      name: "resolve_entity",
      arguments: { name: "G.1" },
    });
    const card = await client.callTool({
      name: "get_entity_context",
      arguments: {
        entityHandle: found.structuredContent.matches[0].entityHandle,
        depth: 0,
      },
    });
    expect(card.isError).not.toBe(true);
    const resourceHandle =
      card.structuredContent.context.nodes[0].entitySources.find(
        (s) => s.object.termType === "BlankNode",
      ).sourceDescription.resourceHandle;
    const resource = await client.callTool({
      name: "get_entity_context",
      arguments: { resourceHandle },
    });
    expect(resource.structuredContent.statements[0].object.value).toBe(
      "Community handbook, 4",
    );
  } finally {
    await client.close();
  }
}, 20000);
