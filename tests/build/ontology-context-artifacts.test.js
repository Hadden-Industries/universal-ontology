import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createOntologyQueryArtifacts } from "../../scripts/build/createOntologyQueryArtifacts.js";
import { readOntologySourceCatalog } from "../../scripts/build/readOntologySourceCatalog.js";

test("captures only reachable catalogued imports including Gregorian Turtle", async () => {
  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const sourceCatalog = await readOntologySourceCatalog({
    repositoryRoot,
    catalogPath: fileURLToPath(
      new URL("../../core/catalog-v001.xml", import.meta.url),
    ),
  });
  // A supplied policy projection keeps this generator test Node-only.
  // The real policy-owner bridge is exercised by local CLI qualification.
  const ownershipInventory = {
    sha256: "a".repeat(64),
    modules: [
      {
        ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
        ownedNamespaces: [
          "https://haddenindustries.com/ontology/universal/core/",
        ],
        activeArtifactPath: "src/universal/core/20260912",
        activeContentDigest: `sha256:${createHash("sha256")
          .update(
            await readFile(
              new URL("../../src/universal/core/20260912", import.meta.url),
            ),
          )
          .digest("hex")}`,
      },
    ],
  };
  const result = await createOntologyQueryArtifacts({
    ontologySources: [
      {
        sourcePath: fileURLToPath(
          new URL("../../src/universal/core/20260912", import.meta.url),
        ),
        outputPath: "universal/core/20260912",
      },
    ],
    sourceCatalog,
    ownershipInventory,
    repositoryRoot,
    workerCount: 1,
  });
  expect(result.catalog.releases).toHaveLength(6);
  expect(
    result.catalog.releases.some(
      ({ ontologyIri }) =>
        ontologyIri === "http://www.w3.org/ns/time/gregorian",
    ),
  ).toBe(true);
  const root = result.catalog.releases.find(
    ({ ontologyArtifactFamilyId }) =>
      ontologyArtifactFamilyId === "universal/core",
  );
  expect(root.importCoverage.unresolved).toEqual([]);
  expect(root.activePublication).toBe(true);
  expect(root.ownedNamespaces).toContain(
    "https://haddenindustries.com/ontology/universal/core/",
  );
  expect(root.importCoverage.resolved.length).toBeGreaterThan(0);
}, 30000);

test("publishes canonical RDF and lexical bytes under the same immutable snapshot", async () => {
  const sourcePath = fileURLToPath(
    new URL(
      "../fixtures/ontology-query/minimal-ontology-release",
      import.meta.url,
    ),
  );
  const result = await createOntologyQueryArtifacts({
    ontologySources: [{ sourcePath, outputPath: "universal/test/20260830" }],
    workerCount: 1,
  });
  const release = result.catalog.releases[0];
  expect(release.dataset).toBeDefined();
  const bytes = result.artifactContentsByRelativePath.get(
    release.dataset.relativePath,
  );
  expect(bytes.byteLength).toBe(release.dataset.byteLength);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    release.dataset.sha256,
  );
  expect(release.sourceArtifactSha256).toBe(
    createHash("sha256")
      .update(await readFile(sourcePath))
      .digest("hex"),
  );
  expect(bytes.toString("utf8")).toContain('"');
  expect(release.snapshotId).toMatch(/^urn:uo:snapshot:[a-f0-9]{64}$/u);
  expect(release.declaredImports).toEqual([]);
  expect(result.catalog.queryArtifactFormatVersion).toBe(2);
  await expect(result.assertSourcesUnchanged()).resolves.toBeUndefined();
});
