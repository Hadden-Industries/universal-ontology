# Universal Ontology: Markdown Quality integration

Owner-approved follow-on decisions supersede this plan's original all-document enforcement and copied-control design.
The root `.markdown-quality.json` is now the sole source of Markdown content policy, retaining `include: ["**/*.md"]` and the four approved historical/generated/vendor exclusions.
The UO-only centralization cutover uses immutable producer archives and the SHA-pinned shared workflow, with operational bounds in `.markdown-quality-execution.json`.
Historical decisions and measurements below remain records of the original integration; they do not override the current root configuration.

Date: 2026-10-07, Europe/Bucharest.
Status: accepted for implementation by the owner on 2026-10-07, with the execution amendments below.
Owner: Maksym Shostak.
Target: `C:\Users\maksy\GitHub\universal-ontology`, public repository `Hadden-Industries/universal-ontology`.
Parent: [shared implementation plan, SLICE-009](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/plans/implementation-plan.md#slice-009-migrate-the-remaining-mature-consumers-one-at-a-time).

## Authority and outcome

### Accepted execution amendments, 2026-10-07

The owner instructed implementation using HISEW, approved detailed per-file commit messages, commits, GitHub pushes and normal merge PR delivery to remote `main`, and approved configuration changes called for in this plan.
The owner also required deletion of the spent local implementation branch after delivery.
This approval supersedes the proposal's future approval language for those effects; exact trusted-run acceptance remains an attributable evidence obligation before cutover.

The owner's explicit scope override is `"include": ["**/*.md"]` with no document exceptions.
It supersedes DEC-003's narrower selection, retained-document exemptions and incumbent selection parity: every repository Markdown document is quality-controlled, including agent instructions, generated policy, vendored notices, fixtures, reviews and historical plans.
Installed dependencies, Git metadata and local virtual environments remain execution infrastructure rather than repository documents.
No ignore input may suppress repository Markdown.
Retain original document bytes externally, repair links against real source/targets, and change generated Markdown through its generator.

The implementation baseline is `73cf8934548ad59cb8c3867a2fac3ddd3dc2a304`, matching inspected `origin/main`; only this plan was untracked.
The previously concurrent CI work has landed, including schema version 4 and authenticated PR-evidence reuse.
There is no other active HISEW execution in this worktree.
Preserve those current controls and the reviewed nineteen-file release-policy manifest.
The old baseline observations below are retained as planning history, not current checkout authority.

The inspected HISEW profiles are `focused` = `test:unit`, `affected` = `test:consumer`, and `full` = `check:qualification`.
Use the existing full profile for native final verification, with Markdown integration and trust probes in the updated qualification aggregate.
The inspected local runtime is Node `24.21.0`; anonymous registry readback still identifies release `1.0.3` and its recorded core integrity.

#### Bounded cutover baseline amendment

The reviewed bootstrap was integrated by normal merge PR #130 as `dd6cea2f2369438465917ae24cd85ce6709a56fa`.
Hosted shadow run `37556387729` acquired and exercised release 1.0.3 on Windows x64 and Ubuntu 24.04 x64 with Node 24.21.0, selected all 112 tracked Markdown files, and retained truthful preservation failures from the unmodified corpus.
It is bootstrap/install evidence, not a successful six-sample cutover window.
The accepted corpus is expanded to all repository Markdown; original tracked bytes and the installed Python distribution inventory are retained externally before cutover.
The lock pins `snapper-fmt==0.11.9`, but the retained local inventory contains `0.11.7`.
After that discrepancy was reported, the owner separately approved uninstalling only the actually installed `snapper-fmt==0.11.7` from the existing repository environment at qualified cutover.

Schema 5 makes the development consumer and its full Markdown matrix mandatory for every functional route while leaving the input-derived product scopes unchanged.
Selected Node reuse retains its eleven directly executed control suites and exact native workflow/job/attempt/source/artifact admission, with a new policy identity and the expanded native job inventory required by mandatory Markdown.
Both PR and main require fresh Markdown completion; main reuse omits only selected Node execution.
The release-policy allowlist is extended and re-digested for the new executable/policy/tool-lock inputs only after coordinated source review and negative tests.
Old version-4 records cannot authorize the new contract.
The active policy generator invokes the canonical formatter before producing or comparing generated Markdown.
Historical supplied-byte hashes retain their original capture identity; normalized reading copies do not become retroactive original-byte proof.

The owner requested this proposal using the successful Markdown Quality integrations as precedents.
It proposes a bounded R2 developer-tooling and CI migration; its requirements, decisions, scopes and operating targets require acceptance before implementation.
Universal Ontology is registered and active in personal HISEW mode.
Recheck applicability, execution ownership and approved verification profiles before engine mutations; this planning task does not adopt the ongoing CI change's execution.
The repository's [agent instructions](../../AGENTS.md) require exact configuration approval and separate commit/push authority.
Writing this document does not authorize installations, environment changes, source formatting, independent scans, workflow dispatches, commits, pushes, merges or publication.

The intended outcome is one maintained implementation of authored Markdown formatting, linting and physical-file link checks, with attributable enforcement and recoverable document changes.
Preserve ontology semantics, import closure, generated assets, application/workspace contracts, existing check thresholds, CodeQL configurations and release/publication safeguards.
Identifiers below are Universal Ontology-local; other repositories' acceptance and evidence do not become this repository's approval.

## Current baseline and dependencies

The inspected working `main` is `93c348955d20aec93c4d9b471ed94fc2208d57ba`; remote `main` is `05d7b73c71345bc0b4fd7917d8a00cfb233ee093`.
There are 20 pre-existing modified/untracked files in CI workflows, selectors, schema/validator, Node-family orchestration, distribution verification, documentation and tests.
Their status and SHA-256 bytes were captured before adding this proposal and must remain unchanged by planning.
Do not commit, restore, overwrite, integrate or regenerate those files incidentally.
Refresh the authoritative base and coordinate with their owning task before freezing implementation scope.

The [proportionate CI plan](2026-10-06-proportionate-ci.md) proposes later authenticated reuse of PR evidence after equivalent integration.
The current inspected implementation has `PR validation` as its functional PR entrypoint and `Full qualification` for selected main-push checks plus scheduled/manual full routes.
It does not currently implement that cross-run reuse, and there is no basis here to call a UO workflow `PR_Qualification`.
This migration must fit the coordinated selector and completion gate, rather than add a competing qualification controller.
Read-only effective-rules inspection found a protected PR route with strict current-base required `PR validation` from GitHub Actions; CodeQL remains separate from that required context.
Refresh these controls before execution; changing them is not part of this proposal.

Observed tooling and coverage:

- Private MIT root application with three npm workspaces; npm `12.0.2`, Node reference `.node-version` `24.21.0`, repository Python `.venv` and pinned Python `3.14.7`.
- Prettier `3.9.9` and locked Snapper `0.11.9`; `scripts/formatDocumentation.js` applies Prettier, native Snapper and Prettier per selected file, with local quoted-list/wrap exceptions.
- The selector includes `*.md`, `docs/**/*.md` and `packages/*/*.md`, with existing `.gitignore`/`.prettierignore` semantics.
  Read-only enumeration found 40 selected files before this proposal, including workspace README/notices and historical plans.
  Adding this selected document makes 41 if other inputs stay unchanged.
- Existing generated policy, retained review/SDLC evidence and installed/external directories are excluded; the rest of `docs/plans` is not blanket-excluded.
- `scripts/prepareDocumentationTools.js` extracts a minimal Prettier graph and exact Snapper wheel evidence for the Linux documentation job.
  That job normally checks changed Markdown only; full/style-tooling routes check the corpus.
- Root `lint`, format aggregates, `check:style` and `check:qualification` include the old documentation controls.
  The qualification aggregate deliberately checks cheap style inputs before Jest, Python and `build:verify`.
- Development setup enforces the exact locked Python distribution set.
  Removing Snapper from a lock without coordinating the installed environment would break that invariant.
- The working selector emits schema version 4; a generated standalone validator, explicit selected-consumer revision evidence and an always-running completion gate reject missing, failed, cancelled or unexpectedly skipped work.
- `verifyUniversalOntologyMcpRelease.js` currently protects a reviewed 15-file workflow/control manifest, using semantic YAML/JSON and normalized first-party JavaScript digests.
  Its negative fixtures and release-policy admission remain authoritative.

The 40-path baseline inventory's sorted JSON SHA-256 is `b012e5b25baccdda121a69291522c0ce0e8e96776a7f1846cfb8304b8e71d2d5`.
This is a planning observation, not the future accepted corpus identity; capture actual paths and document bytes again in SLICE-001.
Current source and remote rules take precedence over stale descriptions in earlier plans.

## Maintained capability and package identity

Reuse the [pilot integrations](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/pilot-migrations.md): OwlAPI's isolated tool project and trusted candidate-as-data qualification, WebVOWL's exact installed graph/native validation and retained recovery, and Software Engineering Workflow's retirement of only prose-exclusive Python tooling.
Freeze the actual source and applicable notices before copying any consumer test or trusted-workflow code; adapt repository assumptions rather than transplanting whole controllers.

The proposed target is the published, coherent [1.0.3 tuple](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/releases/1.0.3.json), source `92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0`, immutable GitHub release `v1.0.3`.
The core and Windows/Linux native packages remain separate public packages, pinned and verified together.
Published core engines are `>=24.21.0 <25`; existing UO reference Node `24.21.0` fits.
Use release versions and integrities, not moving npm tags, unreleased source, repacked archives or independently chosen platform versions.

Producer main `7994fdb08efa4fc391f6e035c9fff17820635b58` now qualifies engines `^22.23.3 || ^24.21.0 || >=26.10.0` with minimum/latest Node 22/24/26 lanes on Windows x64 and Ubuntu 24.04 x64.
One frozen tuple packed on Node 24.21.0 passed the matrix, real native CLI and isolated-install oracles, including Node 22-compatible mocks without weaker assertions.
Source-bound [package qualification](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37539180714), [transported qualification](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37539180707) and [CodeQL](https://github.com/Hadden-Industries/markdown-quality/actions/runs/37539179834) completed successfully, attempt 1.
Those changes are unreleased by owner instruction and do not alter published 1.0.3 metadata or bytes.
Node 26.10.0 is [Current](https://nodejs.org/en/blog/release/v26.10.0); the [planned 2026-10-28 LTS transition](https://github.com/nodejs/Release/issues/1152) has no specified exact 26.x version yet.
Do not infer later-major qualification from an open-ended engine range or change UO runtime support to match this producer work.
If a newer stable release is proposed at implementation time, inspect its actual changes, qualification and rights evidence and explicitly amend the target before freezing acquisition.

Version 1.0.3 already includes batched operations, request-local reuse, check-first formatting and the strict `authored-gfm@1` trailing-whitespace policy.
No consumer compilation experiment, new preset or producer publication is needed for this integration.
Its recoverable publication and immutable release evidence establish package identity; they do not replace UO-specific consumer or trust qualification.

## Proposed requirements and acceptance

| ID               | Requirement                                           | Acceptance criterion                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 / AC-001 | Preserve selection and unrelated work.                | Native selection equals the accepted incumbent corpus, including package documentation and selected plans; excluded/generated/external bytes and unrelated sentinels are unchanged.                                                     |
| REQ-002 / AC-002 | Acquire the exact maintained tuple.                   | Anonymous isolated `npm ci --ignore-scripts` resolves accepted core/native versions and integrities; actual CLI/native execution passes Windows x64 and Ubuntu 24.04 x64 under qualified Node.                                          |
| REQ-003 / AC-003 | Preserve application, ontology and rights boundaries. | MIT application and existing third-party notices remain; AGPL-3.0-only tool/source/notices are retained and reviewed. No Markdown dependency enters a shipped workspace/runtime graph; product and ontology contracts pass.             |
| REQ-004 / AC-004 | Enforce strict authored Markdown.                     | Missing physical local targets, non-code trailing whitespace and two-space hard breaks fail. Safe formatting preserves literal content, uses explicit breaks, converges and rejects unsafe writes; no new profile or blanket exception. |
| REQ-005 / AC-005 | Make full checking truthful and observable.           | Full authored Markdown checks run on every functional PR/main route, including target-only changes, and block existing aggregates. Native result schema and exit 0/1/2 are preserved; no stale or absent report satisfies evidence.     |
| REQ-006 / AC-006 | Preserve CI and release admission integrity.          | Trusted policy/graph check exact candidate data; selector, versioned plan, revision receipts, completion gate and reviewed workflow digests stay coherent and reject altered/missing/skipped proof.                                     |
| REQ-007 / AC-007 | Demonstrate bounded cost and recovery.                | Comparable baseline/new checks, six-run platform windows and timed restoration meet explicitly accepted operating targets; exact tool/config/document preimages and unrelated sentinels survive recovery.                               |

## Design decisions to accept

DEC-001: use a private isolated npm project at `tooling/markdown`, exact release pin and lock, outside root workspaces and shipped workspace/package graphs.
Run it with qualified Node 24.21.0 on Windows x64 and Ubuntu 24.04 x64; preserve existing UO runtime and development policy.
Use anonymous locked acquisition with lifecycle scripts disabled; no vendored executable, unpinned npx command, automatic download during checking or duplicate formatter.
Retain unchanged native source/notices and reuse valid upstream qualification within its actual limits.
The tool's AGPL-3.0-only license does not authorize rewriting the MIT application license or imply a completed rights assessment: qualify the concrete installed graph, copied code and distribution/use boundaries before adoption.

DEC-002: expose `install:markdown`, `format:markdown`, `check:markdown` and `test:markdown` as canonical commands and update active references and aggregates.
Retire `format:docs`, `format:docs:check`, `format:docs:prettier:check`, `test:prose` and their old prose-exclusive implementations after accepted cutover; no compatibility aliases or local rule shims.
Keep Prettier for its existing non-Markdown formats, Ruff/Python and all product tooling.
Keep cheap Markdown/style rejection before expensive qualification; checking must remain read-only, unlike lifecycle-triggered `build` fixes, and product verification must use `build:verify`.
Update `test:node` ownership/exclusions and focused regression jobs so new Markdown integration tests are neither silently omitted nor repeatedly executed without purpose.

DEC-003: `.markdown-quality.json` selects `*.md`, `docs/**/*.md`, `packages/*/*.md`, uses `authored-gfm@1`, existing approved ignore policy, LF/tab width 2, `links.localFiles = true` and `links.rootRelative = reject`.
Prove native path parity against `selectDocumentationFiles()` and the frozen inventory.
Do not copy Steam's blanket `docs/plans/**` exclusion: UO currently checks many plans and package notices.
Retain genuine generated/evidence/external exclusions and physical existence checks for targets referenced by selected documents, even if a target itself is excluded from formatting.
Missing generated targets require a real trusted generator/materialization step or a correct link repair, not placeholder files or disabled checking.
Adjudicate any selected historical evidence defect against its retained source and approval boundary; do not reformat immutable evidence or introduce blanket exemptions as a shortcut.

DEC-004: replace changed-file-only documentation checking with a full authored-corpus gate on every functional PR and main route, including changes to non-Markdown link targets.
Run real Linux/Windows Markdown jobs through the existing development consumer and completion aggregate; scheduled/manual full routes retain this coverage.
Keep product, website, ontology and distribution work input-selected: making Markdown mandatory must not automatically select unrelated expensive suites.
Add tool/config/lock, acquisition, trust, report and integration-test inputs to the coordinated selector; preserve conservative fallback, mixed-change union and exact candidate revision receipts.
Ordinary product CI alone is not proof that candidate workflows or policy are trusted.

DEC-005: coordinate selector, evaluator, schema version 4, generated validator, reusable workflows, completion jobs and reviewed release-policy inputs as one consolidated change.
Change the protocol version if its admitted semantics require it; regenerate the validator through its native generator and run actual missing/skipped/wrong-revision/altered-policy negative fixtures.
Update the reviewed 15-file manifest only after reviewing the exact approved workflow/control change, never by automatically learning arbitrary candidate hashes or editing generated validation code by hand.
Retain existing CodeQL languages/configurations and required statuses; inspect actual rules rather than assuming a classic branch-protection 404 means unprotected main.
If the separately owned PR-evidence reuse work lands first, require the reused Markdown result to cover the full corpus and physical targets under its exact-tree/trusted-workflow/environment admission and invalidation rules.
Otherwise retain independent main checking; this migration does not implement PR-proof reuse, drop CodeQL on merge or reinterpret a workflow name as evidence.

DEC-006: adopt a UO-specific trusted bootstrap and separate exact owner acceptance for final cutover, following the [shared CI trust decision](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/ci-trust.md).
Name/App-based required checks do not bind the trusted workflow source; successful pilot approvals are not transferable authorization.
Integrate a narrowly scoped shadow bootstrap through incumbent controls, then use its trusted default-branch source to install the reviewed graph and inspect exact cutover candidate data without candidate executable/policy authority.
Disable checkout credential persistence, lifecycle execution and credential inheritance into checking; no elevated candidate execution via `pull_request_target`.
No new App, subscription, secret, status-writer service, registry publication or remote ruleset change is proposed.
Keep MCP manual/package publication opt-in and existing workflow review gates intact.

DEC-007: retire only proven prose-exclusive Python and JavaScript consumers after source/reference and environment searches.
Expected retirement is the old documentation formatter, minimal-documentation extractor, obsolete prose/extractor tests, `.snapperrc.toml` and Snapper's exact development-lock/input entries.
Preserve other Python distributions, `.venv`, launcher, Ruff, ontology/Jena tooling, non-Markdown Prettier and existing notices.
Regenerate locks through their owner.
Because setup rejects extra installed distributions, any removal of Snapper from the user's environment needs separately accepted exact environment scope; do not silently uninstall it while drafting or cut over to a knowingly inconsistent local setup.
Use canonical Git LF bytes and a real checkout-drift guard for any new first-party dependency/governance hashing, following the durable pilot correction.
Do not normalize external licenses, raw authority payloads or binaries whose supplied bytes are authoritative under `.gitattributes`.

DEC-008: propose the parent operating targets for explicit UO acceptance: six consecutive valid full checks per frozen corpus/platform, nearest-rank observed p95 at most 30 seconds, measured 1024 MiB platform budget, zero unexpected failures/adjudicated false positives, and one restoration within 60 minutes.
With six samples, p95 is the observed maximum, not a population reliability claim.
Measure check runtime separately from installation; compare old/new on the same corpus, OS and Node/Python references.
Record platform-appropriate memory measurements and their actual accounting semantics rather than equating incomparable metrics.
Producer/pilot timing does not establish UO performance.
Replan on measured failure instead of weakening correctness or silently importing accepted budgets from another consumer.

## Quality scenarios and verification oracles

| ID     | Scenario and observable oracle                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 | The exact authored inventory, including package README/notices and selected plans, matches native selection; generated policy, raw authorities/external sources and unrelated sentinels retain exact bytes.             |
| QA-002 | Missing real relative targets fail even when only a target changes. Excluded generated targets remain necessary where linked; fragment/external handling follows native documented semantics.                           |
| QA-003 | Non-code trailing spaces and two-space breaks fail; safe formatting uses explicit backslashes. Fenced/indented literal bodies remain exact; sensitive inline/HTML cases refuse destructive formatting.                  |
| QA-004 | Full check writes no document; format converges and preservation/convergence/operational guard failure writes nothing. Clean/findings/operational fixtures preserve native report schema and exits 0/1/2.               |
| QA-005 | Candidate scripts never execute, candidate config/ignore changes cannot suppress defects, malformed staging and native/report failures reject proof, and checking has no registry/repository-write/OIDC credentials.    |
| QA-006 | A Markdown or target-only defect blocks PR/main completion. Mixed changes retain selected product jobs; missing/cancelled/skipped/wrong-revision jobs, altered reviewed workflow bytes and invalid plans fail closed.   |
| QA-007 | Existing ontology/import-closure, policy generation, workspace/MCP contracts, website/build safeguards, Python setup invariants and CodeQL configurations remain valid; no shipped Markdown runtime dependency appears. |
| QA-008 | Both six-run windows meet accepted budgets; recovery restores complete tool/config/document preimages and sentinels, followed by relevant incumbent controls and native Markdown checks.                                |

The incumbent selector owns the scope oracle; product and ontology generators/tests own semantic invariants; the maintained CLI parser/schema and documented guards own Markdown behavior.
Use actual installed CLI/native execution, filesystem targets and temporary directories for consumer boundary tests, not mocked formatter output.
Reuse unchanged upstream tests/reviews with declared limits; cover UO literals, target-only changes and report/trust/setup seams rather than duplicate the entire formatter suite.
Replace old changed-path-only and permissive hard-break assertions with the accepted full-corpus/strict contracts, without dropping their underlying preservation or failure obligations.

## Implementation slices

### SLICE-001: Coordinate, freeze and accept scope

Resolve ownership and base with the ongoing proportionate-CI task before writing shared selectors, digests, workflows or tests.
Accept route/design/operating targets and approve HISEW profiles for focused, affected and full verification using actual UO commands.
Freeze current authored selection, excluded/generated/raw inventories, unrelated sentinels, command/report readers, setup consumers, effective required statuses and reviewed workflow-policy inputs.
Verify anonymous exact tuple acquisition, native/source/notices and current dependency/security evidence; do not copy another consumer's override without a graph-qualified reason.
In an isolated baseline, run old native checks and capture comparable cost, then classify genuine defects and deliberate policy differences on the same frozen corpus.
Prepare retained preimages and an exact predicted delta/recovery manifest, including any environment removal, for owner acceptance before configuration/source mutation.
Commit the accepted plan and necessary planning documents at the first separately authorized commit point; leave unrelated CI work outside this migration's staged scope.

Exit: accepted concrete scope and trust path, coordinated execution ownership, authoritative package/rights identity, baseline evidence and recoverable inventories.
Unresolved release-policy, rights, environment or CI ownership boundaries block implementation rather than invite speculative edits.

### SLICE-002: Integrate a shadow native path and trusted bootstrap

Add the isolated tool project, configuration, canonical native commands, report contract and focused consumer tests within approved scope.
Keep incumbent prose enforcement while comparing selection/diagnostics/formatting in a task-owned corpus.
Integrate only the accepted trusted bootstrap through normal protected PR controls, with substantive review of installation and candidate-data trust boundaries.
Coordinate any resulting reviewed workflow manifest change with the release-policy owner and negative tests before bootstrap integration.
Do not retire duplicate tools, reformat live documents or infer final cutover approval from bootstrap success.

Exit: real anonymous installs and native checks on both platforms, path parity, QA-001 through QA-005 probes and attributable incumbent bootstrap CI.
Retain exact bootstrap source/merge/run identities and restoration preimages for qualifying the later cutover candidate.

### SLICE-003: Consolidate cutover and retire duplication

Prepare one candidate containing accepted authored repairs, strict policy, full-corpus PR/main enforcement, canonical reference updates, coordinated selector/schema/validator/release-policy changes and proven prose-exclusive retirement.
Retain workspace/root shipped graphs, generated/external assets, Python/ontology/product checks, cheap-before-expensive ordering and required statuses.
Use native generators for locks/validators/provenance; validate LF first-party hashes and preserve supplied-byte evidence.
Run focused integration, selector/gate/release negative tests, affected product controls and approved final full checks on the frozen candidate.
Prefer one consolidated Claude Opus 5.5/medium independent correctness/security review, reusing unchanged package evidence within its bounds.
If unavailable, record the failed attempt and use an authorized fallback; do not assume this draft grants delegation or scanning authority.
If selecting Antigravity under applicable authority, give it at least 900 seconds with a finite process-hierarchy ceiling; natural earlier completion is valid.
Consolidate fixes before review follow-up, use narrow follow-ups and allow at most two correction/review rounds; unresolved substantive findings require replanning.

Exit: no unresolved correctness/security blocker, all applicable checks pass, protected bytes/sentinels remain intact and one exact cutover candidate is ready for trusted hosted qualification.
Refresh only evidence invalidated by changed inputs rather than repeat broad review without a new acceptance question.

### SLICE-004: Qualify, restore and integrate

Use the trusted bootstrap source to qualify the exact candidate on Windows x64 and Ubuntu 24.04 x64, with six full checks, resource measurements and positive/negative probes per platform.
Rehearse restoration in a task-owned isolated checkout/environment, restoring all migration-owned tool/config/document bytes and separately authorized environment state; verify protected inventories and incumbent controls.
Re-establish the exact final candidate after rehearsal before final hosted proof and acceptance.
Bind candidate/trusted-source SHAs, release/native integrities, policy/ignore/selection identity, runtime, job/run/attempt IDs, native reports, resources and all required statuses.
Obtain separately retained owner acceptance of that exact trusted run and protected merge authority; neither this proposal nor another repository's approval supplies them.
After authorized integration, verify remote main, integrated CI and actual isolated installation/report identity; finish HISEW handoff with native evidence and accurately attributed claims.
Archive only authorized spent branches and retain source/evidence for maintained lifetime plus three years under the accepted shared support policy.
No UO MCP/npm package, website, container or producer publication is part of this tooling migration.

## Traceability and verification scope

| Slice     | Requirements / scenarios / decisions                        | Proof and exit                                                                                                                    |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC-001 to 003, 007; QA-001/007/008; DEC-001/005/007/008 | Coordinated ownership, exact inventories/tuple/rights, accepted scope and comparable baseline with retained preimages.            |
| SLICE-002 | REQ/AC-001/002/004 to 006; QA-001 to 005; DEC-001 to 006    | Actual native installation/execution, report/selection/trust probes, reviewed policy coherence and incumbent bootstrap CI.        |
| SLICE-003 | REQ/AC-001 to 006; QA-001 to 007; DEC-001 to 007            | Focused integration and CI-policy negatives, affected/full checks and bounded consolidated review; exact candidate.               |
| SLICE-004 | REQ/AC-002/005 to 007; QA-005 to 008; DEC-006/008           | Hosted windows/resources, actual restoration, exact trusted-run acceptance, protected integration and integrated-source readback. |

Product verification includes existing `lint:node`, `lint:python`, `format:node:check`, `format:python:check`, focused/full Jest and Python suites, `validate:ontologies`, `check:editing-policy` and `build:verify` according to actual input ownership and accepted profiles.
Preserve applicable import-closure/materialization and MCP distribution/release-policy tests and the current live workflow aggregate semantics.
Add full native Markdown and focused installation/consumer/trust tests without selecting ontology/publication work merely because documentation is mandatory.
A local full run does not establish hosted trust, release admission, installed consumer or deployed website acceptance.

## Predicted seams and ownership

Likely additions: `.markdown-quality.json`, private `tooling/markdown/package.json` and lock, focused integration tests and reviewed trusted candidate/probe/window workflow material after reuse assessment.
Use native CLI output capture and result schema; add a small launcher only where runtime/report persistence and exact exit propagation need orchestration, never to implement formatting/link rules or emulate old Snapper arrays.
Likely edits: root scripts, active [development guidance](../development.md), setup/environment tests, Python dependency inputs/lock, workflow/selector/evaluator/schema and generated validator, CI scope/result/workflow tests and reviewed release-policy digests/fixtures.
Likely retirement: `.snapperrc.toml`, `formatDocumentation.js`, `prepareDocumentationTools.js`, obsolete prose/documentation-extractor tests and Snapper-only acquisition steps, after complete consumer search.
Exact formatted authored paths, coordinated CI files and environment effects require the SLICE-001 accepted manifest; this list is not scope approval.
Do not broaden the migration to ontology sources, generated policy/authority data, shipped workspace dependencies, container/website deployments, remote rulesets or unrelated CI optimization changes.

The executing UO session coordinates with the active CI task; Maksym owns exact scope, configuration, trust and integration decisions.
Read-only research and inventories can proceed while that coordination is pending; shared workflow/selector/schema/digest changes must be consolidated before broad review.
No parallel write delegation or adoption of another session's execution is authorized by this document.

## Recovery and replanning

Abort before mutation on base/preimage or ownership drift, unavailable coherent release, unknown report/setup consumer, unmet rights/security requirements or an infeasible trusted workflow path.
Stop cutover on authored selection drift, literal/semantic damage, protected-byte changes, link-policy weakening, fail-open reports/gates, lost product/CodeQL coverage, resource failure or mismatched candidate/run evidence.
Restore complete migration-owned tool/config/document preimages, including the actual formatted bytes and any authorized environment delta; restoring only the package version is insufficient.
Revalidate sentinels, old required controls and setup distribution invariants without resetting or discarding the live checkout.
For integrated failure, use a normal reviewed revert/forward correction through existing protection; never force-push, move immutable tags or repack a published version.
Resume interruptions from observed branch/PR/run identities and retained evidence, with bounded retries and refresh only where inputs or execution state invalidate proof.
Changing CI reuse semantics, corpus, package/preset/runtime identity, effective rules or rights/security conditions requires a bounded rebaseline and exact scope amendment.

Cheapest execution probes are path parity, a real target-only missing-link case, installed engine/native graph identity, three native exit/report fixtures, setup lock-set coherence and one comparable old/new corpus sample.
Only then commission the complete hosted windows and final cutover assurance.

## Planning evidence and references

Planning read current UO commands, documentation selector, ignore/LF policy, setup and lock contracts, coordinated CI source and release-policy verifier, plus producer/pilot release and qualification evidence.
UO JavaScript execution was limited to read-only document selection/inventory; no product suite, corpus formatting, installation, scan or hosted workflow was run.
The proposal's own layout/link verification is document preparation, not a completed migration, performance window, restoration or independent security approval.

Acquisition follows [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/): `--ignore-scripts` suppresses lifecycle scripts but explicitly requested commands still run, so it alone does not establish candidate-data isolation.
Preserve the [producer consumer contract](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/consumer-guide.md) and [shared CI trust path](https://github.com/Hadden-Industries/markdown-quality/blob/7994fdb08efa4fc391f6e035c9fff17820635b58/docs/ci-trust.md) with UO-specific approval and evidence.
Historical pilot results guide seams and oracles; current source and actual UO hosted proof own acceptance.
