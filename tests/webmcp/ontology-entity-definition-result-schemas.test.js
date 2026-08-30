import {
  MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES,
  MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS,
  MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS,
  ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE,
  ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE,
  ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
  OntologyEntityDefinitionResultSchema,
} from "../../src/webmcp/ontologyEntityDefinitionResultSchemas.js";

const DISPLAYED_ONTOLOGY_RELEASE = {
  ontologyArtifactFamilyId: "universal/core",
  versionTag: "20260714",
  ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
  ontologyTitle: "Hadden Industries Universal Core Ontology",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260714",
  versionInfo: "2026-07-14",
  priorVersionIri:
    "https://haddenindustries.com/ontology/universal/core/20260625",
  ontologyDocumentIri:
    "https://haddenindustries.com/ontology/universal/core/latest",
  documentVersionAlias: "latest",
  sourceArtifactUrl:
    "https://haddenindustries.com/ontology/universal/core/20260714",
  sourceArtifactSha256: "a".repeat(64),
};

const SELECTED_PREFERRED_LABEL = {
  assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
  literalValue: {
    lexicalForm: "Person",
    datatypeIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    languageTag: "en",
  },
  selectionBasis: "preferred_language_exact",
};

const SELECTED_LEXICAL_DEFINITION = {
  assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
  literalValue: {
    lexicalForm: "A natural or legal person recognised by law.",
    datatypeIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    languageTag: "en-gb",
  },
  selectionBasis: "preferred_language_exact",
};

function createResolvedResult() {
  return {
    resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
    status: "resolved",
    requestedEntityReference: "Person",
    matchedBy: "preferred_label",
    displayedOntologyRelease: DISPLAYED_ONTOLOGY_RELEASE,
    ontologyEntity: {
      entityIri: "https://haddenindustries.com/ontology/universal/core/Person",
      entityKinds: ["owl_class"],
      uuidUrns: ["urn:uuid:1ef827ec-12a3-43e6-88de-d149d3be2b8e"],
      uuidUrnCount: 1,
      uuidUrnsTruncated: false,
      selectedPreferredLabel: SELECTED_PREFERRED_LABEL,
      selectedLexicalDefinition: SELECTED_LEXICAL_DEFINITION,
      sourceIris: ["urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24"],
      sourceIriCount: 1,
      sourceIrisTruncated: false,
    },
  };
}

function candidate(suffix) {
  return {
    entityIri: `https://example.test/ontology/${suffix}`,
    entityKinds: ["owl_class"],
    preferredLabelLexicalForm: "Example",
  };
}

describe("ontology entity-definition result schemas", () => {
  test("accepts a complete compact resolved result", () => {
    expect(
      OntologyEntityDefinitionResultSchema.parse(createResolvedResult()),
    ).toEqual(createResolvedResult());
  });

  test("accepts the exact five status-arm shapes", () => {
    const commonResolutionFields = {
      resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
      requestedEntityReference: "Example",
      matchedBy: "preferred_label",
      displayedOntologyRelease: DISPLAYED_ONTOLOGY_RELEASE,
    };
    const results = [
      createResolvedResult(),
      {
        ...commonResolutionFields,
        status: "not_found",
      },
      {
        ...commonResolutionFields,
        status: "ambiguous",
        candidateCount: 2,
        candidatesTruncated: false,
        candidates: [candidate("A"), candidate("B")],
      },
      {
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "invalid_input",
        errorCode: "invalid_tool_input",
        message: ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE,
      },
      {
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "invalid_input",
        errorCode: "invalid_entity_reference",
        message: ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE,
      },
      {
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "failure",
        error: {
          errorCode: "QUERY_INDEX_UNAVAILABLE",
          message: "The ontology release query index is unavailable.",
          retryable: true,
        },
      },
    ];

    for (const result of results) {
      expect(() =>
        OntologyEntityDefinitionResultSchema.parse(result),
      ).not.toThrow();
    }
  });

  test.each([
    [
      "an unknown property",
      (result) => {
        result.unexpected = true;
      },
    ],
    [
      "a literal base direction",
      (result) => {
        result.ontologyEntity.selectedLexicalDefinition.literalValue.baseDirection =
          "ltr";
      },
    ],
    [
      "too many ambiguous candidates",
      () => ({
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "ambiguous",
        requestedEntityReference: "Example",
        matchedBy: "preferred_label",
        displayedOntologyRelease: DISPLAYED_ONTOLOGY_RELEASE,
        candidateCount: MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES + 1,
        candidatesTruncated: true,
        candidates: ["A", "B", "C", "D", "E", "F"].map(candidate),
      }),
    ],
    [
      "too many UUID URNs",
      (result) => {
        result.ontologyEntity.uuidUrns = [1, 2, 3, 4, 5, 6].map(
          (number) =>
            `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
        );
        result.ontologyEntity.uuidUrnCount =
          MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS + 1;
        result.ontologyEntity.uuidUrnsTruncated = true;
      },
    ],
    [
      "too many source IRIs",
      (result) => {
        result.ontologyEntity.sourceIris = [1, 2, 3, 4, 5, 6].map(
          (number) => `urn:example:source:${number}`,
        );
        result.ontologyEntity.sourceIriCount =
          MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS + 1;
        result.ontologyEntity.sourceIrisTruncated = true;
      },
    ],
    [
      "a non-canonical uppercase UUID URN",
      (result) => {
        result.ontologyEntity.uuidUrns = [
          "URN:UUID:1EF827EC-12A3-43E6-88DE-D149D3BE2B8E",
        ];
      },
    ],
    [
      "a non-RFC-9562 UUID URN spelling",
      (result) => {
        result.ontologyEntity.uuidUrns = [
          "urn:uuid:{1ef827ec-12a3-43e6-88de-d149d3be2b8e}",
        ];
      },
    ],
    [
      "a source value that is not an absolute IRI",
      (result) => {
        result.ontologyEntity.sourceIris = ["relative/source"];
      },
    ],
    [
      "an unknown failure code",
      () => ({
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "failure",
        error: {
          errorCode: "PRIVATE_UPSTREAM_ERROR",
          message: "Private response body",
          retryable: false,
        },
      }),
    ],
    [
      "duplicate bounded values",
      (result) => {
        result.ontologyEntity.sourceIris = [
          "urn:example:source:a",
          "urn:example:source:a",
        ];
        result.ontologyEntity.sourceIriCount = 2;
      },
    ],
    [
      "out-of-order bounded values",
      (result) => {
        result.ontologyEntity.sourceIris = [
          "urn:example:source:b",
          "urn:example:source:a",
        ];
        result.ontologyEntity.sourceIriCount = 2;
      },
    ],
    [
      "out-of-order UUID URNs",
      (result) => {
        result.ontologyEntity.uuidUrns = [
          "urn:uuid:00000000-0000-4000-8000-000000000002",
          "urn:uuid:00000000-0000-4000-8000-000000000001",
        ];
        result.ontologyEntity.uuidUrnCount = 2;
      },
    ],
    [
      "duplicate entity kinds",
      (result) => {
        result.ontologyEntity.entityKinds = ["owl_class", "owl_class"];
      },
    ],
    [
      "out-of-order entity kinds",
      (result) => {
        result.ontologyEntity.entityKinds = [
          "owl_named_individual",
          "owl_class",
        ];
      },
    ],
    [
      "an inconsistent returned count",
      (result) => {
        result.ontologyEntity.uuidUrnCount = 2;
      },
    ],
    [
      "an inconsistent truncation flag",
      (result) => {
        result.ontologyEntity.sourceIrisTruncated = true;
      },
    ],
    [
      "out-of-order ambiguous candidates",
      () => ({
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "ambiguous",
        requestedEntityReference: "Example",
        matchedBy: "preferred_label",
        displayedOntologyRelease: DISPLAYED_ONTOLOGY_RELEASE,
        candidateCount: 2,
        candidatesTruncated: false,
        candidates: [candidate("B"), candidate("A")],
      }),
    ],
    [
      "an invalid-input code paired with the wrong message",
      () => ({
        resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
        status: "invalid_input",
        errorCode: "invalid_tool_input",
        message: ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE,
      }),
    ],
  ])("rejects %s", (_description, change) => {
    const result = structuredClone(createResolvedResult());
    const changedResult = change(result) ?? result;

    expect(() =>
      OntologyEntityDefinitionResultSchema.parse(changedResult),
    ).toThrow();
  });
});
