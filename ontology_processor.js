/**
 * Namespaces used in the OWL XML documents.
 * @constant {Object}
 */
const NS = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    owl: "http://www.w3.org/2002/07/owl#",
    dcterms: "http://purl.org/dc/terms/",
    skos: "http://www.w3.org/2004/02/skos/core#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    xml: "http://www.w3.org/XML/1998/namespace",
    dcat: "http://www.w3.org/ns/dcat#"
};

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
 * Expands a compacted URI back to its full URI using the context.
 * @param {string} compactUri - The compacted URI.
 * @param {Object} context - The JSON-LD context map.
 * @returns {string} The expanded URI.
 */
function expandURI(compactUri, context) {
    if (!compactUri) return "";
    const colonIdx = compactUri.indexOf(":");
    if (colonIdx > 0) {
        const prefix = compactUri.substring(0, colonIdx);
        const suffix = compactUri.substring(colonIdx + 1);
        const ns = context[prefix];
        if (ns && typeof ns === "string") {
            return ns + suffix;
        }
    }
    return compactUri;
}

/**
 * Fetches and parses an OWL XML document from a given URL and returns it as JSON-LD.
 * @async
 * @param {string} url - The URL of the XML file to load.
 * @returns {Promise<Object>} The parsed ontology represented as a JSON-LD document.
 * @throws {Error} If the file cannot be loaded or parsed.
 */
async function fetchOntologyAsJsonLd(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Harden the fetch: ensure the server returned an RDF/XML file
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/rdf+xml")) {
        throw new Error(`Invalid content-type: ${contentType}. Expected application/rdf+xml`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Error parsing XML document");
    }

    // Initialize the base JSON-LD context
    const context = {
        "rdf": NS.rdf,
        "owl": NS.owl,
        "dcterms": NS.dcterms,
        "skos": NS.skos,
        "rdfs": NS.rdfs,
        "xml": "http://www.w3.org/XML/1998/namespace",
        "dcat": NS.dcat,
        "schema": NS.schema,
        "uc": "https://haddenindustries.com/ontology/universal/core/",
        "ue": "https://haddenindustries.com/ontology/universal/extended/",
        "md": "https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/",
        "urd": "https://haddenindustries.com/ontology/universal/reference-data/",
        "rdfs:subClassOf": { "@type": "@id" },
        "dcterms:creator": { "@type": "@id" },
        "dcterms:source": { "@type": "@id" },
        "dcterms:references": { "@type": "@id" },
        "rdfs:seeAlso": { "@type": "@id" },
        "owl:versionIRI": { "@type": "@id" },
        "owl:imports": { "@type": "@id" },
        "dcterms:contributor": { "@type": "@id" },
        "dcterms:format": { "@type": "@id" },
        "dcterms:identifier": { "@type": "@id" },
        "dcterms:language": { "@type": "@id" },
        "dcterms:license": { "@type": "@id" },
        "dcterms:publisher": { "@type": "@id" },
        "dcterms:rights": { "@type": "@id" },
        "dcterms:subject": { "@type": "@id" },
        "owl:priorVersion": { "@type": "@id" },
        "skos:prefLabel": { "@container": "@language" },
        "skos:definition": { "@container": "@language" },
        "rdfs:label": { "@container": "@language" },
        "dcterms:title": { "@container": "@language" },
        "dcterms:description": { "@container": "@language" }
    };

    // Dynamically extract namespace declarations from the root element
    const root = xmlDoc.documentElement;
    if (root) {
        for (let i = 0; i < root.attributes.length; i++) {
            const attr = root.attributes[i];
            if (attr.name.startsWith("xmlns:")) {
                const prefix = attr.name.substring(6);
                context[prefix] = attr.value;
            }
        }
        const defaultNs = root.getAttribute("xmlns") || root.getAttributeNS(NS.xml, "base") || "";
        if (defaultNs) {
            const isAlreadyMapped = Object.keys(context).some(k => context[k] === defaultNs);
            if (!isAlreadyMapped) {
                const parts = defaultNs.replace(/\/$/, "").split("/");
                const localPrefix = parts[parts.length - 1];
                if (localPrefix && !context[localPrefix]) {
                    context[localPrefix] = defaultNs;
                }
            }
        }
    }

    const result = {
        "@context": context,
        "@type": "owl:Ontology"
    };

    const ontologyNode = xmlDoc.getElementsByTagNameNS(NS.owl, "Ontology")[0];
    if (ontologyNode) {
        const ontologyId = ontologyNode.getAttributeNS(NS.rdf, "about") || "";
        if (ontologyId) {
            result["@id"] = ontologyId;
        }

        // Generic child iteration for owl:Ontology properties
        for (let child of ontologyNode.children) {
            const ns = child.namespaceURI;
            const name = child.localName;
            const key = compactURI(ns + name, context);

            // Skip type since it's hardcoded as owl:Ontology
            if (ns === NS.rdf && name === "type") {
                continue;
            }

            const res = child.getAttributeNS(NS.rdf, "resource");
            const lang = child.getAttribute("xml:lang") || child.getAttributeNS(NS.xml, "lang");
            const hasElements = Array.from(child.children).some(c => c.nodeType === 1);

            let val;
            if (hasElements) {
                val = parseElementAsObject(child.children[0], context);
            } else if (lang) {
                if (!result[key]) {
                    result[key] = {};
                }
                const text = child.textContent.trim();
                if (!result[key][lang]) {
                    result[key][lang] = text;
                } else {
                    if (!Array.isArray(result[key][lang])) {
                        result[key][lang] = [result[key][lang]];
                    }
                    result[key][lang].push(text);
                }
                continue;
            } else if (res) {
                val = compactURI(res, context);
            } else {
                val = child.textContent.trim();
                const datatype = child.getAttribute("rdf:datatype") || child.getAttributeNS(NS.rdf, "datatype") || child.getAttribute("datatype") || "";
                if (datatype.includes("integer") || datatype.includes("Integer")) {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) val = num;
                } else if (datatype.includes("boolean") || datatype.includes("Boolean")) {
                    val = val.toLowerCase() === "true" || val === "1";
                } else if (datatype.includes("decimal") || datatype.includes("float") || datatype.includes("double")) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) val = num;
                }
            }

            if (val !== undefined) {
                if (MULTI_VALUED_PROPERTIES.has(key)) {
                    if (!result[key]) result[key] = [];
                    if (!result[key].includes(val)) result[key].push(val);
                } else {
                    if (!result[key]) {
                        result[key] = val;
                    } else {
                        if (!Array.isArray(result[key])) {
                            result[key] = [result[key]];
                        }
                        if (!result[key].includes(val)) result[key].push(val);
                    }
                }
            }
        }
    }

    const ontologyData = extractGraphData(xmlDoc, context);
    result["@graph"] = ontologyData;

    for (let key in result) {
        if (result[key] === undefined) {
            delete result[key];
        }
    }

    return result;
}

/**
 * Builds an index of Axiom sources for quick lookup.
 * @param {Document} xmlDoc - The parsed XML document.
 * @returns {Map<string, string[]>} A map of source URIs to their corresponding source lists.
 */
function buildAxiomIndex(xmlDoc) {
    const index = new Map();
    const axioms = xmlDoc.getElementsByTagNameNS(NS.owl, "Axiom");
    
    for (let axiom of axioms) {
        const annotatedSource = axiom.getElementsByTagNameNS(NS.owl, "annotatedSource")[0];
        const annotatedProperty = axiom.getElementsByTagNameNS(NS.owl, "annotatedProperty")[0];
        
        if (annotatedSource && annotatedProperty) {
            const propRes = annotatedProperty.getAttributeNS(NS.rdf, "resource");
            const sourceRes = annotatedSource.getAttributeNS(NS.rdf, "resource");
            
            if (propRes === NS.skos + "definition" && sourceRes) {
                const dctermsSources = axiom.getElementsByTagNameNS(NS.dcterms, "source");
                const sourceList = Array.from(dctermsSources)
                    .map(src => src.getAttributeNS(NS.rdf, "resource"))
                    .filter(res => res);
                
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

const MULTI_VALUED_PROPERTIES = new Set([
    "rdfs:subClassOf",
    "dcterms:source",
    "dcterms:references",
    "rdfs:seeAlso",
    "dcterms:subject"
]);

/**
 * Helper to parse a nested XML element (like owl:Restriction) as a JSON-LD object.
 * @param {Element} el - The XML element to parse.
 * @param {Object} context - The JSON-LD context map.
 * @returns {Object} The parsed object.
 */
function parseElementAsObject(el, context) {
    const obj = {
        "@type": compactURI(el.namespaceURI + el.localName, context)
    };
    
    const about = el.getAttributeNS(NS.rdf, "about");
    if (about) {
        obj["@id"] = about;
    }

    for (let child of el.children) {
        const ns = child.namespaceURI;
        const name = child.localName;
        const key = compactURI(ns + name, context);
        
        const res = child.getAttributeNS(NS.rdf, "resource");
        const lang = child.getAttribute("xml:lang") || child.getAttributeNS(NS.xml, "lang");
        const hasElements = Array.from(child.children).some(c => c.nodeType === 1);

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
            const datatype = child.getAttribute("rdf:datatype") || child.getAttributeNS(NS.rdf, "datatype") || child.getAttribute("datatype") || "";
            if (datatype.includes("integer") || datatype.includes("Integer")) {
                const num = parseInt(val, 10);
                if (!isNaN(num)) val = num;
            } else if (datatype.includes("boolean") || datatype.includes("Boolean")) {
                val = val.toLowerCase() === "true" || val === "1";
            } else if (datatype.includes("decimal") || datatype.includes("float") || datatype.includes("double")) {
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
function extractGraphData(xmlDoc, context) {
    const results = [];
    const axiomIndex = buildAxiomIndex(xmlDoc);
    
    const classes = Array.from(xmlDoc.getElementsByTagNameNS(NS.owl, "Class"));
    const individuals = Array.from(xmlDoc.getElementsByTagNameNS(NS.owl, "NamedIndividual"));
    const allElements = classes.concat(individuals);

    for (let element of allElements) {
        const uri = element.getAttributeNS(NS.rdf, "about") || "";
        
        if (!uri.startsWith("https://haddenindustries.com/")) continue;

        const isNamedIndividual = element.localName === "NamedIndividual";
        const types = [compactURI(NS.owl + (isNamedIndividual ? "NamedIndividual" : "Class"), context)];
        
        const record = {
            "@id": uri
        };

        // Single-pass direct child iteration to populate properties generically
        for (let child of element.children) {
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
            const lang = child.getAttribute("xml:lang") || child.getAttributeNS(NS.xml, "lang");
            const hasElements = Array.from(child.children).some(c => c.nodeType === 1);
            
            if (hasElements) {
                // Parse nested resource (like owl:Restriction)
                const nestedEl = child.children[0];
                const val = parseElementAsObject(nestedEl, context);
                if (MULTI_VALUED_PROPERTIES.has(key)) {
                    if (!record[key]) record[key] = [];
                    record[key].push(val);
                } else {
                    if (!record[key]) {
                        record[key] = val;
                    } else {
                        if (!Array.isArray(record[key])) {
                            record[key] = [record[key]];
                        }
                        record[key].push(val);
                    }
                }
            } else if (lang) {
                if (!record[key]) {
                    record[key] = {};
                }
                const text = child.textContent.trim();
                if (!record[key][lang]) {
                    record[key][lang] = text;
                } else {
                    if (!Array.isArray(record[key][lang])) {
                        record[key][lang] = [record[key][lang]];
                    }
                    record[key][lang].push(text);
                }
            } else if (res) {
                const val = compactURI(res, context);
                if (MULTI_VALUED_PROPERTIES.has(key)) {
                    if (!record[key]) record[key] = [];
                    if (!record[key].includes(val)) record[key].push(val);
                } else {
                    if (!record[key]) {
                        record[key] = val;
                    } else {
                        if (!Array.isArray(record[key])) {
                            record[key] = [record[key]];
                        }
                        if (!record[key].includes(val)) record[key].push(val);
                    }
                }
            } else {
                const val = child.textContent.trim();
                if (MULTI_VALUED_PROPERTIES.has(key)) {
                    if (!record[key]) record[key] = [];
                    if (!record[key].includes(val)) record[key].push(val);
                } else {
                    if (!record[key]) {
                        record[key] = val;
                    } else {
                        if (!Array.isArray(record[key])) {
                            record[key] = [record[key]];
                        }
                        if (!record[key].includes(val)) record[key].push(val);
                    }
                }
            }
        }

        // Post-process type
        record["@type"] = types.length === 1 ? types[0] : types;

        // Match source URNs/URIs from axiomIndex
        if (axiomIndex.has(uri)) {
            const axiomSources = axiomIndex.get(uri);
            if (axiomSources && axiomSources.length > 0) {
                if (!record["dcterms:source"]) {
                    record["dcterms:source"] = [];
                } else if (!Array.isArray(record["dcterms:source"])) {
                    record["dcterms:source"] = [record["dcterms:source"]];
                }
                for (let src of axiomSources) {
                    const compactedSrc = compactURI(src, context);
                    if (!record["dcterms:source"].includes(compactedSrc)) {
                        record["dcterms:source"].push(compactedSrc);
                    }
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
    if (typeof rawUrn !== 'string') return null;

    const normalizedUrn = rawUrn.toLowerCase().trim();
    if (!normalizedUrn.startsWith('urn:iso:std:')) return null;

    // Isolate document elements (clause, figure, table, term, sec, annex, bib, foreword, intro, scope, normative_references) and additions (tech)
    const documentElementRegex = /:(clause|figure|table|term|tech|sec|annex|bib|foreword|intro|scope|normative_references)(:|$)/;
    const regexMatch = normalizedUrn.match(documentElementRegex);

    let documentIdentifier = normalizedUrn;
    let documentElement = '';

    if (regexMatch) {
        documentIdentifier = normalizedUrn.substring(0, regexMatch.index);
        documentElement = normalizedUrn.substring(regexMatch.index);
    }

    // RFC 5141 valid ISO 639-1 alpha-2 language codes
    const languageRegex = /:(en|fr|ru|es|ar)(,(en|fr|ru|es|ar))*$/;

    // Inject 'en' fallback if no valid language tag terminates the document identifier
    if (!languageRegex.test(documentIdentifier)) {
        documentIdentifier += ':en';
    }

    // Combine and strip the 'urn:' prefix to form the OBP hash fragment
    const formattedHashFragment = (documentIdentifier + documentElement).replace(/^urn:/, '');
    
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
    
    if (value.toLowerCase().startsWith('urn:iso:std:')) {
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
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Resolves a language-specific annotation from a JSON-LD language map.
 * Checks for en-GB, en, and falls back to the first available language value.
 * @param {Object} langMap - The language map object.
 * @returns {string} The resolved text string.
 */
function getPreferredLang(langMap) {
    if (!langMap || typeof langMap !== 'object') return "";
    return langMap["en-GB"] || langMap["en"] || Object.values(langMap)[0] || "";
}

/**
 * Normalizes the JSON-LD entity types to a readable type string.
 * @param {string|string[]} type - The type or list of types.
 * @returns {string} The normalized type name (Class, Named Individual, or default type).
 */
function getEntityType(type) {
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("owl:Class")) return "Class";
    if (types.includes("owl:NamedIndividual")) return "Named Individual";
    return types[0] || "";
}

/**
 * Extracts and parses the UUID from the URN identifier.
 * @param {Object} row - The parsed JSON-LD entity record.
 * @returns {string} The extracted UUID.
 */
function getUuid(row) {
    const idVal = row["dcterms:identifier"];
    if (!idVal) return "";
    const ids = Array.isArray(idVal) ? idVal : [idVal];
    const uuidId = ids.find(id => typeof id === 'string' && id.startsWith("urn:uuid:"));
    if (uuidId) return uuidId.substring(9);
    const firstId = ids.find(id => typeof id === 'string');
    return firstId || "";
}

/**
 * Resolves the class type for a NamedIndividual entity.
 * @param {Object} row - The parsed JSON-LD entity record.
 * @param {Object} context - The JSON-LD context map.
 * @returns {string} The expanded IRI of the class type.
 */
function getClassOfNamedIndividual(row, context) {
    const type = row["@type"];
    if (Array.isArray(type)) {
        const specificType = type.find(t => t !== "owl:NamedIndividual");
        return specificType ? expandURI(specificType, context) : "";
    }
    return "";
}

/**
 * Formats the list of subclasses into a plain text representation for export.
 * @param {any} scList - The subclass or array of subclasses/restrictions.
 * @param {Object} context - The JSON-LD context map.
 * @returns {string} The formatted newline-separated plain text.
 */
function formatSuperClassesText(scList, context) {
    if (!scList) return "";
    const list = Array.isArray(scList) ? scList : [scList];
    return list
        .filter(item => typeof item === 'string')
        .map(item => expandURI(item, context))
        .join('\n');
}

/**
 * Formats the list of subclasses into an HTML representation for display.
 * @param {any} scList - The subclass or array of subclasses/restrictions.
 * @param {Object} context - The JSON-LD context map.
 * @returns {string} The formatted HTML string containing anchor links.
 */
function formatSubClassOfHtml(scList, context) {
    if (!scList) return "";
    const list = Array.isArray(scList) ? scList : [scList];
    return list
        .filter(item => typeof item === 'string')
        .map(item => createLink(expandURI(item, context), false))
        .join('<br>');
}

/**
 * Triggers a download of the provided JSON-LD ontology data as a CSV file.
 * @param {Object} ontologyLd - The full parsed ontology JSON-LD document.
 * @param {string} [filename="Ontology Vocabulary.csv"] - The name of the file to save.
 */
function exportCSV(ontologyLd, filename = "Ontology Vocabulary.csv") {
    if (!ontologyLd) return;

    const context = ontologyLd["@context"] || {};
    const rawGraph = ontologyLd["@graph"] || [];

    // Filter out dcat:Dataset and dcat:Distribution from CSV representation
    const graph = rawGraph.filter(row => {
        const type = row["@type"];
        if (Array.isArray(type)) {
            return !type.includes("dcat:Dataset") && !type.includes("dcat:Distribution");
        }
        return type !== "dcat:Dataset" && type !== "dcat:Distribution";
    });

    const headers = [
        "Entity Type", "UUID", "URI", "Preferred Label", "Definition", 
        "Sources", "Creator", "Created At", "Modified At", "Superclasses", 
        "Class of Named Individual"
    ];

    const csvRows = [headers.join(",")];

    for (const row of graph) {
        const entityType = getEntityType(row["@type"]);
        const uuid = getUuid(row);
        const uri = row["@id"] || "";
        const preferredLabel = getPreferredLang(row["skos:prefLabel"]);
        const definition = getPreferredLang(row["skos:definition"]);
        
        let sourcesList = [];
        const rawSources = row["dcterms:source"];
        if (rawSources) {
            if (Array.isArray(rawSources)) {
                sourcesList = rawSources.map(src => {
                    if (typeof src === 'object' && src !== null) {
                        return getPreferredLang(src);
                    }
                    return expandURI(src, context);
                });
            } else if (typeof rawSources === 'object') {
                sourcesList = [getPreferredLang(rawSources)];
            } else {
                sourcesList = [expandURI(rawSources, context)];
            }
        }
        const sources = sourcesList.join('\n');
            
        const creator = expandURI(row["dcterms:creator"] || "", context);
        const createdAt = row["dcterms:created"] || "";
        const modifiedAt = row["dcterms:modified"] || "";
        const superclasses = formatSuperClassesText(row["rdfs:subClassOf"], context);
        const classOfNamedIndividual = getClassOfNamedIndividual(row, context);

        const values = [
            entityType, uuid, uri, preferredLabel, definition,
            sources, creator, createdAt, modifiedAt, 
            superclasses, classOfNamedIndividual
        ].map(value => {
            let safeVal = String(value || "");
            if (safeVal.match(/^[=+\-@]/)) safeVal = "'" + safeVal;
            if (safeVal.includes(",") || safeVal.includes('"') || safeVal.includes("\n")) {
                safeVal = `"${safeVal.replace(/"/g, '""')}"`;
            }
            return safeVal;
        });
        csvRows.push(values.join(","));
    }

    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Triggers a download of the provided JSON-LD ontology data as a .json file.
 * @param {Object} ontologyLd - The full parsed ontology JSON-LD document.
 * @param {string} [filename="Ontology Vocabulary.json"] - The name of the file to save.
 */
function exportJSON(ontologyLd, filename = "Ontology Vocabulary.json") {
    if (!ontologyLd) return;

    const jsonString = JSON.stringify(ontologyLd, null, 2);
    const blob = new Blob([jsonString], { type: 'application/ld+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}