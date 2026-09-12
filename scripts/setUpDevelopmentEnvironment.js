import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const PYTHON_LOCK_FILENAME = "requirements.lock.txt";
const LOCKED_DISTRIBUTION_LINE =
  /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?==(\S+)/u;

// PEP 503 normalization lets lock lines and `pip list` names compare exactly.
function normalizeDistributionName(name) {
  return name.toLowerCase().replaceAll(/[-_.]+/gu, "-");
}

export function readLockedDistributions(lockText) {
  const locked = new Map();
  for (const line of lockText.split("\n")) {
    const match = LOCKED_DISTRIBUTION_LINE.exec(line);
    if (match) {
      locked.set(normalizeDistributionName(match[1]), match[2]);
    }
  }
  return locked;
}

// The installed set must equal the reviewed lock: a drifted version, an
// unreviewed extra distribution or a missing pin all disqualify the .venv.
export function findLockDifferences(
  lockedDistributions,
  installedDistributions,
) {
  const differences = [];
  const installed = new Map(
    installedDistributions.map(({ name, version }) => [
      normalizeDistributionName(name),
      version,
    ]),
  );
  for (const [name, lockedVersion] of lockedDistributions) {
    const installedVersion = installed.get(name);
    if (installedVersion === undefined) {
      differences.push(
        `${name} is locked at ${lockedVersion} but not installed`,
      );
    } else if (installedVersion !== lockedVersion) {
      differences.push(
        `${name} is installed at ${installedVersion} but locked at ${lockedVersion}`,
      );
    }
  }
  for (const [name, installedVersion] of installed) {
    if (!lockedDistributions.has(name)) {
      differences.push(
        `${name} ${installedVersion} is installed but absent from the lock`,
      );
    }
  }
  return differences;
}

export function setUpDevelopmentEnvironment({
  repositoryRoot = REPOSITORY_ROOT_PATH,
} = {}) {
  // npm supplies its CLI path, allowing invocation without a platform shell.
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error(
      "Run npm run setup:development to start development setup.",
    );
  }

  for (const filename of [
    "package.json",
    "package-lock.json",
    "requirements.txt",
    "requirements-sdlc.txt",
    PYTHON_LOCK_FILENAME,
    ".node-version",
    ".python-version",
  ]) {
    const filePath = join(repositoryRoot, filename);
    if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(
        `Required development setup file is missing: ${filePath}`,
      );
    }
  }

  const selectedNodeVersion = readFileSync(
    join(repositoryRoot, ".node-version"),
    "utf8",
  ).trim();
  if (process.versions.node !== selectedNodeVersion) {
    throw new Error(
      `Development setup requires Node.js ${selectedNodeVersion}; found ${process.versions.node}.`,
    );
  }
  const selectedPythonVersion = readFileSync(
    join(repositoryRoot, ".python-version"),
    "utf8",
  ).trim();

  function runRequiredCommand(
    description,
    executable,
    commandArguments,
    { captureOutput = false } = {},
  ) {
    const result = spawnSync(executable, commandArguments, {
      cwd: repositoryRoot,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.error) {
      throw new Error(
        `${description} could not start: ${result.error.message}`,
        {
          cause: result.error,
        },
      );
    }
    if (result.signal) {
      throw new Error(`${description} was terminated by ${result.signal}.`);
    }
    if (result.status !== 0) {
      const diagnostic = result.stderr?.trim();
      throw new Error(
        `${description} failed with exit code ${result.status}.${diagnostic ? `\n${diagnostic}` : ""}`,
      );
    }
    return result.stdout?.trim() ?? "";
  }

  const { packageManager } = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  );
  const npmVersion = runRequiredCommand(
    "npm version check",
    process.execPath,
    [npmCliPath, "--version"],
    { captureOutput: true },
  );
  if (packageManager !== `npm@${npmVersion}`) {
    throw new Error(
      `Use ${packageManager} declared in package.json; found npm@${npmVersion}.`,
    );
  }

  const pythonVirtualEnvironmentPath = join(repositoryRoot, ".venv");
  const virtualEnvironmentPythonExecutablePath = join(
    pythonVirtualEnvironmentPath,
    ...(process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"]),
  );
  const pythonVirtualEnvironmentStats = lstatSync(
    pythonVirtualEnvironmentPath,
    {
      throwIfNoEntry: false,
    },
  );
  if (
    pythonVirtualEnvironmentStats &&
    (!pythonVirtualEnvironmentStats.isDirectory() ||
      !statSync(virtualEnvironmentPythonExecutablePath, {
        throwIfNoEntry: false,
      })?.isFile())
  ) {
    throw new Error(
      `The existing .venv is unusable: ${pythonVirtualEnvironmentPath}. Repair it before rerunning setup; it has been preserved.`,
    );
  }

  const systemPythonExecutableName =
    process.platform === "win32" ? "python" : "python3";
  const pythonExecutable = pythonVirtualEnvironmentStats
    ? virtualEnvironmentPythonExecutablePath
    : systemPythonExecutableName;
  const pythonVersionOutput = runRequiredCommand(
    `Python version check (${pythonExecutable})`,
    pythonExecutable,
    ["--version"],
    { captureOutput: true },
  );
  if (pythonVersionOutput !== `Python ${selectedPythonVersion}`) {
    throw new Error(
      `Development setup requires Python ${selectedPythonVersion}; found ${pythonVersionOutput}.`,
    );
  }

  console.log("Installing npm dependencies from package-lock.json...");
  runRequiredCommand("npm dependency installation", process.execPath, [
    npmCliPath,
    "ci",
    "--include=dev",
    "--ignore-scripts",
  ]);

  if (!pythonVirtualEnvironmentStats) {
    console.log(
      `Creating Python virtual environment: ${pythonVirtualEnvironmentPath}`,
    );
    runRequiredCommand(
      "Python virtual environment creation",
      systemPythonExecutableName,
      ["-m", "venv", pythonVirtualEnvironmentPath],
    );
  }

  // The lock pins pip itself, so the bootstrap pip is recorded rather than
  // floated; the hash-checked install then converges on the reviewed set.
  const bootstrapPipVersion = runRequiredCommand(
    "pip bootstrap version check",
    virtualEnvironmentPythonExecutablePath,
    ["-m", "pip", "--version"],
    { captureOutput: true },
  );
  console.log(`Bootstrap pip: ${bootstrapPipVersion}`);
  const pythonLockPath = join(repositoryRoot, PYTHON_LOCK_FILENAME);
  console.log(
    `Installing Python dependencies in .venv from ${pythonLockPath}...`,
  );
  runRequiredCommand(
    "Locked Python dependency installation",
    virtualEnvironmentPythonExecutablePath,
    [
      "-m",
      "pip",
      "install",
      "--require-hashes",
      "--only-binary=:all:",
      "-r",
      pythonLockPath,
    ],
  );
  const installedDistributions = JSON.parse(
    runRequiredCommand(
      "Installed Python distribution listing",
      virtualEnvironmentPythonExecutablePath,
      ["-m", "pip", "list", "--format=json"],
      { captureOutput: true },
    ),
  );
  const lockDifferences = findLockDifferences(
    readLockedDistributions(readFileSync(pythonLockPath, "utf8")),
    installedDistributions,
  );
  if (lockDifferences.length > 0) {
    throw new Error(
      `The .venv does not match ${PYTHON_LOCK_FILENAME}; recreate it or remove the unreviewed distributions:\n${lockDifferences.join("\n")}`,
    );
  }
  runRequiredCommand(
    "pip consistency check",
    virtualEnvironmentPythonExecutablePath,
    ["-m", "pip", "check"],
  );
  runRequiredCommand(
    "Repository SDLC configuration",
    virtualEnvironmentPythonExecutablePath,
    ["-B", join(repositoryRoot, "scripts", "set_up_sdlc.py")],
  );

  try {
    const awsCliVersion = runRequiredCommand(
      "AWS CLI verification",
      "aws",
      ["--version"],
      { captureOutput: true },
    );
    console.log(`AWS CLI detected: ${awsCliVersion}`);
  } catch (error) {
    console.warn(
      `${error.message}\nAWS CLI is required for S3 uploads. Install AWS CLI v2 before deploying: https://aws.amazon.com/cli/`,
    );
  }

  console.log("Development dependencies are installed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    setUpDevelopmentEnvironment();
  } catch (error) {
    console.error(`Development setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
