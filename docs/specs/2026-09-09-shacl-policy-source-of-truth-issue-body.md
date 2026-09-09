## Problem, affected party and desired outcome

Make SHACL the canonical source of the Universal Ontology's structural editing
requirements, derive automated validation and the human-readable Editing Policy
from it, and retain explicit human review of conceptual quality. Contributors and
reviewers should be able to understand and repair a reported violation without
reconciling independently maintained Python and Wiki rules.

This is a **draft Issue body for Max's acceptance**, prepared on 9 September 2026.
Proposed title: `[Change]: Make SHACL the ontology editing policy source of truth`.
Proposed labels: `sdlc:change`, `state:draft`, `risk:R2`. No Issue number, acceptance
time, merged baseline, implementation evidence or publication is claimed.

Default enforcement must apply to added/changed entities after adoption. Manual
audits must work on an explicitly selected ontology version or current working
sources and identify existing defects. Do not require a wholesale cleanup of
untouched historical data before cutover.

Max also wants eventual automatic promotion of working ontology files into dated
`src/` artifacts after structural and release-history checks. Proposed boundary:
build the read-only validation and explicit snapshot-comparison capabilities here;
deliver artifact writing and stricter release qualification as a separate accepted
increment consuming those capabilities. Editing checks accept an existing valid
modified value; publication freshness is a release responsibility.

## Accepted behaviour and prohibited effects

The section title follows the repository's Change form. The criteria below are
**candidate acceptance criteria** until Max accepts this actual Issue revision.
Already accepted domain decisions are identified separately below.

| Requirement                               | Observable acceptance criterion                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-001 — Canonical policy ownership      | AC-001: every inventoried graph rule has a stable named SHACL entry, documentary metadata and fixture evidence. Human/procedural clauses have an explicit execution classification. Migrated graph predicates have no separately maintained XML/Python implementation after cutover.                                                                                                       |
| REQ-002 — Intended policy semantics       | AC-002: preserve the eight CSV decisions and subsequent explicit answers; cover positive, negative and boundary examples. Every additional policy difference has an accepted disposition. Expected results are independently authored, not calculated by the shapes being tested.                                                                                                          |
| REQ-003 — Default and manual scope        | AC-003: an untouched legacy violation is visible in a manual audit but does not alone block default change validation. Editing that entity brings its applicable rules into scope. Every report identifies selected input and policy versions.                                                                                                                                             |
| REQ-004 — Complete graph context          | AC-004: detect a changed subject's collision with an unchanged subject and invalid references across files. Imported support vocabularies do not acquire unintended metadata obligations. Different historical versions are not combined into an artificial duplicate population. Missing required context cannot produce a full-conformance pass.                                         |
| REQ-005 — Faithful semantic changes       | AC-005: validate actual staged bytes. Ignore serialization-only changes; include outgoing assertions, owned recursive blank nodes/lists and axiom annotations. Preserve added/changed/deleted classifications. Deleted subjects need no new metadata; affected surviving references are checked. Snapshot comparison is independent of physical path and fails honestly on missing inputs. |
| REQ-006 — Generated readable policy       | AC-006: deterministic Markdown covers every active graph and human clause. Hand edits to generated output fail freshness checks; unsupported constraint metadata cannot disappear silently. Max reviews representative sections for semantic fidelity and usability.                                                                                                                       |
| REQ-007 — Independent validation evidence | AC-007: native parsing/Meta-SHACL, metadata checks, independent rule fixtures, corpus diagnostics and a second engine establish distinct claims. Negative controls detect missing targets, weakened counts and changed severity. Zero selected targets cannot masquerade as meaningful validation.                                                                                         |
| REQ-008 — Reproducibility and trust       | AC-008: use explicit local inputs and identified authority snapshots without live imports, SPARQL SERVICE, SHACL-JS or rule/code execution. Malformed input, unavailable context, engine errors and interruption cannot be reported as conformance. Preserve input provenance and useful diagnostics.                                                                                      |
| REQ-009 — Controlled cutover/publication  | AC-009: every legacy/SHACL mismatch has an accepted disposition. Default enforcement changes only at accepted cutover. Authorized Wiki publication is read back with source/content identity; interrupted or concurrent changes are reconciled without force overwrite.                                                                                                                    |
| REQ-010 — Useful operational outcome      | AC-010: retain actionable rule/node/source diagnostics, full current-source audit results and real post-adoption use. Max accepts a policy-editing and violation-repair walkthrough. Passing unit tests alone does not close the outcome.                                                                                                                                                  |

No blanket ontology repairs, retrospective enforcement cohort, inferred class
membership policy, cycle ban, OWL consistency deployment, sh:closed policy, live
ORCID lookup, two-way Wiki synchronization or unattended Wiki credentials are
included. Release promotion and deployment are not part of the first cutover.
No compatibility alias, fallback to the old validator or other shim is proposed.

## Constraints, evidence and owners

**Owner:** Max accepts policy, design and outcome. The integrator owns coherent
target/context/change/report contracts and evidence. Independent review is selected
for the accepted R2 risks; this draft does not authorize delegation or a live scan.

**Source evidence:** the current Wiki page revision is
[819704130dee55bf04712d4cd09723d8df35581c](https://github.com/Hadden-Industries/universal-ontology/wiki/Editing-Policy/819704130dee55bf04712d4cd09723d8df35581c).
Captured raw bytes have SHA-256
`058d398b47ee1eff27a61f49a52c161124f163991c641660d384e1f72eee50a3`.
The legacy validator has SHA-256
`550599fb80299101b554b20d7f6a82180020048719f5b5c73913a8c9a270dca0`.
The inventory maps all 58 assertion/failure call sites, preprocessing and the
Wiki's substantive clauses. This is static evidence, not a SHACL qualification run.

The local companion documents are:

- `docs/specs/2026-09-09-shacl-policy-source-of-truth-dossier.md`: purpose,
  decisions, requirements, quality scenarios, reuse research and release boundary;
- `docs/specs/2026-09-09-shacl-policy-rule-inventory.md`: source identities,
  clause/assertion dispositions, examples and current/historical context inventory;
- `docs/plans/2026-09-09-shacl-policy-source-of-truth.md`: ordered implementation
  slices, affected integration/configuration surfaces, evidence and cutover.

Related completed work:
[Issue #2](https://github.com/Hadden-Industries/universal-ontology/issues/2) created
the original quality check and
[Issue #3](https://github.com/Hadden-Industries/universal-ontology/issues/3) integrated
it into the contribution workflow. This migration changes policy ownership,
semantics and generated documentation, so it warrants its own accepted baseline.

Before final Issue acceptance/capture, identify their actual reviewed Git revision
and ensure the reviewer can access that revision. These local paths do not claim
the documents have been pushed or incorporated into a protected baseline.

The five working graphs parse locally with RDFLib; reference-data has 139 Datasets
and 147 Distributions. A header inventory of 159 historical source artifacts also
finds older ISO/IEC namespaces at standards.iso.org. Explicitly recognize approved
historical module provenance; a Hadden-only target prefix is insufficient. Native
XML parsing of those headers is not historical SHACL validation.

Reuse the existing runner's source selection and pre-install planning, Git index
and commit reads, build source inventory and consumer parsers. Working-source
audits select one working graph per module. Exact release audits select explicit
artifacts and versioned local context. These are separately identified corpus
modes; never silently mix today's drafts with yesterday's imported release data.

The `.venv` and existing locked development dependencies were initialized through
the repository's package commands; Max approved exact local SDLC activation.
Node 24.20.0, npm 12.0.2 and Python 3.14.7 were observed in this worktree. This is
not permission for new dependencies or evidence of pySHACL/Jena qualification.

Exact configuration changes, installations, commit scope/message, pushes, GitHub
writes, live scans and Wiki publication retain their separate authorization
requirements. For R2, capture an actually accepted Issue with the native
`npm run sdlc -- snapshot` procedure and merge that baseline before implementation.

## Material risk signals

- [x] Auth, tenant isolation, sensitive data, trust boundary or privileged input handling — untrusted RDF/policy input and future CI integration require bounded parser/execution behavior; no new credentials are proposed.
- [x] Persistent data, migration, public contract, concurrency or difficult recovery — contribution policy, merge enforcement and a separately published Wiki change together.
- [ ] Material legal, financial, safety or critical-infrastructure obligation — no R3 obligation has been established; exact dependency and authority-snapshot rights still require evidence.

Proposed route: R2. Important failure cases include target disappearance, incorrect
incremental scope, lexical normalization hiding a UTC error, staged/working-byte
confusion, cross-version uniqueness failures, a broken policy rendering that looks
current, and unavailable context reported as success. Reverting to legacy code is
not an equivalent rollback after intentional policy corrections; use accepted
suspension/forward-fix procedures and preserve failed evidence.

## Open decisions and justified exceptions

Accepted in the originating task:

| ID      | Accepted decision                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Ontology modified is optional; validate it when present.                                                                                        |
| DEC-002 | ISO lower snake_case is SHOULD; non-ISO camelCase remains MUST.                                                                                 |
| DEC-003 | An individual's optional class-name prefix must match any one of its explicitly declared class types, without inferred superclass substitution. |
| DEC-004 | Every preferred label needs an exact same-language ordinary label; extra ordinary labels are allowed.                                           |
| DEC-005 | UUID identifier requirements include ObjectProperty and DatatypeProperty.                                                                       |
| DEC-006 | Label text/language uniqueness is per entity, not global.                                                                                       |
| DEC-007 | schema:position integer typing is restricted to owl:Axiom.                                                                                      |
| DEC-008 | Include all Wiki Dataset/Distribution optional-value constraints, preserving optional absence and MUST/SHOULD strength.                         |
| DEC-009 | Support manual checks of any chosen version; default to added/changed entities after adoption.                                                  |
| DEC-017 | Ordinary editing accepts an existing valid unchanged modified value; enforce freshness in the release-promotion increment.                      |
| DEC-025 | A present ontology-level modified value must use xsd:date; absence remains valid.                                                               |
| DEC-026 | Offline creator/contributor ORCID checks validate URI format only, without checksum or live account checks.                                     |

Proposed for owner acceptance with the inventory's concrete examples:

| ID      | Proposed decision                                                                                                                                                                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-010 | Default scope is the current base/head semantic change set after the adoption boundary, rather than everyone ever touched since adoption. A touched entity receives all applicable rules.                                                                                                                                                                |
| DEC-011 | Correct the published spelling to standard dcat:downloadURL; introduce no alias for downloadUrl.                                                                                                                                                                                                                                                         |
| DEC-012 | Use explicit module ownership and distinct DCAT profiles, including inventoried historical ISO namespaces. Preserve punning, scope imported support resources separately, and report uninventoried label-namespace data as out of scope.                                                                                                                 |
| DEC-013 | Adopt the inventory's anchored ASCII naming grammars and exact capitalized property-prefix exception. Assess the ISO lower-snake recommendation on the whole local name.                                                                                                                                                                                 |
| DEC-014 | English means exact case-insensitive en/en-gb; only those labels undergo ASCII alphanumeric, case-insensitive local-name correspondence. Follow the published spelled-out leading-digit instruction: Three D Model matches ThreeDModel; 3D Model does not.                                                                                               |
| DEC-015 | Uniqueness spans distinct owned subjects in the selected coherent corpus. Compare ordinary identifier RDF terms; compare valid UUID URNs by UUID value independent of hex-letter case. Do not require lowercase generic UUID URNs merely because DCAT subject IRIs require canonical lowercase.                                                          |
| DEC-016 | Compare outgoing assertions, attached recursive blank nodes/lists and annotatedSource-owned axiom annotations using native graph isomorphism. Shared blank-node edits affect each owner; incoming links alone do not require modified on their targets, but reference dependencies are checked.                                                          |
| DEC-018 | Retire physical XML namespace, rdf:about-spelling and duplicate-element checks. Preserve native RDF identity/validity and record any later serialization lint as an individually accepted requirement.                                                                                                                                                   |
| DEC-019 | Qualify pySHACL/RDFLib plus a bounded deterministic Markdown renderer; use Apache Jena for independent interoperability evidence. Exact pins, runtime compatibility and rights remain qualification gates.                                                                                                                                               |
| DEC-020 | Generate the entire Wiki page, including curated human clauses, from canonical policy sources; separately authorize and verify Wiki publication.                                                                                                                                                                                                         |
| DEC-021 | Keep read-only validation/comparison in this migration; deliver release qualification and automatic promotion as a separately accepted increment.                                                                                                                                                                                                        |
| DEC-022 | Apply all published generic entity metadata duties to properties as well as Classes/NamedIndividuals, closing the broader legacy omission.                                                                                                                                                                                                               |
| DEC-023 | Explicitly retain and document the legacy 16-predicate language-tag rule and optional generic description uniqueness per language within the approved ownership scope.                                                                                                                                                                                   |
| DEC-024 | Preserve exact literal text and case-insensitive language identity; do not trim for equality/uniqueness. Retain nonblank required DCAT text checks on every value; do not silently impose a new nonblank rule on every annotation.                                                                                                                       |
| DEC-027 | Require one root ontology and one version IRI/info per authored module document, with valid YYYY-MM-DD versionInfo and YYYYMMDD versionIRI tail. Optional maximum-one xsd:date modified uses YYYY-MM-DD or YYYY-MM-DDZ and matches the written version date; no other offset or dateTime. Check each authored document separately from imported headers. |

The recommendations above form the concrete policy proposal for baseline review;
no unanswered refinement blocks preparation of this Issue. DEC-014 follows the
published spelled-out-label instruction. DEC-027's header/cardinality profile is
a proposal alongside the other proposed decisions. Accepted DEC-026 uses canonical
ORCID HTTPS URI format: four hyphenated four-character groups, digits except an
allowed final uppercase X, and no query/fragment/trailing slash. Checksum validity,
account existence and contributor identity are outside that check. No shim
exception or general configuration waiver is requested.

The future release increment should compare explicit previously published and
candidate snapshots, catch changed entities with stale metadata, reconcile the
ontology date/version with relevant entity dates and support safe immutable
promotion. Same-day collisions, deletion/import-only changes, date precision,
actual publication time versus content date, and exact promotion/write authority
need that increment's own concrete acceptance. Do not use this Issue to invent
historical timestamps or mark an unpublished source as previously published.

The baseline will use the current explicit comparison for both contribution
validation and its full-assurance integration. A missing comparison is a context
error. It will not introduce an implicit since-adoption cohort as an additional
default gate; manual full-source audits remain explicitly identified diagnostics.

## Does this introduce new functionality?

Yes — deep reuse research is required before design/implementation. This is a new
canonical policy and validation/documentation integration, even though it replaces
existing checks. The dossier contains the primary-source comparison; exact
component and authority-snapshot adoption qualifications remain explicit gates.

## Software-selection research and adoption restrictions

The recorded proposal uses the stable SHACL Recommendation's supported Core and
SPARQL capabilities. SHACL 1.2 remains a draft and is not an unqualified deployment
dependency. Research identified pySHACL 0.40.1, RDFLib 7.6.0 and Apache Jena 6.2.0;
recheck release identity before the exact installation proposal. RDFLib already
supplies parsing, query and graph-isomorphism capabilities. Preserve lexical RDF
literals through its supported normalization setting and qualify actual engine
target/subclass behavior instead of inferring it from `inference=none`.

Alternatives assessed in the dossier include Jena as the primary engine,
TopBraid SHACL API, RDF4J SHACL, pyLODE and WIDOCO. pyLODE's inspected native SHACL
documentation path produces HTML; it does not directly supply the required Wiki
Markdown with curated procedural clauses. The residual custom work is a narrow
deterministic policy projection and repository-specific snapshot/change/report
integration. Do not build a second constraint evaluator or a generic ontology
documentation platform.

Apache-2.0/BSD licence evidence is recorded for proposed engines/libraries and
alternatives. Exact transitive releases, riders, Python/Java compatibility and
IANA/LOC/EU authority snapshot provenance and rights must be qualified at their
adoption slices. A registry URL prefix is not membership, and a licence label is
not a completed rights decision. No installation is performed by accepting this
draft's direction alone.

Native pip has successfully resolved the proposed direct pins together with both
existing requirements files to 20 binary distributions on Python 3.14.7/Windows.
The primary wheels, five additional dependency wheels and their licence records
were inspected without installation. The selected path includes OWL-RL's W3C
licence and RDFLib's HTML extra; neither disappears merely because inference and
optional server/JS features are disabled. The dossier records exact wheel/report
hashes. This is resolver evidence, not engine execution, Linux qualification or
complete transitive rights clearance.

The plan sequences: baseline acceptance; one complete rule-to-report/text path;
full deterministic policy rendering; entity/ontology/axiom constraints; DCAT and
local authorities; semantic snapshot selection; CLI/hook/CI integration;
reconciliation and independent assurance; authorized cutover/Wiki publication and
legacy retirement. Retain failures, scope provenance and the actual owner
walkthrough throughout. Release promotion follows as separate work.
