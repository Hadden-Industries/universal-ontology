import { loadOntologyDocument } from "./loadOntologyDocument.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

/** Own immutable views for this process. The caller admits and captures each
 * source before handing it to this workspace. A rejected load publishes nothing.
 */
export function createOntologyDocumentWorkspace() {
  const views = new Map();
  const descriptions = new Map();
  let current;
  let closed = false;
  let pending = 0;

  function getView(input) {
    const id =
      input.ontologyId ??
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
        const description = Object.freeze({
          ontologyId: current,
          snapshotId: view.snapshotId,
          snapshotRef: view.snapshotRef,
          parsingMode: view.parsingMode,
          classCount: view.classCount,
          interpretation: view.interpretation,
          title: view.title.slice(0, 160),
          versionIri:
            view.versionIri && view.versionIri.length <= 512
              ? view.versionIri
              : null,
          format: view.format,
        });
        descriptions.set(current, description);
        return description;
      } finally {
        pending -= 1;
      }
    },
    getResource(handle) {
      return getView(handle).getResource(handle);
    },
    getOntologyEntityContext(input) {
      return getView(input).getContext(input);
    },
    list() {
      return [...descriptions.values()];
    },
    closeView(ontologyId) {
      const view = getView({ ontologyId });
      views.delete(ontologyId);
      descriptions.delete(ontologyId);
      view.close();
      if (current === ontologyId) current = [...views.keys()].at(-1);
    },
    resolve({ name, ontologyId, preferredLanguageTags = ["en"] }) {
      const view = getView({ ontologyId });
      return view.lexical.resolve(name).map((iri) => ({
        label: view.lexical.label(iri, preferredLanguageTags),
        entityHandle: { ontologyId: view.selectionSha256, iri },
      }));
    },
    search({
      queryText,
      ontologyId,
      preferredLanguageTags = ["en"],
      maximumResultCount = 10,
    }) {
      const view = getView({ ontologyId });
      const ranked = view.lexical.search(queryText, preferredLanguageTags);
      return {
        matches: ranked
          .slice(0, maximumResultCount)
          .map(({ candidate, matchBasis }) => ({
            label: view.lexical.label(
              candidate.entityIri,
              preferredLanguageTags,
            ),
            source: descriptions.get(view.selectionSha256).title,
            matchBasis,
            entityHandle: {
              ontologyId: view.selectionSha256,
              iri: candidate.entityIri,
            },
          })),
        total: ranked.length,
      };
    },
    connections(input) {
      return getView(input).findConnections(input);
    },
    close() {
      closed = true;
      for (const view of views.values()) view.close();
      views.clear();
      descriptions.clear();
    },
  };
}
