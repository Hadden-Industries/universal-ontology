# PR CI optimization execution evidence

## Scope and authority

The accepted baseline is [the implementation plan](../plans/2026-09-29-github-actions-pr-optimization.md).
Implementation started on clean `main` at `58a306013d3701f59dfe34341e96fac5a011e3ed`.
The user requested implementation via HISEW on `main`, deferred large reviews until the final commit stage, and then explicitly approved the first concurrency batch.
That approval covers the four workflow concurrency blocks, the matching distribution verifier assertion and reviewed semantic digest, and regression tests.
Remaining configuration changes, installation, remote trials, ruleset changes, and publication retain their separate approval boundaries.

Risk class: R2.
Decision owner: repository owner, through this chat.
Reasoning: concurrency, cross-workflow verification, required-check enforcement, and release-policy boundaries can silently suppress necessary evidence.
Potential blast radius: PR contributors, main-branch qualification, and downstream release qualification.
Reversibility: targeted forward edits; retain the existing required check throughout migration.
Principal unknowns: remote cancellation, pending-run survival, fork behavior, new aggregate enforcement, and measured savings.
Required artifacts: accepted plan, this evidence record, regression tests, and exact-candidate HISEW receipts.
Required specialist lenses: workflow enforcement and artifact/source integrity, with independent review at the final candidate.
Required verification: focused consumer tests during implementation, full relevant local verification and remote acceptance trials at the authorized stages.
Required human approvals: exact configuration deltas and distinct external/install effects.
Maximum sensible autonomy: approved local changes and read-only baseline collection.
Next lifecycle step: finish the approved concurrency slice, then obtain approval for the next exact configuration batch.

HISEW requirement snapshot: `a30d24d0-9ca7-4e3f-923c-e1084dc11608`.
HISEW execution: `4aa3eee1-2336-4cdf-b685-2c4865458b52`, generation 1, R2, required profile `full`.
The current generation-7 profiles run `npm run test:unit` (focused), `npm run test:consumer` (affected), and `npm run check:qualification` (full).
The full command includes Jest, Python tests, lint, Node/Python formatting, and the input-preserving website build.
Additional explicit plan checks and remote acceptance trials remain necessary.
The current `build` script is `vite build` with no root prebuild/postbuild script.

## Refreshed baseline observations

Read-only GitHub inspection on September 29 confirmed ruleset `22485773` requires only `OWL Differential Analysis`, bound to integration `15368`.
Strict required checks are false; enforcement on branch creation is enabled (`do_not_enforce_on_create: false`).
No merge-queue rule was returned.
Code-owner review is not enforced; zero approving reviews are required.
Legacy branch protection returned HTTP 404, `Branch not protected`; this does not remove ruleset protection.
The fork contributor approval setting is `first_time_contributors`; actual fork token capabilities remain unverified.

Before this slice, development checks had no concurrency block.
Ontology and distribution used shared ref-based groups with unconditional cancellation.
CodeQL cancelled running PRs only, but shared non-PR groups could replace pending runs.
The implementation reuses native Actions concurrency and introduces no dependency.
The [GitHub concurrency reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency), refreshed during implementation, confirms that disabling running cancellation alone does not preserve pending runs in a shared group.

The release input manifest retains five targets: Linux x64/ARM64, macOS x64/ARM64, and Windows x64.
Development has three `windows-latest` matrices; ontology uses `windows-2025`.
No runner labels, check selection, check names, permissions, or platform coverage changed in this slice.

The [documentation development run 36621554905](https://github.com/Hadden-Industries/universal-ontology/actions/runs/36621554905), on reported head `01983e5acef1912addf4b108acc33a7ad33075d1`, succeeded.
Its selection job ran from 19:46:02 to 19:46:19 UTC (17 seconds), and documentation from 19:46:22 to 19:46:42 UTC (20 seconds).
The run was created at 19:45:58 UTC; elapsed time through those jobs was 44 seconds, with 37 summed job-seconds.
The three-second inter-job interval is not proof of pure queue delay.
This single sample is provisional; runner-image identity, cache state, exact tested merge SHA, other workload categories, and billing were not measured.
No improvement claim or p95 estimate is justified yet.

## Initial ownership inventory

| Current owner                                  | Coverage                                                                                                  | Overlap to resolve in the approved ownership migration                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Development `python-tests`, each selected OS   | All `tests/test_*.py` via parallel unittest discovery                                                     | Validation/setup modules also run in development `checks`; policy modules run in ontology jobs                   |
| Development `checks`, Linux and Windows        | Real setup, ontology runner, `test_set_up_*.py`, five tooling Jest suites                                 | Distinguish real bootstrap proof from repeated unit suites                                                       |
| Development `style-tooling`, Linux and Windows | Python style, prose regressions, documentation-tool tests                                                 | Documentation-tool tests also occur in distribution `test:node`                                                  |
| Ontology `validate-ontologies`                 | Differential validation and `test_validate_ontologies.py`                                                 | Validator unit suite also runs in Python and bootstrap jobs                                                      |
| Ontology `policy-qa`                           | Generated policy freshness, `test_*polic*.py`, entity/publication contracts                               | Publication and policy modules overlap the broad Python suite; generated freshness remains a distinct obligation |
| Ontology `qualify`, Linux and Windows          | Active-set pySHACL qualification and Jena parity                                                          | Preserve this runtime-specific qualification independently of unit coverage                                      |
| Distribution `validate`                        | `test:node`, Node lint/format, selected MCP documentation contracts, website and MCP builds               | Broad Jest discovery repeats tooling suites; package documentation may overlap selected product tests            |
| Distribution archive/container/assembly        | Five native archives, extraction and CLI smoke, MCP container exchange, package/SBOM/release verification | Archive helper builds the application; package `prepack` builds again                                            |

The archive builder calls `buildUniversalOntologyMcpApplicationBundle`; MCP `prepack` is `npm run build`.
Removing explicit build steps alone cannot prove bundle-build deduplication.
The final discovered-suite ownership assertion and full per-category measurement remain incomplete.

## Approved concurrency slice

Requirements: R1 and R9; preserve R6 and R10.
Route: configuration policy verification, with pre-change regression failures and real verifier mutation checks.
All four workflows use their distinct prefixes followed by event name and PR number, falling back to run ID plus attempt for non-PR events.
Only `pull_request` permits cancellation of running work.
No job-level concurrency may silently reintroduce a shared group.

The distribution semantic digest changed from `74583eb7205d06800c6d964b2d649497568317430596d6a647092c05ce70d4df` to `48933331f434477913909e29b1329de9119e4f44d07e3c35c0cdaa5c35e8b178` after inspecting the complete workflow diff.
That diff changes only concurrency and explanatory comments.
The verifier's independent assertion now requires the approved exact expressions; other graph and capability assertions remain intact.
New negative cases cover unconditional cancellation, a shared ref-based group, and a group missing rerun-attempt identity.

### Verification chronology

1. Before workflow edits, the development/distribution workflow suites produced five expected concurrency assertion failures and 23 passes.
2. After implementation, the four-suite focused command produced 196 passes and 58 setup failures across four suites (three passed, one failed).
   Every release-verifier case was blocked by its existing `beforeAll` SBOM call: installed `html-validate@11.16.0` does not satisfy `^11.16.1`.
   The unchanged lockfile requires `11.16.1`; this is an installed-environment mismatch, not a passing mutation test or a release-policy failure.
   Retained npm diagnostic: `C:/Users/maksy/AppData/Local/Temp/codex-npm-cache/_logs/2026-09-29T19_59_14_372Z-debug-0.log`.
3. Targeted lint found a new `prefer-template` violation in the regression expectation; it was corrected without changing the expected Actions expression.
4. The new concurrency-policy tests were separated from the full release fixture because their real policy boundary requires no npm SBOM.
   The focused name-filtered run passed all four cases (one valid policy, three rejected mutations); 55 unrelated artifact cases were excluded by the filter, not verified.
   The unchanged full-suite setup failure above remains unresolved.
5. After the test edit, both workflow suites passed all 28 tests; targeted ESLint, Prettier checks, and `git diff --check` passed.
   The earlier selector suite passed 168 tests; subsequent edits did not affect selector inputs or code.
6. HISEW focused run `6f2abe42-dfa6-4756-89a4-1485d670462a` passed 295 tests with one skip across 15 suites.
   It ran the registered `test:unit` command and is not evidence for release-verifier or remote Actions behavior.
   This record was subsequently updated to retain the result; the receipt is historical for its captured workspace fingerprint, not final-candidate acceptance.

Focused command:

```sh
npm test -- --runInBand --runTestsByPath tests/development-workflow.test.js tests/pr-check-scopes.test.js tests/distribution/universal-ontology-mcp-distribution-workflow.test.js tests/distribution/universal-ontology-mcp-release-verifier.test.js
```

Remote cancellation and pending-run retention have not been exercised.
Neither `actionlint` nor `zizmor` was available on PATH; workflow static analysis remains a proof gap.
No configuration was changed to bypass a check and no remote run was dispatched.
After explicit user approval, `npm ci --include=dev --ignore-scripts --no-audit --no-fund` installed 530 packages from the unchanged lockfile, correcting the stale installed dependency.
The manifest and lockfile have no diff.
The installation reported the existing locked `glob@10.5.0` deprecation warning; no dependency upgrade was attempted.
Large review, final verification, commit, push, and ruleset transition remain pending.

## Approved second batch: timeouts and runner labels

The user separately approved this exact batch together with the locked dependency refresh.
The following `timeout-minutes` values are now applied to the existing job IDs:

| Workflow under `.github/workflows/`              | Exact job settings                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `development-checks.yml`                         | `scope: 5`, `documentation: 10`, `python-style: 10`, `python-tests: 30`, `agent-skills-lock: 5`, `style-tooling: 30`, `checks: 30` |
| `ontology-validation.yml`                        | `validate-ontologies: 20`, `policy-qa: 30`, `qualify: 45`                                                                          |
| `verify-universal-ontology-mcp-distribution.yml` | `scope: 5`, `validate: 30`, `archive: 30`, `container: 30`, `assemble: 20`                                                         |
| `codeql.yml`                                     | `scope: 5`; retain existing `analyze: 20`                                                                                          |

Replace `windows-latest` with `windows-2025` in development's `python-tests`, `style-tooling`, and `checks` matrices.
Retain each Ubuntu entry and all native archive targets.
Update the matching distribution policy assertions/digest and workflow regression expectations together.
The impact is to stop stalled jobs at the stated ceilings and pin the Windows image generation already used by ontology/native qualification.
These are initial conservative ceilings, not measured performance acceptance thresholds; slow valid jobs must be diagnosed rather than silently increasing them.
The proposal does not change cache settings, shells, provisioning, dependencies, selection, triggers, or remote rules.

The pre-change regression run produced seven expected failures (four workflow timeout maps and three Windows matrix expectations), with nine passes.
The distribution verifier now independently asserts all five timeout values and rejects missing/increased timeouts through mutation fixtures.
The reviewed distribution semantic digest is now `942a81c2b7d229f892f5018fe0eda41502054da89785d6622f2d25a403d1dcd9`.
After the dependency refresh and timeout/runner edits, the four-suite focused command passed all 261 tests in 88.427 seconds, including the complete release-verifier suite and the new timeout mutation cases.
Targeted ESLint, Prettier, and `git diff --check` passed.
This resolves the installed-dependency blocker while retaining the initial failed run above.
The earlier HISEW receipt remains historical because both dependencies and tracked workflow inputs changed.
The governed full run and large reviews remain deferred to the final candidate; no final acceptance or remote-run claim is made.

## Next exact proposal: complete Task 2 provisioning and cache controls

The user subsequently approved all configuration-file changes already specified in the implementation plan.
The settings and helper below are now implemented as part of that approved scope.
It uses the current pinned actions; no action revision or dependency lock changes.

### Cache settings

Add workflow-level `cache-mode: read` to `development-checks.yml`, `ontology-validation.yml`, and `codeql.yml`.
Add workflow-level `cache-mode: none` to `verify-universal-ontology-mcp-distribution.yml`.
Set job-level `cache-mode: none` on development's `scope`, `python-style`, and `agent-skills-lock`; ontology's `validate-ontologies`; and CodeQL's `scope`.
Other development, ontology, and CodeQL jobs inherit read-only cache access for every currently supported event in this first implementation.
Do not introduce a cache-warming workflow before measurements justify it.

Set `with.package-manager-cache: false` on every setup-node step in the distribution workflow and on the setup-node steps in development `scope`, `documentation`, and `python-style`, ontology `validate-ontologies`, and CodeQL `scope`.
Remove `cache` and `cache-dependency-path` from ontology `validate-ontologies` setup-python, matching its no-cache scope/validation job policy.
Add `with.cache: pip` and `with.cache-dependency-path: requirements.lock.txt` to setup-python in development `documentation`, `python-tests`, `style-tooling`, and `checks`.
Retain fresh virtual environments and hash-verified installations.
No cache stores `node_modules`, `.venv`, generated bundles, or release candidates.

GitHub documents `cache-mode` as a workflow/job key, enforced by scoped cache tokens, not a setup-action input.
The pinned setup-node action exposes `package-manager-cache`; the pinned setup-python action exposes pip caching and the dependency path.
These exact interfaces were rechecked during this implementation: [cache access](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#controlling-cache-access-with-cache-mode), [setup-node inputs](https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/action.yml), [setup-python inputs](https://github.com/actions/setup-python/blob/5fda3b95a4ea91299a34e894583c3862153e4b97/action.yml).
The effect is to disable implicit cache traffic in selectors/candidates and restrict remaining cache consumers to reads.
Cache warming and cold/warm timing remain measured rollout decisions, not claimed savings.

### Explicit shells

Add workflow-level `defaults.run.shell: bash` in each of the four workflows.
In development's `python-tests`, `style-tooling`, and `checks` jobs, add `defaults.run.shell: ${{ matrix.os == 'windows-2025' && 'pwsh' || 'bash' }}` to retain native Windows PowerShell coverage.
Retain every existing explicit step shell, including the Windows archive PowerShell smoke test.
This enables explicit bash fail-fast/pipefail behavior on portable steps without replacing the native Windows test lane.

### Minimal Python style provisioning

Add `scripts/preparePythonStyleTools.js` and `tests/python-style-tools.test.js`.
The helper accepts `--output`, reads the existing `requirements.lock.txt`, requires exactly one hash-locked Ruff entry, rejects incomplete/ambiguous input and pre-existing output, and writes a Ruff-only requirements file.
The installer uses pip's native hash verification with `--no-deps`; the qualification checks require Ruff to declare no runtime dependencies.
No new library is introduced, and repository Python executes only through `.venv`.

In development `python-style`, replace the global npm-selection and full-development-setup steps with a bash step running:

```sh
node scripts/preparePythonStyleTools.js --output "$RUNNER_TEMP/python-style-tools"
python -m venv .venv
.venv/bin/python -m pip install --require-hashes --only-binary=:all: --no-deps -r "$RUNNER_TEMP/python-style-tools/requirements.txt"
.venv/bin/python -m pip check
```

Retain the existing `npm run lint:python && npm run format:python:check` check.
Retain full `npm run set-up:development` in bootstrap and other development consumers.
Add both new file paths to `style_tooling` in `scripts/selectPullRequestChecks.js`, ensuring changes to the installer trigger Linux/Windows toolchain qualification rather than a silent skip.
Include `tests/python-style-tools.test.js` in the existing style-tooling job's focused minimal-installer test command, alongside `tests/documentation-tools.test.js`.
The effect is to avoid installing the application and unrelated Python packages for ordinary Python style checks while retaining installer regression coverage.

Update workflow/selector tests and the matching explicit assertions and reviewed digest in `scripts/distribution/verifyUniversalOntologyMcpRelease.js` with these changes.
Add comments naming official action release tags only where their existing SHA-to-tag identity has been verified.
No permissions, triggers, native coverage, required checks, remote settings, package scripts, or lockfile changes are included.

## Shadow orchestration implementation

The plan's global default-deny rule is now applied to restructured workflows: workflow permissions are empty, and executable jobs explicitly grant repository read access.
This changes permission placement without granting a new capability.
The original workflows and required context remain present; new PR and full-qualification entry points call three temporary workflow-call-only consumers.
The weekly full run is Wednesday at 04:17 UTC and has no concurrency group.
Main-trigger transfer is deliberately held for Task 7's remote enforcement proof.

The core plan has schema version 1, strict draft-2020-12 validation, exact source/base SHAs, complete Boolean scopes, and five allowlisted consumer IDs.
Ajv's emitted equality helper is bundled with the existing esbuild dependency; the checked-in ESM validator has no runtime npm dependency.
The generator records three targeted lint dispositions for Ajv-emitted signature fields, redeclarations, and temporary assignments; handwritten code retains the normal lint rules.
Schema freshness and clean-directory loading are tested.
Ordinary selection uses full Git comparisons with NUL-delimited paths and no rename inference; unknown inputs widen selection.
Legacy callers retain their existing ontology YAML comparison, while core orchestration changes conservatively select all consumers without loading YAML during selection.

The evaluator rejects invalid plans, inconsistent selected consumers, missing/extra results, failure, cancellation, selected skips, stale revisions, and absent completion outputs.
Consumer completion recomputes internal expectations from the validated plan; callers cannot supply a smaller expected-job list.
The distribution completion depends on candidate assembly, whose existing verifier requires the complete five-target artifact set.
All selected native targets and existing archive/container smoke tests are retained.
Application and release scopes initially retain identical native coverage, as required before a measured and approved reduction.

The reviewed ten-file manifest covers both entry points, all three consumers, selector, evaluator, schema, validator, and generator.
Policy fixtures mutate each covered file independently and require rejection.
The release verifier also rejects unreviewed call targets, inherited/passed secrets, softened required steps, overbroad permissions, and consumer concurrency.
This remains PR-controlled policy, not a trusted defense against deliberate edits to the verifier and its digest together.

In the shadow graph, ordinary Jest suites are removed from repeated tooling owners by explicit selection at the Node job.
A discovery-based assertion executes the actual workflow's Jest selection in listing mode and compares its union with native Jest discovery, requiring exactly one Linux owner per discovered suite.
Windows bootstrap/prose qualification remains separate.
Selected full Python unit runs suppress repeated direct validation/setup/policy unit calls, while generated freshness and real Jena qualification remain.
Shadow-versus-legacy duplication persists intentionally until the required-check transition.

### Additional verification

- Five focused suites passed 220 tests after the first shared-plan implementation and fixture updates.
- CLI/schema/Ruff suites passed 44 tests, including stale/missing output, malformed input, cancellation, and selected internal-skip rejection.
- Workflow, release-policy, and selector suites passed 264 tests, including independent mutations of every covered policy file.
- The discovered Jest ownership assertion passed independently.
- Repository `.venv` metadata reports Ruff 0.16.9 with no runtime requirements; clean CI provisioning itself has not run remotely.
- Official GitHub tag references were read back for checkout v7.0.1, setup-node v7, setup-python v7.0.0, upload-artifact v7.0.1, and download-artifact v8.0.1; their returned commits match the retained pins.

These are local results, not remote permission, cancellation, native-runner, or enforcement proof.
No percentage or latency saving is claimed.

## Deferred rollout and remaining evidence

Task 6 retains standalone application builds: measured transfer cost and same-run benefit are unavailable, so introducing a shared artifact boundary is not justified yet.
No matrix reduction, prebuilt-bundle shortcut, or privileged artifact consumption was introduced.
Task 7 is blocked on separately authorized publication/trial PRs and the two exact remote ruleset decisions.
Before migration, collect real successful and intentionally failing PR runs, internal-skip and missing-target cases, supersession and non-PR burst behavior, fork behavior, and comparable timing cohorts.
The ruleset addition, strict-update/merge-queue choice, removal of the old context, and final trigger transfer must follow that evidence in the plan's order.
Neither configuration-file approval nor local tests authorize changing repository settings or triggering remote trial runs.

The user authorized final independent reviews and a signed local commit after the shadow candidate was implemented.
The ordinary Review Agent found two issues: direct Jest invocation omitted the npm environment required by integration tests, and local Actions changes could select no core checks.
Both were reproduced by three failing regression cases and repaired: entry points now invoke `npm test`, and `.github/actions/` selects every core consumer.
The reviewer inspected the corrections and reported both findings resolved with no additional findings.
Only the two entry-point policy hashes and selector hash were refreshed for these reviewed corrections.

HISEW full run `384aad87-61ca-4ad9-a64b-86ab9210b7af` passed before the review corrections: 70 Jest suites (1,023 passed, one skipped), 206 Python tests (five skipped), lint, formatting, and the production build.
That run belongs to its original candidate; it does not verify the subsequent repairs or staging change.
Fresh final verification and reviewer output are retained in HISEW's native evidence store rather than being appended after the candidate is frozen.
Cross-vendor verification first attempted Claude Code 2.1.281 in an isolated copy; it returned an expired OAuth session and executed no verification.
The installed Antigravity verifier is the bounded recovery route, with its actual output and any execution limitations retained separately.
No successful cross-vendor result or hosted acceptance is implied by provider discovery.

## Production cutover, September 30

The user authorized production cutover without shims, chose strict up-to-date PRs, and authorized continued delivery through normal merge.
The preceding shadow and deferred-rollout sections describe historical states.

Successful PR runs `36643160548` and `36645784567` established the aggregate before enforcement.
Disposable [PR 109](https://github.com/Hadden-Industries/universal-ontology/pull/109) then exercised two real pull-request failures and was closed without merging:

- Run `36649254916`, head `82d553a82d1ceb136924615142fdaff782c20e4d`, failed its deliberately added product test and `PR validation` while the old `OWL Differential Analysis` check passed.
  After adding the aggregate to ruleset `22485773`, GitHub reported the PR as `BLOCKED`.
- Run `36649966639`, head `69e9ddf4b4776ef210c3c833b3366ea14d80b422`, tested merge revision `8e2002b0ce97f2101c80a149670f15d3f7fa3202`.
  The development wrapper returned `success` with an empty `verified-revision` after deliberately skipping documentation and completion.
  The aggregate rejected `development: absent or stale completion proof`.
  Four native archives and the container passed; candidate assembly failed when SPDX generation could not open the deliberately omitted Linux ARM64 archive, and distribution completion and the aggregate failed.
  GitHub again reported `BLOCKED`.

The ruleset was updated in two stages: first both required contexts with strict updates, then only `PR validation`, bound to GitHub Actions integration `15368`.
Effective main-branch rules were read back after each stage.
No bypass actor, merge method, or unrelated rule changed.
Raw run/job logs, failing PR readbacks, and both exact ruleset requests are retained in the task's external evidence directory `pr-ci-final-review-20260929`.
The disposable commits remain outside main; worktree archival was refused because the app reports a pinned task or workspace, so the protected worktree was preserved.

After final ruleset readback, the original development, ontology, and distribution filenames were converted to `workflow_call`-only consumers.
Parsed consumer bodies match their proven shadow equivalents exactly except display names.
The temporary consumer files, duplicate legacy triggers, and obsolete ontology YAML comparison path were removed.
The PR entry point keeps the stable required job name; full qualification owns main pushes, manual dispatch, and the weekly schedule, selecting all scopes without a concurrency group.
Temporary browser diagnostic logging was removed.
The release-policy manifest and six-job distribution assertions were coordinated with the final call graph, retaining all five native targets and artifact integrity checks.

CodeQL remains separate and is not required by this ruleset; its fork limitation is unchanged.
Standalone application builds remain in place because bundle-transfer savings have not been established.
Live trials prove enforcement and the two failure paths above, not every rollout scenario.
Five-run timing cohorts, fork execution, cancellation/burst trials, billing, and cache-hit comparisons remain unmeasured; no numerical performance saving is claimed.
Final candidate review, local verification, and post-merge hosted results belong in the native evidence store after this document is frozen.
