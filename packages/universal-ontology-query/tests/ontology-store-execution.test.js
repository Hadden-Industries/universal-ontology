import { readFile, mkdtemp, copyFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { build } from "esbuild";
import { createOntologyStoreExecution } from "../src/createOntologyStoreExecution.js";

const graph = "urn:fixture:root";
const dataset = `<urn:a> <urn:link> <urn:b> <${graph}> .\n<urn:b> <urn:link> <urn:a> <${graph}> .\n`;
const key = createHash("sha256").update(dataset).digest("hex");
const query =
  "SELECT ?target WHERE { GRAPH <urn:fixture:root> { <urn:a> <urn:link> ?target } } LIMIT 10";

test("pages metadata results and explains an explicitly bounded two-hop connection", async () => {
  const nquads = `<urn:a> <urn:link> <urn:b> <urn:root> .
    <urn:b> <urn:link> <urn:c> <urn:root> .
    <urn:c> <urn:link> <urn:a> <urn:root> .
    <urn:a> <urn:definition> "A" <urn:root> .
    <urn:b> <urn:definition> "B" <urn:root> .
    <urn:c> <urn:definition> "C" <urn:root> .`;
  const datasetKey = createHash("sha256").update(nquads).digest("hex");
  const execution = createOntologyStoreExecution();
  try {
    const first = await execution.query({
      datasetKey,
      nquads,
      query:
        "SELECT ?entity WHERE { GRAPH <urn:root> { ?entity <urn:definition> ?definition } } ORDER BY ?entity LIMIT 2",
    });
    const next = await execution.query({
      datasetKey,
      nquads,
      query:
        'SELECT ?entity WHERE { GRAPH <urn:root> { ?entity <urn:definition> ?definition } FILTER(STR(?entity) > "urn:b") } ORDER BY ?entity LIMIT 2',
    });
    expect(first.map(({ entity }) => entity.value)).toEqual(["urn:a", "urn:b"]);
    expect(next.map(({ entity }) => entity.value)).toEqual(["urn:c"]);
    const direct = await execution.query({
      datasetKey,
      nquads,
      query:
        "SELECT ?predicate WHERE { GRAPH <urn:root> { <urn:a> ?predicate <urn:c> } } LIMIT 10",
    });
    expect(direct).toEqual([]);
    const path = await execution.query({
      datasetKey,
      nquads,
      query:
        "SELECT ?middle ?first ?second WHERE { GRAPH <urn:root> { <urn:a> ?first ?middle . ?middle ?second <urn:c> } } ORDER BY ?middle ?first ?second LIMIT 10",
    });
    expect(path).toEqual([
      {
        middle: { termType: "NamedNode", value: "urn:b" },
        first: { termType: "NamedNode", value: "urn:link" },
        second: { termType: "NamedNode", value: "urn:link" },
      },
    ]);
  } finally {
    await execution.close();
  }
});

test("matches exact definition citations across selected graphs without borrowing another language", async () => {
  const definition = "http://www.w3.org/2004/02/skos/core#definition";
  const owl = "http://www.w3.org/2002/07/owl#";
  const source = "http://purl.org/dc/terms/source";
  const nquads = `
    <urn:a> <${definition}> "Same words"@en <urn:root> .
    <urn:a> <${definition}> "Same words"@fr <urn:root> .
    _:citation <${owl}annotatedSource> <urn:a> <urn:import> .
    _:citation <${owl}annotatedProperty> <${definition}> <urn:import> .
    _:citation <${owl}annotatedTarget> "Same words"@en <urn:import> .
    _:citation <${source}> "Printed reference" <urn:import> .
    _:outside <${owl}annotatedSource> <urn:a> <urn:unselected> .
    _:outside <${owl}annotatedProperty> <${definition}> <urn:unselected> .
    _:outside <${owl}annotatedTarget> "Same words"@fr <urn:unselected> .
    _:outside <${source}> <urn:reference> <urn:unselected> .`;
  const execution = createOntologyStoreExecution();
  try {
    const rows = await execution.query({
      datasetKey: createHash("sha256").update(nquads).digest("hex"),
      nquads,
      query: `
      SELECT ?term ?source ?annotationGraph WHERE {
        GRAPH <urn:root> { <urn:a> <${definition}> ?term }
        OPTIONAL { VALUES ?annotationGraph { <urn:root> <urn:import> }
          GRAPH ?annotationGraph {
            ?axiom <${owl}annotatedSource> <urn:a>; <${owl}annotatedProperty> <${definition}>;
              <${owl}annotatedTarget> ?term; <${source}> ?source .
          }
        }
      } ORDER BY LANG(?term) LIMIT 10`,
    });
    expect(rows).toEqual([
      {
        term: {
          termType: "Literal",
          value: "Same words",
          language: "en",
          datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
        },
        source: {
          termType: "Literal",
          value: "Printed reference",
          language: "",
          datatype: "http://www.w3.org/2001/XMLSchema#string",
        },
        annotationGraph: { termType: "NamedNode", value: "urn:import" },
      },
      {
        term: {
          termType: "Literal",
          value: "Same words",
          language: "fr",
          datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
        },
      },
    ]);
  } finally {
    await execution.close();
  }
});

test("loads the bundled CommonJS worker and adjacent WASM from an unrelated directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uo-store-bundle-"));
  try {
    await build({
      entryPoints: [
        fileURLToPath(
          new URL("../src/createOntologyStoreExecution.js", import.meta.url),
        ),
      ],
      outfile: join(directory, "execution.mjs"),
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
    });
    await build({
      entryPoints: [
        fileURLToPath(
          new URL("../src/ontologyStoreWorker.cjs", import.meta.url),
        ),
      ],
      outfile: join(directory, "ontologyStoreWorker.cjs"),
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
    });
    await copyFile(
      fileURLToPath(
        new URL("../../../node_modules/oxigraph/node_bg.wasm", import.meta.url),
      ),
      join(directory, "node_bg.wasm"),
    );
    const script = `import {createOntologyStoreExecution} from ${JSON.stringify(pathToFileURL(join(directory, "execution.mjs")).href)};
      const execution = createOntologyStoreExecution({onEvent: event => console.error(JSON.stringify(event))});
      try { console.log(JSON.stringify(await execution.query(${JSON.stringify({ datasetKey: key, nquads: dataset, query })}))); }
      finally { await execution.close(); }`;
    const result = await promisify(execFile)(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: tmpdir(), timeout: 15000 },
    );
    expect(JSON.parse(result.stdout)).toEqual([
      { target: { termType: "NamedNode", value: "urn:b" } },
    ]);
    expect(result.stderr).toContain('"event":"store_loaded"');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);

test("stops a running store query at its deadline without client cancellation", async () => {
  const events = [];
  const execution = createOntologyStoreExecution({
    onEvent: (event) => events.push(event),
  });
  const dense = Array.from(
    { length: 150 },
    (_, index) =>
      `<urn:n${index}> <urn:link> <urn:n${(index + 1) % 150}> <${graph}> .`,
  ).join("\n");
  try {
    await expect(
      execution.query({
        datasetKey: createHash("sha256").update(dense).digest("hex"),
        nquads: dense,
        query:
          "SELECT (COUNT(*) AS ?count) WHERE { GRAPH <urn:fixture:root> { ?a ?b ?c . ?d ?e ?f . ?g ?h ?i . ?j ?k ?l . ?m ?n ?o } }",
      }),
    ).rejects.toMatchObject({ errorCode: "QUERY_DEADLINE_EXCEEDED" });
    expect(events.some(({ event }) => event === "query_started")).toBe(true);
    expect(events.some(({ event }) => event === "worker_terminated")).toBe(
      true,
    );
    expect(
      await execution.query({ datasetKey: key, nquads: dataset, query }),
    ).toEqual([{ target: { termType: "NamedNode", value: "urn:b" } }]);
  } finally {
    await execution.close();
  }
}, 15000);

test("returns RDF terms from the selected named graph and reuses its warm store", async () => {
  const events = [];
  const execution = createOntologyStoreExecution({
    onEvent: (event) => events.push(event),
  });
  try {
    const result = await execution.query({
      datasetKey: key,
      nquads: dataset,
      query,
    });
    expect(result).toEqual([
      { target: { termType: "NamedNode", value: "urn:b" } },
    ]);
    expect(
      await execution.query({ datasetKey: key, nquads: dataset, query }),
    ).toEqual(result);
    expect(events.filter(({ event }) => event === "store_loaded")).toHaveLength(
      1,
    );
  } finally {
    await execution.close();
  }
});

test("terminates an executing dense join on cancellation and preserves a queued sibling", async () => {
  let started;
  const active = new Promise((resolve) => {
    started = resolve;
  });
  const execution = createOntologyStoreExecution({
    onEvent: ({ event }) => {
      if (event === "query_started") started();
    },
  });
  const controller = new AbortController();
  const dense = Array.from(
    { length: 150 },
    (_, index) =>
      `<urn:n${index}> <urn:link> <urn:n${(index + 1) % 150}> <${graph}> .`,
  ).join("\n");
  const denseKey = createHash("sha256").update(dense).digest("hex");
  try {
    const first = execution.query({
      datasetKey: denseKey,
      nquads: dense,
      query:
        "SELECT (COUNT(*) AS ?count) WHERE { GRAPH <urn:fixture:root> { ?a ?b ?c . ?d ?e ?f . ?g ?h ?i . ?j ?k ?l . ?m ?n ?o } }",
      signal: controller.signal,
    });
    const rejected = expect(first).rejects.toMatchObject({
      errorCode: "QUERY_CANCELLED",
    });
    await active;
    const sibling = execution.query({
      datasetKey: key,
      nquads: dataset,
      query,
    });
    const before = performance.now();
    controller.abort();
    await rejected;
    expect(await sibling).toEqual([
      { target: { termType: "NamedNode", value: "urn:b" } },
    ]);
    expect(performance.now() - before).toBeLessThan(5000);
  } finally {
    await execution.close();
  }
}, 15000);

test("rejects oversized datasets before creating execution state", async () => {
  const execution = createOntologyStoreExecution();
  try {
    await expect(
      execution.query({
        datasetKey: key,
        nquads: "x".repeat(8 * 1024 * 1024 + 1),
        query,
      }),
    ).rejects.toMatchObject({ errorCode: "DATASET_LIMIT_EXCEEDED" });
  } finally {
    await execution.close();
  }
});

test("the pinned core exposes all three qualified AddressRelationship roles", async () => {
  const { parseRdfXmlToQuads } =
    await import("../../../scripts/rdfXmlToJsonLd.js");
  const { default: canonicalize } = await import("rdf-canonize");
  const source = await readFile(
    new URL("../../../src/universal/core/20260912", import.meta.url),
  );
  expect(createHash("sha256").update(source).digest("hex")).toBe(
    "214f21e9116c0515bd52e5e8e893c83fcf93eb4ce586a49dbd8afc8a05e2c190",
  );
  const quads = await parseRdfXmlToQuads({
    rdfXml: source,
    sourceName: "core",
    fallbackBaseIri: "https://haddenindustries.com/ontology/universal/core/",
  });
  const nquads = await canonicalize.canonize([...quads], {
    algorithm: "RDFC-1.0",
  });
  const execution = createOntologyStoreExecution();
  try {
    const result = await execution.query({
      datasetKey: createHash("sha256").update(nquads).digest("hex"),
      nquads,
      query: `PREFIX owl: <http://www.w3.org/2002/07/owl#>
      SELECT ?property ?filler ?cardinality WHERE {
        <https://haddenindustries.com/ontology/universal/core/AddressRelationship> <http://www.w3.org/2000/01/rdf-schema#subClassOf> ?restriction .
        ?restriction owl:onProperty ?property; owl:onClass ?filler; owl:qualifiedCardinality ?cardinality .
      } ORDER BY ?property LIMIT 10`,
    });
    expect(
      result.map(({ property, filler, cardinality }) => [
        property.value.split("/").at(-1),
        filler.value.split("/").at(-1),
        cardinality.value,
      ]),
    ).toEqual([
      ["hasAddressIs", "Address", "1"],
      ["hasAddressOf", "Address", "1"],
      ["hasAddressRelationshipType", "AddressRelationshipType", "1"],
    ]);
  } finally {
    await execution.close();
  }
}, 15000);
