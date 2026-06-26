const NS = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    owl: "http://www.w3.org/2002/07/owl#",
    dcterms: "http://purl.org/dc/terms/",
    skos: "http://www.w3.org/2004/02/skos/core#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    xml: "http://www.w3.org/XML/1998/namespace",
    dcat: "http://www.w3.org/ns/dcat#"
};

async function loadAndProcessXML(url) {
    const response = await fetch(url).catch(() => null);
    
    if (!response || !response.ok) {
        throw new Error(`File at '${url}' not found or could not be loaded.`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Error parsing XML document");
    }

    let ontologyTitle = "";
    const ontologyNode = xmlDoc.getElementsByTagNameNS(NS.owl, "Ontology")[0];
    if (ontologyNode) {
        ontologyTitle = getPreferredLangText(ontologyNode, NS.dcterms, "title");
    }

    const ontologyData = extractOntologyData(xmlDoc);

    return {
        title: ontologyTitle,
        data: ontologyData
    };
}

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

function getPreferredLangText(element, ns, tag) {
    const nodes = element.getElementsByTagNameNS(ns, tag);
    if (nodes.length === 0) return "";
    
    let enGB = null, en = null, first = nodes[0].textContent;
    
    for (let node of nodes) {
        const lang = node.getAttribute("xml:lang") || node.getAttributeNS(NS.xml, "lang");
        if (lang === "en-GB") enGB = node.textContent;
        if (lang === "en") en = node.textContent;
    }
    
    return (enGB || en || first).trim();
}

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
        
        if (isNamedIndividual) {
            const types = element.getElementsByTagNameNS(NS.rdf, "type");
            let skip = false;
            for (let type of types) {
                const typeRes = type.getAttributeNS(NS.rdf, "resource");
                if (typeRes === NS.dcat + "Dataset" || typeRes === NS.dcat + "Distribution") {
                    skip = true;
                    break;
                }
            }
            if (skip) continue;
        }

        const record = {
            objectType: element.localName === "Class" ? "Class" : (element.localName === "NamedIndividual" ? "Named Individual" : element.localName),
            uuid: "",
            uri: uri,
            preferredLabel: getPreferredLangText(element, NS.skos, "prefLabel"),
            definition: getPreferredLangText(element, NS.skos, "definition"),
            sources: [],
            creator: "",
            createdAt: "",
            modifiedAt: "",
            subClassOf: [],
            classOfNamedIndividual: ""
        };

        // Extract UUID
        const identifiers = element.getElementsByTagNameNS(NS.dcterms, "identifier");
        for (let id of identifiers) {
            const res = id.getAttributeNS(NS.rdf, "resource");
            if (res && res.startsWith("urn:uuid:")) {
                record.uuid = res.substring(9);
                break;
            }
        }

        // Extract Sources as Array
        if (uri.startsWith("https://haddenindustries.com/ontology/iso")) {
            for (let id of identifiers) {
                const res = id.getAttributeNS(NS.rdf, "resource");
                const text = id.textContent;
                if (res && res.startsWith("urn:iso")) {
                    record.sources.push(res);
                    break;
                }
                else if (text && text.startsWith("urn:iso")) {
                    record.sources.push(text);
                    break;
                }
            }
        }
        if (record.sources.length === 0) {
            const dctermsSources = Array.from(element.getElementsByTagNameNS(NS.dcterms, "source"));
            const validSources = dctermsSources
                .map(src => src.getAttributeNS(NS.rdf, "resource"))
                .filter(res => res);
            
            if (validSources.length > 0) {
                record.sources = validSources;
            } else if (axiomIndex.has(uri)) {
                record.sources = axiomIndex.get(uri);
            }
        }

        // Extract Creator
        const creatorNode = element.getElementsByTagNameNS(NS.dcterms, "creator")[0];
        if (creatorNode) record.creator = creatorNode.getAttributeNS(NS.rdf, "resource") || "";

        // Extract Dates
        const createdNode = element.getElementsByTagNameNS(NS.dcterms, "created")[0];
        if (createdNode) record.createdAt = createdNode.textContent.trim();
        
        const modifiedNode = element.getElementsByTagNameNS(NS.dcterms, "modified")[0];
        if (modifiedNode) record.modifiedAt = modifiedNode.textContent.trim();

        // Extract SubClassOf as Array
        const subClassNodes = Array.from(element.getElementsByTagNameNS(NS.rdfs, "subClassOf"));
        record.subClassOf = subClassNodes
            .map(node => node.getAttributeNS(NS.rdf, "resource"))
            .filter(res => res);

        // Extract Class of Named Individual
        const typeNode = element.getElementsByTagNameNS(NS.rdf, "type")[0];
        if (typeNode) record.classOfNamedIndividual = typeNode.getAttributeNS(NS.rdf, "resource") || "";

        results.push(record);
    }
    
    return results;
}

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

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function exportCSV(ontologyData) {
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
    link.setAttribute("download", "ontology_extract.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}