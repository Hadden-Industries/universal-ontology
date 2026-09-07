import { spawnSync } from "node:child_process";
import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const GIT_HOOKS_DIRECTORY_NAME = ".githooks";

export function configureGitHooks({
  repositoryRoot = REPOSITORY_ROOT_PATH,
} = {}) {
  function runGit(commandArguments) {
    const result = spawnSync(
      "git",
      ["-C", repositoryRoot, ...commandArguments],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    if (result.error) {
      throw new Error(`Git could not start: ${result.error.message}`, {
        cause: result.error,
      });
    }
    if (result.signal) {
      throw new Error(`Git was terminated by ${result.signal}.`);
    }
    if (result.status !== 0) {
      throw new Error(
        `Git ${commandArguments[0]} failed with exit code ${result.status}: ${result.stderr.trim()}`,
      );
    }
    return result.stdout.trim();
  }

  const workingTreeRoot = runGit(["rev-parse", "--show-toplevel"]);
  if (
    realpathSync.native(workingTreeRoot) !== realpathSync.native(repositoryRoot)
  ) {
    throw new Error(
      `Expected the Git working tree root to be ${repositoryRoot}; found ${workingTreeRoot}.`,
    );
  }

  const preCommitHookPath = join(
    repositoryRoot,
    GIT_HOOKS_DIRECTORY_NAME,
    "pre-commit",
  );
  if (!statSync(preCommitHookPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`The pre-commit hook must be a file: ${preCommitHookPath}`);
  }
  if (process.platform !== "win32") {
    try {
      accessSync(preCommitHookPath, constants.X_OK);
    } catch (error) {
      throw new Error(
        `The pre-commit hook must be executable: ${preCommitHookPath}`,
        {
          cause: error,
        },
      );
    }
  }

  runGit([
    "config",
    "set",
    "--local",
    "core.hooksPath",
    GIT_HOOKS_DIRECTORY_NAME,
  ]);
  const effectiveHooksPath = runGit(["config", "get", "core.hooksPath"]);
  if (effectiveHooksPath !== GIT_HOOKS_DIRECTORY_NAME) {
    throw new Error(
      `The repository-local core.hooksPath was set, but an overriding configuration selects ${effectiveHooksPath}.`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    configureGitHooks();
    console.log(
      `Git hooks configured: repository-local core.hooksPath=${GIT_HOOKS_DIRECTORY_NAME}`,
    );
  } catch (error) {
    console.error(`Git hook configuration failed: ${error.message}`);
    process.exitCode = 1;
  }
}
