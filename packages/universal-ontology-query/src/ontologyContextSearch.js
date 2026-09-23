import { queryOntologyContext } from "./ontologyContextQueries.js";
import { Buffer } from "node:buffer";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

/** Filter ranked lexical candidates by exact assertion evidence in this store. */
export function searchOntologyContext(
  store,
  { input, matches, ownedNamespaces, position = null },
) {
  const selected = [];
  let assertionCount = 0;
  const budget = { candidates: 0 };
  let next = null;
  const reasons = [];
  const firstIndex = position
    ? matches.findIndex(
        (match) => match.ontologyEntity.entityIri === position.entityIri,
      )
    : 0;
  if (firstIndex < 0)
    throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
  const continuation = (index, definitionAssertionRef = null) => ({
    entityIri: matches[index].ontologyEntity.entityIri,
    definitionAssertionRef,
  });
  for (let index = firstIndex; index < matches.length; index += 1) {
    const candidate = matches[index];
    if (
      input.ownership === "root_module" &&
      !ownedNamespaces.some((namespace) =>
        candidate.ontologyEntity.entityIri.startsWith(namespace),
      )
    )
      continue;
    const context = queryOntologyContext(store, {
      entityIri: candidate.ontologyEntity.entityIri,
      depth: 0,
      maximumNodes: 1,
      budget,
      projectionPolicies: input.projectionPolicies,
    });
    if (context.completeness.truncationReasons.length) {
      if (!selected.length)
        throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
      next = continuation(index);
      reasons.push("candidate_limit");
      break;
    }
    const definitions = (context.nodes[0]?.definitions ?? [])
      .filter(
        (definition) =>
          !input.definitionSourceStatus ||
          definition.sourceStatus === input.definitionSourceStatus,
      )
      .sort((left, right) =>
        left.definitionAssertionRef < right.definitionAssertionRef
          ? -1
          : left.definitionAssertionRef > right.definitionAssertionRef
            ? 1
            : 0,
      );
    if (input.definitionSourceStatus && definitions.length === 0) continue;
    const start =
      index === firstIndex && position?.definitionAssertionRef
        ? definitions.findIndex(
            (definition) =>
              definition.definitionAssertionRef ===
              position.definitionAssertionRef,
          )
        : 0;
    if (start < 0) throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
    const group = {
      ...candidate,
      matchingDefinitions: [],
      repeatedEntityGroup: start > 0,
    };
    // Reserve half the complete result budget for text and protocol metadata.
    // MCP performs the exact final combined-byte check before returning it.
    if (
      Buffer.byteLength(JSON.stringify([...selected, group])) >
      input.maximumResultBytes / 2
    ) {
      if (!selected.length)
        throw new OntologyQueryError("RESULT_SIZE_EXCEEDED");
      next = continuation(
        index,
        definitions[start]?.definitionAssertionRef ?? null,
      );
      reasons.push("byte_limit");
      break;
    }
    selected.push(group);
    for (
      let definitionIndex = start;
      definitionIndex < definitions.length;
      definitionIndex += 1
    ) {
      group.matchingDefinitions.push(definitions[definitionIndex]);
      if (
        Buffer.byteLength(JSON.stringify(selected)) >
        input.maximumResultBytes / 2
      ) {
        group.matchingDefinitions.pop();
        if (!group.matchingDefinitions.length) selected.pop();
        if (!selected.length)
          throw new OntologyQueryError("RESULT_SIZE_EXCEEDED");
        next = continuation(
          index,
          definitions[definitionIndex].definitionAssertionRef,
        );
        reasons.push("byte_limit");
        break;
      }
      assertionCount += 1;
    }
    if (next) break;
    if (
      selected.length >= input.maximumResultCount &&
      index + 1 < matches.length
    ) {
      next = continuation(index + 1);
      reasons.push("page_limit");
      break;
    }
  }
  return {
    matches: selected,
    returnedEntityCount: selected.length,
    returnedDefinitionAssertionCount: assertionCount,
    position: next,
    truncationReasons: reasons,
  };
}
