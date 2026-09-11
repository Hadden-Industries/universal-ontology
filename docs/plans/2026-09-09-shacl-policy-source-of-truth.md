# SHACL policy source of truth implementation plan

Status: proposed implementation plan, revised 12 September 2026 after the
independent review and Max's confirmed grilling decisions. Domain decisions below
are accepted; this document is not a protected R2 baseline or permission to implement.

**Goal:** Author graph-level editing requirements once in SHACL and generate the
Wiki policy from that source. Every owned entity in each **latest active ontology
version**, including unchanged entities, must satisfy the latest in-force rules.
Check a replacement candidate in full before promotion/publication. Superseded
versions are outside routine validation; incomplete drafts can receive diagnostics.

**Design and authority:** Read the [change dossier](../specs/2026-09-09-shacl-policy-source-of-truth-dossier.md),
[rule/source inventory](../specs/2026-09-09-shacl-policy-rule-inventory.md) and
[draft Issue body](../specs/2026-09-09-shacl-policy-source-of-truth-issue-body.md).
Max's final shared-understanding confirmation on 12 September governs this revision.
It supersedes the earlier changed-entity-only and arbitrary historical-audit scope.
The earlier source inspections at `b32d7cff65e57a4d4ea68334350e27b8ef5038ef` and
`36a51ff4bb76b98c59fe7fe3d225b8762ab23eeb` retain their recorded evidence scope.
The plan and original independent review were committed at
`6beff3c14ec4b12a2b651fe70d0f598c864b35a8`. Local main inspected on 12 September is
`653acdae00b6d6c7ea4ad6b31d93f724f86d0ce3`; no Issue #31 baseline was found there.
This is a local observation, not a fresh claim about remote or deployed state.

**Architecture:** Native RDF parsing and SHACL evaluation consume a canonical
policy graph, explicit ontology snapshots and pinned authority data. A small
repository boundary supplies Git change context and presents results. A
deterministic renderer generates policy Markdown; fixtures and human acceptance
provide independent evidence of meaning.

**Proposed stack:** Existing Python 3.14.7/.venv and npm entry points; qualify
pySHACL 0.40.1 with RDFLib 7.6.0; SHACL Core/SPARQL with explicitly bounded AF
SPARQL targets; Apache Jena 6.2.0 with an explicitly provisioned supported JDK
(Java 21 minimum) for interoperability. Python transitives and platform artifacts
must be hash-locked. All selections must be refreshed at installation and exact
changes approved. No new service.

**Implementation procedure:** Use only
[the repository-adapted TDD skill](../../.sdlc/skills/test-driven-development/SKILL.md).
Use test-first for new behavior; characterize preserved behavior honestly. A
missing dependency/import is not behavioral RED. This plan specifies contracts,
counterexamples and proof rather than invented implementation code. No automatic
commit, reviewer dispatch, security scan or publication is authorized by a checkbox.

## Independent review synthesis and disposition

The [independent review](../reviews/Verification%20of%20the%20SHACL%20Policy%20Source-of-Truth%20Implementation%20Plan.md)
judges the architecture credible but implementation readiness conditional. Retain
its AMBER verdict and execution limits: it did not run this repository locally,
and its cited CI run validates the legacy path. Its source diagram must also be
read with one correction: Markdown is rendered from the canonical policy graph,
not from validation findings. A conforming run cannot omit undocumented rules.

The source review remains the original assessment. Its incorporation is not proof
of remediation. `REV` IDs preserve its concerns; the agreed scope changes their
resolution without rewriting the review or the dossier's stable IDs.

| Review concern                                    | Disposition after the agreed clarification                                                                                                                     | Closure evidence                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| REV-001 / P0: obligations leak into Python        | Python supplies trusted comparison/ownership facts; canonical SHACL owns conditional modified, constraints and severity.                                       | REQ/AC-001/005/008; SLICE-001/005. Mutate applicability while holding facts fixed.                                       |
| REV-002 / P0: targets disappear or broaden        | All applicable owned subjects in the latest active/candidate set receive static rules. Changed-entity selection no longer narrows that population.             | REQ/AC-003/004/007; SLICE-001/005/007. Expected rule/focus sets include unchanged invalid subjects and anonymous axioms. |
| REV-003 / P0: direct pins do not freeze Python    | Complete native pip lock with reviewed artifacts and clean-install proof.                                                                                      | REQ/AC-008; SLICE-001/006. Hash, transitive and environment-drift failures.                                              |
| REV-004 / P0: Jena runtime is unspecified         | Qualify the approved JDK/Jena path early on Windows and Linux.                                                                                                 | REQ/AC-007/008; QA-005; SLICE-001/007. Actual native reports.                                                            |
| REV-005 / P0-P1: corpus evidence becomes optional | Full latest-active/candidate conformance is mandatory and blocking at activation; draft diagnostics cannot qualify it.                                         | REQ/AC-003/009/010; QA-006; SLICE-006/007. An unchanged current defect blocks activation.                                |
| REV-006 / P1: historical corpus meaning           | General historical audits and old-policy selection are removed. Exact active/candidate imports and the narrow critical historical-fix exception are specified. | REQ/AC-003/004/005; SLICE-000/005. Superseded versions excluded; mixed owned pins fail.                                  |
| REV-007 / P1: authority provenance/rights         | Retain raw source identity, rights, transformation, counts and hashes before adoption.                                                                         | REQ/AC-004/008; QA-004; SLICE-004. Native reconciliation and corruption/impersonation failures.                          |
| REV-008 / P1: repository movement                 | Refresh real consumers and trusted baseline before implementation/configuration approval.                                                                      | SLICE-000/001/006. Candidate and runtime freshness through actual consumers; no speculative SDLC schema extension.       |
| REV-009 / P1: platform qualification              | Name Windows/Linux runtime and fixture surfaces; require parity.                                                                                               | REQ/AC-006/007/008; QA-005; SLICE-001/006/007. Missing execution remains a gap.                                          |
| REV-010 / P2: performance/coverage                | Preserve the 600-second ceiling, measure representative full inputs and obtain numerical usability budgets. Compare stable coverage sets.                      | REQ/AC-001/007/010; QA-007; SLICE-001/002/007.                                                                           |

This revision is R1 proposal maintenance under the current accepted task.
Implementation remains R2 because it changes validator software, enforcement and
publication integration. SDLC governs that software work; this proposal adds no
separate software-development lifecycle to each ontology content edit. Contributors
use SHACL and the repository's existing proportional content workflow.

Reconcile the actual revised documents with existing
[Issue #31](https://github.com/Hadden-Industries/universal-ontology/issues/31) when
authorized, then obtain/capture/merge the accepted implementation baseline. The
Issue's proposal status was inspected on 11 September; it was not refreshed here.
A label or local snapshot is not acceptance. Never edit an old accepted snapshot
to absorb changed requirements.

## Agreed policy and delivery boundary

- **Latest means a version boundary:** all owned entities in each latest active
  version must pass, even if untouched for years. Superseded versions need no
  retrospective cleanup. At crossover the current active set must pass.
- **Drafts and activation:** drafts can be incomplete; diagnostics support repair.
  The exact replacement candidate and resulting active module set must pass before
  promotion/publication. A diagnostic result cannot authorize activation.
- **Historic exception:** an explicitly scoped security or comparably critical fix
  to a historic document checks only that change and its affected invariants. It
  cannot claim whole-version conformance or activate that historic version.
- **Properties:** the only unconditional mandatory fields are UUID identifier,
  Creator, Creation date, Label and Preferred label. Definitions remain required
  for Classes/NamedIndividuals, optional for properties. Conditional modified and
  accepted present-value constraints still apply to existing changed properties.
- **Labels:** at least one preferred label must use any valid English variant;
  at least one English preferred label must correspond to the identifier.
  Additional English spellings and other languages remain allowed. `3D Model`
  and `Three D Model` may correspond to `ThreeDModel`. Missing labels can be
  suggested from meaningful IRI tails, reviewed and written as ontology data;
  validation never invents them. Existing labels are preserved.
- **Active imports and stricter rules:** owned modules form a consistent explicitly
  versioned active set. Replacing Core may require new dependent versions. Prepare
  compliant replacements before activating stricter rules; activate policy and
  those versions together. Never silently substitute a newer import.
- Preserve the remaining accepted decisions, including ISO naming as SHOULD,
  optional ontology modified, offline ORCID format checks and RDF equivalence.
  No XML spelling lint, inferred class policy, cycle ban, OWL reasoner, sh:closed,
  automatic data repair, live ORCID lookup or checksum check is added.
- R2 implementation requires a protected accepted baseline. Exact policy,
  configuration, installation, data-remediation and publication actions retain
  their separate approvals. These four proposal documents change none of them.
- Use current stable/newest applicable supported LTS components and native
  consumers. No legacy aliases, fallback validator, patched internals or shims.
  Parallel legacy observation is a finite migration experiment.
- Exact candidate validation and its real publication guard belong to this first
  cutover. Automatic artifact writing/promotion and stronger release chronology
  remain a separately accepted increment. The earlier effort range must be revised
  for mandatory active-data remediation and publication integration.

## Proposed files and ownership

These paths predict responsibilities; they are not instructions to create every
file immediately. Fold small pieces together when a separate module has no real
consumer. Domain-based policy files keep Core/SPARQL/prose for one rule together.

| Paths                                                                                                                                                   | Responsibility / consumer                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `policy/editing-policy.ttl`                                                                                                                             | Canonical policy metadata, rule groups, ordering, local module references and human/procedural clauses. Local references do not authorize HTTP imports.                                                                                                   |
| `policy/entity-policy.ttl`                                                                                                                              | Accepted metadata by entity kind, naming, labels, identifiers and rule documentation.                                                                                                                                                                     |
| `policy/ontology-policy.ttl`                                                                                                                            | Ontology version alignment and named global rules.                                                                                                                                                                                                        |
| `policy/dataset-distribution-policy.ttl`                                                                                                                | DCAT profiles, optional-property constraints and registry selection.                                                                                                                                                                                      |
| `policy/axiom-policy.ttl`                                                                                                                               | Axiom-specific constraints and their documentation.                                                                                                                                                                                                       |
| `policy/policy-metadata-shapes.ttl`                                                                                                                     | SHACL validation of the renderer/runner's policy metadata contract; not a second encoding of ontology editing rules.                                                                                                                                      |
| `policy/validation-context-shapes.ttl`                                                                                                                  | Native validation of runner-supplied mode, snapshot, ownership and change facts; target queries and editing obligations stay with their owning policy rules.                                                                                              |
| `policy/activation.ttl`                                                                                                                                 | Proposed reviewed active module/version and policy identities, with a known predecessor. Reuse existing inventory/publication records; no ever-touched cohort or self-referential commit hash.                                                            |
| `policy/authorities/`                                                                                                                                   | Approved, immutable local vocabulary snapshots and source/rights/hash records. Derived membership lists are generated from these records.                                                                                                                 |
| `scripts/ontology_policy/`                                                                                                                              | Cohesive package for policy loading, exact active/candidate/draft snapshots, conditional change facts, native execution and reports. Split modules only as actual contracts emerge.                                                                       |
| `scripts/validate_ontologies.py`                                                                                                                        | Retained operational CLI, pre-install selection and mode/error handling; invokes the new package directly at cutover.                                                                                                                                     |
| `scripts/render_editing_policy.py`                                                                                                                      | Deterministic Markdown generation and a read-only `--check` mode.                                                                                                                                                                                         |
| `scripts/update_policy_authorities.py`                                                                                                                  | Only the residual snapshot ingestion/export needed after native format research; explicit maintenance command, no scheduler.                                                                                                                              |
| Existing source/build/publication consumers                                                                                                             | Qualify the exact candidate and resulting active set through `scripts/build/sourceInventory.js`, `scripts/build/ontologyAssets.js` and `scripts/upload_to_s3.py`; propose only the smallest necessary owning changes after inspection and exact approval. |
| `tests/test_ontology_policy.py`, `tests/test_editing_policy_rendering.py`, `tests/test_ontology_entity_changes.py`, `tests/test_ontology_policy_cli.py` | Native unittest-discovered contracts at real consumer boundaries; use small independently authored fixtures.                                                                                                                                              |
| `tests/fixtures/ontology-policy/`                                                                                                                       | Positive/negative graphs, expected native reports, paired Git scenarios and minimal authority fixtures. Preserve existing fixture formats where applicable.                                                                                               |
| `docs/policy/Editing-Policy.generated.md`                                                                                                               | Reviewed generated view. Entire page comes from policy sources; not a separately maintained rule catalogue.                                                                                                                                               |
| `docs/policy/migration-evidence.md`                                                                                                                     | Rule/assertion dispositions and retained evidence references; freeze after cutover, do not keep it as a second normative policy.                                                                                                                          |
| `requirements.txt`, `requirements.lock.txt`, `.java-version`, `package.json`, `.github/workflows/ontology-validation.yml`, `.sdlc/verification.json`    | Exact approved dependency, runtime and integration changes described below. The lock covers both existing requirements inputs and their transitives.                                                                                                      |
| `scripts/setUpDevelopmentEnvironment.js`                                                                                                                | Make the existing setup consumer install the reviewed locked environment; qualify its actual pip/bootstrap path rather than adding a parallel installer. Exact setup changes require approval.                                                            |

The integrator owns the cross-file context/target/change/report contracts. A future worker
must receive exact file ownership and accepted oracle references; independent
reviewers do not edit their target. No parallel writes are planned across coupled
policy vocabulary, target semantics or fixture expectations.

## Rule inventory and proposed fixture oracles

The [SLICE-000 inventory](../specs/2026-09-09-shacl-policy-rule-inventory.md) now maps
the frozen Wiki clauses and every legacy assertion call site. The catalogue below
groups the planned rule families. Static coverage is not accepted semantics or
executed fixture coverage. Break a row into separate named
constraints where normative strength or scope differs. IDs below are proposed
durable editing-rule IDs, separate from migration `REQ`/`AC` IDs.

| Rule family                  | Intended obligation / source                                                                                                                              | Discriminating examples and proof                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EP-ONT-VERSION               | Version IRI/info alignment; optional ontology modified uses xsd:date only. Accepted DEC-001/025/027 header profile.                                       | Matching version without modified passes; matching date passes; mismatched, malformed or dateTime modified fails. Use the accepted inventory examples as independent shape oracles.                                                                              |
| EP-ENTITY-CREATED            | Exactly one UTC `xsd:dateTime` creation value.                                                                                                            | Missing, two distinct timestamps, wrong datatype, invalid date and `+00:00` instead of lexical `Z` fail; a real `Z` value passes after native parsing.                                                                                                           |
| EP-ENTITY-CREATOR            | Exactly one creator IRI with canonical ORCID URI format. Accepted DEC-026.                                                                                | Missing/two values/literal/malformed URI fail. A syntactically correct URI with an invalid checksum passes this limited rule; account registration and person identity are not asserted. Apply the same value rule to optional contributors.                     |
| EP-ENTITY-UUID               | At least one qualifying UUIDv4 URN on Class, NamedIndividual, ObjectProperty and DatatypeProperty. DEC-005.                                               | One fixture per kind; missing UUID fails; version-1 UUID and bad variant fail even if Python's `UUID(..., version=4)` accepted them. A valid UUID plus permitted non-UUID identifiers passes.                                                                    |
| EP-IDENTIFIER-UNIQUE         | Distinct subjects in the selected corpus do not share an identifier, under DEC-015's accepted comparison.                                                 | A touched subject duplicates an untouched subject in another file: fail. Same subject's fragments in two files: not a second holder. Old/new release copies are not unioned.                                                                                     |
| EP-CLASS-NAME                | Class local name is PascalCase within approved scope.                                                                                                     | `RiskEvent` passes; `risk_event` fails; external declarations are not targets. Cover fragment and slash IRIs.                                                                                                                                                    |
| EP-INDIVIDUAL-NAME           | PascalCase suffix, optional exact asserted-class prefix. DEC-003.                                                                                         | `Red` and `Colour_Red` typed `Colour` pass; unrelated prefix, empty suffix, arbitrary underscore stripping and inferred-only superclass prefix fail. With two asserted classes, either prefix passes.                                                            |
| EP-PROPERTY-NAME             | Non-ISO camelCase MUST; ISO lower snake_case SHOULD. DEC-002/013.                                                                                         | Invalid non-ISO token fails; ISO uppercase token produces warning only; lower snake_case has no naming warning. Include `iso/`, `iso-iec/` and a misleading lookalike prefix.                                                                                    |
| EP-PREFLABEL-LANGUAGE        | At least one preferred label in any valid English variant; at most one per language tag. Other languages remain allowed. DEC-014.                         | `en`, `en-GB` and `en-US` each satisfy English coverage; Romanian alone fails; English plus Romanian passes. Qualify an English subset, not an all-values English restriction.                                                                                   |
| EP-PREFLABEL-IRI             | At least one English preferred label corresponds to the identifier with accepted ASCII/prefix/leading-digit rules. DEC-003/013/014.                       | `Colour`@en-GB and `Color`@en-US may coexist on `Colour`; one matches. `3D Model` and `Three D Model` each match `ThreeDModel`. This is policy correspondence, not an XML name rule.                                                                             |
| EP-PREFLABEL-LABEL           | Each preferred RDF literal is also a label. DEC-004.                                                                                                      | Matching preferred terms plus additional labels pass; a preferred term lacking a same-language, exact-text label fails. Case/punctuation changes in the label do not silently match.                                                                             |
| EP-LABEL                     | Language-tagged labels; duplicate text/language constraint is per entity. DEC-006.                                                                        | Two entities with `"Bank"@en` pass; several different English labels on one entity pass; identical serialized triples collapse semantically. No cross-entity or one-per-language rule is added.                                                                  |
| EP-DEFINITION                | Definitions required for Classes/NamedIndividuals; optional for properties, with language and at-most-one-per-language checks when supplied. DEC-022/023. | A property without definition passes; a Class without definition fails. Untagged or two English definitions fail when present. Conceptual adequacy remains human review.                                                                                         |
| EP-DESCRIPTIVE-LANGUAGE      | Accepted DEC-023 retains and documents the 16-predicate language requirement in owned scope, including owned axiom annotations.                           | Untagged skos:editorialNote on an owned subject fails; external support terms do not gain that obligation. No new requirement on arbitrary other predicates.                                                                                                     |
| EP-DESCRIPTION-LANGUAGE      | Accepted DEC-023: optional generic descriptions have at most one value per language.                                                                      | Absence passes; two distinct English descriptions fail; different languages pass. Dataset requirements remain in their separate profile.                                                                                                                         |
| EP-MODIFIED / EP-CONTRIBUTOR | Changed existing entity has one well-formed modified value; dateTime uses `Z`, date allowed. Optional contributor values are ORCID IRIs. DEC-016/017.     | New entity need not have modified; changed existing one without it fails; syntax-only change does not trigger it. Existing valid timestamp behavior follows the accepted DEC-017 interpretation. Multiple contributors allowed; wrong-value tests apply to each. |
| EP-OPTIONAL-ANNOTATIONS      | references/source/seeAlso MAY repeat; acronym requires language; externally derived definition SHOULD cite source.                                        | Absence of optional values passes. A missing acronym language fails. Do not invent value node kinds for MAY-only clauses; externally derived provenance is a human decision unless represented explicitly.                                                       |
| EP-DATASET-TYPE-IRI          | Dataset profile, explicit types as accepted, canonical lowercase UUIDv4 dataset IRI.                                                                      | Wrong namespace, noncanonical UUID and absent required explicit type fail. Type-only and namespace-only candidates prevent omission of a type from evading the profile. DCAT nodes do not also receive incompatible PascalCase rules.                            |
| EP-DATASET-REQUIRED          | At least one theme IRI, title, description and label with the stated language/description uniqueness rules.                                               | Missing required property fails; all theme values checked, including a bad second one; repeated-language descriptions fail. Distinct same-language titles/labels remain allowed.                                                                                 |
| EP-DATASET-DISTRIBUTION      | Optional `dcat:distribution`: every supplied value is an IRI referencing the required Distribution/NamedIndividual type.                                  | Absent passes; correct cross-file target passes; literal, untyped target or wrong-type target fails. Context must contain the authoritative local declaration, not a live fetch.                                                                                 |
| EP-DATASET-LANDING           | landingPage MAY repeat; original-provider intent remains a human rule.                                                                                    | No invented mandatory count or IRI constraint. Generated review guidance distinguishes provider judgment from any accepted machine check.                                                                                                                        |
| EP-DATASET-ACCESS-RIGHTS     | Optional: maximum one accessRights value MUST; IRI value SHOULD.                                                                                          | None passes; one literal warns; two values violate count even if each is a valid IRI.                                                                                                                                                                            |
| EP-DISTRIBUTION-REQUIRED     | Distribution type/UUID IRI, required accessURL IRIs and language-tagged label.                                                                            | Missing property fails; a valid first URL and invalid second URL fails. Test all supplied values.                                                                                                                                                                |
| EP-DISTRIBUTION-DOWNLOAD     | Optional standard `dcat:downloadURL` values must be IRIs; may repeat. DEC-008/011.                                                                        | None or multiple valid IRIs pass; literal fails. The misspelled Wiki predicate is corrected explicitly, not accepted as an alias.                                                                                                                                |
| EP-DISTRIBUTION-MEDIA        | Optional mediaType: max one and actual IANA membership MUST.                                                                                              | None passes; exact snapshot member passes; fabricated IRI under the correct prefix and a literal fail; two valid members fail count.                                                                                                                             |
| EP-DISTRIBUTION-FORMAT       | Optional format: max one MUST; EU File Type membership SHOULD.                                                                                            | None passes; member passes; nonmember warns; two members violate maxCount.                                                                                                                                                                                       |
| EP-DISTRIBUTION-LANGUAGE     | Optional, repeatable language values: LOC ISO639-1 membership MUST.                                                                                       | None passes; two valid language members pass; plausible but unregistered code or wrong authority fails. Preserve authority HTTP/HTTPS IRIs as supplied, without equivalence aliases.                                                                             |
| EP-DISTRIBUTION-LICENCE      | Optional license: max one, IRI-valued MUST.                                                                                                               | None passes; literal or two IRIs fails. Do not add SPDX membership as an unstated rule.                                                                                                                                                                          |
| EP-DISTRIBUTION-RIGHTS       | Optional, repeatable rights values SHOULD be IRIs.                                                                                                        | None/multiple IRIs pass; literal warns, without becoming a mandatory cardinality failure.                                                                                                                                                                        |
| EP-AXIOM-POSITION            | Within explicitly scoped `owl:Axiom`, `http://schema.org/position` is `xsd:integer`. DEC-007.                                                             | Wrong datatype on axiom fails; same value outside axiom passes this rule. Test anonymous/named axioms, owner changes and all value occurrences.                                                                                                                  |
| EP-HUMAN-CONCEPT-REUSE       | Search for an existing concept before adding one; assess semantic fit and hierarchy.                                                                      | Generated human-review clause and real review evidence. A SHACL pass does not establish search completeness or conceptual correctness.                                                                                                                           |

The static inventory maps the Wiki clauses and all 58 legacy assertion sites.
Its dispositions now incorporate Max's accepted grilling decisions; the source
observations remain historical evidence. Fixtures still need implementation and
independent expected results.

## Validation input, context and target contract

The integrator owns the software boundary; canonical SHACL owns applicability,
values and severity. Max's accepted domain examples determine expected outcomes.
Demonstrate this contract through a real normal command in SLICE-001 before
expanding the rule catalogue or proposing integration changes.

### Select the actual active set and candidate

Use reviewed module/provenance ownership and explicit versioned source identities.
Select one latest active version per owned module and pinned external support.
A candidate replaces identified members of that set; owned import pins must agree
with the resulting set. Old artifacts are not added as an extra uniqueness
population. Conflicting pins, unavailable required context or an unaccounted module
are errors, not reasons to silently shrink or repair the input.

The existing runner selects five working `.owl` files, while the site builds
extensionless dated `src/` files. `ontologyAliases.js` chooses the largest dated
filename **per directory**, including an older ISO edition's directory. Neither
that alias nor the working-file list establishes which versions are actually
active. The working Extended version is 20260721; the highest local dated source
observed is 20260714. Live served state was not inspected. SLICE-000 must identify
the actual active publication set and its owner-approved scope before qualification.

The inspected asset builder does not validate editing policy; the upload wrapper
uploads existing `dist/` without rebuilding or checking a validation receipt.
Changed-source CI alone does not establish that uploaded bytes passed. Inspect
the external uploader/required publication controls before claiming that boundary
is covered. Reuse existing parsers, inventories and import-closure checks, then
prove that the exact candidate and derived outputs consumed for publication are
bound to successful validation. A file hash or latest alias alone is insufficient.

### Trusted facts and canonical targets

Keep current/candidate data, previous comparison data, source membership and
trusted context separately identifiable. Never union old and current versions.
Python reads exact index/commit/publication inputs and compares entity closures
using native RDFLib isomorphism. It supplies facts, not per-rule property tests.

| Fact              | Meaning and required evidence                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run purpose       | Latest-active qualification, replacement-candidate qualification, draft diagnostics or explicitly scoped critical historical fix. Diagnostics/exceptions cannot produce activation permission. |
| Input identity    | Exact module versions and bytes/index tree, active-set record, current policy, authorities and runtime/lock identity. Retain any actual comparison input separately.                           |
| Ownership         | Original RDF terms, module/source membership, owned root/axiom relationships. Foreign support declarations provide context without inheriting owned metadata duties.                           |
| Change kind       | Added, changed-existing, deleted or unchanged relative to the identified comparison. When unavailable, say so; do not invent unchanged status.                                                 |
| Affected relation | Surviving referrers and affected predicate/type facts, independent of their own change kind. Needed for the scoped critical fix and diagnostic explanation.                                    |
| Coverage          | Expected selected modules, rule/focus sets and any unavailable rules. Missing required qualification input is an error.                                                                        |

DEC-016 defines an entity's change as its outgoing assertions, attached recursive
blank nodes/restrictions/lists and its axiom annotations. Shared structure edits
affect every owner. Changing property P's range from A to B changes P, not A/B
merely through incoming links. Prefixes, serialization order and blank-node labels
do not count. Inference expansion is outside scope. A deleted subject has no new
metadata duty; all applicable static reference rules still check current survivors.

The previous snapshot is comparison evidence for conditional modified and later
release chronology, not an old-version conformance audit. Ordinary editing accepts
an existing valid unchanged modified value on a changed existing entity (DEC-017).
For initial active-set qualification, identify the accepted crossover snapshot and
any actual remediation comparison; do not invent old edit history. A plain static
diagnostic can report change obligations unevaluated, but cannot replace a required
candidate comparison or conceal unavailable qualification evidence.

Use transient reserved context RDF and a native contract. Reject authored input
that impersonates context or authority membership; missing/contradictory required
facts fail as context errors. Preserve source graphs and original anonymous axiom
identity. Retain deterministic context hashes via a qualified native serialization/
canonicalization path; parser blank-node labels are not persistent identities.
Execution attempt IDs/times remain outside the repeatable context identity.

Use bounded context-driven SHACL-AF SPARQL targets where ownership, run purpose or
conditional facts require them. All applicable owned subjects receive static rules
in full active/candidate validation; target selection must not be restricted to
changed subjects. Python supplies the complete approved shapes/input, with no
caller-maintained per-rule allowlist. Core paths must reach original blank nodes.
Do not rely on IRI-only focus filters, skolemize data or patch engine internals.

Broad and SPARQL targets combine; one does not narrow the other. A conditional
SPARQL constraint cannot guard sibling Core constraints. Qualify both mistakes,
exact asserted-type behavior and original anonymous/orphan-axiom ownership on both
engines. Independently expected rule/focus sets and mutations must expose missing
targets, weakened constraints, changed severity and forged context. A nonempty
active corpus must not pass with zero targets; a serialization-only edit still
receives full static checking, even though no modified obligation is newly triggered.

### Run purposes and limits

| Purpose                     | Scope and result                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest-active qualification | Every owned entity/header/axiom in the complete current active set against the in-force policy. All MUST violations block.                                                                                      |
| Candidate qualification     | Exact proposed replacement bytes in the resulting coherent active set, all applicable static rules plus actual conditional comparisons. All MUST violations block promotion/publication.                        |
| Draft diagnostics           | Identified draft sources with explicit available context; incomplete work may be reported without blocking its preparation. Incomplete context/history is visible and cannot qualify activation.                |
| Critical historical fix     | Explicitly approved security/comparably critical change and affected invariants only. Pin its necessary local context; exclude unrelated modernization. It grants no full-version/activation conformance claim. |

No general `--at-revision` audit, arbitrary `--policy-revision` selection, isolated
historical-audit product or since-adoption enforcement cohort is required. Git
references remain internal/explicit inputs where exact comparison or candidate
selection requires them; they do not expand the public historical-audit scope.

## Vertical slices and proof

### SLICE-000 — Reconcile the protected baseline and active-source boundary

**Outcome:** The accepted domain decisions are represented in the actual proposed
implementation baseline, and qualification has an explicit active/candidate input
contract. Links: all REQ/AC/QA and DEC entries. Max accepts; integrator prepares.

- [x] Preserve the frozen Wiki/reports and all 58 legacy assertion dispositions,
      the five working RDF parses and the limited 159-artifact XML-header inventory.
      The unavailable original CSV is not claimed as newly verified.
- [x] Reconcile the grilling decisions in these four documents. DEC-009/010,
      DEC-014, DEC-021/022 and DEC-028–030 record the significant amendments.
- [ ] Refresh the actual candidate/trusted-base identities and existing Issue #31
      through authorized owner actions. Capture and merge the accepted revision
      using native `npm run sdlc -- snapshot`; never invent acceptance metadata.
- [ ] Identify actual active versions/publication evidence and explicit owned
      module scope. Map candidates and required dependent replacements to the
      resulting consistent versioned set, with external support separately pinned.
      Aliases, local maximum filenames and the five working paths are discovery
      inputs, not proof of active publication.
- [ ] Bind full-target, conditional-change, draft and critical-fix examples to
      independently expected reports. Resolve implementation facts such as orphan
      axiom provenance through inspection, not another round of policy questions.
- [ ] Review exact dependency/authority rights and installation proposals. Existing
      `.venv`/SDLC setup is not SHACL qualification. Obtain exact configuration
      approval only when the slice has a concrete patch.
- [ ] Begin the R2 implementation against the protected baseline with the native
      lifecycle and the repository-adapted TDD procedure. Re-estimate using the
      active-source/remediation and publication integration inventory.

**Proof/exit:** Reviewed source/decision mapping and actual protected baseline,
identified active/candidate set and usable approved environment. Native schemas
prove capture structure, not human acceptance. No new Issue or baseline rewrite.

### SLICE-001 — Prove one rule through the actual command and generated policy

**Outcome:** A creation-timestamp rule validates and reports through the existing
normal command and appears in generated Markdown from the same canonical entry.
Links: REQ/AC-001/002/003/005/006/007/008; QA-003/004/005/007;
DEC-010/016/017/019/020/029. Owner: integrator, with independent expected examples.

Likely files: first policy/metadata/context entries, loader, execution/report
boundary, renderer, focused tests and exact approved dependency/entrypoint changes.

- [ ] Resolve the full approved hash lock; qualify clean Python 3.14.7 installations
      on Windows/Linux through real setup consumers. Prove refusal of altered
      hashes, omitted transitives and environment drift.
- [ ] Provision the approved JDK/Jena qualification path now. Run timestamp,
      lexical, context-isolation and target fixtures through both native engines.
- [ ] Author independent valid UTC, missing, multiple, malformed and `+00:00`
      examples. Establish executable behavioral RED, then implement the smallest
      canonical rule/renderer path. Missing imports are not behavioral RED.
- [ ] Prove rule/focus/path/value/severity/source reporting, native parse and
      Meta-SHACL. Check fragmented RDF/XML and Turtle equivalence, foreign
      declarations, unchanged invalid owned entities and anonymous axioms.
- [ ] Prove conditional modified by mutating SHACL applicability while retaining
      classifier facts; Python must not supply the obligation. Drop/forge context
      and targets to show the expected coverage detects false success.
- [ ] Demonstrate the actual normal-command-to-SHACL integration and native
      verification consumer early. Verify current candidate/policy/toolchain
      freshness and comparison inputs actually used. Propose a minimal owning
      change only if the experiment proves one necessary; do not assume a new
      SDLC comparison schema or ontology-edit lifecycle.
- [ ] Measure first cold/warm full-set and representative draft timings/memory
      on identified Windows/Linux inputs. Propose QA-007 numerical budgets and
      revise the effort estimate with the demonstrated integration costs.

**Proof/exit:** One complete command → native result → readable policy path, locked
portable execution and real Jena reports. Failed target/context/toolchain proof
blocks expansion; production replacement is not enabled yet.

### SLICE-002 — Make policy documentation a checked projection

**Outcome:** Every rule/human clause has one explicit documentary representation.
Links: REQ-001/006/010, AC-001/006/010, QA-003/005; DEC-020.

Likely files: policy root/group metadata and human clauses, metadata shapes,
renderer, generated document and rendering tests. Depends on SLICE-001.

- [ ] Reuse SHACL's names/descriptions/groups/orders and standard provenance terms;
      add only metadata with a concrete reader/runner consumer. Keep requirement IDs
      stable across file moves and ordering changes.
- [ ] Render supported Core parameters into requirement facts. Use co-located
      curated prose for complex and human/procedural requirements; do not generate
      policy prose using an LLM at build time or pretend to decode arbitrary SPARQL.
- [ ] Check required metadata, duplicate IDs, execution classification, messages,
      local references, dangling groups and unsupported constructs with native RDF/
      SHACL checks. Ensure a typo such as a misspelled SHACL predicate cannot silently
      produce a documented but nonexecuting requirement. Distinguish intentional
      non-executable metadata from unsupported executable vocabulary.
- [ ] Reconcile the active executable rule-ID set with independently authored
      positive/negative fixture coverage, generated documentation and stable report
      identity coverage. Compare sets, not counts. Every human/procedural clause has
      generated text and a review obligation; do not require fictitious executable
      fixtures for those clauses. Boundary cases are justified per rule.
- [ ] Implement explicit generation and read-only freshness modes with UTF-8/LF,
      deterministic ordering and stable anchors. Include source/policy content identity
      without timestamps or an embedded self-referential generated-file digest.
- [ ] Test stale Markdown, metadata-only changes, prose/SPARQL changes, missing
      human sections, pipes/backticks/HTML characters and multiline literals. Generated
      content must remain safe and readable in GitHub Markdown.

**Proof:** Byte-stable output, coverage/freshness negative controls, and Max's review
of entity, recommendation, conditional-optional and human-review sections.
**Exit:** Policy text is reviewable and derived locally; Wiki publishing waits.

### SLICE-003 — Implement entity, ontology and axiom policy semantics

**Outcome:** All accepted generic rules produce correct reports and corresponding
documentation. Links: REQ-001/002/007, AC-001/002/007, QA-003/005;
DEC-001–007, DEC-012–018 and DEC-022–027. Depends on SLICE-001/002 and relevant accepted examples.

Likely files: entity/ontology/axiom policy modules and rule fixtures; renderer
changes only for additional accepted constraint forms.

- [ ] Introduce one family at a time using the rule table: metadata, UUIDs, labels,
      names, ontology versions and axiom positions. For each, observe the independently
      expected failure, add the rule, rerun focused tests, regenerate documentation.
- [ ] Test all four entity types, both ISO namespace families, foreign resources,
      multiple asserted types, punning, capitalized prefixes and predicate namespace
      identity. Shared property shapes must not accidentally broaden scope/severity.
- [ ] Implement exact preferred-label inclusion with RDF-term equality and the
      accepted local-name correspondence. Keep transformation logic in SHACL-SPARQL;
      do not maintain a second Python normalizer as its oracle.
- [ ] Keep recommendation shapes separate from violations. Verify the ISO warning
      cannot become a violation through an enclosing logical shape; additional labels
      and allowed repeated values must remain accepted.
- [ ] Cover the five unconditional property fields, optional property definition,
      and conditional modified on existing changed properties. Classes/NamedIndividuals
      retain required definitions. Test any English variant, an additional English
      spelling, multilingual labels and both `3D Model`/`Three D Model` correspondence.
- [ ] Retire physical XML spelling requirements from the proposed rules. Native
      RDF validity remains. Keep the legacy implementation only for finite comparison.
- [ ] Inspect real active/candidate labels before planning repairs. Suggest missing
      labels from meaningful IRI tails only when needed; review and write them as
      separately authorized data edits before validation. Preserve existing labels.

**Proof:** Native expected-report checks plus specific boundary assertions;
RDF/XML/Turtle equivalence; a source sample audit with named rule findings.
**Exit:** Every included rule and every retired legacy difference has a disposition.

### SLICE-004 — Complete DCAT rules and cross-file/authority context

**Outcome:** A selected dataset/distribution or identifier change is validated with
all required context. Links: REQ-002/004/008, AC-002/004/008, QA-004/005;
DEC-008/011/012/015. Depends on agreed corpus ownership and SLICE-001–003.

Likely files: dataset/distribution rules, authority snapshots/provenance, snapshot
reader, minimal approved ingestion command and focused fixtures.

- [ ] Cover every optional property in the rule table: distribution, landingPage,
      accessRights, downloadURL, mediaType, format, language, license and rights. Check
      absence, repetition, valid value, invalid first/second value and mixed severity.
- [ ] Load the explicitly identified active/candidate set, not just changed files
      or today's working drafts. Check that owned import pins agree with that set.
      Retain source membership/provenance separately from the union; foreign support
      data supply needed facts without acquiring owned metadata duties.
- [ ] Use pinned IANA, LOC and EU snapshots after exact rights approval. Use native
      source parsers, validate the raw payload, preserve exact member IRIs and generate
      deterministic membership sets with provenance/count/hash reconciliation.
      Retain source URL/version/retrieval date, raw bytes and media type, exact
      licence/NOTICE and Max's applicable rights decision, parser/transformation
      versions/options, derived member count and content digest. Regeneration must
      reconcile that same set; site-wide terms alone do not clear an exact payload.
- [ ] Prove a fabricated member under a correct-looking prefix fails. Prove an
      ontology cannot add an assertion to impersonate the trusted membership set.
      Missing/corrupt/wrong-revision snapshot means execution error, not an empty
      successful validation or a fallback to namespace matching.
- [ ] Test duplicate identifiers across files, repeated assertions of the same
      subject, an untouched conflicting holder and missing cross-file types. Use only
      one coherent active/candidate set; exclude superseded copies from routine checks.

**Proof:** Independent minimal vocabulary fixtures and native source-payload
reconciliation; cross-file contract fixtures; real current-corpus diagnostics.
**Exit:** All DEC-008 checks implemented with their actual strengths and scope.

### SLICE-005 — Qualify latest versions, candidates and conditional change facts

**Outcome:** Complete current/candidate validation has exact inputs; draft
diagnostics and the critical historical-fix exception have honest limited claims.
Links: REQ/AC-003/004/005; QA-001/002/006; DEC-009/010/012/016/017/021/030.
Likely files: snapshot/comparison package, retained CLI and real Git fixtures.
Depends on SLICE-001 contracts; integrated acceptance needs SLICE-003/004.

- [ ] Reuse existing NUL-delimited path, index/commit reads, source inventory and
      pre-install planning. Validate actual staged blobs, not unstaged worktree
      substitutions. Bind candidate files to reviewed module/version identities.
- [ ] Resolve complete active/candidate context and owned import pins. Test a
      Core replacement requiring dependent replacements, conflicting pins, missing
      modules and a stale alias that points to an older version. No silent upgrade.
- [ ] Implement native rooted-closure comparison independently of physical paths.
      Cover outgoing assertions, nested/shared structures, lists, own annotations,
      named/anonymous axioms, deletions and semantic no-ops. P's changed range must
      not classify A/B as changed merely through incoming references.
- [ ] Emit trusted facts and preserve original node identity across serialization.
      Use change facts for conditional modified, scoped critical-fix checks and
      later release comparison; never narrow full static targets to changed entities.
- [ ] Support draft diagnostics with visible missing context/history. Require actual
      comparison inputs for candidate obligations; record the initial crossover
      baseline explicitly without reconstructing historic editing conformance.
- [ ] Implement the explicitly approved critical historical-fix scope at the same
      native boundary. Test affected invariants, unrelated historic defects and a
      refusal to treat its result as full-version/activation qualification.

**Proof/exit:** Real Git fixtures cover both staged/worktree disagreement directions,
rename, deletion, missing input, change/revert, blank-node relabeling, shared owners
and draft-versus-dated paths. Full static coverage includes unchanged invalid
entities; superseded versions are excluded. Reports retain exact input/context
identities. AC-003/004/005 hold without an arbitrary historical-audit interface.

### SLICE-006 — Integrate diagnostics and the real publication qualification gate

**Outcome:** CLI/hook/CI report consistent results; the actual publication consumer
requires conformance of the exact candidate and resulting active set.
Links: REQ/AC-003/008/009/010; QA-001/004/005/006. Depends on SLICE-002–005.
Likely files: runner/reports, existing software verification and publication
consumers, focused integration tests and exact approved workflow/profile changes.

- [ ] Retain native RDF reports with rule, focus, path/value, severity, source,
      policy link and repair guidance. Include run purpose, full module/version map,
      candidate/policy/context/authority/lock identities and comparisons actually used.
- [ ] Keep native conformance separate from the MUST-only decision. Report warnings
      visibly. Replace `output.strip()`-means-failure with the tested status contract:
      `0` successful required checks without blockers, `1` violations, `2` input,
      context, engine or policy-definition error. An explicit diagnostic collector
      may retain failures while allowing draft preparation; it grants no qualification.
- [ ] Policy-only changes must qualify every current active version against the
      proposed policy before activation. If repairs are needed, prepare compliant
      replacement versions and qualify/activate them with the policy. Draft-only
      preparation can continue with reported defects.
- [ ] Exercise the native verification consumer proven in SLICE-001. Bind full
      active/candidate conformance and policy QA to actual current input identities;
      include comparisons only where used. No speculative new SDLC schema,
      environment interpolation or accepted-error-code workaround.
- [ ] Inspect and integrate the actual build/upload/publication control. Reuse
      source inventory, parser, aliases/derived-output and import-closure consumers.
      Refuse a stale/missing validation receipt, changed candidate/policy, mismatched
      derived output or partially prepared module set at the publication boundary.
      An external uploader or branch protection not inspected remains a proof gap.
- [ ] Qualify locked Windows/Linux setup and real hook/CI command boundaries;
      preserve pre-install planning, least privileges and check names where possible.
      Exact workflow/required-check changes require their own approval.
- [ ] Preserve failure reports and escape untrusted workflow annotations. Truncate
      display only, not evidence. No fabricated line numbers or exception-to-pass path.

**Proof/exit:** Actual native consumer exercises for warnings, violations, errors,
draft incompleteness, policy-only change, stale candidate/receipt and inconsistent
owned import pins. A clean working `.owl` cannot qualify different published bytes.
No automatic artifact writer or deployment is added by this slice's proof alone.

### SLICE-007 — Reconcile policy, remediate latest versions and qualify crossover

**Outcome:** Evidence supports the intended policy and a conforming latest active
set at crossover. Links: all AC except actual live publication/use; QA-003–007.
Depends on SLICE-001–006. Integrator owns the frozen target and evidence.

- [ ] Compare legacy/SHACL behavior on frozen examples and selected current data.
      Classify differences as accepted policy change, added coverage, retired
      serialization detail, legacy defect, new defect or unresolved meaning.
- [ ] Produce the full latest-active/candidate report. Resolve every blocking
      current violation before activation through explicitly scoped data edits or
      qualified replacements. Unchanged current defects are not grandfathered.
      Superseded artifacts require no cleanup. Keep failed reports as evidence.
- [ ] Compare actual second-engine target sets and rule/focus/path/value/severity
      results on representative full inputs and fixtures. Reduce disagreements to
      counterexamples; do not flatten away warning/target differences.
- [ ] Freeze exact source/policy/fixture/authority/dependency identities, run the
      R2 full profile after final relevant edits and obtain independent verification,
      ordinary review and the specialist lenses required by the accepted risk route.
- [ ] Use the authorized native Codex Security diff workflow where the changed
      RDF/SPARQL/Git/process/CI/publication ingress triggers review. Missing native
      coverage or Windows artifact-access gaps remain explicit; no substitute scan
      is claimed as native coverage.
- [ ] Measure real full-set and adverse shared-structure performance against
      accepted QA-007 budgets and the 600-second ceiling. Replan measured failures;
      do not silently extend limits or claim unmeasured usability.
- [ ] Max accepts the policy-editing and contributor-repair walkthrough and reviews
      the resulting latest-version findings and evidence.

**Proof/exit:** Frozen reconciliation ledger, clean required latest-active/candidate
results, native full receipts, independent verification/review, applicable security
evidence and owner outcome acceptance. Preparation can report remaining defects;
activation cannot pass while they remain.

### SLICE-008 — Activate the qualified set, publish the Wiki and retire duplication

**Outcome:** The current rules govern latest active versions and subsequent
replacements; the Wiki is their verified generated view.
Links: REQ/AC-001/009/010; QA-008; DEC-009/020/029/030.
Depends on SLICE-007 and explicit cutover/publication authority.

- [ ] Activate the qualified policy and conforming current/replacement module set
      together through the proven publication gate. Record version/content and
      policy identities, not just an adoption timestamp.
- [ ] Switch the retained operational runner to SHACL and remove migrated graph
      assertions from `tests/universalontologytest.py`; remove that file if spent.
      No XML spelling checks remain. Remove `xmlunittest` only after consumer
      search and exact dependency approval; preserve other needed dependencies.
- [ ] Prepare the generated Wiki diff with current remote/source identity. Make
      the separately authorized native Wiki Git write and read back published
      bytes/revision. Reconcile concurrent changes without force overwrite.
- [ ] The intended policy freeze lasts until crossover. If an intervening change
      or publication delay occurs, expose the enforced policy revision and canonical
      repository link and identify stale Wiki content. Initial Wiki readback remains
      required for operational completion.
- [ ] Observe actual hook/CI and publication-boundary use, then the first real
      post-crossover contribution/policy update. Installation or merge is not this
      evidence. Retain all failure, baseline, rights and recovery records; remove
      only spent task-owned transports after checking consumers.

**Proof/exit:** Exact active/publication identity, actual command/gate observation,
Wiki readback and Max's operational acceptance. Record any remaining action and
owner honestly; no runtime fallback to the legacy validator.

## Subsequent increment: validated ontology release promotion

This follow-on proposal delivers automatic artifact promotion and stronger release
chronology, linked to MOT-006 and DEC-021. Exact candidate structural qualification
and the real publication guard are already required by SLICE-005/006/008; only the
automation and additional temporal rules are deferred. This is not SLICE-009 or
an accepted implementation baseline. No Issue, workflow or configuration file is
created for it during this planning task. Reuse the existing validator, graph
comparison, source inventory, build and deployment responsibilities after checking
their then-current supported interfaces; research any residual tooling gap before
adding a release component.

The intended result is an automated, repeatable path from an explicit draft
snapshot such as `reference-data/reference-data.owl` to an immutable dated artifact
such as `src/universal/reference-data/YYYYMMDD`, backed by a reviewable report and
consumer checks. Promotion can later run in an approved pipeline without asking a
person to copy files manually. Its trigger, permissions and release authority need
concrete design and acceptance before implementation.

| Work package                            | Deliverable and acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Establish release identity and policy   | Accept the prior-published-artifact authority, module mapping, temporal rules, first release, same-day collision and multi-module/import behavior. Record exact artifact, policy and adoption identities. Do not identify the last live release solely by the largest local filename.                                                                                                                                                |
| Deliver read-only release assessment    | Compare exact draft and prior-release snapshots through SLICE-005's native comparison; run the applicable structural profile plus canonical release SHACL constraints. Emit proposed version/header corrections, semantic changes, deletions and an actionable report. Source bytes remain unchanged; missing context is an error.                                                                                                   |
| Prepare and promote a frozen candidate  | Produce candidate bytes and an exact proposed `src/` diff. If explicitly supported, apply reviewed metadata updates to a candidate copy and revalidate the final bytes. Recheck input/base/policy hashes before the authorized write. Same bytes at the same destination are a no-op; different bytes at an existing version path fail. An interruption cannot leave a partially promoted module set eligible for build/publication. |
| Verify downstream build and publication | Exercise the existing website, alias, JSON-LD, import-closure and query consumers as applicable. A new dated file changes alias selection. Build only from the frozen candidate set, retain hashes/reports and confirm required imports. Deployment uses its separate authorization and actual served-version readback; recovery preserves released version identities.                                                              |

The release constraints are added to the **same canonical policy source**, grouped
by applicability, with generated release guidance. The future file/module split
depends on the actual accepted rules; do not create empty release-policy files now.
The orchestration layer supplies trusted previous-version/change facts and performs
Git/filesystem operations. It does not duplicate date predicates in Python.

The dossier recommends a candidate ontology date no earlier than the latest owned
entity creation/modification date, plus explicit alignment of the version fields
and stricter freshness for changed existing entities. Exact equality to the
maximum surviving timestamp is insufficient for deletions and ontology/import-only
changes. General editing checks retain DEC-001's optional ontology modified field;
mandatory release metadata is a separate proposed profile. Every latest candidate
must pass all applicable current structural rules even if its predecessor predates
crossover. Read that predecessor only as comparison evidence; do not validate old
versions retrospectively. Distinguish declared dates from actual publication time.

Independently accepted counterexamples must include:

- The real draft's August 2026 entity modification beneath a July 2026 ontology
  version; a corrected candidate passes the agreed date rule.
- An existing entity's graph changes while its old modified value remains; maximum
  timestamp checks alone miss it, while the paired-release check detects it.
- A newly included entity with no modified value, an older truthful creation
  value, and a newly created entity later than every existing modified value.
- Deletion of the entity bearing the greatest timestamp, an ontology-description
  change, an import-only change and a serialization-only rewrite.
- Invalid/multiple dates, date/dateTime boundaries, UTC day conversion and a
  different candidate attempting to reuse an existing same-day version identity.
- First release, missing/unverified previous publication, pre-adoption changes,
  coherent cross-module imports and an unresolved import in a candidate.
- Source or prior-release movement after validation, retry after interruption,
  an identical already-promoted artifact and a conflicting destination.

The automation/chronology increment needs its own accepted evidence and rollout
decision. Its additional effort is separate from the re-estimation below. The
current increment must already prove exact candidate validation at publication;
it supplies reusable comparison, but does not implement automatic promotion.

## Reproducible dependency and engine qualification

REV-003/004/009 are intended to close AC-007/008 with the existing pip, `.venv`, npm
and native engine interfaces. The dossier's comparisons with TopBraid, RDF4J,
pyLODE and WIDOCO remain the selection basis; these amendments address adoption
gaps, not a new documentation platform or package-manager migration.

On 11 September the primary [pySHACL release](https://pypi.org/project/pyshacl/0.40.1/),
[RDFLib release](https://pypi.org/project/rdflib/7.6.0/) and
[Jena distribution](https://jena.apache.org/download/) still support the proposed
0.40.1 / 7.6.0 / 6.2.0 identities. This is source verification, not engine
qualification, transitive rights clearance or an installation approval.

**Python:** Propose `requirements.lock.txt`, a pip-consumable, fully pinned and
hashed resolution of `requirements.txt` plus `requirements-sdlc.txt`, since the
existing setup installs both into one `.venv`. Include every transitive and all
approved platform wheel hashes/markers. Keep the existing requirements files as
declared inputs, record resolver/Python/platform identities, and demonstrate that
the resolved set satisfies both inputs. Do not hand-author a dependency resolver.
Native pip [hash-checking mode](https://pip.pypa.io/en/stable/topics/secure-installs/)
requires pins and hashes throughout the dependency graph; a partial constraints
file or `pip freeze` listing alone does not establish that artifact contract.

The exact setup/CI proposal must install from this lock using `--require-hashes`
and `--only-binary=:all:` through that checkout's `.venv`. Qualify and record the
pip bootstrap version; remove the current floating pip upgrade from this qualified
path only through its exact approved setup change. No later unpinned install may
silently replace locked transitives. Check the installed distribution set against
the reviewed platform lock and run native `pip check` before claiming qualification.
Clean-install evidence must include refusal of an omitted transitive, a changed
version/hash and an unreviewed installed version. Test real install consumers,
not just a lock parser. Native resolution may use the network at the approved
setup stage; validation itself remains offline. Missing approved wheels block the
affected platform; do not silently compile an sdist or downgrade the interpreter.

**Independent engine:** Jena 6.2.0 requires Java 21 or later. Select an exact patch
and distribution of the newest applicable supported JDK LTS under VER-01, starting
with the currently documented [Temurin 25 LTS line](https://adoptium.net/support).
Java 21 is a compatibility floor, not an already approved pin. Confirm the actual
available release/build, platform binaries and exact licence/NOTICE before proposing
`.java-version`; an older LTS needs an evidenced applicability/owner decision.

Use supported [setup-java version-file and integrity facilities](https://github.com/actions/setup-java)
in the qualification workflow with an approved immutable action revision, explicit
distribution and exact version. Pin the Jena command distribution's platform
URLs/digests in the same approved workflow; verify Apache checksums/signatures
against the recorded trusted signing identity. Retain JDK/Jena artifact and
licence/NOTICE evidence plus actual `java --version` and Jena identity. Local
qualification must consume the same approved releases. Inspect generated setup
side effects and avoid unrelated publishing credentials/settings. No Fuseki server,
global Java switch or Jena dependency on each contributor's ordinary hook is needed.

| Required surface                           | Inputs and execution                                                                                                                                               | When and evidence                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux x64 CI                               | Approved explicit runner OS image; Python from `.python-version`, complete platform lock, JDK from `.java-version`, verified Jena command distribution             | SLICE-001 proof and SLICE-006 integration; policy/toolchain changes and final R2 qualification. Retain actual image/runtime versions, install reports and native reports. |
| Windows x64 qualification                  | Approved explicit Windows runner image and the same Python/library/JDK/Jena releases with Windows artifact hashes; real repository launcher and Git index fixtures | Same semantic/context/lexical/renderer fixtures as Linux; native hook path observed for cutover. Retain Windows command-boundary and input identities.                    |
| Cross-engine and cross-platform comparison | Identified full active/candidate and diagnostic inputs, context facts, authority set and policy; byte-stable generated Markdown                                    | Mandatory target-set and rule/focus/path/value/severity parity. Blank-node labels and result ordering may differ; lost results/severities may not.                        |

Approve the concrete runner labels, action revisions, JDK build, Jena hashes and
cache keys before editing the workflow. Key caches by OS/architecture, exact
runtime and lock/toolchain identities; a restored cache is not clean-install proof.
Missing Java, checksum/signature failure, unsupported context/target behavior or
an unexecuted matrix row blocks its qualification. It is not permission to skip
Jena, install an old runtime or manufacture parity from pySHACL output.

## Proposed commands and exact configuration review scope

The commands below are proposed interfaces. They do not exist yet. They use the
existing repository Python launcher, and implementation must test the real npm,
Python argument and workflow consumers before a command is documented as working.

| Proposed npm script       | Proposed smallest package.json value / behavior                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate:ontologies`     | `node scripts/runRepositoryPython.js scripts/validate_ontologies.py` — retained CLI with explicitly identified qualification and diagnostic purposes.                |
| `test:ontology-policy`    | `node scripts/runRepositoryPython.js -m unittest discover -s tests -p test_ontology_*.py -v` — native discovery, include semantic policy, changes and CLI contracts. |
| `test:policy-rendering`   | `node scripts/runRepositoryPython.js -m unittest discover -s tests -p test_editing_policy_*.py -v` — rendering contract.                                             |
| `generate:editing-policy` | `node scripts/runRepositoryPython.js scripts/render_editing_policy.py` — writes the generated view deliberately.                                                     |
| `check:editing-policy`    | `node scripts/runRepositoryPython.js scripts/render_editing_policy.py --check` — freshness/metadata check, no tracked writes.                                        |

The concrete flag design follows the existing CLI contract and SLICE-001 proof.
The required purposes are latest-active qualification, replacement-candidate
qualification, draft diagnostics and an explicitly scoped critical historical fix.
Keep real `--staged` and CI base/head inputs where they select exact bytes or
conditional comparison. They do not restrict full static targets to changed entities.
Do not add general historical-version/policy selectors or an ever-touched cohort.
No proposed command is documented as working before its real consumers are tested.

Before each configuration request, prepare a concrete smallest patch:

| Exact file(s)                                                                                            | Proposed setting / behavior and impact                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirements.txt`, new `requirements.lock.txt`                                                          | Add qualified `pyshacl==0.40.1` and exact `rdflib==7.6.0`; refresh before approval. Lock the complete combined ontology/SDLC resolution and approved Windows/Linux artifacts with hashes. Review all resolved rights. The lock is mandatory for qualification, but its creation and every pin/hash still require exact approval.                                                                                                                          |
| `scripts/setUpDevelopmentEnvironment.js`                                                                 | Consume the complete lock in the existing `.venv` setup; qualify an exact pip bootstrap, replace the floating upgrade and sequential unpinned installs coherently, and preserve other setup responsibilities. Treat this as an explicit setup/configuration behavior approval.                                                                                                                                                                            |
| New `.java-version`                                                                                      | Record the exact qualified JDK LTS patch/build; explicit vendor/platform selection is bound by the workflow and qualification evidence. Jena requires Java 21+, but no floating `21`, `25` or `latest` pin is proposed.                                                                                                                                                                                                                                   |
| `package.json`                                                                                           | Add only implemented entry points. Any necessary publication/build gate wiring is a separately reviewed exact setting change; no unrelated package-manager, lint or formatting edits.                                                                                                                                                                                                                                                                     |
| The policy TTL files and authority/activation metadata listed above                                      | Approve exact constraints, severities, targets, prose, trusted facts and version-selection consumers. No data or configuration is changed by this proposal.                                                                                                                                                                                                                                                                                               |
| `.github/workflows/ontology-validation.yml`                                                              | Preserve pre-install selection and the existing contribution check. Add locked installs, policy QA and explicitly identified Linux/Windows qualification jobs with approved setup-java/action revisions, `.java-version`, Jena URLs/digests/signature verification and cache identities. Retain reports on failures. Preserve `contents: read`; Wiki writing stays outside this workflow. Changes to required check names need their own remote decision. |
| `.sdlc/verification.json`                                                                                | Replace the legacy ontology check with blocking full latest-active/candidate validation and policy fixture/freshness obligations. Retain 600 seconds. Verify actual native input freshness early; change only the minimal owning consumer proven necessary.                                                                                                                                                                                               |
| `scripts/build/ontologyAssets.js`, `scripts/upload_to_s3.py` and their actual owning publication control | Inspect the external uploader and existing controls, then propose the smallest exact gate that binds candidate/active-set validation to consumed source and derived bytes. Refuse stale/missing receipts or inconsistent module sets. These are predicted integration surfaces, not authority to edit or deploy.                                                                                                                                          |
| Existing workflow-selection/integration tests                                                            | Update assertions for approved changed inputs and consumer behavior, not to mask missing checks. No gratuitous test-runner configuration edits.                                                                                                                                                                                                                                                                                                           |
| Wiki repository `Editing-Policy.md`                                                                      | Replace only with the reviewed generated projection after separate authorization; no secret/token or automatic-publication configuration is proposed now.                                                                                                                                                                                                                                                                                                 |

Only the proposed Python lock is in scope; `package-lock.json`, `skills-lock.json`,
`AGENTS.md`, `REVIEW.md`, SDLC version/status, CODEOWNERS, branch protections and
hooks have no presumed changes. A necessary lifecycle/schema extension for explicit
input freshness needs a concrete demonstrated gap, minimal design and exact
file/setting approval. No such extension is presumed by the verification proposal.

## Verification routing and evidence retention

### Mandatory latest-active and candidate evidence

The R2 final full profile qualifies the complete identified active/candidate set
against the intended policy. Full conformance and exact publication-input binding
are both required; a clean subset, draft collector or historical-fix report is
insufficient.

| Operation/result                                                                                                                         | Effect                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Complete latest-active/candidate evaluation; no MUST violations                                                                          | Eligible only with all remaining required evidence and exact identity checks. Warnings stay visible.        |
| Any applicable MUST violation, including an unchanged current entity                                                                     | Blocks activation/publication. Repair the latest version or prepare a conforming replacement.               |
| Incomplete draft diagnostics                                                                                                             | Supports preparation only; reports findings and unavailable rules, never activation conformance.            |
| Scoped critical historical-fix check                                                                                                     | Qualifies only the authorized fix and affected invariants; no retrospective full audit or activation claim. |
| Missing input/context/report, invalid policy, engine failure, timeout, interruption, stale candidate/receipt or inconsistent active pins | Fails qualification. Retain the failure and its identities.                                                 |

The initial active-set record establishes crossover scope without a fabricated
history audit. Conditional modified uses actual current comparisons, including
remediation/candidate changes. When a comparison is required, its absence is an
error; when a diagnostic lacks history, record the obligation as unevaluated.
Past blobs used for comparison are never an extra conformance population.

Use native lifecycle receipts and existing consumer freshness checks for actual
source/policy/context/authority/fixture/runtime/lock inputs. Prove the normal
software verification integration in SLICE-001 and its publication consumer in
SLICE-006. Include changed candidate/policy/used-comparison counterexamples that
invalidate stale evidence. Inspect the actual consumer before proposing any
schema change. No ignored mutable input, invented interpolation, `|| true`,
`continue-on-error` or fabricated receipt is an acceptable qualification path.

An explicit diagnostic collection result must retain the underlying native
conformance, violation/error status and complete reports. Successful collection
never means a violating draft or incomplete corpus passed. The activation
consumer must accept only its required successful qualification result.

Refresh native evidence after relevant changes; retain older results as history.
SDLC controls the validator/integration software change and its evidence. Routine
ontology edits need no new SDLC change-classification workflow from this design.

### Commands, coverage and performance proof

Use the existing commands already verified by source inspection:

```text
npm run check:sdlc
npm run test:python
npm run test:sdlc
npm test -- --runInBand
npm run lint
npm run format:check
node node_modules/vite/bin/vite.js build
npm run generate:jsonld
npm run mcp:package:build
npm run sdlc -- verify --keep-going
```

The native `full` profile also owns the ontology-source check; its approved
full latest-active/candidate replacement and policy checks must be concrete before
cutover. `npm run build` invokes auto-fixes and is unsuitable when verification
must preserve tracked inputs. Build/generation writes ignored outputs; deployment
is not verification. Existing `.venv` and npm dependencies are now available. Run
the obligations only for their justified scope and after the corresponding
implementation/dependencies exist; setup success is not a policy fixture or a full
verification pass.

Focused tests run per meaningful change; run affected tests after the integrated
slice and the route-selected full obligations after final relevant changes. Do
not rerun unrelated full suites after every documentation edit. Preserve native
logs and report graphs under existing ignored evidence locations, keyed to exact
inputs. The durable migration record links them and states unavailable checks.

For interoperability, compare mandatory semantic fields and target coverage with
the second engine's actual native report. Do not flatten away unexpected violations,
drop warnings or compare only a Boolean. Neither the legacy validator nor generated
expected results is sufficient as the oracle for the accepted policy changes.

Qualification reconciles **sets of stable IDs** for active executable rules,
rules with positive fixtures, rules with negative fixtures, documented executable
rules and rules with stable report identities. Equality of counts is insufficient:
one omitted rule and one duplicate must fail. Check independently expected
rule/focus sets too, since report identity alone cannot prove a target executed.
Human-only clauses have documentation/review coverage separately. Record boundary
fixtures or their justified non-applicability per rule. No arbitrary code-coverage
percentage is added as a substitute for these accepted behavior oracles.

Reports expose selected rules/targets, results by rule/severity, exclusions and
input identities. Qualification additionally records cross-engine differences,
fixture/document coverage, renderer hash, per-stage timings and peak memory with
their measurement method. A metrics dashboard or repeated second-engine run on
every ordinary edit is not required by this proposal.

For QA-007, SLICE-001 establishes baseline measurements on identified Windows/Linux
machines for a representative draft edit, the full active/candidate set and adverse shared
blank-node structures. Record cold/warm runs, repetitions, corpus size, wall-clock
stage durations and peak memory. Max accepts numerical hook-latency, full-validation
and memory budgets before SLICE-007 qualification; unmeasured targets remain open.
The existing 600-second ontology-command timeout remains the control ceiling.
Exceeding an accepted budget requires optimization or an explicit owner decision,
never a silent timeout increase. Do not treat a 599-second hook as usable merely
because it meets the CI ceiling.

## Dependencies, sequencing and effort re-estimation

| Slice     | REQ/AC links                    | QA/DEC links                                    | Proof and release/cleanup implication                                                                                 |
| --------- | ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| SLICE-000 | All                             | All                                             | Protected accepted baseline and identified active/candidate scope; no runtime change.                                 |
| SLICE-001 | 001/002/003/005/006/007/008     | QA-003/004/005/007; DEC-010/016/017/019/020/029 | Real rule/command/renderer path and locked two-engine/platform evidence; retain failures.                             |
| SLICE-002 | 001/006/010                     | QA-003/005; DEC-020                             | Stable rule coverage/freshness and human-readable projection; no Wiki write yet.                                      |
| SLICE-003 | 001/002/007                     | QA-003/005; DEC-001–007/012–018/022–028         | Accepted entity/version/axiom examples, including property scope and English variants; no validator repairs.          |
| SLICE-004 | 002/004/008                     | QA-004/005; DEC-008/011/012/015/030             | Cross-file/DCAT/authority evidence with coherent pins and retained rights.                                            |
| SLICE-005 | 003/004/005                     | QA-001/002/006; DEC-009/010/016/017/021/030     | Full active/candidate scope plus real Git/closure proof and bounded diagnostic/exception claims.                      |
| SLICE-006 | 003/008/009/010                 | QA-001/004/005/006; DEC-021/029/030             | Actual software and publication consumers refuse stale or nonconforming candidates.                                   |
| SLICE-007 | All except live publication/use | QA-003–007; accepted decisions                  | Latest-set remediation, frozen full verification, independent review; required violations resolved before activation. |
| SLICE-008 | 001/009/010                     | QA-008; DEC-009/020/029/030                     | Coordinated policy/active-set crossover, Wiki readback and real use; retire duplicate machinery.                      |

SLICE-000 precedes implementation. SLICE-001 proves the complete path before rule
expansion. SLICE-002/003 and then SLICE-004 supply full policy/context behavior;
snapshot mechanics can proceed once SLICE-001 contracts are stable, but SLICE-005
acceptance depends on those rules. SLICE-006 integration, SLICE-007 qualification
and SLICE-008 operational cutover remain sequential. Independent rule families
could later proceed concurrently only with settled contracts and authorization;
this plan creates no extra tasks or agent assignments.

The earlier **26–50 engineer-day** range was accepted as a planning range for the
previous scope. It is **not a current total**: historical-audit/changed-target work
is removed, while latest-active remediation, coherent dependent replacements and
exact publication integration are now mandatory. Their costs have not been
measured. Do not claim a saving or treat active remediation as optional/excluded.

Re-estimate after SLICE-000's active-source/publication inventory and SLICE-001's
normal-command/engine proof. Include policy coverage, remediation size/review,
dependent versions, publication guard, rights/runtime qualification, independent
assurance and real-use observation. Record unresolved ranges and approval delays;
only automatic promotion and additional release chronology remain a separate
increment. No calendar or new numerical total is promised by this revision.

## Cutover, abort and recovery

Until crossover, retain the existing operational validator and observe SHACL
explicitly as migration evidence. Record incompatibilities with accepted new
examples; do not add a production escape or legacy fallback. The intended freeze
avoids policy drift during this period.

Before crossover, qualify **all owned entities in each latest active version**
and any replacement set against the policy being activated. Resolve all current
MUST failures. Old superseded versions stay outside scope. For later stricter
rules, prepare conforming replacements first and activate the rules and versions
together. A critical historic fix uses only its separately scoped exception.

Abort on unexplained engine differences, missing target coverage, malformed input,
unavailable required context, inconsistent owned pins, unresolved semantic naming,
blocked rights, altered locked artifacts, context impersonation, stale publication
evidence, unauthorized shims or failed assurance. Keep the failed evidence and
replan the affected slice.

Recovery uses the last qualified policy/implementation and version identities:
prepare a reviewed forward fix or an explicitly authorized suspension. Reverting
policy, software and active publication selection are distinct actions; do not
overwrite released artifacts or claim a code revert restores semantic equivalence.
Ontology data edits require their own scope approval. Before a Wiki retry, compare
current remote state, retain generated output and expose the enforced repository
revision if the Wiki lags. Initial readback remains a completion requirement.

## Completion evidence and current handoff

Implementation completion needs AC-001–010 on the actual final inputs, a conforming
latest active/candidate set, independent R2 verification/review, applicable native
security evidence, the real publication gate, Wiki readback and Max's operational
walkthrough/first-use acceptance. Checkboxes, schemas, installs and merges do not
substitute for that evidence.

The 11 September independent review is preserved unchanged at SHA-256
`5f76f8cefde092f8b822d35355fde7cd173228d197965cc4e9e940f645ad970f`, committed with
the earlier plan. Its AMBER assessment and execution limits remain historical.
The 12 September revision reconciles the agreed grilling decisions across the
plan, dossier, rule inventory and local Issue proposal. Historical setup, source,
resolver and header evidence retains its original limits; no SHACL implementation
or live served-state qualification is claimed.

R1 document checks and affected verification belong in the native local lifecycle
record; they establish proposal-maintenance evidence only. No configuration,
ontology data, installation, protected baseline, Issue/Wiki content or runtime is
changed here. These revisions require ordinary review and the actual protected
baseline process before R2 implementation. No new commit or push is included in
this revision; the next implementation step is SLICE-000.
