import * as nodeFileSystem from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createUniversalOntologyMcpSpdxSboms } from "../../scripts/distribution/createUniversalOntologyMcpSpdxSbom.js";
import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

const BUNDLED_COMPONENTS = Object.freeze([
  { name: "@modelcontextprotocol/core", version: "2.0.0", license: "MIT" },
  { name: "@modelcontextprotocol/server", version: "2.0.0", license: "MIT" },
  { name: "ajv", version: "8.18.0", license: "MIT" },
  { name: "ajv-formats", version: "3.0.1", license: "MIT" },
  { name: "fast-deep-equal", version: "3.1.3", license: "MIT" },
  { name: "fast-uri", version: "3.1.0", license: "BSD-3-Clause" },
  { name: "json-schema-traverse", version: "1.0.0", license: "MIT" },
  { name: "zod", version: "4.5.4", license: "MIT" },
]);

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJsonDocument(filePath) {
  return JSON.parse(await nodeFileSystem.readFile(filePath, "utf8"));
}

describe("Universal Ontology MCP SPDX SBOMs", () => {
  test("deterministically covers bundled components, Node runtimes, and exact release assets", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-spdx-"),
    );
    const releaseDirectoryPath = join(temporaryDirectoryPath, "release");
    const applicationBundleMetadataPath = join(
      temporaryDirectoryPath,
      "application-bundle-metadata.json",
    );
    const sourceDateEpochSeconds = 1_700_000_000;

    try {
      await nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true });
      const releaseInputs = await readUniversalOntologyMcpReleaseInputs();
      const payloadFileNames = [
        "universal-ontology-mcp-server-1.0.0.tgz",
        ...releaseInputs.nodeRuntime.targets.map(
          ({ targetName, releaseArchiveFormat }) =>
            `universal-ontology-mcp-server-v1.0.0-${targetName}.${releaseArchiveFormat === "zip" ? "zip" : "tar.gz"}`,
        ),
      ];
      for (const payloadFileName of payloadFileNames) {
        await nodeFileSystem.writeFile(
          join(releaseDirectoryPath, payloadFileName),
          `synthetic release payload for ${payloadFileName}\n`,
          "utf8",
        );
      }
      await nodeFileSystem.writeFile(
        applicationBundleMetadataPath,
        `${JSON.stringify({
          applicationBundleMetadataFormatVersion: 1,
          packageName: "universal-ontology-mcp-server",
          packageVersion: "1.0.0",
          bundleRelativePath:
            "packages/universal-ontology-mcp-server/dist/universal-ontology-mcp-server.mjs",
          bundleByteLength: 1024,
          bundleSha256: "1".repeat(64),
          bundledComponents: BUNDLED_COMPONENTS,
        })}\n`,
        "utf8",
      );

      const firstResult = await createUniversalOntologyMcpSpdxSboms({
        releaseDirectoryPath,
        applicationBundleMetadataPath,
        sourceDateEpochSeconds,
      });
      const firstReleaseSbomBytes = await nodeFileSystem.readFile(
        firstResult.releaseSbomPath,
      );
      const firstPackageSbomBytes = await nodeFileSystem.readFile(
        firstResult.packageSbomPath,
      );
      const secondResult = await createUniversalOntologyMcpSpdxSboms({
        releaseDirectoryPath,
        applicationBundleMetadataPath,
        sourceDateEpochSeconds,
      });
      await expect(
        nodeFileSystem.readFile(secondResult.releaseSbomPath),
      ).resolves.toEqual(firstReleaseSbomBytes);
      await expect(
        nodeFileSystem.readFile(secondResult.packageSbomPath),
      ).resolves.toEqual(firstPackageSbomBytes);

      const [releaseSbom, packageSbom, checksumsText, ociMetadata] =
        await Promise.all([
          readJsonDocument(firstResult.releaseSbomPath),
          readJsonDocument(firstResult.packageSbomPath),
          nodeFileSystem.readFile(firstResult.checksumsPath, "utf8"),
          readJsonDocument(firstResult.ociMetadataPath),
        ]);
      for (const sbom of [releaseSbom, packageSbom]) {
        expect(sbom).toMatchObject({
          spdxVersion: "SPDX-2.3",
          dataLicense: "CC0-1.0",
          SPDXID: "SPDXRef-DOCUMENT",
          creationInfo: {
            created: "2023-11-14T22:13:20.000Z",
            creators: expect.arrayContaining([
              "Tool: createUniversalOntologyMcpSpdxSbom.js-1.0.0",
            ]),
          },
          packages: expect.any(Array),
          relationships: expect.any(Array),
        });
        expect(sbom.documentNamespace).toContain("/1.0.0/");
        expect(JSON.stringify(sbom)).not.toMatch(
          /[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/iu,
        );
      }

      const releasePackageNames = new Set(
        releaseSbom.packages.map(({ name }) => name),
      );
      expect(releasePackageNames).toEqual(
        new Set([
          "universal-ontology-mcp-server",
          ...BUNDLED_COMPONENTS.map(({ name }) => name),
          "node",
          ...payloadFileNames,
          firstResult.ociMetadataFileName,
          firstResult.registryDocumentFileName,
          firstResult.releaseNotesFileName,
        ]),
      );
      const packageSbomNames = new Set(
        packageSbom.packages.map(({ name }) => name),
      );
      expect(packageSbomNames).toEqual(
        new Set([
          "universal-ontology-mcp-server",
          ...BUNDLED_COMPONENTS.map(({ name }) => name),
          "universal-ontology-mcp-server-1.0.0.tgz",
        ]),
      );
      expect(
        packageSbom.packages.find(
          ({ name }) => name === "@modelcontextprotocol/server",
        ).externalRefs,
      ).toContainEqual({
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: "pkg:npm/%40modelcontextprotocol/server@2.0.0",
      });
      for (const relationshipType of [
        "CONTAINS",
        "DEPENDS_ON",
        "DESCRIBES",
        "GENERATED_FROM",
      ]) {
        expect(
          releaseSbom.relationships.some(
            (relationship) =>
              relationship.relationshipType === relationshipType,
          ),
        ).toBe(true);
      }

      expect(ociMetadata).toMatchObject({
        ociImageMetadataFormatVersion: 1,
        imageReference:
          "ghcr.io/hadden-industries/universal-ontology-mcp-server:1.0.0",
        platforms: ["linux/amd64", "linux/arm64"],
        user: "node:node",
        entrypoint: ["node", "/opt/universal-ontology-mcp-server/server.mjs"],
        exposedPorts: [],
      });

      const checksumLines = checksumsText.trimEnd().split("\n");
      const checksumFileNames = checksumLines.map((line) => line.slice(66));
      expect(checksumFileNames).toEqual(
        [...checksumFileNames].sort((left, right) =>
          Buffer.compare(Buffer.from(left), Buffer.from(right)),
        ),
      );
      for (const checksumLine of checksumLines) {
        const checksum = checksumLine.slice(0, 64);
        const fileName = checksumLine.slice(66);
        expect(checksumLine.slice(64, 66)).toBe("  ");
        expect(checksum).toBe(
          calculateSha256(
            await nodeFileSystem.readFile(join(releaseDirectoryPath, fileName)),
          ),
        );
      }
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  }, 30_000);
});
