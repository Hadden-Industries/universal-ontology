import { createHash } from "node:crypto";
import { UML_METADATA_CONTRACT as contract } from "./umlMetadataContract.js";
import { ONTOLOGY_STRUCTURE_NAMESPACE as vocabulary } from "../ontology/ontologyStructuralVocabulary.js";

const children = (node) => [...node.childNodes].filter((n) => n.nodeType === 1);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const typeOf = (node) => node.getAttributeNS(contract.xmi, "type");

/** Independent inverse of the version-two typed profile values. */
export function readCompactMetadataGraph({ document, decoded, byId, decode }) {
  const resolve = (id) => {
    const value = byId.get(id);
    if (!value) throw new Error(`Dangling compact reference: ${id}`);
    return value;
  };
  const attributes = (node, names, allowId = false) => {
    for (const attribute of node.attributes) {
      if (
        allowId &&
        attribute.namespaceURI === contract.xmi &&
        attribute.localName === "id"
      )
        continue;
      if (attribute.namespaceURI || !names.includes(attribute.name))
        throw new Error("Unexpected compact record attribute");
    }
  };
  const unpack = (encoded) => {
    if (Buffer.byteLength(encoded) > contract.maxAttributeBytes)
      throw new Error("Compact scalar byte limit exceeded");
    const prefix = encoded[0];
    if (!["s", "r", "S", "R"].includes(prefix))
      throw new Error("Invalid compact scalar encoding");
    const payload =
      prefix === prefix.toUpperCase()
        ? decode(encoded.slice(1))
        : encoded.slice(1);
    const plain = /^[\x20-\x7e]*$/u.test(payload) && !/[<>&"]/u.test(payload);
    if ((prefix === prefix.toLowerCase()) !== plain)
      throw new Error("Noncanonical compact scalar encoding");
    return prefix.toLowerCase() === "s" ? `string:${payload}` : payload;
  };
  const scalarIds = new Map();
  let scalarCounter = 0;
  const scalar = (value) => {
    if (!scalarIds.has(value)) {
      const id = `@scalar${scalarCounter++}`;
      scalarIds.set(value, id);
      decoded.set(id, {
        id,
        classifier: "ScalarValue",
        fields: new Map([["payload", [{ text: value }]]]),
      });
      if (scalarIds.size > contract.maxNodes)
        throw new Error("Compact scalar count limit exceeded");
    }
    return { reference: scalarIds.get(value) };
  };
  const literal = (value) =>
    `"${[...value]
      .map((character) => {
        if (character === '"' || character === "\\") return `\\${character}`;
        const code = character.charCodeAt(0);
        return code < 32 || code === 127
          ? `\\u${code.toString(16).padStart(4, "0")}`
          : character;
      })
      .join("")}"`;
  // Charge every expanded edge before deriving identities or invoking RDFC.
  // Shared dictionary/default values must not multiply past the graph budget.
  const serializedScalars = new Map();
  const scalarLiteral = (reference) => {
    if (!serializedScalars.has(reference))
      serializedScalars.set(
        reference,
        literal(decoded.get(reference).fields.get("payload")[0].text),
      );
    return serializedScalars.get(reference);
  };
  const maximumTermBytes =
    Buffer.byteLength(`${vocabulary}structure:`) + 64 + 2;
  let expandedBytes = 0;
  const charge = (predicate, values) => {
    for (const value of values) {
      const isScalar =
        decoded.get(value.reference)?.classifier === "ScalarValue";
      expandedBytes +=
        maximumTermBytes +
        Buffer.byteLength(predicate) +
        2 +
        (isScalar
          ? Buffer.byteLength(scalarLiteral(value.reference))
          : maximumTermBytes) +
        5;
      if (expandedBytes > contract.maxStructureBytes)
        throw new Error("Expanded compact structure byte limit exceeded");
    }
  };
  const fields = new Map();
  const fieldPredicates = new Set();
  const fieldEnumeration = resolve("structuralFields");
  if (typeOf(fieldEnumeration) !== "uml:Enumeration")
    throw new Error("Invalid structural field enumeration");
  for (const descriptor of children(fieldEnumeration)) {
    const id = descriptor.getAttributeNS(contract.xmi, "id");
    if (descriptor.localName !== "ownedLiteral" || !/^f[0-9a-z]+$/u.test(id))
      throw new Error("Invalid structural field identity");
    const name = descriptor.getAttribute("name");
    if (
      !name ||
      name === "kind" ||
      encodeURIComponent(decodeURIComponent(name)) !== name
    )
      throw new Error("Invalid structural field descriptor");
    const predicate = vocabulary + name;
    if (fieldPredicates.has(predicate))
      throw new Error("Duplicate structural field descriptor");
    fieldPredicates.add(predicate);
    const suffix = id.slice(1);
    fields.set(suffix, {
      predicate,
      scalar: `s${suffix}`,
      reference: `r${suffix}`,
      dictionary: `v${suffix}`,
    });
  }
  const profileSource = resolve("sourceRecord");
  const kindFeatures = new Map();
  const kindNames = new Set();
  for (const property of children(profileSource).filter(
    (n) => n.localName === "ownedAttribute",
  )) {
    const kind = byId.get(property.getAttribute("type"));
    if (
      !kind ||
      typeOf(kind) !== "uml:Stereotype" ||
      !children(kind).some(
        (n) =>
          n.localName === "generalization" &&
          n.getAttribute("general") === "nodeTag",
      )
    )
      continue;
    const name = property.getAttribute("name");
    if (
      kind.parentNode !== profileSource.parentNode ||
      property.getAttribute("aggregation") !== "composite" ||
      kindFeatures.has(name) ||
      kindNames.has(kind.getAttribute("name"))
    )
      throw new Error("Invalid compact kind containment");
    kindFeatures.set(name, kind.getAttribute("name"));
    kindNames.add(kind.getAttribute("name"));
  }
  const applications = [
    ...document.getElementsByTagNameNS(contract.profile, "SourceRecord"),
  ];
  if (
    applications.length !== 1 ||
    applications[0].getAttribute("base_InstanceSpecification") !== "manifest"
  )
    throw new Error("Invalid compact source application");
  const application = applications[0];
  if (application.parentNode !== document.documentElement)
    throw new Error("Invalid compact application containment");
  attributes(application, ["base_InstanceSpecification", "root", "a"]);
  const dictionary = new Map();
  const nodes = new Map();
  const referenceFields = new Map();
  const scalarFields = new Map();
  const dictionaryFields = new Map();
  for (const field of fields.values()) {
    for (const [name, type] of [
      [field.scalar, "String"],
      [field.reference, "nodeTag"],
      [field.dictionary, "valueTag"],
    ]) {
      const declaration = resolve(`nodeTag_${name}`);
      if (
        declaration.parentNode !== resolve("nodeTag") ||
        declaration.getAttribute("name") !== name ||
        declaration.getAttribute("type") !== type
      )
        throw new Error("Invalid compact structural feature declaration");
    }
    referenceFields.set(field.reference, field);
    scalarFields.set(field.scalar, field);
    dictionaryFields.set(field.dictionary, field);
  }
  for (const value of children(application).filter(
    (n) => n.localName === "v",
  )) {
    if (value.namespaceURI)
      throw new Error("Unexpected compact dictionary namespace");
    attributes(value, ["p"], true);
    const id = value.getAttributeNS(contract.xmi, "id");
    if (!id || !value.hasAttribute("p") || children(value).length)
      throw new Error("Invalid compact value dictionary");
    dictionary.set(id, unpack(value.getAttribute("p")));
    if (dictionary.size > contract.maxNodes)
      throw new Error("Compact dictionary count limit exceeded");
  }
  const defaults = new Map();
  const defaultsByKind = new Map();
  for (const value of children(application).filter(
    (n) => n.localName === "d",
  )) {
    if (value.namespaceURI)
      throw new Error("Unexpected compact default namespace");
    attributes(value, ["k", "f", "r", "v"]);
    const kind = kindFeatures.get(value.getAttribute("k"));
    const field = fields.get(value.getAttribute("f").slice(1));
    if (
      !/^f[0-9a-z]+$/u.test(value.getAttribute("f")) ||
      !kind ||
      !field ||
      defaults.has(`${kind}\n${field.predicate}`)
    )
      throw new Error("Invalid compact field default");
    const values = (value.getAttribute("r") ?? "")
      .split(/\s+/u)
      .filter(Boolean)
      .map((reference) => ({ reference }));
    for (const reference of (value.getAttribute("v") ?? "")
      .split(/\s+/u)
      .filter(Boolean)) {
      if (!dictionary.has(reference))
        throw new Error("Unknown compact default dictionary value");
      values.push(scalar(dictionary.get(reference)));
    }
    for (const child of children(value)) {
      if (
        child.namespaceURI ||
        child.localName !== "s" ||
        child.attributes.length ||
        children(child).length
      )
        throw new Error("Invalid compact scalar default");
      values.push(scalar(unpack(child.textContent)));
    }
    if (!values.length) throw new Error("Empty compact field default");
    const entry = { kind, predicate: field.predicate, values };
    defaults.set(`${kind}\n${field.predicate}`, entry);
    if (!defaultsByKind.has(kind)) defaultsByKind.set(kind, []);
    defaultsByKind.get(kind).push(entry);
    if (defaults.size > contract.maxNodes)
      throw new Error("Compact default count limit exceeded");
  }
  for (const node of children(application).filter(
    (n) => !["v", "d"].includes(n.localName),
  )) {
    const kind = kindFeatures.get(node.localName);
    const id = node.getAttributeNS(contract.xmi, "id");
    if (
      node.namespaceURI ||
      !kind ||
      !/^[gn][0-9a-z]+$/u.test(id) ||
      nodes.has(id)
    )
      throw new Error("Invalid compact structural node");
    const record = { id, kind, fields: new Map() };
    const add = (field, values) => {
      if (!values.length) throw new Error("Empty compact structural field");
      charge(field.predicate, values);
      if (!record.fields.has(field.predicate))
        record.fields.set(field.predicate, []);
      record.fields.get(field.predicate).push(...values);
    };
    if (kind !== "Collection") {
      const values = [scalar(kind)];
      charge(`${vocabulary}kind`, values);
      record.fields.set(`${vocabulary}kind`, values);
    }
    for (const attribute of [...node.attributes]) {
      if (
        attribute.namespaceURI === contract.xmi &&
        attribute.localName === "id"
      )
        continue;
      if (attribute.namespaceURI)
        throw new Error("Unexpected compact field namespace");
      const references = referenceFields.get(attribute.name);
      const shared = dictionaryFields.get(attribute.name);
      const inline = scalarFields.get(attribute.name);
      if (references)
        add(
          references,
          attribute.value
            .split(/\s+/u)
            .filter(Boolean)
            .map((reference) => ({ reference })),
        );
      else if (shared)
        add(
          shared,
          attribute.value
            .split(/\s+/u)
            .filter(Boolean)
            .map((reference) => {
              if (!dictionary.has(reference))
                throw new Error("Unknown compact scalar dictionary reference");
              return scalar(dictionary.get(reference));
            }),
        );
      else if (inline) add(inline, [scalar(unpack(attribute.value))]);
      else throw new Error("Unknown compact structural attribute");
    }
    for (const value of children(node)) {
      const field = scalarFields.get(value.localName);
      if (
        value.namespaceURI ||
        !field ||
        value.attributes.length ||
        children(value).length
      )
        throw new Error("Invalid compact scalar field");
      add(field, [scalar(unpack(value.textContent))]);
    }
    for (const entry of defaultsByKind.get(kind) ?? [])
      if (!record.fields.has(entry.predicate)) {
        charge(entry.predicate, entry.values);
        record.fields.set(entry.predicate, entry.values);
      }
    nodes.set(id, record);
    if (nodes.size + scalarIds.size > contract.maxNodes)
      throw new Error("Compact structural record limit exceeded");
  }
  const rootId = application.getAttribute("root");
  if (nodes.get(rootId)?.kind !== "Ontology")
    throw new Error("Invalid compact source root");
  if (application.hasAttribute("a")) {
    const field = resolve(application.getAttribute("a"));
    if (
      field.parentNode !== fieldEnumeration ||
      field.getAttribute("name") !== "axiom" ||
      nodes.get(rootId).fields.has(`${vocabulary}axiom`)
    )
      throw new Error("Invalid compact root axiom binding");
    const axioms = [...nodes.values()].filter((node) =>
      node.kind.endsWith("Axiom"),
    );
    if (!axioms.length) throw new Error("Empty compact root axiom binding");
    const values = axioms.map((node) => ({ reference: node.id }));
    charge(`${vocabulary}axiom`, values);
    nodes.get(rootId).fields.set(`${vocabulary}axiom`, values);
  }
  for (const node of nodes.values())
    for (const values of node.fields.values())
      for (const value of values)
        if (!decoded.has(value.reference) && !nodes.has(value.reference))
          throw new Error("Dangling compact structural reference");
  const identities = new Map();
  const active = new Set();
  function identity(id, depth = 0) {
    if (identities.has(id)) return identities.get(id);
    const node = nodes.get(id);
    if (!node || depth > contract.maxDepth || active.has(id))
      throw new Error("Invalid grounded structural identity");
    if (id.startsWith("n")) return `BlankNode:${id}`;
    active.add(id);
    const edges = [];
    for (const [predicate, values] of node.fields)
      for (const value of values) {
        const target = decoded.get(value.reference);
        let object;
        if (target?.classifier === "ScalarValue")
          object = scalarLiteral(value.reference);
        else {
          const child = identity(value.reference, depth + 1);
          if (!child.startsWith("NamedNode:"))
            throw new Error(
              "A grounded node cannot reference anonymous structure",
            );
          object = `<${child.slice(10)}>`;
        }
        edges.push(JSON.stringify([`<${predicate}>`, object]));
      }
    const result = `NamedNode:${vocabulary}structure:${hash([...new Set(edges)].sort().join("\n"))}`;
    active.delete(id);
    identities.set(id, result);
    return result;
  }
  for (const node of nodes.values()) {
    const identityValue = identity(node.id);
    node.classifier = "StructuralNode";
    node.fields.set("identity", [{ text: identityValue }]);
    decoded.set(node.id, node);
  }
  const correspondences = [];
  const targets = new Set();
  const expected = new Map([
    ["asserted-class-v1", ["OWLClass", "uml:Class"]],
    ["asserted-datatype-v1", ["OWLDatatype", "uml:DataType"]],
    [
      "single-asserted-domain-range-v1",
      ["OWLObjectProperty", "uml:Association"],
    ],
    ["single-asserted-domain-datatype-v1", ["OWLDataProperty", "uml:Property"]],
    [
      "asserted-named-class-instance-v1",
      ["OWLNamedIndividual", "uml:InstanceSpecification"],
    ],
  ]);
  for (const application of document.getElementsByTagNameNS(
    contract.profile,
    "Projection",
  )) {
    attributes(application, ["base_Element", "source", "rule"]);
    if (
      application.parentNode !== document.documentElement ||
      children(application).length
    )
      throw new Error("Invalid compact projection containment");
    const source = nodes.get(application.getAttribute("source"));
    const target = resolve(application.getAttribute("base_Element"));
    const rule = resolve(application.getAttribute("rule"));
    const targetId = target.getAttributeNS(contract.xmi, "id");
    const name = rule.getAttribute("name");
    const shape = expected.get(name);
    const targetType =
      typeOf(target) ||
      (target.localName === "ownedAttribute" ? "uml:Property" : "");
    let owner = target.parentNode;
    while (owner && owner !== resolve("projection")) owner = owner.parentNode;
    if (
      !owner ||
      !source ||
      !shape ||
      shape[0] !== source.kind ||
      shape[1] !== targetType ||
      rule.parentNode !== resolve("projectionRules") ||
      targets.has(targetId)
    )
      throw new Error("Invalid compact projection correspondence");
    targets.add(targetId);
    correspondences.push({ source: source.id, target: targetId, rule: name });
  }
  return { rootId, nodes, correspondences };
}
