# Ontology relationship context through MCP: implementation plan

**Status:** Proposed implementation plan, revision 1, 23 September 2026.
This document contains the draft design and requirements being planned; it is not an accepted implementation baseline.
Max has confirmed two decisions in the originating task: use explicit assertions and OWL structural summaries, and start the review queue with definitions lacking a recorded source.
The remaining design choices and performance thresholds below are proposals for acceptance.

**Goal:** Let an agent obtain the definition, source evidence, relationships, and bounded surrounding ontology context needed for a concept review through predictable MCP calls, without generating queries or reconstructing OWL structures itself.

**Architecture:** Extend the existing artifact generation and shared query package with a versioned context index, then expose it through the existing MCP server.
Build relationship adjacency and OWL expression descriptions once per immutable snapshot; execute bounded retrieval against those indexes.
Serve filesystem artifacts through both stdio and the existing loopback HTTP transport.

**Authority:** Planning and read-only investigation only.
No implementation, ontology edit, configuration change, installation, baseline acceptance, commit, push, GitHub write, or publication is performed by this proposal.
HISEW remains a personal workflow outside the product; this enhancement introduces no repository workflow engine.

## 1. Purpose, evidence, and scope

The originating request asks for fast answers to “how concepts in a particular ontology are related to each other” and for neighbours at a specified depth.
The first beneficiary is an agent reviewing definitions with no recorded source, with Max accepting the review and implementation outcomes.
Ontology consumers and existing MCP/WebMCP clients must retain accurate semantics, provenance, and predictable resource use.

“Without thinking” is an interaction requirement: the caller should select a documented operation, supply an ontology and concept, and receive usable context.
It does not mean the server controls a host model's reasoning setting or that evaluating a definition requires no judgment.
The server performs no model call, ontology inference, source-quality assessment, or automatic definition rewrite.

### Observed starting point

Repository observation: `main` at `b4b964d4df7dae60200d1cd238a6d6f28ed25715`.
Pre-existing changes to `skills-lock.json` and the untracked OWL profile review are outside this task.
The review's conclusions are not used as proof of current ontology conformance.

| Evidence                                                                                                                                                                                                       | Observation and implication                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MCP registration](../../packages/universal-ontology-mcp-server/src/createUniversalOntologyMcpServer.js), [tool definitions](../../packages/universal-ontology-mcp-server/src/universalOntologyToolSchemas.js) | Only `search_entities` and `resolve_entity` exist. A caller cannot request a neighbourhood or connections between two entities.                                                                                  |
| [Release projection](../../packages/universal-ontology-query/src/createOntologyReleaseQueryIndex.js)                                                                                                           | The projection retains named superclasses and class membership but omits anonymous superclass expressions and general relationship adjacency. Full entity detail is still a projection, not every source triple. |
| [Query schemas](../../packages/universal-ontology-query/src/ontologyQuerySchemas.js)                                                                                                                           | Catalog and release-index formats are strict version 1 objects. Adding fields to existing artifacts would break old readers.                                                                                     |
| [Query module](../../packages/universal-ontology-query/src/createOntologyQueryModule.js)                                                                                                                       | Existing digest checks, immutable release selection, shared loading, cancellation, and an LRU cache are reusable. Cache accounting uses serialized artifact bytes, not actual JavaScript heap size.              |
| [Artifact builder](../../scripts/build/createOntologyQueryArtifacts.js), [worker](../../scripts/build/ontologyAssetWorker.js)                                                                                  | RDF is already parsed during generation. The generator selects eligible immutable release files, not the live authoring `.owl` files.                                                                            |
| [Projection history](../../packages/universal-ontology-projection-policy/data/field-property-history.v1.json)                                                                                                  | Historical definition predicates and narrowly scoped legacy source interpretations already have a shared owner. Reuse these rules.                                                                               |
| [Entity policy](../../policy/entity-policy.ttl)                                                                                                                                                                | `dcterms:source` is optional and has no imposed value shape. Conceptual adequacy and external derivation remain human review questions. A URI-only citation test would lose valid literal citations.             |
| [Active modules](../../policy/activation.ttl)                                                                                                                                                                  | The active module set names exact artifacts and digests. “Largest dated filename” and “active publication” are different selections.                                                                             |

A read-only RDFLib inventory through the repository `.venv` measured the following source graphs.
These are discovery counts, not a benchmark or the final owned-entity review queue.
Definitions are counted as distinct subject/predicate/literal assertions, including languages and foreign support subjects.
The final queue additionally applies ownership and historical projection rules.

| Source artifact                         | Triples | Named subjects | `skos:definition` assertions | OWL restrictions | Definitions with neither matching definition-axiom source nor entity source |
| --------------------------------------- | ------: | -------------: | ---------------------------: | ---------------: | --------------------------------------------------------------------------: |
| `src/universal/core/20260912`           |   3,289 |            225 |                           95 |              127 |                                                                          39 |
| `src/universal/extended/20260912`       |   6,372 |            518 |                          289 |              228 |                                                                         197 |
| `src/universal/reference-data/20260912` |   9,548 |            818 |                          374 |              149 |                                                                         161 |

The source SHA-256 values are, respectively:

- Core: `214f21e9116c0515bd52e5e8e893c83fcf93eb4ce586a49dbd8afc8a05e2c190`.
- Extended: `92ad97ccb1acf4f2413dc3f1100433adbaa965ce98821f863de9df22eced7f24`.
- Reference data: `1354d260a8bf33d0e67b6145b45438be719203f71e0280d61fc498b697860260`.

### Included and excluded

Include named classes, properties, individuals, datatypes, and other named resources present in the selected graph, including referenced resources without local declarations.
Include incoming and outgoing assertions, meaningful OWL structural references, source evidence, exact snapshot identity, and explicit import coverage.
Include a local authoring-file snapshot path so repeated reviews can target saved edits.

The initial delivery does not provide an OWL reasoner, entailment closure, arbitrary SPARQL, a graph database service, embeddings, source discovery on the web, source-quality certification, ontology repair, or automatic rewriting.
It does not automatically fetch imports, index arbitrary client-supplied paths, or update the published ontology.
Publishing context artifacts for the standalone server's remote HTTP artifact mode is a separate follow-on; the local filesystem delivery must be complete first.

## 2. HISEW route

**Risk class:** R2 for implementation; inference from the public MCP contract, artifact compatibility, semantic consequences, and potentially expensive graph traversal.
This turn produces a draft plan only.

**Decision owner:** Max, as the requesting maintainer; a designated ontology reviewer owns the semantic oracle at implementation acceptance.

**Reasoning:** An incorrect restriction summary can change the apparent meaning of a concept without an obvious runtime failure.
Unbounded expansion can exhaust resources, and strict artifact readers can reject incompatible output.
No safety-critical or other R3 consequence was established.

**Potential blast radius:** The shared query package, MCP schemas and text output, local artifact generation, the distributed executable, and browser consumers of shared exports.

**Reversibility:** New tools and companion artifacts can be withdrawn together while retaining the existing executable and lookup artifacts.
No authored ontology migration is required.
This does not promise restoration of files already deleted by an operator.

**Principal unknowns:** Warm/cold performance, memory expansion, canonicalization cost, host tool-selection behavior, and the fraction of useful context outside a selected source graph.

**Required artifacts:** This draft dossier/plan, later accepted requirement snapshot, hand-checked semantic fixtures, benchmark evidence, immutable review target, review dispositions, and local rollout/recovery evidence.
Use the existing HISEW external evidence store for workflow records.

**Required specialist lenses:** RDF/OWL semantics, public MCP compatibility, and bounded filesystem/input/resource security.
Require independent verification before R2 delivery and the designated native security assessment for the implemented parsing and traversal boundaries.
This plan neither dispatches reviewers nor claims their acceptance.

**Required verification:** Focused slice checks, affected MCP/build/browser regressions, and HISEW's configured `full` profile after the candidate is frozen.
Observed project mappings are `focused` → `npm run test:unit`, `affected` → `npm run test:consumer`, and `full` → `npm run check:qualification`, each with a 600-second timeout.
The profile's name does not establish performance, host usability, or release acceptance.

**Required human approvals:** Accept the proposed design, thresholds, and exact requirement baseline before implementation.
Any required configuration delta needs separate exact-file/setting approval under `AGENTS.md`.
Commit, push, publication, and deployment retain their separate authority.

**Maximum sensible autonomy:** Complete this proposal and read-only evidence collection now; after acceptance, implement and repair within the accepted slices and applicable authorization.

**Next lifecycle step:** Review and accept this draft, capture the exact accepted requirements through HISEW, and begin SLICE-001 with that baseline.
Do not record this proposal as already accepted.

HISEW dev.12 readback for this task established personal applicability, `active: true`, project readiness, and `NO_ACTIVE_EXECUTION`.
Repository selection did not transfer another execution or establish product verification.

## 3. Requirements and acceptance criteria

All requirements serve OUT-001: reduce the calls, query construction, and RDF reconstruction required to gather correct review context.
The causal hypothesis is that indexed retrieval plus a compact evidence packet removes mechanical work from the agent.
The baseline for latency and successful host interactions is currently unmeasured.
Measure the same ontology snapshots and prompts before and after implementation; report host/model versions, bytes, calls, latency, and semantic errors separately.
Max reviews this outcome at SLICE-006 acceptance.

| Requirement                                                           | Observable acceptance                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 — Explicit ontology and snapshot scope                        | AC-001: Every result identifies the root ontology, exact source digests, snapshot kind, selected graphs, import coverage, and context identity. Never silently mix release versions or present an authoring snapshot as a published release.                  |
| REQ-002 — Retrieve the surrounding concept graph                      | AC-002: Given an exact entity and scope, one call returns its definition and a directed neighbourhood to the requested depth, including incoming references and labelled OWL expression summaries. Ambiguous names return candidates without selecting one.   |
| REQ-003 — Explain connections between two concepts                    | AC-003: One call returns bounded, shortest structural connection paths with predicates, traversal direction, expression evidence, and source provenance. A missing path is scoped to the searched graph, filters, and depth.                                  |
| REQ-004 — Find and contextualize definitions without recorded sources | AC-004: The queue identifies the exact definition assertion and separates no citation, entity-level citation only, and a citation attached to that definition. A selected queue item becomes a review context packet in one further call.                     |
| REQ-005 — Keep retrieval predictable and bounded                      | AC-005: Cycles, dense graphs, large literals, malformed expressions, invalid limits, and cancellation have explicit tested outcomes. Repeated identical requests on a snapshot have stable semantic ordering; truncation is never hidden.                     |
| REQ-006 — Minimize caller work and local latency                      | AC-006: Retrieval needs no SPARQL, shell, browser, custom traversal, or model call inside the server. Meet the accepted QA targets; a host trial verifies tool discovery and use with reasoning disabled where supported.                                     |
| REQ-007 — Preserve existing consumers and trust boundaries            | AC-007: Existing search/resolution results and v1 artifact bytes remain compatible. Both local MCP transports return equivalent graph results. Existing remote lookup, browser builds, packaging, cancellation isolation, and safe error handling still pass. |
| REQ-008 — Make local saved edits reviewable                           | AC-008: An explicit rebuild of an authoring-file snapshot changes its identity when source bytes change. Old pinned requests remain about the old snapshot; a subsequent review can select the new snapshot. No hidden watcher or remote fetch participates.  |

## 4. Software selection and design decisions

Research was checked on 23 September 2026 against repository code, installed license texts, upstream documentation, and npm's authoritative `latest` metadata.
No package was installed or executed from a floating registry reference.

| Candidate                                                                                   | Capability fit and limitation                                                                                                                                                                                                                       | Selection                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing query/projection packages, JavaScript `Map`/`Set`, native queues and `AbortSignal` | Already own snapshot validation, lexical policy, caches, and transport-independent semantics. Direct adjacency over a compact generated representation fits bounded retrieval. OWL summaries and review-source status remain product-specific work. | Recommended composition. Build only the missing context representation, traversal, and review packet.                                                                                           |
| Existing `rdfxml-streaming-parser` 3.3.0, `rdf-canonize` 5.0.0                              | Locked versions match current registry releases. Reuse strict RDF/XML parsing and RDFC-1.0 canonicalization at build time; the canonicalizer exposes `canonicalIdMap`, work limits, and cancellation. These do not supply the domain API.           | Reuse at the repository generation boundary; keep them out of the MCP runtime bundle.                                                                                                           |
| Existing MCP server/node SDK 2.0.0 and Zod 4.6.5                                            | Locked versions match current registry releases. Existing supported registration and native input/output schemas fit the new operations.                                                                                                            | Reuse, including the existing safe failure renderer and protocol negotiation.                                                                                                                   |
| [N3.js](https://github.com/rdfjs/N3.js) 2.7.12                                              | Indexed RDF/JS matching and list support could help a raw triple-store design. It still needs UO snapshot identity, projection, source status, and bounded context/path contracts.                                                                  | Credible alternative, not an additional runtime dependency in the recommended compact-index design. Reconsider if the first slice demonstrates that arbitrary quad matching dominates the work. |
| [Oxigraph JS](https://github.com/oxigraph/oxigraph/tree/main/js) 0.5.11                     | Supplies an in-memory RDF store and SPARQL through WebAssembly. It adds WASM packaging and lifecycle work, while the caller-facing context and provenance contracts remain custom.                                                                  | Defer unless workloads require general query execution or scale beyond the measured index design.                                                                                               |

N3 and Oxigraph versions above came from their npm registry records, not potentially stale source-tree version strings.
N3's MIT and Oxigraph's MIT license texts were inspected for comparison; neither component is adopted or claimed to have a cleared transitive distribution in this plan.
The reused parser's MIT, canonicalizer's BSD-3-Clause, and Zod's MIT texts were inspected locally.
The SDK's actual license includes its MIT/Apache transition and documentation terms; retain the complete existing notices rather than reducing them to the registry's MIT label.
Existing [SDK adoption restrictions](../sdlc/adoption.md#mcp-sdk-embedded-fast-uri) remain applicable: no untrusted schema ingress or new URI-fetch behavior is proposed, and current reachability/advisory evidence must be refreshed before release.

The selected residual custom work is ontology-context semantics over existing RDF parsing and validated artifact infrastructure.
No new general RDF parser, canonicalizer, reasoner, database, protocol implementation, validator, or workflow service is justified.

| Decision                                                                | Status and rationale                                                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 — Explicit assertions plus labelled OWL structural summaries    | Confirmed by Max in this task. No reasoner-derived edges.                                                                                       |
| DEC-002 — Start with definitions lacking recorded sources               | Confirmed by Max. Citation quality is reported as unevaluated.                                                                                  |
| DEC-003 — Extend the shared query/artifact architecture                 | Proposed. Reuses the current consumer boundaries and keeps domain semantics out of the MCP adapter.                                             |
| DEC-004 — Add a companion context artifact, preserve lookup v1          | Proposed. Existing schemas are strict; an independent capability artifact avoids changing old files or adding a translating compatibility shim. |
| DEC-005 — Count named-resource connections, retain expression structure | Proposed. RDF list cells and restriction implementation nodes should not consume user-visible concept depth.                                    |
| DEC-006 — Local filesystem delivery first, explicit working snapshots   | Proposed. Both local transports work; remote artifact publication and automatic import acquisition are outside this delivery.                   |
| DEC-007 — Bounded deterministic retrieval, no implicit completeness     | Proposed. Fewer tool calls must not hide omitted edges, unresolved imports, or incomplete source evidence.                                      |

Doing nothing leaves agents to search repeatedly and inspect RDF manually; it does not meet REQ-002 or REQ-003.
Teaching a model SPARQL alone would still require query construction and a new execution boundary.
The compact-index option should be rejected if the first measured slice cannot satisfy the semantic or resource contract without recreating substantial generic RDF-store functionality.

## 5. Proposed product contract

### Four new tools

Keep `search_entities` and `resolve_entity` stable.
Introduce the following tools with explicit input/output schemas, read-only annotations, and short task-oriented descriptions.
Use the existing tool naming conventions and entity-identifier vocabulary.

| Tool                                | Inputs                                                                                                                            | Result and intended use                                                                                                                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_ontology_contexts`            | Optional ontology family/name filter; bounded page size and cursor                                                                | Discover available release and working snapshots, capabilities, relation-category counts, source identities, and ready-to-use `contextRef` objects. Distinguish active publication, latest dated release, and local authoring snapshot. |
| `get_entity_neighbourhood`          | `contextRef`, `entityIdentifier`, `depth`, direction, relation profile or predicate filters, preferred languages, resource limits | Return the seed review packet, neighbours, typed connections, evidence, and completeness. Exact preferred-label ambiguity is resolved within this context; it never borrows a label from another release.                               |
| `find_entity_connections`           | `contextRef`, two typed entity identifiers, maximum depth, direction, relation filters, maximum paths                             | Return direct connections and a bounded set of shortest paths. Explain each step mechanically with its source assertion or expression reference.                                                                                        |
| `list_definition_review_candidates` | `contextRef`, source-status filter, ownership selection, preferred languages, page size and cursor                                | Return exact definition assertions with source status and the identifiers needed by `get_entity_neighbourhood`. Default to no recorded source; entity-only citations are a separate selectable category.                                |

The common workflow is discovery once, then one neighbourhood call for a known concept.
For a concept named approximately, existing search remains useful for releases; the context tools also handle exact labels within their selected snapshot.
For a review campaign, list candidates and fetch the chosen candidate's neighbourhood: two calls after context selection.
Connection questions use one connection call after scope and endpoints are known.
The caller does not manually join neighbour labels, parse blank nodes, or fetch each property's definition.

### Ontology selection and imports

A `contextRef` carries an exact root snapshot identifier and one explicit graph selection:

- `source_graph`: only the root source graph; the default.
- `catalogued_imports`: transitive imports that resolve exactly to available context artifacts, with cycle detection and a manifest of resolved and unresolved imports.
- `selected_graphs`: the root plus explicitly selected additional snapshot identifiers, useful for incoming references from extending ontologies that the root does not itself import.

An unversioned import without an unambiguous approved catalog binding stays unresolved.
Never substitute the newest release for a requested import version.
Never combine two versions of the same ontology in one context; return a selection conflict instead.
Admit at most 16 source snapshots into one context.
Do not silently traverse unrelated catalog entries or dereference an entity IRI.
An unavailable neighbour becomes an external reference with known IRI and evidence, not an invented entity description.

The existing core catalog includes a Turtle import, `src/external/time-gregorian.ttl`.
It is outside the current RDF/XML query-artifact selection.
Report it as unavailable to the context artifact loader until a separately accepted ingestion path supports it; do not describe the initial local set as a complete import closure.
The existing imports merger is not a drop-in context builder: it can load remote documents, strip headers/imports, and sanitize literals.
Those transformations would change this retrieval contract.

### Relationships and OWL expressions

Represent raw RDF assertions and structural connections as different result kinds.
Every connection retains its original direction, predicate or expression role, source graph, and evidence identifier.
Following an incoming assertion does not create an inverse RDF assertion.
Equivalence and `sameAs` assertions do not merge entity identities in this retrieval layer.

The default `definition_review` profile includes named subclass, equivalence/disjointness, meaningful class membership, property domain/range and hierarchy, inverse-property declarations, SKOS semantic links, authored object-property assertions, and restriction references.
Keep RDF/OWL declaration types and annotation/source links available as metadata without expanding through ubiquitous vocabulary nodes by default.
An `all_asserted` profile and predicate filters expose other recorded relations; category exclusions and unsupported expression coverage are reported.
Predicate filters match actual IRIs, not labels, and their interaction with the selected profile is an intersection.

Preserve expression trees and their RDF witnesses, including restriction operator, property expression, filler, qualified/unqualified cardinality, list order, nesting, and axiom annotations.
Support the restrictions and unions present in the inspected UO graphs first, with explicit tests for existential/universal/value restrictions, cardinality zero, inverse properties, intersections, and nested lists.
Unknown or malformed constructs remain bounded raw expression evidence with a diagnostic; they are never flattened into a stronger claim.
This is a structural view, not an OWL validity checker or reasoner.
The semantics follow the [OWL structural specification](https://www.w3.org/TR/owl2-syntax/) and [OWL-to-RDF mapping](https://www.w3.org/TR/owl2-mapping-to-rdf/).

Concrete acceptance seed: `https://haddenindustries.com/ontology/universal/core/AddressRelationship` in the pinned core artifact.
Its definition is “Way in which Addresses are connected”; the inventory found no source at either citation level.
It has three qualified exact-cardinality restrictions:

| Property                          | Filler                                   | Cardinality |
| --------------------------------- | ---------------------------------------- | ----------: |
| `core:hasAddressIs`               | `core:Address`                           |           1 |
| `core:hasAddressOf`               | `core:Address`                           |           1 |
| `core:hasAddressRelationshipType` | `reference-data:AddressRelationshipType` |           1 |

The current named-superclass projection returns none of these restrictions.
The new packet must expose all three, preserve the two distinct Address roles, include the incoming domain assertions of those properties, and mark the reference-data description unavailable under `source_graph` if it is not described there.
With the pinned reference-data graph selected, it may attach that graph's description with separate provenance.
It must not emit an asserted triple saying the class itself has one particular address.

### Depth, ordering, limits, and completeness

Depth zero returns the seed description without relationship expansion.
Depth one returns adjacent named resources; depth two also expands those resources.
A reference from a class through its OWL restriction to a named filler counts as one structural connection, labelled `restriction_filler`.
A property's use in the same expression can be exposed as `restriction_property`; attached property descriptions do not invent an additional RDF assertion.
Blank nodes and RDF list cells do not consume concept depth, but have independent expression-size/depth limits.
Paths use this same connection model, so a displayed depth has one consistent meaning.

Use breadth-first traversal with deduplicated nodes, a visited set, and stable tie-breaking by depth, relationship category, predicate/role, endpoint IRI, and evidence identity.
Return all admitted edge evidence within the requested neighbourhood, not merely the discovery tree.
Keep multiple predicates and source witnesses between the same endpoints.
Check boundary-node edges without expanding beyond the requested depth.
Literal values are retained metadata or terminal values and are not expandable concept neighbours.

Proposed defaults and ceilings, subject to the QA calibration slice:

| Control                                                                    |  Default | Hard ceiling |
| -------------------------------------------------------------------------- | -------: | -----------: |
| Neighbourhood depth                                                        |        1 |            4 |
| Connection-path depth                                                      |        3 |            4 |
| Returned named nodes, including supporting property descriptions           |       40 |          200 |
| Returned connections                                                       |      120 |        1,000 |
| Examined connections per request                                           |   10,000 |       10,000 |
| Returned shortest connection paths                                         |        3 |           10 |
| Candidate/discovery page size                                              |       10 |           50 |
| Expression nesting / structural nodes per expression                       | 16 / 256 |     16 / 256 |
| Complete MCP result size, UTF-8 bytes including text and structured output |   32 KiB |      128 KiB |
| Retrieval execution deadline after index acquisition                       | 1 second |     1 second |

Enforce budgets while constructing results, before large materializations.
Yield bounded traversal batches to allow cancellation and sibling requests to proceed.
Treat sorting work, expression expansion, path enumeration, frontier storage, and text rendering as part of the limits.
If a mandatory seed field cannot fit, return a size diagnostic rather than silently cutting its literal.
Long optional fields may be omitted only with explicit field-level omission metadata and a documented bounded retrieval path.

Every response distinguishes requested depth, completed expansion depth, returned counts, truncation reasons, and unresolved references/imports.
Do not report a total count unless it was actually computed or precomputed for exactly that scope.
`no_path_within_depth` is valid only after a complete bounded-depth search; a work/time limit returns `search_incomplete`.
Neither means the concepts are unrelated in the ontology's inferred semantics.
Return bounded frontier hints for a truncated neighbourhood; graph pagination is not required in version 1.
Discovery and candidate cursors bind to snapshot, filters, language selection, and stable last-key ordering; a cursor cannot select paths or another snapshot.

### Source evidence and the review packet

Classify each definition assertion using its exact subject, predicate, literal, language, datatype, and source graph:

- `definition_source_recorded`: a source annotates that exact definition assertion.
- `entity_source_only`: a source is attached to the entity, but none to that definition assertion.
- `no_recorded_source`: neither exists in that source graph under the applicable projection rules.
- `source_evidence_incomplete`: source structure is present but cannot be fully represented or resolved within supported bounds.

Default candidates are `no_recorded_source` definitions owned by the root module.
Do not suppress one uncited language's definition because another language has a cited definition.
Do not borrow a citation from a different release or from an unrelated assertion.
Entity-only citations are visible and separately queryable; they do not certify every definition's derivation.
Missing definitions are a separate result category, not “unsourced definitions.”

Retain URI, literal, and blank-node source values as RDF terms, with bounded linked descriptions where available.
A present but incomplete source structure is not absence of a source.
Reuse the existing historical source interpretation rules and report both the recorded predicate and any policy interpretation.
Do not classify arbitrary `rdfs:seeAlso` or `dcterms:references` links as definition sources.
Ownership uses the existing module declarations for recognized UO modules; an unknown ontology requires an explicit ownership scope before producing an owned-only queue.
Do not create a second editable ownership policy.
For repository generation, obtain that inventory through the existing `scripts/ontology_policy/modules.py` boundary using the repository `.venv`, then persist its identity and namespace values in the context artifact.
This is a generation-time dependency only; the MCP executable reads the admitted artifact and requires no Python environment.

The packet contains the chosen definition assertion, alternative definitions/languages, relevant labels and scope notes, citation status and evidence, neighbouring definitions, property meanings, relationship directions, OWL expression summaries, provenance, and completeness.
Deterministic text groups these into readable facts; it does not synthesize a replacement definition or a confidence score for source quality.
Both output representations carry the important scope and truncation warnings, using the existing treatment of ontology-authored strings as untrusted data.
Source presence concerns derivation metadata, consistent with [DCMI's source term](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/source/), not best-practice certification.

## 6. Artifact, cache, and compatibility design

Add a separately versioned companion under the configured filesystem query root: `context/v1/catalog.json` plus content-addressed context artifacts.
For the existing default root this is `dist/query/v1/context/v1/`.
The existing `catalog.json` and release-index objects keep their v1 schema and content contract.
The companion contains the required lexical descriptions as well as graph context, built through shared projection functions so working snapshots do not need to masquerade as releases.
This intentional projection has one semantic implementation; do not fork legacy-label/source logic.

Each artifact records source kind, ontology identity, source-byte digest, projection/format identity, named resources, canonical RDF witnesses, expression structures, adjacency, source-status entries, ownership basis, and declared imports.
A working snapshot records a source-relative locator and its declared ontology/version IRIs as claims, separately from its digest identity.
Its content digest changes after any source-byte change even if the authoring file's version IRI has not changed.
Record generation time outside content identity.
Canonical blank-node identities are scoped by source graph and snapshot; they cannot collide across documents or be treated as public concept IRIs.
Reuse [RDFC-1.0](https://www.w3.org/TR/rdf-canon/) and the installed canonicalizer, with build-time work and cancellation limits.

Generate companion files from the same parser pass as release lookup indexes where practical.
Make context generation an explicit option of the existing generator, preserving the current Node-only lookup/index and distribution build paths when that option is absent.
Canonicalize the companion representation without changing the existing lookup generator's output.
Write immutable objects first and publish the companion catalog atomically last.
Capture each selected source's bytes once and verify the selected source set has not changed before publication; concurrent authoring changes abort that generation.
The companion is self-contained, so concurrent publication of the old lookup catalog cannot create a mixed context.
A server pins a validated catalog generation for its lifetime in the first delivery; rebuilding followed by an explicit restart selects the new generation.
No watcher, live partial reload, or mutable “latest” cache key is introduced.

Reuse filesystem containment, digest verification, supported schemas, immutable data, shared-load cancellation, and LRU principles through explicit query-package interfaces.
Bound filesystem reads and source/artifact bytes before parsing; a schema check performed after an unlimited read is not an allocation bound.
Do not import Node filesystem or canonicalization dependencies through the browser entry.
Cache keys include snapshot and representation identity, relation profile, and graph-selection identity where relevant.
Request frontiers and limits remain request-local.
Bound resident graph counts/term counts as well as serialized bytes; measure heap/RSS amplification rather than treating the current byte counter as a heap bound.
Retain the existing 8 MiB lookup-index ceiling; give context artifacts independent conservative admission limits, initially 8 MiB per artifact and 64 MiB admitted artifact bytes per process, then verify actual memory in QA-003.

An old executable ignores the new companion directory.
A new executable without companion artifacts retains search/resolution and reports `CONTEXT_INDEX_UNAVAILABLE` for new retrieval operations, with a documented generation action.
Advertised capability state distinguishes filesystem context availability from remote-artifact lookup-only mode.
Do not fall back to incomplete superclass-only data and call it a complete neighbourhood.
The initial distribution keeps the single executable and existing package-file contract; no RDF parser or ontology source files are required at query runtime.

## 7. Quality scenarios and proof targets

All numeric latency and memory values below are proposed targets, not measured results or an existing service-level commitment.
Max owns threshold acceptance; the implementer records the environment and evidence, and an independent reviewer checks the oracle and interpretation.
Hard semantic and resource constraints take priority over faster responses.

| ID / priority                           | Source, stimulus, artifact, environment                                                                                              | Required response and measure                                                                                                                                                                     | Verification and operational signal                                                                                                                 | Rationale and risk                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| QA-001 / hard                           | Reviewing agent requests the core acceptance seed in normal local operation                                                          | All three exact-cardinality restrictions and their witnesses are correct; zero fabricated asserted edges or source-quality claims                                                                 | Hand-reviewed fixture, real-source comparison, semantic transport tests; production coverage/diagnostic counters                                    | Wrong summaries can corrupt the definition review while appearing plausible.                                            |
| QA-002 / target                         | Agent requests depth 1–2 with default limits on the three pinned UO modules, warm local process                                      | Query core p95 ≤50 ms; stdio/loopback end-to-end p95 ≤150 ms over 100 measured requests after 20 warmups; report truncated and complete cohorts separately                                        | Reproducible benchmark with hardware, OS, Node, source identities, p50/p95/max, bytes and counts; local duration/cache-hit logs                     | No baseline exists. Cold startup and host/model latency must not be hidden in the warm measure.                         |
| QA-003 / target plus hard admission     | Cold process loads selected local snapshots; eight simultaneous bounded requests                                                     | Readiness/index acquisition p95 ≤2 s over 20 starts; incremental RSS ≤128 MiB for pinned workload; artifact, term and request limits always hold                                                  | Actual process-memory and cold-start measurements; adversarial dense fixture of at least 100,000 connections; admitted-size/cache/eviction counters | More adjacency and expressions can multiply heap use. Replan limits or storage if the hypothesis fails.                 |
| QA-004 / hard                           | Buggy or hostile caller requests excessive depth, large fan-out, cycles, large literals, or cancels                                  | Invalid requests rejected before traversal; valid requests stay within accepted budgets; cancellation observed within 100 ms under the stress fixture without cancelling siblings                 | Boundary, dense/cyclic graph, cancellation and concurrent transport tests; limit/cancel reason codes                                                | Loopback and stdio are still resource boundaries. Cooperative yielding must be demonstrated.                            |
| QA-005 / hard                           | Publisher interruption, corrupted artifact, mismatched digest, or authoring-file change                                              | No mixed snapshot; corruption is an explicit safe error; interrupted generation leaves the previous catalog usable; edited sources receive a new identity                                         | Fault-injection and real filesystem tests; snapshot identity/generation and admission-failure logs                                                  | A fast answer about the wrong graph does not satisfy the outcome.                                                       |
| QA-006 / hard compatibility             | Existing MCP clients, browser consumer, and packaged executable use old lookup artifacts                                             | Existing lookup contract unchanged; new local results agree across transports; remote lookup continues when no companion exists                                                                   | Workspace, build, browser-import, packed-installation, legacy/current protocol and distribution tests                                               | Shared schema/barrel changes can affect consumers outside the local MCP feature.                                        |
| QA-007 / target, host evidence required | Agent receives a definition-review or connection question, with tools discoverable and reasoning disabled where the host supports it | On a fixed 20-task suite, at least 18 tasks obtain the correct packet within two retrieval calls after context selection, zero semantic/provenance misstatements; record actual token/output size | Separately authorized host trial against saved prompts and semantic oracle; report host/model/settings and unavailable controls honestly            | A scripted tool call proves retrieval, not an agent's ability to select and use it. Network/model time is a confounder. |

Log structured counts, durations, cache outcomes, snapshot identity, and error/limit codes through the existing operational-event boundary.
Do not log definition bodies, absolute local paths, arbitrary IRIs, or source citations as metric labels.
No telemetry service or remote collection is introduced.

## 8. Vertical delivery slices

The predicted files below describe ownership and likely seams, not approved line-level edits.
Use the existing public package exports; extend their exported members without adding wildcard source exports.
Tests use hand-authored expected results and independent source inspection, never the production projector to generate its own expected answer.
Mock only genuine external boundaries such as artifact I/O, transport, time, and cancellation.
Use real RDF parsing and real MCP client/server exchanges for the relevant integration proofs.

| Slice                                                            | Linked obligations                                                       | Demonstrable result and falsifiable proof                                                                                                                                                                                                                                                                                        | Release / recovery implication                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 — One concept's asserted context end to end            | REQ-001/002/005/007; AC-001/002/005/007; QA-001/004/006; DEC-001/003/004 | Generate a context artifact for a pinned release and retrieve depth 0/1 named incoming/outgoing relationships over stdio. Include typed definitions, evidence, exact source status, limits, and capability discovery. Hand-check a small cyclic fixture and the core seed's incoming domains. Measure initial index size/cost.   | Independently usable for direct relationships; explicitly reports expression support incomplete until SLICE-002. Old artifacts remain usable.              |
| SLICE-002 — Preserve OWL context and support bounded depth       | REQ-002/005; AC-002/005; QA-001/004; DEC-001/005/007                     | Return the real core seed's three restrictions correctly, then depth 2–4, incoming structural references, imported-resource stubs, loops, unions and cardinality zero. Compare expected expression trees and RDF witnesses; demonstrate deterministic capped expansion and cancellation.                                         | This is the first semantically adequate neighbourhood for the main review use case. No reasoner or ontology migration.                                     |
| SLICE-003 — Connections between specified concepts               | REQ-003/005/006; AC-003/005/006; QA-001/002/004; DEC-005/007             | Retrieve direct and shortest structural paths using the same connections as neighbourhoods. Test two Address roles, multiple witnesses, reverse traversal, ties, self-endpoint behavior, no path within depth, and incomplete search separately.                                                                                 | Adds one bounded read-only operation; withdraw it independently if path behavior fails. No claim of inferred relationships.                                |
| SLICE-004 — Source-aware definition-review queue                 | REQ-004/006; AC-004/006; QA-001/007; DEC-002/007                         | List uncited definitions and retrieve their context in one follow-up. Fixtures cover URI/literal/blank-node citations, OWL axiom annotations, entity-only citations, languages, missing definitions, legacy source interpretation, ownership, and cursors. Reconcile discovery counts against the final precise queue predicate. | Delivers the first review campaign; no source-quality allowlist or ontology policy change. Queue state is derived, not mutable review workflow state.      |
| SLICE-005 — Local working snapshots and explicit graph selection | REQ-001/008; AC-001/008; QA-003/005; DEC-004/006                         | Generate from a saved authoring RDF/XML file; select a working snapshot, catalogued imports, or explicit additional graphs. Edit only a disposable fixture, rebuild, restart, and prove old/new identities and graph isolation. Prove unresolved Turtle imports remain visible.                                                  | Completes the local editing loop. Authoring inputs are never rewritten; restarting with prior retained artifacts restores the previous snapshot selection. |
| SLICE-006 — Qualify local delivery and caller usability          | All requirements and ACs; QA-001 through QA-007                          | Prove semantic parity on loopback HTTP and stdio, cold/warm performance, packaging, browser isolation, safe failures, interruption/recovery, current and legacy MCP clients, independent semantic/security review, and the authorized host trial.                                                                                | Freeze a releasable candidate, assess R2 readiness, and hand off exact evidence. Publication remains separately authorized.                                |

### Predicted file responsibilities

| Owner                           | Existing files likely touched                                                                                                                                                                                                                                                           | New modules/tests likely needed                                                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query semantics                 | `packages/universal-ontology-query/src/index.js`, `artifacts.js`, `ontologyQuerySchemas.js`, `ontologyQueryErrors.js`, `createOntologyReleaseQueryIndex.js` for extracting shared lexical projection without changing its output                                                        | `ontologyContextSchemas.js`, `createOntologyContextIndex.js`, `createOntologyContextQueryModule.js`, `ontologyExpressionProjection.js`, `ontologyContextTraversal.js`, `ontologyDefinitionSourceEvidence.js`, and focused tests under that workspace |
| Artifact bytes and repositories | `ontologyQueryArtifactCanonicalBytes.js`, `ontologyQueryArtifactParsing.js`, `fileSystemOntologyQueryArtifactRepository.js`; only the directly used repository contract changes                                                                                                         | Companion canonical bytes/parsing helpers if keeping them separate is clearer; integrity, bounds and old-reader fixtures                                                                                                                             |
| Generation                      | `scripts/build/ontologyAssetWorker.js`, `ontologyAssetWorkerPool.js`, `createOntologyQueryArtifacts.js`, `scripts/generateOntologyQueryIndexes.js`                                                                                                                                      | `scripts/build/createOntologyContextArtifacts.js`; working-source snapshot helper and focused `tests/build/` fixtures                                                                                                                                |
| MCP contract and runtime        | `createUniversalOntologyMcpServer.js`, `universalOntologyToolSchemas.js`, `universalOntologyMcpMetadata.js`, `renderOntologyToolResultAsText.js`, `runUniversalOntologyMcpStdioServer.js`, `universalOntologyMcpOperationalEvents.js`, workspace `scripts/runLocalOntologyMcpServer.js` | Tool schema, renderer, semantic transport, cancellation, and capability tests under the MCP workspace                                                                                                                                                |
| Delivery evidence and guidance  | `docs/mcp/local-development.md`, workspace `README.md`; affected existing `tests/distribution/` and browser-import tests                                                                                                                                                                | Reproducible benchmark/host-task fixtures and their evidence record                                                                                                                                                                                  |

Keep protocol composition thin: the MCP layer validates and renders; the query package owns traversal and meaning; generation owns RDF parsing and snapshot capture.
Do not move the standalone server's existing Node-free consumer boundary or bundle the repository's authoring toolchain into it.

One integration owner maintains the context schema, depth definition, evidence identifiers, and consumer contract across all slices.
SLICE-001 precedes SLICE-002; SLICE-002 precedes SLICE-003 and SLICE-004; SLICE-005 uses the established companion contract; SLICE-006 follows integration.
Fixture authoring, documentation drafting, and benchmark-harness preparation can be independent once the contract is accepted.
Parallel implementation of schemas, projection, and traversal before those semantics stabilize is unsuitable.
No agents are delegated by this plan.

## 9. Verification cadence and configuration boundary

Use focused workspace entry points while implementing:

```powershell
npm run test --workspace universal-ontology-query -- --runInBand
npm run test --workspace universal-ontology-mcp-server -- --runInBand
npm test -- --runInBand tests/build/ontology-query-artifacts.test.js tests/build/ontology-query-package-interfaces.test.js
npm run build:mcp-package
```

Add the new tests beside the current suites so the existing test-discovery configuration includes them.
Use the relevant existing distribution tests for the final executable and public package file boundary.
Do not treat a passing package build as a transport or host trial.

Finish authorized formatting/lint repairs and inspect the exact candidate before expensive final checks.
Run HISEW's observed R2 `full` profile (`npm run check:qualification`) once the candidate is stable, plus the focused benchmark and host evidence that profile does not establish.
Run the repository's Markdown check for documentation changes.
Preserve actual failures and unavailable checks; a 600-second HISEW timeout or an environment rejection needs diagnosis, not a hidden command/profile change.
A relevant later edit requires affected evidence to be refreshed.

No package, lockfile, policy, test configuration, build configuration, or host MCP configuration change is currently necessary for the recommended first implementation.
The selected parser, canonicalizer, SDK and schema dependencies are already locked at the observed latest releases.
Extend the existing generation command's implementation with explicit source/context options rather than requiring another npm-script setting.
Reuse the existing filesystem root option and resolve the companion within that root.

If implementation disproves that assumption, prepare the smallest exact configuration proposal before touching the relevant file.
Likely decision points are a new package export/dependency, test-discovery scope, CI selection, a changed artifact-root setting, or public package/Registry versioning for release.
Name the exact setting, old/new value, and build/runtime consequences at that point.
This plan does not authorize those changes in advance.

The configured HISEW profiles remain outside UO.
No `.engineering-workflow` directory, copied lifecycle script, or repository policy is introduced.

## 10. Rollout, recovery, and remaining decisions

After acceptance, pilot on the pinned core release with filesystem artifacts, then core plus reference data and extended graphs, then saved working snapshots.
Max or a designated maintainer observes source identity, the real restriction seed, citation status, and truncation behavior before expanding use.
The initial local release is ready only when the accepted semantic, resource, compatibility, independent-review, and caller-usability evidence is present.
Fast fixture execution alone is insufficient.

Abort rollout for fabricated relationships, loss of restriction qualifiers, silent graph/version mixing, citation misattribution, hidden truncation, failures of local containment/cancellation, or unexplained memory growth.
Keep the preceding executable and immutable artifact generation available.
Recovery selects those known artifacts and restarts the local process; it does not edit ontology sources, delete the new evidence, or require rewriting repository history.
A defective companion can remain unselected for diagnosis.
There is no backfill of authored data and no persistent user review-state migration.

Remove task-created disposable fixture outputs only after their consumers finish.
Retain benchmark inputs, failing/counterexample fixtures, source digests, review results, and recovery evidence.
Retained generated snapshots need an owner and retention decision before later cache or artifact cleanup; this plan does not authorize broad deletion.

| Question / decision owner                                                   | Cheapest discriminating evidence                                                                            | Replan condition                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Max: are the proposed depth, byte, latency and memory thresholds useful?    | SLICE-001 measurements and the fixed real-source examples                                                   | The useful context routinely hits limits or requires materially larger retained graphs.            |
| Ontology reviewer: does the structural connection model preserve meaning?   | Hand-reviewed AddressRelationship fixture, nested expressions, cardinality-zero and inverse traversal cases | Correct answers require entailment or a different concept of graph depth.                          |
| Integration owner: is the compact index still the appropriate reuse choice? | Compare implementation size, warm lookup work and heap to a bounded N3-backed probe if needed               | Generic quad matching dominates, or resource targets require another store.                        |
| Max: do catalogued graphs cover the intended review context?                | Count unresolved imports and foreign references for the actual review set                                   | Complete Turtle/import ingestion, import downloading, or reasoner closure becomes required.        |
| Max: can a non-thinking host reliably use the tool descriptions?            | Authorized QA-007 trial, with the actual supported reasoning controls                                       | Call selection or context selection regularly needs manual query construction.                     |
| Maintainer: can the candidate use current release/adoption boundaries?      | Current package advisories, exact bundle inventory, notices, and native review                              | New untrusted schema processing, fetch behavior, dependencies, or distribution formats are needed. |

Any shift toward assessing which sources are authoritative, rewriting definitions, changing ontology axioms, or publishing new artifacts is a new decision rather than a silent extension of this plan.

## 11. Planning evidence and handoff

Completed for this proposal: current repository/code inspection; HISEW selection and applicability readback; exact-source RDF inventory; dependency-version and primary-source research; preserved user decisions; and draft traceability, proof, and recovery design.
Implementation tests, performance measurements, model/host trials, independent review, and release acceptance have not been performed.

Primary references used for the contract include the [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [RDF concepts and blank-node scope](https://www.w3.org/TR/rdf11-concepts/#section-blank-nodes), the OWL and RDFC specifications linked above, [parser release notes](https://github.com/rdfjs/rdfxml-streaming-parser.js/blob/v3.3.0/CHANGELOG.md), and [canonicalizer API guidance](https://github.com/digitalbazaar/rdf-canonize).
Registry identities were read from `https://registry.npmjs.org/<package>/latest` for each candidate on the research date and cross-checked against the repository lock for reused dependencies.

The next acceptance should cover this document's requirement/AC/QA/DEC IDs and the recommended design as a whole.
Record any changes in a new revision before baseline capture.
Approval of this implementation plan alone does not approve unspecified configuration edits or publication.
