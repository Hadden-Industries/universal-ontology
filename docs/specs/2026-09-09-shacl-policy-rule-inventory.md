# SHACL migration: source inventory and rule dispositions

Status: proposed baseline evidence, reconciled 12 September 2026 after Max's final
grilling confirmation. The source observations retain their original dates/hashes;
dispositions now reflect the accepted decisions in the
[dossier](2026-09-09-shacl-policy-source-of-truth-dossier.md). No operational editing
policy, ontology data or protected implementation baseline is changed here.

This completes the static Wiki/Python mapping for SLICE-000 of the
[plan](../plans/2026-09-09-shacl-policy-source-of-truth.md). Executable fixtures,
full latest-active/candidate qualification, independent assurance and protected
baseline capture remain future work. After migration retain this inventory as
historical evidence; the canonical SHACL graph owns the active EP-* rules.

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

These mappings reflect the accepted domain dispositions. **Retain** preserves the intended obligation,
**correct** names a policy/implementation discrepancy, and **human** retains a
documented obligation whose truth is not established by SHACL. MAY does not create
a required value. A SHOULD result is visible and non-blocking. Cardinality and
value constraints with different strengths must be separate named constraints.
Examples describe expected results for fixtures to be authored after acceptance;
they are not reported test results.

| Source                | Rule family                        | Disposition and discriminating example                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W01: 18–23            | EP-ONT-VERSION                     | Retain version IRI/info alignment and accepted DEC-027 header/date profile. Ontology modified remains optional under DEC-001; malformed or mismatched presence fails.                                                                                                                                          |
| W02: 27–29            | EP-HUMAN-CONCEPT-REUSE             | Human: search existing concepts, consider a synonym and an appropriate superclass. A graph with perfect metadata can still duplicate a concept and fail human review. Preserve the explanatory example and source attribution in the generated page.                                                           |
| W03: 33–35            | EP-CLASS-NAME / EP-INDIVIDUAL-NAME | Retain PascalCase; incorporate DEC-003's exact asserted-class prefix exception for individuals. `Colour_Red` typed `Colour` passes; an arbitrary `Size_` prefix fails. Anonymous OWL class expressions must not acquire named-entity metadata duties.                                                          |
| W04: 37               | EP-PROPERTY-NAME                   | Correct ISO strength under DEC-002: non-ISO camelCase violation blocks; non-lower-snake ISO spelling warns. Apply the exact namespace boundaries and prefix examples below.                                                                                                                                    |
| W05: 41–49            | EP-ENTITY-CREATED                  | Retain exactly one valid xsd:dateTime with lexical UTC `Z`, for all four entity kinds. Missing, two distinct values, impossible calendar dates and `+00:00` fail; a valid `Z` value passes. Supported RDF parsing must preserve the lexical distinction.                                                       |
| W06: 51–57            | EP-ENTITY-CREATOR                  | Retain exactly one creator IRI identifying an ORCID. Missing/multiple values or a literal fail. Distinguish offline URI validation from the human's identity and registration; DEC-026 selects URI format only, with the exact profile below.                                                                  |
| W07: 59–61            | EP-ENTITY-UUID                     | Retain at least one qualifying UUIDv4 URN, including properties under DEC-005. Verify version and variant bits without coercion. A v1-only identifier set fails; a valid v4 plus a non-UUID identifier passes.                                                                                                 |
| W08: 63               | EP-IDENTIFIER-UNIQUE               | Correct duplicate-holder scope under DEC-015. Two subjects sharing an identifier fail; repeated assertions on one subject and alternative serializations do not create another holder. Do not union historical versions.                                                                                       |
| W09: 65–73            | EP-LABEL / EP-PREFLABEL-LABEL      | Retain language-tagged labels, with DEC-004 requiring a matching label for every preferred label and DEC-006 making text/language uniqueness per subject. Two subjects labelled `Bank` in English pass; missing one French preferred-label counterpart fails.                                                  |
| W10: 75–82            | EP-DEFINITION                      | Required language-tagged definition for Classes/NamedIndividuals; optional for properties under amended DEC-022. When supplied, definitions require language and at most one per language. Human review determines conceptual adequacy.                                                                        |
| W11: 84–90            | EP-PREFLABEL-IRI                   | At least one English preferred label corresponds to the local name under DEC-003/013/014. Additional English spellings may differ. Three D Model and 3D Model each match ThreeDModel; retain leading-digit expansion and correct the Wiki XML rationale.                                                       |
| W12: 92–94            | EP-PREFLABEL-LANGUAGE              | Preferred labels: at most one per language and at least one in any valid English variant. en, EN-GB and en-US each satisfy English coverage; other languages remain allowed. English coverage must not constrain every value to English.                                                                       |
| W13: 98–102           | EP-OPTIONAL-ANNOTATIONS            | Retain optional, repeatable references and their explanatory purpose. Absence and multiple references pass; do not invent a mandatory IRI node kind from the description alone.                                                                                                                                |
| W14: 104–110          | EP-OPTIONAL-ANNOTATIONS            | Retain optional repeatable source annotations. Human SHOULD: cite a source when a definition is externally derived. External derivation cannot be inferred reliably from absence of a source triple.                                                                                                           |
| W15: 112–116          | EP-OPTIONAL-ANNOTATIONS            | Retain optional repeatable seeAlso annotations and their purpose. Do not invent a cardinality limit or perform live URL checks.                                                                                                                                                                                |
| W16: 118–125          | EP-OPTIONAL-ANNOTATIONS            | Retain language-tagged acronyms and text/language uniqueness per subject. The same acronym on two subjects passes. Human review determines whether a designation is an acronym.                                                                                                                                |
| W17: 129–139          | EP-MODIFIED                        | Exactly one valid modified date/dateTime on changed existing entities, including properties; dateTime ends in Z. A valid unchanged timestamp suffices in ordinary editing. New entities need no modified. Static checks still cover all latest entities; missing diagnostic history is reported, not invented. |
| W18: 141–147          | EP-CONTRIBUTOR                     | Retain optional ORCID IRI contributors. Human instruction identifies a contributor when another person changes the entity. Do not infer authorship from Git identity or add a contributor automatically. Identical repeated RDF assertions collapse.                                                           |
| W19: 151–161, 222–227 | EP-DATASET-TYPE-IRI                | Retain NamedIndividual plus explicit Dataset/Distribution type and the appropriate project namespace with lowercase canonical UUIDv4 suffix. Also target the namespace so removal of a required type cannot make an invalid resource disappear from checks. Wrong version bits or uppercase suffixes fail.     |
| W20: 164–168          | EP-DATASET-REQUIRED                | Require at least one theme IRI and validate every supplied value. One valid theme plus a literal fails; the old existential-only check is insufficient. RDF/XML `rdf:resource=""` resolves against a base, so a physical empty-attribute ban would be separate serialization lint.                             |
| W21: 170–178          | EP-DATASET-REQUIRED                | Require language-tagged description, at most one per language. Two distinct English descriptions fail. The old Dataset path does not enforce this uniqueness.                                                                                                                                                  |
| W22: 180–194          | EP-DATASET-REQUIRED                | Require language-tagged title and label; allow multiple distinct text/language pairs. Repeated physical triples are not graph duplicates. Apply the proposed nonblank DCAT text check to every value, not just the first.                                                                                      |
| W23: 198–204          | EP-DATASET-DISTRIBUTION            | Optional, repeatable distribution links must each point to an IRI explicitly typed both NamedIndividual and Distribution in the selected context. A valid link plus an untyped target fails; unavailable required context is not a pass. DEC-008.                                                              |
| W24: 206–212          | EP-DATASET-LANDING                 | Retain optional repeatability and human guidance to use the provider's landing page. The paragraph supplies no explicit new MUST/SHOULD value-shape restriction. No site-ownership inference or network request.                                                                                               |
| W25: 214–220          | EP-DATASET-ACCESS-RIGHTS           | Optional maximum one is MUST; an IRI value is SHOULD. Absence passes, two values fail, one literal warns. Do not silently make the recommendation mandatory or require example-vocabulary membership. DEC-008.                                                                                                 |
| W26: 231–247          | EP-DISTRIBUTION-REQUIRED           | Require access URL IRI(s) and language-tagged label(s), with per-subject text/language uniqueness. Check every access URL and label; one good first value cannot hide a bad second value.                                                                                                                      |
| W27: 251–257          | EP-DISTRIBUTION-DOWNLOAD           | Optional repeatable IRI values. Correct downloadUrl to standard downloadURL under accepted DEC-011; no alias. Absence passes, a literal at the standard predicate fails.                                                                                                                                       |
| W28: 259–265          | EP-DISTRIBUTION-MEDIA              | Optional maximum one plus actual IANA media-type registry membership are MUST. An invented IRI under a valid-looking registry prefix fails against an identified local snapshot. DEC-008.                                                                                                                      |
| W29: 267–273          | EP-DISTRIBUTION-FORMAT             | Optional maximum one is MUST; EU file-type vocabulary membership is SHOULD. Two values fail; one nonmember warns. Snapshot rights/ingestion qualification remains outstanding. DEC-008.                                                                                                                        |
| W30: 275–281          | EP-DISTRIBUTION-LANGUAGE           | Optional, repeatable LOC ISO639-1 membership is MUST for every supplied value. An unlisted IRI with the right prefix fails; a valid multilingual set passes. DEC-008.                                                                                                                                          |
| W31: 283–289          | EP-DISTRIBUTION-LICENCE            | Optional maximum one and IRI node kind are MUST. Absence passes; multiple values or a literal fail. The SPDX example does not mandate SPDX membership. DEC-008.                                                                                                                                                |
| W32: 291–297          | EP-DISTRIBUTION-RIGHTS             | Optional repeatable values with IRI node kind SHOULD. One literal warns; no maximum is invented. DEC-008.                                                                                                                                                                                                      |
| W33: 301–307          | EP-AXIOM-POSITION                  | Retain xsd:integer, restricted to owl:Axiom under DEC-007. An xsd:string value on an axiom fails; the same predicate on a different kind of node does not fail this rule. Preserve the actual `http://schema.org/` predicate identity.                                                                         |

## Complete Python assertion and preprocessing dispositions

The `Calls` column enumerates exact assertion/failure call-site lines. It provides
a checkable coverage index; one call site may implement several behaviors through
a loop. P02 has no assertion calls but materially changes which data are tested.

| Group | Calls                   | Existing behavior and proposed disposition                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01   | 117, 132, 139           | XML parsing, dynamic namespace discovery and default-namespace equality. Retain native RDF/XML parsing and explicit input identity/context validation. Retire the physical default-namespace requirement; equivalent namespace prefixes and RDF serializations must yield the same graph result. Do not make arbitrary input metadata an ownership authority.                                                                                     |
| P02   | —                       | Lines 142–191 merge Description children into typed DOM elements, delete Class/NamedIndividual punning declarations, and omit label-namespace individuals. Replace DOM merging with native RDF graph semantics. Preserve asserted punning and apply applicable kind rules once per subject. No label-namespace resources occur in the inventoried current/historical files; their scope still needs an explicit disposition, not silent deletion. |
| P03   | 213                     | Legacy xml:lang requirement on 16 descriptive predicates in owned scope, including axiom ancestry. Accepted DEC-023 retains/documents that scope using RDF ownership. Empty xml:lang is not a language-tagged RDF literal.                                                                                                                                                                                                                        |
| P04   | 221                     | File-wide uniqueness of resource-attribute strings on identifier elements, including duplicate assertions on the same subject. Replace with distinct-holder semantics in W08/DEC-015; include literal identifiers according to their RDF-term identity.                                                                                                                                                                                           |
| P05   | 229                     | Integer datatype on every schema:position. Correct to axiom-only W33/DEC-007; use native datatype validity as well as datatype identity.                                                                                                                                                                                                                                                                                                          |
| P06   | 243, 245, 280, 290, 293 | Legacy preferred-label presence, uniqueness, ASCII correspondence, label equality and English check. Retain W09/W11/W12 with any valid English variant, at least one matching English spelling, bounded prefixes and leading-digit-to-word correspondence. Remove the legacy mismatch between broad English presence and narrow correspondence tags.                                                                                              |
| P07   | 301, 305, 311, 316, 322 | Check only the first ontology/version/value elements and skip absent ontology or empty modified text. Replace with the accepted header profile; DEC-001 permits absence, not malformed presence. Multiple distinct RDF values need a defined result, not XML-order dependence.                                                                                                                                                                    |
| P08   | 335                     | Require a literal rdf:about attribute on top-level typed XML elements. Retire this serialization requirement. A resource identified using rdf:ID or typed rdf:Description must be classified from its parsed RDF identity; anonymous OWL expressions remain distinct from named entities.                                                                                                                                                         |
| P09   | 349, 355, 357           | Dataset namespace and canonical UUIDv4 suffix. Retain W19. This path compares the parsed/coerced UUID back to its input, so unlike P20 it rejects wrong version bits when the canonical value differs.                                                                                                                                                                                                                                            |
| P10   | 367                     | Require at least one theme with a nonempty resource attribute; additional bad values can escape. Correct to all-value IRI checks under W20, retaining the RDF-vs-physical-empty distinction.                                                                                                                                                                                                                                                      |
| P11   | 371, 376, 379           | Dataset title presence, stripped nonblank text and duplicate stripped text/language pairs. Retain required/nonblank text for all titles; use exact RDF text/language identity under accepted DEC-024. Whitespace is not silently rewritten.                                                                                                                                                                                                       |
| P12   | 384, 388                | Require only the first Dataset label/description to have nonblank text. Check every required DCAT text value; add published per-language Dataset description uniqueness. W21/W22.                                                                                                                                                                                                                                                                 |
| P13   | 392, 398, 400           | Distribution namespace and canonical UUIDv4 suffix. Retain W19 with the same version-bit qualification as P09.                                                                                                                                                                                                                                                                                                                                    |
| P14   | 404, 408, 412           | Distribution access URL/label presence and first-value checks. Correct to every-value validation under W26.                                                                                                                                                                                                                                                                                                                                       |
| P15   | 429                     | ASCII PascalCase for module Classes/NamedIndividuals; arbitrary first-underscore stripping for individuals. Retain the bounded grammar proposed below and accepted exact class-prefix rule.                                                                                                                                                                                                                                                       |
| P16   | 433, 437, 442           | Legacy exactly-one creator/ORCID prefix check covered Classes/NamedIndividuals only. Accepted DEC-022 extends creator to properties; DEC-026 checks full offline URI format without checksum/account/identity verification.                                                                                                                                                                                                                       |
| P17   | 445, 449, 452           | Exactly one created value with xsd:dateTime and `Z` suffix, only Classes/NamedIndividuals. Extend to all four kinds and require native lexical/calendar validity. The old suffix test alone does not establish a real dateTime.                                                                                                                                                                                                                   |
| P18   | 457, 462, 470, 472, 476 | Optional maximum one modified; dateTime datatype/suffix or date datatype; no comparison or history test. Retain optional-value checks and add required presence on changed existing entities. Accepted DEC-017 allows an unchanged valid value.                                                                                                                                                                                                   |
| P19   | 482, 487                | Contributor resource-string uniqueness and ORCID prefix, only Classes/NamedIndividuals. Apply the accepted metadata scope, use graph-set semantics and the agreed ORCID profile; return diagnostics for literals instead of a missing-attribute exception.                                                                                                                                                                                        |
| P20   | 491, 508, 511           | Require an identifier and seek a UUID URN, only Classes/NamedIndividuals. `UUID(..., version=4)` changes version bits without comparing the result here. Replace with genuine v4/variant validation; retain at-least-one semantics and other identifiers. No copied coercion bug.                                                                                                                                                                 |
| P21   | 517, 528, 537           | Universal-module label presence, file-wide cross-entity label uniqueness and broad `en-*` presence. Apply W09/W12 to the agreed module scope, retire cross-entity rejection under DEC-006 and avoid a second contradictory English rule.                                                                                                                                                                                                          |
| P22   | 540, 541, 544           | Legacy required definition and per-language uniqueness plus optional description uniqueness on Classes/NamedIndividuals. Keep required definitions for those kinds; properties need no definition. Accepted DEC-023 documents the optional description rule and present-value language constraints.                                                                                                                                               |
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
clauses. DEC-023 now accepts retention of the whole list with generated
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
label-namespace subject declaration was found in those 159 XML files. These roots
are historical discovery evidence, not a requirement to implement general old-version
audits. Include one only if it belongs to the reviewed currently active scope or
the explicitly authorized critical-fix exception. Provenance-based ownership does
not claim every resource at standards.iso.org.

The four existing `catalog-v001.xml` files in core, extended, reference-data and
iso-iec11179-3 map imports to generated `dist/` files plus the module's working
file. There is no root catalog. These editor/build mappings do not specify a
complete historical corpus or authorize live retrieval. The current
`create_full_versions.py` calls the repository's RDFLib-based
`merge_owl_imports.py`; its network retrieval, metadata stripping and output writes
are unsuitable as an editing validator's read-only context-loading procedure.
This inventory does not propose changing that separate generator.

### Accepted active/candidate context and new discovery evidence

1. Select one identified latest active version per owned module from reviewed
   publication/provenance evidence. The five working paths are draft inputs;
   the build's greatest-filename-per-directory aliases are not active-state proof.
2. A candidate replaces explicit members of that set. Owned import pins must
   agree with the resulting versioned set; replacing Core may require republishing
   dependants. Missing or conflicting context fails. Never silently substitute a
   current draft/newer import or union superseded versions for uniqueness.
3. Full static validation covers every applicable owned entity/header/axiom,
   including unchanged current entities. Draft diagnostics report incomplete
   context/history honestly. They cannot qualify publication or activation.
4. Read previous snapshots only for actual conditional-change/release comparisons.
   No arbitrary historical-policy selector or historical conformance service is
   required. The sole historic exception checks an explicitly approved critical
   fix and affected invariants; no whole-version conformance claim.
5. Ownership comes from explicit reviewed module provenance. Preserve foreign
   support facts without imposing generic metadata. DCAT profiles retain their
   own namespace/type scope. A rename alone does not change a graph; module
   deletion and affected surviving references cannot silently disappear from checks.

The grilling's read-only inspection found working Extended at version 20260721
while its highest local dated `src/` artifact is 20260714. The site also generates
a latest alias for an older ISO edition directory. The asset builder and upload
wrapper do not establish an exact-byte editing-policy validation dependency.
Actual live served state and external upload controls were not inspected. The
plan therefore requires active-state inventory and publication-consumer proof.

Native RDFLib 7.6.0 inspection of the unchanged five working graphs found **739
owned properties**: 649 ObjectProperty and 90 DatatypeProperty. All have rdfs:label
and skos:prefLabel. Per-module object/datatype counts are Core 129/1, Extended
215/4, Reference 133/0, ISO 31073 54/0 and ISO/IEC 11179-3 118/85. The two remaining
foreign declarations, schema:exerciseType and dcat:distribution, lack labels and
are outside owned metadata scope. The union contains 25,039 distinct triples.
These are presence/count observations, not English/cardinality/semantic validation
or proof about published artifacts. For example RegistrationState_registration_status
has label registration_status, illustrating why raw full-tail generation is not
an accepted replacement for existing labels.

## Accepted concrete profiles

All DEC-001–030 decisions in the dossier now reflect the confirmed grilling.
Exact SHACL implementation and configuration still need their own approval/proof.

- **DEC-022 — Property metadata:** only UUID identifier, Creator, Creation date,
  Label and Preferred label are unconditional mandatory fields. Properties may
  omit definitions; Classes/NamedIndividuals retain them. Changed existing
  properties require valid modified, with DEC-017's ordinary-edit sufficiency.
  Accepted optional-value constraints remain; no sixth unconditional field.
- **DEC-023 — Descriptive language:** retain P03's 16 predicates and P22's optional
  generic description uniqueness in approved scope, with generated documentation.
- **DEC-024 — Exact text:** no trimming for label/acronym/title identity or
  preferred-label inclusion. Repeated triples collapse. Required DCAT text remains
  nonblank for every value. "Bank"@en and " Bank "@en are distinct titles; a
  whitespace-only required DCAT title fails.
- **DEC-028 — Label preparation:** suggest absent labels from meaningful IRI tails,
  review them and write real data before validation. Preserve existing labels;
  opaque tails need supplied text. No validator backfill. The inspected working
  property labels are already present, so no blanket label migration is justified.

The following examples make the accepted decisions precise:

| Decision | Accepted profile and example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-013  | ASCII PascalCase `[A-Z][A-Za-z0-9]*`; camelCase `[a-z][A-Za-z0-9]*`; lower snake_case `[a-z][a-z0-9]*(?:_[a-z0-9]+)*`, each anchored to the entire tested name. A capitalized PascalCase property prefix may precede the first underscore for correspondence/non-ISO suffix naming. `Thing_hasPart` passes that exception; `thing_hasPart` does not. ISO lower snake_case is assessed on the whole local name and remains only a SHOULD. Unicode naming would need a deliberately changed grammar, not an accidental regex extension. |
| DEC-014  | English coverage accepts any valid English variant. At least one English preferred label must match the identifier after accepted ASCII/prefix mapping and leading-digit-to-word expansion. Bank account matches BankAccount; 3D Model and Three D Model match ThreeDModel. Colour@en-GB and Color@en-US may coexist on Colour. Other languages remain allowed.                                                                                                                                                                       |
| DEC-015  | For non-UUID identifiers, compare RDF terms across distinct approved owned subjects in the selected corpus. For syntactically valid UUID URNs, compare the UUID value case-insensitively so different hex-letter case cannot assign the same UUID to two subjects. Require genuine v4/variant bits in at least one qualifying identifier; additional identifiers remain allowed. Do not require lowercase generic UUID URNs solely because DCAT subject IRIs have that distinct canonical-format requirement.                         |
| DEC-018  | Retire physical default-namespace, literal rdf:about and duplicate-XML-element checks. Preserve semantic identity, RDF node kinds and native datatype validity. Do not add a serialization-lint script unless an individual physical requirement is later accepted. Relative IRIs resolve against the recorded document base; an empty resource attribute resolving to a real IRI cannot be rejected as an empty RDF IRI.                                                                                                             |

**DEC-027 — Accepted header profile:** require one identified root owl:Ontology
per authored module document, exactly one IRI-valued versionIRI and one nonempty
string versionInfo. The versionInfo is a valid calendar date written `YYYY-MM-DD`;
the final versionIRI path component, allowing the existing trailing-slash spelling,
equals `YYYYMMDD`. An optional modified has maximum one value, xsd:date under
accepted DEC-025, with lexical form `YYYY-MM-DD` or `YYYY-MM-DDZ`. Its written
calendar date equals versionInfo. Nonzero timezone offsets and dateTime are not
accepted by this profile. Validate the actual calendar date through the
native datatype consumer, not a regex alone. In a multi-document context each
authored module is checked separately; imported headers do not create a false
multiple-header violation. Apply this profile to the latest active/candidate
versions; superseded `v1` artifacts are not routinely audited or modernized.

The accepted ORCID URI-format-only choice is represented by an IRI with the
canonical HTTPS `orcid.org` authority, four hyphen-separated four-character groups,
digits throughout except that the final character may be uppercase `X`, and no
query, fragment or trailing slash. Proposed anchored pattern:
`^https://orcid[.]org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$`.
An arbitrary `/person` suffix fails; a syntactically correct URI with an incorrect
checksum passes this deliberately limited structural rule. Do not describe that
pass as verified ORCID registration, checksum validity or contributor identity.
No new installation is authorized by these profile descriptions.

The numeric-label clarification was checked with native RDFLib: `3D Model`@en
and rdf:about IRIs ending in ThreeDModel or 3DModel parse; an XML element name
beginning with a digit and rdf:ID="3DModel" fail their XML-name constraints.
The accepted naming/correspondence policy is distinct from XML serialization rules.
[RDF/XML literals](https://www.w3.org/TR/rdf-syntax-grammar/#literalPropertyElt),
[rdf:about](https://www.w3.org/TR/rdf-syntax-grammar/#aboutAttr),
[rdf:ID](https://www.w3.org/TR/rdf-syntax-grammar/#rdf-id).
English language-range checks must qualify an at-least-one subset; imposing
`sh:languageIn ("en")` on every preferred label would reject allowed non-English
labels. [SHACL language ranges](https://www.w3.org/TR/shacl/#LanguageInConstraintComponent).
The format is grounded in ORCID's own
[identifier structure](https://support.orcid.org/hc/en-us/articles/360006897674-Structure-of-the-ORCID-Identifier)
and [uppercase-X explanation](https://support.orcid.org/hc/en-us/articles/360053289173-Why-does-my-ORCID-iD-have-an-X).

## Baseline handoff

Use existing [Issue #31](https://github.com/Hadden-Industries/universal-ontology/issues/31)
and the [reconciled local body](2026-09-09-shacl-policy-source-of-truth-issue-body.md)
for the authorized baseline update. Closed quality-check Issues #2/#3 are
antecedents. The earlier discovery note predates Issue #31; do not create a
duplicate Issue. No remote write is performed by this revision.

The accepted domain decisions are recorded; capture/merge the actually accepted
implementation baseline before R2 work. Native baseline/schema/format checks do
not establish human agreement or SHACL conformance. The protected baseline was
absent from the inspected local main on 12 September.

Earlier document/source-index checks mapped all 58 assertion call sites and 33
Wiki groups; those source identities remain unchanged. Fresh R1 document and
affected verification for this reconciliation is recorded through the native local
lifecycle. Historical failures remain evidence, including an optional earlier
PowerShell here-string check rejected by command protection before execution;
that rejected attempt was not counted as a pass.
