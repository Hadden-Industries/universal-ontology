# SHACL policy source of truth implementation plan

Status: proposed plan, 9 September 2026; no implementation has started.

**Goal:** Author graph-level editing requirements once in SHACL, generate the Wiki
policy from that source, enforce policy on prospective entity changes by default,
and support manual audits of any chosen ontology version.

**Design and authority:** Read the [change dossier](../specs/2026-09-09-shacl-policy-source-of-truth-dossier.md)
with this plan. Its accepted decisions are inputs; its proposed decisions still
need baseline acceptance. Repository revision inspected:
`b32d7cff65e57a4d4ea68334350e27b8ef5038ef`.

**Architecture:** Native RDF parsing and SHACL evaluation consume a canonical
policy graph, explicit ontology snapshots and pinned authority data. A small
repository boundary supplies Git change context and presents results. A
deterministic renderer generates policy Markdown; fixtures and human acceptance
provide independent evidence of meaning.

**Proposed stack:** Existing Python 3.14.7/.venv and npm entry points; qualified
pySHACL 0.40.1 with RDFLib 7.6.0; SHACL Core/SPARQL with explicitly bounded AF
SPARQL targets; proposed Apache Jena 6.2.0 for interoperability. All selections
must be refreshed at installation and exact changes approved. No new service.

**Implementation procedure:** Use only
[the repository-adapted TDD skill](../../.sdlc/skills/test-driven-development/SKILL.md).
Use test-first for new behavior; characterize preserved behavior honestly. A
missing dependency/import is not behavioral RED. This plan specifies contracts,
counterexamples and proof rather than invented implementation code. No automatic
commit, reviewer dispatch, security scan or publication is authorized by a checkbox.

## Constraints and delivery boundary

- R2 implementation starts only after an actually accepted Issue revision is
  captured and merged as the protected baseline. Do not label this draft accepted.
- Preserve all eight CSV decisions and the three subsequent clarifications in
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
| `requirements.txt`, `package.json`, `.github/workflows/ontology-validation.yml`, `.sdlc/verification.json`                                              | Exact approved integration changes described below. No speculative edits to other configuration.                                                                                                                                                                           |

The integrator owns the cross-file target/change/report contracts. A future worker
must receive exact file ownership and accepted oracle references; independent
reviewers do not edit their target. No parallel writes are planned across coupled
policy vocabulary, target semantics or fixture expectations.

## Rule inventory and proposed fixture oracles

SLICE-000 completes a clause/assertion inventory against the frozen Wiki and
legacy source, using the following catalogue as its starting point. Do not declare
complete coverage merely because these rows exist. Break a row into separate named
constraints where normative strength or scope differs. IDs below are proposed
durable editing-rule IDs, separate from migration `REQ`/`AC` IDs.

| Rule family                  | Intended obligation / source                                                                                                                          | Discriminating examples and proof                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EP-ONT-VERSION               | Ontology version IRI tail aligns with de-hyphenated versionInfo; modified alignment only when supplied. DEC-001.                                      | Matching version without modified passes; matching present date passes; mismatched/empty present values fail. Agree ontology metadata cardinality and dateTime treatment before adding stronger constraints.                                                     |
| EP-ENTITY-CREATED            | Exactly one UTC `xsd:dateTime` creation value.                                                                                                        | Missing, two distinct timestamps, wrong datatype, invalid date and `+00:00` instead of lexical `Z` fail; a real `Z` value passes after native parsing.                                                                                                           |
| EP-ENTITY-CREATOR            | Exactly one creator IRI representing ORCID.                                                                                                           | Missing/two values/literal/incorrect namespace fail. Do not assert that namespace syntax proves a registered person; exact syntactic strength needs accepted examples.                                                                                           |
| EP-ENTITY-UUID               | At least one qualifying UUIDv4 URN on Class, NamedIndividual, ObjectProperty and DatatypeProperty. DEC-005.                                           | One fixture per kind; missing UUID fails; version-1 UUID and bad variant fail even if Python's `UUID(..., version=4)` accepted them. A valid UUID plus permitted non-UUID identifiers passes.                                                                    |
| EP-IDENTIFIER-UNIQUE         | Distinct subjects in the selected corpus do not share an identifier, under DEC-015's accepted comparison.                                             | A touched subject duplicates an untouched subject in another file: fail. Same subject's fragments in two files: not a second holder. Old/new release copies are not unioned.                                                                                     |
| EP-CLASS-NAME                | Class local name is PascalCase within approved scope.                                                                                                 | `RiskEvent` passes; `risk_event` fails; external declarations are not targets. Cover fragment and slash IRIs.                                                                                                                                                    |
| EP-INDIVIDUAL-NAME           | PascalCase suffix, optional exact asserted-class prefix. DEC-003.                                                                                     | `Red` and `Colour_Red` typed `Colour` pass; unrelated prefix, empty suffix, arbitrary underscore stripping and inferred-only superclass prefix fail. With two asserted classes, either prefix passes.                                                            |
| EP-PROPERTY-NAME             | Non-ISO camelCase MUST; ISO lower snake_case SHOULD. DEC-002/013.                                                                                     | Invalid non-ISO token fails; ISO uppercase token produces warning only; lower snake_case has no naming warning. Include `iso/`, `iso-iec/` and a misleading lookalike prefix.                                                                                    |
| EP-PREFLABEL-LANGUAGE        | Required language-tagged preferred label; one per language; exact accepted English tag. DEC-014.                                                      | `en`, `en-gb` and case variants pass; only `en-us` fails; non-English labels may coexist; two distinct preferred labels in one language fail. Do not use `uniqueLang` for ordinary labels.                                                                       |
| EP-PREFLABEL-IRI             | Agreed English label/local-name transformation, with explicitly scoped prefix/digit behavior.                                                         | Independently accepted examples cover punctuation, acronyms, a leading digit, Unicode letters, properties with prefixes and bad prefix claims. Do not blindly copy the reports' transformation.                                                                  |
| EP-PREFLABEL-LABEL           | Each preferred RDF literal is also a label. DEC-004.                                                                                                  | Matching preferred terms plus additional labels pass; a preferred term lacking a same-language, exact-text label fails. Case/punctuation changes in the label do not silently match.                                                                             |
| EP-LABEL                     | Language-tagged labels; duplicate text/language constraint is per entity. DEC-006.                                                                    | Two entities with `"Bank"@en` pass; several different English labels on one entity pass; identical serialized triples collapse semantically. No cross-entity or one-per-language rule is added.                                                                  |
| EP-DEFINITION                | Required language-tagged definitions with at most one per language, within accepted entity scope.                                                     | Missing definition, plain literal and two English definitions fail; English and Romanian definitions pass. Whether the definition correctly distinguishes the concept is human review.                                                                           |
| EP-MODIFIED / EP-CONTRIBUTOR | Changed existing entity has one well-formed modified value; dateTime uses `Z`, date allowed. Optional contributor values are ORCID IRIs. DEC-016/017. | New entity need not have modified; changed existing one without it fails; syntax-only change does not trigger it. Existing valid timestamp behavior follows the accepted DEC-017 interpretation. Multiple contributors allowed; wrong-value tests apply to each. |
| EP-OPTIONAL-ANNOTATIONS      | references/source/seeAlso MAY repeat; acronym requires language; externally derived definition SHOULD cite source.                                    | Absence of optional values passes. A missing acronym language fails. Do not invent value node kinds for MAY-only clauses; externally derived provenance is a human decision unless represented explicitly.                                                       |
| EP-DATASET-TYPE-IRI          | Dataset profile, explicit types as accepted, canonical lowercase UUIDv4 dataset IRI.                                                                  | Wrong namespace, noncanonical UUID and absent required explicit type fail. Type-only and namespace-only candidates prevent omission of a type from evading the profile. DCAT nodes do not also receive incompatible PascalCase rules.                            |
| EP-DATASET-REQUIRED          | At least one theme IRI, title, description and label with the stated language/description uniqueness rules.                                           | Missing required property fails; all theme values checked, including a bad second one; repeated-language descriptions fail. Distinct same-language titles/labels remain allowed.                                                                                 |
| EP-DATASET-DISTRIBUTION      | Optional `dcat:distribution`: every supplied value is an IRI referencing the required Distribution/NamedIndividual type.                              | Absent passes; correct cross-file target passes; literal, untyped target or wrong-type target fails. Context must contain the authoritative local declaration, not a live fetch.                                                                                 |
| EP-DATASET-LANDING           | landingPage MAY repeat; original-provider intent remains a human rule.                                                                                | No invented mandatory count or IRI constraint. Generated review guidance distinguishes provider judgment from any accepted machine check.                                                                                                                        |
| EP-DATASET-ACCESS-RIGHTS     | Optional: maximum one accessRights value MUST; IRI value SHOULD.                                                                                      | None passes; one literal warns; two values violate count even if each is a valid IRI.                                                                                                                                                                            |
| EP-DISTRIBUTION-REQUIRED     | Distribution type/UUID IRI, required accessURL IRIs and language-tagged label.                                                                        | Missing property fails; a valid first URL and invalid second URL fails. Test all supplied values.                                                                                                                                                                |
| EP-DISTRIBUTION-DOWNLOAD     | Optional standard `dcat:downloadURL` values must be IRIs; may repeat. DEC-008/011.                                                                    | None or multiple valid IRIs pass; literal fails. The misspelled Wiki predicate is corrected explicitly, not accepted as an alias.                                                                                                                                |
| EP-DISTRIBUTION-MEDIA        | Optional mediaType: max one and actual IANA membership MUST.                                                                                          | None passes; exact snapshot member passes; fabricated IRI under the correct prefix and a literal fail; two valid members fail count.                                                                                                                             |
| EP-DISTRIBUTION-FORMAT       | Optional format: max one MUST; EU File Type membership SHOULD.                                                                                        | None passes; member passes; nonmember warns; two members violate maxCount.                                                                                                                                                                                       |
| EP-DISTRIBUTION-LANGUAGE     | Optional, repeatable language values: LOC ISO639-1 membership MUST.                                                                                   | None passes; two valid language members pass; plausible but unregistered code or wrong authority fails. Preserve authority HTTP/HTTPS IRIs as supplied, without equivalence aliases.                                                                             |
| EP-DISTRIBUTION-LICENCE      | Optional license: max one, IRI-valued MUST.                                                                                                           | None passes; literal or two IRIs fails. Do not add SPDX membership as an unstated rule.                                                                                                                                                                          |
| EP-DISTRIBUTION-RIGHTS       | Optional, repeatable rights values SHOULD be IRIs.                                                                                                    | None/multiple IRIs pass; literal warns, without becoming a mandatory cardinality failure.                                                                                                                                                                        |
| EP-AXIOM-POSITION            | Within explicitly scoped `owl:Axiom`, `http://schema.org/position` is `xsd:integer`. DEC-007.                                                         | Wrong datatype on axiom fails; same value outside axiom passes this rule. Test anonymous/named axioms, owner changes and all value occurrences.                                                                                                                  |
| EP-HUMAN-CONCEPT-REUSE       | Search for an existing concept before adding one; assess semantic fit and hierarchy.                                                                  | Generated human-review clause and real review evidence. A SHACL pass does not establish search completeness or conceptual correctness.                                                                                                                           |

The remaining assertion inventory must explicitly address the broad language-tag
list, label-namespace exclusion, removal of a punned NamedIndividual from the DOM,
namespace checks, `rdf:about` syntax, whitespace/nonempty text and source-level
duplicate detection. Each becomes retained policy, separately accepted lint,
retired implementation detail or a deferred decision. Never drop it without a
record or promote it silently to normative policy.

## Vertical slices and proof

### SLICE-000 — Accept the reconciled baseline and integration boundaries

**Outcome:** A reviewer can approve what policy will mean and what will change.
Links: every REQ/AC; DEC-001–021; QA-001–008. Owner: Max accepts, integrator prepares.

- [ ] Complete the Wiki-clause/Python-assertion disposition table, retaining the
      eight CSV decisions verbatim and separately recording interpretation. Capture
      exact Wiki source revision/bytes and report hashes; the report citation tokens
      are not reusable external source links.
- [ ] Settle proposed scope, target, prefix/digit, identifier and change semantics
      using concrete fixtures from the table. Select no policy exception implicitly.
- [ ] Agree manual single-file, coherent release-corpus and historical revision
      semantics, including what insufficient context reports and whether a module
      deletion/rename changes ownership. Inventory the existing import/module source
      registries before proposing another file map.
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
- [ ] When authorized, create/update one real change Issue with this dossier's
      motivation, requirements, decisions, scenarios and plan. Obtain actual owner
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
AC-001/002/006/007/008, QA-003/005/007; DEC-019/020.

Likely files: first policy entry and metadata contract, native loader/execution
boundary, renderer, `tests/test_ontology_policy.py`, rendering tests and fixtures;
approved dependency and npm additions needed for those paths.

- [ ] Resolve approved exact distributions and record their hashes, transitive
      dependencies and notices. Verify Python 3.14.7 compatibility in `.venv`; retain
      native failures. Do not infer support from a minimum-Python metadata field.
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
- [ ] Qualify native explicit/AF targets and named/anonymous axiom focus input
      before committing later slices to the chosen shape profile. Empty scope must be
      explicit, and missing targets must fail an independent fixture.
- [ ] Mutate/remove the real rule in a disposable task-owned copy and show the
      contract/freshness checks detect the regression. Preserve the evidence and restore
      only that disposable mutation; do not disturb the working tree.

**Proof:** Focused native unittest route, Meta-SHACL, actual RDF input parsing,
generated Markdown readback and repeatable bytes. Record elapsed time, selected
versions and any pySHACL/Jena qualification gaps.
**Exit:** One complete path demonstrated. Pipeline replacement is not yet enabled.

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
DEC-001–007, DEC-012–018. Depends on SLICE-001/002 and relevant accepted examples.

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
and CLI tests. Depends on SLICE-001/003/004 and accepted change semantics.

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
- [ ] Materialize native validation inputs for selected named entities and axiom
      contexts without passing blank-node labels to an IRI-only focus filter. The
      original ontology and canonical policy source must remain unchanged.
- [ ] Require modified only for changed existing entities, under accepted timestamp
      semantics. New entities, deleted entities and formatting-only changes have
      separate expected outcomes. Plain snapshot audit records history rules as not
      evaluated rather than reporting them passed.
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
**Exit:** AC-003 and AC-005 demonstrated; the old-data audit is usable before cutover.

### SLICE-006 — Integrate actionable reports and the existing delivery path

**Outcome:** The CLI, hook and CI give consistent scoped outcomes without false
failures from printed warnings. Links: REQ-003/008/009/010,
AC-003/008/009/010, QA-001/004/006. Depends on SLICE-002–005.

Likely files: runner/report presentation, CLI tests, approved npm/workflow/profile
changes and their existing integration tests. Preserve the current hook entrypoint
unless an exact approved change is needed.

- [ ] Retain native RDF reports and output a concise contributor summary with rule,
      focus node, path/value, severity, source file(s), policy link and useful action.
      Report base/head/index, corpus/policy/snapshot hashes, focus counts and exclusions.
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
      input. Compare target sets and result meaning by named rule/focus/path/value/
      severity; allow only documented serialization/message-order differences. Reduce
      disagreements to fixtures and resolve them before qualification.
- [ ] Complete the R2 full verification obligations after the final relevant edit.
      Distinguish retrospective source-audit violations from failed machinery and from
      new/changed entity violations. Use the approved prospective verification profile;
      no whole-corpus-clean prerequisite is inferred.
- [ ] Freeze exact source/policy/fixture/dependency identities. Obtain independent
      verification and ordinary plus triggered specialist review. The verifier executes
      accepted evidence and does not edit tracked implementation artifacts.
- [ ] Request the authorized native Codex Security diff workflow for the changed
      RDF/SPARQL/Git/process/CI ingress where the security review policy triggers it.
      Preserve native outputs and any Windows artifact-access gap; do not replace it
      with generic parallel scanners or describe unavailable coverage as clear.
- [ ] Record runtime/memory on the five current source files and realistic fixtures,
      including adverse blank-node structures. Compare against existing controls;
      optimize only a measured bottleneck through native supported capabilities.
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
npm run test:ontology-policy
npm run test:policy-rendering
npm run check:editing-policy
```

The first three are manual audits, with nonzero exit for detected violations and
explicit context/history scope. CI retains its real `--diff-base`/`--diff-head`
arguments. Add `--policy-revision` only as an explicit, tested data selection;
never load executable code from that revision. A file-only audit must say whether
its coherent sibling corpus was loaded or global checks were unavailable.

Before each configuration request, prepare a concrete smallest patch:

| Exact file(s)                                                     | Proposed setting / behavior and impact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirements.txt`                                                | Add qualified `pyshacl==0.40.1`; propose qualified `rdflib==7.6.0` in place of its lower bound. Recheck latest stable before making the actual request. Record exact resolved dependencies; any hash-lock addition is a separate concrete file proposal. No interpreter downgrade.                                                                                                                                                                                                                                                                                                                                                  |
| `package.json`                                                    | Add only the entry points above that the slice actually implements. No alteration to `prebuild`, deployment, unrelated format/lint scripts or package-manager version.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The policy TTL files and authority/adoption metadata listed above | Approve exact constraint, severity, target and documentary content plus consumers. These are policy configuration, even though executable behavior is tested.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.github/workflows/ontology-validation.yml`                       | Extend applicability/dependency installation and policy QA; consume native reports and preserve artifacts on failure. Preserve least-privilege `contents: read` and check identity. Wiki writing stays out of this untrusted PR workflow.                                                                                                                                                                                                                                                                                                                                                                                           |
| `.sdlc/verification.json`                                         | Add policy-specific test/freshness obligations. Replace the old unconditional full-file gate with an explicitly prospective check while retaining full audits as diagnostic evidence. One proposed stable full-profile input is `--since-adoption`, comparing the accepted adoption baseline to the current snapshot for static invariants; actual PR/staged change enforcement must also run against its real pair. This assurance mode does not replace default per-change selection or claim a full historical audit. Finalize the exact command/data contract with the existing lifecycle consumer before requesting the patch. |
| Existing workflow-selection/integration tests                     | Update assertions for approved changed inputs and consumer behavior, not to mask missing checks. No gratuitous test-runner configuration edits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Wiki repository `Editing-Policy.md`                               | Replace only with the reviewed generated projection after separate authorization; no secret/token or automatic-publication configuration is proposed now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

No change to `AGENTS.md`, `REVIEW.md`, SDLC version/status, CODEOWNERS, branch
protections, lockfiles or hooks is presumed. If exact evidence shows one is needed,
identify its setting and behavioral/pipeline impact before requesting it.

## Verification routing and evidence retention

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
prospective replacement and additional policy checks must be concrete before
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

## Dependencies, sequencing and indicative effort

The traceability below is the implementation handoff. A slice's result remains
subject to the dossier's accepted/proposed distinction; the table does not approve
its decisions or establish its evidence.

| Slice     | Requirement and acceptance links                                           | Main scenarios / decisions                                          | Proof and release implication                                                                                                            |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-000 | REQ-001–REQ-010; AC-001–AC-010                                             | All applicable QA/DEC entries                                       | Complete disposition inventory and protected accepted baseline; no runtime change.                                                       |
| SLICE-001 | REQ-001, REQ-006, REQ-007, REQ-008; AC-001, AC-002, AC-006, AC-007, AC-008 | QA-003, QA-005, QA-007; DEC-019, DEC-020                            | Native one-rule fixture/report/Markdown evidence; retain qualification failures.                                                         |
| SLICE-002 | REQ-001, REQ-006, REQ-010; AC-001, AC-006, AC-010                          | QA-003, QA-005; DEC-020                                             | Freshness/coverage negative controls and human reading; local projection only.                                                           |
| SLICE-003 | REQ-001, REQ-002, REQ-007; AC-001, AC-002, AC-007                          | QA-003, QA-005; DEC-001–DEC-007, DEC-012–DEC-018                    | Independent entity/version/axiom examples; retain legacy comparison input.                                                               |
| SLICE-004 | REQ-002, REQ-004, REQ-008; AC-002, AC-004, AC-008                          | QA-004, QA-005; DEC-008, DEC-011, DEC-012, DEC-015                  | Full DCAT optional-value and cross-file tests; preserve snapshot rights/provenance.                                                      |
| SLICE-005 | REQ-003, REQ-004, REQ-005; AC-003, AC-004, AC-005                          | QA-001, QA-002, QA-006; DEC-009, DEC-010, DEC-016, DEC-017, DEC-021 | Real Git/index and closure fixtures; manual audits usable before gate cutover; snapshot comparison independent of draft/versioned paths. |
| SLICE-006 | REQ-003, REQ-008, REQ-009, REQ-010; AC-003, AC-008, AC-009, AC-010         | QA-001, QA-004, QA-006                                              | Native CLI/hook/CI statuses; retain failed reports and existing check protections.                                                       |
| SLICE-007 | REQ-001–REQ-010; AC-001–AC-010, except live publication/use                | QA-003–QA-007; accepted rule/selection decisions                    | Frozen reconciliation, full obligations and independent review; cutover qualification only.                                              |
| SLICE-008 | REQ-001, REQ-009, REQ-010; AC-001, AC-009, AC-010                          | QA-008; DEC-009, DEC-020                                            | Real cutover, Wiki readback and human outcome evidence; retire spent duplicate machinery.                                                |

| Slice | Prerequisites                              | Independently demonstrable result                                       | Planning effort                     |
| ----- | ------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------- |
| 000   | Current task and source review             | Accepted rule/scope baseline and exact integration permissions          | 2–4 engineer-days plus owner review |
| 001   | 000                                        | One rule validates, reports and renders                                 | 2–4 days                            |
| 002   | 001                                        | Complete checked documentation path                                     | 2–4 days                            |
| 003   | 001/002 and domain examples                | Entity/ontology/axiom contract fixtures and source diagnostics          | 4–7 days                            |
| 004   | 001–003, corpus and rights decisions       | DCAT/authority/cross-file evidence                                      | 3–6 days                            |
| 005   | Rules, source context and change decisions | Historical audit and genuine prospective selection                      | 4–7 days                            |
| 006   | 002–005                                    | Working hook/CI/report integration                                      | 2–4 days                            |
| 007   | 001–006                                    | Frozen reconciliation, independent checks and accepted cutover evidence | 3–5 days plus observation           |
| 008   | 007 and separate action approvals          | Operational gate and published policy projection                        | 1–2 days plus live acceptance       |

Total working estimate: **23–43 engineer-days**, excluding approval delays and
optional ontology remediation. This is a planning range, not a benchmark or delivery
promise. The supplied reports' smaller estimates did not fully qualify historical
input selection, staged-content fidelity or prospective entity scope. Re-estimate
after SLICE-001 and SLICE-005; engine integration, closure semantics and registry
rights are the principal uncertainty. Do not optimize the estimate by omitting
default/manual scope or independent acceptance.

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
dependencies, unauthorized shims or a failed required assurance obligation. Preserve
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

The tracked-scope deliverables remain the dossier and plan. Source/primary-document
research, decision reconciliation and document self-review were performed. At Max's
subsequent request, the existing dependency setup created this worktree's working
Python 3.14.7 `.venv` and installed the locked npm dependencies through npm 12.0.2.
`pip check`, SDLC CLI help and `npm run check:sdlc` pass; native RDFLib parsed the
reference-data example. After Max updated host npm to 12.0.2 and explicitly
approved local SDLC skill activation, `npm run setup:skills` succeeded. All 17
installed files match the approved hashes, and the six skill metadata records
disable implicit invocation. The earlier approval rejection is retained in the
dossier as resolved setup history. `sdlc status` reports no active lifecycle
record; no baseline acceptance is inferred.

No SHACL implementation/qualification, full SDLC verification, security scan,
independent review, ontology repair/promotion, commit, push or Wiki write was
performed. Existing dependency installation does not qualify the proposed new
SHACL stack. Preserve these evidence limits when starting SLICE-000.
