import { mkdir, rename, unlink, writeFile, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { readOntologySourceCatalog } from "./build/readOntologySourceCatalog.js";
import { readOntologyOwnershipInventory } from "./build/readOntologyOwnershipInventory.js";

import { createOntologyQueryArtifacts } from "./build/createOntologyQueryArtifacts.js";
import {
  inventorySourceTree,
  resolveOutputPath,
} from "./build/sourceInventory.js";

async function writeImmutableArtifact({
  outputDirectory,
  relativePath,
  content,
}) {
  const outputPath = resolveOutputPath(outputDirectory, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(outputPath, content, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (!Buffer.from(await readFile(outputPath)).equals(Buffer.from(content)))
      throw new Error(
        "Existing immutable query artifact differs from its content address.",
        { cause: error },
      );
  }
}

async function publishCatalogAtomically({ outputDirectory, catalogContent }) {
  const catalogPath = resolveOutputPath(outputDirectory, "catalog.json");
  const temporaryCatalogPath = resolveOutputPath(
    outputDirectory,
    `catalog.json.${process.pid}.${randomUUID()}.tmp`,
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
  sourceFile,
  ontologyArtifactFamilyId,
  repositoryRoot,
  sourceCatalog,
  ownershipInventory,
}) {
  if (!sourceDirectory) {
    throw new TypeError("sourceDirectory is required.");
  }

  if (!outputDirectory) {
    throw new TypeError("outputDirectory is required.");
  }

  const { ontologySources } = sourceFile
    ? {
        ontologySources: [
          {
            sourcePath: sourceFile,
            outputPath: `${ontologyArtifactFamilyId}/working`,
            snapshotKind: "working",
          },
        ],
      }
    : await inventorySourceTree({ sourceDirectory });
  const {
    catalog,
    catalogContent,
    artifactContentsByRelativePath,
    assertSourcesUnchanged,
  } = await createOntologyQueryArtifacts({
    ontologySources,
    workerCount,
    latestUniversalOnly,
    repositoryRoot,
    sourceCatalog,
    ownershipInventory,
  });

  if (catalog.releases.length === 0) {
    // Preserve the standalone publisher's historical contract: invoking the
    // CLI against an ineligible source tree is a configuration error. The
    // in-memory builder itself may still represent an empty fixture catalog.
    throw new Error("No eligible immutable ontology releases were found.");
  }

  // Every immutable object is made durable before catalog publication. A
  // failure therefore leaves the preceding catalog complete and queryable.
  for (const [relativePath, content] of artifactContentsByRelativePath) {
    if (relativePath === "catalog.json") {
      continue;
    }

    await writeImmutableArtifact({
      outputDirectory,
      relativePath,
      content,
    });
  }

  await assertSourcesUnchanged();
  await publishCatalogAtomically({ outputDirectory, catalogContent });

  return catalog;
}

function parseCommandLineArguments(arguments_) {
  const { values } = parseArgs({
    args: arguments_,
    options: {
      "latest-universal-only": { type: "boolean", default: false },
      source: { type: "string" },
      family: { type: "string" },
      catalog: { type: "string" },
      output: { type: "string" },
    },
    strict: true,
  });
  if (values.source && !values.family)
    throw new TypeError("--source requires --family.");
  if (values.source && values["latest-universal-only"])
    throw new TypeError(
      "Working snapshots cannot use --latest-universal-only.",
    );
  return values;
}

async function runFromCommandLine() {
  const values = parseCommandLineArguments(process.argv.slice(2));
  const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const outputDirectory = values.output
    ? resolve(values.output)
    : fileURLToPath(new URL("../dist/query/v1/", import.meta.url));
  const sourceFile = values.source ? resolve(values.source) : undefined;
  if (sourceFile) {
    const path = relative(repositoryRoot, sourceFile);
    if (isAbsolute(path) || path === ".." || path.startsWith(`..${sep}`))
      throw new Error("Working snapshots must be inside the repository.");
  }
  const ownershipInventory =
    await readOntologyOwnershipInventory(repositoryRoot);
  const sourceCatalog = await readOntologySourceCatalog({
    repositoryRoot,
    catalogPath: resolve(
      repositoryRoot,
      values.catalog ??
        (sourceFile
          ? `${dirname(relative(repositoryRoot, sourceFile))}/catalog-v001.xml`
          : "core/catalog-v001.xml"),
    ),
  });
  const catalog = await generateOntologyQueryIndexes({
    sourceDirectory,
    outputDirectory,
    latestUniversalOnly: values["latest-universal-only"],
    sourceFile,
    ontologyArtifactFamilyId: values.family,
    repositoryRoot,
    sourceCatalog,
    ownershipInventory,
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
