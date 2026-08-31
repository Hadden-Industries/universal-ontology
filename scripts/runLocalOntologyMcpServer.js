import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

import { generateOntologyQueryIndexes } from "./generateOntologyQueryIndexes.js";
import {
  createUniversalOntologyMcpHttpHandler,
  UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES,
} from "../src/mcp/createUniversalOntologyMcpHttpHandler.js";
import { createFileSystemOntologyQueryArtifactRepository } from "../src/ontologyQuery/fileSystemOntologyQueryArtifactRepository.js";
import { createOntologyQueryModule } from "../src/ontologyQuery/createOntologyQueryModule.js";

export const LOCAL_ONTOLOGY_MCP_BIND_ADDRESS = "127.0.0.1";
export const LOCAL_ONTOLOGY_MCP_DEFAULT_PORT = 8000;
export const LOCAL_ONTOLOGY_MCP_PATH = "/mcp";
export const LOCAL_ONTOLOGY_MCP_HEALTH_PATH = "/healthz";
export const LOCAL_ONTOLOGY_MCP_MAXIMUM_CONCURRENT_REQUESTS = 8;
export const LOCAL_ONTOLOGY_MCP_REQUESTS_PER_MINUTE = 120;
export const LOCAL_ONTOLOGY_MCP_RATE_LIMIT_BURST = 30;
export const LOCAL_ONTOLOGY_MCP_GRACEFUL_SHUTDOWN_DEADLINE_MILLISECONDS = 10_000;
export const PRIMARY_MCP_PROTOCOL_VERSION = "2026-07-28";

const DEFAULT_QUERY_CACHE_MAXIMUM_BYTES = 64 * 1024 * 1024;
const REJECTION_ERROR_CODE = -32000;
const ROUTE_NOT_FOUND_ERROR_CODE = -32601;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function validatePositiveFiniteNumber(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive finite number.`);
  }
}

function validatePositiveSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
}

function parsePositiveSafeInteger(value, name) {
  if (!/^\d+$/u.test(value ?? "")) {
    throw new TypeError(`${name} must contain a positive decimal integer.`);
  }

  const parsed = Number(value);
  validatePositiveSafeInteger(parsed, name);
  return parsed;
}

function defaultWaitForShutdownDeadline(milliseconds, { signal } = {}) {
  return new Promise((resolvePromise) => {
    const timeout = setTimeout(resolvePromise, milliseconds);

    signal?.addEventListener("abort", () => clearTimeout(timeout), {
      once: true,
    });
  });
}

function defaultWriteLogEvent(event) {
  process.stderr.write(`${JSON.stringify(event)}\n`);
}

function writeProcessLifecycleFailureEvent(eventName, safeErrorCode) {
  defaultWriteLogEvent({
    timestamp: new Date().toISOString(),
    severity: "error",
    eventName,
    correlationId: randomUUID(),
    durationMilliseconds: 0,
    outcome: "failure",
    safeErrorCode,
  });
}

function createStructuredEventLogger({
  writeLogEvent,
  readMonotonicMilliseconds,
}) {
  return ({
    severity,
    eventName,
    correlationId = randomUUID(),
    startedAtMonotonicMilliseconds,
    outcome,
    safeErrorCode = null,
  }) => {
    const durationMilliseconds =
      startedAtMonotonicMilliseconds === undefined
        ? 0
        : Math.max(
            0,
            readMonotonicMilliseconds() - startedAtMonotonicMilliseconds,
          );

    writeLogEvent({
      timestamp: new Date().toISOString(),
      severity,
      eventName,
      correlationId,
      durationMilliseconds,
      outcome,
      safeErrorCode,
    });
  };
}

/**
 * Per-client token bucket driven only by injected monotonic time.
 *
 * Wall-clock changes cannot mint tokens. A backwards observation is clamped
 * to zero elapsed time, preserving the preceding bucket state.
 */
export function createLoopbackTokenBucketRateLimiter({
  requestsPerMinute,
  burst,
  readMonotonicMilliseconds,
}) {
  validatePositiveFiniteNumber(requestsPerMinute, "requestsPerMinute");
  validatePositiveSafeInteger(burst, "burst");

  if (typeof readMonotonicMilliseconds !== "function") {
    throw new TypeError("readMonotonicMilliseconds must be a function.");
  }

  const refillPerMillisecond = requestsPerMinute / 60_000;
  const buckets = new Map();

  return Object.freeze({
    take(clientAddress) {
      const now = readMonotonicMilliseconds();

      if (!Number.isFinite(now)) {
        throw new TypeError(
          "readMonotonicMilliseconds must return a finite number.",
        );
      }

      const preceding = buckets.get(clientAddress);
      const bucket = preceding ?? { tokens: burst, observedAt: now };
      const elapsed = Math.max(0, now - bucket.observedAt);
      bucket.tokens = Math.min(
        burst,
        bucket.tokens + elapsed * refillPerMillisecond,
      );
      bucket.observedAt = Math.max(bucket.observedAt, now);

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        buckets.set(clientAddress, bucket);
        return { accepted: true };
      }

      buckets.set(clientAddress, bucket);
      return {
        accepted: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((1 - bucket.tokens) / refillPerMillisecond / 1_000),
        ),
      };
    },
  });
}

function fixedJsonRpcErrorBody(code, message) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: { code, message },
  });
}

function writeConnectionClosingJsonRpcError(
  response,
  { statusCode, errorCode, message, retryAfterSeconds },
) {
  response.shouldKeepAlive = false;
  response.statusCode = statusCode;
  response.setHeader("connection", "close");
  response.setHeader("content-type", "application/json");

  if (retryAfterSeconds !== undefined) {
    response.setHeader("retry-after", String(retryAfterSeconds));
  }

  response.end(fixedJsonRpcErrorBody(errorCode, message));
}

async function readBoundedNodeJsonBody(request) {
  if (request.method !== "POST") {
    return { parsedBody: undefined };
  }

  const declaredLength = request.headers["content-length"];
  const singleDeclaredLength = Array.isArray(declaredLength)
    ? declaredLength[0]
    : declaredLength;

  if (
    singleDeclaredLength !== undefined &&
    /^\d+$/u.test(singleDeclaredLength) &&
    Number(singleDeclaredLength) >
      UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES
  ) {
    return { bodyTooLarge: true };
  }

  const chunks = [];
  let byteCount = 0;
  // Node 24's iterator can stop pulling without destroying the socket. The
  // caller then returns a connection-closing response, preventing buffered or
  // unread bytes from becoming a pipelined request.
  const iterator = request.iterator({ destroyOnReturn: false });

  for await (const chunk of iterator) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteCount += bytes.byteLength;

    if (byteCount > UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES) {
      await iterator.return();
      return { bodyTooLarge: true };
    }

    chunks.push(bytes);
  }

  if (byteCount === 0) {
    return { parsedBody: undefined };
  }

  try {
    return { parsedBody: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { malformedJson: true };
  }
}

/**
 * Reject without consuming a byte from the request body. Closing persistence
 * is mandatory: otherwise unread bytes could become a second pipelined HTTP
 * request after this response.
 */
export function rejectRequestBeforeBodyRead(
  response,
  { statusCode, errorCode, message, retryAfterSeconds },
) {
  writeConnectionClosingJsonRpcError(response, {
    statusCode,
    errorCode,
    message,
    retryAfterSeconds,
  });
}

/** Prime an official guard with connection-closing semantics, restoring the
 * response's persistence state only when the guard accepts the request. */
export function runConnectionClosingGuard(guard, request, response) {
  const precedingShouldKeepAlive = response.shouldKeepAlive;
  response.shouldKeepAlive = false;
  response.setHeader("connection", "close");
  const accepted = guard(request, response);

  if (accepted) {
    response.removeHeader("connection");
    response.shouldKeepAlive = precedingShouldKeepAlive;
  }

  return accepted;
}

function writeHealthResponse(response, catalogReady) {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(
    JSON.stringify({
      status: catalogReady ? "ready" : "not_ready",
      catalogReady,
      primaryMcpProtocolVersion: PRIMARY_MCP_PROTOCOL_VERSION,
    }),
  );
}

function closeHttpServer(httpServer) {
  if (!httpServer.listening) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise, rejectPromise) => {
    httpServer.close((error) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise();
      }
    });
  });
}

/**
 * Construct the guarded loopback listener without starting it.
 *
 * Tests may request OS-selected port 0, but the production configuration
 * parser deliberately accepts only 1–65535. The bind address is constant and
 * has no environment override.
 */
export function createLocalUniversalOntologyMcpServer({
  ontologyQuery,
  catalogReady,
  onError,
  writeLogEvent = defaultWriteLogEvent,
  readMonotonicMilliseconds = () => performance.now(),
  maximumConcurrentMcpRequests = LOCAL_ONTOLOGY_MCP_MAXIMUM_CONCURRENT_REQUESTS,
  rateLimitRequestsPerMinute = LOCAL_ONTOLOGY_MCP_REQUESTS_PER_MINUTE,
  rateLimitBurst = LOCAL_ONTOLOGY_MCP_RATE_LIMIT_BURST,
  gracefulShutdownDeadlineMilliseconds = LOCAL_ONTOLOGY_MCP_GRACEFUL_SHUTDOWN_DEADLINE_MILLISECONDS,
  waitForShutdownDeadline = defaultWaitForShutdownDeadline,
  closeOntologyQuery = async () => {},
}) {
  if (typeof catalogReady !== "boolean") {
    throw new TypeError("catalogReady must be a boolean.");
  }

  validatePositiveSafeInteger(
    maximumConcurrentMcpRequests,
    "maximumConcurrentMcpRequests",
  );
  validatePositiveSafeInteger(
    gracefulShutdownDeadlineMilliseconds,
    "gracefulShutdownDeadlineMilliseconds",
  );

  if (typeof writeLogEvent !== "function") {
    throw new TypeError("writeLogEvent must be a function.");
  }

  if (typeof waitForShutdownDeadline !== "function") {
    throw new TypeError("waitForShutdownDeadline must be a function.");
  }

  if (typeof closeOntologyQuery !== "function") {
    throw new TypeError("closeOntologyQuery must be a function.");
  }

  const logEvent = createStructuredEventLogger({
    writeLogEvent,
    readMonotonicMilliseconds,
  });
  const reportError =
    onError ??
    ((error) => {
      logEvent({
        severity: "error",
        eventName: "mcp_unhandled_error",
        outcome: "failure",
        safeErrorCode: "INTERNAL_MCP_FAILURE",
      });

      // The detailed error remains available to an injected observer in
      // tests/embedders; default structured logs intentionally omit messages,
      // stacks, ontology text, and local paths.
      void error;
    });

  if (typeof reportError !== "function") {
    throw new TypeError("onError must be a function when provided.");
  }

  const mcpHandler = createUniversalOntologyMcpHttpHandler({
    ontologyQuery,
    onError: reportError,
  });
  const activeQueryControllers = new Set();
  const shutdownAwareMcpHandler = {
    async fetch(request, options) {
      const controller = new AbortController();
      activeQueryControllers.add(controller);

      try {
        const signal = AbortSignal.any([request.signal, controller.signal]);
        return await mcpHandler.fetch(
          new Request(request, { signal }),
          options,
        );
      } finally {
        activeQueryControllers.delete(controller);
      }
    },
  };
  const nodeMcpHandler = toNodeHandler(shutdownAwareMcpHandler, {
    onerror: reportError,
  });
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const rateLimiter = createLoopbackTokenBucketRateLimiter({
    requestsPerMinute: rateLimitRequestsPerMinute,
    burst: rateLimitBurst,
    readMonotonicMilliseconds,
  });
  let activeMcpRequestCount = 0;
  let draining = false;
  let shutdownPromise;

  function logRejectedRequest(
    { correlationId, startedAtMonotonicMilliseconds },
    safeErrorCode,
  ) {
    logEvent({
      severity: "warning",
      eventName: "mcp_http_request_rejected",
      correlationId,
      startedAtMonotonicMilliseconds,
      outcome: "rejected",
      safeErrorCode,
    });
  }

  function rejectRequest(response, rejection, requestContext, safeErrorCode) {
    rejectRequestBeforeBodyRead(response, rejection);
    logRejectedRequest(requestContext, safeErrorCode);
  }

  async function routeRequest(request, response, requestContext) {
    if (request.url === LOCAL_ONTOLOGY_MCP_HEALTH_PATH) {
      if (request.method === "GET") {
        writeHealthResponse(response, catalogReady);
        logEvent({
          severity: "info",
          eventName: "mcp_health_check_completed",
          ...requestContext,
          outcome: "success",
          safeErrorCode: null,
        });
      } else {
        rejectRequest(
          response,
          {
            statusCode: 405,
            errorCode: REJECTION_ERROR_CODE,
            message: "Method not allowed.",
          },
          requestContext,
          "HTTP_METHOD_NOT_ALLOWED",
        );
      }

      return;
    }

    if (request.url !== LOCAL_ONTOLOGY_MCP_PATH) {
      rejectRequest(
        response,
        {
          statusCode: 404,
          errorCode: ROUTE_NOT_FOUND_ERROR_CODE,
          message: "Route not found.",
        },
        requestContext,
        "ROUTE_NOT_FOUND",
      );
      return;
    }

    if (draining) {
      rejectRequest(
        response,
        {
          statusCode: 503,
          errorCode: REJECTION_ERROR_CODE,
          message: "The local ontology MCP server is draining.",
          retryAfterSeconds: 1,
        },
        requestContext,
        "SERVER_DRAINING",
      );
      return;
    }

    const rateAdmission = rateLimiter.take(
      request.socket.remoteAddress ?? "unknown-loopback-client",
    );

    if (!rateAdmission.accepted) {
      rejectRequest(
        response,
        {
          statusCode: 429,
          errorCode: REJECTION_ERROR_CODE,
          message: "Local ontology MCP request rate exceeded.",
          retryAfterSeconds: rateAdmission.retryAfterSeconds,
        },
        requestContext,
        "RATE_LIMIT_EXCEEDED",
      );
      return;
    }

    if (activeMcpRequestCount >= maximumConcurrentMcpRequests) {
      rejectRequest(
        response,
        {
          statusCode: 503,
          errorCode: REJECTION_ERROR_CODE,
          message: "Local ontology MCP request concurrency exceeded.",
          retryAfterSeconds: 1,
        },
        requestContext,
        "CONCURRENCY_LIMIT_EXCEEDED",
      );
      return;
    }

    activeMcpRequestCount += 1;
    const { correlationId, startedAtMonotonicMilliseconds } = requestContext;
    let permitReleased = false;

    function releasePermit() {
      if (!permitReleased) {
        permitReleased = true;
        activeMcpRequestCount -= 1;
      }
    }

    response.once("close", releasePermit);

    try {
      const body = await readBoundedNodeJsonBody(request);

      if (body.bodyTooLarge) {
        rejectRequest(
          response,
          {
            statusCode: 413,
            errorCode: REJECTION_ERROR_CODE,
            message: `Request body exceeds ${UNIVERSAL_ONTOLOGY_MCP_REQUEST_BODY_MAXIMUM_BYTES} bytes.`,
          },
          requestContext,
          "REQUEST_BODY_TOO_LARGE",
        );
        return;
      }

      if (body.malformedJson) {
        rejectRequest(
          response,
          {
            statusCode: 400,
            errorCode: -32_700,
            message: "Parse error.",
          },
          requestContext,
          "MALFORMED_JSON",
        );
        return;
      }

      await nodeMcpHandler(request, response, body.parsedBody);
      logEvent({
        severity: response.statusCode >= 400 ? "warning" : "info",
        eventName: "mcp_request_completed",
        correlationId,
        startedAtMonotonicMilliseconds,
        outcome: response.statusCode >= 400 ? "rejected" : "success",
        safeErrorCode:
          response.statusCode >= 400 ? `HTTP_${response.statusCode}` : null,
      });
    } catch (error) {
      reportError(error);
      logEvent({
        severity: "error",
        eventName: "mcp_request_failed",
        correlationId,
        startedAtMonotonicMilliseconds,
        outcome: "failure",
        safeErrorCode: "INTERNAL_HTTP_FAILURE",
      });

      if (!response.headersSent) {
        writeConnectionClosingJsonRpcError(response, {
          statusCode: 500,
          errorCode: REJECTION_ERROR_CODE,
          message: "Internal server error.",
        });
      } else if (!response.writableEnded) {
        response.destroy();
      }
    } finally {
      response.off("close", releasePermit);
      releasePermit();
    }
  }

  const httpServer = createServer((request, response) => {
    const requestContext = {
      correlationId: randomUUID(),
      startedAtMonotonicMilliseconds: readMonotonicMilliseconds(),
    };

    // The official guards own their fixed 403 responses. This wrapper ensures
    // those responses close the socket before any unread request bytes.
    if (
      !runConnectionClosingGuard(validateHost, request, response) ||
      !runConnectionClosingGuard(validateOrigin, request, response)
    ) {
      logRejectedRequest(requestContext, "HOST_ORIGIN_VALIDATION_FAILED");
      return;
    }

    void routeRequest(request, response, requestContext).catch((error) => {
      reportError(error);
      logEvent({
        severity: "error",
        eventName: "mcp_request_failed",
        ...requestContext,
        outcome: "failure",
        safeErrorCode: "INTERNAL_HTTP_FAILURE",
      });

      if (!response.headersSent) {
        writeConnectionClosingJsonRpcError(response, {
          statusCode: 500,
          errorCode: REJECTION_ERROR_CODE,
          message: "Internal server error.",
        });
      } else if (!response.writableEnded) {
        response.destroy();
      }
    });
  });

  function listen({ port = LOCAL_ONTOLOGY_MCP_DEFAULT_PORT } = {}) {
    if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
      return Promise.reject(
        new TypeError("port must be an integer from 0 through 65535."),
      );
    }

    if (httpServer.listening) {
      return Promise.reject(
        new Error("The local MCP server is already listening."),
      );
    }

    return new Promise((resolvePromise, rejectPromise) => {
      function handleError(error) {
        httpServer.off("listening", handleListening);
        rejectPromise(error);
      }

      function handleListening() {
        httpServer.off("error", handleError);
        const address = httpServer.address();

        if (!address || typeof address === "string") {
          rejectPromise(
            new Error("The loopback listener returned no TCP address."),
          );
          return;
        }

        resolvePromise(address);
      }

      httpServer.once("error", handleError);
      httpServer.once("listening", handleListening);
      httpServer.listen(port, LOCAL_ONTOLOGY_MCP_BIND_ADDRESS);
    });
  }

  function shutdown() {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    draining = true;
    shutdownPromise = (async () => {
      const startedAtMonotonicMilliseconds = readMonotonicMilliseconds();
      const deadlineController = new AbortController();
      const serverClosure = closeHttpServer(httpServer);

      // `close()` must run before either of the newer connection helpers.
      httpServer.closeIdleConnections();
      const deadline = Promise.resolve(
        waitForShutdownDeadline(gracefulShutdownDeadlineMilliseconds, {
          signal: deadlineController.signal,
        }),
      ).then(() => "deadline");
      const firstOutcome = await Promise.race([
        serverClosure.then(() => "drained"),
        deadline,
      ]);
      const forced = firstOutcome === "deadline";

      if (forced) {
        const cancellationReason = new DOMException(
          "Local ontology MCP shutdown deadline exceeded.",
          "AbortError",
        );

        for (const controller of activeQueryControllers) {
          controller.abort(cancellationReason);
        }

        // Only after active query signals are aborted may sockets be forced
        // closed. This cannot run on the graceful branch.
        httpServer.closeAllConnections();
      } else {
        deadlineController.abort();
      }

      await serverClosure;
      await closeOntologyQuery();
      await mcpHandler.close();
      logEvent({
        severity: forced ? "error" : "info",
        eventName: "mcp_server_shutdown",
        startedAtMonotonicMilliseconds,
        outcome: forced ? "forced" : "graceful",
        safeErrorCode: forced ? "SHUTDOWN_DEADLINE_EXCEEDED" : null,
      });
      return { forced };
    })();

    return shutdownPromise;
  }

  return Object.freeze({
    httpServer,
    listen,
    shutdown,
    isDraining: () => draining,
  });
}

/** Read and validate the three supported local-runner environment values. */
export function readLocalOntologyMcpServerConfiguration({
  environment = process.env,
  projectRoot = repositoryRoot,
} = {}) {
  const port = environment.UNIVERSAL_ONTOLOGY_MCP_PORT
    ? parsePositiveSafeInteger(
        environment.UNIVERSAL_ONTOLOGY_MCP_PORT,
        "UNIVERSAL_ONTOLOGY_MCP_PORT",
      )
    : LOCAL_ONTOLOGY_MCP_DEFAULT_PORT;

  if (port > 65_535) {
    throw new RangeError("UNIVERSAL_ONTOLOGY_MCP_PORT must not exceed 65535.");
  }

  const maximumInMemoryQueryIndexCacheByteSize =
    environment.UNIVERSAL_ONTOLOGY_QUERY_CACHE_MAXIMUM_BYTES
      ? parsePositiveSafeInteger(
          environment.UNIVERSAL_ONTOLOGY_QUERY_CACHE_MAXIMUM_BYTES,
          "UNIVERSAL_ONTOLOGY_QUERY_CACHE_MAXIMUM_BYTES",
        )
      : DEFAULT_QUERY_CACHE_MAXIMUM_BYTES;
  const queryRoot = environment.UNIVERSAL_ONTOLOGY_QUERY_ROOT
    ? resolve(environment.UNIVERSAL_ONTOLOGY_QUERY_ROOT)
    : resolve(projectRoot, "dist", "query", "v1");

  return Object.freeze({
    port,
    maximumInMemoryQueryIndexCacheByteSize,
    queryRoot,
  });
}

function parseRunnerArguments(arguments_) {
  const supportedArguments = new Set(["--refresh-index"]);

  for (const argument of arguments_) {
    if (!supportedArguments.has(argument)) {
      throw new TypeError(`Unknown local MCP runner argument: ${argument}`);
    }
  }

  return { refreshIndex: arguments_.includes("--refresh-index") };
}

/**
 * Register idempotent process-signal adapters around the server lifecycle.
 *
 * The returned `beginShutdown` seam lets integration tests exercise exactly
 * the same promise ownership without mutating global process state. Repeated
 * signals and direct calls all observe one shutdown promise.
 */
export function installLocalOntologyMcpShutdownSignalHandlers({
  localServer,
  signalEmitter = process,
  setProcessExitCode = (exitCode) => {
    process.exitCode = exitCode;
  },
  reportShutdownFailure = () => {},
}) {
  if (!localServer || typeof localServer.shutdown !== "function") {
    throw new TypeError("localServer must provide shutdown().");
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

  if (typeof reportShutdownFailure !== "function") {
    throw new TypeError("reportShutdownFailure must be a function.");
  }

  let signalShutdownPromise;
  let removed = false;

  function setFailureExitCode() {
    try {
      setProcessExitCode(1);
    } catch {
      // Process-exit bookkeeping must never interrupt server cleanup.
    }
  }

  function beginShutdown() {
    if (signalShutdownPromise) {
      return signalShutdownPromise;
    }

    try {
      signalShutdownPromise = Promise.resolve(localServer.shutdown()).then(
        (result) => {
          if (result.forced) {
            setFailureExitCode();
          }

          return result;
        },
        (error) => {
          setFailureExitCode();

          try {
            reportShutdownFailure(error);
          } catch {
            // Observability cannot replace the original cleanup failure.
          }

          throw error;
        },
      );
    } catch (error) {
      setFailureExitCode();

      try {
        reportShutdownFailure(error);
      } catch {
        // Observability cannot replace the original cleanup failure.
      }

      signalShutdownPromise = Promise.reject(error);
    }

    return signalShutdownPromise;
  }

  function handleTerminationSignal() {
    // Attach a rejection observer because EventEmitter ignores returned
    // promises. Callers of `beginShutdown` still receive the original promise.
    void beginShutdown().catch(() => {});
  }

  function remove() {
    if (removed) {
      return;
    }

    removed = true;
    signalEmitter.off("SIGINT", handleTerminationSignal);
    signalEmitter.off("SIGTERM", handleTerminationSignal);
  }

  signalEmitter.on("SIGINT", handleTerminationSignal);
  signalEmitter.on("SIGTERM", handleTerminationSignal);

  return Object.freeze({ beginShutdown, remove });
}

/** Build, validate, and start the development listener from local artifacts. */
export async function runLocalOntologyMcpServer({
  environment = process.env,
  arguments: arguments_ = process.argv.slice(2),
} = {}) {
  const { refreshIndex } = parseRunnerArguments(arguments_);
  const configuration = readLocalOntologyMcpServerConfiguration({
    environment,
  });

  if (refreshIndex) {
    await generateOntologyQueryIndexes({
      sourceDirectory: resolve(repositoryRoot, "src"),
      outputDirectory: configuration.queryRoot,
    });
  }

  const ontologyQueryArtifactRepository =
    createFileSystemOntologyQueryArtifactRepository({
      queryRoot: configuration.queryRoot,
    });
  const ontologyQuery = createOntologyQueryModule({
    ontologyQueryArtifactRepository,
    maximumInMemoryQueryIndexCacheByteSize:
      configuration.maximumInMemoryQueryIndexCacheByteSize,
  });

  // Readiness uses the public query seam: this validates the catalog, selects
  // the default release families, verifies their content digests, and builds
  // their runtime indexes before the TCP port can accept calls.
  await ontologyQuery.searchOntologyEntities({
    queryText: "__local_mcp_readiness_probe__",
    maximumResultCount: 1,
  });

  const localServer = createLocalUniversalOntologyMcpServer({
    ontologyQuery,
    catalogReady: true,
  });
  const address = await localServer.listen({ port: configuration.port });
  defaultWriteLogEvent({
    timestamp: new Date().toISOString(),
    severity: "info",
    eventName: "mcp_server_listening",
    correlationId: randomUUID(),
    durationMilliseconds: 0,
    outcome: "ready",
    safeErrorCode: null,
    address: address.address,
    port: address.port,
    mcpPath: LOCAL_ONTOLOGY_MCP_PATH,
  });

  installLocalOntologyMcpShutdownSignalHandlers({
    localServer,
    reportShutdownFailure(error) {
      writeProcessLifecycleFailureEvent(
        "mcp_server_shutdown_failed",
        "SERVER_SHUTDOWN_FAILED",
      );
      void error;
    },
  });
  return localServer;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runLocalOntologyMcpServer().catch((error) => {
    writeProcessLifecycleFailureEvent(
      "mcp_server_startup_failed",
      "SERVER_STARTUP_FAILED",
    );
    process.exitCode = 1;
    void error;
  });
}
