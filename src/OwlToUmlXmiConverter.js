/**
 * @fileoverview ES6 Module for converting OWL/RDF/SKOS schemas into UML XMI format.
 * Designed to replace legacy client-side XSLT transformations due to Chromium Issue #435623334.
 * Implements strict namespace-safe DOM construction and O(N) memory map indexing.
 */

export class OwlToUmlXmiConverter {
  /**
   * Immutable Configuration Matrix defining transformation rules, prefixes, and data mappings.
   * Centralizing these parameters ensures long-term extensibility without altering procedural logic.
   * @type {Object}
   */
  static CONVERTER_MAPPING_RULES = Object.freeze({
    NAMESPACES: {
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/",
      xmi: "http://schema.omg.org/spec/XMI/2.1",
      uml: "http://schema.omg.org/spec/UML/2.1",
      owl: "http://www.w3.org/2002/07/owl#",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      skos: "http://www.w3.org/2004/02/skos/core#",
      dcterms: "http://purl.org/dc/terms/",
      schema: "http://schema.org/",
      parsererror: "http://www.mozilla.org/newlayout/xml/parsererror.xml",
    },
    PREFIX_TRANSLATIONS: {
      "https://haddenindustries.com/ontology/universal/core/": "uc:",
      "https://haddenindustries.com/ontology/universal/reference-data/": "urd:",
      "https://haddenindustries.com/ontology/universal/extended/": "ue:",
      "https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/": "md:",
      "http://www.w3.org/2004/02/skos/core#": "skos:",
      "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
      "http://www.w3.org/2002/07/owl#": "owl:",
      "http://www.w3.org/2006/time#": "time:",
      "http://www.w3.org/ns/time/gregorian/": "greg:",
    },
    DATATYPE_RANGES: {
      "#decimal": "prim_Decimal",
      "#integer": "prim_Integer",
      "#int": "prim_Integer",
      "#boolean": "prim_Boolean",
      "#dateTime": "prim_DateTime",
      "#date": "prim_DateTime",
    },
    LANG_PRIORITY: ["en-gb", "en"],
  });

  /**
   * Initializes the converter and parses the input XML string into a safe DOM structure.
   * @param {string} xmlString - The source OWL/RDF XML payload.
   * @throws {Error} If the XML string is fundamentally malformed or triggers a browser parser error.
   */
  constructor(xmlString) {
    this.domParser = new DOMParser();
    this.xmlSerializer = new XMLSerializer();

    // Parse input XML safely under strict XML validation rules.
    this.sourceDoc = this.domParser.parseFromString(xmlString, "text/xml");

    // Defensive check for parser errors, adhering to cross-browser namespace definitions.
    // A parsererror node indicates the XML is structurally broken.
    const parserError = this.sourceDoc.getElementsByTagNameNS(OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.parsererror, "parsererror")[0] || this.sourceDoc.querySelector("parsererror");

    if (parserError) {
      throw new Error(`XML Parsing Error: ${parserError.textContent}`);
    }

    // Trigger the O(N) memory mapping phase immediately upon successful parsing.
    this._initializeMemoryMaps();
  }

  /**
   * Single O(N) scan across the parsed document to establish O(1) in-memory lookups.
   * Prevents polynomial time complexity (O(N^2)) execution latency during generation.
   * @private
   */
  _initializeMemoryMaps() {
    this.indexes = {
      classes: new Map(), // Key: URI -> Array of elements defining/referencing the class
      classDefs: new Map(), // Key: URI -> owl:Class definition node
      datatypeProps: new Map(), // Key: domain URI -> Array of owl:DatatypeProperty nodes
      objectProps: new Map(), // Key: domain URI -> Array of owl:ObjectProperty nodes
      allObjectProps: [], // Array of all valid object properties for association building
      axioms: new Map(), // Key: "annotatedSource|annotatedProperty" -> Array of owl:Axiom nodes
      restrictions: new Map(), // Key: "classURI|onPropertyURI" -> Array of owl:Restriction nodes
    };

    const root = this.sourceDoc.documentElement;
    this._walkNode(root);
  }

  /**
   * Recursive tree walker utilized by the initialization routine to populate indexes.
   * @param {Element} node - The current DOM element undergoing evaluation.
   * @private
   */
  _walkNode(node) {
    // Process only Element nodes (NodeType 1), ignoring text and comment nodes.
    if (node.nodeType !== 1) return;

    const ns = node.namespaceURI;
    const localName = node.localName;
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;

    const about = this._getAttributeSafe(node, rules.rdf, "about");
    const resource = this._getAttributeSafe(node, rules.rdf, "resource");
    const uri = about || resource;

    // 1. Class Identifiers: Group all semantic references to a specific class entity.
    if ((ns === rules.owl && localName === "Class") || (ns === rules.rdfs && localName === "subClassOf" && resource && !resource.includes("http://www.w3.org/2001/XMLSchema#")) || (ns === rules.rdfs && localName === "domain" && resource) || (ns === rules.rdfs && localName === "range" && resource && !resource.includes("http://www.w3.org/2001/XMLSchema#")) || (ns === rules.owl && localName === "onClass" && resource)) {
      const classUri = (about || "") + (resource || "");
      if (classUri) {
        if (!this.indexes.classes.has(classUri)) this.indexes.classes.set(classUri, []);
        this.indexes.classes.get(classUri).push(node);
      }
    }

    // Specific mapping for primary owl:Class definitions.
    if (ns === rules.owl && localName === "Class" && uri) {
      this.indexes.classDefs.set(uri, node);
    }

    // 2. Datatype Properties: Hash attributes based on their contextual domain.
    if (ns === rules.owl && localName === "DatatypeProperty" && about) {
      const domainNode = this._getChildNode(node, rules.rdfs, "domain");
      const domainUri = this._getAttributeSafe(domainNode, rules.rdf, "resource");
      if (domainUri) {
        if (!this.indexes.datatypeProps.has(domainUri)) this.indexes.datatypeProps.set(domainUri, []);
        this.indexes.datatypeProps.get(domainUri).push(node);
      }
    }

    // 3. Object Properties: Hash relational links based on their domain context.
    if (ns === rules.owl && localName === "ObjectProperty" && about) {
      const domainNode = this._getChildNode(node, rules.rdfs, "domain");
      const rangeNode = this._getChildNode(node, rules.rdfs, "range");
      const domainUri = this._getAttributeSafe(domainNode, rules.rdf, "resource");
      const rangeUri = this._getAttributeSafe(rangeNode, rules.rdf, "resource");

      if (domainUri) {
        if (!this.indexes.objectProps.has(domainUri)) this.indexes.objectProps.set(domainUri, []);
        this.indexes.objectProps.get(domainUri).push(node);
      }
      if (domainUri && rangeUri) {
        this.indexes.allObjectProps.push(node);
      }
    }

    // 4. Restrictions: Map structural limits to their parent class and target property.
    if (ns === rules.owl && localName === "Restriction") {
      const onPropNode = this._getChildNode(node, rules.owl, "onProperty");
      const propUri = this._getAttributeSafe(onPropNode, rules.rdf, "resource");

      // Navigate up the DOM tree to locate the parent Class URI.
      let parentClassNode = node.parentNode;
      while (parentClassNode && parentClassNode.localName !== "Class") {
        parentClassNode = parentClassNode.parentNode;
      }

      if (parentClassNode && propUri) {
        const classUri = this._getAttributeSafe(parentClassNode, rules.rdf, "about");
        if (classUri) {
          const key = `${classUri}|${propUri}`;
          if (!this.indexes.restrictions.has(key)) this.indexes.restrictions.set(key, []);
          this.indexes.restrictions.get(key).push(node);
        }
      }
    }

    // 5. Reified Axioms: Hash metadata annotations for instant sub-note lookups.
    if (ns === rules.owl && localName === "Axiom") {
      const sourceNode = this._getChildNode(node, rules.owl, "annotatedSource");
      const propNode = this._getChildNode(node, rules.owl, "annotatedProperty");
      const sourceUri = this._getAttributeSafe(sourceNode, rules.rdf, "resource");
      const propUri = this._getAttributeSafe(propNode, rules.rdf, "resource");

      if (sourceUri && propUri) {
        const key = `${sourceUri}|${propUri}`;
        if (!this.indexes.axioms.has(key)) this.indexes.axioms.set(key, []);
        this.indexes.axioms.get(key).push(node);
      }
    }

    // Recursively evaluate all child elements.
    for (const child of node.children) {
      this._walkNode(child);
    }
  }

  /**
   * Executes the main transformation pipeline and returns the serialized XML payload.
   * @returns {string} Fully formed, namespace-compliant UML XMI document.
   */
  convert() {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES;

    // Initialize the base Output Document ensuring primary namespace validity.
    this.targetDoc = document.implementation.createDocument(rules.NAMESPACES.xmi, "xmi:XMI", null);
    const root = this.targetDoc.documentElement;

    // Safely set root namespace bindings utilizing the specific XMLNS URI.
    root.setAttributeNS(rules.NAMESPACES.xmi, "xmi:version", "2.1");
    root.setAttributeNS(rules.NAMESPACES.xmlns, "xmlns:xmi", rules.NAMESPACES.xmi);
    root.setAttributeNS(rules.NAMESPACES.xmlns, "xmlns:uml", rules.NAMESPACES.uml);

    // Fetch primary Ontology metadata for the root model wrapper.
    const ontologyNode = this._getChildNode(this.sourceDoc.documentElement, rules.NAMESPACES.owl, "Ontology");

    const titleNodes = ontologyNode ? Array.from(ontologyNode.children).filter((c) => (c.namespaceURI === rules.NAMESPACES.dcterms && c.localName === "title") || (c.namespaceURI === rules.NAMESPACES.rdfs && c.localName === "label")) : [];
    const ontologyTitle = this._getPreferredLangText(titleNodes) || "UniversalOntologyModel";

    // Create the core uml:Model element.
    const modelEl = this._createElement(null, "uml:Model");
    this._setAttribute(modelEl, rules.NAMESPACES.xmi, "xmi:type", "uml:Model");
    this._setAttribute(modelEl, rules.NAMESPACES.xmi, "xmi:id", "model");
    this._setAttribute(modelEl, null, "name", ontologyTitle);

    // Process overarching metadata assignment for the model.
    if (ontologyNode) {
      const ontUuid = this._extractUuid(ontologyNode);
      if (ontUuid) this._setAttribute(modelEl, rules.NAMESPACES.xmi, "xmi:uuid", ontUuid);

      const modelDesc = this._buildModelDescription(ontologyNode);
      if (modelDesc) {
        const commentEl = this._createCommentElement("comment_model", modelDesc);
        modelEl.appendChild(commentEl);
      }
    }

    // Inject Standard Primitive Types required by XMI validation.
    const primitives = ["String", "Integer", "Decimal", "Boolean", "DateTime"];
    primitives.forEach((prim) => {
      const pEl = this._createElement(null, "packagedElement");
      this._setAttribute(pEl, rules.NAMESPACES.xmi, "xmi:type", "uml:PrimitiveType");
      this._setAttribute(pEl, rules.NAMESPACES.xmi, "xmi:id", `prim_${prim}`);
      this._setAttribute(pEl, null, "name", prim);
      modelEl.appendChild(pEl);
    });

    // Generate UML Classes and embed their attributes.
    for (const classUri of this.indexes.classes.keys()) {
      if (!classUri || classUri.trim() === "") continue;

      const defNode = this.indexes.classDefs.get(classUri);
      if (!defNode) continue; // Terminate if no formal class definition exists.

      const classId = this._getId(classUri);
      const className = this._getClassName(defNode, classUri);
      const uuid = this._extractUuid(defNode);

      const classEl = this._createElement(null, "packagedElement");
      this._setAttribute(classEl, rules.NAMESPACES.xmi, "xmi:type", "uml:Class");
      this._setAttribute(classEl, rules.NAMESPACES.xmi, "xmi:id", classId);
      this._setAttribute(classEl, null, "name", className);
      if (uuid) this._setAttribute(classEl, rules.NAMESPACES.xmi, "xmi:uuid", uuid);

      // Execute Generalization / Superclass mapping operations.
      const superClasses = Array.from(defNode.children).filter((c) => c.namespaceURI === rules.NAMESPACES.rdfs && c.localName === "subClassOf");

      superClasses.forEach((sc) => {
        const superUri = this._getAttributeSafe(sc, rules.NAMESPACES.rdf, "resource");
        if (superUri && !superUri.includes("http://www.w3.org/2001/XMLSchema#")) {
          const superId = this._getId(superUri);
          const genId = `gen_${classId}_${superId}`;
          const genEl = this._createElement(null, "generalization");
          this._setAttribute(genEl, rules.NAMESPACES.xmi, "xmi:type", "uml:Generalization");
          this._setAttribute(genEl, rules.NAMESPACES.xmi, "xmi:id", genId);
          this._setAttribute(genEl, null, "general", superId);
          classEl.appendChild(genEl);
        }
      });

      // Generate ISO-compliant class documentation blocks.
      const finalDesc = this._generateCommentBody(classUri, defNode, uuid);
      if (finalDesc) {
        const commentEl = this._createCommentElement(`comment_${classId}`, finalDesc);
        classEl.appendChild(commentEl);
      }

      // Append standard Datatype Properties as UML Attributes.
      const dtProps = this.indexes.datatypeProps.get(classUri) || [];
      dtProps.forEach((prop) => {
        const propEl = this._buildAttributeElement(prop, classUri, true);
        if (propEl) classEl.appendChild(propEl);
      });

      // Append Object Properties as associative attributes.
      const objProps = this.indexes.objectProps.get(classUri) || [];
      objProps.forEach((prop) => {
        const propEl = this._buildAttributeElement(prop, classUri, false);
        if (propEl) classEl.appendChild(propEl);
      });

      modelEl.appendChild(classEl);
    }

    // Generate standalone formal UML Associations globally.
    this.indexes.allObjectProps.forEach((prop) => {
      const assocEl = this._buildAssociationElement(prop);
      if (assocEl) modelEl.appendChild(assocEl);
    });

    root.appendChild(modelEl);
    return this.xmlSerializer.serializeToString(this.targetDoc);
  }

  /**
   * Translates a semantic URI into a safe XML ID utilizing the configuration matrix.
   * Avoids deep conditional trees by iterating over the mapped translation rules.
   * @param {string} uri - The source entity URI.
   * @returns {string} The sanitized XML ID.
   * @private
   */
  _getId(uri) {
    if (!uri) return "";
    const trimmed = uri.trim();
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.PREFIX_TRANSLATIONS;

    for (const [prefixBase, replacement] of Object.entries(rules)) {
      if (trimmed.startsWith(prefixBase)) {
        const rest = trimmed.substring(prefixBase.length);
        return replacement + rest.replace(/[:/#.]/g, "____");
      }
    }
    return trimmed.replace(/[:/#.]/g, "____");
  }

  /**
   * Evaluates language preference cascade based on configuration priorities.
   * Ensures strings default to specific dialects before falling back to untagged variants.
   * @param {Array<Element>} nodes - An array of XML elements containing text content.
   * @returns {string} The optimally prioritized text string.
   * @private
   */
  _getPreferredLangText(nodes) {
    if (!nodes || nodes.length === 0) return "";
    const priorities = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.LANG_PRIORITY;

    for (const lang of priorities) {
      const match = nodes.find((n) => {
        const l = this._getAttributeSafe(n, OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.xml, "lang");
        return l && l.toLowerCase() === lang;
      });
      if (match) return match.textContent.trim();
    }

    // Execute fallback to the first available content node.
    return nodes[0].textContent.trim();
  }

  /**
   * Extracts the local name resource segment from a complex URI.
   * @param {string} uri - The target contextual URI.
   * @returns {string} The localized resource name.
   * @private
   */
  _getLocalName(uri) {
    if (!uri) return "";
    if (uri.includes("#")) return uri.substring(uri.lastIndexOf("#") + 1);
    if (uri.includes("/")) return uri.substring(uri.lastIndexOf("/") + 1);
    return uri;
  }

  /**
   * Fetches Class name metadata evaluating preferred SKOS/RDFS label priorities.
   * @param {Element} defNode - The formal Class Definition XML node.
   * @param {string} classUri - The specific URI of the target class.
   * @returns {string} The syntactically resolved class name.
   * @private
   */
  _getClassName(defNode, classUri) {
    const skosNs = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.skos;
    const rdfsNs = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.rdfs;

    const nodes = Array.from(defNode.children).filter((c) => (c.namespaceURI === skosNs && c.localName === "prefLabel") || (c.namespaceURI === rdfsNs && c.localName === "label"));

    const prefName = this._getPreferredLangText(nodes);
    return prefName !== "" ? prefName : this._getLocalName(classUri);
  }

  /**
   * Safely locates and extracts URN UUID strings embedded within DC terms.
   * Defensively queries both formal attributes and raw element text formats.
   * @param {Element} node - The DOM Element scheduled for extraction.
   * @returns {string|null} The resolved, un-prefixed UUID sequence or null.
   * @private
   */
  _extractUuid(node) {
    if (!node) return null;
    const dcNs = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.dcterms;
    const rdfNs = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES.rdf;

    const idNode = Array.from(node.children).find((c) => c.namespaceURI === dcNs && c.localName === "identifier");
    if (!idNode) return null;

    const val = this._getAttributeSafe(idNode, rdfNs, "resource") || idNode.textContent.trim();
    if (val && val.startsWith("urn:uuid:")) {
      return val.substring("urn:uuid:".length);
    }
    return null;
  }

  /**
   * Assembles complex ISO-compliant comment models (Scope Notes, Examples, Definition).
   * Orchestrates the fetching and mathematical sorting of reified Axioms.
   * @param {string} entityUri - The source contextual URI.
   * @param {Element} defNode - The defining DOM element within the schema.
   * @param {string} uuid - The cryptographically associated UUID.
   * @returns {string} The fully compiled documentation body string.
   * @private
   */
  _generateCommentBody(entityUri, defNode, uuid) {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;
    const parts = [];

    // 1. Definition Evaluation (Prioritizing specific SKOS linguistic tags)
    const defNodes = Array.from(defNode.children).filter((c) => c.namespaceURI === rules.skos && c.localName === "definition");

    const enGbDef = defNodes.find((n) => (this._getAttributeSafe(n, rules.xml, "lang") || "").toLowerCase() === "en-gb");
    const enDef = defNodes.find((n) => (this._getAttributeSafe(n, rules.xml, "lang") || "").toLowerCase() === "en");
    const startEnDef = defNodes.find((n) => (this._getAttributeSafe(n, rules.xml, "lang") || "").toLowerCase().startsWith("en"));
    const noLangDef = defNodes.find((n) => !this._getAttributeSafe(n, rules.xml, "lang"));

    const bestDef = enGbDef || enDef || startEnDef || noLangDef;
    if (bestDef && bestDef.textContent.trim()) {
      parts.push(bestDef.textContent.trim());
    }

    // Helper function for querying, extracting, and numerically sorting Axioms.
    const extractAxiomText = (propUri, prefix, fallbackNodes) => {
      const output = [];
      const axiomKey = `${entityUri}|${propUri}`;
      const axioms = this.indexes.axioms.get(axiomKey) || [];

      const validAxioms = axioms.filter((a) => {
        const targetNode = this._getChildNode(a, rules.owl, "annotatedTarget");
        if (!targetNode) return false;
        const lang = (this._getAttributeSafe(targetNode, rules.xml, "lang") || "").toLowerCase();
        return lang.startsWith("en") || lang === "";
      });

      if (validAxioms.length > 0) {
        // Parse the schema position as a float and apply a stable numeric sorting algorithm.
        validAxioms.sort((a, b) => {
          const posA = parseFloat((this._getChildNode(a, rules.schema, "position") || {}).textContent || "0");
          const posB = parseFloat((this._getChildNode(b, rules.schema, "position") || {}).textContent || "0");
          return posA - posB;
        });

        validAxioms.forEach((ax, idx) => {
          const targetText = this._getChildNode(ax, rules.owl, "annotatedTarget").textContent.trim();
          const positionVal = (this._getChildNode(ax, rules.schema, "position") || {}).textContent;
          const token = prefix === "Note" ? `Note ${idx + 1} to entry: ` : `EXAMPLE ${positionVal}:\n`;
          output.push(`${token}${targetText}`);
        });
      } else {
        // Programmatic fallback to direct child nodes if reified axioms are entirely absent.
        const validNodes = Array.from(fallbackNodes).filter((n) => {
          const lang = (this._getAttributeSafe(n, rules.xml, "lang") || "").toLowerCase();
          return lang.startsWith("en") || lang === "";
        });
        validNodes.forEach((n, idx) => {
          const token = prefix === "Note" ? `Note ${idx + 1} to entry: ` : `EXAMPLE ${idx + 1}:\n`;
          output.push(`${token}${n.textContent.trim()}`);
        });
      }
      return output.join("\n");
    };

    // 2. Scope Notes Extraction
    const scopeNodes = Array.from(defNode.children).filter((c) => c.namespaceURI === rules.skos && c.localName === "scopeNote");
    const scopeText = extractAxiomText("http://www.w3.org/2004/02/skos/core#scopeNote", "Note", scopeNodes);
    if (scopeText) parts.push(scopeText);

    // 3. Examples Extraction
    const exampleNodes = Array.from(defNode.children).filter((c) => c.namespaceURI === rules.skos && c.localName === "example");
    const exampleText = extractAxiomText("http://www.w3.org/2004/02/skos/core#example", "EXAMPLE", exampleNodes);
    if (exampleText) parts.push(exampleText);

    // 4. Source Attribution
    const sourceNode = this._getChildNode(defNode, rules.dcterms, "source");
    if (sourceNode) {
      const srcVal = this._getAttributeSafe(sourceNode, rules.rdf, "resource") || sourceNode.textContent.trim();
      if (srcVal) parts.push(`[SOURCE:${srcVal}]`);
    }

    // 5. Append Structural UUID
    if (uuid && uuid.trim() !== "") {
      parts.push(`[UUID: ${uuid}]`);
    }

    return parts.join("\n");
  }

  /**
   * Constructs UML Property elements (ownedAttributes) for classes.
   * Evaluates XSD primitive bindings versus relational association references.
   * @param {Element} propNode - The targeted Property XML node.
   * @param {string} classUri - The overarching URI of the parent class.
   * @param {boolean} isDatatype - Identifies if processing a Datatype or Object property.
   * @returns {Element} A constructed, namespace-compliant XML Element.
   * @private
   */
  _buildAttributeElement(propNode, classUri, isDatatype) {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;
    const propUri = this._getAttributeSafe(propNode, rules.rdf, "about");
    if (!propUri) return null;

    const propId = this._getId(propUri);
    const propName = this._getClassName(propNode, propUri);
    const uuid = this._extractUuid(propNode);
    const rangeNode = this._getChildNode(propNode, rules.rdfs, "range");
    const rangeUri = this._getAttributeSafe(rangeNode, rules.rdf, "resource") || "";

    const attrEl = this._createElement(null, "ownedAttribute");
    this._setAttribute(attrEl, rules.xmi, "xmi:type", "uml:Property");
    this._setAttribute(attrEl, rules.xmi, "xmi:id", propId);
    this._setAttribute(attrEl, null, "name", propName);
    this._setAttribute(attrEl, null, "visibility", "public");

    if (uuid) this._setAttribute(attrEl, rules.xmi, "xmi:uuid", uuid);

    if (isDatatype) {
      let typeId = "prim_String";
      for (const [key, val] of Object.entries(OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.DATATYPE_RANGES)) {
        if (rangeUri.includes(key)) {
          typeId = val;
          break;
        }
      }
      this._setAttribute(attrEl, null, "type", typeId);
    } else {
      const rangeId = this._getId(rangeUri);
      const assocId = `assoc_${propId}`;
      this._setAttribute(attrEl, null, "type", rangeId);
      this._setAttribute(attrEl, null, "association", assocId);
    }

    const desc = this._generateCommentBody(propUri, propNode, uuid);
    if (desc) {
      const commentEl = this._createCommentElement(`comment_${propId}`, desc);
      attrEl.appendChild(commentEl);
    }

    // Cardinality Extraction from Restrictions
    let minCard = "0";
    let maxCard = isDatatype ? "1" : "*";

    const restrictionKey = `${classUri}|${propUri}`;
    const restrictions = this.indexes.restrictions.get(restrictionKey) || [];
    if (restrictions.length > 0) {
      const restNode = restrictions[0]; // Isolate the first associated formal restriction
      const extractCard = (names) => {
        for (const name of names) {
          const node = this._getChildNode(restNode, rules.owl, name);
          if (node && node.textContent.trim()) return node.textContent.trim();
        }
        return null;
      };

      const parsedMin = extractCard(["minQualifiedCardinality", "minCardinality", "qualifiedCardinality", "cardinality"]);
      const parsedMax = extractCard(["maxQualifiedCardinality", "maxCardinality", "qualifiedCardinality", "cardinality"]);

      if (parsedMin) minCard = parsedMin;
      if (parsedMax) maxCard = parsedMax;
    }

    const lowerEl = this._createElement(null, "lowerValue");
    this._setAttribute(lowerEl, rules.xmi, "xmi:type", "uml:LiteralInteger");
    this._setAttribute(lowerEl, rules.xmi, "xmi:id", `lower_${propId}`);
    this._setAttribute(lowerEl, null, "value", minCard);

    const upperEl = this._createElement(null, "upperValue");
    this._setAttribute(upperEl, rules.xmi, "xmi:type", "uml:LiteralUnlimitedNatural");
    this._setAttribute(upperEl, rules.xmi, "xmi:id", `upper_${propId}`);
    this._setAttribute(upperEl, null, "value", maxCard);

    attrEl.appendChild(lowerEl);
    attrEl.appendChild(upperEl);

    return attrEl;
  }

  /**
   * Constructs formal UML Association elements connecting discrete object properties.
   * Synthesizes cross-reference bindings ensuring XMI link compliance.
   * @param {Element} propNode - The Targeted ObjectProperty XML node.
   * @returns {Element} A constructed, namespace-compliant XML Element.
   * @private
   */
  _buildAssociationElement(propNode) {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;
    const propUri = this._getAttributeSafe(propNode, rules.rdf, "about");
    if (!propUri) return null;

    const propId = this._getId(propUri);
    const propName = this._getClassName(propNode, propUri);
    const uuid = this._extractUuid(propNode);

    const domainNode = this._getChildNode(propNode, rules.rdfs, "domain");
    const domainUri = this._getAttributeSafe(domainNode, rules.rdf, "resource");
    if (!domainUri) return null;

    const domainId = this._getId(domainUri);
    const assocId = `assoc_${propId}`;
    const srcEndId = `src_${propId}`;

    const assocEl = this._createElement(null, "packagedElement");
    this._setAttribute(assocEl, rules.xmi, "xmi:type", "uml:Association");
    this._setAttribute(assocEl, rules.xmi, "xmi:id", assocId);
    this._setAttribute(assocEl, null, "name", propName);
    if (uuid) this._setAttribute(assocEl, rules.xmi, "xmi:uuid", uuid);

    const memEnd1 = this._createElement(null, "memberEnd");
    this._setAttribute(memEnd1, rules.xmi, "xmi:idref", propId);

    const memEnd2 = this._createElement(null, "memberEnd");
    this._setAttribute(memEnd2, rules.xmi, "xmi:idref", srcEndId);

    const ownedEnd = this._createElement(null, "ownedEnd");
    this._setAttribute(ownedEnd, rules.xmi, "xmi:type", "uml:Property");
    this._setAttribute(ownedEnd, rules.xmi, "xmi:id", srcEndId);
    this._setAttribute(ownedEnd, null, "name", `src_${propName}`);
    this._setAttribute(ownedEnd, null, "type", domainId);
    this._setAttribute(ownedEnd, null, "association", assocId);
    this._setAttribute(ownedEnd, null, "visibility", "public");

    const lowerEl = this._createElement(null, "lowerValue");
    this._setAttribute(lowerEl, rules.xmi, "xmi:type", "uml:LiteralInteger");
    this._setAttribute(lowerEl, rules.xmi, "xmi:id", `lower_${srcEndId}`);
    this._setAttribute(lowerEl, null, "value", "0");

    const upperEl = this._createElement(null, "upperValue");
    this._setAttribute(upperEl, rules.xmi, "xmi:type", "uml:LiteralUnlimitedNatural");
    this._setAttribute(upperEl, rules.xmi, "xmi:id", `upper_${srcEndId}`);
    this._setAttribute(upperEl, null, "value", "*");

    ownedEnd.appendChild(lowerEl);
    ownedEnd.appendChild(upperEl);

    assocEl.appendChild(memEnd1);
    assocEl.appendChild(memEnd2);
    assocEl.appendChild(ownedEnd);

    return assocEl;
  }

  /**
   * Extracts deep text metadata from the root Ontology node to build the Model Comment.
   * @param {Element} ontNode - The primary Ontology XML node.
   * @returns {string} The fully compiled description string payload.
   * @private
   */
  _buildModelDescription(ontNode) {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;
    const parts = [];

    const extractText = (ns, localName, prefix = "") => {
      const node = this._getChildNode(ontNode, ns, localName);
      if (node) {
        const res = this._getAttributeSafe(node, rules.rdf, "resource");
        const txt = res || node.textContent.trim();
        if (txt) parts.push(`${prefix}${txt}`);
      }
    };

    extractText(rules.dcterms, "description");
    extractText(rules.owl, "versionInfo", "Version: ");
    extractText(rules.owl, "versionIRI", "Version IRI: ");
    extractText(rules.dcterms, "created", "Created: ");
    extractText(rules.dcterms, "modified", "Modified: ");
    extractText(rules.dcterms, "publisher", "Publisher: ");
    extractText(rules.dcterms, "rights", "Rights: ");
    extractText(rules.dcterms, "license", "License: ");

    return parts.join("\n");
  }

  /**
   * Generates a standardized uml:Comment wrapper element for insertion.
   * @param {string} id - The specific targeted XMI ID.
   * @param {string} body - The fully assembled text payload.
   * @returns {Element} A structurally valid DOM Element.
   * @private
   */
  _createCommentElement(id, body) {
    const rules = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES;
    const commentEl = this._createElement(null, "ownedComment");
    this._setAttribute(commentEl, rules.xmi, "xmi:type", "uml:Comment");
    this._setAttribute(commentEl, rules.xmi, "xmi:id", id);

    const bodyEl = this._createElement(null, "body");
    bodyEl.textContent = body;
    commentEl.appendChild(bodyEl);

    return commentEl;
  }

  /**
   * Defensive lookup for XML node attributes, effectively ignoring internal prefix mutations.
   * Mitigates errors caused by malformed legacy serializers dynamically altering namespace keys.
   * @param {Element} node - The targeted DOM element.
   * @param {string} namespace - The required URI namespace.
   * @param {string} localName - The strictly unprefixed attribute name.
   * @returns {string|null} The resolved string value if present, else null.
   * @private
   */
  _getAttributeSafe(node, namespace, localName) {
    if (!node || !node.hasAttributeNS) return null;
    if (node.hasAttributeNS(namespace, localName)) {
      return node.getAttributeNS(namespace, localName);
    }
    // Iterate through physical attributes as a secondary fallback strategy
    // for parsers that have unexpectedly discarded strict namespace bindings.
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (attr.localName === localName && (attr.namespaceURI === namespace || !namespace)) {
        return attr.value;
      }
    }
    return null;
  }

  /**
   * Defensively queries direct child nodes matching strict namespace and localName criteria.
   * @param {Element} node - The overarching parent DOM element.
   * @param {string} namespace - The targeted Namespace URI.
   * @param {string} localName - The targeted local name.
   * @returns {Element|null} The specifically matched node instance.
   * @private
   */
  _getChildNode(node, namespace, localName) {
    if (!node || !node.children) return null;
    return Array.from(node.children).find((c) => c.namespaceURI === namespace && c.localName === localName) || null;
  }

  /**
   * Wraps the native document.createElementNS method for brevity and execution safety.
   * @param {string|null} ns - The required Namespace URI.
   * @param {string} qualifiedName - The structural tag name.
   * @returns {Element} The fully instantiated Document Element.
   * @private
   */
  _createElement(ns, qualifiedName) {
    // Only auto-resolve if the name has a prefix and the namespace is missing
    if (!ns && qualifiedName.includes(":")) {
      const prefix = qualifiedName.split(":")[0];
      ns = OwlToUmlXmiConverter.CONVERTER_MAPPING_RULES.NAMESPACES[prefix];
    }

    // For 'packagedElement', ns remains null and has no prefix,
    // which native browsers accept without throwing a NamespaceError.
    return this.targetDoc.createElementNS(ns || null, qualifiedName);
  }

  /**
   * Wraps the native node.setAttributeNS method to standardize null-safety checks.
   * @param {Element} node - The structural target node.
   * @param {string|null} ns - The associated Namespace URI.
   * @param {string} qualifiedName - The targeted attribute name with optional prefix.
   * @param {string} value - The requested assignment value.
   * @private
   */
  _setAttribute(node, ns, qualifiedName, value) {
    if (value === null || value === undefined) return;
    node.setAttributeNS(ns, qualifiedName, value);
  }
}
