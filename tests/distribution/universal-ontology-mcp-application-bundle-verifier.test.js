import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildUniversalOntologyMcpApplicationBundle } from "../../scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const APPLICATION_BUNDLE_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
  "dist",
  "universal-ontology-mcp-server.mjs",
);
const VERIFIER_MODULE_URL = pathToFileURL(
  join(
    REPOSITORY_ROOT_PATH,
    "scripts",
    "verifyUniversalOntologyMcpApplicationBundle.js",
  ),
).href;

async function importVerifier() {
  return import(VERIFIER_MODULE_URL);
}

describe("Universal Ontology MCP application-bundle verifier", () => {
  beforeAll(async () => {
    await buildUniversalOntologyMcpApplicationBundle();
  });

  test("uses the official client to require the exact development tool surface", async () => {
    const verifierModule = await importVerifier();
    expect(
      typeof verifierModule.verifyUniversalOntologyMcpApplicationBundle,
    ).toBe("function");

    await expect(
      verifierModule.verifyUniversalOntologyMcpApplicationBundle({
        applicationBundlePath: APPLICATION_BUNDLE_PATH,
        ontologyQueryArtifactChannelName: "development",
      }),
    ).resolves.toEqual({
      ontologyQueryArtifactChannelName: "development",
      serverInfo: {
        name: "universal-ontology",
        title: "Universal Ontology",
        version: "1.0.0",
      },
      toolNames: ["search_entities", "resolve_entity"],
    });
  });

  test("supplies and removes a verifier-owned cache directory", async () => {
    const temporaryParentPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "universal-ontology-mcp-verifier-cache-test-"),
    );
    const cacheDirectoryPathRecordPath = join(
      temporaryParentPath,
      "cache-directory-path.txt",
    );
    const cacheArgumentInspectingApplicationBundlePath = join(
      temporaryParentPath,
      "cache-argument-inspecting-application-bundle.mjs",
    );
    const actualApplicationBundleUrl = pathToFileURL(
      APPLICATION_BUNDLE_PATH,
    ).href;
    await nodeFileSystem.writeFile(
      cacheArgumentInspectingApplicationBundlePath,
      `
import * as nodeFileSystem from "node:fs/promises";
import { isAbsolute } from "node:path";

const cacheDirectoryOptionIndex = process.argv.indexOf("--cache-directory");
const cacheDirectoryPath = process.argv[cacheDirectoryOptionIndex + 1];

if (
  cacheDirectoryOptionIndex === -1 ||
  typeof cacheDirectoryPath !== "string" ||
  !isAbsolute(cacheDirectoryPath)
) {
  process.stderr.write('{"event":"missing_absolute_verifier_cache_directory"}\\n');
  process.exit(90);
} else {
  await nodeFileSystem.writeFile(
    ${JSON.stringify(cacheDirectoryPathRecordPath)},
    cacheDirectoryPath,
    "utf8",
  );
  await import(${JSON.stringify(actualApplicationBundleUrl)});
}
`,
      "utf8",
    );

    try {
      const verifierModule = await importVerifier();

      await expect(
        verifierModule.verifyUniversalOntologyMcpApplicationBundle({
          applicationBundlePath: cacheArgumentInspectingApplicationBundlePath,
          ontologyQueryArtifactChannelName: "development",
        }),
      ).resolves.toMatchObject({
        serverInfo: { name: "universal-ontology" },
        toolNames: ["search_entities", "resolve_entity"],
      });

      const verifierOwnedCacheDirectoryPath = await nodeFileSystem.readFile(
        cacheDirectoryPathRecordPath,
        "utf8",
      );
      expect(isAbsolute(verifierOwnedCacheDirectoryPath)).toBe(true);
      await expect(
        nodeFileSystem.stat(verifierOwnedCacheDirectoryPath),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await nodeFileSystem.rm(temporaryParentPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("rejects a path that is not an application-bundle file before spawning", async () => {
    const verifierModule = await importVerifier();
    const missingPath = join(
      REPOSITORY_ROOT_PATH,
      "dist",
      "missing-universal-ontology-mcp-server.mjs",
    );
    await nodeFileSystem.rm(missingPath, { force: true });

    await expect(
      verifierModule.verifyUniversalOntologyMcpApplicationBundle({
        applicationBundlePath: missingPath,
        ontologyQueryArtifactChannelName: "development",
      }),
    ).rejects.toThrow(/application bundle.*file/iu);
  });

  test("rejects an ontology-query artifact channel outside the server contract", async () => {
    const verifierModule = await importVerifier();

    await expect(
      verifierModule.verifyUniversalOntologyMcpApplicationBundle({
        applicationBundlePath: APPLICATION_BUNDLE_PATH,
        ontologyQueryArtifactChannelName: "preview",
      }),
    ).rejects.toThrow(/stable.*development/iu);
  });
});
