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
 * Fetches and parses an OWL XML document from a given URL.
 * @async
 * @param {string} url - The URL of the XML file to load.
 * @returns {Promise<{title: string, data: Array<Object>}>} The extracted ontology title and processed data.
 * @throws {Error} If the file cannot be loaded or parsed.
 */
async function loadAndProcessXML(url) {
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

    let ontologyTitle = "";
    let ontologyModified = "";
    const ontologyNode = xmlDoc.getElementsByTagNameNS(NS.owl, "Ontology")[0];
    if (ontologyNode) {
        ontologyTitle = getPreferredLangText(ontologyNode, NS.dcterms, "title");
        
        const modifiedNode = ontologyNode.getElementsByTagNameNS(NS.dcterms, "modified")[0];
        if (modifiedNode) {
            ontologyModified = modifiedNode.textContent.trim();
        }
    }

    const ontologyData = extractOntologyData(xmlDoc);

    return {
        title: ontologyTitle,
        modified: ontologyModified,
        data: ontologyData
    };
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

/**
 * Extracts the preferred language text from an element, falling back to en-GB, en, or the first available.
 * @param {Element} element - The XML element to extract text from.
 * @param {string} ns - The namespace URI.
 * @param {string} tag - The tag name to extract.
 * @returns {string} The trimmed text content.
 */
function getPreferredLangText(element, ns, tag) {
    const nodes = [];
    for (let child of element.children) {
        if (child.namespaceURI === ns && child.localName === tag) {
            nodes.push(child);
        }
    }
    if (nodes.length === 0) return "";
    
    let enGB = null, en = null, first = nodes[0].textContent;
    
    for (let node of nodes) {
        const lang = node.getAttribute("xml:lang") || node.getAttributeNS(NS.xml, "lang");
        if (lang === "en-GB") enGB = node.textContent;
        if (lang === "en") en = node.textContent;
    }
    
    return (enGB || en || first).trim();
}

/**
 * Extracts and maps ontology objects into a standardized data format.
 * @param {Document} xmlDoc - The parsed XML document.
 * @returns {Array<Object>} The array of processed ontology records.
 */
function extractOntologyData(xmlDoc) {
    const results = [];
    const axiomIndex = buildAxiomIndex(xmlDoc);
    
    const classes = Array.from(xmlDoc.getElementsByTagNameNS(NS.owl, "Class"));
    const individuals = Array.from(xmlDoc.getElementsByTagNameNS(NS.owl, "NamedIndividual"));
    const allElements = classes.concat(individuals);

    for (let element of allElements) {
        const uri = element.getAttributeNS(NS.rdf, "about") || "";
        
        if (!uri.startsWith("https://haddenindustries.com/")) continue;

        const isNamedIndividual = element.localName === "NamedIndividual";
        
        let skip = false;
        let uuid = "";
        const sources = [];
        let creator = "";
        let createdAt = "";
        let modifiedAt = "";
        const subClassOf = [];
        let classOfNamedIndividual = "";
        
        const dctermsIdentifiers = [];
        const dctermsSources = [];

        // Single-pass direct child iteration
        for (let child of element.children) {
            const ns = child.namespaceURI;
            const name = child.localName;

            if (ns === NS.rdf && name === "type") {
                const typeRes = child.getAttributeNS(NS.rdf, "resource") || "";
                if (isNamedIndividual) {
                    if (typeRes === NS.dcat + "Dataset" || typeRes === NS.dcat + "Distribution") {
                        skip = true;
                        break;
                    }
                }
                if (!classOfNamedIndividual) {
                    classOfNamedIndividual = typeRes;
                }
            } else if (ns === NS.dcterms && name === "identifier") {
                dctermsIdentifiers.push(child);
            } else if (ns === NS.dcterms && name === "source") {
                const res = child.getAttributeNS(NS.rdf, "resource");
                if (res) dctermsSources.push(res);
            } else if (ns === NS.dcterms && name === "creator") {
                creator = child.getAttributeNS(NS.rdf, "resource") || "";
            } else if (ns === NS.dcterms && name === "created") {
                createdAt = child.textContent.trim();
            } else if (ns === NS.dcterms && name === "modified") {
                modifiedAt = child.textContent.trim();
            } else if (ns === NS.rdfs && name === "subClassOf") {
                const res = child.getAttributeNS(NS.rdf, "resource");
                if (res) subClassOf.push(res);
            }
        }

        if (skip) continue;

        // Process UUID
        for (let id of dctermsIdentifiers) {
            const res = id.getAttributeNS(NS.rdf, "resource");
            if (res && res.startsWith("urn:uuid:")) {
                uuid = res.substring(9);
                break;
            }
        }

        // Process Sources
        if (uri.startsWith("https://haddenindustries.com/ontology/iso")) {
            for (let id of dctermsIdentifiers) {
                const res = id.getAttributeNS(NS.rdf, "resource");
                const text = id.textContent;
                if (res && res.startsWith("urn:iso")) {
                    sources.push(res);
                    break;
                } else if (text && text.startsWith("urn:iso")) {
                    sources.push(text);
                    break;
                }
            }
        }

        if (sources.length === 0) {
            if (dctermsSources.length > 0) {
                sources.push(...dctermsSources);
            } else if (axiomIndex.has(uri)) {
                sources.push(...axiomIndex.get(uri));
            }
        }

        const record = {
            objectType: element.localName === "Class" ? "Class" : (element.localName === "NamedIndividual" ? "Named Individual" : element.localName),
            uuid: uuid,
            uri: uri,
            preferredLabel: getPreferredLangText(element, NS.skos, "prefLabel"),
            definition: getPreferredLangText(element, NS.skos, "definition"),
            sources: sources,
            creator: creator,
            createdAt: createdAt,
            modifiedAt: modifiedAt,
            subClassOf: subClassOf,
            classOfNamedIndividual: classOfNamedIndividual
        };

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
 * Triggers a download of the provided ontology data as a CSV file.
 * @param {Array<Object>} ontologyData - The array of parsed ontology records.
 * @param {string} [filename="Ontology Vocabulary.csv"] - The name of the file to save.
 */
function exportCSV(ontologyData, filename = "Ontology Vocabulary.csv") {
    if (!ontologyData || ontologyData.length === 0) return;

    const headers = [
        "Entity Type", "UUID", "URI", "Preferred Label", "Definition", 
        "Sources", "Creator", "Created At", "Modified At", "Superclasses", 
        "Class of Named Individual"
    ];

    const csvRows = [headers.join(",")];

    for (const row of ontologyData) {
        const values = [
            row.objectType, row.uuid, row.uri, row.preferredLabel, row.definition,
            row.sources.join('\n'), row.creator, row.createdAt, row.modifiedAt, 
            row.subClassOf.join('\n'), row.classOfNamedIndividual
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