import { freezeJsonValueDeeply } from "universal-ontology-query/json-value-immutability";
import { open, realpath } from "node:fs/promises";
import { posix, relative, resolve, sep, isAbsolute } from "node:path";

import {
  calculateSha256,
  serializeCanonicalOntologyQueryJsonDocument,
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
  parseOntologyReleaseQueryIndexBytes,
} from "universal-ontology-query/artifacts";

import { OntologyQueryCatalogSchema } from "universal-ontology-query/schemas";

import { renderOntologyAssetsWithWorkers } from "./ontologyAssetWorkerPool.js";

const PUBLIC_ONTOLOGY_ROOT = new URL("https://haddenindustries.com/ontology/");
const IMMUTABLE_RELEASE_NAME_PATTERN = /^(?:\d{8}|v[1-9][0-9]*)$/u;
const STABLE_RELEASE_NAME_PATTERN = /^\d{8}$/u;

/** Capture bounded source bytes before parsing, including growth during reads. */
async function captureSource(sourcePath) {
  const handle = await open(sourcePath, "r");
  try {
    const maximum = 8 * 1024 * 1024;
    if ((await handle.stat()).size > maximum)
      throw new RangeError("Ontology source exceeds 8 MiB.");
    const buffer = Buffer.alloc(maximum + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    if (size > maximum) throw new RangeError("Ontology source exceeds 8 MiB.");
    return Buffer.from(buffer.subarray(0, size));
  } finally {
    await handle.close();
  }
}

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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

function isEligibleImmutableRelease({ outputPath, snapshotKind }) {
  return (
    snapshotKind === "working" ||
    IMMUTABLE_RELEASE_NAME_PATTERN.test(posix.basename(outputPath))
  );
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
 *   catalogContent: Buffer,
 *   catalogSha256: string,
 *   catalogRelativePath: string,
 *   artifactContentsByRelativePath: Map<string, Buffer>
 * }>}
 */
export async function createOntologyQueryArtifacts({
  ontologySources,
  workerCount,
  latestUniversalOnly = false,
  sourceCatalog,
  repositoryRoot,
  ownershipInventory,
}) {
  const eligibleSources = ontologySources.filter(isEligibleImmutableRelease);
  const selectedSources = latestUniversalOnly
    ? selectLatestUniversalSources(eligibleSources)
    : eligibleSources;

  async function captureInput(source) {
    if (repositoryRoot) {
      const child = relative(
        await realpath(repositoryRoot),
        await realpath(source.sourcePath),
      );
      if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`))
        throw new Error("Ontology source escapes repository containment.");
    }
    const ontologyArtifactFamilyId = posix.dirname(source.outputPath);
    const versionTag = posix.basename(source.outputPath);
    const content = await captureSource(source.sourcePath);
    const sourceArtifactUrl =
      source.sourceArtifactUrl ??
      new URL(source.outputPath, PUBLIC_ONTOLOGY_ROOT).href;
    const sourceSha256 = await calculateSha256(content);
    const snapshotId = `urn:uo:snapshot:${await calculateSha256(new TextEncoder().encode(JSON.stringify([2, sourceSha256, sourceArtifactUrl, source.outputPath, sourceCatalog?.sha256 ?? null, ownershipInventory?.sha256 ?? null])))}`;

    return {
      ...source,
      size: content.byteLength,
      content,
      sourceSha256,
      snapshotId,
      fallbackBaseIRI: buildFallbackBaseIri(source.outputPath),
      ontologyArtifactFamilyId,
      versionTag,
      sourceArtifactUrl,
    };
  }
  const inputs = await Promise.all(selectedSources.map(captureInput));
  inputs.sort(({ outputPath: left }, { outputPath: right }) =>
    compareBinary(left, right),
  );

  const renderedIndexes = await renderOntologyAssetsWithWorkers({
    inputs,
    workerCount,
    requestedAssetKinds: ["query_index"],
  });
  const capturedByPath = new Map(
    inputs.map((input) => [resolve(input.sourcePath), input]),
  );
  const unavailableImports = new Set();
  // Iterate only imports actually declared by captured sources. A catalog is
  // a resolver, never an instruction to ingest all of its entries.
  for (let index = 0; index < renderedIndexes.length; index += 1) {
    for (const importIri of renderedIndexes[index].declaredImports) {
      const sourcePath = sourceCatalog?.bindings.get(importIri);
      if (
        !sourcePath ||
        capturedByPath.has(resolve(sourcePath)) ||
        unavailableImports.has(importIri)
      )
        continue;
      if (!repositoryRoot)
        throw new TypeError("Catalog import capture requires repositoryRoot.");
      const containedPath = relative(resolve(repositoryRoot), sourcePath);
      if (
        isAbsolute(containedPath) ||
        containedPath === ".." ||
        containedPath.startsWith(`..${sep}`)
      )
        throw new Error("Import escapes repository containment.");
      const sourceRelativePath = containedPath.split(sep).join("/");
      const sourceOutputPath = sourceRelativePath.startsWith("src/")
        ? sourceRelativePath.slice(4)
        : sourceRelativePath;
      const outputPath = IMMUTABLE_RELEASE_NAME_PATTERN.test(
        posix.basename(sourceOutputPath),
      )
        ? sourceOutputPath
        : `${sourceOutputPath}/dependency`;
      let importedInput;
      try {
        importedInput = await captureInput({
          sourcePath,
          outputPath,
          sourceArtifactUrl: importIri,
          sourceFormat: sourcePath.endsWith(".ttl")
            ? "text/turtle"
            : "application/rdf+xml",
        });
      } catch (error) {
        if (error.code === "ENOENT") {
          unavailableImports.add(importIri);
          continue;
        }
        throw error;
      }
      capturedByPath.set(resolve(sourcePath), importedInput);
      if (capturedByPath.size > 256)
        throw new RangeError("Generation import limit exceeded.");
      inputs.push(importedInput);
      const [rendered] = await renderOntologyAssetsWithWorkers({
        inputs: [importedInput],
        workerCount: 1,
        requestedAssetKinds: ["query_index"],
      });
      renderedIndexes.push(rendered);
    }
  }
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

  const releaseArtifacts = await Promise.all(
    renderedIndexes.map(async (renderedIndex, index) => {
      const input = inputs[index];
      // The worker crosses a structured-clone boundary. Reparse its exact bytes
      // here so schema, canonicalization, and publisher identity cannot drift.
      const queryIndex = parseOntologyReleaseQueryIndexBytes(
        renderedIndex.queryIndexContent,
      );
      requireMatchingReleaseIdentity(queryIndex, input);
      const deterministicContent = Buffer.from(
        serializeCanonicalOntologyQueryJsonDocument(queryIndex),
      );

      assertArtifactByteLength({
        artifactKind: `ontology release query index for "${input.outputPath}"`,
        content: deterministicContent,
        maximumByteLength: MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH,
      });

      const queryIndexSha256 = await calculateSha256(deterministicContent);
      const queryIndexRelativePath =
        `releases/${input.ontologyArtifactFamilyId}/${input.versionTag}/` +
        `${queryIndexSha256}.json`;
      const datasetSha256 = await calculateSha256(renderedIndex.datasetContent);
      const datasetRelativePath = `datasets/${datasetSha256}.nq`;

      return {
        content: deterministicContent,
        datasetContent: renderedIndex.datasetContent,
        catalogRelease: {
          activePublication:
            ownershipInventory?.modules.some(
              (module) =>
                module.activeContentDigest === `sha256:${input.sourceSha256}` &&
                module.activeArtifactPath === `src/${input.outputPath}`,
            ) ?? false,
          ownedNamespaces:
            ownershipInventory?.modules.find(
              (module) =>
                module.ontologyIri ===
                queryIndex.resolvedOntologyRelease.ontologyIri,
            )?.ownedNamespaces ?? [],
          ownershipPolicySha256: ownershipInventory?.sha256 ?? null,
          snapshotId: input.snapshotId,
          dataset: {
            relativePath: datasetRelativePath,
            sha256: datasetSha256,
            byteLength: renderedIndex.datasetContent.byteLength,
            quadCount: renderedIndex.datasetQuadCount,
          },
          declaredImports: renderedIndex.declaredImports,
          importCoverage: {
            catalogSha256: sourceCatalog?.sha256 ?? null,
            resolved: renderedIndex.declaredImports.flatMap((importIri) => {
              const path = sourceCatalog?.bindings.get(importIri);
              const target = path
                ? capturedByPath.get(resolve(path))
                : inputs.find(
                    ({ sourceArtifactUrl }) => sourceArtifactUrl === importIri,
                  );
              return target
                ? [{ importIri, snapshotId: target.snapshotId }]
                : [];
            }),
            unresolved: renderedIndex.declaredImports
              .filter((importIri) => {
                const path = sourceCatalog?.bindings.get(importIri);
                return !(path
                  ? capturedByPath.has(resolve(path))
                  : inputs.some(
                      ({ sourceArtifactUrl }) =>
                        sourceArtifactUrl === importIri,
                    ));
              })
              .map((importIri) => ({
                importIri,
                reason: unavailableImports.has(importIri)
                  ? "file_unavailable"
                  : "not_catalogued",
              })),
          },
          ontologyIri: queryIndex.resolvedOntologyRelease.ontologyIri,
          versionIri: queryIndex.resolvedOntologyRelease.versionIri,
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
          queryIndexByteLength: deterministicContent.byteLength,
        },
      };
    }),
  );

  const catalog = freezeJsonValueDeeply(
    OntologyQueryCatalogSchema.parse({
      queryArtifactKind: "universal_ontology_query_catalog",
      queryArtifactFormatVersion: 2,
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
  const catalogContent = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(catalog),
  );

  assertArtifactByteLength({
    artifactKind: "ontology query catalog",
    content: catalogContent,
    maximumByteLength: MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  });
  const catalogSha256 = await calculateSha256(catalogContent);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;

  const artifactContentsByRelativePath = new Map(
    releaseArtifacts.map(({ catalogRelease, content }) => [
      catalogRelease.queryIndexRelativePath,
      content,
    ]),
  );
  for (const { catalogRelease, datasetContent } of releaseArtifacts) {
    artifactContentsByRelativePath.set(
      catalogRelease.dataset.relativePath,
      datasetContent,
    );
  }
  // Immutable indexes precede the immutable catalog that references them. The
  // discovery path is last so readers observe the new graph only
  // after every content-addressed object is available.
  artifactContentsByRelativePath.set(catalogRelativePath, catalogContent);
  artifactContentsByRelativePath.set("catalog.json", catalogContent);

  return {
    catalog,
    catalogContent,
    catalogSha256,
    catalogRelativePath,
    artifactContentsByRelativePath,
    async assertSourcesUnchanged() {
      await sourceCatalog?.assertUnchanged?.();
      await ownershipInventory?.assertUnchanged?.();
      for (const input of inputs) {
        if (
          (await calculateSha256(await captureSource(input.sourcePath))) !==
          input.sourceSha256
        ) {
          throw new Error(
            "Ontology source changed during generation; catalog was not published.",
          );
        }
      }
    },
  };
}
