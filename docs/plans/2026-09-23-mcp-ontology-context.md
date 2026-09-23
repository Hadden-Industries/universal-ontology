# Ontology relationship context through MCP: implementation plan

**Status:** Working implementation plan, revision 5, 23 September 2026.
This document records accepted decisions and remaining implementation hypotheses; the current delivery follows the R1 brief below without a separate protected requirement baseline.
Max has confirmed explicit assertions and OWL structural summaries for reviewing a specific entity's definition, whether it lacks a recorded source or has wording that needs review despite a citation.
Max has also approved evaluating embedded Oxigraph first and requiring evidence before introducing custom storage, traversal, or additional indexes.
Revision 3 records Max's acceptance of extending `search_entities` with bounded metadata filters and pagination, alongside `get_entity_context` and `find_entity_connections`.
The initial interface has no dedicated review-candidate or ontology-catalogue tool, hybrid query/recipe dispatcher, or public SPARQL executor.
Max is the sole current consumer and explicitly requires no compatibility work or shims.
Change tool and artifact contracts directly; maintain one current schema for each, regenerate derived data, and update the implementation and its tests together.
Revision 4 adopts R1 for this local, single-consumer iteration at Max's request; the earlier R2 assumption of a supported public contract and release campaign does not apply to this stage.
Latency and memory figures guide local calibration; correctness, explicit limits and honest completeness remain requirements.
Revision 5 validates the ontology-context handoff against the installed Hadden-Industries `defining-concepts` skill and two real source examples; execution through the proposed MCP tools remains an implementation acceptance check.

**Goal:** Let an agent obtain the definition, source evidence, relationships, and bounded surrounding ontology context needed for a concept review through predictable MCP calls, without generating queries or reconstructing OWL structures itself.

**Architecture:** Extend entity search and add two entity-context operations through the existing query/artifact boundaries, with an embedded RDF store executing maintained SPARQL queries internally.
Evaluate Oxigraph for JavaScript first against immutable snapshot datasets; retain UO-specific relationship meaning, OWL summaries, source evidence, and response limits above that store.
Choose the representation and any additional indexes only after the first slice proves their need and cost.
Serve filesystem artifacts through both stdio and the existing loopback HTTP transport.

**Authority:** Update this plan on `feat/mcp-ontology-context` in the existing checkout using the existing environment.
Preserve unrelated changes and ask Max before creating another worktree.
This revision updates the plan only; it does not implement the product, install dependencies, change configuration or ontology files, commit, push, or publish.
HISEW remains a personal workflow outside the product; this enhancement introduces no repository workflow engine.

## 1. Purpose, evidence, and scope

The originating request asks for fast answers to “how concepts in a particular ontology are related to each other” and for neighbours at a specified depth.
The first beneficiary is an agent using `defining-concepts` to review a specified entity's definition, including uncited definitions and cited definitions suspected of being too generic.
Max accepts the review and implementation outcomes; finding uncited candidates is an optional discovery path.
The new contract must provide accurate semantics, provenance, and predictable resource use through the supported local MCP entry points.

“Without thinking” is an interaction requirement: the caller should select a documented operation, supply an ontology and concept, and receive usable context.
It does not mean the server controls a host model's reasoning setting or that evaluating a definition requires no judgment.
The server performs no model call, ontology inference, source-quality assessment, or automatic definition rewrite.

### Observed starting point

Original repository observation: `main` at `b4b964d4df7dae60200d1cd238a6d6f28ed25715`.
Revision 2 started from clean `main` at `2a2b6e4f021c4096cb02546c4c117ea4b0fdc35f`, after the documentation CI change, skill-lock update, and supplied OWL review were merged.
Revisions 3–5 build on that uncommitted plan revision in the same checkout and branch.
Those earlier merged changes remain outside this plan revision.
The review's conclusions are not used as proof of current ontology conformance.

| Evidence                                                                                                                                                                                                       | Observation and implication                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MCP registration](../../packages/universal-ontology-mcp-server/src/createUniversalOntologyMcpServer.js), [tool definitions](../../packages/universal-ontology-mcp-server/src/universalOntologyToolSchemas.js) | Only `search_entities` and `resolve_entity` exist. A caller cannot request a neighbourhood or connections between two entities.                                                                                                                |
| [Release projection](../../packages/universal-ontology-query/src/createOntologyReleaseQueryIndex.js)                                                                                                           | The projection retains named superclasses and class membership but omits anonymous superclass expressions and general relationship adjacency. Full entity detail is still a projection, not every source triple.                               |
| [Query schemas](../../packages/universal-ontology-query/src/ontologyQuerySchemas.js)                                                                                                                           | Current search requires nonblank text, returns at most 20 entities, and has no source-status filter or cursor. Strict tool and artifact schemas can be revised directly: Max is the sole consumer and requires no compatibility work or shims. |
| [Query module](../../packages/universal-ontology-query/src/createOntologyQueryModule.js)                                                                                                                       | Existing digest checks, immutable release selection, shared loading, cancellation, and an LRU cache are reusable. Cache accounting uses serialized artifact bytes, not actual JavaScript heap size.                                            |
| [Artifact builder](../../scripts/build/createOntologyQueryArtifacts.js), [worker](../../scripts/build/ontologyAssetWorker.js)                                                                                  | RDF is already parsed during generation. The generator selects eligible immutable release files, not the live authoring `.owl` files.                                                                                                          |
| [Projection history](../../packages/universal-ontology-projection-policy/data/field-property-history.v1.json)                                                                                                  | Historical definition predicates and source interpretations already have a shared owner. Reuse these ontology-data semantics; they do not require supporting old software contracts.                                                           |
| [Entity policy](../../policy/entity-policy.ttl)                                                                                                                                                                | `dcterms:source` is optional and has no imposed value shape. Conceptual adequacy and external derivation remain human review questions. A URI-only citation test would lose valid literal citations.                                           |
| [Active modules](../../policy/activation.ttl)                                                                                                                                                                  | The active module set names exact artifacts and digests. “Largest dated filename” and “active publication” are different selections.                                                                                                           |

A read-only RDFLib inventory through the repository `.venv` measured the following source graphs.
These are inventory counts, not a benchmark or the final filtered-search result set.
Definitions are counted as distinct subject/predicate/literal assertions, including languages and foreign support subjects.
Filtered search additionally applies the requested ownership selection and historical projection rules.

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

The initial delivery does not provide an OWL reasoner, entailment closure, caller-supplied SPARQL, a separately operated graph database service, embeddings, source discovery on the web, source-quality certification, ontology repair, or automatic rewriting.
Internal SPARQL execution in an embedded store implements these operations without requiring the agent to construct queries.
A separate read-only `sparql_select` could support broader ad-hoc analysis in a later, separately accepted scope; it is not required for this delivery.
Do not add a query-recipe registry, custom filter language, or persistent review workflow state.
It does not automatically fetch imports, index arbitrary client-supplied paths, or update the published ontology.
Publishing context artifacts for the standalone server's remote HTTP artifact mode is a separate follow-on; the local filesystem delivery must be complete first.

## 2. HISEW route

**Risk class:** R1 for the current local implementation.
This classification follows Max's clarification that he is the sole consumer, the tools are read-only, and fast local iteration is the current delivery goal.
The document edit itself needs only a focused Markdown check and diff review.

**Decision owner:** Max, as sole consumer and maintainer.

**Reasoning:** Inference from the accepted scope: an incorrect result affects Max's draft review; a slow or failed query affects a restartable local process.
There is no authored-data migration, automatic ontology rewrite, supported contract for other consumers, shared service, new authentication/authorization boundary, or remote import acquisition.
Request cancellation and concurrency operate over disposable local execution state, not a shared transaction or cross-system workflow.
Semantic mistakes and resource exhaustion still need tests, but no material R2/R3 consequence is established for this stage.
The route changes because of the bounded exposure and recovery, not merely because a check is inconvenient.

**Potential blast radius:** Max's local MCP process and generated artifacts, plus affected query-package, generator, executable and browser-integration code.
Keep both supported local transports usable; publication and shared/production use are outside this iteration.

**Reversibility:** Retain a known-working executable with its matching artifact generation; select the whole pair and restart when needed.
Regenerate disposable artifacts from untouched ontology sources.
Introduce no cross-version reader, migration shim or compatibility branch.

**Principal unknowns:** Embedded-store startup and memory, interruption of an executing query, local WASM/worker loading, and whether the returned evidence is sufficient for the first review.
Resolve these with a small local probe and representative examples before expanding the implementation.

**Required artifacts:** This task and plan supply the compact brief: filtered entity search, entity context to a bounded depth, connection paths, explicit OWL/source evidence, local snapshots and no shims.
Keep focused fixtures, local check results and ordinary review notes with the task.
No separate protected baseline, Issue, release dossier or benchmark campaign is required.

**Required specialist lenses:** One ordinary review covers ontology meaning, the current tool contract, and input/resource bounds.
Use hand-authored semantic oracles; they must be independent of the implementation, not necessarily authored by a separate reviewer.
There is no automatic specialist fan-out or separate R2 verifier.
A concrete security or semantic finding can justify additional targeted review.

**Required verification:** Focused checks during editing; HISEW's `affected` profile at a meaningful integrated candidate, plus focused build/asset or browser checks for code actually changed.
The observed project mapping is `affected` → `npm run test:consumer`; it excludes build/distribution suites, so select any needed local integration proof explicitly.
Retain semantic/source/snapshot fixtures, depth/byte/deadline/cancellation checks, transport smoke tests, and a short MCP-only host demonstration.
No mandatory `full` profile, cross-platform distribution matrix, 20-task host campaign or percentile benchmark blocks the R1 local iteration.
Existing CI requirements still apply when relevant work is published; this route does not change CI or personal workflow configuration.

**Required human approvals:** Reuse the accepted intent and decisions in this task; R1 does not require an additional protected-baseline approval.
Any exact configuration/dependency change still needs the authorization required by `AGENTS.md`.
Commit, push, publication and deployment retain their separate authority.

**Maximum sensible autonomy:** Update this plan now; when implementation is requested, proceed through bounded local slices and repair findings within the accepted brief.
Do not create another worktree, introduce shims or broaden the delivery to other consumers without addressing the relevant instruction or scope change.

**Next lifecycle step:** Use this task as the R1 decision reference and the existing software-selection evidence for a small SLICE-000 probe, once implementation and any exact dependency/configuration changes are authorized.
Do not create another baseline or release campaign solely to start iteration.
Reassess the route before a supported public contract, other dependent consumers, shared/production hosting, persistent authored-data writes, new sensitive-data/authentication exposure, remote acquisition, or material shared availability/concurrency obligations are introduced.

HISEW dev.12 readback confirms personal applicability and project readiness.
These revisions change the plan only; they do not mutate an execution record, verification profiles, CI or repository configuration.

## 3. Requirements and acceptance criteria

All requirements serve OUT-001: reduce the calls, query construction, and RDF reconstruction required to gather correct review context.
The causal hypothesis is that indexed retrieval plus a compact evidence packet removes mechanical work from the agent.
The baseline for latency and successful host interactions is currently unmeasured.
Use the same representative ontology snapshots and prompts to compare local behavior; record calls, elapsed time, output size and semantic errors without creating a separate measurement campaign.
Max reviews the working local outcome at SLICE-006.

| Requirement                                                          | Observable acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 — Explicit ontology and snapshot scope                       | AC-001: Search and context results identify the root ontology, exact source digests, snapshot kind, selected graphs, import coverage, and reusable snapshot reference. Never silently mix releases or present an authoring snapshot as a published release.                                                                                                                                                                                                                                                           |
| REQ-002 — Retrieve the surrounding concept graph                     | AC-002: `get_entity_context` returns the specified entity's definition and directed neighbourhood to the requested depth, including incoming references and labelled OWL summaries. A supplied definition-assertion reference selects that exact definition; ambiguous names return candidates without selecting one. Both uncited and cited definitions receive the notes, examples, typed context and provenance needed for the skill handoff below.                                                                |
| REQ-003 — Explain connections between two concepts                   | AC-003: One call returns bounded, shortest structural connection paths with predicates, traversal direction, expression evidence, and source provenance. A missing path is scoped to the searched graph, filters, and depth.                                                                                                                                                                                                                                                                                          |
| REQ-004 — Select entities by metadata with exact definition evidence | AC-004: `search_entities` accepts bounded metadata filters without search text, combines text and filters when both are present, and returns paginated entities with exact matching definition assertions and source statuses. An uncited definition remains discoverable when another definition on the same entity is cited; one further context call retrieves the selected assertion's surroundings.                                                                                                              |
| REQ-005 — Keep retrieval predictable and bounded                     | AC-005: Cycles, dense graphs, large literals, malformed expressions, invalid filters/limits, cursor misuse, and cancellation have explicit tested outcomes. Ordering and pagination on a pinned snapshot are stable; byte limits cannot silently omit matching definition assertions.                                                                                                                                                                                                                                 |
| REQ-006 — Minimize caller work and local latency                     | AC-006: Using MCP alone for ontology evidence, the caller retrieves a known entity directly, or discovers one by search, then optionally investigates connections without SPARQL, recipes, shell/browser work, or custom traversal. External source research by the reviewing skill remains separate. A supplied or unambiguous default ontology needs no catalogue call. Demonstrate representative local tasks with reasoning disabled where supported and report timings honestly; the server makes no model call. |
| REQ-007 — One current contract and explicit trust boundaries         | AC-007: Update tool schemas, result rendering, artifact generation/loading, and call sites directly. One current search contract covers text, metadata and combined queries. Both local transports agree; validate current packaging, browser isolation, cancellation and safe errors. No legacy request modes, aliases, compatibility readers, response translators or shims.                                                                                                                                        |
| REQ-008 — Make local saved edits reviewable                          | AC-008: An explicit rebuild of an authoring-file snapshot changes its identity when source bytes change. Old pinned requests remain about the old snapshot; a subsequent review can select the new snapshot. No hidden watcher or remote fetch participates.                                                                                                                                                                                                                                                          |

## 4. Software selection and design decisions

Research was checked on 23 September 2026 against repository code, installed license texts, upstream documentation, and npm's authoritative `latest` metadata.
Revision 2 refreshed the Oxigraph selection against its versioned documentation and registry metadata and retained the original evidence for existing dependencies.
Revision 3 retains that research and changes the caller contract; it does not claim a new engine trial or adoption decision.
No package was installed or executed from a floating registry reference.

Revision 1 deferred Oxigraph because of WASM packaging and UO-specific semantics, without comparative integration or performance evidence.
Those are questions for a feasibility gate; they do not justify choosing custom storage and traversal first.
The simple MCP interface does not constrain the server to a custom graph implementation.

| Candidate                                                                            | Capability fit and limitation                                                                                                                                                                                                          | Selection                                                                                                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Oxigraph JS](https://github.com/oxigraph/oxigraph/blob/v0.5.11/js/README.md) 0.5.11 | Embedded, in-memory RDF dataset and SPARQL through WASM, including named graphs and RDF/XML loading. The upstream JavaScript API is described as work in progress; UO packaging, cancellation and resource behavior need direct proof. | Preferred first candidate. Run SLICE-000 before committing to storage, query orchestration or artifact layout. No separate database server is required. |
| Existing query/projection packages, MCP SDK 2.0.0 and Zod 4.6.5                      | Already own lexical/source policy, validated artifacts, tool contracts and safe protocol behavior. These responsibilities remain necessary with an RDF store.                                                                          | Reuse around the selected store; keep UO semantics out of the transport adapter.                                                                        |
| Existing `rdfxml-streaming-parser` 3.3.0 and `rdf-canonize` 5.0.0                    | Existing generation and canonicalization boundaries preserve exact snapshot evidence. They are not a query engine.                                                                                                                     | Reuse parsing and canonicalization in the revised generator. Avoid introducing a second parser implementation or a parallel generator for old formats.  |
| Existing RDFLib in the repository `.venv`                                            | Can run the same portable SPARQL patterns for a semantic cross-check. A prior probe returned all three AddressRelationship restrictions.                                                                                               | Use as existing investigation/oracle support, not as a new Python runtime requirement for the MCP executable or as an Oxigraph benchmark.               |
| [N3.js](https://github.com/rdfjs/N3.js) 2.7.12                                       | Reusable RDF/JS indexed matching and lists; would need a supported query-engine composition for SPARQL.                                                                                                                                | Retain as an alternative to investigate if a concrete Oxigraph blocker is established. Do not implement multiple production backends now.               |
| Bespoke adjacency indexes and traversal                                              | Could meet a specialized residual requirement but duplicate storage/query responsibilities and create maintenance cost. No comparative evidence currently establishes a benefit.                                                       | Not selected. Require a measured, named gap that supported engine queries or extensions cannot satisfy before adding such code.                         |

Oxigraph's npm identity was refreshed from `https://registry.npmjs.org/oxigraph/latest`: version `0.5.11`, license expression `MIT OR Apache-2.0`, integrity `sha512-zKdgmp1tsrutGzC1lCCywwZRPpLJKaJnKSDWoY2hIhMiwiCRRXNN1DU7WUyTInBvgPKT8Y5N+RgwTL8qKXpLng==`.
Its versioned [license options](https://github.com/oxigraph/oxigraph/blob/v0.5.11/js/README.md#license) and [MIT text](https://github.com/oxigraph/oxigraph/blob/v0.5.11/LICENSE-MIT) were inspected; exact distributed WASM/transitive assets and notices still need adoption clearance.
N3's version and MIT evidence are retained from revision 1; refresh them if it becomes an adoption candidate.
Neither new component is installed, adopted, or claimed to have a cleared transitive distribution by this revision.
The reused parser's MIT, canonicalizer's BSD-3-Clause, and Zod's MIT texts were inspected locally.
The SDK's actual license includes its MIT/Apache transition and documentation terms; retain the complete existing notices rather than reducing them to the registry's MIT label.
Existing [SDK adoption restrictions](../sdlc/adoption.md#mcp-sdk-embedded-fast-uri) remain applicable: no untrusted schema ingress or new URI-fetch behavior is proposed, and current reachability/advisory evidence must be refreshed before release.

The residual custom work is UO context semantics, evidence presentation, and operational limits over a reused store.
Try maintained SPARQL patterns and supported store APIs before implementing a custom operation.
Any remaining orchestration must name the unmet requirement and stay above the store; it must not grow a parallel RDF database, query language, canonicalizer, or reasoner.

| Decision                                                                | Status and rationale                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 — Explicit assertions plus labelled OWL structural summaries    | Confirmed by Max in this task. No reasoner-derived edges.                                                                                                                                                                                     |
| DEC-002 — Start with definitions lacking recorded sources               | Confirmed by Max. Citation quality is reported as unevaluated.                                                                                                                                                                                |
| DEC-003 — Revise the shared query/artifact architecture directly        | Proposed placement. Reuse current semantic and transport responsibilities, updating their contracts and callers together without a compatibility layer.                                                                                       |
| DEC-004 — One current generated artifact contract                       | Revised for Max's no-compatibility instruction. Revise the catalog, dataset and lookup metadata together; regenerate derived artifacts. Physical separation is justified only by loading or runtime needs, not by preserving old readers.     |
| DEC-005 — Count named-resource connections, retain expression structure | Proposed. RDF list cells and restriction implementation nodes should not consume user-visible concept depth.                                                                                                                                  |
| DEC-006 — Local filesystem delivery first, explicit working snapshots   | Proposed. Both local transports work; remote artifact publication and automatic import acquisition are outside this delivery.                                                                                                                 |
| DEC-007 — Bounded deterministic retrieval, no implicit completeness     | Proposed. Fewer tool calls must not hide omitted edges, unresolved imports, or incomplete source evidence.                                                                                                                                    |
| DEC-008 — Evaluate embedded Oxigraph before custom storage/traversal    | Investigation direction confirmed by Max for revision 2. Adoption and any additional indexes depend on SLICE-000 evidence and exact configuration approval.                                                                                   |
| DEC-009 — Keep SPARQL behind the initial tools                          | Confirmed by Max for revision 3. Server-owned queries implement the ordinary search/context path. No hybrid `query_ontology` dispatcher, named-recipe parameter or public SPARQL executor is included.                                        |
| DEC-010 — Extend search with bounded metadata selection                 | Confirmed by Max for revision 3. Reuse `search_entities` for text and explicit metadata filters, with pagination and exact matching definition evidence. Avoid a dedicated review-candidate tool or a custom query language.                  |
| DEC-011 — Entity context within a selected ontology                     | Confirmed by Max for revision 3. `get_entity_context` and `find_entity_connections` return entity relationships. Ontology/snapshot scope is an input and returned provenance; no catalogue-listing tool is required for the initial workflow. |
| DEC-012 — No compatibility work or shims                                | Explicitly required by Max; he is the sole consumer. Replace superseded schemas and code directly. No legacy modes, aliases, dual readers/writers, translators, or compatibility-only tests.                                                  |
| DEC-013 — R1 for the local single-consumer stage                        | Requested by Max for revision 4 and justified by read-only, bounded local impact and straightforward recovery. Use affected checks and ordinary review; reassess before introducing public/shared or persistent-data obligations.             |

Doing nothing leaves agents to search repeatedly and inspect RDF manually; it does not meet REQ-002 or REQ-003.
Having the agent write SPARQL would not meet REQ-006; executing SPARQL internally can.

### SLICE-000: evidence required before selecting the implementation

Start on the existing local environment with the pinned core graph, the AddressRelationship oracle and small hand-authored cycle, expression and mixed-source fixtures.
Exercise the other pinned graphs as the relevant feature slices need them; a complete distribution or performance matrix is not an entry condition.
Retain one diagnostic SPARQL query set and expected RDF terms so the investigation remains useful whichever integration is selected.
Use a small local query/loading harness and a thin transport probe; implementing the search extension and both new tools is not a prerequisite for selecting the engine.
The earlier RDFLib query returned the two Address roles and the relationship-type role with cardinality one; this establishes query suitability for that example, not Oxigraph correctness, latency or packaging.

| Question                                     | Required experiment and decision evidence                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can queries satisfy the domain contract?     | Demonstrate the core seed's restriction witnesses, metadata selection with exact source statuses, a small paginated result and one bounded connection path. Check representative graph and blank-node isolation cases. Complete the remaining depth 0–4, expression and citation cases in the slices that implement them.                     |
| What custom work is actually missing?        | First try portable SPARQL and supported store APIs. Record any residual UO projection or bounded frontier/path orchestration with its REQ/AC/QA ID. Do not build a custom store as the comparison baseline.                                                                                                                                   |
| Are cold/warm cost and memory acceptable?    | Record local startup, representative query/projection time and process RSS, including WASM/worker cost. Use the same inputs for comparisons and retain any failing workload. Larger percentile/load studies are follow-up work when local measurements reveal a problem or a broader performance claim is needed.                             |
| Can a query be interrupted safely?           | Run the dense/cyclic workload during a second request. Prove QA-004 deadlines and sibling isolation while the engine is executing, including recovery after cancellation. A Promise timeout that leaves the engine running is a failure.                                                                                                      |
| Does the intended local entry point load it? | Prove engine/WASM/worker loading through the actual entry point used by Max in the existing environment. Check the local package/executable when that path is changed or selected for use; do not require all supported target executables before the first implementation slice. Keep engine dependencies out of the browser entry.          |
| Is adoption justified?                       | Record the exact package/assets, license/notice obligations and configuration delta. Accept the local integration after representative semantics, enforceable bounds/cancellation and local loading are demonstrated. A concrete failure needs diagnosis or another maintained composition; custom storage still requires a demonstrated gap. |

SLICE-000 delivers a small reproducible local probe and a recorded selection decision.
The probe must establish semantic suitability, enforceable request bounds/cancellation and local asset loading; it need not qualify the complete product first.
Keep the numeric performance targets visible for calibration and diagnose failures; never weaken correctness or resource limits silently.
Proceed to the feature slices once those local feasibility questions are resolved; qualify additional delivery targets only when they become part of the requested scope.

## 5. Proposed product contract

### One extended search tool and two context tools

Extend `search_entities` with a small, explicit set of metadata filters and pagination.
`resolve_entity` continues to serve exact identifier lookup; update its shared contracts directly where the new snapshot model requires it.
Add `get_entity_context` and `find_entity_connections`, with explicit input/output schemas, read-only annotations, and short task-oriented descriptions.
Reuse useful entity identifiers and selection semantics, without retaining obsolete signatures or adding aliases.
Here, context means the information surrounding an entity within the selected ontology.
Use `snapshotRef` for the pinned dataset selection so its identity is distinct from the entity-context packet.

| Tool                            | Inputs                                                                                                                                                                                             | Result and intended use                                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `search_entities` — extended    | Optional search text; supported entity-kind, definition-source-status and ownership filters; ontology selection or `snapshotRef`; preferred languages; `maximumResultCount` and optional cursor    | Find entities by text and metadata. One result contract identifies the snapshot, entities, exact matching definition assertions and source statuses, applicable lexical match evidence, and continuation state.          |
| `get_entity_context` — new      | Ontology selection or `snapshotRef`, typed `entityIdentifier`, optional `definitionAssertionRef`, depth, direction, relation profile or predicate filters, preferred languages and resource limits | Return the entity's description, exact selected definition, neighbours, typed connections, evidence and completeness. Resolve exact labels only within the selected snapshot; do not borrow labels from another release. |
| `find_entity_connections` — new | Ontology selection or `snapshotRef`, two typed entity identifiers, maximum depth, direction, relation filters and maximum paths                                                                    | Return direct connections and a bounded set of shortest paths, with source assertions or expression evidence for each step.                                                                                              |

### Search and the entity review path

`queryText` remains nonblank when supplied; allow it to be omitted when at least one supported filter is provided, or when a cursor continues a previous search.
The initial filters are the existing `entityKinds`, `definitionSourceStatus` using the statuses below, and explicit ownership selection.
Combine supplied filter criteria and text conjunctively; several requested entity kinds are alternatives within that criterion.
Use `maximumResultCount` as the entity page bound, with a proposed default of 10 and ceiling of 20; use one field name without an alias.
Do not default general searches to missing sources or owned-only entities.
An optional search for uncited candidates explicitly requests `definitionSourceStatus: "no_recorded_source"` and root-module ownership.
A user-selected entity does not need to pass this filter; a recorded source never prevents definition review.

A definition-source filter matches individual definition assertions.
Each returned entity includes the exact matching assertion references, RDF terms, source graphs and source statuses; its preferred display definition is not a substitute for those matches.
An entity qualifies when at least one definition matches, even if another definition is cited or uses another language.
Preferred languages control presentation, not silent exclusion of otherwise matching definitions.
A missing definition does not satisfy a missing-source filter.
Without a definition filter, searching for entities does not require them to have definitions.

Text and text-plus-filter search reuse the lexical matching and ranking policy for the selected dataset.
Metadata-only search uses stable entity IRI and assertion-key ordering, without inventing a lexical query, match score or lexical match basis.
If an entity's matching assertions cannot fit one bounded page, continuation must resume within that entity and explicitly identify repeated entity groups.
Page and byte bounds must not silently skip a definition variant; report entity and assertion counts separately and bind continuation to the last emitted assertion where necessary.

Replace the search input/output schemas directly with one current contract for text, metadata and combined selection.
Include entity matches, exact definition evidence, snapshot identity and continuation consistently; lexical match evidence is absent or explicitly inapplicable for metadata-only results.
Update renderers, callers and test fixtures to that contract together; do not detect old request shapes, dispatch to a legacy path, preserve obsolete output fields or translate results.
There is no `action`, `task`, `recipe` or query-language mode.
Keep the filter set bounded and reject unsupported filters with a specific diagnostic.
Requests for arbitrary joins, predicates or expression trees require a separate design decision rather than growth into a custom query language.

The primary review sequence is:

1. For a known entity, call `get_entity_context` with its identifier and the selected ontology or working snapshot, `depth: 2`, both directions, and the `definition_review` profile.
   This applies equally to uncited definitions and cited definitions suspected of being too generic.
   If the identifier is ambiguous or only approximately known, use text search first.
2. Retain the returned `snapshotRef`, exact definition term and `definitionAssertionRef`.
   If several definitions could be the review target, retain their separate evidence and select the intended assertion explicitly; do not silently substitute the preferred language.
   Subsequent calls validate that the assertion belongs to the chosen entity and snapshot.
3. Give the context packet and the user's purpose/review concern to `defining-concepts`, following the handoff below.
   If relevant evidence is truncated, request a narrower context on the same snapshot; use `find_entity_connections` only for a specific unresolved relationship question.

A known concept needs one initial context call; an approximately named concept uses text search first.
Optional candidate discovery costs one filtered search call per page and one context call per selected definition, preserving the search result's snapshot and assertion reference.
These counts describe initial retrieval, not a guarantee that every semantic review finishes without follow-up.
The caller does not manually join neighbour labels, parse blank nodes, fetch each property's definition, or supply a query recipe.
The agent runs the skill; the MCP server returns evidence and does not execute skills or judge definition quality.
Validating an external best-practice source requires that source's contents and is outside this ontology retrieval capability.

### Ontology selection and imports

The first search or context call accepts a supplied ontology/release selection or an identifier for a generated working snapshot.
Search and context operations use one root ontology, selected explicitly or resolved unambiguously from the available/configured default.
Return a bounded ambiguity diagnostic instead of guessing; additional graphs are selected explicitly as described below.
Resolve the selection once and return a ready-to-use `snapshotRef`; subsequent context calls and search pages reuse it without resolving “latest” again.
Tool descriptions and results expose availability and scope diagnostics directly; no preliminary ontology-catalogue tool is necessary.
They distinguish latest dated releases, active publication and working snapshots.

A `snapshotRef` pins an exact root snapshot identifier and one explicit graph selection:

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

Require minimum-hop discovery and stable tie-breaking by depth, relationship category, predicate/role, endpoint IRI, and evidence identity; do not prescribe a custom breadth-first graph engine.
Evaluate bounded SPARQL patterns for successive concept depths, with explicit intermediate resources and witnesses for connection paths.
SPARQL 1.1 [property paths](https://www.w3.org/TR/sparql11-query/#propertypaths) express connectivity, but do not by themselves supply the ordered shortest-path explanations required here.
Use explicit hop patterns or, if the gate demonstrates the need, small request-local frontier/visited bookkeeping over store queries.
Do not use unrestricted `*` or `+` expansion as a substitute for the requested concept-depth and work bounds, or assume non-standard `{1,4}` path syntax is SPARQL 1.1.
For shortest paths, establish that every smaller depth is exhausted; return `search_incomplete` when a limit prevents that proof.
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
| Candidate connections admitted from store queries per request              |   10,000 |       10,000 |
| Returned shortest connection paths                                         |        3 |           10 |
| Search page size, in entities                                              |       10 |           20 |
| Expression nesting / structural nodes per expression                       | 16 / 256 |     16 / 256 |
| Complete MCP result size, UTF-8 bytes including text and structured output |   32 KiB |      128 KiB |
| Retrieval execution deadline after snapshot/store acquisition              | 1 second |     1 second |

Enforce budgets while constructing results, before large materializations.
The candidate limit counts rows/connections delivered to UO's orchestration layer, not unobservable joins or internal RDF edges examined by the engine.
SPARQL [`LIMIT`](https://www.w3.org/TR/sparql11-query/#modResultLimit) bounds returned solutions; it is not a CPU, intermediate-memory or cancellation guarantee.
The versioned [Oxigraph query API](https://github.com/oxigraph/oxigraph/blob/v0.5.11/js/README.md#storeprototypequerystring-query-object-options) documents synchronous array-valued query results and no query `AbortSignal` option.
SLICE-000 must demonstrate an interruptible execution boundary, such as an owned worker, that enforces deadlines while a query is running; a main-thread Promise race is insufficient.
Include store admission, WASM memory, intermediate results, sorting, expression expansion, path enumeration, worker duplication, queues and rendering in the resource proof.
On cancellation or deadline, stop the affected execution, release its resources and rebuild only its execution state from the pinned snapshot when necessary; do not cancel sibling requests or mutate shared RDF.
If a mandatory seed field cannot fit, return a size diagnostic rather than silently cutting its literal.
Long optional fields may be omitted only with explicit field-level omission metadata and a documented bounded retrieval path.

Every response distinguishes requested depth, completed expansion depth, returned counts, truncation reasons, and unresolved references/imports.
Do not report a total count unless it was actually computed or precomputed for exactly that scope.
`no_path_within_depth` is valid only after a complete bounded-depth search; a work/time limit returns `search_incomplete`.
Neither means the concepts are unrelated in the ontology's inferred semantics.
Return bounded frontier hints for a truncated neighbourhood; graph pagination is not required in version 1.
Search cursors bind to snapshot, search text, filters, presentation-language preferences, and stable last-key ordering, including any continuation within an entity's definition matches.
Changed search criteria or snapshot references invalidate a cursor; it cannot select filesystem paths, refresh the snapshot, or silently skip outstanding matches.

### Source evidence and the review packet

Classify each definition assertion using its exact subject, predicate, literal, language, datatype, and source graph.
For the current `skos:definition` case, an axiom citation must match `owl:annotatedSource` to that entity, `owl:annotatedProperty` to `skos:definition`, and `owl:annotatedTarget` to the exact RDF term, with `dcterms:source` on the matching `owl:Axiom` in the same source graph.
Return entity-level `dcterms:source` separately, including when both citation levels are present.
A citation on an example, scope note, different definition, language, entity or graph cannot become that definition's source.
The status summarizes the citation evidence, not the quality of the definition:

- `definition_source_recorded`: a source annotates that exact definition assertion.
- `entity_source_only`: a source is attached to the entity, but none to that definition assertion.
- `no_recorded_source`: neither exists in that source graph under the applicable projection rules.
- `source_evidence_incomplete`: source structure is present but cannot be fully represented or resolved within supported bounds.

The optional uncited-candidate search filters for `no_recorded_source` definitions owned by the root module; the primary known-entity review has no source-status eligibility filter.
Do not suppress one uncited language's definition because another language has a cited definition.
Do not borrow a citation from a different release or from an unrelated assertion.
Entity-only citations are visible and separately queryable; they do not certify every definition's derivation.
An entity without a definition remains distinguishable from one with an uncited definition and is excluded by the definition-source filter.

Retain URI, literal, and blank-node source values as RDF terms, with bounded linked descriptions where available.
A present but incomplete source structure is not absence of a source.
Reuse the existing historical source interpretation rules and report both the recorded predicate and any policy interpretation.
Do not classify arbitrary `rdfs:seeAlso` or `dcterms:references` links as definition sources.
Ownership filtering uses the existing module declarations for recognized UO modules; an unknown ontology requires an explicit ownership scope before an owned-only search can succeed.
Do not create a second editable ownership policy.
For repository generation, obtain that inventory through the existing `scripts/ontology_policy/modules.py` boundary using the repository `.venv`, then persist its identity and namespace values in the context artifact.
This is a generation-time dependency only; the MCP executable reads the admitted artifact and requires no Python environment.

The packet contains the chosen definition assertion, alternative definitions/languages, declared entity kinds, labels, `skos:scopeNote`, `skos:example`, relevant comments and other recorded notes, citation status and evidence, neighbouring definitions, property meanings, relationship directions, OWL expression summaries, provenance, and completeness.
Attach source annotations to the statement they actually annotate, including examples and scope notes; never merge them into definition provenance.
Include available ontology-level descriptive metadata needed to identify its stated purpose and scope, but do not infer a domain or intended use from namespace spelling.
A missing property definition, example or scope note remains visibly unavailable; a label or IRI fragment is not a substitute.
Deterministic text groups these into readable facts; it does not synthesize a replacement definition or a confidence score for source quality.
Both output representations carry the important scope and truncation warnings, using the existing treatment of ontology-authored strings as untrusted data.
Source presence concerns derivation metadata, consistent with [DCMI's source term](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/source/), not best-practice certification.

### Handoff to `defining-concepts` and use-case validation

The installed Hadden-Industries `defining-concepts` skill uses the terminology core and `revision-audit` renderer for this task.
For an OWL class, individual or property, activate its formal-ontology profile; use other profiles only when the entity and review require them.
An OWL class carrying `skos:definition` is not thereby a `skos:Concept`.
The host supplies the user's review purpose, known constraints and the following ontology evidence to the skill's proportional ConceptBrief:

| Skill input                               | Evidence supplied by the context packet                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and review target                | Entity IRI and declared kinds, labels, exact selected definition term and assertion reference, ontology identity and snapshot digests; preserve alternatives and languages.                                                                                                                                 |
| Intended meaning and scope                | Recorded entity and ontology descriptions, scope notes, comments and examples; distinguish supplied user purpose from ontology statements and unresolved assumptions.                                                                                                                                       |
| Typed neighbourhood and boundary evidence | Asserted parents, children, class membership, equivalence/disjointness, associative relations, domain/range and OWL restrictions, with neighbouring definitions and property descriptions where present. At depth two, shared-parent paths expose sibling candidates without inventing a sibling assertion. |
| Provenance and limits                     | Separate entity and exact-statement citations, source graphs and witnesses, unavailable descriptions/imports, completed depth, omissions and truncation. Citation records are research leads, not proof that external destinations were inspected.                                                          |

Request depth two for an initial review, rather than changing the general tool's depth-one default.
Supporting notes and property meanings must be available without following annotation/source links as concept-neighbour hops.
Follow up on omitted decision-bearing context using narrower profile/predicate/language selections or a returned neighbour identifier on the pinned snapshot.
Selecting additional graphs creates an explicitly different snapshot reference; do not conceal that scope change.
An individually oversized mandatory field produces a size diagnostic.
“As much context as possible” means all admitted relevant evidence within declared limits, with visible gaps, not an unlimited dump or a claim of complete ontology knowledge.

The skill uses this evidence to test category, superordinate placement, distinctions from neighbouring concepts, and necessary versus merely typical conditions.
Existing examples are evidence; any new positive, negative or near-miss examples are the skill's proposed boundary tests, not ontology assertions.
The skill may identify a conflict between prose and axioms; it must report that conflict rather than silently change the concept's identity to improve wording.
It determines whether a definition is too generic and applies its Adopt, Adapt, Formulate or Defer disposition; the server provides no genericity score or dictionary-source exclusion rule.
Recorded external citations remain `not checked` until their exact destinations are retrieved and inspected in the review task.
External evidence and any wording-permission check belong to the skill's research phase; ontology-only MCP retrieval cannot establish them or guarantee enough evidence for a defensible replacement definition.
No automatic source acquisition, definition write or new MCP tool is required by this handoff.

Read-only SPARQL queries against the pinned core graph establish the available evidence for two fixtures:

| Review trigger and fixture                                    | Verified ontology evidence                                                                                                                                                                                                                                                                                                                                            | Required skill handoff and acceptance                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uncited definition: `core:AddressRelationship`                | “Way in which Addresses are connected”@en; no entity source or matching definition-axiom source. The three qualified cardinality-one restrictions above distinguish two Address roles and one relationship-type role. `core:Address` supplies a definition, scope notes and examples.                                                                                 | Retain both Address roles and qualification; expose the neighbour's exclusion of electronic and virtual addresses for review. Mark the reference-data description unavailable under root-only selection. Do not invent a named superclass or treat a restriction as a class-to-individual assertion.                                                                                  |
| User flags a cited definition as too generic: `core:Activity` | “Deed, action, or function that a person or group does or has done”@en. Its matching definition axiom records Lexico and WordReference URLs. It is an asserted subclass of `core:Event`, has `core:Payment` and `core:Process` as asserted subclasses, and references `core:Resource` through a qualified minimum cardinality of zero on `core:Activity_hasResource`. | Review proceeds despite `definition_source_recorded`. Return Event/Payment/Process definitions, available shared-parent paths and the exact resource restriction. Ask whether wording captures this ontology's intended Activity boundary; never strengthen minimum zero into a requirement to use a Resource. Dictionary provenance alone proves neither inadequacy nor suitability. |

The minimum-zero interpretation follows the [OWL minimum-cardinality semantics](https://www.w3.org/TR/owl2-syntax/#Minimum_Cardinality).
The recorded dictionary destinations were not retrieved in this planning check; neither their current contents nor the definition's derivation or adequacy was verified.
The probes validate data availability and the handoff design, not a running `get_entity_context` implementation or a completed revised definition.
QA-001 and QA-007 below make those implementation and host checks explicit.

### Internal query boundary

Version server-owned query templates alongside their semantic fixtures; MCP inputs provide validated RDF terms, graph identities, supported metadata filters, relation profiles and bounded numeric controls.
Compile the fixed search filters into maintained queries; these internal templates are not caller-selectable recipes or a second public query interface.
Bind terms through a supported API where available, or use validated RDF terms and a supported SPARQL term serializer for `VALUES`; never concatenate caller text as query syntax.
Each query must restrict its dataset to the admitted snapshot graphs and retain graph identity through its evidence joins.
Blank nodes from separate source documents must remain distinct after loading, even when their serialized labels coincide.
Expose no raw-query, SPARQL Update, caller endpoint, `SERVICE`, `LOAD`, remote dataset or import-fetch route.
Test malicious identifier/literal inputs and prove no network acquisition or mutation can be reached through the maintained templates.
Keep derived UO structural links distinguishable from the source RDF if a measured need justifies materializing them.

## 6. Current artifact, cache, and runtime design

Revise the existing generator, catalog, query schemas and loaders directly around one current artifact contract.
Use one catalog generation linking immutable snapshot RDF datasets and the lexical/source metadata required by search and resolution.
Regenerate all derived artifacts from authored sources; do not retain the v1 reader/writer contract or add format translation.
The separate companion catalog proposed solely to protect old readers is removed.
Physical dataset and lexical files may remain separate when that reduces loading or keeps the browser entry lightweight; both belong to the same current manifest and snapshot identity.
Finalize format identifiers and layout in SLICE-000, with exact approval for any resulting configuration change.

Each snapshot records source kind, ontology identity, source-byte digest, dataset/semantic-projection format identity, graph mapping, ownership basis, declared imports and canonical source witnesses.
Start with canonical RDF serialization, such as N-Quads, plus a strict manifest and reused lexical metadata; finalize the byte format after load, size and packaging measurements.
Load each source snapshot into its own identified named graph, retaining every admitted source assertion and its snapshot-scoped blank-node mapping.
Reuse historical label, definition and source interpretation from the projection policy rather than duplicating its ontology-data semantics.
OWL summaries and source-status results can be queried and projected from this dataset; cache or materialize them only for a demonstrated repeated-work or latency gap.
Any derived graph or index is disposable, identified with its semantics and regenerable from the source dataset.
A store-specific database file is not the portable source of truth or a user-data migration obligation.
A working snapshot records a source-relative locator and its declared ontology/version IRIs as claims, separately from its digest identity.
Its content digest changes after any source-byte change even if the authoring file's version IRI has not changed.
Record generation time outside content identity.
Canonical blank-node identities are scoped by source graph and snapshot; they cannot collide across documents or be treated as public concept IRIs.
Reuse [RDFC-1.0](https://www.w3.org/TR/rdf-canon/) and the installed canonicalizer, with build-time work and cancellation limits.

Generate the current dataset and lookup metadata from the same parser pass where practical.
Write immutable objects first and publish their shared catalog atomically last.
Capture each selected source's bytes once and verify that the selected source set has not changed before publication; concurrent authoring changes abort that generation.
A reader must never combine dataset and lexical metadata from different generations.
A server pins a validated catalog generation for its lifetime; rebuilding followed by an explicit restart selects the new generation.
No watcher, live partial reload, or mutable “latest” cache key is introduced.
Reject unsupported artifact schemas with a clear regeneration instruction; never fall back to an old reader or migrate artifacts at load time.

Reuse filesystem containment, digest verification, schema validation, immutable data, shared-load cancellation and LRU principles.
Own engine creation, query execution, cancellation, disposal and restart in one internal module; do not introduce a generic multi-backend framework.
Bound filesystem reads and source/artifact bytes before parsing; a schema check after an unlimited read is not an allocation bound.
Keep Node filesystem, workers, Oxigraph/WASM and canonicalization dependencies out of the browser entry; update browser call sites to the current shared contract.
Store/cache keys include exact dataset and graph-selection identity plus engine/representation version; result-cache keys also include filters, relation profile, query/projection version and request controls.
Request frontiers and limits remain request-local.
Bound resident graph counts/term counts and active engine instances as well as serialized bytes; measure total heap/WASM/worker RSS.
Proposed initial artifact admission limits are 8 MiB per file and 64 MiB admitted artifact bytes per process; verify actual memory in QA-003.

Missing required dataset or evidence files produce an explicit availability error with a generation action.
Never return an empty successful filtered search because source evidence is unavailable, or call superclass-only lookup data a complete neighbourhood.
Tool descriptions and capability diagnostics describe the capabilities of the current admitted dataset.
Any retained remote lookup path consumes the current schema too; publishing remote context datasets remains outside this local delivery.
SLICE-000 checks the actual local entry point and required WASM/worker assets; check package/executable delivery when that path is changed or selected for local use.
The local runtime loads admitted snapshot artifacts through the selected engine; it does not need original authoring files, Python, a database daemon or network acquisition.
If the executable cannot carry the required assets, present the measured packaging blocker and smallest alternative before changing distribution configuration.

## 7. Quality scenarios and proof targets

Numeric latency and memory values below are calibration targets, not measured results, service-level commitments or mandatory benchmark campaigns for this R1 iteration.
Max owns the local acceptance decision; the implementer records focused evidence and one ordinary review checks meaning and interpretation.
Hard semantic correctness, explicit request/resource limits, snapshot identity and cancellation remain required.
Use representative tests and local measurements now; expand workload sizes or platform coverage only for an observed concern or a new delivery commitment.

| ID / priority                                   | Source, stimulus, artifact, environment                                                                                             | Required response and measure                                                                                                                                                                                                                                                                                                                                                                                                         | Verification and operational signal                                                                                                                                                                                                                                                            | Rationale and risk                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 / hard                                   | Reviewing agent requests the AddressRelationship and Activity fixtures in normal local operation                                    | Correct exact-definition citations, notes/examples, hierarchy and OWL witnesses. Preserve all three AddressRelationship roles/cardinalities and Activity's minimum zero; no fabricated assertions or source-quality judgments                                                                                                                                                                                                         | Hand-reviewed fixture, real-source comparison, semantic transport tests; production coverage/diagnostic counters                                                                                                                                                                               | Wrong summaries can corrupt the definition review while appearing plausible.                                                                   |
| QA-002 / local calibration                      | Agent requests representative depth 1–2 context on the pinned local snapshots                                                       | Record query-core and end-to-end elapsed time and output size; use ≤50 ms query time and ≤150 ms local transport time as provisional engineering targets. Distinguish warm retrieval, cold loading and truncation; make no p95 claim without adequate samples                                                                                                                                                                         | Reuse the semantic smoke cases with timings and environment/source identities; add a benchmark only if these reveal a material performance issue                                                                                                                                               | Local responsiveness matters now; a 100-request percentile campaign is not required to start using the feature.                                |
| QA-003 / hard admission, local calibration      | Local process loads selected snapshots and a bounded dense/cyclic fixture                                                           | Enforce artifact, term, instance and request limits. Record startup and RSS, using ≤2 s readiness and ≤128 MiB incremental RSS as provisional targets, including WASM/worker cost. Check sibling isolation with two requests                                                                                                                                                                                                          | A local cold-start measurement, a fixture that reaches a request limit, and the cancellation/isolation test; larger load studies only when justified                                                                                                                                           | Preserve bounds while avoiding an eight-request, 20-start qualification campaign for one local consumer.                                       |
| QA-004 / hard                                   | Buggy or hostile caller requests excessive depth, large fan-out, cycles, large literals, or cancels during an executing store query | Invalid requests rejected before query construction; accepted work respects deadlines and admission limits; cancellation stops the affected execution within 100 ms without cancelling siblings                                                                                                                                                                                                                                       | Real-engine dense/cyclic, cancellation, worker disposal/recovery and concurrent transport tests; limit/cancel codes                                                                                                                                                                            | A synchronous query and a timed-out wrapper can leave work running. An enforced execution boundary must be demonstrated.                       |
| QA-005 / hard                                   | Publisher interruption, corrupted artifact, mismatched digest, or authoring-file change                                             | No mixed snapshot; corruption is an explicit safe error; interrupted generation leaves the previous catalog usable; edited sources receive a new identity                                                                                                                                                                                                                                                                             | Fault-injection and real filesystem tests; snapshot identity/generation and admission-failure logs                                                                                                                                                                                             | A fast answer about the wrong graph does not satisfy the outcome.                                                                              |
| QA-006 / hard contract and affected integration | Current MCP tools and changed repository call sites use regenerated artifacts in Max's local environment                            | One current schema per tool and artifact; text, metadata and combined search return the documented structure. Local transports agree and unsupported artifacts fail explicitly. Check browser and package/asset loading where touched                                                                                                                                                                                                 | Current-schema and transport tests in affected verification, plus relevant local build/browser/package checks. Replace obsolete fixtures directly                                                                                                                                              | Prove changed behavior and the actual local entry point; a complete cross-platform qualification matrix is not part of this local iteration.   |
| QA-007 / representative host demonstration      | Max's existing host uses the documented MCP functions, with reasoning disabled where supported                                      | Demonstrate three tasks: uncited selection plus AddressRelationship context, direct Activity depth-two context despite its citations, and a connection question. For the first two, pass the packet to defining-concepts and show that the audit uses ontology evidence and exposes gaps. Initial retrieval takes at most two calls for discovery and one for a known entity or specified-endpoint paths; label follow-ups separately | Record host/model/settings, calls and results against the hand-checked oracle. Gather ontology evidence without external recipes or shell/browser help; keep any subsequent external source research separate. No 20-task harness; unavailable reasoning controls remain an explicit proof gap | Demonstrates the intended agent path without a separate evaluation campaign. Any additional metered model harness needs its own authorization. |
| QA-008 / focused selection gate                 | Maintainer evaluates embedded Oxigraph before feature implementation                                                                | SLICE-000 establishes representative semantics, enforceable bounds/cancellation, actual local loading, exact adoption scope and any residual custom gap                                                                                                                                                                                                                                                                               | Small reproducible queries/fixtures, package/asset and license evidence, local timing/RSS notes and the selection decision                                                                                                                                                                     | Reuse still requires evidence; it does not require full product, multi-platform or load qualification before the first vertical slice.         |

Log structured counts, durations, cache outcomes, snapshot identity, and error/limit codes through the existing operational-event boundary.
Do not log definition bodies, absolute local paths, arbitrary IRIs, or source citations as metric labels.
No telemetry service or remote collection is introduced.

## 8. Vertical delivery slices

The predicted files below describe ownership and likely seams, not approved line-level edits.
Use the existing public package exports; extend their exported members without adding wildcard source exports.
Tests use hand-authored expected results and independent source inspection, never the production projector to generate its own expected answer.
Mock only genuine external boundaries such as artifact I/O, transport, time, and cancellation.
Use real RDF parsing, the selected store and real MCP client/server exchanges for the relevant integration proofs.
Keep portable query fixtures and the semantic oracle independent of both the engine adapter and any later optimization.

| Slice                                                            | Linked obligations                                                                           | Demonstrable result and falsifiable proof                                                                                                                                                                                                                                                                                                                                                                                                                                 | Release / recovery implication                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-000 — Prove local Oxigraph suitability                     | REQ-001–008; representative ACs; QA-001/003–006/008; DEC-001/002/008–013                     | Run the small local probe in section 4. Retain portable query fixtures, core restriction/source results, a bounded path, cancellation/isolation proof, local loading and timing/RSS notes. Record the selected composition and any concrete custom gap.                                                                                                                                                                                                                   | Start feature implementation after focused local feasibility and exact adoption authorization; complete broader cases in the slices that own them. Keep useful queries/fixtures and dispose only obsolete scratch.              |
| SLICE-001 — One concept's asserted context end to end            | REQ-001/002/005/007; AC-001/002/005/007; QA-001/004/006/008; DEC-001/003/004/008/009/011/012 | Revise generator, loader and schemas for the selected dataset and store. Expose `get_entity_context` at depth 0/1 over stdio with ontology selection, `snapshotRef`, incoming/outgoing relationships, definitions, notes/examples and their annotations, evidence, source status and limits. Update affected lookup call sites and fixtures directly; hand-check a cycle and the core seed's incoming domains.                                                            | Independently usable for direct relationships without a catalogue call; explicitly reports expression support incomplete until SLICE-002. Regenerate fixtures/artifacts in the current format; introduce no compatibility path. |
| SLICE-002 — Preserve OWL context and support bounded depth       | REQ-002/005; AC-002/005; QA-001/004; DEC-001/005/007/008/009                                 | Promote the gate's restriction and bounded-neighbourhood queries, returning the AddressRelationship restrictions and Activity's hierarchy/minimum-zero fixture, depth 2–4, incoming structural references, external stubs, loops and unions. Include the skill handoff's supporting descriptions and scoped omissions. Compare expression trees and RDF witnesses; prove capped expansion and execution cancellation.                                                     | First semantically adequate neighbourhood for the main review use case. No reasoner or ontology migration.                                                                                                                      |
| SLICE-003 — Connections between specified concepts               | REQ-003/005/006; AC-003/005/006; QA-001/002/004; DEC-005/007/008/009                         | Use the selected bounded query patterns and only gate-justified orchestration to return shortest paths with intermediate resources and witnesses. Test distinct Address roles, reverse traversal, ties, self endpoints, complete no-path results and incomplete searches separately.                                                                                                                                                                                      | Adds one bounded read-only operation; withdraw it independently if path behavior fails. No claim of inferred relationships.                                                                                                     |
| SLICE-004 — Filtered entity search and exact definition handoff  | REQ-004/005/006/007; AC-004/005/006/007; QA-001/004/006/007; DEC-002/007/009–012             | Update `search_entities` to its single current contract for metadata-only and text-plus-filter selection, pagination and exact definition references. Retrieve a selected assertion through `get_entity_context`. Fixtures cover citation forms, axiom/entity-only sources, mixed-source and multilingual definitions on one entity, missing definitions, ownership, cursor misuse and continuation within an entity. Reconcile inventory counts with the precise filter. | Delivers the MCP-only review path through general entity search. No dedicated candidate tool, query/recipe dispatcher, source-quality allowlist, persistent review queue or compatibility branch.                               |
| SLICE-005 — Local working snapshots and explicit graph selection | REQ-001/004/008; AC-001/004/008; QA-003/005; DEC-004/006/010/011                             | Generate from a saved authoring RDF/XML file; use both filtered search and context retrieval on a working snapshot, catalogued imports or selected additional graphs. Edit only a disposable fixture, rebuild, restart, and prove old/new identities, pinned handoff and graph isolation. Prove unresolved Turtle imports remain visible.                                                                                                                                 | Completes the local editing loop. Authoring inputs are never rewritten; restarting with prior retained artifacts restores the previous snapshot selection.                                                                      |
| SLICE-006 — Check the integrated local review path               | All requirements and ACs; QA-001 through QA-008 at their stated R1 scope; DEC-012/013        | Run affected verification on the integrated candidate and add only the relevant local build/asset/browser checks. Demonstrate the three representative host tasks, including defining-concepts audits for both review triggers. Inspect semantic/source/snapshot and resource evidence, and complete one ordinary review.                                                                                                                                                 | Hand off a usable local iteration with truthful limitations. No mandatory R2 verifier, full-profile run, release dossier or cross-platform campaign. Publication remains separately authorized.                                 |

### Predicted file responsibilities

| Owner                           | Existing files likely touched                                                                                                                                                                                                                                                           | New modules/tests likely needed                                                                                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query semantics                 | `packages/universal-ontology-query/src/index.js`, `artifacts.js`, `ontologyQuerySchemas.js`, `ontologyQueryErrors.js`, `createOntologyQueryModule.js`, `createOntologyReleaseQueryIndex.js`; update public contracts and call sites directly                                            | Focused `ontologyContextQueries.js`, `ontologyExpressionProjection.js` and `ontologyDefinitionSourceEvidence.js` modules where useful; current-schema, filtered-search, pagination and independent semantic fixtures. No duplicate public query module or schema family to retain an old contract. |
| Embedded store and execution    | Local query/repository integration and standalone executable build boundaries, finalized in SLICE-000                                                                                                                                                                                   | A focused engine/execution module and isolated query worker if necessary. No generic graph engine, parallel adjacency store, speculative backend framework or compatibility adapter.                                                                                                               |
| Artifact bytes and repositories | Revise `ontologyQueryArtifactCanonicalBytes.js`, `ontologyQueryArtifactParsing.js`, `fileSystemOntologyQueryArtifactRepository.js` and affected repository contracts directly                                                                                                           | Current-format integrity, admission-bounds and regeneration fixtures; no companion catalog or old-reader fixtures.                                                                                                                                                                                 |
| Generation                      | Revise `scripts/build/ontologyAssetWorker.js`, `ontologyAssetWorkerPool.js`, `createOntologyQueryArtifacts.js`, `scripts/generateOntologyQueryIndexes.js` to emit the current contract                                                                                                  | Focused source-snapshot/semantic helpers where needed and `tests/build/` fixtures; no parallel generator preserving the superseded format.                                                                                                                                                         |
| MCP contract and runtime        | `createUniversalOntologyMcpServer.js`, `universalOntologyToolSchemas.js`, `universalOntologyMcpMetadata.js`, `renderOntologyToolResultAsText.js`, `runUniversalOntologyMcpStdioServer.js`, `universalOntologyMcpOperationalEvents.js`, workspace `scripts/runLocalOntologyMcpServer.js` | Tool schema, renderer, semantic transport, cancellation, and capability tests under the MCP workspace                                                                                                                                                                                              |
| Delivery evidence and guidance  | `docs/mcp/local-development.md`, workspace `README.md`; relevant local distribution and browser-import tests when touched                                                                                                                                                               | Representative smoke/host examples and concise timing observations; no separate benchmark harness by default.                                                                                                                                                                                      |

Keep protocol composition thin: the MCP layer validates and renders; the query package owns maintained queries and UO meaning; the reused engine owns RDF storage and query evaluation; generation owns snapshot capture and canonicalization.
SLICE-000 fixes the placement of any Node-specific adapter/worker so the shared public/browser boundary remains independent of it.
Do not move the standalone server's existing Node-free consumer boundary or bundle the repository's authoring toolchain into it.

One integration owner maintains the current search/context schemas, depth definition, definition-assertion identifiers and snapshot references across all slices.
SLICE-000 gates SLICE-001; SLICE-001 precedes SLICE-002; SLICE-002 precedes SLICE-003 and SLICE-004; SLICE-005 uses the current artifact contract; SLICE-006 follows integration.
Fixture authoring and documentation can proceed as their consumers need them; no parallel setup or benchmark harness is required merely to begin.
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

Run the smallest relevant check while editing; finish formatting/lint repairs and inspect the candidate before integrated verification.
For implementation, run HISEW's R1 `affected` profile (`npm run test:consumer`) at a meaningful integrated candidate and complete one ordinary review.
That profile excludes `tests/build` and `tests/distribution`; run the focused generator, package/asset or browser checks needed for files actually changed, without automatically running every distribution target.
Retain the representative semantic, cancellation and host evidence that a profile name alone does not establish.
Do not repeat an equivalent passing check solely for ceremony; refresh it for a relevant change, failure or unresolved concern.
The R2 `full` profile, independent-verifier requirement and separate release-readiness campaign are not obligations of this local R1 scope.
For this plan-only revision, check Markdown formatting and inspect the diff; product tests are not applicable.
Use the existing environment and current checkout for later slices as Max requested; preserve unrelated work and ask before creating another worktree.
Preserve actual failures and unavailable checks; a 600-second HISEW timeout or an environment rejection needs diagnosis, not a hidden command/profile change.
A relevant later edit requires affected evidence to be refreshed.

This plan revision requires no package, lockfile, policy, build or host MCP configuration change and installs nothing.
An executable Oxigraph probe and subsequent adoption require separately authorized dependency acquisition and likely configuration changes; the package is not treated as already available merely because its documentation was reviewed.
Before that step, present the smallest exact proposal, likely the owning workspace's `package.json` dependency entry (absent to the assessed pinned `oxigraph` release) and root `package-lock.json`, plus any necessary WASM/worker packaging or package-file declaration.
Determine the owning workspace and precise asset strategy from the supported integration boundary, then name each exact file, old/new setting and build/runtime effect before editing it.
Complete exact license/notice and asset inspection before execution; retain existing parser/canonicalizer/SDK/schema dependencies where their current responsibilities remain necessary.
Extend the existing generation command's implementation with explicit source/context options rather than requiring another npm-script setting.
Reuse the filesystem root option for the current artifact layout; any required setting change must be proposed explicitly.
Replace superseded schemas, code paths and fixture expectations in the affected files; do not add compatibility-only tests or leave unused legacy implementations behind.

Additional decision points include a package export, test-discovery scope, CI selection, a changed artifact-root setting or public package/Registry versioning for release.
This plan does not authorize those changes in advance.

The configured HISEW profiles remain outside UO.
No `.engineering-workflow` directory, copied lifecycle script, or repository policy is introduced.

## 10. Rollout, recovery, and remaining decisions

Once implementation is requested and SLICE-000 establishes local suitability, iterate on the pinned core release, then core plus reference data and extended graphs, then saved working snapshots.
Max observes source identity, both definition-review fixtures, the skill handoff, citation status and truncation behavior as the working slices become usable.
Complete the local iteration with affected checks, relevant integration checks, the representative MCP-only demonstration and one ordinary review.
Do not hold local use behind a separate release-readiness dossier or a broad performance/platform campaign; record any concrete remaining limitation.
Reassess risk and delivery evidence before supporting other consumers or shared/production use.

Abort rollout for fabricated relationships, loss of restriction qualifiers, silent graph/version mixing, citation misattribution, hidden truncation, failures of local containment/query interruption, unexpected network access, missing WASM/worker assets or unexplained memory growth.
Retain a known-working executable together with the artifact generation it was built to read.
Recovery selects that whole pair and restarts the local process; any transient embedded-store state is rebuilt from its pinned dataset.
No cross-version artifact reader, converter or downgrade shim is introduced.
Recovery does not edit ontology sources, delete evidence or require rewriting repository history.
A defective artifact generation can remain unselected for diagnosis.
There is no backfill of authored data and no persistent user review-state migration.

Remove task-created disposable fixture outputs only after their consumers finish.
Retain the inputs for any measurements actually performed, failing/counterexample fixtures, source digests, review results and recovery evidence.
Retained generated snapshots need an owner and retention decision before later cache or artifact cleanup; this plan does not authorize broad deletion.

| Question / decision owner                                                         | Cheapest discriminating evidence                                                                                                                | Replan condition                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max: are the proposed depth, byte, latency and memory thresholds useful?          | Representative local measurements and fixed real-source examples from the current candidate                                                     | Useful context routinely hits limits or requires materially larger retained graphs; investigate the measured issue rather than adding an automatic benchmark campaign.                                |
| Ontology reviewer: does the structural connection model preserve meaning?         | Hand-reviewed AddressRelationship fixture, nested expressions, cardinality-zero and inverse traversal cases                                     | Correct answers require entailment or a different concept of graph depth.                                                                                                                             |
| Integration owner: does embedded Oxigraph satisfy the local contract?             | Small local query, cancellation/loading and license/asset probe, with startup/RSS notes                                                         | A specific accepted requirement fails after supported composition; investigate another maintained engine before custom storage.                                                                       |
| Integration owner: is any extra index or traversal code justified?                | Retained counterexample and before/after measurements for an explicit REQ/AC/QA gap                                                             | New code duplicates the engine or loses evidence; reject it unless the measured benefit and maintenance cost are accepted.                                                                            |
| Max: do catalogued graphs cover the intended review context?                      | Count unresolved imports and foreign references for the actual review set                                                                       | Complete Turtle/import ingestion, import downloading, or reasoner closure becomes required.                                                                                                           |
| Max: can a non-thinking host reliably use the tool descriptions?                  | Authorized QA-007 trial of filtered search, exact-definition context handoff and connection questions, with actual supported reasoning controls | Correct retrieval needs manual queries, external recipes, an ontology-catalogue call or repeated interpretation of raw RDF.                                                                           |
| Integration owner: are metadata filters still a small, coherent search interface? | User tasks, the current schema, mixed-source definitions and complete pagination fixtures                                                       | New requests require arbitrary joins or a filter language; revisit a separate SPARQL capability instead of adding dispatcher modes.                                                                   |
| Maintainer: can the candidate use current release/adoption boundaries?            | Current package advisories, exact bundle inventory, notices, and native review                                                                  | New untrusted schema processing, fetch behavior, dependencies, or distribution formats are needed.                                                                                                    |
| Max: does the R1 exposure assumption still hold?                                  | Confirm who depends on the contract, where it runs, what data it can change and the consequence of failure                                      | Reassess before supported public/shared use, persistent authored-data writes, new sensitive-data/authentication exposure, remote acquisition or material shared availability/concurrency obligations. |

Any shift toward having the MCP server assess source authority, rewrite definitions, change ontology axioms or publish new artifacts is a new decision rather than a silent extension of this plan.
The consuming agent's requested definition review is the supported use case; its semantic judgments and any external research remain in the skill.

## 11. Planning evidence and handoff

Completed for this proposal: repository/code inspection; HISEW selection and applicability readback; exact-source RDF inventory; dependency-version and primary-source research; preserved user decisions; and draft traceability, proof, and recovery design.
Revision 2 incorporated the preceding RDFLib/SPARQL restriction probe, refreshed Oxigraph registry/API/license evidence, an explicit reuse gate, and corresponding changes to resource, artifact, configuration and delivery assumptions.
Revision 3 records the accepted tool simplification: bounded metadata selection through `search_entities`, entity context through `get_entity_context`, and specific paths through `find_entity_connections`.
It replaces the dedicated candidate/catalogue proposal and makes exact-definition handoff explicit.
It also records Max's no-shim instruction: one current search contract, direct artifact/schema changes, regeneration instead of migration, and no compatibility-driven companion design.
Revision 4 records Max as sole consumer and reroutes the local iteration to R1, with affected checks, ordinary review, a small local selection probe and representative host evidence.
R2 baseline, full-profile, independent-verifier and release-campaign requirements are removed; concrete triggers require reassessment if exposure grows.
Revision 5 checked the installed skill's router, concept-entry model, formal-ontology profile and evidence contract against the two review triggers.
Using the existing `.venv` and RDFLib 7.6.0, six read-only SPARQL queries on the unchanged core artifact confirmed exact source joins, parents, restrictions, incoming domain/range assertions, Activity's children/shared-parent candidates, and Address/Resource annotations.
An in-memory two-graph fixture passed eight definition-assertion checks covering absence, entity-only sources, exact axiom sources, misleading statement links, language/datatype distinctions and graph isolation.
The first probe's projected `EXISTS` form failed in RDFLib; the successful probe used `OPTIONAL` bindings.
This is retained as a query-engine limitation observed during planning, not an Oxigraph finding.
These decisions are carried through requirements, quality scenarios, delivery slices and recovery.
The RDFLib results and manual skill mapping establish semantic feasibility only; no Oxigraph trial, comparative performance measurement, production implementation test, model/host trial, independent review or release acceptance has been performed.

Primary references used for the contract include the [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [RDF concepts and blank-node scope](https://www.w3.org/TR/rdf11-concepts/#section-blank-nodes), the OWL and RDFC specifications linked above, [parser release notes](https://github.com/rdfjs/rdfxml-streaming-parser.js/blob/v3.3.0/CHANGELOG.md), and [canonicalizer API guidance](https://github.com/digitalbazaar/rdf-canonize).
Registry identities were read from `https://registry.npmjs.org/<package>/latest` for each candidate on the research date and cross-checked against the repository lock for reused dependencies.
The revised selection additionally uses the [Oxigraph 0.5.11 JavaScript API](https://github.com/oxigraph/oxigraph/blob/v0.5.11/js/README.md), its license texts linked above, and the [SPARQL 1.1 query specification](https://www.w3.org/TR/sparql11-query/).
The interface review also used [Anthropic's agent-tool design guidance](https://www.anthropic.com/engineering/writing-tools-for-agents): keep purposes distinct, return useful context, and verify the actual agent workflow rather than assuming a smaller signature is easier to use.

Use the accepted intent and decisions in this task as the R1 brief; the REQ/AC/QA/DEC references remain useful implementation and review aids, not a requirement to capture a protected baseline.
Update the plan when implementation evidence materially changes a decision.
Authorization to implement still does not approve unspecified configuration edits or publication.
