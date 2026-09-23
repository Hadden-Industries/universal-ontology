import { createHash } from "node:crypto";
import oxigraph from "oxigraph";
import { OntologyQueryError } from "./ontologyQueryErrors.js";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL = "http://www.w3.org/2002/07/owl#";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const SOURCE = "http://purl.org/dc/terms/source";
const structuralPredicates = new Set(
  ["subClassOf", "domain", "range", "subPropertyOf"]
    .map((name) => RDFS + name)
    .concat(
      [
        "equivalentClass",
        "disjointWith",
        "equivalentProperty",
        "inverseOf",
        "sameAs",
        "differentFrom",
      ].map((name) => OWL + name),
    ),
);
const declarationTypes = new Set(
  [
    "Class",
    "ObjectProperty",
    "DatatypeProperty",
    "AnnotationProperty",
    "NamedIndividual",
    "Ontology",
    "Restriction",
    "Axiom",
  ]
    .map((name) => OWL + name)
    .concat([`${RDFS}Datatype`, `${RDF}Property`]),
);
const expressionPredicates = new Set(
  [
    "onProperty",
    "onClass",
    "onDataRange",
    "someValuesFrom",
    "allValuesFrom",
    "hasValue",
    "hasSelf",
    "qualifiedCardinality",
    "minQualifiedCardinality",
    "maxQualifiedCardinality",
    "cardinality",
    "minCardinality",
    "maxCardinality",
    "unionOf",
    "intersectionOf",
    "oneOf",
    "complementOf",
    "inverseOf",
  ]
    .map((name) => OWL + name)
    .concat([`${RDF}first`, `${RDF}rest`, `${RDF}type`]),
);
const operators = [
  "someValuesFrom",
  "allValuesFrom",
  "hasValue",
  "hasSelf",
  "qualifiedCardinality",
  "minQualifiedCardinality",
  "maxQualifiedCardinality",
  "cardinality",
  "minCardinality",
  "maxCardinality",
];
const iri = (value) => oxigraph.namedNode(value).toString();
const key = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Explain shortest admitted named-resource chains. */
export function findOntologyConnections(store, input) {
  requireEntity(store, input.targetEntityIri);
  const context = queryOntologyContext(store, input);
  const direction = input.direction ?? "both";
  const maximumPaths = input.maximumPaths ?? 3;
  const adjacency = new Map();
  const add = (source, target, connection) => {
    if (!adjacency.has(source)) adjacency.set(source, []);
    adjacency.get(source).push({ target, connection });
  };
  for (const connection of context.connections) {
    // Property descriptions support a restriction, but are not concept hops.
    if (connection.role === "restriction_property") continue;
    if (direction !== "incoming")
      add(connection.sourceIri, connection.targetIri, connection);
    if (direction !== "outgoing")
      add(connection.targetIri, connection.sourceIri, connection);
  }
  const distances = new Map([[input.entityIri, 0]]);
  const predecessors = new Map();
  const queue = [input.entityIri];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const distance = distances.get(current);
    if (
      distance >= input.depth ||
      distance >= (distances.get(input.targetEntityIri) ?? Infinity)
    )
      continue;
    for (const { target, connection } of adjacency.get(current) ?? []) {
      if (!distances.has(target)) {
        distances.set(target, distance + 1);
        queue.push(target);
      }
      if (distances.get(target) === distance + 1) {
        if (!predecessors.has(target)) predecessors.set(target, []);
        predecessors.get(target).push({ previous: current, connection });
      }
    }
  }
  const paths = [];
  function collect(current, reversed) {
    if (paths.length > maximumPaths) return;
    if (current === input.entityIri) {
      paths.push([...reversed].reverse());
      return;
    }
    for (const { previous, connection } of predecessors.get(current) ?? []) {
      collect(previous, [...reversed, connection]);
      if (paths.length > maximumPaths) break;
    }
  }
  if (distances.has(input.targetEntityIri)) collect(input.targetEntityIri, []);
  const incomplete = context.completeness.truncationReasons.length > 0;
  return {
    status: incomplete
      ? "search_incomplete"
      : paths.length
        ? "paths_found"
        : "no_path_within_depth",
    paths: paths.slice(0, maximumPaths),
    additionalShortestPathsOmitted: paths.length > maximumPaths,
    shortestPathsEstablished: !incomplete && paths.length > 0,
    context,
  };
}

function requireEntity(store, entityIri) {
  const value = iri(entityIri);
  if (
    !store.query(
      `ASK { GRAPH ?g { { ${value} ?p ?o } UNION { ?s ?p ${value} } UNION { ?s ${value} ?o } } }`,
    )
  )
    throw new OntologyQueryError("UNKNOWN_ENTITY");
}

/** Preserve RDF lexical identity when crossing the WASM/JSON boundary. */
function term(term) {
  return term.termType === "Literal"
    ? {
        termType: term.termType,
        value: term.value,
        language: term.language,
        datatype: term.datatype.value,
      }
    : { termType: term.termType, value: term.value };
}

function assertion(quad) {
  const value = {
    subject: term(quad.subject),
    predicateIri: quad.predicate.value,
    object: term(quad.object),
    sourceGraph: quad.graph.value,
  };
  return { assertionRef: key(value), ...value };
}

/**
 * UO projection above the native store: RDF witnesses stay distinct from OWL
 * structural references. The request-local frontier implements the agreed
 * named-resource depth convention, which SPARQL property paths do not encode.
 */
export function queryOntologyContext(store, input) {
  requireEntity(store, input.entityIri);
  const depth = input.depth ?? 1;
  const maximumNodes = input.maximumNodes ?? 40;
  const maximumConnections = input.maximumConnections ?? 120;
  const direction = input.direction ?? "both";
  const profile = input.relationProfile ?? "definition_review";
  const reasons = new Set();
  const budget = input.budget ?? { candidates: 0 };
  let candidates = budget.candidates;
  const nodes = new Map();
  const connections = new Map();
  const expressions = new Map();
  const projectedExpressions = new Set();
  const visited = new Map([[input.entityIri, 0]]);
  const frontier = [input.entityIri];
  let completedDepth = 0;

  function select(query) {
    if (candidates >= 10000) {
      reasons.add("candidate_limit");
      return [];
    }
    const remaining = 10000 - candidates;
    const rows = store.query(`${query} LIMIT ${remaining + 1}`);
    if (rows.length > remaining) reasons.add("candidate_limit");
    candidates += Math.min(rows.length, remaining);
    return rows.slice(0, remaining);
  }

  function statements(entityIri) {
    return select(
      `SELECT ?g ?p ?o WHERE { GRAPH ?g { ${iri(entityIri)} ?p ?o } } ORDER BY ?g ?p ?o`,
    ).map((row) =>
      oxigraph.quad(
        oxigraph.namedNode(entityIri),
        row.get("p"),
        row.get("o"),
        row.get("g"),
      ),
    );
  }

  function describeSource(node, graph) {
    if (node.termType !== "BlankNode") return undefined;
    const statements = [];
    const pending = [node];
    const seen = new Set();
    let complete = true;
    while (pending.length) {
      const current = pending.shift();
      if (seen.has(current.value)) {
        complete = false;
        continue;
      }
      seen.add(current.value);
      if (seen.size > 8 || statements.length >= 32 || candidates >= 10000) {
        complete = false;
        break;
      }
      const matches = store.match(current, null, null, graph);
      const remaining = Math.min(32 - statements.length, 10000 - candidates);
      if (!matches.length || matches.length > remaining) complete = false;
      const admitted = matches.slice(0, remaining);
      candidates += admitted.length;
      for (const quad of admitted) {
        statements.push(assertion(quad));
        if (quad.object.termType === "BlankNode") pending.push(quad.object);
      }
    }
    return { statements, complete };
  }

  function sourceEvidence(entityIri, predicateIri, literal) {
    const rows = select(`SELECT ?g ?source WHERE { GRAPH ?g {
      ?axiom ${iri(`${RDF}type`)} ${iri(`${OWL}Axiom`)};
      ${iri(`${OWL}annotatedSource`)} ${iri(entityIri)};
      ${iri(`${OWL}annotatedProperty`)} ${iri(predicateIri)};
      ${iri(`${OWL}annotatedTarget`)} ${literal.toString()};
      ${iri(SOURCE)} ?source . } } ORDER BY ?g ?source`);
    return rows.map((row) => ({
      term: term(row.get("source")),
      annotationGraph: row.get("g").value,
      ...(row.get("source").termType === "BlankNode"
        ? { description: describeSource(row.get("source"), row.get("g")) }
        : {}),
    }));
  }

  function describe(entityIri) {
    if (nodes.has(entityIri)) return nodes.get(entityIri);
    if (nodes.size >= maximumNodes) {
      reasons.add("node_limit");
      return null;
    }
    const quads = statements(entityIri);
    const entitySources = quads
      .filter(
        ({ predicate, object, graph }) =>
          predicate.value === SOURCE ||
          (input.projectionPolicies?.[graph.value]?.legacySources ?? []).some(
            (rule) =>
              predicate.value === rule.observedPropertyIri &&
              object.termType === "NamedNode" &&
              object.value.startsWith(rule.valueIriPrefix),
          ),
      )
      .map((quad) => ({
        ...assertion(quad),
        ...(quad.object.termType === "BlankNode"
          ? { sourceDescription: describeSource(quad.object, quad.graph) }
          : {}),
      }));
    const definitions = quads
      .filter(
        ({ predicate, object, graph }) =>
          (
            input.projectionPolicies?.[graph.value]?.definitionPredicates ?? [
              `${SKOS}definition`,
            ]
          ).includes(predicate.value) && object.termType === "Literal",
      )
      .map((quad) => {
        const definitionSources = sourceEvidence(
          entityIri,
          quad.predicate.value,
          quad.object,
        );
        const incomplete =
          reasons.has("candidate_limit") ||
          definitionSources.some(
            (source) => source.description?.complete === false,
          ) ||
          (!definitionSources.length &&
            entitySources.some(
              (source) => source.sourceDescription?.complete === false,
            ));
        return {
          definitionAssertionRef: assertion(quad).assertionRef,
          predicateIri: quad.predicate.value,
          term: term(quad.object),
          definitionGraph: quad.graph.value,
          sourceStatus: incomplete
            ? "source_evidence_incomplete"
            : definitionSources.length
              ? "definition_source_recorded"
              : entitySources.length
                ? "entity_source_only"
                : "no_recorded_source",
          definitionSources,
          entitySources,
          sourceQuality: "not_evaluated",
        };
      });
    const value = {
      detailsOmitted: false,
      entityIri,
      descriptionAvailable: quads.length > 0,
      kinds: quads
        .filter(({ predicate }) => predicate.value === `${RDF}type`)
        .map(({ object }) => term(object)),
      labels: quads
        .filter(
          ({ predicate, object }) =>
            [`${SKOS}prefLabel`, `${RDFS}label`].includes(predicate.value) &&
            object.termType === "Literal",
        )
        .map(assertion),
      definitions,
      notes: quads
        .filter(
          ({ predicate, object }) =>
            [
              `${SKOS}scopeNote`,
              `${SKOS}example`,
              `${SKOS}note`,
              `${SKOS}editorialNote`,
              `${RDFS}comment`,
            ].includes(predicate.value) && object.termType === "Literal",
        )
        .map((quad) => ({
          ...assertion(quad),
          sources: sourceEvidence(entityIri, quad.predicate.value, quad.object),
        })),
      entitySources,
    };
    nodes.set(entityIri, value);
    return value;
  }

  function admittedPredicate(predicateIri) {
    return !input.predicateIris || input.predicateIris.includes(predicateIri);
  }

  function isRelation(quad) {
    const predicate = quad.predicate.value;
    if (!admittedPredicate(predicate)) return false;
    if (profile === "all_asserted") return true;
    if (structuralPredicates.has(predicate)) return true;
    if (predicate === `${RDF}type`)
      return !declarationTypes.has(quad.object.value);
    if (
      [
        "broader",
        "narrower",
        "related",
        "exactMatch",
        "closeMatch",
        "broadMatch",
        "narrowMatch",
        "relatedMatch",
      ].some((name) => predicate === SKOS + name)
    )
      return true;
    return (
      store.match(
        quad.predicate,
        oxigraph.namedNode(`${RDF}type`),
        oxigraph.namedNode(`${OWL}ObjectProperty`),
        null,
      ).length > 0
    );
  }

  function addConnection(connection, currentIri, distance, expand = true) {
    if (!admittedPredicate(connection.predicateIri)) return;
    const identity = key([
      connection.kind,
      connection.sourceIri,
      connection.predicateIri,
      connection.targetIri,
      connection.role,
      connection.expressionRef,
      connection.expressionPath,
      connection.restriction,
    ]);
    const existing = connections.get(identity);
    if (existing) {
      for (const witness of connection.witnesses)
        if (
          !existing.witnesses.some(
            ({ assertionRef }) => assertionRef === witness.assertionRef,
          )
        )
          existing.witnesses.push(witness);
      return;
    }
    if (connections.size >= maximumConnections) {
      reasons.add("connection_limit");
      return;
    }
    const neighbour =
      connection.sourceIri === currentIri
        ? connection.targetIri
        : connection.sourceIri;
    if (distance >= depth && !visited.has(neighbour)) return;
    if (!describe(neighbour)) return;
    connections.set(identity, { connectionRef: identity, ...connection });
    if (expand && !visited.has(neighbour) && distance < depth) {
      visited.set(neighbour, distance + 1);
      frontier.push(neighbour);
    }
  }

  function projectExpression(quad, distance, currentIri = quad.subject.value) {
    const root = quad.object;
    const expressionRef = assertion(quad).assertionRef;
    const projectionKey = `${expressionRef}:${currentIri}`;
    if (projectedExpressions.has(projectionKey)) return;
    projectedExpressions.add(projectionKey);
    const record = {
      expressionRef,
      root: term(root),
      attachment: assertion(quad),
      statements: [],
      diagnostics: [],
    };
    expressions.set(expressionRef, record);
    const pending = [{ node: root, nesting: 0, path: [] }];
    const seen = new Set();
    while (pending.length) {
      const { node, nesting, path } = pending.shift();
      if (seen.has(node.value)) {
        record.diagnostics.push("repeated_or_cyclic_structure");
        continue;
      }
      if (seen.size >= 256 || nesting >= 16 || candidates >= 10000) {
        record.diagnostics.push("expression_limit");
        reasons.add("expression_limit");
        break;
      }
      seen.add(node.value);
      // Native RDF/JS matching is needed for an already-bound blank node;
      // a SPARQL _:label would introduce a fresh existential variable instead.
      const matches = store.match(node, null, null, quad.graph);
      const remaining = Math.min(
        256 - record.statements.length,
        10000 - candidates,
      );
      if (matches.length > remaining) {
        record.diagnostics.push("expression_limit");
        reasons.add("expression_limit");
      }
      const admitted = matches.slice(0, remaining);
      candidates += admitted.length;
      record.statements.push(...admitted.map(assertion));
      const get = (predicate) =>
        admitted.find((item) => item.predicate.value === OWL + predicate)
          ?.object;
      let property = get("onProperty");
      let inverse = false;
      if (property?.termType === "BlankNode") {
        const inverseQuads = store.match(
          property,
          oxigraph.namedNode(`${OWL}inverseOf`),
          null,
          quad.graph,
        );
        if (inverseQuads.length > 10000 - candidates) {
          reasons.add("candidate_limit");
          record.diagnostics.push("expression_limit");
          break;
        }
        candidates += inverseQuads.length;
        if (inverseQuads.length === 1) {
          property = inverseQuads[0].object;
          inverse = true;
        }
      }
      const operator = operators.find((name) => get(name));
      if (property?.termType === "NamedNode" && operator) {
        const value = get(operator);
        const filler = get("onClass") ?? get("onDataRange") ?? value;
        const cardinality = operator.toLowerCase().includes("cardinality")
          ? value.value
          : null;
        const restriction = {
          operator,
          cardinality,
          qualified:
            operator.includes("Qualified") ||
            operator === "qualifiedCardinality",
          inverseProperty: inverse,
          entailsExistence: false,
          value: term(value),
          filler: term(filler),
        };
        if (
          filler.termType === "NamedNode" &&
          (currentIri === quad.subject.value || filler.value === currentIri)
        )
          addConnection(
            {
              kind: "structural",
              sourceIri: quad.subject.value,
              targetIri: filler.value,
              predicateIri: property.value,
              role: "restriction_filler",
              expressionRef,
              expressionPath: path,
              restriction,
              witnesses: [assertion(quad)],
            },
            currentIri,
            distance,
          );
        if (currentIri === quad.subject.value || property.value === currentIri)
          addConnection(
            {
              kind: "structural",
              sourceIri: quad.subject.value,
              targetIri: property.value,
              predicateIri: property.value,
              role: "restriction_property",
              expressionRef,
              expressionPath: path,
              restriction,
              witnesses: [assertion(quad)],
            },
            currentIri,
            distance,
            false,
          );
      }
      for (const child of admitted) {
        if (!expressionPredicates.has(child.predicate.value)) {
          record.diagnostics.push("unsupported_expression_predicate");
          continue;
        }
        if (child.object.termType === "BlankNode")
          pending.push({
            node: child.object,
            nesting: nesting + (child.predicate.value === `${RDF}rest` ? 0 : 1),
            path: [...path, child.predicate.value],
          });
        else if (
          child.object.termType === "NamedNode" &&
          child.predicate.value !== `${RDF}type` &&
          child.object.value !== `${RDF}nil` &&
          !property &&
          child.predicate.value !== `${OWL}onProperty`
        ) {
          if (
            currentIri === quad.subject.value ||
            child.object.value === currentIri
          )
            addConnection(
              {
                kind: "structural",
                sourceIri: quad.subject.value,
                targetIri: child.object.value,
                predicateIri: quad.predicate.value,
                role: "expression_reference",
                expressionRef,
                expressionPath: [...path, child.predicate.value],
                restriction: null,
                witnesses: [assertion(quad)],
              },
              currentIri,
              distance,
            );
        }
      }
    }
  }

  describe(input.entityIri);
  while (frontier.length && !reasons.has("candidate_limit")) {
    const current = frontier.shift();
    const distance = visited.get(current);
    if (distance >= depth) continue;
    if (direction !== "incoming") {
      for (const quad of statements(current)) {
        if (
          quad.object.termType === "BlankNode" &&
          structuralPredicates.has(quad.predicate.value)
        )
          projectExpression(quad, distance);
        else if (quad.object.termType === "NamedNode" && isRelation(quad))
          addConnection(
            {
              kind: "asserted",
              sourceIri: current,
              targetIri: quad.object.value,
              predicateIri: quad.predicate.value,
              role: "assertion",
              expressionRef: null,
              restriction: null,
              witnesses: [assertion(quad)],
            },
            current,
            distance,
          );
      }
    }
    if (direction !== "outgoing") {
      const expressionPath = [...expressionPredicates]
        .filter((predicate) => predicate !== `${RDF}type`)
        .map(iri)
        .join("|");
      const attachments = [...structuralPredicates].map(iri).join(" ");
      const expressionOwners = select(
        `SELECT DISTINCT ?g ?s ?p ?root WHERE { GRAPH ?g { VALUES ?p { ${attachments} } ?s ?p ?root . FILTER(isIRI(?s) && isBlank(?root)) ?root (${expressionPath})+ ${iri(current)} } } ORDER BY ?g ?s ?p ?root`,
      );
      for (const row of expressionOwners)
        projectExpression(
          oxigraph.quad(
            row.get("s"),
            row.get("p"),
            row.get("root"),
            row.get("g"),
          ),
          distance,
          current,
        );
      const incoming = select(
        `SELECT ?g ?s ?p WHERE { GRAPH ?g { ?s ?p ${iri(current)} FILTER(isIRI(?s)) } } ORDER BY ?g ?s ?p`,
      );
      for (const row of incoming) {
        const quad = oxigraph.quad(
          row.get("s"),
          row.get("p"),
          oxigraph.namedNode(current),
          row.get("g"),
        );
        if (isRelation(quad))
          addConnection(
            {
              kind: "asserted",
              sourceIri: quad.subject.value,
              targetIri: current,
              predicateIri: quad.predicate.value,
              role: "assertion",
              expressionRef: null,
              restriction: null,
              witnesses: [assertion(quad)],
            },
            current,
            distance,
          );
      }
    }
    completedDepth = Math.max(completedDepth, Math.min(distance + 1, depth));
  }
  budget.candidates = candidates;
  return {
    entityIri: input.entityIri,
    nodes: [...nodes.values()],
    connections: [...connections.values()].sort((left, right) => {
      const a = JSON.stringify([
        left.kind,
        left.predicateIri,
        left.targetIri,
        left.connectionRef,
      ]);
      const b = JSON.stringify([
        right.kind,
        right.predicateIri,
        right.targetIri,
        right.connectionRef,
      ]);
      return a < b ? -1 : a > b ? 1 : 0;
    }),
    expressions: [...expressions.values()],
    completeness: {
      requestedDepth: depth,
      completedExpansionDepth: reasons.size
        ? Math.max(0, completedDepth - 1)
        : depth,
      returnedNodeCount: nodes.size,
      returnedConnectionCount: connections.size,
      candidateConnectionCount: candidates,
      truncationReasons: [...reasons],
      frontierHints: frontier.slice(0, 10),
      inference: "none",
    },
  };
}
