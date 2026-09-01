import { createRequire } from "node:module";
import { win32 } from "node:path";

import {
  UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT,
  UniversalOntologyMcpStdioConfigurationError,
  parseUniversalOntologyMcpStdioConfiguration,
} from "../../src/mcp/universalOntologyMcpStdioConfiguration.js";
import { UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO } from "../../src/mcp/universalOntologyMcpMetadata.js";

const packageMetadata = createRequire(import.meta.url)("../../package.json");

function parseConfiguration(overrides = {}) {
  return parseUniversalOntologyMcpStdioConfiguration({
    commandLineArguments: [],
    environment: {},
    platform: "linux",
    readHomeDirectory: () => "/home/ontology-user",
    ...overrides,
  });
}

describe("Universal Ontology MCP stdio configuration", () => {
  test("selects the repository filesystem source without consulting HTTP cache configuration", () => {
    const configuration = parseConfiguration({
      commandLineArguments: ["--query-artifact-source=file-system"],
      workingDirectoryPath: "/workspace/universal-ontology",
      readHomeDirectory() {
        throw new Error("HTTP cache home lookup must not run");
      },
    });

    expect(configuration).toEqual({
      operationMode: "serve_stdio",
      ontologyQueryArtifactSource: {
        kind: "file_system",
        rootDirectoryPath: "/workspace/universal-ontology/dist/query/v1",
      },
    });
  });

  test.each([
    [
      ["--query-artifact-source=file-system", "--artifact-channel=development"],
      "--artifact-channel",
    ],
    [
      [
        "--query-artifact-source=http",
        "--query-artifact-root-directory=dist/query/v1",
      ],
      "--query-artifact-root-directory",
    ],
  ])(
    "rejects source-incompatible option %s",
    (commandLineArguments, optionName) => {
      expect(() => parseConfiguration({ commandLineArguments })).toThrow(
        expect.objectContaining({
          name: "UniversalOntologyMcpStdioConfigurationError",
          optionName,
          exitCode: 2,
        }),
      );
    },
  );

  test("returns the strict standalone HTTP defaults with one package-version authority", () => {
    const configuration = parseConfiguration();

    expect(configuration).toEqual({
      operationMode: "serve_stdio",
      ontologyQueryArtifactSource: {
        kind: "http",
        channelName: "stable",
        baseUrl: new URL("https://haddenindustries.com/ontology/query/v1/"),
        persistentCacheDirectoryPath:
          "/home/ontology-user/.cache/universal-ontology-mcp-server/v1",
        maximumPersistentCacheByteSize: 536_870_912,
        allowInsecureLoopbackOrigin: false,
      },
    });
    expect(UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO.version).toBe(
      packageMetadata.version,
    );
    expect(UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT).toContain(
      "--artifact-base-url",
    );
    expect(UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT).toContain(
      "UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY",
    );
  });

  test.each([
    {
      platform: "win32",
      environment: { LOCALAPPDATA: "C:\\Users\\Ontology\\AppData\\Local" },
      homeDirectory: "C:\\Users\\Ontology",
      expected: win32.join(
        "C:\\Users\\Ontology\\AppData\\Local",
        "UniversalOntology",
        "McpServer",
        "Cache",
        "v1",
      ),
    },
    {
      platform: "win32",
      environment: { LOCALAPPDATA: "" },
      homeDirectory: "C:\\Users\\Ontology",
      expected: win32.join(
        "C:\\Users\\Ontology",
        "AppData",
        "Local",
        "UniversalOntology",
        "McpServer",
        "Cache",
        "v1",
      ),
    },
    {
      platform: "darwin",
      environment: {},
      homeDirectory: "/Users/ontology",
      expected:
        "/Users/ontology/Library/Caches/io.hadden-industries.universal-ontology-mcp-server/v1",
    },
    {
      platform: "linux",
      environment: { XDG_CACHE_HOME: "/var/cache/ontology-user" },
      homeDirectory: "/home/ontology",
      expected: "/var/cache/ontology-user/universal-ontology-mcp-server/v1",
    },
    {
      platform: "freebsd",
      environment: { XDG_CACHE_HOME: "" },
      homeDirectory: "/home/ontology",
      expected: "/home/ontology/.cache/universal-ontology-mcp-server/v1",
    },
  ])(
    "selects the contained $platform cache default",
    ({ environment, expected, homeDirectory, platform }) => {
      expect(
        parseConfiguration({
          environment,
          platform,
          readHomeDirectory: () => homeDirectory,
        }).ontologyQueryArtifactSource.persistentCacheDirectoryPath,
      ).toBe(expected);
    },
  );

  test("accepts both value syntaxes and applies CLI over environment", () => {
    const configuration = parseConfiguration({
      commandLineArguments: [
        "--artifact-channel=development",
        "--artifact-base-url",
        "http://127.0.0.1:8123/query/v1/",
        "--cache-directory=/tmp/ontology-cli-cache",
        "--cache-maximum-bytes",
        "1048576",
        "--allow-insecure-loopback-artifact-origin",
      ],
      environment: {
        UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL: "stable",
        UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL:
          "https://example.com/ignored/",
        UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY: "/tmp/ignored-cache",
        UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES: "2048",
      },
    });

    expect(configuration).toEqual({
      operationMode: "serve_stdio",
      ontologyQueryArtifactSource: {
        kind: "http",
        channelName: "development",
        baseUrl: new URL("http://127.0.0.1:8123/query/v1/"),
        persistentCacheDirectoryPath: "/tmp/ontology-cli-cache",
        maximumPersistentCacheByteSize: 1_048_576,
        allowInsecureLoopbackOrigin: true,
      },
    });
  });

  test("uses non-empty environment settings when no CLI value overrides them", () => {
    const configuration = parseConfiguration({
      environment: {
        UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL: "development",
        UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL:
          "https://artifacts.example.test/ontology/query/v1/",
        UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY: "/srv/ontology-cache",
        UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES: "4096",
      },
    });

    expect(configuration).toMatchObject({
      ontologyQueryArtifactSource: {
        kind: "http",
        channelName: "development",
        persistentCacheDirectoryPath: "/srv/ontology-cache",
        maximumPersistentCacheByteSize: 4096,
      },
    });
    expect(configuration.ontologyQueryArtifactSource.baseUrl.href).toBe(
      "https://artifacts.example.test/ontology/query/v1/",
    );
  });

  test("does not read a home directory when an absolute cache path is explicit", () => {
    expect(
      parseConfiguration({
        commandLineArguments: ["--cache-directory", "/srv/ontology-cache"],
        readHomeDirectory() {
          throw new Error("home lookup must not run");
        },
      }).ontologyQueryArtifactSource.persistentCacheDirectoryPath,
    ).toBe("/srv/ontology-cache");
  });

  test("treats empty environment settings as absent", () => {
    expect(
      parseConfiguration({
        environment: {
          UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL: "",
          UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL: "",
          UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY: "",
          UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES: "",
          XDG_CACHE_HOME: "",
        },
      }),
    ).toEqual(parseConfiguration());
  });

  test.each([
    [["--unknown"], "--unknown"],
    [["positional"], "command-line argument"],
    [["--artifact-channel"], "--artifact-channel"],
    [["--artifact-channel", "--help"], "--artifact-channel"],
    [
      ["--artifact-channel=stable", "--artifact-channel", "development"],
      "--artifact-channel",
    ],
    [
      [
        "--allow-insecure-loopback-artifact-origin",
        "--allow-insecure-loopback-artifact-origin",
      ],
      "--allow-insecure-loopback-artifact-origin",
    ],
    [
      ["--allow-insecure-loopback-artifact-origin=true"],
      "--allow-insecure-loopback-artifact-origin",
    ],
    [["--help", "--version"], "--version"],
  ])(
    "rejects malformed or duplicate CLI input %#",
    (arguments_, optionName) => {
      expect(() =>
        parseConfiguration({ commandLineArguments: arguments_ }),
      ).toThrow(
        expect.objectContaining({
          name: "UniversalOntologyMcpStdioConfigurationError",
          optionName,
          exitCode: 2,
        }),
      );
    },
  );

  test.each([
    ["--artifact-channel", "preview"],
    ["--artifact-channel", ""],
    ["--artifact-base-url", "http://example.com/query/v1/"],
    ["--artifact-base-url", "https://user:secret@example.com/query/v1/"],
    ["--artifact-base-url", "https://example.com/query/v1"],
    ["--artifact-base-url", "https://example.com/query/v1/?secret=value"],
    ["--cache-directory", "relative/cache"],
    ["--cache-directory", ""],
    ["--cache-maximum-bytes", "0"],
    ["--cache-maximum-bytes", "-1"],
    ["--cache-maximum-bytes", "1.5"],
    ["--cache-maximum-bytes", "9007199254740992"],
  ])("rejects invalid %s without echoing its value", (optionName, value) => {
    let capturedError;

    try {
      parseConfiguration({
        commandLineArguments: [optionName, value],
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(
      UniversalOntologyMcpStdioConfigurationError,
    );
    expect(capturedError).toMatchObject({ optionName, exitCode: 2 });
    if (value !== "") {
      expect(capturedError.message).not.toContain(value);
    }
  });

  test("permits insecure HTTP only for an explicitly allowed loopback origin", () => {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(
        parseConfiguration({
          commandLineArguments: [
            "--artifact-base-url",
            `http://${hostname}:8123/query/v1/`,
            "--allow-insecure-loopback-artifact-origin",
          ],
        }).ontologyQueryArtifactSource.baseUrl.protocol,
      ).toBe("http:");
    }

    expect(() =>
      parseConfiguration({
        commandLineArguments: [
          "--artifact-base-url",
          "http://192.0.2.10/query/v1/",
          "--allow-insecure-loopback-artifact-origin",
        ],
      }),
    ).toThrow(/--artifact-base-url/u);
  });

  test.each([
    ["UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL", "private-preview"],
    [
      "UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL",
      "https://user:private-secret@example.test/query/v1/",
    ],
    ["UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY", "private/relative/cache"],
    ["UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES", "private-overflow"],
  ])(
    "rejects invalid environment setting %s without echoing it",
    (name, value) => {
      let capturedError;

      try {
        parseConfiguration({ environment: { [name]: value } });
      } catch (error) {
        capturedError = error;
      }

      expect(capturedError).toBeInstanceOf(
        UniversalOntologyMcpStdioConfigurationError,
      );
      expect(capturedError.exitCode).toBe(2);
      expect(capturedError.message).not.toContain(value);
    },
  );

  test.each([
    ["--help", "print_help"],
    ["--version", "print_version"],
  ])(
    "selects %s without consulting invalid environment settings",
    (flag, operationMode) => {
      expect(
        parseConfiguration({
          commandLineArguments: [flag],
          environment: {
            UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL: "private-invalid-value",
          },
        }).operationMode,
      ).toBe(operationMode);
    },
  );
});
