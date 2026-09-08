# MCP improvement change dossier

**Status:** Concrete design and preservation criteria accepted by Max in SRC-015,
following the earlier scope, benefit and workspace-direction decisions. The design
interview is complete. SRC-016 approves MCP-CONFIG-01 and authorizes the published
Issue #25 and captured R2 baseline v2. Exact body and native linkage checks passed;
the baseline's commit/merge gate remains outstanding. Acceptance criteria are
accepted obligations; their implementation evidence has not yet been produced.

**Decision owner:** Max. **Prepared:** 2026-09-08. **Revision:** 8.

**Originating task:** Transform `MCP modernization pass.md` into an artefact usable
within the repository's newly deployed SDLC, then establish the path to an
implementation plan. SRC-015 authorizes proceeding from the accepted design to
baseline and configuration preparation within the repository's separate gates.
SRC-016 supplies the subsequent exact configuration and Issue/capture authority.

**Confirmed main outcome and scope:** Improve the existing local MCP server.
Max selected this focus in the originating task on 2026-09-08 (SRC-007, DEC-001).
It follows the existing accepted product design. Publication preparation and a
hosted MCP runtime are outside this increment. Alignment with applicable current
best practice is an accepted benefit in itself, alongside easier SDK evolution
and maintainability for authors unfamiliar with the implementation. Selecting
specific changes still requires evidence of applicability and their effects.

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

This dossier is the evolving decision/evidence record. The
[approved Issue body](2026-09-08-mcp-workspace-modernization-issue-body.md) contains
the normative requirements and design now captured in [baseline v2](../sdlc/baselines/issue-25/v2.json). These artefacts'
consumers are Max when accepting intent and trade-offs, an implementer working from
that accepted revision, and reviewers checking outcome and evidence. Separate
documents are needed only when a decision or handoff benefits from them.

Use the repository's [change form](../../.github/ISSUE_TEMPLATE/change.yml) if an
Issue is warranted. Its problem/outcome, behaviour, constraints, risk, decisions
and software-selection fields map to sections 3 through 8 here. The form permits
research to be pending at intake; it does not permit pending research to masquerade
as a completed selection before implementation.

The [accepted thin implementation plan](../plans/2026-09-08-mcp-workspace-modernization.md)
turns this revision into reviewable ownership choices, vertical slices and proof.
It records the accepted design and its remaining execution gates. It follows the repository's
[thin-plan procedure](../../.sdlc/skills/thin-implementation-plan/SKILL.md), whose
prohibition on complete proposed code and microscopic step scripts applies.
The generic writing-plans format does not override that procedure.

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
| SRC-008 | Max's grilling answers in the originating task on 2026-09-08. Q1 accepts easier, safer SDK updates and adds "ease of maintainability by other authors" who would otherwise need to understand an idiosyncratic implementation. Q2 states "Closer aligned to modern best practice is sufficient benefit" and connects that alignment to responsiveness to change. Q5 directs the agent to apply the updated SDLC, including correction of semantic naming mismatches. Max subsequently agrees to the Q4 recommendation: a competent JavaScript/Node developer able to consult standard MCP documentation, unfamiliar with repository conventions, should be able to locate transport setup, trace a tool into query logic and find verification commands through repository documentation. These statements establish DEC-007; they do not accept a particular architecture or a measured saving. |
| SRC-009 | Bounded primary-source HTTP checks on 2026-09-08: published [modern MCP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#sending-messages), [legacy transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server), [SDK HTTP migration guidance](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2#http-headers), [SDK HTTP serving guidance](https://ts.sdk.modelcontextprotocol.io/v2/serving/http.html#validate-host-and-origin-in-front-of-it), [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and [HTTP/1.1 connection persistence](https://www.rfc-editor.org/rfc/rfc9112.html#section-9.3). These establish the distinctions below, not completed release selection or full HTTP/MCP conformance. |
| SRC-010 | Official [npm workspaces](https://docs.npmjs.com/cli/v12/using-npm/workspaces/), [npm package fields](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/) and [Node package entry points](https://nodejs.org/api/packages.html#package-entry-points), checked on 2026-09-08. Workspaces support package dependencies/imports and scripts; `files`/`bin` describe packed contents and executable installation, while `exports` describes module entry points. These are distinct capabilities, not a rule requiring original source inside every executable distribution package. |
| SRC-011 | Official npm registry metadata for [server](https://registry.npmjs.org/@modelcontextprotocol/server), [node](https://registry.npmjs.org/@modelcontextprotocol/node) and [client](https://registry.npmjs.org/@modelcontextprotocol/client), checked on 2026-09-08 at 18:44 UTC. Each reports `latest` as `2.0.0`, published on 2026-07-27. The release source is [commit `cc4b416`](https://github.com/modelcontextprotocol/typescript-sdk/commit/cc4b41617ce3601b1290d67216ea0b194a3cd9ac); the later body-limit additions are in [commit `7b781ed`](https://github.com/modelcontextprotocol/typescript-sdk/commit/7b781ed4e25355a25d15974f3c76de81299694ed), dated 2026-08-25. Exact rights are recorded in the [release LICENSE](https://github.com/modelcontextprotocol/typescript-sdk/blob/cc4b41617ce3601b1290d67216ea0b194a3cd9ac/LICENSE). |
| SRC-012 | Max's response to Q6 in the originating task on 2026-09-08: "Seems sensible to me - proceed if that follows modern best practice". The recommendation was for the MCP workspace to own MCP implementation, direct dependencies and focused build/test entry points, with independently owned shared query semantics and repository-wide verification. SRC-010 was refreshed directly: npm documents workspace dependencies, package-name consumption and workspace scripts; Node documents explicit package entry points. These supported native mechanisms fit the accepted contributor workflow and real consumers. This satisfies the condition on the direction; it is not a claim that every repository must use this layout, nor approval of exact manifests or a particular shared-module interface. |
| SRC-013 | The previously accepted [local MCP implementation plan](../plans/2026-08-30-local-universal-ontology-mcp-server.md), Tasks 4 and 5, compared with SRC-003 and the actual Node/Fetch implementation on 2026-09-08. It requires spec-correct representation handling, explicit raw-body limits at both ingress boundaries and Host/Origin/rate/concurrency admission before parsing. It does not prescribe a uniform local `406` policy across eras or representation-header rejection before Node JSON parsing. Existing characterization tests cannot independently accept those extra policies. |
| SRC-014 | Official [Zod package guidance](https://zod.dev/packages/zod) and [library-author guidance](https://zod.dev/library-authors), checked on 2026-09-08. Classic Zod is appropriate for application-defined schemas; the core/peer-dependency guidance addresses generic libraries accepting consumers' Zod schemas. This server defines a fixed domain contract. The guidance does not establish that its bare `zod` imports are defective or that it must gain support for arbitrary Classic/Mini or version-3 schemas. No Zod release update was selected by this check. |
| SRC-015 | Max's direct reply to Q7 in the originating task on 2026-09-08: "This concrete design captures what I want - proceed". Q7 presented dossier revision 6 and thin-plan revision 1, including the three-workspace design, native HTTP ownership with accepted safeguards, mandatory naming corrections, independent ontology evidence and staged R2 verification. This accepts the concrete design, REQ/AC/QA preservation criteria, DEC-002 through DEC-006 dispositions and slice strategy. It authorizes baseline/configuration preparation; it does not fabricate a GitHub Issue, grant exact configuration/Git/remote authority or establish implementation success. |
| SRC-016 | Max's direct reply "I approve" to the exact request to approve MCP-CONFIG-01 and authorize creating the prepared GitHub Issue with its specified labels, then capturing its baseline. The app records the approval turn starting at `2026-09-08T20:30:23Z`. Section 9 binds the actual task/turn/message to both approved file hashes. This approves MCP-CONFIG-01 revision 1 and Issue/capture operations, not a new commit, push, merge, installation, live scan or deployment. |
| EVD-001 | Four existing Jest suites passed on SRC-002: 39 tests, 4 suites, no snapshots, 11.881 seconds. Exact command and boundaries are in section 10. |
| EVD-002 | Read-only fact-finding during the requested grilling interview on 2026-09-08, on `main` at documentation commit `b32d7cff65e57a4d4ea68334350e27b8ef5038ef` with unchanged MCP implementation relative to SRC-002. Inspected installed SDK 2.0.0 HTTP ownership and existing source/package/host test boundaries. Section 8 records the useful findings and limits. No additional tests, named-host runs, installs or scans were performed by that investigation. |
| EVD-003 | Read-only source/package ownership mapping during the same interview, on the same implementation as EVD-002. Compared SRC-003 section 14, actual MCP/query/browser/build consumers, bundling input enforcement, package metadata and verification routing with SRC-010. Section 8 records concrete alternatives and implications. This is architectural evidence, not an executed migration or an accepted package design. |
| EVD-004 | Read-only release/native-capability qualification against SRC-011. Installed versions and export maps match registry metadata; lockfile tarball URLs and integrity values match. Inspected installed declarations/implementations and release source/rights, without freshly downloading/extracting tarballs or running lifecycle scripts. All three installed SDK LICENSE files have SHA-256 `0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a` and match the release text. The installed Ajv-provider hash still matches the adoption record, and upstream issue 2036 remained open at the check. Runtime/composition and new-release artifact qualification gaps remain explicit below. |
| EVD-005 | Further read-only consumer and authority mapping on the same implementation as EVD-002. Traced projection policy into website rendering, query-index construction and query resolution; separated browser-safe exports from Node repositories/cache; traced root consumers of MCP-private modules and the installer bundle verifier; checked actual immutability-helper inputs. Compared HTTP behavior with SRC-013. These findings support the proposed interfaces and preservation boundaries in the thin plan; no migration, new runtime test, install or scan was performed. |
| EVD-006 | Baseline/configuration preparation after SRC-015, still without product/configuration edits. On 2026-09-08, native registry queries matched installed Jest/@jest/globals 30.5.1, esbuild 0.28.2 and Zod 4.5.4; full installed MIT texts were inspected. Native Jest `--showConfig` with the proposed workspace root override retained Node/no-transform settings and scoped discovery roots correctly; its reported CLI/core version was 30.5.0. Existing projection JSON/schema passed a read-only Prettier check. Eight JSON proposal blocks parsed, and all 56 local file-link targets across four documents existed. These checks do not execute moved suites or qualify new manifests, a lockfile, bundle or installation. GitHub duplicate/label reads succeeded through the connector and host CLI; no modernization Issue was found and the required labels already exist. Initial sandbox CLI reads returned 401; the successful host read required no credential/configuration edit. |
| EVD-007 | Authorized publication/capture on 2026-09-08 after a fresh duplicate/label check. Issue #25's title, labels and exact body matched the approved payload. Native snapshot v1 passed its schema but corrupted Unicode through Windows-1252 subprocess decoding; the entire corruption was reproduced from the approved UTF-8 bytes. Native Python UTF-8 mode produced v2 with the original body hash. The repository's actual schema/PR-linkage validator accepted v2 against the live Issue and rejected v1. Both captures are retained unchanged; the [capture record](../sdlc/baselines/issue-25/README.md) identifies the usable version, failure, native invocation and limits. No helper or configuration file was changed. |

No full verification profile, native security scan, release qualification,
product publication, named-host acceptance test, or maintenance-cost experiment was
performed for this dossier. Source inspection, fixture-based integration tests,
consumer schema validation and human acceptance are different kinds of evidence.

The [adoption record's MCP SDK section](../sdlc/adoption.md#mcp-sdk-embedded-fast-uri)
also constrains future SDK work: it records bundled `fast-uri` and the assessed
application boundary. EVD-004 refreshed the specific upstream issue and installed
provider identity; it was not a comprehensive new advisory assessment.
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
| MOT-002 / driver / stakeholder statement | Max values alignment with applicable current best practice because it should make the server easier to adapt as MCP software and engineering practices evolve. SRC-008. | Direct statement establishes the desired benefit. Source/SDK inspection establishes existing local responsibilities; future adaptability remains an outcome hypothesis, not a measured time saving. | Superficial conformity or an inapplicable upstream example could add coupling without advancing the accepted outcome. Assess applicability and lifecycle effects under OUT-002. |
| MOT-003 / assessment / observed fact | Some high-priority proposed work already exists. SRC-002, EVD-001. | Native stdio entry, both-era integration coverage and metadata validation are present and the selected suites pass. High within those test boundaries. | Rebuilding existing capability; does not settle complete cross-transport semantic coverage. |
| MOT-004 / goal / accepted purpose | Preserve trustworthy ontology lookup while aligning the local server with applicable established practice, supporting safe SDK updates and making maintenance understandable to other authors. SRC-003/007/008. | Max accepts these benefits and the maintainer profile. Applicable conventions, specific changes and their acceptance evidence still require investigation and design. | Optimizing file layout, line count or novelty while worsening the product; governed by both outcomes below and the SDLC constraints. |
| MOT-005 / concern and beneficiary / accepted stakeholder statement | Other authors should not need private knowledge of an idiosyncratic MCP implementation. The accepted maintainer is a competent JavaScript/Node developer who can consult standard MCP documentation and is new to this repository. SRC-008. | Direct acceptance of the Q4 profile and its documentation outcomes. No actual newcomer walkthrough has yet been observed. | A design can look conventional while hiding ownership or required verification steps. Check a concrete maintenance path and its documentation, not only a directory diagram. OUT-002. |
| CON-001 / constraint / existing accepted decision | Installed transport is stdio; loopback HTTP is a development/compatibility facility. Retain the two tools, query semantic authority, and development-only software distribution. SRC-003. | Existing accepted design and its explicit amendment; high. SRC-007 confirms this increment's local-server focus. | Expanding into hosted operation/publication changes cost and authority and would require a new scope decision. |
| CON-002 / constraint / repository policy | Precise names, native reuse and consumer validation, no unauthorized shims, truthful evidence, exact configuration approval and separate Git/remote authority apply. SRC-004 and root AGENTS.md. | Current repository instructions; high. | A passing implementation could still violate policy; applies at every risk route. |

**Accepted purpose anchor:** Help ontology consumers obtain the correct exact,
provenance-bearing answer through supported local interfaces. Help authors new to
the repository understand and maintain those interfaces using applicable current
practice, including evaluating and applying SDK updates safely. Established-practice
alignment is a sufficient benefit; a measured reduction in maintenance effort is
not an admission requirement. Establish which practice applies and assess effects
on shared query, website, distribution and security responsibilities. Preserve
accepted ontology, deployment and consumer contracts, apply mandatory semantic
naming corrections, and keep publication/hosting outside this increment. SRC-008
accepts the benefits and audience; SRC-015 accepts the design and evidence criteria.
Actual outcome and integration evidence remains to be established.

| Outcome | Beneficiaries, baseline and target | Measure, source and window | Causal hypothesis, trade-offs and accountability |
|---|---|---|---|
| OUT-001: Preserve correct ontology lookup across supported interfaces | Beneficiaries: ontology consumers and MCP host users. Potentially disadvantaged: users of an accidentally removed protocol era. Baseline: existing accepted Person use case; EVD-001 establishes partial transport evidence. Accepted target: every supported matrix case returns the independently expected entity, definition and release provenance with no transport-dependent semantic difference. | REQ-001/002 and QA-001, using accepted ontology fixtures and real query execution. Compare before/after each relevant slice and at its review; retain affected existing host acceptance as distinct evidence. | Better boundary evidence should reveal semantic or protocol regressions. Identical wrong outputs remain possible unless an independent expected result is checked. Detailed criteria belong in the accepted task/baseline; reviewers assess their execution and Max accepts the product outcome. Additional support obligations need a separate decision. |
| OUT-002: Improve maintainability and adaptability through applicable established practice | Beneficiaries: the accepted unfamiliar maintainer profile in MOT-005 and existing reviewers. Potentially disadvantaged: website and distribution maintainers bearing coordinated changes. Baseline: current responsibilities, consumer paths and documentation in SRC-002; no effort measurement or newcomer observation is claimed. Accepted direction: closer alignment with applicable current practice, clearer maintenance paths and safer SDK evolution. | Accepted evidence criteria: source-backed current/proposed responsibility and convention comparison; a documented SDK-update walkthrough; and review that an unfamiliar maintainer can locate transport setup, trace tool-to-query execution and identify verification commands. Check actual consumers and explain any remaining local responsibility. Review at option selection and after the affected slice, with Max accepting the final evidence. Measured time savings are optional supporting observations, not a selection gate. | Supported native ownership and recognizable conventions are expected to reduce special knowledge and ease later change; that causal benefit is not guaranteed by moving files or reducing lines. Show migration work, coupling, rights and build/provenance effects. If new evidence makes a proposal counterproductive for the accepted outcome, replan under OUT-01. NAM-01 remains mandatory throughout. |

**Retain the current design:** This remains an option for a candidate whose existing
implementation already follows applicable practice or whose local responsibility
is justified by an accepted requirement. Record that evidence and the remaining
confidence or maintenance limitations. Absence of a measured outage or cost penalty
does not defeat Max's accepted alignment benefit. A verified in-scope semantic
naming mismatch must be corrected or the implementation redesigned under NAM-01;
retaining the design cannot waive that condition.

## 4. Risk route and authority

### Risk class:

R0 for acceptance recording and baseline/configuration preparation: no executable, configuration,
public contract or persistent-data change. The originating task supplies its intent.
**R2 for the accepted combined implementation** because it changes HTTP
admission/parsing, transport contracts, lifecycle/concurrency or distribution
contracts. That follows the local router's explicit triggers, not document length.
Isolated explanatory edits may be R0; bounded preservation tests or internal work
with understood unchanged contracts may be R1. Route each independently accepted
increment on its real impact, without splitting work to evade an R2 boundary.

### Decision owner:

Max, as repository/product owner. Scope is confirmed in DEC-001, purpose/benefits
and maintainer profile in DEC-007, and the supported native workspace development
direction in DEC-003. SRC-015 accepts the concrete interfaces, preservation criteria
and R2 slice strategy. Additional product obligations require a new scope decision.
Apply existing SDLC rules directly instead of
presenting them as optional product preferences.

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

Actual preservation evidence for supported consumers; native composition at Node
and Fetch ingress; package/bundle/browser integration and recovery behavior; and
the observed maintainer outcome. Applicable conventions and ownership design are
settled. Sections 5 and 8 preserve the capability findings and remaining proof gaps.

### Required artifacts:

This dossier, accepted plan, prepared normative Issue body and exact configuration
proposal have distinct acceptance/implementation consumers. R0/R1 work may use an accepted
task/ordinary PR brief. R2 implementation requires an actually accepted Issue
revision captured and merged as a protected prior baseline. The accepted thin plan
coordinates the material cross-consumer changes. Reuse SRC-003 without fabricating
a historical baseline under the new method.

### Required specialist lenses:

Ordinary review for R1. For R2, independent verification plus test-oracle scrutiny
where the new evidence is consequential. Add maintainability review if architecture
changes; operability/security coverage if admission, dependencies or lifecycle
change. A native Codex Security workflow owns any authorized security scan. This
draft does not itself require additional reviewers or a scan. The explicitly
requested grilling skill uses bounded fact-finders; their findings are evidence
inputs, not design acceptance or independent implementation assurance.

### Required verification:

For the current R0 draft: source/claim/traceability review, diff/cleanup inspection
and the configured focused profile. EVD-001 informs discovery only. Future R1 uses
affected checks; R2 uses the configured full profile plus relevant independent
product and consumer evidence. Passing the profile does not accept the semantics.

### Required human approvals:

SRC-015 accepts the detailed design/preservation criteria and R2 slice strategy.
Reuse that approval within its recorded scope. SRC-016 separately approves the exact
files/settings in MCP-CONFIG-01 revision 1 after their pipeline effects were presented.
Apply them within the accepted slices after the baseline merge gate; additional
configuration settings require their own exact approval. Commit, push, GitHub writes,
installation/trust, live scan, publication and deployment retain their distinct
authority. A generic plan acceptance grants no new shim exception.

### Maximum sensible autonomy:

Inspect, run existing bounded checks and record the authorized configuration
approval, Issue publication and baseline capture. Do not claim a
merged baseline or begin R2 product implementation before its gate. Later work
uses the authority and ceilings of its accepted route and exact decisions.

### Next lifecycle step:

SRC-016's authorized Issue publication and native baseline capture are complete.
The exact approved body is in Issue #25 and usable snapshot v2. Obtain the required
Git authority and establish the protected R2 baseline through its separate merge.
Do not ask Max to repeat the design acceptance.

## 5. Disposition of every source recommendation

These CLM IDs retain traceability to SRC-001. SRC-015 accepts the selected design
dispositions, not the original source's assertions or severity. All observations
apply to SRC-002 on 2026-09-08. Confidence is high for
direct source/test observations and bounded for absence/coverage assessments.
SRC-008 establishes accepted benefits; evidence must still establish that a proposed
change serves them. Principal contrary evidence and consequences appear in each
row; decision dependencies refer to section 8.

| Claim / original location | Current evidence and epistemic status | Accepted disposition and consequence |
|---|---|---|
| CLM-001 / section 1: make `serveStdio()` canonical | Observed: [runner](../../src/mcp/runUniversalOntologyMcpStdioServer.js) imports it, injects that native default, and calls it with `legacy: "serve"`. [Real-process tests](../../tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js) pass in EVD-001. | Already implemented in the inspected path. Preserve and document the actual boundary if needed; no entry-point replacement task. Packaged-release/host acceptance is a separate question. REQ-001/002. |
| CLM-002 / section 2: clarify bare `v1` | Observed: ambiguous tool-catalog comments in [server](../../src/mcp/createUniversalOntologyMcpServer.js), [schemas](../../src/mcp/universalOntologyToolSchemas.js) and [metadata](../../src/mcp/universalOntologyMcpMetadata.js). The actual referent must be established; measured user confusion is not required. | Correct verified in-scope semantic mismatches under NAM-01, including retained names of objects whose responsibilities change and affected file/directory names. Do not invent a tool-contract version or rename a genuine query/cache format version merely because the number is `1`. REQ-004 applies within every affected slice. |
| CLM-003 / section 3: retain native HTTP handler | Observed: [HTTP adapter](../../src/mcp/createUniversalOntologyMcpHttpHandler.js) already delegates to `createMcpHandler`. | Reuse the supported native owner of protocol responsibilities where it satisfies accepted requirements. This does not freeze a helper identity or every observed behavior; compare concrete alternatives under REQ-003 and the SDLC. |
| CLM-004 / section 4: delete redundant HTTP machinery | EVD-004 confirms the released SDK's raw-body-limit gap and public Content-Type helper. SRC-013/EVD-005 distinguish accepted admission from incidental representation checks and duplicate buffering. | Proposed narrow native-ownership change in DEC-004 and the thin plan. Preserve explicit raw-byte/admission policy and prove actual Node/Fetch behavior; use native protocol handling instead of inventing a uniform local Accept policy. Removal is conditional on independent contract evidence, not a line-count target. |
| CLM-005 / section 5: keep hardening/add architecture rule | Observed: [loopback runner](../../scripts/runLocalOntologyMcpServer.js) uses official Host/Origin validators and local admission controls; relevant tests pass in EVD-001. No comprehensive security verdict. | Preserve accepted boundaries. Existing policy already requires appropriate native reuse; a new policy rule is not automatically necessary and would require exact configuration approval. REQ-003. |
| CLM-006 / section 6: strengthen layers | Existing server/query/transport seams are visible in SRC-002. Need for new layers is a hypothesis. | Establish applicable supported conventions, existing ownership and the maintenance path for the accepted audience. Alignment can justify a change without a measured costly incident. Compare the consequences of adding or removing a boundary; a diagram alone is not acceptance evidence. DEC-003. |
| CLM-007 / section 7: move source into the workspace package | Observed: source lives under `src/mcp` and shared `src/ontologyQuery`; [package manifest](../../packages/universal-ontology-mcp-server/package.json) distributes a bundle built by [root build code](../../scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js). SRC-003 section 14 selected that arrangement. EVD-003/005 establish non-MCP query and projection-policy consumers. | Workspace development direction accepted in DEC-003, revising the earlier source-ownership design. The thin plan proposes separate private query and projection-policy workspaces to serve actual consumers. This is not a claim that the prior locations were intrinsically incorrect. Preserve all consumer and delivery contracts; exact interfaces/configuration remain proposed. |
| CLM-008 / section 8: retain two tools, avoid gratuitous resources/prompts/UI | SRC-003 already selects `search_entities` and `resolve_entity`; EVD-001 checks the stdio catalog and empty resources/prompts. | Existing constraint, not a new feature task. Additional surfaces require a separate consumer need. REQ-001. |
| CLM-009 / section 9: keep structured/text results and application validation | Observed in [server](../../src/mcp/createUniversalOntologyMcpServer.js) and [renderer](../../src/mcp/renderOntologyToolResultAsText.js). Full failure-arm qualification was not rerun here. | Preservation requirement. Keep application validation distinct from SDK wire validation; independent expected semantics still required. REQ-001/002. |
| CLM-010 / section 10: keep annotations | Observed tool annotations in SRC-002; bounded release lookup is the accepted operation. | Preserve accurate annotations. `openWorldHint: false` describes operational access, not a change to OWL semantics. REQ-001/004. |
| CLM-011 / section 11: add era conformance tests | Both-era tests exist. HTTP compares structured results using a query stub; stdio tests execute the real query path. Modern HTTP uses auto negotiation; the stdio test pins the modern revision. EVD-001 passes. | Investigate the narrower missing proof: an explicit era-verified four-way real-query matrix against one independent semantic oracle. Do not call that complete MCP conformance or recreate existing tests wholesale. REQ-002, DEC-002. |
| CLM-012 / section 12: eventually reject legacy HTTP | Future-hosting option in SRC-001; current accepted local compatibility remains. | Deferred. Dropping support requires an accepted consumer/host matrix and product decision, not SDK age. Preserving supported native legacy operation is not introducing a repository shim. DEC-001/002. |
| CLM-013 / section 13: update Registry schema/unify metadata | [Metadata test](../../tests/distribution/mcp-registry-server-metadata.test.js) already validates the vendored official schema and cross-artifact identity/version relationships; it passes in EVD-001. SRC-006 still uses the same schema URI. Runtime identity reads root package version. | Preserve consumer validation while comparing supported metadata ownership/maintenance practices. An established-practice improvement need not increase validation coverage. If stronger inconsistency detection is claimed, identify the missing case and prove sensitivity. Refresh the consumer's actual schema/release before a change; age alone does not establish obsolescence. REQ-006, DEC-005. |
| CLM-014 / section 14: keep exact pins | Root package/lock already pin MCP and Zod dependencies; exact pins describe reproducibility, not ongoing freshness. | Preservation practice. Any new adoption/update refreshes latest stable/applicable LTS and exact rights under SRC-004; do not freeze third-party versions indefinitely. DEC-004/005 where affected. |
| CLM-015 / section 15: use `zod/v4` | SRC-014 distinguishes application-defined Classic schemas from generic tooling accepting consumer schemas. Current fixed-domain schemas fit the former. | Retain the supported Classic import surface; no standalone import-spelling task is justified by this advice. Apply the actual pinned package's consumer guidance during integration. Do not add arbitrary-schema compatibility or a generic adapter to satisfy inapplicable library guidance. |
| CLM-016 / section 16: retain application failure model | Observed safe structured failure handling in SRC-002. No new failure model is requested by SRC-003. | Preserve protocol-failure versus tool-operation-failure semantics. REQ-001/002. |
| CLM-017 / section 17: avoid OpenAI-specific Apps features | Portable MCP is the accepted product boundary; no host-specific UI need is supplied. | Non-goal for this increment. Reassess only for a concrete separately accepted use case. |
| CLM-018 / priority table: optional protocol logging | Operational logging exists; no missing diagnostic case or data-retention requirement is supplied. The detailed source sections do not establish this need. | Deferred pending a support use case, native API fit and privacy/volume criteria. Preserve stderr/protocol separation and redaction. DEC-006, QA-002. |
| CLM-019 / overall scores and urgency | Favourable grades and P0/P1 ordering are author assessments without a stated rubric, measured impact or reproduced failure. | Keep as source opinions. Do not import them as security findings, acceptance, severity or backlog priority. Prioritize verified gaps and accepted outcomes. |

## 6. Accepted requirements and acceptance evidence

SRC-015 accepts these REQ/AC obligations with the concrete plan; the cited existing
invariants remain authoritative through SRC-003. Each requirement exists only for
the selected scope. REQ-005 now carries the accepted workspace development
direction and SRC-015 accepts the package design. Exact configuration remains
separately governed. REQ-006 does not
require metadata generation.

| Requirement and outcome/constraint link | Acceptance criterion and independent evidence |
|---|---|
| REQ-001: Preserve the portable ontology lookup contract. OUT-001, CON-001. | AC-001: On an independently inspected immutable fixture, search `Person`, resolve the exact typed identifier returned, and check entity identity, authored definition lexical value/language/datatype and release/source provenance against recorded expected facts. Retain asserted/inferred distinction, text/structured consistency, accurate annotations and safe failure semantics. Do not compute expected values with the queried implementation. |
| REQ-002: Make supported transport/era claims falsifiable. OUT-001, CLM-011. | AC-002: Across the inherited modern/native-legacy stdio and loopback HTTP cases in DEC-002, verify actual negotiated era/revision, run the same real query fixture and compare each result to AC-001 and the other application-level results. Include search-to-exact-resolution, absent entity and representative application/protocol failures. Preserve affected cancellation/shutdown regressions and existing package/host acceptance obligations. Protocol envelopes may legitimately differ. Mere equality, client construction or a green stub test is insufficient. |
| REQ-003: Retain accepted admission/privacy obligations while assigning protocol responsibilities to supported native capabilities wherever they satisfy them. OUT-001/002, CON-002. | AC-003: For each selected wrapper change, record the obligation, its contract owner, current/native observed behaviour and residual gap. Rejection and cancellation tests cover supported and malformed requests, hostile Host/Origin, excess streamed/declared bodies and relevant overload/shutdown paths. Retain the current 131,072-byte bound and eight-active-request ceiling unless separately accepted. Check prohibited query/definition/identifier/path logging and protocol-only stdio service output. A removed wrapper check passes only with evidence that its obligation is still met. |
| REQ-004: Enforce the SDLC's semantic correctness and precision requirements within every affected slice, including protocol, SDK, application contract and artifact-format concepts. CON-002, OUT-002. | AC-004: Establish actual referents and correct in-scope semantic mismatches in names, affected prose and filesystem objects; reassess retained names when responsibility or meaning changes. A reader can distinguish SDK major 2, protocol revision `2026-07-28`, any real tool-contract version and query/cache format version 1. Update affected consumers coherently. Preserve externally prescribed identifiers at their actual boundary; resolve any accepted public-contract conflict using NAM-01/NSH-01 rather than silently breaking it or adding an alias. No measured confusion or severity threshold is required. |
| REQ-005: Give the MCP workspace ownership of MCP implementation, direct dependencies and focused build/test entry points, with independently owned shared query semantics and preserved accepted consumer contracts. OUT-002, MOT-005, DEC-003. | AC-005: Use native npm workspace dependency/import/script mechanisms and explicit consuming interfaces. Document the responsibility map and material consumer/lifecycle effects. Review whether the accepted unfamiliar maintainer can locate transport setup, trace tool-to-query execution and find verification commands; use evaluating/applying an SDK update as a representative maintenance operation. These outcomes can justify the change without measured effort savings. Actual package/bundle and website/query consumers must satisfy their independent contracts, with accurate notices/provenance. The accepted interface responsibilities are detailed in the thin plan; concrete configuration settings require separate approval. |
| REQ-006: Preserve release identity/provenance consistency and assess applicable established practices for metadata ownership and maintenance. CON-001/002, OUT-001/002. | AC-006: Selected artifacts validate using the applicable consumer-owned schema/native tool and agree on accepted identity/version relationships. Reuse existing validation. A supported ownership/maintenance improvement may retain the same detection coverage; a claim of stronger detection requires a previously uncovered inconsistency and sensitivity evidence. Local validity does not establish registry acceptance, public artifact existence, signing authority or publication readiness. |

Traceability: MOT-001/003 -> MOT-004 -> OUT-001 -> REQ-001/002/003/006;
MOT-002/005 -> MOT-004 -> OUT-002 -> REQ-003/004/005/006. CON-001/002 constrain all
selected requirements; REQ-004 expresses an existing mandatory policy. CLM-012/017/018
have no accepted new consumer outcome and therefore do not acquire implementation
tasks. OUT-002's benefits are accepted; actual improvement observations remain to
be established. CLM-019's source priorities remain unsupported assessments.

## 7. Quality scenarios for consequential decisions

Owner for all scenarios: Max. SRC-015 accepts these preservation/design constraints,
not new production SLOs. Set any additional cost/latency/availability target only
from a real workload and owner decision; this draft invents none.

| Scenario / links / priority | Source, stimulus, artifact and environment | Required response and measure | Verification and production signal | Rationale, uncertainty and risk |
|---|---|---|---|---|
| QA-001 / REQ-001/002, AC-001/002, DEC-002 / high, preservation constraint | An official client negotiates an accepted era and searches/resolves the same entity against the same immutable release through each selected local transport. Normal operation and representative safe failures. | Actual era matches the intended case; all application results match independent authored facts and provenance, and corresponding semantic fields agree across the matrix. No silent fallback in a modern-pinned case. | Real query module plus official clients; exact fixture identity and expected facts. Post-release signal: attributable host compatibility/failure reports and a scoped acceptance exercise if needed, not logging ontology queries. | Existing tests cover parts of this; HTTP stub equality cannot prove ontology correctness. A misleading matrix could hide a shared semantic defect. |
| QA-002 / REQ-003, AC-003, DEC-004/006 / high, existing safety constraints | A local/browser-origin caller sends invalid representation metadata, malicious Host/Origin or an oversized stream; clients overload/cancel while shutdown occurs. HTTP runner/adapter and stdio lifecycle in adverse conditions. | Preserve Host/Origin/rate/concurrency rejection before parsing, the 131,072-byte bound at actual Node and Fetch ingress, eight active HTTP requests, bounded shutdown/cancellation and redacted diagnostics. Representation outcomes follow the applicable protocol/HTTP contract; uniform local `406` and header-before-JSON precedence are not independently accepted requirements. Use existing accepted route/rate/time constants. | Consumer/native checks plus real Node socket/process tests for adapter-dependent behaviour. A fetch-only test cannot establish Host/socket/keepalive behaviour. Production signals remain existing safe event/error codes, never payload text. | EVD-001 is focused evidence, not a comprehensive security assessment. Unsafe deletion or new diagnostic content could weaken the existing boundary. SRC-013 supplies the authority distinction. |
| QA-003 / REQ-005/006, AC-005/006, DEC-003/005 / conditional design, accepted maintenance outcome | A competent JavaScript/Node maintainer new to the repository uses standard MCP and repository documentation to trace a tool and assess/apply an SDK update. Build/distribution and website consumers use the resulting code/artifact. | Ownership and verification paths are discoverable through the accepted documentation outcomes; proposed conventions have source-backed applicability. Preserve accepted consumer contracts/identity/provenance and correct affected semantic mismatches. No unapproved query/cache format migration. | Review a concrete current/proposed maintenance walkthrough and actual dependency/build input effects; execute affected package/bundle and shared-query/website checks. Record review/observation provenance honestly; a reviewer exercise is not an observed onboarding study. Later actual maintenance experience may corroborate or challenge the hypothesis. | Applicable best-practice alignment is itself an accepted benefit. A directory change may still add coupling or lifecycle cost; compare those effects before selecting it. No measured savings experiment is required. |

Apply mandatory SDLC and accepted safety/consumer constraints directly. Neither
naming correctness nor required assurance is an optional trade for fewer changes.
Investigate technical uncertainty before asking Max to choose. Escalate concrete
additional support obligations, accepted-contract conflicts or consequential
ownership/lifecycle trade-offs with evidence and a recommendation. A common fixture,
native replacement and alternative ownership layouts remain possible designs, not
selected architectures.

## 8. Decisions and remaining implementation evidence

DEC-001 is **accepted** through SRC-007, DEC-007 through SRC-008 and DEC-003's
development direction through SRC-012 with SRC-010's applicability check. SRC-015
accepts DEC-002's verification design, DEC-003's shared-module design, DEC-004/005
and DEC-006's retention disposition. SRC-016 supplies exact MCP-CONFIG-01 authority;
runtime evidence and baseline merge remain outstanding. Factual investigation belongs to the agent; existing SDLC
rules and accepted contracts are not questions to put back to Max. Bring consequential
choices for acceptance once concrete; a generated label cannot accept a design.

| ID | Decision and alternatives | Cheapest useful evidence / exit condition |
|---|---|---|
| DEC-001 — accepted | Improve the existing local server. Publication preparation and a hosted MCP product are outside this increment. | Max's direct reply on 2026-09-08 (SRC-007) resolves this choice. Apply SRC-003's existing local product boundary. Reopen only if Max changes the scope; detailed requirements, measures and design decisions still need their own evidence and acceptance. |
| DEC-002 — inherited boundary; verification design accepted | Establish sufficient evidence for accepted modern/native-legacy stdio and loopback HTTP, plus affected existing package and host contracts. EVD-002 maps the current gaps below. | Design explicit era checks and independent semantic fixtures across the four existing transport/era cases. Reuse existing distribution/host acceptance commitments and run the checks affected by selected changes. Do not ask Max to reselect known product boundaries or routine test technique. Additional formal host/version/platform guarantees, extra legacy-revision guarantees or support removal need a concrete owner decision. |
| DEC-003 — concrete design accepted | Make the MCP workspace own MCP development, direct dependencies and focused build/test entry points. Use private `universal-ontology-query` and `universal-ontology-projection-policy` workspaces for their distinct existing consumers; retain repository-wide verification. | SRC-012 and refreshed SRC-010 accept the direction. EVD-003/005 support the linked plan's explicit browser/Node interfaces and self-contained CLI lifecycle. SRC-015 accepts the consequential package design. Obtain exact configuration approval before editing. No independently published shared package or MCP source exports are proposed. |
| DEC-004 — native ownership accepted within inherited policy | Use supported native protocol classification/representation handling; preserve explicit application admission and raw-body limits at each real ingress. Reuse the public media-type helper if an early application check remains justified. Remove duplicate buffering only after proving which boundary already enforced the raw-byte contract. | SRC-009/011/013 and EVD-004/005 establish the authority and released capability. The thin plan names independent protocol/HTTP and socket tests. A uniform custom Accept rejection is not an inherited contract. No SDK update is currently needed or available to close the released size-limit gap; refresh selection/rights before execution. Any actual native conformance gap or weakening of accepted safety policy requires replanning. |
| DEC-005 — metadata ownership alignment accepted | Make the MCP workspace manifest own MCP application identity/version; retain real artifact/Registry schema validation and independent cross-artifact checks. The root application version ceases to be the runtime MCP authority. | Perform this with the workspace migration and update actual consumers coherently. Preserve the current packed product identity and runtime version in this increment. No new generator or schema bump is selected merely for uniformity or date freshness. Refresh the official schema when changing its integration; exact manifest/lock/build changes need approval. |
| DEC-006 — retain diagnostics accepted | Preserve existing safe diagnostics and protocol/stderr separation; defer a new protocol-logging feature. | No unmet troubleshooting use case was supplied or found in this bounded work. A later feature needs its own permitted fields, volume, opt-in and consumer need. No logging expansion belongs in the current plan. |
| DEC-007 — accepted | Improve adaptability and maintainability through applicable current best practice; that alignment is sufficient benefit without measured maintenance savings. Include safer SDK updates and authors unfamiliar with repository internals. | SRC-008 records Max's direct answers and agreement to the JavaScript/Node maintainer profile and documentation outcomes. Apply existing SDLC evidence, naming, reuse and compatibility rules. This accepts the purpose and beneficiaries, not a package move, HTTP deletion, dependency change or detailed design. |

Research status: this dossier contains repository characterization, bounded native
SDK release/capability research and a source/package ownership comparison. It is
**not** completed selection or integration proof for every candidate design.
Before consequential selection,
compare existing repository/standard/platform/dependency capabilities and credible
maintained alternatives requirement by requirement; consider supported configuration,
composition and extension. Record current exact releases and rights, then justify
only a residual custom gap. A missing prototype/tool is an integration gap, not a
reason to choose an older release or invent a replacement. No dependency is newly
selected, installed, or granted rights clearance by this dossier.

### Inherited acceptance boundaries and missing evidence

EVD-002 is static inspection of the existing contracts and tests. It does not turn
test source into a passing run or widen EVD-001's four-suite result.

| Existing boundary | Evidence to reuse and remaining limit |
|---|---|
| Installed stdio: modern `2026-07-28` and intended native legacy behavior | SRC-003 sections 4 and 16.3 already require these. The [source-process integration suite](../../tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js) uses real query fixtures and pins modern negotiation. Exact legacy revision and complete golden definition/provenance evidence are not established by its current assertions. |
| Loopback HTTP: primary modern and stateless legacy compatibility | Already documented in [local development](../mcp/local-development.md). The [socket integration suite](../../tests/mcp/local-universal-ontology-mcp-server.integration.test.js) uses a query stub and modern auto negotiation; equal results do not establish real-query correctness or exclude fallback. The [Fetch-level handler tests](../../tests/mcp/universal-ontology-mcp-http-handler.test.js) exercise legacy initialization, not a complete real-query semantic oracle. |
| Fresh installed npm package and built application bundle | SRC-003 section 16.4 already requires fresh installation and a golden Person call. The [npm package test](../../tests/distribution/universal-ontology-mcp-npm-package.test.js) packs, installs and launches the bundle with modern pinning; its Person result assertions do not establish the complete definition/provenance contract. The [bundle verifier test](../../tests/distribution/universal-ontology-mcp-application-bundle-verifier.test.js) adds filesystem-query readiness. Neither suite was executed for EVD-001/002. |
| Advertised archives and OCI | Existing accepted distribution obligations remain applicable to affected changes. [Archive tests](../../tests/distribution/universal-ontology-mcp-platform-archive.test.js) use a runtime fixture and cannot qualify every advertised native target. [Container tests](../../tests/distribution/universal-ontology-mcp-container.test.js) inspecting build/workflow text do not establish Docker execution. This dossier does not claim release qualification. |
| Existing host discovery/launch | [Local installation acceptance](../mcp/local-installation.md) requires repeating Person through the actual restarted host beyond setup's SDK probe. Documentation examples and string checks are not named-host runtime evidence. Its deferred default-origin HTTP acceptance concerns ontology artifact retrieval, not a hosted MCP endpoint or the loopback MCP transport. Reuse that obligation where affected; no additional named-host/version guarantee is selected here. |

### HTTP responsibility checkpoint

SRC-009/013 and EVD-002/005 distinguish the obligations before any deletion:

- Modern and legacy request clients must advertise both JSON and event-stream
  response types. The inspected MCP clauses do not prescribe server-side `406`
  or universal rejection before body reading. The modern revision also leaves
  notification-POST header requirements undefined. SRC-013 requires spec-correct
  outcomes, not a uniform local `406`. The proposed design gives this responsibility
  to native protocol handling and verifies it against the applicable specification;
  the SDK's behavior alone is not the acceptance oracle.
- The installed SDK validates JSON Content-Type natively, but the local check
  currently runs before Fetch-level buffering but after Node-level parsing on the
  actual listener path. SRC-013 does not require representation-header rejection
  before JSON parsing. Reuse the supported consumer parser wherever an early
  application check remains justified; characterize actual boundaries and errors.
- The 131,072-byte limit is accepted deployment policy, not an MCP constant. The
  installed 2.0.0 handler inspection found no public configurable body-size option.
  Retain necessary safe limits before expensive parsing under VAL-01. HTTP/1.1
  requires consuming the remaining body or closing the connection after an early
  response; a Fetch-only check cannot prove socket/framing behavior.

SRC-013 explicitly preserves Host, Origin, rate and concurrency admission before
parsing, with the existing safe application rejections and connection handling.
Those are distinct from native protocol errors. The current readers only bound
POST bodies; the Node adapter can collect other non-GET/HEAD bodies if `parsedBody`
is absent. This is a static gap candidate to characterize at the real socket,
including unsupported methods, before selecting a consumer-complete repair.
The standalone Fetch limit remains an accepted boundary even though its current
direct callers are tests. A smaller present caller set cannot retire that contract.

There is an additional real-ingress distinction: the [Node runner](../../scripts/runLocalOntologyMcpServer.js)
calls its bounded JSON body reader before supplying `parsedBody` to the native Node
handler. It has no representation-header guard before that parse. The wrapper's
early Fetch-level rejection therefore does not prove header rejection before Node
JSON parsing. Static tracing predicts that malformed JSON with a wrong Content-Type
reaches the runner's parse error first; no new runtime test has established that
counterexample. Preserve accepted admission requirements while testing their actual
execution order; do not describe current source as proof that they are all met.

The installed legacy SDK and local Accept checks differ in parsing behavior; both
observed token-presence checks ignore `q=0`. Static counterexamples and different
rejection order are investigation inputs, not a runtime conformance verdict or an
accepted new error contract. SDK output alone does not settle a normative rule.

SRC-011/EVD-004 resolve the release discrepancy: unversioned [SDK request-body documentation](https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/server/server/requestBody.html)
describes additions made after the current `2.0.0` release. Those additions are not
available through a currently released modular-SDK update. The supported options
identified for DEC-004 are:

| Obligation | Current released capability and remaining design/evidence |
|---|---|
| JSON Content-Type interpretation | `isJsonContentType(header)` is already a public server-root export. Reuse is the supported native candidate for local interpretation under VAL-01. Placement, response construction and actual Node/Fetch rejection order still require coherent design and tests. |
| Accept/response negotiation | No public parser/admission option was found in the installed released SDK. SRC-013 accepts spec-correct outcomes, not the same local rejection across eras. Prefer native era-specific handling; validate normative response negotiation independently, without turning a characterization into a new compatibility promise. |
| Bounded raw ingress | Released server/Node options have no `maxRequestBodySize`, and `readRequestBody` is not a released root export. `parsedBody` is a supported composition interface. The Node adapter otherwise consumes the unparsed stream fully before the Fetch handler; preserve accepted raw-stream limits at the real ingress. Even the unreleased limit additions explicitly exclude supplied `parsedBody`. |
| Protocol classification and errors | Continue using native SDK protocol classification/validation/error handling. `onerror` reports errors and cannot customize the rejection response. Application deployment rules remain separate obligations. |

A broader maintained composition was also examined: [Hono 4.13.7](https://github.com/honojs/hono/releases/tag/v4.13.7)
offers [body-limit middleware](https://github.com/honojs/hono/blob/v4.13.7/src/middleware/body-limit/index.ts).
Its versioned implementation trusts Content-Length when Transfer-Encoding is
absent and uses a plain-text default rejection. It is not a qualified replacement
for all current obligations; exact new artifacts/rights and integrated behavior
would need qualification before adoption. Adding a framework is not required to
reuse the already published SDK media-type helper.

The existing SDK rights and embedded-dependency boundary remain applicable. EVD-004
confirms the full Apache-2.0/MIT transition and CC-BY-4.0 documentation text; a
registry or generated-notice `MIT` label alone does not express those terms. The
embedded `fast-uri` condition remains unrepaired; source/hash continuity is not a
new security verdict. Reassess the selected integration under the existing adoption
rules, with accurate notices and applicable independent checks. No fork, shim,
unreleased-source adoption or dependency downgrade is selected here.

### Source/package ownership checkpoint

The existing design separates repository source ownership from executable
distribution. [MCP source](../../src/mcp/createUniversalOntologyMcpServer.js) is
repository-owned; the workspace distributes a generated executable. Shared query
semantics are consumed by MCP, the [browser resolver](../../src/webmcp/createOntologyEntityDefinitionResolver.js),
[artifact generation](../../scripts/build/createOntologyQueryArtifacts.js) and
[channel staging](../../scripts/stageOntologyQueryArtifactChannel.js). Query code
also depends on [shared projection semantics](../../src/ontologyProjectionProperties.js),
which the website uses. Those responsibilities cannot become private MCP semantics
merely by moving their directories.

SRC-010 supports these distinct options. SRC-012 selects the MCP workspace
development direction; the shared-module interface design remains to be resolved:

| Contributor workflow | Benefit it can establish | Material design work and limits |
|---|---|---|
| Retain repository-level source ownership and improve maintainer guidance — considered, not selected | Makes the existing conventional source-to-bundle workflow and verification path explicit for the accepted audience. | Root scripts/dependencies remain the development entry point. This does not establish the workspace workflow now accepted in DEC-003, and documentation alone cannot repair an actual semantic mismatch. |
| Make the MCP workspace the development boundary for MCP-owned code — direction accepted | Co-locates source, package identity, direct dependencies and native focused build/test entry points as the contributor's starting point. | Requires coherent source/dependency/verification ownership, not just relocation. Resolve the shared-query dependency and repository-owned loopback/build composition explicitly. Root-wide verification still covers shared consumers. |
| Give shared ontology-query semantics their own workspace as part of that design | Can expose a domain-appropriate API to both website and MCP without making website semantics depend on an MCP-private module. | Requires browser-safe and Node-specific interfaces, shared projection ownership, all consumer imports and wider verification changes. A separate package need not become a separately published product. This choice depends on the intended development boundary. |

The current [bundle builder](../../scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js)
already restricts source/dependency inputs, records esbuild inputs and separately
attributes components embedded in the SDK. Relocation alone does not establish
smaller bundles or correct those embedded components. Its root dependency metadata
resolution and runtime/root/workspace version ownership need explicit reassessment
if source ownership changes.

Moving JavaScript into a workspace also requires coordinated lint/format coverage
and source-specific lint rules. A shared-query workspace additionally affects
[website check routing](../../scripts/selectPullRequestChecks.js) and the
[browser build fixture](../../tests/build/built-ontology-page.test.js). These are
concrete migration obligations; exact configuration proposals and their pipeline
effects must be reviewed before any configuration change.

EVD-005 narrows the shared ownership proposal. The projection module chooses
release-specific RDF properties, preserves historical source assertions and
interprets a bounded set of historical releases. Website rendering, index
construction and query resolution all consume this policy. A private projection
policy workspace describes that responsibility more accurately than making the
website import a query-named package solely for non-query policy. Existing
historical source interpretation is retained as domain policy, not replaced by a
new compatibility layer.

The query workspace can then expose explicit domain/query, schema, artifact and
repository interfaces, with Node-only repositories kept out of the browser graph.
The MCP workspace stays CLI-only: its development/build dependencies produce the
existing prebuilt bundle, and its tarball requires no private workspace packages
or install-time compilation. Move actual private source/tooling consumers with
their owner rather than advertising package exports pointing to unshipped source.
The linked plan records exact predicted boundaries and the necessary root
orchestration, installer, asset-copy, verification and metadata effects.

## 9. Establish the accepted baseline before implementation

**Published Issue:** [#25](https://github.com/Hadden-Industries/universal-ontology/issues/25)
in `Hadden-Industries/universal-ontology`, created at `2026-09-08T20:34:41Z`.
**Exact Issue title:** `[Change]: Modernize local MCP workspace ownership and native protocol integration`.
**Labels:** `sdlc:change`, `risk:R2`, `state:ready-to-baseline`.
**Exact body file:** `docs/specs/2026-09-08-mcp-workspace-modernization-issue-body.md`.
**Usable native baseline:** [v2.json](../sdlc/baselines/issue-25/v2.json), with its
[acceptance reference and body](../sdlc/baselines/issue-25/v2.md), captured at
`2026-09-08T20:38:08.965286Z`. It is local and uncommitted, not merged.

Approved-file SHA-256 identities:

- MCP-CONFIG-01 revision 1:
  `14670a3be32b461acf3681b0282ddae7d678717216e7a1bca7968b06b0a9bdf2`.
- Normative Issue body, 21,422 UTF-8 bytes; identical to the live and v2 captured body:
  `4a535c8798fc72eeef897e46c35962176de7ba08bb2cde5e2e429bb3e2d69ecd`.

The concrete design acceptance record is task `01a081ea-cffb-7dc2-ad5f-e9e5a17913f3`,
turn `01a0829c-c5e7-7132-a18f-40698974bd32`, user message
`01a0829c-c672-7761-8b9a-267efd84cdd4`. The app reports that approval turn starting
at `2026-09-08T20:01:47Z`; this is its recorded receipt/turn time, not an invented
publication or capture timestamp. SRC-015 records the actual words.

SRC-016 is the subsequent exact configuration/Issue/capture approval in the same
task: turn `01a082b6-f61a-71f1-8869-023ca45c8a4e`, user message
`01a082b6-f6b4-7212-8c8c-6273a0812b03`, "I approve". The app reports its turn starting
at `2026-09-08T20:30:23Z`; this supplies the native snapshot's `acceptedAt`.
`acceptedBy` is `Max (@MaksymShostak)`, matching the observed GitHub login. The
snapshot Markdown records both attributable decisions. The helper does not
independently authenticate acceptance. MCP-CONFIG-01 revision 2 adds this approval
record only; its technical settings remain those of the approved revision 1.

Snapshot v1 is failed capture evidence, not an accepted alternate body. On this
Windows host the helper used Python 3.14.7 with UTF-8 mode off and preferred
encoding `cp1252`; `—` became `â€”`. Its body digest is
`2fdca79af8d8433bdbe4844e9e46cbddbdb0cae2604f5c4abee0a0afd6468502`.
Setting process-local `PYTHONUTF8=1` and rerunning the unchanged helper with
`--version 2` captured the same accepted Issue correctly. This is Python's
[supported UTF-8 mode](https://docs.python.org/3/using/cmdline.html#envvar-PYTHONUTF8),
not a repair of the helper's default decoding. Both versions remain unchanged;
the native validator rejects v1 and accepts v2 against the same live Issue.
See the [capture record](../sdlc/baselines/issue-25/README.md) for exact boundaries.

SRC-015 completes the design interview. The accepted thin plan owns the slice
definitions and traceability; this dossier owns source dispositions and decision
history. The [prepared Issue body](2026-09-08-mcp-workspace-modernization-issue-body.md)
puts normative requirements, preservation criteria, design, quality scenarios and
slice strategy in the body that the repository snapshot command will capture.
Links provide context; mutable links must not silently supply missing requirements.

1. **Exact configuration proposal approved.** [MCP-CONFIG-01](../plans/2026-09-08-mcp-workspace-configuration-proposal.md)
   records concrete manifests, scripts, exports, coverage and bundler settings.
   SRC-016 supplies its approval, distinct from SRC-015. Apply changes only within
   the later baseline-authorized, consumer-complete implementation slices.
2. **Issue published and read back.** The fresh duplicate check found none, the
   three labels already existed, and the created Issue matched the approved
   title/body and specified labels. Keep `state:ready-to-baseline` until the
   corresponding merge and lifecycle authority; do not ask for the same design again.
3. **Native baseline captured and validated; merge outstanding.** Version 2 records
   the actual Issue and attributable acceptance, and matches its title/body exactly.
   The native schema/linkage checks passed; v1 remains rejected capture evidence.
   The baseline-only PR may contain only that Issue's baseline directory, so publish
   the source/dossier/plan/configuration documentation separately under the required
   Git authority. Do not invent a number, timestamp, snapshot or merge. Capture
   records supplied acceptance; it does not authenticate it.
4. **Begin R2 implementation after the baseline is protected and unchanged in the
   base revision.** Update Issue lifecycle state only with the corresponding
   authority. Use the repository-adapted TDD procedure, accepted slice sequence,
   exact configuration approval and required full/independent evidence. Preserve
   the accepted local product boundary and the higher ontology outcome.

The development direction and concrete design are settled. Actual package, socket,
browser, host and integration evidence remains work for implementation. If a named
host requires a new contract, native reuse cannot preserve an accepted obligation,
rights/reachability changes, query/cache migration becomes necessary or the design
harms website/maintainer outcomes, present the concrete counterexample and replan.
Material changes to an accepted Issue use the changed/reacceptance path and a new
baseline version; preserve accepted history and failed evidence.

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
formatting were preserved. The accepted-motivation amendment and current design
round are recorded as `mcp-dossier-accepted-motivation` and
`mcp-workspace-design-direction`, also R0 with no new functionality. The current
round checked all 50 local Markdown file targets across this dossier and the thin
plan; none were missing. That check covers file existence, not Markdown anchors or
external URLs. The advisory source hash was rechecked against the original.
Check/profile/handoff records in `.sdlc/runtime` are mutable local evidence;
acceptance of DEC-001/003/007 comes from Max's replies in SRC-007/008/012 and the
recorded applicability check, not those local verification records. SRC-015 supplies
the subsequent concrete design acceptance. The preceding preparation task was
`mcp-accepted-design-baseline-preparation`, R0 with no new functionality. Its local
checks cannot replace the real accepted Issue or merged R2 baseline.

The authorized publication/capture task is `mcp-approved-issue-baseline`, R0 with
no new functionality, using SRC-016 as intent. It created Issue #25 and native
captures v1/v2. Exact comparison exposed v1's decoding defect; native validation
accepts v2 and rejects v1 against the same live Issue. The configuration proposal's
technical sections remained byte-identical after the approval-only amendment:
SHA-256 `0f58c14b6dc745a454d0af539d9f323c0d45beec2dfb122d745bbbaf96066800`.
This is the UTF-8 hash from its `## 1.` heading through the end, not its complete
revision 1 file identity. No implementation or helper repair was performed.

The initial `sdlc status` command reported that no active record existed; the
explicit R0 begin then succeeded. A read-only inline Node document-check command
was rejected by DCG's `core.filesystem:redirect-truncate-dynamic-path` rule before
execution. No guard setting or exception was changed. Native read-only file checks
were selected for the document review instead; the rejection remains task evidence.

During baseline preparation, DCG also rejected one combined PowerShell document
check under `core.filesystem:rm-recursive-unverified` before execution. No deletion
was requested or performed. The earlier 56-link/eight-JSON-block check had passed;
small literal native hash and identifier reads completed the remaining inspection.
The Issue body contains REQ-001 through REQ-006, AC-001 through AC-006,
QA-001 through QA-003, DEC-001 through DEC-007 and SLICE-001 through SLICE-006.
The literal whitespace search returned no matches (rg exit 1); this was not a
product test failure. The guard was not altered or bypassed.

Max then requested a pause at the next natural architectural plateau. That point
is the completed design/configuration acceptance and validated baseline capture:
the architecture is settled, Issue #25 contains the exact approved body, and v2 is
ready for the separate baseline commit/merge path. The selected focused profile
and explicit local pause record preserve the handoff; no product implementation
begins. Retain v1 as failed evidence and v2 for the future baseline-only PR. The
helper's default Windows encoding defect remains a documented follow-up. No
task-owned scratch was deleted and no new commit, push or merge was performed.
