import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { OntologyEntitySearchSuccessSchema } from "universal-ontology-query/schemas";
import {
  createInMemoryOntologyReleaseArtifact,
  serializeOntologyQueryArtifact,
} from "../fixtures/ontology-query/createInMemoryOntologyQueryFixture.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE_SHA256 =
  "efbb5401bbe45464f916875b81777c9132fac63f56c8d34b0b3af27601aa163b";
let repositoryPath;

beforeAll(async () => {
  repositoryPath = await nodeFileSystem.mkdtemp(
    join(tmpdir(), "uo-mcp-stdio-development-"),
  );
  const rootManifest = JSON.parse(
    await nodeFileSystem.readFile(
      join(REPOSITORY_ROOT_PATH, "package.json"),
      "utf8",
    ),
  );
  await nodeFileSystem.writeFile(
    join(repositoryPath, "package.json"),
    JSON.stringify(rootManifest),
  );
  for (const [packageName, directories] of [
    ["universal-ontology-mcp-server", ["src", "scripts"]],
    ["universal-ontology-query", ["src"]],
    ["universal-ontology-projection-policy", ["src", "data"]],
  ]) {
    const sourcePath = join(REPOSITORY_ROOT_PATH, "packages", packageName);
    const targetPath = join(repositoryPath, "packages", packageName);
    await nodeFileSystem.mkdir(targetPath, { recursive: true });
    await nodeFileSystem.copyFile(
      join(sourcePath, "package.json"),
      join(targetPath, "package.json"),
    );
    for (const directory of directories) {
      await nodeFileSystem.cp(
        join(sourcePath, directory),
        join(targetPath, directory),
        {
          recursive: true,
        },
      );
    }
  }
  // Reuse declared installed dependencies; execute the copied real MCP entry.
  await nodeFileSystem.symlink(
    join(REPOSITORY_ROOT_PATH, "node_modules"),
    join(repositoryPath, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await nodeFileSystem.mkdir(join(repositoryPath, "scripts"));
  const release = await createInMemoryOntologyReleaseArtifact({
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260830",
  });
  expect(release.catalogRelease.sourceArtifactSha256).toBe(SOURCE_SHA256);
  for (const relativeRoot of ["dist/query/v1", "selected-query-artifacts"]) {
    const queryRoot = join(repositoryPath, relativeRoot);
    const indexPath = join(
      queryRoot,
      ...release.queryIndexRelativePath.split("/"),
    );
    await nodeFileSystem.mkdir(dirname(indexPath), { recursive: true });
    await nodeFileSystem.writeFile(indexPath, release.indexBytes);
    await nodeFileSystem.writeFile(
      join(queryRoot, "catalog.json"),
      serializeOntologyQueryArtifact({
        queryArtifactKind: "universal_ontology_query_catalog",
        queryArtifactFormatVersion: 1,
        releases: [release.catalogRelease],
      }),
    );
  }
  await expect(
    nodeFileSystem.stat(
      join(
        repositoryPath,
        "packages/universal-ontology-mcp-server/dist/query/v1",
      ),
    ),
  ).rejects.toMatchObject({ code: "ENOENT" });
});

afterAll(async () => {
  if (repositoryPath) {
    await nodeFileSystem.rm(repositoryPath, { recursive: true, force: true });
  }
});

test.each([
  {
    description: "default artifact root",
    pathKind: "default",
    invocationSubdirectory: "",
  },
  {
    description: "explicit relative artifact root",
    pathKind: "relative",
    invocationSubdirectory: "",
  },
  {
    description: "environment relative root when invoked from a subdirectory",
    pathKind: "environment",
    invocationSubdirectory: "scripts",
  },
  {
    description: "explicit absolute artifact root",
    pathKind: "absolute",
    invocationSubdirectory: "",
  },
])(
  "root mcp:stdio preserves $description",
  async ({ pathKind, invocationSubdirectory }) => {
    expect(process.env.npm_execpath).toEqual(expect.any(String));
    const artifactArguments = ["--query-artifact-source=file-system"];
    if (pathKind === "relative" || pathKind === "absolute") {
      artifactArguments.push(
        "--query-artifact-root-directory",
        pathKind === "absolute"
          ? join(repositoryPath, "selected-query-artifacts")
          : "selected-query-artifacts",
      );
    }
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        process.env.npm_execpath,
        "--silent",
        "run",
        "mcp:stdio",
        "--",
        ...artifactArguments,
      ],
      cwd: join(repositoryPath, invocationSubdirectory),
      env:
        pathKind === "environment"
          ? {
              UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_ROOT_DIRECTORY:
                "selected-query-artifacts",
            }
          : {},
      stderr: "pipe",
    });
    transport.stderr.resume();
    const client = new Client(
      { name: "ontology-root-stdio-development-test", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "search_entities",
        arguments: {
          queryText: "Person",
          ontologyReleaseSelection: {
            selectionKind: "specified_releases",
            ontologyReleases: [
              {
                ontologyArtifactFamilyId: "universal/core",
                versionTag: "20260830",
              },
            ],
          },
        },
      });
      expect(result).not.toHaveProperty("isError", true);
      const search = OntologyEntitySearchSuccessSchema.parse(
        result.structuredContent,
      );
      expect(search.returnedEntityCount).toBe(1);
      expect(search.resolvedOntologyReleases[0].sourceArtifactSha256).toBe(
        SOURCE_SHA256,
      );
      expect(search.matches[0].ontologyEntity.entityIri).toBe(
        "https://example.com/ontology/test/Person",
      );
    } finally {
      await client.close();
    }
  },
  30_000,
);
