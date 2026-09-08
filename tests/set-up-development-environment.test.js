import { jest } from "@jest/globals";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";

const spawnSyncMock = jest.fn();
jest.unstable_mockModule("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}));

const { setUpDevelopmentEnvironment } =
  await import("../scripts/setUpDevelopmentEnvironment.js");
const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
const nodeVersionDescriptor = Object.getOwnPropertyDescriptor(
  process.versions,
  "node",
);

function createCommandResult(stdout = "", status = 0) {
  return {
    pid: 1,
    output: [null, stdout, ""],
    stdout,
    stderr: "",
    status,
    signal: null,
  };
}

let temporaryDirectoryPath;
let repositoryRoot;
let npmCliPath;

function getPythonVirtualEnvironmentExecutablePath() {
  return join(
    repositoryRoot,
    ".venv",
    ...(process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"]),
  );
}

function createPythonVirtualEnvironmentFixture() {
  const executablePath = getPythonVirtualEnvironmentExecutablePath();
  mkdirSync(dirname(executablePath), { recursive: true });
  writeFileSync(executablePath, "existing interpreter");
}

beforeEach(() => {
  temporaryDirectoryPath = mkdtempSync(
    join(tmpdir(), "universal-ontology-development-"),
  );
  repositoryRoot = join(temporaryDirectoryPath, "checkout with spaces");
  mkdirSync(repositoryRoot);
  writeFileSync(
    join(repositoryRoot, "package.json"),
    JSON.stringify({ packageManager: "npm@12.0.2" }),
  );
  writeFileSync(join(repositoryRoot, "package-lock.json"), "{}");
  writeFileSync(join(repositoryRoot, ".node-version"), "24.20.0\n");
  writeFileSync(join(repositoryRoot, ".python-version"), "3.14.7\n");
  writeFileSync(
    join(repositoryRoot, "requirements-sdlc.txt"),
    "jsonschema==4.26.0\n",
  );
  Object.defineProperty(process.versions, "node", { value: "24.20.0" });
  writeFileSync(
    join(repositoryRoot, "requirements.txt"),
    "defusedxml>=0.7.1\n",
  );
  npmCliPath = join(temporaryDirectoryPath, "npm cli.cjs");
  writeFileSync(npmCliPath, "");
  jest.replaceProperty(process, "env", {
    ...process.env,
    npm_execpath: npmCliPath,
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});

  // Package downloads and interpreter provisioning are the external boundary.
  // Directory inspection and preservation still use the real filesystem.
  spawnSyncMock
    .mockReset()
    .mockImplementation((executablePath, commandArguments) => {
      if (
        executablePath === process.execPath &&
        commandArguments[0] === npmCliPath
      ) {
        return createCommandResult(
          commandArguments[1] === "--version" ? "12.0.2\n" : "",
        );
      }
      if (executablePath === "aws") {
        return createCommandResult("aws-cli/2.30.0\n");
      }
      if (commandArguments[0] === "--version") {
        return createCommandResult("Python 3.14.7\n");
      }
      if (commandArguments[0] === "-m" && commandArguments[1] === "venv") {
        createPythonVirtualEnvironmentFixture();
      }
      return createCommandResult();
    });
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(process, "platform", platformDescriptor);
  Object.defineProperty(process.versions, "node", nodeVersionDescriptor);
  const cleanupPath = resolve(temporaryDirectoryPath);
  if (
    dirname(cleanupPath) !== resolve(tmpdir()) ||
    !basename(cleanupPath).startsWith("universal-ontology-development-")
  ) {
    throw new Error(
      "Refusing to remove a path outside the temporary fixtures.",
    );
  }
  rmSync(cleanupPath, { recursive: true, force: true });
});

test.each([
  ["win32", "python", "Scripts", "python.exe"],
  ["linux", "python3", "bin", "python"],
  ["darwin", "python3", "bin", "python"],
])(
  "installs locked npm and isolated Python dependencies on %s",
  (
    platform,
    systemPythonExecutableName,
    executableDirectory,
    executableName,
  ) => {
    Object.defineProperty(process, "platform", { value: platform });

    setUpDevelopmentEnvironment({ repositoryRoot });

    const commands = spawnSyncMock.mock.calls.map(
      ([executable, commandArguments]) => [executable, commandArguments],
    );
    const virtualEnvironmentPythonExecutablePath = join(
      repositoryRoot,
      ".venv",
      executableDirectory,
      executableName,
    );
    expect(commands).toEqual([
      [process.execPath, [npmCliPath, "--version"]],
      [systemPythonExecutableName, ["--version"]],
      [
        process.execPath,
        [npmCliPath, "ci", "--include=dev", "--ignore-scripts"],
      ],
      [
        systemPythonExecutableName,
        ["-m", "venv", join(repositoryRoot, ".venv")],
      ],
      [
        virtualEnvironmentPythonExecutablePath,
        ["-m", "pip", "install", "--upgrade", "pip"],
      ],
      [
        virtualEnvironmentPythonExecutablePath,
        [
          "-m",
          "pip",
          "install",
          "-r",
          join(repositoryRoot, "requirements.txt"),
        ],
      ],
      [
        virtualEnvironmentPythonExecutablePath,
        [
          "-m",
          "pip",
          "install",
          "-r",
          join(repositoryRoot, "requirements-sdlc.txt"),
        ],
      ],
      [
        virtualEnvironmentPythonExecutablePath,
        ["-B", join(repositoryRoot, "scripts", "set_up_sdlc.py")],
      ],
      ["aws", ["--version"]],
    ]);
    for (const [, , options] of spawnSyncMock.mock.calls) {
      expect(options.cwd).toBe(repositoryRoot);
      expect(options.shell).not.toBe(true);
      expect(options.windowsHide).toBe(true);
    }
    expect(existsSync(virtualEnvironmentPythonExecutablePath)).toBe(true);
  },
);

test("preserves an existing virtual environment and uses its interpreter", () => {
  createPythonVirtualEnvironmentFixture();
  const markerPath = join(repositoryRoot, ".venv", "user-owned-file.txt");
  writeFileSync(markerPath, "preserve this environment");

  setUpDevelopmentEnvironment({ repositoryRoot });

  expect(readFileSync(markerPath, "utf8")).toBe("preserve this environment");
  const pythonCommands = spawnSyncMock.mock.calls.filter(
    ([executable]) => executable !== process.execPath && executable !== "aws",
  );
  expect(pythonCommands.map(([executable]) => executable)).toEqual([
    getPythonVirtualEnvironmentExecutablePath(),
    getPythonVirtualEnvironmentExecutablePath(),
    getPythonVirtualEnvironmentExecutablePath(),
    getPythonVirtualEnvironmentExecutablePath(),
    getPythonVirtualEnvironmentExecutablePath(),
  ]);
  expect(
    pythonCommands.some(([, commandArguments]) =>
      commandArguments.includes("venv"),
    ),
  ).toBe(false);
});

test("rejects an unusable existing virtual environment before installation", () => {
  mkdirSync(join(repositoryRoot, ".venv"));
  writeFileSync(join(repositoryRoot, ".venv", "keep.txt"), "keep");

  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
    /\.venv/,
  );
  expect(readFileSync(join(repositoryRoot, ".venv", "keep.txt"), "utf8")).toBe(
    "keep",
  );
  expect(spawnSyncMock.mock.calls.some(([, args]) => args.includes("ci"))).toBe(
    false,
  );
});

test.each([
  "package-lock.json",
  "requirements.txt",
  "requirements-sdlc.txt",
  ".node-version",
  ".python-version",
])("rejects a missing %s before starting subprocesses", (filename) => {
  rmSync(join(repositoryRoot, filename));
  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
    filename,
  );
  expect(spawnSyncMock).not.toHaveBeenCalled();
});

test("requires invocation through npm before changing the environment", () => {
  delete process.env.npm_execpath;
  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
    /npm run setup:development/,
  );
  expect(spawnSyncMock).not.toHaveBeenCalled();
});

test("rejects a Node version below the documented prerequisite", () => {
  Object.defineProperty(process.versions, "node", { value: "22.0.0" });
  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(/Node/);
  expect(spawnSyncMock).not.toHaveBeenCalled();
});

test("rejects an npm version that differs from the packageManager declaration", () => {
  spawnSyncMock.mockReturnValueOnce(createCommandResult("11.0.0\n"));
  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
    /npm@12\.0\.2/,
  );
  expect(spawnSyncMock.mock.calls.some(([, args]) => args.includes("ci"))).toBe(
    false,
  );
});

test.each([
  ["missing", { ...createCommandResult("", null), error: new Error("ENOENT") }],
  ["too old", createCommandResult("Python 3.10.0\n")],
  ["older patch than selected", createCommandResult("Python 3.14.6\n")],
])(
  "rejects %s Python before installing npm packages",
  (_description, result) => {
    const successfulCommand = spawnSyncMock.getMockImplementation();
    spawnSyncMock.mockImplementation((executable, args, options) =>
      args[0] === "--version"
        ? result
        : successfulCommand(executable, args, options),
    );
    expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
      /Python/,
    );
    expect(
      spawnSyncMock.mock.calls.some(([, args]) => args.includes("ci")),
    ).toBe(false);
  },
);

test.each([
  ["npm installation", "ci"],
  ["virtual environment creation", "venv"],
  ["pip upgrade", "--upgrade"],
  ["Python dependency installation", "-r"],
  ["repository SDLC configuration", "-B"],
])("stops after a failed %s", (_description, failingArgument) => {
  const successfulCommand = spawnSyncMock.getMockImplementation();
  spawnSyncMock.mockImplementation((executable, args, options) =>
    args.includes(failingArgument)
      ? createCommandResult("", 7)
      : successfulCommand(executable, args, options),
  );

  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(/7/);
  expect(spawnSyncMock.mock.lastCall[1]).toContain(failingArgument);
});

test("stops when npm is terminated by a signal", () => {
  spawnSyncMock.mockReturnValueOnce({
    ...createCommandResult("", null),
    signal: "SIGTERM",
  });
  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).toThrow(
    /SIGTERM/,
  );
  expect(spawnSyncMock).toHaveBeenCalledTimes(1);
});

test.each([
  { ...createCommandResult("", null), error: new Error("ENOENT") },
  createCommandResult("", 1),
])("reports unavailable AWS CLI as a warning", (result) => {
  const successfulCommand = spawnSyncMock.getMockImplementation();
  spawnSyncMock.mockImplementation((executable, args, options) =>
    executable === "aws"
      ? result
      : successfulCommand(executable, args, options),
  );

  expect(() => setUpDevelopmentEnvironment({ repositoryRoot })).not.toThrow();
  expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/AWS CLI/));
});
