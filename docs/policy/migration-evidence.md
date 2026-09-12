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
