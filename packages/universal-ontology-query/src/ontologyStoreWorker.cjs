const { parentPort } = require("node:worker_threads");
const oxigraph = require("oxigraph");
const {
  queryOntologyContext,
  findOntologyConnections,
} = require("./ontologyContextQueries.js");
const { searchOntologyContext } = require("./ontologyContextSearch.js");
const { isOntologyQueryError } = require("./ontologyQueryErrors.js");

let store;
let loadedDatasetKey;

// WASM-backed RDF terms must not cross the worker boundary as live objects.
function lexicalTerm(term) {
  const result = { termType: term.termType, value: term.value };
  if (term.termType === "Literal") {
    result.language = term.language;
    result.datatype = term.datatype.value;
  }
  return result;
}

parentPort.on("message", ({ id, datasetKey, nquads, datasets, query }) => {
  try {
    if (datasetKey !== loadedDatasetKey) {
      const started = performance.now();
      store?.free();
      store = new oxigraph.Store();
      loadedDatasetKey = undefined;
      if (datasets) {
        let quadCount = 0;
        for (const dataset of datasets) {
          const graph = oxigraph.namedNode(dataset.snapshotId);
          const scope = (value) =>
            value.termType === "BlankNode"
              ? oxigraph.blankNode(
                  `s${dataset.snapshotId.slice(-64)}_${value.value}`,
                )
              : value;
          for (const quad of oxigraph.parse([dataset.nquads], {
            format: "application/n-quads",
          })) {
            if (++quadCount > 200000)
              throw new RangeError("Dataset quad admission limit exceeded.");
            store.add(
              oxigraph.quad(
                scope(quad.subject),
                quad.predicate,
                scope(quad.object),
                graph,
              ),
            );
          }
        }
      } else store.load(nquads, { format: "application/n-quads" });
      if (store.size > 200000) {
        store.free();
        store = undefined;
        parentPort.postMessage({ id, errorCode: "DATASET_LIMIT_EXCEEDED" });
        return;
      }
      loadedDatasetKey = datasetKey;
      parentPort.postMessage({
        id,
        event: "store_loaded",
        durationMs: performance.now() - started,
        rssBytes: process.memoryUsage().rss,
      });
    }
    parentPort.postMessage({ id, event: "query_started" });
    const started = performance.now();
    if (typeof query === "object") {
      const operations = {
        context: queryOntologyContext,
        search: searchOntologyContext,
        connections: findOntologyConnections,
      };
      if (!Object.hasOwn(operations, query.operation))
        throw new TypeError("Unknown private operation.");
      const result = operations[query.operation](store, query.input);
      parentPort.postMessage({
        id,
        event: "query_finished",
        durationMs: performance.now() - started,
        rssBytes: process.memoryUsage().rss,
      });
      parentPort.postMessage({ id, rows: result });
      return;
    }
    const bindings = store.query(query);
    if (!Array.isArray(bindings) || bindings.length > 10001) {
      parentPort.postMessage({ id, errorCode: "DATASET_LIMIT_EXCEEDED" });
      return;
    }
    const rows = bindings.map((binding) =>
      Object.fromEntries(
        [...binding].map(([name, term]) => [name, lexicalTerm(term)]),
      ),
    );
    parentPort.postMessage({
      id,
      event: "query_finished",
      durationMs: performance.now() - started,
      rssBytes: process.memoryUsage().rss,
    });
    parentPort.postMessage({ id, rows });
  } catch (error) {
    parentPort.postMessage({
      id,
      errorCode: isOntologyQueryError(error)
        ? error.errorCode
        : "INTERNAL_QUERY_FAILURE",
    });
  }
});
