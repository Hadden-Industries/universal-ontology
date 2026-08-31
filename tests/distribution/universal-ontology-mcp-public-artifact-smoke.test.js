import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExpectedPublicPersonSearchResult,
  smokeTestUniversalOntologyMcpPublicArtifactOrigin,
} from "../../scripts/distribution/smokeTestUniversalOntologyMcpPublicArtifactOrigin.js";
import {
  calculateSha256,
  serializeCanonicalOntologyQueryJsonDocument,
} from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { createInMemoryOntologyReleaseArtifact } from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";
import { createOntologyQueryArtifactHttpFixture } from "../fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js";

const EXPECTED_RELEASE = Object.freeze({
  ontologyArtifactFamilyId: "universal/core",
  versionTag: "20260714",
  sourceArtifactUrl:
    "https://haddenindustries.com/ontology/universal/core/20260714",
  sourceArtifactSha256:
    "9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228",
  ontologyIri: "https://haddenindustries.com/ontology/universal/core",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260714",
});
const EXPECTED_PERSON_IRI =
  "https://haddenindustries.com/ontology/universal/core/Person";
const EXPECTED_PERSON_SOURCE_IRI =
  "urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24";
const EXPECTED_PERSON_DEFINITION =
  "A natural or legal person recognised by law.";
const STDIO_SERVER_SCRIPT_PATH = fileURLToPath(
  new URL(
    "../../scripts/runUniversalOntologyMcpStdioServer.js",
    import.meta.url,
  ),
);

async function createPublicPersonArtifactHttpFixture() {
  const httpFixture = await createOntologyQueryArtifactHttpFixture();
  const releaseArtifact = await createInMemoryOntologyReleaseArtifact({
    ontologyArtifactFamilyId: EXPECTED_RELEASE.ontologyArtifactFamilyId,
    versionTag: EXPECTED_RELEASE.versionTag,
  });
  const queryIndex = JSON.parse(releaseArtifact.indexBytes.toString("utf8"));
  queryIndex.resolvedOntologyRelease = { ...EXPECTED_RELEASE };
  for (const entityDescription of queryIndex.ontologyEntityDescriptions) {
    entityDescription.resolvedOntologyRelease = { ...EXPECTED_RELEASE };
  }
  const personDescription = queryIndex.ontologyEntityDescriptions.find(
    ({ entityIri }) => entityIri.endsWith("/Person"),
  );
  personDescription.entityIri = EXPECTED_PERSON_IRI;
  personDescription.preferredLabelAssertions =
    personDescription.preferredLabelAssertions.filter(
      ({ literalValue }) => literalValue.languageTag === "en",
    );
  personDescription.entitySourceIris = [EXPECTED_PERSON_SOURCE_IRI];
  const indexBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(queryIndex),
  );
  const queryIndexSha256 = await calculateSha256(indexBytes);
  const queryIndexRelativePath =
    `releases/${EXPECTED_RELEASE.ontologyArtifactFamilyId}/` +
    `${EXPECTED_RELEASE.versionTag}/${queryIndexSha256}.json`;
  const catalogBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_catalog",
      queryArtifactFormatVersion: 1,
      releases: [
        {
          ...releaseArtifact.catalogRelease,
          sourceArtifactUrl: EXPECTED_RELEASE.sourceArtifactUrl,
          sourceArtifactSha256: EXPECTED_RELEASE.sourceArtifactSha256,
          queryIndexRelativePath,
          queryIndexSha256,
          queryIndexByteLength: indexBytes.byteLength,
        },
      ],
    }),
  );
  const catalogSha256 = await calculateSha256(catalogBytes);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const manifestBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_channel_manifest",
      queryArtifactFormatVersion: 1,
      ontologyQueryArtifactChannelName: "stable",
      ontologyQueryCatalogReference: {
        relativePath: catalogRelativePath,
        sha256: catalogSha256,
        byteLength: catalogBytes.byteLength,
      },
    }),
  );
  httpFixture.setResponse("channels/stable.json", { bodyBytes: manifestBytes });
  httpFixture.setResponse(catalogRelativePath, { bodyBytes: catalogBytes });
  httpFixture.setResponse(queryIndexRelativePath, { bodyBytes: indexBytes });
  return httpFixture;
}

describe("public Universal Ontology MCP artifact-origin smoke", () => {
  test("accepts the exact asserted Person definition and immutable provenance", () => {
    const structuredContent = {
      outcome: "success",
      matches: [
        {
          ontologyEntity: {
            entityIri: EXPECTED_PERSON_IRI,
            selectedPreferredLabel: {
              resolvedOntologyRelease: EXPECTED_RELEASE,
              literalValue: { lexicalForm: "Person", languageTag: "en" },
            },
            selectedLexicalDefinition: {
              resolvedOntologyRelease: EXPECTED_RELEASE,
              literalValue: {
                lexicalForm: EXPECTED_PERSON_DEFINITION,
                languageTag: "en-gb",
              },
            },
            sourceArtifactDescriptions: [
              {
                resolvedOntologyRelease: EXPECTED_RELEASE,
                assertionScope: "source_artifact_graph",
                entityKinds: ["owl_class"],
                entitySourceIris: [EXPECTED_PERSON_SOURCE_IRI],
              },
            ],
          },
        },
      ],
    };

    expect(() =>
      assertExpectedPublicPersonSearchResult({ structuredContent }),
    ).not.toThrow();
  });

  test("rejects a plausible Person response with substituted provenance", () => {
    const structuredContent = {
      outcome: "success",
      matches: [
        {
          ontologyEntity: {
            entityIri: EXPECTED_PERSON_IRI,
            selectedPreferredLabel: {
              resolvedOntologyRelease: EXPECTED_RELEASE,
              literalValue: { lexicalForm: "Person", languageTag: "en" },
            },
            selectedLexicalDefinition: {
              resolvedOntologyRelease: EXPECTED_RELEASE,
              literalValue: {
                lexicalForm: EXPECTED_PERSON_DEFINITION,
                languageTag: "en-gb",
              },
            },
            sourceArtifactDescriptions: [
              {
                resolvedOntologyRelease: {
                  ...EXPECTED_RELEASE,
                  sourceArtifactSha256: "f".repeat(64),
                },
                assertionScope: "source_artifact_graph",
                entityKinds: ["owl_class"],
                entitySourceIris: [EXPECTED_PERSON_SOURCE_IRI],
              },
            ],
          },
        },
      ],
    };

    expect(() =>
      assertExpectedPublicPersonSearchResult({ structuredContent }),
    ).toThrow(/Person|provenance/iu);
  });

  test("runs the same exact gate over a real installed stdio protocol exchange", async () => {
    const temporaryDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-public-smoke-"),
    );
    const httpFixture = await createPublicPersonArtifactHttpFixture();
    try {
      await expect(
        smokeTestUniversalOntologyMcpPublicArtifactOrigin({
          artifactChannelName: "stable",
          artifactBaseUrl: httpFixture.ontologyQueryArtifactBaseUrl,
          cacheDirectoryPath: join(temporaryDirectoryPath, "cache"),
          allowInsecureLoopbackArtifactOrigin: true,
          serverEntryPath: STDIO_SERVER_SCRIPT_PATH,
        }),
      ).resolves.toMatchObject({
        artifactChannelName: "stable",
        entityIri: EXPECTED_PERSON_IRI,
        definitionLexicalForm: EXPECTED_PERSON_DEFINITION,
      });
    } finally {
      await httpFixture.close();
      await nodeFileSystem.rm(temporaryDirectoryPath, {
        recursive: true,
        force: true,
      });
    }
  }, 30_000);
});
