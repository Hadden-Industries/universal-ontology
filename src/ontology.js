/**
 * @file ontology_processor.js
 * @description Modernized, consolidated processor and interactive table controller for OWL/XML Ontologies.
 * Features JSON-LD loading, dynamic table rendering, column filtering, multi-column sorting,
 * and data export utilities (CSV, JSON-LD, XMI).
 */

/**
 * Standard namespaces used across OWL/RDF XML documents.
 * @constant {Object<string, string>}
 */
const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  owl: "http://www.w3.org/2002/07/owl#",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xml: "http://www.w3.org/XML/1998/namespace",
  dcat: "http://www.w3.org/ns/dcat#",
};

/**
 * Set of RDF properties that accept multiple values as arrays.
 * @constant {Set<string>}
 */
const MULTI_VALUED_PROPERTIES = new Set([
  "rdfs:subClassOf",
  "dcterms:source",
  "dcterms:references",
  "rdfs:seeAlso",
  "dcterms:subject",
]);

/**
 * Safely adds a property value to a record or result object, handling primitives, language objects, and arrays.
 * @param {Object} record - The target entity record or ontology result object.
 * @param {string} key - The property key.
 * @param {any} val - The value to add.
 * @param {boolean} [isMultiValued=false] - Whether the property is defined as multi-valued.
 */
export function addRecordProperty(record, key, val, isMultiValued = false) {
  if (val === undefined) return;

  const isValueEqual = (a, b) => {
    if (a === b) return true;
    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a !== null &&
      b !== null
    ) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  };

  const containsValue = (arr, item) => {
    return arr.some((existing) => isValueEqual(existing, item));
  };

  if (isMultiValued) {
    if (!record[key]) {
      record[key] = [val];
    } else if (Array.isArray(record[key])) {
      if (!containsValue(record[key], val)) {
        record[key].push(val);
      }
    } else {
      const existing = record[key];
      record[key] = [existing];
      if (!containsValue(record[key], val)) {
        record[key].push(val);
      }
    }
    return;
  }

  // Single-valued property handling
  if (!record[key]) {
    record[key] = val;
  } else {
    const isExistingLangMap =
      typeof record[key] === "object" &&
      record[key] !== null &&
      !Array.isArray(record[key]) &&
      Object.keys(record[key]).every(
        (k) =>
          typeof record[key][k] === "string" || Array.isArray(record[key][k]),
      );
    const isNewLangMap =
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      Object.keys(val).every(
        (k) => typeof val[k] === "string" || Array.isArray(val[k]),
      );

    if (isExistingLangMap && isNewLangMap) {
      for (const langKey in val) {
        if (!record[key][langKey]) {
          record[key][langKey] = val[langKey];
        } else {
          if (!Array.isArray(record[key][langKey])) {
            record[key][langKey] = [record[key][langKey]];
          }
          const textArr = Array.isArray(val[langKey])
            ? val[langKey]
            : [val[langKey]];
          for (const t of textArr) {
            if (!record[key][langKey].includes(t)) {
              record[key][langKey].push(t);
            }
          }
        }
      }
    } else {
      if (!Array.isArray(record[key])) {
        record[key] = [record[key]];
      }
      if (!containsValue(record[key], val)) {
        record[key].push(val);
      }
    }
  }
}

/**
 * Compacts a full URI into a prefix-compacted URI using the context.
 * @param {string} uri - The full URI.
 * @param {Object} context - The JSON-LD context map.
 * @returns {string} The compacted URI.
 */
function compactURI(uri, context) {
  if (!uri) return "";
  for (const [prefix, ns] of Object.entries(context)) {
    if (typeof ns !== "string") continue;
    if (uri.startsWith(ns)) {
      return `${prefix}:${uri.substring(ns.length)}`;
    }
  }
  return uri;
}

/**
 * Builds an index of Axiom sources for quick lookup.
 * @param {Document} xmlDoc - The parsed XML document.
 * @returns {Map<string, string[]>} A map of source URIs to their corresponding source lists.
 */
function buildAxiomIndex(xmlDoc) {
  const index = new Map();
  const axioms = xmlDoc.getElementsByTagNameNS(NS.owl, "Axiom");

  for (const axiom of axioms) {
    const annotatedSource = axiom.getElementsByTagNameNS(
      NS.owl,
      "annotatedSource",
    )[0];
    const annotatedProperty = axiom.getElementsByTagNameNS(
      NS.owl,
      "annotatedProperty",
    )[0];

    if (annotatedSource && annotatedProperty) {
      const propRes = annotatedProperty.getAttributeNS(NS.rdf, "resource");
      const sourceRes = annotatedSource.getAttributeNS(NS.rdf, "resource");

      if (propRes === `${NS.skos}definition` && sourceRes) {
        const dctermsSources = axiom.getElementsByTagNameNS(
          NS.dcterms,
          "source",
        );
        const sourceList = Array.from(dctermsSources)
          .map((src) => src.getAttributeNS(NS.rdf, "resource"))
          .filter((res) => res);

        if (sourceList.length > 0) {
          if (index.has(sourceRes)) {
            index.set(sourceRes, index.get(sourceRes).concat(sourceList));
          } else {
            index.set(sourceRes, sourceList);
          }
        }
      }
    }
  }
  return index;
}

/**
 * Helper to parse a nested XML element (like owl:Restriction) as a JSON-LD object.
 * @param {Element} el - The XML element to parse.
 * @param {Object} context - The JSON-LD context map.
 * @returns {Object} The parsed object.
 */
function parseElementAsObject(el, context) {
  const obj = {
    "@type": compactURI(el.namespaceURI + el.localName, context),
  };

  const about = el.getAttributeNS(NS.rdf, "about");
  if (about) {
    obj["@id"] = about;
  }

  for (const child of el.children) {
    const ns = child.namespaceURI;
    const name = child.localName;
    const key = compactURI(ns + name, context);

    const res = child.getAttributeNS(NS.rdf, "resource");
    const lang =
      child.getAttribute("xml:lang") || child.getAttributeNS(NS.xml, "lang");
    const hasElements = Array.from(child.children).some(
      (c) => c.nodeType === 1,
    );

    let val;
    if (hasElements) {
      val = parseElementAsObject(child.children[0], context);
    } else if (res) {
      val = compactURI(res, context);
    } else if (lang) {
      val = {};
      val[lang] = child.textContent.trim();
    } else {
      val = child.textContent.trim();
      const datatype =
        child.getAttribute("rdf:datatype") ||
        child.getAttributeNS(NS.rdf, "datatype") ||
        child.getAttribute("datatype") ||
        "";
      if (datatype.includes("integer") || datatype.includes("Integer")) {
        const num = parseInt(val, 10);
        if (!isNaN(num)) val = num;
      } else if (datatype.includes("boolean") || datatype.includes("Boolean")) {
        val = val.toLowerCase() === "true" || val === "1";
      } else if (
        datatype.includes("decimal") ||
        datatype.includes("float") ||
        datatype.includes("double")
      ) {
        const num = parseFloat(val);
        if (!isNaN(num)) val = num;
      }
    }

    if (val !== undefined) {
      if (!obj[key]) {
        obj[key] = val;
      } else {
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]];
        }
        obj[key].push(val);
      }
    }
  }
  return obj;
}

/**
 * Extracts and maps ontology objects into a standardized JSON-LD representation.
 * @param {Document} xmlDoc - The parsed XML document.
 * @param {Object} context - The JSON-LD context map.
 * @returns {Array<Object>} The array of processed ontology records.
 */
export function extractGraphData(xmlDoc, context) {
  const results = [];
  const axiomIndex = buildAxiomIndex(xmlDoc);

  const classes = Array.from(xmlDoc.getElementsByTagNameNS(NS.owl, "Class"));
  const individuals = Array.from(
    xmlDoc.getElementsByTagNameNS(NS.owl, "NamedIndividual"),
  );
  const allElements = classes.concat(individuals);

  for (const element of allElements) {
    const uri = element.getAttributeNS(NS.rdf, "about") || "";

    if (!uri.startsWith("https://haddenindustries.com/")) continue;

    const isNamedIndividual = element.localName === "NamedIndividual";
    const types = [
      compactURI(
        NS.owl + (isNamedIndividual ? "NamedIndividual" : "Class"),
        context,
      ),
    ];

    const record = {
      "@id": uri,
    };

    // Single-pass direct child iteration to populate properties generically
    for (const child of element.children) {
      const ns = child.namespaceURI;
      const name = child.localName;
      const key = compactURI(ns + name, context);

      if (ns === NS.rdf && name === "type") {
        const res = child.getAttributeNS(NS.rdf, "resource");
        if (res) {
          const compactedType = compactURI(res, context);
          if (!types.includes(compactedType)) {
            types.push(compactedType);
          }
        }
        continue;
      }

      const res = child.getAttributeNS(NS.rdf, "resource");
      const lang =
        child.getAttribute("xml:lang") || child.getAttributeNS(NS.xml, "lang");
      const hasElements = Array.from(child.children).some(
        (c) => c.nodeType === 1,
      );

      if (hasElements) {
        // Parse nested resource (like owl:Restriction)
        const nestedEl = child.children[0];
        const val = parseElementAsObject(nestedEl, context);
        addRecordProperty(record, key, val, MULTI_VALUED_PROPERTIES.has(key));
      } else if (lang) {
        const text = child.textContent.trim();
        const langVal = { [lang]: text };
        addRecordProperty(
          record,
          key,
          langVal,
          MULTI_VALUED_PROPERTIES.has(key),
        );
      } else if (res) {
        const val = compactURI(res, context);
        addRecordProperty(record, key, val, MULTI_VALUED_PROPERTIES.has(key));
      } else {
        let val = child.textContent.trim();
        const datatype =
          child.getAttribute("rdf:datatype") ||
          child.getAttributeNS(NS.rdf, "datatype") ||
          child.getAttribute("datatype") ||
          "";
        if (datatype.includes("integer") || datatype.includes("Integer")) {
          const num = parseInt(val, 10);
          if (!isNaN(num)) val = num;
        } else if (
          datatype.includes("boolean") ||
          datatype.includes("Boolean")
        ) {
          val = val.toLowerCase() === "true" || val === "1";
        } else if (
          datatype.includes("decimal") ||
          datatype.includes("float") ||
          datatype.includes("double")
        ) {
          const num = parseFloat(val);
          if (!isNaN(num)) val = num;
        }
        addRecordProperty(record, key, val, MULTI_VALUED_PROPERTIES.has(key));
      }
    }

    // Post-process type
    record["@type"] = types.length === 1 ? types[0] : types;

    // Match source URNs/URIs from axiomIndex
    if (axiomIndex.has(uri)) {
      const axiomSources = axiomIndex.get(uri);
      if (axiomSources && axiomSources.length > 0) {
        for (const src of axiomSources) {
          const compactedSrc = compactURI(src, context);
          addRecordProperty(record, "dcterms:source", compactedSrc, true);
        }
      }
    }

    results.push(record);
  }

  return results;
}

/**
 * Transforms an ISO URN to an ISO OBP (Online Browsing Platform) URL.
 * @param {string} rawUrn - The raw URN to transform.
 * @returns {string|null} The transformed URL or null if invalid.
 */
function transformUrnToObpUrl(rawUrn) {
  if (typeof rawUrn !== "string") return null;

  const normalizedUrn = rawUrn.toLowerCase().trim();
  if (!normalizedUrn.startsWith("urn:iso:std:")) return null;

  // Isolate document elements (clause, figure, table, term, sec, annex, bib, foreword, intro, scope, normative_references) and additions (tech)
  const documentElementRegex =
    /:(clause|figure|table|term|tech|sec|annex|bib|foreword|intro|scope|normative_references)(:|$)/;
  const regexMatch = normalizedUrn.match(documentElementRegex);

  let documentIdentifier = normalizedUrn;
  let documentElement = "";

  if (regexMatch) {
    documentIdentifier = normalizedUrn.substring(0, regexMatch.index);
    documentElement = normalizedUrn.substring(regexMatch.index);
  }

  // RFC 5141 valid ISO 639-1 alpha-2 language codes
  const languageRegex = /:(en|fr|ru|es|ar)(,(en|fr|ru|es|ar))*$/;

  // Inject 'en' fallback if no valid language tag terminates the document identifier
  if (!languageRegex.test(documentIdentifier)) {
    documentIdentifier += ":en";
  }

  // Combine and strip the 'urn:' prefix to form the OBP hash fragment
  const formattedHashFragment = (documentIdentifier + documentElement).replace(
    /^urn:/,
    "",
  );

  return `https://www.iso.org/obp/ui/en/#${formattedHashFragment}`;
}

/**
 * Wraps a value in an HTML anchor tag if it represents a valid URL or URN.
 * @param {string} value - The URI/URN value.
 * @param {boolean} [forceLink=false] - Whether to force a link even if it doesn't look like a standard URL.
 * @returns {string} The HTML link string, or escaped plain text if not a link.
 */
function createLink(value, forceLink = false) {
  if (!value) return "";

  if (value.toLowerCase().startsWith("urn:iso:std:")) {
    const obpUrl = transformUrnToObpUrl(value);
    if (obpUrl) {
      return `<a href="${escapeHTML(obpUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(value)}</a>`;
    }
  }

  if (forceLink || value.startsWith("http:") || value.startsWith("https:")) {
    return `<a href="${escapeHTML(value)}" target="_blank" rel="noopener noreferrer">${escapeHTML(value)}</a>`;
  }
  return escapeHTML(value);
}

/**
 * Safely escapes a string for inclusion in HTML to prevent XSS.
 * @param {any} str - The input to escape.
 * @returns {string} The escaped HTML string.
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}

/**
 * Resolves a language-specific annotation from a JSON-LD language map.
 * Checks for en-GB, en, and falls back to the first available language value.
 * @param {Object|string} langMap - Map of language tags to strings or raw string.
 * @returns {string} The resolved text string.
 */
export function getPreferredLang(langMap) {
  if (!langMap) return "";
  if (typeof langMap === "string") return langMap;
  if (Array.isArray(langMap)) {
    const resolved = langMap
      .map((item) => getPreferredLang(item))
      .filter((str) => Boolean(str));
    return resolved[0] || "";
  }
  if (typeof langMap !== "object") return "";
  return langMap["en-GB"] || langMap["en"] || Object.values(langMap)[0] || "";
}

/**
 * Triggers a download of the provided JSON-LD ontology data as a CSV file.
 * @param {Object} ontologyLd - The full parsed ontology JSON-LD document.
 * @param {string} [filename="Ontology.csv"] - The name of the file to save.
 */
function exportCSV(rows, filename = "Ontology.csv") {
  if (!rows) return;

  const headers = [
    "Entity Type",
    "UUID",
    "URI",
    "Preferred Label",
    "Definition",
    "Sources",
    "Creator",
    "Created At",
    "Modified At",
    "Superclasses",
    "Class of Named Individual",
  ];

  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const values = [
      row.entityType,
      row.uuid,
      row.uri,
      row.preferredLabel,
      row.definition,
      row.sources.join("\n"),
      row.creator,
      row.createdAt,
      row.modifiedAt,
      row.superclasses.join("\n"),
      row.classOfNamedIndividual,
    ].map((value) => {
      let safeValue = String(value ?? "");

      if (/^[=+\-@]/.test(safeValue)) {
        safeValue = `'${safeValue}`;
      }

      if (
        safeValue.includes(",") ||
        safeValue.includes('"') ||
        safeValue.includes("\n")
      ) {
        safeValue = `"${safeValue.replace(/"/g, '""')}"`;
      }

      return safeValue;
    });
    csvRows.push(values.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a download of the materialized JSON-LD ontology file.
 * @param {string} url - The URL of the materialized JSON-LD file.
 */
function exportJSON(url) {
  if (!url) return;

  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fetches and parses an OWL XML document from a given URL and returns it as a DOM Document.
 * @async
 * @param {string} url - The URL of the XML file to load.
 * @returns {Promise<Document>} The parsed ontology XML DOM document.
 */
async function fetchOntologyAsXml(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`HTTP fetch error! Status: ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  // Allow various XML/RDF content types
  if (
    !contentType.includes("application/rdf+xml") &&
    !contentType.includes("application/xml") &&
    !contentType.includes("text/xml") &&
    !url.endsWith(".owl") &&
    !url.endsWith(".xml")
  ) {
    console.warn(
      `Unusual Content-Type (${contentType}), attempting XML parse anyway.`,
    );
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Failed to parse response as XML document");
  }
  return xmlDoc;
}

/**
 * Fetches and parses a JSON-LD ontology document.
 * @async
 * @param {string} url - The URL of the JSON-LD file to load.
 * @returns {Promise<Object>} The parsed JSON-LD document.
 */
async function fetchOntologyAsJsonLd(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/ld+json, application/json;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`JSON-LD fetch error! Status: ${response.status} (${url})`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON-LD document: ${url}`, {
      cause: error,
    });
  }
}

async function initializeOwlToUmlXmiConverter(xmlString) {
  try {
    // Await the import and destructure the named export directly
    const { OwlToUmlXmiConverter } =
      await import("/ontology/OwlToUmlXmiConverter.js");

    const converter = new OwlToUmlXmiConverter(xmlString);
    return converter;
  } catch (error) {
    console.error("Module loading failed:", error);
  }
}

/**
 * Transforms the OWL XML document and triggers a download of the resulting UML XMI file.
 * @param {Document} xmlDoc - The parsed OWL XML DOM document.
 * @param {string} [filename="Ontology.xmi"] - The name of the file to save.
 */
async function exportXMI(xmlDoc, filename = "Ontology.xmi") {
  if (!xmlDoc) return;

  const serializerXML = new XMLSerializer();
  const xmlText = serializerXML.serializeToString(xmlDoc);

  // Wait for the module to load and the instance to be created
  const converter = await initializeOwlToUmlXmiConverter(xmlText);

  const resultXmiText = converter.convert();
  if (!resultXmiText) {
    throw new Error("JS transformation returned null text");
  }

  const blob = new Blob([resultXmiText], {
    type: "application/xml;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Applies the XSLT stylesheet to the OWL XML document and triggers a download of the resulting UML XMI file.
 * @param {Document} xmlDoc - The parsed OWL XML DOM document.
 * @param {string} xsltText - The raw text of the XSLT stylesheet.
 * @param {string} [filename="Ontology.xmi"] - The name of the file to save.
 */
function exportXMIviaXslt(xmlDoc, xsltText, filename = "Ontology.xmi") {
  const parser = new DOMParser();
  const xsltDoc = parser.parseFromString(xsltText, "application/xml");

  if (xsltDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Error parsing XSLT stylesheet");
  }

  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);

  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
  if (!resultDoc) {
    throw new Error("XSLT transformation returned null document");
  }

  const serializer = new XMLSerializer();
  const xmiText = serializer.serializeToString(resultDoc);

  const blob = new Blob([xmiText], { type: "application/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
 * Creates the application view model used by both HTML and CSV output.
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
function createOntologyViewModel(jsonLdDocument) {
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

/**
 * Encapsulated UI Controller class managing table rendering, dropdown actions, sorting, and export logic.
 */
export class OntologyUIController {
  #extractedData = [];
  #currentSortCol = null;
  #currentSortAsc = true;
  #hiddenColumns = new Set();
  #fetchedXmlDoc = null;
  #jsonLdDoc = null;
  #jsonLdUrl = null;
  #sourceUrl = null;
  #fileName = "Ontology";
  #colStyleElement = null;

  constructor() {
    this.#colStyleElement = document.createElement("style");
    document.head.appendChild(this.#colStyleElement);
  }

  /**
   * Lazily fetches and caches the source RDF/XML document.
   * @returns {Promise<Document>} The parsed RDF/XML document.
   */
  async #getXmlDocument() {
    this.#fetchedXmlDoc ??= await fetchOntologyAsXml(this.#sourceUrl);

    return this.#fetchedXmlDoc;
  }

  /**
   * Initializes the UI event handlers and starts initial ontology load.
   * @async
   */
  async init() {
    this.#setupSortListeners();
    this.#setupColumnDropdown();
    this.#setupExportDropdown();
    await this.#loadAndRender();
  }

  /**
   * Dynamically updates CSS rules to show/hide table columns.
   * @private
   */
  #updateColumnVisibility() {
    let cssText = "";
    this.#hiddenColumns.forEach((index) => {
      // CSS :nth-child is 1-based
      cssText += `table th:nth-child(${index + 1}), table td:nth-child(${index + 1}) { display: none !important; }\n`;
    });
    this.#colStyleElement.textContent = cssText;
  }

  /**
   * Builds and configures column filtering dropdown menu.
   * @private
   */
  #setupColumnDropdown() {
    const headers = document.querySelectorAll("thead th");
    const menu = document.getElementById("col-menu");
    const toggleBtn = document.getElementById("col-toggle");
    const exportMenu = document.getElementById("export-menu");

    if (!menu || !toggleBtn) return;

    headers.forEach((th, index) => {
      const text = th.childNodes[0].textContent.trim();
      const label = document.createElement("label");
      label.className = "dropdown-item";
      label.title = text;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.#hiddenColumns.delete(index);
        } else {
          this.#hiddenColumns.add(index);
        }
        this.#updateColumnVisibility();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(text));
      menu.appendChild(label);
    });

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("show");
      if (exportMenu) exportMenu.classList.remove("show");
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== toggleBtn) {
        menu.classList.remove("show");
      }
    });
  }

  /**
   * Configures listeners for data export buttons (CSV, JSON-LD, XMI).
   * @private
   */
  #setupExportDropdown() {
    const exportMenu = document.getElementById("export-menu");
    const toggleExportBtn = document.getElementById("export-toggle");
    const colMenu = document.getElementById("col-menu");

    if (!exportMenu || !toggleExportBtn) return;

    toggleExportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle("show");
      if (colMenu) colMenu.classList.remove("show");
    });

    document.addEventListener("click", (e) => {
      if (!exportMenu.contains(e.target) && e.target !== toggleExportBtn) {
        exportMenu.classList.remove("show");
      }
    });

    const exportCsvBtn = document.getElementById("export-csv");
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportCsvBtn.disabled = true;
        exportCsvBtn.classList.add("exporting");
        try {
          exportCSV(this.#extractedData, `${this.#fileName}.csv`);
        } finally {
          exportCsvBtn.classList.remove("exporting");
          exportCsvBtn.disabled = false;
        }
      });
    }

    const exportJsonLdBtn = document.getElementById("export-jsonld");
    if (exportJsonLdBtn) {
      exportJsonLdBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportJsonLdBtn.disabled = true;
        exportJsonLdBtn.classList.add("exporting");
        try {
          exportJSON(this.#jsonLdUrl);
        } finally {
          exportJsonLdBtn.classList.remove("exporting");
          exportJsonLdBtn.disabled = false;
        }
      });
    }

    const exportXmiBtn = document.getElementById("export-xmi");
    if (exportXmiBtn) {
      exportXmiBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        exportXmiBtn.disabled = true;
        exportXmiBtn.classList.add("exporting");
        try {
          const xmlDoc = await this.#getXmlDocument();
          await exportXMI(xmlDoc, `${this.#fileName}.xmi`);
        } catch (error) {
          console.error("XMI Export failed:", error);
        } finally {
          exportXmiBtn.classList.remove("exporting");
          exportXmiBtn.disabled = false;
        }
      });
    }

    const exportXmiViaXsltBtn = document.getElementById("export-xmi-xslt");
    if (exportXmiViaXsltBtn) {
      exportXmiViaXsltBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        exportXmiViaXsltBtn.disabled = true;
        exportXmiViaXsltBtn.classList.add("exporting");
        const xsltUrl = "/ontology/owl-to-uml-xmi.xsl";

        try {
          const xmlDoc = await this.#getXmlDocument();
          const xsltResponse = await fetch(xsltUrl);
          if (!xsltResponse.ok) throw new Error("Local XSLT fetch failed");
          const xsltText = await xsltResponse.text();
          exportXMIviaXslt(xmlDoc, xsltText, `${this.#fileName}.xmi`);
        } catch (error) {
          console.error("XMI Export failed:", error);
        } finally {
          exportXmiViaXsltBtn.classList.remove("exporting");
          exportXmiViaXsltBtn.disabled = false;
        }
      });
    }
  }

  /**
   * Binds sort click handlers to header columns with data-sort attributes.
   * @private
   */
  #setupSortListeners() {
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.innerHTML += ' <span class="sort-icon">&#9650;&#9660;</span>';
      th.addEventListener("click", () =>
        this.#handleSort(th.getAttribute("data-sort")),
      );
    });
  }

  /**
   * Extracts comparable text value for sorting table rows.
   * @private
   * @param {Object} row - JSON-LD entity node.
   * @param {string} column - Sort column key.
   * @returns {string} Comparable lowercase string value.
   */
  #getSortValue(row, column) {
    const values = {
      objectType: row.entityType,
      uuid: row.uuid,
      uri: row.uri,
      preferredLabel: row.preferredLabel,
      definition: row.definition,
      sources: row.sources.join(""),
      creator: row.creator,
      createdAt: row.createdAt,
      modifiedAt: row.modifiedAt,
      subClassOf: row.superclasses.join(""),
      classOfNamedIndividual: row.classOfNamedIndividual,
    };

    return String(values[column] ?? "").toLowerCase();
  }

  /**
   * Reorders data and updates active header indicators.
   * @private
   * @param {string} column - Sort column name.
   */
  #handleSort(column) {
    if (this.#currentSortCol === column) {
      this.#currentSortAsc = !this.#currentSortAsc;
    } else {
      this.#currentSortCol = column;
      this.#currentSortAsc = true;
    }

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      const icon = th.querySelector(".sort-icon");
      if (icon) {
        if (th.getAttribute("data-sort") === column) {
          icon.innerHTML = this.#currentSortAsc ? "&#9650;" : "&#9660;";
          icon.classList.add("active");
        } else {
          icon.innerHTML = "&#9650;&#9660;";
          icon.classList.remove("active");
        }
      }
    });

    this.#extractedData.sort((a, b) => {
      const valA = this.#getSortValue(a, column);
      const valB = this.#getSortValue(b, column);

      if (valA < valB) return this.#currentSortAsc ? -1 : 1;
      if (valA > valB) return this.#currentSortAsc ? 1 : -1;
      return 0;
    });

    this.#renderTable();
  }

  /**
   * Renders extracted ontology nodes into table rows using DocumentFragment.
   * @private
   */
  #renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    this.#extractedData.forEach((row) => {
      const tr = document.createElement("tr");

      const superclassesHtml = row.superclasses
        .map((uri) => createLink(uri))
        .join("<br>");

      tr.innerHTML = `
      <td><span class="badge">${escapeHTML(row.entityType)}</span></td>
      <td><span class="code-text">${escapeHTML(row.uuid)}</span></td>
      <td><span class="code-text">${createLink(row.uri, true)}</span></td>
      <td style="font-weight: 500;">${escapeHTML(row.preferredLabel)}</td>
      <td class="wrap-text">${escapeHTML(row.definition)}</td>
      <td><span class="code-text">${row.sources
        .map((source) => createLink(source))
        .join("<br>")}</span></td>
      <td><span class="code-text">${createLink(row.creator, true)}</span></td>
      <td>${escapeHTML(row.createdAt).replace("T", "<wbr>T")}</td>
      <td>${escapeHTML(row.modifiedAt).replace("T", "<wbr>T")}</td>
      <td class="wrap-text"><span class="code-text">${superclassesHtml}</span></td>
      <td><span class="code-text">${createLink(
        row.classOfNamedIndividual,
        true,
      )}</span></td>
    `;

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }

  /**
   * Asynchronously loads XML data, constructs JSON-LD document, and renders UI.
   * @private
   */
  async #loadAndRender() {
    const pageUrl = new URL(window.location.href);
    const pathname = pageUrl.pathname;
    const lastSlashIndex = pathname.lastIndexOf("/");
    const lastDotIndex = pathname.lastIndexOf(".");

    const sourcePath =
      lastDotIndex > lastSlashIndex
        ? pathname.substring(0, lastDotIndex)
        : pathname;

    const sourceUrl = new URL(pageUrl);
    sourceUrl.pathname = sourcePath;
    sourceUrl.search = "";
    sourceUrl.hash = "";

    const jsonLdUrl = new URL(sourceUrl);
    jsonLdUrl.pathname = `${sourcePath}.jsonld`;

    this.#sourceUrl = sourceUrl.href;
    this.#jsonLdUrl = jsonLdUrl.href;

    try {
      this.#jsonLdDoc = await fetchOntologyAsJsonLd(this.#jsonLdUrl);

      const viewModel = createOntologyViewModel(this.#jsonLdDoc);

      this.#extractedData = viewModel.rows;

      if (viewModel.title) {
        document.title = viewModel.title;
        this.#fileName = viewModel.title;

        if (viewModel.modified) {
          this.#fileName += ` [${viewModel.modified}]`;
        }
      }

      this.#renderTable();
    } catch (error) {
      console.error("Error processing ontology file:", error);
    }
  }
}

// Auto-initialize UI controller when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const controller = new OntologyUIController();
      controller.init();
    });
  } else {
    const controller = new OntologyUIController();
    controller.init();
  }
}
