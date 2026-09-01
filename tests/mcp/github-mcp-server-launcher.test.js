import { EventEmitter } from "node:events";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { jest } from "@jest/globals";

const REPOSITORY_ROOT_PATH = new URL("../../", import.meta.url);
const LAUNCHER_MODULE_URL = new URL(
  "../../scripts/launchGitHubMcpServer.js",
  import.meta.url,
);

async function importLauncher() {
  return import(LAUNCHER_MODULE_URL.href);
}

describe("GitHub MCP Server launcher", () => {
  test.each([
    ["win32", "github-mcp-server.exe"],
    ["linux", "github-mcp-server"],
    ["darwin", "github-mcp-server"],
  ])(
    "derives the generated executable from the launcher checkout on %s",
    async (platform, expectedExecutableName) => {
      const launcherModule = await importLauncher();
      const childProcess = new EventEmitter();
      let observedLaunch;

      const returnedChildProcess = launcherModule.launchGitHubMcpServer({
        commandLineArguments: ["stdio", "--sentinel"],
        launcherModuleUrl: LAUNCHER_MODULE_URL.href,
        platform,
        requireExecutableFile() {},
        spawnProcess(command, arguments_, options) {
          observedLaunch = { command, arguments_, options };
          return childProcess;
        },
      });

      const expectedRepositoryRootPath = fileURLToPath(REPOSITORY_ROOT_PATH);
      const expectedExecutablePath = join(
        expectedRepositoryRootPath,
        ".agent-tools",
        "bin",
        expectedExecutableName,
      );
      expect(observedLaunch.command).toBe(
        launcherModule.resolveGitHubMcpServerExecutablePath({
          launcherModuleUrl: LAUNCHER_MODULE_URL.href,
          platform,
        }),
      );
      expect(
        observedLaunch.command
          .replaceAll("\\", "/")
          .endsWith(expectedExecutablePath.replaceAll("\\", "/")),
      ).toBe(true);
      expect(observedLaunch.arguments_).toEqual(["stdio", "--sentinel"]);
      expect(observedLaunch.options).toMatchObject({
        cwd: expect.any(String),
        stdio: "inherit",
        windowsHide: true,
      });
      expect(observedLaunch.options.cwd).toBe(
        resolve(expectedRepositoryRootPath),
      );
      expect(returnedChildProcess).toBe(childProcess);
    },
  );

  test("rejects a missing generated executable before spawning", async () => {
    const launcherModule = await importLauncher();
    const spawnProcess = jest.fn();

    expect(() =>
      launcherModule.launchGitHubMcpServer({
        commandLineArguments: ["stdio"],
        launcherModuleUrl: LAUNCHER_MODULE_URL.href,
        platform: "win32",
        requireExecutableFile(executablePath) {
          throw new Error(`missing executable: ${executablePath}`);
        },
        spawnProcess,
      }),
    ).toThrow(/missing executable.*github-mcp-server\.exe/iu);
    expect(spawnProcess).not.toHaveBeenCalled();
  });

  test("forwards termination signals and preserves an ordinary child exit code", async () => {
    const launcherModule = await importLauncher();
    const childProcess = new EventEmitter();
    childProcess.kill = jest.fn();
    const signalEmitter = new EventEmitter();
    const setProcessExitCode = jest.fn();
    const removeSignalHandlers =
      launcherModule.installChildProcessLifecycleBridge({
        childProcess,
        signalEmitter,
        setProcessExitCode,
      });

    signalEmitter.emit("SIGTERM");
    expect(childProcess.kill).toHaveBeenCalledWith("SIGTERM");

    childProcess.emit("exit", 17, null);
    expect(setProcessExitCode).toHaveBeenCalledWith(17);

    removeSignalHandlers();
    childProcess.kill.mockClear();
    signalEmitter.emit("SIGTERM");
    expect(childProcess.kill).not.toHaveBeenCalled();
  });

  test("maps a signal-terminated child to the conventional process exit code", async () => {
    const launcherModule = await importLauncher();
    const childProcess = new EventEmitter();
    childProcess.kill = jest.fn();
    const signalEmitter = new EventEmitter();
    const setProcessExitCode = jest.fn();
    const signalNumbers = { SIGINT: 2, SIGTERM: 15 };
    launcherModule.installChildProcessLifecycleBridge({
      childProcess,
      signalEmitter,
      setProcessExitCode,
      signalNumbers,
    });

    childProcess.emit("exit", null, "SIGTERM");

    expect(setProcessExitCode).toHaveBeenCalledWith(
      128 + signalNumbers.SIGTERM,
    );
  });
});
