import * as nodeFileSystem from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import yazl from "yazl";
import yauzl from "yauzl";
import * as tar from "tar";

import {
  buildUniversalOntologyMcpPlatformArchive,
  downloadVerifiedNodeRuntimeArchive,
  extractSelectedNodeRuntimeArchiveFiles,
  readUniversalOntologyMcpReleaseInputs,
  validateUniversalOntologyMcpReleaseInputs,
} from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";
import {
  calculateSha256 as calculateOntologyArtifactSha256,
  serializeCanonicalOntologyQueryJsonDocument,
} from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { createInMemoryOntologyReleaseArtifact } from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";
import { createOntologyQueryArtifactHttpFixture } from "../fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js";

const execFileAsync = promisify(execFile);

const ROOT_PACKAGE_JSON_URL = new URL("../../package.json", import.meta.url);
const RELEASE_INPUTS_URL = new URL(
  "../../scripts/distribution/universalOntologyMcpReleaseInputs.json",
  import.meta.url,
);

const EXPECTED_TARGET_MATRIX = Object.freeze([
  {
    targetName: "linux-x64",
    runnerLabel: "ubuntu-24.04",
    packagedRuntimeExecutablePath: "runtime/bin/node",
    releaseArchiveFormat: "tar.gz",
  },
  {
    targetName: "linux-arm64",
    runnerLabel: "ubuntu-24.04-arm",
    packagedRuntimeExecutablePath: "runtime/bin/node",
    releaseArchiveFormat: "tar.gz",
  },
  {
    targetName: "macos-x64",
    runnerLabel: "macos-15-intel",
    packagedRuntimeExecutablePath: "runtime/bin/node",
    releaseArchiveFormat: "tar.gz",
  },
  {
    targetName: "macos-arm64",
    runnerLabel: "macos-15",
    packagedRuntimeExecutablePath: "runtime/bin/node",
    releaseArchiveFormat: "tar.gz",
  },
  {
    targetName: "windows-x64",
    runnerLabel: "windows-2025",
    packagedRuntimeExecutablePath: "runtime/node.exe",
    releaseArchiveFormat: "zip",
  },
]);
const WINDOWS_RUNTIME_TARGET_FIXTURE = Object.freeze({
  upstreamArchiveFormat: "zip",
  upstreamRuntimeExecutablePath: "node-v24.20.0-win-x64/node.exe",
  upstreamRuntimeLicensePath: "node-v24.20.0-win-x64/LICENSE",
});

async function readJsonDocument(fileUrl) {
  return JSON.parse(await nodeFileSystem.readFile(fileUrl, "utf8"));
}

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createArchivedPersonQueryFixture() {
  const httpFixture = await createOntologyQueryArtifactHttpFixture();
  const releaseArtifact = await createInMemoryOntologyReleaseArtifact({
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
  });
  const catalogBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_catalog",
      queryArtifactFormatVersion: 1,
      releases: [releaseArtifact.catalogRelease],
    }),
  );
  const catalogSha256 = await calculateOntologyArtifactSha256(catalogBytes);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const manifestBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_channel_manifest",
      queryArtifactFormatVersion: 1,
      ontologyQueryArtifactChannelName: "stable",
      ontologyQueryCatalogReference: {
        relativePath: catalogRelativePath,
        sha256: catalogSha256,
        byteLength: catalogBytes.byteLength,
      },
    }),
  );
  httpFixture.setResponse("channels/stable.json", { bodyBytes: manifestBytes });
  httpFixture.setResponse(catalogRelativePath, { bodyBytes: catalogBytes });
  httpFixture.setResponse(releaseArtifact.queryIndexRelativePath, {
    bodyBytes: releaseArtifact.indexBytes,
  });

  return { httpFixture, releaseArtifact };
}

async function createZipArchiveFixture(archivePath, entries) {
  const zipFile = new yazl.ZipFile();
  const outputFileHandle = await nodeFileSystem.open(archivePath, "wx", 0o600);
  const outputStream = outputFileHandle.createWriteStream();
  const completion = new Promise((resolveCompletion, rejectCompletion) => {
    outputStream.once("finish", resolveCompletion);
    outputStream.once("error", rejectCompletion);
    zipFile.outputStream.once("error", rejectCompletion);
  });

  zipFile.outputStream.pipe(outputStream);
  for (const { bytes, sourceFilePath, path, mode = 0o100644 } of entries) {
    const entryOptions = { mode, mtime: new Date(0) };
    if (sourceFilePath) {
      zipFile.addFile(sourceFilePath, path, entryOptions);
    } else {
      zipFile.addBuffer(bytes, path, entryOptions);
    }
  }
  zipFile.end();
  await completion;
}

function openZipArchiveFixture(archivePath) {
  return new Promise((resolveArchive, rejectArchive) => {
    yauzl.open(
      archivePath,
      { autoClose: false, lazyEntries: true, strictFileNames: true },
      (error, zipFile) => {
        if (error) {
          rejectArchive(error);
        } else {
          resolveArchive(zipFile);
        }
      },
    );
  });
}

function openZipFixtureEntryReadStream(zipFile, entry) {
  return new Promise((resolveStream, rejectStream) => {
    zipFile.openReadStream(entry, (error, readStream) => {
      if (error) {
        rejectStream(error);
      } else {
        resolveStream(readStream);
      }
    });
  });
}

async function readZipArchiveFixtureEntries(archivePath) {
  const zipFile = await openZipArchiveFixture(archivePath);
  const entries = new Map();

  try {
    for await (const entry of zipFile.eachEntry()) {
      const chunks = [];
      let byteLength = 0;
      const readStream = await openZipFixtureEntryReadStream(zipFile, entry);
      for await (const chunk of readStream) {
        const chunkBytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(chunkBytes);
        byteLength += chunkBytes.byteLength;
      }
      entries.set(entry.fileName, {
        bytes: Buffer.concat(chunks, byteLength),
        mode: Math.floor(entry.externalFileAttributes / 2 ** 16) % 0o1000,
        modifiedTimeMilliseconds: entry.getLastModDate().getTime(),
      });
    }
  } finally {
    zipFile.close();
  }

  return entries;
}

async function replaceZipEntryPathBytes(
  archivePath,
  originalPath,
  replacementPath,
) {
  const originalPathBytes = Buffer.from(originalPath);
  const replacementPathBytes = Buffer.from(replacementPath);
  if (originalPathBytes.byteLength !== replacementPathBytes.byteLength) {
    throw new Error("ZIP fixture path replacements must preserve byte length.");
  }

  const archiveBytes = await nodeFileSystem.readFile(archivePath);
  let replacementCount = 0;
  let searchStartIndex = 0;
  while (searchStartIndex < archiveBytes.byteLength) {
    const matchIndex = archiveBytes.indexOf(
      originalPathBytes,
      searchStartIndex,
    );
    if (matchIndex < 0) {
      break;
    }
    replacementPathBytes.copy(archiveBytes, matchIndex);
    replacementCount += 1;
    searchStartIndex = matchIndex + replacementPathBytes.byteLength;
  }

  if (replacementCount < 2) {
    throw new Error(
      "ZIP fixture did not contain local and central path names.",
    );
  }
  await nodeFileSystem.writeFile(archivePath, archiveBytes);
}

async function createTarArchiveFixture(
  archivePath,
  stagingDirectoryPath,
  entries,
) {
  for (const { bytes, path, mode = 0o644 } of entries) {
    const entryPath = join(stagingDirectoryPath, ...path.split("/"));
    await nodeFileSystem.mkdir(join(entryPath, ".."), { recursive: true });
    await nodeFileSystem.writeFile(entryPath, bytes, { mode });
  }

  await tar.create(
    {
      cwd: stagingDirectoryPath,
      file: archivePath,
      gzip: { level: 9 },
      mtime: new Date(0),
      portable: true,
      noDirRecurse: true,
      strict: true,
    },
    entries.map(({ path }) => path).sort(),
  );
}

async function readTarArchiveFixtureEntries(archivePath) {
  const entries = new Map();
  const entryReadTasks = [];

  await tar.list({
    file: archivePath,
    strict: true,
    noResume: true,
    onReadEntry(entry) {
      const chunks = [];
      let byteLength = 0;
      entryReadTasks.push(
        (async () => {
          for await (const chunk of entry) {
            const chunkBytes = Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk);
            chunks.push(chunkBytes);
            byteLength += chunkBytes.byteLength;
          }
          entries.set(entry.path, {
            bytes: Buffer.concat(chunks, byteLength),
            mode: entry.mode % 0o1000,
            modifiedTimeMilliseconds: entry.mtime.getTime(),
          });
        })(),
      );
    },
  });
  await Promise.all(entryReadTasks);
  return entries;
}

describe("Universal Ontology MCP platform release inputs", () => {
  test("validate one strict, fully pinned five-target release manifest", async () => {
    const [releaseInputs, rootPackage] = await Promise.all([
      readUniversalOntologyMcpReleaseInputs(),
      readJsonDocument(ROOT_PACKAGE_JSON_URL),
    ]);

    expect(releaseInputs).toMatchObject({
      releaseInputFormatVersion: 1,
      selectedNpmVersion: "12.0.2",
      modelContextProtocol: {
        revision: "2026-07-28",
        registrySchemaVersion: "2025-12-11",
      },
      nodeRuntime: {
        version: "24.20.0",
        bundledNpmVersion: "11.19.0",
        compressedArchiveMaximumByteSize: 134_217_728,
      },
      mcpPublisher: {
        version: "1.8.1",
        archiveSha256:
          "a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc",
      },
    });
    expect(`npm@${releaseInputs.selectedNpmVersion}`).toBe(
      rootPackage.packageManager,
    );
    expect(
      releaseInputs.nodeRuntime.targets.map(
        ({
          targetName,
          runnerLabel,
          packagedRuntimeExecutablePath,
          releaseArchiveFormat,
        }) => ({
          targetName,
          runnerLabel,
          packagedRuntimeExecutablePath,
          releaseArchiveFormat,
        }),
      ),
    ).toEqual(EXPECTED_TARGET_MATRIX);

    const targetNames = releaseInputs.nodeRuntime.targets.map(
      ({ targetName }) => targetName,
    );
    const archiveUrls = releaseInputs.nodeRuntime.targets.map(
      ({ runtimeArchiveUrl }) => runtimeArchiveUrl,
    );
    expect(new Set(targetNames).size).toBe(targetNames.length);
    expect(new Set(archiveUrls).size).toBe(archiveUrls.length);

    for (const target of releaseInputs.nodeRuntime.targets) {
      const runtimeArchiveUrl = new URL(target.runtimeArchiveUrl);

      expect(runtimeArchiveUrl.origin).toBe("https://nodejs.org");
      expect(runtimeArchiveUrl.pathname).toContain(
        `/v${releaseInputs.nodeRuntime.version}/node-v${releaseInputs.nodeRuntime.version}-`,
      );
      expect(target.runtimeArchiveSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(target.upstreamRuntimeExecutablePath).toContain(
        `node-v${releaseInputs.nodeRuntime.version}-`,
      );
      expect(target.upstreamRuntimeLicensePath).toContain(
        `node-v${releaseInputs.nodeRuntime.version}-`,
      );
    }

    const unvalidatedReleaseInputs = await readJsonDocument(RELEASE_INPUTS_URL);
    unvalidatedReleaseInputs.unplannedSetting = true;
    expect(() =>
      validateUniversalOntologyMcpReleaseInputs(unvalidatedReleaseInputs),
    ).toThrow(/additional properties|unplannedSetting/iu);
  });
});

describe("bounded Node runtime archive download", () => {
  test("streams one digest-verified archive into an owned file", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-runtime-download-"),
    );
    const destinationPath = join(temporaryDirectoryPath, "runtime.zip");
    const archiveBytes = Buffer.from("verified runtime archive fixture");

    try {
      const result = await downloadVerifiedNodeRuntimeArchive({
        runtimeArchiveUrl:
          "https://nodejs.org/dist/v24.20.0/node-v24.20.0-win-x64.zip",
        expectedSha256: calculateSha256(archiveBytes),
        compressedArchiveMaximumByteSize: 1024,
        downloadTimeoutMilliseconds: 5_000,
        destinationPath,
        fetchImplementation: async () =>
          new Response(archiveBytes, {
            status: 200,
            headers: { "content-length": String(archiveBytes.byteLength) },
          }),
      });

      expect(result).toEqual({
        byteLength: archiveBytes.byteLength,
        sha256: calculateSha256(archiveBytes),
      });
      await expect(nodeFileSystem.readFile(destinationPath)).resolves.toEqual(
        archiveBytes,
      );
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("removes incomplete files on digest or byte-ceiling disagreement", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-runtime-download-"),
    );
    const archiveBytes = Buffer.from("archive bytes beyond a tiny ceiling");

    try {
      for (const failureCase of [
        {
          name: "checksum disagreement",
          destinationPath: join(temporaryDirectoryPath, "digest.zip"),
          expectedSha256: "0".repeat(64),
          maximumByteSize: 1024,
          expectedError: /SHA-256 mismatch/u,
        },
        {
          name: "streamed oversize body",
          destinationPath: join(temporaryDirectoryPath, "oversize.zip"),
          expectedSha256: calculateSha256(archiveBytes),
          maximumByteSize: archiveBytes.byteLength - 1,
          expectedError: /byte ceiling/u,
        },
      ]) {
        await expect(
          downloadVerifiedNodeRuntimeArchive({
            runtimeArchiveUrl:
              "https://nodejs.org/dist/v24.20.0/node-v24.20.0-win-x64.zip",
            expectedSha256: failureCase.expectedSha256,
            compressedArchiveMaximumByteSize: failureCase.maximumByteSize,
            downloadTimeoutMilliseconds: 5_000,
            destinationPath: failureCase.destinationPath,
            fetchImplementation: async () =>
              new Response(archiveBytes, { status: 200 }),
          }),
        ).rejects.toThrow(failureCase.expectedError);
        await expect(
          nodeFileSystem.lstat(failureCase.destinationPath),
        ).rejects.toMatchObject({ code: "ENOENT" });
      }
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });
});

describe("allowlisted Node runtime archive extraction", () => {
  test("reads only the selected executable and Node license from ZIP", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-runtime-extraction-"),
    );
    const archivePath = join(temporaryDirectoryPath, "runtime.zip");
    const runtimeExecutableBytes = Buffer.from("runtime executable fixture");
    const nodeLicenseBytes = Buffer.from("Node license fixture");
    const target = WINDOWS_RUNTIME_TARGET_FIXTURE;

    try {
      await createZipArchiveFixture(archivePath, [
        {
          path: target.upstreamRuntimeExecutablePath,
          bytes: runtimeExecutableBytes,
          mode: 0o100755,
        },
        {
          path: target.upstreamRuntimeLicensePath,
          bytes: nodeLicenseBytes,
        },
        {
          path: "node-v24.20.0-win-x64/README.md",
          bytes: Buffer.from("ignored upstream file"),
        },
      ]);

      await expect(
        extractSelectedNodeRuntimeArchiveFiles({
          archivePath,
          target,
          runtimeExecutableMaximumByteSize: 1024,
          licenseMaximumByteSize: 1024,
        }),
      ).resolves.toEqual({ runtimeExecutableBytes, nodeLicenseBytes });
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each([
    {
      scenario: "duplicate paths",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("runtime"),
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license one"),
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license two"),
        },
      ],
      expectedError: /duplicate entry/iu,
    },
    {
      scenario: "case-folded collisions",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("runtime"),
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license"),
        },
        {
          path: "node-v24.20.0-win-x64/license",
          bytes: Buffer.from("colliding license"),
        },
      ],
      expectedError: /case-folded path collision/iu,
    },
    {
      scenario: "selected symbolic links",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("../different-node"),
          mode: 0o120777,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license"),
        },
      ],
      expectedError: /not an unencrypted regular file/iu,
    },
    {
      scenario: "selected device entries",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("device"),
          mode: 0o020666,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license"),
        },
      ],
      expectedError: /not an unencrypted regular file/iu,
    },
    {
      scenario: "an oversize selected executable",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.alloc(17, 0x61),
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license"),
        },
      ],
      runtimeExecutableMaximumByteSize: 16,
      expectedError: /byte ceiling/iu,
    },
    {
      scenario: "a missing allowlisted license",
      entries: [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("runtime"),
          mode: 0o100755,
        },
        {
          path: "node-v24.20.0-win-x64/NOTICE",
          bytes: Buffer.from("not the license"),
        },
      ],
      expectedError: /exact allowlisted executable and Node license paths/iu,
    },
  ])("rejects $scenario", async (failureCase) => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-malicious-runtime-"),
    );
    const archivePath = join(temporaryDirectoryPath, "runtime.zip");

    try {
      await createZipArchiveFixture(archivePath, failureCase.entries);
      await expect(
        extractSelectedNodeRuntimeArchiveFiles({
          archivePath,
          target: WINDOWS_RUNTIME_TARGET_FIXTURE,
          runtimeExecutableMaximumByteSize:
            failureCase.runtimeExecutableMaximumByteSize ?? 1024,
          licenseMaximumByteSize: 1024,
        }),
      ).rejects.toThrow(failureCase.expectedError);
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each([
    {
      scenario: "an absolute entry path",
      originalPath: "safe/x",
      replacementPath: "/abs/x",
    },
    {
      scenario: "a parent-traversal entry path",
      originalPath: "safe/evil",
      replacementPath: "../x/evil",
    },
  ])("rejects $scenario", async ({ originalPath, replacementPath }) => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-malicious-runtime-"),
    );
    const archivePath = join(temporaryDirectoryPath, "runtime.zip");

    try {
      await createZipArchiveFixture(archivePath, [
        { path: originalPath, bytes: Buffer.from("unsafe path fixture") },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: Buffer.from("runtime"),
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("license"),
        },
      ]);
      await replaceZipEntryPathBytes(
        archivePath,
        originalPath,
        replacementPath,
      );

      await expect(
        extractSelectedNodeRuntimeArchiveFiles({
          archivePath,
          target: WINDOWS_RUNTIME_TARGET_FIXTURE,
          runtimeExecutableMaximumByteSize: 1024,
          licenseMaximumByteSize: 1024,
        }),
      ).rejects.toThrow(/absolute path|invalid relative path|unsafe path/iu);
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reads only the selected executable and Node license from tar.gz", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-runtime-extraction-"),
    );
    const stagingDirectoryPath = join(temporaryDirectoryPath, "staging");
    const archivePath = join(temporaryDirectoryPath, "runtime.tar.gz");
    const runtimeExecutableBytes = Buffer.from("runtime executable fixture");
    const nodeLicenseBytes = Buffer.from("Node license fixture");
    const target = {
      upstreamArchiveFormat: "tar.gz",
      upstreamRuntimeExecutablePath: "node-v24.20.0-linux-x64/bin/node",
      upstreamRuntimeLicensePath: "node-v24.20.0-linux-x64/LICENSE",
    };

    try {
      await createTarArchiveFixture(archivePath, stagingDirectoryPath, [
        {
          path: target.upstreamRuntimeExecutablePath,
          bytes: runtimeExecutableBytes,
          mode: 0o755,
        },
        {
          path: target.upstreamRuntimeLicensePath,
          bytes: nodeLicenseBytes,
        },
        {
          path: "node-v24.20.0-linux-x64/README.md",
          bytes: Buffer.from("ignored upstream file"),
        },
      ]);

      await expect(
        extractSelectedNodeRuntimeArchiveFiles({
          archivePath,
          target,
          runtimeExecutableMaximumByteSize: 1024,
          licenseMaximumByteSize: 1024,
        }),
      ).resolves.toEqual({ runtimeExecutableBytes, nodeLicenseBytes });
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  });
});

describe("deterministic Universal Ontology MCP platform archive", () => {
  test("assembles exactly five normalized files beneath one versioned directory", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-platform-archive-"),
    );
    const runtimeArchivePath = join(temporaryDirectoryPath, "runtime.zip");
    const firstReleaseDirectoryPath = join(
      temporaryDirectoryPath,
      "first-release",
    );
    const secondReleaseDirectoryPath = join(
      temporaryDirectoryPath,
      "second-release",
    );
    const releaseWorkParentDirectoryPath = join(
      temporaryDirectoryPath,
      "release-work",
    );
    const runtimeExecutableBytes = Buffer.from("runtime executable fixture");
    const nodeLicenseBytes = Buffer.from("Node upstream license fixture");
    const sourceDateEpochSeconds = 1_700_000_000;

    try {
      await createZipArchiveFixture(runtimeArchivePath, [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          bytes: runtimeExecutableBytes,
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: nodeLicenseBytes,
        },
      ]);
      const releaseInputs = JSON.parse(
        JSON.stringify(await readUniversalOntologyMcpReleaseInputs()),
      );
      releaseInputs.nodeRuntime.targets.find(
        ({ targetName }) => targetName === "windows-x64",
      ).runtimeArchiveSha256 = calculateSha256(
        await nodeFileSystem.readFile(runtimeArchivePath),
      );
      validateUniversalOntologyMcpReleaseInputs(releaseInputs);

      const firstBuild = await buildUniversalOntologyMcpPlatformArchive({
        targetName: "windows-x64",
        releaseInputs,
        runtimeArchivePath,
        releaseDirectoryPath: firstReleaseDirectoryPath,
        releaseWorkParentDirectoryPath,
        sourceDateEpochSeconds,
      });
      const secondBuild = await buildUniversalOntologyMcpPlatformArchive({
        targetName: "windows-x64",
        releaseInputs,
        runtimeArchivePath,
        releaseDirectoryPath: secondReleaseDirectoryPath,
        releaseWorkParentDirectoryPath,
        sourceDateEpochSeconds,
      });
      const [firstArchiveBytes, secondArchiveBytes] = await Promise.all([
        nodeFileSystem.readFile(firstBuild.archivePath),
        nodeFileSystem.readFile(secondBuild.archivePath),
      ]);

      expect(firstArchiveBytes).toEqual(secondArchiveBytes);
      expect(firstBuild).toMatchObject({
        targetName: "windows-x64",
        archiveName: "universal-ontology-mcp-server-v1.0.0-windows-x64.zip",
        archiveSha256: calculateSha256(firstArchiveBytes),
        archiveByteLength: firstArchiveBytes.byteLength,
      });
      expect(secondBuild.archiveSha256).toBe(firstBuild.archiveSha256);

      const archiveEntries = await readZipArchiveFixtureEntries(
        firstBuild.archivePath,
      );
      const archiveRootName =
        "universal-ontology-mcp-server-v1.0.0-windows-x64";
      expect([...archiveEntries.keys()]).toEqual(
        [
          `${archiveRootName}/LICENSE`,
          `${archiveRootName}/README.md`,
          `${archiveRootName}/THIRD_PARTY_NOTICES.md`,
          `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
          `${archiveRootName}/runtime/node.exe`,
        ].sort((left, right) =>
          Buffer.compare(Buffer.from(left), Buffer.from(right)),
        ),
      );
      expect(
        archiveEntries.get(`${archiveRootName}/runtime/node.exe`),
      ).toMatchObject({
        bytes: runtimeExecutableBytes,
        mode: 0o755,
        modifiedTimeMilliseconds: sourceDateEpochSeconds * 1000,
      });
      expect(
        archiveEntries.get(
          `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
        ),
      ).toMatchObject({ mode: 0o755 });
      const archiveNoticesText = archiveEntries
        .get(`${archiveRootName}/THIRD_PARTY_NOTICES.md`)
        .bytes.toString("utf8");
      expect(archiveNoticesText).toContain("## Node.js 24.20.0");
      expect(archiveNoticesText).toContain(nodeLicenseBytes.toString("utf8"));
      for (const [entryPath, { bytes }] of archiveEntries) {
        const lowercaseEntryPath = entryPath.toLowerCase();
        expect(lowercaseEntryPath).not.toContain("query/v1");
        expect(lowercaseEntryPath.endsWith(".owl")).toBe(false);
        expect(lowercaseEntryPath.endsWith(".jsonld")).toBe(false);
        expect(bytes.toString("utf8")).not.toContain(
          "A natural or legal person recognised by law.",
        );
      }
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  }, 60_000);

  test("normalizes the equivalent tar.gz layout and metadata", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-platform-tar-"),
    );
    const runtimeStagingDirectoryPath = join(
      temporaryDirectoryPath,
      "runtime-staging",
    );
    const runtimeArchivePath = join(temporaryDirectoryPath, "runtime.tar.gz");
    const releaseWorkParentDirectoryPath = join(
      temporaryDirectoryPath,
      "release-work",
    );
    const sourceDateEpochSeconds = 1_700_000_000;
    const linuxTarget = {
      upstreamArchiveFormat: "tar.gz",
      upstreamRuntimeExecutablePath: "node-v24.20.0-linux-x64/bin/node",
      upstreamRuntimeLicensePath: "node-v24.20.0-linux-x64/LICENSE",
    };

    try {
      await createTarArchiveFixture(
        runtimeArchivePath,
        runtimeStagingDirectoryPath,
        [
          {
            path: linuxTarget.upstreamRuntimeExecutablePath,
            bytes: Buffer.from("linux runtime fixture"),
            mode: 0o755,
          },
          {
            path: linuxTarget.upstreamRuntimeLicensePath,
            bytes: Buffer.from("Node Linux license fixture"),
          },
        ],
      );
      const releaseInputs = JSON.parse(
        JSON.stringify(await readUniversalOntologyMcpReleaseInputs()),
      );
      releaseInputs.nodeRuntime.targets.find(
        ({ targetName }) => targetName === "linux-x64",
      ).runtimeArchiveSha256 = calculateSha256(
        await nodeFileSystem.readFile(runtimeArchivePath),
      );

      const firstBuild = await buildUniversalOntologyMcpPlatformArchive({
        targetName: "linux-x64",
        releaseInputs,
        runtimeArchivePath,
        releaseDirectoryPath: join(temporaryDirectoryPath, "release-one"),
        releaseWorkParentDirectoryPath,
        sourceDateEpochSeconds,
      });
      const secondBuild = await buildUniversalOntologyMcpPlatformArchive({
        targetName: "linux-x64",
        releaseInputs,
        runtimeArchivePath,
        releaseDirectoryPath: join(temporaryDirectoryPath, "release-two"),
        releaseWorkParentDirectoryPath,
        sourceDateEpochSeconds,
      });
      const [firstArchiveBytes, secondArchiveBytes] = await Promise.all([
        nodeFileSystem.readFile(firstBuild.archivePath),
        nodeFileSystem.readFile(secondBuild.archivePath),
      ]);
      expect(firstArchiveBytes).toEqual(secondArchiveBytes);

      const archiveRootName = "universal-ontology-mcp-server-v1.0.0-linux-x64";
      const archiveEntries = await readTarArchiveFixtureEntries(
        firstBuild.archivePath,
      );
      expect([...archiveEntries.keys()]).toEqual([
        `${archiveRootName}/LICENSE`,
        `${archiveRootName}/README.md`,
        `${archiveRootName}/THIRD_PARTY_NOTICES.md`,
        `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
        `${archiveRootName}/runtime/bin/node`,
      ]);
      expect(
        archiveEntries.get(`${archiveRootName}/runtime/bin/node`),
      ).toMatchObject({
        bytes: Buffer.from("linux runtime fixture"),
        mode: 0o755,
        modifiedTimeMilliseconds: sourceDateEpochSeconds * 1000,
      });
      expect(archiveEntries.get(`${archiveRootName}/LICENSE`)).toMatchObject({
        mode: 0o644,
        modifiedTimeMilliseconds: sourceDateEpochSeconds * 1000,
      });
    } finally {
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  }, 60_000);

  test("runs the included runtime, stdio tools, and Person lookup after fresh extraction", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-platform-runtime-"),
    );
    const runtimeArchivePath = join(temporaryDirectoryPath, "runtime.zip");
    const releaseDirectoryPath = join(temporaryDirectoryPath, "release");
    const releaseWorkParentDirectoryPath = join(
      temporaryDirectoryPath,
      "release-work",
    );
    const extractionDirectoryPath = join(temporaryDirectoryPath, "extracted");
    let client;
    let personQueryFixture;

    try {
      await createZipArchiveFixture(runtimeArchivePath, [
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeExecutablePath,
          sourceFilePath: process.execPath,
          mode: 0o100755,
        },
        {
          path: WINDOWS_RUNTIME_TARGET_FIXTURE.upstreamRuntimeLicensePath,
          bytes: Buffer.from("Node runtime acceptance license fixture"),
        },
      ]);
      const releaseInputs = JSON.parse(
        JSON.stringify(await readUniversalOntologyMcpReleaseInputs()),
      );
      releaseInputs.nodeRuntime.targets.find(
        ({ targetName }) => targetName === "windows-x64",
      ).runtimeArchiveSha256 = calculateSha256(
        await nodeFileSystem.readFile(runtimeArchivePath),
      );
      const buildResult = await buildUniversalOntologyMcpPlatformArchive({
        targetName: "windows-x64",
        releaseInputs,
        runtimeArchivePath,
        releaseDirectoryPath,
        releaseWorkParentDirectoryPath,
        sourceDateEpochSeconds: 1_700_000_000,
      });
      const archiveRootName =
        "universal-ontology-mcp-server-v1.0.0-windows-x64";
      const {
        runtimeExecutableBytes,
        nodeLicenseBytes: applicationBundleBytes,
      } = await extractSelectedNodeRuntimeArchiveFiles({
        archivePath: buildResult.archivePath,
        target: {
          upstreamArchiveFormat: "zip",
          upstreamRuntimeExecutablePath: `${archiveRootName}/runtime/node.exe`,
          upstreamRuntimeLicensePath: `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
        },
        runtimeExecutableMaximumByteSize: 134_217_728,
        licenseMaximumByteSize: 16_777_216,
      });
      const extractedRuntimePath = join(
        extractionDirectoryPath,
        "runtime",
        "node.exe",
      );
      const extractedApplicationPath = join(
        extractionDirectoryPath,
        "app",
        "universal-ontology-mcp-server.mjs",
      );
      await Promise.all([
        nodeFileSystem.mkdir(join(extractionDirectoryPath, "runtime"), {
          recursive: true,
        }),
        nodeFileSystem.mkdir(join(extractionDirectoryPath, "app"), {
          recursive: true,
        }),
      ]);
      await Promise.all([
        nodeFileSystem.writeFile(extractedRuntimePath, runtimeExecutableBytes, {
          mode: 0o755,
        }),
        nodeFileSystem.writeFile(
          extractedApplicationPath,
          applicationBundleBytes,
          { mode: 0o755 },
        ),
      ]);

      const [{ stdout: runtimeVersionText }, { stdout: helpText }] =
        await Promise.all([
          execFileAsync(extractedRuntimePath, ["--version"]),
          execFileAsync(extractedRuntimePath, [
            "--use-system-ca",
            extractedApplicationPath,
            "--help",
          ]),
        ]);
      expect(runtimeVersionText.trim()).toBe(process.version);
      expect(helpText).toContain("universal-ontology-mcp-server [options]");

      personQueryFixture = await createArchivedPersonQueryFixture();
      const transport = new StdioClientTransport({
        command: extractedRuntimePath,
        args: [
          "--use-system-ca",
          extractedApplicationPath,
          "--artifact-channel=stable",
          `--artifact-base-url=${personQueryFixture.httpFixture.ontologyQueryArtifactBaseUrl}`,
          "--cache-directory",
          join(temporaryDirectoryPath, "cache"),
          "--allow-insecure-loopback-artifact-origin",
        ],
        cwd: extractionDirectoryPath,
        stderr: "pipe",
      });
      client = new Client(
        { name: "platform-archive-test", version: "1.0.0" },
        { versionNegotiation: { mode: { pin: "2026-07-28" } } },
      );
      await client.connect(transport);
      await expect(client.listTools()).resolves.toMatchObject({
        tools: [{ name: "search_entities" }, { name: "resolve_entity" }],
      });
      await expect(
        client.callTool({
          name: "search_entities",
          arguments: {
            queryText: "Person",
            ontologyReleaseSelection: {
              selectionKind: "specified_releases",
              ontologyReleases: [
                {
                  ontologyArtifactFamilyId: "universal/core",
                  versionTag: "20260714",
                },
              ],
            },
          },
        }),
      ).resolves.toMatchObject({
        structuredContent: {
          outcome: "success",
          totalMatchedEntityCount: 1,
          matches: [
            {
              ontologyEntity: {
                selectedPreferredLabel: {
                  literalValue: { lexicalForm: "Person" },
                },
              },
            },
          ],
        },
      });
    } finally {
      await client?.close().catch(() => {});
      await personQueryFixture?.httpFixture.close().catch(() => {});
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  }, 120_000);
});
