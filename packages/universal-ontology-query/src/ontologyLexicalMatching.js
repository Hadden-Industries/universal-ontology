import { ONTOLOGY_ENTITY_MATCH_BASIS_VALUES } from "./ontologyQuerySchemas.js";
const FALLBACK_LANGUAGE_RANK = 100_000;
const MATCH_BASIS_ORDER = new Map(
  ONTOLOGY_ENTITY_MATCH_BASIS_VALUES.map((basis, index) => [basis, index]),
);
const compareBinary = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
export function normalizeLexicalSearchValue(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, " ")
    .trim();
}

export function tokenizeNormalizedValue(normalizedValue) {
  return normalizedValue === "" ? [] : normalizedValue.split(" ");
}

export function extractIriLocalName(iri) {
  const lastHash = iri.lastIndexOf("#");
  const lastSlash = iri.lastIndexOf("/");
  const lastSeparator = Math.max(lastHash, lastSlash);
  return lastSeparator === -1 ? iri : iri.slice(lastSeparator + 1);
}

export function languageSelection(literalValue, preferredLanguageTags) {
  const authoredLanguageTag = literalValue.languageTag?.toLowerCase() ?? null;

  for (
    let preferenceIndex = 0;
    preferenceIndex < preferredLanguageTags.length;
    preferenceIndex += 1
  ) {
    let lookupTag = preferredLanguageTags[preferenceIndex].toLowerCase();
    let lookupDepth = 0;

    while (lookupTag) {
      if (authoredLanguageTag === lookupTag) {
        return {
          rank: preferenceIndex * 100 + lookupDepth,
          selectionBasis:
            lookupDepth === 0
              ? "preferred_language_exact"
              : "preferred_language_lookup",
        };
      }

      const separatorIndex = lookupTag.lastIndexOf("-");
      lookupTag =
        separatorIndex === -1 ? "" : lookupTag.slice(0, separatorIndex);
      lookupDepth += 1;
    }
  }

  if (authoredLanguageTag === null) {
    return {
      rank: preferredLanguageTags.length * 100 + 1,
      selectionBasis: "untagged",
    };
  }

  return {
    rank: FALLBACK_LANGUAGE_RANK,
    selectionBasis: "deterministic_fallback",
  };
}

export function evaluateSearchCandidate(
  candidate,
  normalizedQuery,
  queryTokens,
) {
  const exact = candidate.normalizedValue === normalizedQuery;
  const prefix =
    normalizedQuery !== "" &&
    candidate.normalizedValue.startsWith(normalizedQuery);
  const substring =
    normalizedQuery !== "" &&
    candidate.normalizedValue.includes(normalizedQuery);

  switch (candidate.candidateKind) {
    case "preferred_label":
      return exact
        ? "preferred_label_exact"
        : prefix
          ? "preferred_label_prefix"
          : substring
            ? "preferred_label_substring"
            : null;
    case "alternative_label":
      return exact
        ? "alternative_label_exact"
        : prefix
          ? "alternative_label_prefix"
          : substring
            ? "alternative_label_substring"
            : null;
    case "identifier_literal":
    case "identifier_iri":
      return exact ? "identifier_exact" : null;
    case "iri_local_name":
      return exact ? "iri_local_name_exact" : null;
    case "lexical_definition": {
      if (exact) {
        return "lexical_definition_exact";
      }

      if (
        queryTokens.length > 0 &&
        queryTokens.every((token) => candidate.normalizedTokenSet.has(token))
      ) {
        return "lexical_definition_token_coverage";
      }

      return substring ? "lexical_definition_substring" : null;
    }
    default:
      throw new TypeError(
        `Unknown search candidate kind: ${candidate.candidateKind}`,
      );
  }
}

export function compareEvaluatedCandidates(left, right) {
  return (
    MATCH_BASIS_ORDER.get(left.matchBasis) -
      MATCH_BASIS_ORDER.get(right.matchBasis) ||
    left.languageRank - right.languageRank ||
    left.candidate.normalizedValue.length -
      right.candidate.normalizedValue.length ||
    compareBinary(
      left.candidate.normalizedValue,
      right.candidate.normalizedValue,
    ) ||
    compareBinary(left.candidate.entityIri, right.candidate.entityIri) ||
    compareBinary(
      left.candidate.assertionPropertyIri ?? "",
      right.candidate.assertionPropertyIri ?? "",
    )
  );
}
