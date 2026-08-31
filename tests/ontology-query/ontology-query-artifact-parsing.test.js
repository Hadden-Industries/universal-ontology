import {
  calculateSha256,
  serializeCanonicalOntologyQueryJsonDocument,
  verifyCanonicalArtifactReference,
} from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import {
  parseOntologyQueryCatalogBytes,
  parseOntologyReleaseQueryIndexBytes,
} from "../../src/ontologyQuery/ontologyQueryArtifactParsing.js";

const SHA_256_A = "a".repeat(64);
const SHA_256_B = "b".repeat(64);
const XSD_STRING_IRI = "http://www.w3.org/2001/XMLSchema#string";

function createCatalogDocument() {
  return {
    queryArtifactKind: "universal_ontology_query_catalog",
    queryArtifactFormatVersion: 1,
    releases: [
      {
        ontologyArtifactFamilyId: "universal/core",
        versionTag: "20260830",
        latestStableRelease: true,
        sourceArtifactRelativePath: "universal/core/20260830",
        sourceArtifactUrl:
          "https://example.com/ontology/universal/core/20260830",
        sourceArtifactSha256: SHA_256_A,
        queryIndexRelativePath: `releases/universal/core/20260830/${SHA_256_B}.json`,
        queryIndexSha256: SHA_256_B,
      },
    ],
  };
}

function createReleaseIndexDocument() {
  const resolvedOntologyRelease = {
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260830",
    sourceArtifactUrl: "https://example.com/ontology/universal/core/20260830",
    sourceArtifactSha256: SHA_256_A,
    ontologyIri: "https://example.com/ontology/universal/core",
    versionIri: "https://example.com/ontology/universal/core/20260830",
  };

  return {
    queryArtifactKind: "universal_ontology_release_query_index",
    queryArtifactFormatVersion: 1,
    resolvedOntologyRelease,
    ontologyEntityDescriptions: [
      {
        entityIri: "https://example.com/ontology/universal/core/Person",
        resolvedOntologyRelease: { ...resolvedOntologyRelease },
        assertionScope: "source_artifact_graph",
        entityKinds: ["owl_class"],
        identifierAssertions: [
          {
            assertionPropertyIri: "http://purl.org/dc/terms/identifier",
            objectValue: {
              termKind: "literal",
              value: {
                lexicalForm: "0123",
                datatypeIri: XSD_STRING_IRI,
                languageTag: null,
              },
            },
            assertionAnnotations: [
              {
                annotationPropertyIri: "http://purl.org/dc/terms/source",
                annotationValue: {
                  termKind: "named_node",
                  iri: "https://example.com/standards/person",
                },
              },
            ],
          },
        ],
        creatorAssertions: [],
        preferredLabelAssertions: [
          {
            assertionPropertyIri:
              "http://www.w3.org/2004/02/skos/core#prefLabel",
            literalValue: {
              lexicalForm: "Person",
              datatypeIri: XSD_STRING_IRI,
              languageTag: null,
            },
            assertionAnnotations: [],
          },
        ],
        alternativeLabelAssertions: [],
        lexicalDefinitionAssertions: [],
        scopeNoteAssertions: [],
        entitySourceIris: [],
        seeAlsoIris: [],
        directNamedSuperclassIris: [],
        assertedClassMembershipIris: ["http://www.w3.org/2002/07/owl#Class"],
      },
    ],
  };
}

function reverseObjectPropertyOrder(value) {
  if (Array.isArray(value)) {
    return value.map(reverseObjectPropertyOrder);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, child]) => [key, reverseObjectPropertyOrder(child)]),
    );
  }

  return value;
}

function serializeWithoutCanonicalization(document, indentation = 2) {
  return Buffer.from(
    `${JSON.stringify(document, null, indentation)}\n`,
    "utf8",
  );
}

function expectUnsupportedArtifact(callback, message) {
  let capturedError;

  try {
    callback();
  } catch (error) {
    capturedError = error;
  }

  expect(capturedError).toMatchObject({
    name: "OntologyQueryError",
    errorCode: "QUERY_INDEX_SCHEMA_UNSUPPORTED",
    message,
    retryable: false,
  });
}

describe("canonical ontology query-artifact bytes", () => {
  test("serializes schema-declared object fields independently of caller insertion order", () => {
    const document = createReleaseIndexDocument();
    const reorderedDocument = reverseObjectPropertyOrder(document);

    expect(
      Buffer.from(
        serializeCanonicalOntologyQueryJsonDocument(reorderedDocument),
      ),
    ).toEqual(
      Buffer.from(serializeCanonicalOntologyQueryJsonDocument(document)),
    );
  });

  test("rejects undeclared variable-key mappings instead of relying on JavaScript property enumeration", () => {
    const document = {
      ...createReleaseIndexDocument(),
      ontologyEntityDescriptionByNumericIdentifier: {
        10: "https://example.com/ontology/universal/core/Ten",
        2: "https://example.com/ontology/universal/core/Two",
      },
    };

    expect(() =>
      serializeCanonicalOntologyQueryJsonDocument(document),
    ).toThrow();
  });

  test("calculates and verifies the reference over the exact canonical bytes", async () => {
    const bytes = serializeCanonicalOntologyQueryJsonDocument(
      createCatalogDocument(),
    );
    const sha256 = await calculateSha256(bytes);

    await expect(
      verifyCanonicalArtifactReference({
        bytes,
        expectedByteLength: bytes.byteLength,
        expectedSha256: sha256,
      }),
    ).resolves.toBeUndefined();

    await expect(
      verifyCanonicalArtifactReference({
        bytes,
        expectedByteLength: bytes.byteLength + 1,
        expectedSha256: sha256,
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
      retryable: false,
    });

    await expect(
      verifyCanonicalArtifactReference({
        bytes,
        expectedByteLength: bytes.byteLength,
        expectedSha256: "0".repeat(64),
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
      retryable: false,
    });
  });
});

describe("ontology query-artifact parsing", () => {
  test("rejects malformed UTF-8 and invalid JSON before schema validation", () => {
    expectUnsupportedArtifact(
      () => parseOntologyQueryCatalogBytes(Uint8Array.from([0xc3, 0x28])),
      "The ontology query-index catalog is not valid UTF-8 JSON.",
    );
    expectUnsupportedArtifact(
      () =>
        parseOntologyReleaseQueryIndexBytes(
          Buffer.from("{not-json}\n", "utf8"),
        ),
      "The ontology release query index is not valid UTF-8 JSON.",
    );
  });

  test("rejects the wrong artifact kind or format version before strict schema parsing", () => {
    expectUnsupportedArtifact(
      () =>
        parseOntologyQueryCatalogBytes(
          serializeWithoutCanonicalization({
            queryArtifactKind: "universal_ontology_release_query_index",
            queryArtifactFormatVersion: 1,
          }),
        ),
      "The ontology query-index catalog format is unsupported.",
    );
    expectUnsupportedArtifact(
      () =>
        parseOntologyReleaseQueryIndexBytes(
          serializeWithoutCanonicalization({
            ...createReleaseIndexDocument(),
            queryArtifactFormatVersion: 2,
          }),
        ),
      "The ontology release query-index format is unsupported.",
    );
  });

  test("rejects properties outside the strict artifact schema", () => {
    expectUnsupportedArtifact(
      () =>
        parseOntologyQueryCatalogBytes(
          serializeWithoutCanonicalization({
            ...createCatalogDocument(),
            undocumentedReleaseLookup: {},
          }),
        ),
      "The ontology query-index catalog schema is unsupported.",
    );
  });

  test.each([
    [
      "compact whitespace",
      () => Buffer.from(`${JSON.stringify(createCatalogDocument())}\n`, "utf8"),
    ],
    [
      "reordered properties",
      () =>
        serializeWithoutCanonicalization(
          reverseObjectPropertyOrder(createCatalogDocument()),
        ),
    ],
    [
      "a missing terminal newline",
      () =>
        Buffer.from(
          serializeCanonicalOntologyQueryJsonDocument(createCatalogDocument()),
        ).subarray(0, -1),
    ],
    [
      "more than one terminal newline",
      () =>
        Buffer.concat([
          Buffer.from(
            serializeCanonicalOntologyQueryJsonDocument(
              createCatalogDocument(),
            ),
          ),
          Buffer.from("\n", "utf8"),
        ]),
    ],
  ])("rejects noncanonical bytes with %s", (_description, createBytes) => {
    expectUnsupportedArtifact(
      () => parseOntologyQueryCatalogBytes(createBytes()),
      "The ontology query-index catalog bytes are not canonical.",
    );
  });

  test("returns recursively immutable artifacts from canonical bytes", () => {
    const bytes = serializeCanonicalOntologyQueryJsonDocument(
      createReleaseIndexDocument(),
    );
    const parsed = parseOntologyReleaseQueryIndexBytes(bytes);
    const [description] = parsed.ontologyEntityDescriptions;

    expect(parsed).toEqual(createReleaseIndexDocument());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.ontologyEntityDescriptions)).toBe(true);
    expect(Object.isFrozen(description)).toBe(true);
    expect(
      Object.isFrozen(description.identifierAssertions[0].objectValue),
    ).toBe(true);
  });
});
