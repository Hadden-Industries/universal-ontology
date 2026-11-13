import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileOntologyWorkspace } from "universal-ontology-query/node";
const doc = (id, names) =>
  `@prefix owl:<http://www.w3.org/2002/07/owl#>. @prefix skos:<http://www.w3.org/2004/02/skos/core#>. <urn:shared> a owl:Ontology. skos:prefLabel a owl:AnnotationProperty. ${names.map((n, i) => `<urn:${id}:${i}> a owl:Class; skos:prefLabel "${n}"@en.`).join(" ")}`;

test("selected search pins multiple independent views, modes and continuation offsets", async () => {
  const root = await mkdtemp(join(tmpdir(), "ontology-pages-")),
    a = join(root, "a.ttl"),
    b = join(root, "b.ttl");
  let ws, other;
  try {
    await Promise.all([
      writeFile(a, doc("a", ["term", "term a"])),
      writeFile(b, doc("b", ["term", "term b"])),
    ]);
    ws = await createFileOntologyWorkspace({ root });
    const first = await ws.openDocument({ path: a, parsingMode: "preserve" });
    const second = await ws.openDocument({ path: b });
    const ontologyIds = [first.ontologyId, second.ontologyId],
      preferredLanguageTags = ["en"];
    const pageRequest = ws.request("search", {
      ontologyIds,
      preferredLanguageTags,
      queryText: "term",
      maximumResultCount: 1,
    });
    ontologyIds.splice(0, 2, first.ontologyId);
    preferredLanguageTags[0] = "fr";
    const page = await pageRequest;
    expect(page.total).toBe(4);
    expect(page.matches[0].label).toBe("term");
    await writeFile(a, doc("a", ["revised"]));
    const refreshed = await ws.openDocument({ path: a });
    expect(refreshed.parsingMode).toBe("preserve");
    expect(refreshed.ontologyId).not.toBe(first.ontologyId);
    const collected = page.matches.slice();
    let cursor = page.nextCursor;
    while (cursor) {
      const p = await ws.request("search", { cursor, maximumResultCount: 1 });
      collected.push(...p.matches);
      cursor = p.nextCursor;
    }
    expect(collected.map((m) => m.label)).toEqual([
      "term",
      "term",
      "term a",
      "term b",
    ]);
    expect(new Set(collected.map((m) => m.entityHandle.ontologyId))).toEqual(
      new Set([first.ontologyId, second.ontologyId]),
    );
    expect(
      (
        await ws.request("context", {
          entityHandle: collected[0].entityHandle,
          depth: 0,
        })
      ).context.nodes[0].labels[0].object.value,
    ).toBe("term");
    await ws.closeView({ ontologyId: first.ontologyId });
    await expect(
      ws.request("search", { cursor: page.nextCursor }),
    ).rejects.toMatchObject({ errorCode: "UNKNOWN_ONTOLOGY_RELEASE" });
    other = await createFileOntologyWorkspace({ file: b });
    await expect(
      other.request("context", {
        entityHandle: collected.find(
          (m) => m.entityHandle.ontologyId === second.ontologyId,
        ).entityHandle,
        depth: 0,
      }),
    ).rejects.toMatchObject({ errorCode: "UNKNOWN_ONTOLOGY_RELEASE" });
    expect(other.list().ontologies[0].ontologyId).not.toBe(second.ontologyId);
  } finally {
    await ws?.close();
    await other?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);

test("concurrent opens of one file share one candidate and one waiter's cancellation is isolated", async () => {
  const root = await mkdtemp(join(tmpdir(), "ontology-wait-")),
    file = join(root, "doc.ttl");
  const ws = await createFileOntologyWorkspace({ root });
  try {
    await writeFile(file, doc("x", ["term"]));
    const controller = new AbortController();
    const one = ws.openDocument({ path: file }, { signal: controller.signal });
    const two = ws.openDocument({ path: file });
    controller.abort();
    await expect(one).rejects.toMatchObject({ errorCode: "QUERY_CANCELLED" });
    const info = await two;
    expect(ws.list().ontologies.map((o) => o.ontologyId)).toEqual([
      info.ontologyId,
    ]);
    expect((await ws.openDocument({ path: file })).ontologyId).toBe(
      info.ontologyId,
    );
  } finally {
    await ws.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);

test("all cancelled open waiters publish no candidate and existing queries finish before close", async () => {
  const root = await mkdtemp(join(tmpdir(), "ontology-leases-")),
    file = join(root, "view.ttl");
  const ws = await createFileOntologyWorkspace({ root });
  try {
    await writeFile(file, doc("x", ["record"]));
    const ctrl = new AbortController(),
      second = new AbortController();
    const opens = [ctrl, second].map((c) =>
      ws.openDocument({ path: file }, { signal: c.signal }),
    );
    ctrl.abort();
    second.abort();
    for (const r of await Promise.allSettled(opens))
      expect(r.reason.errorCode).toBe("QUERY_CANCELLED");
    expect(ws.list().ontologies).toEqual([]);
    const view = await ws.openDocument({ path: file });
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.snapshotRef)).toBe(true);
    expect(() => {
      view.capturedBytes = 0;
    }).toThrow(TypeError);
    expect(() => {
      view.snapshotRef.selectionSha256 = "0".repeat(64);
    }).toThrow(TypeError);
    const pending = ws.request("search", {
      ontologyId: view.ontologyId,
      queryText: "record",
    });
    await expect(ws.closeView(view)).rejects.toMatchObject({
      errorCode: "QUERY_QUEUE_FULL",
    });
    expect((await pending).total).toBe(1);
    await rm(file);
    expect((await ws.request("search", { queryText: "record" })).total).toBe(1);
    await expect(ws.openDocument({ path: file })).rejects.toMatchObject({
      errorCode: "ONTOLOGY_SOURCE_UNAVAILABLE",
    });
    expect(
      (await ws.request("resolve", { name: "record" })).matches,
    ).toHaveLength(1);
    await ws.closeView(view);
  } finally {
    await ws.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);

test("a refresh requested after capture starts cannot join an older source generation", async () => {
  const root = await mkdtemp(join(tmpdir(), "ontology-generation-")),
    file = join(root, "view.ttl");
  const ws = await createFileOntologyWorkspace({ root });
  try {
    await writeFile(file, doc("first", ["old"]));
    const first = ws.openDocument({ path: file });
    await Promise.resolve();
    await expect(ws.openDocument({ path: file })).rejects.toMatchObject({
      errorCode: "QUERY_QUEUE_FULL",
    });
    await first;
    await writeFile(file, doc("second", ["new"]));
    const second = await ws.openDocument({ path: file });
    expect(
      (
        await ws.request("search", {
          ontologyId: second.ontologyId,
          queryText: "new",
        })
      ).total,
    ).toBe(1);
    const closing = ws.closeView(second);
    await expect(ws.openDocument({ path: file })).rejects.toMatchObject({
      errorCode: "QUERY_QUEUE_FULL",
    });
    await closing;
    expect((await ws.openDocument({ path: file })).ontologyId).not.toBe(
      second.ontologyId,
    );
  } finally {
    await ws.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
