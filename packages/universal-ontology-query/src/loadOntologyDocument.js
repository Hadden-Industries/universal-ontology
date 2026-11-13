import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { OWLManager } from "owlapi/apibinding";
import { StringDocumentSource } from "owlapi/io";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import oxigraph from "oxigraph";
import {
  serializeOntologyAssertion,
  queryOntologyContext,
  findOntologyConnections,
} from "./ontologyContextQueries.js";
import { createOntologyDocumentLexicalIndex } from "./createOntologyDocumentLexicalIndex.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
import { freezeJsonValueDeeply } from "./jsonValueImmutability.js";

const mediaTypes = new Map([
  ["turtle", "text/turtle"],
  ["rdfxml", "application/rdf+xml"],
]);
const maxBytes = 32 * 1024 * 1024;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function capture(source, parsingMode) {
  const { bytes, documentIRI, format } = source;
  if (!mediaTypes.has(format) || typeof documentIRI !== "string")
    throw new TypeError(
      "A captured document requires an RDF/XML or Turtle format and document IRI.",
    );
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes)
    throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
  // Both parsers receive the same immutable text, including its document base.
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new OntologyQueryError("ONTOLOGY_DOCUMENT_REFUSED", {
      message: "The source is not valid UTF-8.",
      cause,
    });
  }
  const snapshotId =
    "urn:uo:snapshot:" +
    sha256(JSON.stringify([documentIRI, format, parsingMode, sha256(bytes)]));
  return {
    documentIRI,
    format,
    snapshotId,
    text,
    source: new StringDocumentSource(text, { documentIRI, format }),
  };
}

function failureReason(error) {
  for (let cause = error; cause; cause = cause.cause) {
    const value = cause.reason;
    if (typeof value === "string" && /^[A-Z][A-Z_0-9]{0,79}$/u.test(value))
      return value;
  }
  return /^[A-Z][A-Z_0-9]{0,79}$/u.test(error?.code ?? "")
    ? error.code
    : "OWL_PARSE_FAILURE";
}

function loadGraph(root, byImport, parsingMode, signal, requireComplete) {
  const byDocument = new Map(
    [...byImport.values()].map((doc) => [doc.documentIRI, doc]),
  );
  // Mapping provides only already captured documents. An import declaration
  // cannot acquire a local file or a network resource.
  const manager = OWLManager.createOWLOntologyManager({
    behaviorProfileId: "normative-v1",
    iriMappers: [
      { getDocumentIRI: (iri) => byImport.get(iri.value)?.documentIRI },
    ],
    documentLoader: {
      load(iri, context) {
        const admitted = byImport.get(context.importIRI.value);
        return admitted === byDocument.get(iri.value)
          ? admitted?.source
          : undefined;
      },
    },
  });
  return manager.loadOntologyGraphFromOntologyDocument(
    root.source,
    new OWLOntologyLoaderConfiguration({
      behaviorProfileId: "normative-v1",
      parsingMode,
      remoteImports: false,
      remoteJsonLdContexts: false,
      missingImportHandling: requireComplete ? "throw" : "diagnostic",
      loadAnnotationAxioms: true,
      rdfDatasetGraphPolicy: "requireSingleGraph",
      maxQuads: 200000,
      maxImportCount: 32,
      signal,
    }),
  );
}

function validateSelection(input, snapshotRef) {
  if (
    (input.rootSnapshotId &&
      input.rootSnapshotId !== snapshotRef.rootSnapshotId) ||
    (input.snapshotRef && !isDeepStrictEqual(input.snapshotRef, snapshotRef)) ||
    input.ontologyReleaseSelection ||
    input.selectedSnapshotIds ||
    (input.graphSelection &&
      input.graphSelection !== snapshotRef.graphSelection)
  )
    throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
}

/** Admit one captured root and operator-bound imports through OwlAPI. Index
 * original RDF under distinct named graphs only after OWL reconstruction.
 * The caller owns the resulting view until close().
 */
export async function loadOntologyDocument({
  bytes,
  documentIRI,
  format,
  parsingMode = "compatible",
  imports = [],
  requireComplete = false,
  signal,
}) {
  if (!["compatible", "preserve"].includes(parsingMode))
    throw new TypeError("Invalid OWL mapping mode.");
  if (
    imports.length > 15 ||
    imports.reduce(
      (total, entry) => total + entry.bytes.byteLength,
      bytes.byteLength,
    ) > maxBytes
  )
    throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
  signal?.throwIfAborted();
  const root = capture({ bytes, documentIRI, format }, parsingMode);
  const byImport = new Map();
  const captured = new Map([[documentIRI, root]]);
  for (const entry of imports) {
    if (byImport.has(entry.importIRI) || captured.has(entry.documentIRI))
      throw new TypeError("Conflicting ontology import binding.");
    const doc = capture(entry, parsingMode);
    byImport.set(entry.importIRI, doc);
    captured.set(entry.documentIRI, doc);
  }
  let loaded;
  try {
    loaded = await loadGraph(
      root,
      byImport,
      parsingMode,
      signal,
      requireComplete,
    );
  } catch (cause) {
    signal?.throwIfAborted();
    const diagnostic = failureReason(cause);
    // A deferred OWL reconstruction error need not name the failing document.
    // Do not attribute such an error to a particular import without evidence.
    const subject = imports.length ? "Ontology closure" : "Root document";
    throw new OntologyQueryError("ONTOLOGY_DOCUMENT_REFUSED", {
      message: `${subject} refused in ${parsingMode} mode (${diagnostic}).`,
      cause,
    });
  }
  const documents = loaded.documents.map(({ context }) => {
    const doc = captured.get(context.documentIRI.value);
    if (!doc) throw new Error("Parser returned an unadmitted document.");
    return {
      doc,
      unresolved: context.diagnostics
        .filter((d) => d.importIRI)
        .map((d) => ({ importIri: d.importIRI.value, reason: d.code })),
    };
  });
  const snapshotIds = [
    root.snapshotId,
    ...documents
      .map(({ doc }) => doc.snapshotId)
      .filter((id) => id !== root.snapshotId)
      .sort(),
  ];
  const graphSelection =
    imports.length || requireComplete ? "catalogued_imports" : "source_graph";
  const selectionSha256 = sha256(
    JSON.stringify([
      snapshotIds,
      graphSelection,
      requireComplete,
      [...byImport.keys()]
        .sort()
        .map((iri) => [iri, byImport.get(iri).snapshotId]),
    ]),
  );
  const snapshotRef = Object.freeze({
    catalogSha256: selectionSha256,
    selectionSha256,
    rootSnapshotId: root.snapshotId,
    snapshotIds: Object.freeze(snapshotIds),
    graphSelection,
  });
  const importCoverage = freezeJsonValueDeeply(
    documents.map(({ doc, unresolved }) => ({
      snapshotId: doc.snapshotId,
      unresolved,
    })),
  );
  const store = new oxigraph.Store();
  try {
    // Blank node labels are scoped to the input document. Keep at most one
    // result page plus its overflow marker per blank subject during ingestion.
    const blankStatements = new Map();
    for (const { doc } of documents) {
      const graph = oxigraph.namedNode(doc.snapshotId);
      const scope = (t) =>
        t.termType === "BlankNode"
          ? oxigraph.blankNode("b" + doc.snapshotId.slice(-64) + "_" + t.value)
          : t;
      for (const q of oxigraph.parse([doc.text], {
        format: mediaTypes.get(doc.format),
        base_iri: doc.documentIRI,
      })) {
        const quad = oxigraph.quad(
          scope(q.subject),
          q.predicate,
          scope(q.object),
          graph,
        );
        if (quad.subject.termType === "BlankNode") {
          const rows = blankStatements.get(quad.subject.value) ?? [];
          if (
            rows.length < 33 &&
            !rows.some((existing) => existing.equals(quad))
          )
            rows.push(quad);
          blankStatements.set(quad.subject.value, rows);
        }
        store.add(quad);
        if (store.size > 200000)
          throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
      }
    }
    function resourceRows(subject, graph, limit) {
      if (subject.termType === "BlankNode")
        return (blankStatements.get(subject.value) ?? [])
          .filter((q) => q.graph.equals(graph))
          .slice(0, limit);
      const rows = store.query(
        `SELECT ?p ?o WHERE { GRAPH ${graph.toString()} { ${subject.toString()} ?p ?o } } LIMIT ${limit}`,
      );
      return rows.map((row) =>
        oxigraph.quad(subject, row.get("p"), row.get("o"), graph),
      );
    }
    const knownTerms = new Set(
      loaded.documents.flatMap(({ ontology }) =>
        [...ontology.getClassesInSignature()].map((c) => c.iri.value),
      ),
    );
    signal?.throwIfAborted();
    const lexical = createOntologyDocumentLexicalIndex(
      store,
      loaded.documents.flatMap(({ ontology }) => [...ontology.getSignature()]),
    );
    const documentContext = {
      viewId: selectionSha256,
      resourceRows,
      knownTerms,
      includeOccurrences: true,
    };
    const authored = loaded.ontology.getOntologyID();
    const titlePredicate = oxigraph.namedNode("http://purl.org/dc/terms/title");
    const title =
      authored.ontologyIRI &&
      store
        .match(
          oxigraph.namedNode(authored.ontologyIRI.value),
          titlePredicate,
          null,
          oxigraph.namedNode(root.snapshotId),
        )
        .find((q) => q.object.termType === "Literal")?.object.value;
    let closed = false;
    return {
      snapshotId: root.snapshotId,
      snapshotRef,
      selectionSha256,
      graphSelection,
      parsingMode,
      title: title || authored.ontologyIRI?.value || "Ontology document",
      versionIri: authored.versionIRI?.value ?? null,
      format,
      lexical,
      classCount: loaded.ontology.getClassesInSignature().size,
      findConnections(input) {
        if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
        return findOntologyConnections(store, {
          ...input,
          ...documentContext,
        });
      },
      getResource({ sourceGraph, termType, value, ontologyId }) {
        if (
          closed ||
          ontologyId !== selectionSha256 ||
          !snapshotIds.includes(sourceGraph)
        )
          throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE");
        const subject =
          termType === "NamedNode"
            ? oxigraph.namedNode(value)
            : oxigraph.blankNode(value);
        const graph = oxigraph.namedNode(sourceGraph);
        const rows = resourceRows(subject, graph, 33);
        return {
          resourceHandle: { ontologyId, sourceGraph, termType, value },
          resolved: rows.length > 0,
          complete: rows.length <= 32,
          statements: rows.slice(0, 32).map(serializeOntologyAssertion),
        };
      },
      getContext(input) {
        if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
        validateSelection(input, snapshotRef);
        if (input.entityIdentifier.identifierKind !== "entity_iri")
          throw new OntologyQueryError("UNKNOWN_ENTITY");
        const entityIri = input.entityIdentifier.identifierValue;
        const context = queryOntologyContext(store, {
          ...input,
          entityIri,
          ...documentContext,
        });
        const definitions = context.nodes.find(
          (node) => node.entityIri === entityIri,
        ).definitions;
        if (
          input.definitionAssertionRef &&
          !definitions.some(
            (entry) =>
              entry.definitionAssertionRef === input.definitionAssertionRef,
          )
        )
          throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
        return {
          outcome: "success",
          resultKind: "ontology_entity_context",
          snapshotRef,
          context,
          importCoverage,
          selectedDefinitionAssertionRef:
            input.definitionAssertionRef ??
            (definitions.length === 1
              ? definitions[0].definitionAssertionRef
              : null),
        };
      },
      close() {
        if (!closed) {
          closed = true;
          blankStatements.clear();
          knownTerms.clear();
          store.free();
        }
      },
    };
  } catch (error) {
    store.free();
    throw error;
  }
}
