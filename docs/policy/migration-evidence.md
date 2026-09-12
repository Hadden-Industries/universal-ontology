# SHACL editing-policy migration: evidence record

Durable record of the R2 implementation of
[the accepted plan](../plans/2026-09-09-shacl-policy-source-of-truth.md)
(committed-plan baseline, owner acceptance at PR #55 comment 5643322518). Each
slice lists what was proved, with which command and inputs, and what remains
a gap. Freeze this file after cutover; it is evidence, not a second policy.

## SLICE-000 — baseline and active-set boundary (12 September 2026)

See [the active-set inventory](../specs/2026-09-12-shacl-policy-active-set-inventory.md).
The latest active set is recorded in [`policy/activation.ttl`](../../policy/activation.ttl)
and was live-verified byte-for-byte against the served `latest` aliases.

## SLICE-001 — one rule through the real command and generated policy

**Rule:** `EP-ENTITY-CREATED` (Wiki W05, DEC-022) in
[`policy/entity-policy.ttl`](../../policy/entity-policy.ttl): exactly one
`dcterms:created`, `xsd:dateTime` with a valid calendar date, lexical `Z`.

**Independent oracle:** `tests/fixtures/ontology-policy/entity-created/created.expected.json`,
authored from the Wiki/decision text before the shape existed; Turtle and a
deliberately fragmented RDF/XML twin (`created.ttl`, `created.owl`) are proved
isomorphic and yield identical results.

**Chronology:** the package seam (context, ownership facts, engine execution,
report identity) ran first with no rule and the rule tests failed for the
absence of `EP-ENTITY-CREATED` results only (behavioural RED; four
context/qualification contracts already passed). The rule then produced the
expected seven violations (GREEN, `tests/test_ontology_policy.py`, 11 tests).

**Engine facts learned and handled:**

- RDFLib normalises literals by default (`Z` → `+00:00`; `2026-01-02` accepted
  as `xsd:dateTime`), and pySHACL re-enables normalisation after every
  validation. All parsing therefore happens under an explicit
  `lexical_literals()` guard; the `Z` rule combines `sh:datatype` (calendar
  validity; 30 February is ill-typed in both engines) with an anchored
  full-dateTime pattern (date-only and `+00:00` fail).
- Jena reports property shapes by their IRI, so every constraint shape has a
  stable IRI (`ep:EP-ENTITY-CREATED-count/-datatype/-lexical`); the metadata
  contract now requires this for all requirements.
- Jena logs parser warnings to stdout ahead of the report (for example that
  `2026-01-02` is not a valid `xsd:dateTime`); they are retained as diagnostics.

**Cross-engine parity:** `tests/test_ontology_policy_engines.py` runs Apache
Jena 6.2.0 (Temurin JDK 25.0.4.1+1, `.agent-tools/jena/provisioning-evidence.json`)
on the same policy and union graph; rule/focus/path/value/severity sets are
identical to pySHACL 0.40.1 on both fixture serialisations. Without
`UNIVERSAL_ONTOLOGY_JENA_HOME`/`UNIVERSAL_ONTOLOGY_JAVA_HOME` the tests skip
and the skip is a recorded gap.

**Mutation controls:** removing the rule's target yields zero results and the
expectation fails; downgrading a MUST constraint to `sh:Warning` or misspelling a
SHACL predicate is a policy-definition error at load (Meta-SHACL, metadata
shapes, vocabulary check); authored `uoc:` facts are rejected as impersonation;
a corpus that targets nothing is an error, not a pass.

**Normal command:** `scripts/validate_ontologies.py --purpose latest-active`
validates the five active artifacts by exact bytes and prints module digests,
the policy identity, the targeted count and the status contract
(0 no blockers / 1 violations / 2 input, context, engine or policy error).
`candidate`/`draft` replace selected modules (staged blobs under `--staged`)
inside the active set; `critical-fix` is refused until its scope is approved.
Legacy behaviour without `--purpose` is unchanged (`tests/test_validate_ontologies.py`, 21 tests).

**Generated policy:** `scripts/render_editing_policy.py` writes
[`Editing-Policy.generated.md`](Editing-Policy.generated.md) deterministically
(UTF-8, LF, policy identity, no timestamps); `--check` refuses a hand-edited
document, a metadata-only policy change and a broken policy
(`tests/test_editing_policy_rendering.py`, 10 tests).

**First measurements (Windows 11, Python 3.14.7, cold):** policy load 0.96 s,
parse five active artifacts 2.98 s, validate 4.04 s, peak 98 MB, 1,951 owned
entities targeted, 0 results for `EP-ENTITY-CREATED` on the real active set.
Draft runs replace one module and cost the same order. Adverse shared-structure
inputs are not yet measured; QA-007 budgets remain to be proposed after the
rule catalogue is complete.

**Gaps carried forward:** Linux clean-install and Jena execution need the
approved workflow; conditional `modified` proof needs the change facts of
SLICE-005; `.java-version` lands with its consumer.

## SLICE-002 — documentation as a checked projection

`scripts/ontology_policy/coverage.py` reconciles **sets** of stable IDs: executable
rules, documented executable rules, rules with a passing fixture subject, rules
with a failing fixture subject, and human clauses versus documented human
clauses (`tests/test_ontology_policy_coverage.py`). Each fixture expectation
declares the rules it is the oracle for; an undeclared result, an unknown rule
or a same-size set with a duplicate and an omission is reported. Every
requirement renders exactly one heading; `--check` refuses stale output.

## SLICE-003 — entity, ontology and axiom policy semantics

**Rules added (19 executable, 1 human):** EP-ENTITY-UUID, EP-IDENTIFIER-UNIQUE,
EP-ENTITY-CREATOR, EP-ENTITY-CREATED, EP-MODIFIED (static form; the change
obligation waits for SLICE-005), EP-CONTRIBUTOR, EP-CLASS-NAME,
EP-INDIVIDUAL-NAME, EP-PROPERTY-NAME (MUST), EP-PROPERTY-NAME-ISO (SHOULD),
EP-LABEL, EP-PREFLABEL-LANGUAGE, EP-PREFLABEL-IRI, EP-PREFLABEL-LABEL,
EP-DEFINITION, EP-DESCRIPTIVE-LANGUAGE, EP-DESCRIPTION-LANGUAGE,
EP-OPTIONAL-ANNOTATIONS, EP-ONT-VERSION, EP-AXIOM-POSITION.

**Oracles:** `tests/fixtures/ontology-policy/{complete,entity-metadata,naming,
labels,ontology-header,axiom}` — 21 expectation files authored from the Wiki
clauses and DEC decisions before the shapes; `complete.ttl` is the positive
control producing zero results for every rule under a qualification purpose.
All 21 matched on the first execution except one Turtle syntax slip in a
fixture (`ex:term/Consequence`, repaired as a full IRI).

**Scope decision recorded:** DCAT dataset/distribution subjects are owned by
reference-data but follow their own profile (DEC-012). The legacy validator
applied entity metadata only to IRIs under the module namespace
(`tests/universalontologytest.py` line 414), so the entity targets exclude the
`dataset/` and `distribution/` namespaces; the descriptive-language rule still
reaches every owned subject. Before this exclusion the 286 DCAT subjects
produced 858 spurious entity results.

**Execution structure:** per-focus SPARQL constraints cost 135 s
(identifier uniqueness, an unindexed join order in RDFLib), 60 s (label
correspondence), 37 s (descriptive language) and 5–10 s each for the naming
and definition checks on the real active set. Every SPARQL check is therefore a
*part shape* (`uop:partOf`) whose target selects the failing candidates in one
query; the constraint re-derives path/value only for those nodes. Results are
identical; the full active-set run fell from 285 s to 16 s (pySHACL) and Jena
takes 2.5 s. The metadata contract requires parts to be IRIs with a target and
keeps severity agreement across parts.

**Cross-engine:** identity parity (rule/focus/path/value/severity) holds on all
21 fixtures and on the full active set (941 pySHACL / 947 Jena results; the
difference is Jena emitting one row per co-holder of a shared identifier and one
extra datatype component for a date-only `xsd:dateTime`, both recorded as
component multiplicity, never as lost results). Jena's parser also flags the
`Duty` header-style `xsd:date` with a dateTime lexical at load.

**Latest-active audit (12 September 2026, 1,951 owned entities):**

| Finding | Count | Classification |
|---|---|---|
| EP-ENTITY-UUID: owned ObjectProperty/DatatypeProperty without any identifier | 737 (all owned properties; classes and individuals all carry genuine v4 UUIDs) | accepted policy change (DEC-005/DEC-022); data remediation before activation |
| EP-IDENTIFIER-UNIQUE: `urn:uuid:e35adf3f-6bda-4d54-80d2-686c39fae4ec` held by `extended/DocumentToNamespaceRelationship` and `reference-data/DocumentToNamespaceRelationshipType` | 2 | legacy defect (cross-module duplicate never compared by the file-wide legacy check); data fix |
| EP-IDENTIFIER-UNIQUE: `xsd:positiveInteger` codes 1–4 shared by weekday, compass and side enumerations | 10 | unresolved meaning: DEC-015 as written compares literal identifiers, the legacy check compared IRIs only; owner decision needed |
| EP-MODIFIED: `extended/Duty` modified `"2026-06-26T16:04:00Z"^^xsd:date` | 1 | legacy defect (dateTime lexical typed as date; both engines reject it); data fix |
| EP-PROPERTY-NAME-ISO warnings | 191 | accepted recommendation (DEC-002): ISO 31073 uses camelCase, ISO/IEC 11179-3 uses PascalCase_snake prefixes; visible, non-blocking |

No other rule reports on the current active set.

## SLICE-004 — DCAT rules and cross-file/authority context

**Rules added (13 executable, 1 human):** EP-DATASET-TYPE-IRI, EP-DATASET-REQUIRED,
EP-DATASET-DISTRIBUTION, EP-DATASET-LANDING (human), EP-DATASET-ACCESS-RIGHTS
(MUST cardinality), EP-DATASET-ACCESS-RIGHTS-IRI (SHOULD), EP-DISTRIBUTION-REQUIRED,
EP-DISTRIBUTION-DOWNLOAD, EP-DISTRIBUTION-MEDIA, EP-DISTRIBUTION-FORMAT (MUST
cardinality), EP-DISTRIBUTION-FORMAT-EU (SHOULD), EP-DISTRIBUTION-LANGUAGE,
EP-DISTRIBUTION-LICENCE, EP-DISTRIBUTION-RIGHTS (SHOULD). Profile targets
combine the `dataset/`/`distribution/` namespace with the explicit DCAT type so
that dropping a type cannot evade the profile.

**Ownership correction:** an early fixture showed that a dataset typed only
`dcat:Dataset` was not even owned, because ownership derived from the four
entity types. Ownership is now namespace plus presence in the module document;
types only select rules (`scripts/ontology_policy/context.py`).

**Authorities:** `scripts/ontology_policy/authorities.py` and
`scripts/update_policy_authorities.py` ingest the raw payloads with native
parsers (defusedxml for IANA's registry XML, RDFLib for LOC and EU RDF/XML),
derive `<name>.members.ttl` (`uop:memberOf`) plus `<name>.provenance.json`
(source URL, retrieval date, raw SHA-256 and byte count, media type, licence,
rights decision, parser and version, transformation, member count, derived
digest). Regeneration must reconcile the stored set; a missing, corrupt or
unreconciled snapshot is an execution error (exit 2), never an empty
authority. Authored data using the policy, context or authority namespaces is
rejected as impersonation. The LOC N-Triples download contains a
scheme-relative IRI (`<//www.loc.gov/...>`) that RDFLib rejects, so the RDF/XML
serialisation is the selected payload.

**Oracles:** `tests/fixtures/ontology-policy/dcat/` (33 expected results over 13
rules against fixture snapshots derived from minimal native-format raws under
`tests/fixtures/ontology-policy/authorities/`; a guard test reconciles them) and
`tests/test_policy_authorities.py` (ingestion, exact IRIs, tampered derived
file, changed payload, missing/corrupt snapshot, wrong-format payload).
One engine fact: pySHACL honours only one of two `sh:hasValue` values on one
shape, so each required type is its own constraint shape; pySHACL also surfaces
nested `sh:node` details as results, so extraction now reads the report's
top-level `sh:result` list only. Jena parity holds on every fixture.

**Real snapshots (12 September 2026, untracked pending rights approval):**
IANA 2,346 members (registry updated 2026-09-03; 2,348 template entries, two
duplicates), LOC 183, EU 228, derived into `.agent-tools/authorities/derived/`.
Run with `--authorities .agent-tools/authorities/derived`, the full active set
reports **no DCAT finding**: all 139 datasets and 147 distributions conform,
including every media type, format and language value. Full run 28 s.

**Owner decision pending:** exact rights approval to track the three raw
payloads and derived snapshots under `policy/authorities/`. Recorded terms:
LOC id.loc.gov data is a US Government work with no known copyright
restrictions; EU Vocabularies reuse under Commission Decision 2011/833/EU
(CC BY 4.0, attribution required); IANA registry data terms to be confirmed by
the owner. Until approval, `policy/authorities/` does not exist and every
qualification run must name a snapshot directory explicitly.

## SLICE-005 — latest versions, candidates and conditional change facts

**Change facts (DEC-016):** `scripts/ontology_policy/changes.py` computes each
owned IRI subject's rooted closure — outgoing assertions, every reachable blank
node (restrictions, lists, nested expressions) and its axiom annotations — and
compares closures with native RDFLib isomorphism. Serialisation, prefixes,
triple order and blank-node labels do not count; a shared anonymous structure
changes every owner that attaches it; changing a property's range changes the
property, not its targets; deleted subjects are recorded on the module and
survivors referring to them carry `uoc:refersToDeleted`. Facts:
`uoc:changeKind` Added/Changed/Unchanged per subject and, per module,
`uoc:comparison` Available/Unavailable with `uoc:comparedWith` identity.

**Oracles:** `tests/test_ontology_entity_changes.py` — 15 contracts, all
passing on first execution: reordering/relabelling, outgoing change, range
change, restriction and list edits, axiom annotation edit, shared named and
anonymous structure, add/delete/revert, closure contents, and a real temporary
Git repository proving staged versus worktree bytes are distinguished in both
directions, a byte-identical re-read is unchanged, and a missing blob is an
input error.

**Conditional modified:** `ep:EP-MODIFIED-changed-shape` (a part of
EP-MODIFIED) targets existing owned entities whose content changed and that
carry no `dcterms:modified`; an unchanged valid value suffices (DEC-017) and
added entities need none. The mutation proof holds: changing only the SHACL
applicability condition (`uoc:Changed` → `uoc:Unchanged` in the candidate
target) removes the obligation while the runner still supplies identical
change facts, so Python never decides the obligation. Jena agrees with pySHACL
on the comparison run.

**Purposes:** a candidate qualification refuses to run without a comparison
for every module (exit 2); latest-active runs without a supplied comparison
report change obligations as *unevaluated* per module rather than inventing
them; draft runs show findings but never qualify; a critical-fix run requires
an approved scope reference, restricts results to changed/added subjects and
survivors referring to deleted ones, and never qualifies — an untouched
historic defect stays outside its results while a draft run still shows it.

**Command:** for candidate/draft runs the comparison of a replaced module is
its recorded active artifact, or the base commit's blob of the same path when
`--diff-base` is given (an added file has no comparison); unreplaced modules
compare with themselves. `--critical-fix-scope <reference>` supplies the
approved scope. Real drafts on 12 September: both `extended/universal-extended.owl`
(candidate 20260721) and the reference-data draft carry `modified` on every
changed entity; the only conditional finding remains `Duty`'s malformed value.

## SLICE-006 — diagnostics integration and the publication qualification gate

**Reports:** every `--purpose` run retains its native results graph
(`results.ttl`) and a JSON summary (`report.json`) under
`.sdlc/runtime/policy-reports/<utc-stamp>-<purpose>/` (or `--report-directory`):
purpose, status, policy/lock/authority identities, runtime versions, every
module locator and digest, comparisons used, unevaluated change obligations,
critical-fix scope, and per result the rule, focus, path, value, severity,
component, message, the anchor into the generated policy and the rule's
repair guidance. A qualifying latest-active or candidate run also writes
`qualification-receipt.json` keyed to those identities; a failing run writes
its report and no receipt. GitHub annotations escape message text (`%`,
newlines), so an untrusted literal cannot inject a workflow command.

**Status contract:** 0 no blockers (warnings visible), 1 MUST violations,
2 input/context/authority/engine/policy error. The legacy
`output.strip()`-means-failure path is untouched until cutover (SLICE-008).
A draft run with nothing selected reports that and exits 0, so the ordinary
hook boundary stays cheap.

**Publication gate:** `scripts/ontology_policy/publication.py`, consulted by
`scripts/upload_to_s3.py` before the external helper runs, refuses a missing,
non-qualifying or diagnostic receipt; any active artifact whose bytes differ
from the qualified digest; a changed policy, authority or lock identity; a
module set only partly covered; and a `dist/` copy that differs from the exact
source bytes (`tests/test_publication_gate.py` 7, `tests/test_upload_to_s3.py`
+2 with the helper mocked). The external `../../amazon-aws` helper itself and
any branch protection remain outside this repository's proof.

**Verification profile:** `.sdlc/verification.json` `full` replaces the legacy
"Ontology source invariants" with "Latest active editing policy"
(`validate_ontologies.py --purpose latest-active`, 600 s) and "Generated
editing policy freshness" (`npm run check:editing-policy`). Both fail today
by design: the active set carries 750 blocking violations and
`policy/authorities/` awaits the rights decision.

**Workflow:** `.github/workflows/ontology-validation.yml` keeps the
`OWL Differential Analysis` check name and pre-install selection, installs the
hash-locked environment, adds draft diagnostics for changed sources with
retained reports, a `policy-qa` job (policy freshness and all policy contracts)
and a `qualify` matrix on explicit `ubuntu-24.04` and `windows-2025` images
that provisions Temurin from `.java-version` (`25.0.4+101`, Adoptium's semver
for build 25.0.4.1+1), downloads Jena 6.2.0 from downloads.apache.org, verifies
the pinned SHA-512 and the release signature against KEYS (fingerprint
`D99038A1731B8B31B71549EF04C95136D236A58F`), caches by OS/architecture and
digest, records `java -version`/`jena.version`, runs the latest-active
qualification and the cross-engine parity tests. Actions are pinned by commit
(checkout v7.0.1, setup-python v7.0.0, setup-java v6.0.1, cache v6.1.0,
upload-artifact v7.0.1). `contents: read` is preserved; no Wiki write.
**Gap:** this workflow has not executed yet; it runs on the implementation
PR. The `.java-version` spelling is unverified until then.

## SLICE-007 — reconciliation, remediation proposal and crossover qualification

### Legacy versus SHACL reconciliation ledger (frozen 12 September 2026)

Inputs: the five active artifacts (`policy/activation.ttl`), the two working
drafts, the 22 fixture expectations and the legacy validator at
`tests/universalontologytest.py` (SHA-256 `550599fb…dca0`). The legacy
validator passes all five working files (its historical full-profile result);
the SHACL policy reports 750 violations and 191 warnings on the active set.

| Legacy group (inventory) | SHACL rule(s) | Disposition | Observed difference on current data |
|---|---|---|---|
| P01 default-namespace equality, P08 literal `rdf:about`, duplicate XML elements | — | retired serialisation detail (DEC-018); native RDF validity/equivalence retained | none on current data; the legacy parser also crashes on an RDF/XML fixture whose prolog declares an encoding when fed as text |
| P02 DOM merging, punning deletion, label-namespace omission | ownership by namespace and presence | replaced by native graph semantics; punning preserved | none |
| P03 sixteen-predicate language | EP-DESCRIPTIVE-LANGUAGE | retained (DEC-023) on every owned subject | none |
| P04 identifier uniqueness (IRI attributes, file-wide) | EP-IDENTIFIER-UNIQUE | corrected to distinct-holder semantics across the coherent set (DEC-015) | 2 legacy defects (one UUID shared across extended and reference-data); 10 unresolved-meaning results (literal `positiveInteger` codes shared across enumerations) |
| P05 integer position everywhere | EP-AXIOM-POSITION | corrected to owned `owl:Axiom` only (DEC-007) | none |
| P06 preferred-label presence/correspondence/English | EP-PREFLABEL-LANGUAGE, EP-PREFLABEL-IRI, EP-PREFLABEL-LABEL | retained with any English variant and leading-digit expansion (DEC-014) | none |
| P07 header first-element checks | EP-ONT-VERSION | corrected to the DEC-027 profile | none |
| P09/P13 dataset and distribution namespace/UUID | EP-DATASET-TYPE-IRI, EP-DISTRIBUTION-REQUIRED | retained with type-or-namespace targets | none |
| P10–P12, P14 first-value DCAT checks | EP-DATASET-REQUIRED, EP-DISTRIBUTION-REQUIRED | corrected to every-value checks and per-language uniqueness | none |
| P15 PascalCase with arbitrary underscore stripping | EP-CLASS-NAME, EP-INDIVIDUAL-NAME | corrected to the DEC-003/DEC-013 grammars | none |
| P16 creator on classes/individuals | EP-ENTITY-CREATOR | extended to properties (DEC-022); exact ORCID form (DEC-026) | none |
| P17 created on classes/individuals | EP-ENTITY-CREATED | extended to properties; native lexical/calendar validity | none |
| P18 optional modified without lexical check | EP-MODIFIED | retained with form checks and the conditional obligation (DEC-016/017) | 1 legacy defect (`extended/Duty`: `xsd:date` typed dateTime lexical) |
| P19 contributor prefix | EP-CONTRIBUTOR | retained with the exact ORCID form | none |
| P20 UUID on classes/individuals with coercion | EP-ENTITY-UUID | extended to properties; genuine v4/variant bits (DEC-005) | 737 owned properties without any UUID — accepted policy change requiring remediation |
| P21 labels, file-wide uniqueness, broad `en-*` | EP-LABEL, EP-PREFLABEL-LANGUAGE | per-entity semantics (DEC-006); one English rule | none |
| P22/P23 definitions, descriptions, acronyms | EP-DEFINITION, EP-DESCRIPTION-LANGUAGE, EP-OPTIONAL-ANNOTATIONS | retained; definitions optional for properties (DEC-022) | none |
| P24 property naming with overbroad ISO prefix | EP-PROPERTY-NAME, EP-PROPERTY-NAME-ISO | corrected: non-ISO camelCase MUST, ISO snake_case SHOULD (DEC-002/013) | 191 warnings in the ISO modules (accepted recommendation) |
| Wiki-only clauses W02, W24, and the optional DCAT value rules W25–W32 | EP-HUMAN-CONCEPT-REUSE, EP-DATASET-LANDING, EP-DATASET-ACCESS-RIGHTS(-IRI), EP-DISTRIBUTION-* | added coverage (DEC-008) | none: all 139 datasets and 147 distributions conform against the real snapshots |

Every SHACL rule and every retired legacy difference therefore has a
disposition; no unexplained engine difference remains (identity parity holds
on all fixtures, the active set and the candidate set).

### Remediation proposal (candidates, approved 12 September 2026)

Built mechanically by a scratch tool into `.agent-tools/remediation/candidates/`
(ledger in `ledger.json`), from the working files, as a coherent replacement
set dated `20260912`:

1. 737 owned properties receive a fresh `urn:uuid` version-4 identifier
   (inserted after `dcterms:creator`; the 14 ISO/IEC properties keep their
   `urn:iso:std:` identifier alongside) and `dcterms:modified
   2026-09-12T12:00:00Z`, because their content changed.
2. `extended/Duty`: the `dcterms:modified` datatype becomes `xsd:dateTime`
   (lexical value unchanged).
3. `reference-data/DocumentToNamespaceRelationshipType`: the UUID shared with
   `extended/DocumentToNamespaceRelationship` is re-minted and `modified` set
   (the extended class keeps the original — the owner may prefer the reverse).
4. Every header: `versionIRI`/`versionInfo`/header `modified` → 20260912,
   `priorVersion` → the previous version, owned `owl:imports` re-pinned to the
   new set (core → reference-data/20260912; reference-data → ISO/IEC
   11179-3/20260912; extended → core/20260912). ISO 31073 moves from 20260626.
   The two working drafts' own edits are included as-is.

Candidate qualification (`--purpose candidate`, comparisons = active
artifacts): **10 violations remain, all EP-IDENTIFIER-UNIQUE on the
enumeration codes**, plus the 191 ISO warnings; import pins are coherent;
Jena parity holds (207 results). The set qualifies as soon as the owner decides
the DEC-015 question, either by exempting literal codes (policy change) or by
disambiguating the ten identifiers (data change).

### Performance (QA-007 proposal)

Windows 11 host, Python 3.14.7, cold: full latest-active 28 s (pySHACL) /
2.5 s (Jena), peak below 100 MB; draft of one module with comparison 31 s;
candidate set 31 s; adverse synthetic corpus of 1,000 owners sharing a
40-deep anonymous chain: closure comparison 69 s, draft run 134 s, 33 MB
(closure comparison dominates; each owner's closure carries the shared chain).
Proposed budgets for the owner's acceptance: hook-style draft of one module
≤ 60 s typical and ≤ 180 s ceiling; full active/candidate qualification
≤ 120 s; adverse shared-structure inputs ≤ 300 s; peak memory ≤ 512 MB; the
600 s command timeout stays the control ceiling.

### Owner decisions required before crossover

1. Rights approval to track the three authority payloads and snapshots.
2. Approval of the remediation candidates (or amendments), including which
   holder of the shared UUID keeps it and the `modified` timestamp policy.
3. DEC-015 for literal enumeration codes: exempt or disambiguate.
4. Acceptance of the QA-007 budgets.
5. The policy-editing and contributor-repair walkthrough (SLICE-007 exit).

Independent verification, ordinary review and the Codex Security workflow run
on the implementation PR; the Codex Security workflow is not authorised here
and is recorded as not run. The R2 full profile cannot pass until decisions
1–3 land: "Latest active editing policy" currently exits 1 (750 blockers) and
`policy/authorities/` does not exist.

### First remote execution (PR #61, run 34686756847)

The SDLC linkage gate accepted the committed-plan metadata and **Editing policy
QA passed on `ubuntu-24.04`** (hash-locked install, `pip check`, policy
freshness, every policy contract). Two genuine defects surfaced and are fixed:

- `.java-version` `25.0.4+101` was refused by setup-java ("No matching version
  found"); the documented JEP 322 multi-field spelling `25.0.4.1` is used and
  Temurin package-signature verification (`verify-signature: true`) enabled.
- `OWL Differential Analysis` runs `--plan` before installing dependencies and
  the retained command imported the SHACL package at module level, so the
  pre-install planning contract broke with `ModuleNotFoundError: rdflib`. The
  package is now imported only inside a `--purpose` run, guarded by a test that
  the command's top-level imports never reach `ontology_policy`, `rdflib` or
  `pyshacl`.

The qualification matrix therefore has not yet executed past JDK provisioning;
its next run is the evidence.

### Second remote execution (PR #61, after `30aae73`)

Both qualification rows now execute the complete toolchain: Temurin JDK
`25.0.4.1` provisioned with package-signature verification on `ubuntu-24.04`
and `windows-2025`; Jena 6.2.0 downloaded from downloads.apache.org with
`jena.zip: OK` (SHA-512) and `VALIDSIG D99038A1731B8B31B71549EF04C95136D236A58F`
(Andy Seaborne); `jena.version` 6.2.0; Python 3.14.7 hash-locked install and
`pip check` clean. Both then stop at the designed boundary:
`POLICY_VALIDATION_ERROR (AuthorityError): Authority snapshot eu-file-type is
missing` (exit 2), as does the draft-diagnostics step of the differential job.
`Editing policy QA` passes. The remaining red is the pending rights decision
(SLICE-004), not a defect.

### Authority rights approved (12 September 2026)

Max approved the authority rights. The three raw payloads and their derived
snapshots are now tracked under `policy/authorities/` with provenance citing
the decision; the derived digests equal the untracked derivation used for the
SLICE-004 diagnostics (IANA `d84701a5…`, LOC `18fda70b…`, EU `2a5bbde3…`).
`.gitattributes` exempts `policy/authorities/raw/` from whitespace/EOL
normalisation (as `src/external/**` already is) so the payloads stay
byte-exact for their recorded hashes. `--purpose latest-active` now runs
without `--authorities` and reports the 750 known blockers (exit 1). Decision 1
of the SLICE-007 list is closed.

### DEC-015 amended (12 September 2026)

Max chose Option A: `EP-IDENTIFIER-UNIQUE` compares IRI-valued identifiers
only (UUID URNs case-insensitively, other IRIs as terms); literal identifiers —
the fifteen enumeration codes such as `"1"^^xsd:positiveInteger` on Monday,
North and Right, or `"ETH"^^xsd:token` — are outside the rule, as they were for
the legacy validator. Option C (moving those literals to `skos:notation`) was
rejected because the enumeration individuals are not modelled as SKOS concepts
in concept schemes. The accepted plan/dossier text is not edited; this
amendment supersedes DEC-015's "compare ordinary RDF terms" for literals and is
recorded in the rule's `dcterms:source`. The fixture oracle's
`SharedLegacyA/B` case flips to a documented pass. Decision 3 is closed.

Effect: the latest active set reports 740 blockers (737 property UUIDs, the
shared UUID pair, `Duty`); the remediation candidate set reports **0
violations and qualifies** on pySHACL and Jena (191 warnings remain visible).

### Remediation applied (12 September 2026)

Max approved the remediation candidates as proposed (decision 2 closed: the
extended class keeps the shared UUID, every touched property carries the
remediation `modified` time). The candidates were copied byte-for-byte over
the five working files and promoted to the dated artifacts
`src/universal/core/20260912`, `src/universal/extended/20260912`,
`src/universal/reference-data/20260912`, `src/iso/31073/ed-1/20260912` and
`src/iso-iec/11179/-3/ed-4/20260912` (identical bytes to the working files;
no `*-full` merged artifact is produced for this set).

Qualification through the real command on the dated artifacts,
`validate_ontologies.py --purpose candidate <five src paths>` (comparisons =
the 20260714/20260626 active artifacts): **0 violations, 191 warnings,
qualifies activation**; receipt
`.sdlc/runtime/policy-reports/qualification-receipt.json` issued
`20260912T104720Z`, policy `sha256:25075397…`, module digests core
`95e75e9f…`, extended `92ad97cc…`, ISO 31073 `bca8f977…`, ISO/IEC 11179-3
`b992873d…`, reference-data `1354d260…`. Jena on the same sources and
comparisons: 191 results, identity parity with pySHACL, no multiplicity
difference, 0 violations (25 s pySHACL, 4 s Jena). The legacy validator
(`--all-current`) still passes on the working files, so the retained full
profile invariant holds until cutover.

`policy/activation.ttl` is deliberately unchanged: the active set remains the
served 20260714/20260626 versions until the SLICE-008 activation, which binds
the receipt to `uop:activeArtifactPath` entries for 20260912. Because the
working files now import the 20260912 versions, a single-file draft run of a
dependant reports the DEC-030 pin mismatch as designed; the CLI contract test
selects the coherent five-file working set instead.

### Namespace prefix declarations added (12 September 2026)

Max asked for the `vann:preferredNamespacePrefix` header that reference-data
(`urd`) and extended (`ue`) already carry to be added to the remediated
modules that lack it: core declares `uc` and ISO/IEC 11179-3 declares `md`
(the prefixes the other modules already bind for those namespaces), each with
the `xmlns:vann` declaration. ISO 31073 has no established prefix anywhere in
the repository and is left for the owner to name. The working files and the
`20260912` dated artifacts were updated together (the set is not yet active
or published, so the version path keeps its date). Re-qualification on the
dated artifacts: 0 violations, 191 warnings, qualifies; receipt reissued
`20260912T110813Z` (core `214f21e9…`, ISO/IEC 11179-3 `f532f33c…`, others unchanged);
Jena identity parity holds; the legacy validator still passes.

### Independent review of PR #61 (12 September 2026)

Max stated in the implementation session that he had independently reviewed
PR #61 and approved it. The statement arrived while `1386693` (namespace
prefix declarations) was being published, so the reviewed head is `52743dd`
or `1386693`; the difference between them is the two `vann` header
declarations and this document. This closes the ordinary-review and
owner-review items of the SLICE-007 exit. It is not a merge, activation or
publication authorisation; the Codex Security workflow remains not run.

## SLICE-008 — activation of the qualified set (12 September 2026)

Max authorised the SLICE-008 activation after approving PR #61. The activation
is the record change in `policy/activation.ttl`, made only after the candidate
receipt `20260912T110813Z` qualified the exact dated artifacts:

- `uoa:ActiveSet` now names the 20260912 versions with, per module, the
  artifact path and its SHA-256 content digest (`uop:activeContentDigest`),
  plus the policy identity (`sha256:25075397…`) and the qualifying candidate
  receipt; its predecessor `uoa:ActiveSet-20260714` retains the five
  previously served version IRIs (core/extended/reference-data 20260714,
  ISO 31073 20260626, ISO/IEC 11179-3 20260714).
- The engine enforces the recorded digest: every read of an active artifact
  (`assemble_sources`, comparisons) refuses bytes that differ from the
  activation record with a `ContextError`, so a drifted dated file cannot be
  validated as "active" (test added).
- Latest-active qualification on the activated set: **0 violations, 191
  warnings, qualifies**; receipt reissued `20260912T111638Z` with purpose
  `latest-active`. After `npm run build`, `check_repository_publication`
  binds all five `…/20260912` artifacts (`GateVerdict` with the policy
  identity), so the publication boundary is open for the activated set and
  closed for anything else.
- The CLI contract tests are repointed from the 20260714 locators to 20260912.

Not part of this step (each remains a separate SLICE-008 authorisation): the
hook/CI switch to `--purpose draft --staged`, retirement of
`tests/universalontologytest.py` and `xmlunittest`, the Wiki Git write with
readback, and live publication with served-version readback. The ISO 31073
preferred prefix is still unnamed.

### SLICE-008 — operational runner switched, legacy validator retired (12 September 2026)

Under the same authority, the retained runner `scripts/validate_ontologies.py`
now has one execution path: the SHACL editing policy, with `--purpose`
defaulting to `draft` (diagnostic, never qualifying). The legacy per-file
invariant checker `tests/universalontologytest.py` is deleted: every one of its
groups has a disposition in the reconciliation ledger (migrated, corrected or
retired serialisation detail), so the file was spent and no XML spelling check
remains. `--python-exec` and the subprocess execution loop are gone with it.

- Validator inputs that re-select all five current sources are now the
  runner and its contract test, `policy/**` (rules, activation, authority
  snapshots), `scripts/ontology_policy/**`, `requirements*.txt`,
  `requirements.lock.txt`, `.python-version` and `.java-version`; a
  reintroduced `tests/universalontologytest.py` is deliberately not one.
- `.githooks/pre-commit` runs `--purpose draft --staged` on the exact staged
  bytes; observed locally through `git hook run pre-commit` (empty index:
  "No target ontology files identified", exit 0). The hook test asserts the
  new argument vector.
- `.github/workflows/ontology-validation.yml`: the "Validate selected ontology
  files" step is removed; the draft-diagnostics step is the differential run
  and the qualify matrix is unchanged. The workflow-structure test asserts the
  legacy step's absence.
- `tests/test_validate_ontologies.py` proves the selection contract through
  `--plan` (shared with the actual run) and checks that an actual run on
  non-RDF fixture bytes is an input error (exit 2), never an empty pass; the
  legacy `lxml` mutation test is retired with the checker it exercised.
- `xmlunittest` stays: `tests/test_owl_to_uml_xmi.py` still consumes it, so
  no dependency change is proposed (plan: preserve other needed dependencies).
- README describes the hook, the policy location, the generated projection,
  activation and the CI shape.

Verification: Python 195 tests OK (1 recorded skip), Jest 781 passed, Prettier
and ESLint clean on the changed tests, `git diff --check` clean.

### First remote execution after activation (PR #61, run 34697425534)

Both qualification rows and the policy QA passed on the activated head
(`b4b415c`): Linux and Windows report `0 violation(s), 191 warning(s);
qualifies activation`. The differential job failed with a real defect: the
change range against `main` selects a module's working file and its promoted
`20260912` artifact together, and `assemble_sources` refused two inputs for
one module (`ContextError`, exit 2). Fix: a draft run now splits its selection
into passes — identical bytes under two paths are one document validated once;
differing documents each get a pass in which only that module changes, so no
selected bytes go unvalidated and none are merged. Qualification purposes keep
the refusal. Reproduced locally on the same range (one pass, 0 violations) and
with a differing scratch artifact (two passes, both reported); tests cover the
merge, the split and the qualification refusal.

### QA-007 budgets accepted; ISO 31073 prefix closed (12 September 2026)

Max accepted the QA-007 budgets as proposed: hook-style draft of one module
≤ 60 s typical and ≤ 180 s ceiling; full active or candidate qualification
≤ 120 s; adverse shared-structure inputs ≤ 300 s; peak memory ≤ 512 MB; the
600 s command timeout remains the control ceiling. Measured values on this
host (draft one module 31 s, full set 28 s pySHACL / 2.5 s Jena, adverse 134 s,
< 100 MB) sit inside them. Decision 4 is closed.

Max also decided that ISO 31073 needs no `vann:preferredNamespacePrefix`; that
item is closed without a data change. Remaining SLICE-007/008 owner items: the
policy-editing walkthrough, the merge of PR #61, the Wiki write and the live
publication (each its own authorisation).

### Walkthrough waived; merge and Wiki write authorised (12 September 2026)

Max stated that he does not need the policy-editing and contributor-repair
walkthrough: he reviewed the changes through the GitHub diffs of PR #61 and
agrees with them. Decision 5 is closed by the owner's own review. In the same
message he authorised the merge of PR #61 (merge commit) and the Wiki write
portion of SLICE-008. Live publication with served-version readback and the
first real post-crossover contribution remain open.

### PR #61 merged; Wiki published and read back (12 September 2026)

PR #61 was merged into `main` with merge commit `03b8656` after all 21 checks
passed on `363a830` (both Latest-active qualification rows exit 0). The
generated header now links the canonical `policy/` directory and states that
the repository governs when the page and the repository differ, so stale Wiki
content is identifiable.

Wiki write: the Wiki repository (`universal-ontology.wiki.git`, single branch
`master`) was at `d881f9b`, byte-identical to the frozen baseline, when the
replacement was prepared; no concurrent change needed reconciling. Max pushed
commit `ae936a0` himself (the command guard blocks pushes to any `master`;
a first attempt with a private author email was rejected by GitHub and never
published; the commit was recreated with the no-reply identity, not amended).
Readback from a fresh clone: Wiki HEAD `ae936a0`, `Editing-Policy.md` SHA-256
`2cb32bcb3165e01ce125a59e3791e5356cc78d429d8a178a927a4114f3605cf3`, equal to
`docs/policy/Editing-Policy.generated.md` at `main` `03b8656`; the page serves
at https://github.com/Hadden-Industries/universal-ontology/wiki/Editing-Policy
(HTTP 200). The previous hand-written policy remains in Wiki history at
`d881f9b`. Sidebar and Home links are unchanged and still resolve.

Remaining SLICE-008 items: live publication with served-version readback
(separate authorisation), the first real post-crossover contribution, Issue
#31 reconciliation (owner approval for the comment and label), and cleanup of
task-owned transports (`.agent-tools/`, the spent Wiki clones, the
`dependabot-skills-1-5-26` worktree and branch).

### OASIS import catalogs updated (12 September 2026)

Max identified a step missing from the version-increment procedure: the OASIS
XML catalogs (`core/`, `extended/`, `reference-data/`, `iso-iec11179-3/`
`catalog-v001.xml`) map each module's `owl:imports` IRIs to local paths so
Protégé and similar tools resolve imports without the network, and they still
pointed at the 20260714 versions. The dated owned entries now name the
20260912 versions (`../dist/...` targets, as before). `tests/test_import_catalogs.py`
makes the step unforgettable: for every module it walks the owned
`owl:imports` closure through the tracked `src/` artifacts and requires a
catalog entry with the matching `../dist/` target for each dated IRI, and no
stale dated entry; it fails on the previous catalogs and passes now. The
version-increment change set is therefore: working file, dated `src/`
artifact, `policy/activation.ttl` at activation, and the catalogs.
