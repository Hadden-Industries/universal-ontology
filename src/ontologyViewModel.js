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
  title: `${NS.dcterms}title`,
  identifier: `${NS.dcterms}identifier`,
  source: `${NS.dcterms}source`,
  creator: `${NS.dcterms}creator`,
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
  const literals = getPropertyValues(node, property)
    .map((value) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return {
          language: null,
          value: String(value),
        };
      }

      if (value && typeof value === "object" && value["@value"] !== undefined) {
        return {
          language:
            typeof value["@language"] === "string"
              ? value["@language"].toLowerCase()
              : null,
          value: String(value["@value"]),
        };
      }

      return null;
    })
    .filter(Boolean);

  for (const language of ["en-gb", "en"]) {
    const match = literals.find((literal) => literal.language === language);

    if (match) {
      return match.value;
    }
  }

  return literals[0]?.value ?? "";
}

function hasType(node, type) {
  return asArray(node?.["@type"]).includes(type);
}

function buildDefinitionSourceIndex(nodes) {
  const index = new Map();

  for (const node of nodes) {
    if (!hasType(node, JSON_LD.axiom)) {
      continue;
    }

    const annotatedProperties = getReferencedIris(
      node,
      JSON_LD.annotatedProperty,
    );

    if (!annotatedProperties.includes(JSON_LD.definition)) {
      continue;
    }

    const annotatedSource = getReferencedIris(node, JSON_LD.annotatedSource)[0];

    if (!annotatedSource) {
      continue;
    }

    const sources = getLexicalValues(node, JSON_LD.source);

    if (sources.length === 0) {
      continue;
    }

    const existing = index.get(annotatedSource) ?? [];

    index.set(annotatedSource, [...new Set([...existing, ...sources])]);
  }

  return index;
}

/**
 * Creates the application view model used by HTML and CSV output.
 *
 * @param {Object|Object[]} jsonLdDocument - Materialized JSON-LD document.
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
 *     creator: string,
 *     createdAt: string,
 *     modifiedAt: string,
 *     superclasses: string[],
 *     classOfNamedIndividual: string
 *   }>
 * }}
 */
export function createOntologyViewModel(jsonLdDocument) {
  const nodes = getJsonLdNodes(jsonLdDocument);
  const definitionSources = buildDefinitionSourceIndex(nodes);

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

    const sources = [
      ...new Set([...directSources, ...(definitionSources.get(uri) ?? [])]),
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
      preferredLabel: getPreferredLiteral(node, JSON_LD.prefLabel),
      definition: getPreferredLiteral(node, JSON_LD.definition),
      sources,
      creator: getLexicalValues(node, JSON_LD.creator)[0] ?? "",
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
