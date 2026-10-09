# Improve default RDF/XML output

Forward refinement record, 9 October 2026: the subsequent owner-approved refinement replaces the consumer's Git selection with `e15320d6438b27c5aaa7aa9302b6919749873ec9`.
That signed producer commit is published on `rdfxml-java-compatible-refinements`; UO copies authored RDF/XML root prefix preferences through `RDFXMLDocumentFormat.copyPrefixesFrom` while retaining closure semantics and the existing verified save path.
The owner approved the exact dependency, lockfile, contract, current specification amendment and reviewed package-manifest hash changes for that adoption.
Its consumer qualification and handoff evidence belongs to HISEW execution `6185e299-59fb-425c-b964-2e5284e04497`; this note does not assert a main merge, npm release, UO commit or deployment.
The 8 October implementation record and earlier design below remain historical evidence for the preceding increment.

Status: UO consumer source implementation complete; final qualification and handoff are recorded in execution evidence, 8 October 2026.
Consumer implementation amendment, 8 October 2026: the owner authorized implementing the Universal Ontology portion and explicitly selected an immutable Git commit dependency instead of an npm registry dependency.
OwlAPI's renderer and configuration prerequisites are delivered on upstream `main` at `e6f50bcfa1519b048bc66d37f7961c29b03a0971`, observed through the local checkout and remote ref readback.
This supersedes this draft's proposed registry-release/range adoption for the consumer; producer release decisions remain outside this execution.
The consumer implementation covers SLICE-005 and the UO handoff in SLICE-006, preserving the existing public save call and closure semantics.
The owner separately approved the exact Git pin in `package.json`, native npm 12.2.0 regeneration of `package-lock.json`, the Git-source identity policy in `docs/import-closure/contract.v1.json`, and root `.npmrc` containing `allow-git=root`.
The last setting admits direct Git dependencies in existing setup and CI commands while rejecting transitive Git dependencies; installations retain `--ignore-scripts`.
After full qualification exposed the execution-policy dependency, the owner also approved selecting manifest-dependent checks for `.npmrc` changes and refreshing the verifier's exact package/selector identities, adding `.npmrc` and raising its mandatory reviewed-file count to 33.
The owner approved the exact Git-source amendment to the normative import-closure specification, preserving historical registry records and all closure/API semantics while establishing current source/package qualification.
Commits, pushes and deployment have not been requested.

The owner explicitly selected **improve OwlAPI defaults, then adopt in Universal Ontology**.
The amendment above records the accepted consumer implementation and exact configuration approvals.
The remaining sections preserve the earlier design and planning baseline; any registry/range, approval-pending or CI-exclusion statements are superseded for the consumer by that amendment.
Producer release actions remain proposals; commits, publication and deployment require separate authorization.

Plan owner: maksy, for both repositories.
Implementation ownership: OwlAPI owns RDF/XML rendering and producer qualification; Universal Ontology owns dependency adoption, import-closure generation and distribution acceptance.
This plan is retained in Universal Ontology because its observable outcome is readable generated `-full` distributions.
The companion OwlAPI plan is `docs/plans/expose-configurable-rdfxml-formatting.md` in the `Hadden-Industries/owlapi` repository.
IDs in this document are local to this plan; prefix references with the plan title when crossing documents.

## 1. Outcome, scope and draft baseline

An ontology reader opening `dist/universal/reference-data/20260912-full` should see recognizable `owl:Ontology`, `owl:Class`, property and restriction elements, readable namespace names, indentation and predictable grouping.
The output must represent exactly the same RDF graph and supported OWL structure as before.
Readable syntax is a serialization choice, not a reason to add declarations, infer types, modify annotations or weaken the import-closure contract.

The change spans **both repositories**.
There is no UO-owned RDF/XML rewriter, Java subprocess in production, alternate serializer selected by a hidden switch, or temporary compatibility adapter.
OwlAPI's existing public `saveOntology` path receives better defaults; UO continues using that path.
The companion plan later exposes selected Java-compatible controls over the same implementation.

Included: typed node elements, useful deterministic prefixes, whitespace that respects literals, stable ordering/grouping, safe nesting of anonymous expressions, and lossless collection abbreviation where its preconditions hold.
The first demonstrable increment is typed, indented output; nesting and collections are subsequent increments with their own preservation evidence.
Not every node must cease to be `rdf:Description`: untyped resources, unsafe QNames and ambiguous cases may require it.

Excluded: inference, changes to ontology sources or closure policy, public writer configuration, arbitrary user prefix editing, byte-for-byte reproduction of Protégé, an RDF canonicalization standard, a Java runtime dependency, new serialization formats, and changes to website deployment or CI selection policy.
Authored comments and layout cannot be reconstructed from an OWL structural model that does not retain them.

Observed baseline:

| Input                          | Observation and authority                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Universal Ontology             | `main`, `933105aaef668dd5f87c3787f26153906f09ab86`; clean before this planning task.                                                                                                                                          |
| OwlAPI                         | Renderer inspected at `ee99b3b3931617c5a76b7eb9dfeb53fab704e2d3`; concurrent unrelated Markdown work advanced HEAD to `170c827e0e9b75b36c48609f36adeaea4a9c55f2`. Refresh the source identity before implementation.          |
| Consumer dependency            | `package.json` uses `owlapi: npm:@hadden-industries/owlapi@>=0.1.0-rc.1`; the inspected installation resolves rc.1. Preserve the range policy when adopting a successor.                                                      |
| Existing distribution contract | [Import closure contract](../import-closure/contract.v1.json) and [generated full publication plan](2026-10-05-generated-full-ontology-publication.md). Preserve their accepted semantics and source-selection rules.         |
| Java behavioral oracle         | OwlAPI `util/owlapi-reference/pinned-version.json`: revision `d7e997a53b470e32700de89cc610d9daf01ea769`, describe `owlapi-parent-5.5.1-7-gd7e997a53`. This is a pinned development oracle, not exactly the 5.5.1 release tag. |
| Protégé example                | Installed Protégé 5.6.9 bundles OWLAPI `4.5.29.2024-05-13T12:11:03Z`; its appearance is a useful reference, not the project's Java API version authority.                                                                     |

The previous full-publication plan explicitly excluded an OwlAPI upgrade and new serializer work.
This new proposal adds that scope; it does not retrospectively extend the older approval.
The active OwlAPI Markdown execution belongs to another session.
Drafting this separate document does not adopt, pause, verify or close it; implementation requires an available worktree and fresh HISEW admission.

## 2. HISEW route

### Risk class:

R2 for the proposed implementation; this task produces draft documents only.

### Decision owner:

maksy accepts the exact baseline, consequential adaptations, dependency changes and release decisions.
Each repository's implementation owner retains its own acceptance evidence.

### Reasoning:

A serializer can silently alter blank-node identity, list structure or literal values while producing valid XML.
Its bytes also feed generated distribution hashes and derived formats across repositories.

### Potential blast radius:

Every OwlAPI RDF/XML save, Node/browser consumers of the package, and all eligible UO full distributions rebuilt with it.

### Reversibility:

Unpublished changes can be revised; a published immutable package cannot be overwritten.
UO can return to an explicitly approved earlier dependency and rebuild from source, subject to current policy qualification.
Do not claim that replacing only one RDF/XML file restores a coherent publication.

### Principal unknowns:

Exact formatting observations against the pinned Java oracle, safe abbreviation coverage, performance on the largest current closures, and the selected producer release version.
SLICE-001 closes implementation-affecting unknowns before the dependent change.

### Required artifacts:

Accepted dossier/decision matrix, representative fixture inventory, criterion-level evidence, generated compatibility documentation where applicable, exact package identity and separate UO build receipts.
HISEW personal evidence belongs in the freshly resolved external evidence root, observed as `C:\Users\maksy\.hi\w\e` on 8 October.
Product-owned reports such as `.sdlc/runtime/policy-reports/full-ontology-build.json` remain in their established product location.

### Required specialist lenses:

RDF/OWL semantic preservation, XML/literal correctness, Java public-contract compatibility, browser packaging and distribution provenance.
R2 requires independent verification of the frozen implementation candidate.
Scope any required native security assessment to escaping, comments, identity handling and bounded traversal; this draft starts no scan or delegation.

### Required verification:

Focused semantic and presentation checks per slice, affected storage/package regressions, full relevant producer qualification, and separate full UO qualification before consumer acceptance.
A profile name alone does not prove criterion coverage.

### Required human approvals:

Acceptance of this exact draft; exact future configuration changes in section 9; any new dependency or JavaScript adaptation; and separately authorized commits, package publication and website deployment.
No permission is inferred from the earlier full-publication implementation or the companion plan.

### Maximum sensible autonomy:

Current authority covers inspection and these plans.
After implementation approval, proceed within the accepted slices and stop for changed semantic scope, configuration not specifically approved, an unresolved ownership conflict or an unproven release prerequisite.

### Next lifecycle step:

Owner review of both drafts, followed by exact baseline acceptance and HISEW implementation admission in each available worktree.
No new execution is started by this planning task.

## 3. Research and selected reuse

Research question: can existing supported facilities provide readable, graph-preserving OWL RDF/XML in Node and browsers without introducing a second serialization authority?
Sources and release metadata were checked on 8 October 2026.

| Candidate                                   | Evidence and fit                                                                                                                                                                                                                                                                                                                                                                                 | Decision                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing OwlAPI writer and XML dependencies | `internal/storage/rdfxml/rdfXmlGraphWriter.js` already uses `@xmldom/xmldom`, URI/QName validation and RDF/JS terms; the storer checks structural round trips. Installed xmldom 0.9.12 and `rdfxml-streaming-parser` 3.3.0 matched their registry latest versions when checked.                                                                                                                  | Extend the existing writer and reuse its escaping, validity checks, parser and graph-isomorphism utilities. The residual work is a graph-aware presentation policy, not a new XML parser or OWL mapper.                                                                                                                                                                                    |
| Java OWLAPI renderer                        | [4.5.29 RDFXMLRenderer](https://github.com/owlcs/owlapi/blob/owlapi-parent-4.5.29/parsers/src/main/java/org/semanticweb/owlapi/rdf/rdfxml/renderer/RDFXMLRenderer.java) and the pinned Java 5 oracle demonstrate typed OWL rendering. [Maven metadata](https://repo.maven.apache.org/maven2/net/sourceforge/owlapi/owlapi-distribution/maven-metadata.xml) reported 5.5.1 as the latest release. | Use public contracts/specifications and development-only black-box observations. Do not copy or transliterate Java implementation, bundle it, or add a JVM to UO production.                                                                                                                                                                                                               |
| `@graphy/content.xml.scribe` 4.3.7          | [Supported RDF/JS writer API](https://graphy.link/content.textual.html), npm registry metadata and [writer source](https://github.com/blake-regalia/graphy.js/blob/master/src/content/xml/scribe/main.js.jmacs) inspected. The source emits `rdf:Description` subjects and supports prefixes; the ISC license was inspected.                                                                     | Its observed subject rendering leaves the central requirement unmet. Replacing the existing writer would still require a separate typed/grouped rendering layer. No adoption proposed. Source inspection of the moving branch is not exact-release qualification.                                                                                                                          |
| `rdflib` for JavaScript 2.4.1               | [Primary project](https://github.com/linkeddata/rdflib.js) and [versioned serializer](https://github.com/linkeddata/rdflib.js/blob/v2.4.1/src/serializer.js) support typed XML and nesting. The inspected XML path uses a fixed four-space layout; npm lists additional RDF, JSON-LD and fetch dependencies.                                                                                     | A credible alternative, not claimed incapable. Its store conversion, type-choice policy and lack of the required shared OWL presentation/configuration seam still need custom integration and losslessness qualification. Extending the already integrated writer has the smaller semantic and dependency boundary. No new license clearance or adoption is claimed from its MIT metadata. |
| Python RDFLib pretty XML                    | [Primary serializer documentation](https://rdflib.readthedocs.io/en/stable/apidocs/rdflib.plugins.serializers.rdfxml/) includes list-cell property loss behavior. It also introduces a different runtime boundary.                                                                                                                                                                               | Do not use it as a UO postprocessor. A visually improved document is insufficient if its RDF graph changes. No Python package is selected or installed.                                                                                                                                                                                                                                    |
| Generic XML pretty printer                  | Whitespace-only processing cannot choose RDF types or abbreviations; inserted whitespace can change literal values.                                                                                                                                                                                                                                                                              | Insufficient by itself. Reuse XML primitives within the graph-aware writer.                                                                                                                                                                                                                                                                                                                |

Production remains a clean implementation under OwlAPI's existing provenance policy.
No third-party source is copied and no new package is selected.
Retain existing dependency notices and validate their installed identities; any replacement component triggers fresh exact-version, license/terms and browser integration assessment before adoption.
The normative boundary is [RDF 1.1 XML Syntax](https://www.w3.org/TR/rdf-syntax-grammar/), especially typed nodes and collections, together with [OWL 2 mapping to RDF](https://www.w3.org/TR/owl2-mapping-to-rdf/).
This work does not silently expand to RDF 1.2.

Protégé's ordinary save uses its ontology format, calls the ontology/manager save API, and reaches OWLAPI's RDFXML storer/renderer.
Its [save implementation](https://github.com/protegeproject/protege/blob/5.6.9/protege-editor-owl/src/main/java/org/protege/editor/owl/model/io/OntologySaver.java) does not establish a separate ontology serialization language.
The footer identifies that Java implementation; a JavaScript save must not claim to have been generated by Java OWLAPI.

## 4. Requirements and acceptance criteria

| Requirement                                | Acceptance criterion and owner                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Readable default output            | AC-001: Producer fixtures and a generated UO reference-data closure show semantic prefixes, four-space indentation and typed nodes for safely representable explicit OWL types; no opt-in is required.                                  |
| REQ-002 Exact RDF preservation             | AC-002: Parsing the emitted document yields a dataset isomorphic to the exact input graph, including every unconsumed `rdf:type`, annotation, list-cell property and shared/cyclic blank node. Producer owns the oracle.                |
| REQ-003 Preserve OWL and storage contracts | AC-003: Existing strict structural round trips, format/target validation, unsupported-input failures and complete-output-before-target-replacement remain effective. A failure leaves the target unchanged.                             |
| REQ-004 Predictable presentation           | AC-004: Repeated saves of the same managed snapshot produce the same bytes despite unrelated parsing/saving; stable sorting has explicit tie rules. This does not promise canonical bytes across arbitrary blank-node relabelings.      |
| REQ-005 Safe expressions and collections   | AC-005: Eligible single-owner acyclic expression nodes are nested, and eligible pure RDF lists use collection syntax. Shared tails, cycles, extra list properties and unsafe abbreviations retain explicit identity and all triples.    |
| REQ-006 Preserve UO distribution behavior  | AC-006: Every dynamically discovered eligible dated root still produces the required RDF/XML, JSON-LD and CSV products, with strict offline closure equivalence and current receipts. Import-free roots still have no full counterpart. |
| REQ-007 Maintain API ownership             | AC-007: Existing public calls continue to work; no new public configuration is required, no UO renderer exists, and the package's Java compatibility inventory remains truthful.                                                        |
| REQ-008 Permit later configuration         | AC-008: One private rendering policy supplies the defaults. The companion plan can feed explicit options into that same path without replacing the serializer or changing omitted-option output.                                        |
| REQ-009 Bounded and safe rendering         | AC-009: Adversarial literal, QName, comment, cycle and depth fixtures terminate with exact output or a typed storage failure; Node/browser qualification and recorded resource measurements cover representative closures.              |

## 5. Invariants and architectural decisions

DEC-001: Preserve the current chain: managed OWL snapshot, OWL-to-RDF mapping, RDF/XML rendering, strict reparse/structural comparison, complete text, then target replacement.
Do not change mapping rules to make presentation easier.

DEC-002: A typed node element may consume exactly one existing `rdf:type` triple when its type IRI is a legal RDF/XML node QName.
Keep every other type statement explicit, including punning and multiple classifications.
Specify a deterministic OWL vocabulary priority and tie rule in tests; never invent a type from the surrounding section or an IRI's spelling.

DEC-003: Prefer established `rdf`, `rdfs`, `owl`, `xsd` and `xml` meanings and sensible namespace/local-name splits; generate stable collision-free names for other namespaces.
For example, preserve the recognizable `rdfs:label` spelling instead of selecting an artificial namespace ending in `#labe` with local name `l`.
Reserve XML/RDF names and validate Unicode QNames.
Do not require retention of every authored prefix: a merged ontology does not necessarily retain the source documents' prefix maps.
Use absolute resource IRIs unless a separately proven base-IRI rule is accepted.

DEC-004: Indent XML structure without adding, removing or normalizing literal text.
Preserve leading/trailing whitespace, CR and CRLF distinctions, datatype/language values and XML literal lexical content.
Do not run a text-based pretty printer over the completed document.

DEC-005: Group ontology metadata and entity categories predictably, then sort by stable semantic keys.
Define ownership for multiply typed/punned subjects so grouping does not duplicate or omit statements.
Use stable section/entity comments with IRI-based banners by default, anticipating the later Java configuration defaults.
Sanitize forbidden XML comment sequences and trailing hyphens without changing the RDF literal used to derive a label.
No Java footer, timestamps or environment-dependent text; a generator comment, if used, must be truthful and have an explicit stability rule.

DEC-006: Nest only when a complete graph index proves that blank-node identity will survive.
Use bounded traversal and explicit node IDs for shared or cyclic nodes.
Use `rdf:parseType="Collection"` only when its expansion produces exactly the existing list subgraph, with safe member forms and no lost cell identity, extra properties or explicit cell types.
Literal members or unusual list structures require the corresponding proven representation, otherwise explicit list triples.
Choosing an unabbreviated RDF/XML representation for such a graph is normal syntax selection, not a compatibility shim.

DEC-007: Keep a private, immutable rendering-policy value in the canonical RDF/XML storage implementation.
Its initial settings are indentation enabled, size four, banners enabled, labels-as-banners disabled.
Do not expose a profile enum, a `pretty` format parameter, process-global preferences or a second legacy renderer.
The companion plan replaces only the source of those settings with the manager's captured public configuration.

DEC-008: Producer release acceptance is independent of UO adoption.
Use project-owned producer fixtures and the installed-package contract for release evidence; the actual UO pipeline remains separately owned consumer evidence.
OwlAPI's `test:universal-ontology` Java comparison of pinned ontology variants is useful but does not substitute for running UO's current materialization pipeline.

Predicted implementation seams, to confirm after baseline acceptance:

| Repository | Likely files/modules                                                                                                     | Intended responsibility                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| OwlAPI     | `internal/storage/rdfxml/rdfXmlGraphWriter.js` and its tests                                                             | Subject/type selection, namespace planning, graph-aware whitespace, order, nesting and collection policy. Keep cohesive helpers private. |
| OwlAPI     | `internal/storage/rdfxml/rdfXmlStorer.js` and its tests                                                                  | Pass the private default policy and preserve existing structural validation/error handling.                                              |
| OwlAPI     | `internal/storage/storerRegistry.test.js`, `model/owlOntologyManager.storage.test.js`                                    | Atomic target behavior, snapshot isolation and unchanged public calls.                                                                   |
| OwlAPI     | `util/rdf-dataset-isomorphism.mjs`, Java reference harness/fixtures, package/browser tests                               | Reuse independent proof boundaries; do not create a competing canonicalizer.                                                             |
| OwlAPI     | Compatibility capability metadata, generated API views and release notes as applicable                                   | Record observable formatting changes without claiming newly exported Java APIs. Use owning generators.                                   |
| UO         | `package.json`, `package-lock.json`                                                                                      | Adopt the approved published producer version, following the existing alias/range convention.                                            |
| UO         | `tests/import-closure`, `tests/build/full-ontology-assets.test.js`, `tests/build/website-build.integration.test.js`      | Assert readability plus existing closure, atomicity, derived-format and receipt behavior.                                                |
| UO         | `scripts/materializeImportClosure.js`, `scripts/ontology/atomicOntologyWriter.js`, `scripts/build/fullOntologyAssets.js` | Expected to retain their public save path and verification chain; change only if an identified acceptance gap requires it.               |

## 6. Quality scenarios and test ownership

| Scenario                      | Stimulus and required response                                                                                                                                        | Evidence                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-001 Semantic preservation  | Save a graph with multiple types, punning, annotations, restrictions, collections, shared nodes and cycles. All triples and OWL structures survive.                   | Independent RDF parser plus existing graph-isomorphism comparator; pinned Java structural comparison for supported OWL cases.                                                                          |
| QA-002 Literal and XML safety | Save Unicode, XML-sensitive characters, XML literals, embedded CR/CRLF, and banner text containing `--` or a trailing `-`. XML remains valid and RDF terms unchanged. | Parse actual emitted bytes; compare lexical forms and inspect comments separately.                                                                                                                     |
| QA-003 Determinism            | Repeat identical saves before and after unrelated loads/saves; vary graph insertion order where the writer contract admits it.                                        | Exact byte comparisons with documented scope and stable blank-node allocation.                                                                                                                         |
| QA-004 Atomic failure         | Force invalid QName/unrepresentable input, traversal/resource exhaustion or verification mismatch.                                                                    | Producer target and UO previous final file remain byte-identical; truthful typed failure retained.                                                                                                     |
| QA-005 Consumer completeness  | Rebuild all currently discovered eligible roots, including reference-data `20260912`, and run with import acquisition prohibited during final verification.           | Fresh exact-input receipt, no imports in final closures, same ontology ID/annotations/axiom union, JSON-LD graph equality and CSV projection equality.                                                 |
| QA-006 Resource behavior      | Render the largest current closure and synthetic deep/shared/list cases in supported Node and browsers.                                                               | Record wall time, peak memory, bytes and maximum safe depth against the current renderer; set justified finite budgets before accepting a new release gate. No invented performance improvement claim. |
| QA-007 Package boundary       | Consume the built/packed package through public exports in Node and browsers.                                                                                         | Installed contract and browser tests; no Java/Node-only dependency in the production browser graph.                                                                                                    |

Producer tests own serializer correctness.
UO tests own its generated output and should assert semantic readability properties rather than freeze every prefix suffix or Java whitespace byte.
Presentation snapshots may cover small reviewed fixtures, alongside graph and structural comparisons.
Replace obsolete assertions that mandate all-`rdf:Description` or shortened local names; retain their semantic coverage.
Mocks are limited to real external acquisition and deliberate private failure injection; a mocked serializer or self-generated expected graph is not independent evidence.

## 7. Vertical implementation slices

| Slice     | Observable increment and dependencies                                                                                                                                                                                         | Traceability                                                                                             | Falsifiable proof                                                                                                                                                        | Release and cleanup implication                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 | Characterize an end-to-end public save and UO closure using current bytes; close type priority, comment semantics and resource-budget decisions. Capture pinned Java black-box observations. No production behavior change.   | REQ-001/002/004/009; AC-001/002/004/009; QA-001/002/006; DEC-001/002/005                                 | Reviewed before/after target fixtures, exact oracle identities, baseline resource observations and accepted decision ledger. Record unavailable Java execution as a gap. | Establish an accepted implementation baseline; retain observations externally, not as invented passing receipts.                                     |
| SLICE-002 | Public save produces typed, indented XML with useful prefixes, stable grouping and banners, using the existing writer/storer. Depends on SLICE-001.                                                                           | REQ-001/002/003/004/007/008; AC-001/002/003/004/007/008; QA-001/002/003/004; DEC-001/002/003/004/005/007 | Graph-isomorphic and structurally equal round trips, readable class/restriction/property fixtures, unchanged format rejection and atomic targets.                        | Independently demonstrable producer increment. No consumer dependency change or release implied.                                                     |
| SLICE-003 | The same save path safely nests expressions and abbreviates eligible collections. Depends on SLICE-002.                                                                                                                       | REQ-002/005/009; AC-002/005/009; QA-001/002/004/006; DEC-006                                             | Shared-tail, annotated-cell, typed-cell, cyclic and literal-member adversarial fixtures prove that unsafe abbreviation never loses triples.                              | Keep only proven abbreviations. Remove experimental paths; preserve failed evidence and explicit representations for unsupported abbreviation cases. |
| SLICE-004 | Qualify and prepare one coherent OwlAPI candidate through public package boundaries. Depends on SLICE-002/003.                                                                                                                | REQ-003/004/007/008/009; AC-003/004/007/008/009; QA-003/006/007; DEC-007/008                             | Full relevant native producer checks, installed package, Java differentials, browser checks, registry generation consistency, independent frozen-candidate review.       | Separately approved immutable package publication; record exact version, tarball digest and integrity. UO cannot veto producer release.              |
| SLICE-005 | UO adopts that published version and rebuilds readable full distributions through its existing public save call. Depends on approved producer identity and exact config approval.                                             | REQ-001/002/003/006/007; AC-001/002/003/006/007; QA-004/005; DEC-001/008                                 | Focused import-closure/build checks followed by full UO qualification and current exact-input output verification. Compare all discovered outputs, not one sample.       | No hand-edited dist assets. Consumer merge/publication/deployment retain separate authorization and receipts.                                        |
| SLICE-006 | Record the stable internal defaults and hand off their contract to the configuration plan, with a small fixture proving omitted/default-option equivalence. Depends on SLICE-004; consumer evidence may arrive independently. | REQ-008; AC-008; QA-003; DEC-007/008                                                                     | Companion requirements reference the actual released default behavior; no second renderer or consumer adapter exists.                                                    | No further consumer migration is mandatory until explicit nondefault settings are wanted. Retire task-only scratch after evidence consumers finish.  |

Producer renderer work is semantically coupled and has one integration owner.
Fixture analysis and UO read-only baseline inspection may proceed independently; this is a dependency statement, not authorization to delegate.
Before implementing, refresh any overlap with OwlAPI's existing rc.2 parity programme and avoid two owners changing the same save/configuration seam.

## 8. Verification, release and recovery

Use repository-pinned toolchains and inspect lifecycle effects before running commands.
OwlAPI's targeted Jest storage suites, `npm run test:boundary`, `npm run test:owl-contract` and `npm run test:browser` are the relevant entry points; the selected HISEW full profile and existing release gates remain necessary for the integrated candidate.
Refresh exact command arguments from the current checkout; do not substitute a convenient subset for full relevant verification.
The Java oracle stays development-only and must use its recorded revision and actual dependency/classpath identity.
Protégé 4.5.29 appearance observations do not replace Java 5 compatibility evidence.

For UO, run the existing import-closure suite and affected build tests, then `npm run check:qualification`.
`npm run build:verify` generates from source without editing tracked inputs; `node scripts/verifyFullOntologyBuild.js --repository . --output dist` verifies current generated artifacts.
Keep policy qualification and publication prerequisites distinct from renderer tests.
The observed personal `focused` profile covers projection/query units, so it alone is insufficient for this change; `affected` and `full` also need criterion-level coverage accounting.

UO's producer-input identity includes the lockfile, installed OwlAPI identity and generation/verification inputs.
A dependency or output change requires a fresh build receipt; unchanged filenames, timestamps or old successful checks are insufficient.
Keep JSON-LD graph equality and CSV projection equality as their respective contracts; neither implies identical arbitrary blank-node labels or bytes.
Public paths and receipt schema need no proposed change.

Before rollout, the producer owner observes exact package checks and the UO owner observes regenerated artifacts, closure receipts and a readable sample from each ontology family.
Report output sizes, graph/axiom counts, validation failures and timing as evidence; no new telemetry service is required.
Success means both readability and semantic evidence hold for the actual candidate.

Abort for any lost or added RDF statement, changed literal, blank-node identity defect, weakened target atomicity, stale receipt, unsupported browser dependency or unaccepted resource regression.
Before publication, repair and requalify the affected candidate.
After immutable producer publication, preserve that version and issue a qualified corrective version if needed.
Before UO deployment, keep the last qualified publication intact.
After deployment, use the established, separately authorized coherent website restore/forward-fix process; rebuilding one file is not a rollback proof.

On interruption, retain source revision, candidate digest, failed observations and exact unfinished criteria.
Resume through the owning HISEW execution and refresh drifted inputs; never relabel an old receipt as current.
Remove only task-owned disposable scratch when no longer needed, and preserve required failure and review evidence.

## 9. Configuration proposals and approvals

These are predicted future changes, not approval requests to apply them now.
Present concrete values and the smallest exact diff when the release identity is known.

| File/setting                                            | Proposed effect                                                                                                                                                                      | Approval boundary                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| UO `package.json`, `devDependencies.owlapi`             | Raise the existing `npm:@hadden-industries/owlapi@>=...` lower bound to the first approved release containing the default renderer improvement. Retain the npm alias and range form. | Exact version and change require explicit approval; do not substitute a guessed rc.2 coordinate.                      |
| UO `package-lock.json`                                  | Resolve that approved range to the assessed package and integrity, preserving unrelated dependency intent.                                                                           | Review the actual lockfile diff and lifecycle/install effects before applying.                                        |
| OwlAPI package/release version fields and lock metadata | Identify the separately approved producer release under existing release policy.                                                                                                     | Existing rc.2 planning is not authority to publish this draft. Confirm programme integration and exact release edits. |
| Compatibility/capability registry sources, if changed   | Describe actual implemented presentation behavior; regenerate owned views.                                                                                                           | Treat changed contract/configuration sources as exact approval items; do not hand-edit generated views.               |

No new build, CI, formatting, test-runner, deployment or HISEW configuration is currently proposed.
If evidence shows one is necessary, stop that dependent action and identify the exact file, setting and pipeline effect before seeking approval.

## 10. Open decisions and replanning triggers

| Question                                                                                      | Cheapest discriminating evidence                                                                         | Owner and blocking scope                                                                                        |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| What typed-node priority and grouping best match supported OWL without hiding multiple types? | Small project-authored punned/multiply typed fixtures through the pinned Java oracle and current writer. | Producer owner accepts DEC-002/005 before SLICE-002.                                                            |
| Which lists and nested nodes can be abbreviated with exact graph preservation?                | Independent parser/isomorphism checks on shared, annotated, typed and cyclic list cells.                 | Producer implementer and verifier; blocks the affected SLICE-003 abbreviation only.                             |
| What resource budget is justified?                                                            | Current vs candidate measurements on dynamically selected real closures plus finite synthetic extremes.  | Producer owner; blocks accepting a new numeric gate, not baseline measurement.                                  |
| Which immutable package will UO consume?                                                      | Existing release programme decision and actual published package identity.                               | Producer release owner and UO owner; blocks SLICE-005 dependency edits.                                         |
| Are prefix aliases from authored sources required?                                            | Owner review of representative output from a merged ontology.                                            | Current draft chooses useful inferred prefixes; exact alias preservation requires a new format-metadata design. |

Replan if readability requires semantic normalization, Java source reuse, a second serializer, a runtime JVM, new public API in this plan, prefix-map mutation, changed receipt schema, consumer-dependent producer release gates, or an unapproved dependency/configuration change.
Reassess the higher outcome if added nesting makes large files harder to review or materially harms reliability: retain readable typed output while revising the affected abbreviation design, with owner acceptance of the changed scope.
