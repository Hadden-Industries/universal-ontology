import { documentProjectionPolicy } from "../../universal-ontology-query/src/ontologyDocumentProjectionPolicy.js";
import { createFileOntologyWorkspace } from "universal-ontology-query/node";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUniversalOntologyMcpStdioConfiguration } from "../src/universalOntologyMcpStdioConfiguration.js";
const base = "https://haddenindustries.com/ontology/universal/core/";
const source = (relative) =>
  fileURLToPath(new URL("../../../" + relative, import.meta.url));

test("authored release identity supplies historical mappings even under an unrelated filename", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-release-"));
  const file = join(root, "renamed standards volume.rdf");
  const external = join(root, "20190201");
  let w;
  try {
    await copyFile(source("src/universal/core/20190201"), file);
    await writeFile(
      external,
      `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:dct="http://purl.org/dc/terms/"><owl:Ontology rdf:about="urn:other"/><owl:Class rdf:about="urn:other:X"><dct:description>Raw only</dct:description></owl:Class></rdf:RDF>`,
    );
    w = await createFileOntologyWorkspace({
      file,
      root,
      bindings: [{ iri: "urn:unused", path: join(root, "missing.rdf") }],
    });
    expect(w.list().ontologies[0].interpretation).toBe(
      "uo_field_property_history_v1",
    );
    const lookup = async (iri) => {
      const { matches } = await w.request("resolve", { name: iri });
      return (
        await w.request("context", {
          entityHandle: matches[0].entityHandle,
          depth: 0,
          maximumResultBytes: 131072,
        })
      ).context.nodes[0];
    };
    expect(
      (await lookup(base + "Address")).definitions.map((d) => d.term.value),
    ).toContain("Particulars of a place");
    expect(
      (await w.request("search", { queryText: "Particulars of a place" }))
        .matches[0].entityHandle.iri,
    ).toBe(base + "Address");
    expect(
      (await lookup(base + "Address")).designations.some(
        (d) =>
          d.predicateIri === "http://purl.org/dc/terms/title" &&
          d.role === "preferred",
      ),
    ).toBe(true);
    await w.openDocument({ path: external });
    const other = await lookup("urn:other:X");
    expect(other.definitions).toHaveLength(0);
    expect(other.annotations.some((q) => q.object.value === "Raw only")).toBe(
      true,
    );
  } finally {
    await w?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
test("operator-bound OWL-Time imports preserve the accepted view when the stricter mode fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-bindings-"));
  const file = join(root, "without-extension");
  const importIri = "http://www.w3.org/2006/time";
  let w;
  try {
    await writeFile(
      file,
      `<urn:doc> a <http://www.w3.org/2002/07/owl#Ontology>; <http://www.w3.org/2002/07/owl#imports> <${importIri}> .`,
    );
    const config = parseUniversalOntologyMcpStdioConfiguration({
      environment: {},
      commandLineArguments: [
        "--ontology-file=" + file,
        "--ontology-format=turtle",
        "--ontology-imports=" +
          JSON.stringify({ [importIri]: source("src/external/time.rdf") }),
      ],
    });
    w = await createFileOntologyWorkspace(config.ontologyQueryArtifactSource);
    const before = w.list();
    await expect(
      w.openDocument({ path: file, parsingMode: "preserve" }),
    ).rejects.toMatchObject({ errorCode: "ONTOLOGY_DOCUMENT_REFUSED" });
    expect(w.list()).toEqual(before);
    const iri = importIri + "#TemporalEntity";
    expect(
      (await w.request("resolve", { name: iri })).matches[0].entityHandle.iri,
    ).toBe(iri);
    await expect(
      createFileOntologyWorkspace({
        file,
        format: "turtle",
        requireComplete: true,
      }),
    ).rejects.toMatchObject({ errorCode: "ONTOLOGY_DOCUMENT_REFUSED" });
  } finally {
    await w?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);

test("a missing bound import is a coverage gap only when declared, and impossible dates withhold historical roles", async () => {
  const temp = await mkdtemp(join(tmpdir(), "uo-missing-"));
  const file = join(temp, "root.ttl"),
    bindings = [{ iri: "urn:lost", path: join(temp, "missing.rdf") }];
  let ws;
  try {
    const root = "<urn:root> a <http://www.w3.org/2002/07/owl#Ontology>";
    await writeFile(file, root + " .");
    ws = await createFileOntologyWorkspace({ file, bindings });
    const first = ws.list().ontologies[0].ontologyId;
    await writeFile(
      file,
      root + "; <http://www.w3.org/2002/07/owl#imports> <urn:lost> .",
    );
    const info = await ws.openDocument({ path: file });
    const card = await ws.request("context", {
      entityHandle: { ontologyId: info.ontologyId, iri: "urn:root" },
      depth: 0,
    });
    expect(card.importCoverage[0].unresolved[0].importIri).toBe("urn:lost");
    await expect(
      createFileOntologyWorkspace({ file, bindings, requireComplete: true }),
    ).rejects.toMatchObject({ errorCode: "ONTOLOGY_DOCUMENT_REFUSED" });
    expect(
      (
        await ws.request("context", {
          entityHandle: { ontologyId: first, iri: "urn:root" },
          depth: 0,
        })
      ).importCoverage[0].unresolved,
    ).toEqual([]);
    expect(
      documentProjectionPolicy({
        ontologyIRI: { value: base },
        versionIRI: { value: base + "20190231" },
      }).interpretation,
    ).toBe("unverified_release_metadata");
  } finally {
    await ws?.close();
    await rm(temp, { recursive: true, force: true });
  }
}, 30000);

test("a managed ontology identity cannot override an explicit import binding", async () => {
  const temp = await mkdtemp(join(tmpdir(), "uo-alias-")),
    file = join(temp, "root.ttl"),
    alternate = join(temp, "chosen.ttl");
  const binds = [{ iri: "urn:claims", path: alternate }];
  let ws;
  try {
    await writeFile(
      alternate,
      "<urn:claims> a <http://www.w3.org/2002/07/owl#Ontology> .",
    );
    await writeFile(
      file,
      "<urn:root> a <http://www.w3.org/2002/07/owl#Ontology> .",
    );
    ws = await createFileOntologyWorkspace({
      file,
      bindings: binds,
      requireComplete: true,
    });
    const original = ws.list();
    await writeFile(
      file,
      "<urn:claims> a <http://www.w3.org/2002/07/owl#Ontology>; <http://www.w3.org/2002/07/owl#imports> <urn:claims> .",
    );
    await expect(ws.openDocument({ path: file })).rejects.toMatchObject({
      errorCode: "ONTOLOGY_DOCUMENT_REFUSED",
    });
    expect(ws.list()).toEqual(original);
  } finally {
    await ws?.close();
    await rm(temp, { recursive: true, force: true });
  }
}, 30000);

test.each([
  ["a", "b"],
  ["b", "a"],
])(
  "bound shared identity refuses both claimants with version %s first",
  async (first, second) => {
    const temp = await mkdtemp(join(tmpdir(), "uo-versions-"));
    const file = join(temp, "root.ttl"),
      shared = "urn:shared",
      owl = "http://www.w3.org/2002/07/owl#";
    const bindings = ["a", "b"].map((v) => ({
      iri: "urn:" + v,
      path: join(temp, v + ".ttl"),
    }));
    let ws;
    try {
      for (const item of bindings)
        await writeFile(
          item.path,
          "<" +
            shared +
            "> a <" +
            owl +
            "Ontology>; <" +
            owl +
            "versionIRI> <" +
            item.iri +
            "> .",
        );
      await writeFile(file, "<urn:root> a <" + owl + "Ontology> .");
      ws = await createFileOntologyWorkspace({
        file,
        bindings: [...bindings, { iri: shared, path: bindings[1].path }],
        requireComplete: true,
      });
      const accepted = ws.list();
      await writeFile(
        file,
        "<urn:root> a <" +
          owl +
          "Ontology>; <" +
          owl +
          "imports> <urn:" +
          first +
          ">, <" +
          shared +
          ">, <urn:" +
          second +
          "> .",
      );
      await expect(ws.openDocument({ path: file })).rejects.toMatchObject({
        errorCode: "ONTOLOGY_DOCUMENT_REFUSED",
      });
      expect(ws.list()).toEqual(accepted);
    } finally {
      await ws?.close();
      await rm(temp, { recursive: true, force: true });
    }
  },
  30000,
);
