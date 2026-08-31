import { createOntologyQueryModule } from "../../src/ontologyQuery/createOntologyQueryModule.js";
import {
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
} from "../../src/ontologyQuery/ontologyQuerySchemas.js";
import {
  createInMemoryOntologyReleaseArtifact as createReleaseArtifact,
  createInMemoryOntologyQueryArtifactRepositoryFixture,
  serializeOntologyQueryArtifact as serialize,
} from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

let defaultReleaseArtifacts;

beforeAll(async () => {
  defaultReleaseArtifacts = await Promise.all(
    ["universal/core", "universal/extended", "universal/reference-data"].map(
      (ontologyArtifactFamilyId) =>
        createReleaseArtifact({
          ontologyArtifactFamilyId,
          versionTag: "20260830",
        }),
    ),
  );
});

describe("ontology query module", () => {
  test("searches default releases and returns the exact selected lexical definition", async () => {
    const { ontologyQueryArtifactRepository } =
      createInMemoryOntologyQueryArtifactRepositoryFixture(
        defaultReleaseArtifacts,
      );
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository,
    });
    const result = await ontologyQuery.searchOntologyEntities({
      queryText: "  Person  ",
      maximumResultCount: 10,
    });

    expect(OntologyEntitySearchSuccessSchema.parse(result)).toEqual(result);
    expect(result.queryText).toBe("Person");
    expect(
      result.resolvedOntologyReleases.map(
        ({ ontologyArtifactFamilyId }) => ontologyArtifactFamilyId,
      ),
    ).toEqual([
      "universal/core",
      "universal/extended",
      "universal/reference-data",
    ]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      matchRank: 1,
      matchBasis: "preferred_label_exact",
      matchedOntologyValue: {
        matchedValueKind: "rdf_literal",
        literalValue: { lexicalForm: "Person" },
      },
      ontologyEntity: {
        entityIri: "https://example.com/ontology/test/Person",
        selectedPreferredLabel: {
          literalValue: { lexicalForm: "Person", languageTag: "en-gb" },
        },
        selectedLexicalDefinition: {
          literalValue: {
            lexicalForm: "A natural or legal person recognised by law.",
            languageTag: "en-gb",
          },
        },
      },
    });
    expect(
      result.matches[0].ontologyEntity.sourceArtifactDescriptions,
    ).toHaveLength(3);
  });

  test("resolves mixed-case UUID URNs without rewriting authored RDF terms", async () => {
    const { ontologyQueryArtifactRepository } =
      createInMemoryOntologyQueryArtifactRepositoryFixture([
        defaultReleaseArtifacts[0],
      ]);
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository,
    });
    const requestedUuidUrn = "urn:uuid:550e8400-e29b-41d4-a716-446655440000";
    const result = await ontologyQuery.resolveOntologyEntity({
      entityIdentifier: {
        identifierKind: "uuid_urn",
        identifierValue: requestedUuidUrn,
      },
      ontologyReleaseSelection: {
        selectionKind: "specified_releases",
        ontologyReleases: [
          {
            ontologyArtifactFamilyId: "universal/core",
            versionTag: "20260830",
          },
          {
            ontologyArtifactFamilyId: "universal/core",
            versionTag: "20260830",
          },
        ],
      },
    });

    expect(OntologyEntityResolutionSuccessSchema.parse(result)).toEqual(result);
    expect(result.resolutionStatus).toBe("found");
    expect(result.resolvedOntologyReleases).toHaveLength(1);
    expect(result.requestedEntityIdentifier.identifierValue).toBe(
      requestedUuidUrn,
    );
    expect(
      result.ontologyEntities[0].sourceArtifactDescriptions[0]
        .identifierAssertions,
    ).toContainEqual(
      expect.objectContaining({
        objectValue: {
          termKind: "named_node",
          iri: "URN:UUID:550E8400-E29B-41D4-A716-446655440000",
        },
      }),
    );
  });

  test("reports actionable unknown-family and unknown-release failures", async () => {
    const { ontologyQueryArtifactRepository } =
      createInMemoryOntologyQueryArtifactRepositoryFixture([
        defaultReleaseArtifacts[0],
      ]);
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository,
    });

    await expect(
      ontologyQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/missing"],
        },
      }),
    ).rejects.toMatchObject({
      name: "OntologyQueryError",
      errorCode: "UNKNOWN_ONTOLOGY_ARTIFACT_FAMILY",
      retryable: false,
    });
    await expect(
      ontologyQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "specified_releases",
          ontologyReleases: [
            {
              ontologyArtifactFamilyId: "universal/core",
              versionTag: "20260829",
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      name: "OntologyQueryError",
      errorCode: "UNKNOWN_ONTOLOGY_RELEASE",
      retryable: false,
    });
  });

  test("rejects unavailable catalogs, unsupported schemas, and index digest mismatches", async () => {
    const releaseArtifacts = [defaultReleaseArtifacts[0]];
    const unavailableQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture(releaseArtifacts, {
          catalogError: new Error("private filesystem path"),
        }).ontologyQueryArtifactRepository,
    });
    await expect(
      unavailableQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/core"],
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
      message: "The ontology query-index catalog is unavailable.",
      retryable: true,
    });

    const unsupportedQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture(releaseArtifacts, {
          catalogBytes: serialize({
            queryArtifactKind: "universal_ontology_query_catalog",
            queryArtifactFormatVersion: 2,
            releases: [],
          }),
        }).ontologyQueryArtifactRepository,
    });
    await expect(
      unsupportedQuery.searchOntologyEntities({ queryText: "Person" }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_SCHEMA_UNSUPPORTED",
      retryable: false,
    });

    const digestMismatchQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture(releaseArtifacts, {
          indexBytes: Buffer.from("{}\n", "utf8"),
        }).ontologyQueryArtifactRepository,
    });
    await expect(
      digestMismatchQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/core"],
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
      retryable: false,
    });

    const unsupportedIndexArtifact = await createReleaseArtifact({
      ontologyArtifactFamilyId: "universal/unsupported-index",
      versionTag: "20260830",
      transformIndex(index) {
        index.queryArtifactFormatVersion = 2;
        return index;
      },
    });
    const unsupportedIndexQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture([
          unsupportedIndexArtifact,
        ]).ontologyQueryArtifactRepository,
    });
    await expect(
      unsupportedIndexQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/unsupported-index"],
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_SCHEMA_UNSUPPORTED",
      retryable: false,
    });

    const mismatchedIdentityArtifact = await createReleaseArtifact({
      ontologyArtifactFamilyId: "universal/mismatched-identity",
      versionTag: "20260830",
      transformIndex(index) {
        index.resolvedOntologyRelease.sourceArtifactUrl =
          "https://example.com/ontology/a-different-release";
        return index;
      },
    });
    const mismatchedIdentityQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture([
          mismatchedIdentityArtifact,
        ]).ontologyQueryArtifactRepository,
    });
    await expect(
      mismatchedIdentityQuery.searchOntologyEntities({
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/mismatched-identity"],
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
      message:
        "Ontology release query-index identity does not match its catalog entry.",
      retryable: false,
    });
  });

  test("rejects malformed UTF-8 catalog bytes before JSON parsing", async () => {
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture(
          [defaultReleaseArtifacts[0]],
          { catalogBytes: Uint8Array.from([0xc3, 0x28]) },
        ).ontologyQueryArtifactRepository,
    });

    await expect(
      ontologyQuery.searchOntologyEntities({ queryText: "Person" }),
    ).rejects.toMatchObject({
      errorCode: "QUERY_INDEX_SCHEMA_UNSUPPORTED",
      message: "The ontology query-index catalog is not valid UTF-8 JSON.",
      retryable: false,
    });
  });

  test("translates pre-I/O cancellation to the stable query error", async () => {
    const { ontologyQueryArtifactRepository, readCounts } =
      createInMemoryOntologyQueryArtifactRepositoryFixture([
        defaultReleaseArtifacts[0],
      ]);
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository,
    });
    const controller = new AbortController();
    controller.abort(new Error("caller stopped"));

    await expect(
      ontologyQuery.searchOntologyEntities(
        {
          queryText: "Person",
          ontologyReleaseSelection: {
            selectionKind: "latest_stable_releases",
            ontologyArtifactFamilyIds: ["universal/core"],
          },
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({
      errorCode: "QUERY_CANCELLED",
      retryable: true,
    });
    expect(readCounts.size).toBe(0);
  });

  test.each([
    ["Person", "preferred_label_exact"],
    ["Legal person", "alternative_label_exact"],
    ["URN:UUID:550E8400-E29B-41D4-A716-446655440000", "identifier_exact"],
    ["LocalOnly", "iri_local_name_exact"],
    ["Pers", "preferred_label_prefix"],
    ["Legal", "alternative_label_prefix"],
    ["erson", "preferred_label_substring"],
    ["egal", "alternative_label_substring"],
    [
      "A natural or legal person recognised by law.",
      "lexical_definition_exact",
    ],
    ["natural law", "lexical_definition_token_coverage"],
    ["recognis", "lexical_definition_substring"],
  ])(
    "uses the specified ranking basis for %s",
    async (queryText, matchBasis) => {
      const artifact = await createReleaseArtifact({
        ontologyArtifactFamilyId: "universal/ranking",
        versionTag: "20260830",
        transformIndex(index) {
          const agent = index.ontologyEntityDescriptions.find(({ entityIri }) =>
            entityIri.endsWith("/Agent"),
          );
          index.ontologyEntityDescriptions.push({
            ...JSON.parse(JSON.stringify(agent)),
            entityIri: "https://example.com/ontology/test/LocalOnly",
            preferredLabelAssertions: [],
          });
          index.ontologyEntityDescriptions.sort(
            ({ entityIri: left }, { entityIri: right }) =>
              left < right ? -1 : left > right ? 1 : 0,
          );
          return index;
        },
      });
      const ontologyQuery = createOntologyQueryModule({
        ontologyQueryArtifactRepository:
          createInMemoryOntologyQueryArtifactRepositoryFixture([artifact])
            .ontologyQueryArtifactRepository,
      });
      const result = await ontologyQuery.searchOntologyEntities({
        queryText,
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/ranking"],
        },
      });

      expect(result.matches[0].matchBasis).toBe(matchBasis);
    },
  );

  test("applies RFC-style language lookup before untagged and deterministic fallbacks", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture([artifact])
          .ontologyQueryArtifactRepository,
    });
    const selection = {
      selectionKind: "latest_stable_releases",
      ontologyArtifactFamilyIds: ["universal/core"],
    };
    const enUsResult = await ontologyQuery.searchOntologyEntities({
      queryText: "Person",
      ontologyReleaseSelection: selection,
      preferredLanguageTags: ["en-US"],
    });
    expect(
      enUsResult.matches[0].ontologyEntity.selectedPreferredLabel,
    ).toMatchObject({
      literalValue: { languageTag: "en" },
      selectionBasis: "preferred_language_lookup",
    });
    expect(
      enUsResult.matches[0].ontologyEntity.selectedLexicalDefinition,
    ).toMatchObject({
      literalValue: { languageTag: null },
      selectionBasis: "untagged",
    });

    const enGbResult = await ontologyQuery.searchOntologyEntities({
      queryText: "Person",
      ontologyReleaseSelection: selection,
      preferredLanguageTags: ["en-GB"],
    });
    expect(
      enGbResult.matches[0].ontologyEntity.selectedLexicalDefinition,
    ).toMatchObject({
      literalValue: { languageTag: "en-gb" },
      selectionBasis: "preferred_language_exact",
    });
  });

  test("returns successful not-found, ambiguous, filtered, truncated, and no-definition states", async () => {
    const ambiguousArtifact = await createReleaseArtifact({
      ontologyArtifactFamilyId: "universal/ambiguous",
      versionTag: "20260830",
      transformIndex(index) {
        const person = index.ontologyEntityDescriptions.find(({ entityIri }) =>
          entityIri.endsWith("/Person"),
        );
        index.ontologyEntityDescriptions.push({
          ...JSON.parse(JSON.stringify(person)),
          entityIri: "https://example.com/ontology/test/SecondPerson",
          identifierAssertions: [],
        });
        index.ontologyEntityDescriptions.sort(
          ({ entityIri: left }, { entityIri: right }) =>
            left < right ? -1 : left > right ? 1 : 0,
        );
        return index;
      },
    });
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createInMemoryOntologyQueryArtifactRepositoryFixture([
          ambiguousArtifact,
        ]).ontologyQueryArtifactRepository,
    });
    const ontologyReleaseSelection = {
      selectionKind: "latest_stable_releases",
      ontologyArtifactFamilyIds: ["universal/ambiguous"],
    };

    const ambiguous = await ontologyQuery.resolveOntologyEntity({
      entityIdentifier: {
        identifierKind: "preferred_label",
        identifierValue: " Person ",
      },
      ontologyReleaseSelection,
    });
    expect(ambiguous.resolutionStatus).toBe("ambiguous");
    expect(ambiguous.ontologyEntities).toHaveLength(2);
    expect(ambiguous.requestedEntityIdentifier.identifierValue).toBe("Person");

    const notFound = await ontologyQuery.resolveOntologyEntity({
      entityIdentifier: {
        identifierKind: "preferred_label",
        identifierValue: "Absent concept",
      },
      ontologyReleaseSelection,
    });
    expect(notFound).toMatchObject({
      resolutionStatus: "not_found",
      ontologyEntities: [],
    });

    const filtered = await ontologyQuery.searchOntologyEntities({
      queryText: "Person",
      ontologyReleaseSelection,
      entityKinds: ["owl_named_individual"],
    });
    expect(filtered.matches).toEqual([]);

    const truncated = await ontologyQuery.searchOntologyEntities({
      queryText: "e",
      ontologyReleaseSelection,
      maximumResultCount: 1,
    });
    expect(truncated.returnedEntityCount).toBe(1);
    expect(truncated.totalMatchedEntityCount).toBeGreaterThan(1);
    expect(truncated.resultSetTruncated).toBe(true);

    const noDefinition = await ontologyQuery.searchOntologyEntities({
      queryText: "Agent",
      ontologyReleaseSelection,
    });
    expect(
      noDefinition.matches[0].ontologyEntity.selectedLexicalDefinition,
    ).toBeNull();

    const scopeNoteIsNotASynonym = await ontologyQuery.searchOntologyEntities({
      queryText: "This note is not an alternative label.",
      ontologyReleaseSelection,
    });
    expect(scopeNoteIsNotASynonym.matches).toEqual([]);
  });

  test("coalesces concurrent immutable-index loads and retries rejected loads", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const loadEntered = createDeferred();
    const allowLoad = createDeferred();
    const coalescedRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact], {
        async beforeIndexRead() {
          loadEntered.resolve();
          await allowLoad.promise;
        },
      });
    const coalescedQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        coalescedRepositoryFixture.ontologyQueryArtifactRepository,
    });
    const input = {
      queryText: "Person",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
    };
    const firstQuery = coalescedQuery.searchOntologyEntities(input);
    await loadEntered.promise;
    const secondQuery = coalescedQuery.searchOntologyEntities(input);
    allowLoad.resolve();
    await Promise.all([firstQuery, secondQuery]);
    expect(
      coalescedRepositoryFixture.readCounts.get(
        artifact.queryIndexRelativePath,
      ),
    ).toBe(1);

    let shouldFail = true;
    const retryRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact], {
        beforeIndexRead() {
          if (shouldFail) {
            shouldFail = false;
            throw new Error("transient private adapter error");
          }
        },
      });
    const retryQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        retryRepositoryFixture.ontologyQueryArtifactRepository,
    });
    await expect(
      retryQuery.searchOntologyEntities(input),
    ).rejects.toMatchObject({
      name: "OntologyQueryError",
      errorCode: "QUERY_INDEX_UNAVAILABLE",
      message: "The ontology release query index is unavailable.",
      retryable: true,
    });
    await expect(
      retryQuery.searchOntologyEntities(input),
    ).resolves.toMatchObject({ outcome: "success" });
    expect(
      retryRepositoryFixture.readCounts.get(artifact.queryIndexRelativePath),
    ).toBe(2);
  });

  test("evicts complete indexes beyond the byte budget", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const inMemoryRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact]);
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        inMemoryRepositoryFixture.ontologyQueryArtifactRepository,
      maximumInMemoryQueryIndexCacheByteSize: 1,
    });
    const input = {
      queryText: "Person",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
    };

    await ontologyQuery.searchOntologyEntities(input);
    await ontologyQuery.searchOntologyEntities(input);
    expect(
      inMemoryRepositoryFixture.readCounts.get(artifact.queryIndexRelativePath),
    ).toBe(2);
  });

  test("propagates in-flight cancellation through the ontology query-artifact repository", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const loadEntered = createDeferred();
    let observedSignal;
    const inMemoryRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact], {
        beforeIndexRead({ signal }) {
          observedSignal = signal;
          loadEntered.resolve();

          return new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
          });
        },
      });
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        inMemoryRepositoryFixture.ontologyQueryArtifactRepository,
    });
    const controller = new AbortController();
    const queryPromise = ontologyQuery.searchOntologyEntities(
      {
        queryText: "Person",
        ontologyReleaseSelection: {
          selectionKind: "latest_stable_releases",
          ontologyArtifactFamilyIds: ["universal/core"],
        },
      },
      { signal: controller.signal },
    );
    await loadEntered.promise;
    controller.abort(new DOMException("cancelled", "AbortError"));

    await expect(queryPromise).rejects.toMatchObject({
      errorCode: "QUERY_CANCELLED",
    });
    expect(observedSignal.aborted).toBe(true);
  });

  test("cancelling one coalesced caller does not cancel another caller's load", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const loadEntered = createDeferred();
    const allowLoad = createDeferred();
    let ontologyQueryArtifactRepositorySignal;
    const inMemoryRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact], {
        async beforeIndexRead({ signal }) {
          ontologyQueryArtifactRepositorySignal = signal;
          loadEntered.resolve();

          await Promise.race([
            allowLoad.promise,
            new Promise((resolve, reject) => {
              signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
              });
            }),
          ]);
        },
      });
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        inMemoryRepositoryFixture.ontologyQueryArtifactRepository,
    });
    const input = {
      queryText: "Person",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
    };
    const firstController = new AbortController();
    const firstQuery = ontologyQuery.searchOntologyEntities(input, {
      signal: firstController.signal,
    });
    await loadEntered.promise;
    const secondQuery = ontologyQuery.searchOntologyEntities(input);
    const secondOutcome = secondQuery.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    firstController.abort(new DOMException("first stopped", "AbortError"));

    await expect(firstQuery).rejects.toMatchObject({
      errorCode: "QUERY_CANCELLED",
    });
    expect(ontologyQueryArtifactRepositorySignal.aborted).toBe(false);
    allowLoad.resolve();
    expect(await secondOutcome).toMatchObject({
      value: { outcome: "success" },
    });
    expect(
      inMemoryRepositoryFixture.readCounts.get(artifact.queryIndexRelativePath),
    ).toBe(1);
  });

  test("isolates caller cancellation while coalescing the catalog load", async () => {
    const artifact = defaultReleaseArtifacts[0];
    const loadEntered = createDeferred();
    const allowLoad = createDeferred();
    let catalogReadCount = 0;
    let ontologyQueryArtifactRepositorySignal;
    const inMemoryRepositoryFixture =
      createInMemoryOntologyQueryArtifactRepositoryFixture([artifact], {
        async beforeCatalogRead({ signal }) {
          catalogReadCount += 1;
          ontologyQueryArtifactRepositorySignal = signal;
          loadEntered.resolve();

          await Promise.race([
            allowLoad.promise,
            new Promise((resolve, reject) => {
              signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
              });
            }),
          ]);
        },
      });
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository:
        inMemoryRepositoryFixture.ontologyQueryArtifactRepository,
    });
    const input = {
      queryText: "Person",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
    };
    const firstController = new AbortController();
    const firstQuery = ontologyQuery.searchOntologyEntities(input, {
      signal: firstController.signal,
    });
    await loadEntered.promise;
    const secondQuery = ontologyQuery.searchOntologyEntities(input);
    firstController.abort(new DOMException("first stopped", "AbortError"));

    await expect(firstQuery).rejects.toMatchObject({
      errorCode: "QUERY_CANCELLED",
    });
    expect(ontologyQueryArtifactRepositorySignal.aborted).toBe(false);
    allowLoad.resolve();
    await expect(secondQuery).resolves.toMatchObject({ outcome: "success" });
    expect(catalogReadCount).toBe(1);
  });
});
