import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import * as z from "zod";

import { parseRdfXmlToQuads } from "../../scripts/rdfXmlToJsonLd.js";
import { generateOntologyQueryIndexes } from "../../scripts/generateOntologyQueryIndexes.js";
import { createOntologyReleaseQueryIndex } from "../../src/ontologyQuery/createOntologyReleaseQueryIndex.js";
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

const fixtureUrl = new URL(
  "../fixtures/ontology-query/minimal-ontology-release",
  import.meta.url,
);

async function createMinimalFixtureIndex(quadOrder = (quads) => quads) {
  const rdfXml = await readFile(fixtureUrl);
  const parsedQuads = await parseRdfXmlToQuads({
    rdfXml,
    sourceName: "tests/fixtures/ontology-query/minimal-ontology-release",
  });

  return createOntologyReleaseQueryIndex({
    quads: quadOrder([...parsedQuads]),
    ontologyArtifactFamilyId: "universal/test",
    versionTag: "20260830",
    sourceArtifactRelativePath: "universal/test/20260830",
    sourceArtifactUrl: "https://example.com/ontology/test/20260830",
    sourceArtifactSha256: createHash("sha256").update(rdfXml).digest("hex"),
  });
}

async function readGeneratedFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await readGeneratedFiles(root, path)));
    } else if (entry.isFile()) {
      files.push({
        relativePath: relative(root, path).replaceAll("\\", "/"),
        content: await readFile(path),
      });
    }
  }

  return files.sort(({ relativePath: left }, { relativePath: right }) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

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

describe("ontology release query-index projection", () => {
  test("projects asserted entity semantics without flattening OWL expressions", async () => {
    const index = await createMinimalFixtureIndex();
    const person = index.ontologyEntityDescriptions.find(
      ({ entityIri }) =>
        entityIri === "https://example.com/ontology/test/Person",
    );

    expect(index).toMatchObject({
      queryArtifactKind: "universal_ontology_release_query_index",
      queryArtifactFormatVersion: 1,
      resolvedOntologyRelease: {
        ontologyArtifactFamilyId: "universal/test",
        versionTag: "20260830",
        ontologyIri: "https://example.com/ontology/test",
        versionIri: "https://example.com/ontology/test/20260830",
      },
    });
    expect(person.entityKinds).toEqual(["owl_class"]);
    expect(
      person.preferredLabelAssertions.map(({ literalValue }) => literalValue),
    ).toEqual([
      {
        lexicalForm: "Person",
        datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
        languageTag: "en",
      },
      {
        lexicalForm: "Person",
        datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
        languageTag: "en-gb",
      },
    ]);
    expect(person.alternativeLabelAssertions).toHaveLength(1);
    expect(person.scopeNoteAssertions).toHaveLength(1);
    expect(person.entitySourceIris).toEqual([
      "urn:iso:std:iso:example:term:person",
    ]);
    expect(person.seeAlsoIris).toEqual(["https://example.com/glossary/person"]);
    expect(person.directNamedSuperclassIris).toEqual([
      "https://example.com/ontology/test/Agent",
    ]);

    const annotatedDefinition = person.lexicalDefinitionAssertions.find(
      ({ literalValue }) =>
        literalValue.lexicalForm ===
        "A natural or legal person recognised by law.",
    );
    expect(annotatedDefinition.assertionAnnotations).toEqual([
      {
        annotationPropertyIri: "http://purl.org/dc/terms/source",
        annotationValue: {
          termKind: "named_node",
          iri: "https://example.com/standard/person-definition",
        },
      },
    ]);
    expect(
      person.lexicalDefinitionAssertions.find(
        ({ literalValue }) =>
          literalValue.lexicalForm === "A person with legal standing.",
      ).assertionAnnotations,
    ).toEqual([]);

    const authoredIdentifierValues = person.identifierAssertions.map(
      ({ objectValue }) =>
        objectValue.termKind === "named_node"
          ? objectValue.iri
          : objectValue.value.lexicalForm,
    );
    expect(authoredIdentifierValues).toContain(
      "URN:UUID:550E8400-E29B-41D4-A716-446655440000",
    );
    expect(authoredIdentifierValues).toContain(
      "URN:UUID:550E8400-E29B-41D4-A716-446655440001",
    );

    const role = index.ontologyEntityDescriptions.find(
      ({ entityIri }) => entityIri === "https://example.com/ontology/test/Role",
    );
    expect(role.entityKinds).toEqual(["owl_class", "owl_named_individual"]);
  });

  test("emits the same deterministic object for every input quad order", async () => {
    const forward = await createMinimalFixtureIndex();
    const reversed = await createMinimalFixtureIndex((quads) =>
      quads.reverse(),
    );

    expect(`${JSON.stringify(reversed, null, 2)}\n`).toBe(
      `${JSON.stringify(forward, null, 2)}\n`,
    );
  });

  test("projects the corpus Person definition with exact release provenance", async () => {
    const sourceArtifactRelativePath = "universal/core/20260714";
    const rdfXml = await readFile(
      new URL(`../../src/${sourceArtifactRelativePath}`, import.meta.url),
    );
    const sourceArtifactSha256 = createHash("sha256")
      .update(rdfXml)
      .digest("hex");
    const quads = await parseRdfXmlToQuads({
      rdfXml,
      sourceName: sourceArtifactRelativePath,
    });
    const index = createOntologyReleaseQueryIndex({
      quads: [...quads],
      ontologyArtifactFamilyId: "universal/core",
      versionTag: "20260714",
      sourceArtifactRelativePath,
      sourceArtifactUrl:
        "https://haddenindustries.com/ontology/universal/core/20260714",
      sourceArtifactSha256,
    });
    const person = index.ontologyEntityDescriptions.find(
      ({ entityIri }) =>
        entityIri ===
        "https://haddenindustries.com/ontology/universal/core/Person",
    );

    expect(index.resolvedOntologyRelease.sourceArtifactSha256).toBe(
      sourceArtifactSha256,
    );
    expect(person.entityKinds).toEqual(["owl_class"]);
    expect(
      person.identifierAssertions.map(({ objectValue }) => objectValue),
    ).toContainEqual({
      termKind: "named_node",
      iri: "urn:uuid:1ef827ec-12a3-43e6-88de-d149d3be2b8e",
    });
    expect(
      person.preferredLabelAssertions.map(({ literalValue }) => literalValue),
    ).toContainEqual({
      lexicalForm: "Person",
      datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
      languageTag: "en",
    });
    expect(
      person.lexicalDefinitionAssertions.map(
        ({ literalValue }) => literalValue,
      ),
    ).toContainEqual({
      lexicalForm:
        "Entity, i.e. a natural or legal person, recognised by law as " +
        "having legal rights and duties, able to make commitment(s), " +
        "assume and fulfil resulting obligation(s), and able to be held " +
        "accountable for its action(s)",
      datatypeIri: RDF_LANG_STRING_DATATYPE_IRI,
      languageTag: "en-gb",
    });
    expect(person.entitySourceIris).toContain(
      "urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24",
    );
    expect(person.seeAlsoIris).toContain(
      "https://www.law.cornell.edu/wex/legal_person",
    );
  });

  test("uses declared historical field properties and bounded legacy source interpretations", async () => {
    const rdfXml = Buffer.from(
      `<?xml version="1.0"?>
      <rdf:RDF
        xml:base="https://haddenindustries.com/ontology/universal/core/20260423"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:dcterms="http://purl.org/dc/terms/"
        xmlns:owl="http://www.w3.org/2002/07/owl#"
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <owl:Ontology rdf:about="https://haddenindustries.com/ontology/universal/core">
          <owl:versionIRI rdf:resource="https://haddenindustries.com/ontology/universal/core/20260423" />
        </owl:Ontology>
        <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/HistoricalPerson">
          <dcterms:title xml:lang="en">Historical Person</dcterms:title>
          <dcterms:description xml:lang="en">A historical lexical definition.</dcterms:description>
          <dc:creator rdf:resource="https://example.com/creator" />
          <dcterms:references rdf:resource="urn:iso:std:iso:historical:term:1" />
        </owl:Class>
      </rdf:RDF>`,
      "utf8",
    );
    const quads = await parseRdfXmlToQuads({
      rdfXml,
      sourceName: "historical-core-fixture",
    });

    function projectAt(versionTag) {
      const sourceArtifactRelativePath = `universal/core/${versionTag}`;
      return createOntologyReleaseQueryIndex({
        quads: [...quads],
        ontologyArtifactFamilyId: "universal/core",
        versionTag,
        sourceArtifactRelativePath,
        sourceArtifactUrl: `https://haddenindustries.com/ontology/${sourceArtifactRelativePath}`,
        sourceArtifactSha256: createHash("sha256").update(rdfXml).digest("hex"),
      }).ontologyEntityDescriptions.find(({ entityIri }) =>
        entityIri.endsWith("/HistoricalPerson"),
      );
    }

    const historicalDescription = projectAt("20260423");
    expect(
      historicalDescription.preferredLabelAssertions.map(
        ({ assertionPropertyIri }) => assertionPropertyIri,
      ),
    ).toEqual(["http://purl.org/dc/terms/title"]);
    expect(
      historicalDescription.lexicalDefinitionAssertions.map(
        ({ assertionPropertyIri }) => assertionPropertyIri,
      ),
    ).toEqual(["http://purl.org/dc/terms/description"]);
    expect(
      historicalDescription.creatorAssertions.map(
        ({ assertionPropertyIri }) => assertionPropertyIri,
      ),
    ).toEqual(["http://purl.org/dc/elements/1.1/creator"]);
    expect(historicalDescription.entitySourceIris).toEqual([
      "urn:iso:std:iso:historical:term:1",
    ]);

    expect(projectAt("20260424").entitySourceIris).toEqual([]);
  });
});

describe("ontology query-index generation", () => {
  test("writes deterministic content-addressed release files before a valid catalog", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "uo-query-index-"));
    const sourceDirectory = join(temporaryRoot, "src");
    const firstOutputDirectory = join(temporaryRoot, "first");
    const secondOutputDirectory = join(temporaryRoot, "second");
    const familyDirectory = join(sourceDirectory, "universal", "test");
    const fixtureBytes = await readFile(fixtureUrl);

    try {
      await mkdir(familyDirectory, { recursive: true });
      await writeFile(join(familyDirectory, "20260829"), fixtureBytes);
      await writeFile(join(familyDirectory, "20260830"), fixtureBytes);
      await writeFile(join(familyDirectory, "v1"), fixtureBytes);
      await writeFile(join(familyDirectory, "20260830-full"), fixtureBytes);

      await generateOntologyQueryIndexes({
        sourceDirectory,
        outputDirectory: firstOutputDirectory,
        workerCount: 2,
      });
      await generateOntologyQueryIndexes({
        sourceDirectory,
        outputDirectory: secondOutputDirectory,
        workerCount: 1,
      });

      const firstFiles = await readGeneratedFiles(firstOutputDirectory);
      const secondFiles = await readGeneratedFiles(secondOutputDirectory);
      expect(firstFiles).toEqual(secondFiles);

      const catalogBytes = await readFile(
        join(firstOutputDirectory, "catalog.json"),
      );
      expect(catalogBytes.at(-1)).toBe(0x0a);
      const catalog = OntologyQueryCatalogSchema.parse(
        JSON.parse(catalogBytes.toString("utf8")),
      );
      expect(
        catalog.releases.map(({ versionTag, latestStableRelease }) => ({
          versionTag,
          latestStableRelease,
        })),
      ).toEqual([
        { versionTag: "20260829", latestStableRelease: false },
        { versionTag: "20260830", latestStableRelease: true },
        { versionTag: "v1", latestStableRelease: false },
      ]);
      expect(
        catalog.releases.every(({ queryIndexRelativePath, queryIndexSha256 }) =>
          queryIndexRelativePath.endsWith(`/${queryIndexSha256}.json`),
        ),
      ).toBe(true);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
