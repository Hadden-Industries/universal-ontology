import * as nodeFileSystem from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { readUniversalOntologyMcpReleaseInputs } from "./buildUniversalOntologyMcpPlatformArchive.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const ROOT_PACKAGE_JSON_PATH = join(REPOSITORY_ROOT_PATH, "package.json");
const PUBLIC_PACKAGE_JSON_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
  "package.json",
);
const SERVER_DOCUMENT_PATH = join(REPOSITORY_ROOT_PATH, "server.json");
const DOCKERFILE_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
  "Dockerfile",
);
const DEFAULT_RELEASE_DIRECTORY_PATH = join(
  REPOSITORY_ROOT_PATH,
  "dist",
  "releases",
);
const DEFAULT_APPLICATION_BUNDLE_METADATA_PATH = join(
  REPOSITORY_ROOT_PATH,
  "dist",
  "release-work",
  "universal-ontology-mcp-application-bundle.json",
);
const DEFAULT_SOURCE_DATE_EPOCH_SECONDS = 315_532_800;
const MAXIMUM_RELEASE_ASSET_BYTE_SIZE = 268_435_456;
const SPDX_DOCUMENT_ID = "SPDXRef-DOCUMENT";
const SPDX_CREATOR = "Tool: createUniversalOntologyMcpSpdxSbom.js-1.0.0";

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJsonDocument(filePath) {
  return JSON.parse(await nodeFileSystem.readFile(filePath, "utf8"));
}

function compareBinaryText(leftText, rightText) {
  return Buffer.compare(Buffer.from(leftText), Buffer.from(rightText));
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
    throw new Error("SPDX output escaped its owned release directory.");
  }
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

function createSpdxIdentifier(...identityParts) {
  const identifierSuffix = identityParts
    .join("-")
    .replaceAll(/[^A-Za-z0-9.-]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
  if (identifierSuffix === "") {
    throw new Error("Cannot derive an empty SPDX identifier.");
  }
  return `SPDXRef-${identifierSuffix}`;
}

function createSpdxPackage({
  name,
  spdxId,
  version,
  license,
  sha256,
  downloadLocation = "NOASSERTION",
  externalRefs,
}) {
  const spdxPackage = {
    name,
    SPDXID: spdxId,
    downloadLocation,
    filesAnalyzed: false,
    licenseConcluded: license,
    licenseDeclared: license,
    copyrightText: "NOASSERTION",
  };
  if (version) {
    spdxPackage.versionInfo = version;
  }
  if (sha256) {
    spdxPackage.checksums = [{ algorithm: "SHA256", checksumValue: sha256 }];
  }
  if (externalRefs) {
    spdxPackage.externalRefs = externalRefs;
  }
  return spdxPackage;
}

function createNpmPurlExternalReference(name, version) {
  const encodedName = name.startsWith("@")
    ? `%40${name.slice(1).split("/").map(encodeURIComponent).join("/")}`
    : encodeURIComponent(name);
  return [
    {
      referenceCategory: "PACKAGE-MANAGER",
      referenceType: "purl",
      referenceLocator: `pkg:npm/${encodedName}@${version}`,
    },
  ];
}

function createRelationship(
  spdxElementId,
  relationshipType,
  relatedSpdxElement,
) {
  return { spdxElementId, relationshipType, relatedSpdxElement };
}

function sortRelationships(relationships) {
  return relationships.sort((left, right) =>
    compareBinaryText(
      `${left.spdxElementId}|${left.relationshipType}|${left.relatedSpdxElement}`,
      `${right.spdxElementId}|${right.relationshipType}|${right.relatedSpdxElement}`,
    ),
  );
}

function createDocumentNamespace(version, documentKind, subjectSha256) {
  return `https://github.com/hadden-industries/universal-ontology/spdx/${version}/${documentKind}/${subjectSha256}`;
}

function createSpdxDocument({
  name,
  namespace,
  created,
  packages,
  relationships,
}) {
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: SPDX_DOCUMENT_ID,
    name,
    documentNamespace: namespace,
    creationInfo: {
      created,
      creators: ["Organization: Hadden Industries", SPDX_CREATOR],
    },
    packages,
    relationships: sortRelationships(relationships),
  };
}

function validateApplicationBundleMetadata(bundleMetadata, publicPackage) {
  if (
    bundleMetadata.applicationBundleMetadataFormatVersion !== 1 ||
    bundleMetadata.packageName !== publicPackage.name ||
    bundleMetadata.packageVersion !== publicPackage.version ||
    !/^[a-f0-9]{64}$/u.test(bundleMetadata.bundleSha256) ||
    !Array.isArray(bundleMetadata.bundledComponents) ||
    bundleMetadata.bundledComponents.length === 0
  ) {
    throw new Error(
      "Application bundle metadata is incomplete or inconsistent.",
    );
  }

  const componentIdentities = new Set();
  for (const component of bundleMetadata.bundledComponents) {
    if (
      typeof component.name !== "string" ||
      typeof component.version !== "string" ||
      typeof component.license !== "string"
    ) {
      throw new Error("Bundled component metadata is incomplete.");
    }
    const identity = `${component.name}@${component.version}`;
    if (componentIdentities.has(identity)) {
      throw new Error(`Duplicate bundled component identity: ${identity}`);
    }
    componentIdentities.add(identity);
  }
}

function createOciMetadata({ serverDocument, releaseInputs, dockerfileText }) {
  const ociPackage = serverDocument.packages.find(
    ({ registryType }) => registryType === "oci",
  );
  if (
    !ociPackage ||
    !dockerfileText.includes(releaseInputs.ociBaseImage.reference)
  ) {
    throw new Error(
      "OCI Registry metadata and Dockerfile base identity disagree.",
    );
  }

  return {
    ociImageMetadataFormatVersion: 1,
    imageReference: ociPackage.identifier,
    platforms: ["linux/amd64", "linux/arm64"],
    baseImageReference: releaseInputs.ociBaseImage.reference,
    user: "node:node",
    entrypoint: ["node", "/opt/universal-ontology-mcp-server/server.mjs"],
    volumes: ["/home/node/.cache/universal-ontology-mcp-server/v1"],
    exposedPorts: [],
    healthcheck: null,
    labels: {
      "org.opencontainers.image.title": "Universal Ontology MCP Server",
      "org.opencontainers.image.licenses": "MIT",
      "io.modelcontextprotocol.server.name": serverDocument.name,
    },
  };
}

function createDevelopmentCandidateNotes({ publicPackage, releaseInputs }) {
  const targetLines = releaseInputs.nodeRuntime.targets
    .map(
      ({ targetName, releaseArchiveFormat }) =>
        `- locally assembled \`${targetName}\` self-contained archive (\`${releaseArchiveFormat}\`)`,
    )
    .join("\n");
  return `# Universal Ontology MCP Server development candidate v${publicPackage.version}\n\nThis unpublished development candidate provides the data-free local stdio server for verification only. Ontology query artifacts remain independently delivered through a configured Universal Ontology artifact channel.\n\n## Candidate payloads and compatibility metadata\n\n- locally packed \`${publicPackage.name}-${publicPackage.version}.tgz\`; it is not published to npm\n- OCI compatibility metadata records the reserved future coordinate \`ghcr.io/hadden-industries/universal-ontology-mcp-server:${publicPackage.version}\`; no OCI image is published\n${targetLines}\n\nAll candidate bytes are covered by \`SHA256SUMS\`; SPDX documents describe the bundled application dependencies and self-contained Node runtimes. The candidate is a short-lived GitHub Actions artifact, not a GitHub Release or immutable software release.\n`;
}

async function writeDeterministicFile(filePath, bytes) {
  const normalizedBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  await nodeFileSystem.writeFile(filePath, normalizedBytes, {
    mode: 0o600,
  });
}

async function readReleaseAssetRecord(releaseDirectoryPath, fileName) {
  if (fileName.includes("/") || fileName.includes("\\")) {
    throw new Error(`Release asset name is not a basename: ${fileName}`);
  }
  const filePath = join(releaseDirectoryPath, fileName);
  assertOwnedOutputPath(filePath, releaseDirectoryPath);
  const fileHandle = await nodeFileSystem.open(filePath, "r");
  try {
    const initialStats = await fileHandle.stat();
    if (
      !initialStats.isFile() ||
      initialStats.size > MAXIMUM_RELEASE_ASSET_BYTE_SIZE
    ) {
      throw new Error(
        `Release asset is not a bounded regular file: ${fileName}`,
      );
    }
    const digest = createHash("sha256");
    let byteLength = 0;
    for await (const chunk of fileHandle.createReadStream({
      autoClose: false,
    })) {
      byteLength += chunk.byteLength;
      if (byteLength > MAXIMUM_RELEASE_ASSET_BYTE_SIZE) {
        throw new Error(`Release asset exceeds its byte ceiling: ${fileName}`);
      }
      digest.update(chunk);
    }
    const finalStats = await fileHandle.stat();
    if (
      byteLength !== initialStats.size ||
      finalStats.size !== initialStats.size
    ) {
      throw new Error(`Release asset changed while being hashed: ${fileName}`);
    }
    return Object.freeze({
      fileName,
      filePath,
      byteLength,
      sha256: digest.digest("hex"),
    });
  } finally {
    await fileHandle.close();
  }
}

function createApplicationAndComponentPackages(bundleMetadata) {
  const applicationSpdxId = createSpdxIdentifier(
    "Package",
    "Universal-Ontology-MCP-Application",
  );
  const applicationPackage = createSpdxPackage({
    name: bundleMetadata.packageName,
    spdxId: applicationSpdxId,
    version: bundleMetadata.packageVersion,
    license: "MIT",
    sha256: bundleMetadata.bundleSha256,
    externalRefs: createNpmPurlExternalReference(
      bundleMetadata.packageName,
      bundleMetadata.packageVersion,
    ),
  });
  const componentPackages = [...bundleMetadata.bundledComponents]
    .sort((left, right) =>
      compareBinaryText(
        `${left.name}@${left.version}`,
        `${right.name}@${right.version}`,
      ),
    )
    .map((component) => ({
      component,
      spdxPackage: createSpdxPackage({
        name: component.name,
        spdxId: createSpdxIdentifier(
          "Package",
          "npm",
          component.name,
          component.version,
        ),
        version: component.version,
        license: component.license,
        externalRefs: createNpmPurlExternalReference(
          component.name,
          component.version,
        ),
      }),
    }));
  return { applicationSpdxId, applicationPackage, componentPackages };
}

function createAssetSpdxPackage(assetRecord) {
  return createSpdxPackage({
    name: assetRecord.fileName,
    spdxId: createSpdxIdentifier("Artifact", assetRecord.fileName),
    license: "NOASSERTION",
    sha256: assetRecord.sha256,
  });
}

function serializeCanonicalJson(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Generate deterministic SPDX 2.3 package/release documents and checksum
 * metadata from already assembled release bytes. Identity comes from exact
 * digests and SOURCE_DATE_EPOCH; no wall clock or random UUID enters output.
 */
export async function createUniversalOntologyMcpSpdxSboms({
  releaseDirectoryPath = DEFAULT_RELEASE_DIRECTORY_PATH,
  applicationBundleMetadataPath = DEFAULT_APPLICATION_BUNDLE_METADATA_PATH,
  sourceDateEpochSeconds: suppliedSourceDateEpochSeconds,
} = {}) {
  const sourceDateEpochSeconds = parseSourceDateEpochSeconds(
    suppliedSourceDateEpochSeconds ??
      process.env.SOURCE_DATE_EPOCH ??
      DEFAULT_SOURCE_DATE_EPOCH_SECONDS,
  );
  const created = new Date(sourceDateEpochSeconds * 1000).toISOString();
  const [
    rootPackage,
    publicPackage,
    serverDocument,
    dockerfileText,
    releaseInputs,
    bundleMetadata,
  ] = await Promise.all([
    readJsonDocument(ROOT_PACKAGE_JSON_PATH),
    readJsonDocument(PUBLIC_PACKAGE_JSON_PATH),
    readJsonDocument(SERVER_DOCUMENT_PATH),
    nodeFileSystem.readFile(DOCKERFILE_PATH, "utf8"),
    readUniversalOntologyMcpReleaseInputs(),
    readJsonDocument(applicationBundleMetadataPath),
  ]);
  if (
    rootPackage.version !== publicPackage.version ||
    serverDocument.version !== publicPackage.version ||
    serverDocument.name !== publicPackage.mcpName
  ) {
    throw new Error(
      "Release version and Registry ownership authorities disagree.",
    );
  }
  validateApplicationBundleMetadata(bundleMetadata, publicPackage);

  await nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true });
  const version = publicPackage.version;
  const releaseBaseName = `${publicPackage.name}-v${version}`;
  const packageSbomFileName = `${releaseBaseName}-npm.spdx.json`;
  const releaseSbomFileName = `${releaseBaseName}-release.spdx.json`;
  const ociMetadataFileName = `${releaseBaseName}-oci-metadata.json`;
  const developmentCandidateNotesFileName = `${releaseBaseName}-development-candidate-notes.md`;
  const registryDocumentFileName = "server.json";
  const checksumsFileName = "SHA256SUMS";
  const generatedFileNames = new Set([
    packageSbomFileName,
    releaseSbomFileName,
    ociMetadataFileName,
    developmentCandidateNotesFileName,
    registryDocumentFileName,
    checksumsFileName,
  ]);
  const expectedPayloadFileNames = [
    `${publicPackage.name}-${version}.tgz`,
    ...releaseInputs.nodeRuntime.targets.map(
      ({ targetName, releaseArchiveFormat }) =>
        `${releaseBaseName}-${targetName}.${releaseArchiveFormat === "zip" ? "zip" : "tar.gz"}`,
    ),
  ].sort(compareBinaryText);
  const expectedAllowedFileNames = new Set([
    ...expectedPayloadFileNames,
    ...generatedFileNames,
  ]);
  const releaseDirectoryEntries = await nodeFileSystem.readdir(
    releaseDirectoryPath,
    { withFileTypes: true },
  );
  for (const entry of releaseDirectoryEntries) {
    if (!entry.isFile() || !expectedAllowedFileNames.has(entry.name)) {
      throw new Error(`Unexpected release staging entry: ${entry.name}`);
    }
  }

  const ociMetadata = createOciMetadata({
    serverDocument,
    releaseInputs,
    dockerfileText,
  });
  const generatedStaticFiles = [
    {
      fileName: registryDocumentFileName,
      bytes: Buffer.from(serializeCanonicalJson(serverDocument)),
    },
    {
      fileName: ociMetadataFileName,
      bytes: Buffer.from(serializeCanonicalJson(ociMetadata)),
    },
    {
      fileName: developmentCandidateNotesFileName,
      bytes: Buffer.from(
        createDevelopmentCandidateNotes({ publicPackage, releaseInputs }),
      ),
    },
  ];
  for (const generatedStaticFile of generatedStaticFiles) {
    await writeDeterministicFile(
      join(releaseDirectoryPath, generatedStaticFile.fileName),
      generatedStaticFile.bytes,
    );
  }

  const releaseSubjectFileNames = [
    ...expectedPayloadFileNames,
    registryDocumentFileName,
    ociMetadataFileName,
    developmentCandidateNotesFileName,
  ].sort(compareBinaryText);
  const releaseAssetRecords = await Promise.all(
    releaseSubjectFileNames.map((fileName) =>
      readReleaseAssetRecord(releaseDirectoryPath, fileName),
    ),
  );
  const npmTarballFileName = `${publicPackage.name}-${version}.tgz`;
  const npmTarballRecord = releaseAssetRecords.find(
    ({ fileName }) => fileName === npmTarballFileName,
  );
  if (!npmTarballRecord) {
    throw new Error("Release staging omits the exact npm tarball.");
  }

  const { applicationSpdxId, applicationPackage, componentPackages } =
    createApplicationAndComponentPackages(bundleMetadata);
  const npmAssetPackage = createAssetSpdxPackage(npmTarballRecord);
  const npmRelationships = [
    createRelationship(SPDX_DOCUMENT_ID, "DESCRIBES", applicationSpdxId),
    createRelationship(SPDX_DOCUMENT_ID, "DESCRIBES", npmAssetPackage.SPDXID),
    createRelationship(npmAssetPackage.SPDXID, "CONTAINS", applicationSpdxId),
    createRelationship(
      npmAssetPackage.SPDXID,
      "GENERATED_FROM",
      applicationSpdxId,
    ),
    ...componentPackages.map(({ spdxPackage }) =>
      createRelationship(applicationSpdxId, "DEPENDS_ON", spdxPackage.SPDXID),
    ),
  ];
  const packageSbom = createSpdxDocument({
    name: `${publicPackage.name}-${version}-npm-sbom`,
    namespace: createDocumentNamespace(version, "npm", npmTarballRecord.sha256),
    created,
    packages: [
      applicationPackage,
      ...componentPackages.map(({ spdxPackage }) => spdxPackage),
      npmAssetPackage,
    ],
    relationships: npmRelationships,
  });

  const nodeSpdxId = createSpdxIdentifier(
    "Package",
    "Node",
    releaseInputs.nodeRuntime.version,
  );
  const nodePackage = createSpdxPackage({
    name: "node",
    spdxId: nodeSpdxId,
    version: releaseInputs.nodeRuntime.version,
    license: "MIT",
    downloadLocation: `https://nodejs.org/dist/v${releaseInputs.nodeRuntime.version}/`,
    externalRefs: [
      {
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: `pkg:generic/node@${releaseInputs.nodeRuntime.version}`,
      },
    ],
  });
  const releaseAssetPackages = releaseAssetRecords.map(createAssetSpdxPackage);
  const releaseRelationships = [
    createRelationship(SPDX_DOCUMENT_ID, "DESCRIBES", applicationSpdxId),
    ...componentPackages.map(({ spdxPackage }) =>
      createRelationship(applicationSpdxId, "DEPENDS_ON", spdxPackage.SPDXID),
    ),
  ];
  for (const assetPackage of releaseAssetPackages) {
    releaseRelationships.push(
      createRelationship(SPDX_DOCUMENT_ID, "DESCRIBES", assetPackage.SPDXID),
      createRelationship(
        assetPackage.SPDXID,
        "GENERATED_FROM",
        applicationSpdxId,
      ),
    );
    if (assetPackage.name === npmTarballFileName) {
      releaseRelationships.push(
        createRelationship(assetPackage.SPDXID, "CONTAINS", applicationSpdxId),
      );
    }
    if (
      releaseInputs.nodeRuntime.targets.some(({ targetName }) =>
        assetPackage.name.includes(`-${targetName}.`),
      )
    ) {
      releaseRelationships.push(
        createRelationship(assetPackage.SPDXID, "CONTAINS", applicationSpdxId),
        createRelationship(assetPackage.SPDXID, "CONTAINS", nodeSpdxId),
      );
    }
  }
  const releaseSubjectManifestSha256 = calculateSha256(
    Buffer.from(
      JSON.stringify(
        releaseAssetRecords.map(({ fileName, byteLength, sha256 }) => ({
          fileName,
          byteLength,
          sha256,
        })),
      ),
    ),
  );
  const releaseSbom = createSpdxDocument({
    name: `${releaseBaseName}-release-sbom`,
    namespace: createDocumentNamespace(
      version,
      "release",
      releaseSubjectManifestSha256,
    ),
    created,
    packages: [
      applicationPackage,
      ...componentPackages.map(({ spdxPackage }) => spdxPackage),
      nodePackage,
      ...releaseAssetPackages,
    ],
    relationships: releaseRelationships,
  });

  const packageSbomPath = join(releaseDirectoryPath, packageSbomFileName);
  const releaseSbomPath = join(releaseDirectoryPath, releaseSbomFileName);
  await Promise.all([
    writeDeterministicFile(
      packageSbomPath,
      serializeCanonicalJson(packageSbom),
    ),
    writeDeterministicFile(
      releaseSbomPath,
      serializeCanonicalJson(releaseSbom),
    ),
  ]);

  const checksummedFileNames = [
    ...releaseSubjectFileNames,
    packageSbomFileName,
    releaseSbomFileName,
  ].sort(compareBinaryText);
  const checksummedAssetRecords = await Promise.all(
    checksummedFileNames.map((fileName) =>
      readReleaseAssetRecord(releaseDirectoryPath, fileName),
    ),
  );
  const checksumsText = `${checksummedAssetRecords
    .map(({ sha256, fileName }) => `${sha256}  ${fileName}`)
    .join("\n")}\n`;
  const checksumsPath = join(releaseDirectoryPath, checksumsFileName);
  await writeDeterministicFile(checksumsPath, checksumsText);

  return Object.freeze({
    packageSbomFileName,
    packageSbomPath,
    releaseSbomFileName,
    releaseSbomPath,
    ociMetadataFileName,
    ociMetadataPath: join(releaseDirectoryPath, ociMetadataFileName),
    developmentCandidateNotesFileName,
    developmentCandidateNotesPath: join(
      releaseDirectoryPath,
      developmentCandidateNotesFileName,
    ),
    registryDocumentFileName,
    registryDocumentPath: join(releaseDirectoryPath, registryDocumentFileName),
    checksumsFileName,
    checksumsPath,
    sourceDateEpochSeconds,
  });
}

function parseCommandLineArguments(arguments_) {
  let releaseDirectoryPath;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument.startsWith("--release-directory=")) {
      if (releaseDirectoryPath !== undefined) {
        throw new Error("--release-directory may be supplied only once.");
      }
      releaseDirectoryPath = resolve(
        argument.slice("--release-directory=".length),
      );
    } else if (argument === "--release-directory") {
      if (
        releaseDirectoryPath !== undefined ||
        index + 1 >= arguments_.length
      ) {
        throw new Error("--release-directory requires exactly one value.");
      }
      releaseDirectoryPath = resolve(arguments_[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown SPDX generation option: ${argument}`);
    }
  }
  return { releaseDirectoryPath };
}

const invokedScriptPath = process.argv[1]
  ? resolve(process.argv[1])
  : undefined;

if (invokedScriptPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCommandLineArguments(process.argv.slice(2));
    const result = await createUniversalOntologyMcpSpdxSboms(options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `Universal Ontology MCP SPDX generation failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
