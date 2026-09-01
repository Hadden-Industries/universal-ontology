#!/usr/bin/env node

import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import process from "node:process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import {
  RESOLVE_ENTITY_TOOL_NAME,
  SEARCH_ENTITIES_TOOL_NAME,
  UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO,
} from "../src/mcp/universalOntologyMcpMetadata.js";

const REPOSITORY_ROOT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const PINNED_MCP_PROTOCOL_VERSION = "2026-07-28";
const MCP_OPERATION_TIMEOUT_MILLISECONDS = 30_000;
const MCP_STDIO_MAXIMUM_MESSAGE_BYTES = 10 * 1024 * 1024;
const CAPTURED_STANDARD_ERROR_MAXIMUM_BYTES = 65_536;
const SUPPORTED_ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAMES = new Set([
  "stable",
  "development",
]);
const SUPPORTED_ONTOLOGY_QUERY_ARTIFACT_SOURCE_KINDS = new Set([
  "file_system",
  "http",
]);
const EXPECTED_READINESS_ENTITY_IRI =
  "https://haddenindustries.com/ontology/universal/core/Person";
const EXPECTED_MCP_TOOL_NAMES = Object.freeze([
  SEARCH_ENTITIES_TOOL_NAME,
  RESOLVE_ENTITY_TOOL_NAME,
]);

function validateOntologyQueryArtifactChannelName(
  ontologyQueryArtifactChannelName,
) {
  if (
    !SUPPORTED_ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAMES.has(
      ontologyQueryArtifactChannelName,
    )
  ) {
    throw new TypeError(
      'ontologyQueryArtifactChannelName must be "stable" or "development".',
    );
  }
}

function validateOntologyQueryArtifactSourceKind(
  ontologyQueryArtifactSourceKind,
) {
  if (
    !SUPPORTED_ONTOLOGY_QUERY_ARTIFACT_SOURCE_KINDS.has(
      ontologyQueryArtifactSourceKind,
    )
  ) {
    throw new TypeError(
      'ontologyQueryArtifactSourceKind must be "file_system" or "http".',
    );
  }
}

function createReadinessSearchArguments() {
  return {
    queryText: "Person",
    preferredLanguageTags: ["en", "en-GB"],
    maximumResultCount: 10,
    ontologyReleaseSelection: {
      selectionKind: "latest_stable_releases",
      ontologyArtifactFamilyIds: ["universal/core"],
    },
  };
}

function assertOntologyQueryReadiness(result) {
  if (
    result?.isError === true ||
    result?.structuredContent?.outcome !== "success" ||
    !Array.isArray(result.structuredContent.matches)
  ) {
    throw new Error(
      "Universal Ontology MCP query-readiness verification failed.",
    );
  }

  const matchingEntity = result.structuredContent.matches
    .map(({ ontologyEntity }) => ontologyEntity)
    .find(({ entityIri }) => entityIri === EXPECTED_READINESS_ENTITY_IRI);

  if (!matchingEntity) {
    throw new Error(
      "Universal Ontology MCP query-readiness verification did not return the expected entity.",
    );
  }

  return Object.freeze({
    matchedEntityIri: matchingEntity.entityIri,
    outcome: "success",
  });
}

async function requireApplicationBundleFile(applicationBundlePath) {
  if (
    typeof applicationBundlePath !== "string" ||
    applicationBundlePath.length === 0
  ) {
    throw new TypeError(
      "applicationBundlePath must name an application bundle file.",
    );
  }

  const resolvedApplicationBundlePath = resolve(applicationBundlePath);
  let status;

  try {
    status = await nodeFileSystem.stat(resolvedApplicationBundlePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Universal Ontology MCP application bundle is not a file: ${resolvedApplicationBundlePath}`,
        { cause: error },
      );
    }

    throw error;
  }

  if (!status.isFile()) {
    throw new Error(
      `Universal Ontology MCP application bundle is not a file: ${resolvedApplicationBundlePath}`,
    );
  }

  return resolvedApplicationBundlePath;
}

function createBoundedStandardErrorCapture(standardErrorStream) {
  let standardErrorBytes = Buffer.alloc(0);
  let exceededMaximum = false;

  standardErrorStream.on("data", (chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remainingByteCount = Math.max(
      0,
      CAPTURED_STANDARD_ERROR_MAXIMUM_BYTES - standardErrorBytes.byteLength,
    );

    if (bytes.byteLength > remainingByteCount) {
      exceededMaximum = true;
    }

    if (remainingByteCount > 0) {
      standardErrorBytes = Buffer.concat([
        standardErrorBytes,
        bytes.subarray(0, remainingByteCount),
      ]);
    }
  });

  return () => ({
    exceededMaximum,
    text: standardErrorBytes.toString("utf8"),
  });
}

function assertJsonLinesStandardError({ exceededMaximum, text }) {
  if (exceededMaximum) {
    throw new Error(
      "Universal Ontology MCP application bundle exceeded the stderr verification bound.",
    );
  }

  for (const line of text.split("\n").filter(Boolean)) {
    try {
      JSON.parse(line);
    } catch {
      throw new Error(
        "Universal Ontology MCP application bundle emitted a non-JSON stderr line.",
      );
    }
  }
}

/**
 * Verify the installed application's actual MCP interface through the official
 * v2 client. Callers may additionally require a real ontology query when they
 * are proving a configured installation is ready, rather than only proving the
 * data-free software bundle's identity and tool surface.
 */
export async function verifyUniversalOntologyMcpApplicationBundle({
  applicationBundlePath,
  ontologyQueryArtifactSourceKind = "http",
  ontologyQueryArtifactRootDirectoryPath,
  ontologyQueryArtifactChannelName = "development",
  ontologyQueryArtifactBaseUrl,
  verifyOntologyQueryReadiness = false,
} = {}) {
  validateOntologyQueryArtifactSourceKind(ontologyQueryArtifactSourceKind);
  if (typeof verifyOntologyQueryReadiness !== "boolean") {
    throw new TypeError("verifyOntologyQueryReadiness must be a boolean.");
  }
  if (ontologyQueryArtifactSourceKind === "http") {
    validateOntologyQueryArtifactChannelName(ontologyQueryArtifactChannelName);
  } else if (
    typeof ontologyQueryArtifactRootDirectoryPath !== "string" ||
    ontologyQueryArtifactRootDirectoryPath.length === 0
  ) {
    throw new TypeError(
      "ontologyQueryArtifactRootDirectoryPath must name the filesystem query-artifact root.",
    );
  }
  const resolvedApplicationBundlePath = await requireApplicationBundleFile(
    applicationBundlePath,
  );
  const verifierOwnedOntologyQueryArtifactCacheDirectoryPath =
    await nodeFileSystem.mkdtemp(
      join(
        tmpdir(),
        "universal-ontology-mcp-application-bundle-verifier-cache-",
      ),
    );
  let readCapturedStandardError;
  let client;
  let verificationFailure;
  let serverInfo;
  let toolNames;
  let queryReadiness;

  try {
    const ontologyQueryArtifactArguments =
      ontologyQueryArtifactSourceKind === "file_system"
        ? [
            "--query-artifact-source=file-system",
            `--query-artifact-root-directory=${resolve(ontologyQueryArtifactRootDirectoryPath)}`,
          ]
        : [
            "--query-artifact-source=http",
            `--artifact-channel=${ontologyQueryArtifactChannelName}`,
            ...(ontologyQueryArtifactBaseUrl === undefined
              ? []
              : [`--artifact-base-url=${ontologyQueryArtifactBaseUrl}`]),
            "--cache-directory",
            verifierOwnedOntologyQueryArtifactCacheDirectoryPath,
          ];
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolvedApplicationBundlePath, ...ontologyQueryArtifactArguments],
      cwd: REPOSITORY_ROOT_PATH,
      stderr: "pipe",
      maxBufferSize: MCP_STDIO_MAXIMUM_MESSAGE_BYTES,
    });
    readCapturedStandardError = createBoundedStandardErrorCapture(
      transport.stderr,
    );
    client = new Client(
      {
        name: "universal-ontology-mcp-application-bundle-verifier",
        version: "1.0.0",
      },
      {
        enforceStrictCapabilities: true,
        listMaxPages: 2,
        versionNegotiation: {
          mode: { pin: PINNED_MCP_PROTOCOL_VERSION },
        },
      },
    );

    await client.connect(transport, {
      timeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
      maxTotalTimeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
    });
    serverInfo = client.getServerVersion();

    if (
      JSON.stringify(serverInfo) !==
      JSON.stringify(UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO)
    ) {
      throw new Error(
        `Universal Ontology MCP server identity mismatch. Expected ${JSON.stringify(UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO)}; received ${JSON.stringify(serverInfo)}.`,
      );
    }

    const toolList = await client.listTools(undefined, {
      cacheMode: "bypass",
      timeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
      maxTotalTimeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
    });
    toolNames = toolList.tools.map(({ name }) => name);

    if (JSON.stringify(toolNames) !== JSON.stringify(EXPECTED_MCP_TOOL_NAMES)) {
      throw new Error(
        `Universal Ontology MCP tool surface mismatch. Expected ${JSON.stringify(EXPECTED_MCP_TOOL_NAMES)}; received ${JSON.stringify(toolNames)}.`,
      );
    }

    if (verifyOntologyQueryReadiness) {
      const result = await client.callTool(
        {
          name: SEARCH_ENTITIES_TOOL_NAME,
          arguments: createReadinessSearchArguments(),
        },
        {
          timeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
          maxTotalTimeout: MCP_OPERATION_TIMEOUT_MILLISECONDS,
        },
      );
      queryReadiness = assertOntologyQueryReadiness(result);
    }
  } catch (error) {
    verificationFailure = error;
  } finally {
    if (client !== undefined) {
      try {
        await client.close();
      } catch (error) {
        verificationFailure ??= error;
      }
    }

    try {
      await nodeFileSystem.rm(
        verifierOwnedOntologyQueryArtifactCacheDirectoryPath,
        {
          recursive: true,
          force: true,
        },
      );
    } catch (error) {
      // Cache cleanup is part of verifier ownership, but it must not conceal a
      // more useful protocol, transport, or server verification failure.
      verificationFailure ??= error;
    }
  }

  if (verificationFailure !== undefined) {
    throw verificationFailure;
  }

  assertJsonLinesStandardError(readCapturedStandardError());
  return {
    ontologyQueryArtifactSourceKind,
    ...(ontologyQueryArtifactSourceKind === "http"
      ? { ontologyQueryArtifactChannelName }
      : {}),
    ...(queryReadiness === undefined ? {} : { queryReadiness }),
    serverInfo,
    toolNames,
  };
}

function parseCommandLineArguments(commandLineArguments) {
  let applicationBundlePath;
  let ontologyQueryArtifactSourceKind = "http";
  let ontologyQueryArtifactRootDirectoryPath;
  let ontologyQueryArtifactChannelName = "development";
  let ontologyQueryArtifactBaseUrl;
  let verifyOntologyQueryReadiness = false;

  for (let index = 0; index < commandLineArguments.length; index += 1) {
    const argument = commandLineArguments[index];

    if (argument === "--application-bundle") {
      applicationBundlePath = commandLineArguments[index + 1];
      index += 1;
    } else if (argument.startsWith("--query-artifact-source=")) {
      const sourceValue = argument.slice("--query-artifact-source=".length);
      ontologyQueryArtifactSourceKind =
        sourceValue === "file-system" ? "file_system" : sourceValue;
    } else if (argument.startsWith("--query-artifact-root-directory=")) {
      ontologyQueryArtifactRootDirectoryPath = argument.slice(
        "--query-artifact-root-directory=".length,
      );
    } else if (argument.startsWith("--artifact-channel=")) {
      ontologyQueryArtifactChannelName = argument.slice(
        "--artifact-channel=".length,
      );
    } else if (argument.startsWith("--artifact-base-url=")) {
      ontologyQueryArtifactBaseUrl = argument.slice(
        "--artifact-base-url=".length,
      );
    } else if (argument === "--verify-query-readiness") {
      verifyOntologyQueryReadiness = true;
    } else {
      throw new TypeError(`Unknown verifier argument: ${argument}`);
    }
  }

  return {
    applicationBundlePath,
    ontologyQueryArtifactSourceKind,
    ontologyQueryArtifactRootDirectoryPath,
    ontologyQueryArtifactChannelName,
    ontologyQueryArtifactBaseUrl,
    verifyOntologyQueryReadiness,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const verificationResult =
      await verifyUniversalOntologyMcpApplicationBundle(
        parseCommandLineArguments(process.argv.slice(2)),
      );
    process.stdout.write(`${JSON.stringify(verificationResult)}\n`);
  } catch (error) {
    process.stderr.write(
      `Universal Ontology MCP application-bundle verification failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
