# JavaScript performance implementation plan

Date: 26 October 2026.
Status: **draft dossier revision 1; proposed implementation and evidence, not an accepted execution baseline or release approval**.

## Purpose and authority

Reduce avoidable CPU work, transient allocations and build resource use while preserving Universal Ontology's search semantics, RDF identity, browser behavior, transport limits and publication safeguards.
The higher outcome is faster trustworthy access to ontology information and shorter reliable development feedback.
An isolated microbenchmark improvement is useful only if its consumer benefits without losing these properties.

This document synthesizes the supplied *Production JavaScript Performance Audit: Universal Ontology*, including its ten hotspots, four illustrative patches, measurements, complexity analysis, proposed gates, roadmap, exclusions and missing evidence.
It converts recommendations into conditional vertical slices with independently assessable proof.
The audit is evidence and a design proposal; its statements of “no correctness risk,” production impact and expected speedups are not accepted findings without the checks below.

The requested deliverable is this documentation plan in `docs/plans/`.
Writing it does not authorize implementation, configuration changes, installation, telemetry collection, deployment or pushing.
No new HISEW execution is started, and no retained execution is adopted or closed for this synthesis.
The requirements and decisions below are proposed stable identifiers local to this draft, not previously accepted HISEW records.

### Sources and inspected baseline

| Item                    | Observation                                                                                                                                                                 | Planning consequence                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supplied audit          | `C:\Users\maksy\Downloads\universal-ontology-javascript-performance-improvements.md`, 693 lines; SHA-256 `ed4ac7afd68da27f9eec1fe4db99c8c1ee3c3b11fc8389e1652a3774d2f2282c` | Preserve its claims and their qualifications; this external path must not become a build dependency.                                                                                 |
| Repository              | `main`, HEAD `649c1903d0eb11a57b76d1e04ba5a5c8cf1659c3`; clean working tree before this document                                                                            | This is the source-inspection baseline, not the audit's unrecorded benchmark revision. Recheck before implementation.                                                                |
| Repository origin       | `https://github.com/Hadden-Industries/universal-ontology.git`                                                                                                               | Resolves the audit's unspecified repository URL.                                                                                                                                     |
| Node                    | `.node-version` and the inspected local runtime both identify `24.22.1`                                                                                                     | The audit's Node 22.x description does not identify this checkout's reference runtime.                                                                                               |
| Package tooling         | Root `packageManager` is `npm@12.2.1`; `devEngines.packageManager.version` is `>=12.2.1`                                                                                    | The audit incorrectly presents this npm requirement as a Node requirement.                                                                                                           |
| Browser build           | `scripts/build/createWebsiteConfig.js` owns target `es2022`; root manifest declares Vite `>=8.3.5` and Jest `>=30.5.2`                                                      | Manifest ranges do not prove the installed versions used for the audit. ES2022 is a compilation target, not a measured browser/device population.                                    |
| Workflow applicability  | Read-only `inspect-project-applicability` returned `personal`, `active: true`                                                                                               | Apply HISEW planning constraints; applicability is not execution ownership.                                                                                                          |
| Retained workflow work  | Current session notice identifies unrelated execution `688a38cf-8214-4934-85da-7824a8186ca2`, generation 3, concerning MCP release artifacts and CI policy verification     | New execution work remains blocked until the owner explicitly continues or closes that work through the supported ownership procedure. Do not infer adoption from this plan request. |
| Repository instructions | [AGENTS.md](../../AGENTS.md) and [development guidance](../development.md)                                                                                                  | Exact configuration changes require prior explicit approval; preserve other work; use existing npm controls and `.venv` for Python.                                                  |

### Admission and unresolved prerequisites

Proposed implementation route: **R2**, because the complete programme crosses query compatibility, untrusted artifact validation, graph truncation, build evidence and CI/publication boundaries.
Small isolated allocation improvements may merit a narrower route after scope is separated; this document does not self-route them.
The UO owner must accept the actual route and design, appoint the applicable oracle/review owners, resolve retained execution ownership and approve any exact configuration delta before dependent implementation.

Missing accepted prerequisites are: production workload and SLO definitions; reproducible baseline measurements; the transport retention contract for optimized truncation; any new cache's storage, trust and invalidation design; new telemetry's data/retention policy; runner-specific performance thresholds; and current reuse/version/rights evidence for any newly selected software.
These are explicit gates, not assumptions that an implementer may fill silently.
SLICE-001 describes the minimum preparation evidence; later slices remain conditional where these decisions affect them.
No staffing estimate, delivery date, budget or new committee is established.

## Preserved evidence and its limits

### Reported workloads and measurements

All numbers in this subsection are **reported by the supplied audit**, not reproduced by this planning task.

| Workload                        | Input / repetitions reported                       | Baseline                         | Candidate                       | Reported factor                                                 |
| ------------------------------- | -------------------------------------------------- | -------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| Search projection after ranking | 1,000 matches, result limit 20; 50 repetitions     | 0.060 ms                         | 0.002 ms                        | 25.38x                                                          |
| Canonical byte comparison       | Approximately 3 MB `Uint8Array`; 50 repetitions    | 1.750 ms                         | 0.110 ms                        | 15.96x                                                          |
| Browser table sorting algorithm | 1,000 rows; 20 repetitions                         | 0.820 ms                         | 0.060 ms                        | 13.80x                                                          |
| MCP result fitting              | 80 excess statements; table says 10 repetitions    | 2.170 ms, described as 81 passes | 0.170 ms, described as 2 passes | 12.76x                                                          |
| Definition candidate evaluation | 2,000 definitions; 50 repetitions                  | 0.780 ms                         | 0.120 ms                        | 6.76x                                                           |
| Deep freezing                   | Release index described as 2.97 MB; 10 repetitions | 2.640 ms                         | 1.830 ms                        | 1.44x                                                           |
| Full website build              | Repository source tree; one run                    | 205.1 s                          | Not measured                    | Approximately 70% reduction hypothesized elsewhere in the audit |

The full-build report also records `buildStart` at 200.9 s, or 98% of the reported total; `closeBundle` at 29.8 s, or 14.5%; peak working set of 2,670,333,952 bytes; and 1,110 output artifacts totaling 799 MB.
It identifies the largest query release index as 3,118,970 bytes and reports 15 Jest unit suites, 297 passing tests and one skipped test in 16.392 s.
The inspected audit describes Windows 11 Pro x64, a multicore x86 CPU, Vite 8.3.5/Rolldown and Jest 30.5.2 with experimental VM modules; CPU model, exact V8 identity and underlying run artifacts are absent from that report.

Preserve these numbers without combining incompatible quantities.
The two plugin durations sum to more than the total: establish timer nesting, overlap and measurement windows before attributing an exclusive percentage.
The reported byte count is approximately 2.67 decimal GB or 2.49 GiB; Windows working set and process-tree peak RSS are not interchangeable observations.
Reported rounded durations do not exactly reconstruct all reported ratios.
Neither a one-run build nor sub-millisecond samples establish p95 latency or a stable regression threshold.
The earlier test result is neither a current test run nor a complete frontend/MCP qualification.

### Benchmark provenance checked during synthesis

The six scripts named in the audit exist under:

`C:\Users\maksy\.gemini\antigravity\brain\2db2d2bb-a13c-4a61-82a3-08cb70b796bb\scratch\`

They were read, not executed, during synthesis.
Their original reproduction form is `node <scratch-directory>\<script-name>` from a suitable repository working directory.
The audit explicitly prints this command form for the slicing, sorting, bytes and fitting scripts; freezing and candidate evaluation are also listed as retained scripts.
These machine-local files are research artifacts, not maintained project benchmarks.

| Script                   | What it actually measures                                                                        | Evidence limit                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bench_search_slice.mjs` | Synthetic ranked candidates and `mockAggregate`, with five warmup rounds and 50 timed iterations | Does not invoke production projection-policy resolution, lexical selection, context filters, schema parsing or cancellation.                                              |
| `bench_search_eval.mjs`  | Copied evaluator over 2,000 synthetic definitions, five warmups and 50 iterations                | Does not time release-index construction or the retained heap cost of precomputed sets.                                                                                   |
| `bench_sort.mjs`         | Copied sorting functions over generated rows, five warmups and 20 iterations in Node             | Does not execute `OntologyUIController`, render a DOM, measure INP or exercise every column and missing value.                                                            |
| `bench_bytes.mjs`        | Copied equality routines over two equal buffers of `3 * 1024 * 1024` bytes                       | The actual fixture is 3 MiB; no unequal buffers, view offsets, browser branch or full parser are timed.                                                                   |
| `bench_freeze.mjs`       | Copied freezing implementations over a locally generated index, two warmups and ten samples      | Picks the first directory entry without a pinned fixture hash; its size display uses string length. Optional GC is not a reproducible heap methodology.                   |
| `bench_fit.mjs`          | Simplified renderer and synthetic expression data, one timing per variant                        | Conflicts with the summary's ten-iteration claim. Both routines can stop while still oversized; neither asserts the final byte budget or full graph/diagnostic semantics. |

The supplied document begins with an activity transcript: source reads, test/build status polls, process observations, canceled file search and creation of these scripts.
Those entries establish research scope, not successful verification; repeated polling and canceled search operations do not become acceptance criteria.
Raw test/build logs, heap profiles and measurement samples are not embedded in the document.
Retain their absence as a proof gap until located or replaced with a fresh baseline.

### Complete hotspot register

The severity, confidence, effort and original risk labels below preserve the audit's assessment.
The implementation conditions are this plan's review of that assessment.
File/function names are current seams; the audit's historical line numbers are not implementation instructions.

| ID     | Audit class; severity; confidence; effort; risk | Mechanism and proposed remedy                                                                                                                                             | Disposition                                                                                                                                                    |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOT-01 | Measured; critical; high; medium; low           | Build asset generation: repeated RDFC-1.0 work, candidate discovery, package hashing and parsing; cache unchanged computations. Audit predicts about 70% build reduction. | Build duration is reported; exclusive causal attribution and cache benefit remain hypotheses. SLICE-009/010 require integrity-preserving proof.                |
| HOT-02 | Measured; high; high; small; low                | `searchOntologyEntities` aggregates all ranked matches before result limiting; project only the needed prefix. Reported 25.38x.                                           | SLICE-002 initially applies to the path without `searchContext`. Full Node context semantics remain intact.                                                    |
| HOT-03 | Measured; high; high; small; low                | `#getSortValue` creates a 12-property object and eagerly joins three arrays on each comparison; extract only the selected column once per row. Reported 13.80x.           | SLICE-004; preserve stable ties, toggles, table content and missing-value semantics; measure real browser rendering separately.                                |
| HOT-04 | Measured; high; high; small; low                | `evaluateSearchCandidate` constructs a token set per definition per query; retain a set in the runtime index. Reported 6.76x.                                             | SLICE-003; measure construction cost, resident memory and disposal as well as warm query latency.                                                              |
| HOT-05 | Measured; high; high; medium; low               | `fitApplicationResult` repeatedly renders and serializes after each pruning operation; batch/search over legal pruning states. Reported 12.76x.                           | SLICE-007; evidence fitting is a semantic change risk, not automatically low risk. Exact byte fit and retained-information contract are gates.                 |
| HOT-06 | Measured; medium; high; small; low              | Scalar canonical-byte equality; use native Node buffer equality where available. Reported 15.96x.                                                                         | SLICE-005; preserve exact subview bounds, browser support and all validation. Native acceleration is not a portable SIMD guarantee.                            |
| HOT-07 | Measured; medium; high; small; low              | `Object.values(array)` clones array entries while deeply freezing; iterate validated arrays directly. Reported 1.44x.                                                     | SLICE-006; preserve identity and the existing validated, acyclic JSON domain.                                                                                  |
| HOT-08 | Strongly inferred; medium; high; small; low     | `sortAndDeduplicate` always creates a `Map`; add empty/singleton paths. Audit estimates about 70% fewer indexing Maps.                                                    | SLICE-006; prove fresh-container/aliasing and key-validation behavior before returning an input array directly.                                                |
| HOT-09 | Strongly inferred; medium; medium; small; low   | `getRdfTermKey` serializes literal tuples in view-model loops; audit proposes a delimited string.                                                                         | SLICE-008 is measurement-gated; plain delimiter concatenation is not collision-safe for unrestricted literals. Retaining JSON tuples is an acceptable outcome. |
| HOT-10 | Hypothesis; low; medium; small; low             | SHA-256 hexadecimal rendering allocates an array and padded strings; native hex conversion or a lookup table proposed.                                                    | Deferred: the audit itself estimates less than 0.01% of request time and advises against this work. Reopen only with contrary profiling evidence.              |

### Complexity and allocation hypotheses

For sorting, the audit models roughly `O(N log N)` comparisons, each extracting two keys, versus `O(N)` key extraction plus comparisons of retained primitive keys.
Its detailed account estimates about 20,000 temporary objects and 60,000 joins for 1,000 rows; its summary calls these more than 80,000 objects.
Those are inconsistent labels, and comparison counts depend on ordering and engine behavior.
Measure comparator calls and allocations instead of adopting either count or promising zero GC for the complete sort/render path.

For search, ranking remains necessary: broadly `O(M log M)` ranking plus `O(M * P)` projection can become ranking plus `O(K * P)`, with `K = min(M, maximumResultCount)` and projection cost `P`.
Slicing does not eliminate matching, filtering or ranking, and the no-query path has its own ordering/filter sequence.
For token coverage, the audit estimates 2,000 temporary sets and about 160 KB per query; precomputation moves that cost to runtime-index creation and lifetime rather than eliminating it.

For freezing, the audit estimates more than 45,000 temporary arrays over approximately 10,000 descriptions/assertion lists.
For indexing, it gives both roughly 20,000 empty Maps and an example of ten calls across 1,500 entities producing 15,000 Maps, with more than 60% of assertion lists empty.
Preserve these as workload-dependent estimates requiring allocation profiles.

For fitting, repeated whole-result serialization can approach `O(K * S)` for `K` pruning steps and serialized size `S`.
The audit proposes `O(log K * S)` or `O(S)` behavior; neither follows merely from proportional pruning.
Graph repair, added diagnostics, escaping, text rendering and nonuniform item sizes affect both cost and byte monotonicity.
For build work, ontology count and bytes alone do not determine canonicalization cost; blank-node structure, parser work, algorithm options, worker concurrency and independent verification passes also matter.

## Draft requirements, acceptance criteria and invariants

| Requirement                                                 | Falsifiable acceptance criterion                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Establish a reproducible baseline                   | AC-001: exact revision, fixture digests, installed tool versions, CPU/OS, process scope, warmup, samples and cache state accompany each before/after comparison; synthetic and production measurements remain separately labeled.                                                 |
| REQ-002 Avoid unnecessary search projection                 | AC-002: the path without context projects at most the requested prefix after complete matching/ranking; all result fields and failure behavior match the accepted oracle. Context-aware search receives complete candidate information until separately redesigned and qualified. |
| REQ-003 Reuse definition token membership                   | AC-003: all match categories and ranks are unchanged; definition queries construct no per-candidate token sets; load latency, retained heap and lifetime satisfy the owner-accepted budget.                                                                                       |
| REQ-004 Make table sorting proportional to necessary work   | AC-004: all 12 columns retain ascending/descending order, stable ties, missing-value handling and row content; extraction occurs once per row for the selected column; measured browser interaction meets the accepted budget.                                                    |
| REQ-005 Preserve canonical artifact admission               | AC-005: native and portable comparison paths agree on every supported byte-view case; malformed UTF-8, schema violations and noncanonical bytes remain rejected; browser bundles acquire no Node-only dependency.                                                                 |
| REQ-006 Reduce safe traversal/indexing allocations          | AC-006: freezing retains object identity and recursive immutability; deduplication retains ordering, winner selection and container ownership; canonical artifact bytes remain identical.                                                                                         |
| REQ-007 Fit MCP responses without misleading graph evidence | AC-007: every successful serialized application result fits the exact UTF-8 budget; allowed omissions, counters, diagnostics, frontier hints, connections, expressions and paths remain coherent; insufficient irreducible capacity produces the existing safe failure behavior.  |
| REQ-008 Preserve RDF term identity                          | AC-008: distinct lexical value/language/datatype tuples remain distinct, including delimiters and control characters; any new key representation has injectivity evidence and measured benefit.                                                                                   |
| REQ-009 Reduce repeated build computation safely            | AC-009: cold, warm and incrementally changed runs produce equivalent graphs and expected identical deterministic bytes; any relevant input/producer/option change invalidates reuse; mutation and corrupted-cache trials cannot produce a successful stale receipt.               |
| REQ-010 Retain independent publication checks               | AC-010: source/candidate/dependency inventory is re-established at the required boundary; offline loading, lossless reconstruction, output ownership, collision detection, atomic writes and fresh receipt checks continue to reject their negative fixtures.                     |
| REQ-011 Make performance observable proportionately         | AC-011: agreed metrics include real query/build/browser paths and resource costs; logs expose neither raw query/literal content nor private exception details; new collectors or destinations require an accepted policy.                                                         |
| REQ-012 Enforce calibrated performance budgets              | AC-012: the owner approves runner/device-specific workload, percentile/statistic, threshold and failure policy after a stable baseline; a deliberate regression demonstrates the gate while normal variance does not create unacceptable flakiness.                               |
| REQ-013 Preserve delivery and configuration authority       | AC-013: every changed configuration path/setting has exact prior approval; public schemas, dependency selectors and deployment behavior stay within accepted scope; release evidence names the exact candidate and actual checks.                                                 |
| REQ-014 Retain all audit findings and dispositions          | AC-014: HOT-01 through HOT-10, all four patch ideas, all six benchmark scripts, proposed gates, unknowns and rejected directions have an explicit destination in this plan and later completion report.                                                                           |

Domain invariants:

1. Search ordering, language preference, lexical match basis/rank, entity-kind filters, snapshot identity, cursor semantics, ownership/source filters and truncation reporting remain contract behavior.
2. In the path without context, `returnedEntityCount` equals `min(totalCandidateCount, maximumResultCount)`; `resultSetTruncated` and presence of `page_limit` depend on the unsliced count.
   Preserve `source_evidence_unavailable`, `nextCursor: null` and unsupported-filter refusals.
3. Runtime optimization metadata is private and disposable.
   It does not alter serialized query-index schemas, release digests or externally exposed immutable objects.
4. Canonical bytes, strict decoding, schemas, digests and artifact size limits remain enforced.
   Performance work cannot weaken Zod or integrity admission.
5. RDF values remain tuples with exact lexical, datatype and language identity.
   A display string or unchecked separator is not an identity oracle.
6. A transport budget applies to the complete rendered application result, including text, structured content, diagnostics and serialization escaping.
   An estimate never replaces the final exact measurement.
7. Root entity retention, graph referential integrity and truthful completeness/path claims survive truncation.
   No malformed result is reported as successful merely because it is small.
8. Build reuse does not turn prior success into current verification.
   Independently required checks retain their authority at their actual trust boundary.
9. Configuration and repository-policy edits require the user's explicit approval for each exact change.
   This plan proposes no current configuration mutation.
10. Failures, partial outputs, canceled runs and missing proof remain visible; task-created scratch is removed only after consumers finish and required evidence is retained.

## Architecture, rule ownership and proposed decisions

### Current seams and DRY-01 assessment

Likely implementation paths below are predictions, to be rechecked against the working tree.
They are not a mandate to edit every listed file.

| Rule and current authority                                                                                                                    | Consumers / boundary                                                         | Strategy and drift control                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query ranking/projection: `packages/universal-ontology-query/src/createOntologyQueryModule.js`                                                | Portable query entry and `createNodeOntologyQueryModule.js`                  | Keep ranking and lexical semantics in their existing owner. Distinct context completion may require a different projection point; test both consumers rather than copying a search engine.                                                |
| Context filtering/pagination: `createNodeOntologyQueryModule.js` and context execution modules                                                | Node filesystem/context queries and MCP                                      | Retain this independent semantic boundary; the Node factory currently always supplies `searchContext`. A portable search speedup therefore does not establish a Node/MCP pagination speedup.                                              |
| Sort semantics: `src/ontology.js`                                                                                                             | Controller, DOM event handlers and generated ontology pages                  | Keep one column-to-key meaning. A small pure internal extraction/sort seam is permissible if it improves direct testing; no generic table framework or duplicated test oracle.                                                            |
| Term identity: `src/ontologyViewModel.js`                                                                                                     | Browser projection, labels/definitions and deduplication                     | Preserve exact tuple meaning; separate display sort keys from RDF identity. Use independent adversarial vectors to detect collisions.                                                                                                     |
| Artifact admission: `ontologyQueryArtifactParsing.js`, canonical-byte serializer, schemas and limits                                          | Portable/Node repositories, persistent caches and MCP                        | Share pure admission rules; preserve runtime-specific byte transport. Do not import `node:buffer` into a browser entry or maintain a second schema.                                                                                       |
| JSON traversal and deduplication                                                                                                              | `jsonValueImmutability.js` and `createOntologyReleaseQueryIndex.js`          | Reuse existing owners and contracts; independent expected bytes/identity assertions must not derive from the optimized helper.                                                                                                            |
| MCP pruning and rendering: `createUniversalOntologyMcpServer.js`, existing text renderer and output schemas                                   | Direct tool calls, stdio and HTTP                                            | Keep pruning policy in one owner; each transport still enforces its actual boundary. Full serialized-result checks remain independent of estimates.                                                                                       |
| RDF conversion: `scripts/rdfXmlToJsonLd.js`, `scripts/build/ontologyAssetWorker.js`, `scripts/ontology/ontologyStructuralFingerprint.js`      | Website assets, query artifacts, full ontology verification                  | Do not merge canonicalization solely because calls look alike. Source/generated graph comparison and structural verification prove different claims. Share immutable inputs/results only for identical semantics and dependency identity. |
| Full-build evidence: `scripts/build/fullOntologyAssets.js`                                                                                    | Generation, sealing, verification and website publication                    | Retain source/candidate/producer authority and independent dependency discovery. Current repeated discovery includes deliberate change detection. A cache cannot validate its own stale receipt.                                          |
| Build orchestration: `ontologyAssets.js`, worker pool, `createOntologyQueryArtifacts.js`, `generateOntologyQueryIndexes.js`, `vitePlugins.js` | CLI and Vite entry points                                                    | Compose shared artifact producers, retain worker transfer ownership and bounded concurrency, and remeasure peak memory when reuse extends object lifetime.                                                                                |
| CI selection and publication                                                                                                                  | Existing PR/full qualification consumers and package/manual release controls | Add performance enforcement only through approved existing owners. Do not conflate website builds, Node tests, package qualification or release publication.                                                                              |

### Decision register

| Decision                               | Proposed disposition and acceptance owner                                                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 Scope and route                | UO owner accepts this as a documentation draft; implementation route R2 is proposed. Retained execution ownership must be resolved before new workflow work.                                                                                                     |
| DEC-002 Measurement authority          | UO maintainer owns fixtures and measured thresholds. Audit microbenchmarks motivate experiments; production functions and independent expected outputs determine acceptance.                                                                                     |
| DEC-003 Pagination boundary            | Initially slice only without `searchContext`; preserve complete context behavior. Any Node context redesign needs its own evidence for source filters, grouping and continuation.                                                                                |
| DEC-004 Token storage                  | Prefer sets only where token membership is used, rather than retaining redundant sets for every candidate kind. Query maintainer accepts the measured load/heap tradeoff.                                                                                        |
| DEC-005 Browser sort                   | Compute only the requested key once per row and preserve stable binary string comparison. No locale/collation change, persistent row-key cache or UI framework is implied.                                                                                       |
| DEC-006 Native equality                | Prefer native Node buffer equality with exact view offsets/lengths and existing portable comparison. Validate available native methods and browser bundling; no polyfill package or public API change by default.                                                |
| DEC-007 MCP retention                  | Preserve the current ordered pruning outcome by default. Any more aggressive omission requires owner acceptance of an explicit retention contract before implementation. Binary search requires proven monotonicity or another bounded exact strategy.           |
| DEC-008 Build reuse                    | Start with profiling and identical-input reuse inside a bounded build. Persistent caching is conditional on accepted key, verification, storage, concurrency and recovery design. Root-file SHA-256 alone is insufficient for imported/option-dependent outputs. |
| DEC-009 RDF keys and digest formatting | Keep current safe representations unless meaningful production cost is shown. Reject an unescaped delimiter key; defer SHA-256 formatting.                                                                                                                       |
| DEC-010 Budgets and telemetry          | Audit thresholds are provisional; CI and service/browser owners accept calibrated metrics, privacy and enforcement behavior. Prefer existing operational events before selecting new telemetry software.                                                         |
| DEC-011 Reuse and versions             | Existing native APIs and repository modules are the first fit assessment for these repairs. A new cache engine, benchmark framework or OpenTelemetry/RUM capability requires current source-backed REU-01/VER-01/LIC-01 assessment before design is frozen.      |
| DEC-012 Names and compatibility        | Preserve public meanings. Reassess names of changed responsibilities under NAM-01; use names such as `totalCandidateCount` and `maximumResultBytes` only for their actual scope/units. No prior NSH-01 override is asserted and no shim is planned.              |

The compact native reuse assessment is: existing `Array`, `Set`, typed arrays, Node buffers, Jest, Playwright, current RDF libraries and existing build/query helpers cover the proposed local repairs.
No new runtime dependency is presently justified.
This is not completed software-selection clearance for a persistent cache or telemetry service; those capabilities remain gated.

Native buffer views can share an `ArrayBuffer` using an offset and length, while other construction overloads can copy data; use the intended overload and test subviews.
See the [Node buffer API](https://nodejs.org/docs/latest-v24.x/api/buffer.html#static-method-bufferfromarraybuffer-byteoffset-length).
Preserve stable ordering for equal sort keys as required by the [ECMAScript sort contract](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort).
Keep canonicalization's dataset-equivalence purpose distinct from serialization and source identity, following the [RDF Dataset Canonicalization recommendation](https://www.w3.org/TR/rdf-canon/).
These primary references were checked on 26 October 2026; none proves the audit's speedup estimates.

## Vertical implementation slices

### SLICE-001: Establish the accepted workload and proof baseline

**Outcome:** a reproducible production-path baseline and accepted implementation boundary.
Dependencies: owner resolves retained execution ownership, accepts the draft requirements/risk route and design needed for the selected slice, and names the integration maintainer and independent oracle/review owners.

Capture exact commit/tree, source corpus identities, installed Node/npm/V8/Vite/Jest/RDF-library versions, OS/CPU, worker count, runner memory/CPU limits and browser/device versions.
Locate original raw evidence where useful; otherwise retain the report as historical and collect new evidence without claiming a reproduction of its exact environment.
Inspect command lifecycle effects before execution.
No dependency installation, configuration amendment or benchmark execution is part of writing this plan.

Define real fixtures for portable and Node context searches, all browser columns, artifact parsing, MCP fitting, full builds and incremental invalidation.
Use production entry points, independently specified expected outcomes and retained samples; keep the original copied-function benchmarks as explanatory controls only.
Separate warm query/index-cache behavior from cold loading, sort algorithm cost from render/paint cost, and build phase duration from inclusive plugin timers.

**Proof:** AC-001/014, QA-001; baseline reports identify every unavailable metric and all suite skips; the owner accepts proposed success thresholds before they block delivery.
**Release/cleanup:** produces evidence, not a product release.
Retain fixture hashes and raw results, remove temporary instrumentation after evidence consumers finish unless explicitly accepted as maintained diagnostics.

### SLICE-002: Limit portable search projection after ranking

**Outcome:** a broad portable query returns the same result while aggregating only the requested prefix.
Predicted files: `createOntologyQueryModule.js`, `ontology-query-module.test.js`; context regression coverage in `node-ontology-query-module.test.js` and `ontology-context-queries.test.js`.
Depends on SLICE-001 and DEC-003.

Retain complete candidate matching, best-candidate selection, language ranking, binary tie ordering and entity-kind filtering.
Record the full candidate count before slicing, then aggregate the prefix only on the branch without `searchContext`.
Compute match ranks against the original ordered sequence and derive all count/truncation fields from the full count.
This is the intent of audit Patch 1, including its explicit `searchContext` guard; do not copy only its headline recommendation.

Preserve validation, cancellation checkpoints and unsupported context-filter failures.
Verify that a candidate excluded from projection cannot alter observable success/failure semantics under the admitted input domain.
The Node factory supplies context completion; optimizing its projection later requires proving where source filters, repeated groups and cursor positions are finally determined.

**Proof:** AC-002; QA-002/003. Compare complete public results for empty/no-query, no-match, one-match, boundary/over-limit, multilingual, duplicate-release and mixed-kind cases, and errors/cancellation.
Demonstrate 20 projections rather than 1,000 in the defined portable fixture through a focused seam/profile, plus improved production-path time.
**Release/cleanup:** independent source change with no artifact-schema migration; retain prior qualified package identity for an authorized rollback.
Retire temporary counters after measurement.

### SLICE-003: Retain definition token membership for an index lifetime

**Outcome:** repeated lexical-definition searches avoid rebuilding the same sets.
Predicted files: runtime index construction and candidate evaluation in `createOntologyQueryModule.js`, with query tests.
Depends on SLICE-001; integrate serially with SLICE-002 because both modify the same semantic owner.

Implement audit Patch 2's intent at runtime-index construction, preferably only for definition candidates that use membership.
Keep normalization and tokenization in their existing authority; verify whether the original token array still has a consumer before retaining both representations.
Sets remain private: freezing a JavaScript `Set` object alone does not prohibit changing its entries.
Do not serialize sets or expose mutable collections through the immutable result contract.

**Proof:** AC-003; QA-002/004. Cover exact matches, all-token coverage, substring-only matches, punctuation, repeated/empty tokens, languages and alternative candidate kinds.
Compare cold load, warm p50/p95, heap after repeated queries, multiple release loading, cache eviction and shutdown/disposal.
Measure actual set construction rather than asserting zero allocation for the whole query.
**Release/cleanup:** no persistent migration.
In-memory indexes are rebuilt by normal process/lifecycle replacement; rollback is a qualified code deployment, not mutation of frozen artifact bytes.

### SLICE-004: Sort the real browser table with one selected key per row

**Outcome:** a header click preserves table behavior with less extraction work.
Predicted files: `src/ontology.js`, existing browser/build tests and, if needed, a small focused controller/sorting test.
Depends on SLICE-001 and the frontend implementation guidance applicable at execution time.

Implement audit Patch 3's column-targeted decorate/sort/reorder intent across `objectType`, `uuid`, `uri`, `preferredLabel`, `definition`, `sources`, `references`, `creator`, `createdAt`, `modifiedAt`, `subClassOf` and `classOfNamedIndividual`.
Keep existing string conversion, lowercase comparison, empty-string defaults, join separators and array contracts.
Preserve ascending-first behavior, toggles, stable ties, header indicators, row identity and subsequent sorting from the current displayed order.
Allocate per-click keys; a persistent cache is unnecessary unless separate measurements justify invalidation complexity.

**Proof:** AC-004; QA-005.
Test all columns/directions, missing scalar values, empty arrays, equal case-folded keys, Unicode and repeated sorting. Execute the controller in a real browser and inspect header state, content, focus/interaction and console errors.
Measure key extraction/sort separately from DOM rendering and interaction-to-paint at 1,000 and 2,000 rows and a representative larger case.
The existing view-model test alone does not test this private controller method.
**Release/cleanup:** website-only behavior slice, delivered through a qualified website build.
Remove measurement hooks; preserve approved serving/asset-cache behavior.
Web Workers remain deferred without new evidence.

### SLICE-005: Accelerate canonical byte equality across supported runtimes

**Outcome:** large canonical artifacts retain exact admission with lower Node comparison overhead.
Predicted files: `ontologyQueryArtifactParsing.js`, `ontology-query-artifact-parsing.test.js` and existing package-interface/browser tests.
Depends on SLICE-001 and DEC-006.

Implement audit Patch 4's native comparison intent without copying entire byte ranges or comparing bytes outside a view.
Keep the portable comparison for supported browser environments; verify method availability rather than treating the presence of an arbitrary global named `Buffer` as proof of the required API.
Do not import a Node-only module into browser exports or install a buffer polyfill to obtain this optimization.
Native equality is not a timing-safe secret comparison claim; these are public artifact bytes.

**Proof:** AC-005; QA-006.
Cover equal/unequal lengths, zero length, first/middle/last-byte differences, `ArrayBuffer`, Buffer, typed-array/DataView subviews with offsets and non-byte element types as admitted by the existing adapter.
Exercise both branches, malformed UTF-8, altered whitespace/property order, corrupt schema/version and digest-related surrounding checks.
Compare isolated equality and full parse/freeze latency; inspect actual browser bundle imports.
**Release/cleanup:** no wire/schema migration and no loosened admission.
Reverse the scoped code change if native behavior is incompatible; keep supported portable semantics.

### SLICE-006: Reduce validated JSON and query-index allocation overhead

**Outcome:** parsing/freezing and index generation retain their exact outputs with fewer temporary containers.
Predicted files: `jsonValueImmutability.js`, `createOntologyReleaseQueryIndex.js`, `json-value-immutability.test.js` and `ontology-release-query-index.test.js`.
Depends on SLICE-001; freezing and indexing improvements may be accepted separately if only one shows value.

For HOT-07, iterate arrays directly while retaining the existing contract: validated acyclic JSON, same returned identity, and already-frozen containers whose descendants are already deeply frozen.
Do not silently broaden this into an arbitrary object-graph/cycle/accessor freezer.
For HOT-08, avoid unnecessary empty/singleton Map work, but inspect callers for array aliasing, mutation, freezing and `createKey` validation/effects before selecting the fast path.
The existing helper returns a fresh array and later duplicate keys select the last supplied value; preserve any observable ownership/winner behavior.

**Proof:** AC-006; QA-007.
Verify nested objects/arrays, empty/singleton lists, null/primitives, already-frozen values, deep mutation rejection, duplicate keys, canonical ordering and shared-array fixtures. Compare complete generated query-index bytes and benchmark real parse/index paths, including retained heap.
**Release/cleanup:** no artifact-format change.
Rebuild/requalify derived artifacts under existing rules; retain the baseline corpus and remove scratch allocation probes.

### SLICE-007: Bound MCP result-fitting work without losing truthful evidence

**Outcome:** large context/connection responses fit faster while preserving the accepted pruning contract.
Predicted files: `createUniversalOntologyMcpServer.js`, existing text-rendering seam as necessary, server tests and `ontology-context-transports.integration.test.js`.
Depends on SLICE-001 and acceptance of DEC-007 by the MCP semantic owner; independent security/correctness review owns trust-boundary acceptance.

The inspected production algorithm clears all statements in the first detailed expression, then clears definitions/notes/sources from the last eligible peripheral node, then removes the final peripheral node.
Node removal repairs connections and referenced expressions, sets completeness counts/depth, records bounded frontier hints and filters paths; path results become incomplete with `shortestPathsEstablished: false`.
Thus “one statement per iteration” in the audit is not a complete description of the real operation.

Define an ordered sequence of legal pruning states that reproduces the accepted retention policy.
Prototype batching or bounded search over those states, using estimates only to select trials.
New diagnostic flags/hints can increase size, and graph repairs alter several collections; prove size monotonicity before binary search, or use another bounded strategy that preserves exact semantics.
If proportional pruning over-removes evidence, refine to the required retained state or obtain an explicit changed retention decision.
Do not return an oversized result when no progress is possible, as the research mock can do.

**Proof:** AC-007; QA-008/009. Compare accepted retained contents and pruning order against independent fixtures at exact/just-over/very-small budgets. Include long escaped strings, multibyte Unicode, large single statements, many small expressions, dense/disconnected graphs, peripheral detail, path alternatives and irreducible root payloads.
Assert the exact complete serialized UTF-8 byte count for every success, safe error mapping, diagnostic uniqueness, accurate counts, valid references and no private exception leakage.
Measure renders/serializations, end-to-end tool p50/p95, concurrency and event-loop delay through stdio and HTTP.
**Release/cleanup:** keep schemas and protocol meaning stable unless separately approved.
Retain complete baseline comparison evidence; roll back the source/package only to an admissible qualified release, or forward-fix/restrict the affected operation when rollback is not safe.

### SLICE-008: Decide whether RDF identity-key optimization is warranted

**Outcome:** either a measured, collision-safe improvement or an evidenced decision to retain current tuple serialization.
Predicted files: `src/ontologyViewModel.js` and `tests/ontology-view-model.test.js` only if a change is justified.
Depends on SLICE-001, DEC-009 and a meaningful view-model profile.

Measure `getRdfTermKey` within complete view-model construction before replacing it.
Consider reusing a key within the same immutable computation before inventing a new encoding.
Any alternative must distinguish the full literal tuple for unrestricted text; an unescaped delimiter cannot satisfy that requirement.
If length-framed/escaped keys or nested maps are proposed, compare complexity and memory against the current JSON tuple and test the representation independently.

**Proof:** AC-008; QA-010.
Include delimiters, NUL/control characters, quotes, backslashes, Unicode, empty language, differing datatypes, equal lexical text with different language and repeated literals. Preserve selection/deduplication output and measure a full workload improvement.
**Release/cleanup:** no change is a valid terminal disposition for this slice.
Any accepted change remains internal, with no persisted key migration.

### SLICE-009: Reuse identical build computation with explicit identity

**Outcome:** a measured reduction in repeated RDF transformation/canonicalization without weaker artifact verification.
Predicted files: `ontologyAssets.js`, `ontologyAssetWorker.js`, `ontologyAssetWorkerPool.js`, `createOntologyQueryArtifacts.js`, `scripts/rdfXmlToJsonLd.js` and relevant build tests; actual edits follow phase profiling.
Depends on SLICE-001, DEC-008 and approved design/configuration where needed.

Profile each parser, conversion, canonicalization, worker transfer, hashing and write phase with call counts and input/output identities.
The current RDF/XML-to-JSON-LD path canonicalizes source and generated RDF to verify equivalence; the query worker separately canonicalizes its dataset.
These explain possible repeated work but do not prove all three passes are interchangeable or consume 98% of wall time.
Keep the generated-graph equivalence check and independent structural verification even if identical source canonicalization can be reused.

Start with bounded build-lifetime reuse only where the exact RDF dataset, base IRI, parsing/canonicalization options and producer identity match.
Account for worker structured cloning/transfer: transferred buffers may no longer be owned by the sender, and retaining large graphs can increase peak memory.
Measure cold runs as well as repeated builds; concurrency changes are not an assumed remedy for a 2.67 GB working-set observation.

Persistent reuse is a separate conditional extension.
Specify keys binding content/dependency hashes, source/base/format identity, projection policy, parser/canonicalizer and OwlAPI producer identity, algorithm/work-factor settings, output schema and relevant runtime behavior.
Define bounded storage, verified reads, atomic publication, concurrent writers, corrupt/partial entries, cache schema/version invalidation and safe eviction.
Reuse existing repository/native capabilities if they fit; complete software-selection/rights research for any new cache facility before custom construction.
A source-file hash alone cannot validate an imported closure or an output whose options/producers changed.

**Proof:** AC-009/010; QA-011/012.
Compare cache-disabled, cold, warm and one-input-changed output inventories, deterministic bytes, graph equivalence and receipts.
Mutate root/import/catalog/projection/producer/options, add/delete/rename a candidate, corrupt/truncate entries and interrupt writes; stale reuse must be refused or safely recomputed.
Measure end-to-end wall time, process-tree peak memory, worker CPU and disk use; the audit's 70% gain remains a hypothesis.
**Release/cleanup:** no persistent cache ships until ownership/retention/configuration are approved.
Derived caches are disposable; historical ontology sources and release artifacts are not.
Preserve failure evidence before removing task-owned temporary entries.

### SLICE-010: Avoid repeated full discovery work while preserving current evidence

**Outcome:** cheaper unchanged-input discovery and producer hashing, with the same stale-input/publication refusals.
Predicted files: `scripts/build/fullOntologyAssets.js`, relevant import-closure helpers, `full-ontology-assets.test.js` and publication tests selected by actual impact.
Depends on SLICE-001; coordinate with SLICE-009 because their invalidation and lifetime decisions are coupled.

The current discovery parses RDF headers/imports and performs native lossless loading for eligible roots without imports.
`assertBuildInputs` rediscoveries also compare candidate inventory, independently reconstruct required imported-document bindings, verify consumed document hashes and check producer evidence.
Do not replace these with cached headers or a prior receipt's self-declared input list.

Separate a demonstrably unchanged computation from the fresh observations that establish it is unchanged.
Use exact current bytes and complete accepted identities; timestamps alone are insufficient.
Retain filesystem containment, byte limits, date/cutoff rules, ontology/version identity, legal import declarations, native lossless-load checks, network-disabled mapping and output ownership.
Bound any producer-package-hash reuse so a package changed during a build cannot retain a successful stale identity.

**Proof:** AC-009/010; QA-011/012.
Exercise no-import/import roots, invalid headers, changed mapped imports, source mutation between discovery and seal, package mutation, changed candidate set, stale/unowned output and interrupted generation.
The normal verifier must still reject missing/stale receipts without regenerating. Compare unmodified cold/warm builds and their proof costs separately.
**Release/cleanup:** land only after independent build/publication review.
A cache bypass or removal is a recovery mechanism only when supported by the accepted design; do not invent a flag or delete arbitrary outputs during rollback.

### SLICE-011: Observe real workloads and introduce calibrated gates

**Outcome:** maintainers can distinguish real performance regressions from noise and see whether optimized paths matter to users.
Predicted files: existing MCP operational-event module, relevant browser instrumentation and existing CI workflow owners after exact approvals; documentation for interpreting retained measurements.
Depends on SLICE-001 and relevant completed slices; new telemetry and CI enforcement require DEC-010/011 and exact configuration approval.

Prefer existing operational events for tool duration, input/output byte counts, result fitting frequency, pruning/render counts, cache state and concurrency, with bounded low-cardinality fields.
Record no raw queries, ontology literals, credentials or private exception text by default.
Define observer, retention, access, sampling, instrumentation overhead and failure behavior before selecting OpenTelemetry or a remote collector.
For the browser, establish representative devices and measure real interaction/render cost; LCP and INP inform separate questions and cannot be inferred from a Node sort benchmark.

The audit proposes four controls, all retained for calibration:

| Proposed control                              | Initial disposition                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build duration above 240 seconds alerts/fails | Measure a comparable runner/workload/cache state first. Decide alert versus failure explicitly; do not install a workstation-derived hard timeout.                                  |
| Build peak memory below 3.5 GB                | Specify decimal GB/GiB and process versus process-tree metric; verify actual runner capacity rather than assuming every CI runner has 7 GB.                                         |
| Query-index artifact bounds                   | Keep `MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH` and its owning module authoritative; add regression evidence without duplicating or increasing the limit silently.              |
| Sorting 1,000 rows within 5 ms                | Treat as a proposed algorithm budget on a selected browser/device. Measure key extraction, sort, DOM work and paint separately; JSDOM timing does not prove browser responsiveness. |

Initially retain baseline distributions and report meaningful changes; make an enforced gate only after accepted calibration and an intentional-regression trial.
Do not add performance checks to unrelated CI jobs or assume an automatic MCP package/release route is enabled.

**Proof:** AC-011/012/013; QA-013/014. Validate event redaction and bounded cardinality, instrumentation overhead, a deliberate slow/oversized candidate, normal-run variance and complete failure reporting.
**Release/cleanup:** observability and enforcement are separately accepted increments.
A rollback may remove the new approved gate/collector while preserving semantic and security checks; retention cleanup follows the accepted owner policy.

## Quality scenarios, oracles and verification

### Falsifiable quality scenarios

Thresholds not already contractual remain proposed until SLICE-001/011 owner acceptance.
Correctness and exact byte/identity assertions are hard requirements throughout.

| Scenario                              | Stimulus / environment                                                                        | Required response and evidence                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 Repeatable performance         | Repeat a fixed production workload on the same identified environment                         | Retain samples, warmup/order/cache state and fixture hashes; report median/p95 where sample count supports them, spread and confidence/limitations. No unsupported ratio claim. |
| QA-002 Search equivalence             | Broad, exact, token, substring, blank and multilingual queries across releases                | Identical accepted public results/ranks and error semantics; reduced measured redundant work on the intended path.                                                              |
| QA-003 Context continuation           | Source/ownership filters, repeated entity groups, page boundaries and cursor/snapshot changes | No lost late matches, duplicates/skips or altered snapshot/continuation contract. Portable-only speedup is labeled accordingly.                                                 |
| QA-004 Index lifetime                 | Load many releases, issue repeated searches, then dispose/evict                               | No per-query set growth; retained memory and cold load remain within the accepted budget; disposal releases optimization state.                                                 |
| QA-005 Browser interaction            | Toggle every column on representative real pages and stress fixtures                          | Stable correct order, unchanged displayed values/controls, no new console errors and accepted algorithm plus interaction/render timings.                                        |
| QA-006 Artifact trust                 | Corrupt bytes/schema/canonical form; exercise browser and Node byte views                     | Same safe rejection categories and offset-correct equality; no new Node-only browser dependency.                                                                                |
| QA-007 Immutable/indexed data         | Freeze nested JSON and index empty/singleton/duplicate assertions                             | Same identity, deep freeze, deduplication winner/order and canonical bytes; lower measured allocations.                                                                         |
| QA-008 Byte-bound evidence            | Fit multibyte/escaped/graph-rich results at boundary budgets                                  | Every success fits exactly; legal retained graph and correct completeness/path metadata; safe failure if irreducible payload cannot fit.                                        |
| QA-009 MCP concurrency                | Concurrent large fitting requests over supported transports                                   | Accepted end-to-end p95/event-loop delay and no cross-request mutation; cancellation/error/redaction guarantees remain.                                                         |
| QA-010 RDF identity                   | Adversarial literals share text/separators but differ in tuple components                     | No identity collisions or changed projection/selection; measurable benefit required to replace current encoding.                                                                |
| QA-011 Build reuse invalidation       | Warm build then alter each relevant source/dependency/producer/option                         | Recompute or refuse; never seal stale output. Deterministic bytes and independent graph assertions remain correct.                                                              |
| QA-012 Interruption and stale outputs | Stop during generation/cache write; introduce corrupt/unowned output or source mutation       | No successful partial receipt, no unowned deletion and recoverable rerun through supported controls; retain failure evidence.                                                   |
| QA-013 Private observability          | Trigger normal, failed and oversized tool requests                                            | Bounded useful signals without query/literal/secret leakage; telemetry failure does not break query safety.                                                                     |
| QA-014 Stable enforcement             | Repeat normal workloads and introduce a deliberate regression                                 | Accepted gates catch the regression with actionable evidence and an agreed noise/failure policy.                                                                                |

### Oracle ownership and mocking boundaries

The UO integration maintainer owns fixture identities and the cross-slice acceptance report.
The query/projection maintainer owns search and immutable-data expected outcomes; the browser maintainer owns sort/display acceptance; the MCP semantic maintainer owns legal graph retention; the build/publication maintainer owns equivalence, invalidation and receipt expectations.
An independent route-selected reviewer checks changed trust boundaries and negative cases before release; actual people/agents are to be designated, not presumed by this draft.

Use fixed independently reasoned expected outputs and existing contract fixtures, supplemented by before/after differential tests.
The previous implementation can be a comparison baseline but is not sufficient as the sole correctness oracle.
Do not derive expected ranking, identity keys, cache admission or byte budgets from the same helper being changed.

Mock only actual external boundaries such as network acquisition, filesystem/worker failure, transport disconnect and optional event sinks.
Do not replace production aggregation, schema parsing, renderer or canonicalization with a mock in the acceptance benchmark.
Use real browsers for rendering/interaction and real supported Node transports for MCP integration.
Adversarial fixtures should detect removal of a key validation, stale reuse or premature slicing, rather than merely mirror new code.

### Measurement protocol

1. Freeze a candidate and baseline with exact identities and record all environment/fixture versions.
   Compare on equivalent machines, worker counts and input inventories.
2. Separate fixture creation, disk acquisition, parsing, index construction, query execution, freezing and rendering as diagnostic phases; also time the complete user-visible operation.
3. Warm up explicitly, alternate/randomize baseline/candidate order and retain raw samples.
   Use enough repetitions for stable estimates; a p95 from a tiny run is not a release claim.
4. Cover small, typical and adversarial/large data, equal and early/late unequal bytes, cold/warm caches, multiple release counts and realistic query mixes. Reuse the audit's 1,000/20, 2,000, approximately 3 MB and 80-expression workloads as reference points, not the whole workload definition.
5. Record CPU time, wall time, heap/allocation/GC evidence, process-tree peak memory, worker concurrency, event-loop delay, artifact bytes and fit/render call counts as appropriate.
   Avoid double-counting shared worker memory or summing inclusive timers.
6. Approve a practically meaningful improvement threshold and tolerated cold-load/memory/instrumentation tradeoffs before selecting a winner.
   Report an optimization that fails to improve the complete path honestly.

### Existing commands and their scope

Re-read [development guidance](../development.md) and current npm scripts before execution; routine controls use npm entry points.
Commands below are planned verification, not checks run while authoring this plan.

| Purpose                               | Existing command / focused selection                                                                                                                                                                                                                           | Scope and effects                                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Query/projection suites               | `npm run test:unit`                                                                                                                                                                                                                                            | Includes the two selected packages; does not establish controller or MCP coverage.                                                                                                                                 |
| Search regressions                    | `npm test -- --runInBand packages/universal-ontology-query/tests/ontology-query-module.test.js packages/universal-ontology-query/tests/node-ontology-query-module.test.js packages/universal-ontology-query/tests/ontology-context-queries.test.js`            | Exercise portable and Node context contracts.                                                                                                                                                                      |
| Artifact/traversal/index regressions  | `npm test -- --runInBand packages/universal-ontology-query/tests/ontology-query-artifact-parsing.test.js packages/universal-ontology-query/tests/json-value-immutability.test.js packages/universal-ontology-query/tests/ontology-release-query-index.test.js` | Add impacted persistent-cache/readers and package-interface tests based on changed boundaries.                                                                                                                     |
| Browser model and built page          | `npm test -- --runInBand tests/ontology-view-model.test.js tests/build/built-ontology-page.test.js`                                                                                                                                                            | Supplement with the real controller/browser scenario; model tests alone do not validate sort behavior or 5 ms timing.                                                                                              |
| MCP result fitting                    | `npm test -- --runInBand packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-server.test.js packages/universal-ontology-mcp-server/tests/ontology-context-transports.integration.test.js`                                                      | Also select affected stdio/HTTP/operational-event integration suites.                                                                                                                                              |
| Build reuse and publication integrity | `npm test -- --runInBand tests/build tests/import-closure`                                                                                                                                                                                                     | Test fixtures may create temporary outputs; inspect setup/cleanup and include affected Python publication tests through `.venv` if their contracts change.                                                         |
| Website build                         | `npm run build:verify`                                                                                                                                                                                                                                         | Uses direct Vite entry and writes ignored `dist/`; inspect current lifecycle/plugin effects. Respect AGENTS.md's warning about `npm run build` auto-fix behavior even if current scripts appear simpler.           |
| Full release qualification            | `npm run check:qualification`                                                                                                                                                                                                                                  | Broad lint, formatting checks, JS/Python tests, skill-lock check, website build and generated JSON checks. Select through the actual route; do not run this broad product gate just to save a documentation draft. |
| Plan prose                            | `npm run check:markdown`                                                                                                                                                                                                                                       | Current policy checks the full Markdown corpus. Preserve unrelated failures; formatting writers require exact task-path selection.                                                                                 |

CI ownership, package opt-in and publication controls remain those documented in the repository.
Do not invent new npm scripts, Jest configuration, performance workflows or dependency pins to execute these slices without exact approval.
Document a missing supported benchmark entry point in SLICE-001 and propose its smallest concrete configuration delta separately.

## Traceability, ordering and integration

| Slice | Requirements / acceptance / quality / decisions | Proof | Release and cleanup implication |
| --- | --- | --- | --- | --- |
| SLICE-001 | REQ/AC-001,014; QA-001; DEC-001,002,011 | Identified real workloads, retained raw baseline and accepted gates | Evidence only; retain provenance, remove disposable probes. |
| SLICE-002 | REQ/AC-002,013; QA-002,003; DEC-003 | Full output equivalence and bounded projection | Portable query release; preserve context path. |
| SLICE-003 | REQ/AC-003,013; QA-002,004; DEC-004 | Match equivalence, warm/cold/heap measurements | Runtime metadata only; normal index disposal. |
| SLICE-004 | REQ/AC-004,013; QA-005; DEC-005 | Every column plus real browser timing | Qualified website assets; remove temporary hooks. |
| SLICE-005 | REQ/AC-005,013; QA-006; DEC-006 | Exact view cases, corrupt admission and browser build | No schema migration; retain portable support. |
| SLICE-006 | REQ/AC-006,013; QA-007; DEC-011,012 | Identity/aliasing and identical index bytes | Requalify generated artifacts; remove scratch. |
| SLICE-007 | REQ/AC-007,013; QA-008,009; DEC-007 | Exact budget, accepted graph retention, transport load | Reviewed MCP release; retained baseline evidence. |
| SLICE-008 | REQ/AC-008,013; QA-010; DEC-009 | Profile and collision-sensitive oracle | Change or explicit no-change disposition. |
| SLICE-009 | REQ/AC-009,010,013; QA-011,012; DEC-008,011 | Cold/warm/change/corruption parity | Cache acceptance/retention gated separately. |
| SLICE-010 | REQ/AC-009,010,013; QA-011,012; DEC-008 | Independent inventory and mutation refusal | Publication safeguards retained. |
| SLICE-011 | REQ/AC-011,012,013,014; QA-013,014; DEC-010,011 | Redaction, overhead and deliberate regression | Separate telemetry/gate approval and cleanup policy. |

Preserve the audit's first-three recommendation: after admission/baselining, prioritize portable pagination, token-set reuse and selected-column sorting.
Byte comparison and array-aware freezing follow as bounded repairs; MCP fitting is a separate semantic slice, and build reuse/discovery follows causal profiling and cache/trust decisions.
HOT-08 can accompany the traversal/indexing slice if measured; HOT-09 remains conditional and HOT-10 remains deferred.
This ordering preserves high-value cheap experiments without claiming the greatest wall-time bottleneck has already been solved.

SLICE-002/003 share a file and semantic owner: integrate sequentially and compare their combined result.
SLICE-009/010 share input/producer evidence and cannot be independently merged with incompatible reuse contracts.
After baseline and contract acceptance, browser sorting, byte comparison and MCP investigation are semantically separable subject to shared fixtures and integration review.
This is potential work ordering, not authorization to spawn parallel agents or grant concurrent write ownership.

The designated UO maintainer owns integration, preservation of unrelated work, current-tree rechecks and the final evidence matrix.
All implementation slices converge on the accepted current public contracts and route-selected final verification; successful isolated microbenchmarks are insufficient for integration.

## Configuration, compatibility and security gates

No configuration change is requested by this draft.
Before an implementation needs one, prepare the actual smallest diff, identify exact file/setting, state behavioral/pipeline effects, then obtain explicit owner approval as required by AGENTS.md.
Approval of this plan or an ordinary source fix does not satisfy that requirement.

| Potential future delta                                                                                                          | Exact decision required before editing                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `package.json` and its lockfile                                                                                            | Any added benchmark command or dependency selector, with exact command/version and generated lock impact. Prefer existing controls if sufficient.                                            |
| `scripts/build/createWebsiteConfig.js`, `vite.config.mjs` or another build control                                              | Any cache location, mode, worker/concurrency or build-behavior setting; identify whether the proposed source edit is itself configuration. Do not infer permission from its `.js` extension. |
| A new cache policy/environment setting                                                                                          | First identify the exact proposed path/key, ownership, byte/count bounds, invalidation and cleanup behavior. No invented default path is approved here.                                      |
| `.github/workflows/pr-validation.yml`, `.github/workflows/development-checks.yml` or `.github/workflows/full-qualification.yml` | Select the actual current owning job before proposing timing/memory enforcement, retained artifacts, permissions or runner changes; do not add the same step to every workflow.              |
| Test configuration                                                                                                              | Any new discovery, timeout or runner setting for benchmarks; avoid changing ordinary test timeouts to hide a regression.                                                                     |
| Telemetry/deployment policy                                                                                                     | Exact collector endpoint, fields, sampling, consent/access, retention and enablement; collection is not implied by an instrumentation proposal.                                              |
| Artifact-size controls or repository policy                                                                                     | Any limit, schema, exception, verification-profile or policy change requires its own explicit approval and negative tests.                                                                   |

For SLICE-002 through SLICE-008, aim for no public schema/API or persisted-data changes.
Changing an internal sort representation, token set or ephemeral key requires no backfill when it remains private.
If a proposed optimization changes serialized indices, public results or compatibility, stop and re-plan migration/versioning and consumers instead of smuggling it into a performance patch.
Persistent cache schema changes require a supported invalidate/recompute path and cannot reinterpret prior entries silently.

Security ownership covers strict UTF-8/schema/canonical admission, cache poisoning and containment, bounded canonicalization, input mutation, correct transport omission, private error handling and telemetry leakage.
Preserve RDFC work-factor/size bounds, network-disabled import loading and byte limits; do not weaken them to meet a performance target.
The independent route-selected security reviewer assesses affected native boundaries; no external provider, scanner run or private-source export is authorized by this document.
No completed native security assessment or no-shim exception is claimed.

## Rollout, recovery and production acceptance

Deliver qualified increments separately where their consumer boundary permits it.
For each candidate, record exact code/artifact identity, selected tests, negative trials, measured improvement and any accepted regression/tradeoff.
Obtain route-selected reviews and release-readiness evidence before activation.
Website publication, MCP package qualification, package publication and production telemetry activation remain separately authorized actions.

The responsible observer is the designated maintainer for each consumer, with the UO integration maintainer accountable for the combined outcome.
Before rollout, that owner selects a representative observation window and workload coverage, the meaningful latency/resource target and the permitted noise/rollback threshold; this draft invents no universal production SLO.
Observe actual search mix and p95, context filtering, fitting frequency/payload sizes/concurrency, cold and warm load, browser device mix and INP/LCP, build phase time/memory and cache misses/invalidation refusals.

Abort rollout on semantic mismatches, corrupt artifact admission, stale receipts, unsafe omissions, privacy leakage or any unaccepted budget regression.
Stop a faulty optimization's further activation while retaining diagnostics and exact candidate evidence.
Restore only a still-supported, qualified code/package/website artifact through its authorized delivery mechanism; an old commit or cache is not automatically a safe rollback target.
If a security or schema constraint rules out that target, prefer an accountable forward fix or restrict the affected operation.

Ephemeral index/sort state is replaced through normal lifecycle disposal.
An approved derived cache can be invalidated within its owned namespace and recomputed; cache deletion must not remove ontology sources, historical releases or unrelated files.
Interrupted builds preserve the existing receipt invalidation/atomic-output contract and resume through a supported clean rerun after inputs are rechecked.
Keep failed candidates and diagnostic artifacts required by existing policy; remove only task-created disposable scratch after its consumers finish.
No Git restoration of user-owned working-tree changes is part of recovery.

## Unknowns and re-planning conditions

| Unknown                                                  | Cheapest discriminating evidence                                                 | Decision owner / stop condition                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Exact audit environment and raw results                  | Retrieve retained logs/fixture identities or create a newly labeled baseline     | UO maintainer; no claim of reproduced speedup without matching evidence.                        |
| Real prefix/substring/exact/token query mix              | Existing redacted operational counts or an approved representative replay corpus | Query owner; do not optimize only a synthetic dominant case.                                    |
| Search p95 SLO and daily volume                          | Owner-defined use case plus measured production-path baseline                    | Product/query owner; hard gate remains unset until accepted.                                    |
| Actual Node/MCP benefit of pagination                    | Trace context completion/filter/group/page work and profile real Node calls      | Query/MCP owner; no early slicing past a later semantic filter.                                 |
| Set memory/load tradeoff                                 | Repeated queries across many loaded releases with disposal measurements          | Query owner; reject improvement that exceeds accepted retained-heap/cold-load budget.           |
| Browser devices, market share, INP and LCP               | Representative real-browser lab runs first; approved RUM only if needed          | Browser/product owner; no browser claim from Node/JSDOM timing.                                 |
| MCP concurrency and fitting frequency                    | Bounded existing events and controlled transport load                            | MCP owner; no assumption that local microseconds dominate user latency.                         |
| Build phase overlap and actual repeated canonical inputs | Timed call/identity traces and separate process-tree memory samples              | Build owner; do not cache independent proof away.                                               |
| CI/container CPU, memory and cache behavior              | Inspect current runner declarations and actual run properties                    | CI owner; 240 s/3.5 GB remain provisional.                                                      |
| Persistent cache capability and trust                    | Native/repository reuse assessment, key/invalidation prototype and tamper trial  | Build/security owners; block persistent design until evidence and exact configuration approval. |
| Meaning of “same” truncated MCP result                   | Independent accepted pruning vectors and budget-edge cases                       | MCP semantic owner; stop batching that loses unapproved evidence.                               |
| RDF-key cost and safe encoding                           | Complete view-model profile and adversarial tuple corpus                         | Projection owner; retain current JSON key absent meaningful gain.                               |

Re-baseline when HEAD, dependencies, corpus shape, public contracts, browser support, host runtime, runner limits or deployment context materially change.
Re-plan when a quick fix needs a schema/configuration/dependency change, a cache crosses a new trust boundary, a benchmark gain disappears on production paths, metrics show a different bottleneck, or the optimization merely shifts unacceptable cost to cold load/memory/verification.
Reassess shared-rule ownership when another consumer appears, two copies drift or a proposed abstraction merges incompatible domains.
Retained workflow ownership and exact configuration approvals remain gates regardless of elapsed time or apparent low implementation effort.

## Audit preservation and completion checklist

| Supplied content                                                             | Preserved destination                                                                                             |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Executive diagnosis, three runtime domains and ranked top five               | Purpose, measurement register, HOT-01 through HOT-06, slice ordering                                              |
| Build, table, definition, pagination, artifact parsing and fitting workloads | Measurement/provenance tables and SLICE-001 fixtures                                                              |
| Environment, test/build observations and unspecified inputs                  | Inspected baseline, reported evidence limits and unknowns                                                         |
| Ten hotspots, severity/confidence/effort/risk labels                         | Complete hotspot register and conditional dispositions                                                            |
| Complexity, allocation and I/O claims                                        | Complexity/allocation section with counting and timing qualifications                                             |
| Five detailed causal findings                                                | SLICE-002/003/004/005/007 and current-source corrections                                                          |
| Four example patches                                                         | Their intent and behavior in SLICE-002 through SLICE-005; proposed code is not treated as approved implementation |
| Six scripts, commands and benchmark results                                  | Provenance table, original command form, reported measurements and production protocol                            |
| Functional, sorting and pagination regression proposals                      | Requirements, invariants, quality scenarios and focused verification selections                                   |
| 240 s build, 3.5 GB memory, artifact bounds, 5 ms sort gates                 | SLICE-011 calibration table and exact approval gates                                                              |
| Quick wins, structural work, RDFC cache and lazy discovery                   | SLICE-002 through SLICE-010 with measured dependency ordering                                                     |
| MCP OpenTelemetry/events and browser INP/LCP                                 | SLICE-011 with privacy, instrumentation and approval constraints                                                  |
| Not recommended: sort workers, replacing Zod, SHA-256 padding work           | Deferred dispositions below                                                                                       |
| Final first-three recommendation                                             | Pagination, token sets and column-targeted sorting retained in order                                              |
| Research activity transcript                                                 | Evidence-provenance qualification; operational polling is not converted into implementation work                  |

Keep sorting on the main thread for the initial change; the audit's claim that worker cloning exceeds a 0.06 ms sort is a hypothesis for its small workload, not a universal upper bound.
Reconsider workers only when real UI measurements justify their transfer and lifecycle costs.
Retain Zod and other input validation; no profile supports replacing that trust boundary with hand-written checks.
Defer SHA-256 string-padding/hex-format micro-optimization unless whole-path profiling overturns its reported negligible contribution.

The implementation is complete only when every accepted slice has its linked proof, each deferred item has an explicit disposition, configuration changes have exact authorization, current consumer compatibility/security checks pass, and release/production observations are reported separately from local implementation.
This document itself completes only the requested synthesis and handoff.
