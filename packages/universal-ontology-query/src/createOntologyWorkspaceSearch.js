import { randomBytes } from "node:crypto";
import { ONTOLOGY_ENTITY_MATCH_BASIS_VALUES } from "./ontologyQuerySchemas.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

const relevance = new Map(
  ONTOLOGY_ENTITY_MATCH_BASIS_VALUES.map((basis, index) => [basis, index]),
);
const token = () => randomBytes(24).toString("hex");
const expired = () =>
  new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
    message: "This search page expired. Repeat the original search.",
  });

/** Retain bounded continuation state. Each source contributes at most one
 * page per merge. Cursor replay uses the same view IDs and consumed counts.
 */
export function createOntologyWorkspaceSearch(getView, defaultId) {
  const pages = new Map();
  const save = (state) => {
    while (pages.size >= 64) pages.delete(pages.keys().next().value);
    const key = token();
    pages.set(key, state);
    return key;
  };
  return {
    async search(input, signal) {
      const pinned = input.cursor && pages.get(input.cursor);
      if (input.cursor && !pinned) throw expired();
      if (
        input.cursor &&
        (input.queryText !== undefined ||
          input.ontologyIds ||
          input.ontologyId ||
          input.preferredLanguageTags)
      )
        throw expired();
      const ids = Array.from(
        pinned?.ids ?? input.ontologyIds ?? [input.ontologyId ?? defaultId()],
      );
      if (
        (input.ontologyIds && input.ontologyId) ||
        ids.length > 8 ||
        !ids.length ||
        new Set(ids).size !== ids.length ||
        (!pinned && !input.queryText)
      )
        throw expired();
      const queryText = pinned?.queryText ?? input.queryText;
      const languages = Array.from(
        pinned?.languages ?? input.preferredLanguageTags ?? ["en"],
      );
      const offsets = pinned?.offsets ?? ids.map(() => 0);
      const limit = input.maximumResultCount ?? 10;
      // Check every view before issuing any worker request. Limit simultaneous
      // aggregate handoff to eight individually bounded replies.
      const views = ids.map((id) => getView(id));
      const results = await Promise.all(
        views.map((view, i) =>
          view.worker.run(
            "searchPage",
            {
              ontologyId: ids[i],
              queryText,
              preferredLanguageTags: languages,
              offset: offsets[i],
              maximumResultCount: limit,
              maximumResultBytes: 131072,
            },
            signal,
          ),
        ),
      );
      const candidates = results.flatMap((r, i) =>
        r.matches.map((hit) => ({ hit, i })),
      );
      // Equal relevance and match length follow caller source order, then the source lexical ordering.
      candidates.sort(
        (a, b) =>
          relevance.get(a.hit.matchBasis) - relevance.get(b.hit.matchBasis) ||
          a.hit.rank.languageRank - b.hit.rank.languageRank ||
          a.hit.rank.length - b.hit.rank.length ||
          a.i - b.i,
      );
      const nextOffsets = [...offsets];
      const matches = candidates.slice(0, limit).map(({ hit, i }) => {
        nextOffsets[i]++;
        const publicHit = { ...hit };
        delete publicHit.rank;
        return publicHit;
      });
      const total = results.reduce((v, r) => v + r.total, 0);
      const nextCursor =
        nextOffsets.reduce((a, b) => a + b, 0) < total
          ? save({
              ids: [...ids],
              queryText,
              languages: [...languages],
              offsets: nextOffsets,
            })
          : null;
      return { matches, total, nextCursor };
    },
    close() {
      pages.clear();
    },
  };
}
