import * as nodeFileSystem from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import {
  calculateSha256 as calculateOntologyArtifactSha256,
  serializeCanonicalOntologyQueryJsonDocument,
} from "universal-ontology-query/artifacts";
import {
  OntologyEntityResolutionSuccessSchema,
  OntologyEntitySearchSuccessSchema,
} from "universal-ontology-query/schemas";
import { createInMemoryOntologyReleaseArtifact } from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";
import { createOntologyQueryArtifactHttpFixture } from "../fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js";

const execFileAsync = promisify(execFile);

const ROOT_PACKAGE_JSON_URL = new URL("../../package.json", import.meta.url);
const PUBLIC_PACKAGE_DIRECTORY_URL = new URL(
  "../../packages/universal-ontology-mcp-server/",
  import.meta.url,
);
const PUBLIC_PACKAGE_JSON_URL = new URL(
  "package.json",
  PUBLIC_PACKAGE_DIRECTORY_URL,
);
const APPLICATION_BUNDLE_URL = new URL(
  "dist/universal-ontology-mcp-server.mjs",
  PUBLIC_PACKAGE_DIRECTORY_URL,
);
const APPLICATION_BUNDLE_METADATA_URL = new URL(
  "../../dist/release-work/universal-ontology-mcp-application-bundle.json",
  import.meta.url,
);
const APPLICATION_BUNDLE_BUILD_SCRIPT_URL = new URL(
  "../../packages/universal-ontology-mcp-server/scripts/buildUniversalOntologyMcpApplicationBundle.js",
  import.meta.url,
);
const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const NPM_CLI_PATH = process.env.npm_execpath;
const EXPECTED_PACKED_FILE_PATHS = Object.freeze([
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "dist/universal-ontology-mcp-server.mjs",
  "package.json",
]);

const EXPECTED_PUBLIC_PACKAGE_FILES = Object.freeze([
  "dist/universal-ontology-mcp-server.mjs",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
]);
const EXPECTED_PACKAGING_DEV_DEPENDENCIES = Object.freeze({
  ajv: "8.20.0",
  "ajv-formats": "3.0.1",
  tar: "7.5.22",
  yaml: "2.9.0",
  yazl: "3.3.1",
  yauzl: "3.4.0",
});
const EXPECTED_BUNDLED_COMPONENTS = Object.freeze([
  {
    name: "@modelcontextprotocol/core",
    version: "2.0.0",
    license: "MIT",
  },
  {
    name: "@modelcontextprotocol/server",
    version: "2.0.0",
    license: "MIT",
  },
  { name: "ajv", version: "8.18.0", license: "MIT" },
  { name: "ajv-formats", version: "3.0.1", license: "MIT" },
  { name: "fast-deep-equal", version: "3.1.3", license: "MIT" },
  { name: "fast-uri", version: "3.1.0", license: "BSD-3-Clause" },
  { name: "json-schema-traverse", version: "1.0.0", license: "MIT" },
  { name: "zod", version: "4.5.4", license: "MIT" },
]);

async function readJsonDocument(fileUrl) {
  return JSON.parse(await nodeFileSystem.readFile(fileUrl, "utf8"));
}

function normalizeTextFileContent(text) {
  return text.replaceAll("\r\n", "\n").trimEnd();
}

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function runNpm(arguments_, workingDirectoryPath = REPOSITORY_ROOT_PATH) {
  if (!NPM_CLI_PATH) {
    throw new Error("The npm CLI entry path is unavailable to the test.");
  }

  return execFileAsync(process.execPath, [NPM_CLI_PATH, ...arguments_], {
    cwd: workingDirectoryPath,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function parseSingleWorkspacePackResult(standardOutputText) {
  const parsedResult = JSON.parse(standardOutputText);
  const results = Array.isArray(parsedResult)
    ? parsedResult
    : Object.values(parsedResult);

  if (results.length !== 1) {
    throw new Error("Expected exactly one npm workspace pack result.");
  }

  return results[0];
}

async function listRelativeFilePaths(directoryPath) {
  const relativeFilePaths = [];

  async function visit(currentDirectoryPath) {
    const entries = await nodeFileSystem.readdir(currentDirectoryPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath = join(currentDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        relativeFilePaths.push(
          relative(directoryPath, entryPath).split(sep).join("/"),
        );
      } else {
        throw new Error("Installed package contains a non-file entry.");
      }
    }
  }

  await visit(directoryPath);
  return relativeFilePaths.sort((left, right) => left.localeCompare(right));
}

async function createPackagedPersonQueryFixture() {
  const sourceBytes = await nodeFileSystem.readFile(
    new URL(
      "../fixtures/ontology-query/minimal-ontology-release",
      import.meta.url,
    ),
  );
  expect(calculateSha256(sourceBytes)).toBe(
    "efbb5401bbe45464f916875b81777c9132fac63f56c8d34b0b3af27601aa163b",
  );
  const httpFixture = await createOntologyQueryArtifactHttpFixture();
  const releaseArtifact = await createInMemoryOntologyReleaseArtifact({
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
  });
  const catalogBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_catalog",
      queryArtifactFormatVersion: 1,
      releases: [releaseArtifact.catalogRelease],
    }),
  );
  const catalogSha256 = await calculateOntologyArtifactSha256(catalogBytes);
  const catalogRelativePath = `catalogs/${catalogSha256}.json`;
  const manifestBytes = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument({
      queryArtifactKind: "universal_ontology_query_channel_manifest",
      queryArtifactFormatVersion: 1,
      ontologyQueryArtifactChannelName: "stable",
      ontologyQueryCatalogReference: {
        relativePath: catalogRelativePath,
        sha256: catalogSha256,
        byteLength: catalogBytes.byteLength,
      },
    }),
  );
  httpFixture.setResponse("channels/stable.json", {
    bodyBytes: manifestBytes,
  });
  httpFixture.setResponse(catalogRelativePath, { bodyBytes: catalogBytes });
  httpFixture.setResponse(releaseArtifact.queryIndexRelativePath, {
    bodyBytes: releaseArtifact.indexBytes,
  });

  return { httpFixture, releaseArtifact };
}

describe("public Universal Ontology MCP npm package", () => {
  test("declares one public executable workspace without installed runtime dependencies or ontology artifacts", async () => {
    const [rootPackage, publicPackage] = await Promise.all([
      readJsonDocument(ROOT_PACKAGE_JSON_URL),
      readJsonDocument(PUBLIC_PACKAGE_JSON_URL),
    ]);

    expect(rootPackage).toMatchObject({
      private: true,
      packageManager: "npm@12.0.2",
      workspaces: [
        "packages/universal-ontology-mcp-server",
        "packages/universal-ontology-query",
        "packages/universal-ontology-projection-policy",
      ],
    });
    expect(publicPackage).toMatchObject({
      name: "universal-ontology-mcp-server",
      version: "1.0.0",
      description:
        "Read-only local MCP access to versioned Universal Ontology definitions and entity descriptions.",
      type: "module",
      bin: {
        "universal-ontology-mcp-server":
          "dist/universal-ontology-mcp-server.mjs",
      },
      files: EXPECTED_PUBLIC_PACKAGE_FILES,
      engines: { node: ">=24.0.0" },
      mcpName: "io.github.hadden-industries/universal-ontology",
      publishConfig: { access: "public", provenance: true },
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/hadden-industries/universal-ontology.git",
        directory: "packages/universal-ontology-mcp-server",
      },
      homepage:
        "https://github.com/hadden-industries/universal-ontology#universal-ontology-mcp-server",
      bugs: {
        url: "https://github.com/hadden-industries/universal-ontology/issues",
      },
      scripts: {
        build: "node scripts/buildUniversalOntologyMcpApplicationBundle.js",
        test: "node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config ../../jest.config.js --rootDir .",
        stdio: "node scripts/runUniversalOntologyMcpStdioServer.js",
        serve: "node scripts/runLocalOntologyMcpServer.js",
        prepack: "npm run build",
      },
    });
    expect(publicPackage.files).toEqual(EXPECTED_PUBLIC_PACKAGE_FILES);
    expect(publicPackage.keywords).toEqual([
      "model-context-protocol",
      "mcp",
      "ontology",
      "semantic-web",
      "knowledge-graph",
      "universal-ontology",
    ]);

    for (const dependencyFieldName of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "bundledDependencies",
    ]) {
      expect(publicPackage).not.toHaveProperty(dependencyFieldName);
    }
    expect(publicPackage).not.toHaveProperty("exports");
    expect(publicPackage.devDependencies).toEqual({
      "@jest/globals": "30.5.1",
      "@modelcontextprotocol/client": "2.0.0",
      "@modelcontextprotocol/node": "2.0.0",
      "@modelcontextprotocol/server": "2.0.0",
      esbuild: "0.28.2",
      jest: "30.5.1",
      "universal-ontology-query": "1.0.0",
      zod: "4.5.4",
    });

    for (const forbiddenLifecycleScriptName of [
      "preinstall",
      "install",
      "postinstall",
      "prepare",
    ]) {
      expect(publicPackage.scripts).not.toHaveProperty(
        forbiddenLifecycleScriptName,
      );
    }
  });

  test("retains repository distribution tooling and delegates application commands to the MCP owner", async () => {
    const rootPackage = await readJsonDocument(ROOT_PACKAGE_JSON_URL);

    expect(rootPackage.packageManager).toBe("npm@12.0.2");
    expect(rootPackage.workspaces).toEqual([
      "packages/universal-ontology-mcp-server",
      "packages/universal-ontology-query",
      "packages/universal-ontology-projection-policy",
    ]);
    expect(rootPackage.devDependencies).toMatchObject(
      EXPECTED_PACKAGING_DEV_DEPENDENCIES,
    );
    expect(rootPackage.scripts).toMatchObject({
      "mcp:package:build":
        "npm run build --workspace universal-ontology-mcp-server",
      "mcp:package:pack":
        "npm pack --workspace universal-ontology-mcp-server --pack-destination dist/releases",
    });
    expect(rootPackage.devDependencies).not.toHaveProperty("esbuild");
    expect(rootPackage.dependencies).not.toHaveProperty(
      "@modelcontextprotocol/server",
    );
    expect(rootPackage.dependencies).not.toHaveProperty(
      "@modelcontextprotocol/node",
    );
  });

  test("copies the complete repository license into the public package", async () => {
    const [rootLicenseText, publicLicenseText] = await Promise.all([
      nodeFileSystem.readFile(
        new URL("../../LICENSE", import.meta.url),
        "utf8",
      ),
      nodeFileSystem.readFile(
        new URL("LICENSE", PUBLIC_PACKAGE_DIRECTORY_URL),
        "utf8",
      ),
    ]);

    expect(normalizeTextFileContent(publicLicenseText)).toBe(
      normalizeTextFileContent(rootLicenseText),
    );
  });

  test("builds one deterministic executable Node 24 application bundle", async () => {
    const { buildUniversalOntologyMcpApplicationBundle } = await import(
      APPLICATION_BUNDLE_BUILD_SCRIPT_URL.href
    );

    await buildUniversalOntologyMcpApplicationBundle();
    const firstBundleBytes = await nodeFileSystem.readFile(
      APPLICATION_BUNDLE_URL,
    );
    await buildUniversalOntologyMcpApplicationBundle();
    const secondBundleBytes = await nodeFileSystem.readFile(
      APPLICATION_BUNDLE_URL,
    );
    const metadata = await readJsonDocument(APPLICATION_BUNDLE_METADATA_URL);

    expect(firstBundleBytes).toEqual(secondBundleBytes);
    expect(firstBundleBytes.subarray(0, 20).toString("utf8")).toBe(
      "#!/usr/bin/env node\n",
    );
    expect(metadata).toMatchObject({
      applicationBundleMetadataFormatVersion: 1,
      packageName: "universal-ontology-mcp-server",
      packageVersion: "1.0.0",
      bundleRelativePath:
        "packages/universal-ontology-mcp-server/dist/universal-ontology-mcp-server.mjs",
      bundleByteLength: secondBundleBytes.byteLength,
      bundleSha256: calculateSha256(secondBundleBytes),
      bundledComponents: expect.any(Array),
    });
    expect(metadata.approvedDynamicCodeGeneration).toEqual([
      {
        componentName: "ajv",
        componentVersion: "8.18.0",
        occurrenceCount: 1,
        purpose: "Compile MCP JSON Schemas into validation functions",
      },
    ]);
    expect(metadata.bundledComponents).toEqual(EXPECTED_BUNDLED_COMPONENTS);
    const noticesText = await nodeFileSystem.readFile(
      new URL("THIRD_PARTY_NOTICES.md", PUBLIC_PACKAGE_DIRECTORY_URL),
      "utf8",
    );

    for (const component of metadata.bundledComponents) {
      expect(noticesText).toContain(
        `## ${component.name} ${component.version}`,
      );
      expect(noticesText).toContain(`License: ${component.license}`);
    }

    const bundleText = secondBundleBytes.toString("utf8");
    for (const forbiddenContent of [
      resolve(REPOSITORY_ROOT_PATH),
      resolve(REPOSITORY_ROOT_PATH).split(sep).join("/"),
      "extended/universal-extended.owl",
      "reference-data/reference-data.owl",
      "tests/fixtures/ontology-query",
      "A natural or legal person recognised by law.",
      '"mcp:package:build"',
      '"packageManager":"npm@12.0.2"',
      "sourceMappingURL=",
    ]) {
      expect(bundleText).not.toContain(forbiddenContent);
    }

    if (process.platform !== "win32") {
      const bundleStats = await nodeFileSystem.stat(APPLICATION_BUNDLE_URL);
      expect(bundleStats.mode % 0o1000).toBe(0o755);
    }

    const [{ stdout: helpText }, { stdout: versionText }] = await Promise.all([
      execFileAsync(process.execPath, [
        fileURLToPath(APPLICATION_BUNDLE_URL),
        "--help",
      ]),
      execFileAsync(process.execPath, [
        fileURLToPath(APPLICATION_BUNDLE_URL),
        "--version",
      ]),
    ]);
    expect(helpText).toContain("Usage:");
    expect(helpText).toContain("universal-ontology-mcp-server [options]");
    expect(versionText).toBe("1.0.0\n");
  });

  test("keeps the canonical application bundle continuously available while rebuilding", async () => {
    const { buildUniversalOntologyMcpApplicationBundle } = await import(
      APPLICATION_BUNDLE_BUILD_SCRIPT_URL.href
    );
    await buildUniversalOntologyMcpApplicationBundle();

    let continueObserving = true;
    let observedMissingBundle = false;
    let markObserverStarted;
    const observerStarted = new Promise((resolveObserverStarted) => {
      markObserverStarted = resolveObserverStarted;
    });
    const observation = (async () => {
      let firstObservation = true;

      while (continueObserving) {
        try {
          const status = await nodeFileSystem.stat(APPLICATION_BUNDLE_URL);
          expect(status.isFile()).toBe(true);
        } catch (error) {
          if (error?.code !== "ENOENT") {
            throw error;
          }

          observedMissingBundle = true;
        } finally {
          if (firstObservation) {
            firstObservation = false;
            markObserverStarted();
          }
        }

        await new Promise((resolveTurn) => setImmediate(resolveTurn));
      }
    })();

    await observerStarted;

    try {
      await buildUniversalOntologyMcpApplicationBundle();
    } finally {
      continueObserving = false;
      await observation;
    }

    expect(observedMissingBundle).toBe(false);
  });

  test("rejects a linked package distribution directory before cleanup", async () => {
    const { removeUnexpectedPublicPackageDistributionEntries } = await import(
      APPLICATION_BUNDLE_BUILD_SCRIPT_URL.href
    );
    const temporaryRepositoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-linked-package-output-"),
    );
    const externalDirectoryPath = join(
      temporaryRepositoryPath,
      "external-directory",
    );
    const packageDirectoryPath = join(
      temporaryRepositoryPath,
      "packages",
      "universal-ontology-mcp-server",
    );
    const linkedDistributionPath = join(packageDirectoryPath, "dist");
    const externalSentinelPath = join(externalDirectoryPath, "sentinel.txt");

    try {
      await Promise.all([
        nodeFileSystem.mkdir(externalDirectoryPath, { recursive: true }),
        nodeFileSystem.mkdir(packageDirectoryPath, { recursive: true }),
      ]);
      await nodeFileSystem.writeFile(
        externalSentinelPath,
        "must remain outside package cleanup\n",
        "utf8",
      );
      await nodeFileSystem.symlink(
        externalDirectoryPath,
        linkedDistributionPath,
        process.platform === "win32" ? "junction" : "dir",
      );

      await expect(
        removeUnexpectedPublicPackageDistributionEntries(
          linkedDistributionPath,
          temporaryRepositoryPath,
        ),
      ).rejects.toThrow(/symbolic link|junction/iu);
      await expect(
        nodeFileSystem.readFile(externalSentinelPath, "utf8"),
      ).resolves.toBe("must remain outside package cleanup\n");
    } finally {
      // Unlink the directory reference before recursively deleting the scratch
      // root, so cleanup itself can never depend on platform link traversal.
      await nodeFileSystem.unlink(linkedDistributionPath).catch((error) => {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      });
      await nodeFileSystem.rm(temporaryRepositoryPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("dry-runs an npm tarball containing exactly the five public files", async () => {
    const { stdout } = await runNpm([
      "pack",
      "--dry-run",
      "--json",
      "--workspace",
      "universal-ontology-mcp-server",
    ]);
    const packResult = parseSingleWorkspacePackResult(stdout);

    expect(packResult).toMatchObject({
      name: "universal-ontology-mcp-server",
      version: "1.0.0",
      filename: "universal-ontology-mcp-server-1.0.0.tgz",
      entryCount: 5,
      bundled: [],
    });
    expect(packResult.files.map(({ path }) => path)).toEqual(
      EXPECTED_PACKED_FILE_PATHS,
    );
  }, 30_000);

  test("fresh-installs the actual tarball and serves a packaged Person lookup", async () => {
    const temporaryParentPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-npm-package-"),
    );
    const releaseDirectoryPath = join(REPOSITORY_ROOT_PATH, "dist", "releases");
    const installationDirectoryPath = join(temporaryParentPath, "installation");
    let client;
    let personQueryFixture;

    try {
      await Promise.all([
        nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true }),
        nodeFileSystem.mkdir(installationDirectoryPath, { recursive: true }),
      ]);
      await nodeFileSystem.writeFile(
        join(installationDirectoryPath, "package.json"),
        '{"name":"mcp-package-installation-test","private":true}\n',
        "utf8",
      );
      const { stdout: packStandardOutput } = await runNpm([
        "pack",
        "--json",
        "--workspace",
        "universal-ontology-mcp-server",
        "--pack-destination",
        releaseDirectoryPath,
      ]);
      const packResult = parseSingleWorkspacePackResult(packStandardOutput);
      const tarballPath = join(releaseDirectoryPath, packResult.filename);

      await runNpm(
        ["install", "--ignore-scripts", "--omit=dev", "--no-save", tarballPath],
        installationDirectoryPath,
      );
      const installedPackageDirectoryPath = join(
        installationDirectoryPath,
        "node_modules",
        "universal-ontology-mcp-server",
      );
      const installedBundlePath = join(
        installedPackageDirectoryPath,
        "dist",
        "universal-ontology-mcp-server.mjs",
      );
      expect(
        await listRelativeFilePaths(installedPackageDirectoryPath),
      ).toEqual(
        [...EXPECTED_PACKED_FILE_PATHS].sort((left, right) =>
          left.localeCompare(right),
        ),
      );
      const installedNotices = await nodeFileSystem.readFile(
        join(installedPackageDirectoryPath, "THIRD_PARTY_NOTICES.md"),
        "utf8",
      );
      for (const name of ["core", "server"]) {
        const licenseText = await nodeFileSystem.readFile(
          join(
            REPOSITORY_ROOT_PATH,
            "node_modules/@modelcontextprotocol",
            name,
            "LICENSE",
          ),
          "utf8",
        );
        expect(installedNotices.replaceAll("\r\n", "\n")).toContain(
          licenseText.replaceAll("\r\n", "\n").trimEnd(),
        );
      }
      expect(
        (
          await nodeFileSystem.readdir(
            join(installationDirectoryPath, "node_modules"),
          )
        ).filter((name) => !name.startsWith(".")),
      ).toEqual(["universal-ontology-mcp-server"]);
      await expect(
        nodeFileSystem.lstat(
          join(
            installationDirectoryPath,
            "node_modules",
            ".bin",
            process.platform === "win32"
              ? "universal-ontology-mcp-server.cmd"
              : "universal-ontology-mcp-server",
          ),
        ),
      ).resolves.toBeDefined();

      for (const installedRelativePath of await listRelativeFilePaths(
        installedPackageDirectoryPath,
      )) {
        const normalizedLowercasePath = installedRelativePath.toLowerCase();
        expect(normalizedLowercasePath).not.toContain("query/v1");
        expect(normalizedLowercasePath).not.toContain("fixture");
        expect(normalizedLowercasePath.endsWith(".owl")).toBe(false);
        expect(normalizedLowercasePath.endsWith(".jsonld")).toBe(false);
      }

      const [{ stdout: helpText }, { stdout: versionText }] = await Promise.all(
        [
          execFileAsync(process.execPath, [installedBundlePath, "--help"]),
          execFileAsync(process.execPath, [installedBundlePath, "--version"]),
        ],
      );
      expect(helpText).toContain("universal-ontology-mcp-server [options]");
      expect(versionText).toBe("1.0.0\n");

      personQueryFixture = await createPackagedPersonQueryFixture();
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [
          installedBundlePath,
          "--artifact-channel=stable",
          `--artifact-base-url=${personQueryFixture.httpFixture.ontologyQueryArtifactBaseUrl}`,
          "--cache-directory",
          join(temporaryParentPath, "cache"),
          "--allow-insecure-loopback-artifact-origin",
        ],
        cwd: installationDirectoryPath,
        stderr: "pipe",
      });
      client = new Client(
        { name: "packaged-mcp-installation-test", version: "1.0.0" },
        { versionNegotiation: { mode: { pin: "2026-07-28" } } },
      );
      await client.connect(transport);
      const toolList = await client.listTools();
      expect(toolList.tools.map(({ name }) => name)).toEqual([
        "search_entities",
        "resolve_entity",
      ]);
      const result = await client.callTool({
        name: "search_entities",
        arguments: {
          queryText: "Person",
          preferredLanguageTags: ["en-GB", "en"],
          ontologyReleaseSelection: {
            selectionKind: "specified_releases",
            ontologyReleases: [
              {
                ontologyArtifactFamilyId: "universal/core",
                versionTag: "20260714",
              },
            ],
          },
        },
      });
      expect(result).toMatchObject({
        structuredContent: {
          outcome: "success",
          totalMatchedEntityCount: 1,
          matches: [
            {
              ontologyEntity: {
                selectedPreferredLabel: {
                  literalValue: { lexicalForm: "Person" },
                },
              },
            },
          ],
        },
      });
      expect(result.isError).not.toBe(true);
      const searchContent = OntologyEntitySearchSuccessSchema.parse(
        result.structuredContent,
      );
      expectPackagedAuthoredPerson(searchContent.matches[0].ontologyEntity);
      const resolution = await client.callTool({
        name: "resolve_entity",
        arguments: {
          entityIdentifier: {
            identifierKind: "entity_iri",
            identifierValue: "https://example.com/ontology/test/Person",
          },
          preferredLanguageTags: ["en-GB", "en"],
          ontologyReleaseSelection: {
            selectionKind: "specified_releases",
            ontologyReleases: [
              {
                ontologyArtifactFamilyId: "universal/core",
                versionTag: "20260714",
              },
            ],
          },
        },
      });
      expect(resolution.isError).not.toBe(true);
      const resolutionContent = OntologyEntityResolutionSuccessSchema.parse(
        resolution.structuredContent,
      );
      expect(resolutionContent.resolutionStatus).toBe("found");
      expect(resolutionContent.ontologyEntities).toHaveLength(1);
      expectPackagedAuthoredPerson(resolutionContent.ontologyEntities[0]);
    } finally {
      await client?.close().catch(() => {});
      await personQueryFixture?.httpFixture.close().catch(() => {});
      await nodeFileSystem.rm(temporaryParentPath, {
        recursive: true,
        force: true,
      });
    }
  }, 60_000);
});

// Independently authored expectations from the digest-bound RDF/XML fixture.
// Entity provenance and definition-axiom provenance have different subjects.
function expectPackagedAuthoredPerson(entity) {
  const expectedRelease = {
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
    sourceArtifactUrl: "https://example.com/ontology/universal/core/20260714",
    sourceArtifactSha256:
      "efbb5401bbe45464f916875b81777c9132fac63f56c8d34b0b3af27601aa163b",
    ontologyIri: "https://example.com/ontology/test",
    versionIri: "https://example.com/ontology/test/20260830",
  };
  const definitionValue = {
    lexicalForm: "A natural or legal person recognised by law.",
    datatypeIri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    languageTag: "en-gb",
  };
  expect(entity.entityIri).toBe("https://example.com/ontology/test/Person");
  expect(entity.selectedLexicalDefinition).toEqual({
    resolvedOntologyRelease: expectedRelease,
    assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
    literalValue: definitionValue,
    selectionBasis: "preferred_language_exact",
  });
  expect(entity.sourceArtifactDescriptions).toHaveLength(1);
  const [description] = entity.sourceArtifactDescriptions;
  expect(description).toMatchObject({
    resolvedOntologyRelease: expectedRelease,
    assertionScope: "source_artifact_graph",
    entityKinds: ["owl_class"],
    entitySourceIris: ["urn:iso:std:iso:example:term:person"],
    directNamedSuperclassIris: ["https://example.com/ontology/test/Agent"],
  });
  expect(description.lexicalDefinitionAssertions).toHaveLength(2);
  expect(description.lexicalDefinitionAssertions).toEqual(
    expect.arrayContaining([
      {
        assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
        literalValue: definitionValue,
        assertionAnnotations: [
          {
            annotationPropertyIri: "http://purl.org/dc/terms/source",
            annotationValue: {
              termKind: "named_node",
              iri: "https://example.com/standard/person-definition",
            },
          },
        ],
      },
      {
        assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
        literalValue: {
          lexicalForm: "A person with legal standing.",
          datatypeIri: "http://www.w3.org/2001/XMLSchema#string",
          languageTag: null,
        },
        assertionAnnotations: [],
      },
    ]),
  );
}
