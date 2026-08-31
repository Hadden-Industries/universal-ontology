import { serializeCanonicalOntologyQueryJsonDocument } from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH } from "../../src/ontologyQuery/ontologyQueryArtifactLimits.js";
import { parseOntologyQueryChannelManifestBytes } from "../../src/ontologyQuery/ontologyQueryArtifactParsing.js";
import {
  OntologyQueryArtifactChannelNameSchema,
  OntologyQueryChannelManifestSchema,
} from "../../src/ontologyQuery/ontologyQueryChannelManifestSchemas.js";
import {
  parseContainedOntologyQueryArtifactRelativePath,
  parseOntologyQueryCatalogRelativePath,
  parseOntologyQueryChannelManifestRelativePath,
  parseOntologyReleaseQueryIndexRelativePath,
} from "../../src/ontologyQuery/ontologyQueryArtifactRelativePath.js";

const CATALOG_SHA_256 = "a".repeat(64);
const OTHER_SHA_256 = "b".repeat(64);

function createManifest(overrides = {}) {
  return {
    queryArtifactKind: "universal_ontology_query_channel_manifest",
    queryArtifactFormatVersion: 1,
    ontologyQueryArtifactChannelName: "stable",
    ontologyQueryCatalogReference: {
      relativePath: `catalogs/${CATALOG_SHA_256}.json`,
      sha256: CATALOG_SHA_256,
      byteLength: 1_234,
    },
    ...overrides,
  };
}

describe("ontology query channel-manifest schemas", () => {
  test.each(["stable", "development"])(
    "accepts the exact %s channel vocabulary and wire shape",
    (ontologyQueryArtifactChannelName) => {
      const manifest = createManifest({ ontologyQueryArtifactChannelName });

      expect(
        OntologyQueryArtifactChannelNameSchema.parse(
          ontologyQueryArtifactChannelName,
        ),
      ).toBe(ontologyQueryArtifactChannelName);
      expect(OntologyQueryChannelManifestSchema.parse(manifest)).toEqual(
        manifest,
      );
    },
  );

  test.each([
    "latest",
    "latest_stable_releases",
    "specified_releases",
    "production",
  ])("rejects the unrelated channel or release-selection value %s", (value) => {
    expect(() => OntologyQueryArtifactChannelNameSchema.parse(value)).toThrow();
    expect(() =>
      OntologyQueryChannelManifestSchema.parse(
        createManifest({ ontologyQueryArtifactChannelName: value }),
      ),
    ).toThrow();
  });

  test("is strict at both manifest and catalog-reference levels", () => {
    expect(() =>
      OntologyQueryChannelManifestSchema.parse({
        ...createManifest(),
        promotionTimestamp: "2026-08-31T00:00:00Z",
      }),
    ).toThrow();
    expect(() =>
      OntologyQueryChannelManifestSchema.parse(
        createManifest({
          ontologyQueryCatalogReference: {
            ...createManifest().ontologyQueryCatalogReference,
            etag: '"transport-metadata-is-not-identity"',
          },
        }),
      ),
    ).toThrow();
  });

  test("requires a lowercase digest and the exact matching catalog path", () => {
    const reference = createManifest().ontologyQueryCatalogReference;

    for (const ontologyQueryCatalogReference of [
      {
        ...reference,
        relativePath: `catalogs/${CATALOG_SHA_256.toUpperCase()}.json`,
        sha256: CATALOG_SHA_256.toUpperCase(),
      },
      {
        ...reference,
        relativePath: `catalogs/${OTHER_SHA_256}.json`,
      },
      {
        ...reference,
        relativePath: `catalogs/../${CATALOG_SHA_256}.json`,
      },
      {
        ...reference,
        relativePath: `releases/${CATALOG_SHA_256}.json`,
      },
    ]) {
      expect(() =>
        OntologyQueryChannelManifestSchema.parse(
          createManifest({ ontologyQueryCatalogReference }),
        ),
      ).toThrow();
    }
  });

  test.each([0, -1, 1.5, MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH + 1])(
    "rejects invalid catalog byte length %s",
    (byteLength) => {
      expect(() =>
        OntologyQueryChannelManifestSchema.parse(
          createManifest({
            ontologyQueryCatalogReference: {
              ...createManifest().ontologyQueryCatalogReference,
              byteLength,
            },
          }),
        ),
      ).toThrow();
    },
  );

  test("parses only canonical bytes and recursively freezes the manifest", () => {
    const bytes = serializeCanonicalOntologyQueryJsonDocument(createManifest());
    const parsed = parseOntologyQueryChannelManifestBytes(bytes);

    expect(parsed).toEqual(createManifest());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.ontologyQueryCatalogReference)).toBe(true);

    expect(() =>
      parseOntologyQueryChannelManifestBytes(
        Buffer.from(JSON.stringify(createManifest()), "utf8"),
      ),
    ).toThrow("The ontology query channel-manifest bytes are not canonical.");
  });
});

describe("ontology query-artifact relative paths", () => {
  test("parses normalized contained paths without applying OS path semantics", () => {
    const relativePath = `catalogs/${CATALOG_SHA_256}.json`;
    const segments =
      parseContainedOntologyQueryArtifactRelativePath(relativePath);

    expect(segments).toEqual(["catalogs", `${CATALOG_SHA_256}.json`]);
    expect(Object.isFrozen(segments)).toBe(true);
  });

  test("extracts identities only from exact artifact-specific path shapes", () => {
    expect(
      parseOntologyQueryCatalogRelativePath(`catalogs/${CATALOG_SHA_256}.json`),
    ).toEqual({
      segments: ["catalogs", `${CATALOG_SHA_256}.json`],
      sha256: CATALOG_SHA_256,
    });
    expect(
      parseOntologyQueryChannelManifestRelativePath(
        "channels/development.json",
      ),
    ).toEqual({
      segments: ["channels", "development.json"],
      ontologyQueryArtifactChannelName: "development",
    });
    expect(
      parseOntologyReleaseQueryIndexRelativePath(
        `releases/universal/core/20260830/${OTHER_SHA_256}.json`,
      ),
    ).toEqual({
      segments: [
        "releases",
        "universal",
        "core",
        "20260830",
        `${OTHER_SHA_256}.json`,
      ],
      ontologyArtifactFamilyId: "universal/core",
      versionTag: "20260830",
      sha256: OTHER_SHA_256,
    });
  });

  test.each([
    "",
    "/catalogs/value.json",
    "C:/catalogs/value.json",
    "catalogs\\value.json",
    "catalogs//value.json",
    "catalogs/./value.json",
    "catalogs/../value.json",
  ])("rejects non-contained or non-normalized path %s", (relativePath) => {
    expect(() =>
      parseContainedOntologyQueryArtifactRelativePath(relativePath),
    ).toThrow(
      "The repository relative path must be a normalized contained POSIX path.",
    );
  });

  test("rejects cross-artifact vocabulary and malformed digest paths", () => {
    for (const relativePath of [
      "catalog.json",
      `catalogs/${CATALOG_SHA_256.toUpperCase()}.json`,
      `channels/${CATALOG_SHA_256}.json`,
    ]) {
      expect(() =>
        parseOntologyQueryCatalogRelativePath(relativePath),
      ).toThrow();
    }

    for (const relativePath of [
      "channels/latest_stable_releases.json",
      "channels/stable/manifest.json",
      `catalogs/${CATALOG_SHA_256}.json`,
    ]) {
      expect(() =>
        parseOntologyQueryChannelManifestRelativePath(relativePath),
      ).toThrow();
    }

    for (const relativePath of [
      `releases/universal/core/${OTHER_SHA_256}.json`,
      `releases/universal/core/20260830/${OTHER_SHA_256.toUpperCase()}.json`,
      `catalogs/${OTHER_SHA_256}.json`,
    ]) {
      expect(() =>
        parseOntologyReleaseQueryIndexRelativePath(relativePath),
      ).toThrow();
    }
  });
});
