import { createHash } from "node:crypto";
import rdfCanonize from "rdf-canonize";

const VOCABULARY = "urn:universal-ontology:structural-verification:";
// An explicit taxonomy admission list makes a newly added package kind fail closed.
const KINDS = new Set(
  `IRI OWLLiteral OWLAnonymousIndividual OWLAnnotation OWLImportsDeclaration OWLOntologyID
OWLClass OWLDatatype OWLObjectProperty OWLDataProperty OWLAnnotationProperty OWLNamedIndividual OWLObjectInverseOf
OWLObjectIntersectionOf OWLObjectUnionOf OWLObjectComplementOf OWLObjectOneOf OWLObjectSomeValuesFrom OWLObjectAllValuesFrom
OWLObjectHasValue OWLObjectHasSelf OWLObjectMinCardinality OWLObjectMaxCardinality OWLObjectExactCardinality
OWLDataSomeValuesFrom OWLDataAllValuesFrom OWLDataHasValue OWLDataMinCardinality OWLDataMaxCardinality OWLDataExactCardinality
OWLDataIntersectionOf OWLDataUnionOf OWLDataComplementOf OWLDataOneOf OWLDatatypeRestriction OWLFacetRestriction
OWLDeclarationAxiom OWLSubClassOfAxiom OWLEquivalentClassesAxiom OWLDisjointClassesAxiom OWLDisjointUnionAxiom
OWLSubObjectPropertyOfAxiom OWLSubPropertyChainOfAxiom OWLEquivalentObjectPropertiesAxiom OWLDisjointObjectPropertiesAxiom
OWLObjectPropertyDomainAxiom OWLObjectPropertyRangeAxiom OWLInverseObjectPropertiesAxiom OWLFunctionalObjectPropertyAxiom
OWLInverseFunctionalObjectPropertyAxiom OWLReflexiveObjectPropertyAxiom OWLIrreflexiveObjectPropertyAxiom
OWLSymmetricObjectPropertyAxiom OWLAsymmetricObjectPropertyAxiom OWLTransitiveObjectPropertyAxiom
OWLSubDataPropertyOfAxiom OWLEquivalentDataPropertiesAxiom OWLDisjointDataPropertiesAxiom OWLDataPropertyDomainAxiom
OWLDataPropertyRangeAxiom OWLFunctionalDataPropertyAxiom OWLDatatypeDefinitionAxiom OWLHasKeyAxiom OWLSameIndividualAxiom
OWLDifferentIndividualsAxiom OWLClassAssertionAxiom OWLObjectPropertyAssertionAxiom OWLNegativeObjectPropertyAssertionAxiom
OWLDataPropertyAssertionAxiom OWLNegativeDataPropertyAssertionAxiom OWLAnnotationAssertionAxiom
OWLSubAnnotationPropertyOfAxiom OWLAnnotationPropertyDomainAxiom OWLAnnotationPropertyRangeAxiom`.split(
    /\s+/u,
  ),
);

function literal(value) {
  const text = String(value);
  if (!text.isWellFormed())
    throw new Error("Structural value contains an unpaired surrogate");
  return `"${[...text]
    .map((character) => {
      if (character === '"' || character === "\\") return `\\${character}`;
      const code = character.charCodeAt(0);
      return code < 32 || code === 127
        ? `\\u${code.toString(16).padStart(4, "0")}`
        : character;
    })
    .join("")}"`;
}

/** Hash complete OWL structure modulo anonymous-individual renaming, never source labels. */
export async function ontologyStructuralFingerprint(ontology) {
  const statements = new Map();
  const individuals = new Map();
  let counter = 0;
  const node = () => `_:n${counter++}`;
  const edge = (subject, field, object) => {
    if (!statements.has(subject)) statements.set(subject, []);
    statements
      .get(subject)
      .push([`<${VOCABULARY}${encodeURIComponent(field)}>`, object]);
  };
  // Only anonymous-individual identity needs graph canonicalization. Ground
  // structure has a deterministic identity; representing every repeated named
  // expression as a fresh blank node creates unnecessary deep comparisons.
  function finish(subject) {
    const outgoing = statements.get(subject);
    if (outgoing.some(([, object]) => object.startsWith("_:"))) return subject;
    const content = [...new Set(outgoing.map((row) => JSON.stringify(row)))]
      .sort()
      .join("\n");
    const stable = `<${VOCABULARY}structure:${createHash("sha256").update(content).digest("hex")}>`;
    statements.delete(subject);
    statements.set(stable, outgoing);
    return stable;
  }
  function encode(value) {
    if (value === undefined) return literal("undefined");
    if (value === null || typeof value !== "object")
      return literal(`${typeof value}:${String(value)}`);
    if (!KINDS.has(value.kind))
      throw new Error(
        `Unsupported structural verification kind: ${value.kind}`,
      );
    if (value.kind === "OWLAnonymousIndividual") {
      const key = value.structuralKey();
      if (!individuals.has(key)) {
        const individual = node();
        individuals.set(key, individual);
        edge(individual, "kind", literal(value.kind));
      }
      return individuals.get(key);
    }
    const subject = node();
    edge(subject, "kind", literal(value.kind));
    // Anonymous ontology tokens are process-local and deliberately nonstructural here.
    const fields =
      value.kind === "OWLOntologyID"
        ? {
            ontologyIRI: value.ontologyIRI,
            versionIRI: value.versionIRI,
            anonymous: value.ontologyIRI === undefined,
          }
        : value;
    for (const [field, item] of Object.entries(fields)) {
      if (field === "kind") continue;
      if (Array.isArray(item) || item instanceof Set) {
        const collection = node();
        const ordered =
          field === "chain" ||
          (field === "properties" &&
            ["OWLDataSomeValuesFrom", "OWLDataAllValuesFrom"].includes(
              value.kind,
            ));
        edge(collection, "collection", literal(ordered ? "sequence" : "set"));
        let index = 0;
        for (const member of item)
          edge(
            collection,
            ordered ? `index:${index++}` : "member",
            encode(member),
          );
        edge(subject, field, finish(collection));
      } else edge(subject, field, encode(item));
    }
    return finish(subject);
  }
  const root = node();
  edge(root, "kind", literal("Ontology"));
  edge(root, "id", encode(ontology.getOntologyID()));
  for (const annotation of ontology.getAnnotations())
    edge(root, "annotation", encode(annotation));
  for (const declaration of ontology.getImportsDeclarations())
    edge(root, "import", encode(declaration));
  for (const axiom of ontology.getAxioms()) edge(root, "axiom", encode(axiom));
  const quads = [...statements].flatMap(([subject, outgoing]) =>
    outgoing.map(
      ([predicate, object]) => `${subject} ${predicate} ${object} .`,
    ),
  );
  // The library's whole-document N-Quads parser scans all prior quads for
  // duplicates. Our encoder emits one deterministic spelling per term, so
  // deduplicate those rows once and use its public parser on each single quad.
  // Passing the resulting dataset avoids quadratic ingestion on real closures.
  const dataset = [...new Set(quads)].flatMap((quad) =>
    rdfCanonize.NQuads.parse(`${quad}\n`),
  );
  const canonical = await rdfCanonize.canonize(dataset, {
    algorithm: "RDFC-1.0",
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
