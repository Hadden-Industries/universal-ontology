#!/usr/bin/env node

import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { constants as operatingSystemConstants } from "node:os";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FORWARDED_TERMINATION_SIGNAL_NAMES = Object.freeze([
  "SIGINT",
  "SIGTERM",
  "SIGHUP",
]);

function defaultRequireExecutableFile(executablePath) {
  let status;

  try {
    status = statSync(executablePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `GitHub MCP Server executable is missing: ${executablePath}. Run scripts/set_up_mcp_servers.py first.`,
        { cause: error },
      );
    }

    throw error;
  }

  if (!status.isFile()) {
    throw new Error(
      `GitHub MCP Server executable is not a file: ${executablePath}.`,
    );
  }
}

/** Resolve the generated executable relative to this checked-in launcher. */
export function resolveGitHubMcpServerExecutablePath({
  launcherModuleUrl = import.meta.url,
  platform = process.platform,
} = {}) {
  const repositoryRootPath = resolve(
    dirname(fileURLToPath(launcherModuleUrl)),
    "..",
  );
  const executableName =
    platform === "win32" ? "github-mcp-server.exe" : "github-mcp-server";
  return resolve(repositoryRootPath, ".agent-tools", "bin", executableName);
}

/**
 * Spawn the generated GitHub MCP Server as a transparent stdio child.
 *
 * The launcher emits nothing to stdout because stdout belongs exclusively to
 * the MCP transport. The returned child remains owned by the executable
 * boundary, which installs the lifecycle bridge below.
 */
export function launchGitHubMcpServer({
  commandLineArguments = process.argv.slice(2),
  launcherModuleUrl = import.meta.url,
  platform = process.platform,
  requireExecutableFile = defaultRequireExecutableFile,
  spawnProcess = spawn,
} = {}) {
  const repositoryRootPath = resolve(
    dirname(fileURLToPath(launcherModuleUrl)),
    "..",
  );
  const executablePath = resolveGitHubMcpServerExecutablePath({
    launcherModuleUrl,
    platform,
  });
  requireExecutableFile(executablePath);
  return spawnProcess(executablePath, [...commandLineArguments], {
    cwd: repositoryRootPath,
    stdio: "inherit",
    windowsHide: true,
  });
}

/**
 * Bridge parent termination and child completion without inventing a second
 * lifecycle policy. POSIX signal exits use the conventional `128 + signal`
 * status; ordinary child exit codes are preserved exactly.
 */
export function installChildProcessLifecycleBridge({
  childProcess,
  signalEmitter = process,
  setProcessExitCode = (exitCode) => {
    process.exitCode = exitCode;
  },
  signalNumbers = operatingSystemConstants.signals,
} = {}) {
  if (!childProcess || typeof childProcess.on !== "function") {
    throw new TypeError("childProcess must provide on().");
  }

  if (
    !signalEmitter ||
    typeof signalEmitter.on !== "function" ||
    typeof signalEmitter.off !== "function"
  ) {
    throw new TypeError("signalEmitter must provide on() and off().");
  }

  if (typeof setProcessExitCode !== "function") {
    throw new TypeError("setProcessExitCode must be a function.");
  }

  const installedSignalHandlers = new Map();
  let removed = false;

  function removeSignalHandlers() {
    if (removed) {
      return;
    }

    removed = true;

    for (const [signalName, handler] of installedSignalHandlers) {
      signalEmitter.off(signalName, handler);
    }
  }

  for (const signalName of FORWARDED_TERMINATION_SIGNAL_NAMES) {
    if (!Number.isInteger(signalNumbers[signalName])) {
      continue;
    }

    const handler = () => {
      if (typeof childProcess.kill === "function") {
        childProcess.kill(signalName);
      }
    };
    installedSignalHandlers.set(signalName, handler);
    signalEmitter.on(signalName, handler);
  }

  childProcess.on("exit", (exitCode, signalName) => {
    removeSignalHandlers();

    if (Number.isInteger(exitCode)) {
      setProcessExitCode(exitCode);
      return;
    }

    const signalNumber = signalNumbers[signalName];
    setProcessExitCode(Number.isInteger(signalNumber) ? 128 + signalNumber : 1);
  });
  childProcess.on("error", () => {
    removeSignalHandlers();
    setProcessExitCode(1);
  });
  return removeSignalHandlers;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const childProcess = launchGitHubMcpServer();
    installChildProcessLifecycleBridge({ childProcess });
  } catch (error) {
    process.stderr.write(
      `GitHub MCP Server launch failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
