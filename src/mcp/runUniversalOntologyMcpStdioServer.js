import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { homedir } from "node:os";
import process from "node:process";

import { createOntologyQueryModule } from "../ontologyQuery/createOntologyQueryModule.js";
import { createFileSystemOntologyQueryArtifactRepository } from "../ontologyQuery/fileSystemOntologyQueryArtifactRepository.js";
import { createHttpOntologyQueryArtifactReader } from "../ontologyQuery/httpOntologyQueryArtifactReader.js";
import { calculateSha256 } from "../ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { createPersistentHttpOntologyQueryArtifactRepository } from "../ontologyQuery/persistentHttpOntologyQueryArtifactRepository.js";
import { createPersistentOntologyQueryArtifactCache } from "../ontologyQuery/persistentOntologyQueryArtifactCache.js";
import { createUniversalOntologyMcpServer } from "./createUniversalOntologyMcpServer.js";
import { UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO } from "./universalOntologyMcpMetadata.js";
import { createUniversalOntologyMcpOperationalEventWriter } from "./universalOntologyMcpOperationalEvents.js";
import {
  UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT,
  UniversalOntologyMcpStdioConfigurationError,
  parseUniversalOntologyMcpStdioConfiguration,
} from "./universalOntologyMcpStdioConfiguration.js";

const GRACEFUL_SHUTDOWN_DEADLINE_MILLISECONDS = 10_000;

function requireWritableStream(stream, name) {
  if (!stream || typeof stream.write !== "function") {
    throw new TypeError(`${name} must implement write().`);
  }

  return stream;
}

function requireEventSource(eventSource, name) {
  if (
    !eventSource ||
    typeof eventSource.on !== "function" ||
    typeof eventSource.off !== "function"
  ) {
    throw new TypeError(`${name} must implement on() and off().`);
  }

  return eventSource;
}

function safelySetProcessExitCode(setProcessExitCode, exitCode) {
  try {
    setProcessExitCode(exitCode);
  } catch {
    // Exit-code bookkeeping cannot replace the original safe failure path.
  }
}

function createNoopRunnerResult(operationMode) {
  const closedResult = Object.freeze({ shutdownOutcome: "not_started" });
  const closePromise = Promise.resolve(closedResult);
  return Object.freeze({
    operationMode,
    close: () => closePromise,
  });
}

/**
 * Run the installed Universal Ontology MCP process over the official stdio
 * entry. All seams are injectable so unit tests exercise process behavior
 * without replacing the SDK's production transport or opening a listener.
 */
export async function runUniversalOntologyMcpStdioServer({
  commandLineArguments = process.argv.slice(2),
  environment = process.env,
  platform = process.platform,
  readHomeDirectory = homedir,
  standardInput = process.stdin,
  standardOutput = process.stdout,
  standardError = process.stderr,
  signalEmitter = process,
  setProcessExitCode = (exitCode) => {
    process.exitCode = exitCode;
  },
  fetchImplementation = globalThis.fetch,
  serveStdioImplementation = serveStdio,
  createFileSystemOntologyQueryArtifactRepositoryImplementation = createFileSystemOntologyQueryArtifactRepository,
  createPersistentOntologyQueryArtifactCacheImplementation = createPersistentOntologyQueryArtifactCache,
  createHttpOntologyQueryArtifactReaderImplementation = createHttpOntologyQueryArtifactReader,
  createPersistentHttpOntologyQueryArtifactRepositoryImplementation = createPersistentHttpOntologyQueryArtifactRepository,
  createOntologyQueryModuleImplementation = createOntologyQueryModule,
  createUniversalOntologyMcpServerImplementation = createUniversalOntologyMcpServer,
  setTimeoutImplementation = setTimeout,
  clearTimeoutImplementation = clearTimeout,
} = {}) {
  requireWritableStream(standardOutput, "standardOutput");
  requireWritableStream(standardError, "standardError");

  if (typeof setProcessExitCode !== "function") {
    throw new TypeError("setProcessExitCode must be a function.");
  }

  const writeOperationalEvent =
    createUniversalOntologyMcpOperationalEventWriter({ standardError });
  let configuration;

  try {
    configuration = parseUniversalOntologyMcpStdioConfiguration({
      commandLineArguments,
      environment,
      platform,
      readHomeDirectory,
    });
  } catch (error) {
    if (error instanceof UniversalOntologyMcpStdioConfigurationError) {
      writeOperationalEvent({
        eventName: "universal_ontology_mcp_stdio_configuration_failed",
        severity: "error",
        outcome: "failed",
        safeErrorCode: "INVALID_MCP_STDIO_CONFIGURATION",
      });
      safelySetProcessExitCode(setProcessExitCode, error.exitCode);
      return createNoopRunnerResult("configuration_error");
    }

    throw error;
  }

  if (configuration.operationMode === "print_help") {
    standardOutput.write(UNIVERSAL_ONTOLOGY_MCP_STDIO_HELP_TEXT);
    return createNoopRunnerResult(configuration.operationMode);
  }

  if (configuration.operationMode === "print_version") {
    standardOutput.write(`${UNIVERSAL_ONTOLOGY_MCP_SERVER_INFO.version}\n`);
    return createNoopRunnerResult(configuration.operationMode);
  }

  requireEventSource(standardInput, "standardInput");
  requireEventSource(signalEmitter, "signalEmitter");

  for (const [value, name] of [
    [fetchImplementation, "fetchImplementation"],
    [serveStdioImplementation, "serveStdioImplementation"],
    [
      createFileSystemOntologyQueryArtifactRepositoryImplementation,
      "createFileSystemOntologyQueryArtifactRepositoryImplementation",
    ],
    [
      createPersistentOntologyQueryArtifactCacheImplementation,
      "createPersistentOntologyQueryArtifactCacheImplementation",
    ],
    [
      createHttpOntologyQueryArtifactReaderImplementation,
      "createHttpOntologyQueryArtifactReaderImplementation",
    ],
    [
      createPersistentHttpOntologyQueryArtifactRepositoryImplementation,
      "createPersistentHttpOntologyQueryArtifactRepositoryImplementation",
    ],
    [
      createOntologyQueryModuleImplementation,
      "createOntologyQueryModuleImplementation",
    ],
    [
      createUniversalOntologyMcpServerImplementation,
      "createUniversalOntologyMcpServerImplementation",
    ],
    [setTimeoutImplementation, "setTimeoutImplementation"],
    [clearTimeoutImplementation, "clearTimeoutImplementation"],
  ]) {
    if (typeof value !== "function") {
      throw new TypeError(`${name} must be a function.`);
    }
  }

  const serverLifecycleAbortController = new AbortController();
  const { signal: serverLifecycleSignal } = serverLifecycleAbortController;
  let ontologyQueryPromise;
  let stdioServerHandle;
  let shutdownPromise;
  let lifecycleHandlersRemoved = false;

  function reportSdkError(error) {
    writeOperationalEvent({
      eventName: "universal_ontology_mcp_sdk_error",
      severity: "error",
      outcome: "failed",
      safeErrorCode: "MCP_SDK_ERROR",
    });
    void error;
  }

  function reportUnhandledToolError(error) {
    writeOperationalEvent({
      eventName: "universal_ontology_mcp_tool_error",
      severity: "error",
      outcome: "failed",
      safeErrorCode: "INTERNAL_QUERY_FAILURE",
    });
    void error;
  }

  async function createSharedOntologyQuery() {
    serverLifecycleSignal.throwIfAborted();
    const ontologyQueryArtifactSource =
      configuration.ontologyQueryArtifactSource;

    if (ontologyQueryArtifactSource.kind === "file_system") {
      const ontologyQueryArtifactRepository =
        createFileSystemOntologyQueryArtifactRepositoryImplementation({
          queryRoot: ontologyQueryArtifactSource.rootDirectoryPath,
        });
      return createOntologyQueryModuleImplementation({
        ontologyQueryArtifactRepository,
      });
    }

    const ontologyQueryArtifactBaseUrl =
      ontologyQueryArtifactSource.baseUrl.href;
    const ontologyQueryArtifactBaseUrlSha256 = await calculateSha256(
      new TextEncoder().encode(ontologyQueryArtifactBaseUrl),
    );
    serverLifecycleSignal.throwIfAborted();
    const persistentOntologyQueryArtifactCache =
      await createPersistentOntologyQueryArtifactCacheImplementation({
        ontologyQueryArtifactCacheDirectoryPath:
          ontologyQueryArtifactSource.persistentCacheDirectoryPath,
        ontologyQueryArtifactBaseUrlSha256,
        maximumPersistentQueryArtifactCacheByteSize:
          ontologyQueryArtifactSource.maximumPersistentCacheByteSize,
        writeOperationalEvent,
      });
    serverLifecycleSignal.throwIfAborted();
    const httpOntologyQueryArtifactReader =
      createHttpOntologyQueryArtifactReaderImplementation({
        ontologyQueryArtifactBaseUrl,
        allowInsecureLoopbackOntologyQueryArtifactOrigin:
          ontologyQueryArtifactSource.allowInsecureLoopbackOrigin,
        fetchImplementation,
      });
    const ontologyQueryArtifactRepository =
      createPersistentHttpOntologyQueryArtifactRepositoryImplementation({
        ontologyQueryArtifactChannelName:
          ontologyQueryArtifactSource.channelName,
        ontologyQueryArtifactBaseUrlSha256,
        persistentOntologyQueryArtifactCache,
        httpOntologyQueryArtifactReader,
        writeOperationalEvent,
      });
    return createOntologyQueryModuleImplementation({
      ontologyQueryArtifactRepository,
    });
  }

  function getSharedOntologyQuery() {
    ontologyQueryPromise ??= createSharedOntologyQuery();
    return ontologyQueryPromise;
  }

  async function buildMcpServer() {
    const ontologyQuery = await getSharedOntologyQuery();
    serverLifecycleSignal.throwIfAborted();
    return createUniversalOntologyMcpServerImplementation({
      ontologyQuery,
      reportUnhandledToolError,
      serverLifecycleSignal,
    });
  }

  const terminationSignalNames =
    platform === "win32" ? ["SIGINT"] : ["SIGINT", "SIGTERM"];

  function removeLifecycleHandlers() {
    if (lifecycleHandlersRemoved) {
      return;
    }

    lifecycleHandlersRemoved = true;
    standardInput.off("end", handleShutdownRequest);

    for (const signalName of terminationSignalNames) {
      signalEmitter.off(signalName, handleShutdownRequest);
    }
  }

  function beginShutdown() {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    serverLifecycleAbortController.abort(
      new DOMException("Universal Ontology MCP server shutdown.", "AbortError"),
    );
    removeLifecycleHandlers();
    const closeOperation = Promise.resolve().then(() =>
      stdioServerHandle.close(),
    );
    // Always observe a late close rejection, including after the deadline wins.
    const observedCloseOperation = closeOperation.then(
      () => ({ closeOutcome: "closed" }),
      (error) => ({ closeOutcome: "failed", error }),
    );
    let shutdownDeadlineHandle;
    const shutdownDeadline = new Promise((resolve) => {
      shutdownDeadlineHandle = setTimeoutImplementation(
        () => resolve({ closeOutcome: "deadline_exceeded" }),
        GRACEFUL_SHUTDOWN_DEADLINE_MILLISECONDS,
      );
      shutdownDeadlineHandle?.unref?.();
    });

    shutdownPromise = Promise.race([
      observedCloseOperation,
      shutdownDeadline,
    ]).then((closeResult) => {
      if (closeResult.closeOutcome !== "deadline_exceeded") {
        clearTimeoutImplementation(shutdownDeadlineHandle);
      }

      if (closeResult.closeOutcome === "closed") {
        writeOperationalEvent({
          eventName: "universal_ontology_mcp_stdio_shutdown_completed",
          severity: "info",
          outcome: "graceful",
          safeErrorCode: "MCP_STDIO_SHUTDOWN_COMPLETE",
        });
        return Object.freeze({ shutdownOutcome: "graceful" });
      }

      const deadlineExceeded = closeResult.closeOutcome === "deadline_exceeded";
      writeOperationalEvent({
        eventName: "universal_ontology_mcp_stdio_shutdown_failed",
        severity: "error",
        outcome: "failed",
        safeErrorCode: deadlineExceeded
          ? "SHUTDOWN_DEADLINE_EXCEEDED"
          : "MCP_STDIO_SHUTDOWN_FAILED",
      });
      safelySetProcessExitCode(setProcessExitCode, 1);
      return Object.freeze({
        shutdownOutcome: deadlineExceeded ? "deadline_exceeded" : "failed",
      });
    });
    return shutdownPromise;
  }

  function handleShutdownRequest() {
    void beginShutdown();
  }

  try {
    // `legacy: "serve"` deliberately preserves the supported 2025 opening
    // path while the same SDK factory also serves the current 2026 protocol.
    // The SDK owns the actual stdio transport; stdout remains protocol-only.
    stdioServerHandle = serveStdioImplementation(buildMcpServer, {
      legacy: "serve",
      onerror: reportSdkError,
    });

    if (!stdioServerHandle || typeof stdioServerHandle.close !== "function") {
      throw new TypeError(
        "serveStdioImplementation must return a close handle.",
      );
    }
  } catch (error) {
    serverLifecycleAbortController.abort(
      new DOMException("Universal Ontology MCP startup failed.", "AbortError"),
    );
    writeOperationalEvent({
      eventName: "universal_ontology_mcp_stdio_startup_failed",
      severity: "error",
      outcome: "failed",
      safeErrorCode: "MCP_STDIO_STARTUP_FAILED",
    });
    safelySetProcessExitCode(setProcessExitCode, 1);
    throw error;
  }

  standardInput.on("end", handleShutdownRequest);

  for (const signalName of terminationSignalNames) {
    signalEmitter.on(signalName, handleShutdownRequest);
  }

  if (standardInput.readableEnded === true) {
    queueMicrotask(handleShutdownRequest);
  }

  return Object.freeze({
    operationMode: configuration.operationMode,
    configuration,
    serverLifecycleSignal,
    close: beginShutdown,
  });
}
