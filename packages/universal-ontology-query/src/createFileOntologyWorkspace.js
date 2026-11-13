import { isAbsolute, relative, resolve, parse, sep } from "node:path";
import { Worker } from "node:worker_threads";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
const denied = () => new OntologyQueryError("ONTOLOGY_SOURCE_DENIED");
const inside = (base, path) => {
  const rel = relative(base, path);
  return rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
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
  let current,
    loading = false,
    closed = false,
    candidate;
  function get(id = current) {
    const v = views.get(id);
    if (!v)
      throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
        message: "View expired or unknown. Reopen the ontology.",
      });
    return v;
  }
  async function openDocument(
    { path, parsingMode: mode, format },
    options = {},
  ) {
    if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
    const actual = resolve(path);
    if (
      (actual !== selected && !(base && inside(base, actual))) ||
      (process.platform === "win32" &&
        (/^[\\\\][\\\\][?.]/u.test(actual) ||
          actual.slice(parse(actual).root.length).includes(":")))
    )
      throw denied();
    if (loading || terminating.size >= 2 || views.size >= 8)
      throw new OntologyQueryError(
        loading || terminating.size >= 2
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
          root: actual === selected ? undefined : base,
          parsingMode: mode ?? parsingMode,
          bindings,
          requireComplete,
          format: format ?? (actual === selected ? initialFormat : undefined),
        },
        options.signal,
      );
      if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
      if (!views.has(info.ontologyId)) {
        views.set(info.ontologyId, { info, worker: candidate, path: actual });
        candidate = undefined;
      }
      current = info.ontologyId;
      return info;
    } finally {
      if (candidate) void candidate.stop();
      candidate = undefined;
      loading = false;
    }
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
      views.delete(ontologyId);
      if (current === ontologyId) current = [...views.keys()].at(-1);
      await v.worker.stop();
      return { closed: true };
    },
    async request(method, input, signal) {
      const v = get(
        input.entityHandle?.ontologyId ??
          input.resourceHandle?.ontologyId ??
          input.ontologyId,
      );
      return v.worker.run(method, input, signal);
    },
    async close() {
      closed = true;
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
