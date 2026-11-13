import oxigraph from "oxigraph";
import {
  normalizeLexicalSearchValue as normalize,
  tokenizeNormalizedValue,
  evaluateSearchCandidate,
  compareEvaluatedCandidates,
  languageSelection,
  extractIriLocalName,
} from "./ontologyLexicalMatching.js";
import {
  SKOS_NAMESPACE_IRI as SKOS,
  RDFS_NAMESPACE_IRI as RDFS,
  DCTERMS_NAMESPACE_IRI as DCT,
} from "./ontologyRdfVocabulary.js";

/** Index authored lexical values and exact identifiers once per document view.
 * Candidate comparison and language selection are shared with release browsing.
 */
export function createOntologyDocumentLexicalIndex(
  store,
  signature,
  policies = {},
) {
  const exact = new Map(),
    entries = new Map(),
    candidates = [];
  const properties = new Map([
    [SKOS + "prefLabel", "preferred_label"],
    [RDFS + "label", "preferred_label"],
    [SKOS + "altLabel", "alternative_label"],
    [SKOS + "hiddenLabel", "alternative_label"],
    [SKOS + "definition", "lexical_definition"],
    [DCT + "identifier", "identifier_literal"],
  ]);
  const remembered = new Set();
  function add(iri, kind, value, predicate, lang = "") {
    const identity = JSON.stringify([iri, kind, value, predicate, lang]);
    if (remembered.has(identity)) return;
    remembered.add(identity);
    const entry = entries.get(iri);
    const normalizedValue = normalize(value);
    if (!normalizedValue) return;
    const c = {
      entityIri: iri,
      candidateKind: kind,
      normalizedValue,
      assertionPropertyIri: predicate,
      language: lang,
      value,
      ...(kind === "lexical_definition"
        ? {
            normalizedTokenSet: new Set(
              tokenizeNormalizedValue(normalizedValue),
            ),
          }
        : {}),
    };
    candidates.push(c);
    if (kind === "preferred_label" || kind === "alternative_label")
      entry.labels.push(c);
    if (
      kind !== "lexical_definition" &&
      kind !== "identifier_iri" &&
      !(kind === "iri_local_name" && value === iri)
    ) {
      const ids = exact.get(normalizedValue) ?? new Set();
      ids.add(iri);
      exact.set(normalizedValue, ids);
    }
  }
  for (const entity of signature) {
    const iri = entity.iri.value;
    if (entries.has(iri)) continue;
    entries.set(iri, { iri, labels: [] });
    add(iri, "identifier_iri", iri, null);
    add(iri, "iri_local_name", extractIriLocalName(iri), null);
  }
  const allProperties = new Set([
    ...properties.keys(),
    ...Object.values(policies).flatMap((p) => [
      ...p.definitionPredicates,
      ...p.labelPredicates,
    ]),
  ]);
  for (const property of allProperties) {
    for (const quad of store.match(
      null,
      oxigraph.namedNode(property),
      null,
      null,
    )) {
      if (
        quad.subject.termType !== "NamedNode" ||
        quad.object.termType !== "Literal" ||
        !entries.has(quad.subject.value)
      )
        continue;
      const policy = policies[quad.graph.value];
      const kind = policy?.definitionPredicates.includes(property)
        ? "lexical_definition"
        : policy?.labelPredicates.includes(property)
          ? "preferred_label"
          : properties.get(property);
      if (kind)
        add(
          quad.subject.value,
          kind,
          quad.object.value,
          property,
          quad.object.language,
        );
    }
  }
  function label(iri, languages) {
    const ranked =
      entries.get(iri)?.labels.map((c) => ({
        c,
        rank: languageSelection({ languageTag: c.language || null }, languages)
          .rank,
      })) ?? [];
    ranked.sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(a.c.candidateKind !== "preferred_label") -
          Number(b.c.candidateKind !== "preferred_label") ||
        (a.c.value < b.c.value ? -1 : a.c.value > b.c.value ? 1 : 0),
    );
    return ranked[0]?.c.value ?? extractIriLocalName(iri);
  }
  return {
    label,
    resolve(value) {
      if (entries.has(value)) return [value];
      return [...(exact.get(normalize(value)) ?? [])].sort();
    },
    search(text, languages) {
      const query = normalize(text);
      if (!query) return [];
      const tokens = tokenizeNormalizedValue(query),
        hits = new Map();
      for (const c of candidates) {
        const matchBasis = evaluateSearchCandidate(c, query, tokens);
        if (!matchBasis) continue;
        const hit = {
          candidate: c,
          matchBasis,
          languageRank: languageSelection(
            { languageTag: c.language || null },
            languages,
          ).rank,
        };
        if (
          !hits.has(c.entityIri) ||
          compareEvaluatedCandidates(hit, hits.get(c.entityIri)) < 0
        )
          hits.set(c.entityIri, hit);
      }
      return [...hits.values()].sort(compareEvaluatedCandidates);
    },
  };
}
