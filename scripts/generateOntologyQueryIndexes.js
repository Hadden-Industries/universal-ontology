import { createHash } from "node:crypto";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
  deepFreeze,
} from "../src/ontologyQuery/ontologyQuerySchemas.js";
import { renderOntologyAssetsWithWorkers } from "./build/ontologyAssetWorkerPool.js";
import {
  inventorySourceTree,
  resolveOutputPath,
} from "./build/sourceInventory.js";

const PUBLIC_ONTOLOGY_ROOT = new URL("https://haddenindustries.com/ontology/");
const IMMUTABLE_RELEASE_NAME_PATTERN = /^(?:\d{8}|v[1-9][0-9]*)$/u;
const STABLE_RELEASE_NAME_PATTERN = /^\d{8}$/u;

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function serializeJsonDocument(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function isEligibleImmutableRelease({ outputPath }) {
  return IMMUTABLE_RELEASE_NAME_PATTERN.test(posix.basename(outputPath));
}

function selectLatestUniversalSources(ontologySources) {
  const latestSourceByFamily = new Map();

  for (const source of ontologySources) {
    if (
      !source.outputPath.startsWith("universal/") ||
      !STABLE_RELEASE_NAME_PATTERN.test(posix.basename(source.outputPath))
    ) {
      continue;
    }

    const familyId = posix.dirname(source.outputPath);
    const preceding = latestSourceByFamily.get(familyId);

    if (!preceding || source.outputPath > preceding.outputPath) {
      latestSourceByFamily.set(familyId, source);
    }
  }

  return [...latestSourceByFamily.values()].sort(
    ({ outputPath: left }, { outputPath: right }) => compareBinary(left, right),
  );
}

function buildFallbackBaseIri(outputPath) {
  return new URL(`${posix.dirname(outputPath)}/`, PUBLIC_ONTOLOGY_ROOT).href;
}

function requireMatchingReleaseIdentity(index, input) {
  const release = index.resolvedOntologyRelease;

  if (
    release.ontologyArtifactFamilyId !== input.ontologyArtifactFamilyId ||
    release.versionTag !== input.versionTag ||
    release.sourceArtifactUrl !== input.sourceArtifactUrl
  ) {
    throw new Error(
      `Generated query index identity does not match "${input.outputPath}".`,
    );
  }
}

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
  const eligibleSources = ontologySources.filter(isEligibleImmutableRelease);
  const selectedSources = latestUniversalOnly
    ? selectLatestUniversalSources(eligibleSources)
    : eligibleSources;

  if (selectedSources.length === 0) {
    throw new Error("No eligible immutable ontology releases were found.");
  }

  const inputs = await Promise.all(
    selectedSources.map(async (source) => {
      const ontologyArtifactFamilyId = posix.dirname(source.outputPath);
      const versionTag = posix.basename(source.outputPath);

      return {
        ...source,
        size: (await stat(source.sourcePath)).size,
        fallbackBaseIRI: buildFallbackBaseIri(source.outputPath),
        ontologyArtifactFamilyId,
        versionTag,
        sourceArtifactUrl: new URL(source.outputPath, PUBLIC_ONTOLOGY_ROOT)
          .href,
      };
    }),
  );
  inputs.sort(({ outputPath: left }, { outputPath: right }) =>
    compareBinary(left, right),
  );

  const renderedIndexes = await renderOntologyAssetsWithWorkers({
    inputs,
    workerCount,
    requestedAssetKinds: ["query_index"],
  });
  const stableVersionByFamily = new Map();

  for (const input of inputs) {
    if (!STABLE_RELEASE_NAME_PATTERN.test(input.versionTag)) {
      continue;
    }

    const preceding = stableVersionByFamily.get(input.ontologyArtifactFamilyId);

    if (!preceding || input.versionTag > preceding) {
      stableVersionByFamily.set(
        input.ontologyArtifactFamilyId,
        input.versionTag,
      );
    }
  }

  const releaseArtifacts = renderedIndexes.map((renderedIndex, index) => {
    const input = inputs[index];
    const queryIndex = OntologyReleaseQueryIndexSchema.parse(
      JSON.parse(renderedIndex.queryIndexContent.toString("utf8")),
    );
    requireMatchingReleaseIdentity(queryIndex, input);

    const deterministicContent = serializeJsonDocument(queryIndex);

    if (!deterministicContent.equals(renderedIndex.queryIndexContent)) {
      throw new Error(
        `Worker emitted non-canonical query-index bytes for "${input.outputPath}".`,
      );
    }

    const queryIndexSha256 = sha256(deterministicContent);
    const queryIndexRelativePath =
      `releases/${input.ontologyArtifactFamilyId}/${input.versionTag}/` +
      `${queryIndexSha256}.json`;

    return {
      input,
      content: deterministicContent,
      catalogRelease: {
        ontologyArtifactFamilyId: input.ontologyArtifactFamilyId,
        versionTag: input.versionTag,
        latestStableRelease:
          stableVersionByFamily.get(input.ontologyArtifactFamilyId) ===
          input.versionTag,
        sourceArtifactRelativePath: input.outputPath,
        sourceArtifactUrl: input.sourceArtifactUrl,
        sourceArtifactSha256:
          queryIndex.resolvedOntologyRelease.sourceArtifactSha256,
        queryIndexRelativePath,
        queryIndexSha256,
      },
    };
  });

  // Every immutable object is made durable before catalog publication. A
  // failure therefore leaves the preceding catalog complete and queryable.
  for (const releaseArtifact of releaseArtifacts) {
    await writeReleaseIndex({
      outputDirectory,
      relativePath: releaseArtifact.catalogRelease.queryIndexRelativePath,
      content: releaseArtifact.content,
    });
  }

  const catalog = OntologyQueryCatalogSchema.parse({
    queryArtifactKind: "universal_ontology_query_catalog",
    queryArtifactFormatVersion: 1,
    releases: releaseArtifacts
      .map(({ catalogRelease }) => catalogRelease)
      .sort(
        (left, right) =>
          compareBinary(
            left.ontologyArtifactFamilyId,
            right.ontologyArtifactFamilyId,
          ) || compareBinary(left.versionTag, right.versionTag),
      ),
  });
  const catalogContent = serializeJsonDocument(catalog);
  await publishCatalogAtomically({ outputDirectory, catalogContent });

  return deepFreeze(catalog);
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
