# Accepted plan for generated full ontology publication

Status: Accepted by maksy on 5 October 2026 in Codex session `01a10bc1-f206-7f10-abdf-0055a68cad18`, with implementation, planned configuration changes, branch creation in the existing checkout, commit messages, commits and pushes authorized.
Deployment and merging remain separately authorized.

The accepted draft was captured unchanged as HISEW requirement snapshot `822ad452-1a26-4bac-ad3b-d9b4d1978e6c`; implementation execution is `c5c2ce53-2243-4fda-a4a9-c8b2d7c405f8` (R2).
The proposal and outstanding-approval wording below records the planning stage and is superseded by this acceptance record for the effects named above.
Commit this finalized record with the first implementation increment.
Consolidate implementation before broad reviews; permit one Antigravity CLI attempt using observed model `gemini-3.8-flash-high` and high effort, then the explicitly authorized Codex fallback if required capabilities are unavailable.
Review repairs are limited to affected questions, with at most two correction rounds and no identical unsuccessful retries.

Implementation refinement: the installed OWL loader needs imported entity declarations for strict RDF-to-OWL reconstruction.
Header/import selection therefore uses the existing RDF/XML parser with no acquisition, checks the named ontology and version IRIs and root import statements, then uses strict native OWL loading and offline structural verification for each selected closure.
A source-only native reconstruction probe failed on an undeclared imported annotation property, demonstrating why selection must precede closure reconstruction.
This changes the parser seam, not the accepted date/import criteria or output semantics.

Accepted implementation refinements: the existing qualification runner now consumes dynamic source discovery instead of the retired fixed target export.
The owner separately approved `scripts/build/ontologyAliases.js` producing a byte-identical `latest-unstable` alias for Universal releases with no imports; otherwise its former rejection prevented the accepted no-import build behavior.
Existing import rewriting and alias paths remain unchanged.
The new alias regression failed on the former rejection before the fix.

Approved provenance correction: the VANN declaration changes the activated ISO/IEC source hash.
The native candidate-policy procedure qualified all five exact dated sources in receipt `20261005T140544Z` (zero violations, 191 existing warnings), comparing the corrected source with its pre-change Git blob.
The owner separately approved updating only its digest, the qualifying receipt reference and the historical provenance comment in `policy/activation.ttl`, followed by latest-active qualification.
Policy rules, version selections and other module digests remain unchanged.
The owner also exactly approved the external HISEW `full` profile deadline increasing from 600 to 1800 seconds for the unchanged qualification command; native rerouting preserves the accepted R2 scope and baseline.

Scope revision: the owner's subsequent instructions require full versions for **all ontology releases dated 20260714 and later that declare imports**, inclusive.
A source ontology with no import statements must have no full counterpart.
These instructions supersede the original four-target limit and the preceding draft's root-only full output; other approvals remain outstanding.

Owner: repository owner, maksy.
Integration responsibility: the implementation agent operating in the existing universal-ontology checkout under the accepted scope.

Repository observation: `C:\Users\maksy\GitHub\universal-ontology`, HEAD `be340a68e2787868780e76c5f56b8185f1bec5cb`; working tree clean at inspection.
HISEW reports personal applicability active and project ready.
Its retained execution concerns a completed, unrelated dependency/security task; that R1 approval is not authority for this change.

## Purpose and proposed scope

Make every eligible dated ontology release a reliable generated self-contained distribution.
Maintain ordinary ontology sources in `src/`; discover every release dated `20260714` or later, select those declaring imports, and build their full RDF/XML documents and JSON-LD and CSV products together into `dist/`.
Qualify the complete discovered set, including absence of full outputs for candidates with no imports, before upload; remove the four existing maintained full copies only after the replacement path is demonstrated.

The beneficiary is an ontology consumer downloading any supported representation.
The outcome is that every full distribution represents the selected root's accepted imports closure, and its alternate formats derive from the same newly generated document.
The guardrails are unchanged root identity, the accepted closure contract, preserved ordinary releases and aliases, and refusal of incomplete or stale publication.

The cutoff is inclusive and has no upper bound tied to today's date.
Preserve the four existing full public paths and representation suffixes, and generate the corresponding full paths for every other eligible release.
Earlier dated releases, latest-full aliases, inference, changes to MCP query admission, OwlAPI upgrades, a new serializer, and redesign of S3/CloudFront release switching are outside this proposal.
This corrects and extends the existing distribution path; it does not reopen the accepted JSON-LD direction exception or other closure semantics.

Discover candidates from the authoritative source inventory under `src/universal/`, `src/iso/` and `src/iso-iec/`, never from residual dist files or an active-release-only list.
A date-qualified candidate is an ordinary extensionless ontology source with a valid eight-digit `YYYYMMDD` release basename at or after the cutoff.
Verify its ontology/version identity with the existing native parser; malformed dates, invalid ontologies or conflicting identities fail rather than being silently admitted or skipped.
Exclude aliases, existing `*-full` files, non-dated releases, and representations such as `.jsonld` or `.csv`.
A candidate becomes a full-generation target only when the parsed root ontology declares at least one import.
Use native import declarations, not a text search: comments or prefix spelling must not affect the result.
Check before resolving the closure.
A candidate with no imports keeps its ordinary outputs and must have no `-full`, `-full.jsonld` or `-full.csv` output, including stale counterparts in the publication snapshot.

Read-only RDF parsing on 5 October found nine date-qualified candidates, each with one ontology header, and eight roots declaring imports.
This is evidence, not a maintained allowlist:

| Ontology family path below src | Candidate dates        | Root declares imports / produce full |
| ------------------------------ | ---------------------- | ------------------------------------ |
| `iso-iec/11179/-3/ed-4`        | `20260714`, `20260912` | Yes / yes                            |
| `universal/reference-data`     | `20260714`, `20260912` | Yes / yes                            |
| `universal/core`               | `20260714`, `20260912` | Yes / yes                            |
| `universal/extended`           | `20260714`, `20260912` | Yes / yes                            |
| `iso/31073/ed-1`               | `20260912`             | No / no                              |

For each selected `src/<family>/<date>`, emit `dist/<family>/<date>-full`, `<date>-full.jsonld`, and `<date>-full.csv`.
At this observation that means eight closures and 24 representation files; ISO 31073 `20260912` has zero full outputs.
Later eligible dates and ontology families enter the target set automatically when they declare imports, with no manual target-list edit.
The threshold applies to output roots; recursively imported dependencies may predate it or declare no imports themselves and must still be resolved and included.

Remove only these maintained full artifacts in SLICE-004:

- `src/iso-iec/11179/-3/ed-4/20260714-full`
- `src/universal/reference-data/20260714-full`
- `src/universal/core/20260714-full`
- `src/universal/extended/20260714-full`

Do nothing remains possible, but retains two producers for the same full RDF/XML paths, derived formats made from checked-in copies, and a publication gate that cannot establish completeness of those generated outputs.

## Current evidence

Implementation decision DEC-010: after first-principles preservation of annotation meaning, explicit vocabulary-role practice, [OWL 2's declaration and annotation mapping](https://www.w3.org/TR/owl2-mapping-to-rdf/), [VANN's published vocabulary](https://vocab.org/vann/) and the repository's adopted local annotation declarations were examined, the owner explicitly approved adding the missing `owl:AnnotationProperty` declaration for `http://purl.org/vocab/vann/preferredNamespacePrefix` to `src/iso-iec/11179/-3/ed-4/20260912` in this session.
Preserve its existing value, root identity and domain axioms.
This corrects an authored source precondition; builds themselves still leave authored files unchanged.
Retain the original strict-loader failure as evidence.
It does not authorize a dependency upgrade or a permissive consumer shim.

- `scripts/createFullVersions.js` materializes four ordinary `dist/` roots directly to their full paths.
  It is a separate npm command, not invoked by build or website publication.
- `scripts/build/sourceInventory.js` currently inventories checked-in full documents as authored static assets.
  `ontologyAssets.js` renders their JSON-LD and CSV before later manual materialization could replace the RDF/XML.
- `scripts/ontology_policy/publication.py` checks qualified active sources and matching ordinary dist copies.
  It does not establish that all twelve full representation files are present and current.
- Vite preserves existing output with `emptyOutDir: false`.
  A dirty dist tree can therefore conceal missing generation.
  The static-copy plugin writes in `writeBundle`; a producer must not rely on those copies already existing in `buildStart`.
- Three internal dated imports are absent from the relevant local catalogs.
  The current materializer may obtain them from the live public website.
- Read-only inspection on 5 October compared those three live documents with their checked-in counterparts using RDFLib graph isomorphism: ISO/IEC 11179-3 had 4,781 triples in both, reference data 9,292, and core 3,158.
  Each pair was RDF-isomorphic.
  Neither raw hashes nor LF-normalized hashes matched the retained earlier qualification observations.
  This establishes present RDF equivalence of these three pairs, not byte stability, complete closure equivalence, or renewed qualification.
- The existing RDF/XML-to-JSON-LD converter already verifies graph equivalence using RDFC-1.0.
  CSV is a deliberate tabular projection and must not be described as a lossless OWL serialization.
- Query artifact admission currently excludes full-version names.
  This proposal preserves that behavior and the existing full-page fallback.

## HISEW risk route

Risk class: **Proposed R2**.

Decision owner: maksy; acceptance and exact configuration approval remain outstanding.

Reasoning: changing the producer and admission controls for public ontology distributions affects a public contract and a cross-system publication workflow.
A valid ordinary-source qualification could otherwise accompany an incorrect full download.
These are explicit R2 triggers; the small source deletion does not make the change R0/R1.

Potential blast radius: every eligible dated full distribution and its RDF/XML/JSON-LD/CSV files, exclusion of redundant full counterparts for import-free candidates, website build consumers, and publication admission.
The current observation is eight distributions and 24 files from nine date-qualified candidates, and the set grows with eligible source releases.
Preserve earlier releases, query artifacts, aliases, and unrelated dist content.

Reversibility: before publication, abandon the candidate and reverse only task-introduced edits.
After publication, use a retained, previously verified release artifact or an approved forward fix.
A Git revert alone cannot recover deployed bytes.
Existing S3 uploading is not an atomic whole-site switch.

Principal unknowns: exact final build-hook ordering under the locked Vite implementation, interruption handling, old-full versus accepted-generated semantic differences, and final reviewer/verifier availability.
Resolve these with the slice experiments below; do not treat old evidence as current acceptance.

Required artifacts: this draft with REQ/AC/QA/DEC identifiers; the accepted exact baseline snapshot before implementation; scoped research and migration comparison evidence; build-output receipt; governed full verification and independent reports; completion/recovery handoff.
Keep one dossier rather than creating parallel lifecycle diaries.

Required specialist lenses: ordinary correctness/principles review, OWL semantics and cross-format oracle validity, publication provenance/path safety.
R2 requires independent verification by another vendor's available headless verifier in an isolated copy of the frozen target.
Any required security assessment of the publication/path boundary remains a separate, scoped authorization and uses the designated provider.
This proposal launches no agents, reviewers, or scans.

Required verification: focused tests at each usable seam; impacted discovery, build, converter, publication, selector and browser regressions; the currently registered `full` profile (`npm run check:qualification`) against the frozen final candidate; independent verification and pinned Java OWLAPI comparison of every discovered full distribution.
Preserve existing hosted PR/qualification obligations if delivery is subsequently authorized. Current `focused` and `affected` profiles do not cover all this work: `test:unit` omits these integration suites and `test:consumer` excludes build/distribution tests.

Required human approvals: acceptance of this scope/R2 baseline; exact configuration changes listed below; implementation; separately, any review/scan execution not already authorized, commits, pushing, GitHub writes, and deployment.
A plan request grants none of those completion effects.

Maximum sensible autonomy: research and produce this draft now.
After acceptance and the necessary configuration/implementation approvals, carry the accepted implementation through its verification and review obligations.
Stop only for an actual decision, failed control, or unauthorized effect.

Next lifecycle step: owner acceptance or revision of the concrete proposal.
Then persist accepted requirement bytes in the established external evidence destination, use native `capture-requirement-snapshot`, recheck applicability, and start the R2 execution with that snapshot and actual decision reference.
Do not adopt the unrelated completed execution or fabricate an approval reference.

## Ordered research and proposed decisions

Research followed first principles, then modern practice, then applicable specifications/guidelines, then demonstrated adoption.
The following architecture is an inference from that evidence and repository constraints, not something the cited sources prescribe for this repository.

1. **First principles.**
   Each public artifact needs one owning producer.
   A representation cannot be current if it was generated before its input existed.
   Verification must bind the inputs actually consumed and outputs actually uploaded.
   Failure must not leave a valid-looking completion record.
   These establish build-before-qualification-before-upload and rule out deleting source copies alone.
2. **Modern practice.** [Reproducible Builds on stable inputs and outputs](https://reproducible-builds.org/docs/deterministic-build-systems/) and [volatile network inputs](https://reproducible-builds.org/docs/volatile-inputs/) support a local, declared input set.
   [SLSA 1.2 provenance](https://slsa.dev/spec/v1.2/build-provenance) distinguishes resolved input dependencies from output subjects.
   Adopt a compact digest-bound product receipt without claiming SLSA conformance or trusted attestation.
3. **Authoritative specifications and guidelines.** [OWL 2 sections 3.4 and 5.6.2](https://www.w3.org/TR/owl2-syntax/) ground root-inclusive transitive closure and standardization of anonymous individuals apart.
   [JSON-LD 1.1 processing](https://www.w3.org/TR/json-ld11-api/#rdf-serialization-deserialization) grounds RDF conversion.
   [Vite's plugin lifecycle](https://vite.dev/guide/api-plugin.html) supports native asset emission and requires attention to build versus serve hooks.
   [npm 12 ignore-scripts](https://docs.npmjs.com/cli/v12/using-npm/config/#ignore-scripts) can skip pre/post hooks while still executing an explicitly requested npm script, so correctness must live in the build producer and upload gate rather than only in npm hooks.
4. **Adopted practice.** [Bazel's documented hermeticity model](https://bazel.build/basics/hermeticity) and [Debian's buildinfo format](https://manpages.debian.org/trixie/dpkg-dev/deb-buildinfo.5.en.html) demonstrate declared input identity and recorded build-output hashes.
   [GitHub's artifact workflow](https://docs.github.com/en/actions/tutorials/store-and-share-data) demonstrates producer-success dependencies and immutable artifact handoffs.
   Reuse these principles without adding Bazel, Debian tooling, a cache, or another CI platform.

| Decision                    | Proposed resolution and rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001 Generation timing   | Complete full-distribution generation during the normal production build. Upload validates and consumes the prepared candidate; it does not rebuild or regenerate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DEC-002 Target selection    | Apply the owner's inclusive `20260714` cutoff to valid dated roots in the authoritative source inventory, then select only roots with native import declarations. Freeze and sort the complete candidate inventory, selected targets and skipped candidates for each build; independently recompute both conditions at publication admission. Do not use a static family/date allowlist, aliases, or residual dist files. Added, removed, renamed or changed candidates, including skipped sources, invalidate an older build receipt.                                                                                                                                                 |
| DEC-003 Import inputs       | Resolve repository-published dated ontology imports through a shared, bounded local source-document mapping, validating exact ontology/version identity and path containment; use the relevant existing OASIS family catalog for other vocabulary imports. The mapping covers source dependencies before the output cutoff too. Disable network acquisition in publication-build composition, including remote JSON-LD contexts and catalogs. Missing or conflicting local inputs fail. Skip an import-free output root before import resolution; no catalog or materialization is needed for that root. Preserve the separately accepted general CLI's bounded remote-loading policy. |
| DEC-004 Alternate formats   | Render JSON-LD and CSV from the freshly verified full RDF/XML buffers using existing converters. An existing counterpart is never evidence that conversion can be skipped. Preserve ordinary conversion commands as tools; they cannot manufacture a valid publication receipt.                                                                                                                                                                                                                                                                                                                                                                                                        |
| DEC-005 Admission evidence  | Use a versioned generated-output receipt alongside the existing product qualification reports, outside dist. Keep it separate from the active-set SHACL receipt because their scopes differ. Require both at upload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| DEC-006 Publication input   | Upload an isolated, verified snapshot of the complete prepared website tree, including its full artifacts, rather than reading a tree that a concurrent build can mutate. The uploader must revalidate that snapshot before external upload.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| DEC-007 Reuse and naming    | Reuse the source inventory, accepted pinned OwlAPI package/native identity validation and IRI-mapper boundary, OASIS mapper, losslessness check, structural fingerprint, atomic writer, converter worker pool, and native Vite asset emission. The custom gap is cutoff-based discovery, local source mapping, UO orchestration and receipt validation. No dependency/tool version adoption is proposed; retained rights and exact-package evidence remain applicable inputs, not a new licence clearance. Previous four-case qualification does not qualify the newly included roots.                                                                                                 |
| DEC-008 Compatibility       | Preserve public paths, root/version identities and the accepted self-contained OWL contract, rather than demanding the old generated XML bytes. Validate JSON-LD semantically and CSV against its existing projection contract. Do not introduce an old/new shim or change MCP admission.                                                                                                                                                                                                                                                                                                                                                                                              |
| DEC-009 No-import exclusion | Follow the owner's explicit rule: no root import declarations means no full representation in any of the three formats. Record the skipped source digest and reason. Check absence independently at admission. Remove stale counterparts only when generator ownership and path containment are established; otherwise refuse admission and retain evidence rather than deleting unknown files. This product rule does not change the general materializer's root-inclusive closure semantics.                                                                                                                                                                                         |

No technical decision presently needs a grilling round.
If a semantic or product-acceptance conflict emerges, first exhaust evidence and the same research order.
Only then use the requested grilling skill to present the unresolved decision frontier with recommendations; wait for the owner's answers.
Configuration approval is a separate authority boundary, not a technical research fallback.

## Draft requirements and falsifiable quality scenarios

| Requirement and acceptance                                                                                                                                                 | Scenario and proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 / AC-001: No maintained full copies; for every eligible dated source root the build produces one full RDF/XML, JSON-LD and CSV set, with no eligible root omitted. | QA-001: With an empty isolated output root and no full files in src, the normal build produces the complete discovered set. Test `20260713` exclusion, `20260714` inclusion, later dates, an additional ontology family, aliases, invalid dates and existing generated counterparts. Add/remove/rename an eligible root and prove discovery and receipt invalidation update without changing a target list. Seed obsolete dist files and repeat; current sources determine acceptance.                                                                                                                                                             |
| REQ-002 / AC-002: Every full ontology conforms to the existing approved closure contract.                                                                                  | QA-002: Check root identity/annotations, structural axiom union, anonymous-individual semantics, empty imported ontologies and strict offline reload. Compare real generated outputs with the pinned independent Java OWLAPI oracle. Counts alone are insufficient. A declared import remains a generation trigger even if its document adds no new axioms.                                                                                                                                                                                                                                                                                        |
| REQ-003 / AC-003: Full RDF/XML, JSON-LD and CSV share one generation's inputs.                                                                                             | QA-003: Change an imported fixture axiom; rebuild; verify its effect in full RDF/XML, graph-equivalent JSON-LD and the applicable CSV projection. Supply a stale alternate format and prove it is replaced or publication refuses it.                                                                                                                                                                                                                                                                                                                                                                                                              |
| REQ-004 / AC-004: The publication build consumes local, identified inputs and leaves authored files unchanged.                                                             | QA-004: With network requests rejected, every discovered real target succeeds; ISO 31073 retains ordinary outputs and is skipped for full generation. Include a pre-cutoff imported dependency in a fixture. Remove a mapped input or context and prove failure with no remote fallback. Compare authored-source/catalog hashes before and after the build.                                                                                                                                                                                                                                                                                        |
| REQ-005 / AC-005: Incomplete, interrupted or stale builds cannot publish.                                                                                                  | QA-005: Fail each family and conversion phase; interrupt after writing some outputs; tamper with any required output, root, import, catalog, producer or dependency identity; remove/corrupt the receipt. Add a new eligible source after a previously successful build and prove that a receipt listing only the old targets is refused. The actual upload entry point must refuse before invoking its helper.                                                                                                                                                                                                                                    |
| REQ-006 / AC-006: Published candidates are isolated from concurrent local writers.                                                                                         | QA-006: Mutate live dist during snapshot preparation and after validation. Reject an inconsistent snapshot; a successfully sealed candidate uploads only its verified bytes. Test path containment, symlinks and competing producers without destructive cleanup of user data.                                                                                                                                                                                                                                                                                                                                                                     |
| REQ-007 / AC-007: Existing consumer behavior and CI selection remain effective.                                                                                            | QA-007: Exercise the full ontology page and RDF/XML/JSON-LD/CSV downloads from a freshly built local candidate; preserve ordinary aliases and existing query fallback. Changes to any declared closure input or publication validator must select its affected verification consumers.                                                                                                                                                                                                                                                                                                                                                             |
| REQ-008 / AC-008: Every date-qualified candidate with no root import declarations has zero full counterparts in the build and upload snapshot.                             | QA-008: Test an import-free fixture, comments containing `owl:imports`, alternate namespace prefixes and invalid ontology input. Prove semantic parsing controls selection and parse failures cannot become silent skips. Add the first import and remove the last import; prove target selection, receipt invalidation and all three output paths change together. Seed a stale full trio: remove only proven generator-owned contained paths, and refuse unknown ownership without deleting files. Tamper with the recorded skipped list and prove independent admission catches the discrepancy. Check the real ISO 31073 `20260912` exclusion. |

Outcome measurement: for D date-qualified candidates and N import-declaring targets independently discovered from current sources, a clean build has exactly the required 3N full representation files, N offline structural proofs, passing cross-format checks, and zero full counterparts for the D-N skipped candidates.
At the current observation D=9, N=8 and 3N=24; those counts are not hard-coded acceptance constants.
Receipt invalidation and refusal trials pass.
Sources contain none of the four maintained full copies being retired.
These are proposed acceptance targets, not current results or a claimed performance saving.

## Implementation slices

| Slice     | Complete observable increment and predicted seams                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Links and proof                                                                                                                                                                                                                                                                                                                                             | Release and cleanup implications                                                                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SLICE-001 | Generate one representative core closure and its two counterparts from a local fixture without a full source file. Compose existing materialization and converters in a cohesive build module; pass explicit source/output roots. Use native Vite asset emission, with a private materialization workspace rather than reading stale dist during buildStart.                                                                                                                                                                                                                                                                                                            | REQ/AC-001,002,003,004; QA-001 through 004; DEC-001,003,004,007. Missing imports, conversion failures and changed imported axioms discriminate the design.                                                                                                                                                                                                  | Demonstrable in isolation; do not deploy or remove the real source copies yet. Clean owned temporary materialization files after their consumers finish.                                                                                                                                                     |
| SLICE-002 | Apply the cutoff and parsed-root import check to the complete source inventory; materialize selected production targets with shared local import resolution and integrate into normal Vite builds. Record skipped candidates and their digests; suppress all three full formats for them and handle proven generator-owned stale outputs within contained paths. Capture consumed input and target-set identities, reject source collisions and concurrent writers for the same output root, and seal a complete output receipt only after all required writes, absence checks and source revalidation succeed. Share discovery with the standalone batch and verifier. | REQ/AC-001 through 005,008; QA-001 through 005,008; DEC-001 through 005,009. Boundary/additional-family discovery and first/last-import transition trials; clean and dirty isolated builds; blocked network; all-target independent structural/Java checks; failure at the last target; no valid receipt after partial failure.                             | This is the replacement and expanded production producer. Receipts belong with product qualification reports; a partial dist tree is not qualified. Preserve unrelated dist files and historical failure evidence. Unknown ownership of stale counterparts blocks admission instead of authorizing deletion. |
| SLICE-003 | Require the full-output receipt at the existing Python upload boundary, through one shared Node validator for the JS-owned target/build contract. Preserve all existing active-set checks. Make a private candidate snapshot, independently reparse source candidates to recompute required and forbidden full paths, revalidate required files, absence of skipped counterparts and qualified ordinary copies, and pass that snapshot to the existing helper.                                                                                                                                                                                                          | REQ/AC-005,006,008; QA-005,006,008; DEC-005,006,009. Test the actual normal/force entry points, malformed/omitted/duplicate entries, changed inputs including skipped sources, output corruption, stale forbidden files, generation races and interrupted preparation. Mock only the external upload helper/network, not the local validation being proved. | No generation inside upload. A failed preparation makes zero external upload calls. Retain required diagnostic evidence, then remove owned scratch only when its consumer/recovery purpose is finished.                                                                                                      |
| SLICE-004 | Remove exactly the four src full files; update production and browser fixtures to generate real closures rather than injecting a full source copy. Update existing closure/development documentation and the CI input selector, with its reviewed digest.                                                                                                                                                                                                                                                                                                                                                                                                               | REQ/AC-001,007; QA-001,007; DEC-002,008. Full-page download tests on the isolated fresh build; source-deletion and catalog-only selector trials; ordinary release/alias/query regressions.                                                                                                                                                                  | One coherent production cutover with slices 002/003; no release that deletes sources without their replacement and gate. Do not clear the whole dist tree or remove unrelated tracked changes.                                                                                                               |

Ordering: 001 before 002; the shared receipt/target contract in 002 before 003; 004 before final assurance and any publication.
Implementation writes are coupled and belong to one integration owner.
Read-only evidence analysis may be parallelized if later authorized; this planning request does not dispatch agents.

Test expectations come from the accepted OWL contract, independent Java results, converter graph equivalence and existing CSV/page contracts, not from snapshots generated by the new implementation. Discovery expectations must be explicitly stated for independent fixture inventories and checked against the observed real-source table, rather than computed only by the discovery helper under test. A prior generated full file is comparison evidence, not the sole oracle. Preserve the existing general loader/failure/atomic-write tests and their accepted policy boundaries.

## Exact proposed configuration changes

These require separate explicit approval under AGENTS.md before editing.
Files are concrete proposal targets; any additional configuration file or materially different setting requires a fresh scoped proposal.

| File                                                        | Smallest proposed setting/behavior change                                                                                                                                                                                                                                                                                                  | Pipeline impact                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build/createWebsiteConfig.js`                      | Supply the inclusive `20260714` source-discovery and generation context to the existing ontology asset producer and completion validator. Preserve outDir, emptyOutDir, aliases and bundler settings.                                                                                                                                      | Ordinary production builds become complete full-distribution producers for the discovered dated set and fail on missing required generation.                                                                                              |
| `scripts/build/vitePlugins.js`                              | Integrate full generation into native build asset emission and add success-only receipt completion after actual writes. Invalidate publication eligibility when a new build begins or fails. Keep production-generation hooks explicitly scoped to build.                                                                                  | No dependence on static-copy timing or optional npm hooks; errors propagate through Vite.                                                                                                                                                 |
| `scripts/build/sourceInventory.js`                          | Expose valid dated ontology candidates at/after `20260714`, with their identity/source inventory, and reserve their corresponding full paths for the generator's selection/absence policy so authored/static files cannot compete for those output URLs.                                                                                   | Includes later dates and new families automatically; prevents stale source full copies being silently admitted as a second producer or bypassing no-import exclusion.                                                                     |
| `scripts/build/ontologyAssets.js`                           | Include the freshly materialized full buffers in JSON-LD/CSV rendering while retaining the existing ordinary-source list for query artifact admission.                                                                                                                                                                                     | Alternate formats consume the new full documents; full names do not become new MCP query releases.                                                                                                                                        |
| New `scripts/build/fullOntologyAssets.js`                   | Add cohesive cutoff-based candidate discovery, native root-import selection, skipped-source evidence, contained handling of proven generator-owned stale outputs, local source mapping and materialization/rendering, using existing owned APIs and explicit roots.                                                                        | Centralizes generation and receipt rules; every import-declaring eligible release receives a full set, while import-free candidates have none, without a package or toolchain change.                                                     |
| `scripts/createFullVersions.js`                             | Replace the four-item target array with shared source-based discovery using the inclusive cutoff, root-import check and explicit source/output roots, keeping one maintained batch command.                                                                                                                                                | The standalone batch and normal build apply the same required/forbidden output rules; residual dist files cannot determine the target set.                                                                                                |
| `scripts/materializeImportClosure.js`                       | Permit build composition to supply the native strict local-only loader configuration and shared local-source IRI mapper alongside the relevant OASIS mapper; retain the existing general CLI's remote-loading defaults and closure semantics.                                                                                              | Publication builds resolve exact local release documents and refuse remote fallback.                                                                                                                                                      |
| New `scripts/verifyFullOntologyBuild.js`                    | Provide one read-only Node entry point for the shared build-receipt validator, accepting an explicitly selected candidate output root and independently reparsing candidates to verify import selection and required/forbidden outputs.                                                                                                    | Python publication admission reuses the JS-owned target contract instead of duplicating it; skipped-list tampering or stale redundant full files cannot pass.                                                                             |
| `scripts/ontology_policy/publication.py`                    | Retain current active-set checks, accept an explicit candidate dist root, and require successful full-output receipt validation for that candidate.                                                                                                                                                                                        | Both source qualification and generated-output completeness become required admission conditions.                                                                                                                                         |
| `scripts/upload_to_s3.py`                                   | Prepare a private upload snapshot, validate it through the strengthened gate, and pass that root to the unchanged external helper; preserve normal/force and deletion/invalidation options.                                                                                                                                                | Upload consumes the verified snapshot rather than mutable live dist, with no regeneration or automatic qualification.                                                                                                                     |
| `scripts/selectPullRequestChecks.js`                        | Add website-build coverage for `scripts/createFullVersions.js`, `scripts/materializeImportClosure.js`, `scripts/ontology/`, discovery/verification inputs, existing family catalogs, and ontology/vendored vocabulary inputs under all three published source roots; ensure upload/gate/validator changes select their actual test owners. | Source-only additions of eligible dates or families and catalog/input-only changes exercise the new build path; publication controls cannot evade verification selection. Keep every existing consumer and revision/completion safeguard. |
| `scripts/distribution/verifyUniversalOntologyMcpRelease.js` | Update only the reviewed semantic digest for `scripts/selectPullRequestChecks.js` after coordinated selector review and negative tests.                                                                                                                                                                                                    | Keeps the existing policy-integrity gate valid for the deliberately changed selection semantics.                                                                                                                                          |

Other predicted implementation files are the four explicitly removed source artifacts, related JS/Python tests and existing documentation.
The table conservatively includes executable files that control build or publication behavior, not only conventional configuration extensions.
It is not a waiver for an unlisted setting.

No package.json, lockfile, runtime pin, hosting setting or workflow YAML edit is currently necessary for the selected design.
Existing npm build commands reach the changed native Vite producer.
If implementation disproves that expectation, stop for the exact additional configuration proposal rather than quietly expanding scope.

The revised proposal also avoids the preceding draft's six static URI additions across three catalogs.
A validated local source-document IRI mapping owns repository-published dated release IRIs across all dates; existing catalogs retain OASIS resolution for other vocabulary IRIs.
If a catalog also binds a repository release IRI, require the same contained source document or identical captured bytes and matching native identity; reject conflicting bindings rather than silently choosing a different release.
ISO 31073 currently has no imports and no catalog; skip its full generation and do not create a catalog for it.
Its ordinary source/output remains available and it can still be an imported dependency of another root.
This ongoing resolution boundary is not a compatibility shim.

## Evidence, release and recovery

Store HISEW planning/review/verification handoffs under the existing external evidence root `C:\Users\maksy\.hi\w\e` with native receipts written only by the engine.
This file is an operator-authored proposal, not a native accepted baseline or verification receipt.

Keep generated product evidence in the existing product qualification-report domain: propose `.sdlc/runtime/policy-reports/full-ontology-build.json`, alongside but separate from `qualification-receipt.json`.
This location is product-owned because the uploader consumes it; it is not a return to legacy HISEW bookkeeping in .sdlc.
Keep manifests, temporary candidates, source paths and reports out of published ontology outputs.
Use `.sdlc/runtime/policy-reports/publication-candidates/<unique-id>/dist` for owned product snapshots, with an explicit lifetime and containment checks; never place this scratch inside the published dist tree.

The new receipt records schema version, cutoff and complete discovered candidate/target inventory, parsed root-import declarations, skipped candidates with source digests and a no-import reason, consumed root/import/catalog identities, relevant producer and dependency identities, the accepted contract identity, completed structural/cross-format validation and each output's relative path, size and SHA-256.
Independently rediscover and reparse current candidates at admission rather than trusting the receipt's target or skipped lists.
Adding the first import to a skipped source must invalidate the old receipt.
Reject missing/unsupported/incomplete receipts and unexpected, escaping, duplicate or omitted entries.
Revalidate current inventory/inputs, required full files and absence of all three full counterparts for skipped candidates in the sealed upload snapshot; an old output's mere existence is insufficient.
Do not treat an editable local receipt as a cryptographically trusted SLSA attestation.

Stale-output handling is limited to the exact three counterpart paths for date-qualified candidates that no longer declare imports, with containment and generator-ownership evidence.
Remove only proven owned outputs during authorized implementation/build operation; unknown ownership fails closed and remains available for diagnosis.
Do not clear dist or delete unrelated or pre-cutoff files.
The current draft performs no deletion.
A separately authorized deployment using the existing helper's deletion option can remove previously published redundant counterparts; record the exact intended exclusions and verify remote absence after propagation rather than assuming local suppression already removed remote files.

After the replacement works, compare accepted generated closure semantics with the retired source copies and retain explanations of material differences.
If replacing the producer changes a dated public artifact's agreed meaning, stop and resolve release compatibility before deploying; current root-import graph equivalence is not proof of that full-artifact comparison.

Before expensive final assurance, finish authorized source/configuration edits and relevant fixes, review the diff, freeze the exact candidate and inspect HISEW's current verification route. Use the registered full profile as the canonical final run, rather than manually running the same full suite first and repeating it for a receipt. Retain scoped supplemental real-corpus/Java/browser evidence separately; engine completion does not certify those observations merely because a reference mentions them.
Required independent verification and ordinary review remain distinct obligations.
Record failures and unavailable capabilities honestly.

Publication is a separately authorized phase.
Before it, retain a recoverable previously verified release artifact, perform final snapshot admission, and record the discovered 3N required full-artifact paths/hashes plus the forbidden counterpart paths for skipped candidates. After authorized upload and invalidation, read back public RDF/XML and JSON-LD for every selected root and check their identities/semantics, verify CSV projection and page/download behavior, and compare served bytes against the candidate after propagation.
Verify absence of skipped candidates' full counterparts and continued availability of their ordinary outputs.
The observer is the delivery agent acting for the owner.
Local tests and a merged PR are not deployed acceptance.

Abort before upload for any stale/missing receipt, failed structural/conversion proof, changed input, incomplete snapshot, unavailable required reviewer/verifier or unauthorized configuration delta.
An upload interrupted mid-flight may expose a mixture because the existing helper is not an atomic whole-site publisher; retain candidate and helper evidence, inspect remote state and use the approved previous artifact or forward fix.
Do not claim all-or-nothing remote recovery without a different accepted hosting design.

Adding another valid eligible date or family is ordinary discovery, not a reason to amend a target list.
Replan if the cutoff or supported authored-format/identity convention changes, a newly discovered root requires unavailable capabilities or a required vocabulary is not locally available under established rights, source/old-output meaning conflicts, locked Vite hooks cannot meet the completion order, growth in build cost exceeds the existing governed timeout, snapshot preparation cannot isolate mutation, a schema change affects another consumer, or atomic multi-object remote rollout becomes a requirement.
These are discriminating evidence/acceptance conditions, not reasons to lower the risk route or substitute old tooling.
