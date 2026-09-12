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
