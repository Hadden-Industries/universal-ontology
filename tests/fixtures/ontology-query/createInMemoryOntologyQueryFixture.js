import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { parseRdfXmlToQuads } from "../../../scripts/rdfXmlToJsonLd.js";
import { createOntologyReleaseQueryIndex } from "../../../src/ontologyQuery/createOntologyReleaseQueryIndex.js";

const MINIMAL_ONTOLOGY_RELEASE_URL = new URL(
  "./minimal-ontology-release",
  import.meta.url,
);

/**
 * Serializes a query artifact exactly as the production publisher does.
 * Tests reuse these bytes so digest verification exercises the real contract.
 */
export function serializeOntologyQueryArtifact(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
}

/** Returns the lowercase SHA-256 hexadecimal form used by catalog entries. */
export function calculateOntologyQueryArtifactSha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Builds one deterministic, content-addressed release artifact from the shared
 * RDF/XML fixture without bypassing the production index projection.
 */
export async function createInMemoryOntologyReleaseArtifact({
  ontologyArtifactFamilyId,
  versionTag,
  latestStableRelease = true,
  transformIndex,
}) {
  const rdfXml = await readFile(MINIMAL_ONTOLOGY_RELEASE_URL);
  const sourceArtifactRelativePath = `${ontologyArtifactFamilyId}/${versionTag}`;
  const sourceArtifactUrl = `https://example.com/ontology/${sourceArtifactRelativePath}`;
  const quads = await parseRdfXmlToQuads({
    rdfXml,
    sourceName: sourceArtifactRelativePath,
  });
  const projectedIndex = createOntologyReleaseQueryIndex({
    quads: [...quads],
    ontologyArtifactFamilyId,
    versionTag,
    sourceArtifactRelativePath,
    sourceArtifactUrl,
    sourceArtifactSha256: calculateOntologyQueryArtifactSha256(rdfXml),
  });
  const index = transformIndex
    ? transformIndex(JSON.parse(JSON.stringify(projectedIndex)))
    : projectedIndex;
  const indexBytes = serializeOntologyQueryArtifact(index);
  const queryIndexSha256 = calculateOntologyQueryArtifactSha256(indexBytes);
  const queryIndexRelativePath =
    `releases/${ontologyArtifactFamilyId}/${versionTag}/` +
    `${queryIndexSha256}.json`;

  return {
    catalogRelease: {
      ontologyArtifactFamilyId,
      versionTag,
      latestStableRelease,
      sourceArtifactRelativePath,
      sourceArtifactUrl,
      sourceArtifactSha256: index.resolvedOntologyRelease.sourceArtifactSha256,
      queryIndexRelativePath,
      queryIndexSha256,
    },
    queryIndexRelativePath,
    indexBytes,
  };
}

/**
 * Creates a byte-repository test double around real serialized artifacts.
 * Overrides are limited to repository boundaries so query behavior stays real.
 */
export function createInMemoryOntologyReleaseIndexRepository(
  releaseArtifacts,
  overrides = {},
) {
  const catalog = {
    queryArtifactKind: "universal_ontology_query_catalog",
    queryArtifactFormatVersion: 1,
    releases: releaseArtifacts.map(({ catalogRelease }) => catalogRelease),
  };
  const indexBytesByPath = new Map(
    releaseArtifacts.map(({ queryIndexRelativePath, indexBytes }) => [
      queryIndexRelativePath,
      indexBytes,
    ]),
  );
  const readCounts = new Map();

  return {
    readCounts,
    repository: {
      async readOntologyQueryCatalog({ signal } = {}) {
        signal?.throwIfAborted();

        if (overrides.beforeCatalogRead) {
          await overrides.beforeCatalogRead({ signal });
        }

        if (overrides.catalogError) {
          throw overrides.catalogError;
        }

        signal?.throwIfAborted();
        return (
          overrides.catalogBytes ?? serializeOntologyQueryArtifact(catalog)
        );
      },
      async readOntologyReleaseQueryIndex({ relativePath, signal }) {
        signal?.throwIfAborted();
        readCounts.set(relativePath, (readCounts.get(relativePath) ?? 0) + 1);

        if (overrides.beforeIndexRead) {
          await overrides.beforeIndexRead({ relativePath, signal });
        }

        if (overrides.indexError) {
          throw overrides.indexError;
        }

        signal?.throwIfAborted();
        return overrides.indexBytes ?? indexBytesByPath.get(relativePath);
      },
    },
  };
}
