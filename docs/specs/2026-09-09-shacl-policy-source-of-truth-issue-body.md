## Problem, affected party and desired outcome

Make SHACL the canonical source of the Universal Ontology's structural editing
requirements and generate the whole human-readable Editing Policy from it.
Contributors/reviewers should understand and repair violations without reconciling
separately maintained Python and Wiki rules. Human conceptual review remains.

This is the reconciled **local proposed body for existing Issue #31**, revised
12 September 2026 after Max confirmed the grilling decisions. It is not a remote
Issue update, acceptance timestamp, protected baseline or implementation permission.
Title: `[Change]: Make SHACL the ontology editing policy source of truth`.
Implementation route: R2; this document-maintenance task is R1.

All owned entities in each **latest active ontology version** must pass the latest
in-force rules, including unchanged entities. Every replacement candidate and the
resulting consistent versioned active module set must pass before promotion or
publication. Superseded versions are excluded from routine validation. Drafts can
remain incomplete while being prepared and receive useful diagnostics.

The only historical exception is an explicitly scoped security or comparably
critical fix: check that change and affected invariants, without modernizing the
whole old version. Previous snapshots can supply actual comparison facts for
conditional modified; this is not historical conformance validation.

Exact candidate qualification at the real publication boundary is part of initial
cutover. Automatic artifact writing/promotion and stronger release chronology are
a subsequent increment. Stricter rules activate together with prepared compliant
replacements; owned import pins cannot silently select older or newer alternatives.

## Accepted behaviour and prohibited effects

The criteria incorporate confirmed domain decisions. The actual revised Issue
still requires acceptance and protected capture/merge before R2 implementation.

| Requirement                                | Acceptance criterion and evidence                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: Canonical policy ownership        | AC-001: Every inventoried graph rule has a stable named SHACL entry, documentary metadata and independently authored fixtures. Human/procedural clauses have explicit classification. No separately maintained XML/Python copy of migrated graph predicates remains after cutover.                                                                                                       |
| REQ-002: Intended policy semantics         | AC-002: All accepted CSV and grilling decisions have positive, negative and boundary evidence where applicable. Every legacy difference has a disposition. Expected outcomes come from reviewed examples, not evaluating the shapes under test.                                                                                                                                          |
| REQ-003: Latest-version and draft scope    | AC-003: An unchanged invalid entity in a latest active version or replacement candidate blocks activation. Superseded versions are excluded. Drafts can remain incomplete with honest diagnostics. A critical historic fix checks only the authorized change and affected invariants; it cannot qualify activation.                                                                      |
| REQ-004: Complete coherent context         | AC-004: Full static rules include all owned subjects, detect cross-file duplicate holders and bad references, and exclude foreign metadata targets. Owned import pins agree with the resulting active set. Missing context or conflicting versions fail; aliases and current drafts do not silently select publication context.                                                          |
| REQ-005: Faithful input/change facts       | AC-005: Validate actual staged/candidate bytes. Native graph comparison ignores formatting and captures outgoing, shared recursive structures and own axiom changes. Incoming references alone do not change their targets. Preserve added/changed/deleted facts and input identities; missing required comparisons fail. Change facts govern conditional duties, not full static scope. |
| REQ-006: Generated readable policy         | AC-006: Deterministic Markdown covers every active graph/human clause. Hand-edited output and unsupported/missing metadata fail freshness checks. Max reviews representative sections for semantic fidelity and usability.                                                                                                                                                               |
| REQ-007: Independent validation proof      | AC-007: Native parsing/Meta-SHACL, metadata checks, independent rule/focus fixtures, full latest-set results and a second engine establish distinct claims. Mutations detect removed targets, weakened counts and changed severity; a nonempty corpus cannot pass with zero targets.                                                                                                     |
| REQ-008: Reproducibility and trust         | AC-008: Use exact local inputs and qualified authority snapshots, with no live imports, SERVICE, SHACL-JS or rule/code execution. Preserve lexical RDF and trusted fact isolation. Missing data, invalid policy, engine failure, interruption or stale source/policy/runtime evidence cannot become conformance.                                                                         |
| REQ-009: Controlled activation/publication | AC-009: Resolve every latest-active/candidate MUST violation before crossover. The real publication consumer checks the exact candidate/resulting active set and rejects stale or partial evidence. Activate stricter policy with compliant replacements. Authorized Wiki publication is read back and concurrent edits preserved.                                                       |
| REQ-010: Operational outcome               | AC-010: Retain useful rule/node/source/action reports, actual full latest-version evidence and real post-crossover use. Max accepts policy editing and violation repair. Working-file success, an install, schema, checkbox or merge alone does not prove publication or outcome.                                                                                                        |

No arbitrary historical-audit/policy-selection interface, changed-entity-only
static gate, ever-touched cohort, inferred-class rule, cycle ban, OWL reasoner,
sh:closed policy, XML spelling lint, live ORCID/checksum check, validator-generated
labels or automatic data repair is included. No legacy alias/fallback/shim.
Superseded data need no blanket cleanup; current violations must be resolved before
activation. Separate approval is required for actual ontology data edits.

## Constraints, evidence and owners

**Owner:** Max accepts domain policy, baseline and operational outcome. The
integrator owns coherent input/context/report contracts, native consumer
integration and evidence. The accepted R2 route selects independent verification
and relevant review; this proposal alone does not dispatch agents or authorize scans.

**Source evidence:** frozen Wiki revision
[819704130dee55bf04712d4cd09723d8df35581c](https://github.com/Hadden-Industries/universal-ontology/wiki/Editing-Policy/819704130dee55bf04712d4cd09723d8df35581c),
raw SHA-256 `058d398b47ee1eff27a61f49a52c161124f163991c641660d384e1f72eee50a3`;
legacy validator SHA-256
`550599fb80299101b554b20d7f6a82180020048719f5b5c73913a8c9a270dca0`.
The inventory maps all 58 assertion/failure sites and 33 substantive Wiki groups.
The unchanged independent review has SHA-256
`5f76f8cefde092f8b822d35355fde7cd173228d197965cc4e9e940f645ad970f` and was committed
with the earlier plan at `6beff3c14ec4b12a2b651fe70d0f598c864b35a8`.
Its AMBER verdict did not include local SHACL execution; this revision is not proof
that its implementation risks have been remediated.

Companions:

- [Dossier](2026-09-09-shacl-policy-source-of-truth-dossier.md): decisions,
  REQ/AC/QA, research, evidence limits and delivery boundary.
- [Rule inventory](2026-09-09-shacl-policy-rule-inventory.md): frozen sources,
  complete dispositions, ownership and concrete profile examples.
- [Implementation plan](../plans/2026-09-09-shacl-policy-source-of-truth.md):
  SLICE-000–008, exact proposed configuration scope, proof and recovery.

Five working graphs parse with RDFLib. A native property check found 739 owned
properties, all with both labels/preferred labels; that establishes presence only.
Historical XML headers were inventoried for 159 artifacts, without RDF/SHACL audit.
Neither count establishes full conformance or the currently published active set.

The legacy runner selects five working `.owl` files; the website builds dated
extensionless `src/` artifacts and selects latest aliases per directory. Working
Extended and its highest local dated artifact have different versions. Local maxima
and aliases are not live publication evidence. The inspected builder/upload wrapper
does not prove a validation dependency on exact published bytes; external upload
controls and live served state remain uninspected. SLICE-000/001/006 resolve the
actual active/candidate inventory and consumer boundary using native mechanisms.

SDLC governs building/replacing validator, renderer and integration software.
Ontology content editing uses SHACL and existing proportional repository controls;
this design creates no extra software-development lifecycle for each content edit.
No speculative SDLC comparison-input/schema extension is presumed. Prove the real
normal-command integration early, then propose only necessary owning changes.

Exact policy/configuration patches, installations, rights adoption, ontology data
edits, commits, pushes, remote writes, scans and publication remain separate actions.
Use native `npm run sdlc -- snapshot` on the actually accepted Issue revision and
merge the protected baseline before implementation. No Issue #31 baseline was
found in local main `653acdae00b6d6c7ea4ad6b31d93f724f86d0ce3` on 12 September;
this is not a refreshed remote-state claim. Do not create a duplicate Issue.

## Material risk signals

- [x] Trust boundary: untrusted RDF/policy, local snapshots, Git/process inputs and publication evidence require bounded native parsing/execution and freshness.
- [x] Persistent/public/cross-system effect: policy authority, active ontology versions, publication controls and Wiki must change coherently.
- [ ] R3 safety/critical-infrastructure obligation: none established; exact component and authority rights still require evidence.

Failure cases include omitted unchanged targets, a draft pass qualifying different
published bytes, inconsistent owned import pins, false comparison facts, lexical
normalization, stale receipts and unavailable context reported as success. Preserve
failed evidence and use reviewed forward-fix/suspension; legacy rollback is not
automatically equivalent after accepted policy changes.

## Decisions and remaining qualification

Max confirmed the decisions below. Stable IDs retain traceability; amended rows
supersede the earlier proposal. Exact implementation/configuration is still reviewable.

| ID      | Accepted decision                                                                                                                                                                                                                                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 | Ontology-level modified is optional; validate it when present.                                                                                                                                                                                                                                                                                                  |
| DEC-002 | ISO whole-name lower snake_case is SHOULD; non-ISO camelCase remains MUST.                                                                                                                                                                                                                                                                                      |
| DEC-003 | An individual's optional class-name prefix must match any one explicitly asserted class type, without inferred superclass substitution.                                                                                                                                                                                                                         |
| DEC-004 | Every preferred label has an exact same-language ordinary label; extra ordinary labels are allowed.                                                                                                                                                                                                                                                             |
| DEC-005 | At least one qualifying UUIDv4 identifier is required, including ObjectProperty and DatatypeProperty.                                                                                                                                                                                                                                                           |
| DEC-006 | Label text/language uniqueness is per entity, not global.                                                                                                                                                                                                                                                                                                       |
| DEC-007 | schema:position integer typing is restricted to owl:Axiom, using the actual http://schema.org/ predicate.                                                                                                                                                                                                                                                       |
| DEC-008 | Include all Wiki Dataset/Distribution optional-value rules, preserving optional absence, repeatability and MUST/SHOULD strength.                                                                                                                                                                                                                                |
| DEC-009 | Amended: all owned entities in each latest active version and every replacement candidate must pass current rules. Superseded versions are excluded; only an explicitly scoped security/comparably critical historic fix checks its change and affected invariants.                                                                                             |
| DEC-010 | Replaced: full static validation covers the complete active/candidate set. Change classification triggers conditional obligations only; no changed-entity-only gate or ever-touched cohort.                                                                                                                                                                     |
| DEC-011 | Correct the generated policy to standard dcat:downloadURL; no downloadUrl alias.                                                                                                                                                                                                                                                                                |
| DEC-012 | Use explicit reviewed module/provenance ownership, distinct DCAT profiles and bounded namespaces; preserve punning. Foreign support declarations do not gain owned metadata obligations. Historical roots matter only when selected in current approved scope or the critical-fix exception.                                                                    |
| DEC-013 | Use anchored ASCII PascalCase/camelCase/lower-snake grammars and the optional capitalized property-prefix exception. Thing_hasPart passes; thing_hasPart fails. ISO SHOULD applies to the whole local name.                                                                                                                                                     |
| DEC-014 | Amended: at least one preferred label in any valid English variant and at least one corresponding English spelling. Additional English spellings and other languages are allowed. Retain leading-digit-to-English-word correspondence: 3D Model and Three D Model both match ThreeDModel; this is not an XML limitation.                                        |
| DEC-015 | Identifier uniqueness spans distinct owned subjects in the coherent active corpus. Compare ordinary RDF terms and UUID values independent of hex-letter case; repeated assertions on one subject are not another holder. Extra non-UUID identifiers remain allowed.                                                                                             |
| DEC-016 | An entity change includes outgoing assertions, attached recursive restrictions/blank nodes/lists and its axiom annotations. Shared changes affect every owner; incoming links alone do not change their targets. Formatting, prefixes, triple order and blank-node labels do not count; no new inference scope.                                                 |
| DEC-017 | Changed existing entities require valid modified; ordinary editing accepts an existing valid unchanged value. New entities need no modified. Stronger release freshness remains a later increment.                                                                                                                                                              |
| DEC-018 | Retire physical default-namespace, literal rdf:about and duplicate-XML-element requirements. Retain native RDF validity/equivalence; no new serialization lint, cycle ban, reasoner or sh:closed policy.                                                                                                                                                        |
| DEC-019 | Select pySHACL/RDFLib, a bounded SHACL profile and a small deterministic Markdown renderer, with Apache Jena for independent interoperability. Exact pins, rights, runtime compatibility and installation remain qualification/approval gates.                                                                                                                  |
| DEC-020 | Generate the whole Wiki policy, including curated human/procedural clauses, from canonical policy sources. Publish separately with readback; no two-way editable copy.                                                                                                                                                                                          |
| DEC-021 | Amended: exact candidate qualification and the real publication guard are part of initial cutover. Automatic versioned artifact writing/promotion and additional release chronology are a separate accepted increment.                                                                                                                                          |
| DEC-022 | Amended: properties require only UUID identifier, Creator, Creation date, Label and Preferred label unconditionally. Definitions are optional for properties, required for Classes/NamedIndividuals. Conditional modified and accepted present-value constraints still apply to changed existing properties.                                                    |
| DEC-023 | Retain and document the legacy 16-predicate descriptive language requirement and optional generic description uniqueness by language in owned scope.                                                                                                                                                                                                            |
| DEC-024 | Use exact literal text and case-insensitive language identity; no trimming for equality/uniqueness. Retain nonblank required DCAT text checks for every value without extending that rule to every annotation.                                                                                                                                                  |
| DEC-025 | A present ontology-level modified value uses xsd:date; absence remains valid.                                                                                                                                                                                                                                                                                   |
| DEC-026 | Creator/contributor validation checks offline canonical ORCID URI format only, without checksum, live account or identity verification.                                                                                                                                                                                                                         |
| DEC-027 | One root ontology, versionIRI and versionInfo per authored module document. versionInfo is valid YYYY-MM-DD; versionIRI tail is YYYYMMDD, with existing trailing slash allowed. Optional maximum-one xsd:date modified uses YYYY-MM-DD or YYYY-MM-DDZ and matches versionInfo; other offsets/dateTime fail.                                                     |
| DEC-028 | Missing labels may be suggested from meaningful resource IRI tails, reviewed and written as real data before validation. Preserve existing labels; opaque/UUID tails need supplied labels. No validator-generated compliance values.                                                                                                                            |
| DEC-029 | SDLC applies to building/replacing validator, renderer and integration software. Content editing uses SHACL and the existing proportional workflow; no new software lifecycle per ontology edit. Prove actual normal-command integration early, without assuming a new SDLC schema.                                                                             |
| DEC-030 | Latest owned modules form a consistent explicitly versioned active set. A Core replacement may require dependent replacements. Prepare compliant data before stricter policy activation and activate both together. Aim for a freeze until crossover; if the Wiki lags, expose the enforced revision/repository source. Initial Wiki readback remains required. |

No domain question from the grilling remains open. Remaining work is qualification:
actual active publication inventory, required latest-version remediation and
dependent replacements, native command/publication integration, engine/platform
behavior, rights and performance. Complete these through the plan's experiments;
do not ask the owner to rediscover implementation facts.

The previous 26–50 engineer-day range belongs to the old scope and is not a current
total. Re-estimate after SLICE-000 inventory and SLICE-001 proof, including mandatory
latest-data remediation and publication integration. Automatic promotion and its
additional chronology remain separate work; do not defer the current candidate gate.

## Does this introduce new functionality?

The implementation does: canonical policy, validation/documentation and publication
integration replace existing behavior. This four-document revision does not implement
it. Deep reuse research in the dossier supports the selected direction; exact
adoption qualifications remain explicit gates.

## Software-selection research and adoption restrictions

The 9–11 September primary-source research selected SHACL 2017 Core/SPARQL with
bounded AF SPARQL targets, pySHACL 0.40.1, RDFLib 7.6.0 and Apache Jena 6.2.0.
Refresh versions before exact approval/install; draft SHACL 1.2 is not an adopted
dependency. Preserve lexical values through supported RDFLib settings and qualify
actual target/subclass behavior on both engines.

The dossier compares Jena, TopBraid, RDF4J, pyLODE and WIDOCO. The residual custom
gap is narrow deterministic policy Markdown and repository-specific input/change/
report integration, including exact publication qualification. Native parsers,
SHACL engines, graph comparison and source inventories retain their responsibilities.
No second constraint evaluator or general documentation platform is needed.

A no-install native pip resolution selected 20 binary distributions on Python
3.14.7/Windows. Wheel/licence evidence includes normal OWL-RL and HTML dependencies;
disabling inference does not remove them. This is resolver evidence only. Qualify
the complete hash lock, approved JDK/Jena artifacts, clean Windows/Linux execution
and exact transitive/authority rights before adoption. Registry prefixes are not
membership, and licence labels are not completed rights decisions.

The plan sequences protected baseline; one real rule/command/renderer path; complete
policy documentation; entity/ontology/axiom and DCAT rules; exact active/candidate
inputs with conditional comparisons; real verification/publication integration;
latest-set remediation and independent assurance; coordinated crossover/Wiki
readback and retirement of duplicate policy code. Native receipts and human outcome
acceptance remain required; no implementation or publication completion is claimed.
