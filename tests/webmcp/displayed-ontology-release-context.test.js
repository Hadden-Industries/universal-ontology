import { tryCreateDisplayedOntologyReleaseContext } from "../../src/webmcp/tryCreateDisplayedOntologyReleaseContext.js";

const ONTOLOGY_PAGE_ROOT_IRI = "https://example.test/ontology/";

function createMetadata(overrides = {}) {
  return {
    ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
    ontologyTitle: "Hadden Industries Universal Core Ontology",
    versionIri: "https://haddenindustries.com/ontology/universal/core/20260714",
    versionInfo: "2026-07-14",
    priorVersionIri:
      "https://haddenindustries.com/ontology/universal/core/20260625",
    modifiedAt: "2026-07-14",
    ...overrides,
  };
}

function createContext(overrides = {}) {
  return tryCreateDisplayedOntologyReleaseContext({
    ontologyDocumentMetadata: createMetadata(),
    ontologyDocumentIri:
      "https://example.test/ontology/universal/core/20260714",
    ontologyPageRootIri: ONTOLOGY_PAGE_ROOT_IRI,
    ...overrides,
  });
}

describe("displayed ontology release context", () => {
  test.each([
    ["20260714", null],
    ["latest", "latest"],
    ["latest-unstable", "latest-unstable"],
  ])("maps the %s document to its exact authored release", (segment, alias) => {
    const ontologyDocumentIri = `https://example.test/ontology/universal/core/${segment}`;
    const context = createContext({ ontologyDocumentIri });

    expect(context).toEqual({
      ontologyArtifactFamilyId: "universal/core",
      versionTag: "20260714",
      ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
      ontologyTitle: "Hadden Industries Universal Core Ontology",
      versionIri:
        "https://haddenindustries.com/ontology/universal/core/20260714",
      versionInfo: "2026-07-14",
      priorVersionIri:
        "https://haddenindustries.com/ontology/universal/core/20260625",
      ontologyDocumentIri,
      documentVersionAlias: alias,
    });
    expect(Object.isFrozen(context)).toBe(true);
  });

  test("normalizes absent optional authored metadata to null", () => {
    const context = createContext({
      ontologyDocumentMetadata: createMetadata({
        ontologyTitle: "",
        versionInfo: undefined,
        priorVersionIri: null,
      }),
    });

    expect(context).toMatchObject({
      ontologyTitle: null,
      versionInfo: null,
      priorVersionIri: null,
    });
  });

  test.each(["latest-preview", "20260714-full"])(
    "returns null for unindexed document variant %s before requiring metadata",
    (documentSegment) => {
      expect(
        createContext({
          ontologyDocumentMetadata: {},
          ontologyDocumentIri: `https://example.test/ontology/universal/core/${documentSegment}`,
        }),
      ).toBeNull();
    },
  );

  test.each([
    ["missing ontology IRI", { ontologyIri: null }],
    ["missing version IRI", { versionIri: null }],
    ["relative ontology IRI", { ontologyIri: "universal/core" }],
    ["relative version IRI", { versionIri: "20260714" }],
    ["relative prior version IRI", { priorVersionIri: "20260625" }],
    [
      "invalid version-IRI final segment",
      {
        versionIri:
          "https://haddenindustries.com/ontology/universal/core/latest",
      },
    ],
  ])("rejects %s on an otherwise eligible document", (_name, override) => {
    expect(() =>
      createContext({ ontologyDocumentMetadata: createMetadata(override) }),
    ).toThrow();
  });

  test("rejects a dated document whose segment differs from the authored version", () => {
    expect(() =>
      createContext({
        ontologyDocumentIri:
          "https://example.test/ontology/universal/core/20260625",
      }),
    ).toThrow(/does not match/u);
  });

  test.each([
    [
      "a relative document IRI",
      "universal/core/20260714",
      ONTOLOGY_PAGE_ROOT_IRI,
    ],
    [
      "a page outside the root path",
      "https://example.test/elsewhere/universal/core/20260714",
      ONTOLOGY_PAGE_ROOT_IRI,
    ],
    [
      "a non-HTTP root",
      "https://example.test/ontology/universal/core/20260714",
      "file:///ontology/",
    ],
    [
      "a cross-origin root",
      "https://example.test/ontology/universal/core/20260714",
      "https://other.test/ontology/",
    ],
    [
      "a credentialed root",
      "https://example.test/ontology/universal/core/20260714",
      "https://user:secret@example.test/ontology/",
    ],
    [
      "a query-bearing root",
      "https://example.test/ontology/universal/core/20260714",
      "https://example.test/ontology/?view=source",
    ],
    [
      "a fragment-bearing root",
      "https://example.test/ontology/universal/core/20260714",
      "https://example.test/ontology/#source",
    ],
    [
      "a non-slash-terminated root",
      "https://example.test/ontology/universal/core/20260714",
      "https://example.test/ontology",
    ],
    [
      "a family with no segment",
      "https://example.test/ontology/20260714",
      ONTOLOGY_PAGE_ROOT_IRI,
    ],
  ])("rejects %s", (_name, ontologyDocumentIri, ontologyPageRootIri) => {
    expect(() =>
      createContext({ ontologyDocumentIri, ontologyPageRootIri }),
    ).toThrow();
  });
});
