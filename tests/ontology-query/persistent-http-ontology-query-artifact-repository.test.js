import * as nodeFileSystem from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateSha256,
  serializeCanonicalOntologyQueryJsonDocument,
} from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { createOntologyQueryModule } from "../../src/ontologyQuery/createOntologyQueryModule.js";
import { createHttpOntologyQueryArtifactReader } from "../../src/ontologyQuery/httpOntologyQueryArtifactReader.js";
import { createPersistentHttpOntologyQueryArtifactRepository } from "../../src/ontologyQuery/persistentHttpOntologyQueryArtifactRepository.js";
import { createPersistentOntologyQueryArtifactCache } from "../../src/ontologyQuery/persistentOntologyQueryArtifactCache.js";
import { createInMemoryOntologyReleaseArtifact } from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";
import { createOntologyQueryArtifactHttpFixture } from "../fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js";

const CORE_RELEASE_SELECTION = Object.freeze({
  selectionKind: "specified_releases",
  ontologyReleases: Object.freeze([
    Object.freeze({
      ontologyArtifactFamilyId: "universal/core",
      versionTag: "20260714",
    }),
  ]),
});
const PERSISTENT_HTTP_REPOSITORY_WORKER_PATH = fileURLToPath(
  new URL(
    "../fixtures/ontology-query/persistent-http-repository-worker.js",
    import.meta.url,
  ),
);

function spawnPersistentHttpRepositoryWorker(arguments_) {
  return spawn(
    process.execPath,
    [PERSISTENT_HTTP_REPOSITORY_WORKER_PATH, ...arguments_],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

function collectChildProcess(childProcess) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    childProcess.stdout.setEncoding("utf8");
    childProcess.stderr.setEncoding("utf8");
    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    childProcess.once("error", reject);
    childProcess.once("close", (exitCode, signal) => {
      resolve({ exitCode, signal, stderr, stdout });
    });
  });
}

function createDeferredControl() {
  let resolveDeferred;
  const promise = new Promise((resolve) => {
    resolveDeferred = resolve;
  });

  return { promise, resolve: () => resolveDeferred() };
}

/**
 * Observe verified-cache lookups for one digest so a concurrency test can wait
 * for a caller to reach its shared-population join instead of sleeping.
 */
function createArtifactCacheReadBarrier(observedSha256) {
  const countWaiters = new Set();
  let readCount = 0;

  return {
    get readCount() {
      return readCount;
    },

    decorate(cache) {
      return {
        ...cache,
        async readVerifiedArtifact(input) {
          const bytes = await cache.readVerifiedArtifact(input);

          if (input.expectedSha256 === observedSha256) {
            readCount += 1;

            for (const waiter of countWaiters) {
              if (readCount >= waiter.expectedCount) {
                countWaiters.delete(waiter);
                waiter.resolve();
              }
            }
          }

          return bytes;
        },
      };
    },

    async waitForReadCount(expectedCount) {
      if (readCount < expectedCount) {
        await new Promise((resolve) => {
          countWaiters.add({ expectedCount, resolve });
        });
      }

      // A cache miss is followed synchronously by the shared-population join,
      // so draining the pending microtasks proves that join has happened.
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

function getRepositoryRootPath(fixture) {
  return join(
    fixture.cacheRootPath,
    "repositories",
    fixture.ontologyQueryArtifactBaseUrlSha256,
  );
}

function getCachedArtifactPath(fixture, sha256) {
  return join(
    getRepositoryRootPath(fixture),
    "artifacts",
    "sha256",
    sha256.slice(0, 2),
    `${sha256}.json`,
  );
}

function getChannelStatePath(fixture, generation = 1) {
  return join(
    getRepositoryRootPath(fixture),
    "channels",
    "stable",
    `state-${String(generation).padStart(16, "0")}.json`,
  );
}

function createOntologyQuery(repository) {
  return createOntologyQueryModule({
    ontologyQueryArtifactRepository: repository,
  });
}

function resolvePerson(repository, identifierValue = "Person", options) {
  return createOntologyQuery(repository).resolveOntologyEntity(
    {
      entityIdentifier: {
        identifierKind: "preferred_label",
        identifierValue,
      },
      ontologyReleaseSelection: CORE_RELEASE_SELECTION,
      preferredLanguageTags: ["en-GB", "en"],
    },
    options,
  );
}

async function configureChannelPublication(
  fixture,
  {
    catalog = fixture.catalog,
    catalogBytes = Buffer.from(
      serializeCanonicalOntologyQueryJsonDocument(catalog),
    ),
    catalogResponseBytes = catalogBytes,
    manifestChannelName = "stable",
    referencedCatalogByteLength = catalogBytes.byteLength,
    referencedCatalogSha256,
  } = {},
) {
  const catalogSha256 =
    referencedCatalogSha256 ?? (await calculateSha256(catalogBytes));
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const manifestBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_channel_manifest",
      queryArtifactFormatVersion: 1,
      ontologyQueryArtifactChannelName: manifestChannelName,
      ontologyQueryCatalogReference: {
        relativePath: catalogRelativePath,
        sha256: catalogSha256,
        byteLength: referencedCatalogByteLength,
      },
    }),
  );
  fixture.httpFixture.setResponse("channels/stable.json", {
    bodyBytes: manifestBytes,
    headers: { ETag: '"stable-generation-2"' },
  });
  fixture.httpFixture.setResponse(catalogRelativePath, {
    bodyBytes: catalogResponseBytes,
  });

  return { catalogBytes, catalogRelativePath, catalogSha256, manifestBytes };
}

async function createRepositoryFixture() {
  const httpFixture = await createOntologyQueryArtifactHttpFixture();
  const temporaryParentPath = await nodeFileSystem.mkdtemp(
    join(tmpdir(), "uo-persistent-http-repository-"),
  );
  const cacheRootPath = join(temporaryParentPath, "cache");
  const releaseArtifact = await createInMemoryOntologyReleaseArtifact({
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
  });
  const catalog = {
    queryArtifactKind: "universal_ontology_query_catalog",
    queryArtifactFormatVersion: 1,
    releases: [
      {
        ...releaseArtifact.catalogRelease,
        queryIndexByteLength: releaseArtifact.indexBytes.byteLength,
      },
    ],
  };
  const catalogBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(catalog),
  );
  const catalogSha256 = await calculateSha256(catalogBytes);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const manifest = {
    queryArtifactKind: "universal_ontology_query_channel_manifest",
    queryArtifactFormatVersion: 1,
    ontologyQueryArtifactChannelName: "stable",
    ontologyQueryCatalogReference: {
      relativePath: catalogRelativePath,
      sha256: catalogSha256,
      byteLength: catalogBytes.byteLength,
    },
  };
  const manifestBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(manifest),
  );
  httpFixture.setResponse("channels/stable.json", {
    bodyBytes: manifestBytes,
    headers: {
      ETag: '"stable-generation-1"',
      "Last-Modified": "Mon, 31 Aug 2026 10:00:00 GMT",
    },
  });
  httpFixture.setResponse(catalogRelativePath, { bodyBytes: catalogBytes });
  httpFixture.setResponse(releaseArtifact.queryIndexRelativePath, {
    bodyBytes: releaseArtifact.indexBytes,
  });
  const ontologyQueryArtifactBaseUrlSha256 = await calculateSha256(
    new TextEncoder().encode(httpFixture.ontologyQueryArtifactBaseUrl),
  );
  const operationalEvents = [];

  async function createRepositoryInstance({
    decoratePersistentCache = (cache) => cache,
    persistentCacheOptions = {},
    recordedOperationalEvents = operationalEvents,
    requestTimeoutMilliseconds = 1_000,
  } = {}) {
    const persistentOntologyQueryArtifactCache = decoratePersistentCache(
      await createPersistentOntologyQueryArtifactCache({
        ...persistentCacheOptions,
        ontologyQueryArtifactCacheDirectoryPath: cacheRootPath,
        ontologyQueryArtifactBaseUrlSha256,
      }),
    );
    const httpOntologyQueryArtifactReader =
      createHttpOntologyQueryArtifactReader({
        ontologyQueryArtifactBaseUrl: httpFixture.ontologyQueryArtifactBaseUrl,
        allowInsecureLoopbackOntologyQueryArtifactOrigin: true,
        requestTimeoutMilliseconds,
      });
    const repository = createPersistentHttpOntologyQueryArtifactRepository({
      ontologyQueryArtifactChannelName: "stable",
      ontologyQueryArtifactBaseUrlSha256,
      persistentOntologyQueryArtifactCache,
      httpOntologyQueryArtifactReader,
      writeOperationalEvent: (event) => recordedOperationalEvents.push(event),
    });

    return { persistentOntologyQueryArtifactCache, repository };
  }

  const { persistentOntologyQueryArtifactCache, repository } =
    await createRepositoryInstance();

  return {
    cacheRootPath,
    catalog,
    catalogBytes,
    catalogRelativePath,
    createRepositoryInstance,
    httpFixture,
    manifest,
    manifestBytes,
    ontologyQueryArtifactBaseUrlSha256,
    operationalEvents,
    persistentOntologyQueryArtifactCache,
    releaseArtifact,
    repository,
    closeOrigin: () => httpFixture.close(),
    async close() {
      await httpFixture.close();
      await nodeFileSystem.rm(temporaryParentPath, {
        recursive: true,
        force: true,
      });
    },
  };
}

describe("persistent HTTP ontology query-artifact repository", () => {
  test("pins one cold channel catalog and reads its exact selected release index", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await expect(
        fixture.repository.readOntologyQueryCatalog(),
      ).resolves.toEqual(fixture.catalogBytes);
      await expect(
        fixture.repository.readOntologyReleaseQueryIndex({
          relativePath: fixture.releaseArtifact.queryIndexRelativePath,
        }),
      ).resolves.toEqual(fixture.releaseArtifact.indexBytes);
      expect(
        fixture.httpFixture.requestRecords.map(
          ({ requestTarget }) => requestTarget,
        ),
      ).toEqual([
        "/ontology/query/v1/channels/stable.json",
        `/ontology/query/v1/${fixture.catalogRelativePath}`,
        `/ontology/query/v1/${fixture.releaseArtifact.queryIndexRelativePath}`,
      ]);

      await fixture.repository.readOntologyQueryCatalog();
      await fixture.repository.readOntologyReleaseQueryIndex({
        relativePath: fixture.releaseArtifact.queryIndexRelativePath,
      });
      expect(fixture.httpFixture.requestRecords).toHaveLength(3);
      expect(JSON.stringify(fixture.httpFixture.requestRecords)).not.toContain(
        "?",
      );

      await expect(
        fixture.persistentOntologyQueryArtifactCache.readLastKnownGoodChannelState(
          { ontologyQueryArtifactChannelName: "stable" },
        ),
      ).resolves.toMatchObject({
        ontologyQueryArtifactBaseUrlSha256:
          fixture.ontologyQueryArtifactBaseUrlSha256,
        ontologyQueryArtifactChannelName: "stable",
        ontologyQueryCatalogReference:
          fixture.manifest.ontologyQueryCatalogReference,
        channelManifestHttpValidator: {
          entityTag: '"stable-generation-1"',
          lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
        },
      });
    } finally {
      await fixture.close();
    }
  });

  test("revalidates a warm process with HTTP validators and transfers no immutable body", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await fixture.repository.readOntologyQueryCatalog();
      await fixture.repository.readOntologyReleaseQueryIndex({
        relativePath: fixture.releaseArtifact.queryIndexRelativePath,
      });
      fixture.httpFixture.requestRecords.length = 0;
      fixture.httpFixture.setResponse("channels/stable.json", ({ headers }) => {
        expect(headers["if-none-match"]).toBe('"stable-generation-1"');
        expect(headers["if-modified-since"]).toBe(
          "Mon, 31 Aug 2026 10:00:00 GMT",
        );
        return { status: 304 };
      });
      const warmProcess = await fixture.createRepositoryInstance();

      await expect(
        warmProcess.repository.readOntologyQueryCatalog(),
      ).resolves.toEqual(fixture.catalogBytes);
      await expect(
        warmProcess.repository.readOntologyReleaseQueryIndex({
          relativePath: fixture.releaseArtifact.queryIndexRelativePath,
        }),
      ).resolves.toEqual(fixture.releaseArtifact.indexBytes);
      expect(
        fixture.httpFixture.requestRecords.map(
          ({ requestTarget }) => requestTarget,
        ),
      ).toEqual(["/ontology/query/v1/channels/stable.json"]);
    } finally {
      await fixture.close();
    }
  });

  test("resolves Person from a complete retained snapshot while the origin is offline", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await resolvePerson(fixture.repository);
      fixture.httpFixture.requestRecords.length = 0;
      await fixture.closeOrigin();
      const offlineProcess = await fixture.createRepositoryInstance();

      await expect(
        resolvePerson(offlineProcess.repository),
      ).resolves.toMatchObject({
        outcome: "success",
        resolutionStatus: "found",
        ontologyEntities: [
          {
            selectedPreferredLabel: {
              literalValue: { lexicalForm: "Person" },
            },
            selectedLexicalDefinition: {
              literalValue: {
                lexicalForm: "A natural or legal person recognised by law.",
              },
            },
          },
        ],
      });
      expect(fixture.operationalEvents).toHaveLength(1);
      expect(fixture.operationalEvents[0]).toMatchObject({
        eventName: "ontology_query_artifact_retained_snapshot_selected",
        severity: "warning",
        outcome: "fallback",
        safeErrorCode: "ORIGIN_REQUEST_FAILED",
        channel: "stable",
        cacheOutcome: "last_known_good",
        byteCount: 0,
      });
    } finally {
      await fixture.close();
    }
  });

  test("fails explicitly when the origin is offline before any snapshot is retained", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await fixture.closeOrigin();

      await expect(
        fixture.repository.readOntologyQueryCatalog(),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
        retryable: true,
      });
      expect(fixture.operationalEvents).toEqual([]);
    } finally {
      await fixture.close();
    }
  });

  test.each([
    {
      scenario: "the retained state is corrupt",
      prepare: async (fixture) => {
        await fixture.repository.readOntologyQueryCatalog();
        await nodeFileSystem.writeFile(
          getChannelStatePath(fixture),
          Buffer.from("not canonical state\n", "utf8"),
        );
      },
    },
    {
      scenario: "the retained catalog is absent",
      prepare: async (fixture) => {
        await fixture.repository.readOntologyQueryCatalog();
        await nodeFileSystem.unlink(
          getCachedArtifactPath(
            fixture,
            fixture.manifest.ontologyQueryCatalogReference.sha256,
          ),
        );
      },
    },
  ])("fails explicitly offline when $scenario", async ({ prepare }) => {
    const fixture = await createRepositoryFixture();

    try {
      await prepare(fixture);
      await fixture.closeOrigin();
      const offlineProcess = await fixture.createRepositoryInstance();

      await expect(
        offlineProcess.repository.readOntologyQueryCatalog(),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
      });
    } finally {
      await fixture.close();
    }
  });

  test("does not substitute another artifact when the selected index is absent offline", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await fixture.repository.readOntologyQueryCatalog();
      await fixture.closeOrigin();
      const offlineProcess = await fixture.createRepositoryInstance();

      await expect(
        offlineProcess.repository.readOntologyReleaseQueryIndex({
          relativePath: fixture.releaseArtifact.queryIndexRelativePath,
        }),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_UNAVAILABLE",
        retryable: true,
      });
      expect(fixture.operationalEvents).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  });

  test("quarantines a corrupt selected index and refetches only that exact index", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await resolvePerson(fixture.repository);
      await nodeFileSystem.writeFile(
        getCachedArtifactPath(
          fixture,
          fixture.releaseArtifact.catalogRelease.queryIndexSha256,
        ),
        Buffer.from("corrupt index\n", "utf8"),
      );
      fixture.httpFixture.requestRecords.length = 0;
      fixture.httpFixture.setResponse("channels/stable.json", { status: 304 });
      const restartedProcess = await fixture.createRepositoryInstance();

      await expect(
        resolvePerson(restartedProcess.repository),
      ).resolves.toMatchObject({
        outcome: "success",
        resolutionStatus: "found",
      });
      expect(
        fixture.httpFixture.requestRecords.map(
          ({ requestTarget }) => requestTarget,
        ),
      ).toEqual([
        "/ontology/query/v1/channels/stable.json",
        `/ontology/query/v1/${fixture.releaseArtifact.queryIndexRelativePath}`,
      ]);
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(fixture), "quarantine"),
        ),
      ).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  });

  test("returns exact-index unavailable for a corrupt selected index while offline", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await resolvePerson(fixture.repository);
      await nodeFileSystem.writeFile(
        getCachedArtifactPath(
          fixture,
          fixture.releaseArtifact.catalogRelease.queryIndexSha256,
        ),
        Buffer.from("corrupt index\n", "utf8"),
      );
      await fixture.closeOrigin();
      const offlineProcess = await fixture.createRepositoryInstance();

      await expect(
        resolvePerson(offlineProcess.repository),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_UNAVAILABLE",
        retryable: true,
      });
    } finally {
      await fixture.close();
    }
  });

  test("rejects any release-index path not selected by the pinned catalog before I/O", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await fixture.repository.readOntologyQueryCatalog();
      fixture.httpFixture.requestRecords.length = 0;
      const unselectedPath =
        fixture.releaseArtifact.queryIndexRelativePath.replace(
          /[0-9a-f]{64}\.json$/u,
          `${"f".repeat(64)}.json`,
        );

      await expect(
        fixture.repository.readOntologyReleaseQueryIndex({
          relativePath: unselectedPath,
        }),
      ).rejects.toMatchObject({ errorCode: "QUERY_INDEX_UNAVAILABLE" });
      expect(fixture.httpFixture.requestRecords).toEqual([]);
    } finally {
      await fixture.close();
    }
  });

  test.each([
    {
      failure: "wrong channel",
      expectedSafeErrorCode: "ARTIFACT_VALIDATION_FAILED",
      configure: (fixture) =>
        configureChannelPublication(fixture, {
          manifestChannelName: "development",
        }),
    },
    {
      failure: "catalog digest mismatch",
      expectedSafeErrorCode: "ARTIFACT_VALIDATION_FAILED",
      configure: (fixture) => {
        const changedCatalog = structuredClone(fixture.catalog);
        changedCatalog.releases[0].latestStableRelease = false;
        return configureChannelPublication(fixture, {
          catalog: changedCatalog,
          catalogResponseBytes: Buffer.from("{}\n", "utf8"),
        });
      },
    },
    {
      failure: "catalog byte-length mismatch",
      expectedSafeErrorCode: "ORIGIN_REQUEST_FAILED",
      configure: (fixture) =>
        configureChannelPublication(fixture, {
          referencedCatalogByteLength: fixture.catalogBytes.byteLength - 1,
        }),
    },
    {
      failure: "catalog schema failure",
      expectedSafeErrorCode: "ARTIFACT_VALIDATION_FAILED",
      configure: async (fixture) => {
        const invalidCatalogBytes = Buffer.from(
          `${JSON.stringify(
            {
              queryArtifactKind: "universal_ontology_query_catalog",
              queryArtifactFormatVersion: 1,
              releases: [{ ontologyArtifactFamilyId: "universal/core" }],
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
        return configureChannelPublication(fixture, {
          catalogBytes: invalidCatalogBytes,
        });
      },
    },
    {
      failure: "catalog release-path disagreement",
      expectedSafeErrorCode: "ARTIFACT_VALIDATION_FAILED",
      configure: (fixture) => {
        const inconsistentCatalog = structuredClone(fixture.catalog);
        inconsistentCatalog.releases[0].ontologyArtifactFamilyId =
          "universal/extended";
        return configureChannelPublication(fixture, {
          catalog: inconsistentCatalog,
        });
      },
    },
  ])(
    "keeps the preceding complete snapshot after a new $failure",
    async ({ configure, expectedSafeErrorCode }) => {
      const fixture = await createRepositoryFixture();

      try {
        await fixture.repository.readOntologyQueryCatalog();
        fixture.httpFixture.requestRecords.length = 0;
        fixture.operationalEvents.length = 0;
        await configure(fixture);
        const restartedProcess = await fixture.createRepositoryInstance();

        await expect(
          restartedProcess.repository.readOntologyQueryCatalog(),
        ).resolves.toEqual(fixture.catalogBytes);
        expect(fixture.operationalEvents).toHaveLength(1);
        expect(fixture.operationalEvents[0]).toMatchObject({
          eventName: "ontology_query_artifact_retained_snapshot_selected",
          severity: "warning",
          outcome: "fallback",
          safeErrorCode: expectedSafeErrorCode,
          channel: "stable",
          cacheOutcome: "last_known_good",
        });
      } finally {
        await fixture.close();
      }
    },
  );

  test.each([404, 410, 429, 500, 503])(
    "uses the retained snapshot after eligible origin status %i",
    async (httpStatus) => {
      const fixture = await createRepositoryFixture();

      try {
        await fixture.repository.readOntologyQueryCatalog();
        fixture.operationalEvents.length = 0;
        fixture.httpFixture.setResponse("channels/stable.json", {
          status: httpStatus,
        });
        const restartedProcess = await fixture.createRepositoryInstance();

        await expect(
          restartedProcess.repository.readOntologyQueryCatalog(),
        ).resolves.toEqual(fixture.catalogBytes);
        expect(fixture.operationalEvents[0]).toMatchObject({
          safeErrorCode: `ORIGIN_HTTP_${httpStatus}`,
          cacheOutcome: "last_known_good",
        });
      } finally {
        await fixture.close();
      }
    },
  );

  test.each([401, 403])(
    "fails closed on origin-policy status %i even with a retained snapshot",
    async (httpStatus) => {
      const fixture = await createRepositoryFixture();

      try {
        await fixture.repository.readOntologyQueryCatalog();
        fixture.operationalEvents.length = 0;
        fixture.httpFixture.setResponse("channels/stable.json", {
          status: httpStatus,
        });
        const restartedProcess = await fixture.createRepositoryInstance();

        await expect(
          restartedProcess.repository.readOntologyQueryCatalog(),
        ).rejects.toMatchObject({
          errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
        });
        expect(fixture.operationalEvents).toEqual([]);
      } finally {
        await fixture.close();
      }
    },
  );

  test("coalesces duplicate catalog and exact-index reads within one process", async () => {
    const fixture = await createRepositoryFixture();

    try {
      fixture.httpFixture.setResponse("channels/stable.json", {
        bodyBytes: fixture.manifestBytes,
        delayBeforeHeadersMilliseconds: 50,
      });
      const catalogReads = [
        fixture.repository.readOntologyQueryCatalog(),
        fixture.repository.readOntologyQueryCatalog(),
      ];
      await expect(Promise.all(catalogReads)).resolves.toEqual([
        fixture.catalogBytes,
        fixture.catalogBytes,
      ]);
      expect(
        fixture.httpFixture.requestRecords.filter(({ requestTarget }) =>
          requestTarget.endsWith("/channels/stable.json"),
        ),
      ).toHaveLength(1);

      fixture.httpFixture.requestRecords.length = 0;
      fixture.httpFixture.setResponse(
        fixture.releaseArtifact.queryIndexRelativePath,
        {
          bodyBytes: fixture.releaseArtifact.indexBytes,
          delayBeforeHeadersMilliseconds: 50,
        },
      );
      const indexInput = {
        relativePath: fixture.releaseArtifact.queryIndexRelativePath,
      };
      await expect(
        Promise.all([
          fixture.repository.readOntologyReleaseQueryIndex(indexInput),
          fixture.repository.readOntologyReleaseQueryIndex(indexInput),
        ]),
      ).resolves.toEqual([
        fixture.releaseArtifact.indexBytes,
        fixture.releaseArtifact.indexBytes,
      ]);
      expect(fixture.httpFixture.requestRecords).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  });

  test("validates digest-coalesced bytes independently for each release reference", async () => {
    const fixture = await createRepositoryFixture();

    try {
      const queryIndexSha256 =
        fixture.releaseArtifact.catalogRelease.queryIndexSha256;
      const sharedDigestCatalog = structuredClone(fixture.catalog);
      const aliasedRelease = {
        ...structuredClone(sharedDigestCatalog.releases[0]),
        ontologyArtifactFamilyId: "universal/extended",
        latestStableRelease: false,
        sourceArtifactRelativePath: "universal/extended/20260714",
        sourceArtifactUrl:
          "https://example.com/ontology/universal/extended/20260714",
        queryIndexRelativePath: `releases/universal/extended/20260714/${queryIndexSha256}.json`,
      };
      sharedDigestCatalog.releases.push(aliasedRelease);
      await configureChannelPublication(fixture, {
        catalog: sharedDigestCatalog,
      });

      // The aliased caller must deterministically own the shared population,
      // so its origin response stays blocked until the valid caller has joined.
      const aliasedRequestObserved = createDeferredControl();
      const aliasedResponseReleased = createDeferredControl();
      fixture.httpFixture.setResponse(
        aliasedRelease.queryIndexRelativePath,
        async () => {
          aliasedRequestObserved.resolve();
          await aliasedResponseReleased.promise;
          return { bodyBytes: fixture.releaseArtifact.indexBytes };
        },
      );
      fixture.httpFixture.setResponse(
        fixture.releaseArtifact.queryIndexRelativePath,
        { bodyBytes: fixture.releaseArtifact.indexBytes },
      );
      const cacheReadBarrier = createArtifactCacheReadBarrier(queryIndexSha256);
      const { repository } = await fixture.createRepositoryInstance({
        decoratePersistentCache: cacheReadBarrier.decorate,
      });
      await repository.readOntologyQueryCatalog();
      fixture.httpFixture.requestRecords.length = 0;

      const aliasedRead = repository.readOntologyReleaseQueryIndex({
        relativePath: aliasedRelease.queryIndexRelativePath,
      });
      await aliasedRequestObserved.promise;
      const joinedSharedPopulation = cacheReadBarrier.waitForReadCount(
        cacheReadBarrier.readCount + 1,
      );
      const matchingRead = repository.readOntologyReleaseQueryIndex({
        relativePath: fixture.releaseArtifact.queryIndexRelativePath,
      });
      const settlements = Promise.allSettled([matchingRead, aliasedRead]);
      await joinedSharedPopulation;
      aliasedResponseReleased.resolve();
      const [matchingSettlement, aliasedSettlement] = await settlements;

      expect(matchingSettlement).toEqual({
        status: "fulfilled",
        value: fixture.releaseArtifact.indexBytes,
      });
      expect(aliasedSettlement).toMatchObject({
        status: "rejected",
        reason: {
          errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
        },
      });
      expect(
        fixture.httpFixture.requestRecords.filter(({ requestTarget }) =>
          requestTarget.includes("/releases/"),
        ),
      ).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  });

  test("isolates one cancelled catalog waiter while another completes the shared read", async () => {
    const fixture = await createRepositoryFixture();

    try {
      fixture.httpFixture.setResponse("channels/stable.json", {
        bodyBytes: fixture.manifestBytes,
        delayBeforeHeadersMilliseconds: 100,
      });
      const cancelledCaller = new AbortController();
      const cancelledRead = fixture.repository.readOntologyQueryCatalog({
        signal: cancelledCaller.signal,
      });
      await fixture.httpFixture.waitForRequestCount(1);
      const survivingRead = fixture.repository.readOntologyQueryCatalog();
      cancelledCaller.abort(new DOMException("caller stopped", "AbortError"));

      await expect(cancelledRead).rejects.toMatchObject({
        name: "AbortError",
      });
      await expect(survivingRead).resolves.toEqual(fixture.catalogBytes);
      expect(
        fixture.httpFixture.requestRecords.filter(({ requestTarget }) =>
          requestTarget.endsWith("/channels/stable.json"),
        ),
      ).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  });

  test("aborts abandoned shared work and lets a later catalog caller retry", async () => {
    const fixture = await createRepositoryFixture();

    try {
      fixture.httpFixture.setResponse("channels/stable.json", {
        bodyBytes: fixture.manifestBytes,
        delayBeforeHeadersMilliseconds: 250,
      });
      const firstController = new AbortController();
      const secondController = new AbortController();
      const firstRead = fixture.repository.readOntologyQueryCatalog({
        signal: firstController.signal,
      });
      const secondRead = fixture.repository.readOntologyQueryCatalog({
        signal: secondController.signal,
      });
      await fixture.httpFixture.waitForRequestCount(1);
      firstController.abort(new DOMException("first stopped", "AbortError"));
      secondController.abort(new DOMException("second stopped", "AbortError"));

      await expect(firstRead).rejects.toMatchObject({ name: "AbortError" });
      await expect(secondRead).rejects.toMatchObject({ name: "AbortError" });
      fixture.httpFixture.setResponse("channels/stable.json", {
        bodyBytes: fixture.manifestBytes,
      });
      await expect(
        fixture.repository.readOntologyQueryCatalog(),
      ).resolves.toEqual(fixture.catalogBytes);
      expect(
        fixture.httpFixture.requestRecords.filter(({ requestTarget }) =>
          requestTarget.endsWith("/channels/stable.json"),
        ),
      ).toHaveLength(2);
    } finally {
      await fixture.close();
    }
  });

  test("retries catalog initialization after a transient first-use failure", async () => {
    const fixture = await createRepositoryFixture();

    try {
      let channelRequestCount = 0;
      fixture.httpFixture.setResponse("channels/stable.json", () => {
        channelRequestCount += 1;
        return channelRequestCount === 1
          ? { status: 503 }
          : { bodyBytes: fixture.manifestBytes };
      });

      await expect(
        fixture.repository.readOntologyQueryCatalog(),
      ).rejects.toMatchObject({
        errorCode: "QUERY_INDEX_CATALOG_UNAVAILABLE",
      });
      await expect(
        fixture.repository.readOntologyQueryCatalog(),
      ).resolves.toEqual(fixture.catalogBytes);
      expect(channelRequestCount).toBe(2);
    } finally {
      await fixture.close();
    }
  });

  test("never places ontology lookup text in requests or operational events", async () => {
    const fixture = await createRepositoryFixture();
    const sensitiveIdentifier =
      "private acquisition target 7bb4c2d8-860b-4cd7-a073-0dc9f2e1c680";

    try {
      await resolvePerson(fixture.repository);
      fixture.httpFixture.requestRecords.length = 0;
      fixture.operationalEvents.length = 0;
      await fixture.closeOrigin();
      const offlineProcess = await fixture.createRepositoryInstance();

      await expect(
        resolvePerson(offlineProcess.repository, sensitiveIdentifier),
      ).resolves.toMatchObject({
        outcome: "success",
        resolutionStatus: "not_found",
      });
      const recordedExternalData = JSON.stringify({
        requests: fixture.httpFixture.requestRecords,
        events: fixture.operationalEvents,
      });
      expect(recordedExternalData).not.toContain(sensitiveIdentifier);
      expect(recordedExternalData).not.toContain(fixture.cacheRootPath);
      expect(
        fixture.httpFixture.requestRecords.every(
          ({ requestTarget }) => !requestTarget.includes("?"),
        ),
      ).toBe(true);
      expect(Object.keys(fixture.operationalEvents[0]).sort()).toEqual(
        [
          "byteCount",
          "cacheOutcome",
          "channel",
          "correlationIdentifier",
          "elapsedMilliseconds",
          "eventName",
          "outcome",
          "safeErrorCode",
          "severity",
        ].sort(),
      );
    } finally {
      await fixture.close();
    }
  });

  test("uses inter-process leases to fetch each cold immutable artifact once", async () => {
    const fixture = await createRepositoryFixture();

    try {
      fixture.httpFixture.setResponse(fixture.catalogRelativePath, {
        bodyBytes: fixture.catalogBytes,
        delayBeforeHeadersMilliseconds: 100,
      });
      fixture.httpFixture.setResponse(
        fixture.releaseArtifact.queryIndexRelativePath,
        {
          bodyBytes: fixture.releaseArtifact.indexBytes,
          delayBeforeHeadersMilliseconds: 100,
        },
      );
      const workerArguments = [
        fixture.httpFixture.ontologyQueryArtifactBaseUrl,
        fixture.cacheRootPath,
        fixture.ontologyQueryArtifactBaseUrlSha256,
        fixture.releaseArtifact.queryIndexRelativePath,
      ];
      const workerResults = await Promise.all([
        collectChildProcess(
          spawnPersistentHttpRepositoryWorker(workerArguments),
        ),
        collectChildProcess(
          spawnPersistentHttpRepositoryWorker(workerArguments),
        ),
      ]);

      for (const result of workerResults) {
        expect(result).toMatchObject({ exitCode: 0, signal: null, stderr: "" });
        expect(JSON.parse(result.stdout)).toEqual({
          catalogByteLength: fixture.catalogBytes.byteLength,
          indexByteLength: fixture.releaseArtifact.indexBytes.byteLength,
        });
      }

      const requestTargets = fixture.httpFixture.requestRecords.map(
        ({ requestTarget }) => requestTarget,
      );
      expect(
        requestTargets.filter((target) =>
          target.endsWith("/channels/stable.json"),
        ),
      ).toHaveLength(2);
      expect(
        requestTargets.filter((target) =>
          target.endsWith(`/${fixture.catalogRelativePath}`),
        ),
      ).toHaveLength(1);
      expect(
        requestTargets.filter((target) =>
          target.endsWith(`/${fixture.releaseArtifact.queryIndexRelativePath}`),
        ),
      ).toHaveLength(1);
    } finally {
      await fixture.close();
    }
  }, 20_000);

  test("recovers a stale population lease after an interrupted process", async () => {
    const fixture = await createRepositoryFixture();
    let interruptedWorker;

    try {
      const leaseStaleAfterMilliseconds = 100;
      fixture.httpFixture.setResponse(fixture.catalogRelativePath, {
        bodyBytes: fixture.catalogBytes,
        delayBeforeHeadersMilliseconds: 500,
      });
      interruptedWorker = spawnPersistentHttpRepositoryWorker([
        fixture.httpFixture.ontologyQueryArtifactBaseUrl,
        fixture.cacheRootPath,
        fixture.ontologyQueryArtifactBaseUrlSha256,
        fixture.releaseArtifact.queryIndexRelativePath,
        String(leaseStaleAfterMilliseconds),
      ]);
      const interruptedWorkerResult = collectChildProcess(interruptedWorker);
      await fixture.httpFixture.waitForRequestCount(2);
      expect(interruptedWorker.kill()).toBe(true);
      await interruptedWorkerResult;
      await new Promise((resolve) =>
        setTimeout(resolve, leaseStaleAfterMilliseconds + 100),
      );
      fixture.httpFixture.setResponse(fixture.catalogRelativePath, {
        bodyBytes: fixture.catalogBytes,
      });
      const restartedProcess = await fixture.createRepositoryInstance({
        persistentCacheOptions: {
          leaseAcquisitionTimeoutMilliseconds: 5_000,
          leaseHeartbeatIntervalMilliseconds: 25,
          leaseRetryDelayMilliseconds: 10,
          leaseStaleAfterMilliseconds,
        },
      });

      await expect(
        resolvePerson(restartedProcess.repository),
      ).resolves.toMatchObject({
        outcome: "success",
        resolutionStatus: "found",
      });
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(fixture), "locks", "artifacts"),
        ),
      ).toEqual([]);
    } finally {
      interruptedWorker?.kill();
      await fixture.close();
    }
  }, 20_000);

  test("rejects a promoted exact index whose embedded release identity disagrees", async () => {
    const fixture = await createRepositoryFixture();

    try {
      await fixture.repository.readOntologyQueryCatalog();
      const inconsistentIndex = JSON.parse(
        fixture.releaseArtifact.indexBytes.toString("utf8"),
      );
      inconsistentIndex.resolvedOntologyRelease.sourceArtifactUrl =
        "https://example.com/ontology/a-different-release";
      const inconsistentIndexBytes = Buffer.from(
        serializeCanonicalOntologyQueryJsonDocument(inconsistentIndex),
      );
      const inconsistentIndexSha256 = await calculateSha256(
        inconsistentIndexBytes,
      );
      const inconsistentIndexRelativePath =
        "releases/universal/core/20260714/" + `${inconsistentIndexSha256}.json`;
      const promotedCatalog = structuredClone(fixture.catalog);
      Object.assign(promotedCatalog.releases[0], {
        queryIndexRelativePath: inconsistentIndexRelativePath,
        queryIndexSha256: inconsistentIndexSha256,
        queryIndexByteLength: inconsistentIndexBytes.byteLength,
      });
      await configureChannelPublication(fixture, {
        catalog: promotedCatalog,
      });
      fixture.httpFixture.setResponse(inconsistentIndexRelativePath, {
        bodyBytes: inconsistentIndexBytes,
      });
      const restartedProcess = await fixture.createRepositoryInstance();

      await expect(
        restartedProcess.repository.readOntologyReleaseQueryIndex({
          relativePath: inconsistentIndexRelativePath,
        }),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
        retryable: false,
      });
      // The content-addressed cache owns byte integrity, not the contextual
      // release identity of any one caller, so it may retain digest-verified
      // bytes that no catalog entry accepts. Every later read must therefore
      // reapply that contextual validation against its own cache hit.
      await expect(
        restartedProcess.persistentOntologyQueryArtifactCache.readVerifiedArtifact(
          {
            expectedByteLength: inconsistentIndexBytes.byteLength,
            expectedSha256: inconsistentIndexSha256,
          },
        ),
      ).resolves.not.toBeNull();
      fixture.httpFixture.requestRecords.length = 0;

      await expect(
        restartedProcess.repository.readOntologyReleaseQueryIndex({
          relativePath: inconsistentIndexRelativePath,
        }),
      ).rejects.toMatchObject({
        name: "OntologyQueryError",
        errorCode: "QUERY_INDEX_DIGEST_MISMATCH",
        retryable: false,
      });
      expect(fixture.httpFixture.requestRecords).toEqual([]);
    } finally {
      await fixture.close();
    }
  });
});
