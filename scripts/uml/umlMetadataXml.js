import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import { createHash } from "node:crypto";
import {
  UML_METADATA_CONTRACT as contract,
  UML_METADATA_TYPES,
} from "./umlMetadataContract.js";

const XMLNS = "http://www.w3.org/2000/xmlns/";
const ECORE = "http://www.eclipse.org/emf/2002/Ecore";
const UML_ECORE = "http://www.eclipse.org/uml2/2.0.0/UML";

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
export const stableId = (role, key) => `${role}_${sha256(key)}`;
export const fieldId = (predicate) => stableId("field", predicate);

/** Build a native-validated profile and ordinary typed carriers, with local references. */
export function createMetadataDocument(predicates) {
  const document = new DOMImplementation().createDocument(
    contract.xmi,
    "xmi:XMI",
    null,
  );
  const root = document.documentElement;
  for (const [name, value] of Object.entries({
    xmi: contract.xmi,
    uml: contract.uml,
    uo: contract.profile,
    ecore: ECORE,
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
  }))
    root.setAttributeNS(XMLNS, `xmlns:${name}`, value);
  root.setAttributeNS(contract.xmi, "xmi:version", "2.1");
  root.setAttributeNS(
    "http://www.w3.org/2001/XMLSchema-instance",
    "xsi:schemaLocation",
    `${contract.profile} #profileDefinition ${contract.uml} http://www.eclipse.org/uml2/5.0.0/UML`,
  );
  const element = (parent, tag, type, id, attributes = {}) => {
    const namespace = tag.startsWith("uml:")
      ? contract.uml
      : tag.startsWith("uo:")
        ? contract.profile
        : tag.startsWith("xmi:")
          ? contract.xmi
          : null;
    const node = document.createElementNS(namespace, tag);
    if (type)
      node.setAttributeNS(
        contract.xmi,
        "xmi:type",
        type.includes(":") ? type : `uml:${type}`,
      );
    if (id) node.setAttributeNS(contract.xmi, "xmi:id", id);
    for (const [name, value] of Object.entries(attributes))
      node.setAttribute(name, String(value));
    parent.appendChild(node);
    return node;
  };
  const model = element(root, "uml:Model", null, "model", { name: "Ontology" });
  const types = element(model, "packagedElement", "Package", "types", {
    name: "PreservationTypes",
  });
  element(types, "packagedElement", "PrimitiveType", "String", {
    name: "String",
  });
  for (const [name, fields] of Object.entries(UML_METADATA_TYPES)) {
    const classifier = element(types, "packagedElement", "Class", name, {
      name,
      ...(name === "StructuralTerm" ? { isAbstract: "true" } : {}),
    });
    if (["StructuralNode", "ScalarValue"].includes(name))
      element(
        classifier,
        "generalization",
        "Generalization",
        `${name}_generalization`,
        { general: "StructuralTerm" },
      );
    for (const [field, type] of Object.entries(fields))
      property(classifier, `${name}_${field}`, field, type, 1);
    if (name === "StructuralNode")
      for (const predicate of [...predicates].sort())
        property(
          classifier,
          fieldId(predicate),
          predicate,
          "StructuralTerm",
          "*",
        );
  }
  function property(parent, id, name, type, upper) {
    const node = element(parent, "ownedAttribute", "Property", id, {
      name,
      type,
    });
    element(node, "lowerValue", "LiteralInteger", `${id}_lower`, {
      value: upper === "*" ? 0 : 1,
    });
    element(node, "upperValue", "LiteralUnlimitedNatural", `${id}_upper`, {
      value: upper,
    });
  }
  const preservation = element(
    model,
    "packagedElement",
    "Package",
    "preservation",
    { name: "Preservation" },
  );
  const projection = element(
    model,
    "packagedElement",
    "Package",
    "projection",
    { name: "Domain" },
  );
  const application = element(
    model,
    "profileApplication",
    "ProfileApplication",
    "profileApplication",
    { appliedProfile: "profile" },
  );
  const applicationExtension = element(
    application,
    "xmi:Extension",
    null,
    null,
    { extender: ECORE },
  );
  element(
    applicationExtension,
    "eAnnotations",
    "ecore:EAnnotation",
    "profileApplicationDefinition",
    { source: UML_ECORE, references: "profileDefinition" },
  );
  const profile = element(root, "uml:Profile", null, "profile", {
    name: "OntologyMetadata",
    URI: contract.profile,
    metaclassReference: "metaclassImport",
  });
  const extensionData = element(profile, "xmi:Extension", null, null, {
    extender: ECORE,
  });
  const annotation = element(
    extensionData,
    "eAnnotations",
    "ecore:EAnnotation",
    "profileAnnotation",
    { source: UML_ECORE },
  );
  const packageDefinition = element(
    annotation,
    "contents",
    "ecore:EPackage",
    "profileDefinition",
    { name: "OntologyMetadata", nsURI: contract.profile, nsPrefix: "uo" },
  );
  const classDefinition = element(
    packageDefinition,
    "eClassifiers",
    "ecore:EClass",
    "recordDefinition",
    { name: "SourceRecord" },
  );
  const classExtension = element(classDefinition, "xmi:Extension", null, null, {
    extender: ECORE,
  });
  element(
    classExtension,
    "eAnnotations",
    "ecore:EAnnotation",
    "recordAnnotation",
    { source: UML_ECORE, references: "sourceRecord" },
  );
  const baseDefinition = element(
    classDefinition,
    "eStructuralFeatures",
    "ecore:EReference",
    "baseDefinition",
    { name: "base_InstanceSpecification", ordered: "false", lowerBound: 1 },
  );
  element(baseDefinition, "eType", "ecore:EClass", null, {
    href: "http://www.eclipse.org/uml2/5.0.0/UML#//InstanceSpecification",
  });
  const metaclassImport = element(
    profile,
    "elementImport",
    "ElementImport",
    "metaclassImport",
  );
  element(metaclassImport, "importedElement", "Class", null, {
    href: `${contract.uml}#InstanceSpecification`,
  });
  const stereotype = element(
    profile,
    "packagedElement",
    "Stereotype",
    "sourceRecord",
    { name: "SourceRecord" },
  );
  const base = element(
    stereotype,
    "ownedAttribute",
    "Property",
    "baseInstance",
    { name: "base_InstanceSpecification", association: "sourceExtension" },
  );
  element(base, "type", "Class", null, {
    href: `${contract.uml}#InstanceSpecification`,
  });
  const extension = element(
    profile,
    "packagedElement",
    "Extension",
    "sourceExtension",
    {
      name: "InstanceSpecification_SourceRecord",
      memberEnd: "extensionEnd baseInstance",
    },
  );
  element(extension, "ownedEnd", "ExtensionEnd", "extensionEnd", {
    name: "extension_SourceRecord",
    type: "sourceRecord",
    aggregation: "composite",
    association: "sourceExtension",
  });
  const instance = (id, classifier) =>
    element(preservation, "packagedElement", "InstanceSpecification", id, {
      classifier,
    });
  const slot = (owner, field, values, references = false) => {
    const id = stableId(
      "slot",
      `${owner.getAttributeNS(contract.xmi, "id")}\n${field}`,
    );
    const node = element(owner, "slot", "Slot", id, { definingFeature: field });
    values.forEach((value, index) =>
      element(
        node,
        "value",
        references ? "InstanceValue" : "LiteralString",
        `${id}_${index}`,
        references ? { instance: value } : { value },
      ),
    );
  };
  return {
    document,
    root,
    model,
    preservation,
    projection,
    element,
    instance,
    slot,
  };
}

/** Every arbitrary scalar uses canonical padded UTF-8 base64, including empty strings. */
export function encodeScalar(value) {
  if (typeof value !== "string" || !value.isWellFormed())
    throw new Error("Ill-formed preservation scalar");
  return Buffer.from(value, "utf8").toString("base64");
}

export function serializeMetadataDocument(document) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(document)}\n`;
  if (Buffer.byteLength(xml) > contract.maxXmlBytes)
    throw new Error("UML metadata XML byte limit exceeded");
  return xml;
}
