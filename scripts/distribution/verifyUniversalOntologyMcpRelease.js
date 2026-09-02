import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import * as nodeFileSystem from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import * as tar from "tar";
import yauzl from "yauzl";
import { parse as parseYaml } from "yaml";

import { readUniversalOntologyMcpReleaseInputs } from "./buildUniversalOntologyMcpPlatformArchive.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const ROOT_PACKAGE_JSON_PATH = join(REPOSITORY_ROOT_PATH, "package.json");
const PUBLIC_PACKAGE_JSON_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
  "package.json",
);
const REPOSITORY_SERVER_DOCUMENT_PATH = join(
  REPOSITORY_ROOT_PATH,
  "server.json",
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
const DEFAULT_DISTRIBUTION_WORKFLOW_PATH = join(
  REPOSITORY_ROOT_PATH,
  ".github",
  "workflows",
  "verify-universal-ontology-mcp-distribution.yml",
);
const RELEASE_TAG_PATTERN =
  /^universal-ontology-mcp-server-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAXIMUM_RELEASE_ASSET_BYTE_SIZE = 268_435_456;
const MAXIMUM_METADATA_BYTE_SIZE = 16_777_216;
const STREAM_SCAN_TAIL_CHARACTER_COUNT = 512;
const SPDX_DOCUMENT_ID = "SPDXRef-DOCUMENT";
const EXPECTED_DISTRIBUTION_WORKFLOW_PATH_FILTERS = Object.freeze([
  ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
  "README.md",
  "docs/mcp/**",
  "docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md",
  "package.json",
  "package-lock.json",
  "packages/universal-ontology-mcp-server/**",
  "scripts/build/createOntologyQueryArtifacts.js",
  "scripts/build/ontologyAssets.js",
  "scripts/distribution/**",
  "scripts/generateOntologyQueryIndexes.js",
  "scripts/runUniversalOntologyMcpStdioServer.js",
  "scripts/stageOntologyQueryArtifactChannel.js",
  "server.json",
  "src/mcp/**",
  "src/ontology.js",
  "src/ontologyQuery/**",
  "tests/distribution/**",
  "tests/mcp/**",
  "tests/ontology-query/**",
  "tests/webmcp/ontology-entity-definition-resolver.test.js",
]);
const EXPECTED_WORKFLOW_JOB_PERMISSIONS = Object.freeze({
  validate: { contents: "read" },
  archive: { contents: "read" },
  container: { contents: "read" },
  assemble: { contents: "read" },
});
const EXPECTED_WORKFLOW_JOB_DEPENDENCIES = Object.freeze({
  validate: [],
  archive: ["validate"],
  container: ["validate"],
  assemble: ["archive", "container", "validate"],
});
const ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES = Object.freeze([
  "actions/checkout",
  "actions/download-artifact",
  "actions/setup-node",
  "actions/upload-artifact",
]);
const EXPECTED_ARTIFACT_UPLOAD_INPUTS_BY_JOB_NAME = Object.freeze({
  archive: Object.freeze({
    name: "universal-ontology-mcp-server-${{ matrix.targetName }}",
    path: "dist/releases/universal-ontology-mcp-server-v${{ needs.validate.outputs.software-version }}-${{ matrix.targetName }}.${{ matrix.releaseArchiveFormat }}",
    "if-no-files-found": "error",
    "retention-days": 3,
  }),
  assemble: Object.freeze({
    name: "universal-ontology-mcp-server-development-candidate-${{ steps.candidate-identity.outputs.candidate-sha256 }}",
    path: "dist/releases/*",
    "if-no-files-found": "error",
    "retention-days": 3,
  }),
});
// This is the SHA-256 digest of the canonical JSON representation of the
// parsed workflow. Object-key order and YAML comments are intentionally
// excluded, while array order and every semantic value remain covered. The
// workflow is executable supply-chain policy: update this digest only after a
// deliberate review of every trigger, capability, job, action, and run script.
const EXPECTED_DISTRIBUTION_WORKFLOW_POLICY_MANIFEST_SHA256 =
  "216e4ea49904cfb54cea0955f2aba4f90fa6122fb1c42ebdca0fdf8f909aa37c";

const FORBIDDEN_ARCHIVE_CONTENT_MARKERS = Object.freeze([
  "A natural or legal person recognised by law.",
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN EC PRIVATE KEY-----",
  "-----BEGIN OPENSSH PRIVATE KEY-----",
]);
const FORBIDDEN_SECRET_PATTERNS = Object.freeze([
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9]{32,}/u,
  /npm_[A-Za-z0-9]{32,}/u,
]);

function compareBinaryText(leftText, rightText) {
  return Buffer.compare(Buffer.from(leftText), Buffer.from(rightText));
}

function assertOwnedPath(filePath, ownedDirectoryPath) {
  const relativePath = relative(resolve(ownedDirectoryPath), resolve(filePath));
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error("Release verification escaped the release directory.");
  }
}

function assertSafeBasename(fileName) {
  if (
    fileName === "" ||
    fileName === "." ||
    fileName === ".." ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0")
  ) {
    throw new Error(`Unsafe release asset name: ${fileName}`);
  }
}

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function calculateRegularFileIntegrity(
  filePath,
  maximumByteSize = MAXIMUM_RELEASE_ASSET_BYTE_SIZE,
) {
  const fileStats = await nodeFileSystem.lstat(filePath);
  if (!fileStats.isFile() || fileStats.size > maximumByteSize) {
    throw new Error(`Release asset is not a bounded regular file: ${filePath}`);
  }

  const digest = createHash("sha256");
  let byteLength = 0;
  for await (const chunk of createReadStream(filePath)) {
    byteLength += chunk.byteLength;
    if (byteLength > maximumByteSize) {
      throw new Error(`Release asset exceeds its byte ceiling: ${filePath}`);
    }
    digest.update(chunk);
  }
  return Object.freeze({
    byteLength,
    sha256: digest.digest("hex"),
  });
}

async function readBoundedRegularFile(
  filePath,
  maximumByteSize = MAXIMUM_METADATA_BYTE_SIZE,
) {
  const integrity = await calculateRegularFileIntegrity(
    filePath,
    maximumByteSize,
  );
  const bytes = await nodeFileSystem.readFile(filePath);
  if (bytes.byteLength !== integrity.byteLength) {
    throw new Error(`Release asset changed while being verified: ${filePath}`);
  }
  return bytes;
}

async function readJsonDocument(filePath) {
  try {
    return JSON.parse(
      (await readBoundedRegularFile(filePath)).toString("utf8"),
    );
  } catch (error) {
    throw new Error(`Invalid JSON release metadata: ${filePath}`, {
      cause: error,
    });
  }
}

function parseReleaseTag(tag) {
  if (typeof tag !== "string") {
    throw new Error("An exact Universal Ontology MCP release tag is required.");
  }
  const match = RELEASE_TAG_PATTERN.exec(tag);
  if (!match) {
    throw new Error(`Invalid Universal Ontology MCP release tag: ${tag}`);
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function normalizeWorkflowJobDependencies(needs) {
  if (needs === undefined) {
    return [];
  }
  return (Array.isArray(needs) ? needs : [needs]).sort(compareBinaryText);
}

function requireExactJsonValue(actualValue, expectedValue, semanticName) {
  if (
    serializeCanonicalJsonValue(actualValue) !==
    serializeCanonicalJsonValue(expectedValue)
  ) {
    throw new Error(`Distribution workflow has incorrect ${semanticName}.`);
  }
}

/**
 * Serialize JSON-compatible data with recursively sorted object keys.
 *
 * YAML mapping order and comments are not executable semantics, so the policy
 * digest deliberately ignores them. Sequence order remains significant because
 * GitHub Actions executes jobs' steps in order.
 */
function serializeCanonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(serializeCanonicalJsonValue).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const members = Object.keys(value)
      .sort(compareBinaryText)
      .map(
        (propertyName) =>
          `${JSON.stringify(propertyName)}:${serializeCanonicalJsonValue(value[propertyName])}`,
      );
    return `{${members.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Treat the development distribution workflow as executable supply-chain
 * policy. Validation is intentionally independent of GitHub's permissive YAML
 * acceptance so a broadened trigger, permission, dependency edge, action ref,
 * or publication command fails before a candidate can be retained remotely.
 */
export async function verifyUniversalOntologyMcpDistributionWorkflow({
  distributionWorkflowPath = DEFAULT_DISTRIBUTION_WORKFLOW_PATH,
  releaseInputs,
}) {
  let workflow;
  let workflowText;
  try {
    workflowText = (
      await readBoundedRegularFile(distributionWorkflowPath)
    ).toString("utf8");
    workflow = parseYaml(workflowText);
  } catch (error) {
    throw new Error("Distribution workflow YAML cannot be parsed.", {
      cause: error,
    });
  }
  if (!workflow || typeof workflow !== "object" || !workflow.jobs) {
    throw new Error("Distribution workflow omits its job graph.");
  }
  const workflowPolicyManifestSha256 = calculateSha256(
    Buffer.from(serializeCanonicalJsonValue(workflow), "utf8"),
  );
  if (
    workflowPolicyManifestSha256 !==
    EXPECTED_DISTRIBUTION_WORKFLOW_POLICY_MANIFEST_SHA256
  ) {
    throw new Error(
      "Distribution workflow publication-policy manifest does not match its reviewed semantic digest.",
    );
  }
  requireExactJsonValue(
    workflow.name,
    "Verify Universal Ontology MCP Distribution",
    "display name",
  );
  requireExactJsonValue(workflow.permissions, {}, "default permissions");
  requireExactJsonValue(
    workflow.on,
    {
      pull_request: {
        paths: EXPECTED_DISTRIBUTION_WORKFLOW_PATH_FILTERS,
      },
      push: {
        branches: ["**"],
        paths: EXPECTED_DISTRIBUTION_WORKFLOW_PATH_FILTERS,
      },
    },
    "branch and pull-request triggers",
  );
  requireExactJsonValue(
    workflow.concurrency,
    {
      group: "universal-ontology-mcp-distribution-${{ github.ref }}",
      "cancel-in-progress": true,
    },
    "concurrency policy",
  );

  const expectedJobNames = Object.keys(EXPECTED_WORKFLOW_JOB_PERMISSIONS);
  requireExactJsonValue(
    Object.keys(workflow.jobs).sort(compareBinaryText),
    [...expectedJobNames].sort(compareBinaryText),
    "four-job topology",
  );
  const allowedActionCommits = new Map(
    releaseInputs.githubActions.map(({ actionName, commitSha }) => [
      actionName,
      commitSha,
    ]),
  );
  const encounteredActionNames = new Set();
  const exactNpmBootstrap = `npm install --global --no-audit --no-fund npm@${releaseInputs.selectedNpmVersion}\ntest "$(npm --version)" = "${releaseInputs.selectedNpmVersion}"\n`;
  const artifactUploadStepCountsByJobName = {
    archive: 0,
    assemble: 0,
  };

  for (const jobName of expectedJobNames) {
    const job = workflow.jobs[jobName];
    requireExactJsonValue(
      job.permissions,
      EXPECTED_WORKFLOW_JOB_PERMISSIONS[jobName],
      `${jobName} permissions`,
    );
    requireExactJsonValue(
      normalizeWorkflowJobDependencies(job.needs),
      EXPECTED_WORKFLOW_JOB_DEPENDENCIES[jobName],
      `${jobName} dependency order`,
    );
    if (job.environment !== undefined) {
      throw new Error(
        `Distribution workflow job ${jobName} uses a protected publication environment.`,
      );
    }
    if (!Array.isArray(job.steps)) {
      throw new Error(`Distribution workflow job ${jobName} omits its steps.`);
    }

    const setupNodeIndex = job.steps.findIndex(({ uses }) =>
      uses?.startsWith("actions/setup-node@"),
    );
    const npmBootstrapIndex = job.steps.findIndex(
      ({ name }) => name === "Select exact npm CLI",
    );
    if (
      setupNodeIndex < 0 ||
      serializeCanonicalJsonValue(job.steps[setupNodeIndex].with) !==
        serializeCanonicalJsonValue({
          "node-version": releaseInputs.nodeRuntime.version,
        }) ||
      npmBootstrapIndex <= setupNodeIndex ||
      job.steps[npmBootstrapIndex].run !== exactNpmBootstrap
    ) {
      throw new Error(
        `Distribution workflow job ${jobName} does not select exact Node and npm versions first.`,
      );
    }

    for (let stepIndex = 0; stepIndex < job.steps.length; stepIndex += 1) {
      const step = job.steps[stepIndex];
      if (
        stepIndex !== npmBootstrapIndex &&
        typeof step.run === "string" &&
        /(^|\s)npm(?:\s|$)/mu.test(step.run) &&
        stepIndex < npmBootstrapIndex
      ) {
        throw new Error(
          `Distribution workflow job ${jobName} invokes npm before its exact bootstrap.`,
        );
      }
      if (!step.uses) {
        continue;
      }
      const actionReferenceMatch = /^([^@]+)@([a-f0-9]{40})$/u.exec(step.uses);
      if (
        !actionReferenceMatch ||
        allowedActionCommits.get(actionReferenceMatch[1]) !==
          actionReferenceMatch[2] ||
        !ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES.includes(
          actionReferenceMatch[1],
        )
      ) {
        throw new Error(
          `Distribution workflow action ref leaves the active full-SHA allowlist: ${step.uses}`,
        );
      }
      encounteredActionNames.add(actionReferenceMatch[1]);
      if (
        actionReferenceMatch[1] === "actions/checkout" &&
        step.with?.["persist-credentials"] !== false
      ) {
        throw new Error(
          `Distribution workflow job ${jobName} retains checkout credentials.`,
        );
      }
      if (actionReferenceMatch[1] === "actions/upload-artifact") {
        const expectedUploadInputs =
          EXPECTED_ARTIFACT_UPLOAD_INPUTS_BY_JOB_NAME[jobName];
        if (!expectedUploadInputs) {
          throw new Error(
            `Distribution workflow job ${jobName} performs an unexpected artifact upload.`,
          );
        }
        artifactUploadStepCountsByJobName[jobName] += 1;
        requireExactJsonValue(
          step.with,
          expectedUploadInputs,
          `${jobName} artifact upload inputs`,
        );
      }
    }
  }
  requireExactJsonValue(
    [...encounteredActionNames].sort(compareBinaryText),
    [...ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES].sort(compareBinaryText),
    "active action allowlist coverage",
  );
  requireExactJsonValue(
    artifactUploadStepCountsByJobName,
    { archive: 1, assemble: 1 },
    "artifact upload job allocation",
  );

  const concatenateRunScripts = (job) =>
    job.steps
      .filter(({ run }) => typeof run === "string")
      .map(({ run }) => run)
      .join("\n");
  const validateScripts = concatenateRunScripts(workflow.jobs.validate);
  const archiveScripts = concatenateRunScripts(workflow.jobs.archive);
  const containerScripts = concatenateRunScripts(workflow.jobs.container);
  const assembleScripts = concatenateRunScripts(workflow.jobs.assemble);
  if (
    validateScripts.includes(
      "smokeTestUniversalOntologyMcpPublicArtifactOrigin.js",
    ) ||
    !archiveScripts.includes("mcp:archives:build") ||
    !containerScripts.includes(
      "docker build --tag universal-ontology-mcp-server:development",
    ) ||
    !containerScripts.includes("--network=none") ||
    !containerScripts.includes("--read-only") ||
    !containerScripts.includes("--cap-drop=ALL") ||
    !containerScripts.includes("no-new-privileges") ||
    !containerScripts.includes(
      'import { Client } from "@modelcontextprotocol/client"',
    ) ||
    !containerScripts.includes(
      'import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"',
    ) ||
    !containerScripts.includes("await client.connect(transport)") ||
    !containerScripts.includes("await client.listTools()") ||
    !containerScripts.includes("client.getServerVersion()") ||
    !containerScripts.includes("mcp-container-smoke") ||
    !containerScripts.includes("UNSAFE_CACHE_DIRECTORY") ||
    /(?:--publish|-p\s+\d)/u.test(containerScripts) ||
    !assembleScripts.includes("mcp:release:verify")
  ) {
    throw new Error(
      "Distribution workflow does not implement the exact local-only candidate checks.",
    );
  }
  return Object.freeze({ verifiedJobCount: expectedJobNames.length });
}

function createExpectedReleaseFileNames(
  publicPackage,
  releaseInputs,
  softwareVersion,
) {
  const releaseBaseName = `${publicPackage.name}-v${softwareVersion}`;
  return Object.freeze({
    releaseBaseName,
    npmTarballFileName: `${publicPackage.name}-${softwareVersion}.tgz`,
    platformArchiveFileNames: releaseInputs.nodeRuntime.targets.map(
      ({ targetName, releaseArchiveFormat }) =>
        `${releaseBaseName}-${targetName}.${releaseArchiveFormat === "zip" ? "zip" : "tar.gz"}`,
    ),
    packageSbomFileName: `${releaseBaseName}-npm.spdx.json`,
    releaseSbomFileName: `${releaseBaseName}-release.spdx.json`,
    ociMetadataFileName: `${releaseBaseName}-oci-metadata.json`,
    developmentCandidateNotesFileName: `${releaseBaseName}-development-candidate-notes.md`,
    registryDocumentFileName: "server.json",
    checksumsFileName: "SHA256SUMS",
  });
}

function flattenExpectedReleaseFileNames(expectedNames) {
  return [
    expectedNames.npmTarballFileName,
    ...expectedNames.platformArchiveFileNames,
    expectedNames.packageSbomFileName,
    expectedNames.releaseSbomFileName,
    expectedNames.ociMetadataFileName,
    expectedNames.developmentCandidateNotesFileName,
    expectedNames.registryDocumentFileName,
    expectedNames.checksumsFileName,
  ].sort(compareBinaryText);
}

async function requireExactReleaseDirectoryManifest(
  releaseDirectoryPath,
  expectedFileNames,
) {
  const releaseDirectoryStats =
    await nodeFileSystem.lstat(releaseDirectoryPath);
  if (!releaseDirectoryStats.isDirectory()) {
    throw new Error("Release candidate path is not a real directory.");
  }
  const entries = await nodeFileSystem.readdir(releaseDirectoryPath, {
    withFileTypes: true,
  });
  const actualFileNames = [];
  for (const entry of entries) {
    assertSafeBasename(entry.name);
    if (!entry.isFile()) {
      throw new Error(`Unexpected non-file release entry: ${entry.name}`);
    }
    actualFileNames.push(entry.name);
  }
  actualFileNames.sort(compareBinaryText);

  if (JSON.stringify(actualFileNames) !== JSON.stringify(expectedFileNames)) {
    const expectedSet = new Set(expectedFileNames);
    const actualSet = new Set(actualFileNames);
    const missing = expectedFileNames.filter(
      (fileName) => !actualSet.has(fileName),
    );
    const unexpected = actualFileNames.filter(
      (fileName) => !expectedSet.has(fileName),
    );
    throw new Error(
      `Release asset manifest mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}

function requireVersionAuthorities({
  tagVersion,
  rootPackage,
  publicPackage,
  repositoryServerDocument,
  releaseServerDocument,
  releaseInputs,
}) {
  const versions = [
    tagVersion,
    rootPackage.version,
    publicPackage.version,
    repositoryServerDocument.version,
    releaseServerDocument.version,
    ...repositoryServerDocument.packages
      .map(({ version }) => version)
      .filter((version) => version !== undefined),
    ...releaseServerDocument.packages
      .map(({ version }) => version)
      .filter((version) => version !== undefined),
  ];
  if (versions.some((version) => version !== tagVersion)) {
    throw new Error(
      "Release tag, package, Registry, and release asset versions disagree.",
    );
  }
  if (
    publicPackage.name !== "universal-ontology-mcp-server" ||
    publicPackage.mcpName !== repositoryServerDocument.name ||
    releaseServerDocument.name !== repositoryServerDocument.name ||
    rootPackage.packageManager !== `npm@${releaseInputs.selectedNpmVersion}` ||
    !repositoryServerDocument.packages.some(
      ({ registryType, identifier }) =>
        registryType === "oci" && identifier.endsWith(`:${tagVersion}`),
    )
  ) {
    throw new Error(
      "Release package and Registry ownership authorities disagree.",
    );
  }
  if (
    JSON.stringify(releaseServerDocument) !==
    JSON.stringify(repositoryServerDocument)
  ) {
    throw new Error(
      "Release Registry document differs from repository metadata.",
    );
  }
}

function requireOciMetadata({
  ociMetadata,
  repositoryServerDocument,
  releaseInputs,
}) {
  const ociPackage = repositoryServerDocument.packages.find(
    ({ registryType }) => registryType === "oci",
  );
  const expectedMetadata = {
    ociImageMetadataFormatVersion: 1,
    imageReference: ociPackage?.identifier,
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
      "io.modelcontextprotocol.server.name": repositoryServerDocument.name,
    },
  };
  if (JSON.stringify(ociMetadata) !== JSON.stringify(expectedMetadata)) {
    throw new Error(
      "OCI release metadata does not match the exact image contract.",
    );
  }
}

function parseChecksumManifest(checksumManifestText, expectedFileNames) {
  if (
    checksumManifestText.includes("\r") ||
    !checksumManifestText.endsWith("\n")
  ) {
    throw new Error("SHA256SUMS must use canonical LF-terminated lines.");
  }
  const checksumRecords = checksumManifestText
    .slice(0, -1)
    .split("\n")
    .map((line) => {
      const match = /^([a-f0-9]{64}) {2}([^/\\\0]+)$/u.exec(line);
      if (!match) {
        throw new Error("SHA256SUMS contains a malformed checksum line.");
      }
      assertSafeBasename(match[2]);
      return Object.freeze({ sha256: match[1], fileName: match[2] });
    });
  const actualFileNames = checksumRecords.map(({ fileName }) => fileName);
  const sortedFileNames = [...actualFileNames].sort(compareBinaryText);
  if (
    new Set(actualFileNames).size !== actualFileNames.length ||
    JSON.stringify(actualFileNames) !== JSON.stringify(sortedFileNames) ||
    JSON.stringify(actualFileNames) !== JSON.stringify(expectedFileNames)
  ) {
    throw new Error(
      "SHA256SUMS must cover every non-manifest release asset exactly once in binary filename order.",
    );
  }
  return checksumRecords;
}

async function verifyChecksumManifest({
  releaseDirectoryPath,
  checksumsFileName,
  expectedChecksummedFileNames,
}) {
  const manifestPath = join(releaseDirectoryPath, checksumsFileName);
  const records = parseChecksumManifest(
    (await readBoundedRegularFile(manifestPath)).toString("utf8"),
    expectedChecksummedFileNames,
  );
  const integrityByFileName = new Map();
  for (const record of records) {
    const filePath = join(releaseDirectoryPath, record.fileName);
    assertOwnedPath(filePath, releaseDirectoryPath);
    const integrity = await calculateRegularFileIntegrity(filePath);
    if (integrity.sha256 !== record.sha256) {
      throw new Error(
        `SHA-256 checksum mismatch for release asset ${record.fileName}.`,
      );
    }
    integrityByFileName.set(record.fileName, integrity);
  }
  return integrityByFileName;
}

function inspectTextForForbiddenReleaseContent(text, semanticLocation) {
  for (const marker of FORBIDDEN_ARCHIVE_CONTENT_MARKERS) {
    if (text.includes(marker)) {
      throw new Error(
        `Release candidate contains ontology data or secret material in ${semanticLocation}.`,
      );
    }
  }
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(
        `Release candidate contains ontology data or secret material in ${semanticLocation}.`,
      );
    }
  }
}

function inspectArchivePath(entryPath) {
  const lowercasePath = entryPath.toLocaleLowerCase("en-US");
  if (
    lowercasePath.endsWith(".owl") ||
    lowercasePath.endsWith(".jsonld") ||
    lowercasePath.includes("/query/v1/") ||
    lowercasePath.includes("/ontology-query/") ||
    lowercasePath.includes("/fixtures/")
  ) {
    throw new Error(
      `Release archive contains ontology data path ${entryPath}.`,
    );
  }
}

function validateArchiveEntryPath(entryPath, exactPaths, caseFoldedPaths) {
  const normalizedPath = entryPath.endsWith("/")
    ? entryPath.slice(0, -1)
    : entryPath;
  const pathSegments = normalizedPath.split("/");
  if (
    normalizedPath === "" ||
    entryPath.includes("\\") ||
    entryPath.includes("\0") ||
    entryPath.startsWith("/") ||
    /^[A-Za-z]:/u.test(entryPath) ||
    pathSegments.some(
      (pathSegment) =>
        pathSegment === "" || pathSegment === "." || pathSegment === "..",
    )
  ) {
    throw new Error(`Release archive contains an unsafe path: ${entryPath}`);
  }
  if (exactPaths.has(normalizedPath)) {
    throw new Error(
      `Release archive contains duplicate path ${normalizedPath}.`,
    );
  }
  const caseFoldedPath = normalizedPath
    .normalize("NFC")
    .toLocaleLowerCase("en-US");
  if (caseFoldedPaths.has(caseFoldedPath)) {
    throw new Error(
      `Release archive contains a case-folded path collision at ${normalizedPath}.`,
    );
  }
  exactPaths.add(normalizedPath);
  caseFoldedPaths.add(caseFoldedPath);
  inspectArchivePath(normalizedPath);
  return normalizedPath;
}

function inspectBoundedArchiveEntryStream({
  readableStream,
  maximumByteSize,
  collectBytes,
  inspectTextContent = true,
  semanticLocation,
}) {
  return new Promise((resolveEntry, rejectEntry) => {
    const chunks = collectBytes ? [] : undefined;
    let byteLength = 0;
    let scanTail = "";
    let inspectionError;

    readableStream.on("data", (chunk) => {
      // Once an entry is invalid, keep draining it so a tar parser cannot
      // deadlock, but preserve only the first actionable semantic failure.
      if (inspectionError) {
        return;
      }
      try {
        const chunkBytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        byteLength += chunkBytes.byteLength;
        if (byteLength > maximumByteSize) {
          throw new Error(
            `Archive entry exceeds its byte ceiling: ${semanticLocation}`,
          );
        }
        if (inspectTextContent) {
          const scanText = `${scanTail}${chunkBytes.toString("utf8")}`;
          inspectTextForForbiddenReleaseContent(scanText, semanticLocation);
          scanTail = scanText.slice(-STREAM_SCAN_TAIL_CHARACTER_COUNT);
        }
        chunks?.push(chunkBytes);
      } catch (error) {
        inspectionError = error;
      }
    });
    readableStream.once("error", rejectEntry);
    readableStream.once("end", () => {
      if (inspectionError) {
        rejectEntry(inspectionError);
      } else {
        resolveEntry(
          Object.freeze({
            byteLength,
            bytes: collectBytes ? Buffer.concat(chunks, byteLength) : undefined,
          }),
        );
      }
    });
    readableStream.resume();
  });
}

function createArchiveEntrySpecificationMap(specifications) {
  return new Map(
    specifications.map((specification) => [
      specification.path,
      Object.freeze(specification),
    ]),
  );
}

function requireExactArchiveManifest(actualEntryPaths, specificationMap) {
  const sortedActualPaths = [...actualEntryPaths].sort(compareBinaryText);
  const sortedExpectedPaths = [...specificationMap.keys()].sort(
    compareBinaryText,
  );
  if (
    JSON.stringify(sortedActualPaths) !== JSON.stringify(sortedExpectedPaths)
  ) {
    throw new Error(
      "Release archive content manifest differs from its target allowlist.",
    );
  }
}

async function readTarArchiveEntries(archivePath, specificationMap) {
  const exactPaths = new Set();
  const caseFoldedPaths = new Set();
  const entries = new Map();
  const readPromises = [];
  let archiveStructureError;

  await tar.list({
    file: archivePath,
    strict: true,
    // The verifier consumes each entry itself so it can enforce byte ceilings
    // and inspect content before tar advances to the next header.
    noResume: true,
    onReadEntry(entry) {
      let entryPath;
      try {
        entryPath = validateArchiveEntryPath(
          entry.path,
          exactPaths,
          caseFoldedPaths,
        );
        if (entry.type !== "File" || entry.linkpath) {
          throw new Error(
            `Release archive entry is not a regular file: ${entryPath}`,
          );
        }
        const specification = specificationMap.get(entryPath);
        if (!specification) {
          throw new Error(`Unexpected release archive entry: ${entryPath}`);
        }
        if (entry.size > specification.maximumByteSize) {
          throw new Error(
            `Archive entry exceeds its byte ceiling: ${entryPath}`,
          );
        }
        const readPromise = inspectBoundedArchiveEntryStream({
          readableStream: entry,
          maximumByteSize: specification.maximumByteSize,
          collectBytes: specification.collectBytes,
          inspectTextContent: specification.inspectTextContent,
          semanticLocation: entryPath,
        }).then((entryRecord) => entries.set(entryPath, entryRecord));
        // Attach a handler immediately so an early stream failure cannot become
        // an unhandled rejection while tar finishes advancing its parser.
        void readPromise.catch(() => {});
        readPromises.push(readPromise);
      } catch (error) {
        archiveStructureError ??= error;
        entry.resume();
      }
    },
  });
  await Promise.all(readPromises);
  if (archiveStructureError) {
    throw archiveStructureError;
  }
  requireExactArchiveManifest(entries.keys(), specificationMap);
  return entries;
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

async function readZipArchiveEntries(archivePath, specificationMap) {
  const exactPaths = new Set();
  const caseFoldedPaths = new Set();
  const entries = new Map();
  const zipFile = await openZipArchive(archivePath);

  try {
    for await (const entry of zipFile.eachEntry()) {
      const entryPath = validateArchiveEntryPath(
        entry.fileName,
        exactPaths,
        caseFoldedPaths,
      );
      const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
      const unixFileType = unixMode & 0o170000;
      if (
        entry.fileName.endsWith("/") ||
        (entry.generalPurposeBitFlag & 0x1) !== 0 ||
        (unixFileType !== 0 && unixFileType !== 0o100000)
      ) {
        throw new Error(
          `Release archive entry is not an unencrypted regular file: ${entryPath}`,
        );
      }
      const specification = specificationMap.get(entryPath);
      if (!specification) {
        throw new Error(`Unexpected release archive entry: ${entryPath}`);
      }
      if (entry.uncompressedSize > specification.maximumByteSize) {
        throw new Error(`Archive entry exceeds its byte ceiling: ${entryPath}`);
      }
      const readStream = await openZipEntryReadStream(zipFile, entry);
      entries.set(
        entryPath,
        await inspectBoundedArchiveEntryStream({
          readableStream: readStream,
          maximumByteSize: specification.maximumByteSize,
          collectBytes: specification.collectBytes,
          inspectTextContent: specification.inspectTextContent,
          semanticLocation: entryPath,
        }),
      );
    }
  } finally {
    zipFile.close();
  }
  requireExactArchiveManifest(entries.keys(), specificationMap);
  return entries;
}

function requireApplicationBundleIdentity(
  applicationEntryRecord,
  applicationBundleMetadata,
  semanticLocation,
) {
  if (
    !applicationEntryRecord?.bytes ||
    calculateSha256(applicationEntryRecord.bytes) !==
      applicationBundleMetadata.bundleSha256
  ) {
    throw new Error(
      `Packaged application bundle identity disagrees in ${semanticLocation}.`,
    );
  }
}

function createNpmArchiveSpecifications(publicPackage, releaseInputs) {
  return createArchiveEntrySpecificationMap([
    {
      path: "package/LICENSE",
      maximumByteSize: 1_048_576,
      collectBytes: true,
      inspectTextContent: true,
    },
    {
      path: "package/README.md",
      maximumByteSize: 1_048_576,
      collectBytes: true,
      inspectTextContent: true,
    },
    {
      path: "package/THIRD_PARTY_NOTICES.md",
      maximumByteSize: 4_194_304,
      collectBytes: true,
      inspectTextContent: true,
    },
    {
      path: `package/${publicPackage.bin[publicPackage.name]}`,
      maximumByteSize: releaseInputs.applicationBundle.maximumByteSize,
      collectBytes: true,
      inspectTextContent: true,
    },
    {
      path: "package/package.json",
      maximumByteSize: 1_048_576,
      collectBytes: true,
      inspectTextContent: true,
    },
  ]);
}

async function verifyNpmTarball({
  tarballPath,
  publicPackage,
  releaseInputs,
  applicationBundleMetadata,
}) {
  const specificationMap = createNpmArchiveSpecifications(
    publicPackage,
    releaseInputs,
  );
  const entries = await readTarArchiveEntries(tarballPath, specificationMap);
  const packageDocument = JSON.parse(
    entries.get("package/package.json").bytes.toString("utf8"),
  );
  if (
    packageDocument.name !== publicPackage.name ||
    packageDocument.version !== publicPackage.version ||
    packageDocument.mcpName !== publicPackage.mcpName ||
    packageDocument.bin?.[publicPackage.name] !==
      releaseInputs.applicationBundle.sourceRelativePath
        .split("/")
        .slice(-2)
        .join("/")
  ) {
    throw new Error(
      "npm tarball package identity or executable mapping disagrees.",
    );
  }
  const applicationPath = `package/${publicPackage.bin[publicPackage.name]}`;
  requireApplicationBundleIdentity(
    entries.get(applicationPath),
    applicationBundleMetadata,
    tarballPath,
  );
}

function createPlatformArchiveSpecifications({
  target,
  archiveRootName,
  releaseInputs,
}) {
  const staticSpecifications = releaseInputs.packagedStaticFiles.map(
    ({ packagedRelativePath, maximumByteSize }) => ({
      path: `${archiveRootName}/${packagedRelativePath}`,
      maximumByteSize:
        packagedRelativePath === "THIRD_PARTY_NOTICES.md"
          ? maximumByteSize + releaseInputs.nodeRuntime.licenseMaximumByteSize
          : maximumByteSize,
      collectBytes: true,
      inspectTextContent: true,
    }),
  );
  return createArchiveEntrySpecificationMap([
    ...staticSpecifications,
    {
      path: `${archiveRootName}/${releaseInputs.applicationBundle.packagedRelativePath}`,
      maximumByteSize: releaseInputs.applicationBundle.maximumByteSize,
      collectBytes: true,
      inspectTextContent: true,
    },
    {
      path: `${archiveRootName}/${target.packagedRuntimeExecutablePath}`,
      maximumByteSize:
        releaseInputs.nodeRuntime.runtimeExecutableMaximumByteSize,
      collectBytes: false,
      // This is an opaque, checksum-pinned third-party executable. Decoding
      // machine-code bytes as UTF-8 can create token-shaped false positives;
      // all text-bearing application and metadata surfaces remain scanned.
      inspectTextContent: false,
    },
  ]);
}

async function verifyPlatformArchives({
  releaseDirectoryPath,
  publicPackage,
  releaseInputs,
  applicationBundleMetadata,
}) {
  for (const target of releaseInputs.nodeRuntime.targets) {
    const archiveRootName = `${publicPackage.name}-v${publicPackage.version}-${target.targetName}`;
    const archiveFileName = `${archiveRootName}.${target.releaseArchiveFormat === "zip" ? "zip" : "tar.gz"}`;
    const archivePath = join(releaseDirectoryPath, archiveFileName);
    const specificationMap = createPlatformArchiveSpecifications({
      target,
      archiveRootName,
      releaseInputs,
    });
    const entries =
      target.releaseArchiveFormat === "zip"
        ? await readZipArchiveEntries(archivePath, specificationMap)
        : await readTarArchiveEntries(archivePath, specificationMap);
    const applicationPath = `${archiveRootName}/${releaseInputs.applicationBundle.packagedRelativePath}`;
    requireApplicationBundleIdentity(
      entries.get(applicationPath),
      applicationBundleMetadata,
      archiveFileName,
    );
  }
}

function createExpectedSbomPackageIdentity(name, version) {
  return `${name}\0${version ?? ""}`;
}

function validateSpdxDocument(spdxDocument, semanticName, softwareVersion) {
  if (
    spdxDocument.spdxVersion !== "SPDX-2.3" ||
    spdxDocument.dataLicense !== "CC0-1.0" ||
    spdxDocument.SPDXID !== SPDX_DOCUMENT_ID ||
    typeof spdxDocument.documentNamespace !== "string" ||
    !spdxDocument.documentNamespace.includes(`/${softwareVersion}/`) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-/iu.test(
      spdxDocument.documentNamespace,
    ) ||
    !Array.isArray(spdxDocument.packages) ||
    !Array.isArray(spdxDocument.relationships)
  ) {
    throw new Error(
      `${semanticName} is not a deterministic SPDX 2.3 document.`,
    );
  }
  const spdxIds = spdxDocument.packages.map(({ SPDXID }) => SPDXID);
  if (
    spdxIds.some(
      (spdxId) => typeof spdxId !== "string" || !spdxId.startsWith("SPDXRef-"),
    ) ||
    new Set(spdxIds).size !== spdxIds.length
  ) {
    throw new Error(`${semanticName} contains invalid or duplicate SPDX IDs.`);
  }
}

function requireExactSpdxPackageCoverage({
  spdxDocument,
  semanticName,
  expectedPackages,
}) {
  const expectedIdentities = expectedPackages
    .map(({ name, version }) =>
      createExpectedSbomPackageIdentity(name, version),
    )
    .sort(compareBinaryText);
  const actualIdentities = spdxDocument.packages
    .map(({ name, versionInfo }) =>
      createExpectedSbomPackageIdentity(name, versionInfo),
    )
    .sort(compareBinaryText);
  if (JSON.stringify(actualIdentities) !== JSON.stringify(expectedIdentities)) {
    throw new Error(
      `${semanticName} has insufficient or unexpected SBOM coverage.`,
    );
  }

  for (const expectedPackage of expectedPackages) {
    const actualPackage = spdxDocument.packages.find(
      ({ name, versionInfo }) =>
        name === expectedPackage.name &&
        (versionInfo ?? undefined) === expectedPackage.version,
    );
    if (!actualPackage) {
      throw new Error(`${semanticName} omits an expected SBOM package.`);
    }
    if (
      expectedPackage.license !== undefined &&
      (actualPackage.licenseDeclared !== expectedPackage.license ||
        actualPackage.licenseConcluded !== expectedPackage.license)
    ) {
      throw new Error(`${semanticName} has incorrect SBOM license metadata.`);
    }
    if (
      expectedPackage.sha256 !== undefined &&
      !actualPackage.checksums?.some(
        ({ algorithm, checksumValue }) =>
          algorithm === "SHA256" && checksumValue === expectedPackage.sha256,
      )
    ) {
      throw new Error(`${semanticName} has incorrect SBOM artifact identity.`);
    }
  }
}

function requireSpdxRelationshipCoverage(spdxDocument, semanticName) {
  const relationshipTypes = new Set(
    spdxDocument.relationships.map(({ relationshipType }) => relationshipType),
  );
  const requiredRelationshipTypes = [
    "CONTAINS",
    "DEPENDS_ON",
    "DESCRIBES",
    "GENERATED_FROM",
  ];
  if (
    requiredRelationshipTypes.some(
      (relationshipType) => !relationshipTypes.has(relationshipType),
    )
  ) {
    throw new Error(`${semanticName} has insufficient SPDX relationships.`);
  }
}

function verifySpdxDocuments({
  packageSbom,
  releaseSbom,
  publicPackage,
  releaseInputs,
  applicationBundleMetadata,
  expectedNames,
  integrityByFileName,
}) {
  validateSpdxDocument(packageSbom, "npm package SBOM", publicPackage.version);
  validateSpdxDocument(releaseSbom, "release SBOM", publicPackage.version);

  const componentPackages = applicationBundleMetadata.bundledComponents.map(
    ({ name, version, license }) => ({ name, version, license }),
  );
  const applicationPackage = {
    name: publicPackage.name,
    version: publicPackage.version,
    license: "MIT",
    sha256: applicationBundleMetadata.bundleSha256,
  };
  const npmAssetPackage = {
    name: expectedNames.npmTarballFileName,
    sha256: integrityByFileName.get(expectedNames.npmTarballFileName).sha256,
    license: "NOASSERTION",
  };
  requireExactSpdxPackageCoverage({
    spdxDocument: packageSbom,
    semanticName: "npm package SBOM",
    expectedPackages: [
      applicationPackage,
      ...componentPackages,
      npmAssetPackage,
    ],
  });

  const releaseSubjectFileNames = [
    expectedNames.npmTarballFileName,
    ...expectedNames.platformArchiveFileNames,
    expectedNames.registryDocumentFileName,
    expectedNames.ociMetadataFileName,
    expectedNames.developmentCandidateNotesFileName,
  ];
  const releaseAssetPackages = releaseSubjectFileNames.map((fileName) => ({
    name: fileName,
    license: "NOASSERTION",
    sha256: integrityByFileName.get(fileName).sha256,
  }));
  requireExactSpdxPackageCoverage({
    spdxDocument: releaseSbom,
    semanticName: "release SBOM",
    expectedPackages: [
      applicationPackage,
      ...componentPackages,
      {
        name: "node",
        version: releaseInputs.nodeRuntime.version,
        license: "MIT",
      },
      ...releaseAssetPackages,
    ],
  });
  requireSpdxRelationshipCoverage(packageSbom, "npm package SBOM");
  requireSpdxRelationshipCoverage(releaseSbom, "release SBOM");
}

function verifyIndependentNpmSbomCoverage({
  npmComparisonSbom,
  packageSbom,
  rootPackage,
}) {
  if (
    npmComparisonSbom.spdxVersion !== "SPDX-2.3" ||
    !Array.isArray(npmComparisonSbom.packages)
  ) {
    throw new Error("Independent npm SBOM is not a valid SPDX 2.3 report.");
  }
  const customPackageIdentities = new Set(
    packageSbom.packages.map(({ name, versionInfo }) =>
      createExpectedSbomPackageIdentity(name, versionInfo),
    ),
  );
  const ignoredPrivateWorkspaceIdentity = createExpectedSbomPackageIdentity(
    rootPackage.name,
    rootPackage.version,
  );
  const npmReportedIdentities = npmComparisonSbom.packages.map(
    ({ name, versionInfo }) =>
      createExpectedSbomPackageIdentity(name, versionInfo),
  );
  if (new Set(npmReportedIdentities).size !== npmReportedIdentities.length) {
    throw new Error(
      "Independent npm SBOM contains duplicate package identities.",
    );
  }
  for (const npmReportedIdentity of npmReportedIdentities) {
    // npm describes the private monorepo root as the application even though it
    // is not shipped. Every other npm-reported package must be represented by
    // the package-specific custom SBOM.
    if (
      npmReportedIdentity !== ignoredPrivateWorkspaceIdentity &&
      !customPackageIdentities.has(npmReportedIdentity)
    ) {
      throw new Error(
        "Custom package SBOM omits a runtime package reported by the independent npm SBOM.",
      );
    }
  }
}

function validateApplicationBundleMetadata(
  applicationBundleMetadata,
  publicPackage,
) {
  if (
    applicationBundleMetadata.applicationBundleMetadataFormatVersion !== 1 ||
    applicationBundleMetadata.packageName !== publicPackage.name ||
    applicationBundleMetadata.packageVersion !== publicPackage.version ||
    !SHA256_PATTERN.test(applicationBundleMetadata.bundleSha256) ||
    !Array.isArray(applicationBundleMetadata.bundledComponents) ||
    applicationBundleMetadata.bundledComponents.length === 0
  ) {
    throw new Error(
      "Application bundle metadata is incomplete or inconsistent.",
    );
  }
}

/**
 * Verify a complete local development candidate before it can be retained as
 * a short-lived Actions artifact. Every identity is derived from repository
 * authorities and exact bytes; candidate-owned metadata is corroborating
 * evidence, never its own trust root.
 */
export async function verifyUniversalOntologyMcpRelease({
  releaseDirectoryPath = DEFAULT_RELEASE_DIRECTORY_PATH,
  tag,
  applicationBundleMetadataPath = DEFAULT_APPLICATION_BUNDLE_METADATA_PATH,
  npmComparisonSbomPath,
  distributionWorkflowPath = DEFAULT_DISTRIBUTION_WORKFLOW_PATH,
} = {}) {
  const tagVersion = parseReleaseTag(tag);
  const [
    rootPackage,
    publicPackage,
    repositoryServerDocument,
    releaseInputs,
    applicationBundleMetadata,
  ] = await Promise.all([
    readJsonDocument(ROOT_PACKAGE_JSON_PATH),
    readJsonDocument(PUBLIC_PACKAGE_JSON_PATH),
    readJsonDocument(REPOSITORY_SERVER_DOCUMENT_PATH),
    readUniversalOntologyMcpReleaseInputs(),
    readJsonDocument(applicationBundleMetadataPath),
  ]);
  if (tagVersion !== publicPackage.version) {
    throw new Error("Release tag version differs from the software version.");
  }
  validateApplicationBundleMetadata(applicationBundleMetadata, publicPackage);
  await verifyUniversalOntologyMcpDistributionWorkflow({
    distributionWorkflowPath,
    releaseInputs,
  });

  const expectedNames = createExpectedReleaseFileNames(
    publicPackage,
    releaseInputs,
    tagVersion,
  );
  const expectedFileNames = flattenExpectedReleaseFileNames(expectedNames);
  await requireExactReleaseDirectoryManifest(
    releaseDirectoryPath,
    expectedFileNames,
  );

  const releaseServerDocument = await readJsonDocument(
    join(releaseDirectoryPath, expectedNames.registryDocumentFileName),
  );
  requireVersionAuthorities({
    tagVersion,
    rootPackage,
    publicPackage,
    repositoryServerDocument,
    releaseServerDocument,
    releaseInputs,
  });
  const ociMetadata = await readJsonDocument(
    join(releaseDirectoryPath, expectedNames.ociMetadataFileName),
  );
  requireOciMetadata({
    ociMetadata,
    repositoryServerDocument,
    releaseInputs,
  });

  const expectedChecksummedFileNames = expectedFileNames.filter(
    (fileName) => fileName !== expectedNames.checksumsFileName,
  );
  const integrityByFileName = await verifyChecksumManifest({
    releaseDirectoryPath,
    checksumsFileName: expectedNames.checksumsFileName,
    expectedChecksummedFileNames,
  });

  const developmentCandidateNotesText = (
    await readBoundedRegularFile(
      join(
        releaseDirectoryPath,
        expectedNames.developmentCandidateNotesFileName,
      ),
    )
  ).toString("utf8");
  if (
    !developmentCandidateNotesText.includes(`v${publicPackage.version}`) ||
    !developmentCandidateNotesText.includes("data-free local stdio server") ||
    !developmentCandidateNotesText.includes(
      "unpublished development candidate",
    ) ||
    !developmentCandidateNotesText.includes("not published to npm") ||
    !developmentCandidateNotesText.includes("no OCI image is published")
  ) {
    throw new Error(
      "Development candidate notes omit the exact candidate and publication boundaries.",
    );
  }
  inspectTextForForbiddenReleaseContent(
    developmentCandidateNotesText,
    expectedNames.developmentCandidateNotesFileName,
  );

  await verifyNpmTarball({
    tarballPath: join(releaseDirectoryPath, expectedNames.npmTarballFileName),
    publicPackage,
    releaseInputs,
    applicationBundleMetadata,
  });
  await verifyPlatformArchives({
    releaseDirectoryPath,
    publicPackage,
    releaseInputs,
    applicationBundleMetadata,
  });

  const [packageSbom, releaseSbom] = await Promise.all([
    readJsonDocument(
      join(releaseDirectoryPath, expectedNames.packageSbomFileName),
    ),
    readJsonDocument(
      join(releaseDirectoryPath, expectedNames.releaseSbomFileName),
    ),
  ]);
  verifySpdxDocuments({
    packageSbom,
    releaseSbom,
    publicPackage,
    releaseInputs,
    applicationBundleMetadata,
    expectedNames,
    integrityByFileName,
  });
  if (npmComparisonSbomPath !== undefined) {
    verifyIndependentNpmSbomCoverage({
      npmComparisonSbom: await readJsonDocument(npmComparisonSbomPath),
      packageSbom,
      rootPackage,
    });
  }

  return Object.freeze({
    tag,
    softwareVersion: publicPackage.version,
    verifiedAssetCount: expectedFileNames.length,
    verifiedChecksummedAssetCount: expectedChecksummedFileNames.length,
  });
}

function parseCommandLineArguments(arguments_) {
  let tag;
  let releaseDirectoryPath;
  let npmComparisonSbomPath;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const consumeValue = (optionName) => {
      if (index + 1 >= arguments_.length) {
        throw new Error(`${optionName} requires exactly one value.`);
      }
      index += 1;
      return arguments_[index];
    };
    if (argument.startsWith("--tag=")) {
      if (tag !== undefined) {
        throw new Error("--tag may be supplied only once.");
      }
      tag = argument.slice("--tag=".length);
    } else if (argument === "--tag") {
      if (tag !== undefined) {
        throw new Error("--tag may be supplied only once.");
      }
      tag = consumeValue("--tag");
    } else if (argument.startsWith("--release-directory=")) {
      if (releaseDirectoryPath !== undefined) {
        throw new Error("--release-directory may be supplied only once.");
      }
      releaseDirectoryPath = resolve(
        argument.slice("--release-directory=".length),
      );
    } else if (argument === "--release-directory") {
      if (releaseDirectoryPath !== undefined) {
        throw new Error("--release-directory may be supplied only once.");
      }
      releaseDirectoryPath = resolve(consumeValue("--release-directory"));
    } else if (argument.startsWith("--npm-comparison-sbom=")) {
      if (npmComparisonSbomPath !== undefined) {
        throw new Error("--npm-comparison-sbom may be supplied only once.");
      }
      npmComparisonSbomPath = resolve(
        argument.slice("--npm-comparison-sbom=".length),
      );
    } else if (argument === "--npm-comparison-sbom") {
      if (npmComparisonSbomPath !== undefined) {
        throw new Error("--npm-comparison-sbom may be supplied only once.");
      }
      npmComparisonSbomPath = resolve(consumeValue("--npm-comparison-sbom"));
    } else {
      throw new Error(`Unknown release verification option: ${argument}`);
    }
  }
  return { tag, releaseDirectoryPath, npmComparisonSbomPath };
}

const invokedScriptPath = process.argv[1]
  ? resolve(process.argv[1])
  : undefined;
if (invokedScriptPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyUniversalOntologyMcpRelease(
      parseCommandLineArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `Universal Ontology MCP release verification failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
