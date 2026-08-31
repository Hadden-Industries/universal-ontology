import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createOntologyQueryChannelManifest } from "./build/createOntologyQueryChannelManifest.js";
import { resolveOutputPath } from "./build/sourceInventory.js";
import { calculateSha256 } from "../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
} from "../src/ontologyQuery/ontologyQueryArtifactLimits.js";
import {
  parseOntologyQueryCatalogBytes,
  parseOntologyReleaseQueryIndexBytes,
} from "../src/ontologyQuery/ontologyQueryArtifactParsing.js";
import { parseOntologyReleaseQueryIndexRelativePath } from "../src/ontologyQuery/ontologyQueryArtifactRelativePath.js";
import { OntologyQueryArtifactChannelNameSchema } from "../src/ontologyQuery/ontologyQueryChannelManifestSchemas.js";

const DEFAULT_FILE_SYSTEM = Object.freeze({
  mkdir,
  open,
  readFile,
  rename,
  unlink,
});

function requireBoundedCatalogBytes(bytes) {
  if (bytes.byteLength > MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH) {
    throw new RangeError(
      "The ontology query catalog exceeds its decoded-byte limit.",
    );
  }

  return parseOntologyQueryCatalogBytes(bytes);
}

function haveIdenticalBytes(left, right) {
  return Buffer.from(left).equals(Buffer.from(right));
}

async function requireCompleteCatalogRelease({
  absoluteQueryRoot,
  catalogRelease,
  fileSystem,
}) {
  try {
    const parsedRelativePath = parseOntologyReleaseQueryIndexRelativePath(
      catalogRelease.queryIndexRelativePath,
    );

    if (
      parsedRelativePath.ontologyArtifactFamilyId !==
        catalogRelease.ontologyArtifactFamilyId ||
      parsedRelativePath.versionTag !== catalogRelease.versionTag ||
      parsedRelativePath.sha256 !== catalogRelease.queryIndexSha256
    ) {
      throw new Error(
        "The release-index path identity does not match its catalog entry.",
      );
    }

    const releaseIndexPath = resolveOutputPath(
      absoluteQueryRoot,
      catalogRelease.queryIndexRelativePath,
    );
    const releaseIndexContent = await fileSystem.readFile(releaseIndexPath);

    if (
      releaseIndexContent.byteLength >
      MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH
    ) {
      throw new RangeError(
        "The ontology release query index exceeds its decoded-byte limit.",
      );
    }

    if (
      (await calculateSha256(releaseIndexContent)) !==
      catalogRelease.queryIndexSha256
    ) {
      throw new Error(
        "The ontology release query-index digest does not match its catalog entry.",
      );
    }

    const queryIndex = parseOntologyReleaseQueryIndexBytes(releaseIndexContent);
    const embeddedRelease = queryIndex.resolvedOntologyRelease;

    if (
      embeddedRelease.ontologyArtifactFamilyId !==
        catalogRelease.ontologyArtifactFamilyId ||
      embeddedRelease.versionTag !== catalogRelease.versionTag ||
      embeddedRelease.sourceArtifactUrl !== catalogRelease.sourceArtifactUrl ||
      embeddedRelease.sourceArtifactSha256 !==
        catalogRelease.sourceArtifactSha256
    ) {
      throw new Error(
        "The ontology release query-index identity does not match its catalog entry.",
      );
    }
  } catch (error) {
    throw new Error(
      "A cataloged ontology release query index is unavailable or invalid.",
      { cause: error },
    );
  }
}

async function writeFileThenRenameAtomically({
  content,
  destinationPath,
  temporaryPath,
  fileSystem,
}) {
  let temporaryFileExists = false;

  try {
    const fileHandle = await fileSystem.open(temporaryPath, "wx", 0o600);
    temporaryFileExists = true;
    let writeError;

    try {
      await fileHandle.writeFile(content);
      // Flush the complete canonical bytes before the directory entry becomes
      // visible at the selected mutable channel path.
      await fileHandle.sync();
    } catch (error) {
      writeError = error;
    }

    try {
      await fileHandle.close();
    } catch (error) {
      writeError ??= error;
    }

    if (writeError) {
      throw writeError;
    }

    await fileSystem.rename(temporaryPath, destinationPath);
    temporaryFileExists = false;
  } catch (error) {
    if (temporaryFileExists) {
      try {
        // The UUID-named sibling belongs only to this invocation. Never glob
        // or remove another run's temporary file or preceding channel state.
        await fileSystem.unlink(temporaryPath);
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") {
          throw new AggregateError(
            [error, cleanupError],
            `${error.message} Temporary channel-manifest cleanup also failed.`,
            { cause: cleanupError },
          );
        }
      }
    }

    throw error;
  }
}

/**
 * Validate locally generated artifacts and atomically stage exactly one
 * stable or development channel manifest. This operation performs no HTTP
 * request, upload, deletion of immutable content, or cross-channel mutation.
 */
export async function stageOntologyQueryArtifactChannel({
  queryRoot,
  ontologyQueryArtifactChannelName,
  fileSystem = DEFAULT_FILE_SYSTEM,
}) {
  if (typeof queryRoot !== "string" || !isAbsolute(queryRoot)) {
    throw new TypeError("queryRoot must be an absolute filesystem path.");
  }

  const parsedChannelName = OntologyQueryArtifactChannelNameSchema.parse(
    ontologyQueryArtifactChannelName,
  );
  const absoluteQueryRoot = resolve(queryRoot);
  const compatibilityCatalogPath = resolveOutputPath(
    absoluteQueryRoot,
    "catalog.json",
  );
  const catalogContent = await fileSystem.readFile(compatibilityCatalogPath);
  const catalog = requireBoundedCatalogBytes(catalogContent);
  const catalogSha256 = await calculateSha256(catalogContent);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const immutableCatalogPath = resolveOutputPath(
    absoluteQueryRoot,
    catalogRelativePath,
  );
  const immutableCatalogContent =
    await fileSystem.readFile(immutableCatalogPath);

  try {
    requireBoundedCatalogBytes(immutableCatalogContent);
  } catch (error) {
    throw new Error("The immutable catalog is invalid.", { cause: error });
  }

  if (!haveIdenticalBytes(catalogContent, immutableCatalogContent)) {
    throw new Error(
      "The immutable catalog bytes do not match the validated compatibility catalog.",
    );
  }

  // A channel is a promise that the selected immutable catalog is complete,
  // not merely that its root document exists. Validate every selected release
  // before making the mutable manifest visible.
  for (const catalogRelease of catalog.releases) {
    await requireCompleteCatalogRelease({
      absoluteQueryRoot,
      catalogRelease,
      fileSystem,
    });
  }

  const { channelManifest, channelManifestContent } =
    createOntologyQueryChannelManifest({
      ontologyQueryArtifactChannelName: parsedChannelName,
      ontologyQueryCatalogReference: {
        relativePath: catalogRelativePath,
        sha256: catalogSha256,
        byteLength: catalogContent.byteLength,
      },
    });
  const channelManifestRelativePath = `channels/${parsedChannelName}.json`;
  const channelManifestPath = resolveOutputPath(
    absoluteQueryRoot,
    channelManifestRelativePath,
  );
  const channelDirectoryPath = resolveOutputPath(absoluteQueryRoot, "channels");
  const temporaryChannelManifestPath = resolveOutputPath(
    absoluteQueryRoot,
    `channels/.${parsedChannelName}.json.${process.pid}.${randomUUID()}.tmp`,
  );
  await fileSystem.mkdir(channelDirectoryPath, { recursive: true });
  await writeFileThenRenameAtomically({
    content: channelManifestContent,
    destinationPath: channelManifestPath,
    temporaryPath: temporaryChannelManifestPath,
    fileSystem,
  });

  return Object.freeze({
    channelManifest,
    channelManifestContent,
    channelManifestRelativePath,
  });
}

function parseCommandLineArguments(arguments_) {
  let ontologyQueryArtifactChannelName;
  let queryRootArgument;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];

    if (argument === "--channel" && value !== undefined) {
      if (ontologyQueryArtifactChannelName !== undefined) {
        throw new Error("--channel may be specified only once.");
      }

      ontologyQueryArtifactChannelName = value;
      index += 1;
      continue;
    }

    if (argument === "--query-root" && value !== undefined) {
      if (queryRootArgument !== undefined) {
        throw new Error("--query-root may be specified only once.");
      }

      queryRootArgument = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${argument}`);
  }

  if (!ontologyQueryArtifactChannelName || !queryRootArgument) {
    throw new Error("Both --channel and --query-root are required.");
  }

  return {
    ontologyQueryArtifactChannelName,
    queryRoot: resolve(process.cwd(), queryRootArgument),
  };
}

async function runFromCommandLine() {
  const options = parseCommandLineArguments(process.argv.slice(2));
  const result = await stageOntologyQueryArtifactChannel(options);

  process.stdout.write(
    `Staged ${result.channelManifest.ontologyQueryArtifactChannelName} ` +
      `ontology query channel at ${result.channelManifestRelativePath}.\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runFromCommandLine().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
