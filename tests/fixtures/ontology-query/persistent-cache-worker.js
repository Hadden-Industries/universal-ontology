import { createPersistentOntologyQueryArtifactCache } from "../../../src/ontologyQuery/persistentOntologyQueryArtifactCache.js";

function requirePositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function writeStandardOutputLine(value) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${JSON.stringify(value)}\n`, "utf8", (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function populateArtifact([
  ontologyQueryArtifactCacheDirectoryPath,
  ontologyQueryArtifactBaseUrlSha256,
  base64Bytes,
  expectedByteLengthValue,
  expectedSha256,
]) {
  const bytes = Buffer.from(base64Bytes, "base64");
  const expectedByteLength = requirePositiveInteger(
    expectedByteLengthValue,
    "expectedByteLength",
  );
  const cache = await createPersistentOntologyQueryArtifactCache({
    ontologyQueryArtifactCacheDirectoryPath,
    ontologyQueryArtifactBaseUrlSha256,
    leaseAcquisitionTimeoutMilliseconds: 5_000,
    leaseRetryDelayMilliseconds: 5,
  });
  const cacheOutcome = await cache.withArtifactPopulationLease({
    expectedSha256,
    async operation() {
      const cachedBytes = await cache.readVerifiedArtifact({
        expectedByteLength,
        expectedSha256,
      });

      if (cachedBytes) {
        return "hit";
      }

      await cache.installVerifiedArtifact({
        bytes,
        expectedByteLength,
        expectedSha256,
      });
      return "populated";
    },
  });

  await writeStandardOutputLine({ cacheOutcome });
}

async function holdArtifactLease([
  ontologyQueryArtifactCacheDirectoryPath,
  ontologyQueryArtifactBaseUrlSha256,
  expectedSha256,
  leaseStaleAfterMillisecondsValue,
]) {
  const leaseStaleAfterMilliseconds = requirePositiveInteger(
    leaseStaleAfterMillisecondsValue,
    "leaseStaleAfterMilliseconds",
  );
  const cache = await createPersistentOntologyQueryArtifactCache({
    ontologyQueryArtifactCacheDirectoryPath,
    ontologyQueryArtifactBaseUrlSha256,
    leaseAcquisitionTimeoutMilliseconds: 5_000,
    leaseStaleAfterMilliseconds,
    leaseHeartbeatIntervalMilliseconds: Math.max(
      10,
      Math.floor(leaseStaleAfterMilliseconds / 4),
    ),
    leaseRetryDelayMilliseconds: 5,
  });

  await cache.withArtifactPopulationLease({
    expectedSha256,
    async operation() {
      await writeStandardOutputLine({ workerStatus: "lease_acquired" });

      // A referenced interval deliberately keeps this fixture process alive;
      // the parent terminates it to simulate an owner that cannot release.
      await new Promise(() => {
        setInterval(() => {}, 1_000);
      });
    },
  });
}

async function main() {
  const [command, ...arguments_] = process.argv.slice(2);

  switch (command) {
    case "populate":
      await populateArtifact(arguments_);
      break;
    case "hold-lease":
      await holdArtifactLease(arguments_);
      break;
    default:
      throw new TypeError(
        `Unsupported persistent-cache worker command: ${command}`,
      );
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`, "utf8");
  process.exitCode = 1;
}
