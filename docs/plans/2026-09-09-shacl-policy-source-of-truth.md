# SHACL policy source of truth implementation plan

Status: proposed plan, revised 11 September 2026 following independent review;
SHACL implementation has not started. This revision is not baseline acceptance.

**Goal:** Author graph-level editing requirements once in SHACL, generate the Wiki
policy from that source, enforce policy on prospective entity changes by default,
and support manual audits of any chosen ontology version.

**Design and authority:** Read the [change dossier](../specs/2026-09-09-shacl-policy-source-of-truth-dossier.md)
with this plan. Its accepted decisions are inputs; its proposed decisions still
need baseline acceptance. Repository revision inspected:
`b32d7cff65e57a4d4ea68334350e27b8ef5038ef`.
Baseline preparation was refreshed at `36a51ff4bb76b98c59fe7fe3d225b8762ab23eeb`;
read the [rule/source inventory](../specs/2026-09-09-shacl-policy-rule-inventory.md)
and [draft Issue body](../specs/2026-09-09-shacl-policy-source-of-truth-issue-body.md).
The review revision is grounded in worktree HEAD
`47af705ddd14384ecdc2dd0672002310b15c8d5b`, which already includes main
`557d4bb3e4013b34a95ad8be6189b975222fb47e` (also the live remote main checked on
11 September). The older identities above retain their original evidence scope.

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

The following dispositions amend this proposal, not accepted policy. `REV` IDs
trace review concerns without replacing the dossier's REQ/AC/QA/DEC identities.
The source review remains unchanged; incorporation is not proof of remediation.

| Review concern                                                  | Disposition in this revision                                                                                                                                                    | Linked scope and closure evidence                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| REV-001 / P0: change-dependent obligations can leak into Python | Specify trusted RDF comparison facts; canonical SHACL owns applicability, severity and required values. Dependency effects are separate from change kind.                       | REQ/AC-001/005/008; SLICE-000/001/005. Applicability mutation and forged-context counterexamples.                                 |
| REV-002 / P0: prospective targets can disappear or broaden      | Select canonical context-driven SPARQL targets for both profiles; no caller-owned rule allowlist or filtering-dependent correctness.                                            | REQ/AC-003/004/007; QA-003; SLICE-001/005/007. Exact expected rule/focus pairs, blank-node coverage and missing-target mutations. |
| REV-003 / P0: direct Python pins do not freeze execution        | Require one complete native pip requirements lock, reviewed artifact hashes and clean-install qualification through actual setup/CI consumers.                                  | REQ/AC-008; SLICE-001/006. Omitted transitive, changed version/hash and environment-drift failures.                               |
| REV-004 / P0: Jena lacks a reproducible runtime                 | Provision a qualification-only JDK/Jena path early. Java 21 is the minimum, not an instruction to bypass VER-01's newest applicable LTS selection.                              | REQ/AC-007/008; QA-005; SLICE-001/007. Native reports on the approved Windows/Linux matrix.                                       |
| REV-005 / P0-P1: whole-corpus diagnostics could become optional | Every final R2 full verification must execute and retain a complete audit separately from the blocking prospective result. Missing/failed audit machinery blocks qualification. | REQ/AC-003/010; QA-006; SLICE-006/007. Legacy violations remain visible without forcing unrelated cleanup.                        |
| REV-006 / P1: historical corpus meaning is unresolved           | Define default coherent context and explicit isolated-file limits; identify policy and data separately and report unevaluated history.                                          | REQ/AC-003/004/005; SLICE-000/005. Historical cross-version isolation and context-loss fixtures.                                  |
| REV-007 / P1: authority provenance and rights are incomplete    | Preserve raw source identity/bytes, rights, transformation identity, membership counts and hashes before adoption.                                                              | REQ/AC-004/008; QA-004; SLICE-004. Native reconciliation and impersonation/corruption failures.                                   |
| REV-008 / P1: the inspected repository has moved                | Refresh proposals against the current merged consumers and trusted baseline route. No additional Git rebase is currently needed; refresh again before exact approvals.          | SLICE-000/006/007. Current configuration/schema/receipt and actual trusted base/head evidence.                                    |
| REV-009 / P1: platform qualification is unspecified             | Name Linux and Windows qualification surfaces, runtime identities and common fixtures; require parity before cutover.                                                           | REQ/AC-006/007/008; QA-005; SLICE-001/006/007. Missing matrix evidence is a gap.                                                  |
| REV-010 / P2: performance and coverage lack operational bounds  | Retain the existing 600-second ceiling, measure first, then obtain Max's numerical latency/memory budgets. Compare coverage sets by stable rule ID, not just equal counts.      | REQ/AC-001/007/010; QA-007; SLICE-001/002/007. Named proof coverage and accepted performance evidence.                            |

This bounded plan revision is R1 under the current user request; the implementation
remains R2 because it changes policy authority, contribution enforcement and a
published contract. Existing accepted decisions are preserved. Reconcile these
amendments with the dossier and [Issue #31](https://github.com/Hadden-Industries/universal-ontology/issues/31)
before accepting the implementation baseline. Its live body still describes a
proposal; neither its ready-to-baseline label nor a local snapshot authenticates
acceptance. No Issue #31 baseline is present in the inspected trusted main tree.
Do not edit historical snapshots or reuse their acceptance for changed content.

## Constraints and delivery boundary

- R2 implementation starts only after an actually accepted Issue revision is
  captured and merged as the protected baseline. Do not label this draft accepted.
- Preserve all eight CSV decisions and subsequent explicit clarifications in
  the dossier. Default enforcement must not require cleaning all old entities.
- Every new or modified policy/configuration file requires Max's exact approval,
  including TTL policy, manifests, fixtures used as configuration, dependencies,
  npm scripts, CI and verification-profile changes. Drafting these documents does
  not grant those approvals. Test source code is not automatically test-runner
  configuration, but ambiguous control files must be classified before editing.
- Use current stable components or the newest applicable supported LTS patch;
  prove compatibility with the repository runtimes. Do not downgrade to avoid an
  installation issue. Use consumer-owned RDF/SPARQL parsers and SHACL validation.
- Keep semantically precise names. No legacy aliases, patched validator internals,
  fallback to the old validator, or unauthorized shims. Parallel observation is
  a finite migration experiment, not a production compatibility mechanism.
- Do not add cycle bans, OWL reasoner deployment, property closure, ORCID live
  lookup/checksum policy, a new vocabulary platform or automated ontology repairs.
  DEC-026 explicitly selects offline ORCID URI-format validation only.
- Record Max's requested release-promotion capability as the subsequent increment
  described below. Reuse the read-only comparison/validation already needed here;
  artifact writing and stronger release-date policy are outside this cutover's
  critical path, subject to acceptance of DEC-021.
- Commits, pushes, GitHub writes, Wiki publication, setup/configuration activation,
  live security scans and changes to ontology data remain separate actions.

## Proposed files and ownership

These paths predict responsibilities; they are not instructions to create every
file immediately. Fold small pieces together when a separate module has no real
consumer. Domain-based policy files keep Core/SPARQL/prose for one rule together.

| Paths                                                                                                                                                   | Responsibility / consumer                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `policy/editing-policy.ttl`                                                                                                                             | Canonical policy metadata, rule groups, ordering, local module references and human/procedural clauses. Local references do not authorize HTTP imports.                                                                                                                    |
| `policy/entity-policy.ttl`                                                                                                                              | Four-entity metadata, naming, labels, identifiers and their rule documentation.                                                                                                                                                                                            |
| `policy/ontology-policy.ttl`                                                                                                                            | Ontology version alignment and named global rules.                                                                                                                                                                                                                         |
| `policy/dataset-distribution-policy.ttl`                                                                                                                | DCAT profiles, optional-property constraints and registry selection.                                                                                                                                                                                                       |
| `policy/axiom-policy.ttl`                                                                                                                               | Axiom-specific constraints and their documentation.                                                                                                                                                                                                                        |
| `policy/policy-metadata-shapes.ttl`                                                                                                                     | SHACL validation of the renderer/runner's policy metadata contract; not a second encoding of ontology editing rules.                                                                                                                                                       |
| `policy/validation-context-shapes.ttl`                                                                                                                  | Native validation of runner-supplied mode, snapshot, ownership and change facts; target queries and editing obligations stay with their owning policy rules.                                                                                                               |
| `policy/adoption.ttl`                                                                                                                                   | Approved adoption baseline and enforcement-mode identity. Store a known predecessor SHA; never attempt to embed a commit's own hash in itself.                                                                                                                             |
| `policy/authorities/`                                                                                                                                   | Approved, immutable local vocabulary snapshots and source/rights/hash records. Derived membership lists are generated from these records.                                                                                                                                  |
| `scripts/ontology_policy/`                                                                                                                              | Cohesive Python package for policy loading, snapshot reading, entity-change selection, native execution and report presentation. Split into `policy_graph.py`, `ontology_snapshots.py`, `entity_changes.py`, `validation.py`, `reports.py` only as their contracts emerge. |
| `scripts/validate_ontologies.py`                                                                                                                        | Retained operational CLI, pre-install selection and mode/error handling; invokes the new package directly at cutover.                                                                                                                                                      |
| `scripts/render_editing_policy.py`                                                                                                                      | Deterministic Markdown generation and a read-only `--check` mode.                                                                                                                                                                                                          |
| `scripts/update_policy_authorities.py`                                                                                                                  | Only the residual snapshot ingestion/export needed after native format research; explicit maintenance command, no scheduler.                                                                                                                                               |
| `scripts/lint_ontology_rdfxml.py`                                                                                                                       | Conditional: create only if individual physical serialization rules are accepted. Never move graph rules here.                                                                                                                                                             |
| `tests/test_ontology_policy.py`, `tests/test_editing_policy_rendering.py`, `tests/test_ontology_entity_changes.py`, `tests/test_ontology_policy_cli.py` | Native unittest-discovered contracts at real consumer boundaries; use small independently authored fixtures.                                                                                                                                                               |
| `tests/fixtures/ontology-policy/`                                                                                                                       | Positive/negative graphs, expected native reports, paired Git scenarios and minimal authority fixtures. Preserve existing fixture formats where applicable.                                                                                                                |
| `docs/policy/Editing-Policy.generated.md`                                                                                                               | Reviewed generated view. Entire page comes from policy sources; not a separately maintained rule catalogue.                                                                                                                                                                |
| `docs/policy/migration-evidence.md`                                                                                                                     | Rule/assertion dispositions and retained evidence references; freeze after cutover, do not keep it as a second normative policy.                                                                                                                                           |
| `requirements.txt`, `requirements.lock.txt`, `.java-version`, `package.json`, `.github/workflows/ontology-validation.yml`, `.sdlc/verification.json`    | Exact approved dependency, runtime and integration changes described below. The lock covers both existing requirements inputs and their transitives.                                                                                                                       |
| `scripts/setUpDevelopmentEnvironment.js`                                                                                                                | Make the existing setup consumer install the reviewed locked environment; qualify its actual pip/bootstrap path rather than adding a parallel installer. Exact setup changes require approval.                                                                             |

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

| Rule family                  | Intended obligation / source                                                                                                                                                                    | Discriminating examples and proof                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EP-ONT-VERSION               | Version IRI/info alignment; optional ontology modified uses xsd:date only. Accepted DEC-001/025; proposed header profile DEC-027.                                                               | Matching version without modified passes; matching date passes; mismatched, malformed or dateTime modified fails. Review the inventory's header/cardinality and date lexical examples before shape approval.                                                     |
| EP-ENTITY-CREATED            | Exactly one UTC `xsd:dateTime` creation value.                                                                                                                                                  | Missing, two distinct timestamps, wrong datatype, invalid date and `+00:00` instead of lexical `Z` fail; a real `Z` value passes after native parsing.                                                                                                           |
| EP-ENTITY-CREATOR            | Exactly one creator IRI with canonical ORCID URI format. Accepted DEC-026.                                                                                                                      | Missing/two values/literal/malformed URI fail. A syntactically correct URI with an invalid checksum passes this limited rule; account registration and person identity are not asserted. Apply the same value rule to optional contributors.                     |
| EP-ENTITY-UUID               | At least one qualifying UUIDv4 URN on Class, NamedIndividual, ObjectProperty and DatatypeProperty. DEC-005.                                                                                     | One fixture per kind; missing UUID fails; version-1 UUID and bad variant fail even if Python's `UUID(..., version=4)` accepted them. A valid UUID plus permitted non-UUID identifiers passes.                                                                    |
| EP-IDENTIFIER-UNIQUE         | Distinct subjects in the selected corpus do not share an identifier, under DEC-015's accepted comparison.                                                                                       | A touched subject duplicates an untouched subject in another file: fail. Same subject's fragments in two files: not a second holder. Old/new release copies are not unioned.                                                                                     |
| EP-CLASS-NAME                | Class local name is PascalCase within approved scope.                                                                                                                                           | `RiskEvent` passes; `risk_event` fails; external declarations are not targets. Cover fragment and slash IRIs.                                                                                                                                                    |
| EP-INDIVIDUAL-NAME           | PascalCase suffix, optional exact asserted-class prefix. DEC-003.                                                                                                                               | `Red` and `Colour_Red` typed `Colour` pass; unrelated prefix, empty suffix, arbitrary underscore stripping and inferred-only superclass prefix fail. With two asserted classes, either prefix passes.                                                            |
| EP-PROPERTY-NAME             | Non-ISO camelCase MUST; ISO lower snake_case SHOULD. DEC-002/013.                                                                                                                               | Invalid non-ISO token fails; ISO uppercase token produces warning only; lower snake_case has no naming warning. Include `iso/`, `iso-iec/` and a misleading lookalike prefix.                                                                                    |
| EP-PREFLABEL-LANGUAGE        | Required language-tagged preferred label; one per language; exact accepted English tag. DEC-014.                                                                                                | `en`, `en-gb` and case variants pass; only `en-us` fails; non-English labels may coexist; two distinct preferred labels in one language fail. Do not use `uniqueLang` for ordinary labels.                                                                       |
| EP-PREFLABEL-IRI             | English preferred label corresponds to the local name after the accepted prefix and ASCII punctuation/case handling. Proposed DEC-014 follows the Wiki's spelled-out leading-digit instruction. | Three D Model matches ThreeDModel; 3D Model fails. Bank account matches BankAccount. Do not require translated labels to match an English identifier or expand an initial digit into a word during comparison.                                                   |
| EP-PREFLABEL-LABEL           | Each preferred RDF literal is also a label. DEC-004.                                                                                                                                            | Matching preferred terms plus additional labels pass; a preferred term lacking a same-language, exact-text label fails. Case/punctuation changes in the label do not silently match.                                                                             |
| EP-LABEL                     | Language-tagged labels; duplicate text/language constraint is per entity. DEC-006.                                                                                                              | Two entities with `"Bank"@en` pass; several different English labels on one entity pass; identical serialized triples collapse semantically. No cross-entity or one-per-language rule is added.                                                                  |
| EP-DEFINITION                | Required language-tagged definitions with at most one per language, within accepted entity scope.                                                                                               | Missing definition, plain literal and two English definitions fail; English and Romanian definitions pass. Whether the definition correctly distinguishes the concept is human review.                                                                           |
| EP-DESCRIPTIVE-LANGUAGE      | Proposed DEC-023: document and retain the existing 16-predicate language requirement in approved owned scope, including owned axiom annotations.                                                | An untagged skos:editorialNote on a selected owned subject fails; an external support-vocabulary literal does not acquire that obligation. No requirement is invented for arbitrary other predicates.                                                            |
| EP-DESCRIPTION-LANGUAGE      | Proposed DEC-023: optional generic descriptions have at most one value per language.                                                                                                            | Absence passes; two distinct English descriptions fail; different languages pass. Dataset presence and language rules remain in its separate profile.                                                                                                            |
| EP-MODIFIED / EP-CONTRIBUTOR | Changed existing entity has one well-formed modified value; dateTime uses `Z`, date allowed. Optional contributor values are ORCID IRIs. DEC-016/017.                                           | New entity need not have modified; changed existing one without it fails; syntax-only change does not trigger it. Existing valid timestamp behavior follows the accepted DEC-017 interpretation. Multiple contributors allowed; wrong-value tests apply to each. |
| EP-OPTIONAL-ANNOTATIONS      | references/source/seeAlso MAY repeat; acronym requires language; externally derived definition SHOULD cite source.                                                                              | Absence of optional values passes. A missing acronym language fails. Do not invent value node kinds for MAY-only clauses; externally derived provenance is a human decision unless represented explicitly.                                                       |
| EP-DATASET-TYPE-IRI          | Dataset profile, explicit types as accepted, canonical lowercase UUIDv4 dataset IRI.                                                                                                            | Wrong namespace, noncanonical UUID and absent required explicit type fail. Type-only and namespace-only candidates prevent omission of a type from evading the profile. DCAT nodes do not also receive incompatible PascalCase rules.                            |
| EP-DATASET-REQUIRED          | At least one theme IRI, title, description and label with the stated language/description uniqueness rules.                                                                                     | Missing required property fails; all theme values checked, including a bad second one; repeated-language descriptions fail. Distinct same-language titles/labels remain allowed.                                                                                 |
| EP-DATASET-DISTRIBUTION      | Optional `dcat:distribution`: every supplied value is an IRI referencing the required Distribution/NamedIndividual type.                                                                        | Absent passes; correct cross-file target passes; literal, untyped target or wrong-type target fails. Context must contain the authoritative local declaration, not a live fetch.                                                                                 |
| EP-DATASET-LANDING           | landingPage MAY repeat; original-provider intent remains a human rule.                                                                                                                          | No invented mandatory count or IRI constraint. Generated review guidance distinguishes provider judgment from any accepted machine check.                                                                                                                        |
| EP-DATASET-ACCESS-RIGHTS     | Optional: maximum one accessRights value MUST; IRI value SHOULD.                                                                                                                                | None passes; one literal warns; two values violate count even if each is a valid IRI.                                                                                                                                                                            |
| EP-DISTRIBUTION-REQUIRED     | Distribution type/UUID IRI, required accessURL IRIs and language-tagged label.                                                                                                                  | Missing property fails; a valid first URL and invalid second URL fails. Test all supplied values.                                                                                                                                                                |
| EP-DISTRIBUTION-DOWNLOAD     | Optional standard `dcat:downloadURL` values must be IRIs; may repeat. DEC-008/011.                                                                                                              | None or multiple valid IRIs pass; literal fails. The misspelled Wiki predicate is corrected explicitly, not accepted as an alias.                                                                                                                                |
| EP-DISTRIBUTION-MEDIA        | Optional mediaType: max one and actual IANA membership MUST.                                                                                                                                    | None passes; exact snapshot member passes; fabricated IRI under the correct prefix and a literal fail; two valid members fail count.                                                                                                                             |
| EP-DISTRIBUTION-FORMAT       | Optional format: max one MUST; EU File Type membership SHOULD.                                                                                                                                  | None passes; member passes; nonmember warns; two members violate maxCount.                                                                                                                                                                                       |
| EP-DISTRIBUTION-LANGUAGE     | Optional, repeatable language values: LOC ISO639-1 membership MUST.                                                                                                                             | None passes; two valid language members pass; plausible but unregistered code or wrong authority fails. Preserve authority HTTP/HTTPS IRIs as supplied, without equivalence aliases.                                                                             |
| EP-DISTRIBUTION-LICENCE      | Optional license: max one, IRI-valued MUST.                                                                                                                                                     | None passes; literal or two IRIs fails. Do not add SPDX membership as an unstated rule.                                                                                                                                                                          |
| EP-DISTRIBUTION-RIGHTS       | Optional, repeatable rights values SHOULD be IRIs.                                                                                                                                              | None/multiple IRIs pass; literal warns, without becoming a mandatory cardinality failure.                                                                                                                                                                        |
| EP-AXIOM-POSITION            | Within explicitly scoped `owl:Axiom`, `http://schema.org/position` is `xsd:integer`. DEC-007.                                                                                                   | Wrong datatype on axiom fails; same value outside axiom passes this rule. Test anonymous/named axioms, owner changes and all value occurrences.                                                                                                                  |
| EP-HUMAN-CONCEPT-REUSE       | Search for an existing concept before adding one; assess semantic fit and hierarchy.                                                                                                            | Generated human-review clause and real review evidence. A SHACL pass does not establish search completeness or conceptual correctness.                                                                                                                           |

The completed static mapping explicitly dispositions the broad language-tag list,
label-namespace exclusion, removal of punned types, XML namespace/rdf:about checks,
nonblank text and source duplicates. It also finds metadata omissions on properties
and historical ISO namespaces. Review DEC-012–015/018/022–024 and the remaining
value-profile examples before treating those dispositions as accepted policy.

## Validation context and target contract

This is the proposed closure of REV-001/002/006 for DEC-010/012/016/017/019.
Accept the contract with SLICE-000 and demonstrate it in SLICE-001 before expanding
the rule catalogue. The integrator owns the facts-to-engine boundary; Max owns
policy meaning and the independently reviewed example outcomes.

### Facts supplied by the repository boundary

Keep the selected head/snapshot graph, previous snapshot, source membership and
trusted runtime facts separately identifiable. Python reads exact Git/index bytes
and compares the accepted rooted closures through native RDFLib isomorphism. It
must not implement a property obligation, severity or per-rule applicability test.
The classifier implements the accepted change definition; calling it mechanical
does not exempt its ownership/closure semantics from review and independent tests.

Use a transient RDF context with a reserved vocabulary, provisionally `ctx:`.
Choose its exact IRI and terms in the configuration proposal. The context is a
validation input, never written into authored ontology files or published as data.

| Fact                           | Required meaning and provenance                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run identity and mode          | Exactly one requested audit or prospective profile; context-contract version and whether history is available. An explicit reduced audit cannot masquerade as complete.                                                            |
| Snapshot identity              | Data revision or index-tree identity, base/head when present, module-to-blob/hash membership, corpus selection and policy/adoption/authority identities. A path or wall-clock time is not a snapshot identity.                     |
| Subject and ownership          | Original RDF term plus source/module membership and owned axiom/root relationships from the accepted inventory and closure contract. Keep imported/support facts available without making them owned entities.                     |
| Change kind                    | With a comparison, added, changed-existing, deleted or unchanged relative to the identified base/head; classifications refer to semantic graphs. Without history, mark classification unavailable rather than asserting unchanged. |
| Dependency effect              | Separate relation recording surviving referrer, changed/deleted target and affected predicate/type fact. An unchanged referrer may be dependency-affected; this does not turn it into changed-existing.                            |
| Audit selection and exclusions | Requested subjects/modules, coherent context membership and explicit absent context/history. Availability of each rule family is determined by its canonical requirements.                                                         |

Retain previous and current graphs separately; never union both versions to supply
history. A deleted subject remains a comparison fact, not a head-graph entity with
new metadata duties. The canonical modified rule uses the changed-existing fact
to require the value. Static cardinality/datatype checks still apply where selected;
DEC-017 still permits an existing valid unchanged timestamp during ordinary editing.

Build a validation-only graph from the complete selected ontology, qualified
authority membership and trusted context. Before combining them, reject input
attempts to assert reserved context or trusted membership facts; do not silently
delete ordinary ontology triples to make validation pass. Validate the context
with its native RDF/SHACL contract before editing-policy execution. Missing mode,
contradictory classifications, absent required history or a source trying to label
itself unchanged is an execution/context error. The exact isolation and parser
boundary require QA-004 proof on both engines; an inability to preserve that
boundary triggers replanning, not a Python copy of the rule.

Hash and retain the context through a qualified native canonicalization/serialization
path together with its source identities. Do not use parser-assigned blank-node
labels as persistent IDs. Round trips must preserve context-to-axiom identity;
repeat runs on the same inputs must yield the same context identity. The report
retains original RDF terms and file provenance even when display order differs.
Execution-attempt IDs and timestamps belong in the receipt, outside that repeatable
context identity. Retain a combined native serialization that preserves shared
ontology/context blank nodes rather than independently relabeling their graphs.

### Canonical profile selection

Select **context-driven SHACL-AF SPARQL targets** for the normative execution path.
Each independently reportable rule's canonical target consumes mode, owned scope
and relevant facts. Reuse target definitions where meaning is identical, and keep
constraints/severity/prose under the same stable rule identity. Python passes the
complete approved shapes graph and complete validation input to the engine; it
does not choose a hand-maintained list of shapes for each change kind.

| Profile                      | Graph available to constraints                                     | Canonical target behavior                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Complete manual audit        | One coherent selected corpus plus pinned support/authority context | All applicable requested owned subjects. Static rules run; history-dependent rules are explicitly not evaluated unless a real comparison is supplied.                                                                                      |
| Prospective enforcement      | Complete head corpus and trusted comparison facts                  | Added/changed-existing subjects receive their applicable rules; changed ontology headers and owned axioms are covered. Dependency-affected survivors receive only affected relational checks. Untouched unrelated subjects supply context. |
| Explicit isolated-file audit | Requested file and only explicitly supplied context                | Local checks run and global/history exclusions are reported. It cannot satisfy complete-audit evidence or claim repository-wide conformance.                                                                                               |

Do not leave broad `sh:targetClass`/other targets on an executable shape and assume
an additional SPARQL target narrows them: targets combine rather than guard one
another. Likewise, a conditional SPARQL constraint does not guard sibling Core
constraints. Policy metadata/profile checks and mutation fixtures must detect both
mistakes. Exact asserted-type rules must not accidentally use subclass inference.

This choice uses a capability documented by [Jena](https://jena.apache.org/documentation/shacl/)
and the selected SHACL profile. [pySHACL's focus and shape selection](https://github.com/RDFLib/pySHACL#focus-node-filtering-and-shape-selection)
is a supported alternative, but correctness will not depend on callers supplying
the right filters. A later optimization must preserve independently expected
rule/focus pairs and the canonical target semantics. No engine-internal patches.

SPARQL targets and native property paths must reach original anonymous axioms as
RDF nodes, including changed orphan axioms under the accepted ownership decision.
Do not send blank-node labels to an IRI-only focus filter or skolemize source data.
This refines the dossier's earlier tentative focus-filter/temporary-target approach;
reconcile that proposal before baseline acceptance, rather than maintaining two
normative targeting mechanisms.

Accept independently authored expected **sets of (rule ID, focus node)** and native
findings for added, changed, unchanged, deleted and dependency-affected examples.
Mutation tests remove applicability/targets, add a broad target, change severity,
forge/drop context and omit an expected axiom. A known nonempty fixture yielding
zero targets fails qualification. A real no-op may select zero only with an intact
policy contract and an explicit, provenance-bearing no-change explanation.

### Historical and single-file corpus selection

`--all-current` selects the five working modules at the requested revision (or the
identified current snapshot), not every archived file. An explicit historical
release selects one identified artifact per required module using the existing
inventory/catalog/import contracts; resolve imports only to pinned local data.
Use that release's declared sibling context, which may have different module dates,
and report the complete map. Never guess a coherent release from the largest
filename, a matching calendar date or today's drafts.

A file-only audit defaults to resolving its coherent context through those native
maps. Missing or ambiguous siblings fail the complete audit. Only an explicit
`--isolated-file` request permits reduced scope, with unavailable global checks
listed in the result. A plain snapshot audit has expected missing history, not
an engine error; a prospective run missing its requested comparison is an error.
Historical policy selection reads policy data with the current qualified runner;
unsupported context/profile versions fail explicitly. No historical script executes.

## Vertical slices and proof

### SLICE-000 — Accept the reconciled baseline and integration boundaries

**Outcome:** A reviewer can approve what policy will mean and what will change.
Links: every REQ/AC; all dossier decisions; QA-001–008. Owner: Max accepts, integrator prepares.

- [ ] Refresh the exact candidate/trusted-base identities and current SDLC consumers
      before approval. The 11 September inspection already includes main `557d4bb`;
      the review's older `13a3c36` is historical evidence, not a merge instruction.
      Reconcile REV-001–010 with the dossier and existing Issue #31 through the
      authorized owner process. Never overwrite an accepted snapshot to absorb drift.
- [x] Complete the static Wiki-clause/Python-assertion disposition inventory and
      capture exact Wiki source bytes/hash and page/repository revision identities.
      Preserve earlier report/CSV hashes and accepted decision transcription;
      record that the original CSV is no longer at its supplied path rather than
      claim a newly verified verbatim copy. The inventory separates proposals from
      acceptance and maps all 58 assertion call sites.
- [x] Inventory existing working-source selection, build source discovery, editor
      catalogs and historical module identities. Record the five native RDF parses
      and the limited XML-header check of 159 historical artifacts truthfully.
- [x] Prepare one Change Issue body locally for owner review; no remote write,
      acceptance timestamp, Issue number or baseline capture is implied.
- [ ] Settle proposed scope, target, prefix/digit, identifier and change semantics
      using concrete fixtures from the table. Select no policy exception implicitly.
- [ ] Accept the context/target and historical corpus contract above, including
      reserved-fact isolation, unchanged dependency effects, anonymous/orphan axioms,
      explicit isolated-file limits and module deletion/rename ownership. Bind it to
      concrete expected rule/focus pairs; reuse existing import/module maps.
- [ ] Review the proposed SHACL software/rights research and exact dependency
      changes. Existing repository dependencies and this worktree's `.venv` were
      initialized at Max's request through the documented development setup using
      npm 12.0.2. Local skill activation subsequently completed with Max's exact
      approval; its installed bytes and invocation settings were verified. Preserve
      the setup results and failures recorded in the dossier. Do not borrow another
      worktree's environment or treat this setup as SHACL engine qualification.
- [ ] Accept the editing/release increment boundary in DEC-021. The follow-on
      timestamp examples are proposed release requirements, not an implicit amendment
      making ontology-level modified mandatory in every editing check.
- [ ] When authorized, update existing Issue #31 with the reconciled dossier's
      motivation, requirements, decisions, scenarios and revised plan. Obtain actual owner
      acceptance, then use `npm run sdlc -- snapshot --help` and the native capture
      command with the real Issue number, accepted-by/time and approval reference.
      Merge its baseline before implementation. Do not invent any of these values.
- [ ] Obtain exact configuration approval at the appropriate slice, not a blanket
      future waiver. Start R2 implementation with `npm run sdlc -- begin` referencing
      the accepted baseline, purpose, new functionality and completed software selection.

**Proof:** Independent baseline reviewer confirms every accepted decision's
representation, the original source inventory and policy-only additions/removals.
Native baseline/schema checks confirm capture identity, not human agreement.
**Exit:** Accepted/protected baseline and a usable approved environment. If rights
or scope remain unresolved, stop only the affected design/implementation slice.

### SLICE-001 — Prove one rule from source graph to report and policy text

**Outcome:** A real creation-timestamp rule validates a fixture and appears in
generated Markdown from the same canonical entry. Links: REQ-001/006/007/008,
AC-001/002/006/007/008; context proof also covers REQ/AC-003/005,
QA-003/004/005/007 and DEC-010/016/017/019/020.

Likely files: first policy entry and metadata contract, native loader/execution
boundary, renderer, `tests/test_ontology_policy.py`, rendering tests and fixtures;
approved dependency and npm additions needed for those paths.

- [ ] Resolve approved exact distributions and record their hashes, transitive
      dependencies and notices in the complete native lock described below. Qualify
      clean Python 3.14.7 `.venv` installations on Linux and Windows; test altered
      hash/version, missing transitive and installed-environment drift. Retain native
      failures; a resolver report or minimum-Python declaration is not execution proof.
- [ ] Provision the approved JDK/Jena qualification path and run this first rule,
      context isolation, lexical preservation and target fixtures on both engines.
      Establish a usable second engine now, not for the first time in SLICE-007.
- [ ] Create independently reviewed timestamp fixtures before the constraint:
      valid UTC, absence, two values, bad datatype/date and `+00:00`. Establish an
      executable native seam; observe a missing/incorrect rule producing the wrong
      result as behavioral RED, not an import error.
- [ ] Implement the canonical rule, native parse/Meta-SHACL path, metadata contract
      and the smallest deterministic renderer. Verify native literal normalization
      settings preserve the relevant original lexemes in RDF/XML and Turtle.
- [ ] Prove named rule identity, focus node, path, severity and invalid value in
      the report. Include an external declaration that is not a policy target and an
      in-scope subject that cannot evade the rule by fragmented RDF/XML syntax.
- [ ] Qualify the canonical context-driven targets and context schema with named
      entities and anonymous axioms before later rule families. Add a changed-existing
      modified applicability example and mutate the SHACL condition while holding
      classifier facts fixed; the test must detect lost/extra obligation. Keep all
      property/severity decisions out of Python. Empty scope and missing-target
      failures must match the independently reviewed rule/focus sets.
- [ ] Mutate/remove the real rule in a disposable task-owned copy and show the
      contract/freshness checks detect the regression. Preserve the evidence and restore
      only that disposable mutation; do not disturb the working tree.

**Proof:** Focused native unittest route, Meta-SHACL, actual RDF input parsing,
generated Markdown readback and repeatable bytes. Record elapsed time, selected
versions, context identity and Windows/Linux native engine reports. Measure the
first representative cold/warm validation timings and propose QA-007 budgets.
**Exit:** One complete portable path demonstrated, including Jena provisioning.
Unresolved target/context/toolchain proof blocks dependent expansion; pipeline
replacement is not yet enabled.

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
- [ ] Implement the approved physical-syntax lint only if one is retained. Delete
      no legacy rule yet; compare it as evidence without treating it as domain truth.

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
- [ ] Load the authoritative five-source corpus, not just changed files. Retain
      source membership separately from the union graph for reports. Scope imported
      support data without deleting the facts needed to validate links.
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
      one coherent release at a time; historical release copies are separate audits.

**Proof:** Independent minimal vocabulary fixtures and native source-payload
reconciliation; cross-file contract fixtures; real current-corpus diagnostics.
**Exit:** All DEC-008 checks implemented with their actual strengths and scope.

### SLICE-005 — Deliver manual historical audits and prospective entity selection

**Outcome:** Max can audit latest/older ontologies; the normal gate targets actual
new/changed entities and the required contextual checks. Links: REQ-003/004/005,
AC-003/004/005, QA-001/002/006; DEC-009/010/016/017/021.

Likely files: snapshot/change selection package, retained runner, real Git fixtures
and CLI tests. Snapshot mechanics may start after SLICE-001's accepted context
proof; integrated acceptance depends on SLICE-003/004 and accepted change semantics.

- [ ] Extend the existing selection contract: exact refs, NUL-delimited paths,
      missing-input errors, source deletions, explicit files and pre-install planning.
      Parse staged blobs from the index; parse base/head blobs from their commits.
      Never validate the worktree as a substitute for the index or requested revision.
- [ ] Add explicit manual snapshot and historical-data selection. Read historical
      data without changing the checkout; report ontology and policy revisions
      independently. A run on an older version uses the current chosen policy unless
      the caller explicitly requests a different policy source.
- [ ] Compare rooted entity closures with native RDFLib isomorphism. Include
      nested restrictions/lists and annotations about the entity, avoid crawling
      arbitrarily through every named object, and treat shared blank-node ownership
      and orphan axiom changes explicitly. Use accepted examples for incoming edges.
- [ ] Keep graph comparison independent of Git/path acquisition: it consumes two
      identified ontology snapshots and returns added/changed/deleted classifications
      with provenance. A working file and a dated `src/` file can have different paths
      while representing the same ontology. Cover that case in the existing paired
      snapshot fixtures. This is the shared capability for later promotion; do not
      add a release writer, generic plugin framework or speculative public command.
- [ ] Emit the trusted RDF change context and prove its schema, deterministic
      identity, source isolation and original axiom-node binding. Execute the same
      canonical profile on full context in both engines; preserve ontology and policy
      source bytes. Report native targets as well as change classifications.
- [ ] Prove the canonical modified rule requires presence only for changed-existing
      entities, under DEC-017. Python supplies classifications, not property checks.
      New/deleted/syntax-only cases remain distinct; plain audit reports unevaluated
      history while retaining applicable static modified checks.
- [ ] Run dependency-specific reference checks on surviving subjects when a target
      is deleted or loses required type. Do not activate every unrelated metadata
      constraint on an unchanged referrer. This bounded integrity check needs its
      explicit accepted scope, not an implicit broadening of prospective enforcement.
- [ ] Establish the adoption baseline from an approved existing Git commit. Reject
      unavailable/unrelated refs; do not use file dates, first-parent guesses or an
      invented epoch. Discuss branches predating adoption before their first gate.

**Proof:** Real isolated Git fixtures for staged/worktree disagreement, rename,
deletion, missing ref, change-then-revert, source-fragment movement, new/changed
subjects, axiom changes, blank-node relabeling, shared structures and the same
ontology read from different draft/versioned paths. Preserve the actual input
hashes and native reports.
Include both staged-invalid/worktree-valid and staged-valid/worktree-invalid
directions, missing/ambiguous historical sibling context, different-release
isolation, context spoofing and removal/type-loss effects on untouched referrers.
**Exit:** AC-003 and AC-005 demonstrated; the old-data audit is usable before cutover.

### SLICE-006 — Integrate actionable reports and the existing delivery path

**Outcome:** The CLI, hook and CI give consistent scoped outcomes without false
failures from printed warnings. Links: REQ-003/008/009/010,
AC-003/008/009/010, QA-001/004/005/006. Depends on SLICE-002–005.

Likely files: runner/report presentation, CLI tests, approved npm/workflow/profile
changes and their existing integration tests. Preserve the current hook entrypoint
unless an exact approved change is needed.

- [ ] Retain native RDF reports and output a concise contributor summary with rule,
      focus node, path/value, severity, source file(s), policy link and useful action.
      Report base/head/index, corpus/policy/snapshot/context/lock hashes, runtime
      identities, selected rule IDs and focus counts by change kind/dependency effect.
      Keep audit findings, prospective blockers, warnings and unavailable rules
      separate. Test these fields at the CLI/report consumer, not just in a helper.
- [ ] Define process outcomes: `0` completed with no blocking violation (including
      warnings or explicit non-applicability); `1` policy violation in the selected
      enforcement scope; `2` execution/context/policy-definition failure. Preserve native
      status information where its values differ. No broad exception-to-pass handling.
- [ ] Keep native report conformance separate from the MUST-only merge decision.
      Publish warning counts visibly and test warnings-only success. Remove the current
      `output.strip()`-means-failure logic coherently with all its consumers.
- [ ] Make policy files, renderer, snapshots, fixture harness and relevant dependency
      inputs trigger policy QA. Policy-only changes run fixtures, metadata/freshness
      checks and full diagnostic comparison; they do not make every old defect a new
      default blocker. Ontology changes retain incremental focus plus complete context.
- [ ] Integrate the two mandatory full-verification results below: the explicit
      prospective comparison and a complete current-source audit. Qualify the native
      lifecycle's comparison-input/freshness contract before its exact configuration
      change. Retain both native reports even when either operation fails. An audit
      with old violations is completed evidence; an absent, truncated or failed audit
      is not. No `continue-on-error`, `|| true` or accepted-error-code workaround.
- [ ] Exercise clean locked installations and the approved Windows/Linux matrix
      through their real setup/workflow consumers. Preserve dependency-free selection
      before installation, and trigger qualification on lock/JDK/toolchain changes.
- [ ] Preserve workflow job/check identity when practical; changes to required
      checks or branch rules are separate exact remote settings decisions. Use the
      real accepted PR base/head contract and the actual staged hook path.
- [ ] Retain failure reports on failed jobs. Escape GitHub workflow-command data,
      truncate display only (not retained evidence), avoid guessed line numbers and
      prevent a malicious literal from creating a new annotation command.

**Proof:** Runner tests, workflow/PR-selection tests and an authorized disposable
integration exercise with warning, violation, error, no-op and removed-file cases.
**Exit:** Both local and CI consumers understand the new status/report contract.

### SLICE-007 — Reconcile parallel evidence and qualify cutover

**Outcome:** Evidence supports the accepted new policy, not accidental equality
with old bugs. Links: all acceptance criteria except actual publication/real-use
completion; QA-003–007. Depends on SLICE-001–006.

- [ ] Run a finite differential campaign against frozen examples and the latest
      source corpus. Classify each difference as intended policy change, added coverage,
      dropped serialization detail, legacy defect, SHACL defect or unresolved meaning.
      Keep failed cases as evidence. Do not demand dual blocking when DEC-006 deliberately
      permits data the old suite rejects.
- [ ] Run the independent engine on policy fixtures and representative full manual
      and prospective input using SLICE-001's qualified toolchain and context contract.
      Compare target sets and result meaning by named rule/focus/path/value/
      severity; allow only documented serialization/message-order differences. Reduce
      disagreements to fixtures and resolve them before qualification.
- [ ] Complete the R2 full verification obligations after the final relevant edit.
      Distinguish retrospective source-audit violations from failed machinery and from
      new/changed entity violations. Use the approved prospective verification profile;
      require its separate complete current-source audit report. No whole-corpus-clean
      prerequisite is inferred, and no missing audit can be called non-blocking debt.
- [ ] Freeze exact source/policy/fixture/dependency identities. Obtain independent
      verification and ordinary plus triggered specialist review. The verifier executes
      accepted evidence and does not edit tracked implementation artifacts.
- [ ] Request the authorized native Codex Security diff workflow for the changed
      RDF/SPARQL/Git/process/CI ingress where the security review policy triggers it.
      Preserve native outputs and any Windows artifact-access gap; do not replace it
      with generic parallel scanners or describe unavailable coverage as clear.
- [ ] Record runtime/memory on the five current source files and realistic fixtures,
      including adverse blank-node structures. Check the accepted cold/warm hook,
      full-audit and peak-memory budgets plus the existing 600-second ceiling.
      Record machine/corpus/repetition identities and stage timings. A timeout or
      unavailable measurement stays a gap; optimize a measured bottleneck through
      native capabilities rather than silently relaxing a control.
- [ ] Max reviews the latest-ontology findings and the contributor repair/policy-edit
      walkthrough. Any desired data remediation becomes an explicit scoped change;
      do not silently edit ontology data or demand cleanup of untouched entities.

**Proof:** Frozen differential ledger, second-engine report, independent verifier,
review findings and native security evidence where applicable, full profile records,
and human outcome acceptance. Missing evidence remains missing.
**Exit:** No unresolved policy/target/semantic-name defect; intended differences are
accepted and all blocking prospective failures are resolved.

### SLICE-008 — Cut over, publish the Wiki projection and retire duplication

**Outcome:** The accepted policy source actually governs new work and its Wiki view.
Links: REQ-001/009/010, AC-001/009/010, QA-008. Depends on SLICE-007 and explicit
cutover/publication authority.

- [ ] Switch the existing operational runner to the qualified SHACL path. Remove
      migrated graph assertions from `tests/universalontologytest.py` and remove the
      file if no accepted responsibility remains. If serialization lint survives,
      give it its precise operational name instead of retaining a misleading test name.
- [ ] Remove a dependency such as `xmlunittest` only after searching all consumers
      and receiving exact dependency approval. Do not remove lxml/defusedxml/RDFLib
      merely because this path no longer needs one of them.
- [ ] Record the approved adoption boundary and focused/manual behavior. Regenerate
      and review the complete Editing Policy. Legacy validation remains historical
      evidence, not a runtime fallback or another editable policy authority.
- [ ] Prepare the exact generated `Editing-Policy.md` update for the separate Wiki
      repository; show its source identity and current Wiki diff before the authorized
      write. Use GitHub's native Wiki Git workflow. Commit/push only with appropriate
      authority and read the published bytes/revision back. Preserve any concurrent
      Wiki edits for reconciliation; never force-overwrite them.
- [ ] Make the generated page explain where contributors propose policy changes.
      When publication is delayed, expose the published policy revision and repository
      link so readers can identify staleness; do not claim the Wiki already matches.
- [ ] Remove only spent task-owned comparison transports after their consumers
      finish. Keep fixtures, accepted baselines, failure evidence, licences, snapshots,
      migration decisions and publication/recovery receipts.

**Proof:** Actual hook/CI observation after cutover, Wiki readback and the first real
post-adoption contribution/policy change. Installation or merge alone is not this
evidence. **Exit:** Max accepts the operational outcome; otherwise record an honest
handoff and the concrete remaining owner/action.

## Subsequent increment: validated ontology release promotion

This is a scoped follow-on proposal for Max's latest request, linked to MOT-006
and DEC-021 in the dossier. It is not SLICE-009, a prerequisite to SHACL cutover or
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
mandatory release metadata is a separate proposed profile. Preserve prospective
structural scope when the previous release predates adoption, and distinguish
declared version dates from actual publication times.

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

The release increment needs its own accepted evidence and rollout decision. Its
implementation effort is excluded from the estimates below. The current increment
only makes its already-required snapshot comparison reusable and records the
future consumer's constraints; it does not claim promotion is implemented.

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
| Cross-engine and cross-platform comparison | Identified manual and prospective run inputs, context facts, authority set and policy; byte-stable generated Markdown                                              | Mandatory target-set and rule/focus/path/value/severity parity. Blank-node labels and result ordering may differ; lost results/severities may not.                        |

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
| `validate:ontologies`     | `node scripts/runRepositoryPython.js scripts/validate_ontologies.py` — retained CLI with explicit manual/prospective modes.                                          |
| `test:ontology-policy`    | `node scripts/runRepositoryPython.js -m unittest discover -s tests -p test_ontology_*.py -v` — native discovery, include semantic policy, changes and CLI contracts. |
| `test:policy-rendering`   | `node scripts/runRepositoryPython.js -m unittest discover -s tests -p test_editing_policy_*.py -v` — rendering contract.                                             |
| `generate:editing-policy` | `node scripts/runRepositoryPython.js scripts/render_editing_policy.py` — writes the generated view deliberately.                                                     |
| `check:editing-policy`    | `node scripts/runRepositoryPython.js scripts/render_editing_policy.py --check` — freshness/metadata check, no tracked writes.                                        |

Examples after approval and implementation:

```text
npm run validate:ontologies -- --all-current
npm run validate:ontologies -- --at-revision b32d7cff65e57a4d4ea68334350e27b8ef5038ef --all-current
npm run validate:ontologies -- --at-revision b32d7cff65e57a4d4ea68334350e27b8ef5038ef reference-data/reference-data.owl
npm run validate:ontologies -- --staged
npm run validate:ontologies -- --all-current --report-only
npm run test:ontology-policy
npm run test:policy-rendering
npm run check:editing-policy
```

The first three are manual audits, with nonzero exit for detected violations and
explicit context/history scope. CI retains its real `--diff-base`/`--diff-head`
arguments. Add `--policy-revision` only as an explicit, tested data selection;
never load executable code from that revision. An explicit `--isolated-file`
modifier permits only the reduced audit defined above. `--report-only` is the
audit-evidence collection operation described below, incompatible with prospective
selection and insufficient by itself for a full-verification pass.

Before each configuration request, prepare a concrete smallest patch:

| Exact file(s)                                                     | Proposed setting / behavior and impact                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirements.txt`, new `requirements.lock.txt`                   | Add qualified `pyshacl==0.40.1` and exact `rdflib==7.6.0`; refresh before approval. Lock the complete combined ontology/SDLC resolution and approved Windows/Linux artifacts with hashes. Review all resolved rights. The lock is mandatory for qualification, but its creation and every pin/hash still require exact approval.                                                                                                                                                          |
| `scripts/setUpDevelopmentEnvironment.js`                          | Consume the complete lock in the existing `.venv` setup; qualify an exact pip bootstrap, replace the floating upgrade and sequential unpinned installs coherently, and preserve other setup responsibilities. Treat this as an explicit setup/configuration behavior approval.                                                                                                                                                                                                            |
| New `.java-version`                                               | Record the exact qualified JDK LTS patch/build; explicit vendor/platform selection is bound by the workflow and qualification evidence. Jena requires Java 21+, but no floating `21`, `25` or `latest` pin is proposed.                                                                                                                                                                                                                                                                   |
| `package.json`                                                    | Add only the entry points above that the slice actually implements. No alteration to `prebuild`, deployment, unrelated format/lint scripts or package-manager version.                                                                                                                                                                                                                                                                                                                    |
| The policy TTL files and authority/adoption metadata listed above | Approve exact constraint, severity, target and documentary content plus consumers. These are policy configuration, even though executable behavior is tested.                                                                                                                                                                                                                                                                                                                             |
| `.github/workflows/ontology-validation.yml`                       | Preserve pre-install selection and the existing contribution check. Add locked installs, policy QA and explicitly identified Linux/Windows qualification jobs with approved setup-java/action revisions, `.java-version`, Jena URLs/digests/signature verification and cache identities. Retain reports on failures. Preserve `contents: read`; Wiki writing stays outside this workflow. Changes to required check names need their own remote decision.                                 |
| `.sdlc/verification.json`                                         | Add policy fixture/freshness obligations; replace the unconditional legacy whole-file blocker with a blocking prospective comparison plus a mandatory complete audit-evidence command. Retain the existing 600-second ceiling. Bind actual comparison and toolchain inputs to native freshness checks; do not invent environment/template interpolation, an ignored runtime-file fingerprint or accepted nonzero exits. Qualify the current lifecycle consumer first, as described below. |
| Existing workflow-selection/integration tests                     | Update assertions for approved changed inputs and consumer behavior, not to mask missing checks. No gratuitous test-runner configuration edits.                                                                                                                                                                                                                                                                                                                                           |
| Wiki repository `Editing-Policy.md`                               | Replace only with the reviewed generated projection after separate authorization; no secret/token or automatic-publication configuration is proposed now.                                                                                                                                                                                                                                                                                                                                 |

Only the proposed Python lock is in scope; `package-lock.json`, `skills-lock.json`,
`AGENTS.md`, `REVIEW.md`, SDLC version/status, CODEOWNERS, branch protections and
hooks have no presumed changes. A necessary lifecycle/schema extension for explicit
comparison input needs a concrete minimal design and exact file/setting approval;
the verification configuration cannot grant it implicitly.

## Verification routing and evidence retention

### Mandatory complete-audit evidence

For the R2 migration's final full profile, require both outcomes on the same
identified candidate/policy/authority inputs:

| Operation                                                  | Policy result                                                                                                                      | Effect on qualification                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Prospective enforcement on the explicit current comparison | No blocking findings, including warning-only                                                                                       | Eligible only when all other required obligations complete.                                                       |
| Prospective enforcement                                    | A blocking violation on its canonical targets                                                                                      | Fails qualification; an audit cannot replace it.                                                                  |
| Complete current-source audit                              | Completed with retained legacy or other corpus findings                                                                            | Required diagnostic evidence. Findings alone do not widen prospective scope or require unrelated ontology repair. |
| Either operation                                           | Missing context/input, invalid policy, engine failure, timeout, interruption, missing/corrupt report or incomplete source coverage | Fails qualification. Non-blocking findings never excuse broken or absent execution.                               |

Ordinary manual audit keeps its public `0`/`1`/`2` outcome contract. The proposed
`--all-current --report-only` operation succeeds only at **collecting complete
audit evidence**: native RDF findings, native conformance, underlying audit outcome,
all five module identities, policy/context/authority/engine/lock identities and
counts are persisted and read back successfully. It returns `0` for complete
evidence even if the contained audit outcome is `1`, and `2` for execution or
evidence failure. It never rewrites a violating report as conformant. Reject its
combination with prospective flags or reduced isolated-file scope. Its report must
state which history-dependent rules are not evaluated in a plain snapshot audit.

Implement this explicit collection behavior in the retained CLI/report boundary,
not a shell wrapper that suppresses validator failures. Preserve the complete native
audit report in captured command output or a durably retained artifact whose
identity and readback are verified by that command. The prospective row remains
separately required. Test legacy findings, warnings, a missing report, missing
sibling, engine failure, output-write failure and an interrupted collector through
the real lifecycle/workflow consumers. Audit-only execution cannot satisfy both rows.

At the refreshed revision, `.sdlc/verification.json` accepts command `name`, `argv`
and timeout, while `scripts/sdlc.py` requires exit zero for a successful command.
It has no built-in report-only semantics or comparison-argument interpolation.
`scripts/_sdlc_state.py` also rejects runtime/scratch paths as fingerprint inputs.
Do not work around those contracts by a mutable environment variable, ignored
comparison file, `continue-on-error`, fabricated receipt or `|| true`.

Before SLICE-006's exact patch approval, demonstrate how the existing native
lifecycle will capture the caller's actual base/head or index identity and bind it
to execution and evidence freshness. Include a changed-comparison counterexample
with identical workspace bytes. If a lifecycle/schema extension is required,
prepare its minimal owning-file change and accepted scope decision first; do not
invent supported flags or weaken the consumer. Until that integration exists,
the proposed full-profile replacement is blocked, not qualified by manual commands.
The same comparison must govern contribution and full assurance; no implicit
since-adoption cohort or arbitrary first-parent substitute is introduced.

Retain current version 3 run receipts and captured command bytes through the
native lifecycle writer. Refresh evidence after relevant source, policy, fixture,
context, comparison, dependency, runtime or control changes. Older branch/engine
results remain historical; they cannot qualify the combined final target.

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
prospective replacement, mandatory complete-audit evidence and policy checks must be concrete before
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
machines for a representative small edit, the five-source audit and adverse shared
blank-node structures. Record cold/warm runs, repetitions, corpus size, wall-clock
stage durations and peak memory. Max accepts numerical hook-latency, full-audit
and memory budgets before SLICE-007 qualification; unmeasured targets remain open.
The existing 600-second ontology-command timeout remains the control ceiling.
Exceeding an accepted budget requires optimization or an explicit owner decision,
never a silent timeout increase. Do not treat a 599-second hook as usable merely
because it meets the CI ceiling.

## Dependencies, sequencing and indicative effort

The traceability below is the implementation handoff. A slice's result remains
subject to the dossier's accepted/proposed distinction; the table does not approve
its decisions or establish its evidence.

| Slice     | Requirement and acceptance links                                                                             | Main scenarios / decisions                                                  | Proof and release implication                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-000 | REQ-001–REQ-010; AC-001–AC-010                                                                               | All applicable QA/DEC entries                                               | Complete disposition inventory and protected accepted baseline; no runtime change.                                                                 |
| SLICE-001 | REQ-001, REQ-003, REQ-005, REQ-006, REQ-007, REQ-008; AC-001, AC-002, AC-003, AC-005, AC-006, AC-007, AC-008 | QA-003, QA-004, QA-005, QA-007; DEC-010, DEC-016, DEC-017, DEC-019, DEC-020 | One rule through report/Markdown plus trusted context/applicability/target proof and locked Windows/Linux JDK/Jena qualification; retain failures. |
| SLICE-002 | REQ-001, REQ-006, REQ-010; AC-001, AC-006, AC-010                                                            | QA-003, QA-005; DEC-020                                                     | Freshness/coverage negative controls and human reading; local projection only.                                                                     |
| SLICE-003 | REQ-001, REQ-002, REQ-007; AC-001, AC-002, AC-007                                                            | QA-003, QA-005; DEC-001–DEC-007, DEC-012–DEC-018, DEC-022–DEC-027           | Independent entity/version/axiom examples; retain legacy comparison input.                                                                         |
| SLICE-004 | REQ-002, REQ-004, REQ-008; AC-002, AC-004, AC-008                                                            | QA-004, QA-005; DEC-008, DEC-011, DEC-012, DEC-015                          | Full DCAT optional-value and cross-file tests; preserve snapshot rights/provenance.                                                                |
| SLICE-005 | REQ-003, REQ-004, REQ-005; AC-003, AC-004, AC-005                                                            | QA-001, QA-002, QA-006; DEC-009, DEC-010, DEC-016, DEC-017, DEC-021         | Real Git/index and closure fixtures; manual audits usable before gate cutover; snapshot comparison independent of draft/versioned paths.           |
| SLICE-006 | REQ-003, REQ-008, REQ-009, REQ-010; AC-003, AC-008, AC-009, AC-010                                           | QA-001, QA-004, QA-005, QA-006                                              | Native CLI/hook/CI statuses, explicit comparison freshness, mandatory full-audit evidence and actual locked-install matrix; retain failed reports. |
| SLICE-007 | REQ-001–REQ-010; AC-001–AC-010, except live publication/use                                                  | QA-003–QA-007; accepted rule/selection decisions                            | Frozen reconciliation, full obligations and independent review; cutover qualification only.                                                        |
| SLICE-008 | REQ-001, REQ-009, REQ-010; AC-001, AC-009, AC-010                                                            | QA-008; DEC-009, DEC-020                                                    | Real cutover, Wiki readback and human outcome evidence; retire spent duplicate machinery.                                                          |

| Slice | Prerequisites                                                                       | Independently demonstrable result                                                              | Planning effort                     |
| ----- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| 000   | Current task and source review                                                      | Accepted rule/scope baseline and exact integration permissions                                 | 2–4 engineer-days plus owner review |
| 001   | 000                                                                                 | One portable rule/context path validates, reports and renders in qualified locked environments | 2–4 days base; contingency below    |
| 002   | 001                                                                                 | Complete checked documentation path                                                            | 2–4 days                            |
| 003   | 001/002 and domain examples                                                         | Entity/ontology/axiom contract fixtures and source diagnostics                                 | 4–7 days                            |
| 004   | 001–003, corpus and rights decisions                                                | DCAT/authority/cross-file evidence                                                             | 3–6 days                            |
| 005   | 000/001 context and target proof; integrated rules/authorities for final acceptance | Historical audit and genuine prospective selection                                             | 4–7 days                            |
| 006   | 002–005                                                                             | Working hook/CI/report integration                                                             | 2–4 days                            |
| 007   | 001–006                                                                             | Frozen reconciliation, independent checks and accepted cutover evidence                        | 3–5 days plus observation           |
| 008   | 007 and separate action approvals                                                   | Operational gate and published policy projection                                               | 1–2 days plus live acceptance       |

Base estimate: **23–43 engineer-days**, with **3–7 engineer-days of review-driven
contingency**, giving **26–50 engineer-days** before approval delays, optional
ontology remediation and the separate release-promotion increment. The contingency
covers under-specified locking, JDK/Jena provisioning, trusted context and native
full-audit integration; do not add every overlapping review estimate again.
This is a planning range, not a measured delivery promise or accepted calendar.
The review's dated Gantt is illustrative; no September start date is committed.
Re-estimate after SLICE-001 and SLICE-005; integration, closure semantics and registry
rights remain the principal uncertainty. Preserve default/manual scope and assurance.

Move context/target acceptance and a real Jena smoke qualification to SLICE-000/001.
Once those contracts and oracle fixtures are stable, Git snapshot mechanics can
progress alongside independent rule families; their integrated acceptance still
waits for the required rules and authority context. SLICE-006, final parity/full
verification, cutover and Wiki publication retain their stated dependencies.

Independent rule families may later proceed concurrently after target vocabulary,
report contracts and fixtures are accepted. Coupled ownership changes remain
sequential. No additional agents or new tasks were created for this planning work.

## Cutover, abort and recovery

Before cutover, keep the current operational validator authoritative and compare
SHACL explicitly as migration evidence. This can temporarily reject proposed
new-policy examples; record the incompatibility rather than inserting an escape
into the production validator. Cutover changes the authority only after reconciliation.

After cutover, do not claim a clean manual audit unless it is clean. Existing
untouched defects are retained as diagnostics; new/changed entities must meet their
accepted obligations. A shape change must not silently widen this default scope.
Intentional changes to policy semantics or adoption scope require a new accepted
baseline version where the repository rules require it.

Abort on unexplained engine differences, missing target coverage, malformed input,
unavailable necessary context, unresolved NAM-01 defects, unsupported/licence-blocked
dependencies, missing/changed locked artifacts, context impersonation, absent
mandatory audit evidence, unauthorized shims or a failed required assurance obligation. Preserve
the failed evidence. Replan the affected slice; no fallback-to-legacy success path.

Recovery uses the accepted policy and last qualified implementation: prepare a
reviewed forward fix or explicitly suspend the new gate under Max's decision.
Reverting a policy change and reverting its implementation are separate semantic
decisions. Keep ontology source unchanged unless its remediation is approved.
For a Wiki failure, retain the generated artifact and last published commit; compare
current remote state before an authorized retry, and expose the stale revision.
Native Wiki editing uses its separate Git repository, as documented by
[GitHub](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages).

## Completion evidence and current handoff

Implementation completion requires AC-001–010 evidence on the actual final inputs,
accepted policy differences, independent R2 verification/review, honest security
coverage where triggered, correct default/manual behavior and actual publication
readback. Product outcome acceptance also needs Max's walkthrough and real-use
observation. A checkbox, successful schema parse, installed engine or merged PR
cannot substitute for these records.

The planning deliverables remain the dossier, this revised plan, the static
58-call-site rule/source inventory and the existing Issue proposal. The dossier
retains the earlier setup, five working-graph parses, 159 archived-header inventory,
no-install package resolution, licence evidence and resolved setup history. Those
records retain their original revisions and scope; they are not current SHACL
execution or a full-SDLC qualification run.

The 11 September revision incorporates the supplied independent review, SHA-256
`5f76f8cefde092f8b822d35355fde7cd173228d197965cc4e9e940f645ad970f`, with explicit
REV-001–010 dispositions and updated slice proofs. Current source inspection
confirmed the merged main identity, legacy runner/workflow, native lifecycle
receipt/fingerprint constraints and absence of a committed Issue #31 baseline in
trusted main. Primary documentation refreshed engine, pip and Java provisioning
claims. The supplied independent review covers the earlier plan; this revised
proposal still needs ordinary review and actual owner acceptance where stated.

This task changes only the proposed plan. Configuration proposals, runtime matrix,
context contracts and future commands above are not applied or executed by this
revision. Document checks and the R1 affected profile are planning-maintenance
evidence, recorded through the native local lifecycle; they cannot establish
AC-001–010 implementation completion. No SHACL implementation, new installation,
ontology repair, baseline rewrite, commit, push, Issue/Wiki write, live scan or
reviewer dispatch is authorized or claimed by this handoff. The next R2 step is
SLICE-000 reconciliation and protected acceptance of the actual revised content.
