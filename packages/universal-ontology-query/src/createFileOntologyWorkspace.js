import { platform } from "node:process";
import { freezeJsonValueDeeply } from "./jsonValueImmutability.js";
import { randomBytes } from "node:crypto";
import { createWaiterAwareSharedOperation } from "./createWaiterAwareSharedOperation.js";
import { createOntologyWorkspaceSearch } from "./createOntologyWorkspaceSearch.js";
import { isAbsolute, relative, resolve, parse, sep } from "node:path";
import { Worker } from "node:worker_threads";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
const denied = () => new OntologyQueryError("ONTOLOGY_SOURCE_DENIED");
const inside = (base, path) => {
  const rel = relative(base, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
function startViewWorker(onStop) {
  const worker = new Worker(
    new URL("./ontologyStoreWorker.cjs", import.meta.url),
    {
      workerData: { documentView: true },
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 192 },
    },
  );
  const pending = new Map();
  let id = 0,
    stopped;
  function stop() {
    if (!stopped) {
      stopped = worker.terminate();
      worker.unref();
      onStop(stopped);
      for (const call of pending.values())
        call.reject(new OntologyQueryError("QUERY_CANCELLED"));
      pending.clear();
    }
    return stopped;
  }
  worker.on("error", () => {
    void stop();
  });
  worker.on("exit", () => {
    void stop();
  });
  worker.on("message", (msg) => {
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error)
      call.reject(
        new OntologyQueryError(msg.error.code, { message: msg.error.message }),
      );
    else call.resolve(msg.value);
  });
  return {
    stop,
    get busy() {
      return pending.size > 0;
    },
    async run(method, input, signal) {
      if (stopped || signal?.aborted)
        throw new OntologyQueryError("QUERY_CANCELLED");
      if (pending.size >= 8) throw new OntologyQueryError("QUERY_QUEUE_FULL");
      const request = ++id;
      const deadline = AbortSignal.timeout(15000);
      const guard = signal ? AbortSignal.any([signal, deadline]) : deadline;
      let cancel;
      try {
        return await new Promise((resolve, reject) => {
          pending.set(request, { resolve, reject });
          cancel = () => {
            pending.delete(request);
            void stop();
            reject(
              new OntologyQueryError(
                deadline.aborted
                  ? "QUERY_DEADLINE_EXCEEDED"
                  : "QUERY_CANCELLED",
              ),
            );
          };
          guard.addEventListener("abort", cancel, { once: true });
          worker.postMessage({ id: request, method, input });
        });
      } finally {
        guard.removeEventListener("abort", cancel);
        pending.delete(request);
      }
    },
  };
}

/** File and worker authority for one local operator. A failed open owns only
 * its candidate worker; previously accepted workers continue serving queries.
 */
export async function createFileOntologyWorkspace({
  file,
  root,
  parsingMode = "compatible",
  bindings = [],
  requireComplete = false,
  format: initialFormat,
  signal,
}) {
  const selected = file && resolve(file),
    base = root && resolve(root);
  const views = new Map();
  const terminating = new Set();
  const scheduled = new Map();
  const share = createWaiterAwareSharedOperation({
    createWaiterCancellationError: () =>
      new OntologyQueryError("QUERY_CANCELLED"),
  });
  let current,
    loading = false,
    closed = false,
    candidate;
  const pager = createOntologyWorkspaceSearch(get, () => current);
  function get(id = current) {
    const v = views.get(id);
    if (!v)
      throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
        message: "View expired or unknown. Reopen the ontology.",
      });
    return v;
  }
  async function loadDocument(
    { path, parsingMode: mode, format },
    options = {},
  ) {
    if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
    const actual = resolve(path);
    if (
      (actual !== selected && !(base && inside(base, actual))) ||
      (platform === "win32" &&
        (/^[\\\\][\\\\][?.]/u.test(actual) ||
          actual.slice(parse(actual).root.length).includes(":")))
    )
      throw denied();
    if (loading || terminating.size || views.size >= 8)
      throw new OntologyQueryError(
        loading || terminating.size
          ? "QUERY_QUEUE_FULL"
          : "DATASET_LIMIT_EXCEEDED",
      );
    loading = true;
    try {
      const started = startViewWorker((termination) => {
        terminating.add(termination);
        void termination.finally(() => terminating.delete(termination));
        for (const [id, v] of views) {
          if (v.worker === started) {
            views.delete(id);
            if (current === id) current = [...views.keys()].at(-1);
          }
        }
      });
      candidate = started;
      const info = await candidate.run(
        "open",
        {
          path: actual,
          remainingSourceBytes:
            64 * 1024 * 1024 -
            [...views.values()].reduce(
              (sum, v) => sum + v.info.capturedBytes,
              0,
            ),
          viewId: randomBytes(32).toString("hex"),
          root: actual === selected ? undefined : base,
          parsingMode: mode ?? parsingMode,
          bindings,
          requireComplete,
          format: format ?? (actual === selected ? initialFormat : undefined),
        },
        options.signal,
      );
      if (closed || options.signal?.aborted)
        throw new OntologyQueryError("QUERY_CANCELLED");
      freezeJsonValueDeeply(info);
      const existing = [...views.values()].find(
        (v) =>
          v.info.snapshotRef.selectionSha256 ===
          info.snapshotRef.selectionSha256,
      );
      if (existing) {
        await candidate.stop();
        candidate = undefined;
        if (closed || options.signal?.aborted)
          throw new OntologyQueryError("QUERY_CANCELLED");
        if (!views.has(existing.info.ontologyId))
          throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE");
        current = existing.info.ontologyId;
        views.delete(current);
        views.set(current, existing);
        return existing.info;
      }
      views.set(info.ontologyId, { info, worker: candidate, path: actual });
      candidate = undefined;
      current = info.ontologyId;
      return info;
    } finally {
      if (candidate) void candidate.stop();
      candidate = undefined;
      loading = false;
    }
  }
  function openDocument(input, options = {}) {
    const prior = [...views.values()]
      .reverse()
      .find((v) => v.path === resolve(input.path));
    const request = {
      ...input,
      parsingMode: input.parsingMode ?? prior?.info.parsingMode ?? parsingMode,
      format: input.format ?? prior?.info.format,
    };
    // Only join a capture that has not started. Once the worker can see
    // filesystem bytes a later refresh must perform its own observation.
    // json-identity-contract: ordered-tuple; owner: Document workspace; reason: Path, mode and optional syntax select a pending capture.
    const key = JSON.stringify([
      resolve(input.path),
      request.parsingMode,
      request.format ?? null,
    ]);
    const cohort = scheduled.get(key) ?? {};
    scheduled.set(key, cohort);
    queueMicrotask(() => {
      if (scheduled.get(key) === cohort) scheduled.delete(key);
    });
    return share({
      operationKey: cohort,
      signal: options.signal,
      executeOperation: async ({ signal }) => {
        await Promise.resolve();
        if (signal.aborted) throw new OntologyQueryError("QUERY_CANCELLED");
        return loadDocument(request, { signal });
      },
    });
  }
  const workspace = {
    openDocument,
    list: () => ({
      ontologies: [...views.values()].map(
        ({
          info: {
            ontologyId,
            title,
            parsingMode,
            format,
            classCount,
            versionIri,
            interpretation,
          },
        }) => ({
          ontologyId,
          title,
          parsingMode,
          format,
          classCount,
          versionIri,
          interpretation,
        }),
      ),
    }),
    async closeView({ ontologyId }) {
      const v = get(ontologyId);
      if (v.worker.busy)
        throw new OntologyQueryError("QUERY_QUEUE_FULL", {
          message:
            "This ontology is serving an active request. Retry closing it after the request finishes.",
        });
      views.delete(ontologyId);
      if (current === ontologyId) current = [...views.keys()].at(-1);
      await v.worker.stop();
      return { closed: true };
    },
    async request(method, input, signal) {
      if (method === "search") return pager.search(input, signal);
      const v = get(
        input.entityHandle?.ontologyId ??
          input.resourceHandle?.ontologyId ??
          input.ontologyId,
      );
      return v.worker.run(method, input, signal);
    },
    async close() {
      closed = true;
      pager.close();
      await Promise.all(
        [...views.values()]
          .map((v) => v.worker.stop())
          .concat(candidate ? [candidate.stop()] : [], [...terminating]),
      );
      views.clear();
    },
  };
  if (selected) {
    // A failed first open publishes no views. Its candidate already owns
    // termination. Return the diagnostic even if a native read is stalled.
    await openDocument({ path: selected }, { signal });
  }
  return workspace;
}
