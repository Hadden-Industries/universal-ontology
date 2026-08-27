import {
  resolveApplicableOntologyProjectionPropertyIris,
  resolveLegacySourceInterpretations,
  resolveOntologyProjectionProperties,
} from "./ontologyProjectionProperties.js";

const NS = {
  owl: "http://www.w3.org/2002/07/owl#",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  dcat: "http://www.w3.org/ns/dcat#",
};

const JSON_LD = {
  ontology: `${NS.owl}Ontology`,
  class: `${NS.owl}Class`,
  namedIndividual: `${NS.owl}NamedIndividual`,
  axiom: `${NS.owl}Axiom`,
  dataset: `${NS.dcat}Dataset`,
  distribution: `${NS.dcat}Distribution`,
  annotatedSource: `${NS.owl}annotatedSource`,
  annotatedProperty: `${NS.owl}annotatedProperty`,
  annotatedTarget: `${NS.owl}annotatedTarget`,
  title: `${NS.dcterms}title`,
  identifier: `${NS.dcterms}identifier`,
  references: `${NS.dcterms}references`,
  source: `${NS.dcterms}source`,
  created: `${NS.dcterms}created`,
  modified: `${NS.dcterms}modified`,
  prefLabel: `${NS.skos}prefLabel`,
  definition: `${NS.skos}definition`,
  subClassOf: `${NS.rdfs}subClassOf`,
};

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getJsonLdNodes(jsonLdDocument) {
  if (Array.isArray(jsonLdDocument)) {
    return jsonLdDocument;
  }

  if (
    jsonLdDocument &&
    typeof jsonLdDocument === "object" &&
    Array.isArray(jsonLdDocument["@graph"])
  ) {
    return jsonLdDocument["@graph"];
  }

  return jsonLdDocument && typeof jsonLdDocument === "object"
    ? [jsonLdDocument]
    : [];
}

function getPropertyValues(node, property) {
  return asArray(node?.[property]);
}

function getReferencedIris(node, property) {
  return getPropertyValues(node, property)
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }

      if (
        value &&
        typeof value === "object" &&
        typeof value["@id"] === "string"
      ) {
        return value["@id"];
      }

      return null;
    })
    .filter(Boolean);
}

function getLexicalValues(node, property) {
  return getPropertyValues(node, property)
    .map((value) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return String(value);
      }

      if (!value || typeof value !== "object") {
        return null;
      }

      if (typeof value["@id"] === "string") {
        return value["@id"];
      }

      if (value["@value"] !== undefined) {
        return String(value["@value"]);
      }

      return null;
    })
    .filter(Boolean);
}

function getPreferredLiteral(node, property) {
  return getPreferredLiteralTerm(node, property)?.value ?? "";
}

function getDefaultLiteralDatatype(value) {
  if (typeof value === "boolean") {
    return "http://www.w3.org/2001/XMLSchema#boolean";
  }

  if (typeof value === "number") {
    return `http://www.w3.org/2001/XMLSchema#${Number.isInteger(value) ? "integer" : "double"}`;
  }

  return "http://www.w3.org/2001/XMLSchema#string";
}

function getLiteralTerm(value) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return {
      datatype: getDefaultLiteralDatatype(value),
      language: null,
      value: String(value),
    };
  }

  if (!value || typeof value !== "object" || value["@value"] === undefined) {
    return null;
  }

  const language =
    typeof value["@language"] === "string"
      ? value["@language"].toLowerCase()
      : null;

  return {
    datatype: language
      ? "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
      : (value["@type"] ?? getDefaultLiteralDatatype(value["@value"])),
    language,
    value: String(value["@value"]),
  };
}

function getRdfTermKey(term) {
  return JSON.stringify([
    "literal",
    term.value,
    term.language ?? "",
    term.datatype,
  ]);
}

function getPreferredLiteralTerm(node, property) {
  const literals = getPropertyValues(node, property)
    .map((value) => {
      const term = getLiteralTerm(value);

      return term ? { ...term, key: getRdfTermKey(term) } : null;
    })
    .filter(Boolean);

  for (const language of ["en-gb", "en"]) {
    const match = literals.find((literal) => literal.language === language);

    if (match) {
      return match;
    }
  }

  return literals[0] ?? null;
}

function hasType(node, type) {
  return asArray(node?.["@type"]).includes(type);
}

function buildDefinitionSourceIndex(nodes, definitionProperties) {
  const index = new Map();
  const applicableProperties = new Set(definitionProperties);

  for (const node of nodes) {
    if (!hasType(node, JSON_LD.axiom)) {
      continue;
    }

    const annotatedProperties = [
      ...new Set(
        getReferencedIris(node, JSON_LD.annotatedProperty).filter((property) =>
          applicableProperties.has(property),
        ),
      ),
    ];

    if (annotatedProperties.length !== 1) {
      continue;
    }

    const [annotatedProperty] = annotatedProperties;

    const annotatedSource = getReferencedIris(node, JSON_LD.annotatedSource)[0];

    if (!annotatedSource) {
      continue;
    }

    const annotatedTarget = getPropertyValues(
      node,
      JSON_LD.annotatedTarget,
    ).map(getLiteralTerm)[0];

    if (!annotatedTarget) {
      continue;
    }

    const sources = getLexicalValues(node, JSON_LD.source);

    if (sources.length === 0) {
      continue;
    }

    const targetKey = getRdfTermKey(annotatedTarget);
    const sourceStatements = index.get(annotatedSource) ?? new Map();
    const propertyTargets =
      sourceStatements.get(annotatedProperty) ?? new Map();
    const existing = propertyTargets.get(targetKey) ?? [];

    propertyTargets.set(targetKey, [...new Set([...existing, ...sources])]);
    sourceStatements.set(annotatedProperty, propertyTargets);
    index.set(annotatedSource, sourceStatements);
  }

  return index;
}

function interpretLegacySources(node, interpretations) {
  const promotedSources = [];
  const promotedReferenceValues = new Set();

  for (const interpretation of interpretations) {
    if (interpretation.interpretedAsPropertyIri !== JSON_LD.source) {
      continue;
    }

    const matchingValues = getReferencedIris(
      node,
      interpretation.observedPropertyIri,
    ).filter((value) => value.startsWith(interpretation.valueIriPrefix));

    promotedSources.push(...matchingValues);

    if (interpretation.observedPropertyIri === JSON_LD.references) {
      matchingValues.forEach((value) => promotedReferenceValues.add(value));
    }
  }

  return {
    promotedSources: [...new Set(promotedSources)],
    remainingReferences: [
      ...new Set(
        getLexicalValues(node, JSON_LD.references).filter(
          (value) => !promotedReferenceValues.has(value),
        ),
      ),
    ],
  };
}

/**
 * Creates the application view model used by HTML and CSV output.
 *
 * @param {Object|Object[]} jsonLdDocument - Materialized JSON-LD document.
 * @param {Object} [options]
 * @param {string} [options.ontologyPath] - Published path used for historical fields.
 * @returns {{
 *   title: string,
 *   modified: string,
 *   rows: Array<{
 *     entityType: string,
 *     uuid: string,
 *     uri: string,
 *     preferredLabel: string,
 *     definition: string,
 *     sources: string[],
 *     references: string[],
 *     creator: string,
 *     createdAt: string,
 *     modifiedAt: string,
 *     superclasses: string[],
 *     classOfNamedIndividual: string
 *   }>
 * }}
 */
export function createOntologyViewModel(jsonLdDocument, { ontologyPath } = {}) {
  const nodes = getJsonLdNodes(jsonLdDocument);
  const projectionProperties =
    resolveOntologyProjectionProperties(ontologyPath);
  const applicableDefinitionProperties =
    resolveApplicableOntologyProjectionPropertyIris(ontologyPath, "definition");
  const definitionSources = buildDefinitionSourceIndex(
    nodes,
    applicableDefinitionProperties,
  );
  const legacySourceInterpretations =
    resolveLegacySourceInterpretations(ontologyPath);

  const ontologyNode = nodes.find((node) => hasType(node, JSON_LD.ontology));

  const rows = [];

  for (const node of nodes) {
    const isClass = hasType(node, JSON_LD.class);
    const isNamedIndividual = hasType(node, JSON_LD.namedIndividual);

    if (!isClass && !isNamedIndividual) {
      continue;
    }

    if (hasType(node, JSON_LD.dataset) || hasType(node, JSON_LD.distribution)) {
      continue;
    }

    const uri = node["@id"] ?? "";

    // Preserve the existing application's entity scope.
    if (!uri.startsWith("https://haddenindustries.com/")) {
      continue;
    }

    const identifiers = getLexicalValues(node, JSON_LD.identifier);

    const uuidIdentifier = identifiers.find((identifier) =>
      identifier.startsWith("urn:uuid:"),
    );

    const directSources = getLexicalValues(node, JSON_LD.source);
    const definitionTerm = getPreferredLiteralTerm(
      node,
      projectionProperties.definition,
    );
    const associatedDefinitionSources = definitionTerm
      ? applicableDefinitionProperties.flatMap((propertyIri) => {
          const statementExists = getPropertyValues(node, propertyIri)
            .map(getLiteralTerm)
            .filter(Boolean)
            .some((term) => getRdfTermKey(term) === definitionTerm.key);

          return statementExists
            ? (definitionSources
                .get(uri)
                ?.get(propertyIri)
                ?.get(definitionTerm.key) ?? [])
            : [];
        })
      : [];
    const { promotedSources, remainingReferences } = interpretLegacySources(
      node,
      legacySourceInterpretations,
    );

    const sources = [
      ...new Set([
        ...directSources,
        ...associatedDefinitionSources,
        ...promotedSources,
      ]),
    ];

    const types = asArray(node["@type"]);

    const classOfNamedIndividual = isNamedIndividual
      ? (types.find(
          (type) => type !== JSON_LD.namedIndividual && type !== JSON_LD.class,
        ) ?? "")
      : "";

    const superclasses = getReferencedIris(node, JSON_LD.subClassOf).filter(
      (iri) => !iri.startsWith("_:"),
    );

    rows.push({
      entityType: isNamedIndividual ? "Named Individual" : "Class",
      uuid:
        uuidIdentifier?.substring("urn:uuid:".length) ?? identifiers[0] ?? "",
      uri,
      preferredLabel: getPreferredLiteral(
        node,
        projectionProperties.preferredLabel,
      ),
      definition: definitionTerm?.value ?? "",
      sources,
      references: remainingReferences,
      creator: getLexicalValues(node, projectionProperties.creator)[0] ?? "",
      createdAt: getLexicalValues(node, JSON_LD.created)[0] ?? "",
      modifiedAt: getLexicalValues(node, JSON_LD.modified)[0] ?? "",
      superclasses,
      classOfNamedIndividual,
    });
  }

  return {
    title: ontologyNode ? getPreferredLiteral(ontologyNode, JSON_LD.title) : "",
    modified: ontologyNode
      ? (getLexicalValues(ontologyNode, JSON_LD.modified)[0] ?? "")
      : "",
    rows,
  };
}
