import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createOntologyQueryArtifacts } from "./build/createOntologyQueryArtifacts.js";
import {
  inventorySourceTree,
  resolveOutputPath,
} from "./build/sourceInventory.js";

async function writeReleaseIndex({ outputDirectory, relativePath, content }) {
  const outputPath = resolveOutputPath(outputDirectory, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}

async function publishCatalogAtomically({ outputDirectory, catalogContent }) {
  const catalogPath = resolveOutputPath(outputDirectory, "catalog.json");
  const temporaryCatalogPath = resolveOutputPath(
    outputDirectory,
    `catalog.json.${process.pid}.tmp`,
  );

  await mkdir(dirname(catalogPath), { recursive: true });

  try {
    await writeFile(temporaryCatalogPath, catalogContent);
    await rename(temporaryCatalogPath, catalogPath);
  } catch (error) {
    // This temporary file is created by the current invocation. Removing only
    // this exact sibling is recoverable and cannot disturb a preceding catalog.
    await unlink(temporaryCatalogPath).catch(() => {});
    throw error;
  }
}

/**
 * Generate all eligible immutable ontology release indexes and publish their
 * catalog last. Release files are content addressed and never cleaned here;
 * obsolete files remain harmlessly unreachable from the new catalog.
 *
 * @param {object} options
 * @param {string} options.sourceDirectory
 * @param {string} options.outputDirectory - The query/v1 directory itself.
 * @param {number} [options.workerCount]
 * @param {boolean} [options.latestUniversalOnly=false]
 * @returns {Promise<Readonly<object>>}
 */
export async function generateOntologyQueryIndexes({
  sourceDirectory,
  outputDirectory,
  workerCount,
  latestUniversalOnly = false,
}) {
  if (!sourceDirectory) {
    throw new TypeError("sourceDirectory is required.");
  }

  if (!outputDirectory) {
    throw new TypeError("outputDirectory is required.");
  }

  const { ontologySources } = await inventorySourceTree({ sourceDirectory });
  const { catalog, artifactContentsByRelativePath } =
    await createOntologyQueryArtifacts({
      ontologySources,
      workerCount,
      latestUniversalOnly,
    });

  if (catalog.releases.length === 0) {
    // Preserve the standalone publisher's historical contract: invoking the
    // CLI against an ineligible source tree is a configuration error. The
    // in-memory builder itself may still represent an empty fixture catalog.
    throw new Error("No eligible immutable ontology releases were found.");
  }

  const catalogContent = artifactContentsByRelativePath.get("catalog.json");

  // Every immutable object is made durable before catalog publication. A
  // failure therefore leaves the preceding catalog complete and queryable.
  for (const [relativePath, content] of artifactContentsByRelativePath) {
    if (relativePath === "catalog.json") {
      continue;
    }

    await writeReleaseIndex({
      outputDirectory,
      relativePath,
      content,
    });
  }

  await publishCatalogAtomically({ outputDirectory, catalogContent });

  return catalog;
}

function parseCommandLineArguments(arguments_) {
  const supportedArguments = new Set(["--latest-universal-only"]);

  for (const argument of arguments_) {
    if (!supportedArguments.has(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    latestUniversalOnly: arguments_.includes("--latest-universal-only"),
  };
}

async function runFromCommandLine() {
  const { latestUniversalOnly } = parseCommandLineArguments(
    process.argv.slice(2),
  );
  const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
  const outputDirectory = fileURLToPath(
    new URL("../dist/query/v1/", import.meta.url),
  );
  const catalog = await generateOntologyQueryIndexes({
    sourceDirectory,
    outputDirectory,
    latestUniversalOnly,
  });

  process.stdout.write(
    `Generated ${catalog.releases.length} ontology query indexes in ` +
      `${outputDirectory}.\n`,
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
