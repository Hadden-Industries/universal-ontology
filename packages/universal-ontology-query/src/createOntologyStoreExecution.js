import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { Worker } from "node:worker_threads";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

const MAXIMUM_DATASET_BYTES = 8 * 1024 * 1024;

/**
 * Own one warm store and a bounded FIFO. This private Node seam executes only
 * server-maintained queries; it is never exposed as an MCP query endpoint.
 * A deadline terminates the worker before a sibling may start. Worker heap
 * limits exclude WASM memory, so byte/term admission is also enforced.
 */
export function createOntologyStoreExecution({ onEvent = () => {} } = {}) {
  const queue = [];
  let worker;
  let active;
  let closing = false;
  let stopping;
  let nextId = 0;
  let admittedBytes = 0;

  function emit(event) {
    try {
      onEvent(event);
    } catch {
      /* Observers cannot change query outcomes. */
    }
  }

  function settle(request, error, result) {
    admittedBytes -= request.byteLength;
    clearTimeout(request.lifecycleTimer);
    clearTimeout(request.queryTimer);
    request.signal?.removeEventListener("abort", request.abort);
    if (error) request.reject(error);
    else request.resolve(result);
  }

  function stopWorker() {
    const previous = worker;
    worker = undefined;
    if (!previous) return Promise.resolve();
    stopping = previous.terminate().finally(() => {
      stopping = undefined;
      emit({ event: "worker_terminated" });
      pump();
    });
    return stopping;
  }

  function failActive(error) {
    const request = active;
    active = undefined;
    // Clear ownership before termination so late messages cannot resolve it.
    const stopped = stopWorker();
    if (request) stopped.then(() => settle(request, error));
  }

  function cancel(request, errorCode) {
    const error = new OntologyQueryError(errorCode);
    if (active === request) failActive(error);
    else {
      const index = queue.indexOf(request);
      if (index !== -1) {
        queue.splice(index, 1);
        settle(request, error);
      }
    }
  }

  function startWorker() {
    const created = new Worker(
      new URL("./ontologyStoreWorker.cjs", import.meta.url),
      {
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 128 },
      },
    );
    created.on("message", (message) => {
      if (worker !== created || !active || message.id !== active.id) return;
      if (message.event) {
        if (message.event === "query_started") {
          active.queryTimer = setTimeout(
            () => cancel(active, "QUERY_DEADLINE_EXCEEDED"),
            1000,
          );
        }
        emit({
          event: message.event,
          durationMs: message.durationMs,
          rssBytes: message.rssBytes,
        });
        return;
      }
      const request = active;
      active = undefined;
      settle(
        request,
        message.errorCode ? new OntologyQueryError(message.errorCode) : null,
        message.rows,
      );
      pump();
    });
    created.on("error", () => {
      if (worker === created)
        failActive(new OntologyQueryError("INTERNAL_QUERY_FAILURE"));
    });
    created.on("exit", () => {
      if (worker === created)
        failActive(new OntologyQueryError("INTERNAL_QUERY_FAILURE"));
    });
    return created;
  }

  function pump() {
    if (closing || stopping || active || queue.length === 0) return;
    active = queue.shift();
    worker ??= startWorker();
    worker.postMessage({
      id: active.id,
      datasetKey: active.datasetKey,
      nquads: active.nquads,
      query: active.query,
      datasets: active.datasets,
    });
  }

  return {
    /** Bounded SELECT against immutable, digest-identified N-Quads. */
    async query({ datasetKey, nquads, datasets, query, signal }) {
      if (closing || signal?.aborted)
        throw new OntologyQueryError("QUERY_CANCELLED");
      const sources = datasets ?? [{ nquads, sha256: datasetKey }];
      if (
        !Array.isArray(sources) ||
        sources.length < 1 ||
        sources.length > 16 ||
        sources.some(
          (source) =>
            typeof source.nquads !== "string" ||
            Buffer.byteLength(source.nquads) > MAXIMUM_DATASET_BYTES,
        )
      )
        throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
      const byteLength = sources.reduce(
        (sum, source) => sum + Buffer.byteLength(source.nquads),
        0,
      );
      if (admittedBytes + byteLength > 64 * 1024 * 1024)
        throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
      if (
        sources.some(
          (source) =>
            createHash("sha256").update(source.nquads).digest("hex") !==
            source.sha256,
        )
      )
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
      if (queue.length >= 8) throw new OntologyQueryError("QUERY_QUEUE_FULL");
      return new Promise((resolve, reject) => {
        const request = {
          id: ++nextId,
          datasetKey,
          nquads,
          datasets,
          query,
          signal,
          resolve,
          reject,
          byteLength,
        };
        admittedBytes += byteLength;
        request.abort = () => cancel(request, "QUERY_CANCELLED");
        request.lifecycleTimer = setTimeout(
          () => cancel(request, "QUERY_DEADLINE_EXCEEDED"),
          10000,
        );
        signal?.addEventListener("abort", request.abort, { once: true });
        queue.push(request);
        pump();
      });
    },
    /** Dispose active and queued requests when the owning server closes. */
    async close() {
      closing = true;
      for (const request of queue.splice(0))
        settle(request, new OntologyQueryError("QUERY_CANCELLED"));
      if (active) failActive(new OntologyQueryError("QUERY_CANCELLED"));
      await (stopping ?? stopWorker());
    },
  };
}
