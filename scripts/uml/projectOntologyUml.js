import { resolveApplicableOntologyProjectionPropertyIris } from "universal-ontology-projection-policy";
import { ONTOLOGY_STRUCTURE_NAMESPACE as vocabulary } from "../ontology/ontologyStructuralVocabulary.js";
import { encodeScalar, stableId } from "./umlMetadataXml.js";

/** Conservative asserted projection; all original structures remain in typed carriers. */
export function projectOntologyUml({
  ontology,
  context,
  dataset,
  nodes,
  writer,
}) {
  const { element, projection, instance, slot } = writer;
  const axioms = [...ontology.getAxioms()];
  const path =
    context.ontologyPath ?? ontology.getOntologyID().ontologyIRI?.value ?? "";
  const labelProperties = new Set(
    resolveApplicableOntologyProjectionPropertyIris(path, "preferredLabel"),
  );
  const definitionProperties = new Set(
    resolveApplicableOntologyProjectionPropertyIris(path, "definition"),
  );
  const labels = new Map();
  const definitions = new Map();
  for (const axiom of axioms) {
    if (
      axiom.kind !== "OWLAnnotationAssertionAxiom" ||
      axiom.subject.kind !== "IRI" ||
      axiom.value.kind !== "OWLLiteral"
    )
      continue;
    const target = labelProperties.has(axiom.property.iri.value)
      ? labels
      : definitionProperties.has(axiom.property.iri.value)
        ? definitions
        : null;
    if (!target) continue;
    if (!target.has(axiom.subject.value)) target.set(axiom.subject.value, []);
    target.get(axiom.subject.value).push(axiom.value);
  }
  const name = (iri) => {
    const values = [...(labels.get(iri) ?? [])].sort((a, b) => {
      const left = `${a.language === "en" ? "0" : "1"}:${a.language}:${a.lexicalForm}`;
      const right = `${b.language === "en" ? "0" : "1"}:${b.language}:${b.lexicalForm}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    return values[0]?.lexicalForm || iri.split(/[/#:]/u).at(-1) || iri;
  };
  const namespaceOf = (iri) =>
    iri.slice(
      0,
      Math.max(
        iri.lastIndexOf("#"),
        iri.lastIndexOf("/"),
        iri.lastIndexOf(":"),
      ) + 1,
    );
  const names = new Map();
  for (const entity of ontology.getSignature()) {
    const candidate = `${namespaceOf(entity.iri.value)}\n${name(entity.iri.value)}`;
    if (!names.has(candidate)) names.set(candidate, new Set());
    names.get(candidate).add(`${entity.kind}:${entity.iri.value}`);
  }
  const displayName = (entity) =>
    names.get(`${namespaceOf(entity.iri.value)}\n${name(entity.iri.value)}`)
      ?.size > 1
      ? `${name(entity.iri.value)} [${entity.kind}: ${entity.iri.value}]`
      : name(entity.iri.value);
  const packages = new Map();
  const owningPackage = (iri) => {
    const namespace = namespaceOf(iri);
    if (!packages.has(namespace))
      packages.set(
        namespace,
        element(
          projection,
          "packagedElement",
          "Package",
          stableId("namespace", namespace),
          { name: namespace },
        ),
      );
    return packages.get(namespace);
  };
  const key = (term) => `${term.termType}:${term.value}`;
  const bySubject = new Map();
  for (const quad of dataset) {
    if (!bySubject.has(key(quad.subject)))
      bySubject.set(key(quad.subject), new Map());
    bySubject.get(key(quad.subject)).set(quad.predicate.value, quad.object);
  }
  const sources = new Map();
  for (const [identity, fields] of bySubject) {
    const kind = fields.get(`${vocabulary}kind`)?.value;
    const iri = fields.get(`${vocabulary}iri`);
    const value =
      iri && bySubject.get(key(iri))?.get(`${vocabulary}value`)?.value;
    if (kind && value?.startsWith("string:"))
      sources.set(`${kind}:${value.slice(7)}`, nodes.get(identity).id);
  }
  const projected = new Map();
  function correspondence(entity, id, rule) {
    const source = sources.get(`${entity.kind}:${entity.iri.value}`);
    if (!source)
      throw new Error("Projected source has no preservation identity");
    const record = instance(
      stableId("correspondence", id),
      "ProjectionCorrespondence",
    );
    slot(record, "ProjectionCorrespondence_source", [source], true);
    slot(record, "ProjectionCorrespondence_umlElementId", [encodeScalar(id)]);
    slot(record, "ProjectionCorrespondence_rule", [encodeScalar(rule)]);
    projected.set(`${entity.kind}:${entity.iri.value}`, id);
  }
  const entitySort = (a, b) =>
    a.iri.value < b.iri.value ? -1 : a.iri.value > b.iri.value ? 1 : 0;
  const classes = new Map();
  const datatypes = new Map();
  for (const [entities, type, target] of [
    [ontology.getClassesInSignature(), "Class", classes],
    [ontology.getDatatypesInSignature(), "DataType", datatypes],
  ]) {
    for (const entity of [...entities].sort(entitySort)) {
      const id = stableId(type.toLowerCase(), entity.iri.value);
      const node = element(
        owningPackage(entity.iri.value),
        "packagedElement",
        type,
        id,
        { name: displayName(entity) },
      );
      target.set(entity.iri.value, { id, node });
      correspondence(entity, id, `asserted-${type.toLowerCase()}-v1`);
      for (const [index, definition] of [
        ...(definitions.get(entity.iri.value) ?? []),
      ]
        .sort((a, b) =>
          a.lexicalForm < b.lexicalForm
            ? -1
            : a.lexicalForm > b.lexicalForm
              ? 1
              : 0,
        )
        .entries()) {
        const comment = element(
          node,
          "ownedComment",
          "Comment",
          `${id}_definition_${index}`,
        );
        const body = element(comment, "body");
        body.appendChild(
          writer.document.createTextNode(definition.lexicalForm),
        );
      }
    }
  }
  const generalizations = new Set();
  const ancestors = new Map();
  const reaches = (from, target) => {
    const pending = [from];
    const visited = new Set();
    while (pending.length) {
      const current = pending.pop();
      if (current === target) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      pending.push(...(ancestors.get(current) ?? []));
    }
    return false;
  };
  for (const axiom of [...axioms].sort((a, b) =>
    a.structuralKey() < b.structuralKey()
      ? -1
      : a.structuralKey() > b.structuralKey()
        ? 1
        : 0,
  )) {
    if (
      axiom.kind !== "OWLSubClassOfAxiom" ||
      axiom.subClass.kind !== "OWLClass" ||
      axiom.superClass.kind !== "OWLClass"
    )
      continue;
    const sub = classes.get(axiom.subClass.iri.value);
    const sup = classes.get(axiom.superClass.iri.value);
    const id = stableId("generalization", `${sub.id}\n${sup.id}`);
    if (generalizations.has(id)) continue;
    // OWL permits cyclic subclass assertions; UML Generalization does not.
    // Keep the complete asserted cycle in preservation, and emit only a DAG.
    if (reaches(sup.id, sub.id)) continue;
    generalizations.add(id);
    if (!ancestors.has(sub.id)) ancestors.set(sub.id, new Set());
    ancestors.get(sub.id).add(sup.id);
    element(sub.node, "generalization", "Generalization", id, {
      general: sup.id,
    });
  }
  const propertyAxioms = new Map();
  for (const axiom of axioms) {
    if (
      ![
        "OWLObjectPropertyDomainAxiom",
        "OWLObjectPropertyRangeAxiom",
        "OWLDataPropertyDomainAxiom",
        "OWLDataPropertyRangeAxiom",
      ].includes(axiom.kind)
    )
      continue;
    if (!axiom.property.iri) continue;
    const iri = axiom.property.iri.value;
    if (!propertyAxioms.has(iri))
      propertyAxioms.set(iri, {
        property: axiom.property,
        domains: new Map(),
        ranges: new Map(),
      });
    const record = propertyAxioms.get(iri);
    const value = axiom.domain ?? axiom.range;
    (axiom.domain ? record.domains : record.ranges).set(
      value.structuralKey(),
      value,
    );
  }
  function unconstrainedEnd(parent, tag, id, attributes) {
    const end = element(parent, tag, "Property", id, attributes);
    element(end, "lowerValue", "LiteralInteger", `${id}_lower`, { value: 0 });
    element(end, "upperValue", "LiteralUnlimitedNatural", `${id}_upper`, {
      value: "*",
    });
  }
  let properties = 0;
  for (const [iri, record] of [...propertyAxioms].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (record.domains.size !== 1 || record.ranges.size !== 1) continue;
    const domain = [...record.domains.values()][0];
    const range = [...record.ranges.values()][0];
    if (domain.kind !== "OWLClass") continue;
    const source = classes.get(domain.iri.value);
    if (
      record.property.kind === "OWLObjectProperty" &&
      range.kind === "OWLClass"
    ) {
      const id = stableId("association", iri);
      const target = classes.get(range.iri.value);
      const association = element(
        owningPackage(iri),
        "packagedElement",
        "Association",
        id,
        {
          name: displayName(record.property),
          memberEnd: `${id}_source ${id}_target`,
          navigableOwnedEnd: `${id}_target`,
        },
      );
      unconstrainedEnd(association, "ownedEnd", `${id}_source`, {
        name: "subject",
        type: source.id,
        association: id,
      });
      unconstrainedEnd(association, "ownedEnd", `${id}_target`, {
        name: "value",
        type: target.id,
        association: id,
      });
      correspondence(record.property, id, "single-asserted-domain-range-v1");
      properties++;
    } else if (
      record.property.kind === "OWLDataProperty" &&
      range.kind === "OWLDatatype"
    ) {
      const id = stableId("attribute", iri);
      unconstrainedEnd(source.node, "ownedAttribute", id, {
        name: displayName(record.property),
        type: datatypes.get(range.iri.value).id,
      });
      correspondence(record.property, id, "single-asserted-domain-datatype-v1");
      properties++;
    }
  }
  const assertions = new Map();
  for (const axiom of axioms) {
    if (
      axiom.kind !== "OWLClassAssertionAxiom" ||
      axiom.individual.kind !== "OWLNamedIndividual" ||
      axiom.classExpression.kind !== "OWLClass"
    )
      continue;
    const iri = axiom.individual.iri.value;
    if (!assertions.has(iri))
      assertions.set(iri, { entity: axiom.individual, classes: new Set() });
    assertions
      .get(iri)
      .classes.add(classes.get(axiom.classExpression.iri.value).id);
  }
  for (const [iri, record] of [...assertions].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const id = stableId("individual", iri);
    element(
      owningPackage(iri),
      "packagedElement",
      "InstanceSpecification",
      id,
      {
        name: displayName(record.entity),
        classifier: [...record.classes].sort().join(" "),
      },
    );
    correspondence(record.entity, id, "asserted-named-class-instance-v1");
  }
  const preservationOnlyKinds = {};
  const projectedSources = new Set(
    [...projected].map(([entity]) => sources.get(entity)),
  );
  for (const quad of dataset) {
    if (quad.predicate.value !== `${vocabulary}kind`) continue;
    if (!projectedSources.has(nodes.get(key(quad.subject)).id))
      preservationOnlyKinds[quad.object.value] =
        (preservationOnlyKinds[quad.object.value] ?? 0) + 1;
  }
  return {
    classes: classes.size,
    datatypes: datatypes.size,
    properties,
    individuals: assertions.size,
    generalizations: generalizations.size,
    preservationOnly: nodes.size - projected.size,
    preservationOnlyKinds,
  };
}
