import {
  resolveApplicableOntologyProjectionPropertyIris,
  resolveLegacySourceInterpretations,
} from "../ontologyProjectionProperties.js";
import {
  AbsoluteIriSchema,
  OntologyArtifactFamilyIdSchema,
  OntologyReleaseQueryIndexSchema,
  OntologyVersionTagSchema,
  deepFreeze,
} from "./ontologyQuerySchemas.js";

const RDF_TYPE_IRI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_DATATYPE_IRI = "http://www.w3.org/2000/01/rdf-schema#Datatype";
const RDFS_SEE_ALSO_IRI = "http://www.w3.org/2000/01/rdf-schema#seeAlso";
const RDFS_SUBCLASS_OF_IRI = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
const OWL_NAMESPACE_IRI = "http://www.w3.org/2002/07/owl#";
const OWL_ONTOLOGY_IRI = `${OWL_NAMESPACE_IRI}Ontology`;
const OWL_ANNOTATED_SOURCE_IRI = `${OWL_NAMESPACE_IRI}annotatedSource`;
const OWL_ANNOTATED_PROPERTY_IRI = `${OWL_NAMESPACE_IRI}annotatedProperty`;
const OWL_ANNOTATED_TARGET_IRI = `${OWL_NAMESPACE_IRI}annotatedTarget`;
const OWL_VERSION_IRI = `${OWL_NAMESPACE_IRI}versionIRI`;
const SKOS_NAMESPACE_IRI = "http://www.w3.org/2004/02/skos/core#";
const DCTERMS_NAMESPACE_IRI = "http://purl.org/dc/terms/";
const DC_ELEMENTS_NAMESPACE_IRI = "http://purl.org/dc/elements/1.1/";

const ENTITY_KIND_BY_ASSERTED_TYPE_IRI = new Map([
  [`${OWL_NAMESPACE_IRI}Class`, "owl_class"],
  [`${OWL_NAMESPACE_IRI}ObjectProperty`, "owl_object_property"],
  [`${OWL_NAMESPACE_IRI}DatatypeProperty`, "owl_datatype_property"],
  [`${OWL_NAMESPACE_IRI}AnnotationProperty`, "owl_annotation_property"],
  [`${OWL_NAMESPACE_IRI}NamedIndividual`, "owl_named_individual"],
  [RDFS_DATATYPE_IRI, "rdfs_datatype"],
]);

const ENTITY_KIND_ORDER = new Map(
  [...ENTITY_KIND_BY_ASSERTED_TYPE_IRI.values()].map((kind, index) => [
    kind,
    index,
  ]),
);

const AXIOM_STRUCTURAL_PROPERTY_IRIS = new Set([
  RDF_TYPE_IRI,
  OWL_ANNOTATED_SOURCE_IRI,
  OWL_ANNOTATED_PROPERTY_IRI,
  OWL_ANNOTATED_TARGET_IRI,
]);

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireSha256(value, location) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError(`${location} must be a lowercase SHA-256 digest.`);
  }
}

function termKey(term) {
  switch (term.termType) {
    case "NamedNode":
      return `N\u0000${term.value}`;
    case "BlankNode":
      return `B\u0000${term.value}`;
    case "Literal":
      return `L\u0000${term.value}\u0000${term.datatype.value}\u0000${term.language.toLowerCase()}`;
    case "DefaultGraph":
      return "D";
    default:
      throw new TypeError(`Unsupported RDF/JS term type: ${term.termType}`);
  }
}

function assertionTupleKey(subject, predicate, object) {
  return `${termKey(subject)}\u0001${termKey(predicate)}\u0001${termKey(object)}`;
}

function toRdfObjectValue(term) {
  if (term.termType === "NamedNode") {
    return {
      termKind: "named_node",
      iri: term.value,
    };
  }

  if (term.termType === "Literal") {
    return {
      termKind: "literal",
      value: {
        lexicalForm: term.value,
        datatypeIri: term.datatype.value,
        languageTag: term.language ? term.language.toLowerCase() : null,
      },
    };
  }

  return null;
}

function objectValueKey(objectValue) {
  return objectValue.termKind === "named_node"
    ? `N\u0000${objectValue.iri}`
    : `L\u0000${objectValue.value.lexicalForm}\u0000${objectValue.value.datatypeIri}\u0000${objectValue.value.languageTag ?? ""}`;
}

function annotationKey(annotation) {
  return `${annotation.annotationPropertyIri}\u0000${objectValueKey(annotation.annotationValue)}`;
}

function lexicalAssertionKey(assertion) {
  return `${assertion.assertionPropertyIri}\u0000${assertion.literalValue.lexicalForm}\u0000${assertion.literalValue.datatypeIri}\u0000${assertion.literalValue.languageTag ?? ""}\u0000${assertion.assertionAnnotations.map(annotationKey).join("\u0001")}`;
}

function objectAssertionKey(assertion) {
  return `${assertion.assertionPropertyIri}\u0000${objectValueKey(assertion.objectValue)}\u0000${assertion.assertionAnnotations.map(annotationKey).join("\u0001")}`;
}

function sortAndDeduplicate(values, createKey) {
  const uniqueValuesByKey = new Map();

  for (const value of values) {
    uniqueValuesByKey.set(createKey(value), value);
  }

  return [...uniqueValuesByKey.entries()]
    .sort(([left], [right]) => compareBinary(left, right))
    .map(([, value]) => value);
}

function groupQuadsBySubject(quads) {
  const groupedQuads = new Map();

  for (const quad of quads) {
    const key = termKey(quad.subject);
    const subjectQuads = groupedQuads.get(key) ?? [];
    subjectQuads.push(quad);
    groupedQuads.set(key, subjectQuads);
  }

  return groupedQuads;
}

function findSingleObject(subjectQuads, predicateIri) {
  return subjectQuads.find(({ predicate }) => predicate.value === predicateIri)
    ?.object;
}

function indexAssertionAnnotations(groupedQuads) {
  const annotationsByAssertionTuple = new Map();

  for (const subjectQuads of groupedQuads.values()) {
    const annotatedSource = findSingleObject(
      subjectQuads,
      OWL_ANNOTATED_SOURCE_IRI,
    );
    const annotatedProperty = findSingleObject(
      subjectQuads,
      OWL_ANNOTATED_PROPERTY_IRI,
    );
    const annotatedTarget = findSingleObject(
      subjectQuads,
      OWL_ANNOTATED_TARGET_IRI,
    );

    if (
      !annotatedSource ||
      !annotatedProperty ||
      !annotatedTarget ||
      annotatedSource.termType !== "NamedNode" ||
      annotatedProperty.termType !== "NamedNode"
    ) {
      continue;
    }

    const annotations = [];

    for (const { predicate, object } of subjectQuads) {
      if (AXIOM_STRUCTURAL_PROPERTY_IRIS.has(predicate.value)) {
        continue;
      }

      const annotationValue = toRdfObjectValue(object);

      if (annotationValue) {
        annotations.push({
          annotationPropertyIri: predicate.value,
          annotationValue,
        });
      }
    }

    const tupleKey = assertionTupleKey(
      annotatedSource,
      annotatedProperty,
      annotatedTarget,
    );
    const existingAnnotations = annotationsByAssertionTuple.get(tupleKey) ?? [];
    annotationsByAssertionTuple.set(
      tupleKey,
      sortAndDeduplicate(
        [...existingAnnotations, ...annotations],
        annotationKey,
      ),
    );
  }

  return annotationsByAssertionTuple;
}

function deriveOntologyIdentity(quads, sourceArtifactUrl) {
  const ontologyIris = sortAndDeduplicate(
    quads
      .filter(
        ({ subject, predicate, object }) =>
          subject.termType === "NamedNode" &&
          predicate.value === RDF_TYPE_IRI &&
          object.termType === "NamedNode" &&
          object.value === OWL_ONTOLOGY_IRI,
      )
      .map(({ subject }) => subject.value),
    (value) => value,
  );

  if (ontologyIris.length === 0) {
    throw new Error("The source-artifact graph has no named owl:Ontology.");
  }

  const sourceUrl = new URL(sourceArtifactUrl);
  const sourcePathSegments = sourceUrl.pathname.split("/").filter(Boolean);
  sourcePathSegments.pop();
  sourceUrl.pathname = `/${sourcePathSegments.join("/")}`;
  sourceUrl.search = "";
  sourceUrl.hash = "";
  const expectedOntologyIri = sourceUrl.href.replace(/\/$/u, "");
  const ontologyIri = ontologyIris.includes(expectedOntologyIri)
    ? expectedOntologyIri
    : ontologyIris[0];
  const versionIris = sortAndDeduplicate(
    quads
      .filter(
        ({ subject, predicate, object }) =>
          subject.termType === "NamedNode" &&
          subject.value === ontologyIri &&
          predicate.value === OWL_VERSION_IRI &&
          object.termType === "NamedNode",
      )
      .map(({ object }) => object.value),
    (value) => value,
  );

  return {
    ontologyIri,
    versionIri: versionIris[0] ?? sourceArtifactUrl,
  };
}

function projectOntologyEntityDescription({
  entityIri,
  subjectQuads,
  resolvedOntologyRelease,
  annotationIndex,
  preferredLabelPropertyIris,
  alternativeLabelPropertyIris,
  definitionPropertyIris,
  scopeNotePropertyIris,
  identifierPropertyIris,
  creatorPropertyIris,
  legacySourceInterpretations,
}) {
  const entityKinds = [];
  const assertedClassMembershipIris = [];
  const identifierAssertions = [];
  const creatorAssertions = [];
  const preferredLabelAssertions = [];
  const alternativeLabelAssertions = [];
  const lexicalDefinitionAssertions = [];
  const scopeNoteAssertions = [];
  const entitySourceIris = [];
  const seeAlsoIris = [];
  const directNamedSuperclassIris = [];

  for (const quad of subjectQuads) {
    const { predicate, object } = quad;

    if (predicate.value === RDF_TYPE_IRI && object.termType === "NamedNode") {
      assertedClassMembershipIris.push(object.value);
      const entityKind = ENTITY_KIND_BY_ASSERTED_TYPE_IRI.get(object.value);

      if (entityKind) {
        entityKinds.push(entityKind);
      }
    }

    const assertionAnnotations =
      annotationIndex.get(assertionTupleKey(quad.subject, predicate, object)) ??
      [];
    const objectValue = toRdfObjectValue(object);

    if (identifierPropertyIris.has(predicate.value) && objectValue) {
      identifierAssertions.push({
        assertionPropertyIri: predicate.value,
        objectValue,
        assertionAnnotations,
      });
    }

    if (creatorPropertyIris.has(predicate.value) && objectValue) {
      creatorAssertions.push({
        assertionPropertyIri: predicate.value,
        objectValue,
        assertionAnnotations,
      });
    }

    if (object.termType === "Literal") {
      const lexicalAssertion = {
        assertionPropertyIri: predicate.value,
        literalValue: toRdfObjectValue(object).value,
        assertionAnnotations,
      };

      if (preferredLabelPropertyIris.has(predicate.value)) {
        preferredLabelAssertions.push(lexicalAssertion);
      }

      if (alternativeLabelPropertyIris.has(predicate.value)) {
        alternativeLabelAssertions.push(lexicalAssertion);
      }

      if (definitionPropertyIris.has(predicate.value)) {
        lexicalDefinitionAssertions.push(lexicalAssertion);
      }

      if (scopeNotePropertyIris.has(predicate.value)) {
        scopeNoteAssertions.push(lexicalAssertion);
      }
    }

    if (
      predicate.value === `${DCTERMS_NAMESPACE_IRI}source` &&
      object.termType === "NamedNode"
    ) {
      entitySourceIris.push(object.value);
    }

    for (const interpretation of legacySourceInterpretations) {
      if (
        predicate.value === interpretation.observedPropertyIri &&
        object.termType === "NamedNode" &&
        object.value.startsWith(interpretation.valueIriPrefix)
      ) {
        entitySourceIris.push(object.value);
      }
    }

    if (
      predicate.value === RDFS_SEE_ALSO_IRI &&
      object.termType === "NamedNode"
    ) {
      seeAlsoIris.push(object.value);
    }

    // A blank-node rdfs:subClassOf object usually denotes a restriction or
    // another class expression. Emitting it as a superclass IRI would erase
    // OWL semantics, so the v1 projection includes only named-node objects.
    if (
      predicate.value === RDFS_SUBCLASS_OF_IRI &&
      object.termType === "NamedNode"
    ) {
      directNamedSuperclassIris.push(object.value);
    }
  }

  return {
    entityIri,
    resolvedOntologyRelease,
    assertionScope: "source_artifact_graph",
    entityKinds: [...new Set(entityKinds)].sort(
      (left, right) =>
        ENTITY_KIND_ORDER.get(left) - ENTITY_KIND_ORDER.get(right),
    ),
    identifierAssertions: sortAndDeduplicate(
      identifierAssertions,
      objectAssertionKey,
    ),
    creatorAssertions: sortAndDeduplicate(
      creatorAssertions,
      objectAssertionKey,
    ),
    preferredLabelAssertions: sortAndDeduplicate(
      preferredLabelAssertions,
      lexicalAssertionKey,
    ),
    alternativeLabelAssertions: sortAndDeduplicate(
      alternativeLabelAssertions,
      lexicalAssertionKey,
    ),
    lexicalDefinitionAssertions: sortAndDeduplicate(
      lexicalDefinitionAssertions,
      lexicalAssertionKey,
    ),
    scopeNoteAssertions: sortAndDeduplicate(
      scopeNoteAssertions,
      lexicalAssertionKey,
    ),
    entitySourceIris: sortAndDeduplicate(entitySourceIris, (value) => value),
    seeAlsoIris: sortAndDeduplicate(seeAlsoIris, (value) => value),
    directNamedSuperclassIris: sortAndDeduplicate(
      directNamedSuperclassIris,
      (value) => value,
    ),
    assertedClassMembershipIris: sortAndDeduplicate(
      assertedClassMembershipIris,
      (value) => value,
    ),
  };
}

/**
 * Project one immutable RDF source-artifact graph into its deterministic query
 * index. The projection is asserted-data-only: it performs no import loading,
 * inference, class-expression flattening, or lexical synthesis.
 *
 * Complexity is linear in quad count plus deterministic output sorting. Quad
 * groups and OWL axiom tuples are indexed once; entity projection never scans
 * the complete graph for each entity.
 */
export function createOntologyReleaseQueryIndex({
  quads,
  ontologyArtifactFamilyId,
  versionTag,
  sourceArtifactRelativePath,
  sourceArtifactUrl,
  sourceArtifactSha256,
}) {
  if (!Array.isArray(quads)) {
    throw new TypeError("quads must be an array of RDF/JS quads.");
  }

  OntologyArtifactFamilyIdSchema.parse(ontologyArtifactFamilyId);
  OntologyVersionTagSchema.parse(versionTag);
  AbsoluteIriSchema.parse(sourceArtifactUrl);
  requireSha256(sourceArtifactSha256, "sourceArtifactSha256");

  if (
    typeof sourceArtifactRelativePath !== "string" ||
    sourceArtifactRelativePath === ""
  ) {
    throw new TypeError("sourceArtifactRelativePath must be a non-empty path.");
  }

  const { ontologyIri, versionIri } = deriveOntologyIdentity(
    quads,
    sourceArtifactUrl,
  );
  const resolvedOntologyRelease = {
    ontologyArtifactFamilyId,
    versionTag,
    sourceArtifactUrl,
    sourceArtifactSha256,
    ontologyIri,
    versionIri,
  };
  const groupedQuads = groupQuadsBySubject(quads);
  const annotationIndex = indexAssertionAnnotations(groupedQuads);
  const preferredLabelPropertyIris = new Set(
    resolveApplicableOntologyProjectionPropertyIris(
      sourceArtifactRelativePath,
      "preferredLabel",
    ),
  );
  const definitionPropertyIris = new Set(
    resolveApplicableOntologyProjectionPropertyIris(
      sourceArtifactRelativePath,
      "definition",
    ),
  );
  const creatorPropertyIris = new Set(
    resolveApplicableOntologyProjectionPropertyIris(
      sourceArtifactRelativePath,
      "creator",
    ),
  );
  const legacySourceInterpretations = resolveLegacySourceInterpretations(
    sourceArtifactRelativePath,
  );
  const alternativeLabelPropertyIris = new Set([
    `${SKOS_NAMESPACE_IRI}altLabel`,
  ]);
  const scopeNotePropertyIris = new Set([`${SKOS_NAMESPACE_IRI}scopeNote`]);
  const identifierPropertyIris = new Set([
    `${DCTERMS_NAMESPACE_IRI}identifier`,
    `${DC_ELEMENTS_NAMESPACE_IRI}identifier`,
  ]);
  const entityIris = sortAndDeduplicate(
    quads
      .filter(
        ({ subject, predicate, object }) =>
          subject.termType === "NamedNode" &&
          predicate.value === RDF_TYPE_IRI &&
          object.termType === "NamedNode" &&
          ENTITY_KIND_BY_ASSERTED_TYPE_IRI.has(object.value),
      )
      .map(({ subject }) => subject.value),
    (value) => value,
  );
  const ontologyEntityDescriptions = entityIris.map((entityIri) =>
    projectOntologyEntityDescription({
      entityIri,
      subjectQuads: groupedQuads.get(`N\u0000${entityIri}`),
      resolvedOntologyRelease,
      annotationIndex,
      preferredLabelPropertyIris,
      alternativeLabelPropertyIris,
      definitionPropertyIris,
      scopeNotePropertyIris,
      identifierPropertyIris,
      creatorPropertyIris,
      legacySourceInterpretations,
    }),
  );
  const queryIndex = OntologyReleaseQueryIndexSchema.parse({
    queryArtifactKind: "universal_ontology_release_query_index",
    queryArtifactFormatVersion: 1,
    resolvedOntologyRelease,
    ontologyEntityDescriptions,
  });

  return deepFreeze(queryIndex);
}
