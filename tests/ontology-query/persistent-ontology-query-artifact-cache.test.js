import * as nodeFileSystem from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import { calculateSha256 } from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { OntologyQueryArtifactCacheInitializationError } from "../../src/ontologyQuery/ontologyQueryArtifactCacheInitializationErrors.js";
import {
  parseOntologyQueryChannelLastKnownGoodStateBytes,
  serializeCanonicalOntologyQueryChannelLastKnownGoodState,
} from "../../src/ontologyQuery/ontologyQueryPersistentCacheSchemas.js";
import { createPersistentOntologyQueryArtifactCache } from "../../src/ontologyQuery/persistentOntologyQueryArtifactCache.js";

const BASE_URL_SHA_256 = "c".repeat(64);
const MANIFEST_SHA_256 = "a".repeat(64);
const CATALOG_SHA_256 = "b".repeat(64);
const PERSISTENT_CACHE_WORKER_PATH = fileURLToPath(
  new URL(
    "../fixtures/ontology-query/persistent-cache-worker.js",
    import.meta.url,
  ),
);

function createLastKnownGoodState(overrides = {}) {
  return {
    persistentCacheStateKind:
      "universal_ontology_query_channel_last_known_good_state",
    persistentCacheStateFormatVersion: 1,
    ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
    ontologyQueryArtifactChannelName: "stable",
    ontologyQueryChannelManifestReference: {
      sha256: MANIFEST_SHA_256,
      byteLength: 512,
    },
    ontologyQueryCatalogReference: {
      relativePath: `catalogs/${CATALOG_SHA_256}.json`,
      sha256: CATALOG_SHA_256,
      byteLength: 1_234,
    },
    channelManifestHttpValidator: {
      entityTag: '"published-representation-tag"',
      lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
    },
    ...overrides,
  };
}

async function createTemporaryCacheRoot(prefix) {
  const parent = await nodeFileSystem.mkdtemp(join(tmpdir(), prefix));
  return { parent, cacheRoot: join(parent, "cache") };
}

async function createArtifactFixture(content = '{"fixture":true}\n') {
  const bytes = Buffer.from(content, "utf8");

  return {
    bytes,
    expectedByteLength: bytes.byteLength,
    expectedSha256: await calculateSha256(bytes),
  };
}

async function createInstalledStateFixture(cache, stateOverrides = {}) {
  const manifestArtifact = await createArtifactFixture(
    '{"artifact":"manifest"}\n',
  );
  const catalogArtifact = await createArtifactFixture(
    '{"artifact":"catalog"}\n',
  );

  await cache.installVerifiedArtifact(manifestArtifact);
  await cache.installVerifiedArtifact(catalogArtifact);

  return {
    state: createLastKnownGoodState({
      ontologyQueryChannelManifestReference: {
        sha256: manifestArtifact.expectedSha256,
        byteLength: manifestArtifact.expectedByteLength,
      },
      ontologyQueryCatalogReference: {
        relativePath: `catalogs/${catalogArtifact.expectedSha256}.json`,
        sha256: catalogArtifact.expectedSha256,
        byteLength: catalogArtifact.expectedByteLength,
      },
      ...stateOverrides,
    }),
    manifestArtifact,
    catalogArtifact,
  };
}

function getRepositoryRootPath(cacheRoot) {
  return join(cacheRoot, "repositories", BASE_URL_SHA_256);
}

function getArtifactPath(cacheRoot, expectedSha256) {
  return join(
    getRepositoryRootPath(cacheRoot),
    "artifacts",
    "sha256",
    expectedSha256.slice(0, 2),
    `${expectedSha256}.json`,
  );
}

function getPosixPermissionBits(stats) {
  return stats.mode % 0o1000;
}

function spawnPersistentCacheWorker(arguments_) {
  return spawn(
    process.execPath,
    [PERSISTENT_CACHE_WORKER_PATH, ...arguments_],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

function collectPersistentCacheWorker(childProcess) {
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
      resolve({ exitCode, signal, stdout, stderr });
    });
  });
}

function waitForPersistentCacheWorkerLine(childProcess, timeoutMilliseconds) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error("Timed out waiting for persistent-cache worker output."),
      );
    }, timeoutMilliseconds);

    function cleanup() {
      clearTimeout(timeout);
      childProcess.stdout.off("data", handleData);
      childProcess.off("error", handleError);
      childProcess.off("close", handleClose);
    }

    function handleData(chunk) {
      stdout += chunk.toString("utf8");
      const lineEndingIndex = stdout.indexOf("\n");

      if (lineEndingIndex >= 0) {
        cleanup();
        resolve(stdout.slice(0, lineEndingIndex));
      }
    }

    function handleError(error) {
      cleanup();
      reject(error);
    }

    function handleClose(exitCode) {
      cleanup();
      reject(
        new Error(
          `Persistent-cache worker exited before readiness with code ${exitCode}.`,
        ),
      );
    }

    childProcess.stdout.on("data", handleData);
    childProcess.once("error", handleError);
    childProcess.once("close", handleClose);
  });
}

function waitForChildProcessClose(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    childProcess.once("error", reject);
    childProcess.once("close", resolve);
  });
}

async function expectInitializationFailure(promise, safeErrorCode) {
  let capturedError;

  try {
    await promise;
  } catch (error) {
    capturedError = error;
  }

  expect(capturedError).toBeInstanceOf(
    OntologyQueryArtifactCacheInitializationError,
  );
  expect(capturedError).toMatchObject({
    safeErrorCode,
    message:
      safeErrorCode === "UNSAFE_CACHE_DIRECTORY"
        ? "The ontology query-artifact cache directory is unsafe or unusable."
        : "The ontology query-artifact cache filesystem does not support required no-clobber semantics.",
  });
  expect(capturedError.message).not.toMatch(/[A-Z]:\\|\/tmp\//u);
  return capturedError;
}

describe("persistent ontology query-artifact cache schemas", () => {
  test("round-trips one strict canonical and recursively immutable state", () => {
    const state = createLastKnownGoodState();
    const bytes =
      serializeCanonicalOntologyQueryChannelLastKnownGoodState(state);
    const parsed = parseOntologyQueryChannelLastKnownGoodStateBytes(bytes);

    expect(parsed).toEqual(state);
    expect(bytes.at(-1)).toBe(0x0a);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.ontologyQueryCatalogReference)).toBe(true);
    expect(Object.isFrozen(parsed.channelManifestHttpValidator)).toBe(true);
  });

  test("rejects unknown fields, invalid identities, and unbounded HTTP metadata", () => {
    for (const state of [
      { ...createLastKnownGoodState(), unexpected: true },
      createLastKnownGoodState({
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256.toUpperCase(),
      }),
      createLastKnownGoodState({
        ontologyQueryArtifactChannelName: "latest_stable_releases",
      }),
      createLastKnownGoodState({
        ontologyQueryChannelManifestReference: {
          sha256: MANIFEST_SHA_256,
          byteLength: 0,
        },
      }),
      createLastKnownGoodState({
        channelManifestHttpValidator: {
          entityTag: "not-an-http-entity-tag",
          lastModifiedHttpDate: null,
        },
      }),
      createLastKnownGoodState({
        channelManifestHttpValidator: {
          entityTag: null,
          lastModifiedHttpDate: "not-an-http-date",
        },
      }),
    ]) {
      expect(() =>
        serializeCanonicalOntologyQueryChannelLastKnownGoodState(state),
      ).toThrow();
    }

    expect(() =>
      parseOntologyQueryChannelLastKnownGoodStateBytes(
        Buffer.from(JSON.stringify(createLastKnownGoodState()), "utf8"),
      ),
    ).toThrow(/canonical/u);
  });
});

describe("persistent ontology query-artifact cache initialization", () => {
  test("creates only the owned layout and removes every capability-probe file", async () => {
    const { parent, cacheRoot } =
      await createTemporaryCacheRoot("uo-cache-layout-");

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      const repositoryRoot = join(cacheRoot, "repositories", BASE_URL_SHA_256);
      const expectedDirectories = [
        cacheRoot,
        join(cacheRoot, "repositories"),
        repositoryRoot,
        join(repositoryRoot, "artifacts"),
        join(repositoryRoot, "artifacts", "sha256"),
        join(repositoryRoot, "channels"),
        join(repositoryRoot, "channels", "stable"),
        join(repositoryRoot, "channels", "development"),
        join(repositoryRoot, "locks"),
        join(repositoryRoot, "locks", "artifacts"),
        join(repositoryRoot, "locks", "channels"),
        join(repositoryRoot, "quarantine"),
        join(repositoryRoot, "temporary"),
      ];

      expect(cache).toMatchObject({
        readVerifiedArtifact: expect.any(Function),
        installVerifiedArtifact: expect.any(Function),
        readLastKnownGoodChannelState: expect.any(Function),
        installLastKnownGoodChannelState: expect.any(Function),
        withArtifactPopulationLease: expect.any(Function),
        prune: expect.any(Function),
      });

      for (const directoryPath of expectedDirectories) {
        const stats = await nodeFileSystem.lstat(directoryPath);
        expect(stats.isDirectory()).toBe(true);

        if (process.platform !== "win32") {
          expect(getPosixPermissionBits(stats)).toBe(0o700);
        }
      }

      expect(
        await nodeFileSystem.readdir(join(repositoryRoot, "temporary")),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects a relative root with a path-redacted safe error", async () => {
    expect(isAbsolute("relative/cache")).toBe(false);
    await expectInitializationFailure(
      createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: "relative/cache",
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      }),
      "UNSAFE_CACHE_DIRECTORY",
    );
  });

  test("rejects a regular file or symbolic link as the cache root", async () => {
    const parent = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-cache-root-types-"),
    );
    const regularFilePath = join(parent, "regular-file");
    const targetDirectoryPath = join(parent, "target");
    const linkedRootPath = join(parent, "linked-root");

    try {
      await nodeFileSystem.writeFile(regularFilePath, "not a directory");
      await nodeFileSystem.mkdir(targetDirectoryPath);
      await nodeFileSystem.symlink(
        targetDirectoryPath,
        linkedRootPath,
        process.platform === "win32" ? "junction" : "dir",
      );

      for (const cacheRoot of [regularFilePath, linkedRootPath]) {
        await expectInitializationFailure(
          createPersistentOntologyQueryArtifactCache({
            ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
            ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          }),
          "UNSAFE_CACHE_DIRECTORY",
        );
      }
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects a symbolic-link descendant instead of following it", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-linked-child-",
    );
    const outsideDirectoryPath = join(parent, "outside");

    try {
      await nodeFileSystem.mkdir(cacheRoot);
      await nodeFileSystem.mkdir(outsideDirectoryPath);
      await nodeFileSystem.symlink(
        outsideDirectoryPath,
        join(cacheRoot, "repositories"),
        process.platform === "win32" ? "junction" : "dir",
      );

      await expectInitializationFailure(
        createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        }),
        "UNSAFE_CACHE_DIRECTORY",
      );
      expect(await nodeFileSystem.readdir(outsideDirectoryPath)).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  (process.platform === "win32" ? test.skip : test)(
    "rejects an existing POSIX root writable by group or other users",
    async () => {
      const { parent, cacheRoot } =
        await createTemporaryCacheRoot("uo-cache-mode-");

      try {
        await nodeFileSystem.mkdir(cacheRoot, { mode: 0o770 });
        await nodeFileSystem.chmod(cacheRoot, 0o770);
        await expectInitializationFailure(
          createPersistentOntologyQueryArtifactCache({
            ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
            ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          }),
          "UNSAFE_CACHE_DIRECTORY",
        );
      } finally {
        await nodeFileSystem.rm(parent, { recursive: true, force: true });
      }
    },
  );

  test("rejects a managed entry whose effective owner does not match", async () => {
    const { parent, cacheRoot } =
      await createTemporaryCacheRoot("uo-cache-owner-");
    const effectiveUserId = 10_000;
    const fileSystem = {
      ...nodeFileSystem,
      async lstat(path) {
        const stats = await nodeFileSystem.lstat(path);

        if (path === cacheRoot) {
          return new Proxy(stats, {
            get(target, property, receiver) {
              if (property === "uid") {
                return effectiveUserId + 1;
              }

              return Reflect.get(target, property, receiver);
            },
          });
        }

        return stats;
      },
    };

    try {
      await expectInitializationFailure(
        createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
          platform: "linux",
          effectiveUserId,
        }),
        "UNSAFE_CACHE_DIRECTORY",
      );
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("maps ordinary probe-file permission failure to unsafe-directory state", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-probe-permission-",
    );
    const fileSystem = {
      ...nodeFileSystem,
      async open(path, ...arguments_) {
        if (path.includes("capability-probe") && path.endsWith("-source")) {
          const error = new Error("private path denied");
          error.code = "EACCES";
          throw error;
        }

        return nodeFileSystem.open(path, ...arguments_);
      },
    };

    try {
      const error = await expectInitializationFailure(
        createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
          randomIdentifier: () => "permission-test",
        }),
        "UNSAFE_CACHE_DIRECTORY",
      );
      expect(error.cause).toBeDefined();
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("fails closed when hard links are unavailable and cleans probe names", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-hardlink-unsupported-",
    );
    const fileSystem = {
      ...nodeFileSystem,
      async link() {
        const error = new Error("private hard-link policy");
        error.code = "EPERM";
        throw error;
      },
    };

    try {
      await expectInitializationFailure(
        createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
          randomIdentifier: () => "unsupported-test",
        }),
        "UNSUPPORTED_CACHE_FILE_SYSTEM",
      );
      expect(
        await nodeFileSystem.readdir(
          join(cacheRoot, "repositories", BASE_URL_SHA_256, "temporary"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("requires EEXIST without modifying the collision sentinel", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-hardlink-collision-",
    );
    let linkInvocationCount = 0;
    let observedSentinelBytes;
    const fileSystem = {
      ...nodeFileSystem,
      async link(existingPath, newPath) {
        linkInvocationCount += 1;

        if (linkInvocationCount === 2) {
          observedSentinelBytes = await nodeFileSystem.readFile(newPath);
          return;
        }

        return nodeFileSystem.link(existingPath, newPath);
      },
    };

    try {
      await expectInitializationFailure(
        createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
          randomIdentifier: () => "collision-test",
        }),
        "UNSUPPORTED_CACHE_FILE_SYSTEM",
      );
      expect(observedSentinelBytes?.toString("utf8")).toBe(
        "ontology-query-cache-collision-sentinel",
      );
      expect(
        await nodeFileSystem.readdir(
          join(cacheRoot, "repositories", BASE_URL_SHA_256, "temporary"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects digest traversal before deriving a cache path", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-digest-traversal-",
    );

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });

      await expect(
        cache.readVerifiedArtifact({
          expectedByteLength: 1,
          expectedSha256: `../${MANIFEST_SHA_256}`,
        }),
      ).rejects.toThrow(/SHA-256/u);
      expect(dirname(cacheRoot)).toBe(parent);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });
});

describe("persistent ontology query-artifact cache immutable artifacts", () => {
  test("installs one verified artifact and returns its exact bytes on a warm hit", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-hit-",
    );
    const artifact = await createArtifactFixture();

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });

      expect(await cache.readVerifiedArtifact(artifact)).toBeNull();
      await cache.installVerifiedArtifact(artifact);

      const installedBytes = await cache.readVerifiedArtifact(artifact);
      expect(Buffer.from(installedBytes)).toEqual(artifact.bytes);

      const artifactStats = await nodeFileSystem.lstat(
        getArtifactPath(cacheRoot, artifact.expectedSha256),
      );
      expect(artifactStats.isFile()).toBe(true);

      if (process.platform !== "win32") {
        expect(getPosixPermissionBits(artifactStats)).toBe(0o600);
      }

      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "temporary"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects invalid installation bytes before creating a cache file", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-invalid-",
    );
    const artifact = await createArtifactFixture();

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });

      await expect(
        cache.installVerifiedArtifact({
          ...artifact,
          bytes: Buffer.from("different bytes", "utf8"),
        }),
      ).rejects.toThrow();
      await expect(
        nodeFileSystem.lstat(
          getArtifactPath(cacheRoot, artifact.expectedSha256),
        ),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "temporary"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("quarantines a corrupt exact hit and permits verified repopulation", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-corrupt-",
    );
    const artifact = await createArtifactFixture();

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        randomIdentifier: (() => {
          let sequence = 0;
          return () => `corrupt-test-${(sequence += 1)}`;
        })(),
      });
      const artifactPath = getArtifactPath(cacheRoot, artifact.expectedSha256);

      await cache.installVerifiedArtifact(artifact);
      await nodeFileSystem.writeFile(artifactPath, "corrupt");

      expect(await cache.readVerifiedArtifact(artifact)).toBeNull();
      await expect(nodeFileSystem.lstat(artifactPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "quarantine"),
        ),
      ).toHaveLength(1);

      await cache.installVerifiedArtifact(artifact);
      expect(Buffer.from(await cache.readVerifiedArtifact(artifact))).toEqual(
        artifact.bytes,
      );
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("accepts only a verified no-clobber race winner without using rename", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-race-",
    );
    const artifact = await createArtifactFixture();
    let injectedArtifactRace = false;
    let renameInvocationCount = 0;
    const fileSystem = {
      ...nodeFileSystem,
      async link(existingPath, newPath) {
        if (
          !injectedArtifactRace &&
          newPath.includes(join("artifacts", "sha256"))
        ) {
          injectedArtifactRace = true;
          await nodeFileSystem.link(existingPath, newPath);
          const error = new Error("another installer won");
          error.code = "EEXIST";
          throw error;
        }

        return nodeFileSystem.link(existingPath, newPath);
      },
      async rename(...arguments_) {
        renameInvocationCount += 1;
        return nodeFileSystem.rename(...arguments_);
      },
    };

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        fileSystem,
      });

      await cache.installVerifiedArtifact(artifact);

      expect(injectedArtifactRace).toBe(true);
      expect(renameInvocationCount).toBe(0);
      expect(Buffer.from(await cache.readVerifiedArtifact(artifact))).toEqual(
        artifact.bytes,
      );
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("honors cancellation and removes a failed installation temporary file", async () => {
    const firstTemporaryRoot = await createTemporaryCacheRoot(
      "uo-cache-artifact-cancelled-",
    );
    const secondTemporaryRoot = await createTemporaryCacheRoot(
      "uo-cache-artifact-link-failure-",
    );
    const artifact = await createArtifactFixture();

    try {
      const cancelledCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: firstTemporaryRoot.cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      const controller = new AbortController();
      const cancellationReason = new DOMException("cancelled", "AbortError");
      controller.abort(cancellationReason);

      await expect(
        cancelledCache.installVerifiedArtifact({
          ...artifact,
          signal: controller.signal,
        }),
      ).rejects.toBe(cancellationReason);

      const fileSystem = {
        ...nodeFileSystem,
        async link(existingPath, newPath) {
          if (newPath.includes(join("artifacts", "sha256"))) {
            const error = new Error("simulated installation failure");
            error.code = "EIO";
            throw error;
          }

          return nodeFileSystem.link(existingPath, newPath);
        },
      };
      const failedCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: secondTemporaryRoot.cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        fileSystem,
      });

      await expect(
        failedCache.installVerifiedArtifact(artifact),
      ).rejects.toThrow("simulated installation failure");
      expect(
        await nodeFileSystem.readdir(
          join(
            getRepositoryRootPath(secondTemporaryRoot.cacheRoot),
            "temporary",
          ),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(firstTemporaryRoot.parent, {
        recursive: true,
        force: true,
      });
      await nodeFileSystem.rm(secondTemporaryRoot.parent, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each(["before_write", "after_write", "after_flush"])(
    "removes its temporary file after a %s interruption",
    async (failurePoint) => {
      const { parent, cacheRoot } = await createTemporaryCacheRoot(
        `uo-cache-artifact-${failurePoint}-`,
      );
      const artifact = await createArtifactFixture();
      let injectedFailure = false;
      const fileSystem = {
        ...nodeFileSystem,
        async open(path, ...arguments_) {
          const fileHandle = await nodeFileSystem.open(path, ...arguments_);

          if (
            injectedFailure ||
            !path.includes(`${join("temporary", "artifact-")}`)
          ) {
            return fileHandle;
          }

          return new Proxy(fileHandle, {
            get(target, property) {
              if (property === "writeFile" && failurePoint !== "after_flush") {
                return async (...writeArguments) => {
                  injectedFailure = true;

                  if (failurePoint === "after_write") {
                    await target.writeFile(...writeArguments);
                  }

                  throw new Error(`simulated ${failurePoint} interruption`);
                };
              }

              if (property === "sync" && failurePoint === "after_flush") {
                return async () => {
                  await target.sync();
                  injectedFailure = true;
                  throw new Error(`simulated ${failurePoint} interruption`);
                };
              }

              const value = Reflect.get(target, property, target);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        },
      };

      try {
        const cache = await createPersistentOntologyQueryArtifactCache({
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
        });

        await expect(cache.installVerifiedArtifact(artifact)).rejects.toThrow(
          `simulated ${failurePoint} interruption`,
        );
        expect(injectedFailure).toBe(true);
        expect(
          await nodeFileSystem.readdir(
            join(getRepositoryRootPath(cacheRoot), "temporary"),
          ),
        ).toEqual([]);

        const restartedCache = await createPersistentOntologyQueryArtifactCache(
          {
            ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
            ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          },
        );
        expect(await restartedCache.readVerifiedArtifact(artifact)).toBeNull();
      } finally {
        await nodeFileSystem.rm(parent, { recursive: true, force: true });
      }
    },
  );

  test("accepts a verified artifact after an ambiguous post-hard-link failure", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-after-link-",
    );
    const artifact = await createArtifactFixture();
    let injectedFailure = false;
    const fileSystem = {
      ...nodeFileSystem,
      async link(existingPath, newPath) {
        if (!injectedFailure && newPath.includes(join("artifacts", "sha256"))) {
          await nodeFileSystem.link(existingPath, newPath);
          injectedFailure = true;
          const error = new Error("simulated post-hard-link interruption");
          error.code = "EIO";
          throw error;
        }

        return nodeFileSystem.link(existingPath, newPath);
      },
    };

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        fileSystem,
      });

      await expect(
        cache.installVerifiedArtifact(artifact),
      ).resolves.toBeUndefined();
      expect(injectedFailure).toBe(true);

      const restartedCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      expect(
        Buffer.from(await restartedCache.readVerifiedArtifact(artifact)),
      ).toEqual(artifact.bytes);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });
});

describe("persistent ontology query-artifact cache leases and channel state", () => {
  test("serializes two artifact-population operations under one digest lease", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-lease-",
    );
    const artifact = await createArtifactFixture();
    let concurrentOperationCount = 0;
    let maximumConcurrentOperationCount = 0;
    let releaseFirstOperation;
    const firstOperationMayFinish = new Promise((resolve) => {
      releaseFirstOperation = resolve;
    });

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        leaseRetryDelayMilliseconds: 5,
      });
      const runOperation = (result, waitForRelease = false) =>
        cache.withArtifactPopulationLease({
          expectedSha256: artifact.expectedSha256,
          async operation() {
            concurrentOperationCount += 1;
            maximumConcurrentOperationCount = Math.max(
              maximumConcurrentOperationCount,
              concurrentOperationCount,
            );

            if (waitForRelease) {
              await firstOperationMayFinish;
            }

            concurrentOperationCount -= 1;
            return result;
          },
        });

      const first = runOperation("first", true);
      const second = runOperation("second");
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(maximumConcurrentOperationCount).toBe(1);
      releaseFirstOperation();
      await expect(Promise.all([first, second])).resolves.toEqual([
        "first",
        "second",
      ]);
      expect(maximumConcurrentOperationCount).toBe(1);
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "locks", "artifacts"),
        ),
      ).toEqual([]);
    } finally {
      releaseFirstOperation?.();
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("cancels a waiting lease contender without interrupting its owner", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-lease-cancel-",
    );
    const artifact = await createArtifactFixture();
    let releaseOwner;
    const ownerMayFinish = new Promise((resolve) => {
      releaseOwner = resolve;
    });

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        leaseRetryDelayMilliseconds: 5,
      });
      const owner = cache.withArtifactPopulationLease({
        expectedSha256: artifact.expectedSha256,
        async operation() {
          await ownerMayFinish;
          return "owner completed";
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const controller = new AbortController();
      const cancellationReason = new DOMException("cancelled", "AbortError");
      const contender = cache.withArtifactPopulationLease({
        expectedSha256: artifact.expectedSha256,
        signal: controller.signal,
        operation: () => "must not run",
      });
      controller.abort(cancellationReason);

      await expect(contender).rejects.toBe(cancellationReason);
      releaseOwner();
      await expect(owner).resolves.toBe("owner completed");
    } finally {
      releaseOwner?.();
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("waits for a live lease without holding its owner file open", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-artifact-lease-observation-",
    );
    const artifact = await createArtifactFixture();
    const openedPaths = [];
    const fileSystem = {
      ...nodeFileSystem,
      open(path, ...openArguments) {
        openedPaths.push(path);

        return nodeFileSystem.open(path, ...openArguments);
      },
    };
    let releaseOwner;
    const ownerMayFinish = new Promise((resolve) => {
      releaseOwner = resolve;
    });

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        leaseRetryDelayMilliseconds: 5,
        fileSystem,
      });
      const leaseOwnerFilePath = join(
        getRepositoryRootPath(cacheRoot),
        "locks",
        "artifacts",
        `${artifact.expectedSha256}.lease`,
        "owner.json",
      );
      const owner = cache.withArtifactPopulationLease({
        expectedSha256: artifact.expectedSha256,
        async operation() {
          await ownerMayFinish;
          return "owner completed";
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      openedPaths.length = 0;
      const contender = cache.withArtifactPopulationLease({
        expectedSha256: artifact.expectedSha256,
        operation: () => "contender completed",
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Windows refuses to rename a directory that still has an open
      // descendant, so a contender that reads the owner file on every poll can
      // starve the owner out of its detach attempts when it releases.
      expect(openedPaths).not.toContain(leaseOwnerFilePath);

      releaseOwner();
      await expect(Promise.all([owner, contender])).resolves.toEqual([
        "owner completed",
        "contender completed",
      ]);
    } finally {
      releaseOwner?.();
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("returns null without state and installs one fully validated generation", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-",
    );

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toBeNull();
      const { state } = await createInstalledStateFixture(cache);

      await cache.installLastKnownGoodChannelState({ state });

      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(state);
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "channels", "stable"),
        ),
      ).toEqual(["state-0000000000000001.json"]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects cross-origin state and state whose referenced artifacts are absent", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-invalid-",
    );

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });

      await expect(
        cache.installLastKnownGoodChannelState({
          state: createLastKnownGoodState({
            ontologyQueryArtifactBaseUrlSha256: "d".repeat(64),
          }),
        }),
      ).rejects.toThrow(/base-URL identity/u);
      await expect(
        cache.installLastKnownGoodChannelState({
          state: createLastKnownGoodState(),
        }),
      ).rejects.toThrow(/referenced artifact/u);
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "channels", "stable"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("falls back from a corrupt newest generation and retains two valid states", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-fallback-",
    );

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      const { state: firstState } = await createInstalledStateFixture(cache, {
        channelManifestHttpValidator: {
          entityTag: '"first"',
          lastModifiedHttpDate: null,
        },
      });
      const secondState = {
        ...firstState,
        channelManifestHttpValidator: {
          entityTag: '"second"',
          lastModifiedHttpDate: null,
        },
      };
      const thirdState = {
        ...firstState,
        channelManifestHttpValidator: {
          entityTag: '"third"',
          lastModifiedHttpDate: null,
        },
      };
      const channelDirectoryPath = join(
        getRepositoryRootPath(cacheRoot),
        "channels",
        "stable",
      );

      await cache.installLastKnownGoodChannelState({ state: firstState });
      await cache.installLastKnownGoodChannelState({ state: secondState });
      await nodeFileSystem.writeFile(
        join(channelDirectoryPath, "state-0000000000000002.json"),
        "corrupt",
      );

      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(firstState);

      await cache.installLastKnownGoodChannelState({ state: thirdState });
      expect(await nodeFileSystem.readdir(channelDirectoryPath)).toEqual([
        "state-0000000000000001.json",
        "state-0000000000000003.json",
      ]);
      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(thirdState);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("preserves the preceding valid state when a later generation cannot commit", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-crash-",
    );

    try {
      const firstCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      const { state: firstState } =
        await createInstalledStateFixture(firstCache);
      const secondState = {
        ...firstState,
        channelManifestHttpValidator: {
          entityTag: '"not-committed"',
          lastModifiedHttpDate: null,
        },
      };
      await firstCache.installLastKnownGoodChannelState({ state: firstState });

      const fileSystem = {
        ...nodeFileSystem,
        async link(existingPath, newPath) {
          if (newPath.includes(join("channels", "stable", "state-"))) {
            const error = new Error("simulated state commit failure");
            error.code = "EIO";
            throw error;
          }

          return nodeFileSystem.link(existingPath, newPath);
        },
      };
      const restartedCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        fileSystem,
      });

      await expect(
        restartedCache.installLastKnownGoodChannelState({
          state: secondState,
        }),
      ).rejects.toThrow("simulated state commit failure");
      expect(
        await restartedCache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(firstState);
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "temporary"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("allocates distinct generations to concurrent channel writers", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-writers-",
    );

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        leaseRetryDelayMilliseconds: 5,
      });
      const { state: firstState } = await createInstalledStateFixture(cache, {
        channelManifestHttpValidator: {
          entityTag: '"writer-one"',
          lastModifiedHttpDate: null,
        },
      });
      const secondState = {
        ...firstState,
        channelManifestHttpValidator: {
          entityTag: '"writer-two"',
          lastModifiedHttpDate: null,
        },
      };

      await Promise.all([
        cache.installLastKnownGoodChannelState({ state: firstState }),
        cache.installLastKnownGoodChannelState({ state: secondState }),
      ]);

      const channelDirectoryPath = join(
        getRepositoryRootPath(cacheRoot),
        "channels",
        "stable",
      );
      const generationFileNames = [
        "state-0000000000000001.json",
        "state-0000000000000002.json",
      ];
      expect(await nodeFileSystem.readdir(channelDirectoryPath)).toEqual(
        generationFileNames,
      );

      // Neither writer is promised the lease first, so the durable guarantee is
      // that each one occupies its own generation and that a reader observes
      // whichever of them committed the newest generation.
      const persistedStates = await Promise.all(
        generationFileNames.map(async (fileName) =>
          parseOntologyQueryChannelLastKnownGoodStateBytes(
            await nodeFileSystem.readFile(join(channelDirectoryPath, fileName)),
          ),
        ),
      );
      expect(persistedStates).toContainEqual(firstState);
      expect(persistedStates).toContainEqual(secondState);
      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(persistedStates[1]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("keeps a committed newest state when preceding-generation cleanup fails", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-channel-state-cleanup-failure-",
    );

    try {
      const firstCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      const { state: firstState } =
        await createInstalledStateFixture(firstCache);
      const createStateVariant = (entityTag) => ({
        ...firstState,
        channelManifestHttpValidator: {
          entityTag,
          lastModifiedHttpDate: null,
        },
      });
      const secondState = createStateVariant('"second"');
      const thirdState = createStateVariant('"third-committed"');
      const fourthState = createStateVariant('"fourth"');
      await firstCache.installLastKnownGoodChannelState({ state: firstState });
      await firstCache.installLastKnownGoodChannelState({ state: secondState });

      let injectedCleanupFailure = false;
      const fileSystem = {
        ...nodeFileSystem,
        async unlink(path) {
          if (
            !injectedCleanupFailure &&
            path.endsWith("state-0000000000000001.json")
          ) {
            injectedCleanupFailure = true;
            const error = new Error("simulated state cleanup failure");
            error.code = "EACCES";
            throw error;
          }

          return nodeFileSystem.unlink(path);
        },
      };
      const interruptedCache = await createPersistentOntologyQueryArtifactCache(
        {
          ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
          ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
          fileSystem,
        },
      );

      await expect(
        interruptedCache.installLastKnownGoodChannelState({
          state: thirdState,
        }),
      ).rejects.toThrow("simulated state cleanup failure");
      expect(injectedCleanupFailure).toBe(true);

      const restartedCache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      expect(
        await restartedCache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(thirdState);
      await restartedCache.installLastKnownGoodChannelState({
        state: fourthState,
      });
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "channels", "stable"),
        ),
      ).toEqual(["state-0000000000000003.json", "state-0000000000000004.json"]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });
});

describe("persistent ontology query-artifact cache eviction", () => {
  test("evicts least-recently-used canonical artifact bytes to the exact budget", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-eviction-order-",
    );
    const oldestArtifact = await createArtifactFixture("a".repeat(10));
    const middleArtifact = await createArtifactFixture("b".repeat(20));
    const newestArtifact = await createArtifactFixture("c".repeat(30));

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        maximumPersistentQueryArtifactCacheByteSize: 35,
      });

      for (const artifact of [oldestArtifact, middleArtifact, newestArtifact]) {
        await cache.installVerifiedArtifact(artifact);
      }

      await nodeFileSystem.utimes(
        getArtifactPath(cacheRoot, oldestArtifact.expectedSha256),
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-01T00:00:00.000Z"),
      );
      await nodeFileSystem.utimes(
        getArtifactPath(cacheRoot, middleArtifact.expectedSha256),
        new Date("2026-01-02T00:00:00.000Z"),
        new Date("2026-01-02T00:00:00.000Z"),
      );
      await nodeFileSystem.utimes(
        getArtifactPath(cacheRoot, newestArtifact.expectedSha256),
        new Date("2026-01-03T00:00:00.000Z"),
        new Date("2026-01-03T00:00:00.000Z"),
      );

      await cache.prune({ protectedArtifactSha256Values: new Set() });

      expect(await cache.readVerifiedArtifact(oldestArtifact)).toBeNull();
      expect(await cache.readVerifiedArtifact(middleArtifact)).toBeNull();
      expect(
        Buffer.from(await cache.readVerifiedArtifact(newestArtifact)),
      ).toEqual(newestArtifact.bytes);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("persists verified-read recency before choosing an eviction victim", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-eviction-recency-",
    );
    const recentlyReadArtifact = await createArtifactFixture("x".repeat(16));
    const previouslyNewerArtifact = await createArtifactFixture("y".repeat(16));

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        maximumPersistentQueryArtifactCacheByteSize: 16,
        wallClockTime: () => new Date("2030-01-01T00:00:00.000Z"),
      });
      await cache.installVerifiedArtifact(recentlyReadArtifact);
      await cache.installVerifiedArtifact(previouslyNewerArtifact);
      await nodeFileSystem.utimes(
        getArtifactPath(cacheRoot, recentlyReadArtifact.expectedSha256),
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-01T00:00:00.000Z"),
      );
      await nodeFileSystem.utimes(
        getArtifactPath(cacheRoot, previouslyNewerArtifact.expectedSha256),
        new Date("2026-01-02T00:00:00.000Z"),
        new Date("2026-01-02T00:00:00.000Z"),
      );

      await cache.readVerifiedArtifact(recentlyReadArtifact);
      await cache.prune({ protectedArtifactSha256Values: [] });

      expect(
        Buffer.from(await cache.readVerifiedArtifact(recentlyReadArtifact)),
      ).toEqual(recentlyReadArtifact.bytes);
      expect(
        await cache.readVerifiedArtifact(previouslyNewerArtifact),
      ).toBeNull();
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("protects active artifacts and every retained state's manifest and catalog", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-eviction-protection-",
    );
    const manifestArtifact = await createArtifactFixture("manifest-protected");
    const catalogArtifact = await createArtifactFixture("catalog-protected");
    const activeArtifact = await createArtifactFixture("active-protected");
    const evictableArtifact = await createArtifactFixture("evict-me".repeat(8));
    const protectedByteLength =
      manifestArtifact.expectedByteLength +
      catalogArtifact.expectedByteLength +
      activeArtifact.expectedByteLength;

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        maximumPersistentQueryArtifactCacheByteSize: protectedByteLength - 1,
      });

      for (const artifact of [
        manifestArtifact,
        catalogArtifact,
        activeArtifact,
        evictableArtifact,
      ]) {
        await cache.installVerifiedArtifact(artifact);
      }

      const state = createLastKnownGoodState({
        ontologyQueryChannelManifestReference: {
          sha256: manifestArtifact.expectedSha256,
          byteLength: manifestArtifact.expectedByteLength,
        },
        ontologyQueryCatalogReference: {
          relativePath: `catalogs/${catalogArtifact.expectedSha256}.json`,
          sha256: catalogArtifact.expectedSha256,
          byteLength: catalogArtifact.expectedByteLength,
        },
      });
      await cache.installLastKnownGoodChannelState({ state });

      await cache.prune({
        protectedArtifactSha256Values: [activeArtifact.expectedSha256],
      });

      for (const artifact of [
        manifestArtifact,
        catalogArtifact,
        activeArtifact,
      ]) {
        expect(Buffer.from(await cache.readVerifiedArtifact(artifact))).toEqual(
          artifact.bytes,
        );
      }

      expect(await cache.readVerifiedArtifact(evictableArtifact)).toBeNull();
      expect(
        await cache.readLastKnownGoodChannelState({
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).toEqual(state);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });

  test("continues best-effort eviction after one exact unlink failure", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-eviction-failure-",
    );
    const retainedAfterFailure = await createArtifactFixture("1".repeat(10));
    const secondArtifact = await createArtifactFixture("2".repeat(10));
    const thirdArtifact = await createArtifactFixture("3".repeat(10));
    const operationalEvents = [];
    let simulatedFailureCount = 0;
    const fileSystem = {
      ...nodeFileSystem,
      async unlink(path) {
        if (
          path.endsWith(`${retainedAfterFailure.expectedSha256}.json`) &&
          simulatedFailureCount === 0
        ) {
          simulatedFailureCount += 1;
          const error = new Error("private cleanup failure");
          error.code = "EACCES";
          throw error;
        }

        return nodeFileSystem.unlink(path);
      },
    };

    try {
      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        maximumPersistentQueryArtifactCacheByteSize: 10,
        writeOperationalEvent: (event) => operationalEvents.push(event),
        fileSystem,
      });

      for (const artifact of [
        retainedAfterFailure,
        secondArtifact,
        thirdArtifact,
      ]) {
        await cache.installVerifiedArtifact(artifact);
      }

      for (const [index, artifact] of [
        retainedAfterFailure,
        secondArtifact,
        thirdArtifact,
      ].entries()) {
        const date = new Date(`2026-01-0${index + 1}T00:00:00.000Z`);
        await nodeFileSystem.utimes(
          getArtifactPath(cacheRoot, artifact.expectedSha256),
          date,
          date,
        );
      }

      await expect(
        cache.prune({ protectedArtifactSha256Values: [] }),
      ).resolves.toBeUndefined();

      expect(simulatedFailureCount).toBe(1);
      expect(
        Buffer.from(await cache.readVerifiedArtifact(retainedAfterFailure)),
      ).toEqual(retainedAfterFailure.bytes);
      expect(await cache.readVerifiedArtifact(secondArtifact)).toBeNull();
      expect(await cache.readVerifiedArtifact(thirdArtifact)).toBeNull();
      expect(operationalEvents).toContainEqual({
        eventName: "ontology_query_artifact_cache_eviction_failed",
        severity: "warning",
        outcome: "incomplete",
        safeErrorCode: "CACHE_EVICTION_INCOMPLETE",
        cacheOutcome: "retained",
        byteCount: 10,
      });
      expect(JSON.stringify(operationalEvents)).not.toContain(cacheRoot);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  });
});

describe("persistent ontology query-artifact cache process concurrency", () => {
  test("allows two processes to populate one cold digest without corruption", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-process-population-",
    );
    const artifact = await createArtifactFixture(
      '{"crossProcessFixture":true}\n',
    );
    const workerArguments = [
      "populate",
      cacheRoot,
      BASE_URL_SHA_256,
      artifact.bytes.toString("base64"),
      String(artifact.expectedByteLength),
      artifact.expectedSha256,
    ];

    try {
      const firstWorker = spawnPersistentCacheWorker(workerArguments);
      const secondWorker = spawnPersistentCacheWorker(workerArguments);
      const workerResults = await Promise.all([
        collectPersistentCacheWorker(firstWorker),
        collectPersistentCacheWorker(secondWorker),
      ]);

      for (const result of workerResults) {
        expect(result).toMatchObject({ exitCode: 0, signal: null, stderr: "" });
      }

      expect(
        workerResults
          .map(({ stdout }) => JSON.parse(stdout).cacheOutcome)
          .sort(),
      ).toEqual(["hit", "populated"]);

      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
      });
      expect(Buffer.from(await cache.readVerifiedArtifact(artifact))).toEqual(
        artifact.bytes,
      );
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "locks", "artifacts"),
        ),
      ).toEqual([]);
    } finally {
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  }, 20_000);

  test("recovers an expired lease only after its child-process owner terminates", async () => {
    const { parent, cacheRoot } = await createTemporaryCacheRoot(
      "uo-cache-process-stale-lease-",
    );
    const artifact = await createArtifactFixture();
    const leaseStaleAfterMilliseconds = 100;
    const leaseOwner = spawnPersistentCacheWorker([
      "hold-lease",
      cacheRoot,
      BASE_URL_SHA_256,
      artifact.expectedSha256,
      String(leaseStaleAfterMilliseconds),
    ]);

    try {
      expect(
        JSON.parse(await waitForPersistentCacheWorkerLine(leaseOwner, 10_000)),
      ).toEqual({ workerStatus: "lease_acquired" });
      expect(leaseOwner.kill()).toBe(true);
      await waitForChildProcessClose(leaseOwner);
      await new Promise((resolve) =>
        setTimeout(resolve, leaseStaleAfterMilliseconds + 100),
      );

      const cache = await createPersistentOntologyQueryArtifactCache({
        ontologyQueryArtifactCacheDirectoryPath: cacheRoot,
        ontologyQueryArtifactBaseUrlSha256: BASE_URL_SHA_256,
        leaseAcquisitionTimeoutMilliseconds: 2_000,
        leaseStaleAfterMilliseconds,
        leaseHeartbeatIntervalMilliseconds: 25,
        leaseRetryDelayMilliseconds: 5,
      });
      await expect(
        cache.withArtifactPopulationLease({
          expectedSha256: artifact.expectedSha256,
          operation: () => "recovered",
        }),
      ).resolves.toBe("recovered");
      expect(
        await nodeFileSystem.readdir(
          join(getRepositoryRootPath(cacheRoot), "locks", "artifacts"),
        ),
      ).toEqual([]);
    } finally {
      leaseOwner.kill();
      await waitForChildProcessClose(leaseOwner).catch(() => {});
      await nodeFileSystem.rm(parent, { recursive: true, force: true });
    }
  }, 20_000);
});
