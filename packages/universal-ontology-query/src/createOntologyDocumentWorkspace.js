import { loadOntologyDocument } from "./loadOntologyDocument.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

/** Own immutable views for this process. The caller admits and captures each
 * source before handing it to this workspace. A rejected load publishes nothing.
 */
export function createOntologyDocumentWorkspace() {
  const views = new Map();
  let current;
  let closed = false;
  let pending = 0;

  function getView(input) {
    const id =
      input.snapshotRef?.selectionSha256 ??
      (input.rootSnapshotId
        ? [...views].find(
            ([, view]) =>
              view.snapshotId === input.rootSnapshotId &&
              view.graphSelection === "source_graph",
          )?.[0]
        : current);
    const view = views.get(id);
    if (!view)
      throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
        message: "This ontology view is unavailable. Open the source again.",
      });
    return view;
  }

  return {
    async open(capture) {
      if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
      if (pending || views.size >= 8)
        throw new OntologyQueryError(
          pending ? "QUERY_QUEUE_FULL" : "DATASET_LIMIT_EXCEEDED",
        );
      pending += 1;
      try {
        const view = await loadOntologyDocument(capture);
        if (closed || capture.signal?.aborted) {
          view.close();
          throw new OntologyQueryError("QUERY_CANCELLED");
        }
        current = view.selectionSha256;
        if (views.has(current)) view.close();
        else views.set(current, view);
        return {
          ontologyId: current,
          snapshotId: view.snapshotId,
          snapshotRef: view.snapshotRef,
          parsingMode: view.parsingMode,
          classCount: view.classCount,
        };
      } finally {
        pending -= 1;
      }
    },
    getOntologyEntityContext(input) {
      return getView(input).getContext(input);
    },
    close() {
      closed = true;
      for (const view of views.values()) view.close();
      views.clear();
    },
  };
}
