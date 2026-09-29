# GitHub Actions PR Optimization Implementation Plan

> This document authorizes neither implementation nor configuration changes, delegation, commits, pushes, workflow dispatches, or repository-setting changes.

**Goal:** Reduce redundant PR verification while preserving explicit coverage, making selected checks enforceable, and measuring improvements against a recorded baseline.

**Architecture:** One PR orchestration workflow computes a conservative execution plan, invokes consumer jobs with distinct responsibilities, and reports one stable aggregate result.
Product checks and distribution qualification have separate selection contracts.
Scheduled and main-branch qualification cover the full supported environment, while rollout initially preserves every existing platform check.

**Tech Stack:** GitHub Actions, existing pinned actions, Node.js/JavaScript, Jest, repository Python `.venv`, unittest, Ruff, Prettier/Snapper, pySHACL, Apache Jena, native archive tooling, and Docker.
No new external service or dependency is required by this plan.

**Spec:** The recommendations accepted for planning in the September 29, 2026 conversation are captured in the requirements and decision tables below.
The subsequent September 29 review incorporates current GitHub documentation, the repository's pinned action implementations, and the local release-verification contracts.
Read this plan together with `AGENTS.md`, `docs/development.md`, the four existing workflows, and `scripts/selectPullRequestChecks.js`.

## Global constraints

- Configuration changes require explicit approval of the exact file and setting, including their behavioral and pipeline impact, before editing.
- Reviewing and revising this plan is the only action authorized by the current request.
- Preserve existing working-tree changes and current checkout contents.
- Installation, local verification, remote runs, security scans, GitHub writes, commits, and pushing are distinct actions.
- Commits require explicit authorization and the committing-to-git skill; pushing requires separate authorization.
- Execute local Python only through the existing `.venv`, normally via `node scripts/runRepositoryPython.js`.
- Use documented `npm run ...` verification entry points and inspect lifecycle effects first.
- Use `npm run build:verify` for input-preserving website verification after confirming its definition.
- Preserve pinned action revisions, locked dependencies, hash verification, minimal permissions, and `persist-credentials: false`.
- Every new or restructured workflow declares `permissions: {}` at workflow level and grants permissions per job; no workflow passes `secrets: inherit` or any secret to a consumer.
- Never cancel non-PR runs through concurrency; only superseded PR revisions may be cancelled.
- PR-produced artifacts and caches are untrusted; never consume them in `workflow_run` or any privileged context.
- Preserve the existing publication receipt and exact-source qualification semantics.
- Do not publish a package, container, website, release, or registry entry as part of CI optimization.
- Never execute PR-controlled code through a privileged `pull_request_target` workaround.
- Retain truthful failures, skipped checks, and qualification gaps.
- No percentage saving is promised before comparable runs exist.

## 1. Baseline and evidence boundary

The September 29 audit inspected a clean checkout at `9c4cf12261a7afce3ae251eaf0bd1dcef0263a3e`, matching remote `main` at that time.
Recheck this state before implementation; these are historical observations, not permanent repository facts.
The plan review inspected local `a22744b8a720924862f622ac5290ad2f2acf34f0`; the four workflows, selector, root package manifest, and development guide had no diff from that audit revision.
The plan was already untracked and was preserved in place.
Remote rulesets, billing, and run measurements were not refreshed during this document review.

| Component                                        | Observed behavior                                                                               | Consequence                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `development-checks.yml`                         | Separate docs, Python style, Python tests, skills-lock, style-tooling, and development matrices | Useful filtering already exists, but several suites and setups overlap                    |
| `ontology-validation.yml`                        | Differential validation selects policy QA and Linux/Windows active-set qualification            | Preserve ontology semantics and Jena parity; do not equate these with ordinary unit tests |
| `verify-universal-ontology-mcp-distribution.yml` | Source validation, five native archives, container verification, candidate assembly             | Broad artifact inputs can select complete qualification on PRs                            |
| `codeql.yml`                                     | Changed-language selection, main pushes, weekly schedule, same-repository PR restriction        | Keep language selection; fork coverage needs an explicit decision                         |
| `selectPullRequestChecks.js`                     | Shared path scopes and ontology-workflow structural comparison                                  | Retain conservative dependency coverage while simplifying orchestration                   |
| Concurrency                                      | Ontology, distribution, and CodeQL already define groups; development checks define none        | R1 is mainly a development-checks gap; do not credit existing cancellation as a saving    |
| Main-branch cancellation                         | Ontology and distribution use `cancel-in-progress: true` keyed on `github.ref`, including main  | A later main push cancels the previous commit's qualification, contradicting R9           |
| Runner labels                                    | Development matrices use `windows-latest`; ontology qualification uses `windows-2025`           | Floating labels drift without a repository change and weaken baseline comparability       |
| Shell defaults                                   | Only some cross-OS steps set `shell:` explicitly                                                | Implicit bash runs without `pipefail`; Windows defaults to `pwsh`                         |
| Live `main` ruleset                              | Requires only `OWL Differential Analysis`                                                       | Downstream qualification and other workflows are not enforced by that status              |
| Legacy branch protection                         | API returned `Branch not protected`                                                             | The observed protection is ruleset-based; recheck both mechanisms                         |
| Repository visibility                            | Public                                                                                          | Standard hosted runners are free; waiting time and runner capacity are the real costs     |

Historical September 17 distribution run `35174448748` consumed 661 summed job-seconds, approximately 11 job-minutes.
Its source validation took 183 seconds, Windows archive 145 seconds, and selection six seconds.
The product/static step took 119 seconds and website build 43 seconds.
These timings precede the current revision and are neither a current benchmark nor billed-minute totals.
Run: <https://github.com/Hadden-Industries/universal-ontology/actions/runs/35174448748>.

The current distribution graph has at least eight explicit application-bundle build paths: once during validation, once in each of five archive jobs, once for the container, and once during assembly.
This is a duplication finding, not proof that artifact transfer will be faster.
The archive implementation calls `buildUniversalOntologyMcpApplicationBundle`; confirm its exact call conditions before changing the contract.
Include builds invoked by tests and the MCP package's `prepack` lifecycle in the measured inventory; removing an explicit build does not necessarily remove its replacement's implicit build.

`setup-node` already enables npm caching through the root `packageManager` field.
Do not claim that adding an explicit npm cache fixes an absent cache.
Ontology jobs already cache pip downloads and Jena.

Some SHA-pinned `uses:` lines in `codeql.yml` and the distribution `scope` job lack a trailing `# vX.Y.Z` comment.
`.github/dependabot.yml` sets `cooldown: default-days: 0` for all ecosystems; changing it is a separate configuration decision outside this plan.

The distribution workflow is also verified as executable policy by `scripts/distribution/verifyUniversalOntologyMcpRelease.js`.
Its reviewed semantic digest and exact trigger, concurrency, permission, action, artifact, and job-graph assertions reject semantic YAML edits, including Task 2's lifecycle changes.
Tasks 2, 4, 5, and 6 therefore require the coordinated verifier migration in section 4.1; workflow tests alone are insufficient.

## 2. Required outcomes

| ID  | Requirement                                                | Acceptance evidence                                                                                                                                               |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Cancel superseded PR verification only                     | Two authorized updates to a trial PR cancel the older run without cancelling unrelated PRs; no main, scheduled, or manual run is cancelled by concurrency         |
| R2  | Give each suite one primary owner per required environment | Suite inventory shows no accidental same-environment duplication and no dropped tests                                                                             |
| R3  | Provision only required tools                              | Python style avoids complete development bootstrap; bootstrap qualification still tests real setup                                                                |
| R4  | Compute one core PR execution plan                         | Core consumers use one versioned plan; selection failures block the aggregate; standalone CodeQL selection remains explicitly separate initially                  |
| R5  | Enforce every selected check                               | Aggregate fails for failure, cancellation, missing result, or unexpected skip                                                                                     |
| R6  | Preserve native coverage initially                         | Five archive targets and current Linux/Windows checks remain selected during migration                                                                            |
| R7  | Separate application and release qualification             | Explicit scope contracts distinguish ordinary application inputs from packaging/runtime inputs                                                                    |
| R8  | Reuse a platform-independent bundle if proven beneficial   | Bundle identity tests pass and measured transfer costs justify reuse                                                                                              |
| R9  | Maintain full qualification outside ordinary PR work       | Relevant main changes, periodic runs, and pre-release qualification retain full coverage; main runs are never cancelled by a later push                           |
| R10 | Preserve security and source identity                      | Read-only PR execution, pinned inputs, explicit per-job permissions, no inherited secrets, untrusted-cache boundaries, and exact-revision artifacts remain intact |
| R11 | Update contributor documentation                           | `docs/development.md` describes commands, selection, gates, and deferred coverage accurately                                                                      |
| R12 | Demonstrate improvement                                    | Comparable measurements show saved work without unexplained coverage loss                                                                                         |

## 3. Proposed execution policy

### 3.1 PR selection

All mixed changes select the union of applicable checks.
Use the tested merge revision for both selection and execution, as the existing selector does; never silently substitute the PR head.
For PRs, compare the event's exact base commit with `GITHUB_SHA` and verify every checkout matches the plan revision.
Preserve `--no-renames` for dependency selection so both a removed source path and an added destination can select consumers; omit deletions only from checks that need surviving document contents.
New or unclassified executable/configuration inputs select a conservative superset or fail selection with a diagnostic; an empty selection requires an explicit known-safe classification.
Test large change sets and unusual filenames using Git's NUL-delimited output; do not replace complete Git comparison with a truncated workflow path filter or an unpaginated changed-files API.

| Input category                                         | Required PR work                                                                  | Optional later optimization                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Ordinary authored Markdown                             | Minimal Linux documentation tools and content check                               | None needed                                                                       |
| MCP documentation                                      | Documentation formatting plus MCP documentation contracts                         | Avoid formatting all unrelated authored docs                                      |
| Website source/build tooling                           | Node checks, affected product tests, website build                                | Separate website work from the archive critical path                              |
| Ontology sources/policy                                | Differential diagnostics, policy contracts, active-set qualification, Jena parity | No ontology/platform reduction in this plan's initial rollout                     |
| Python implementation                                  | Linux style and selected Python suites                                            | Narrow Windows execution only after platform-sensitive coverage is inventoried    |
| Bootstrap/development tooling                          | Linux/Windows bootstrap and tooling regression                                    | Combine repeated setup on the same runner where isolation is not part of the test |
| MCP application/shared query code                      | Product tests, package integrity, container smoke, native checks                  | Linux x64 and Windows x64 representative archives only after approval             |
| Packaging/runtime/native dependencies/release metadata | Full five-target archive matrix, container smoke, SBOM, candidate verification    | None until supported-platform qualification policy changes                        |
| Root lockfile/package manifest                         | Conservative affected-consumer coverage                                           | Dependency-aware lock analysis is deferred, not assumed safe                      |
| Selector/orchestration/shared execution inputs         | Full relevant contract coverage                                                   | No silent skip on unrecognized orchestration changes                              |

Keep all five native targets for the first deployment of the new graph.
The proposed later representative pair covers Unix tar and Windows zip execution, but does not establish macOS or ARM correctness.
Before reducing it, explicitly accept that failures specific to omitted platforms can be detected after merge.
All native/runtime/package-assembly changes must still get full PR coverage.

### 3.2 Events and concurrency

- PR orchestration: `pull_request` with `opened`, `synchronize`, and `reopened`; no workflow-level path exclusions.
- Main qualification: retain existing applicable main checks; add missing complete qualification through the reusable consumers rather than invoking PR-only code with a fabricated event.
- Scheduled qualification: weekly full suite initially, with a deterministic repository-specific minute and documented owner.
  Schedules run only against the default branch, and GitHub disables scheduled workflows in public repositories after 60 days without repository activity.
  Document the failure-notification route, the owner, and the re-enable procedure.
  GitHub can delay or drop scheduled work; the owner must inspect the last successful full run before relying on it, and pre-release qualification must cover the exact release revision.
- Manual qualification: preserve `workflow_dispatch` for authorized full runs.
- Merge queue: add `merge_group: checks_requested` only if a merge queue is enabled and the selector explicitly supports that event.
  Once a queue exists, every required check, including `OWL Differential Analysis` while it remains required, must report on `merge_group` or queued merges stall.
  Initially select full functional qualification for the synthetic merge-group SHA; do not reuse one constituent PR's selection or assume `github.event.pull_request` exists.
- Draft PRs: preserve current execution behavior initially; do not introduce a label-controlled bypass.

For an entry point that supports PRs, use a workflow/event-specific group and cancel superseded PR revisions:

```yaml
concurrency:
  group: pr-validation-${{ github.event_name }}-${{ github.event.pull_request.number || format('{0}-{1}', github.run_id, github.run_attempt) }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Use a distinct prefix for each workflow.
The proposed policy is to retain every selected non-PR run, including pending runs: omit concurrency from the non-PR qualification entry point, or use the unique run/attempt fallback above in mixed-event entry points.
Correct both ontology and distribution cancellation and audit CodeQL's pending-run behavior.
Setting only `cancel-in-progress: false` on a shared main group is insufficient: default `queue: single` can still replace pending work.
GitHub now also supports `queue: max`, but its finite queue is unnecessary for this plan and does not guarantee every run survives a burst.
Do not introduce serialization without a measured need and a separately reviewed queue policy.
[GitHub concurrency semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency).

Only entry-point workflows own concurrency.
Inside a `workflow_call` consumer, `github.workflow` and `github.ref` resolve to the caller's context, so a consumer-level group can collide with the caller's and cancel or deadlock the run.
Remove workflow-level `concurrency` from every workflow converted into a reusable consumer.
Make those consumers `workflow_call`-only, moving their push/manual entry points to `full-qualification.yml` in the same migration after Task 7 verifies the ruleset transition.
During shadow operation, keep the old standalone workflows intact and introduce only the needed reusable consumer files; do not remove the old required job or strip its non-PR protection prematurely.
List any temporary consumer file explicitly in the approval diff and remove it when the final ownership is established.

Declare the shell explicitly for each consumer, using `defaults: run: shell: bash` for portable bash steps and `shell: pwsh` where native PowerShell behavior is the subject of qualification.
An explicit `shell: bash` runs `bash --noprofile --norc -eo pipefail {0}`; the implicit default omits `pipefail`, and Windows otherwise defaults to `pwsh`.
Use versioned runner labels (for example `ubuntu-24.04`, `windows-2025`) in every consumer instead of `-latest` aliases.
Versioned labels still receive image updates; record the runner image version and important tool versions with benchmark evidence.
[Runner image update policy](https://github.com/actions/runner-images#image-releases).

Initial explicit ceilings: selector/gate 5 minutes, docs/style 15, ordinary suites/bootstrap 30, native/container jobs 30, ontology qualification 45, complete assembly 30, and existing CodeQL analysis 20.
Validate these against baseline timings before approval; raise a ceiling with evidence if legitimate runs approach it.
Put timeout and shell settings on executable jobs inside reusable workflows; a caller job containing `uses:` does not support `timeout-minutes`, `runs-on`, `steps`, or `defaults`.

### 3.3 Security analysis

Retain CodeQL language selection and weekly all-language analysis.
Initially keep CodeQL as a separate security workflow and leave its current enforcement unchanged while the core aggregate gate is introduced.
If CodeQL must become part of `PR validation`, convert its PR consumer to a reusable workflow and remove the duplicate standalone PR trigger in the same approved change.
Keep main/scheduled entry points and explicit `security-events: write` only where required.
Test same-repository, fork, and Dependabot token behavior before changing the current fork restriction.
Prefer the ordinary `pull_request` route when removing that restriction: GitHub supports code-scanning result upload on this event even for Dependabot's restricted token.
Do not infer that a read-only fork token makes CodeQL impossible, and do not enable repository write tokens or secrets for forks.
[GitHub's CodeQL token guidance](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/resource-not-accessible).
Never treat a fork exclusion as a passed scan.
If fork analysis remains unavailable, document the coverage gap rather than pretending the aggregate includes it.
CodeQL's `paths-ignore` filters are acceptable while it is not required; a path-filtered workflow never reports, so removing those filters is a prerequisite for making CodeQL part of any required gate.
Successful analysis/upload does not establish the absence of blocking alerts.
If security findings must block merges, select an explicit native code-scanning ruleset policy and severity threshold, or a separately verified verdict check; do not represent a successful analysis job as that verdict.
[Code-scanning rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-code-scanning-results).

### 3.4 Supply-chain and trust boundaries

- Caches: use `cache-mode: none` for selectors, the aggregate, and distribution candidate/pre-release jobs; disable setup-node's automatic npm cache there with `package-manager-cache: false` as well.
  This removes implicit cache restoration already enabled by the root `packageManager`, rather than merely avoiding new cache steps.
  Use `cache-mode: read` for other PR consumers, with separately scoped trusted main runs warming dependency-download caches where measured useful.
  Apply compatible limits on both calling and called jobs; `permissions: {}` does not control cache access.
  Existing hash-verified Jena and pip download caches remain eligible in ontology consumers, with fresh environments and validation after restore.
  Do not cache installed `node_modules`, `.venv`, credentials, or qualification receipts.
  PR caches have merge-ref scope; preserve GitHub's trust boundaries and never promote PR artifacts into privileged execution.
  [GitHub cache access controls](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#controlling-cache-access-with-cache-mode).
- Artifacts: name artifacts by run ID and attempt and download them by artifact ID.
  The pinned `download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` defaults `digest-mismatch` to `error`; preserve or explicitly assert that setting and keep repository manifest verification.
  A partially missing requested ID list only warns in this implementation, so require the exact expected artifact/target set independently.
  [Pinned action inputs](https://github.com/actions/download-artifact/blob/3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c/action.yml), [pinned download implementation](https://github.com/actions/download-artifact/blob/3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c/src/download-artifact.ts).
- Reusable workflows cannot raise permissions above the caller's grant, so contract tests must assert the caller's job-level grant as well as the consumer's declaration.
- Workflow static analysis: the plan adds substantial workflow YAML.
  `actionlint` and `zizmor` are the established controls, but both are new tools; adding them to CI is an optional, separately approved item.
  At minimum run both locally against proposed YAML and record results in the evidence document, or record their unavailability as a proof gap.
- Build provenance (`actions/attest-build-provenance`, SLSA) belongs to the release path and is an explicit non-goal of this plan; its absence is deliberate, not an oversight.
- Pinning hygiene: add the missing `# vX.Y.Z` comments to SHA-pinned actions in Task 2 so Dependabot updates remain reviewable.
- Enforcement boundary: a gate evaluated from PR-controlled policy is not a defense against deliberate edits to that policy.
  Verify whether existing CODEOWNERS entries for `.github/` and `scripts/` are actually enforced by review rules; an Actions app binding does not identify one immutable workflow.
  Record any gap, and propose stronger review or trusted required-workflow settings separately if that threat must be covered.

## 4. File and approval map

Paths below are proposed implementation scope, not approval to edit them.
New source/test names are deliberate interfaces introduced by this plan.
Do not modify package or test configuration just to simplify selection without exact approval.

| File or setting                                                                                                                                                                        | Proposed change                                                                                                                                                                  | Impact and smallest approval unit                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `.github/workflows/development-checks.yml`                                                                                                                                             | PR concurrency/timeouts, versioned Windows label, explicit bash shell first; later reusable consumer jobs, slimmer provisioning, suite ownership                                 | Approve lifecycle controls separately from job/trigger restructuring                        |
| `.github/workflows/ontology-validation.yml`                                                                                                                                            | Timeouts and PR-only cancellation; later consume shared plan while retaining validator and qualification semantics; drop workflow-level concurrency when converted to a consumer | Preserve `OWL Differential Analysis` until replacement gate is enforced                     |
| `.github/workflows/verify-universal-ontology-mcp-distribution.yml`                                                                                                                     | Timeouts and PR-only cancellation, independent website work, application/qualification scopes, optional bundle reuse, missing version comments                                   | Approve coverage-preserving restructuring before platform reductions                        |
| `.github/workflows/codeql.yml`                                                                                                                                                         | Disable unnecessary selector npm cache; preserve pending non-PR runs; missing version comments; optional reusable PR consumer and fork policy                                    | No silent expansion of permissions or loss of scans                                         |
| `.github/workflows/pr-validation.yml` (new)                                                                                                                                            | Single PR selector, reusable consumers, final aggregate                                                                                                                          | New CI configuration requiring exact approval                                               |
| `.github/workflows/pr-development-consumer.yml`, `.github/workflows/pr-ontology-consumer.yml`, `.github/workflows/pr-distribution-consumer.yml` (temporary, if needed for shadow runs) | Exercise reusable consumers while original required checks remain intact                                                                                                         | Approve exact temporary files; retire them when calls move to the converted original files  |
| `.github/workflows/full-qualification.yml` (new)                                                                                                                                       | Add scheduled/manual full runs in Task 5; take over main/manual entry points in Task 7                                                                                           | Approve triggers, cache modes, concurrency, and runner matrix explicitly                    |
| `scripts/selectPullRequestChecks.js`                                                                                                                                                   | Versioned plan and new scope contracts; explicit event support                                                                                                                   | Treat edits to check-selection policy as requiring approval under repository-policy safety  |
| `scripts/evaluatePullRequestChecks.js` (new)                                                                                                                                           | Pure aggregate-result evaluator plus CLI                                                                                                                                         | Source implementation of the approved gate contract                                         |
| `scripts/pullRequestCheckPlan.schema.json` (new)                                                                                                                                       | JSON Schema draft 2020-12 for the versioned core plan                                                                                                                            | Selection-policy contract requiring exact approval; no new dependency                       |
| `scripts/generatePullRequestCheckPlanValidator.js` and `scripts/pullRequestCheckPlanValidator.js` (new)                                                                                | Generate and check a standalone ESM validator using the locked Ajv; selectors and gates execute the generated validator without installing dependencies                          | Review generated code with schema changes; `--check` must not write                         |
| `tests/pr-check-plan-schema.test.js` (new)                                                                                                                                             | Schema dialect, complete fixtures, generated-validator freshness, and dependency-free runtime checks                                                                             | Prove the control path works without application installation                               |
| `scripts/distribution/verifyUniversalOntologyMcpRelease.js`                                                                                                                            | Reviewed semantic digest, graph assertions, and coverage of all new caller/consumer policy files                                                                                 | Repository-policy approval required with every semantic distribution workflow edit          |
| `tests/distribution/universal-ontology-mcp-release-verifier.test.js`                                                                                                                   | Accept reviewed caller/consumer graphs and reject unreviewed changes to every reachable policy file                                                                              | Preserve the verifier's independent rejection tests                                         |
| `scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js`                                                                                                                     | Optional verified prebuilt-bundle input                                                                                                                                          | Keep existing standalone build behavior unless explicitly changed                           |
| `scripts/distribution/verifyUniversalOntologyMcpBundle.js` (new, conditional)                                                                                                          | Verify transferred bundle manifest and required files                                                                                                                            | Needed only if Task 6 demonstrates reuse is worthwhile                                      |
| `package.json`                                                                                                                                                                         | Explicit suite commands only where existing commands cannot express ownership                                                                                                    | List each exact script value for approval; do not change dependency versions                |
| `tests/pr-check-scopes.test.js`                                                                                                                                                        | Selection/event regressions                                                                                                                                                      | Temporary Git histories for additions, deletions, renames, mixed inputs                     |
| `tests/development-workflow.test.js`                                                                                                                                                   | Consumer ownership and workflow contracts                                                                                                                                        | Replace brittle job-name assumptions with meaningful contract assertions                    |
| `tests/distribution/universal-ontology-mcp-distribution-workflow.test.js`                                                                                                              | Existing distribution graph assertions                                                                                                                                           | Update preserved security, target, smoke, and artifact contracts with the new orchestration |
| `tests/distribution/universal-ontology-mcp-platform-archive.test.js`                                                                                                                   | Existing native archive tests                                                                                                                                                    | Extend for the optional verified bundle input without weakening integrity assertions        |
| `tests/pr-check-results.test.js` (new)                                                                                                                                                 | Aggregate truth table                                                                                                                                                            | Failure, missing-result, skip, cancellation, schema cases                                   |
| `tests/distribution/pr-qualification-policy.test.js` (new)                                                                                                                             | Distribution selection and bundle boundary                                                                                                                                       | Verify coverage policy and exact-source input rejection                                     |
| `docs/development.md`                                                                                                                                                                  | Updated command/CI ownership and qualification descriptions                                                                                                                      | Ordinary documentation update                                                               |
| `docs/reviews/2026-09-29-pr-ci-optimization-evidence.md` (new during execution)                                                                                                        | Baseline, coverage inventory, run links, measurements, decisions                                                                                                                 | Preserve failed trials and all remaining proof gaps                                         |
| GitHub ruleset `22485773` as observed during audit                                                                                                                                     | Add `PR validation` bound to the GitHub Actions app, then remove old required context only after proving replacement                                                             | Separate remote-setting approval; re-resolve ID and current values before acting            |
| `actionlint` / `zizmor` CI job (optional, new)                                                                                                                                         | Static analysis of workflow YAML                                                                                                                                                 | New tools; separate approval, or local-only runs recorded as evidence                       |

`package-lock.json`, Python lockfiles, runtime version files, formatter configuration, and Jena checksums need no planned changes.
Any implementation discovery requiring one creates a new exact-change approval item.

### 4.1 Distribution policy migration dependency

Treat each semantic distribution YAML edit and its verifier update as one reviewable change.
First retain the existing single-workflow verification for Task 2's small lifecycle edits, updating its expected values and semantic digest only after reviewing the proposed policy.
When introducing `workflow_call`, extend the verifier to cover the distribution entry points, reachable local consumers/actions, and selection/evaluation inputs on which that policy depends.
Reject missing, dynamic, remote, or otherwise unreviewed call targets rather than accepting an unchecked execution path.
Use an explicit reviewed file/graph allowlist; do not replace the digest with a hash calculated from whatever candidate files happen to exist.
Keep independent assertions for capabilities, triggers, exact action revisions, native targets, artifact identity, local-only assembly, and absence of publication commands.
Mutation fixtures must alter each newly covered caller/consumer and demonstrate rejection before updating any expected digest.
The same migration applies to later artifact naming, cache, bundle-reuse, and graph edits; comments alone do not change the current semantic digest.
This is preservation of the existing release-policy boundary, not authorization to broaden it.

## 5. Task 1: Record coverage and performance baseline

**Files:** Read the four workflows, selector, `package.json`, test discovery code, archive builder, and release-input JSON; create the evidence document from section 4.

**Interfaces:** Produces a suite-to-consumer inventory, supported-target list, and per-job/per-step timings consumed by Tasks 2–7.

- [ ] Inspect `git status --short` and record `git rev-parse HEAD`; preserve unrelated changes.
- [ ] Re-read `docs/development.md` and inspect the actual npm script definitions before executing checks.
- [ ] Link the accepted change/risk route before implementation; this reviewed draft does not create a lifecycle approval or start an execution.
- [ ] Read GitHub rulesets and legacy branch protection independently; record exact required contexts, their source integration, `strict_required_status_checks_policy`, the "do not require status checks on creation" setting, and whether a merge queue exists.
- [ ] Inspect effective code-owner review enforcement and Actions fork settings; distinguish declared owners and requested permissions from enforced review rules and actual token capabilities.
- [ ] Record every workflow's concurrency group and `cancel-in-progress` value, including which non-PR events can currently be cancelled.
- [ ] Record every runner label and whether it is versioned or a `-latest` alias.
- [ ] Collect the most recent representative documentation, website, ontology, Python, tooling, MCP, and dependency PR runs where available.
- [ ] Record tested SHA, PR head/base where applicable, workflow revision, event, run attempt, OS/architecture, runner image version, conclusion, job time, queue delay, cache state, and test count; mark absent categories as baseline gaps.
- [ ] Inventory Python modules and Jest suites under every current command, distinguishing pure tests, real bootstrap tests, platform tests, Jena tests, and generated-file checks.
- [ ] Record current supported archive targets directly from `scripts/distribution/universalOntologyMcpReleaseInputs.json`.
- [ ] Inventory the release verifier's policy digest, exact graph assertions, implicit setup-node caches, package lifecycle builds, and existing bundle metadata/smoke verifier before proposing replacements.

Read-only collection examples:

```powershell
git status --short
git rev-parse HEAD
gh run list --event pull_request --limit 50 --json databaseId,workflowName,headSha,conclusion,createdAt
gh run view 35174448748 --json jobs
gh api repos/Hadden-Industries/universal-ontology/rules/branches/main
gh api repos/Hadden-Industries/universal-ontology/branches/main/protection
```

**Acceptance:** Every repeated suite has a stated reason or a proposed single owner.
Historical timings are labeled by revision and are not represented as current-run evidence.
No remote workflow is dispatched merely to fill a baseline gap without authorization.

## 6. Task 2: Add lifecycle controls and remove unnecessary provisioning

**Files:** Development workflow, lifecycle fields in existing workflows, `setup-node` cache settings, distribution release verifier and its tests, and evidence/development documentation.

**Interfaces:** Preserves all existing selection outputs and check names; changes only approved lifecycle controls and setup cost.

- [ ] Present exact concurrency, timeout, cache-mode/setup-cache, runner-label, shell-default, and version-comment diffs, including the distribution policy changes from section 4.1, for approval before editing.
- [ ] Add the section 3 concurrency expression to development checks and approved timeout ceilings to jobs.
- [ ] Change ontology and distribution cancellation to the PR-only expression; apply section 3.2's unique non-PR grouping to them and CodeQL so pending runs are also preserved.
- [ ] Replace `windows-latest` with the approved versioned label and set `defaults: run: shell: bash` where section 3.2 requires it, confirming each affected script still passes under `pipefail`.
- [ ] Add missing version comments only after resolving the pinned commit to its official release; use its actual tag, including a major-only tag where appropriate, rather than inventing a patch version.
- [ ] Disable setup-node automatic caching and set `cache-mode: none` on selectors/gates and distribution candidate jobs; use the reviewed read/write policy for other consumers from section 3.4.
- [ ] Retain the ontology workflow parser installation where a changed ontology workflow requires the locked YAML parser.
- [ ] Add pip download caching to applicable development consumers with `cache-dependency-path: requirements.lock.txt`; keep fresh `.venv` construction and hash-verified installation so a restored cache cannot change installed content.
- [ ] Verify candidate jobs restore no implicit caches, including those enabled by setup actions (section 3.4).
- [ ] Implement Python-style provisioning with a hash-locked Ruff-only dependency extraction following `prepareDocumentationTools.js` conventions, or retain the full environment if a complete closure cannot be proved without a new dependency.
- [ ] Keep bootstrap qualification using `npm run set-up:development`; do not replace its subject with a preassembled environment.
- [ ] Verify the same source files are checked and all existing commands retain their exit behavior, including native Windows shell coverage.
- [ ] Run the release-verifier and distribution-workflow suites after the coordinated policy update; a refreshed digest alone is not acceptance evidence.

Minimal Python-style command contract remains:

```sh
npm run lint:python
npm run format:python:check
```

The implementation must extract the exact locked Ruff version and integrity hashes, reject an absent or ambiguous entry, and create `.venv` before invoking these commands.
Do not install an unconstrained latest Ruff or cache `.venv` across OS/runtime combinations.
If a new minimal-tool extraction helper is necessary, propose `scripts/preparePythonStyleTools.js` and `tests/python-style-tools.test.js` as the exact additional files before implementation.

**Acceptance:** Coverage and check names are unchanged; a superseded trial PR is cancelled while running and queued main/manual/scheduled runs are retained; style jobs install only their verified tool closure; setup failures remain visible; the reviewed release policy still rejects unapproved mutations.

## 7. Task 3: Establish non-overlapping test ownership

**Files:** Development/ontology/distribution workflow commands, `package.json` only if approved, existing ownership tests, and the evidence inventory.

**Interfaces:** Produces named suite groups `node-product`, `node-tooling`, `python-unit`, `bootstrap`, `policy-generated`, and `ontology-engines` in the inventory.
These are conceptual ownership names, not automatically new npm commands.

- [ ] Assign ordinary Python unit modules to one owner for each selected OS.
- [ ] When that owner runs the full suite, suppress duplicate direct invocations in other jobs; keep real bootstrap and qualification steps separate.
- [ ] Assign development JavaScript tests to tooling coverage, avoiding their accidental repetition inside the broad `test:node` invocation for the same environment.
- [ ] Keep prose/toolchain platform regressions when their execution behavior is the subject of the change; run ordinary static checks once on Linux.
- [ ] Preserve policy generation freshness and Jena parity even when Python unit tests pass.
- [ ] Add a regression that compares discovered test files with the union of selected groups, rejects unowned files, and rejects duplicate ownership unless explicitly marked as a distinct environment/integration purpose.
- [ ] Run affected focused suites, then the documented complete suites once on the frozen candidate.

An ownership assertion should compare sets rather than duplicate implementation path conditions:

```js
const covered = new Set(groups.flatMap(({ testFiles }) => testFiles));
expect([...covered].sort()).toEqual([...discoveredTestFiles].sort());
for (const file of discoveredTestFiles) {
  const owners = groups.filter((group) => group.testFiles.includes(file));
  expect(owners.filter((group) => group.environment === "linux-unit")).toHaveLength(1);
}
```

In this fixture, `groups` and `discoveredTestFiles` are the test inventory produced from actual discovery; apply the unique-owner assertion only to ordinary Linux unit tests, with bootstrap/platform tests in their own environment categories.
Do not assert every Python test must execute in an environment lacking its required Jena runtime.

**Acceptance:** The before/after inventory accounts for every test, all distinct platform/integration purposes remain covered, and measured test counts explain the reduction.

## 8. Task 4: Introduce a shared plan and fail-closed aggregate

**Files:** Selector, schema and generated validator, new evaluator and their tests, new PR workflow, temporary reusable consumers, distribution release verifier, and workflow/selector tests.

**Interfaces:** Keep the existing Boolean scope API usable during migration.
Add the following orchestration output without breaking current consumers:

```json
{
  "schemaVersion": 1,
  "mode": "changed",
  "revision": "full-40-character-commit-sha",
  "comparisonBase": "full-40-character-base-sha",
  "requiredJobs": ["node", "website"],
  "scopes": {
    "product_tests": true,
    "website_build": true,
    "mcp_artifacts": false
  }
}
```

The real plan must contain every core Boolean scope, not only the illustrative subset above.
Standalone `codeql_*` scopes remain outside this aggregate until security integration is explicitly approved.
Define `mode` as `changed` or `full`; changed mode requires a full comparison-base SHA, while full mode uses `comparisonBase: null` and selects every core scope.
PRs and ordinary main pushes use changed mode with their exact event comparison; schedules, authorized full dispatches, and initial merge-group support use full mode.
Reject unsupported events, unavailable comparisons, and invalid checkout identity; never map an error to an empty plan.

Define the schema in `scripts/pullRequestCheckPlan.schema.json` using draft 2020-12, explicit `required` properties, `additionalProperties: false` at every fixed object, actual Boolean types, and unique allowlisted job IDs.
Use the locked Ajv's draft-2020-12 entry point, `ajv/dist/2020.js`, with strict validation and no coercion, default insertion, property removal, or remote schema loading.
The ordinary `ajv` default class uses an older dialect.
[Ajv dialect support](https://ajv.js.org/json-schema.html#draft-2020-12-breaking).

Keep ordinary path selection and aggregation independent of npm installation: generate a standalone ESM validator once with `scripts/generatePullRequestCheckPlanValidator.js` and check in `scripts/pullRequestCheckPlanValidator.js`.
Both selector and evaluator import that generated module; do not compile schemas or install the application graph merely to validate the plan.
The generator supports explicit `--write` and read-only `--check`, and the schema suite verifies freshness with the locked toolchain.
If Ajv emits runtime imports, bundle those helpers using the existing locked MCP workspace esbuild dependency; a clean-directory test with no `node_modules` must prove the final module is self-contained.
Keep the locked YAML parser's exceptional ontology-workflow comparison path until an equivalent explicit mapping replaces it.
[Ajv standalone generation and runtime requirements](https://ajv.js.org/standalone.html).

`requiredJobs` contains stable orchestration job IDs from an explicit allowlist.
Derive `requiredJobs` from `scopes` through one exported scope-to-job mapping; the evaluator recomputes it and rejects any plan whose `requiredJobs` disagrees with its `scopes`.
Export `CORE_CHECK_SCOPE_NAMES` and `CORE_CHECK_CONSUMER_IDS` from the selector alongside that mapping for complete fixtures and workflow-contract tests; schema generation reads the schema directly, avoiding a generator/validator import cycle.
Each job ID maps to one reusable consumer or an inline job with one aggregate conclusion, including all of that consumer's selected matrix children.
The selector job is always required independently of the array.

Define `evaluatePullRequestChecks(plan, results)` in `scripts/evaluatePullRequestChecks.js`:

- `plan`: validated schema version, mode, full revision, comparison base, complete scopes, and unique required job IDs.
- `results`: object mapping every known consumer ID plus `select` to `success`, `failure`, `cancelled`, or `skipped`.
- Return `{ ok: boolean, failures: string[] }`; the CLI exits nonzero when `ok` is false.
- Reject schema-invalid plans, unsupported schema versions, malformed SHA, unknown/duplicate job IDs, `requiredJobs` inconsistent with `scopes`, unknown conclusions, and missing or extra result keys relative to the complete `select` plus consumer set.
- Require selector success and success for every selected consumer.
- Accept `skipped` only for unselected consumers; reject failure/cancellation of an unexpectedly executed consumer as well.
- In the CLI, compare the plan revision with `GITHUB_SHA` and checked-out `HEAD`; reject missing/malformed input and a cancelled workflow state.
- For every selected reusable consumer, the CLI also requires its `verified-revision` output to match the plan revision; emit that output only after its internal completion evaluator succeeds.

Concrete behavioral tests:

```js
import { expect, test } from "@jest/globals";
import { evaluatePullRequestChecks } from "../scripts/evaluatePullRequestChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  CORE_CHECK_CONSUMER_IDS,
} from "../scripts/selectPullRequestChecks.js";

const plan = {
  schemaVersion: 1,
  mode: "changed",
  revision: "a".repeat(40),
  comparisonBase: "b".repeat(40),
  requiredJobs: ["node"],
  scopes: {
    ...Object.fromEntries(CORE_CHECK_SCOPE_NAMES.map((scope) => [scope, false])),
    product_tests: true,
  },
};
const results = {
  ...Object.fromEntries(CORE_CHECK_CONSUMER_IDS.map((id) => [id, "skipped"])),
  select: "success",
  node: "success",
};

test("schema-valid selected work succeeds", () => {
  expect(evaluatePullRequestChecks(plan, results)).toEqual({ ok: true, failures: [] });
});

test.each(["failure", "cancelled", "skipped"])(
  "required consumer cannot report %s",
  (result) => {
    expect(evaluatePullRequestChecks(plan, {
      ...results, node: result,
    }).ok).toBe(false);
  },
);

test("unselected website may be skipped", () => {
  expect(evaluatePullRequestChecks(plan, {
    ...results, website: "skipped",
  }).ok).toBe(true);
});

test("missing selected result fails", () => {
  const missing = { ...results };
  delete missing.node;
  expect(evaluatePullRequestChecks(plan, missing).ok).toBe(false);
});
```

These examples assume the approved mapping assigns `product_tests` to `node` and includes `website` in the consumer allowlist; keep those names consistent with the actual graph.
Every negative fixture starts from the positive schema-valid case and changes one property so a schema error cannot masquerade as evidence that result handling works.
Add separate cases for selection failure, unknown job/result key, missing unselected result, string `"false"`, unsupported mode, missing scope, extra property, duplicate ID, `requiredJobs`/`scopes` disagreement, and revision mismatch.
CLI tests additionally cover absent or stale consumer completion outputs, cancellation, malformed/empty JSON, and successful execution without npm dependencies.

- [ ] Write the evaluator tests and confirm meaningful failure before implementing the pure evaluator.
- [ ] Implement the evaluator and CLI with JSON passed through environment variables or files, never interpolated into shell source.
- [ ] Extend selection tests for additions, deletions, both rename endpoints, mixed changes, shared runtime inputs, unknown executable/configuration paths, missing Git comparison objects, more than 300 changed files, and filenames containing whitespace/newlines or shell metacharacters.
      Use Git-tree fixtures or POSIX-only cases for names that Windows cannot create; do not break native Windows coverage to test Git's path transport.
- [ ] Introduce one selector in `pr-validation.yml`; initially preserve existing conservative scopes and native coverage.
- [ ] Publish selected and unselected scopes with their reasons in the job summary so skipped work is explainable.
- [ ] Replace ontology YAML structural comparison only when an explicit workflow-to-consumer mapping and regression fixtures provide equivalent conservative coverage; otherwise retain it during migration.
- [ ] Keep full Git history initially; then measure a bounded fetch of the exact base and tested revision in the single selector, with commit-object validation and an explicit fetch fallback before any comparison.
- [ ] Test deleted branches, unavailable comparison objects, and changed-document selection before removing full-history fetches; never interpret an unavailable comparison as no changes.
- [ ] Give reusable consumers a required string input for the JSON plan and derive execution mode from its validated contents; use `with`/outputs rather than assuming caller workflow-level `env` is inherited.
- [ ] Use local `./.github/workflows/...` calls so caller and consumer definitions come from the same commit; checkout and verify the plan revision in each execution job.
- [ ] Keep the original standalone workflows during shadow comparison; temporary consumers are `workflow_call`-only and have no workflow-level concurrency (section 3.2).
- [ ] Prepare the final conversion and main/manual trigger transfer for Task 7, preserving original event selection; do not retire an original workflow while its old check context is still required.
- [ ] Declare `permissions: {}` at workflow level in `pr-validation.yml` and every consumer; grant per job; pass no secrets and never `secrets: inherit`.
- [ ] Add workflow contract tests asserting permission and cache ceilings, absence of passed secrets, concurrency ownership, shells, supported caller-job fields, revision identity, and versioned runners.
- [ ] Preserve required-step failure semantics: no `continue-on-error`, swallowed exit status, or success output emitted after a failed required step/job; preserve current matrix `fail-fast: false` during migration.
- [ ] Make the final job's display name exactly `PR validation`, with `if: ${{ always() }}` and explicit `needs` for selector and every consumer.
      A job skipped by a conditional reports success to required checks, so the gate must never be skippable.
- [ ] Assert that no other job in any workflow can produce a check named `PR validation`; checks from reusable-workflow jobs appear as `caller / called`, so only the top-level gate name is stable.
- [ ] Keep final evaluation short and bounded: exact-revision checkout, Node setup without a package cache, and the checked-in evaluator/validator; no npm install, artifact download, or product execution.
- [ ] Give each reusable consumer an internal `always()` completion job with explicit `needs` for all internal work, recomputing expected jobs/targets from the validated plan and rejecting a selected skip or missing target.
- [ ] Expose `verified-revision` through `on.workflow_call.outputs` only from that successful completion job; the top-level CLI checks it independently of `needs.<consumer>.result`.
- [ ] Reject empty matrices for selected work; require all expected native target receipts/artifacts, rather than collecting a matrix through a single output that can be overwritten by another child.
- [ ] Run the new orchestration in shadow mode while the old required check remains active.
- [ ] Retire duplicate standalone PR triggers only in Task 7 after equivalent coverage and the replacement required context are both verified.

Job-result transfer example:

```yaml
env:
  PR_CHECK_PLAN: ${{ needs.select.outputs.plan }}
  PR_CHECK_RESULTS: ${{ toJSON(needs) }}
  PR_CHECK_CANCELLED: ${{ cancelled() }}
run: node scripts/evaluatePullRequestChecks.js
```

The CLI converts each `needs` entry's `result` to the pure evaluator's result map.
It separately verifies the selected reusable consumers' completion outputs and cancellation state before returning success.
If selector output is empty, parsing fails and the gate fails.
Keep `OWL Differential Analysis` available until Task 7 completes the remote rule transition.

**Acceptance:** The positive and negative truth tables pass locally, the clean control path works without dependency installation, and actual trial runs prove failed/skipped/cancelled consumers, internal jobs, or missing matrix targets cannot yield a green aggregate.

## 9. Task 5: Separate product checks from complete qualification

**Files:** Selector, distribution workflow, new full-qualification workflow, selector/qualification tests, and development documentation.

**Interfaces:** Add `mcp_application` and `mcp_release_qualification` scopes.
During migration define existing `mcp_artifacts` as their union so old consumers remain conservative.
Do not silently change the public selector output meaning until all callers and tests are migrated.

- [ ] Map MCP application/shared-query implementation to application verification and retain all current native targets initially.
- [ ] Map archive tooling, release inputs, bundled runtime, container recipe, licenses/notices, package metadata, native/WASM components, and shared lock/runtime inputs to complete qualification.
- [ ] Inspect package inclusion rules: packaged README changes must still receive package-content verification even if they do not warrant all native rebuilds.
- [ ] Separate website build from unrelated native archive dependencies; both still depend on the source checks they actually require.
- [ ] Keep static checks/test suites owned once as established in Task 3.
- [ ] Introduce `full-qualification.yml` with authorized manual and weekly full qualification through the temporary consumers; keep legacy main triggers until Task 7.
- [ ] Prepare its main trigger and the final consumer call paths for Task 7's atomic migration; assign each main-branch consumer one trigger owner and remove legacy main execution in that same change.
- [ ] Keep full candidate checks before release; do not treat a PR artifact as authorization to publish.
- [ ] Preserve source verification when moving suites: an archive job consumes successful verification of the same revision, and release qualification runs the required verification through its own trusted entry point.
      A PR check result or matching artifact hash alone does not qualify a subsequent release build.
- [ ] After coverage-preserving deployment is stable, present the exact application-only matrix reduction to Linux x64/Windows x64 for separate approval.
- [ ] If approved, apply that reduction only to application-only PRs; packaging/runtime changes, full scheduled runs, and pre-release qualification retain all five targets.

Selection regression table:

| Fixture change                                | Application checks                      | Full release qualification                                          |
| --------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| MCP implementation JavaScript                 | Yes                                     | Yes initially; reduced only after approval                          |
| Archive builder                               | Yes                                     | Yes                                                                 |
| Runtime archive URL/checksum or target list   | Yes                                     | Yes                                                                 |
| Root lockfile                                 | Yes                                     | Yes until dependency-aware proof exists                             |
| Dockerfile                                    | Relevant container/application checks   | Yes initially                                                       |
| Packaged README                               | Documentation/package-content contracts | Conservative until package-content coverage is independently proven |
| Website-only CSS                              | No MCP work                             | No                                                                  |
| Website CSS plus archive builder              | Yes                                     | Yes                                                                 |
| Unrecognized file within distribution tooling | Yes                                     | Yes                                                                 |

**Acceptance:** Pure website/docs changes avoid native qualification, packaging changes cannot avoid it, mixed changes retain all applicable work, and any later coverage deferral is explicitly documented.

## 10. Task 6: Reuse the application bundle only after proving the boundary

**Files:** Archive builder, conditional bundle verifier, distribution workflow, package/container consumers as required, and distribution tests.

**Interfaces:** Proposed archive option `--bundle-directory <path>` consumes a verified same-run application bundle; absence preserves the current standalone build path.
The bundle artifact includes a manifest with `schemaVersion`, source revision, producer run ID/attempt, locked input digest, and SHA-256 for every transferred file.
Resolve the file list from existing release inputs; include the worker and WASM alongside the main application and required notices.
Reuse the existing `universal-ontology-mcp-application-bundle.json` hashes and metadata where applicable, and retain `packages/universal-ontology-mcp-server/scripts/verifyUniversalOntologyMcpApplicationBundle.js` for runtime/query-readiness verification.
The proposed transport verifier adds source/input identity and exact file-set checks; it does not replace that runtime verifier.
Derive the expected revision/input digest from the consumer's checkout, not solely from the downloaded manifest.

- [ ] Compare application outputs built on supported runners using identical inputs; explain any platform-specific difference before attempting sharing.
- [ ] Measure current build time against upload/download and verification overhead.
- [ ] Stop this task with recorded evidence if transfer overhead exceeds the saved work or outputs are platform dependent; the other tasks remain valid.
- [ ] If justified, add tests rejecting mismatched revision/input digest, absent worker/WASM, wrong hashes, unexpected or duplicate paths, traversal, symlinks escaping the root, and incompatible manifest versions before executing bundle code.
- [ ] Implement the explicit prebuilt-bundle path without bypassing archive checks or modifying deterministic timestamps.
- [ ] Upload one immutable application artifact per run, named with run ID and attempt, and consume it by artifact ID in native archive, container, and assembly jobs.
- [ ] Preserve `digest-mismatch: error` in the pinned downloader and independently assert the complete expected artifact/target set (section 3.4).
- [ ] Require upload failure for an empty file set; select compression based on actual bytes and transfer measurements, avoiding needless recompression of native archives.
- [ ] Transfer into a clean staging directory and preserve or deterministically reconstruct executable modes, file layout, and timestamps before archive verification.
- [ ] Define the initial rerun rule as rerun-all for bundle consumers: a partial rerun that lacks the producer output or belongs to another attempt fails with that recovery instruction; never resolve a missing input by downloading a name-matched "latest" artifact.
- [ ] Audit `prepack`, tests, archive helpers, and container/assembly commands to prove they consume the supplied bundle without rebuilding it; preserve standalone builds for ordinary local packaging.
- [ ] Verify manifest hashes and source identity in every consumer before packaging or execution.
- [ ] Never consume PR-produced bundle artifacts from `workflow_run` or another privileged workflow.
- [ ] Preserve native extraction/version/help smoke tests and the container initialize/tools-list exchange.
- [ ] Keep integrity checking for downloaded Node runtimes and all qualification receipts.
- [ ] Apply section 4.1 to the new artifact flow; keep the production Dockerfile and package lifecycle unchanged unless an exact additional configuration change is approved.
- [ ] Retain current three-day archive/candidate retention unless evidence justifies a separately approved change.

**Acceptance:** Same-run/attempt identity and full file integrity are enforced, partial reruns have a tested recovery path, platform smoke tests still execute, deterministic outputs remain valid, and measured savings include avoided implicit builds and justify the extra artifact boundary.

## 11. Task 7: Transition required checks and complete rollout

**Files/settings:** PR workflow final job, old workflow triggers, GitHub ruleset required contexts, development guide, and evidence document.

**Interfaces:** The externally required status becomes `PR validation`; keep the observed GitHub Actions integration identity unless live inspection requires a different one.

- [ ] Obtain successful and intentionally failing trial runs for the new aggregate on authorized PRs.
- [ ] Use real `pull_request` runs to prove required-check enforcement; a manually dispatched workflow on the same SHA does not establish that its check satisfies a PR ruleset.
- [ ] Confirm the new status has succeeded within the preceding seven days and applies to the tested merge revision.
- [ ] Present the exact ruleset patch adding `PR validation` alongside `OWL Differential Analysis`, bound to the GitHub Actions app as its required source (`integration_id` 15368, re-verified live), without altering bypass actors, merge methods, or unrelated rules.
- [ ] Decide explicitly whether to enable `strict_required_status_checks_policy` or a merge queue; without either, a green result on an outdated merge revision can be merged.
      Present that decision as its own approval item.
- [ ] After explicit remote-setting approval, apply that addition and read back the effective rules for `main`.
- [ ] Prove a selected product/qualification failure blocks merging even when differential ontology validation succeeds.
- [ ] Prove a selected internal job skipped behind a green reusable-workflow result is rejected through its absent completion output, and a missing native target cannot pass the consumer gate.
- [ ] Present a second exact patch removing only the obsolete required context after the new gate is proven.
- [ ] Apply only after approval, read back effective rules, and then remove obsolete orchestration compatibility code with approved configuration changes.
- [ ] Only after that readback, convert the original workflows to `workflow_call`-only, update caller paths, transfer main/manual entry points to `full-qualification.yml`, and remove temporary consumer files and duplicate legacy PR/main triggers in one reviewed change.
      Keep `PR validation` required throughout; reverify the release-policy graph and actual check names after the migration.
- [ ] Document security enforcement separately; do not claim CodeQL is required unless the actual rules/gate enforce it.
- [ ] Inspect check names and source app IDs from actual runs, including reusable-workflow prefixes and reruns, before applying the final context names.
- [ ] If a merge queue is enabled, add and test `merge_group` handling before relying on the new gate for queued merges.

**Acceptance:** There is no interval in which the old required protection is removed before the replacement is enforced.
Ruleset readback and a blocked failing PR demonstrate enforcement; YAML inspection alone is insufficient.

## 12. Verification and measurement

### Local verification

Inspect current scripts before execution and use focused suites first:

```sh
npm test -- --runInBand --runTestsByPath tests/pr-check-scopes.test.js tests/development-workflow.test.js
npm test -- --runInBand --runTestsByPath tests/pr-check-plan-schema.test.js tests/pr-check-results.test.js tests/distribution/pr-qualification-policy.test.js
npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-release-verifier.test.js tests/distribution/universal-ontology-mcp-distribution-workflow.test.js
npm run test:python
npm run lint
npm run format:check
npm run build:verify
```

The second command applies only after its proposed test files exist.
The third command is required for semantic distribution-workflow changes, including lifecycle-only edits.
The Python command requires the existing repository environment; report missing setup rather than installing implicitly.
Run archive/container/engine checks when the relevant implementation is changed and their runtime is available; absence is a proof gap.
Do not run all expensive native qualification locally after a documentation-only change.

### Remote acceptance scenarios

| Scenario                                                                     | Expected result                                                                           |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Ordinary docs PR                                                             | Documentation consumer and gate; unrelated consumers explicitly unselected                |
| MCP docs PR                                                                  | Docs plus MCP documentation/package-content contract coverage                             |
| Website PR                                                                   | Product/static checks and website build; no unrelated native archives                     |
| Ontology PR                                                                  | Required diagnostics, policy contracts, active qualification, engine checks               |
| Python PR                                                                    | Required style/tests and platform-sensitive coverage                                      |
| Packaging/runtime PR                                                         | All five native archives, container verification, complete qualification                  |
| Shared lockfile PR                                                           | Conservative union of all affected consumers                                              |
| Mixed PR                                                                     | Union of each category, with no lost dependency                                           |
| Selector failure                                                             | Red aggregate regardless of skipped consumers                                             |
| Required consumer skipped/cancelled/failed                                   | Red aggregate                                                                             |
| Selected internal job skipped; required step softened; native target missing | Consumer proof fails and aggregate stays red                                              |
| Empty/malformed plan, string Boolean, missing scope, stale revision          | Red aggregate before product work can count as verified                                   |
| New revision arrives                                                         | Old PR run cancels, new revision has its own required result                              |
| Burst of main pushes plus scheduled/manual runs                              | Every selected non-PR run remains eligible to complete, including previously pending runs |
| Fork/Dependabot PR                                                           | Read-only functional checks; explicit verified CodeQL behavior                            |
| Scheduled full run                                                           | Complete supported coverage independent of changed paths                                  |
| Merge queue, if enabled                                                      | Correct merge-group revision and required gate                                            |
| Bundle digest mismatch or partially missing artifact set                     | Hard failure before packaging or execution                                                |
| Partial bundle-consumer rerun                                                | Fail with rerun-all guidance; full rerun produces a new consistent attempt                |

Capture actual runs only after their triggering actions are authorized.
Synthetic local fixtures do not prove remote token permissions, cancellation, runner behavior, or merge enforcement.

### Measurement rules

Compare like-for-like change categories and record at least five comparable successful runs where practical; label smaller samples as provisional.
Measure median and p95 end-to-end duration, job execution seconds by OS, queue delay, cache hit/miss, artifact bytes, repeated suite count, and post-merge failures.
Report sample size, raw durations/range, and the quantile method; p95 from a small sample is descriptive, not reliable tail-latency evidence.
Keep cold-cache and warm-cache cohorts separate and retain failures, cancellations, reruns, and total work across superseded revisions so successful-run filtering does not hide costs.
Set acceptable latency/capacity tradeoffs before evaluating optimization trials; attribute observed differences to a change only when workload, runner image, and cache differences are accounted for.
Public-repository standard hosted compute is free, but that does not prove the account has zero Actions charges: larger runners and storage have separate billing rules.
Report compute, artifact/cache storage, and any paid runner use separately where observable; mark unmeasured billing as unknown.
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
The primary targets are contributor waiting time (end-to-end duration), queue delay under the account's concurrent-job limit, and Windows/macOS runner capacity.
Separate summed execution time from contributor waiting time.
Do not trade a large latency regression for small runner savings without an explicit decision.
Exclude shadow-mode duplicate work from steady-state savings while reporting its rollout cost.

Acceptance requires no unexplained missing coverage, correct merge enforcement, cancellation working, and an evidence-backed reduction in at least one target cost without unacceptable regressions in the others.
For any native coverage reduction, track failures found only by full qualification and restore PR coverage if that tradeoff proves unacceptable.

## 13. Rollback and stop conditions

- If selection drops a known consumer, select the conservative superset and repair the mapping before narrowing again.
- If the aggregate can go green after selected work fails or disappears, retain the old required check and stop the ruleset transition.
- If minimal installation changes tool behavior or cannot preserve lock integrity, retain the qualified full setup for that consumer.
- If bundle reuse introduces platform differences, identity gaps, or greater latency, retain standalone builds and record why.
- If reduced PR matrices cause unacceptable post-merge platform failures, restore all five PR targets through an approved targeted change.
- If scheduled qualification fails, assign and report the failure; a schedule is not substitute evidence for the PR it did not test.
- If full qualification has not run or is stale for the intended release revision, obtain an authorized exact-revision full run before relying on qualification evidence.
- If the release-policy verifier rejects an edited graph, review and repair the coordinated policy change; never remove the verifier or automatically bless a new digest to make CI green.
- Reverse only implementation-owned edits through targeted forward changes; never discard unrelated working-tree contents.
- Remote ruleset rollback is separately authorized and must preserve at least the previously enforced protection.

## 14. Completion checklist

- [ ] Exact configuration changes approved before editing.
- [ ] Baseline and suite ownership evidence recorded.
- [ ] Superseded PR cancellation and explicit timeouts verified; no non-PR run cancelled by concurrency.
- [ ] Pending non-PR runs survive bursts; trigger ownership is unique after shadow cleanup.
- [ ] Permissions, cache limits, secrets, concurrency ownership, shell defaults, and runner labels enforced by contract tests.
- [ ] Distribution-policy verifier covers reviewed caller/consumer graphs and rejects unapproved changes.
- [ ] Workflow static analysis run (CI or local) or its absence recorded as a proof gap.
- [ ] Minimal setup and caching changes measured.
- [ ] Shared selector and aggregate truth table pass.
- [ ] Schema-valid positive fixtures, standalone validator freshness, no-install gate execution, and internal consumer completion proofs verified.
- [ ] Current native coverage retained through initial migration.
- [ ] Distribution tiering and any coverage reduction explicitly approved.
- [ ] Bundle reuse either proven and verified or rejected with evidence.
- [ ] If reused, exact artifact sets, metadata integrity, executable modes, and the rerun-all recovery rule verified.
- [ ] Full main/scheduled/pre-release qualification documented and exercised where authorized.
- [ ] Required-check transition verified through remote readback and failing-run behavior.
- [ ] Fork/security/merge-queue limitations stated accurately.
- [ ] Documentation matches final commands, triggers, and ownership.
- [ ] Final measurements report sample limitations, waiting time, queue delay, runner time by OS, failed/cancelled work, and separate observable billing categories.
- [ ] Failures and unavailable checks retained in the handoff.
- [ ] No commit, push, deployment, or publication implied by completion.

## 15. Authoritative references

- [GitHub workflow syntax and concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Required checks, conditional skips, and dependency failures](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [Workflow-level skip behavior](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
- [setup-node automatic npm caching](https://github.com/actions/setup-node)
- [Sharing workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [Workflow events and merge-group triggering](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- [Reusing workflows: limits, permissions, and context](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [Available rules for rulesets, including required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [Actions limits](https://docs.github.com/en/actions/reference/limits)
- [OpenSSF Scorecard checks (Token-Permissions, Pinned-Dependencies)](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- [NIST SP 800-218 Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [SLSA build provenance](https://slsa.dev/spec/v1.1/provenance)
- [JSON Schema draft 2020-12](https://json-schema.org/draft/2020-12)

These references support platform behavior and engineering guidance; they do not constitute a conformance certification or authorize implementation.
The cache policy, unique non-PR concurrency groups, standalone validator, full initial matrices, and rerun-all recovery rule are this review's repository-specific recommendations.
Version-specific action source takes precedence over older tutorial examples: the pinned downloader fails on digest mismatch even though the artifact tutorial describes warning behavior.
Recheck relevant behavior when implementing, especially action-version defaults, new workflow keys, and GitHub ruleset semantics; record static-analyzer versions and distinguish unsupported new syntax from a verified workflow defect.
