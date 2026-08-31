import { homedir } from "node:os";
import { posix, win32 } from "node:path";
import process from "node:process";

const DEFAULT_ONTOLOGY_QUERY_ARTIFACT_BASE_URL =
  "https://haddenindustries.com/ontology/query/v1/";
const DEFAULT_MAXIMUM_PERSISTENT_QUERY_ARTIFACT_CACHE_BYTE_SIZE =
  512 * 1024 * 1024;
const LOOPBACK_HOSTNAME_VALUES = Object.freeze([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);
const VALUE_OPTION_DEFINITIONS = Object.freeze({
  "--artifact-channel": {
    environmentVariableName: "UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL",
  },
  "--artifact-base-url": {
    environmentVariableName: "UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL",
  },
  "--cache-directory": {
    environmentVariableName: "UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY",
  },
  "--cache-maximum-bytes": {
    environmentVariableName: "UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES",
  },
});
const FLAG_OPTION_NAMES = new Set([
  "--help",
  "--version",
  "--allow-insecure-loopback-artifact-origin",
]);

export const UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT = `Universal Ontology MCP Server

Usage:
  universal-ontology-mcp-server [options]

Options:
  --artifact-channel <stable|development>
      Environment: UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL
  --artifact-base-url <url>
      Environment: UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL
  --cache-directory <absolute-path>
      Environment: UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY
  --cache-maximum-bytes <positive-integer>
      Environment: UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES
  --allow-insecure-loopback-artifact-origin
      Permit an HTTP loopback origin for local development only.
  --help
      Print this help and exit.
  --version
      Print the package version and exit.

Command-line values take precedence over non-empty environment values.
`;

/** Stable, value-redacting parse failure used by the executable boundary. */
export class UniversalOntologyMcpStdioConfigurationError extends Error {
  constructor(optionName, failureKind = "invalid_value") {
    const message =
      failureKind === "unsupported_option"
        ? `Unsupported Universal Ontology MCP option: ${optionName}.`
        : `Invalid Universal Ontology MCP value for ${optionName}.`;

    super(message);
    this.name = "UniversalOntologyMcpStdioConfigurationError";
    this.optionName = optionName;
    this.exitCode = 2;
  }
}

function throwConfigurationError(optionName, failureKind) {
  throw new UniversalOntologyMcpStdioConfigurationError(
    optionName,
    failureKind,
  );
}

function identifyUnsupportedArgument(argument) {
  if (typeof argument !== "string" || !argument.startsWith("--")) {
    return "command-line argument";
  }

  const optionName = argument.split("=", 1)[0];
  return /^--[a-z][a-z0-9-]{0,63}$/u.test(optionName)
    ? optionName
    : "command-line argument";
}

function parseCommandLineArguments(commandLineArguments) {
  if (!Array.isArray(commandLineArguments)) {
    throw new TypeError("commandLineArguments must be an array.");
  }

  const valuesByOptionName = new Map();
  const presentFlagOptionNames = new Set();

  for (let index = 0; index < commandLineArguments.length; index += 1) {
    const argument = commandLineArguments[index];

    if (typeof argument !== "string" || !argument.startsWith("--")) {
      throwConfigurationError(
        identifyUnsupportedArgument(argument),
        "unsupported_option",
      );
    }

    const equalsIndex = argument.indexOf("=");
    const optionName =
      equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const attachedValue =
      equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);

    if (Object.hasOwn(VALUE_OPTION_DEFINITIONS, optionName)) {
      if (valuesByOptionName.has(optionName)) {
        throwConfigurationError(optionName);
      }

      let value = attachedValue;

      if (value === undefined) {
        const followingArgument = commandLineArguments[index + 1];

        if (
          typeof followingArgument !== "string" ||
          followingArgument.startsWith("--")
        ) {
          throwConfigurationError(optionName);
        }

        value = followingArgument;
        index += 1;
      }

      valuesByOptionName.set(optionName, value);
      continue;
    }

    if (FLAG_OPTION_NAMES.has(optionName)) {
      if (
        attachedValue !== undefined ||
        presentFlagOptionNames.has(optionName)
      ) {
        throwConfigurationError(optionName);
      }

      presentFlagOptionNames.add(optionName);
      continue;
    }

    throwConfigurationError(
      identifyUnsupportedArgument(argument),
      "unsupported_option",
    );
  }

  if (
    presentFlagOptionNames.has("--help") &&
    presentFlagOptionNames.has("--version")
  ) {
    throwConfigurationError("--version");
  }

  return { presentFlagOptionNames, valuesByOptionName };
}

function readNonEmptyEnvironmentValue(environment, variableName) {
  const value = environment?.[variableName];

  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throwConfigurationError(variableName);
  }

  return value;
}

function readConfiguredValue({
  optionName,
  valuesByOptionName,
  environment,
  defaultValue,
}) {
  if (valuesByOptionName.has(optionName)) {
    return valuesByOptionName.get(optionName);
  }

  return (
    readNonEmptyEnvironmentValue(
      environment,
      VALUE_OPTION_DEFINITIONS[optionName].environmentVariableName,
    ) ?? defaultValue
  );
}

function requireUnpaddedValue(value, optionName) {
  if (typeof value !== "string" || value === "" || value.trim() !== value) {
    throwConfigurationError(optionName);
  }

  return value;
}

function parseArtifactChannel(value) {
  requireUnpaddedValue(value, "--artifact-channel");

  if (value !== "stable" && value !== "development") {
    throwConfigurationError("--artifact-channel");
  }

  return value;
}

function parseMaximumCacheByteSize(value) {
  requireUnpaddedValue(value, "--cache-maximum-bytes");

  if (!/^[1-9]\d*$/u.test(value)) {
    throwConfigurationError("--cache-maximum-bytes");
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue)) {
    throwConfigurationError("--cache-maximum-bytes");
  }

  return parsedValue;
}

function parseArtifactBaseUrl(value, allowInsecureLoopbackOrigin) {
  requireUnpaddedValue(value, "--artifact-base-url");
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throwConfigurationError("--artifact-base-url");
  }

  const permittedInsecureLoopbackOrigin =
    allowInsecureLoopbackOrigin &&
    parsedUrl.protocol === "http:" &&
    LOOPBACK_HOSTNAME_VALUES.includes(parsedUrl.hostname);

  if (
    (parsedUrl.protocol !== "https:" && !permittedInsecureLoopbackOrigin) ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.search !== "" ||
    parsedUrl.hash !== "" ||
    !parsedUrl.pathname.endsWith("/")
  ) {
    throwConfigurationError("--artifact-base-url");
  }

  return parsedUrl;
}

function selectPlatformPathImplementation(platform) {
  return platform === "win32" ? win32 : posix;
}

function createDefaultCacheDirectoryPath({
  environment,
  platform,
  readHomeDirectory,
}) {
  const pathImplementation = selectPlatformPathImplementation(platform);

  if (platform === "win32") {
    const localApplicationDataPath = readNonEmptyEnvironmentValue(
      environment,
      "LOCALAPPDATA",
    );
    const cacheParentPath =
      localApplicationDataPath ??
      pathImplementation.join(readHomeDirectory(), "AppData", "Local");
    return pathImplementation.join(
      cacheParentPath,
      "UniversalOntology",
      "McpServer",
      "Cache",
      "v1",
    );
  }

  if (platform === "darwin") {
    return pathImplementation.join(
      readHomeDirectory(),
      "Library",
      "Caches",
      "io.hadden-industries.universal-ontology-mcp-server",
      "v1",
    );
  }

  const xdgCacheHomePath = readNonEmptyEnvironmentValue(
    environment,
    "XDG_CACHE_HOME",
  );
  return pathImplementation.join(
    xdgCacheHomePath ?? pathImplementation.join(readHomeDirectory(), ".cache"),
    "universal-ontology-mcp-server",
    "v1",
  );
}

function parseCacheDirectoryPath(value, platform) {
  requireUnpaddedValue(value, "--cache-directory");

  if (!selectPlatformPathImplementation(platform).isAbsolute(value)) {
    throwConfigurationError("--cache-directory");
  }

  return value;
}

/**
 * Parse the complete installed-process boundary without performing I/O.
 *
 * CLI values override non-empty environment values, which override defaults.
 * Configuration failures carry exit code 2; help and version modes deliberately
 * ignore runtime environment settings so diagnostics remain available even
 * when a service configuration is broken.
 */
export function parseUniversalOntologyMcpStdioConfiguration({
  commandLineArguments = process.argv.slice(2),
  environment = process.env,
  platform = process.platform,
  readHomeDirectory = homedir,
} = {}) {
  if (typeof readHomeDirectory !== "function") {
    throw new TypeError("readHomeDirectory must be a function.");
  }

  const { presentFlagOptionNames, valuesByOptionName } =
    parseCommandLineArguments(commandLineArguments);
  const operationMode = presentFlagOptionNames.has("--help")
    ? "print_help"
    : presentFlagOptionNames.has("--version")
      ? "print_version"
      : "serve_stdio";
  const effectiveEnvironment =
    operationMode === "serve_stdio" ? environment : {};
  const effectiveValuesByOptionName =
    operationMode === "serve_stdio" ? valuesByOptionName : new Map();
  const allowInsecureLoopbackOntologyQueryArtifactOrigin =
    operationMode === "serve_stdio" &&
    presentFlagOptionNames.has("--allow-insecure-loopback-artifact-origin");
  const configuredCacheDirectoryPath = readConfiguredValue({
    optionName: "--cache-directory",
    valuesByOptionName: effectiveValuesByOptionName,
    environment: effectiveEnvironment,
    defaultValue: undefined,
  });
  const cacheDirectoryPath =
    configuredCacheDirectoryPath ??
    createDefaultCacheDirectoryPath({
      environment: effectiveEnvironment,
      platform,
      readHomeDirectory,
    });

  return Object.freeze({
    operationMode,
    ontologyQueryArtifactChannelName: parseArtifactChannel(
      readConfiguredValue({
        optionName: "--artifact-channel",
        valuesByOptionName: effectiveValuesByOptionName,
        environment: effectiveEnvironment,
        defaultValue: "stable",
      }),
    ),
    ontologyQueryArtifactBaseUrl: parseArtifactBaseUrl(
      readConfiguredValue({
        optionName: "--artifact-base-url",
        valuesByOptionName: effectiveValuesByOptionName,
        environment: effectiveEnvironment,
        defaultValue: DEFAULT_ONTOLOGY_QUERY_ARTIFACT_BASE_URL,
      }),
      allowInsecureLoopbackOntologyQueryArtifactOrigin,
    ),
    ontologyQueryArtifactCacheDirectoryPath: parseCacheDirectoryPath(
      cacheDirectoryPath,
      platform,
    ),
    maximumPersistentQueryArtifactCacheByteSize: parseMaximumCacheByteSize(
      readConfiguredValue({
        optionName: "--cache-maximum-bytes",
        valuesByOptionName: effectiveValuesByOptionName,
        environment: effectiveEnvironment,
        defaultValue: String(
          DEFAULT_MAXIMUM_PERSISTENT_QUERY_ARTIFACT_CACHE_BYTE_SIZE,
        ),
      }),
    ),
    allowInsecureLoopbackOntologyQueryArtifactOrigin,
  });
}
