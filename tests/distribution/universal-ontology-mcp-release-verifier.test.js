import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

import * as tar from "tar";
import yazl from "yazl";

import { createUniversalOntologyMcpSpdxSboms } from "../../scripts/distribution/createUniversalOntologyMcpSpdxSbom.js";
import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";
import { verifyUniversalOntologyMcpRelease } from "../../scripts/distribution/verifyUniversalOntologyMcpRelease.js";
import { reverseObjectMembers } from "../fixtures/json/reverseObjectMembers.js";

const SOFTWARE_VERSION = "1.0.0";
const RELEASE_TAG = `universal-ontology-mcp-server-v${SOFTWARE_VERSION}`;
const RELEASE_BASE_NAME = `${RELEASE_TAG}`;
const PACKAGE_NAME = "universal-ontology-mcp-server";
const SOURCE_DATE_EPOCH_SECONDS = 1_700_000_000;
const APPLICATION_BYTES = Buffer.from(
  "#!/usr/bin/env node\nprocess.stdout.write('synthetic fixture');\n",
);
const CONTEXT_ASSETS = [
  ["ontologyStoreWorker.cjs", Buffer.from("// Synthetic context worker\n")],
  ["node_bg.wasm", Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])],
];
const VENDOR_FILES = [
  ["third-party/oxigraph/LICENSE-MIT", Buffer.from("MIT fixture\n")],
  ["third-party/oxigraph/component-notices.json", Buffer.from("{}\n")],
];
const BUNDLED_COMPONENTS = Object.freeze([
  {
    name: "@modelcontextprotocol/core",
    version: "2.0.0",
    license: "MIT",
  },
  {
    name: "@modelcontextprotocol/server",
    version: "2.0.0",
    license: "MIT",
  },
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

async function createZipArchive(archivePath, entries) {
  const zipFile = new yazl.ZipFile();
  const archivePipeline = pipeline(
    zipFile.outputStream,
    createWriteStream(archivePath, { flags: "wx", mode: 0o600 }),
  );

  for (const entry of entries) {
    zipFile.addBuffer(entry.bytes, entry.path, {
      mode: entry.mode,
      mtime: new Date(SOURCE_DATE_EPOCH_SECONDS * 1000),
      compress: true,
      compressionLevel: 9,
    });
  }
  zipFile.end();
  await archivePipeline;
}

async function createTarGzipArchive(archivePath, entries) {
  const stagingDirectoryPath = `${archivePath}.staging`;
  await nodeFileSystem.mkdir(stagingDirectoryPath, { recursive: false });

  try {
    for (const entry of entries) {
      const stagedPath = join(stagingDirectoryPath, ...entry.path.split("/"));
      await nodeFileSystem.mkdir(dirname(stagedPath), { recursive: true });
      await nodeFileSystem.writeFile(stagedPath, entry.bytes, {
        flag: "wx",
        mode: entry.mode,
      });
    }
    await tar.create(
      {
        cwd: stagingDirectoryPath,
        file: archivePath,
        gzip: { level: 9, mtime: SOURCE_DATE_EPOCH_SECONDS },
        portable: true,
        noDirRecurse: true,
        noPax: true,
        mtime: new Date(SOURCE_DATE_EPOCH_SECONDS * 1000),
        strict: true,
      },
      entries.map(({ path }) => path),
    );
  } finally {
    await nodeFileSystem.rm(stagingDirectoryPath, {
      recursive: true,
      force: true,
    });
  }
}

function createPlatformArchiveEntries(
  target,
  applicationBytes,
  runtimeExecutableBytes,
) {
  const archiveRootName = `${RELEASE_BASE_NAME}-${target.targetName}`;
  const regularTextEntries = [
    ["LICENSE", "MIT license fixture\n"],
    ["README.md", "Synthetic release archive fixture.\n"],
    ["THIRD_PARTY_NOTICES.md", "Synthetic third-party notices.\n"],
  ];
  return [
    ...CONTEXT_ASSETS.map(([name, bytes]) => ({
      path: `${archiveRootName}/app/${name}`,
      bytes,
      mode: 0o100644,
    })),
    ...VENDOR_FILES.map(([name, bytes]) => ({
      path: `${archiveRootName}/${name}`,
      bytes,
      mode: 0o100644,
    })),
    ...regularTextEntries.map(([relativePath, content]) => ({
      path: `${archiveRootName}/${relativePath}`,
      bytes: Buffer.from(content),
      mode: 0o100644,
    })),
    {
      path: `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
      bytes: applicationBytes,
      mode: 0o100755,
    },
    {
      path: `${archiveRootName}/${target.packagedRuntimeExecutablePath}`,
      bytes:
        runtimeExecutableBytes ??
        Buffer.from(`synthetic Node ${target.targetName} runtime`),
      mode: 0o100755,
    },
  ].sort(({ path: leftPath }, { path: rightPath }) =>
    Buffer.compare(Buffer.from(leftPath), Buffer.from(rightPath)),
  );
}

async function createNpmTarball(releaseDirectoryPath, applicationBytes) {
  const npmPackageDocument = {
    name: PACKAGE_NAME,
    version: SOFTWARE_VERSION,
    type: "module",
    bin: {
      "universal-ontology-mcp-server": "dist/universal-ontology-mcp-server.mjs",
    },
    engines: { node: ">=24.0.0" },
    mcpName: "io.github.hadden-industries/universal-ontology",
    license: "MIT",
  };
  const entries = [
    ...CONTEXT_ASSETS.map(([name, bytes]) => ({
      path: `package/dist/${name}`,
      bytes,
    })),
    ...VENDOR_FILES.map(([name, bytes]) => ({
      path: `package/${name}`,
      bytes,
    })),
    { path: "package/LICENSE", bytes: Buffer.from("MIT license fixture\n") },
    {
      path: "package/README.md",
      bytes: Buffer.from("Synthetic npm package fixture.\n"),
    },
    {
      path: "package/THIRD_PARTY_NOTICES.md",
      bytes: Buffer.from("Synthetic third-party notices.\n"),
    },
    {
      path: "package/dist/universal-ontology-mcp-server.mjs",
      bytes: applicationBytes,
      mode: 0o755,
    },
    {
      path: "package/package.json",
      bytes: Buffer.from(`${JSON.stringify(npmPackageDocument)}\n`),
    },
  ].map((entry) => ({ mode: 0o644, ...entry }));
  await createTarGzipArchive(
    join(releaseDirectoryPath, `${PACKAGE_NAME}-${SOFTWARE_VERSION}.tgz`),
    entries,
  );
}

async function createCompleteReleaseCandidate({
  parentDirectoryPath,
  includeOntologyData = false,
  runtimeExecutableBytes,
}) {
  const releaseDirectoryPath = join(parentDirectoryPath, "release");
  const bundleMetadataPath = join(parentDirectoryPath, "bundle-metadata.json");
  await nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true });
  const applicationBytes = includeOntologyData
    ? Buffer.from(
        `${APPLICATION_BYTES.toString("utf8")}const ontology = "A natural or legal person recognised by law.";\n`,
      )
    : APPLICATION_BYTES;
  const releaseInputs = await readUniversalOntologyMcpReleaseInputs();

  await createNpmTarball(releaseDirectoryPath, applicationBytes);
  for (const target of releaseInputs.nodeRuntime.targets) {
    const archiveExtension =
      target.releaseArchiveFormat === "zip" ? "zip" : "tar.gz";
    const archivePath = join(
      releaseDirectoryPath,
      `${RELEASE_BASE_NAME}-${target.targetName}.${archiveExtension}`,
    );
    const entries = createPlatformArchiveEntries(
      target,
      applicationBytes,
      runtimeExecutableBytes,
    );
    if (target.releaseArchiveFormat === "zip") {
      await createZipArchive(archivePath, entries);
    } else {
      await createTarGzipArchive(archivePath, entries);
    }
  }

  await nodeFileSystem.writeFile(
    bundleMetadataPath,
    `${JSON.stringify({
      applicationBundleMetadataFormatVersion: 1,
      packageName: PACKAGE_NAME,
      packageVersion: SOFTWARE_VERSION,
      bundleSha256: calculateSha256(applicationBytes),
      runtimeAssets: CONTEXT_ASSETS.map(([fileName, bytes]) => ({
        relativePath: fileName,
        byteLength: bytes.length,
        sha256: calculateSha256(bytes),
      })),
      bundledComponents: BUNDLED_COMPONENTS,
    })}\n`,
  );
  await createUniversalOntologyMcpSpdxSboms({
    releaseDirectoryPath,
    applicationBundleMetadataPath: bundleMetadataPath,
    sourceDateEpochSeconds: SOURCE_DATE_EPOCH_SECONDS,
  });
  return releaseDirectoryPath;
}

async function updateChecksumManifest(releaseDirectoryPath) {
  const fileNames = (
    await nodeFileSystem.readdir(releaseDirectoryPath, { withFileTypes: true })
  )
    .filter((entry) => entry.isFile() && entry.name !== "SHA256SUMS")
    .map(({ name }) => name)
    .sort((leftName, rightName) =>
      Buffer.compare(Buffer.from(leftName), Buffer.from(rightName)),
    );
  const checksumLines = [];
  for (const fileName of fileNames) {
    const bytes = await nodeFileSystem.readFile(
      join(releaseDirectoryPath, fileName),
    );
    checksumLines.push(`${calculateSha256(bytes)}  ${fileName}`);
  }
  await nodeFileSystem.writeFile(
    join(releaseDirectoryPath, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );
}

describe("Universal Ontology MCP release verifier", () => {
  let fixtureParentDirectoryPath;
  let baseReleaseDirectoryPath;
  let baseBundleMetadataPath;
  let nativeNpmSbom;

  beforeAll(async () => {
    fixtureParentDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-release-verifier-"),
    );
    baseReleaseDirectoryPath = await createCompleteReleaseCandidate({
      parentDirectoryPath: fixtureParentDirectoryPath,
    });
    baseBundleMetadataPath = join(
      fixtureParentDirectoryPath,
      "bundle-metadata.json",
    );
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        process.env.npm_execpath,
        "sbom",
        "--workspace",
        PACKAGE_NAME,
        "--sbom-format",
        "spdx",
        "--sbom-type",
        "application",
      ],
      { cwd: new URL("../../", import.meta.url), maxBuffer: 8 * 1024 * 1024 },
    );
    nativeNpmSbom = JSON.parse(stdout);
  });

  afterAll(async () => {
    await nodeFileSystem.rm(fixtureParentDirectoryPath, {
      recursive: true,
      force: true,
    });
  });

  async function cloneBaseCandidate(caseName) {
    const candidatePath = join(fixtureParentDirectoryPath, caseName);
    await nodeFileSystem.cp(baseReleaseDirectoryPath, candidatePath, {
      recursive: true,
      errorOnExist: true,
    });
    return candidatePath;
  }

  async function rewriteMetadata(
    candidatePath,
    fileName,
    transform,
    updateIntegrity = true,
  ) {
    const path = join(candidatePath, fileName);
    const before = await nodeFileSystem.readFile(path, "utf8");
    // json-identity-contract: bytes; owner: Release integrity mutation tests; reason: Changed test artifact bytes require refreshed SPDX and checksum bindings.
    const text = `${JSON.stringify(transform(JSON.parse(before)), null, 2)}\n`;
    expect(text).not.toBe(before);
    await nodeFileSystem.writeFile(path, text);
    if (!updateIntegrity) return;
    // These are test-owned release artifacts: changed bytes need new SPDX and
    // checksum bindings even when their JSON data is semantically unchanged.
    const sbomPath = join(
      candidatePath,
      `${RELEASE_BASE_NAME}-release.spdx.json`,
    );
    const sbom = JSON.parse(await nodeFileSystem.readFile(sbomPath, "utf8"));
    const asset = sbom.packages.find(({ name }) => name === fileName);
    expect(asset).toBeDefined();
    asset.checksums.find(
      ({ algorithm }) => algorithm === "SHA256",
    ).checksumValue = calculateSha256(Buffer.from(text));
    await nodeFileSystem.writeFile(
      sbomPath,
      `${JSON.stringify(sbom, null, 2)}\n`,
    );
    await updateChecksumManifest(candidatePath);
  }

  test.each(["server.json", `${RELEASE_BASE_NAME}-oci-metadata.json`])(
    "accepts equivalent object-member permutations in %s",
    async (fileName) => {
      const candidatePath = await cloneBaseCandidate(`reordered-${fileName}`);
      await rewriteMetadata(candidatePath, fileName, reverseObjectMembers);
      await expect(
        verifyUniversalOntologyMcpRelease({
          releaseDirectoryPath: candidatePath,
          tag: RELEASE_TAG,
          applicationBundleMetadataPath: baseBundleMetadataPath,
        }),
      ).resolves.toMatchObject({ verifiedAssetCount: 12 });
    },
  );

  test.each([
    [
      "Registry changed value",
      "server.json",
      (value) => {
        value.description += " changed";
      },
      /Registry document/u,
    ],
    [
      "Registry missing member",
      "server.json",
      (value) => {
        delete value.description;
      },
      /Registry document/u,
    ],
    [
      "Registry extra member",
      "server.json",
      (value) => {
        value.unexpected = true;
      },
      /Registry document/u,
    ],
    [
      "Registry reordered array",
      "server.json",
      (value) => {
        value.packages.reverse();
      },
      /Registry document/u,
    ],
    [
      "OCI changed nested value",
      `${RELEASE_BASE_NAME}-oci-metadata.json`,
      (value) => {
        value.labels["org.opencontainers.image.title"] += " changed";
      },
      /OCI release metadata/u,
    ],
    [
      "OCI missing member",
      `${RELEASE_BASE_NAME}-oci-metadata.json`,
      (value) => {
        delete value.user;
      },
      /OCI release metadata/u,
    ],
    [
      "OCI extra member",
      `${RELEASE_BASE_NAME}-oci-metadata.json`,
      (value) => {
        value.unexpected = true;
      },
      /OCI release metadata/u,
    ],
    [
      "OCI reordered array",
      `${RELEASE_BASE_NAME}-oci-metadata.json`,
      (value) => {
        value.platforms.reverse();
      },
      /OCI release metadata/u,
    ],
  ])(
    "rejects %s after mapping reordering",
    async (name, fileName, mutate, expected) => {
      const candidatePath = await cloneBaseCandidate(name.replaceAll(" ", "-"));
      await rewriteMetadata(candidatePath, fileName, (original) => {
        const reordered = reverseObjectMembers(original);
        mutate(reordered);
        return reordered;
      });
      await expect(
        verifyUniversalOntologyMcpRelease({
          releaseDirectoryPath: candidatePath,
          tag: RELEASE_TAG,
          applicationBundleMetadataPath: baseBundleMetadataPath,
        }),
      ).rejects.toThrow(expected);
    },
  );

  test("semantic metadata equivalence never waives exact-byte integrity", async () => {
    const candidatePath = await cloneBaseCandidate(
      "reordered-stale-byte-bindings",
    );
    await rewriteMetadata(
      candidatePath,
      "server.json",
      reverseObjectMembers,
      false,
    );
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(/SHA-256|checksum/iu);
  });

  test("accepts one complete, version-aligned, data-free release candidate", async () => {
    const npmComparisonSbomPath = join(
      fixtureParentDirectoryPath,
      "npm-comparison.spdx.json",
    );
    await nodeFileSystem.writeFile(
      npmComparisonSbomPath,
      `${JSON.stringify(nativeNpmSbom)}\n`,
    );
    const publicEntry = nativeNpmSbom.packages.find(
      ({ name }) => name === PACKAGE_NAME,
    );
    const buildTool = nativeNpmSbom.packages.find(
      ({ name }) => name === "esbuild",
    );
    expect(buildTool).toBeDefined();
    expect(nativeNpmSbom.relationships).toContainEqual({
      spdxElementId: buildTool.SPDXID,
      relatedSpdxElement: publicEntry.SPDXID,
      relationshipType: "DEV_DEPENDENCY_OF",
    });
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        npmComparisonSbomPath,
      }),
    ).resolves.toMatchObject({
      tag: RELEASE_TAG,
      softwareVersion: SOFTWARE_VERSION,
      verifiedAssetCount: 12,
    });
  });

  test("does not decode an allowlisted opaque runtime executable as text", async () => {
    const binaryFixtureParentPath = join(
      fixtureParentDirectoryPath,
      "opaque-runtime-source",
    );
    await nodeFileSystem.mkdir(binaryFixtureParentPath);
    const candidatePath = await createCompleteReleaseCandidate({
      parentDirectoryPath: binaryFixtureParentPath,
      // Opaque executables can coincidentally contain token-shaped byte runs.
      // Text scanners must inspect our application and metadata, not classify
      // a checksum-pinned third-party runtime by decoded binary substrings.
      runtimeExecutableBytes: Buffer.concat([
        Buffer.from([0x00, 0xff, 0x80]),
        Buffer.from(`npm_${"A".repeat(32)}`),
        Buffer.from([0x00, 0xfe, 0x81]),
      ]),
    });

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: join(
          binaryFixtureParentPath,
          "bundle-metadata.json",
        ),
      }),
    ).resolves.toMatchObject({ verifiedAssetCount: 12 });
  });

  test("rejects a runtime component reported only by the independent npm SBOM", async () => {
    const npmComparisonSbomPath = join(
      fixtureParentDirectoryPath,
      "insufficient-npm-comparison.spdx.json",
    );
    const changedSbom = structuredClone(nativeNpmSbom);
    changedSbom.packages.push({
      name: "npm-only-runtime",
      versionInfo: "9.9.9",
      SPDXID: "SPDXRef-npm-only-runtime",
    });
    const publicEntry = changedSbom.packages.find(
      ({ name }) => name === PACKAGE_NAME,
    );
    changedSbom.relationships.push({
      spdxElementId: "SPDXRef-npm-only-runtime",
      relatedSpdxElement: publicEntry.SPDXID,
      relationshipType: "DEPENDENCY_OF",
    });
    await nodeFileSystem.writeFile(
      npmComparisonSbomPath,
      `${JSON.stringify(changedSbom)}\n`,
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        npmComparisonSbomPath,
      }),
    ).rejects.toThrow(/npm.*SBOM|SBOM.*npm/iu);
  });

  test.each([
    [
      "missing asset",
      /missing|asset/iu,
      async (candidatePath) => {
        await nodeFileSystem.rm(
          join(
            candidatePath,
            `${RELEASE_BASE_NAME}-development-candidate-notes.md`,
          ),
        );
      },
    ],
    [
      "unexpected asset",
      /unexpected/iu,
      async (candidatePath) => {
        await nodeFileSystem.writeFile(
          join(candidatePath, "unexpected.txt"),
          "not part of the release contract\n",
        );
      },
    ],
    [
      "renamed asset",
      /missing|unexpected|asset/iu,
      async (candidatePath) => {
        await nodeFileSystem.rename(
          join(candidatePath, `${RELEASE_BASE_NAME}-windows-x64.zip`),
          join(candidatePath, `${RELEASE_BASE_NAME}-win-x64.zip`),
        );
      },
    ],
    [
      "corrupt asset bytes",
      /SHA-256|checksum/iu,
      async (candidatePath) => {
        await nodeFileSystem.appendFile(
          join(candidatePath, `${PACKAGE_NAME}-${SOFTWARE_VERSION}.tgz`),
          "corrupt",
        );
      },
    ],
    [
      "mismatched Registry version",
      /version/iu,
      async (candidatePath) => {
        const serverDocumentPath = join(candidatePath, "server.json");
        const serverDocument = JSON.parse(
          await nodeFileSystem.readFile(serverDocumentPath, "utf8"),
        );
        serverDocument.version = "1.0.1";
        await nodeFileSystem.writeFile(
          serverDocumentPath,
          `${JSON.stringify(serverDocument, null, 2)}\n`,
        );
        await updateChecksumManifest(candidatePath);
      },
    ],
    [
      "insufficient release SBOM",
      /SBOM/iu,
      async (candidatePath) => {
        const releaseSbomPath = join(
          candidatePath,
          `${RELEASE_BASE_NAME}-release.spdx.json`,
        );
        const releaseSbom = JSON.parse(
          await nodeFileSystem.readFile(releaseSbomPath, "utf8"),
        );
        const omittedPackage = releaseSbom.packages.find(({ name }) =>
          name.endsWith("-windows-x64.zip"),
        );
        releaseSbom.packages = releaseSbom.packages.filter(
          ({ SPDXID }) => SPDXID !== omittedPackage.SPDXID,
        );
        releaseSbom.relationships = releaseSbom.relationships.filter(
          ({ spdxElementId, relatedSpdxElement }) =>
            spdxElementId !== omittedPackage.SPDXID &&
            relatedSpdxElement !== omittedPackage.SPDXID,
        );
        await nodeFileSystem.writeFile(
          releaseSbomPath,
          `${JSON.stringify(releaseSbom, null, 2)}\n`,
        );
        await updateChecksumManifest(candidatePath);
      },
    ],
  ])("rejects a %s", async (caseName, expectedError, mutateCandidate) => {
    const candidatePath = await cloneBaseCandidate(
      caseName.replaceAll(" ", "-"),
    );
    await mutateCandidate(candidatePath);

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(expectedError);
  });

  test("rejects ontology data embedded inside otherwise valid archives", async () => {
    const dataFixtureParentPath = join(
      fixtureParentDirectoryPath,
      "data-containing-source",
    );
    await nodeFileSystem.mkdir(dataFixtureParentPath);
    const candidatePath = await createCompleteReleaseCandidate({
      parentDirectoryPath: dataFixtureParentPath,
      includeOntologyData: true,
    });

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: join(
          dataFixtureParentPath,
          "bundle-metadata.json",
        ),
      }),
    ).rejects.toThrow(/ontology data/iu);
  });

  test("rejects malformed and version-inconsistent release tags", async () => {
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: "v1.0.0",
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(/tag/iu);
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: "universal-ontology-mcp-server-v1.0.1",
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(/version/iu);
  });
});
