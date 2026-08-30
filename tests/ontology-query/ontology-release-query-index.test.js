import {
  AbsoluteIriSchema,
  Bcp47LanguageTagSchema,
  OntologyEntitySchema,
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
  RDF_LANG_STRING_DATATYPE_IRI,
  RdfLiteralValueSchema,
  ResolveOntologyEntityInputSchema,
  SearchOntologyEntitiesInputSchema,
  XSD_STRING_DATATYPE_IRI,
  OntologyVersionTagSchema,
  UuidUrnSchema,
  parseOntologyArtifactFamilyId,
  parseResolveOntologyEntityInput,
  parseSearchOntologyEntitiesInput,
} from "../../src/ontologyQuery/ontologyQuerySchemas.js";
import * as z from "zod";

describe("ontology query schemas", () => {
  test("accepts only normalized relative POSIX ontology artifact family IDs", () => {
    expect(parseOntologyArtifactFamilyId("universal/core")).toBe(
      "universal/core",
    );

    for (const invalidFamilyId of [
      "",
      "/universal/core",
      "universal/core/",
      "universal//core",
      "universal/./core",
      "universal/../core",
      "universal\\core",
    ]) {
      expect(() => parseOntologyArtifactFamilyId(invalidFamilyId)).toThrow();
    }
  });

  test("validates release tags, absolute IRIs, UUID URNs, and BCP 47 tags", () => {
    expect(OntologyVersionTagSchema.parse("20240229")).toBe("20240229");
    expect(OntologyVersionTagSchema.parse("v12")).toBe("v12");
    expect(() => OntologyVersionTagSchema.parse("20230229")).toThrow();
    expect(() => OntologyVersionTagSchema.parse("v0")).toThrow();

    expect(
      AbsoluteIriSchema.parse("urn:uuid:550E8400-E29B-41D4-A716-446655440000"),
    ).toBe("urn:uuid:550E8400-E29B-41D4-A716-446655440000");
    expect(() => AbsoluteIriSchema.parse("relative/path")).toThrow();

    const authoredUuidUrn = "URN:UUID:550E8400-E29B-41D4-A716-446655440000";
    expect(UuidUrnSchema.parse(authoredUuidUrn)).toBe(authoredUuidUrn);
    expect(() => UuidUrnSchema.parse("urn:uuid:not-a-uuid")).toThrow();

    for (const languageTag of ["en", "en-GB", "zh-Hant-TW"]) {
      expect(Bcp47LanguageTagSchema.parse(languageTag)).toBe(languageTag);
    }
    expect(() => Bcp47LanguageTagSchema.parse("en_GB")).toThrow();
  });

  test("validates raw search text before trimming and freezes parsed input", () => {
    expect(() => parseSearchOntologyEntitiesInput({ queryText: "" })).toThrow();
    expect(() =>
      parseSearchOntologyEntitiesInput({ queryText: "   " }),
    ).toThrow();

    const parsed = parseSearchOntologyEntitiesInput({
      queryText: "  Person  ",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
      entityKinds: ["owl_class", "owl_named_individual"],
    });

    // Input parsing applies schema defaults, but query-text trimming belongs to
    // the public query-method boundary and therefore has not happened yet.
    expect(parsed).toEqual({
      queryText: "  Person  ",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
      entityKinds: ["owl_class", "owl_named_individual"],
      preferredLanguageTags: ["en-GB", "en"],
      maximumResultCount: 10,
    });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.ontologyReleaseSelection)).toBe(true);
    expect(Object.isFrozen(parsed.preferredLanguageTags)).toBe(true);

    expect(
      parseSearchOntologyEntitiesInput({ queryText: "x".repeat(256) })
        .queryText,
    ).toHaveLength(256);
    expect(() =>
      parseSearchOntologyEntitiesInput({ queryText: ` ${"x".repeat(256)}` }),
    ).toThrow();
    expect(() =>
      parseSearchOntologyEntitiesInput({
        queryText: "Person",
        entityKinds: ["owl_class", "owl_class"],
      }),
    ).toThrow();
    expect(() =>
      parseSearchOntologyEntitiesInput({
        queryText: "Person",
        unexpected: true,
      }),
    ).toThrow();
  });

  test("validates typed resolution identifiers without guessing their kind", () => {
    expect(
      parseResolveOntologyEntityInput({
        entityIdentifier: {
          identifierKind: "entity_iri",
          identifierValue: "https://example.com/ontology/Person",
        },
      }),
    ).toMatchObject({
      entityIdentifier: {
        identifierKind: "entity_iri",
        identifierValue: "https://example.com/ontology/Person",
      },
      preferredLanguageTags: ["en-GB", "en"],
    });

    expect(() =>
      parseResolveOntologyEntityInput({
        entityIdentifier: {
          identifierKind: "uuid_urn",
          identifierValue: "https://example.com/not-a-uuid",
        },
      }),
    ).toThrow();
  });

  test("converts both public input schemas to JSON Schema 2020-12", () => {
    for (const schema of [
      SearchOntologyEntitiesInputSchema,
      ResolveOntologyEntityInputSchema,
    ]) {
      expect(z.toJSONSchema(schema).$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    }

    const searchJsonSchema = z.toJSONSchema(SearchOntologyEntitiesInputSchema);
    expect(searchJsonSchema.properties.queryText).toMatchObject({
      minLength: 1,
      maxLength: 256,
      pattern: "\\S",
    });
  });

  test("enforces the RDF literal datatype and language-tag invariant", () => {
    expect(
      RdfLiteralValueSchema.parse({
        lexicalForm: "Person",
        datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
        languageTag: "en-GB",
      }),
    ).toEqual({
      lexicalForm: "Person",
      datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
      languageTag: "en-GB",
    });
    expect(
      RdfLiteralValueSchema.parse({
        lexicalForm: "plain text",
        datatypeIri: XSD_STRING_DATATYPE_IRI,
        languageTag: null,
      }),
    ).toBeDefined();
    expect(
      RdfLiteralValueSchema.parse({
        lexicalForm: "42",
        datatypeIri: "http://www.w3.org/2001/XMLSchema#integer",
        languageTag: null,
      }),
    ).toBeDefined();

    expect(() =>
      RdfLiteralValueSchema.parse({
        lexicalForm: "missing tag",
        datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
        languageTag: null,
      }),
    ).toThrow();
    expect(() =>
      RdfLiteralValueSchema.parse({
        lexicalForm: "impossible tag",
        datatypeIri: XSD_STRING_DATATYPE_IRI,
        languageTag: "en",
      }),
    ).toThrow();
  });

  test("defines strict discriminated catalog, index, search, and resolution outputs", () => {
    for (const schema of [
      OntologyQueryCatalogSchema,
      OntologyReleaseQueryIndexSchema,
      OntologyEntitySchema,
      OntologyEntitySearchSuccessSchema,
      OntologyEntityResolutionSuccessSchema,
    ]) {
      expect(z.toJSONSchema(schema).$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    }

    expect(() =>
      OntologyQueryCatalogSchema.parse({
        queryArtifactKind: "universal_ontology_query_catalog",
        queryArtifactFormatVersion: 1,
        releases: [],
        unexpected: true,
      }),
    ).toThrow();

    expect(() =>
      OntologyEntityResolutionSuccessSchema.parse({
        outcome: "success",
        resultKind: "ontology_entity_resolution",
        resolutionStatus: "guessed",
      }),
    ).toThrow();
  });
});
