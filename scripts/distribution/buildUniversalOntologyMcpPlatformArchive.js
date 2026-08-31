import * as nodeFileSystem from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as tar from "tar";
import yauzl from "yauzl";
import yazl from "yazl";

import { buildUniversalOntologyMcpApplicationBundle } from "./buildUniversalOntologyMcpApplicationBundle.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const ROOT_PACKAGE_JSON_PATH = join(REPOSITORY_ROOT_PATH, "package.json");
const PUBLIC_PACKAGE_DIRECTORY_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
);
const PUBLIC_PACKAGE_JSON_PATH = join(
  PUBLIC_PACKAGE_DIRECTORY_PATH,
  "package.json",
);
const RELEASE_INPUTS_URL = new URL(
  "./universalOntologyMcpReleaseInputs.json",
  import.meta.url,
);
const DEFAULT_RELEASE_DIRECTORY_PATH = join(
  REPOSITORY_ROOT_PATH,
  "dist",
  "releases",
);
const DEFAULT_RELEASE_WORK_PARENT_DIRECTORY_PATH = join(
  REPOSITORY_ROOT_PATH,
  "dist",
  "release-work",
);
const DEFAULT_SOURCE_DATE_EPOCH_SECONDS = 315_532_800;
const SEMANTIC_VERSION_PATTERN = "^[0-9]+\\.[0-9]+\\.[0-9]+$";
const LOWERCASE_SHA256_PATTERN = "^[a-f0-9]{64}$";
const FULL_GIT_COMMIT_SHA_PATTERN = "^[a-f0-9]{40}$";
const SAFE_RELATIVE_PATH_PATTERN =
  "^(?!/)(?![A-Za-z]:)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\)[^\\u0000]+$";

const versionMapSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "@modelcontextprotocol/server",
    "@modelcontextprotocol/client",
    "@modelcontextprotocol/node",
    "@modelcontextprotocol/inspector",
  ],
  properties: {
    "@modelcontextprotocol/server": {
      type: "string",
      pattern: SEMANTIC_VERSION_PATTERN,
    },
    "@modelcontextprotocol/client": {
      type: "string",
      pattern: SEMANTIC_VERSION_PATTERN,
    },
    "@modelcontextprotocol/node": {
      type: "string",
      pattern: SEMANTIC_VERSION_PATTERN,
    },
    "@modelcontextprotocol/inspector": {
      type: "string",
      pattern: SEMANTIC_VERSION_PATTERN,
    },
  },
};

const boundedFileSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourceRelativePath",
    "packagedRelativePath",
    "maximumByteSize",
    "mode",
  ],
  properties: {
    sourceRelativePath: { type: "string", pattern: SAFE_RELATIVE_PATH_PATTERN },
    packagedRelativePath: {
      type: "string",
      pattern: SAFE_RELATIVE_PATH_PATTERN,
    },
    maximumByteSize: { type: "integer", minimum: 1 },
    mode: { enum: ["0644", "0755"] },
  },
};

export const UNIVERSAL_ONTOLOGY_MCP_RELEASE_INPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "releaseInputFormatVersion",
    "selectedNpmVersion",
    "modelContextProtocol",
    "nodeRuntime",
    "applicationBundle",
    "packagedStaticFiles",
    "buildToolVersions",
    "ociBaseImage",
    "mcpPublisher",
    "githubActions",
  ],
  properties: {
    releaseInputFormatVersion: { const: 1 },
    selectedNpmVersion: { type: "string", pattern: SEMANTIC_VERSION_PATTERN },
    modelContextProtocol: {
      type: "object",
      additionalProperties: false,
      required: [
        "revision",
        "registrySchemaVersion",
        "sdkPackageVersions",
        "zodVersion",
      ],
      properties: {
        revision: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        registrySchemaVersion: {
          type: "string",
          pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
        },
        sdkPackageVersions: versionMapSchema,
        zodVersion: { type: "string", pattern: SEMANTIC_VERSION_PATTERN },
      },
    },
    nodeRuntime: {
      type: "object",
      additionalProperties: false,
      required: [
        "version",
        "bundledNpmVersion",
        "downloadTimeoutMilliseconds",
        "compressedArchiveMaximumByteSize",
        "runtimeExecutableMaximumByteSize",
        "licenseMaximumByteSize",
        "targets",
      ],
      properties: {
        version: { type: "string", pattern: SEMANTIC_VERSION_PATTERN },
        bundledNpmVersion: {
          type: "string",
          pattern: SEMANTIC_VERSION_PATTERN,
        },
        downloadTimeoutMilliseconds: {
          type: "integer",
          minimum: 1_000,
          maximum: 300_000,
        },
        compressedArchiveMaximumByteSize: {
          type: "integer",
          minimum: 1,
          maximum: 134_217_728,
        },
        runtimeExecutableMaximumByteSize: {
          type: "integer",
          minimum: 1,
          maximum: 134_217_728,
        },
        licenseMaximumByteSize: {
          type: "integer",
          minimum: 1,
          maximum: 16_777_216,
        },
        targets: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "targetName",
              "runnerLabel",
              "runtimeArchiveUrl",
              "runtimeArchiveSha256",
              "upstreamArchiveFormat",
              "releaseArchiveFormat",
              "upstreamRuntimeExecutablePath",
              "upstreamRuntimeLicensePath",
              "packagedRuntimeExecutablePath",
            ],
            properties: {
              targetName: {
                enum: [
                  "linux-x64",
                  "linux-arm64",
                  "macos-x64",
                  "macos-arm64",
                  "windows-x64",
                ],
              },
              runnerLabel: { type: "string", minLength: 1 },
              runtimeArchiveUrl: { type: "string", format: "uri" },
              runtimeArchiveSha256: {
                type: "string",
                pattern: LOWERCASE_SHA256_PATTERN,
              },
              upstreamArchiveFormat: { enum: ["tar.gz", "zip"] },
              releaseArchiveFormat: { enum: ["tar.gz", "zip"] },
              upstreamRuntimeExecutablePath: {
                type: "string",
                pattern: SAFE_RELATIVE_PATH_PATTERN,
              },
              upstreamRuntimeLicensePath: {
                type: "string",
                pattern: SAFE_RELATIVE_PATH_PATTERN,
              },
              packagedRuntimeExecutablePath: {
                type: "string",
                pattern: SAFE_RELATIVE_PATH_PATTERN,
              },
            },
          },
        },
      },
    },
    applicationBundle: boundedFileSchema,
    packagedStaticFiles: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: boundedFileSchema,
    },
    buildToolVersions: {
      type: "object",
      additionalProperties: false,
      required: [
        "esbuild",
        "tar",
        "yazl",
        "yauzl",
        "ajv",
        "ajv-formats",
        "yaml",
      ],
      properties: Object.fromEntries(
        ["esbuild", "tar", "yazl", "yauzl", "ajv", "ajv-formats", "yaml"].map(
          (packageName) => [
            packageName,
            { type: "string", pattern: SEMANTIC_VERSION_PATTERN },
          ],
        ),
      ),
    },
    ociBaseImage: {
      type: "object",
      additionalProperties: false,
      required: ["reference", "indexSha256"],
      properties: {
        reference: { type: "string", minLength: 1 },
        indexSha256: {
          type: "string",
          pattern: LOWERCASE_SHA256_PATTERN,
        },
      },
    },
    mcpPublisher: {
      type: "object",
      additionalProperties: false,
      required: ["version", "linuxAmd64ArchiveUrl", "archiveSha256"],
      properties: {
        version: { type: "string", pattern: SEMANTIC_VERSION_PATTERN },
        linuxAmd64ArchiveUrl: { type: "string", format: "uri" },
        archiveSha256: {
          type: "string",
          pattern: LOWERCASE_SHA256_PATTERN,
        },
      },
    },
    githubActions: {
      type: "array",
      minItems: 9,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actionName", "versionTag", "commitSha"],
        properties: {
          actionName: { type: "string", pattern: "^[a-z0-9-]+/[a-z0-9-]+$" },
          versionTag: { type: "string", pattern: "^v[0-9]+$" },
          commitSha: { type: "string", pattern: FULL_GIT_COMMIT_SHA_PATTERN },
        },
      },
    },
  },
});

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateReleaseInputSchema = ajv.compile(
  UNIVERSAL_ONTOLOGY_MCP_RELEASE_INPUT_SCHEMA,
);

async function readJsonDocument(filePath) {
  return JSON.parse(await nodeFileSystem.readFile(filePath, "utf8"));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const propertyValue of Object.values(value)) {
      deepFreeze(propertyValue);
    }
  }

  return value;
}

function requireUniqueValues(values, semanticName) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Release inputs contain duplicate ${semanticName}.`);
  }
}

/**
 * Validate the immutable identities and cross-field invariants that drive all
 * Universal Ontology MCP release formats. Unknown properties fail closed so a
 * misspelled security or supply-chain setting can never be silently ignored.
 */
export function validateUniversalOntologyMcpReleaseInputs(releaseInputs) {
  if (!validateReleaseInputSchema(releaseInputs)) {
    throw new Error(
      `Universal Ontology MCP release inputs violate the strict schema: ${ajv.errorsText(validateReleaseInputSchema.errors, { separator: "; " })}`,
    );
  }

  const { version: nodeVersion, targets } = releaseInputs.nodeRuntime;
  requireUniqueValues(
    targets.map(({ targetName }) => targetName),
    "target names",
  );
  requireUniqueValues(
    targets.map(({ runnerLabel }) => runnerLabel),
    "runner labels",
  );
  requireUniqueValues(
    targets.map(({ runtimeArchiveUrl }) => runtimeArchiveUrl),
    "runtime archive URLs",
  );
  requireUniqueValues(
    releaseInputs.githubActions.map(({ actionName }) => actionName),
    "GitHub Action names",
  );
  requireUniqueValues(
    releaseInputs.packagedStaticFiles.map(({ packagedRelativePath }) =>
      packagedRelativePath.toLocaleLowerCase("en-US"),
    ),
    "case-folded packaged static paths",
  );

  for (const target of targets) {
    const runtimeArchiveUrl = new URL(target.runtimeArchiveUrl);
    const expectedArchiveSuffix =
      target.upstreamArchiveFormat === "zip" ? ".zip" : ".tar.gz";
    const expectedUpstreamRootPath = target.upstreamRuntimeExecutablePath.split(
      "/",
      1,
    )[0];

    if (
      runtimeArchiveUrl.protocol !== "https:" ||
      runtimeArchiveUrl.hostname !== "nodejs.org" ||
      !runtimeArchiveUrl.pathname.startsWith(`/dist/v${nodeVersion}/`) ||
      !runtimeArchiveUrl.pathname.endsWith(expectedArchiveSuffix) ||
      !expectedUpstreamRootPath.startsWith(`node-v${nodeVersion}-`) ||
      target.upstreamRuntimeLicensePath !==
        `${expectedUpstreamRootPath}/LICENSE`
    ) {
      throw new Error(
        `Release target ${target.targetName} does not identify one immutable official Node ${nodeVersion} archive layout.`,
      );
    }
  }

  const ociDigestSuffix = `@sha256:${releaseInputs.ociBaseImage.indexSha256}`;
  if (!releaseInputs.ociBaseImage.reference.endsWith(ociDigestSuffix)) {
    throw new Error("OCI base image reference and index digest disagree.");
  }

  const publisherArchiveUrl = new URL(
    releaseInputs.mcpPublisher.linuxAmd64ArchiveUrl,
  );
  if (
    publisherArchiveUrl.protocol !== "https:" ||
    publisherArchiveUrl.hostname !== "github.com" ||
    !publisherArchiveUrl.pathname.includes(
      `/releases/download/v${releaseInputs.mcpPublisher.version}/`,
    )
  ) {
    throw new Error("MCP Publisher URL and version disagree.");
  }

  return deepFreeze(releaseInputs);
}

/** Read and validate the repository-owned release-input authority. */
export async function readUniversalOntologyMcpReleaseInputs(
  releaseInputsPath = fileURLToPath(RELEASE_INPUTS_URL),
) {
  const releaseInputs = JSON.parse(
    await nodeFileSystem.readFile(releaseInputsPath, "utf8"),
  );
  return validateUniversalOntologyMcpReleaseInputs(releaseInputs);
}

async function writeCompleteBuffer(fileHandle, bytes) {
  let byteOffset = 0;

  while (byteOffset < bytes.byteLength) {
    const { bytesWritten } = await fileHandle.write(
      bytes,
      byteOffset,
      bytes.byteLength - byteOffset,
    );

    if (bytesWritten === 0) {
      throw new Error("Runtime archive download made no filesystem progress.");
    }
    byteOffset += bytesWritten;
  }
}

/**
 * Stream one immutable Node runtime archive into a newly owned file while
 * enforcing both its compressed-byte ceiling and expected SHA-256 identity.
 * The incomplete file is removed on every failure path and is never extracted.
 */
export async function downloadVerifiedNodeRuntimeArchive({
  runtimeArchiveUrl,
  expectedSha256,
  compressedArchiveMaximumByteSize,
  downloadTimeoutMilliseconds,
  destinationPath,
  fetchImplementation = globalThis.fetch,
}) {
  const response = await fetchImplementation(runtimeArchiveUrl, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(downloadTimeoutMilliseconds),
  });

  if (response.status !== 200 || response.body === null) {
    throw new Error(
      `Node runtime archive download returned HTTP ${response.status}.`,
    );
  }

  const declaredByteLengthText = response.headers.get("content-length");
  const declaredByteLength =
    declaredByteLengthText === null ? null : Number(declaredByteLengthText);
  if (
    declaredByteLength !== null &&
    (!Number.isSafeInteger(declaredByteLength) ||
      declaredByteLength < 0 ||
      declaredByteLength > compressedArchiveMaximumByteSize)
  ) {
    throw new Error(
      "Node runtime archive exceeds the compressed download byte ceiling.",
    );
  }

  const digest = createHash("sha256");
  let downloadedByteLength = 0;
  let destinationFileHandle;

  try {
    destinationFileHandle = await nodeFileSystem.open(
      destinationPath,
      "wx",
      0o600,
    );

    for await (const chunk of response.body) {
      const chunkBytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      downloadedByteLength += chunkBytes.byteLength;
      if (downloadedByteLength > compressedArchiveMaximumByteSize) {
        throw new Error(
          "Node runtime archive exceeds the compressed download byte ceiling.",
        );
      }

      digest.update(chunkBytes);
      await writeCompleteBuffer(destinationFileHandle, chunkBytes);
    }

    await destinationFileHandle.sync();
    await destinationFileHandle.close();
    destinationFileHandle = undefined;
    const actualSha256 = digest.digest("hex");

    if (actualSha256 !== expectedSha256) {
      throw new Error(
        `Node runtime archive SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
      );
    }

    return Object.freeze({
      byteLength: downloadedByteLength,
      sha256: actualSha256,
    });
  } catch (error) {
    await destinationFileHandle?.close().catch(() => {});
    await nodeFileSystem.rm(destinationPath, { force: true }).catch(() => {});
    throw error;
  }
}

function validateArchiveEntryPath(
  entryPath,
  exactEntryPaths,
  caseFoldedEntryPaths,
) {
  const normalizedEntryPath = entryPath.endsWith("/")
    ? entryPath.slice(0, -1)
    : entryPath;
  const pathSegments = normalizedEntryPath.split("/");

  if (
    normalizedEntryPath === "" ||
    entryPath.includes("\\") ||
    entryPath.includes("\0") ||
    entryPath.startsWith("/") ||
    /^[A-Za-z]:/u.test(entryPath) ||
    pathSegments.some(
      (pathSegment) =>
        pathSegment === "" || pathSegment === "." || pathSegment === "..",
    )
  ) {
    throw new Error(`Runtime archive contains an unsafe path: ${entryPath}`);
  }

  if (exactEntryPaths.has(normalizedEntryPath)) {
    throw new Error(
      `Runtime archive contains a duplicate entry: ${normalizedEntryPath}`,
    );
  }

  const caseFoldedEntryPath = normalizedEntryPath
    .normalize("NFC")
    .toLocaleLowerCase("en-US");
  const collidingEntryPath = caseFoldedEntryPaths.get(caseFoldedEntryPath);
  if (collidingEntryPath !== undefined) {
    throw new Error(
      `Runtime archive contains a case-folded path collision: ${collidingEntryPath} and ${normalizedEntryPath}`,
    );
  }

  exactEntryPaths.add(normalizedEntryPath);
  caseFoldedEntryPaths.set(caseFoldedEntryPath, normalizedEntryPath);
  return normalizedEntryPath;
}

async function readBoundedStreamBytes(readableStream, maximumByteSize) {
  const chunks = [];
  let byteLength = 0;

  for await (const chunk of readableStream) {
    const chunkBytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += chunkBytes.byteLength;
    if (byteLength > maximumByteSize) {
      throw new Error(
        "Selected runtime archive entry exceeds its byte ceiling.",
      );
    }
    chunks.push(chunkBytes);
  }

  return Buffer.concat(chunks, byteLength);
}

function openZipArchive(archivePath) {
  return new Promise((resolveArchive, rejectArchive) => {
    yauzl.open(
      archivePath,
      {
        autoClose: false,
        lazyEntries: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true,
      },
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

function openZipEntryReadStream(zipFile, entry) {
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

function requireRegularSelectedZipEntry(entry) {
  const UNIX_FILE_TYPE_MASK = 0o170000;
  const UNIX_REGULAR_FILE_TYPE = 0o100000;
  const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
  const unixFileType = unixMode & UNIX_FILE_TYPE_MASK;

  if (
    entry.fileName.endsWith("/") ||
    (entry.generalPurposeBitFlag & 0x1) !== 0 ||
    (unixFileType !== 0 && unixFileType !== UNIX_REGULAR_FILE_TYPE)
  ) {
    throw new Error(
      `Selected runtime archive entry is not an unencrypted regular file: ${entry.fileName}`,
    );
  }
}

async function extractSelectedZipRuntimeArchiveFiles({
  archivePath,
  target,
  runtimeExecutableMaximumByteSize,
  licenseMaximumByteSize,
}) {
  const selectedEntryLimits = new Map([
    [target.upstreamRuntimeExecutablePath, runtimeExecutableMaximumByteSize],
    [target.upstreamRuntimeLicensePath, licenseMaximumByteSize],
  ]);
  const selectedEntryBytes = new Map();
  const exactEntryPaths = new Set();
  const caseFoldedEntryPaths = new Map();
  const zipFile = await openZipArchive(archivePath);

  try {
    for await (const entry of zipFile.eachEntry()) {
      const entryPath = validateArchiveEntryPath(
        entry.fileName,
        exactEntryPaths,
        caseFoldedEntryPaths,
      );
      const maximumByteSize = selectedEntryLimits.get(entryPath);

      if (maximumByteSize === undefined) {
        continue;
      }

      requireRegularSelectedZipEntry(entry);
      if (entry.uncompressedSize > maximumByteSize) {
        throw new Error(
          `Selected runtime archive entry exceeds its byte ceiling: ${entryPath}`,
        );
      }
      const entryReadStream = await openZipEntryReadStream(zipFile, entry);
      selectedEntryBytes.set(
        entryPath,
        await readBoundedStreamBytes(entryReadStream, maximumByteSize),
      );
    }
  } finally {
    zipFile.close();
  }

  const runtimeExecutableBytes = selectedEntryBytes.get(
    target.upstreamRuntimeExecutablePath,
  );
  const nodeLicenseBytes = selectedEntryBytes.get(
    target.upstreamRuntimeLicensePath,
  );
  if (!runtimeExecutableBytes || !nodeLicenseBytes) {
    throw new Error(
      "Runtime archive does not contain the exact allowlisted executable and Node license paths.",
    );
  }

  return Object.freeze({ runtimeExecutableBytes, nodeLicenseBytes });
}

async function extractSelectedTarRuntimeArchiveFiles({
  archivePath,
  target,
  runtimeExecutableMaximumByteSize,
  licenseMaximumByteSize,
}) {
  const selectedEntryLimits = new Map([
    [target.upstreamRuntimeExecutablePath, runtimeExecutableMaximumByteSize],
    [target.upstreamRuntimeLicensePath, licenseMaximumByteSize],
  ]);
  const selectedEntryBytes = new Map();
  const exactEntryPaths = new Set();
  const caseFoldedEntryPaths = new Map();
  const selectedEntryReadTasks = [];

  await tar.list({
    file: archivePath,
    strict: true,
    noResume: true,
    // The checksum and compressed-byte ceiling are checked before this pass;
    // the ratio bound additionally limits pathological decompression work.
    maxDecompressionRatio: 100,
    onReadEntry(entry) {
      const entryPath = validateArchiveEntryPath(
        entry.path,
        exactEntryPaths,
        caseFoldedEntryPaths,
      );
      const maximumByteSize = selectedEntryLimits.get(entryPath);

      if (maximumByteSize === undefined) {
        entry.resume();
        return;
      }

      if (entry.type !== "File" || entry.linkpath) {
        entry.resume();
        throw new Error(
          `Selected runtime archive entry is not a regular file: ${entryPath}`,
        );
      }
      if (entry.size > maximumByteSize) {
        entry.resume();
        throw new Error(
          `Selected runtime archive entry exceeds its byte ceiling: ${entryPath}`,
        );
      }

      selectedEntryReadTasks.push(
        readBoundedStreamBytes(entry, maximumByteSize).then((entryBytes) => {
          selectedEntryBytes.set(entryPath, entryBytes);
        }),
      );
    },
  });
  await Promise.all(selectedEntryReadTasks);

  const runtimeExecutableBytes = selectedEntryBytes.get(
    target.upstreamRuntimeExecutablePath,
  );
  const nodeLicenseBytes = selectedEntryBytes.get(
    target.upstreamRuntimeLicensePath,
  );
  if (!runtimeExecutableBytes || !nodeLicenseBytes) {
    throw new Error(
      "Runtime archive does not contain the exact allowlisted executable and Node license paths.",
    );
  }

  return Object.freeze({ runtimeExecutableBytes, nodeLicenseBytes });
}

/**
 * Read only the two release-authorized files from a checksum-verified Node
 * runtime archive. Archive paths are validated before selected bytes become
 * available to assembly; no upstream path is ever extracted to disk.
 */
export async function extractSelectedNodeRuntimeArchiveFiles(options) {
  if (options.target.upstreamArchiveFormat === "zip") {
    return extractSelectedZipRuntimeArchiveFiles(options);
  }
  if (options.target.upstreamArchiveFormat === "tar.gz") {
    return extractSelectedTarRuntimeArchiveFiles(options);
  }

  throw new Error(
    `Unsupported Node runtime archive format: ${options.target.upstreamArchiveFormat}`,
  );
}

function compareBinaryPaths(leftPath, rightPath) {
  return Buffer.compare(Buffer.from(leftPath), Buffer.from(rightPath));
}

function assertOwnedOutputPath(outputPath, ownedDirectoryPath) {
  const relativePath = relative(
    resolve(ownedDirectoryPath),
    resolve(outputPath),
  );

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error("Release output escaped its owned directory.");
  }
}

async function calculateBoundedFileIntegrity(filePath, maximumByteSize) {
  const digest = createHash("sha256");
  let byteLength = 0;

  for await (const chunk of createReadStream(filePath)) {
    byteLength += chunk.byteLength;
    if (byteLength > maximumByteSize) {
      throw new Error(`File exceeds its byte ceiling: ${filePath}`);
    }
    digest.update(chunk);
  }

  return Object.freeze({ byteLength, sha256: digest.digest("hex") });
}

async function readBoundedRegularFile(filePath, maximumByteSize, semanticName) {
  const fileStats = await nodeFileSystem.lstat(filePath);
  if (!fileStats.isFile() || fileStats.size > maximumByteSize) {
    throw new Error(
      `${semanticName} must be a regular file within its byte ceiling.`,
    );
  }
  return nodeFileSystem.readFile(filePath);
}

function parseSourceDateEpochSeconds(value) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 2_147_483_647 ||
    (typeof value === "string" && !/^(?:0|[1-9][0-9]*)$/u.test(value))
  ) {
    throw new Error("SOURCE_DATE_EPOCH must be an unsigned 32-bit Unix time.");
  }
  return parsedValue;
}

function createArchiveThirdPartyNotices(
  packageNoticesBytes,
  nodeLicenseBytes,
  nodeVersion,
) {
  const fatalUtf8Decoder = new TextDecoder("utf-8", { fatal: true });
  const packageNoticesText = fatalUtf8Decoder
    .decode(packageNoticesBytes)
    .trimEnd();
  const nodeLicenseText = fatalUtf8Decoder.decode(nodeLicenseBytes).trimEnd();

  return Buffer.from(
    `${packageNoticesText}\n\n## Node.js ${nodeVersion}\n\nLicense: MIT\n\nThe self-contained platform archive includes the official Node.js ${nodeVersion} runtime. Its complete upstream license and bundled third-party notices follow verbatim.\n\n----- BEGIN NODE.JS LICENSE FILE -----\n${nodeLicenseText}\n----- END NODE.JS LICENSE FILE -----\n`,
  );
}

async function writeOwnedAssemblyFile({
  assemblyDirectoryPath,
  relativePath,
  bytes,
  mode,
}) {
  const outputPath = join(assemblyDirectoryPath, ...relativePath.split("/"));
  assertOwnedOutputPath(outputPath, assemblyDirectoryPath);
  await nodeFileSystem.mkdir(dirname(outputPath), { recursive: true });
  await nodeFileSystem.writeFile(outputPath, bytes, {
    flag: "wx",
    mode,
  });
  await nodeFileSystem.chmod(outputPath, mode);
  return outputPath;
}

async function createDeterministicZipArchive({
  candidateArchivePath,
  archiveRootName,
  assemblyDirectoryPath,
  assemblyFiles,
  sourceDate,
}) {
  const zipFile = new yazl.ZipFile();
  const archiveOutput = pipeline(
    zipFile.outputStream,
    createWriteStream(candidateArchivePath, {
      flags: "wx",
      mode: 0o600,
    }),
  );

  for (const assemblyFile of assemblyFiles) {
    zipFile.addFile(
      join(assemblyDirectoryPath, ...assemblyFile.relativePath.split("/")),
      `${archiveRootName}/${assemblyFile.relativePath}`,
      {
        mtime: sourceDate,
        mode: assemblyFile.mode,
        compress: true,
        compressionLevel: 9,
        forceZip64Format: false,
        forceDosTimestamp: false,
      },
    );
  }
  zipFile.end({ forceZip64Format: false });
  await archiveOutput;
}

async function createDeterministicTarGzipArchive({
  candidateArchivePath,
  archiveRootName,
  assemblyDirectoryPath,
  assemblyFiles,
  sourceDate,
  sourceDateEpochSeconds,
}) {
  const modeByRelativePath = new Map(
    assemblyFiles.map(({ relativePath, mode }) => [relativePath, mode]),
  );

  await tar.create(
    {
      cwd: assemblyDirectoryPath,
      file: candidateArchivePath,
      prefix: archiveRootName,
      gzip: { level: 9, mtime: sourceDateEpochSeconds },
      portable: true,
      noDirRecurse: true,
      noPax: true,
      mtime: sourceDate,
      strict: true,
      onWriteEntry(entry) {
        const relativeEntryPath = entry.path.split(sep).join("/");
        entry.stat.mode = modeByRelativePath.get(relativeEntryPath);
      },
    },
    assemblyFiles.map(({ relativePath }) => relativePath),
  );
}

async function listConstructedZipArchiveEntries(archivePath) {
  const zipFile = await openZipArchive(archivePath);
  const entries = [];
  const exactEntryPaths = new Set();
  const caseFoldedEntryPaths = new Map();

  try {
    for await (const entry of zipFile.eachEntry()) {
      const entryPath = validateArchiveEntryPath(
        entry.fileName,
        exactEntryPaths,
        caseFoldedEntryPaths,
      );
      requireRegularSelectedZipEntry(entry);
      entries.push({
        path: entryPath,
        byteLength: entry.uncompressedSize,
        mode: (entry.externalFileAttributes >>> 16) & 0o777,
      });
    }
  } finally {
    zipFile.close();
  }
  return entries;
}

async function listConstructedTarArchiveEntries(archivePath) {
  const entries = [];
  const exactEntryPaths = new Set();
  const caseFoldedEntryPaths = new Map();

  await tar.list({
    file: archivePath,
    strict: true,
    onReadEntry(entry) {
      const entryPath = validateArchiveEntryPath(
        entry.path,
        exactEntryPaths,
        caseFoldedEntryPaths,
      );
      if (entry.type !== "File" || entry.linkpath) {
        throw new Error(
          `Constructed release archive entry is not a regular file: ${entryPath}`,
        );
      }
      entries.push({
        path: entryPath,
        byteLength: entry.size,
        mode: entry.mode & 0o777,
      });
    },
  });
  return entries;
}

async function verifyConstructedPlatformArchive({
  candidateArchivePath,
  target,
  archiveRootName,
  assemblyFiles,
}) {
  const archiveEntries =
    target.releaseArchiveFormat === "zip"
      ? await listConstructedZipArchiveEntries(candidateArchivePath)
      : await listConstructedTarArchiveEntries(candidateArchivePath);
  const expectedEntries = assemblyFiles.map(
    ({ relativePath, bytes, mode }) => ({
      path: `${archiveRootName}/${relativePath}`,
      byteLength: bytes.byteLength,
      mode,
    }),
  );

  if (JSON.stringify(archiveEntries) !== JSON.stringify(expectedEntries)) {
    throw new Error(
      "Constructed platform archive does not match the exact file, size, order, and mode manifest.",
    );
  }
}

async function publishArchiveWithoutOverwrite({
  candidateArchivePath,
  finalArchivePath,
  candidateIntegrity,
}) {
  try {
    // A hard link publishes the complete candidate atomically and refuses to
    // replace an existing release name. Both default directories share dist/.
    await nodeFileSystem.link(candidateArchivePath, finalArchivePath);
    await nodeFileSystem.unlink(candidateArchivePath);
    return;
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
  }

  const existingIntegrity = await calculateBoundedFileIntegrity(
    finalArchivePath,
    Number.MAX_SAFE_INTEGER,
  );
  if (
    existingIntegrity.byteLength !== candidateIntegrity.byteLength ||
    existingIntegrity.sha256 !== candidateIntegrity.sha256
  ) {
    throw new Error(
      `Refusing to replace a different existing release archive: ${finalArchivePath}`,
    );
  }
  await nodeFileSystem.unlink(candidateArchivePath);
}

/**
 * Build one self-contained archive from the canonical application bundle and
 * an immutable official Node runtime. Construction occurs in a unique work
 * directory; only a fully verified artifact is atomically published.
 */
export async function buildUniversalOntologyMcpPlatformArchive({
  targetName,
  releaseInputs: suppliedReleaseInputs,
  runtimeArchivePath: suppliedRuntimeArchivePath,
  releaseDirectoryPath = DEFAULT_RELEASE_DIRECTORY_PATH,
  releaseWorkParentDirectoryPath = DEFAULT_RELEASE_WORK_PARENT_DIRECTORY_PATH,
  sourceDateEpochSeconds: suppliedSourceDateEpochSeconds,
  fetchImplementation = globalThis.fetch,
} = {}) {
  const [rootPackage, publicPackage, releaseInputs] = await Promise.all([
    readJsonDocument(ROOT_PACKAGE_JSON_PATH),
    readJsonDocument(PUBLIC_PACKAGE_JSON_PATH),
    suppliedReleaseInputs
      ? Promise.resolve(
          validateUniversalOntologyMcpReleaseInputs(suppliedReleaseInputs),
        )
      : readUniversalOntologyMcpReleaseInputs(),
  ]);
  if (
    rootPackage.version !== publicPackage.version ||
    rootPackage.packageManager !== `npm@${releaseInputs.selectedNpmVersion}`
  ) {
    throw new Error(
      "Root package, public package, and selected npm release identities disagree.",
    );
  }

  const target = releaseInputs.nodeRuntime.targets.find(
    (candidateTarget) => candidateTarget.targetName === targetName,
  );
  if (!target) {
    throw new Error(`Unknown release target: ${targetName ?? "missing"}`);
  }
  const sourceDateEpochSeconds = parseSourceDateEpochSeconds(
    suppliedSourceDateEpochSeconds ??
      process.env.SOURCE_DATE_EPOCH ??
      DEFAULT_SOURCE_DATE_EPOCH_SECONDS,
  );
  const sourceDate = new Date(sourceDateEpochSeconds * 1000);
  const archiveRootName = `${publicPackage.name}-v${publicPackage.version}-${target.targetName}`;
  const archiveExtension =
    target.releaseArchiveFormat === "zip" ? ".zip" : ".tar.gz";
  const archiveName = `${archiveRootName}${archiveExtension}`;
  const finalArchivePath = join(releaseDirectoryPath, archiveName);
  assertOwnedOutputPath(finalArchivePath, releaseDirectoryPath);

  await Promise.all([
    nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true }),
    nodeFileSystem.mkdir(releaseWorkParentDirectoryPath, { recursive: true }),
  ]);
  const workDirectoryPath = await nodeFileSystem.mkdtemp(
    join(releaseWorkParentDirectoryPath, `${target.targetName}-`),
  );

  try {
    const runtimeArchivePath =
      suppliedRuntimeArchivePath ??
      join(
        workDirectoryPath,
        `node-runtime.${target.upstreamArchiveFormat === "zip" ? "zip" : "tar.gz"}`,
      );
    let runtimeArchiveIntegrity;
    if (suppliedRuntimeArchivePath) {
      runtimeArchiveIntegrity = await calculateBoundedFileIntegrity(
        suppliedRuntimeArchivePath,
        releaseInputs.nodeRuntime.compressedArchiveMaximumByteSize,
      );
      if (runtimeArchiveIntegrity.sha256 !== target.runtimeArchiveSha256) {
        throw new Error(
          `Node runtime archive SHA-256 mismatch: expected ${target.runtimeArchiveSha256}, received ${runtimeArchiveIntegrity.sha256}.`,
        );
      }
    } else {
      runtimeArchiveIntegrity = await downloadVerifiedNodeRuntimeArchive({
        runtimeArchiveUrl: target.runtimeArchiveUrl,
        expectedSha256: target.runtimeArchiveSha256,
        compressedArchiveMaximumByteSize:
          releaseInputs.nodeRuntime.compressedArchiveMaximumByteSize,
        downloadTimeoutMilliseconds:
          releaseInputs.nodeRuntime.downloadTimeoutMilliseconds,
        destinationPath: runtimeArchivePath,
        fetchImplementation,
      });
    }

    const { runtimeExecutableBytes, nodeLicenseBytes } =
      await extractSelectedNodeRuntimeArchiveFiles({
        archivePath: runtimeArchivePath,
        target,
        runtimeExecutableMaximumByteSize:
          releaseInputs.nodeRuntime.runtimeExecutableMaximumByteSize,
        licenseMaximumByteSize:
          releaseInputs.nodeRuntime.licenseMaximumByteSize,
      });
    await buildUniversalOntologyMcpApplicationBundle();
    const applicationBundleBytes = await readBoundedRegularFile(
      join(
        REPOSITORY_ROOT_PATH,
        ...releaseInputs.applicationBundle.sourceRelativePath.split("/"),
      ),
      releaseInputs.applicationBundle.maximumByteSize,
      "MCP application bundle",
    );
    const staticFileBytes = new Map();
    for (const staticFile of releaseInputs.packagedStaticFiles) {
      staticFileBytes.set(
        staticFile.packagedRelativePath,
        await readBoundedRegularFile(
          join(
            REPOSITORY_ROOT_PATH,
            ...staticFile.sourceRelativePath.split("/"),
          ),
          staticFile.maximumByteSize,
          staticFile.packagedRelativePath,
        ),
      );
    }
    staticFileBytes.set(
      "THIRD_PARTY_NOTICES.md",
      createArchiveThirdPartyNotices(
        staticFileBytes.get("THIRD_PARTY_NOTICES.md"),
        nodeLicenseBytes,
        releaseInputs.nodeRuntime.version,
      ),
    );

    const assemblyFiles = [
      {
        relativePath: releaseInputs.applicationBundle.packagedRelativePath,
        bytes: applicationBundleBytes,
        mode: Number.parseInt(releaseInputs.applicationBundle.mode, 8),
      },
      {
        relativePath: target.packagedRuntimeExecutablePath,
        bytes: runtimeExecutableBytes,
        mode: 0o755,
      },
      ...releaseInputs.packagedStaticFiles.map((staticFile) => ({
        relativePath: staticFile.packagedRelativePath,
        bytes: staticFileBytes.get(staticFile.packagedRelativePath),
        mode: Number.parseInt(staticFile.mode, 8),
      })),
    ].sort(({ relativePath: leftPath }, { relativePath: rightPath }) =>
      compareBinaryPaths(leftPath, rightPath),
    );
    const exactAssemblyPaths = new Set();
    const caseFoldedAssemblyPaths = new Map();
    for (const { relativePath } of assemblyFiles) {
      validateArchiveEntryPath(
        relativePath,
        exactAssemblyPaths,
        caseFoldedAssemblyPaths,
      );
    }

    const assemblyDirectoryPath = join(workDirectoryPath, "assembly");
    await nodeFileSystem.mkdir(assemblyDirectoryPath, { recursive: true });
    for (const assemblyFile of assemblyFiles) {
      await writeOwnedAssemblyFile({
        assemblyDirectoryPath,
        ...assemblyFile,
      });
    }

    const candidateArchivePath = join(workDirectoryPath, archiveName);
    assertOwnedOutputPath(candidateArchivePath, workDirectoryPath);
    const createArchive =
      target.releaseArchiveFormat === "zip"
        ? createDeterministicZipArchive
        : createDeterministicTarGzipArchive;
    await createArchive({
      candidateArchivePath,
      archiveRootName,
      assemblyDirectoryPath,
      assemblyFiles,
      sourceDate,
      sourceDateEpochSeconds,
    });
    await verifyConstructedPlatformArchive({
      candidateArchivePath,
      target,
      archiveRootName,
      assemblyFiles,
    });
    const candidateIntegrity = await calculateBoundedFileIntegrity(
      candidateArchivePath,
      Number.MAX_SAFE_INTEGER,
    );
    await publishArchiveWithoutOverwrite({
      candidateArchivePath,
      finalArchivePath,
      candidateIntegrity,
    });

    return Object.freeze({
      targetName: target.targetName,
      archiveName,
      archivePath: finalArchivePath,
      archiveByteLength: candidateIntegrity.byteLength,
      archiveSha256: candidateIntegrity.sha256,
      runtimeArchiveByteLength: runtimeArchiveIntegrity.byteLength,
      runtimeArchiveSha256: runtimeArchiveIntegrity.sha256,
      sourceDateEpochSeconds,
    });
  } finally {
    await nodeFileSystem.rm(workDirectoryPath, {
      recursive: true,
      force: true,
    });
  }
}

function parseCommandLineTarget(arguments_) {
  let targetName;

  for (
    let argumentIndex = 0;
    argumentIndex < arguments_.length;
    argumentIndex += 1
  ) {
    const argument = arguments_[argumentIndex];
    if (argument.startsWith("--target=")) {
      if (targetName !== undefined) {
        throw new Error("The --target option may be supplied only once.");
      }
      targetName = argument.slice("--target=".length);
    } else if (argument === "--target") {
      if (targetName !== undefined || argumentIndex + 1 >= arguments_.length) {
        throw new Error("The --target option requires exactly one value.");
      }
      targetName = arguments_[argumentIndex + 1];
      argumentIndex += 1;
    } else {
      throw new Error(`Unknown platform archive option: ${argument}`);
    }
  }

  if (!targetName) {
    throw new Error("The --target option is required.");
  }
  return targetName;
}

const invokedScriptPath = process.argv[1]
  ? resolve(process.argv[1])
  : undefined;

if (invokedScriptPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildUniversalOntologyMcpPlatformArchive({
      targetName: parseCommandLineTarget(process.argv.slice(2)),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `Universal Ontology MCP platform archive build failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
