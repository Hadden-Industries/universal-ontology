# SHACL migration: source inventory and rule dispositions

Status: candidate baseline evidence, 9 September 2026. This document records
observations and proposed dispositions. Only the decisions identified as accepted
in the [dossier](2026-09-09-shacl-policy-source-of-truth-dossier.md) are accepted.
It does not change the editing policy or authorize implementation.

This completes the static Wiki/Python mapping requested by SLICE-000 in the
[plan](../plans/2026-09-09-shacl-policy-source-of-truth.md). Acceptance, executable
fixtures, reconciliation runs and protected baseline capture remain outstanding.
After migration, retain this as historical evidence rather than a second policy
to maintain. The canonical policy graph will own the active `EP-*` rules.

## Frozen sources and evidence limits

- Repository inspection was refreshed at
  `36a51ff4bb76b98c59fe7fe3d225b8762ab23eeb`. This includes the unrelated main-branch
  changes merged after the planning checkpoint `8f3d350c45ccd8374c2808202750cafeb27ac52a`.
  The legacy validator and the five working ontology files retain the inspected bytes.
- Wiki page revision:
  [819704130dee55bf04712d4cd09723d8df35581c](https://github.com/Hadden-Industries/universal-ontology/wiki/Editing-Policy/819704130dee55bf04712d4cd09723d8df35581c),
  identified through GitHub's page history. Wiki repository HEAD was
  `d881f9b8a012717a9465b308fdaf94dc8bb1fc22` immediately before and after downloading
  the [raw page](https://raw.githubusercontent.com/wiki/Hadden-Industries/universal-ontology/Editing-Policy.md).
  The captured file has 15,268 bytes, 307 lines and SHA-256
  `058d398b47ee1eff27a61f49a52c161124f163991c641660d384e1f72eee50a3`.
  The before/after HEAD check and page-history identity are recorded separately;
  this was not a Git-object checkout of the Wiki.
- Local raw capture: `.agent-tools/shacl-policy-baseline/Editing-Policy.source.md`.
  Keep it through baseline acceptance and migration reconciliation. The integrator
  may remove this task-owned temporary copy only after a durable source/evidence
  reference has been retained and its remaining consumers checked.
- Python source: [tests/universalontologytest.py](../../tests/universalontologytest.py),
  598 lines; SHA-256 `550599fb80299101b554b20d7f6a82180020048719f5b5c73913a8c9a270dca0`.
  Native Python AST inspection finds 58 `self.assert*`/`self.fail` call sites.
  Every call site is mapped below. Source inspection is not an execution of all
  branches or proof that all assertions are reachable.
- The reports and CSV retain their earlier hashes and decision transcription in
  the dossier. At this follow-up, the CSV was no longer at its supplied Downloads
  path; a filename search found only an Excel temporary lock file. No missing
  user file was recreated. The transcription is the reviewable decision record;
  it must not be described as a newly verified verbatim copy of the CSV.

`W` locations below refer to the captured Wiki's physical line numbers, not the
web tool's rendered line numbers. `P` locations refer to the frozen Python file.
The Wiki's navigation and presentational prose are not additional executable rules.

## Wiki clause dispositions and independent examples

These are proposed mappings. **Retain** preserves the intended obligation,
**correct** names a policy/implementation discrepancy, and **human** retains a
documented obligation whose truth is not established by SHACL. MAY does not create
a required value. A SHOULD result is visible and non-blocking. Cardinality and
value constraints with different strengths must be separate named constraints.
Examples describe expected results for fixtures to be authored after acceptance;
they are not reported test results.

| Source                | Rule family                        | Disposition and discriminating example                                                                                                                                                                                                                                                                                  |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W01: 18–23            | EP-ONT-VERSION                     | Retain version IRI/info alignment; DEC-001 makes ontology modified optional. Missing modified passes; present empty or mismatched modified fails. Resolve the precise header/date profile below before implementation.                                                                                                  |
| W02: 27–29            | EP-HUMAN-CONCEPT-REUSE             | Human: search existing concepts, consider a synonym and an appropriate superclass. A graph with perfect metadata can still duplicate a concept and fail human review. Preserve the explanatory example and source attribution in the generated page.                                                                    |
| W03: 33–35            | EP-CLASS-NAME / EP-INDIVIDUAL-NAME | Retain PascalCase; incorporate DEC-003's exact asserted-class prefix exception for individuals. `Colour_Red` typed `Colour` passes; an arbitrary `Size_` prefix fails. Anonymous OWL class expressions must not acquire named-entity metadata duties.                                                                   |
| W04: 37               | EP-PROPERTY-NAME                   | Correct ISO strength under DEC-002: non-ISO camelCase violation blocks; non-lower-snake ISO spelling warns. Apply the exact namespace boundaries and prefix examples below.                                                                                                                                             |
| W05: 41–49            | EP-ENTITY-CREATED                  | Retain exactly one valid xsd:dateTime with lexical UTC `Z`, for all four entity kinds. Missing, two distinct values, impossible calendar dates and `+00:00` fail; a valid `Z` value passes. Supported RDF parsing must preserve the lexical distinction.                                                                |
| W06: 51–57            | EP-ENTITY-CREATOR                  | Retain exactly one creator IRI identifying an ORCID. Missing/multiple values or a literal fail. Distinguish offline URI validation from the human's identity and registration; DEC-026 selects URI format only, with the exact profile below.                                                                           |
| W07: 59–61            | EP-ENTITY-UUID                     | Retain at least one qualifying UUIDv4 URN, including properties under DEC-005. Verify version and variant bits without coercion. A v1-only identifier set fails; a valid v4 plus a non-UUID identifier passes.                                                                                                          |
| W08: 63               | EP-IDENTIFIER-UNIQUE               | Correct duplicate-holder scope under DEC-015. Two subjects sharing an identifier fail; repeated assertions on one subject and alternative serializations do not create another holder. Do not union historical versions.                                                                                                |
| W09: 65–73            | EP-LABEL / EP-PREFLABEL-LABEL      | Retain language-tagged labels, with DEC-004 requiring a matching label for every preferred label and DEC-006 making text/language uniqueness per subject. Two subjects labelled `Bank` in English pass; missing one French preferred-label counterpart fails.                                                           |
| W10: 75–82            | EP-DEFINITION                      | Retain a language-tagged definition and at most one per language for all four kinds. Two distinct English definitions fail. Human review determines whether the text actually defines the concept and differentiates it from neighbours.                                                                                |
| W11: 84–90            | EP-PREFLABEL-IRI                   | Retain English label/local-name correspondence and the capitalized-prefix exception under DEC-003/013/014. Recommend the published spelled-out-label behavior: Three D Model matches ThreeDModel; 3D Model fails. An RDF IRI tail is not inherently an XML QName; correct that explanation.                             |
| W12: 92–94            | EP-PREFLABEL-LANGUAGE              | Require preferred labels, one per language, and exact case-insensitive `en` or `en-gb`. `EN-GB` satisfies English; `en-US` alone does not. Other language labels remain allowed and are not forced to correspond to the English identifier.                                                                             |
| W13: 98–102           | EP-OPTIONAL-ANNOTATIONS            | Retain optional, repeatable references and their explanatory purpose. Absence and multiple references pass; do not invent a mandatory IRI node kind from the description alone.                                                                                                                                         |
| W14: 104–110          | EP-OPTIONAL-ANNOTATIONS            | Retain optional repeatable source annotations. Human SHOULD: cite a source when a definition is externally derived. External derivation cannot be inferred reliably from absence of a source triple.                                                                                                                    |
| W15: 112–116          | EP-OPTIONAL-ANNOTATIONS            | Retain optional repeatable seeAlso annotations and their purpose. Do not invent a cardinality limit or perform live URL checks.                                                                                                                                                                                         |
| W16: 118–125          | EP-OPTIONAL-ANNOTATIONS            | Retain language-tagged acronyms and text/language uniqueness per subject. The same acronym on two subjects passes. Human review determines whether a designation is an acronym.                                                                                                                                         |
| W17: 129–139          | EP-MODIFIED                        | Retain exactly one valid date/dateTime on changed existing entities; dateTime must end in `Z`. DEC-017 is now accepted: an existing valid unchanged value suffices in editing checks. Release freshness is separate. A manual single-snapshot audit checks supplied values but cannot establish that an entity changed. |
| W18: 141–147          | EP-CONTRIBUTOR                     | Retain optional ORCID IRI contributors. Human instruction identifies a contributor when another person changes the entity. Do not infer authorship from Git identity or add a contributor automatically. Identical repeated RDF assertions collapse.                                                                    |
| W19: 151–161, 222–227 | EP-DATASET-TYPE-IRI                | Retain NamedIndividual plus explicit Dataset/Distribution type and the appropriate project namespace with lowercase canonical UUIDv4 suffix. Also target the namespace so removal of a required type cannot make an invalid resource disappear from checks. Wrong version bits or uppercase suffixes fail.              |
| W20: 164–168          | EP-DATASET-REQUIRED                | Require at least one theme IRI and validate every supplied value. One valid theme plus a literal fails; the old existential-only check is insufficient. RDF/XML `rdf:resource=""` resolves against a base, so a physical empty-attribute ban would be separate serialization lint.                                      |
| W21: 170–178          | EP-DATASET-REQUIRED                | Require language-tagged description, at most one per language. Two distinct English descriptions fail. The old Dataset path does not enforce this uniqueness.                                                                                                                                                           |
| W22: 180–194          | EP-DATASET-REQUIRED                | Require language-tagged title and label; allow multiple distinct text/language pairs. Repeated physical triples are not graph duplicates. Apply the proposed nonblank DCAT text check to every value, not just the first.                                                                                               |
| W23: 198–204          | EP-DATASET-DISTRIBUTION            | Optional, repeatable distribution links must each point to an IRI explicitly typed both NamedIndividual and Distribution in the selected context. A valid link plus an untyped target fails; unavailable required context is not a pass. DEC-008.                                                                       |
| W24: 206–212          | EP-DATASET-LANDING                 | Retain optional repeatability and human guidance to use the provider's landing page. The paragraph supplies no explicit new MUST/SHOULD value-shape restriction. No site-ownership inference or network request.                                                                                                        |
| W25: 214–220          | EP-DATASET-ACCESS-RIGHTS           | Optional maximum one is MUST; an IRI value is SHOULD. Absence passes, two values fail, one literal warns. Do not silently make the recommendation mandatory or require example-vocabulary membership. DEC-008.                                                                                                          |
| W26: 231–247          | EP-DISTRIBUTION-REQUIRED           | Require access URL IRI(s) and language-tagged label(s), with per-subject text/language uniqueness. Check every access URL and label; one good first value cannot hide a bad second value.                                                                                                                               |
| W27: 251–257          | EP-DISTRIBUTION-DOWNLOAD           | Optional repeatable IRI values. Correct `downloadUrl` to standard `downloadURL` under proposed DEC-011; no compatibility alias. Absence passes; a literal at the standard predicate fails.                                                                                                                              |
| W28: 259–265          | EP-DISTRIBUTION-MEDIA              | Optional maximum one plus actual IANA media-type registry membership are MUST. An invented IRI under a valid-looking registry prefix fails against an identified local snapshot. DEC-008.                                                                                                                               |
| W29: 267–273          | EP-DISTRIBUTION-FORMAT             | Optional maximum one is MUST; EU file-type vocabulary membership is SHOULD. Two values fail; one nonmember warns. Snapshot rights/ingestion qualification remains outstanding. DEC-008.                                                                                                                                 |
| W30: 275–281          | EP-DISTRIBUTION-LANGUAGE           | Optional, repeatable LOC ISO639-1 membership is MUST for every supplied value. An unlisted IRI with the right prefix fails; a valid multilingual set passes. DEC-008.                                                                                                                                                   |
| W31: 283–289          | EP-DISTRIBUTION-LICENCE            | Optional maximum one and IRI node kind are MUST. Absence passes; multiple values or a literal fail. The SPDX example does not mandate SPDX membership. DEC-008.                                                                                                                                                         |
| W32: 291–297          | EP-DISTRIBUTION-RIGHTS             | Optional repeatable values with IRI node kind SHOULD. One literal warns; no maximum is invented. DEC-008.                                                                                                                                                                                                               |
| W33: 301–307          | EP-AXIOM-POSITION                  | Retain xsd:integer, restricted to owl:Axiom under DEC-007. An xsd:string value on an axiom fails; the same predicate on a different kind of node does not fail this rule. Preserve the actual `http://schema.org/` predicate identity.                                                                                  |

## Complete Python assertion and preprocessing dispositions

The `Calls` column enumerates exact assertion/failure call-site lines. It provides
a checkable coverage index; one call site may implement several behaviors through
a loop. P02 has no assertion calls but materially changes which data are tested.

| Group | Calls                   | Existing behavior and proposed disposition                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01   | 117, 132, 139           | XML parsing, dynamic namespace discovery and default-namespace equality. Retain native RDF/XML parsing and explicit input identity/context validation. Retire the physical default-namespace requirement; equivalent namespace prefixes and RDF serializations must yield the same graph result. Do not make arbitrary input metadata an ownership authority.                                                                                     |
| P02   | —                       | Lines 142–191 merge Description children into typed DOM elements, delete Class/NamedIndividual punning declarations, and omit label-namespace individuals. Replace DOM merging with native RDF graph semantics. Preserve asserted punning and apply applicable kind rules once per subject. No label-namespace resources occur in the inventoried current/historical files; their scope still needs an explicit disposition, not silent deletion. |
| P03   | 213                     | Require xml:lang presence on 16 descriptive predicates for Hadden-owned parent subjects, including ownership found through axiom ancestry. Proposed DEC-023 retains and documents this language rule for approved owned focus nodes and owned axiom annotations. An empty xml:lang is not a language-tagged RDF literal.                                                                                                                          |
| P04   | 221                     | File-wide uniqueness of resource-attribute strings on identifier elements, including duplicate assertions on the same subject. Replace with distinct-holder semantics in W08/DEC-015; include literal identifiers according to their RDF-term identity.                                                                                                                                                                                           |
| P05   | 229                     | Integer datatype on every schema:position. Correct to axiom-only W33/DEC-007; use native datatype validity as well as datatype identity.                                                                                                                                                                                                                                                                                                          |
| P06   | 243, 245, 280, 290, 293 | Preferred-label presence, per-language uniqueness, ASCII correspondence, preferred/ordinary label equality and English presence. Retain W09/W11/W12 with explicit targets, case-insensitive language identity and exact accepted English tags. Retire arbitrary prefix stripping, the broad en-* presence shortcut and the legacy leading-digit expansion under the recommended spelled-out-label profile.                                        |
| P07   | 301, 305, 311, 316, 322 | Check only the first ontology/version/value elements and skip absent ontology or empty modified text. Replace with the accepted header profile; DEC-001 permits absence, not malformed presence. Multiple distinct RDF values need a defined result, not XML-order dependence.                                                                                                                                                                    |
| P08   | 335                     | Require a literal rdf:about attribute on top-level typed XML elements. Retire this serialization requirement. A resource identified using rdf:ID or typed rdf:Description must be classified from its parsed RDF identity; anonymous OWL expressions remain distinct from named entities.                                                                                                                                                         |
| P09   | 349, 355, 357           | Dataset namespace and canonical UUIDv4 suffix. Retain W19. This path compares the parsed/coerced UUID back to its input, so unlike P20 it rejects wrong version bits when the canonical value differs.                                                                                                                                                                                                                                            |
| P10   | 367                     | Require at least one theme with a nonempty resource attribute; additional bad values can escape. Correct to all-value IRI checks under W20, retaining the RDF-vs-physical-empty distinction.                                                                                                                                                                                                                                                      |
| P11   | 371, 376, 379           | Dataset title presence, stripped nonblank text and duplicate stripped text/language pairs. Retain required/nonblank text for all titles; use exact RDF text/language identity for uniqueness under proposed DEC-024. Whitespace is not silently rewritten.                                                                                                                                                                                        |
| P12   | 384, 388                | Require only the first Dataset label/description to have nonblank text. Check every required DCAT text value; add published per-language Dataset description uniqueness. W21/W22.                                                                                                                                                                                                                                                                 |
| P13   | 392, 398, 400           | Distribution namespace and canonical UUIDv4 suffix. Retain W19 with the same version-bit qualification as P09.                                                                                                                                                                                                                                                                                                                                    |
| P14   | 404, 408, 412           | Distribution access URL/label presence and first-value checks. Correct to every-value validation under W26.                                                                                                                                                                                                                                                                                                                                       |
| P15   | 429                     | ASCII PascalCase for module Classes/NamedIndividuals; arbitrary first-underscore stripping for individuals. Retain the bounded grammar proposed below and accepted exact class-prefix rule.                                                                                                                                                                                                                                                       |
| P16   | 433, 437, 442           | Exactly one creator with an ORCID URL prefix, only in the Class/NamedIndividual branch. Extend published metadata obligations to properties under proposed DEC-022. URI prefix alone does not establish a valid registered ORCID.                                                                                                                                                                                                                 |
| P17   | 445, 449, 452           | Exactly one created value with xsd:dateTime and `Z` suffix, only Classes/NamedIndividuals. Extend to all four kinds and require native lexical/calendar validity. The old suffix test alone does not establish a real dateTime.                                                                                                                                                                                                                   |
| P18   | 457, 462, 470, 472, 476 | Optional maximum one modified; dateTime datatype/suffix or date datatype; no comparison or history test. Retain optional-value checks and add required presence on changed existing entities. Accepted DEC-017 allows an unchanged valid value.                                                                                                                                                                                                   |
| P19   | 482, 487                | Contributor resource-string uniqueness and ORCID prefix, only Classes/NamedIndividuals. Apply the accepted metadata scope, use graph-set semantics and the agreed ORCID profile; return diagnostics for literals instead of a missing-attribute exception.                                                                                                                                                                                        |
| P20   | 491, 508, 511           | Require an identifier and seek a UUID URN, only Classes/NamedIndividuals. `UUID(..., version=4)` changes version bits without comparing the result here. Replace with genuine v4/variant validation; retain at-least-one semantics and other identifiers. No copied coercion bug.                                                                                                                                                                 |
| P21   | 517, 528, 537           | Universal-module label presence, file-wide cross-entity label uniqueness and broad `en-*` presence. Apply W09/W12 to the agreed module scope, retire cross-entity rejection under DEC-006 and avoid a second contradictory English rule.                                                                                                                                                                                                          |
| P22   | 540, 541, 544           | Required definition and unique language; optional generic description unique language, only Classes/NamedIndividuals. Retain W10 for all four kinds. Proposed DEC-023 explicitly documents the additional generic description rule instead of attributing it to the Wiki.                                                                                                                                                                         |
| P23   | 552                     | Acronym uniqueness after trimming text in the Class/NamedIndividual branch. Retain language-tagged, per-subject RDF-term uniqueness under W16/DEC-024; identical triples collapse and distinct whitespace remains distinct text.                                                                                                                                                                                                                  |
| P24   | 580, 584                | Property naming strips the first underscore unconditionally and uses an overbroad `ontology/iso` prefix. The fallback snake helper allows uppercase letters/digits and the camelCase branch can pass ISO properties first. Replace with DEC-002/012/013's explicit scope, grammar and warning strength.                                                                                                                                           |

Helpers at P11–87 encode ASCII initial-case/alphanumeric naming, not word-boundary
recognition. `get_parent_about` at P89–110 and the parent map supply XML ancestry,
which must become explicit RDF ownership (including owl:annotatedSource), not an
invented graph parent. The standalone CLI at P587–598 is an integration boundary,
not another rule. Preserve the repository runner and migrate its successful-output
and index-byte behavior through the separately tested plan slices.

The 16 predicates in P03 are: dcterms alternative/description/title; rdfs
comment/label; skos altLabel/changeNote/definition/editorialNote/example/hiddenLabel/
historyNote/note/prefLabel/scopeNote; and uc:acronym. Only some have explicit Wiki
clauses. Retaining the whole list therefore requires DEC-023 acceptance and generated
documentation. It does not authorize a new requirement on every RDF literal.

## Existing source and context inventory

The native runner's `CURRENT_ONTOLOGY_PATHS` owns working-file selection. Its
`TARGET_PATTERN` additionally recognizes dated `src/` artifacts, ISO/IEC edition
paths and `vN` names; `-full` artifacts are excluded from routine validation.
[sourceInventory.js](../../scripts/build/sourceInventory.js) discovers
extensionless build inputs under universal/iso/iso-iec; it is a build inventory,
not an editing-policy target registry. Reuse those responsibilities rather than
introduce another independent file list.

Native RDFLib 7.6.0 parsed all five working files without fetching imports, with
literal normalization disabled. Counts below include imported-vocabulary
declarations physically present in each file; they are not owned-focus counts or
conformance results. The sum is 25,056 triples, not a deduplicated union count.

| Working module       | Triples | Classes / individuals / object properties / datatype properties | Declared imports                            |
| -------------------- | ------: | --------------------------------------------------------------- | ------------------------------------------- |
| core                 |   3,158 | 93 / 0 / 129 / 1                                                | W3C Gregorian time; reference-data/20260714 |
| extended             |   6,155 | 285 / 4 / 215 / 4                                               | core/20260714                               |
| reference-data       |   9,293 | 288 / 382 / 135 / 0                                             | ISO/IEC 11179-3 ed-4/20260714               |
| ISO 31073            |   1,669 | 62 / 0 / 54 / 0                                                 | None                                        |
| ISO/IEC 11179-3 ed-4 |   4,781 | 94 / 35 / 118 / 85                                              | SKOS                                        |

Current-file SHA-256 values, in the same order:

```text
core            9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228
extended        4ec7f6ce3a538dbbd922925912275f39a55ae3d6aa2b4986c2b35b83aaf6d1e5
reference-data  b7259439915a2673b7a4f50aa4715ac1f05b81aa8f5bd227a3ae79dfe45dbd93
ISO 31073       d3a6b947ce21917b28f440766c6b7883dbfc68c253c618979cb45bec6286a8b7
ISO/IEC 11179-3 cf348907763d9522a1214fb2b570ef89500136831458393617d1e6a63aae4d06
```

Reference-data contains 139 explicitly typed Datasets and 147 Distributions. None
of the five current graphs has an explicitly punned Class/NamedIndividual subject
or a subject in `https://haddenindustries.com/ontology/label/`. Absence in this
corpus does not excuse missing punning/target fixtures.

An XML header inventory of all 159 non-`-full`, extensionless `src/` ontology
artifacts found no XML parse errors. This was not a historical RDF or SHACL audit.
Besides the five current namespaces it found these historical module identities:

- `http://standards.iso.org/iso-iec/11179/-3/ed-3/`: five artifacts;
- `http://standards.iso.org/iso-iec/11179/-3/ed-4/`: six artifacts.

Some historical ontology IRIs omit the trailing slash present in xml:base. No
label-namespace subject declaration was found in those 159 XML files. Manual
historical support must recognize these explicitly inventoried ISO module roots;
a Hadden-only prefix filter would silently validate no relevant historical terms.
Recognition is provenance-based module ownership for this repository's audits,
not a claim of ownership over every resource at standards.iso.org.

The four existing `catalog-v001.xml` files in core, extended, reference-data and
iso-iec11179-3 map imports to generated `dist/` files plus the module's working
file. There is no root catalog. These editor/build mappings do not specify a
complete historical corpus or authorize live retrieval. The current
`create_full_versions.py` calls the repository's RDFLib-based
`merge_owl_imports.py`; its network retrieval, metadata stripping and output writes
are unsuitable as an editing validator's read-only context-loading procedure.
This inventory does not propose changing that separate generator.

Proposed DEC-012/015 context contract:

1. A working-source audit uses one current working graph per selected module at
   the identified Git/index/worktree snapshot. Its result explicitly identifies
   a working corpus; it does not claim to reproduce the exact closure of the
   versioned imports embedded in those drafts.
2. A release/historical audit uses explicit selected artifacts and exact versioned
   local dependencies. It never silently substitutes today's working file for an
   older imported release or includes two versions of the same module as one
   uniqueness population. Conflicting required versions are a context error.
3. A standalone file can obtain local shape diagnostics. A requested check whose
   reference/uniqueness population is unavailable reports incomplete context and
   cannot claim full conformance. The report identifies the input and policy
   versions separately; a current-policy audit of an old input is allowed.
4. Approved module provenance and namespace boundaries determine ownership.
   Historical ISO identities above are explicit additional cases. Imported W3C
   terms do not acquire generic metadata rules. Dataset/Distribution profiles
   target their type or respective namespace; labels outside the inventoried
   module/DCAT scope are reported as out of scope, without deleting graph data.
5. File renames with unchanged module identity do not create changed entities.
   Removal of a module removes its subjects and triggers affected surviving
   reference checks. Missing required context is distinguishable from intentional
   deletion; neither can silently reduce the corpus to obtain a pass.

## Concrete proposals still requiring owner acceptance

The existing DEC-010–016 and DEC-018–024/027 remain proposals. DEC-017 was accepted in
this task: editing checks require a valid modified value on a changed existing
entity but do not require that value to advance; release promotion owns freshness.
Max also accepted DEC-025 (ontology modified uses xsd:date only, when present) and
DEC-026 (offline ORCID URI format only, without checksum checks).

- **DEC-022 — Generic metadata scope:** apply the Wiki's creator, created,
  definition, labels, preferred labels and optional annotation value constraints
  to all four named entity kinds in approved module namespaces. This closes the
  broader property omission, in addition to accepted DEC-005's UUID correction.
  Dataset/Distribution profiles are separate and do not gain PascalCase or generic
  entity metadata by virtue of being individuals.
- **DEC-023 — Additional legacy language rules:** retain and document P03's full
  descriptive-predicate language requirement, and P22's optional generic
  description uniqueness by language, within the approved ownership scope.
  The choice is visible policy expansion relative to the current Wiki. It is not
  justified merely by an assertion already existing.
- **DEC-024 — Text identity and nonblank DCAT values:** use exact literal text
  and case-insensitive language identity. Do not trim or normalize text before
  label/acronym/title uniqueness or preferred-label equality. Collapse repeated
  RDF assertions naturally. Retain the legacy nonblank DCAT required text rule,
  applied to every supplied title/description/label; do not silently extend a new
  nonblank constraint to every other annotation. For example `"Bank"@en` and
  `" Bank "@en` are distinct titles, but a whitespace-only required DCAT title fails.

The following examples make the existing proposed decisions more precise:

| Decision | Proposed profile and example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-013  | ASCII PascalCase `[A-Z][A-Za-z0-9]*`; camelCase `[a-z][A-Za-z0-9]*`; lower snake_case `[a-z][a-z0-9]*(?:_[a-z0-9]+)*`, each anchored to the entire tested name. A capitalized PascalCase property prefix may precede the first underscore for correspondence/non-ISO suffix naming. `Thing_hasPart` passes that exception; `thing_hasPart` does not. ISO lower snake_case is assessed on the whole local name and remains only a SHOULD. Unicode naming would need a deliberately changed grammar, not an accidental regex extension. |
| DEC-014  | Preserve ASCII alphanumeric, case-insensitive English correspondence after removing punctuation/spacing. Bank account matches BankAccount; language tags compare case-insensitively. Recommend the Wiki's spelled-out-label instruction: Three D Model matches ThreeDModel, while 3D Model does not. Drop the legacy leading-digit-to-word expansion. This is a reviewable recommendation, not an unanswered prerequisite to completing this plan.                                                                                    |
| DEC-015  | For non-UUID identifiers, compare RDF terms across distinct approved owned subjects in the selected corpus. For syntactically valid UUID URNs, compare the UUID value case-insensitively so different hex-letter case cannot assign the same UUID to two subjects. Require genuine v4/variant bits in at least one qualifying identifier; additional identifiers remain allowed. Do not require lowercase generic UUID URNs solely because DCAT subject IRIs have that distinct canonical-format requirement.                         |
| DEC-018  | Retire physical default-namespace, literal rdf:about and duplicate-XML-element checks. Preserve semantic identity, RDF node kinds and native datatype validity. Do not add a serialization-lint script unless an individual physical requirement is later accepted. Relative IRIs resolve against the recorded document base; an empty resource attribute resolving to a real IRI cannot be rejected as an empty RDF IRI.                                                                                                             |

**DEC-027 — Proposed header profile:** require one identified root owl:Ontology
per authored module document, exactly one IRI-valued versionIRI and one nonempty
string versionInfo. The versionInfo is a valid calendar date written `YYYY-MM-DD`;
the final versionIRI path component, allowing the existing trailing-slash spelling,
equals `YYYYMMDD`. An optional modified has maximum one value, xsd:date under
accepted DEC-025, with lexical form `YYYY-MM-DD` or `YYYY-MM-DDZ`. Its written
calendar date equals versionInfo. Nonzero timezone offsets and dateTime are not
accepted by this proposed profile. Validate the actual calendar date through the
native datatype consumer, not a regex alone. In a multi-document context each
authored module is checked separately; imported headers do not create a false
multiple-header violation. An old `v1` version may fail a current-policy audit;
historical support means giving that honest result, not suppressing the check.

The accepted ORCID URI-format-only choice is represented by an IRI with the
canonical HTTPS `orcid.org` authority, four hyphen-separated four-character groups,
digits throughout except that the final character may be uppercase `X`, and no
query, fragment or trailing slash. Proposed anchored pattern:
`^https://orcid[.]org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$`.
An arbitrary `/person` suffix fails; a syntactically correct URI with an incorrect
checksum passes this deliberately limited structural rule. Do not describe that
pass as verified ORCID registration, checksum validity or contributor identity.
No new installation is authorized by these profile descriptions.
The format is grounded in ORCID's own
[identifier structure](https://support.orcid.org/hc/en-us/articles/360006897674-Structure-of-the-ORCID-Identifier)
and [uppercase-X explanation](https://support.orcid.org/hc/en-us/articles/360053289173-Why-does-my-ORCID-iD-have-an-X).

## Baseline handoff

The [Issue body](2026-09-09-shacl-policy-source-of-truth-issue-body.md) follows the
repository's existing Change form and identifies the accepted/proposed boundary.
Native authenticated Issue discovery found four open and two closed Issues.
[Issue #2](https://github.com/Hadden-Industries/universal-ontology/issues/2) requested
the original quality check against editing rules;
[Issue #3](https://github.com/Hadden-Industries/universal-ontology/issues/3) requested
its contribution-workflow integration and depends on #2. Both are closed; their
bodies do not cover this canonical SHACL policy migration. A new change Issue is
therefore appropriate. No Issue was created or edited.

Initial GitHub CLI calls returned HTTP 401. After Max completed authorization,
host-context `gh api user` and Issue reads succeeded as MaksymShostak. The sandbox
still returns 401, so authorized GitHub operations must use the working host
context. This establishes an execution-context difference, not its precise
credential-store cause; do not copy credentials or ask for another login.

Before implementation: obtain Max's acceptance of the concrete recommended examples
and actual Issue revision, capture it through the native SDLC command, and merge
the protected baseline. Neither this inventory nor a successful formatting check
is acceptance or SHACL conformance evidence.

Document checks passed: Prettier on all four planning documents; whitespace;
relative file-link resolution; native AST comparison confirming that all 58
assertion call sites appear exactly once in the Calls column; 33 Wiki groups with
line ranges inside the frozen 307-line source; and DEC-001–027 each represented
once in both the dossier and Issue decision tables. These checks confirm document
structure and source indexing, not the semantic correctness of every disposition.

A later optional repeat of the AST/decision/link check was blocked before
execution by DCG (`windows.filesystem:windows-filesystem-semantic-unverified`)
because its PowerShell here-string could not be verified. It was not bypassed or
counted as a pass; the earlier completed check remains the available evidence.
