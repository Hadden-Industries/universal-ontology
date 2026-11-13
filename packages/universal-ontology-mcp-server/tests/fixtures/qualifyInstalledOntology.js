import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const [
  bin,
  file,
  queryText,
  expectedDigest,
  parsingMode = "compatible",
  scenario,
] = process.argv.slice(2);
if (!bin || !file || !queryText)
  throw new TypeError("Supply a bundle path, file and search text.");
async function qualify() {
  const input = await readFile(file);
  const digest = createHash("sha256").update(input).digest("hex");
  if (expectedDigest && expectedDigest !== "-" && expectedDigest !== digest)
    throw new Error("Acceptance source digest mismatch");
  const client = new Client({
    name: "installed-browsing-qualification",
    version: "1",
  });
  const scratch =
    scenario === "lifecycle"
      ? await mkdtemp(join(tmpdir(), "uo-installed-lifecycle-"))
      : null;
  const started = performance.now();
  try {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        resolve(bin),
        "--ontology-file=" + resolve(file),
        "--ontology-mode=" + parsingMode,
        ...(scratch ? ["--ontology-root=" + scratch] : []),
      ],
      stderr: "pipe",
    });
    await client.connect(transport);
    async function call(name, args = {}) {
      const result = await client.callTool({ name, arguments: args });
      if (result.isError)
        throw new Error(
          name + " failed " + result.structuredContent?.error?.errorCode,
        );
      return result.structuredContent;
    }
    const { ontologies } = await call("list_ontologies");
    const coldMs = performance.now() - started;
    const { matches } = await call("search_entities", {
      queryText,
      maximumResultCount: 3,
    });
    if (!matches.length) throw new Error("No term matched");
    const { entityHandle } = matches[0];
    const follow = await call("resolve_entity", {
      ontologyId: entityHandle.ontologyId,
      name: entityHandle.iri,
    });
    if (!follow.matches.some((m) => m.entityHandle.iri === entityHandle.iri))
      throw new Error("Resolution selected a different entity");
    const contextArgs = { entityHandle, depth: 0, maximumResultBytes: 131072 };
    const firstContextStart = performance.now();
    const card = await call("get_entity_context", contextArgs);
    const snapshotMaterial = [
      pathToFileURL(resolve(file)).href,
      ontologies[0].format,
      parsingMode,
      digest,
    ];
    assert.equal(
      card.snapshotRef.rootSnapshotId,
      "urn:uo:snapshot:" +
        createHash("sha256")
          .update(JSON.stringify(snapshotMaterial))
          .digest("hex"),
    );
    const firstContextMs = Math.ceil(performance.now() - firstContextStart);
    const node = card.context.nodes.find(
      (n) => n.entityIri === entityHandle.iri,
    );
    if (!node || node.definitions.length === 0)
      throw new Error("Missing expected definition");
    const connections = await call("find_entity_connections", {
      ...contextArgs,
      targetEntityHandle: entityHandle,
    });
    if (connections.status !== "paths_found")
      throw new Error("Expected self connection");
    const timings = [];
    for (let i = 0; i < 100; i++) {
      const t = performance.now();
      switch (i % 4) {
        case 0:
          await call("search_entities", { queryText, maximumResultCount: 1 });
          break;
        case 1:
          await call("resolve_entity", { name: entityHandle.iri });
          break;
        case 2:
          await call("get_entity_context", contextArgs);
          break;
        default:
          await call("find_entity_connections", {
            ...contextArgs,
            targetEntityHandle: entityHandle,
          });
          break;
      }
      timings.push(performance.now() - t);
    }
    timings.sort((a, b) => a - b);
    const lifecycle = scratch
      ? await exerciseLifecycle(scratch, client, call, entityHandle, queryText)
      : undefined;
    const peakMiB = await peakWorkingSetMiB(transport.pid);
    await call("close_ontology", { ontologyId: entityHandle.ontologyId });
    if ((await call("list_ontologies")).ontologies.length)
      throw new Error("Closed view still listed");
    console.log(
      JSON.stringify({
        sha256: digest,
        mode: ontologies[0].parsingMode,
        classes: ontologies[0].classCount,
        definitions: node.definitions.length,
        coldMs: Math.round(coldMs),
        firstContextMs,
        peakMiB,
        p50Ms: Math.ceil(timings[49]),
        warmCalls: timings.length,
        p95Ms: Math.ceil(timings[94]),
        lifecycle,
        fourTools: true,
        closed: true,
      }),
    );
  } finally {
    try {
      await client.close();
    } finally {
      if (scratch) await rm(scratch, { recursive: true, force: true });
    }
  }
}

try {
  await qualify();
} catch {
  process.stderr.write(
    "Installed ontology qualification failed. Check source availability, mode, expected digest and tool outcomes.\n",
  );
  process.exitCode = 1;
}

async function peakWorkingSetMiB(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1)
    throw new Error("Missing server PID");
  if (process.platform === "win32") {
    const bytes = Number(
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "(Get-Process -Id " + pid + ").PeakWorkingSet64",
        ],
        { encoding: "utf8", windowsHide: true },
      ),
    );
    if (!Number.isFinite(bytes) || bytes <= 0)
      throw new Error("Peak working set unavailable");
    return Math.ceil(bytes / 1048576);
  }
  if (process.platform === "linux") {
    const status = await readFile("/proc/" + pid + "/status", "utf8");
    const high = status.match(/^VmHWM:\s+(\d+) kB$/mu);
    if (high) return Math.ceil(Number(high[1]) / 1024);
  }
  return null;
}

async function exerciseLifecycle(scratch, client, call, original, queryText) {
  const path = join(scratch, "reference.ttl"),
    iri = "urn:qualification:term";
  const text = (version) =>
    "@prefix owl: <http://www.w3.org/2002/07/owl#> . @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . <urn:qualification> a owl:Ontology . <" +
    iri +
    "> a owl:Class; rdfs:label " +
    JSON.stringify(queryText) +
    '@en; <http://www.w3.org/2004/02/skos/core#definition> "Revision ' +
    version +
    '" .';
  async function openAfterCleanup(path, parsingMode) {
    const end = performance.now() + 3000;
    for (;;) {
      const answer = await client.callTool({
        name: "open_ontology",
        arguments: { path, parsingMode },
      });
      if (
        answer.structuredContent?.error?.errorCode !== "QUERY_QUEUE_FULL" ||
        performance.now() >= end
      )
        return answer;
      await new Promise((done) => setTimeout(done, 25));
    }
  }
  const versionHandle = (info) => ({ ontologyId: info.ontologyId, iri });
  async function checkDefinition(handle, expected) {
    const result = await call("get_entity_context", {
      entityHandle: handle,
      depth: 0,
      maximumResultBytes: 131072,
    });
    const terms = result.context.nodes
      .find((n) => n.entityIri === handle.iri)
      ?.definitions.map((d) => d.term.value);
    assert.ok(
      terms?.includes(expected),
      "Expected generation-specific definition",
    );
  }
  async function checkViews(expected) {
    const ids = (await call("list_ontologies")).ontologies.map(
      (v) => v.ontologyId,
    );
    assert.deepEqual(ids.sort(), expected.sort());
  }
  const originalCard = await call("get_entity_context", {
    entityHandle: original,
    depth: 0,
    maximumResultBytes: 131072,
  });
  const originalDefinition = originalCard.context.nodes.find(
    (n) => n.entityIri === original.iri,
  ).definitions[0].term.value;
  let prior;
  const observations = [];
  for (let generation = 1; generation <= 3; generation++) {
    await writeFile(path, text(generation));
    const opened = await call("open_ontology", { path });
    await checkDefinition(versionHandle(opened), "Revision " + generation);
    if (prior) {
      assert.notEqual(prior.ontologyId, opened.ontologyId);
      await checkDefinition(
        versionHandle(prior),
        "Revision " + (generation - 1),
      );
      await call("close_ontology", { ontologyId: prior.ontologyId });
    }
    const single = await call("search_entities", {
      ontologyIds: [opened.ontologyId],
      queryText,
    });
    assert.deepEqual(
      single.matches.map((m) => m.entityHandle),
      [versionHandle(opened)],
    );
    if (generation === 1) {
      const page = await call("search_entities", {
        ontologyIds: [opened.ontologyId, original.ontologyId],
        queryText,
        maximumResultCount: 1,
      });
      assert.ok(page.nextCursor);
      const thirdFile = join(scratch, "third.ttl");
      await writeFile(thirdFile, text(99));
      const third = await call("open_ontology", { path: thirdFile });
      let hits = [...page.matches],
        cursor = page.nextCursor;
      while (cursor) {
        const next = await call("search_entities", {
          cursor,
          maximumResultCount: 20,
        });
        hits.push(...next.matches);
        cursor = next.nextCursor;
      }
      assert.deepEqual(
        new Set(hits.map((h) => h.entityHandle.ontologyId)),
        new Set([original.ontologyId, opened.ontologyId]),
      );
      assert.ok(hits.some((h) => h.entityHandle.iri === original.iri));
      await checkDefinition(original, originalDefinition);
      await call("close_ontology", { ontologyId: third.ontologyId });
    }
    await checkViews([original.ontologyId, opened.ontologyId]);
    observations.push(2);
    prior = opened;
  }
  await writeFile(path, "incomplete Turtle input");
  for (const parsingMode of ["preserve", "compatible"]) {
    const refused = await openAfterCleanup(path, parsingMode);
    if (
      refused.structuredContent?.error?.errorCode !==
      "ONTOLOGY_DOCUMENT_REFUSED"
    )
      throw new Error("Expected a parser refusal in " + parsingMode);
    const old = await call("resolve_entity", {
      ontologyId: original.ontologyId,
      name: original.iri,
    });
    if (old.matches.length !== 1)
      throw new Error("Ready view unavailable after refusal");
    await checkViews([original.ontologyId, prior.ontologyId]);
    await checkDefinition(versionHandle(prior), "Revision 3");
  }
  await call("close_ontology", { ontologyId: prior.ontologyId });
  return {
    sourceGenerations: 3,
    pinnedPagination: true,
    viewsAfterClosingPrior: observations,
    bothModesRefused: true,
  };
}
