import { UML_METADATA_CONTRACT as contract } from "./umlMetadataContract.js";
import { ONTOLOGY_STRUCTURE_NAMESPACE as vocabulary } from "../ontology/ontologyStructuralVocabulary.js";
import { createMetadataDocument, encodeScalar } from "./umlMetadataXml.js";

const UML_ECORE = "http://www.eclipse.org/uml2/2.0.0/UML";
const ECORE = "http://www.eclipse.org/emf/2002/Ecore";
const key = (term) => `${term.termType}:${term.value}`;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** A reversible lexical codec; ordinary ASCII needs neither escaping nor base64. */
export function packStructuralScalar(value) {
  const string = value.startsWith("string:");
  const payload = string ? value.slice(7) : value;
  const plain = /^[\x20-\x7e]*$/u.test(payload) && !/[<>&"]/u.test(payload);
  const prefix = string ? "s" : "r";
  const encoded = plain
    ? prefix + payload
    : prefix.toUpperCase() + encodeScalar(payload);
  if (Buffer.byteLength(encoded) > contract.maxAttributeBytes)
    throw new Error("Compact scalar byte limit exceeded");
  return encoded;
}

/** Typed, contained stereotype values replace per-edge UML slot wrappers. */
export function createCompactMetadataDocument(dataset) {
  const writer = createMetadataDocument();
  const { document, element } = writer;
  const all = [...document.getElementsByTagName("*")];
  const find = (id) =>
    all.find((n) => n.getAttributeNS(contract.xmi, "id") === id);
  const profile = find("profile");
  const definitions = find("profileDefinition");
  const record = find("sourceRecord");
  const recordDefinition = find("recordDefinition");
  const kinds = new Map();
  const records = new Map();
  const literals = new Map();
  const predicates = new Set();
  for (const quad of dataset) {
    if (
      quad.graph.termType !== "DefaultGraph" ||
      (quad.object.termType === "Literal" &&
        (quad.object.datatype.value !==
          "http://www.w3.org/2001/XMLSchema#string" ||
          quad.object.language))
    )
      throw new Error("Unexpected structural graph coordinate");
    if (!records.has(key(quad.subject)))
      records.set(key(quad.subject), { term: quad.subject, fields: new Map() });
    const node = records.get(key(quad.subject));
    if (quad.predicate.value === `${vocabulary}kind`) {
      if (quad.object.termType !== "Literal" || node.kind)
        throw new Error("Invalid structural kind");
      node.kind = quad.object.value;
      kinds.set(node.kind, null);
      continue;
    }
    predicates.add(quad.predicate.value);
    if (!node.fields.has(quad.predicate.value))
      node.fields.set(quad.predicate.value, []);
    node.fields.get(quad.predicate.value).push(quad.object);
    if (quad.object.termType === "Literal")
      literals.set(
        quad.object.value,
        (literals.get(quad.object.value) ?? 0) + 1,
      );
  }
  for (const node of records.values()) {
    if (!node.kind && node.fields.has(`${vocabulary}collection`))
      node.kind = "Collection";
    if (!node.kind) throw new Error("Structural node lacks its kind");
    kinds.set(node.kind, null);
  }
  const nodes = new Map(
    [...records]
      .sort(([a], [b]) => compare(a, b))
      .map(([identity, value], index) => [
        identity,
        {
          ...value,
          id: `${value.term.termType === "NamedNode" ? "g" : "n"}${index.toString(36)}`,
        },
      ]),
  );

  function tagType(id, name, parent, abstract = false) {
    const uml = element(profile, "packagedElement", "Stereotype", id, {
      name,
      ...(abstract ? { isAbstract: true } : {}),
    });
    if (parent)
      element(uml, "generalization", "Generalization", null, {
        general: parent.id,
      });
    const ecore = element(
      definitions,
      "eClassifiers",
      "ecore:EClass",
      `${id}Definition`,
      {
        name,
        ...(abstract ? { abstract: true } : {}),
        ...(parent ? { eSuperTypes: `#${parent.id}Definition` } : {}),
      },
    );
    const extension = element(ecore, "xmi:Extension", null, null, {
      extender: ECORE,
    });
    element(extension, "eAnnotations", "ecore:EAnnotation", null, {
      source: UML_ECORE,
      references: id,
    });
    return { id, name, uml, ecore };
  }
  function feature(
    owner,
    name,
    type,
    many = false,
    containment = false,
    native = false,
  ) {
    const id = `${owner.id}_${name}`;
    const attributes = {
      name,
      ...(native ? {} : { type: type.id }),
      ...(containment ? { aggregation: "composite" } : {}),
    };
    const property = element(
      owner.uml,
      "ownedAttribute",
      "Property",
      id,
      attributes,
    );
    if (native)
      element(property, "type", "Class", null, {
        href: `${contract.umlDocument}#${type.name}`,
      });
    element(property, "lowerValue", "LiteralInteger", null, { value: 0 });
    if (many)
      element(property, "upperValue", "LiteralUnlimitedNatural", null, {
        value: "*",
      });
    const string = type.id === "String";
    const definition = element(
      owner.ecore,
      "eStructuralFeatures",
      string ? "ecore:EAttribute" : "ecore:EReference",
      `${id}Definition`,
      {
        name,
        ...(many ? { upperBound: -1 } : {}),
        ...(containment ? { containment: true } : {}),
        ...(!native
          ? {
              eType: string
                ? "ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"
                : `#${type.id}Definition`,
            }
          : {}),
      },
    );
    if (native)
      element(definition, "eType", "ecore:EClass", null, {
        href: `http://www.eclipse.org/uml2/5.0.0/UML#//${type.name}`,
      });
  }
  const nodeType = tagType("nodeTag", "Node", null, true);
  const valueType = tagType("valueTag", "Value");
  const defaultType = tagType("defaultTag", "Default");
  const projectionType = tagType("projectionTag", "Projection");
  const sourceType = {
    id: "sourceRecord",
    uml: record,
    ecore: recordDefinition,
  };
  const stringType = { id: "String", name: "String" };
  feature(valueType, "p", stringType);
  feature(defaultType, "k", stringType);
  feature(defaultType, "f", stringType);
  feature(defaultType, "r", nodeType, true);
  feature(defaultType, "v", valueType, true);
  feature(defaultType, "s", stringType, true);
  feature(
    projectionType,
    "base_Element",
    { id: "Element", name: "Element" },
    false,
    false,
    true,
  );
  feature(projectionType, "source", nodeType);
  feature(
    projectionType,
    "rule",
    { id: "InstanceSpecification", name: "InstanceSpecification" },
    false,
    false,
    true,
  );
  const projectionBase = [...projectionType.uml.childNodes].find(
    (n) => n.nodeType === 1 && n.getAttribute("name") === "base_Element",
  );
  projectionBase.setAttribute("association", "projectionExtension");
  const metaclassImport = element(
    profile,
    "elementImport",
    "ElementImport",
    "elementMetaclassImport",
  );
  element(metaclassImport, "importedElement", "Class", null, {
    href: `${contract.umlDocument}#Element`,
  });
  profile.setAttribute(
    "metaclassReference",
    "metaclassImport elementMetaclassImport",
  );
  const projectionExtension = element(
    profile,
    "packagedElement",
    "Extension",
    "projectionExtension",
    {
      name: "Element_Projection",
      memberEnd: "projectionExtensionEnd projectionTag_base_Element",
    },
  );
  element(
    projectionExtension,
    "ownedEnd",
    "ExtensionEnd",
    "projectionExtensionEnd",
    {
      name: "extension_Projection",
      type: "projectionTag",
      aggregation: "composite",
      association: "projectionExtension",
    },
  );
  feature(sourceType, "root", nodeType);
  feature(sourceType, "v", valueType, true, true);
  feature(sourceType, "d", defaultType, true, true);
  feature(
    sourceType,
    "a",
    { id: "InstanceSpecification", name: "InstanceSpecification" },
    false,
    false,
    true,
  );
  for (const [index, kind] of [...kinds.keys()].sort(compare).entries()) {
    const type = tagType(`kind${index}`, kind, nodeType);
    const alphabet = "BCEFGHIJKLMNOPQRSTUWXYZ";
    const name =
      index < alphabet.length
        ? alphabet[index]
        : `K${(index - alphabet.length).toString(36).toUpperCase()}`;
    feature(sourceType, name, type, true, true);
    kinds.set(kind, name);
  }

  const fields = new Map();
  const fieldEnumeration = element(
    find("types"),
    "packagedElement",
    "Enumeration",
    "structuralFields",
    { name: "StructuralFields" },
  );
  for (const [index, predicate] of [...predicates].sort(compare).entries()) {
    const suffix = index.toString(36);
    const scalarMany = [...nodes.values()].some(
      (node) =>
        (node.fields.get(predicate) ?? []).filter(
          (term) => term.termType === "Literal",
        ).length > 1,
    );
    const field = {
      id: `f${suffix}`,
      scalar: `s${suffix}`,
      reference: `r${suffix}`,
      dictionary: `v${suffix}`,
      scalarMany,
    };
    fields.set(predicate, field);
    feature(nodeType, field.scalar, stringType, scalarMany);
    const referenceMany = [...nodes.values()].some(
      (node) =>
        (node.fields.get(predicate) ?? []).filter(
          (term) => term.termType !== "Literal",
        ).length > 1,
    );
    const dictionaryMany = [...nodes.values()].some(
      (node) =>
        (node.fields.get(predicate) ?? []).filter(
          (term) => term.termType === "Literal",
        ).length > 1,
    );
    feature(nodeType, field.reference, nodeType, referenceMany);
    feature(nodeType, field.dictionary, valueType, dictionaryMany);
    element(
      fieldEnumeration,
      "ownedLiteral",
      "EnumerationLiteral",
      `f${suffix}`,
      { name: predicate.slice(vocabulary.length) },
    );
  }

  const dictionary = new Map(
    [...literals]
      .filter(
        ([value, count]) =>
          count > 1 &&
          count * (packStructuralScalar(value).length + 12) >
            packStructuralScalar(value).length + 32 + count * 8,
      )
      .sort(([a], [b]) => compare(a, b))
      .map(([value], index) => [value, `v${index.toString(36)}`]),
  );
  const rootNode = [...nodes.values()].find((node) => node.kind === "Ontology");
  if (!rootNode) throw new Error("Missing source ontology root");
  const application = element(writer.root, "uo:SourceRecord", null, null, {
    base_InstanceSpecification: "manifest",
    root: rootNode.id,
  });
  for (const [value, id] of dictionary)
    element(application, "v", null, id, { p: packStructuralScalar(value) });
  const signature = (values) => {
    const tuples = values
      .map((term) => [term.termType, term.value])
      .sort((a, b) => compare(a[0], b[0]) || compare(a[1], b[1]));
    // Sorted typed pairs encode this unordered field-value set without delimiter ambiguity.
    return JSON.stringify(tuples);
  };
  const defaults = new Map();
  for (const kind of kinds.keys()) {
    const group = [...nodes.values()].filter((node) => node.kind === kind);
    if (group.length < 3) continue;
    for (const [predicate, field] of fields) {
      if (!group.every((node) => node.fields.has(predicate))) continue;
      const modes = new Map();
      for (const node of group) {
        const values = node.fields.get(predicate);
        const code = signature(values);
        if (!modes.has(code)) modes.set(code, { values, count: 0, code });
        modes.get(code).count++;
      }
      const mode = [...modes.values()].sort(
        (a, b) => b.count - a.count || compare(a.code, b.code),
      )[0];
      if (mode.count < 3 || mode.count * 10 < 100 + mode.values.length * 8)
        continue;
      const output = element(application, "d", null, null, {
        k: kinds.get(kind),
        f: field.id,
      });
      const references = mode.values
        .filter((term) => term.termType !== "Literal")
        .map((term) => nodes.get(key(term)).id)
        .sort(compare);
      const shared = mode.values
        .filter(
          (term) => term.termType === "Literal" && dictionary.has(term.value),
        )
        .map((term) => dictionary.get(term.value))
        .sort(compare);
      if (references.length) output.setAttribute("r", references.join(" "));
      if (shared.length) output.setAttribute("v", shared.join(" "));
      for (const term of mode.values
        .filter(
          (term) => term.termType === "Literal" && !dictionary.has(term.value),
        )
        .sort((a, b) => compare(a.value, b.value))) {
        const scalar = element(output, "s");
        scalar.appendChild(
          document.createTextNode(packStructuralScalar(term.value)),
        );
      }
      defaults.set(`${kind}\n${predicate}`, mode.code);
    }
  }
  const axiomPredicate = `${vocabulary}axiom`;
  const axiomIds = [...nodes.values()]
    .filter((node) => node.kind.endsWith("Axiom"))
    .map((node) => node.id)
    .sort(compare);
  const rootAxiomIds = (rootNode.fields.get(axiomPredicate) ?? [])
    .map((term) => nodes.get(key(term))?.id)
    .sort(compare);
  const implicitAxioms =
    axiomIds.length &&
    axiomIds.length === rootAxiomIds.length &&
    axiomIds.every((id, index) => id === rootAxiomIds[index]);
  if (implicitAxioms)
    application.setAttribute("a", fields.get(axiomPredicate).id);
  for (const node of nodes.values()) {
    const output = element(application, kinds.get(node.kind), null, node.id);
    for (const [predicate, values] of [...node.fields].sort(([a], [b]) =>
      compare(a, b),
    )) {
      if (
        (node === rootNode && predicate === axiomPredicate && implicitAxioms) ||
        defaults.get(`${node.kind}\n${predicate}`) === signature(values)
      )
        continue;
      const field = fields.get(predicate);
      const references = values
        .filter((term) => term.termType !== "Literal")
        .map((term) => {
          const target = nodes.get(key(term));
          if (!target) throw new Error("Unregistered structural reference");
          return target.id;
        })
        .sort(compare);
      const shared = values
        .filter(
          (term) => term.termType === "Literal" && dictionary.has(term.value),
        )
        .map((term) => dictionary.get(term.value))
        .sort(compare);
      if (references.length)
        output.setAttribute(field.reference, references.join(" "));
      if (shared.length)
        output.setAttribute(field.dictionary, shared.join(" "));
      for (const term of values
        .filter(
          (term) => term.termType === "Literal" && !dictionary.has(term.value),
        )
        .sort((a, b) => compare(a.value, b.value))) {
        if (field.scalarMany) {
          const value = element(output, field.scalar);
          value.appendChild(
            document.createTextNode(packStructuralScalar(term.value)),
          );
        } else
          output.setAttribute(field.scalar, packStructuralScalar(term.value));
      }
    }
  }
  const ruleIds = new Map();
  let ruleEnumeration;
  return {
    ...writer,
    nodes,
    rootId: rootNode.id,
    profile,
    dictionarySize: dictionary.size,
    correspondence(source, target, rule) {
      if (!ruleIds.has(rule)) {
        if (!ruleEnumeration)
          ruleEnumeration = element(
            find("types"),
            "packagedElement",
            "Enumeration",
            "projectionRules",
            { name: "ProjectionRules" },
          );
        const id = `q${ruleIds.size.toString(36)}`;
        element(ruleEnumeration, "ownedLiteral", "EnumerationLiteral", id, {
          name: rule,
        });
        ruleIds.set(rule, id);
      }
      element(writer.root, "uo:Projection", null, null, {
        base_Element: target,
        source,
        rule: ruleIds.get(rule),
      });
    },
  };
}
