import { tryCreateDisplayedOntologyReleaseContext } from "./tryCreateDisplayedOntologyReleaseContext.js";
import {
  ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE,
  ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
  OntologyEntityDefinitionInvalidInputResultSchema,
} from "./ontologyEntityDefinitionResultSchemas.js";

export const GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_NAME =
  "get_ontology_entity_definition";

const GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_TITLE =
  "Get ontology entity definition";
const GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_DESCRIPTION =
  "Resolve one exact entity in the ontology document open in this tab and " +
  "return its selected authored definition, if present, with immutable " +
  "release provenance. Accepts an entity IRI, UUID URN, bare UUID, or " +
  "preferred label.";
const ENTITY_REFERENCE_DESCRIPTION =
  "Exact entity IRI, UUID URN, bare UUID, or preferred label in the " +
  "displayed ontology release.";

const INVALID_TOOL_INPUT_RESULT = Object.freeze(
  OntologyEntityDefinitionInvalidInputResultSchema.parse({
    resultSchemaVersion: ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION,
    status: "invalid_input",
    errorCode: "invalid_tool_input",
    message: ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE,
  }),
);

function defaultResolverModuleLoader() {
  return import("./createOntologyEntityDefinitionResolver.js");
}

function tryParseEntityReference(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  // Reflect over every enumerable own key, including symbols. Object.keys()
  // alone would incorrectly accept an additional enumerable symbol property.
  const enumerableOwnKeys = Reflect.ownKeys(input).filter((propertyKey) =>
    Object.prototype.propertyIsEnumerable.call(input, propertyKey),
  );

  if (
    enumerableOwnKeys.length !== 1 ||
    enumerableOwnKeys[0] !== "entityReference" ||
    typeof input.entityReference !== "string"
  ) {
    return null;
  }

  let codePointLength = 0;
  const codePointIterator = input.entityReference[Symbol.iterator]();

  while (!codePointIterator.next().done) {
    codePointLength += 1;

    if (codePointLength > 512) {
      return null;
    }
  }

  return codePointLength >= 1 ? input.entityReference : null;
}

function createLazyResolverAccessor({
  loadOntologyEntityDefinitionResolverModule,
  displayedOntologyReleaseContext,
  ontologyQueryRootIri,
  expectedOrigin,
  fetchImplementation,
  reportUnhandledError,
}) {
  let resolverPromise;

  return async function getResolver() {
    if (resolverPromise) {
      return resolverPromise;
    }

    const currentResolverPromise = (async () => {
      const resolverModule = await loadOntologyEntityDefinitionResolverModule();

      if (
        typeof resolverModule?.createBrowserOntologyEntityDefinitionResolver !==
        "function"
      ) {
        throw new TypeError(
          "The ontology entity-definition resolver module is invalid.",
        );
      }

      const resolver =
        resolverModule.createBrowserOntologyEntityDefinitionResolver({
          displayedOntologyReleaseContext,
          ontologyQueryRootIri,
          expectedOrigin,
          fetchImplementation,
          reportUnhandledError,
        });

      if (typeof resolver?.resolveOntologyEntityDefinition !== "function") {
        throw new TypeError(
          "The ontology entity-definition resolver is invalid.",
        );
      }

      return resolver;
    })();
    resolverPromise = currentResolverPromise;

    try {
      return await currentResolverPromise;
    } catch (error) {
      // Cache successful construction only. Transient chunk-load failures can
      // therefore be retried by a later tool execution.
      if (resolverPromise === currentResolverPromise) {
        resolverPromise = undefined;
      }
      throw error;
    }
  };
}

/**
 * Register the one read-only tool supported by an eligible ontology page.
 * Feature absence and unindexed document variants are normal no-op outcomes.
 *
 * @returns {Promise<boolean>} Whether a tool was registered.
 */
export async function registerDisplayedOntologyEntityDefinitionTool({
  modelContext,
  ontologyDocumentMetadata,
  ontologyDocumentIri,
  ontologyPageRootIri,
  ontologyQueryRootIri,
  registrationSignal,
  fetchImplementation,
  reportUnhandledError,
  loadOntologyEntityDefinitionResolverModule = defaultResolverModuleLoader,
}) {
  if (
    typeof modelContext?.registerTool !== "function" ||
    registrationSignal?.aborted
  ) {
    return false;
  }

  const displayedOntologyReleaseContext =
    tryCreateDisplayedOntologyReleaseContext({
      ontologyDocumentMetadata,
      ontologyDocumentIri,
      ontologyPageRootIri,
    });

  if (displayedOntologyReleaseContext === null) {
    return false;
  }

  const getResolver = createLazyResolverAccessor({
    loadOntologyEntityDefinitionResolverModule,
    displayedOntologyReleaseContext,
    ontologyQueryRootIri,
    expectedOrigin: new URL(displayedOntologyReleaseContext.ontologyDocumentIri)
      .origin,
    fetchImplementation,
    reportUnhandledError,
  });

  const tool = {
    name: GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_NAME,
    title: GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_TITLE,
    description: GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_DESCRIPTION,
    inputSchema: {
      type: "object",
      properties: {
        entityReference: {
          type: "string",
          minLength: 1,
          maxLength: 512,
          description: ENTITY_REFERENCE_DESCRIPTION,
        },
      },
      required: ["entityReference"],
      additionalProperties: false,
    },
    async execute(input, executionOptions = {}) {
      const signal = executionOptions?.signal;
      signal?.throwIfAborted();

      let entityReference;

      try {
        entityReference = tryParseEntityReference(input);
      } catch {
        // Proxies and hostile getters can throw during reflection. Treat those
        // values exactly like any other invalid transport object.
        return INVALID_TOOL_INPUT_RESULT;
      }

      if (entityReference === null) {
        return INVALID_TOOL_INPUT_RESULT;
      }

      const resolver = await getResolver();
      signal?.throwIfAborted();
      const result = await resolver.resolveOntologyEntityDefinition(
        entityReference,
        { signal },
      );
      signal?.throwIfAborted();
      return result;
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  };

  await modelContext.registerTool(tool, { signal: registrationSignal });
  return true;
}
