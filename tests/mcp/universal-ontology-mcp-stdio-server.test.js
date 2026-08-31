import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO } from "../../src/mcp/universalOntologyMcpMetadata.js";
import { runUniversalOntologyMcpStdioServer } from "../../src/mcp/runUniversalOntologyMcpStdioServer.js";

function createWritableRecorder() {
  const writes = [];
  return {
    writes,
    write(value) {
      writes.push(value);
      return true;
    },
  };
}

function createProcessSeams() {
  const standardInput = new EventEmitter();
  standardInput.readableEnded = false;
  return {
    standardInput,
    standardOutput: createWritableRecorder(),
    standardError: createWritableRecorder(),
    signalEmitter: new EventEmitter(),
    exitCodes: [],
  };
}

function createRuntimeDependencies() {
  const persistentOntologyQueryArtifactCache = {
    readVerifiedArtifact: jest.fn(),
  };
  const httpOntologyQueryArtifactReader = { read: jest.fn() };
  const ontologyQueryArtifactRepository = {
    readOntologyQueryCatalog: jest.fn(),
    readOntologyReleaseQueryIndex: jest.fn(),
  };
  const ontologyQuery = {
    searchOntologyEntities: jest.fn(),
    resolveOntologyEntity: jest.fn(),
  };
  const mcpServer = { serverKind: "test-mcp-server" };

  return {
    persistentOntologyQueryArtifactCache,
    httpOntologyQueryArtifactReader,
    ontologyQueryArtifactRepository,
    ontologyQuery,
    mcpServer,
    createPersistentOntologyQueryArtifactCacheImplementation: jest.fn(
      async () => persistentOntologyQueryArtifactCache,
    ),
    createHttpOntologyQueryArtifactReaderImplementation: jest.fn(
      () => httpOntologyQueryArtifactReader,
    ),
    createPersistentHttpOntologyQueryArtifactRepositoryImplementation: jest.fn(
      () => ontologyQueryArtifactRepository,
    ),
    createOntologyQueryModuleImplementation: jest.fn(() => ontologyQuery),
    createUniversalOntologyMcpServerImplementation: jest.fn(() => mcpServer),
  };
}

function createServeStdioHarness() {
  const stdioServerHandle = { close: jest.fn(async () => {}) };
  let capturedFactory;
  let capturedOptions;
  const serveStdioImplementation = jest.fn((factory, options) => {
    capturedFactory = factory;
    capturedOptions = options;
    return stdioServerHandle;
  });

  return {
    serveStdioImplementation,
    stdioServerHandle,
    get factory() {
      return capturedFactory;
    },
    get options() {
      return capturedOptions;
    },
  };
}

function createServeArguments(cacheDirectory = "/tmp/ontology-mcp-cache") {
  return ["--cache-directory", cacheDirectory];
}

async function startTestRunner(overrides = {}) {
  const processSeams = createProcessSeams();
  const runtimeDependencies = createRuntimeDependencies();
  const stdioHarness = createServeStdioHarness();
  const result = await runUniversalOntologyMcpStdioServer({
    commandLineArguments: createServeArguments(),
    environment: {},
    platform: "linux",
    readHomeDirectory: () => "/home/ontology-user",
    setProcessExitCode: (exitCode) => processSeams.exitCodes.push(exitCode),
    ...processSeams,
    ...runtimeDependencies,
    ...stdioHarness,
    ...overrides,
  });

  return { processSeams, result, runtimeDependencies, stdioHarness };
}

describe("Universal Ontology MCP stdio runner", () => {
  test.each([
    ["--help", "print_help", "Usage:"],
    [
      "--version",
      "print_version",
      `${UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO.version}\n`,
    ],
  ])(
    "short-circuits %s before runtime composition",
    async (flag, operationMode, output) => {
      const processSeams = createProcessSeams();
      const runtimeDependencies = createRuntimeDependencies();
      const stdioHarness = createServeStdioHarness();

      const result = await runUniversalOntologyMcpStdioServer({
        commandLineArguments: [flag],
        environment: {
          UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL: "invalid-ignored-value",
        },
        platform: "linux",
        readHomeDirectory: () => "/home/ontology-user",
        setProcessExitCode: (exitCode) => processSeams.exitCodes.push(exitCode),
        ...processSeams,
        ...runtimeDependencies,
        ...stdioHarness,
      });

      expect(result.operationMode).toBe(operationMode);
      expect(processSeams.standardOutput.writes.join("")).toContain(output);
      expect(processSeams.standardError.writes).toEqual([]);
      expect(stdioHarness.serveStdioImplementation).not.toHaveBeenCalled();
      expect(
        runtimeDependencies.createPersistentOntologyQueryArtifactCacheImplementation,
      ).not.toHaveBeenCalled();
      expect(processSeams.signalEmitter.eventNames()).toEqual([]);
    },
  );

  test("lazily composes one shared query runtime inside the official stdio factory", async () => {
    const { result, runtimeDependencies, stdioHarness } =
      await startTestRunner();

    expect(result.operationMode).toBe("serve_stdio");
    expect(stdioHarness.serveStdioImplementation).toHaveBeenCalledTimes(1);
    expect(stdioHarness.options).toMatchObject({
      legacy: "serve",
      onerror: expect.any(Function),
    });
    expect(
      runtimeDependencies.createPersistentOntologyQueryArtifactCacheImplementation,
    ).not.toHaveBeenCalled();

    await expect(stdioHarness.factory({ era: "modern" })).resolves.toBe(
      runtimeDependencies.mcpServer,
    );
    expect(
      runtimeDependencies.createPersistentOntologyQueryArtifactCacheImplementation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        ontologyQueryArtifactCacheDirectoryPath: "/tmp/ontology-mcp-cache",
        maximumPersistentQueryArtifactCacheByteSize: 536_870_912,
        ontologyQueryArtifactBaseUrlSha256:
          expect.stringMatching(/^[0-9a-f]{64}$/u),
        writeOperationalEvent: expect.any(Function),
      }),
    );
    expect(
      runtimeDependencies.createHttpOntologyQueryArtifactReaderImplementation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        ontologyQueryArtifactBaseUrl:
          "https://haddenindustries.com/ontology/query/v1/",
        allowInsecureLoopbackOntologyQueryArtifactOrigin: false,
      }),
    );
    expect(
      runtimeDependencies.createPersistentHttpOntologyQueryArtifactRepositoryImplementation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        ontologyQueryArtifactChannelName: "stable",
        writeOperationalEvent: expect.any(Function),
      }),
    );
    expect(
      runtimeDependencies.createOntologyQueryModuleImplementation,
    ).toHaveBeenCalledWith({
      ontologyQueryArtifactRepository:
        runtimeDependencies.ontologyQueryArtifactRepository,
    });
    expect(
      runtimeDependencies.createUniversalOntologyMcpServerImplementation,
    ).toHaveBeenCalledWith({
      ontologyQuery: runtimeDependencies.ontologyQuery,
      reportUnhandledToolError: expect.any(Function),
      serverLifecycleSignal: result.serverLifecycleSignal,
    });

    await stdioHarness.factory({ era: "legacy" });
    expect(
      runtimeDependencies.createPersistentOntologyQueryArtifactCacheImplementation,
    ).toHaveBeenCalledTimes(1);
    expect(
      runtimeDependencies.createUniversalOntologyMcpServerImplementation,
    ).toHaveBeenCalledTimes(2);
  });

  test("aborts lifecycle work and closes exactly once for EOF or repeated signals", async () => {
    const observedLifecycleStates = [];
    const lifecycleObservation = { signal: undefined };
    const startedRunner = await startTestRunner({
      serveStdioImplementation() {
        return {
          async close() {
            observedLifecycleStates.push(lifecycleObservation.signal.aborted);
          },
        };
      },
    });
    const runnerResult = startedRunner.result;
    lifecycleObservation.signal = runnerResult.serverLifecycleSignal;
    const { processSeams, result } = startedRunner;

    processSeams.standardInput.emit("end");
    processSeams.signalEmitter.emit("SIGINT");
    processSeams.signalEmitter.emit("SIGTERM");
    const firstClose = result.close();
    const secondClose = result.close();

    expect(firstClose).toBe(secondClose);
    await firstClose;
    expect(observedLifecycleStates).toEqual([true]);
    expect(processSeams.signalEmitter.eventNames()).toEqual([]);
    expect(processSeams.standardInput.listenerCount("end")).toBe(0);
  });

  test.each([
    ["win32", ["SIGINT"]],
    ["linux", ["SIGINT", "SIGTERM"]],
    ["darwin", ["SIGINT", "SIGTERM"]],
  ])(
    "registers only portable $platform termination signals",
    async (platform, expectedSignals) => {
      const { processSeams, result } = await startTestRunner({ platform });

      expect(processSeams.signalEmitter.eventNames().sort()).toEqual(
        expectedSignals.sort(),
      );
      await result.close();
    },
  );

  test("bounds graceful close, unreferences its deadline, and sets exit code 1", async () => {
    const timerHandle = { unref: jest.fn() };
    const { processSeams, result } = await startTestRunner({
      serveStdioImplementation: () => ({
        close: () => new Promise(() => {}),
      }),
      setTimeoutImplementation(callback, milliseconds) {
        expect(milliseconds).toBe(10_000);
        queueMicrotask(callback);
        return timerHandle;
      },
      clearTimeoutImplementation: jest.fn(),
    });

    await expect(result.close()).resolves.toMatchObject({
      shutdownOutcome: "deadline_exceeded",
    });
    expect(timerHandle.unref).toHaveBeenCalledTimes(1);
    expect(processSeams.exitCodes).toEqual([1]);
    expect(processSeams.standardError.writes.join("")).toContain(
      "SHUTDOWN_DEADLINE_EXCEEDED",
    );
  });

  test("reports a redacted startup failure and sets exit code 1", async () => {
    const privateMessage = "C:\\private\\stdio failed";
    const processSeams = createProcessSeams();

    await expect(
      runUniversalOntologyMcpStdioServer({
        commandLineArguments: createServeArguments(),
        environment: {},
        platform: "linux",
        readHomeDirectory: () => "/home/ontology-user",
        setProcessExitCode: (exitCode) => processSeams.exitCodes.push(exitCode),
        ...processSeams,
        serveStdioImplementation() {
          throw new Error(privateMessage);
        },
      }),
    ).rejects.toThrow(privateMessage);
    expect(processSeams.exitCodes).toEqual([1]);
    expect(processSeams.standardError.writes.join("")).toContain(
      "MCP_STDIO_STARTUP_FAILED",
    );
    expect(processSeams.standardError.writes.join("")).not.toContain(
      privateMessage,
    );
  });

  test("reports invalid configuration without composing MCP", async () => {
    const processSeams = createProcessSeams();
    const stdioHarness = createServeStdioHarness();

    const result = await runUniversalOntologyMcpStdioServer({
      commandLineArguments: ["--artifact-channel", "private-invalid"],
      environment: {},
      platform: "linux",
      readHomeDirectory: () => "/home/ontology-user",
      setProcessExitCode: (exitCode) => processSeams.exitCodes.push(exitCode),
      ...processSeams,
      ...stdioHarness,
    });

    expect(result.operationMode).toBe("configuration_error");
    expect(processSeams.exitCodes).toEqual([2]);
    expect(stdioHarness.serveStdioImplementation).not.toHaveBeenCalled();
    expect(processSeams.standardError.writes.join("")).toContain(
      "INVALID_MCP_STDIO_CONFIGURATION",
    );
    expect(processSeams.standardError.writes.join("")).not.toContain(
      "private-invalid",
    );
  });
});
