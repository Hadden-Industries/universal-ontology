import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createOntologyQueryArtifacts } from "../../scripts/build/createOntologyQueryArtifacts.js";
import { serializeCanonicalOntologyQueryJsonDocument } from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
} from "../../src/ontologyQuery/ontologyQueryArtifactLimits.js";
import {
  parseOntologyQueryCatalogBytes,
  parseOntologyReleaseQueryIndexBytes,
} from "../../src/ontologyQuery/ontologyQueryArtifactParsing.js";

const MINIMAL_ONTOLOGY_RELEASE_URL = new URL(
  "../fixtures/ontology-query/minimal-ontology-release",
  import.meta.url,
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createOntologySource(root, outputPath, content) {
  const sourcePath = join(root, ...outputPath.split("/"));
  await mkdir(dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, content);
  return { sourcePath, outputPath };
}

describe("ontology query-artifact producer", () => {
  test("returns one canonical content-addressed catalog plus identical compatibility bytes", async () => {
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "uo-query-artifacts-contract-"),
    );
    const fixtureBytes = await readFile(MINIMAL_ONTOLOGY_RELEASE_URL);

    try {
      const ontologySources = await Promise.all([
        createOntologySource(
          temporaryRoot,
          "universal/test/20260830",
          fixtureBytes,
        ),
        createOntologySource(
          temporaryRoot,
          "universal/test/20260829",
          fixtureBytes,
        ),
        createOntologySource(temporaryRoot, "universal/test/v1", fixtureBytes),
      ]);
      const result = await createOntologyQueryArtifacts({
        ontologySources: ontologySources.reverse(),
        workerCount: 2,
      });
      const {
        catalog,
        catalogContent,
        catalogSha256,
        catalogRelativePath,
        artifactContentsByRelativePath,
      } = result;

      expect(catalogRelativePath).toBe(`catalogs/${catalogSha256}.json`);
      expect(catalogSha256).toBe(sha256(catalogContent));
      expect(Buffer.from(catalogContent)).toEqual(
        Buffer.from(serializeCanonicalOntologyQueryJsonDocument(catalog)),
      );
      expect(parseOntologyQueryCatalogBytes(catalogContent)).toEqual(catalog);
      expect(catalogContent.byteLength).toBeLessThanOrEqual(
        MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
      );
      expect(
        catalog.releases.map(
          ({ ontologyArtifactFamilyId, versionTag }) =>
            `${ontologyArtifactFamilyId}/${versionTag}`,
        ),
      ).toEqual([
        "universal/test/20260829",
        "universal/test/20260830",
        "universal/test/v1",
      ]);

      const expectedReleasePaths = catalog.releases.map(
        ({ queryIndexRelativePath }) => queryIndexRelativePath,
      );
      expect([...artifactContentsByRelativePath.keys()]).toEqual([
        ...expectedReleasePaths,
        catalogRelativePath,
        "catalog.json",
      ]);
      expect(artifactContentsByRelativePath.get(catalogRelativePath)).toEqual(
        catalogContent,
      );
      expect(artifactContentsByRelativePath.get("catalog.json")).toEqual(
        catalogContent,
      );

      for (const release of catalog.releases) {
        const releaseBytes = artifactContentsByRelativePath.get(
          release.queryIndexRelativePath,
        );

        expect(sha256(releaseBytes)).toBe(release.queryIndexSha256);
        expect(releaseBytes.byteLength).toBeLessThanOrEqual(
          MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
        );
        expect(parseOntologyReleaseQueryIndexBytes(releaseBytes)).toMatchObject(
          {
            resolvedOntologyRelease: {
              ontologyArtifactFamilyId: release.ontologyArtifactFamilyId,
              versionTag: release.versionTag,
            },
          },
        );
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("is byte-for-byte deterministic across source and caller property order", async () => {
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "uo-query-artifacts-determinism-"),
    );
    const fixtureBytes = await readFile(MINIMAL_ONTOLOGY_RELEASE_URL);

    try {
      const firstSource = await createOntologySource(
        temporaryRoot,
        "universal/alpha/20260830",
        fixtureBytes,
      );
      const secondSource = await createOntologySource(
        temporaryRoot,
        "universal/beta/20260830",
        fixtureBytes,
      );
      const forward = await createOntologyQueryArtifacts({
        ontologySources: [firstSource, secondSource],
        workerCount: 1,
      });
      const reorderedCallerObjects = [
        {
          outputPath: secondSource.outputPath,
          sourcePath: secondSource.sourcePath,
        },
        {
          outputPath: firstSource.outputPath,
          sourcePath: firstSource.sourcePath,
        },
      ];
      const reordered = await createOntologyQueryArtifacts({
        ontologySources: reorderedCallerObjects,
        workerCount: 2,
      });

      expect(reordered.catalog).toEqual(forward.catalog);
      expect(reordered.catalogSha256).toBe(forward.catalogSha256);
      expect(Buffer.from(reordered.catalogContent)).toEqual(
        Buffer.from(forward.catalogContent),
      );
      expect([...reordered.artifactContentsByRelativePath]).toEqual([
        ...forward.artifactContentsByRelativePath,
      ]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
