import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import * as nodeFileSystem from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

import {
  calculateSha256,
  verifyCanonicalArtifactReference,
} from "./ontologyQueryArtifactCanonicalBytes.js";
import { OntologyQueryArtifactCacheInitializationError } from "./ontologyQueryArtifactCacheInitializationErrors.js";
import {
  MAX_ONTOLOGY_QUERY_CHANNEL_LAST_KNOWN_GOOD_STATE_BYTE_LENGTH,
  parseOntologyQueryChannelLastKnownGoodStateBytes,
  serializeCanonicalOntologyQueryChannelLastKnownGoodState,
} from "./ontologyQueryPersistentCacheSchemas.js";

const SHA_256_HEXADECIMAL_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_RANDOM_IDENTIFIER_PATTERN = /^[A-Za-z0-9-]{1,128}$/u;
const DEFAULT_MAXIMUM_PERSISTENT_QUERY_ARTIFACT_CACHE_BYTE_SIZE = 536_870_912;
const CHANNEL_STATE_FILE_NAME_PATTERN = /^state-(\d{16})\.json$/u;
const ARTIFACT_DIGEST_DIRECTORY_NAME_PATTERN = /^[0-9a-f]{2}$/u;
const ARTIFACT_FILE_NAME_PATTERN = /^([0-9a-f]{64})\.json$/u;
const ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAME_VALUES = Object.freeze([
  "stable",
  "development",
]);
const LEASE_OWNER_FILE_NAME = "owner.json";
const MAXIMUM_LEASE_OWNER_FILE_BYTE_LENGTH = 4_096;

function createInitializationError(safeErrorCode, cause) {
  return new OntologyQueryArtifactCacheInitializationError(safeErrorCode, {
    cause,
  });
}

function requireSha256(value, fieldName) {
  if (typeof value !== "string" || !SHA_256_HEXADECIMAL_PATTERN.test(value)) {
    throw new TypeError(
      `${fieldName} must be a lowercase SHA-256 hexadecimal digest.`,
    );
  }

  return value;
}

function requirePositiveSafeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${fieldName} must be a positive safe integer.`);
  }

  return value;
}

function copyBytes(bytes) {
  if (bytes instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(bytes));
  }

  if (ArrayBuffer.isView(bytes)) {
    return Buffer.from(
      new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    );
  }

  throw new TypeError("bytes must be an ArrayBuffer or an ArrayBuffer view.");
}

function requireRandomIdentifier(randomIdentifier) {
  const value = randomIdentifier();

  if (
    typeof value !== "string" ||
    !SAFE_RANDOM_IDENTIFIER_PATTERN.test(value)
  ) {
    throw new TypeError(
      "randomIdentifier must return 1 to 128 ASCII letters, digits, or hyphens.",
    );
  }

  return value;
}

function requireOntologyQueryArtifactChannelName(value) {
  if (!ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAME_VALUES.includes(value)) {
    throw new TypeError(
      'ontologyQueryArtifactChannelName must be "stable" or "development".',
    );
  }

  return value;
}

function requireNonNegativeFiniteNumber(value, fieldName) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative finite number.`);
  }

  return value;
}

function requireWallClockDate(wallClockTime) {
  const value = wallClockTime();

  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError("wallClockTime must return a valid Date.");
  }

  return value;
}

function waitForDelay(milliseconds, signal) {
  signal?.throwIfAborted();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(finish, milliseconds);

    function finish() {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }

    function handleAbort() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(
        signal.reason ??
          new DOMException("The operation was aborted.", "AbortError"),
      );
    }

    signal?.addEventListener("abort", handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
    }
  });
}

function isMissingPathError(error) {
  return error?.code === "ENOENT";
}

function isTransientWindowsRenameError(error, platform) {
  return (
    isWindowsPlatform(platform) &&
    ["EACCES", "EBUSY", "EPERM"].includes(error?.code)
  );
}

function isWindowsPlatform(platform) {
  return platform === "win32";
}

function assertContainedPath(rootPath, candidatePath) {
  const relativePath = relative(rootPath, candidatePath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("A managed cache path escaped its owned root.");
  }
}

function verifyManagedStats({
  stats,
  expectedType,
  platform,
  effectiveUserId,
}) {
  if (stats.isSymbolicLink()) {
    throw new Error("A managed cache entry is a symbolic link.");
  }

  const hasExpectedType =
    expectedType === "directory" ? stats.isDirectory() : stats.isFile();

  if (!hasExpectedType) {
    throw new Error("A managed cache entry has an unexpected object type.");
  }

  if (!isWindowsPlatform(platform)) {
    if (effectiveUserId === undefined || stats.uid !== effectiveUserId) {
      throw new Error("A managed cache entry has the wrong effective owner.");
    }

    // eslint-disable-next-line no-bitwise -- POSIX permission masks are bit fields.
    if ((stats.mode & 0o022) !== 0) {
      throw new Error(
        "A managed cache entry is writable by group or other users.",
      );
    }
  }
}

async function readStatsIfPresent(fileSystem, path) {
  try {
    return await fileSystem.lstat(path);
  } catch (error) {
    if (isMissingPathError(error)) {
      return null;
    }

    throw error;
  }
}

async function ensureManagedDirectory({
  path,
  recursive = false,
  fileSystem,
  platform,
  effectiveUserId,
}) {
  let stats = await readStatsIfPresent(fileSystem, path);

  if (!stats) {
    let created = false;

    try {
      const firstCreatedPath = await fileSystem.mkdir(path, {
        recursive,
        mode: 0o700,
      });
      created = recursive ? firstCreatedPath !== undefined : true;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }

    if (created && !isWindowsPlatform(platform)) {
      // `mode` is filtered by umask. Tightening a directory created by this
      // invocation establishes the exact required owner-only mode without
      // changing permissions on a pre-existing path.
      await fileSystem.chmod(path, 0o700);
    }

    stats = await fileSystem.lstat(path);
  }

  verifyManagedStats({
    stats,
    expectedType: "directory",
    platform,
    effectiveUserId,
  });
}

async function verifyManagedTree({
  rootPath,
  directoryPath,
  fileSystem,
  platform,
  effectiveUserId,
}) {
  assertContainedPath(rootPath, directoryPath);
  const entries = await fileSystem.readdir(directoryPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    assertContainedPath(rootPath, entryPath);
    const stats = await fileSystem.lstat(entryPath);

    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      verifyManagedStats({
        stats,
        expectedType: "directory",
        platform,
        effectiveUserId,
      });
      await verifyManagedTree({
        rootPath,
        directoryPath: entryPath,
        fileSystem,
        platform,
        effectiveUserId,
      });
      continue;
    }

    verifyManagedStats({
      stats,
      expectedType: "file",
      platform,
      effectiveUserId,
    });
  }
}

async function removeManagedDirectoryTree({
  rootPath,
  directoryPath,
  fileSystem,
  platform,
  effectiveUserId,
}) {
  assertContainedPath(rootPath, directoryPath);
  const directoryStats = await readStatsIfPresent(fileSystem, directoryPath);

  if (!directoryStats) {
    return;
  }

  verifyManagedStats({
    stats: directoryStats,
    expectedType: "directory",
    platform,
    effectiveUserId,
  });

  for (const entry of await fileSystem.readdir(directoryPath, {
    withFileTypes: true,
  })) {
    const entryPath = join(directoryPath, entry.name);
    assertContainedPath(rootPath, entryPath);
    const entryStats = await fileSystem.lstat(entryPath);

    if (entryStats.isDirectory() && !entryStats.isSymbolicLink()) {
      await removeManagedDirectoryTree({
        rootPath,
        directoryPath: entryPath,
        fileSystem,
        platform,
        effectiveUserId,
      });
      continue;
    }

    verifyManagedStats({
      stats: entryStats,
      expectedType: "file",
      platform,
      effectiveUserId,
    });
    await fileSystem.unlink(entryPath);
  }

  await fileSystem.rmdir(directoryPath);
}

async function writeFlushedPrivateFile({
  path,
  content,
  fileSystem,
  platform,
  effectiveUserId,
}) {
  const fileHandle = await fileSystem.open(path, "wx", 0o600);
  let operationError;

  try {
    if (!isWindowsPlatform(platform)) {
      await fileHandle.chmod(0o600);
    }

    await fileHandle.writeFile(content);
    await fileHandle.sync();
  } catch (error) {
    operationError = error;
  }

  try {
    await fileHandle.close();
  } catch (error) {
    operationError ??= error;
  }

  if (operationError) {
    throw operationError;
  }

  verifyManagedStats({
    stats: await fileSystem.lstat(path),
    expectedType: "file",
    platform,
    effectiveUserId,
  });
}

async function removeOwnedProbePath(fileSystem, path) {
  try {
    await fileSystem.unlink(path);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
}

function haveSameFileIdentity(leftStats, rightStats) {
  return leftStats.dev === rightStats.dev && leftStats.ino === rightStats.ino;
}

function getArtifactPath({ artifactSha256DirectoryPath, expectedSha256 }) {
  const digestDirectoryPath = join(
    artifactSha256DirectoryPath,
    expectedSha256.slice(0, 2),
  );

  return {
    digestDirectoryPath,
    artifactPath: join(digestDirectoryPath, `${expectedSha256}.json`),
  };
}

async function openManagedRegularFile({
  path,
  fileSystem,
  platform,
  effectiveUserId,
  openFlags = "r",
}) {
  const pathStats = await readStatsIfPresent(fileSystem, path);

  if (!pathStats) {
    return null;
  }

  verifyManagedStats({
    stats: pathStats,
    expectedType: "file",
    platform,
    effectiveUserId,
  });

  const fileHandle = await fileSystem.open(path, openFlags);

  try {
    const openedStats = await fileHandle.stat();
    verifyManagedStats({
      stats: openedStats,
      expectedType: "file",
      platform,
      effectiveUserId,
    });

    // Comparing identities closes the lstat/open substitution window: a path
    // replaced by a link or another object is never accepted merely because
    // the object reached through it happens to contain digest-matching bytes.
    if (!haveSameFileIdentity(pathStats, openedStats)) {
      throw new Error("A managed cache file changed while it was opened.");
    }

    return { fileHandle, openedStats };
  } catch (error) {
    await fileHandle.close().catch(() => {});
    throw error;
  }
}

async function quarantineArtifactFile({
  artifactPath,
  artifactStats,
  expectedSha256,
  quarantineDirectoryPath,
  fileSystem,
  platform,
  effectiveUserId,
  randomIdentifier,
}) {
  const currentStats = await readStatsIfPresent(fileSystem, artifactPath);

  if (!currentStats || !haveSameFileIdentity(currentStats, artifactStats)) {
    return false;
  }

  verifyManagedStats({
    stats: currentStats,
    expectedType: "file",
    platform,
    effectiveUserId,
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const quarantinePath = join(
      quarantineDirectoryPath,
      `artifact-${expectedSha256}-${requireRandomIdentifier(randomIdentifier)}.json`,
    );

    try {
      // The already-probed hard-link operation gives quarantine the same
      // no-clobber guarantee as installation. Only after proving the linked
      // object is the corrupt object we read do we unlink the canonical name.
      await fileSystem.link(artifactPath, quarantinePath);
    } catch (error) {
      if (error?.code === "EEXIST") {
        continue;
      }

      if (isMissingPathError(error)) {
        return false;
      }

      throw error;
    }

    const quarantineStats = await fileSystem.lstat(quarantinePath);

    if (!haveSameFileIdentity(quarantineStats, artifactStats)) {
      await fileSystem.unlink(quarantinePath);
      return false;
    }

    try {
      await fileSystem.unlink(artifactPath);
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }

    return true;
  }

  throw new Error("Unable to allocate a unique artifact quarantine name.");
}

async function readVerifiedArtifactFile({
  artifactPath,
  expectedByteLength,
  expectedSha256,
  quarantineDirectoryPath,
  fileSystem,
  platform,
  effectiveUserId,
  randomIdentifier,
  wallClockTime,
  signal,
}) {
  signal?.throwIfAborted();
  let openedFile;

  try {
    openedFile = await openManagedRegularFile({
      path: artifactPath,
      fileSystem,
      platform,
      effectiveUserId,
      openFlags: "r+",
    });
  } catch (error) {
    throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
  }

  if (!openedFile) {
    return null;
  }

  const { fileHandle, openedStats } = openedFile;
  let bytes;
  let verified;

  try {
    bytes = await fileHandle.readFile();
    signal?.throwIfAborted();
    verified =
      bytes.byteLength === expectedByteLength &&
      (await calculateSha256(bytes)) === expectedSha256;

    if (verified) {
      // File-handle timestamps persist LRU recency without reopening a path
      // that another process could substitute after verification.
      const accessTime = wallClockTime();
      await fileHandle.utimes(accessTime, accessTime).catch(() => {});
    }
  } finally {
    await fileHandle.close();
  }

  if (verified) {
    return bytes;
  }

  signal?.throwIfAborted();
  await quarantineArtifactFile({
    artifactPath,
    artifactStats: openedStats,
    expectedSha256,
    quarantineDirectoryPath,
    fileSystem,
    platform,
    effectiveUserId,
    randomIdentifier,
  });
  return null;
}

async function removeInvocationTemporaryFile(fileSystem, temporaryPath) {
  try {
    await fileSystem.unlink(temporaryPath);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
}

async function runNoClobberHardLinkCapabilityProbe({
  temporaryDirectoryPath,
  fileSystem,
  platform,
  effectiveUserId,
  randomIdentifier,
}) {
  const identifier = requireRandomIdentifier(randomIdentifier);
  const sourcePath = join(
    temporaryDirectoryPath,
    `capability-probe-${identifier}-source`,
  );
  const linkedPath = join(
    temporaryDirectoryPath,
    `capability-probe-${identifier}-linked`,
  );
  const sentinelPath = join(
    temporaryDirectoryPath,
    `capability-probe-${identifier}-sentinel`,
  );
  const sourceBytes = Buffer.from(
    "ontology-query-cache-hard-link-source",
    "utf8",
  );
  const sentinelBytes = Buffer.from(
    "ontology-query-cache-collision-sentinel",
    "utf8",
  );
  let failure;
  let failureCode = "UNSAFE_CACHE_DIRECTORY";

  try {
    await writeFlushedPrivateFile({
      path: sourcePath,
      content: sourceBytes,
      fileSystem,
      platform,
      effectiveUserId,
    });
    await writeFlushedPrivateFile({
      path: sentinelPath,
      content: sentinelBytes,
      fileSystem,
      platform,
      effectiveUserId,
    });

    failureCode = "UNSUPPORTED_CACHE_FILE_SYSTEM";
    await fileSystem.link(sourcePath, linkedPath);

    if (
      !Buffer.from(await fileSystem.readFile(linkedPath)).equals(sourceBytes)
    ) {
      throw new Error("The hard-link capability probe changed source bytes.");
    }

    let collisionError;

    try {
      await fileSystem.link(sourcePath, sentinelPath);
    } catch (error) {
      collisionError = error;
    }

    if (collisionError?.code !== "EEXIST") {
      throw new Error(
        "The hard-link capability probe did not preserve an existing destination.",
        { cause: collisionError },
      );
    }

    if (
      !Buffer.from(await fileSystem.readFile(sentinelPath)).equals(
        sentinelBytes,
      )
    ) {
      throw new Error(
        "The hard-link capability probe modified its collision sentinel.",
      );
    }
  } catch (error) {
    failure = error;
  }

  let cleanupError;

  for (const path of [linkedPath, sourcePath, sentinelPath]) {
    try {
      await removeOwnedProbePath(fileSystem, path);
    } catch (error) {
      cleanupError ??= error;
    }
  }

  if (cleanupError) {
    throw createInitializationError("UNSAFE_CACHE_DIRECTORY", cleanupError);
  }

  if (failure) {
    throw createInitializationError(failureCode, failure);
  }
}

/**
 * Create and verify the private on-disk namespace for one artifact base URL.
 * No path-derived platform exception is allowed to escape this trust boundary.
 */
export async function createPersistentOntologyQueryArtifactCache({
  ontologyQueryArtifactCacheDirectoryPath,
  ontologyQueryArtifactBaseUrlSha256,
  maximumPersistentQueryArtifactCacheByteSize = DEFAULT_MAXIMUM_PERSISTENT_QUERY_ARTIFACT_CACHE_BYTE_SIZE,
  writeOperationalEvent = () => {},
  fileSystem = nodeFileSystem,
  platform = process.platform,
  effectiveUserId = typeof process.geteuid === "function"
    ? process.geteuid()
    : undefined,
  randomIdentifier = randomUUID,
  wallClockTime = () => new Date(),
  monotonicTimeMilliseconds = () => performance.now(),
  leaseAcquisitionTimeoutMilliseconds = 15_000,
  leaseStaleAfterMilliseconds = 30_000,
  leaseHeartbeatIntervalMilliseconds = 5_000,
  leaseRetryDelayMilliseconds = 50,
}) {
  requireSha256(
    ontologyQueryArtifactBaseUrlSha256,
    "ontologyQueryArtifactBaseUrlSha256",
  );
  requirePositiveSafeInteger(
    maximumPersistentQueryArtifactCacheByteSize,
    "maximumPersistentQueryArtifactCacheByteSize",
  );
  requireNonNegativeFiniteNumber(
    leaseAcquisitionTimeoutMilliseconds,
    "leaseAcquisitionTimeoutMilliseconds",
  );
  requireNonNegativeFiniteNumber(
    leaseStaleAfterMilliseconds,
    "leaseStaleAfterMilliseconds",
  );
  requireNonNegativeFiniteNumber(
    leaseHeartbeatIntervalMilliseconds,
    "leaseHeartbeatIntervalMilliseconds",
  );
  requireNonNegativeFiniteNumber(
    leaseRetryDelayMilliseconds,
    "leaseRetryDelayMilliseconds",
  );

  if (typeof monotonicTimeMilliseconds !== "function") {
    throw new TypeError("monotonicTimeMilliseconds must be a function.");
  }

  if (typeof writeOperationalEvent !== "function") {
    throw new TypeError("writeOperationalEvent must be a function.");
  }

  if (
    typeof ontologyQueryArtifactCacheDirectoryPath !== "string" ||
    !isAbsolute(ontologyQueryArtifactCacheDirectoryPath)
  ) {
    throw createInitializationError(
      "UNSAFE_CACHE_DIRECTORY",
      new TypeError("The cache root must be absolute."),
    );
  }

  const cacheRootPath = resolve(ontologyQueryArtifactCacheDirectoryPath);
  const repositoryRootPath = join(
    cacheRootPath,
    "repositories",
    ontologyQueryArtifactBaseUrlSha256,
  );
  const managedDirectoryPaths = [
    cacheRootPath,
    join(cacheRootPath, "repositories"),
    repositoryRootPath,
    join(repositoryRootPath, "artifacts"),
    join(repositoryRootPath, "artifacts", "sha256"),
    join(repositoryRootPath, "channels"),
    join(repositoryRootPath, "channels", "stable"),
    join(repositoryRootPath, "channels", "development"),
    join(repositoryRootPath, "locks"),
    join(repositoryRootPath, "locks", "artifacts"),
    join(repositoryRootPath, "locks", "channels"),
    join(repositoryRootPath, "quarantine"),
    join(repositoryRootPath, "temporary"),
  ];

  try {
    for (let index = 0; index < managedDirectoryPaths.length; index += 1) {
      const path = managedDirectoryPaths[index];
      assertContainedPath(cacheRootPath, path);
      await ensureManagedDirectory({
        path,
        recursive: index === 0,
        fileSystem,
        platform,
        effectiveUserId,
      });
    }

    await verifyManagedTree({
      rootPath: cacheRootPath,
      directoryPath: cacheRootPath,
      fileSystem,
      platform,
      effectiveUserId,
    });
  } catch (error) {
    if (error instanceof OntologyQueryArtifactCacheInitializationError) {
      throw error;
    }

    throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
  }

  const temporaryDirectoryPath = join(repositoryRootPath, "temporary");
  const artifactSha256DirectoryPath = join(
    repositoryRootPath,
    "artifacts",
    "sha256",
  );
  const quarantineDirectoryPath = join(repositoryRootPath, "quarantine");
  const artifactLeaseParentDirectoryPath = join(
    repositoryRootPath,
    "locks",
    "artifacts",
  );
  const channelLeaseParentDirectoryPath = join(
    repositoryRootPath,
    "locks",
    "channels",
  );
  await runNoClobberHardLinkCapabilityProbe({
    temporaryDirectoryPath,
    fileSystem,
    platform,
    effectiveUserId,
    randomIdentifier,
  });

  function parseLeaseOwnerBytes(bytes) {
    if (bytes.byteLength > MAXIMUM_LEASE_OWNER_FILE_BYTE_LENGTH) {
      return null;
    }

    try {
      const owner = JSON.parse(Buffer.from(bytes).toString("utf8"));
      const propertyNames = Object.keys(owner ?? {}).sort();

      if (
        propertyNames.length !== 4 ||
        propertyNames[0] !== "leaseOwnerFormatVersion" ||
        propertyNames[1] !== "leaseOwnerKind" ||
        propertyNames[2] !== "ownerProcessId" ||
        propertyNames[3] !== "ownerToken" ||
        owner.leaseOwnerKind !== "universal_ontology_query_cache_lease_owner" ||
        owner.leaseOwnerFormatVersion !== 1 ||
        !Number.isSafeInteger(owner.ownerProcessId) ||
        owner.ownerProcessId < 0 ||
        !SAFE_RANDOM_IDENTIFIER_PATTERN.test(owner.ownerToken)
      ) {
        return null;
      }

      return owner;
    } catch {
      return null;
    }
  }

  async function readLeaseObservation(leaseDirectoryPath) {
    const leaseDirectoryStats = await readStatsIfPresent(
      fileSystem,
      leaseDirectoryPath,
    );

    if (!leaseDirectoryStats) {
      return null;
    }

    verifyManagedStats({
      stats: leaseDirectoryStats,
      expectedType: "directory",
      platform,
      effectiveUserId,
    });
    const ownerPath = join(leaseDirectoryPath, LEASE_OWNER_FILE_NAME);
    const openedOwner = await openManagedRegularFile({
      path: ownerPath,
      fileSystem,
      platform,
      effectiveUserId,
    });

    if (!openedOwner) {
      return {
        owner: null,
        lastHeartbeatMilliseconds: leaseDirectoryStats.mtimeMs,
      };
    }

    const { fileHandle, openedStats } = openedOwner;

    try {
      return {
        owner: parseLeaseOwnerBytes(await fileHandle.readFile()),
        lastHeartbeatMilliseconds: openedStats.mtimeMs,
      };
    } finally {
      await fileHandle.close();
    }
  }

  // Staleness only needs the heartbeat timestamp, so it is read from metadata
  // alone. Opening the owner file would leave a descendant handle on the lease
  // directory, which Windows refuses to rename, starving the owner of the
  // detach it performs when it releases.
  async function readLeaseHeartbeat(leaseDirectoryPath) {
    const leaseDirectoryStats = await readStatsIfPresent(
      fileSystem,
      leaseDirectoryPath,
    );

    if (!leaseDirectoryStats) {
      return null;
    }

    verifyManagedStats({
      stats: leaseDirectoryStats,
      expectedType: "directory",
      platform,
      effectiveUserId,
    });
    const ownerStats = await readStatsIfPresent(
      fileSystem,
      join(leaseDirectoryPath, LEASE_OWNER_FILE_NAME),
    );

    if (!ownerStats) {
      return { lastHeartbeatMilliseconds: leaseDirectoryStats.mtimeMs };
    }

    verifyManagedStats({
      stats: ownerStats,
      expectedType: "file",
      platform,
      effectiveUserId,
    });

    return { lastHeartbeatMilliseconds: ownerStats.mtimeMs };
  }

  async function tryReclaimStaleLease(leaseDirectoryPath) {
    let heartbeat;

    try {
      heartbeat = await readLeaseHeartbeat(leaseDirectoryPath);
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    if (!heartbeat) {
      return true;
    }

    const currentWallClockMilliseconds =
      requireWallClockDate(wallClockTime).getTime();

    if (
      currentWallClockMilliseconds - heartbeat.lastHeartbeatMilliseconds <=
      leaseStaleAfterMilliseconds
    ) {
      return false;
    }

    const detachedLeaseDirectoryPath = `${leaseDirectoryPath}.stale-${requireRandomIdentifier(randomIdentifier)}`;
    assertContainedPath(repositoryRootPath, detachedLeaseDirectoryPath);

    try {
      // A stale contender is allowed to act only after atomically detaching
      // the exact lease name. It never recursively deletes through a path that
      // a new owner can concurrently recreate and begin using.
      await fileSystem.rename(leaseDirectoryPath, detachedLeaseDirectoryPath);
    } catch (error) {
      if (isMissingPathError(error) || error?.code === "EEXIST") {
        return true;
      }

      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    const detachedHeartbeat = await readLeaseHeartbeat(
      detachedLeaseDirectoryPath,
    );
    const detachedLeaseIsStillStale =
      !detachedHeartbeat ||
      currentWallClockMilliseconds -
        detachedHeartbeat.lastHeartbeatMilliseconds >
        leaseStaleAfterMilliseconds;

    if (!detachedLeaseIsStillStale) {
      try {
        await fileSystem.rename(detachedLeaseDirectoryPath, leaseDirectoryPath);
      } catch (error) {
        if (error?.code !== "EEXIST") {
          throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
        }
      }

      return false;
    }

    try {
      await removeManagedDirectoryTree({
        rootPath: repositoryRootPath,
        directoryPath: detachedLeaseDirectoryPath,
        fileSystem,
        platform,
        effectiveUserId,
      });
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    return true;
  }

  async function acquireLease({ leaseDirectoryPath, signal }) {
    const acquisitionDeadline =
      monotonicTimeMilliseconds() + leaseAcquisitionTimeoutMilliseconds;

    while (true) {
      signal?.throwIfAborted();
      const ownerToken = requireRandomIdentifier(randomIdentifier);
      let createdLeaseDirectory = false;

      try {
        await fileSystem.mkdir(leaseDirectoryPath, { mode: 0o700 });
        createdLeaseDirectory = true;

        if (!isWindowsPlatform(platform)) {
          await fileSystem.chmod(leaseDirectoryPath, 0o700);
        }

        const owner = {
          leaseOwnerKind: "universal_ontology_query_cache_lease_owner",
          leaseOwnerFormatVersion: 1,
          ownerProcessId: process.pid,
          ownerToken,
        };
        await writeFlushedPrivateFile({
          path: join(leaseDirectoryPath, LEASE_OWNER_FILE_NAME),
          content: Buffer.from(`${JSON.stringify(owner)}\n`, "utf8"),
          fileSystem,
          platform,
          effectiveUserId,
        });
        return ownerToken;
      } catch (error) {
        if (createdLeaseDirectory) {
          try {
            await removeManagedDirectoryTree({
              rootPath: repositoryRootPath,
              directoryPath: leaseDirectoryPath,
              fileSystem,
              platform,
              effectiveUserId,
            });
          } catch (cleanupError) {
            throw createInitializationError(
              "UNSAFE_CACHE_DIRECTORY",
              cleanupError,
            );
          }

          throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
        }

        if (error?.code !== "EEXIST") {
          throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
        }
      }

      if (await tryReclaimStaleLease(leaseDirectoryPath)) {
        continue;
      }

      if (monotonicTimeMilliseconds() >= acquisitionDeadline) {
        throw new Error(
          "Timed out acquiring an ontology query-artifact cache lease.",
        );
      }

      await waitForDelay(leaseRetryDelayMilliseconds, signal);
    }
  }

  async function heartbeatLease({ leaseDirectoryPath, ownerToken }) {
    const ownerPath = join(leaseDirectoryPath, LEASE_OWNER_FILE_NAME);
    const openedOwner = await openManagedRegularFile({
      path: ownerPath,
      fileSystem,
      platform,
      effectiveUserId,
      openFlags: "r+",
    });

    if (!openedOwner) {
      return false;
    }

    const { fileHandle } = openedOwner;

    try {
      const owner = parseLeaseOwnerBytes(await fileHandle.readFile());

      if (owner?.ownerToken !== ownerToken) {
        return false;
      }

      const heartbeatTime = requireWallClockDate(wallClockTime);
      await fileHandle.utimes(heartbeatTime, heartbeatTime);
      return true;
    } finally {
      await fileHandle.close();
    }
  }

  async function releaseLease({ leaseDirectoryPath, ownerToken }) {
    const observation = await readLeaseObservation(leaseDirectoryPath);

    if (observation?.owner?.ownerToken !== ownerToken) {
      return false;
    }

    const detachedLeaseDirectoryPath = `${leaseDirectoryPath}.release-${requireRandomIdentifier(randomIdentifier)}`;
    assertContainedPath(repositoryRootPath, detachedLeaseDirectoryPath);

    let detached = false;

    for (let attempt = 0; attempt < 20 && !detached; attempt += 1) {
      try {
        await fileSystem.rename(leaseDirectoryPath, detachedLeaseDirectoryPath);
        detached = true;
      } catch (error) {
        if (isMissingPathError(error)) {
          return false;
        }

        if (isTransientWindowsRenameError(error, platform)) {
          // Windows may briefly deny a directory rename while a contender is
          // closing the owner-file handle it used to observe the lease.
          await waitForDelay(Math.max(1, leaseRetryDelayMilliseconds));
          continue;
        }

        throw error;
      }
    }

    if (!detached) {
      throw new Error(
        "Unable to detach an owned ontology query-artifact cache lease.",
      );
    }

    const detachedObservation = await readLeaseObservation(
      detachedLeaseDirectoryPath,
    );

    if (detachedObservation?.owner?.ownerToken !== ownerToken) {
      try {
        await fileSystem.rename(detachedLeaseDirectoryPath, leaseDirectoryPath);
      } catch (error) {
        if (error?.code !== "EEXIST") {
          throw error;
        }
      }

      return false;
    }

    await removeManagedDirectoryTree({
      rootPath: repositoryRootPath,
      directoryPath: detachedLeaseDirectoryPath,
      fileSystem,
      platform,
      effectiveUserId,
    });
    return true;
  }

  async function withLease({ leaseDirectoryPath, signal, operation }) {
    if (typeof operation !== "function") {
      throw new TypeError("operation must be a function.");
    }

    signal?.throwIfAborted();
    assertContainedPath(repositoryRootPath, leaseDirectoryPath);
    const ownerToken = await acquireLease({ leaseDirectoryPath, signal });
    let heartbeatFailure;
    let pendingHeartbeat = Promise.resolve();
    const heartbeatTimer = setInterval(() => {
      pendingHeartbeat = pendingHeartbeat
        .then(async () => {
          if (!(await heartbeatLease({ leaseDirectoryPath, ownerToken }))) {
            throw new Error(
              "Ontology query-artifact cache lease ownership was lost.",
            );
          }
        })
        .catch((error) => {
          heartbeatFailure ??= error;
        });
    }, leaseHeartbeatIntervalMilliseconds);
    heartbeatTimer.unref?.();
    let result;
    let operationError;

    try {
      result = await operation();
    } catch (error) {
      operationError = error;
    } finally {
      clearInterval(heartbeatTimer);
      await pendingHeartbeat;

      try {
        const released = await releaseLease({
          leaseDirectoryPath,
          ownerToken,
        });

        if (!released) {
          heartbeatFailure ??= new Error(
            "Ontology query-artifact cache lease ownership was lost.",
          );
        }
      } catch (error) {
        heartbeatFailure ??= error;
      }
    }

    if (operationError) {
      throw operationError;
    }

    if (heartbeatFailure) {
      throw heartbeatFailure;
    }

    return result;
  }

  async function readVerifiedArtifact({
    expectedByteLength,
    expectedSha256,
    signal,
  }) {
    signal?.throwIfAborted();
    requirePositiveSafeInteger(expectedByteLength, "expectedByteLength");
    requireSha256(expectedSha256, "expectedSha256");
    const { artifactPath } = getArtifactPath({
      artifactSha256DirectoryPath,
      expectedSha256,
    });
    assertContainedPath(repositoryRootPath, artifactPath);

    return readVerifiedArtifactFile({
      artifactPath,
      expectedByteLength,
      expectedSha256,
      quarantineDirectoryPath,
      fileSystem,
      platform,
      effectiveUserId,
      randomIdentifier,
      wallClockTime,
      signal,
    });
  }

  async function installVerifiedArtifact({
    bytes,
    expectedByteLength,
    expectedSha256,
    signal,
  }) {
    signal?.throwIfAborted();
    requirePositiveSafeInteger(expectedByteLength, "expectedByteLength");
    requireSha256(expectedSha256, "expectedSha256");
    const ownedBytes = copyBytes(bytes);
    await verifyCanonicalArtifactReference({
      bytes: ownedBytes,
      expectedByteLength,
      expectedSha256,
    });
    signal?.throwIfAborted();

    const { digestDirectoryPath, artifactPath } = getArtifactPath({
      artifactSha256DirectoryPath,
      expectedSha256,
    });
    assertContainedPath(repositoryRootPath, digestDirectoryPath);
    assertContainedPath(repositoryRootPath, artifactPath);

    try {
      await ensureManagedDirectory({
        path: digestDirectoryPath,
        fileSystem,
        platform,
        effectiveUserId,
      });
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    const temporaryPath = join(
      temporaryDirectoryPath,
      `artifact-${expectedSha256}-${requireRandomIdentifier(randomIdentifier)}.json`,
    );
    assertContainedPath(repositoryRootPath, temporaryPath);
    let operationError;

    try {
      await writeFlushedPrivateFile({
        path: temporaryPath,
        content: ownedBytes,
        fileSystem,
        platform,
        effectiveUserId,
      });
      signal?.throwIfAborted();

      let installed = false;

      for (let attempt = 0; attempt < 8 && !installed; attempt += 1) {
        try {
          // Hard-linking a fully flushed same-filesystem temporary file is
          // the commit point. It creates the digest name or fails without
          // replacing any existing bytes on both advertised host families.
          await fileSystem.link(temporaryPath, artifactPath);
          installed = true;
        } catch (error) {
          const verifiedWinner = await readVerifiedArtifact({
            expectedByteLength,
            expectedSha256,
            signal,
          });

          if (verifiedWinner) {
            // A platform error can be ambiguous after the directory entry was
            // created. Exact verification is sufficient regardless of whether
            // the expected race signal was EEXIST or an indeterminate I/O code.
            installed = true;
          } else if (error?.code !== "EEXIST") {
            throw error;
          }
        }
      }

      if (!installed) {
        throw new Error(
          "Unable to install an immutable artifact after repeated races.",
        );
      }

      signal?.throwIfAborted();
    } catch (error) {
      operationError = error;
    }

    try {
      await removeInvocationTemporaryFile(fileSystem, temporaryPath);
    } catch (error) {
      operationError ??= error;
    }

    if (operationError) {
      throw operationError;
    }
  }

  async function listChannelStateGenerations(ontologyQueryArtifactChannelName) {
    const channelDirectoryPath = join(
      repositoryRootPath,
      "channels",
      ontologyQueryArtifactChannelName,
    );
    const generations = [];

    try {
      for (const entry of await fileSystem.readdir(channelDirectoryPath, {
        withFileTypes: true,
      })) {
        const entryPath = join(channelDirectoryPath, entry.name);
        assertContainedPath(repositoryRootPath, entryPath);
        const stats = await fileSystem.lstat(entryPath);
        verifyManagedStats({
          stats,
          expectedType: "file",
          platform,
          effectiveUserId,
        });
        const match = CHANNEL_STATE_FILE_NAME_PATTERN.exec(entry.name);

        if (!match) {
          continue;
        }

        const generation = Number(match[1]);

        if (!Number.isSafeInteger(generation) || generation < 1) {
          throw new Error("A channel-state generation is outside safe range.");
        }

        generations.push({
          generation,
          fileName: entry.name,
          path: entryPath,
        });
      }
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    return generations.sort(
      (left, right) => right.generation - left.generation,
    );
  }

  async function readChannelStateGeneration({
    generationPath,
    ontologyQueryArtifactChannelName,
    validateReferencedArtifacts,
    signal,
  }) {
    signal?.throwIfAborted();
    let openedState;

    try {
      openedState = await openManagedRegularFile({
        path: generationPath,
        fileSystem,
        platform,
        effectiveUserId,
      });
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    if (!openedState) {
      return null;
    }

    const { fileHandle, openedStats } = openedState;
    let state;

    try {
      if (
        openedStats.size < 1 ||
        openedStats.size >
          MAX_ONTOLOGY_QUERY_CHANNEL_LAST_KNOWN_GOOD_STATE_BYTE_LENGTH
      ) {
        return null;
      }

      const bytes = await fileHandle.readFile();
      signal?.throwIfAborted();

      try {
        state = parseOntologyQueryChannelLastKnownGoodStateBytes(bytes);
      } catch {
        return null;
      }
    } finally {
      await fileHandle.close();
    }

    if (
      state.ontologyQueryArtifactBaseUrlSha256 !==
        ontologyQueryArtifactBaseUrlSha256 ||
      state.ontologyQueryArtifactChannelName !==
        ontologyQueryArtifactChannelName
    ) {
      return null;
    }

    if (!validateReferencedArtifacts) {
      return state;
    }

    const manifestBytes = await readVerifiedArtifact({
      expectedByteLength:
        state.ontologyQueryChannelManifestReference.byteLength,
      expectedSha256: state.ontologyQueryChannelManifestReference.sha256,
      signal,
    });
    const catalogBytes = await readVerifiedArtifact({
      expectedByteLength: state.ontologyQueryCatalogReference.byteLength,
      expectedSha256: state.ontologyQueryCatalogReference.sha256,
      signal,
    });

    return manifestBytes && catalogBytes ? state : null;
  }

  async function readLastKnownGoodChannelState({
    ontologyQueryArtifactChannelName,
    signal,
  }) {
    requireOntologyQueryArtifactChannelName(ontologyQueryArtifactChannelName);
    signal?.throwIfAborted();

    for (const generation of await listChannelStateGenerations(
      ontologyQueryArtifactChannelName,
    )) {
      const state = await readChannelStateGeneration({
        generationPath: generation.path,
        ontologyQueryArtifactChannelName,
        validateReferencedArtifacts: true,
        signal,
      });

      if (state) {
        return state;
      }
    }

    return null;
  }

  async function assertStateReferencedArtifactsArePresent(state, signal) {
    const manifestBytes = await readVerifiedArtifact({
      expectedByteLength:
        state.ontologyQueryChannelManifestReference.byteLength,
      expectedSha256: state.ontologyQueryChannelManifestReference.sha256,
      signal,
    });
    const catalogBytes = await readVerifiedArtifact({
      expectedByteLength: state.ontologyQueryCatalogReference.byteLength,
      expectedSha256: state.ontologyQueryCatalogReference.sha256,
      signal,
    });

    if (!manifestBytes || !catalogBytes) {
      throw new Error(
        "A last-known-good state referenced artifact is absent or corrupt.",
      );
    }
  }

  async function pruneChannelStateGenerations({
    ontologyQueryArtifactChannelName,
    signal,
  }) {
    const generations = await listChannelStateGenerations(
      ontologyQueryArtifactChannelName,
    );
    const retainedGenerationPaths = new Set();

    for (const generation of generations) {
      signal?.throwIfAborted();
      const state = await readChannelStateGeneration({
        generationPath: generation.path,
        ontologyQueryArtifactChannelName,
        validateReferencedArtifacts: true,
        signal,
      });

      if (state && retainedGenerationPaths.size < 2) {
        retainedGenerationPaths.add(generation.path);
      }
    }

    for (const generation of generations) {
      signal?.throwIfAborted();

      if (!retainedGenerationPaths.has(generation.path)) {
        try {
          await fileSystem.unlink(generation.path);
        } catch (error) {
          if (!isMissingPathError(error)) {
            throw error;
          }
        }
      }
    }
  }

  async function installLastKnownGoodChannelState({ state, signal }) {
    signal?.throwIfAborted();
    const canonicalStateBytes =
      serializeCanonicalOntologyQueryChannelLastKnownGoodState(state);
    const canonicalState =
      parseOntologyQueryChannelLastKnownGoodStateBytes(canonicalStateBytes);

    if (
      canonicalState.ontologyQueryArtifactBaseUrlSha256 !==
      ontologyQueryArtifactBaseUrlSha256
    ) {
      throw new TypeError(
        "The channel state base-URL identity does not match this cache namespace.",
      );
    }

    const ontologyQueryArtifactChannelName =
      requireOntologyQueryArtifactChannelName(
        canonicalState.ontologyQueryArtifactChannelName,
      );
    await assertStateReferencedArtifactsArePresent(canonicalState, signal);
    const leaseDirectoryPath = join(
      channelLeaseParentDirectoryPath,
      `${ontologyQueryArtifactChannelName}.lease`,
    );

    return withLease({
      leaseDirectoryPath,
      signal,
      async operation() {
        // Revalidate after waiting for the lease so eviction or a corrupting
        // failure cannot create a newly published incomplete state.
        await assertStateReferencedArtifactsArePresent(canonicalState, signal);
        const temporaryPath = join(
          temporaryDirectoryPath,
          `channel-state-${ontologyQueryArtifactChannelName}-${requireRandomIdentifier(randomIdentifier)}.json`,
        );
        assertContainedPath(repositoryRootPath, temporaryPath);
        let operationError;

        try {
          await writeFlushedPrivateFile({
            path: temporaryPath,
            content: canonicalStateBytes,
            fileSystem,
            platform,
            effectiveUserId,
          });
          signal?.throwIfAborted();
          let committed = false;

          for (let attempt = 0; attempt < 8 && !committed; attempt += 1) {
            const generations = await listChannelStateGenerations(
              ontologyQueryArtifactChannelName,
            );
            const nextGeneration = (generations[0]?.generation ?? 0) + 1;

            if (!Number.isSafeInteger(nextGeneration)) {
              throw new Error(
                "The channel-state generation space is exhausted.",
              );
            }

            const generationPath = join(
              repositoryRootPath,
              "channels",
              ontologyQueryArtifactChannelName,
              `state-${String(nextGeneration).padStart(16, "0")}.json`,
            );
            assertContainedPath(repositoryRootPath, generationPath);

            try {
              // State is append-only: the hard link creates a fresh generation
              // and never relies on replace-existing rename semantics.
              await fileSystem.link(temporaryPath, generationPath);
              committed = true;
            } catch (error) {
              if (error?.code !== "EEXIST") {
                throw error;
              }
            }
          }

          if (!committed) {
            throw new Error(
              "Unable to allocate a channel-state generation after repeated races.",
            );
          }
        } catch (error) {
          operationError = error;
        }

        try {
          await removeInvocationTemporaryFile(fileSystem, temporaryPath);
        } catch (error) {
          operationError ??= error;
        }

        if (operationError) {
          throw operationError;
        }

        await pruneChannelStateGenerations({
          ontologyQueryArtifactChannelName,
          signal,
        });
      },
    });
  }

  function withArtifactPopulationLease({ expectedSha256, signal, operation }) {
    requireSha256(expectedSha256, "expectedSha256");
    const leaseDirectoryPath = join(
      artifactLeaseParentDirectoryPath,
      `${expectedSha256}.lease`,
    );

    return withLease({ leaseDirectoryPath, signal, operation });
  }

  async function listCanonicalArtifactFiles() {
    const artifactFiles = [];

    try {
      for (const digestDirectoryEntry of await fileSystem.readdir(
        artifactSha256DirectoryPath,
        { withFileTypes: true },
      )) {
        const digestDirectoryPath = join(
          artifactSha256DirectoryPath,
          digestDirectoryEntry.name,
        );
        assertContainedPath(repositoryRootPath, digestDirectoryPath);
        const digestDirectoryStats =
          await fileSystem.lstat(digestDirectoryPath);
        verifyManagedStats({
          stats: digestDirectoryStats,
          expectedType: "directory",
          platform,
          effectiveUserId,
        });

        if (
          !ARTIFACT_DIGEST_DIRECTORY_NAME_PATTERN.test(
            digestDirectoryEntry.name,
          )
        ) {
          throw new Error(
            "The artifact cache contains an unexpected digest directory.",
          );
        }

        for (const artifactEntry of await fileSystem.readdir(
          digestDirectoryPath,
          { withFileTypes: true },
        )) {
          const artifactPath = join(digestDirectoryPath, artifactEntry.name);
          assertContainedPath(repositoryRootPath, artifactPath);
          const artifactStats = await fileSystem.lstat(artifactPath);
          verifyManagedStats({
            stats: artifactStats,
            expectedType: "file",
            platform,
            effectiveUserId,
          });
          const match = ARTIFACT_FILE_NAME_PATTERN.exec(artifactEntry.name);

          if (
            !match ||
            match[1].slice(0, 2) !== digestDirectoryEntry.name ||
            !Number.isSafeInteger(artifactStats.size) ||
            artifactStats.size < 0
          ) {
            throw new Error(
              "The artifact cache contains an unexpected artifact file.",
            );
          }

          artifactFiles.push({
            expectedSha256: match[1],
            path: artifactPath,
            stats: artifactStats,
          });
        }
      }
    } catch (error) {
      throw createInitializationError("UNSAFE_CACHE_DIRECTORY", error);
    }

    return artifactFiles;
  }

  async function addRetainedStateArtifactProtection(
    protectedArtifactSha256Values,
    signal,
  ) {
    for (const ontologyQueryArtifactChannelName of ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAME_VALUES) {
      for (const generation of await listChannelStateGenerations(
        ontologyQueryArtifactChannelName,
      )) {
        signal?.throwIfAborted();
        const state = await readChannelStateGeneration({
          generationPath: generation.path,
          ontologyQueryArtifactChannelName,
          validateReferencedArtifacts: false,
          signal,
        });

        if (state) {
          protectedArtifactSha256Values.add(
            state.ontologyQueryChannelManifestReference.sha256,
          );
          protectedArtifactSha256Values.add(
            state.ontologyQueryCatalogReference.sha256,
          );
        }
      }
    }
  }

  async function writeCacheOperationalEvent(event) {
    try {
      await writeOperationalEvent(Object.freeze(event));
    } catch {
      // Observability is deliberately best effort. A callback failure must not
      // turn safe cache cleanup into a query or process failure.
    }
  }

  async function prune({ protectedArtifactSha256Values = [], signal }) {
    signal?.throwIfAborted();

    if (
      protectedArtifactSha256Values === null ||
      typeof protectedArtifactSha256Values === "string" ||
      typeof protectedArtifactSha256Values[Symbol.iterator] !== "function"
    ) {
      throw new TypeError(
        "protectedArtifactSha256Values must be an iterable of SHA-256 digests.",
      );
    }

    const protectedDigests = new Set();

    for (const value of protectedArtifactSha256Values) {
      protectedDigests.add(
        requireSha256(value, "protectedArtifactSha256Values entry"),
      );
    }

    await addRetainedStateArtifactProtection(protectedDigests, signal);
    const artifactFiles = await listCanonicalArtifactFiles();
    let retainedArtifactByteSize = artifactFiles.reduce(
      (total, artifact) => total + artifact.stats.size,
      0,
    );

    artifactFiles.sort(
      (left, right) =>
        left.stats.mtimeMs - right.stats.mtimeMs ||
        left.path.localeCompare(right.path),
    );

    for (const artifact of artifactFiles) {
      signal?.throwIfAborted();

      if (
        retainedArtifactByteSize <=
          maximumPersistentQueryArtifactCacheByteSize ||
        protectedDigests.has(artifact.expectedSha256)
      ) {
        continue;
      }

      try {
        const currentStats = await fileSystem.lstat(artifact.path);
        verifyManagedStats({
          stats: currentStats,
          expectedType: "file",
          platform,
          effectiveUserId,
        });

        if (!haveSameFileIdentity(currentStats, artifact.stats)) {
          continue;
        }

        await fileSystem.unlink(artifact.path);
        retainedArtifactByteSize -= artifact.stats.size;
      } catch (error) {
        if (isMissingPathError(error)) {
          retainedArtifactByteSize -= artifact.stats.size;
          continue;
        }

        await writeCacheOperationalEvent({
          eventName: "ontology_query_artifact_cache_eviction_failed",
          severity: "warning",
          outcome: "incomplete",
          safeErrorCode: "CACHE_EVICTION_INCOMPLETE",
          cacheOutcome: "retained",
          byteCount: artifact.stats.size,
        });
      }
    }
  }

  return Object.freeze({
    readVerifiedArtifact,
    installVerifiedArtifact,
    readLastKnownGoodChannelState,
    installLastKnownGoodChannelState,
    withArtifactPopulationLease,
    prune,
  });
}
