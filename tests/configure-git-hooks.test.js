import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const configurationModuleUrl = new URL(
  "../scripts/configureGitHooks.js",
  import.meta.url,
).href;
const preCommitHookPath = fileURLToPath(
  new URL("../.githooks/pre-commit", import.meta.url),
);

let temporaryDirectoryPath;
let repositoryRoot;
let fixtureEnvironment;

function runGit(commandArguments, options = {}) {
  return spawnSync("git", ["-C", repositoryRoot, ...commandArguments], {
    cwd: temporaryDirectoryPath,
    env: fixtureEnvironment,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function requireGitSuccess(commandArguments) {
  const result = runGit(commandArguments);
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr);
  }
  return result.stdout.trim();
}

function runConfiguration({
  selectedRepositoryRoot = repositoryRoot,
  environment = fixtureEnvironment,
} = {}) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { configureGitHooks } from ${JSON.stringify(configurationModuleUrl)};
configureGitHooks({ repositoryRoot: ${JSON.stringify(selectedRepositoryRoot)} });`,
    ],
    {
      cwd: temporaryDirectoryPath,
      env: environment,
      encoding: "utf8",
      windowsHide: true,
    },
  );
}

function writeExecutable(relativePath, contents) {
  const executablePath = join(repositoryRoot, relativePath);
  mkdirSync(dirname(executablePath), { recursive: true });
  writeFileSync(executablePath, contents, { mode: 0o755 });
}

beforeEach(() => {
  temporaryDirectoryPath = mkdtempSync(
    join(tmpdir(), "universal-ontology-git-hooks-"),
  );
  repositoryRoot = join(temporaryDirectoryPath, "checkout with spaces");
  mkdirSync(repositoryRoot);
  const globalConfigurationPath = join(temporaryDirectoryPath, "global.config");
  writeFileSync(
    globalConfigurationPath,
    "[core]\n\thooksPath = global-hooks\n",
  );
  fixtureEnvironment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) => !name.toUpperCase().startsWith("GIT_"),
      ),
    ),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: globalConfigurationPath,
  };
  requireGitSuccess(["init", "--initial-branch=main"]);
  writeExecutable(
    ".githooks/pre-commit",
    readFileSync(preCommitHookPath, "utf8").replaceAll("\r\n", "\n"),
  );
  mkdirSync(join(repositoryRoot, "scripts"));
  writeFileSync(join(repositoryRoot, "scripts/validate_ontologies.py"), "");
  writeFileSync(join(repositoryRoot, "staged.txt"), "staged content\n");
  requireGitSuccess(["add", "--", "staged.txt"]);
  writeFileSync(join(repositoryRoot, "staged.txt"), "unstaged content\n");
});

afterEach(() => {
  const cleanupPath = resolve(temporaryDirectoryPath);
  if (
    dirname(cleanupPath) !== resolve(tmpdir()) ||
    !basename(cleanupPath).startsWith("universal-ontology-git-hooks-")
  ) {
    throw new Error("Refusing cleanup outside the temporary Git repositories.");
  }
  rmSync(cleanupPath, { recursive: true, force: true });
});

test("configures hooks locally and remains repeatable without changing staged work", () => {
  const indexPath = join(repositoryRoot, ".git/index");
  const indexBefore = readFileSync(indexPath);
  const globalConfigurationBefore = readFileSync(
    fixtureEnvironment.GIT_CONFIG_GLOBAL,
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = runConfiguration();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(
      requireGitSuccess(["config", "get", "--local", "core.hooksPath"]),
    ).toBe(".githooks");
    expect(requireGitSuccess(["config", "get", "core.hooksPath"])).toBe(
      ".githooks",
    );
    expect(readFileSync(indexPath)).toEqual(indexBefore);
  }
  expect(requireGitSuccess(["show", ":staged.txt"])).toBe("staged content");
  expect(readFileSync(join(repositoryRoot, "staged.txt"), "utf8")).toBe(
    "unstaged content\n",
  );
  expect(readFileSync(fixtureEnvironment.GIT_CONFIG_GLOBAL)).toEqual(
    globalConfigurationBefore,
  );
});

test.each(["missing", "directory"])(
  "rejects a %s pre-commit hook before modifying configuration",
  (hookState) => {
    unlinkSync(join(repositoryRoot, ".githooks/pre-commit"));
    if (hookState === "directory") {
      mkdirSync(join(repositoryRoot, ".githooks/pre-commit"));
    }
    const configurationBefore = readFileSync(
      join(repositoryRoot, ".git/config"),
    );

    const result = runConfiguration();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".githooks");
    expect(readFileSync(join(repositoryRoot, ".git/config"))).toEqual(
      configurationBefore,
    );
  },
);

test("rejects a directory outside a Git repository", () => {
  const result = runConfiguration({
    selectedRepositoryRoot: temporaryDirectoryPath,
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/not a git repository/i);
});

test("rejects a subdirectory instead of configuring an unintended repository root", () => {
  const result = runConfiguration({
    selectedRepositoryRoot: join(repositoryRoot, "scripts"),
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/working tree root/i);
  expect(runGit(["config", "get", "--local", "core.hooksPath"]).status).toBe(1);
});

test("reports a missing Git executable", () => {
  const environment = Object.fromEntries(
    Object.entries(fixtureEnvironment).filter(
      ([name]) => name.toUpperCase() !== "PATH",
    ),
  );
  environment.PATH = temporaryDirectoryPath;
  const result = runConfiguration({ environment });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Git.*could not start/);
});

test("reports a locked Git configuration and preserves the existing lock", () => {
  const configurationPath = join(repositoryRoot, ".git/config");
  const configurationBefore = readFileSync(configurationPath);
  writeFileSync(`${configurationPath}.lock`, "held by another process");

  const result = runConfiguration();

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/could not lock config file/i);
  expect(readFileSync(configurationPath)).toEqual(configurationBefore);
  expect(readFileSync(`${configurationPath}.lock`, "utf8")).toBe(
    "held by another process",
  );
});

test("pre-commit requires .venv even when a system Python command is available", () => {
  for (const executableName of ["python", "python3"]) {
    writeExecutable(
      `system-bin/${executableName}`,
      '#!/bin/sh\nprintf "used" > system-python-used.txt\n',
    );
  }
  const pathKey = Object.keys(fixtureEnvironment).find(
    (name) => name.toUpperCase() === "PATH",
  );
  const environment = {
    ...fixtureEnvironment,
    [pathKey]: `${join(repositoryRoot, "system-bin")}${process.platform === "win32" ? ";" : ":"}${fixtureEnvironment[pathKey]}`,
  };

  const result = runGit(
    ["-c", "core.hooksPath=.githooks", "hook", "run", "pre-commit"],
    {
      env: environment,
    },
  );

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("npm run setup:development");
  expect(existsSync(join(repositoryRoot, "system-python-used.txt"))).toBe(
    false,
  );
});

test.each([".venv/Scripts/python.exe", ".venv/bin/python"])(
  "pre-commit uses %s and propagates a validation failure",
  (pythonExecutablePath) => {
    writeExecutable(
      pythonExecutablePath,
      '#!/bin/sh\nprintf "%s\\n" "$@" > hook-arguments.txt\nexit 7\n',
    );

    const result = runGit([
      "-c",
      "core.hooksPath=.githooks",
      "hook",
      "run",
      "pre-commit",
    ]);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(7);
    expect(
      readFileSync(join(repositoryRoot, "hook-arguments.txt"), "utf8").split(
        "\n",
      ),
    ).toEqual([
      "scripts/validate_ontologies.py",
      "--purpose",
      "draft",
      "--staged",
      "",
    ]);
  },
);
