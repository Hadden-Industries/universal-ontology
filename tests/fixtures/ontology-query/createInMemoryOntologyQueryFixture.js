import { createHash } from "node:crypto";
import rdfCanonize from "rdf-canonize";
import { readFile } from "node:fs/promises";

import { parseRdfXmlToQuads } from "../../../scripts/rdfXmlToJsonLd.js";
import {
  createOntologyReleaseQueryIndex,
  serializeCanonicalOntologyQueryJsonDocument,
} from "universal-ontology-query/artifacts";

const MINIMAL_ONTOLOGY_RELEASE_URL = new URL(
  "./minimal-ontology-release",
  import.meta.url,
);

/**
 * Serializes a query artifact exactly as the production publisher does.
 * Tests reuse these bytes so digest verification exercises the real contract.
 */
export function serializeOntologyQueryArtifact(document) {
  return Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(document),
    "utf8",
  );
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
  transformSource,
}) {
  const sourceBytes = await readFile(MINIMAL_ONTOLOGY_RELEASE_URL);
  const rdfXml = transformSource
    ? Buffer.from(transformSource(sourceBytes.toString("utf8")))
    : sourceBytes;
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
  const indexBytes = transformIndex
    ? Buffer.from(`${JSON.stringify(index, null, 2)}\n`)
    : Buffer.from(serializeCanonicalOntologyQueryJsonDocument(index));
  const datasetBytes = Buffer.from(
    await rdfCanonize.canonize([...quads], { algorithm: "RDFC-1.0" }),
  );
  const datasetSha256 = calculateOntologyQueryArtifactSha256(datasetBytes);
  const snapshotId = `urn:uo:snapshot:${calculateOntologyQueryArtifactSha256(sourceArtifactUrl)}`;
  const queryIndexSha256 = calculateOntologyQueryArtifactSha256(indexBytes);
  const queryIndexRelativePath =
    `releases/${ontologyArtifactFamilyId}/${versionTag}/` +
    `${queryIndexSha256}.json`;

  return {
    catalogRelease: {
      activePublication: false,
      snapshotId,
      ownedNamespaces: ["https://example.com/ontology/test/"],
      ownershipPolicySha256: null,
      dataset: {
        relativePath: `datasets/${datasetSha256}.nq`,
        sha256: datasetSha256,
        byteLength: datasetBytes.length,
        quadCount: quads.length,
      },
      declaredImports: [],
      importCoverage: { catalogSha256: null, resolved: [], unresolved: [] },
      ontologyIri: index.resolvedOntologyRelease.ontologyIri,
      versionIri: index.resolvedOntologyRelease.versionIri,
      ontologyArtifactFamilyId,
      versionTag,
      latestStableRelease,
      sourceArtifactRelativePath,
      sourceArtifactUrl,
      sourceArtifactSha256: index.resolvedOntologyRelease.sourceArtifactSha256,
      queryIndexRelativePath,
      queryIndexSha256,
      queryIndexByteLength: indexBytes.byteLength,
    },
    queryIndexRelativePath,
    indexBytes,
    datasetBytes,
  };
}

/**
 * Creates an ontology query-artifact repository fixture around real bytes.
 * Overrides are limited to repository boundaries so query behavior stays real.
 */
export function createInMemoryOntologyQueryArtifactRepositoryFixture(
  releaseArtifacts,
  overrides = {},
) {
  const catalog = {
    queryArtifactKind: "universal_ontology_query_catalog",
    queryArtifactFormatVersion: 2,
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
    ontologyQueryArtifactRepository: {
      async readOntologyDataset({ relativePath, signal }) {
        signal?.throwIfAborted();
        return releaseArtifacts.find(
          (artifact) =>
            artifact.catalogRelease.dataset.relativePath === relativePath,
        )?.datasetBytes;
      },
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
          overrides.catalogBytes ??
          Buffer.from(serializeCanonicalOntologyQueryJsonDocument(catalog))
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
