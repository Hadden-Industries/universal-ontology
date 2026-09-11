import * as nodeFileSystem from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const MCP_PACKAGE_PATH = "packages/universal-ontology-mcp-server";
const BUILD_SCRIPT_PATH = `${MCP_PACKAGE_PATH}/scripts/buildUniversalOntologyMcpApplicationBundle.js`;

// Run the actual builder in a separate repository layout. Only the build tool
// is linked: all application inputs, workspace links and nested SDK packages
// belong to this fixture, so esbuild must attribute the real selected owners.
async function createNestedMcpBuildFixture() {
  const repositoryPath = await nodeFileSystem.mkdtemp(
    join(tmpdir(), "uo-mcp-nested-workspace-build-"),
  );
  await nodeFileSystem.writeFile(
    join(repositoryPath, "package.json"),
    JSON.stringify({ private: true, type: "module", version: "99.0.0" }),
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
        { recursive: true },
      );
    }
  }
  await nodeFileSystem.copyFile(
    join(REPOSITORY_ROOT_PATH, MCP_PACKAGE_PATH, "THIRD_PARTY_NOTICES.md"),
    join(repositoryPath, MCP_PACKAGE_PATH, "THIRD_PARTY_NOTICES.md"),
  );
  await nodeFileSystem.mkdir(join(repositoryPath, "node_modules"));
  for (const packageName of [
    "universal-ontology-query",
    "universal-ontology-projection-policy",
  ]) {
    await nodeFileSystem.symlink(
      join(repositoryPath, "packages", packageName),
      join(repositoryPath, "node_modules", packageName),
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  await nodeFileSystem.symlink(
    join(REPOSITORY_ROOT_PATH, "node_modules", "esbuild"),
    join(repositoryPath, "node_modules", "esbuild"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await nodeFileSystem.cp(
    join(REPOSITORY_ROOT_PATH, "node_modules", "zod"),
    join(repositoryPath, "node_modules", "zod"),
    { recursive: true },
  );
  await nodeFileSystem.cp(
    join(REPOSITORY_ROOT_PATH, "node_modules", "zod"),
    join(repositoryPath, MCP_PACKAGE_PATH, "node_modules", "zod"),
    { recursive: true },
  );
  for (const name of ["core", "server"]) {
    const packageName = `@modelcontextprotocol/${name}`;
    const nestedPath = join(
      repositoryPath,
      MCP_PACKAGE_PATH,
      "node_modules",
      packageName,
    );
    await nodeFileSystem.cp(
      join(REPOSITORY_ROOT_PATH, "node_modules", packageName),
      nestedPath,
      { recursive: true },
    );
    const unselectedManifestPath = join(
      repositoryPath,
      "node_modules",
      packageName,
      "package.json",
    );
    await nodeFileSystem.mkdir(dirname(unselectedManifestPath), {
      recursive: true,
    });
    await nodeFileSystem.writeFile(
      unselectedManifestPath,
      JSON.stringify({
        name: packageName,
        version: "99.0.0",
        license: "UNLICENSED",
      }),
    );
  }
  return repositoryPath;
}

test("attributes a nested SDK installation and executable version to the MCP workspace", async () => {
  const repositoryPath = await createNestedMcpBuildFixture();
  try {
    await execFileAsync(
      process.execPath,
      [join(repositoryPath, BUILD_SCRIPT_PATH)],
      { cwd: repositoryPath },
    );
    const metadata = JSON.parse(
      await nodeFileSystem.readFile(
        join(
          repositoryPath,
          "dist/release-work/universal-ontology-mcp-application-bundle.json",
        ),
        "utf8",
      ),
    );
    expect(metadata.packageVersion).toBe("1.0.0");
    for (const name of ["core", "server"]) {
      expect(metadata.bundledComponents).toContainEqual({
        name: `@modelcontextprotocol/${name}`,
        version: "2.0.0",
        license: "MIT",
      });
      expect(
        metadata.bundledInputPaths.some((path) =>
          path.startsWith(
            `${MCP_PACKAGE_PATH}/node_modules/@modelcontextprotocol/${name}/`,
          ),
        ),
      ).toBe(true);
      expect(
        metadata.bundledInputPaths.some((path) =>
          path.startsWith(`node_modules/@modelcontextprotocol/${name}/`),
        ),
      ).toBe(false);
    }
    expect(metadata.bundledInputPaths).toContain(
      `${MCP_PACKAGE_PATH}/package.json`,
    );
    expect(metadata.bundledInputPaths).not.toContain("package.json");
    expect(metadata.bundledComponents).toContainEqual({
      name: "ajv",
      version: "8.18.0",
      license: "MIT",
    });
    const { stdout } = await execFileAsync(process.execPath, [
      join(
        repositoryPath,
        MCP_PACKAGE_PATH,
        "dist/universal-ontology-mcp-server.mjs",
      ),
      "--version",
    ]);
    expect(stdout).toBe("1.0.0\n");
  } finally {
    await nodeFileSystem.rm(repositoryPath, { recursive: true, force: true });
  }
}, 30_000);

test("retains the complete published SDK terms instead of treating its metadata label as complete rights", async () => {
  const noticesText = await nodeFileSystem.readFile(
    join(REPOSITORY_ROOT_PATH, MCP_PACKAGE_PATH, "THIRD_PARTY_NOTICES.md"),
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
    expect(licenseText).toContain(
      "Contributions for which relicensing consent has been obtained",
    );
    expect(licenseText).toContain("CC-BY-4.0");
    expect(noticesText.replaceAll("\r\n", "\n")).toContain(
      licenseText.replaceAll("\r\n", "\n").trimEnd(),
    );
  }
});
