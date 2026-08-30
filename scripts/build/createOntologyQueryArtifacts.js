import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { posix } from "node:path";

import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
} from "../../src/ontologyQuery/ontologyQueryArtifactLimits.js";
import {
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
  deepFreeze,
} from "../../src/ontologyQuery/ontologyQuerySchemas.js";
import { renderOntologyAssetsWithWorkers } from "./ontologyAssetWorkerPool.js";

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

function assertArtifactByteLength({
  artifactKind,
  content,
  maximumByteLength,
}) {
  if (content.byteLength <= maximumByteLength) {
    return;
  }

  throw new RangeError(
    `The ${artifactKind} is ${content.byteLength} bytes, exceeding the ` +
      `${maximumByteLength}-byte limit.`,
  );
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

/**
 * Create the canonical, content-addressed query artifacts shared by the
 * filesystem publisher and the website build. This function deliberately
 * performs no writes, so both publishers expose byte-identical documents.
 *
 * @param {object} options
 * @param {ReadonlyArray<{sourcePath: string, outputPath: string}>} options.ontologySources
 * @param {number} [options.workerCount]
 * @param {boolean} [options.latestUniversalOnly=false]
 * @returns {Promise<{
 *   catalog: Readonly<object>,
 *   artifactContentsByRelativePath: Map<string, Buffer>
 * }>}
 */
export async function createOntologyQueryArtifacts({
  ontologySources,
  workerCount,
  latestUniversalOnly = false,
}) {
  const eligibleSources = ontologySources.filter(isEligibleImmutableRelease);
  const selectedSources = latestUniversalOnly
    ? selectLatestUniversalSources(eligibleSources)
    : eligibleSources;

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

    assertArtifactByteLength({
      artifactKind: `ontology release query index for "${input.outputPath}"`,
      content: deterministicContent,
      maximumByteLength: MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
    });

    const queryIndexSha256 = sha256(deterministicContent);
    const queryIndexRelativePath =
      `releases/${input.ontologyArtifactFamilyId}/${input.versionTag}/` +
      `${queryIndexSha256}.json`;

    return {
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

  const catalog = deepFreeze(
    OntologyQueryCatalogSchema.parse({
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
    }),
  );
  const catalogContent = serializeJsonDocument(catalog);

  assertArtifactByteLength({
    artifactKind: "ontology query catalog",
    content: catalogContent,
    maximumByteLength: MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  });

  const artifactContentsByRelativePath = new Map(
    releaseArtifacts.map(({ catalogRelease, content }) => [
      catalogRelease.queryIndexRelativePath,
      content,
    ]),
  );
  // The catalog is inserted last to retain the publisher's durability model:
  // immutable release bytes are always available before readers can select them.
  artifactContentsByRelativePath.set("catalog.json", catalogContent);

  return { catalog, artifactContentsByRelativePath };
}
