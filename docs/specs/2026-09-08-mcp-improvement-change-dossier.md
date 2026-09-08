# MCP improvement change dossier

**Status:** Main outcome and scope confirmed by Max in DEC-001. Detailed product
requirements, design, implementation slices and risk decisions remain draft.

**Decision owner:** Max. **Prepared:** 2026-09-08. **Draft revision:** 3.

**Originating task:** Transform `MCP modernization pass.md` into an artefact usable
within the repository's newly deployed SDLC, then establish the path to an
implementation plan. This task authorizes investigation and drafting.

**Confirmed main outcome and scope:** Improve the existing local MCP server.
Max selected this focus in the originating task on 2026-09-08 (SRC-007, DEC-001).
It follows the existing accepted product design. Publication preparation and a
hosted MCP runtime are outside this increment. The detailed changes and benefit
measures remain to be established through the decisions below.

## 1. What this artefact is for

The originating document is an advisory review: it mixes observations, favourable
assessments, preservation advice, possible defects, design options and future work.
Its recommendation order does not establish severity or implementation priority.
Retain it as source material, with the identity below. Promote only supported,
owner-accepted needs into requirements. A recommendation may close with evidence
that the behaviour already exists, or with a decision that no change is justified.

The [original advisory review](../reviews/mcp-modernization-pass.md) is retained
unchanged in the repository as SRC-001. Corrections, evidence and accepted decisions
belong in this dossier; retaining the source does not accept its recommendations.

This dossier is the evolving decision record and a proposed Issue body. Its
consumers are Max when accepting intent and trade-offs, an implementer working from
that accepted revision, and reviewers checking outcome and evidence. Separate
documents are needed only when a decision or handoff benefits from them.

Use the repository's [change form](../../.github/ISSUE_TEMPLATE/change.yml) if an
Issue is warranted. Its problem/outcome, behaviour, constraints, risk, decisions
and software-selection fields map to sections 3 through 8 here. The form permits
research to be pending at intake; it does not permit pending research to masquerade
as a completed selection before implementation.

The later [thin implementation plan](../../.sdlc/skills/thin-implementation-plan/SKILL.md)
derives from accepted needs and consequential design decisions. Its prohibition on
complete proposed code and microscopic step scripts applies. The generic
writing-plans format does not override the repository-owned procedure.

## 2. Sources, applicability and evidence limits

| ID | Source and use |
|---|---|
| SRC-001 | [Original MCP modernization advisory review](../reviews/mcp-modernization-pass.md), imported into the repository on 2026-09-08 at Max's request from `C:\Users\maksy\Downloads\MCP modernization pass.md`. The unmodified repository copy and Downloads original both contain 24,697 bytes and have SHA-256 `17758d4fead6614b37c17b28ca7c6828bba4333b34c87d7f9cb3d4ccf2bb2120`. The import date and filesystem modification time are not verified authorship/review dates. Section 5 records the recommendation dispositions. |
| SRC-002 | Repository `main` at `b3984ffbfe9b38cca7bd4570aeb3f5bc0fa6f20e`, initially clean, inspected on 2026-09-08. Relative source links below describe this revision, not an immutable future `main`. |
| SRC-003 | [Accepted local distribution design](2026-08-31-distributable-local-universal-ontology-mcp-server-design.md), including its 2026-09-01 development-publication amendment. Existing scope and ontology invariants are reused; this draft does not reapprove or supersede them. |
| SRC-004 | [SDLC guide](../sdlc/howto.md), [engineering principles](../sdlc/engineering-principles.md), [governance](../sdlc/github-governance.md), [review policy](../../REVIEW.md), [software selection](../sdlc/software-selection.md), [adoption record](../sdlc/adoption.md) and [package status](../../.sdlc/PACKAGE_STATUS.json), read on 2026-09-08. SDLC 1.0.0 is pre-release and deployed in the recorded repository scope. |
| SRC-005 | Official [SDK protocol-version documentation](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions), checked on 2026-09-08: the explicit modern pin is nested under `versionNegotiation.mode`; auto negotiation can fall back. This corroborates the installed client usage, not a release-wide compatibility qualification. |
| SRC-006 | Official [Registry publishing quickstart](https://modelcontextprotocol.io/registry/quickstart), checked on 2026-09-08, still illustrates the `2025-12-11` schema URI. A date mismatch with the MCP protocol is not evidence of an obsolete Registry schema. This is not an exhaustive schema-release search. |
| SRC-007 | Max's reply in the originating task on 2026-09-08 to "What should be the main outcome of this MCP work?": "Improve the existing local server (Recommended)". This is direct acceptance of the main outcome and scope in DEC-001; it does not select a refactor or accept the detailed draft requirements, measures or implementation slices. |
| EVD-001 | Four existing Jest suites passed on SRC-002: 39 tests, 4 suites, no snapshots, 11.881 seconds. Exact command and boundaries are in section 10. |

No full verification profile, native security scan, release qualification,
publication, named-host acceptance test, or maintenance-cost experiment was
performed for this dossier. Source inspection, fixture-based integration tests,
consumer schema validation and human acceptance are different kinds of evidence.

The [adoption record's MCP SDK section](../sdlc/adoption.md#mcp-sdk-embedded-fast-uri)
also constrains future SDK work: it records bundled `fast-uri` and the assessed
application boundary. Its upstream issue/advisory status was not refreshed here.
Recheck it at a relevant SDK/integration decision; this dossier neither reopens a
completed local repair nor declares the upstream condition resolved. The installed
SDK `LICENSE` was read: its Apache-2.0/MIT transition and documentation terms are
more specific than its package metadata's MIT label. A new adoption must inspect
the exact selected release and actual rights decision again.

## 3. Motivation and purpose anchor

The source proposes a "focused refactor around `serveStdio()`, package ownership,
protocol-era conformance tests, terminology cleanup". These are candidate means.
The accepted product use case remains: find the definition of `Person`, identify
the exact entity, preserve its authored lexical definition, distinguish assertions
from inference, and report immutable release provenance (SRC-003).

For the records below, Max is the accountable interpreter and acceptance owner.
Applicability is SRC-002 as checked on 2026-09-08; reassess before accepting an
implementation baseline. Confidence describes evidence strength, not probability.
Dependencies and contrary evidence remain explicit rather than being converted
into accepted business facts.

| ID / kind / status | Statement and source | Supporting and contrary evidence; confidence | Risk if wrong; dependencies or conflict |
|---|---|---|---|
| MOT-001 / concern / stakeholder statement | Max wants the proposed work to begin correctly within the SDLC, rather than carry premature solutions forward. Originating task. | Direct user instruction; high. It does not accept every recommendation in SRC-001. | Unnecessary or unauthorized implementation; constrains all later decisions. |
| MOT-002 / driver / hypothesis | MCP evolution may create avoidable local maintenance and compatibility work. SRC-001. | Local protocol-adjacent code exists; maintenance frequency/cost has not been measured. Low confidence in a material cost problem. | A refactor could cost more than it saves; depends on OUT-002 and DEC-003. |
| MOT-003 / assessment / observed fact | Some high-priority proposed work already exists. SRC-002, EVD-001. | Native stdio entry, both-era integration coverage and metadata validation are present and the selected suites pass. High within those test boundaries. | Rebuilding existing capability; does not settle complete cross-transport semantic coverage. |
| MOT-004 / goal / proposed detailed formulation | Preserve trustworthy ontology lookup while making only changes supported by a verified gap or an accepted maintenance benefit. Derived from SRC-003 and MOT-001/002, within Max's confirmed local-server focus (SRC-007). | Existing product purpose supports preservation and Max has confirmed the main outcome. Specific changes and benefit measures remain proposed. | Optimizing file layout or line count while worsening the product; governed by both outcomes below. |
| CON-001 / constraint / existing accepted decision | Installed transport is stdio; loopback HTTP is a development/compatibility facility. Retain the two tools, query semantic authority, and development-only software distribution. SRC-003. | Existing accepted design and its explicit amendment; high. SRC-007 confirms this increment's local-server focus. | Expanding into hosted operation/publication changes cost and authority and would require a new scope decision. |
| CON-002 / constraint / repository policy | Precise names, native reuse and consumer validation, no unauthorized shims, truthful evidence, exact configuration approval and separate Git/remote authority apply. SRC-004 and root AGENTS.md. | Current repository instructions; high. | A passing implementation could still violate policy; applies at every risk route. |

**Purpose anchor for the proposed increment:** Help ontology consumers obtain the
same exact, provenance-bearing answer through the supported local interfaces, and
help maintainers understand and change those interfaces with demonstrated benefit.
Preserve ontology semantics, existing deployment/security obligations and portable
MCP use. Balance compatibility and review burden against any reduction in locally
owned protocol code. The local-server focus is confirmed by SRC-007; detailed
benefit measures and selected changes remain draft. Inherited invariants already
have SRC-003 as their authority.

| Outcome | Beneficiaries, baseline and target | Measure, source and window | Causal hypothesis, trade-offs and accountability |
|---|---|---|---|
| OUT-001: Preserve correct ontology lookup across supported interfaces | Beneficiaries: ontology consumers and MCP host users. Potentially disadvantaged: users of an accidentally removed protocol era. Baseline: existing accepted Person use case; EVD-001 establishes partial transport evidence. Proposed target: every accepted matrix case returns the independently expected entity, definition and release provenance with no transport-dependent semantic difference. | REQ-001/002 and QA-001, using accepted ontology fixtures and real query execution. Compare before/after each relevant slice and at its review; named-host execution is separate evidence if required. | Better boundary evidence should reveal semantic or protocol regressions. Identical wrong outputs remain possible unless an independent expected result is checked. Max accepts the matrix and results before baseline acceptance and at final review. |
| OUT-002: Reduce justified maintenance burden | Beneficiaries: maintainers/reviewers. Potentially disadvantaged: website and distribution maintainers bearing migration work. Baseline and magnitude: unmeasured. Target is provisionally a directional reduction in change impact or duplicated responsibility, conditional on an agreed representative maintenance operation. | Before selecting a structural change, record that operation, affected production modules/build inputs, independently required obligations and actual investigation/change effort. Compare the same operation on the current and proposed structure; record one observation honestly, not statistical proof. Review at DEC-003 and after any accepted structural slice. | Clearer ownership or supported native replacement may reduce future work. Moving files, fewer lines, test count and package count alone do not establish this outcome. Migration effort, new coupling and build/provenance cost are confounders. Max selects the measure and trade-off; do not promise a percentage saving. |

**Do nothing:** Retain the implementation and existing controls, correct the review
record, and undertake no product refactor. It avoids migration/review cost. The
remaining cost is unresolved confidence in complete cross-transport parity and
possible maintenance friction; no outage or measured maintenance penalty has been
established. This remains a valid decision for each candidate independently.

## 4. Risk route and authority

### Risk class:

R0 for this investigation and documentation-only draft: no executable, configuration,
public contract or persistent-data change. The originating task supplies its intent.
**Provisional R2 for the combined proposed implementation** if it changes HTTP
admission/parsing, transport contracts, lifecycle/concurrency or distribution
contracts. That follows the local router's explicit triggers, not document length.
Isolated explanatory edits may be R0; bounded preservation tests or internal work
with understood unchanged contracts may be R1. Route each independently accepted
increment on its real impact, without splitting work to evade an R2 boundary.

### Decision owner:

Max, as repository/product owner. The main outcome and scope are confirmed in
DEC-001. Detailed priorities, thresholds and the implementation route remain draft.

### Reasoning:

SRC-002 shows protocol and deployment boundaries implicated by the suggestions;
SRC-003 makes stdio an installed-consumer contract. Weakening rejection before
parsing, breaking an installed entry or changing cancellation could affect users.
These are credible conditional failure modes, not discovered defects.

### Potential blast radius:

Local MCP users, loopback HTTP clients, the shared ontology query module, website
consumers of that module, and package/bundle/release consumers if ownership moves.
No accepted task here affects hosted tenants or production cloud infrastructure.

### Reversibility:

The draft is easily reversible. Product rollback needs evidence for the selected
files, packaged artifact and consumer contracts. Do not assume source-file reversal
can undo a published contract or cache/schema migration. No migration is currently
proposed or justified.

### Principal unknowns:

Concrete improvement targets within the confirmed local-server scope; supported
host/era matrix; native SDK coverage
of wrapper obligations; measurable packaging/ownership friction; actual impact of
any selected dependency or schema change. Sections 5 and 8 identify cheap evidence.

### Required artifacts:

This draft and its evidence for discovery. R0/R1 implementation may use an accepted
task/ordinary PR brief. R2 implementation requires an actually accepted Issue
revision captured and merged as a protected prior baseline. A thin plan is justified
only for remaining material design/coordination. Reuse SRC-003 without fabricating
a historical baseline under the new method.

### Required specialist lenses:

Ordinary review for R1. For R2, independent verification plus test-oracle scrutiny
where the new evidence is consequential. Add maintainability review if architecture
changes; operability/security coverage if admission, dependencies or lifecycle
change. A native Codex Security workflow owns any authorized security scan. This
draft triggers no agent fan-out or live scan.

### Required verification:

For the current R0 draft: source/claim/traceability review, diff/cleanup inspection
and the configured focused profile. EVD-001 informs discovery only. Future R1 uses
affected checks; R2 uses the configured full profile plus relevant independent
product and consumer evidence. Passing the profile does not accept the semantics.

### Required human approvals:

Accept the remaining detailed criteria and material risk/design decisions. Reuse existing
approvals only within their recorded scope. Any actual configuration edit requires
Max's approval for the exact file and setting under root AGENTS.md, after presenting
the smallest concrete proposal and pipeline impact. Commit, push, GitHub writes,
installation/trust, live scan, publication and deployment retain their distinct
authority. A generic plan acceptance grants no new shim exception.

### Maximum sensible autonomy:

Inspect, run existing bounded checks and prepare this local draft under the current
request. Do not mark it accepted or start the candidate product changes. Later work
uses the authority and ceilings of its accepted route and exact decisions.

### Next lifecycle step:

Use DEC-001's confirmed local-server focus to refine the proposed purpose and claim
dispositions; resolve DEC-002 and complete only the discriminating investigations
needed to select changes. Then accept requirements and consequential options before
constructing the implementation plan.

## 5. Disposition of every source recommendation

These CLM IDs retain traceability to SRC-001, not approval. Max owns disposition
acceptance. All observations apply to SRC-002 on 2026-09-08. Confidence is high for
direct source/test observations, bounded for absence/coverage assessments, and low
for unmeasured improvement claims. Principal contrary evidence and consequences
appear in each row; decision dependencies refer to section 8.

| Claim / original location | Current evidence and epistemic status | Proposed disposition and consequence |
|---|---|---|
| CLM-001 / section 1: make `serveStdio()` canonical | Observed: [runner](../../src/mcp/runUniversalOntologyMcpStdioServer.js) imports it, injects that native default, and calls it with `legacy: "serve"`. [Real-process tests](../../tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js) pass in EVD-001. | Already implemented in the inspected path. Preserve and document the actual boundary if needed; no entry-point replacement task. Packaged-release/host acceptance is a separate question. REQ-001/002. |
| CLM-002 / section 2: clarify bare `v1` | Observed: ambiguous tool-catalog comments in [server](../../src/mcp/createUniversalOntologyMcpServer.js), [schemas](../../src/mcp/universalOntologyToolSchemas.js) and [metadata](../../src/mcp/universalOntologyMcpMetadata.js). No measured user confusion. | Bounded terminology candidate under NAM-01. Establish the referent before changing it; do not invent a new tool-contract version constant or rename real query/cache format versions. REQ-004. |
| CLM-003 / section 3: retain native HTTP handler | Observed: [HTTP adapter](../../src/mcp/createUniversalOntologyMcpHttpHandler.js) already delegates to `createMcpHandler`. | Preservation constraint; proposed architectural replacement lacks need. REQ-003. |
| CLM-004 / section 4: delete redundant HTTP machinery | Observed: local representation checks, bounded buffering and rejection construction. The comment asserts a pinned SDK limit gap; this pass did not establish which checks can safely be removed. | Research candidate, not deletion requirement. Compare current supported native configuration/composition/extension against each accepted obligation. Removing rejection too early could weaken admission. DEC-004, QA-002. |
| CLM-005 / section 5: keep hardening/add architecture rule | Observed: [loopback runner](../../scripts/runLocalOntologyMcpServer.js) uses official Host/Origin validators and local admission controls; relevant tests pass in EVD-001. No comprehensive security verdict. | Preserve accepted boundaries. Existing policy already requires appropriate native reuse; a new policy rule is not automatically necessary and would require exact configuration approval. REQ-003. |
| CLM-006 / section 6: strengthen layers | Existing server/query/transport seams are visible in SRC-002. Need for new layers is a hypothesis. | Diagnose a concrete responsibility leak or costly change first. A diagram is not acceptance evidence; avoid adding abstractions solely to match it. DEC-003. |
| CLM-007 / section 7: move source into the workspace package | Observed: source lives under `src/mcp` and shared `src/ontologyQuery`; [package manifest](../../packages/universal-ontology-mcp-server/package.json) distributes a bundle built by [root build code](../../scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js). This does not itself prove defective ownership. | Compare retain/document boundary, narrow relocation, and separate query-package options only after measuring friction. No two-package requirement. Check all website/query/build/distribution consumers. DEC-003, QA-003. |
| CLM-008 / section 8: retain two tools, avoid gratuitous resources/prompts/UI | SRC-003 already selects `search_entities` and `resolve_entity`; EVD-001 checks the stdio catalog and empty resources/prompts. | Existing constraint, not a new feature task. Additional surfaces require a separate consumer need. REQ-001. |
| CLM-009 / section 9: keep structured/text results and application validation | Observed in [server](../../src/mcp/createUniversalOntologyMcpServer.js) and [renderer](../../src/mcp/renderOntologyToolResultAsText.js). Full failure-arm qualification was not rerun here. | Preservation requirement. Keep application validation distinct from SDK wire validation; independent expected semantics still required. REQ-001/002. |
| CLM-010 / section 10: keep annotations | Observed tool annotations in SRC-002; bounded release lookup is the accepted operation. | Preserve accurate annotations. `openWorldHint: false` describes operational access, not a change to OWL semantics. REQ-001/004. |
| CLM-011 / section 11: add era conformance tests | Both-era tests exist. HTTP compares structured results using a query stub; stdio tests execute the real query path. Modern HTTP uses auto negotiation; the stdio test pins the modern revision. EVD-001 passes. | Investigate the narrower missing proof: an explicit era-verified four-way real-query matrix against one independent semantic oracle. Do not call that complete MCP conformance or recreate existing tests wholesale. REQ-002, DEC-002. |
| CLM-012 / section 12: eventually reject legacy HTTP | Future-hosting option in SRC-001; current accepted local compatibility remains. | Deferred. Dropping support requires an accepted consumer/host matrix and product decision, not SDK age. Preserving supported native legacy operation is not introducing a repository shim. DEC-001/002. |
| CLM-013 / section 13: update Registry schema/unify metadata | [Metadata test](../../tests/distribution/mcp-registry-server-metadata.test.js) already validates the vendored official schema and cross-artifact identity/version relationships; it passes in EVD-001. SRC-006 still uses the same schema URI. Runtime identity reads root package version. | Preserve existing validation; establish an uncovered drift case before adding a generator. Refresh consumer schema/release evidence before actual publication. Automatic age-based schema upgrade is unjustified. REQ-006, DEC-005. |
| CLM-014 / section 14: keep exact pins | Root package/lock already pin MCP and Zod dependencies; exact pins describe reproducibility, not ongoing freshness. | Preservation practice. Any new adoption/update refreshes latest stable/applicable LTS and exact rights under SRC-004; do not freeze third-party versions indefinitely. DEC-004/005 where affected. |
| CLM-015 / section 15: use `zod/v4` | Current imports use `zod`; no integration failure or semantic ambiguity requiring another import entry was reproduced. | Optional convention/compatibility investigation. Consumer-supported entry points and real benefit determine need; skip an isolated churn task without that evidence. REQ-004 or DEC-004 if adopted. |
| CLM-016 / section 16: retain application failure model | Observed safe structured failure handling in SRC-002. No new failure model is requested by SRC-003. | Preserve protocol-failure versus tool-operation-failure semantics. REQ-001/002. |
| CLM-017 / section 17: avoid OpenAI-specific Apps features | Portable MCP is the accepted product boundary; no host-specific UI need is supplied. | Non-goal for this increment. Reassess only for a concrete separately accepted use case. |
| CLM-018 / priority table: optional protocol logging | Operational logging exists; no missing diagnostic case or data-retention requirement is supplied. The detailed source sections do not establish this need. | Deferred pending a support use case, native API fit and privacy/volume criteria. Preserve stderr/protocol separation and redaction. DEC-006, QA-002. |
| CLM-019 / overall scores and urgency | Favourable grades and P0/P1 ordering are author assessments without a stated rubric, measured impact or reproduced failure. | Keep as source opinions. Do not import them as security findings, acceptance, severity or backlog priority. Prioritize verified gaps and accepted outcomes. |

## 6. Proposed requirements and acceptance evidence

These REQ/AC statements are drafts for Max's acceptance; the cited existing
invariants remain authoritative through SRC-003. Each requirement exists only for
the selected scope. In particular REQ-005 does not require a package move and
REQ-006 does not require metadata generation.

| Requirement and outcome/constraint link | Acceptance criterion and independent evidence |
|---|---|
| REQ-001: Preserve the portable ontology lookup contract. OUT-001, CON-001. | AC-001: On an independently inspected immutable fixture, search `Person`, resolve the exact typed identifier returned, and check entity identity, authored definition lexical value/language/datatype and release/source provenance against recorded expected facts. Retain asserted/inferred distinction, text/structured consistency, accurate annotations and safe failure semantics. Do not compute expected values with the queried implementation. |
| REQ-002: Make supported transport/era claims falsifiable. OUT-001, CLM-011. | AC-002: For the matrix accepted in DEC-002, verify the actual negotiated era/revision, run the same real query fixture and compare each result to AC-001 and the other application-level results. Proposed core matrix: modern/legacy stdio and modern/legacy loopback HTTP. Include search-to-exact-resolution, absent entity and representative application/protocol failures. Preserve affected cancellation/shutdown regressions. Protocol envelopes may legitimately differ. Mere equality, client construction or a green stub test is insufficient. |
| REQ-003: Retain accepted admission/privacy obligations while assigning protocol responsibilities to supported native capabilities wherever they satisfy them. OUT-001/002, CON-002. | AC-003: For each selected wrapper change, record the obligation, its contract owner, current/native observed behaviour and residual gap. Rejection and cancellation tests cover supported and malformed requests, hostile Host/Origin, excess streamed/declared bodies and relevant overload/shutdown paths. Retain the current 131,072-byte bound and eight-active-request ceiling unless separately accepted. Check prohibited query/definition/identifier/path logging and protocol-only stdio service output. A removed wrapper check passes only with evidence that its obligation is still met. |
| REQ-004: Use precise names for protocol, SDK, application contract and artifact-format concepts. CON-002, OUT-002. | AC-004: Review affected comments, names and consumers against the actual referents. A reader can distinguish SDK major 2, protocol revision `2026-07-28`, any real tool-contract version and query/cache format version 1. No wire name or genuine version changes merely to remove the string `v1`; no alias or invented version is added to avoid deciding meaning. |
| REQ-005: Justify any source/package ownership change through a concrete maintenance benefit and preserved consumer behaviour. OUT-002. | AC-005: Before selecting relocation, DEC-003 records a representative maintenance operation, current change-impact baseline and accepted comparison criterion. Demonstrate that criterion on the proposal, while actual package/bundle and website/query consumers pass their independent checks and notice/provenance obligations remain accurate. If no benefit is demonstrated, retain the current structure. |
| REQ-006: Preserve and, only where a gap is demonstrated, strengthen release identity/provenance consistency. CON-001/002, OUT-001/002. | AC-006: Selected artifacts validate using the applicable consumer-owned schema/native tool and agree on the accepted identity/version relationships. A proposed improvement must detect a specific previously uncovered inconsistency, with sensitivity evidence. Existing green metadata validation is reused. Local validity does not establish registry acceptance, public artifact existence, signing authority or publication readiness. |

Traceability: MOT-001/003 -> MOT-004 -> OUT-001 -> REQ-001/002/003/006;
MOT-002 -> MOT-004 -> OUT-002 -> REQ-003/004/005/006. CON-001/002 constrain all
selected requirements. CLM-012/017/018 have no accepted new outcome and therefore
do not acquire implementation tasks. Unmeasured OUT-002 and the unsupported
priorities in CLM-019 remain explicit rather than orphan requirements.

## 7. Quality scenarios for consequential decisions

Owner for all proposed scenarios: Max. These are proposed acceptance constraints,
not new production SLOs. Set any additional cost/latency/availability target only
from a real workload and owner decision; this draft invents none.

| Scenario / links / priority | Source, stimulus, artifact and environment | Required response and measure | Verification and production signal | Rationale, uncertainty and risk |
|---|---|---|---|---|
| QA-001 / REQ-001/002, AC-001/002, DEC-002 / high, preservation constraint | An official client negotiates an accepted era and searches/resolves the same entity against the same immutable release through each selected local transport. Normal operation and representative safe failures. | Actual era matches the intended case; all application results match independent authored facts and provenance, and corresponding semantic fields agree across the matrix. No silent fallback in a modern-pinned case. | Real query module plus official clients; exact fixture identity and expected facts. Post-release signal: attributable host compatibility/failure reports and a scoped acceptance exercise if needed, not logging ontology queries. | Existing tests cover parts of this; HTTP stub equality cannot prove ontology correctness. A misleading matrix could hide a shared semantic defect. |
| QA-002 / REQ-003, AC-003, DEC-004/006 / high, existing safety constraints | A local/browser-origin caller sends invalid representation metadata, malicious Host/Origin or an oversized stream; clients overload/cancel while shutdown occurs. HTTP runner/adapter and stdio lifecycle in adverse conditions. | Preserve accepted rejection before unnecessary work, 131,072-byte body bound, eight active HTTP requests, bounded shutdown/cancellation and redacted diagnostic output. Use the existing accepted policy for route/rate/time constants; any change needs its own decision. | Consumer/native checks plus real Node socket/process tests for adapter-dependent behaviour. A fetch-only test cannot establish Host/socket/keepalive behaviour. Production signals remain existing safe event/error codes, never payload text. | EVD-001 is focused evidence, not a comprehensive security assessment. Unsafe deletion or new diagnostic content could weaken the existing boundary. |
| QA-003 / REQ-005/006, AC-005/006, DEC-003/005 / conditional, optimization within hard consumer constraints | A maintainer performs the accepted representative MCP change; build/distribution and website consumers use the resulting code/artifact. Current versus proposed ownership arrangement. | Meet the maintenance comparison criterion accepted before restructuring and preserve all supported consumer contracts/identity/provenance. No unapproved query/cache format migration. | Record actual dependency/build input impact and effort; execute consumer package/bundle and shared-query/website checks as selected. Post-release signal: subsequent real maintenance effort and packaging regressions, reviewed without claiming a causal study. | No cost baseline exists yet. A cleaner directory tree may increase build, migration or review cost; withhold structural design selection until evidence discriminates. |

Conflicts requiring Max's decision: stronger compatibility evidence versus test
maintenance cost (QA-001); smaller wrappers versus complete early admission and
diagnostic safety (QA-002); packaging separation versus shared-consumer and release
complexity (QA-003). Design implications are conditional: a common fixture may
serve QA-001, a native replacement may serve QA-002, and several ownership layouts
may serve QA-003. None of those implications is a selected architecture.

## 8. Open decisions and discriminating investigations

DEC-001 is **accepted** by Max through SRC-007. DEC-002 through DEC-006 remain
**open**, owner Max. The agent may collect evidence and propose a disposition;
a generated decision label cannot accept it.

| ID | Decision and alternatives | Cheapest useful evidence / exit condition |
|---|---|---|
| DEC-001 — accepted | Improve the existing local server. Publication preparation and a hosted MCP product are outside this increment. | Max's direct reply on 2026-09-08 (SRC-007) resolves this choice. Apply SRC-003's existing local product boundary. Reopen only if Max changes the scope; detailed requirements, measures and design decisions still need their own evidence and acceptance. |
| DEC-002 | Select the supported protocol/host evidence matrix and remaining confidence gap. | Map existing tests to concrete assertions; distinguish real ontology, stubbed domain, in-process HTTP, real sockets, source stdio and packaged executable/host boundaries. Verify SDK era reporting and select independent fixtures. Max accepts any additional host/version obligation. |
| DEC-003 | Retain/document current ownership, make a targeted coherent relocation, or establish an independently justified query package. | Identify one actual cross-boundary maintenance problem and representative operation; inspect imports, build input maps, tests and affected consumers. Compare change cost and lifecycle effects, including no change. If no meaningful problem/benefit remains, close the package recommendation without implementation. |
| DEC-004 | Retain justified HTTP controls, replace selected controls with supported native configuration/composition/extension, or select a current upstream update. | For each accepted obligation, inspect exact supported API/source/tests and perform a bounded before/after experiment where authorized. Refresh previous selection research, current stable/applicable LTS, exact license/notices and the recorded embedded-dependency boundary. Record technical fit, rights, integration and residual custom gap separately. No speculative deletion, SDK fork, validator injection or compatibility shim. |
| DEC-005 | Keep existing metadata validation, extend a demonstrated missing invariant, or generate only artifacts whose manual maintenance causes an established problem. | Identify an inconsistency not already detected; verify actual consumer schema/release and all version owners. Compare native tooling and existing checks before designing a generator. Present exact manifest/lock/workflow changes and pipeline effects separately for approval if needed. |
| DEC-006 | Keep present diagnostics or add a specifically needed native protocol diagnostic. | Supply a real troubleshooting case not explained by existing safe events; inspect native API and negotiated capability behaviour; define permitted fields, volume, opt-in behaviour and owner. With no use case, defer without adding a feature. |

Research status: this dossier contains repository characterization and two bounded
official-document checks. It is **not** completed REU-01 software-selection research
for new functionality or material reimplementation. Before consequential selection,
compare existing repository/standard/platform/dependency capabilities and credible
maintained alternatives requirement by requirement; consider supported configuration,
composition and extension. Record current exact releases and rights, then justify
only a residual custom gap. A missing prototype/tool is an integration gap, not a
reason to choose an older release or invent a replacement. No dependency is newly
selected, installed, or granted rights clearance by this dossier.

## 9. Plan to reach an accepted implementation plan

This is the plan for completing discovery and acceptance. Its checkpoints are not
permission to execute the product recommendations.

1. **Refine motivation within the confirmed scope.** DEC-001 is resolved: improve
   the existing local server. Refine the detailed formulation in MOT-004 and the
   proposed measures in OUT-001/002 for acceptance, preserving SRC-003's applicable
   decisions. Result: a concise purpose anchor with accepted beneficiaries,
   criteria, constraints, non-goals and trade-offs. Do not ask Max to select the
   same main outcome again.
2. **Finish the claim and evidence assessment.** Use section 5 to close already-met
   suggestions and distinguish confirmed gaps from optional changes. Resolve
   DEC-002 and collect only the baseline/experiments that discriminate DEC-003/004/005.
   Existing green tests remain truthful preservation evidence; do not manufacture
   RED by breaking correct code.
3. **Accept requirements and quality criteria.** Revise sections 6/7 to only the
   selected outcomes. Record real fixtures, supported consumers and accountable
   thresholds. An unanswered maintenance-value question prevents selecting that
   restructuring; it need not block an independent evidence or naming improvement.
4. **Research and select consequential options.** Complete/refresh the applicable
   REU-01/VER-01/LIC-01 record and resolve relevant DEC entries. The design explains
   chosen native capabilities, local residual responsibilities and trade-offs. Ask
   for exact configuration changes only once a concrete smallest proposal exists;
   no configuration file is changed merely to make this draft fit the process.
5. **Produce the thin plan where material design/coordination warrants it.** Expand only accepted candidate
   slices from the table below. Record predicted modules/seams, dependencies and
   integration owner; focused/affected/full proof; oracle and mock boundaries;
   data/schema compatibility; diagnostics; rollout/abort/recovery and observer;
   cleanup/retention; and replanning triggers. No complete implementation code or
   predicted line numbers. R0/R1 need no separate plan if the accepted brief already
   supplies adequate scope and evidence.
6. **Finalize routing and acceptance artefact.** R0/R1 can proceed from the accepted
   task/PR brief. If R2 remains, prepare the normative Issue content with stable
   REQ/AC/QA/DEC IDs and bind the selected plan/decisions to an exact revision.
   After authorized GitHub creation/update and actual owner acceptance, use the
   repository snapshot command with the real Issue number, acceptance reference,
   actor and time. Inspect/validate the captured exact body, and merge the protected
   baseline before product implementation. Never invent an Issue number, acceptance
   timestamp, accepted label or baseline.
7. **Implement and verify accepted slices.** Use only the repository-adapted
   [TDD skill](../../.sdlc/skills/test-driven-development/SKILL.md): test-first for
   changed behaviour, meaningful preservation/characterization for existing
   behaviour, and the declared alternative route for prose. Run required route
   profiles and independent review against a frozen target. Observe the higher
   ontology outcome as well as consumer validation. Release readiness/publication
   is a later gate only if it is actually in accepted scope.

Drafting a plan does not need a fabricated accepted baseline, but R2 implementation
does need the genuinely accepted final content
captured and merged beforehand. A snapshot hashes the Issue body; a link to mutable
text does not freeze that text. Put normative criteria/decisions in the body or
bind linked artefacts to exact accepted revisions and verify them at review.
Subsequent material Issue edits require the repository's changed/reacceptance path
and a new baseline version, not an overwrite of accepted history.

### Conditional implementation slices to resolve after acceptance

These are planning candidates and proof boundaries, not a committed backlog or
selected architecture. File locations describe likely affected existing modules;
no new package structure is prescribed. Max assigns integration ownership with the
accepted plan; no parallel write work is assumed.

| Candidate | REQ / AC / QA / DEC links | Predicted boundary and falsifiable proof | Release, recovery and cleanup implications |
|---|---|---|---|
| SLICE-001: Complete one real ontology query path across the accepted protocol matrix | REQ-001/002; AC-001/002; QA-001; DEC-002 | Existing `tests/mcp`, independent ontology fixtures and real query/server factories. Verify actual era and expected Person search-to-exact-resolution; retain relevant safe failure/lifecycle cases. Add only missing proof. | Test-only if current behaviour already satisfies the accepted contract; no invented transport change. Retain meaningful fixtures/evidence. A discovered product defect is routed before repair. |
| SLICE-002: Clarify the affected MCP contract terminology | REQ-004; AC-004; CON-002 | Affected `src/mcp` comments/identifiers and the relevant MCP documentation. Human semantic review establishes what each version denotes; execute affected consumer checks only if executable names/imports change. | Independently reviewable maintenance. Preserve genuine query/cache/public versions. No global replacement, alias or automatic configuration edit. |
| SLICE-003: Transfer one proven protocol obligation to a supported native owner | REQ-001/003; AC-001/003; QA-001/002; DEC-004 | One complete request path through the HTTP adapter, official handler and Node admission runner; valid and adverse requests with the real consuming boundary. Existing safe bounds must survive. | Include all impacted lifecycle/security checks and approved native scan scope. Document exact dependency/config authority if required. A specific recovery path must be tested before acceptance; no assumption that wrapper deletion is harmless. |
| SLICE-004: Improve one demonstrated package ownership or release-consistency problem | REQ-005/006; AC-005/006; QA-003; DEC-003/005 | Selected package/build/metadata seam and all actual query/website/distribution consumers. Prove the accepted maintenance benefit plus native artifact validity and accurate identity/notices/provenance. | Choose a coherent consumer-complete change, not a horizontal mass move. Separately approve exact manifests/locks/build/workflow settings. No query data migration or publication is implied. Requalify artifacts after relevant input changes; retain recovery/evidence until consumers finish. |

SLICE-001 supplies reusable semantic evidence before a selected transport or
structural change. SLICE-002 can stand alone if its actual scope remains independent.
SLICE-003/004 have no execution order or obligation until their respective decisions
are accepted. They may both be rejected while this improvement initiative still
achieves its accepted purpose.

Reopen requirements/design/routing if a named host needs a new compatibility
contract, native replacement cannot preserve admission, new licensing or SDK
reachability evidence changes fit, package work requires query/cache migration,
website consumers acquire extra coupling, maintenance benefit fails, or scope moves
to publication/hosting. Report that evidence; do not conceal it in a renamed shim,
relaxed test or silent baseline edit.

## 10. Executed evidence and review boundary

EVD-001 ran the repository-owned entry point after inspecting its lifecycle:

```powershell
npm test -- --runInBand --runTestsByPath tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js tests/mcp/local-universal-ontology-mcp-server.integration.test.js tests/mcp/universal-ontology-mcp-http-handler.test.js tests/distribution/mcp-registry-server-metadata.test.js
```

Result on SRC-002: **39 passed; 4 suites passed; 0 snapshots; 11.881 seconds**.
Node reported its experimental VM Modules warning. No product inputs were edited.
The stdio tests exercised spawned source commands and fixture artifacts; HTTP
integration exercised real loopback sockets with a stubbed query module. Metadata
tests used Ajv against the vendored official schema. These results do not prove a
packaged release, real named-host compatibility, complete MCP conformance, whole
ontology correctness, or security of every path.

The initial documentation task was recorded by the local SDLC helper as
`mcp-change-dossier`. The scope-confirmation amendment is recorded as
`mcp-change-dossier-scope-confirmation`, using SRC-007 as its intent. The source
import is recorded as `mcp-advisory-source-import`, using Max's request to retain
the original in the repository as its intent. All three use R0, no new executable
functionality, and the required `focused` profile. The imported source's SHA-256
and byte count were verified against the Downloads original; its wording and
formatting were preserved.
Check/profile/handoff records in `.sdlc/runtime` are mutable local evidence;
acceptance of DEC-001 comes from Max's reply, not those records. They do not accept
the remaining draft or replace the later product route.

The initial `sdlc status` command reported that no active record existed; the
explicit R0 begin then succeeded. A read-only inline Node document-check command
was rejected by DCG's `core.filesystem:redirect-truncate-dynamic-path` rule before
execution. No guard setting or exception was changed. Native read-only file checks
were selected for the document review instead; the rejection remains task evidence.

The draft is ready for owner review when its source dispositions are traceable,
facts and hypotheses are distinct, inherited decisions remain intact, the proposed
requirements/scenarios name independent evidence, and implementation gates remain
honest. This is the completion criterion for the current drafting task, not for
the proposed MCP implementation.
