import { parseRdfXmlToQuads } from "../../rdfXmlToJsonLd.js";
import register from "../../../docs/uml/mapping-register.v1.json" with { type: "json" };

const OWL = "http://www.w3.org/2002/07/owl#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string";
const structural = new Set(
  register.rows.filter((r) => r.id.startsWith("S")).map((r) => r.iri),
);
const metadata = (predicate) =>
  !structural.has(predicate) && predicate !== `${OWL}imports`;
const key = (tuple) => {
  // Ordered tuples contain only fixed-position arrays and scalar fields. Object
  // property order never participates in this oracle's metadata identity.
  return JSON.stringify(tuple);
};
const ordered = (values) =>
  values.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

/** Independent RDF/XML oracle for terms and reified annotation trees in the frozen corpus. */
export async function compareOntologyMetadata({
  rdfXml,
  recovery,
  sourceName,
  fallbackBaseIri,
}) {
  const quads = await parseRdfXmlToQuads({
    rdfXml,
    sourceName,
    fallbackBaseIri,
  });
  const outgoing = new Map();
  const reified = new Map();
  const reificationsByBase = new Map();
  for (const quad of quads) {
    const subject = `${quad.subject.termType}:${quad.subject.value}`;
    if (!outgoing.has(subject)) outgoing.set(subject, []);
    outgoing.get(subject).push(quad);
  }
  const simpleTerm = (term) => {
    if (term.termType === "NamedNode") return ["iri", term.value];
    if (term.termType === "Literal")
      return [
        "literal",
        term.value,
        term.datatype?.value ?? XSD_STRING,
        term.language ?? "",
      ];
    return ["blank", term.value];
  };
  for (const [subject, values] of outgoing) {
    const parts = [
      "annotatedSource",
      "annotatedProperty",
      "annotatedTarget",
    ].map((name) =>
      values.filter((q) => q.predicate.value === `${OWL}${name}`),
    );
    if (!parts.some((p) => p.length)) continue;
    if (
      parts.some((p) => p.length !== 1) ||
      parts[1][0].object.termType !== "NamedNode"
    )
      throw new Error("Ambiguous source annotation reification");
    const base = parts.map((p) => p[0].object);
    reified.set(subject, base);
    const id = key(base.map(simpleTerm));
    if (!reificationsByBase.has(id)) reificationsByBase.set(id, []);
    reificationsByBase.get(id).push(subject);
  }
  const sourceContextCache = new Map();
  const sourceSignatureCache = new Map();
  function signatures(subject, active = new Set()) {
    if (sourceSignatureCache.has(subject))
      return sourceSignatureCache.get(subject);
    if (active.has(subject) || active.size > 64)
      throw new Error("Cyclic or excessive source annotation nesting");
    const next = new Set([...active, subject]);
    const result = [];
    for (const quad of outgoing.get(subject) ?? []) {
      if (
        !metadata(quad.predicate.value) ||
        [
          RDF_TYPE,
          `${OWL}annotatedSource`,
          `${OWL}annotatedProperty`,
          `${OWL}annotatedTarget`,
        ].includes(quad.predicate.value)
      )
        continue;
      const children =
        reificationsByBase.get(
          key([quad.subject, quad.predicate, quad.object].map(simpleTerm)),
        ) ?? [];
      const value = sourceTerm(quad.object);
      if (children.length)
        for (const child of children)
          result.push([quad.predicate.value, value, signatures(child, next)]);
      else result.push([quad.predicate.value, value, []]);
    }
    const sorted = ordered(result);
    sourceSignatureCache.set(subject, sorted);
    return sorted;
  }
  function sourceTerm(term, active = new Set()) {
    if (term.termType !== "BlankNode") return simpleTerm(term);
    const subject = `${term.termType}:${term.value}`;
    if (sourceContextCache.has(subject)) return sourceContextCache.get(subject);
    const base = reified.get(subject);
    if (!base)
      throw new Error(
        "Frozen-corpus oracle needs an independently specified anonymous term context",
      );
    if (active.has(subject) || active.size > 64)
      throw new Error("Cyclic source annotation attachment");
    const result = [
      "annotated-statement",
      sourceTerm(base[0], new Set([...active, subject])),
      base[1].value,
      sourceTerm(base[2], new Set([...active, subject])),
      signatures(subject),
    ];
    sourceContextCache.set(subject, result);
    return result;
  }
  const expected = new Map();
  const predicateCounts = {};
  for (const quad of quads) {
    predicateCounts[quad.predicate.value] =
      (predicateCounts[quad.predicate.value] ?? 0) + 1;
    if (metadata(quad.predicate.value)) {
      const tuple = [
        sourceTerm(quad.subject),
        quad.predicate.value,
        sourceTerm(quad.object),
      ];
      expected.set(key(tuple), tuple);
    }
  }

  // This decoder traverses the documented inverse graph, never the producer's
  // OWL capture or field-selection code. Source expectations above use RDF/JS.
  const nodes = new Map(recovery.records.map((r) => [r.id, r]));
  const scalar = (node, field) => node?.fields[field]?.[0]?.scalar;
  const child = (node, field) => nodes.get(node?.fields[field]?.[0]?.reference);
  const kind = (node) => scalar(node, "kind");
  const string = (node, field) => {
    const value = scalar(node, field);
    if (!value?.startsWith("string:"))
      throw new Error(`Expected recovered string field: ${field}`);
    return value.slice(7);
  };
  const members = (node) =>
    (node?.fields.member ?? []).map((v) => nodes.get(v.reference));
  const annotations = (node) => members(child(node, "annotations"));
  function recoveredTerm(node) {
    if (kind(node) === "IRI") return ["iri", string(node, "value")];
    if (kind(node) === "OWLLiteral")
      return [
        "literal",
        string(node, "lexicalForm"),
        string(child(child(node, "datatype"), "iri"), "value"),
        string(node, "language"),
      ];
    if (node?.fields.iri) return recoveredTerm(child(node, "iri"));
    throw new Error(
      `Frozen-corpus oracle needs an independently specified recovered context: ${kind(node)}`,
    );
  }
  const annotationSignatures = (values) =>
    ordered(
      values.map((a) => [
        recoveredTerm(child(a, "property"))[1],
        recoveredTerm(child(a, "value")),
        annotationSignatures(annotations(a)),
      ]),
    );
  const actual = new Map();
  const emit = (tuple) => {
    if (metadata(tuple[1])) actual.set(key(tuple), tuple);
  };
  function walkAnnotations(values, owner) {
    for (const annotation of values) {
      const predicate = recoveredTerm(child(annotation, "property"))[1];
      const value = recoveredTerm(child(annotation, "value"));
      emit([owner, predicate, value]);
      const nested = annotations(annotation);
      if (nested.length)
        walkAnnotations(nested, [
          "annotated-statement",
          owner,
          predicate,
          value,
          annotationSignatures(nested),
        ]);
    }
  }
  const root = nodes.get(recovery.rootId);
  const ontologyId = child(root, "id");
  const ontologyIri = recoveredTerm(child(ontologyId, "ontologyIRI"));
  const version = child(ontologyId, "versionIRI");
  if (kind(version) === "IRI")
    emit([ontologyIri, `${OWL}versionIRI`, recoveredTerm(version)]);
  walkAnnotations(
    (root.fields.annotation ?? []).map((v) => nodes.get(v.reference)),
    ontologyIri,
  );
  const assertionKinds = new Set([
    "OWLAnnotationAssertionAxiom",
    "OWLDataPropertyAssertionAxiom",
    "OWLObjectPropertyAssertionAxiom",
  ]);
  for (const node of nodes.values()) {
    let base;
    if (assertionKinds.has(kind(node))) {
      base = [
        recoveredTerm(child(node, "subject")),
        recoveredTerm(child(node, "property"))[1],
        recoveredTerm(child(node, "value")),
      ];
      emit(base);
    } else if (
      kind(node) === "OWLSubClassOfAxiom" &&
      annotations(node).length
    ) {
      base = [
        recoveredTerm(child(node, "subClass")),
        "http://www.w3.org/2000/01/rdf-schema#subClassOf",
        recoveredTerm(child(node, "superClass")),
      ];
    }
    const attached = annotations(node);
    if (attached.length && kind(node)?.endsWith("Axiom")) {
      if (!base)
        throw new Error(
          `Unspecified corpus oracle axiom context: ${kind(node)}`,
        );
      walkAnnotations(attached, [
        "annotated-statement",
        ...base,
        annotationSignatures(attached),
      ]);
    }
  }
  const missing = [...expected]
    .filter(([id]) => !actual.has(id))
    .map(([, value]) => value);
  const extra = [...actual]
    .filter(([id]) => !expected.has(id))
    .map(([, value]) => value);
  return {
    sourceStatementEvents: quads.length,
    predicateCounts,
    expectedRecords: expected.size,
    recoveredRecords: actual.size,
    missing,
    extra,
    equality: {
      subject: !missing.length && !extra.length,
      predicate: !missing.length && !extra.length,
      nodeKind: !missing.length && !extra.length,
      lexical: !missing.length && !extra.length,
      datatype: !missing.length && !extra.length,
      language: !missing.length && !extra.length,
      attachment: !missing.length && !extra.length,
    },
  };
}
