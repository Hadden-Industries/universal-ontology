import { jest } from "@jest/globals";

import { createOntologyQueryModule } from "../../src/ontologyQuery/createOntologyQueryModule.js";
import { createFetchOntologyQueryArtifactRepository } from "../../src/ontologyQuery/fetchOntologyQueryArtifactRepository.js";
import {
  createInMemoryOntologyReleaseArtifact,
  serializeOntologyQueryArtifact,
} from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";

const EXPECTED_ORIGIN = "https://example.test";
const ONTOLOGY_QUERY_ROOT_IRI = "https://example.test/ontology/query/v1/";

function createRepository(fetchImplementation = jest.fn()) {
  return createFetchOntologyQueryArtifactRepository({
    ontologyQueryRootIri: ONTOLOGY_QUERY_ROOT_IRI,
    expectedOrigin: EXPECTED_ORIGIN,
    fetchImplementation,
  });
}

function createJsonResponse(body = "{}", options = {}) {
  const headers = new Headers(options.headers);
  headers.set(
    "Content-Type",
    headers.get("Content-Type") ?? "application/json",
  );

  return new Response(body, { ...options, headers });
}

function markResponseAsRedirected(response) {
  Object.defineProperty(response, "redirected", { value: true });
  return response;
}

describe("Fetch ontology query-artifact repository", () => {
  test.each([
    "https://example.test/",
    "https://example.test/path",
    "https://user@example.test",
    "https://example.test?query=1",
    "https://example.test#fragment",
    "https://EXAMPLE.test",
    "https://example.test:443",
    "ftp://example.test",
  ])("rejects a non-canonical expected origin: %s", (expectedOrigin) => {
    expect(() =>
      createFetchOntologyQueryArtifactRepository({
        ontologyQueryRootIri: ONTOLOGY_QUERY_ROOT_IRI,
        expectedOrigin,
        fetchImplementation: jest.fn(),
      }),
    ).toThrow("expectedOrigin must be a canonical HTTP(S) origin string.");
  });

  test.each([
    "https://other.test/ontology/query/v1/",
    "https://user@example.test/ontology/query/v1/",
    "https://example.test/ontology/query/v1/?query=1",
    "https://example.test/ontology/query/v1/#fragment",
    "https://example.test/ontology/query/v1",
    "ftp://example.test/ontology/query/v1/",
  ])("rejects an unsafe ontology query root: %s", (ontologyQueryRootIri) => {
    expect(() =>
      createFetchOntologyQueryArtifactRepository({
        ontologyQueryRootIri,
        expectedOrigin: EXPECTED_ORIGIN,
        fetchImplementation: jest.fn(),
      }),
    ).toThrow(
      "ontologyQueryRootIri must be a same-origin, slash-terminated HTTP(S) URL without credentials, search, or fragment.",
    );
  });

  test.each([
    "../catalog.json",
    "releases/../catalog.json",
    "releases\\catalog.json",
    "/query/v1/catalog.json",
    "releases/%2e%2e/catalog.json",
    "releases/%2fsecret.json",
    "releases/%5csecret.json",
    "releases/file.json?download=1",
    "releases/file.json#fragment",
  ])("rejects a non-contained query-index path: %s", async (relativePath) => {
    const fetchImplementation = jest.fn();
    const repository = createRepository(fetchImplementation);

    await expect(
      repository.readOntologyReleaseQueryIndex({ relativePath }),
    ).rejects.toThrow(
      "The repository relative path must be a normalized contained POSIX path.",
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("reads catalog and immutable release bytes with distinct cache policies", async () => {
    const catalogBytes = Uint8Array.from([0x7b, 0x7d, 0x0a]);
    const releaseBytes = Uint8Array.from([0x5b, 0x5d, 0x0a]);
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(catalogBytes, {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(releaseBytes, {
          headers: {
            "Content-Type": "application/vnd.example.query+json",
          },
        }),
      );
    const repository = createRepository(fetchImplementation);
    const controller = new AbortController();
    const relativePath =
      "releases/universal/core/20260714/" + `${"a".repeat(64)}.json`;

    await expect(
      repository.readOntologyQueryCatalog({ signal: controller.signal }),
    ).resolves.toEqual(catalogBytes);
    await expect(
      repository.readOntologyReleaseQueryIndex({
        relativePath,
        signal: controller.signal,
      }),
    ).resolves.toEqual(releaseBytes);
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      1,
      "https://example.test/ontology/query/v1/catalog.json",
      {
        cache: "no-cache",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: controller.signal,
      },
    );
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      `https://example.test/ontology/query/v1/${relativePath}`,
      {
        cache: "force-cache",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: controller.signal,
      },
    );
  });

  test.each([
    [
      "a non-200 response",
      () => createJsonResponse("private upstream response", { status: 503 }),
      "The ontology query artifact response must have status 200.",
    ],
    [
      "a redirected response",
      () => markResponseAsRedirected(createJsonResponse()),
      "The ontology query artifact response must not be redirected.",
    ],
    [
      "a missing content type",
      () => new Response("{}"),
      "The ontology query artifact response must have a JSON Content-Type.",
    ],
    [
      "a non-JSON content type",
      () => new Response("{}", { headers: { "Content-Type": "text/plain" } }),
      "The ontology query artifact response must have a JSON Content-Type.",
    ],
    [
      "a missing response body",
      () => createJsonResponse(null),
      "The ontology query artifact response must have a readable body.",
    ],
  ])("rejects %s", async (_description, createResponse, expectedMessage) => {
    const repository = createRepository(
      jest.fn().mockResolvedValue(createResponse()),
    );

    await expect(repository.readOntologyQueryCatalog({})).rejects.toThrow(
      expectedMessage,
    );
  });

  test("does not expose a rejected response body in its error", async () => {
    const privateResponseText = "credential=secret-value";
    const repository = createRepository(
      jest
        .fn()
        .mockResolvedValue(
          createJsonResponse(privateResponseText, { status: 500 }),
        ),
    );

    const error = await repository
      .readOntologyQueryCatalog({})
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      "The ontology query artifact response must have status 200.",
    );
    expect(error.message).not.toContain(privateResponseText);
  });

  test.each([
    [
      "catalog",
      1_048_577,
      (repository) => repository.readOntologyQueryCatalog({}),
      "The ontology query catalog response exceeds the 1048576-byte limit.",
    ],
    [
      "release index",
      8_388_609,
      (repository) =>
        repository.readOntologyReleaseQueryIndex({
          relativePath: "releases/universal/core/20260714/index.json",
        }),
      "The ontology release query index response exceeds the 8388608-byte limit.",
    ],
  ])(
    "rejects a declared oversized %s before reading its body",
    async (_description, contentLength, read, expectedMessage) => {
      const repository = createRepository(
        jest.fn().mockResolvedValue(
          createJsonResponse("{}", {
            headers: { "Content-Length": String(contentLength) },
          }),
        ),
      );

      await expect(read(repository)).rejects.toThrow(expectedMessage);
    },
  );

  test("cancels a streamed catalog body as soon as it crosses its byte limit", async () => {
    let cancellationReason;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1_048_576));
        controller.enqueue(Uint8Array.of(1));
      },
      cancel(reason) {
        cancellationReason = reason;
      },
    });
    const repository = createRepository(
      jest.fn().mockResolvedValue(createJsonResponse(body)),
    );

    await expect(repository.readOntologyQueryCatalog({})).rejects.toThrow(
      "The ontology query catalog response exceeds the 1048576-byte limit.",
    );
    expect(cancellationReason).toBeInstanceOf(Error);
  });

  test("rejects an already-aborted read before Fetch", async () => {
    const fetchImplementation = jest.fn();
    const repository = createRepository(fetchImplementation);
    const controller = new AbortController();
    const cancellationReason = new DOMException("cancelled", "AbortError");
    controller.abort(cancellationReason);

    await expect(
      repository.readOntologyQueryCatalog({ signal: controller.signal }),
    ).rejects.toBe(cancellationReason);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("supplies digest-verifiable bytes to the real ontology query module", async () => {
    const releaseArtifact = await createInMemoryOntologyReleaseArtifact({
      ontologyArtifactFamilyId: "universal/core",
      versionTag: "20260714",
    });
    const catalogBytes = serializeOntologyQueryArtifact({
      queryArtifactKind: "universal_ontology_query_catalog",
      queryArtifactFormatVersion: 1,
      releases: [releaseArtifact.catalogRelease],
    });
    const fetchImplementation = async (url) => {
      if (url.endsWith("/catalog.json")) {
        return createJsonResponse(catalogBytes);
      }

      if (url.endsWith(releaseArtifact.queryIndexRelativePath)) {
        return createJsonResponse(releaseArtifact.indexBytes);
      }

      throw new Error(`Unexpected test URL: ${url}`);
    };
    const ontologyQueryArtifactRepository =
      createRepository(fetchImplementation);
    const ontologyQuery = createOntologyQueryModule({
      ontologyQueryArtifactRepository,
      maximumInMemoryQueryIndexCacheByteSize: 1_048_576,
    });

    await expect(
      ontologyQuery.resolveOntologyEntity({
        entityIdentifier: {
          identifierKind: "preferred_label",
          identifierValue: "Person",
        },
        ontologyReleaseSelection: {
          selectionKind: "specified_releases",
          ontologyReleases: [
            {
              ontologyArtifactFamilyId: "universal/core",
              versionTag: "20260714",
            },
          ],
        },
        preferredLanguageTags: ["en-GB", "en"],
      }),
    ).resolves.toMatchObject({
      outcome: "success",
      resolutionStatus: "found",
      ontologyEntities: [
        {
          entityIri: "https://example.com/ontology/test/Person",
        },
      ],
    });
  });
});
