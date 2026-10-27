import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { SaxesParser } from "@rubensworks/saxes";
import { createHash } from "node:crypto";
import rdfCanonize from "rdf-canonize";
import {
  UML_METADATA_CONTRACT as contract,
  UML_METADATA_TYPES,
} from "./umlMetadataContract.js";
import { ONTOLOGY_STRUCTURE_NAMESPACE as vocabulary } from "../ontology/ontologyStructuralVocabulary.js";
import { readCompactMetadataGraph } from "./readCompactMetadataGraph.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const children = (node, name) =>
  [...node.childNodes].filter(
    (n) => n.nodeType === 1 && (!name || n.localName === name),
  );

function decode(value) {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  )
    throw new Error("Invalid preservation base64");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value)
    throw new Error("Noncanonical preservation base64");
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}

/** Offline inverse of the declared UML carriers; never imports the source traversal. */
export async function recoverOntologyMetadata(bytes) {
  const xml =
    typeof bytes === "string"
      ? bytes
      : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!xml.isWellFormed() || Buffer.byteLength(xml) > contract.maxXmlBytes)
    throw new Error("Invalid or oversized UML metadata XML");
  let depth = 0;
  let maximumDepth = 0;
  let count = 0;
  const ids = new Set();
  const scanner = new SaxesParser({ xmlns: true });
  scanner.on("doctype", () => {
    throw new Error("DOCTYPE is forbidden in UML metadata XML");
  });
  scanner.on("opentag", (tag) => {
    if (++depth > contract.maxDepth || ++count > contract.maxElements)
      throw new Error("UML XML structural limit exceeded");
    maximumDepth = Math.max(maximumDepth, depth);
    for (const attribute of Object.values(tag.attributes)) {
      if (Buffer.byteLength(attribute.value) > contract.maxAttributeBytes)
        throw new Error("UML XML attribute limit exceeded");
      if (
        attribute.uri === "http://www.w3.org/2001/XMLSchema-instance" &&
        ["schemaLocation", "noNamespaceSchemaLocation"].includes(
          attribute.local,
        )
      ) {
        const expected = `${contract.profile} #profileDefinition`;
        if (
          attribute.local !== "schemaLocation" ||
          depth !== 1 ||
          attribute.value.trim().split(/\s+/u).join(" ") !== expected
        )
          throw new Error("Unregistered XMI schema location is forbidden");
      }
      if (attribute.uri === contract.xmi && attribute.local === "id") {
        if (
          !/^[A-Za-z_][\w.-]*$/u.test(attribute.value) ||
          ids.has(attribute.value)
        )
          throw new Error("Invalid or duplicate XMI ID");
        ids.add(attribute.value);
      }
      if (
        attribute.local === "href" &&
        ![
          `${contract.umlDocument}#InstanceSpecification`,
          `${contract.umlDocument}#Element`,
          "http://www.eclipse.org/uml2/5.0.0/UML#//InstanceSpecification",
          "http://www.eclipse.org/uml2/5.0.0/UML#//Element",
        ].includes(attribute.value)
      )
        throw new Error("External XMI reference is forbidden");
    }
  });
  scanner.on("closetag", () => {
    depth--;
  });
  scanner.write(xml).close();
  const doc = new DOMParser({
    onError: (level, message) => {
      throw new Error(`Invalid UML XML: ${level}: ${message}`);
    },
  }).parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (
    root.namespaceURI !== contract.xmi ||
    root.localName !== "XMI" ||
    root.getAttributeNS(contract.xmi, "version") !== "2.1"
  )
    throw new Error("Unsupported XMI coordinate");
  const all = [...doc.getElementsByTagName("*")];
  const byId = new Map(
    all
      .filter((n) => n.hasAttributeNS(contract.xmi, "id"))
      .map((n) => [n.getAttributeNS(contract.xmi, "id"), n]),
  );
  const typeOf = (n) => n.getAttributeNS(contract.xmi, "type");
  const resolve = (id) => {
    const value = byId.get(id);
    if (!value) throw new Error(`Dangling XMI reference: ${id}`);
    return value;
  };
  const model = resolve("model");
  const profile = resolve("profile");
  if (
    model.namespaceURI !== contract.uml ||
    profile.namespaceURI !== contract.uml ||
    resolve("profileDefinition").getAttribute("nsURI") !== contract.profile
  )
    throw new Error("Unsupported UML/profile coordinate");
  for (const node of all) {
    for (const field of [
      "type",
      "classifier",
      "definingFeature",
      "instance",
      "general",
      "appliedProfile",
      "metaclassReference",
      "association",
      "memberEnd",
      "navigableOwnedEnd",
      "base_InstanceSpecification",
      "references",
    ])
      if (node.hasAttribute(field))
        for (const id of node.getAttribute(field).split(/\s+/u).filter(Boolean))
          resolve(id);
  }
  const carrierPackage = resolve("preservation");
  if (
    carrierPackage.parentNode !== model ||
    typeOf(carrierPackage) !== "uml:Package"
  )
    throw new Error("Invalid preservation package containment");
  const expectedTypes = new Set(Object.keys(UML_METADATA_TYPES));
  const carriers = children(carrierPackage, "packagedElement");
  if (carriers.length > contract.maxNodes)
    throw new Error("Preservation record limit exceeded");
  const decoded = new Map();
  for (const carrier of carriers) {
    const id = carrier.getAttributeNS(contract.xmi, "id");
    const classifier = carrier.getAttribute("classifier");
    if (
      typeOf(carrier) !== "uml:InstanceSpecification" ||
      !expectedTypes.has(classifier)
    )
      throw new Error("Unsupported preservation carrier");
    const fields = new Map();
    for (const slot of children(carrier)) {
      if (slot.localName !== "slot" || typeOf(slot) !== "uml:Slot")
        throw new Error("Unexpected preservation child");
      const declaration = resolve(slot.getAttribute("definingFeature"));
      if (
        declaration.parentNode !== resolve(classifier) ||
        typeOf(declaration) !== "uml:Property"
      )
        throw new Error("Slot has the wrong classifier/attachment");
      const name = declaration.getAttribute("name");
      if (fields.has(name)) throw new Error("Duplicate preservation slot");
      fields.set(
        name,
        children(slot).map((value) => {
          if (value.localName !== "value")
            throw new Error("Unexpected slot value");
          if (typeOf(value) === "uml:InstanceValue") {
            const target = value.getAttribute("instance");
            resolve(target);
            return { reference: target };
          }
          if (typeOf(value) !== "uml:LiteralString")
            throw new Error("Unsupported preservation scalar carrier");
          return { text: decode(value.getAttribute("value")) };
        }),
      );
    }
    for (const name of Object.keys(UML_METADATA_TYPES[classifier])) {
      if (fields.get(name)?.length !== 1)
        throw new Error(
          `Missing or repeated required slot: ${classifier}.${name}`,
        );
    }
    if (fields.size !== Object.keys(UML_METADATA_TYPES[classifier]).length)
      throw new Error("Unsupported preservation slot");
    decoded.set(id, { id, classifier, fields });
  }
  const text = (record, name) => {
    const values = record.fields.get(name);
    if (values?.length !== 1 || !Object.hasOwn(values[0], "text"))
      throw new Error(`Expected one scalar: ${name}`);
    return values[0].text;
  };
  const manifests = [...decoded.values()].filter(
    (r) => r.classifier === "ExportManifest",
  );
  if (manifests.length !== 1) throw new Error("Expected one export manifest");
  const manifest = manifests[0];
  if (text(manifest, "contractVersion") !== contract.version)
    throw new Error("Unsupported metadata contract version");
  if (text(manifest, "behaviorProfileId") !== "normative-v1")
    throw new Error("Unsupported source behavior profile");
  if (
    !/^[a-f0-9]{64}$/u.test(text(manifest, "pairedOwlSha256")) ||
    hash(new XMLSerializer().serializeToString(profile)) !==
      text(manifest, "profileSha256")
  )
    throw new Error("Invalid paired artifact or preservation profile identity");
  const compact = readCompactMetadataGraph({
    document: doc,
    decoded,
    byId,
    decode,
  });
  const sourceNodes = [...decoded.values()].filter(
    (r) => r.classifier === "StructuralNode",
  );
  const sourceValues = [...decoded.values()].filter(
    (r) => r.classifier === "ScalarValue",
  );
  const terms = new Map();
  const identities = new Set();
  for (const node of sourceNodes) {
    const identity = text(node, "identity");
    if (identities.has(identity))
      throw new Error("Repeated structural identity");
    identities.add(identity);
    const separator = identity.indexOf(":");
    const termType = identity.slice(0, separator);
    const value = identity.slice(separator + 1);
    if (!["NamedNode", "BlankNode"].includes(termType) || !value)
      throw new Error("Invalid structural node identity");
    terms.set(node.id, { termType, value });
  }
  for (const scalar of sourceValues)
    terms.set(scalar.id, {
      termType: "Literal",
      value: text(scalar, "payload"),
      datatype: {
        termType: "NamedNode",
        value: "http://www.w3.org/2001/XMLSchema#string",
      },
    });
  const dataset = [];
  for (const node of sourceNodes) {
    for (const [predicate, values] of node.fields) {
      if (predicate === "identity") continue;
      if (!predicate.startsWith(vocabulary) || !values.length)
        throw new Error("Unsupported structural field");
      for (const item of values) {
        const object = terms.get(item.reference);
        if (!object)
          throw new Error("Structural field target is not a source term");
        dataset.push({
          subject: terms.get(node.id),
          predicate: { termType: "NamedNode", value: predicate },
          object,
          graph: { termType: "DefaultGraph", value: "" },
        });
      }
    }
  }
  const canonicalStructure = await rdfCanonize.canonize(dataset, {
    algorithm: "RDFC-1.0",
    signal: AbortSignal.timeout(contract.canonicalizationMilliseconds),
  });
  if (Buffer.byteLength(canonicalStructure) > contract.maxStructureBytes)
    throw new Error("Recovered structure byte limit exceeded");
  const semanticModelSha256 = hash(canonicalStructure);
  if (semanticModelSha256 !== text(manifest, "semanticModelSha256"))
    throw new Error("Recovered metadata/attachment digest mismatch");
  const rootId = compact.rootId;
  if (text(manifest, "root") !== rootId)
    throw new Error("Manifest/compact root binding mismatch");
  if (
    !terms.has(rootId) ||
    !sourceNodes
      .find((n) => n.id === rootId)
      ?.fields.get(`${vocabulary}kind`)
      ?.some((v) => terms.get(v.reference)?.value === "Ontology")
  )
    throw new Error("Manifest root is not the source ontology");
  // Return an explicit inverse abstract-syntax graph. Scalar prefixes belong to
  // the existing structural contract and distinguish strings, numbers and absence.
  const records = sourceNodes.map((n) => ({
    id: n.id,
    fields: Object.fromEntries(
      [...n.fields]
        .filter(([key]) => key !== "identity")
        .map(([key, values]) => [
          decodeURIComponent(key.slice(vocabulary.length)),
          values.map((v) =>
            terms.get(v.reference)?.termType === "Literal"
              ? { scalar: terms.get(v.reference).value }
              : { reference: v.reference },
          ),
        ]),
    ),
  }));
  const recordsById = new Map(records.map((r) => [r.id, r]));
  const scalarField = (node, field) => node?.fields[field]?.[0]?.scalar;
  const nodeField = (node, field) =>
    recordsById.get(node?.fields[field]?.[0]?.reference);
  const literals = records
    .filter((r) => scalarField(r, "kind") === "OWLLiteral")
    .map((r) => ({
      id: r.id,
      lexical: scalarField(r, "lexicalForm")?.slice(7),
      language: scalarField(r, "language")?.slice(7),
      datatype: scalarField(
        nodeField(nodeField(r, "datatype"), "iri"),
        "value",
      )?.slice(7),
    }));
  return {
    canonicalStructure,
    semanticModelSha256,
    rootId,
    records,
    literals,
    manifest: Object.fromEntries(
      Object.keys(UML_METADATA_TYPES.ExportManifest)
        .filter((f) => f !== "root")
        .map((f) => [f, text(manifest, f)]),
    ),
    counts: {
      nodes: sourceNodes.length,
      scalars: sourceValues.length,
      edges: dataset.length,
      axioms: recordsById.get(rootId).fields.axiom?.length ?? 0,
      ontologyAnnotations:
        recordsById.get(rootId).fields.annotation?.length ?? 0,
      annotationNodes: records.filter(
        (r) => scalarField(r, "kind") === "OWLAnnotation",
      ).length,
      literalLexicalUtf8Bytes: literals.reduce(
        (total, value) => total + Buffer.byteLength(value.lexical),
        0,
      ),
      scalarBase64Bytes: sourceValues.reduce(
        (total, value) =>
          total +
          Buffer.byteLength(
            Buffer.from(text(value, "payload"), "utf8").toString("base64"),
          ),
        0,
      ),
      projectionCorrespondences: compact.correspondences.length,
      xmlBytes: Buffer.byteLength(xml),
      maximumXmlDepth: maximumDepth,
    },
  };
}
