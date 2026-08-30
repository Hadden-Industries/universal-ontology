import { readFile } from "node:fs/promises";

import { renderOntologyAssetsWithWorkers } from "../../scripts/build/ontologyAssetWorkerPool.js";
import { OntologyReleaseQueryIndexSchema } from "../../src/ontologyQuery/ontologyQuerySchemas.js";

const workerUrl = new URL(
  "./fixtures/ontology-asset-worker-fixture.js",
  import.meta.url,
);

function fixtureInput({
  outputPath,
  size,
  delayMilliseconds,
  result = outputPath,
  errorMessage,
  control,
  resultFromHistory = false,
}) {
  return {
    outputPath,
    size,
    content: Buffer.from(
      JSON.stringify({
        delayMilliseconds,
        result,
        errorMessage,
        resultFromHistory,
      }),
      "utf8",
    ),
    control,
  };
}

test("returns results in input order when workers finish out of order", async () => {
  const inputs = [
    fixtureInput({
      outputPath: "universal/a/20260101",
      size: 30,
      delayMilliseconds: 40,
    }),
    fixtureInput({
      outputPath: "universal/b/20260101",
      size: 20,
      delayMilliseconds: 5,
    }),
    fixtureInput({
      outputPath: "universal/c/20260101",
      size: 10,
      delayMilliseconds: 20,
    }),
  ];

  const results = await renderOntologyAssetsWithWorkers({
    inputs,
    workerCount: 3,
    workerUrl,
  });

  expect(results.map(({ outputPath }) => outputPath)).toEqual(
    inputs.map(({ outputPath }) => outputPath),
  );
  expect(
    results.map(({ jsonLdContent }) => jsonLdContent.toString("utf8")),
  ).toEqual(inputs.map(({ outputPath }) => outputPath));
  expect(results.map(({ csvContent }) => csvContent.toString("utf8"))).toEqual(
    inputs.map(({ outputPath }) => `csv:${outputPath}`),
  );
  expect(results.every(({ queryIndexContent }) => !queryIndexContent)).toBe(
    true,
  );
});

test("returns only query-index bytes when that asset kind is requested", async () => {
  const inputs = [
    fixtureInput({
      outputPath: "universal/core/20260101",
      size: 10,
      delayMilliseconds: 1,
    }),
  ];

  const results = await renderOntologyAssetsWithWorkers({
    inputs,
    requestedAssetKinds: ["query_index"],
    workerUrl,
  });

  expect(results).toEqual([
    {
      outputPath: "universal/core/20260101",
      queryIndexContent: Buffer.from("query:universal/core/20260101", "utf8"),
    },
  ]);
});

test("rejects empty, duplicate, and unknown requested asset kinds", async () => {
  const inputs = [
    fixtureInput({ outputPath: "fixture", size: 1, delayMilliseconds: 1 }),
  ];

  await expect(
    renderOntologyAssetsWithWorkers({ inputs, requestedAssetKinds: [] }),
  ).rejects.toThrow(/requestedAssetKinds/u);
  await expect(
    renderOntologyAssetsWithWorkers({
      inputs,
      requestedAssetKinds: ["csv", "csv"],
    }),
  ).rejects.toThrow(/requestedAssetKinds/u);
  await expect(
    renderOntologyAssetsWithWorkers({
      inputs,
      requestedAssetKinds: ["unsupported"],
    }),
  ).rejects.toThrow(/requestedAssetKinds/u);
});

test("the production worker projects query-index bytes from the same parsed quads", async () => {
  const content = await readFile(
    new URL(
      "../fixtures/ontology-query/minimal-ontology-release",
      import.meta.url,
    ),
  );
  const [result] = await renderOntologyAssetsWithWorkers({
    inputs: [
      {
        outputPath: "universal/test/20260830",
        content,
        size: content.byteLength,
        fallbackBaseIRI: "https://example.com/ontology/test/",
        ontologyArtifactFamilyId: "universal/test",
        versionTag: "20260830",
        sourceArtifactUrl: "https://example.com/ontology/test/20260830",
      },
    ],
    workerCount: 1,
    requestedAssetKinds: ["query_index"],
  });

  expect(result.jsonLdContent).toBeUndefined();
  expect(result.csvContent).toBeUndefined();
  expect(result.queryIndexContent.at(-1)).toBe(0x0a);
  expect(
    OntologyReleaseQueryIndexSchema.parse(
      JSON.parse(result.queryIndexContent.toString("utf8")),
    ),
  ).toMatchObject({
    resolvedOntologyRelease: {
      ontologyArtifactFamilyId: "universal/test",
      versionTag: "20260830",
    },
  });
});

test("uses deterministic size-balanced worker queues", async () => {
  const inputs = [
    fixtureInput({
      outputPath: "a",
      size: 100,
      delayMilliseconds: 5,
      resultFromHistory: true,
    }),
    fixtureInput({
      outputPath: "b",
      size: 90,
      delayMilliseconds: 40,
      resultFromHistory: true,
    }),
    fixtureInput({
      outputPath: "c",
      size: 80,
      delayMilliseconds: 5,
      resultFromHistory: true,
    }),
    fixtureInput({
      outputPath: "d",
      size: 70,
      delayMilliseconds: 5,
      resultFromHistory: true,
    }),
  ];

  const results = await renderOntologyAssetsWithWorkers({
    inputs,
    workerCount: 2,
    workerUrl,
  });

  expect(
    results.map(({ jsonLdContent }) => jsonLdContent.toString("utf8")),
  ).toEqual(["a", "b", "b,c", "a,d"]);
});

test("runs no more than the requested number of tasks concurrently", async () => {
  const control = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3);
  const inputs = Array.from({ length: 6 }, (_, index) =>
    fixtureInput({
      outputPath: `universal/core/2026010${index + 1}`,
      size: 6 - index,
      delayMilliseconds: 25,
      control,
    }),
  );

  await renderOntologyAssetsWithWorkers({ inputs, workerCount: 2, workerUrl });

  const counters = new Int32Array(control);
  expect(counters[0]).toBe(0);
  expect(counters[1]).toBe(2);
  expect(counters[2]).toBe(6);
});

test("stops dispatching and reports the lexical-first active failure", async () => {
  const control = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3);
  const inputs = [
    fixtureInput({
      outputPath: "universal/Z/20260101",
      size: 100,
      delayMilliseconds: 5,
      errorMessage: "uppercase failed first",
      control,
    }),
    fixtureInput({
      outputPath: "universal/a/20260101",
      size: 90,
      delayMilliseconds: 25,
      errorMessage: "a failed later",
      control,
    }),
    fixtureInput({
      outputPath: "universal/pending/20260101",
      size: 80,
      delayMilliseconds: 1,
      control,
    }),
  ];

  await expect(
    renderOntologyAssetsWithWorkers({ inputs, workerCount: 2, workerUrl }),
  ).rejects.toThrow(/universal\/Z\/20260101.*uppercase failed first/u);

  expect(new Int32Array(control)[2]).toBe(2);
});
