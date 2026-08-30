import {
  createLocalUniversalOntologyMcpServer,
  installLocalOntologyMcpShutdownSignalHandlers,
} from "../../../scripts/runLocalOntologyMcpServer.js";

const RESOLVED_RELEASE = Object.freeze({
  ontologyArtifactFamilyId: "universal/core",
  versionTag: "20260830",
  sourceArtifactUrl:
    "https://haddenindustries.com/ontology/universal/core/20260830",
  sourceArtifactSha256: "a".repeat(64),
  ontologyIri: "https://haddenindustries.com/ontology/universal/core",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260830",
});

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function send(message) {
  if (process.connected && process.send) {
    process.send(message);
  }
}

const shutdownDeadline = createDeferred();
let releasePendingQuery;

const ontologyQuery = {
  searchOntologyEntities(input, { signal }) {
    send({ type: "query_entered" });

    return new Promise((resolvePromise, rejectPromise) => {
      let settled = false;

      function handleAbort() {
        if (settled) {
          return;
        }

        settled = true;
        send({ type: "query_cancelled" });
        rejectPromise(signal.reason);
      }

      releasePendingQuery = () => {
        if (settled) {
          return;
        }

        settled = true;
        signal.removeEventListener("abort", handleAbort);
        send({ type: "query_completed" });
        resolvePromise({
          outcome: "success",
          resultKind: "ontology_entity_search",
          queryText: input.queryText.trim(),
          preferredLanguageTags: input.preferredLanguageTags,
          resolvedOntologyReleases: [RESOLVED_RELEASE],
          totalMatchedEntityCount: 0,
          returnedEntityCount: 0,
          resultSetTruncated: false,
          matches: [],
        });
      };

      signal.addEventListener("abort", handleAbort, { once: true });
    });
  },

  async resolveOntologyEntity(input) {
    return {
      outcome: "success",
      resultKind: "ontology_entity_resolution",
      resolutionStatus: "not_found",
      requestedEntityIdentifier: input.entityIdentifier,
      preferredLanguageTags: input.preferredLanguageTags,
      resolvedOntologyReleases: [RESOLVED_RELEASE],
      ontologyEntities: [],
    };
  },
};

const localServer = createLocalUniversalOntologyMcpServer({
  ontologyQuery,
  catalogReady: true,
  writeLogEvent(event) {
    if (event.eventName === "mcp_server_shutdown") {
      send({ type: "shutdown_log_written", outcome: event.outcome });
    }
  },
  waitForShutdownDeadline() {
    send({ type: "shutdown_deadline_armed" });
    return shutdownDeadline.promise;
  },
  async closeOntologyQuery() {
    send({ type: "ontology_query_closed" });
  },
});

// Observe the exact ordering constraint without waiting for a new connection
// attempt: shutdown must call `close()` before any deadline or cancellation.
const originalClose = localServer.httpServer.close;
localServer.httpServer.close = function instrumentedClose(...arguments_) {
  send({ type: "listener_close_called" });
  return Reflect.apply(originalClose, this, arguments_);
};

const signalRegistration = installLocalOntologyMcpShutdownSignalHandlers({
  localServer,
});
const address = await localServer.listen({ port: 0 });
send({ type: "ready", port: address.port });

process.on("message", (message) => {
  if (message.type === "release_query") {
    releasePendingQuery?.();
    return;
  }

  if (message.type === "expire_shutdown_deadline") {
    send({ type: "shutdown_deadline_expired" });
    shutdownDeadline.resolve();
    return;
  }

  if (message.type === "emit_sigterm") {
    // Windows maps child.kill("SIGTERM") to abrupt TerminateProcess. Emitting
    // the process event inside this spawned process exercises the same
    // registered production handler while retaining cross-platform semantics.
    process.emit("SIGTERM");
    void signalRegistration.beginShutdown().then(
      ({ forced }) => {
        send({ type: "shutdown_result", forced });
        queueMicrotask(() => process.disconnect());
      },
      () => {
        process.exitCode = 1;
        send({ type: "shutdown_failed" });
        queueMicrotask(() => process.disconnect());
      },
    );
  }
});
