import { createHttpOntologyQueryArtifactReader } from "../../../src/ontologyQuery/httpOntologyQueryArtifactReader.js";
import { createPersistentHttpOntologyQueryArtifactRepository } from "../../../src/ontologyQuery/persistentHttpOntologyQueryArtifactRepository.js";
import { createPersistentOntologyQueryArtifactCache } from "../../../src/ontologyQuery/persistentOntologyQueryArtifactCache.js";

const [
  ontologyQueryArtifactBaseUrl,
  ontologyQueryArtifactCacheDirectoryPath,
  ontologyQueryArtifactBaseUrlSha256,
  ontologyReleaseQueryIndexRelativePath,
  leaseStaleAfterMillisecondsArgument,
] = process.argv.slice(2);

async function run() {
  const leaseStaleAfterMilliseconds =
    leaseStaleAfterMillisecondsArgument === undefined
      ? undefined
      : Number(leaseStaleAfterMillisecondsArgument);
  const persistentOntologyQueryArtifactCache =
    await createPersistentOntologyQueryArtifactCache({
      ontologyQueryArtifactCacheDirectoryPath,
      ontologyQueryArtifactBaseUrlSha256,
      ...(leaseStaleAfterMilliseconds === undefined
        ? {}
        : {
            leaseAcquisitionTimeoutMilliseconds: 5_000,
            leaseHeartbeatIntervalMilliseconds: Math.max(
              10,
              Math.floor(leaseStaleAfterMilliseconds / 4),
            ),
            leaseRetryDelayMilliseconds: 10,
            leaseStaleAfterMilliseconds,
          }),
    });
  const httpOntologyQueryArtifactReader = createHttpOntologyQueryArtifactReader(
    {
      ontologyQueryArtifactBaseUrl,
      allowInsecureLoopbackOntologyQueryArtifactOrigin: true,
      requestTimeoutMilliseconds: 5_000,
    },
  );
  const repository = createPersistentHttpOntologyQueryArtifactRepository({
    ontologyQueryArtifactChannelName: "stable",
    ontologyQueryArtifactBaseUrlSha256,
    persistentOntologyQueryArtifactCache,
    httpOntologyQueryArtifactReader,
  });
  const catalogBytes = await repository.readOntologyQueryCatalog();
  const indexBytes = await repository.readOntologyReleaseQueryIndex({
    relativePath: ontologyReleaseQueryIndexRelativePath,
  });

  process.stdout.write(
    `${JSON.stringify({
      catalogByteLength: catalogBytes.byteLength,
      indexByteLength: indexBytes.byteLength,
    })}\n`,
  );
}

try {
  await run();
} catch (error) {
  // This is a test-only process boundary. Emit only stable exception identity;
  // the parent test already knows its temporary paths and origin details.
  process.stderr.write(
    `${JSON.stringify({
      errorName: error?.name ?? "Error",
      errorCode: error?.errorCode ?? null,
    })}\n`,
  );
  process.exitCode = 1;
}
