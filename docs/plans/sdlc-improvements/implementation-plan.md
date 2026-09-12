# SDLC reliability, worktree lifecycle and proportionality — implementation plan

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](README.md) for completion context and original delivery identities.

**Research date:** 10 September 2026.  
**History window:** 7 September 2026, 12:44:56 UTC to 10 September 2026, 12:44:56 UTC (7–10 September, 15:44:56 Asia/Nicosia).  
**Status:** researched implementation proposal, not an accepted implementation baseline, configuration approval, security verdict or deployment authorization.  
**Primary implementation repository:** `Hadden-Industries/universal-ontology`.

## 1. Decision summary

Improve the existing SDLC rather than replace it. Its strongest controls are already appropriate: accepted intent, risk-dependent routing, one implementation execution per physical checkout, frozen verification inputs, independent expected results, native command protection, and preservation of failed evidence. The material gaps are in making those controls work reliably across process boundaries, worktree handoffs, adopted repositories and remote CI.

The recommended order is:

1. Preserve and account for the six worktrees in the handoff, without assuming they are abandoned or removing them.
2. Repair verification evidence retention and Windows text encoding (#32), including a separately demonstrated Unicode baseline-capture defect.
3. Implement the bounded, per-checkout exclusivity and real linked-worktree tests proposed in #33.
4. Make evidence promotion and outstanding worktree dispositions visible in existing lifecycle records.
5. Diagnose #30 through the actual protected Windows dispatch; qualify Codex Security #820 in the installed agent independently.
6. Reuse the ONI committed-plan baseline adaptation where accepted, reconcile preflight decisions with actual CI gates, and reduce redundant verification and recordkeeping.
7. Validate useful product outcomes in the real integrations, then selectively adopt qualified fixes in the other repositories under separate approval.

**Do not respond to these findings with automatic worktree deletion, weaker security checks, a central scheduler, a new global task database, mandatory additional reviewers, or a blanket reduction of the ONI converter to R0.** Those would either contradict existing scope or fail to address the demonstrated problems. [S01–S06, S10–S13]

The ONI concern is partly supported, but the distinction matters: its execution incurred substantial coordination and qualification overhead; the accepted deliverable was also a real distributable converter/library/CLI, not merely a small BBCode edit. The remedy is proportional scope and verification cadence, not retrospective removal of approved release obligations. [S18–S20]

## 2. Research basis and limits

### 2.1 Pinned observation points

| Repository / branch | Inspected revision | Meaning |
|---|---|---|
| `Hadden-Industries/universal-ontology`, `main` | `79d187802f9255134c03d0786ff75181ed1070ee` | Primary SDLC source and policy baseline; merged PR #28. |
| Same repository, `feat/shacl-policy-source-of-truth` | `22bcfddfa538d04be22c811169069dbc4ea56f1d` | Published SHACL proposal preparation, not proof of implementation or accepted cutover. |
| `Hadden-Industries/webvowl`, `feature/webmcp-integration` | `7fe956151e3dd77a8b7e07cdee4e65d068deebc1` | Includes the recorded failed AQFO user-outcome attempt. |
| `MaksymShostak/oxygen-not-included`, `steam-community-bbcode` | `f92f16d943cb612350b706c8479358245671894c` | Includes parallel mutation jobs; checked against current PR and actual workflow results. |
| `openai/codex-security`, PR #820 | Merge `be7807de836b9c0aaca696c4f6b8b985097c26a5` | Upstream code fix, not an installed-agent identity. |

The investigation followed relevant recent commits into their source, execution records, issues, PR state and CI results. It was not an execution of the repositories’ test suites or an exhaustive line-by-line audit of every changed file. Branch histories and published records cannot establish the state of unpublished local changes. GitHub retrieval was used for the connected repositories; the local Windows checkout, native hook requests and installed security agent were not available for direct reproduction.

The handoff is the source for the local worktree inventory, not a live filesystem inspection. Its observations are deliberately distinguished from causal hypotheses. Runtime log paths and digests in repository documents identify claimed retained evidence; they do not mean those raw local logs were independently opened during this research. The ONI GitHub Actions job results and dependency-review log were read directly. [S01, S18–S25]

Issue searches across the three repositories, without an open-only filter, found no standalone issue matching the additional baseline Unicode defect, the WebVOWL unversioned-header failure, or the newly inspected ONI dependency-review failure. This is a bounded tracker-search result, not proof that no private report or other record exists. Existing issues and PR execution notes must be checked again before filing.

### 2.2 Evidence classifications

**Confirmed source/remote state** means the relevant implementation, issue or remote result was inspected. **Recorded operational observation** means a source reports an execution, but its local raw evidence was not available. **Inference** identifies a supported interpretation, not established causality. **Proposal** is new implementation or process design in this plan.

The SDLC remains at its recorded **1.0.0 pre-release** adoption status. This plan does not change that status, adopt a new host, authorize installations, grant tool exceptions, alter branch protection, or authorize product publication. Issue #33 expressly accepts the separate-worktree direction while leaving its detailed implementation baseline proposed. [S04, S10]

## 3. Findings from the issues and recent work

### 3.1 Finding register

| ID | Finding and confidence | Disposition |
|---|---|---|
| F01 | #32: a parent-stream Unicode exception occurs before command evidence is appended/persisted. Confirmed source mechanism plus recorded Windows reproduction. | Repair in WP1. Do not mislabel as a stale-evidence approval bypass. |
| F02 | Issue #25 baseline v1 was corrupted by Windows locale decoding; v2 used an invocation-local UTF-8 setting. The common command helper still omits explicit decoding for captured protocol text. Recorded reproduction and confirmed source gap. | Add a linked, separately tested capture defect to WP1; preserve both historical baseline versions. |
| F03 | #33: `begin` checks active-state existence separately from its atomic replacement write. The current code does not establish exclusive creation. | Reproduce with controlled competing processes, then repair in WP2. A source race opportunity is not a reproduced incident. |
| F04 | ONI records a real same-checkout collision involving SDLC setup changes during converter work. The fingerprint control detected movement. | Evidence that physical checkout ownership must be respected, not evidence that the detector was wrong. |
| F05 | Six dirty SDLC-path worktrees contain sole-copy plans/review material; ownership, consumers and disposition are not established by the handoff. | Preservation and disposition work in WP0/WP3, not automatic deletion. |
| F06 | #30: the full command is denied for `unknown`/`cmd` and allowed for explicit PowerShell in native diagnostics; the original hook envelope/dialect remains unknown. | Diagnose the dispatch boundary in WP4; do not assign upstream blame yet. |
| F07 | Codex Security #820 fixes workflow inclusion in two diff-selection paths, not all scope omissions or Windows artifact writes. | Installed-capability qualification and narrowly scoped retirement in WP5. |
| F08 | ONI supports an approved committed Markdown baseline in its candidate, while its trusted-base validator remains Issue-snapshot-only. | Reuse the adaptation through a separately accepted trusted-base change in WP6. |
| F09 | ONI’s costly sequential mutation stage was split in `f92f16d`; both new mutation jobs actually passed. Dependency review, not mutation qualification, makes the latest BBCode workflow fail. | Preserve the successful CI repair; address the separate dependency decision and preflight/readback gap. |
| F10 | WebVOWL’s real AQFO load fails on absent version information, and an unexpected projection failure is reported as `LOAD_ABORTED`. The recorded browser attempt overlapped implementation edits. | Separate product defects and freeze/outcome improvements in WP7/WP8. |
| F11 | Tracked execution-log edits and broad repeated checkpoints create a re-verification feedback loop; accepted-baseline and native capability mismatches are discovered late. | Reduce redundant work without weakening input identity or accepted gates in WP7. |
| F12 | Historical “not pushed”, “pending CI” and “proposed” statements are not consistently distinguished from current disposition. | Add dated current disposition/readback while retaining historical evidence; do not rewrite history. |

Sources: [S01–S13, S18–S25].

### 3.2 Universal Ontology: fixes already present and residual problems

PR #28’s Windows work addresses a different layer from #32: the current verifier already decodes captured child output as UTF-8. #32 arises when that decoded text is printed to the parent Python stream before bookkeeping. Therefore neither repeating the child-decoding repair nor citing the earlier Windows work closes #32. The issue’s existing subprocess test boundary also differs from the in-process output-capture test. [S03, S07, S09]

The baseline README documents a second encoding failure. A capture produced mojibake in the accepted Issue body; schema validation alone did not establish that the captured bytes represented the accepted text. Version 2 captured the correct 21,422 UTF-8 bytes under an invocation-local UTF-8 mode. The helper’s default Windows decoding is explicitly recorded as a follow-up defect and remains visible in `scripts/_commands.py`. This deserves its own regression even if a shared launcher change helps both defects. Do not regenerate or overwrite accepted historical snapshots to conceal the failed attempt. [S14, S15]

Existing guides already distinguish R0/R1 from R2/R3, avoid separate baselines for routine low-risk work, and limit default reviewer/security orchestration. The implementation plan should strengthen their application rather than introduce a second proportionality taxonomy. Existing input-identity checks should be preserved: no evidence inspected showed them accepting the stale profile left by #32. [S03, S05, S06, S08, S11]

The SHACL proposal commit `22bcfdd` is now retrievable on the named branch. Issue #31’s statement that it had not been pushed describes an earlier moment. A dated disposition update should resolve that ambiguity without changing the historical acceptance record. It is still not evidence that SHACL implementation or combined MCP/SHACL acceptance has occurred. [S23, S24]

### 3.3 ONI: proportionality, successful controls and remaining blockers

The accepted converter scope includes a public library and CLI, Steam Community syntax, Markdown behavior, packed consumers and release qualification. The execution record attributes approval to Max and records demanding coverage and mutation thresholds. It also records subsequent explicit scope/configuration decisions. This does not support describing all toolchain work, publication preparation, or R2 assurance as unauthorized ceremony. Nor does the size of a lockfile or generated report prove over-engineering. [S18–S20]

There are nevertheless concrete friction points:

- The same physical checkout was used for another SDLC change during converter execution. Verification correctly detected changed inputs; independent worktrees would have avoided that collision.
- An already accepted committed plan did not fit the default baseline parser, and candidate support did not make the trusted-base PR validator support it. This was an adoption compatibility problem, not a missing owner decision about converter behavior.
- Recorded full-verification reruns interacted with modifications to a tracked execution document. The record includes ordering workarounds intended to avoid invalidating the just-recorded evidence.
- Toolchain/native-output compatibility and security inventory limitations consumed qualification effort. These should be discovered in a bounded preflight, not after lengthy product qualification.
- The previous single-job mutation stage took 49m53.67s, compared with 39.56s for the ordinary checks in that recorded job. Mutation testing is justified by the accepted baseline; performing the complete expensive obligation at every minor checkpoint is a separate choice that requires a trigger. [S18, S19]

Commit `f92f16d` already splits library and CLI mutation qualification. The later remote run **34342366498** confirms that both mutation jobs, all six ordinary OS/Node checks, and the stable aggregate check passed. Its library qualification step ran from 10:50:47 to 11:29:05 UTC, **38m18s**; the CLI step ran from 10:50:58 to 10:59:59 UTC, **9m01s**. These overlap. This is observed successful parallel execution, not a controlled estimate that parallelism alone caused every timing difference or reduced total runner consumption. [S19, S21, S22]

The same run failed **Dependency review**. The job’s directly inspected log identifies **`nwmatcher@1.3.9`**, advisory **GHSA-6394-6h9h-cfjg**, in `tools/steam-community-bbcode/comparison/node/package-lock.json`. The job is configured to fail at low severity across runtime, development and unknown scopes. Consequently a moderate advisory in a development comparator is sufficient to fail the configured gate. The preceding form-data fix does not resolve every dependency finding. [S21, S25]

Treat this as a concrete dependency/gate-disposition task, not proof that CI is malfunctioning. A fixed-corpus-only risk argument may be relevant to an explicit owner decision, but it is not equivalent to satisfying an all-scopes, fail-low gate. Prefer an available native upgrade, replacement or removal of unnecessary comparator use; otherwise require an explicitly accepted advisory-specific disposition consistent with repository policy. Do not silently lower the severity threshold or make the entire dependency gate advisory. No branch-protection enforcement audit was performed, so this report does not claim that the green aggregate could or could not permit merging. [S20, S25, S30]

PR #4 remains a draft at the inspected head, with additional release/qualification boundaries. A repaired mutation workflow is not equivalent to a release-ready converter. The existing native-security inventory shortfall was **70 of 164 frozen paths**, with a specifically accepted R2 direct-review alternative; it must not be described as a completed whole-scope native scan. [S20]

### 3.4 WebVOWL: user-outcome evidence matters more than test totals

The September 9 evaluation adds the owner’s actual AQFO task: load the pinned ontology, resolve the exact `person` IRI, show the relevant region faithfully, export the observed SVG and deliver the real artifact. It also checks that an annotation mentioning Fishing Vessel does not become an invented class. The originally reported invented-node incident was not independently reproduced; the pinned new scenario is a repeatable acceptance input, not proof about that earlier session. [S17]

The new native-browser attempt did reproduce a different failure. HTTP retrieval and native tool discovery succeeded, but projection passed `header.version: ""` to a field whose contract allows `null` or a nonempty string. The constructor rejected it, and the controller returned `LOAD_ABORTED`, obscuring the actual failure. No AQFO graph or SVG was produced. This remains recorded at the inspected branch tip; unpublished local repairs are outside this audit. [S16, S17]

The evaluation also states that implementation files changed during the browser attempt: startup failed, became usable and failed again after further edits. This invalidates any claim that that attempt qualified a final integrated snapshot. Existing policy already requires frozen verification and independent expected facts. The improvement is to make the handoff enforceable and visible, not to add yet another reviewer. Previous tests and native-browser checks did catch real defects and remain valuable within their actual scope. [S06, S17]

## 4. Architecture constraints for the change

Preserve one native active execution per physical checkout. Real Git worktrees are the supported isolation mechanism for independent implementations; logical overlap in different worktrees is a coordination matter, not a reason to stop all work. Git shares some state across worktrees, so environment, port, cache, external channel and common configuration ownership must be recorded when relevant. Derive repository/common-directory identity through supported Git interfaces rather than path-name substitution. [S04, S08, S26]

Reuse `.sdlc/runtime/`, current run/profile/handoff records, native Git inventory, the existing Issue/PR and accepted baseline. Avoid a repository-wide service, global lease database, second task hierarchy, or cross-repository deployment framework. The physical exclusivity guard should be narrowly local and should not pretend to prevent arbitrary non-SDLC processes from editing files. [S04]

Keep command classification with native DCG. A rejection is not permission to retry the same forbidden operation through a different shell, interpreter or filesystem tool. Any actual supported exception remains a scoped operator decision. Likewise, a newer upstream security commit is not installed-host acceptance. [S02, S11–S13]

Separate **implementation completion**, **verification of a particular input**, **acceptance/integration**, **publication**, and **resource disposition**. They need not become a new universal state machine. They need to be distinguishable in existing records so that a complete change can honestly retain a recovery worktree or report operator-blocked cleanup without losing ownership. [S12, S13]

## 5. Work packages

### WP0 — Preserve and establish ownership of the handoff worktrees

**Priority:** P0 preservation precaution. **Owner:** current worktree owners and coordinator; Max resolves unknown ownership or retention. **Dependencies:** none. **Authority boundary:** read-only inventory first; preservation or disposition actions require appropriate authority. This is not a declaration of an active incident.

Reconcile the supplied six-worktree list with the current native inventory. Establish the current task, owner, role, HEAD, branch or detached attachment, relevant dirty-state identity, active consumers, and whether the worktree contains unique implementation, evidence, a negative control or a recovery copy. A directory name is a clue, not proof of ownership or purpose. Include the nested `shacl-policy-baseline` worktree and its outer owner.

For any worktree whose future disposition is uncertain, preserve the required tracked changes, untracked and relevant ignored data, local/detached commits and review/scan records in the existing approved evidence/recovery location. A patch alone does not preserve untracked or ignored files. A digest alone does not preserve any content. Do not publish credential-bearing or sensitive security evidence merely to make it durable. Verify the retained copy by readback or a bounded restoration check appropriate to its content.

Near-identical implementation and verification trees may be legitimate copies of the same candidate. Record candidate identity and role before deduplication. Do not merge apparently duplicate evidence by filename: compare its inputs and content, and retain distinct failures. Branches at `main`’s tip with dirty changes may be intentional checkpoints; they do not establish that commits were lost or that the branch can be deleted.

**Deliverable:** a current disposition section in the existing task/Issue/PR handoff, with real evidence locators and each retained worktree’s owner, consumer, next decision trigger and reason. Unknown ownership remains an explicit hold. **Acceptance:** all six supplied survivors are accounted for; unique required bytes are recoverable; no unauthorized cleanup occurs. If new live state differs, record the difference rather than overwriting the historical handoff. [S01, S12, S13]

### WP1 — Repair text boundaries and persist verification before presentation

**Priority:** P1. **Primary issue:** #32. **Linked defect:** Issue #25 baseline capture Unicode corruption. **Owner:** SDLC maintainer; independent verifier covers the actual supported Windows entry point. **Route:** accept the material evidence-retention change through the existing process; do not silently include it inside #33.

**Change surfaces:** `scripts/runRepositoryPython.js`, `scripts/sdlc.py`, `scripts/_commands.py`, the existing state/schema consumers where necessary, `tests/sdlc/test_pipeline_controls.py`, focused launcher/baseline regressions, and the existing verification/adoption record. Inspect other callers before changing a shared helper’s text behavior. [S03, S07–S09, S14, S15]

First reproduce the two distinct contracts: Unicode diagnostics through the real Node-to-repository-Python launcher with redirected non-UTF-8 parent output; and exact UTF-8 Issue/JSON text through the baseline-capture subprocess boundary. Use disposable fixtures, not a reintroduced lint failure in a live worktree.

Select UTF-8 deliberately for the repository-owned Python process and for subprocess protocols known to produce UTF-8. Native `-X utf8` is a candidate for the launcher; qualify it against supported interpreter versions and environment overrides. It is not sufficient by itself when `PYTHONIOENCODING` explicitly changes standard-stream encoding. Do not change machine-wide locale, user-wide environment or unrelated tool settings. A generic process helper must not assume that every possible external command emits UTF-8; expose explicit decoding where its protocol needs it. [S27, S28]

Reorder verification so terminal presentation is not the owner of evidence retention. Create an identifiable attempt before execution, and persist each completed command’s output, original return code, timing and input/task identity before attempting console rendering. Preserve available raw output if decoding or display fails; distinguish command failure, reporting failure and evidence-store failure. A display fallback may escape unrepresentable characters, but must not alter captured semantic input or silently repair a baseline’s text.

Ensure the latest attempted profile cannot be mistaken for an earlier success. Reuse or minimally extend the existing run/profile structure to represent pending/interrupted/incomplete/failed attempts, retaining prior history under its original identity. Keep the current full input-identity checks. Do not claim stronger power-loss durability than the implementation and tests establish. If the store cannot write, fail nonzero with an explicit recording error and block completion; do not manufacture a successful evidence record.

**Required regressions:** successful and failing Unicode commands through real subprocesses; failure followed by success with both records retained; non-ASCII baseline body round-trip with exact bytes/digest; parent stream encoding and redirection; reporting failure after a completed command; interrupted execution; unavailable command; malformed/unsupported text where material; and unwritable evidence storage. Exercise actual Windows npm/Node/Python use plus existing supported-platform controls. Configure any additional CI platform only through exact approval, not implicitly.

**Done:** default documented Windows usage requires no undocumented invocation setting; an output-rendering exception cannot erase a completed command’s normal evidence; failed/incomplete attempts remain distinguishable; existing stale-evidence rejection and interpreter/guard choices are preserved. Historical v1/v2 baseline evidence stays intact.

### WP2 — Prove and harden independent worktree execution (#33)

**Priority:** P1. **Owner:** SDLC maintainer, with the integration owner accountable for later combined-product evidence. **Dependencies:** WP1 is preferred for reliable Windows evidence; a recorded invocation-local UTF-8 mode is a temporary test dependency, not closure of #32. **Baseline:** refine and accept #33’s existing maintained proposal rather than creating a rival authority. [S04]

**Change surfaces:** `scripts/_repository.py`, `scripts/_sdlc_state.py`, `scripts/sdlc.py`, `tests/sdlc/test_pipeline_controls.py`, `docs/sdlc/howto.md`, `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md`, `REVIEW.md`, and `docs/sdlc/verification.md`.

Begin with two tests that establish distinct boundaries. The first starts two real native `begin` processes in one initially idle checkout under deterministic readiness/release control. Require exactly one success, one actionable nonzero rejection and preservation of the established task’s identity and scope. The second creates two actual linked Git worktrees sharing a common repository; begin and verify in both, then pause/resume one, and prove the other’s active state, failed run and history remain unchanged. Standalone temporary repositories and timing-only sleeps are insufficient substitutes.

For a reproduced competing-start defect, use the smallest supported native/standard-library exclusive-creation or short critical-section mechanism qualified for the supported filesystems. `os.replace` supplies atomic replacement, not exclusive acquisition. Define interruption and partially acquired-start behavior before implementation. An incomplete claim must be visible and require an attributable recovery decision; do not steal ownership based on elapsed time, an unverified process identifier or a guessed stale-file TTL. Do not add a global lock service or permit shared-checkout multiwriter mode.

Extend existing execution/handoff records only as necessary to expose accepted intent/baseline, physical worktree, owner, branch/HEAD, owned change scope, dependencies and material shared mutable resources. Keep these facts local or in the existing task/PR, not in a second task database. Unchanged existing state should remain readable; any required schema migration must be versioned, validated and accepted separately from accidental reinitialization.

Before integrating MCP and SHACL changes, record the common package/verification/ontology contracts and the named integration owner. After actual merge, rebase, conflict resolution or other relevant input movement, identify the combined target and run fresh required R2 full verification and the affected higher-level ontology consumers. Preserve earlier branch-local results as branch-local evidence. A textually clean merge is not proof of semantic integration. A policy/baseline/control change must follow existing rerouting/reacceptance; never refresh old digests merely to restore green status.

**Done:** REQ/AC-001 through REQ/AC-008 in #33 have executable evidence where applicable, with actual linked-worktree and competing-process tests. Documentation walkthroughs do not close the later real MCP/SHACL integration outcome. Independent work proceeds unless a concrete dependency, unavailable required capability, decision or separate authorization actually blocks it.

### WP3 — Make resource release owned, visible and non-destructive by default

**Priority:** P1. **Owner:** coordinator for task resources; operator for an operation blocked by native protection. **Dependencies:** WP0 preservation; coordinate record changes with WP2. **Scope:** existing handoff/status behavior and approved documentation, not a cleanup daemon. [S01, S06, S12, S13]

**Change surfaces:** `docs/sdlc/temporary-artefacts.md`, `temporary-artefacts-howto.md`, `subagent-playbook.md`, `howto.md`, existing TDD handoff references, and narrowly scoped `sdlc.py`/state/schema/status tests if executable visibility is accepted.

Add the following facts to the existing disposition record when a temporary resource crosses a handoff: resource/worktree identity; owning execution/person; purpose and consuming tasks; relevant candidate/evidence identity; preservation destination; disposition; next reassessment event; and any blocker/operator decision. Group related resources where this is clearer. Routine disposable files that do not cross a handoff do not need a permanent register.

Use descriptive dispositions such as retained-for-consumer, preserved-pending-review, operator-blocked, eligible-for-approved-removal, and removed-confirmed. These need not become a global lifecycle state machine. `status` should reveal pending dispositions even when an active implementation record no longer exists. A read-only native Git worktree inventory can identify legacy worktrees without local task records; absent records mean unknown ownership, not cleanup eligibility.

Define the release trigger as completion of the agreed handoff **and** release of all relevant consumers after required evidence/recovery preservation. A session ending, a PR merging, or a branch being behind/ahead of main is not sufficient alone. The coordinator requests disposition; a worker does not delete another worker’s workspace. The current policy already requires this; the improvement is actionable ownership and surfaced status.

When DCG blocks the legitimate non-forced Git operation, retain the exact attempted operation, rule, owner and scoped operator request. Do not try `rm`, PowerShell, Python, a file tool, `--force`, or disabled protection to achieve the denied action. Removal is complete only after the authorized operation succeeds and the actual worktree registration/filesystem state is read back.

Avoid newly nesting managed worktrees inside another task’s worktree unless a documented need justifies it. For the existing nested tree, record containment and outer-owner dependency; prohibit an outer removal while an inner registration, owner or retention obligation is unresolved. Reuse native Git administration; do not recursively infer ownership through ignored directories or traverse links into unrelated storage.

**Required negative tests, if tooling is added:** dirty data; untracked/ignored credentials; sole-copy evidence; active consumer; unknown owner; nested registration; symlink/junction escape; changed candidate after inspection; guard denial; interrupted preservation; and completed task with deliberately retained resources. A simulated guard block must produce a pending operator disposition without invoking an alternate deletion path.

**Done:** a maintainer can identify why each retained resource exists and who acts next; required evidence remains usable outside a disposable copy; blocked cleanup is not silently lost; no elapsed-time cleanup, automatic branch deletion or retention-policy invention is introduced.

### WP4 — Diagnose and qualify the real command-dispatch boundary (#30)

**Priority:** P1 diagnostic, followed by the smallest evidenced repair. **Owner:** repository integration maintainer until the failing component is established; coordinate with native DCG/host maintainers if appropriate. **Dependencies:** none for read-only diagnostic preparation. [S02]

Capture the original tool name, actual protected hook request, requested executable/shell, login settings, escaping, working directory, inherited environment, effective DCG configuration, host build, native binary identity and resolved dialect. Redact sensitive environment values, not the structural evidence needed to diagnose. Compare the exact full payload under native diagnostics and the actual dispatch; diagnostic `explain` exit zero is not an allowance verdict—inspect its JSON decision.

Minimize the full benign failing payload while preserving the same failure. The eight smaller allowed controls already disprove a blanket statement that all PowerShell here-strings fail. Include the WebVOWL comment’s explicitly selected `cmd.exe`/regular-expression example as a second case, without assuming it has the same cause.

Choose the repair only after ownership is established: preserve correct host shell metadata if it is lost; correct repository invocation metadata if that is wrong; or submit a minimal native classifier/parser reproduction if that is the defect. Repository exception design must not become a replacement classifier. Retain local testbed acceptance even when an upstream issue is filed.

**Change surfaces:** native hook/integration configuration only if implicated, `.sdlc/dcg/hook-probe-cases.json`, operator configuration example where relevant, `docs/sdlc/command-safety.md`, `dcg-acceptance.md`, `verification.md` and `adoption.md`. Exact configuration text requires approval.

**Acceptance:** the benign command succeeds through the protected actual Windows path; relevant harmlessly represented destructive negative controls remain denied; the old denial and diagnostic comparison are preserved; actual adopted component/configuration identities are recorded. Do not run real destructive commands as negative tests. Do not close the issue solely because `--dialect ps` explains the text as allowed or because a shorter alternative search happened to work.

### WP5 — Qualify PR #820 and retire only the relevant workaround

**Priority:** P1 adoption qualification. **Owner:** operator for installed-plugin update/configuration authority; native Codex Security for any authorized scan. **Dependencies:** actual availability in the used host, not an assumed propagation date. [S11, S29, S31]

PR #820 merged at **06:19:21 UTC on 10 September 2026** (09:19:21 Asia/Nicosia), merge `be7807de836b9c0aaca696c4f6b8b985097c26a5`. It introduces `path_is_diff_excluded`, which retains `.github/workflows/...` before falling back to normal exclusions. It is used by canonical diff inventory generation and legacy diff rank-input generation. The patch’s tests cover committed revision ranges and local staged/unstaged/untracked workflow files. Repository-wide ranking exclusions and the separate extension filter are not broadly removed. [S29]

Record what is actually installed: host/build, plugin version, helper identity where exposed, effective configuration and tested behavior. Use the supported update/sync mechanism when authorized, but do not equate marketplace metadata, upstream main or an update command’s success with effective deployment in a running agent. No propagation deadline was established in this research. [S31]

Run a bounded fixture through the actual installed scope-selection path: workflow-only and mixed-code changes, `.yml` and `.yaml`, committed ranges and dirty local changes, with deletion/rename coverage where supported. Compare native eligible paths against the independently derived intended diff, not merely file counts. After a selection pass, any live scan remains separately authorized and bound to the same frozen inputs.

Retire only a fallback that exists solely because changed workflow files were omitted, and only after the installed-path regression passes. Keep the general coverage-accounting requirement and dispositions for other omissions. ONI’s 70/164 inventory discrepancy cannot be assumed to disappear: #820 is not a promise to include every test, fixture, generated file or other excluded path. R2 alternative review requires actual accepted scope, not reuse of the standing R0/R1 exception by analogy. [S11, S20]

The separately recorded Windows artifact-write problem/workaround is unrelated to this patch. Its retirement requires the native agent to write and retain its actual bundle through the authorized host path without that workaround. Neither #30’s DCG classification nor #32’s repository verifier output is fixed by #820. Retain original scan evidence and append the updated disposition rather than editing the native bundle.

**Done:** installed capability, retained workaround and retirement evidence are individually identifiable. Unavailable propagation is a recorded capability dependency, not a reason for manual plugin patching, broader permissions, repeated full scans or a false completed-scan claim.

### WP6 — Reuse the accepted-plan adaptation and align local/remote preflight

**Priority:** P1 for ONI’s baseline blocker, P2 for general adoption improvement. **Owner:** SDLC maintainer and the adopter’s trusted-base policy owner. **Scope:** a separately accepted policy/validator change; not permission to run candidate policy with privileged credentials. [S18, S20]

The ONI candidate already supplies a small `_sdlc_baseline.py` contract: canonical repository-relative plan paths, nonempty opaque UTF-8 plan text, and a non-placeholder acceptance reference. It explicitly does not parse Markdown as proof of owner acceptance. Review and reuse this implementation and its changed consumers/tests instead of inventing a second baseline format or requiring a fictitious Issue for already accepted work. [S32]

**Change surfaces:** the adopter’s `scripts/_sdlc_baseline.py`, `scripts/sdlc.py`, `scripts/validate_sdlc_pr.py`, setup/projection surfaces that distribute them, and the existing baseline/PR validation tests. Reconcile with the current Universal Ontology Issue-snapshot path; preserve it rather than blindly replacing it with ONI behavior.

Require the committed plan’s exact native blob identity at the trusted base, an inspectable owner acceptance reference, canonical path and clear risk/baseline linkage. Identity proves which text was accepted, not that a string such as “approved” is authoritative. Test path traversal, noncanonical separators, empty/NUL content, missing acceptance, candidate-only files, modified base/head content and metadata-only spoofing. Preserve the actual Issue snapshot’s title/body identity checks and UTF-8 contract.

Land the accepted baseline-format/validator support through its own ordinary trusted-base change before relying on it for the feature PR. Do not solve the bootstrap by executing an untrusted candidate’s `pull_request_target` validator with elevated authority. A local candidate test passing does not mean its trusted-base consumer has changed.

Add a small preflight at existing routing/handoff points: can the actual trusted-base validator read the selected baseline; can the native security inventory cover the intended scope; do configured dependency thresholds match the accepted disposition; are mandatory runtime/tool capabilities present? Fail early with the precise missing boundary before expensive qualification. Do not add a new universal preflight dossier.

At push/PR handoff, read back the actual base/head, workflow attempt and relevant jobs, plus baseline and release blockers. Local success, a stale PR description, or one green aggregate is not remote completion. Required branch rules must be inspected when enforcement claims matter; changing them remains separately authorized. [S20, S21, S25, S30]

**Done:** accepted Issue and accepted committed-plan routes work through their real trusted consumers; malformed or candidate-forged inputs fail; the next ONI handoff records the actual dependency-review result and owner disposition rather than an obsolete “pending” status.

### WP7 — Make proportionality an execution rule, not another document set

**Priority:** P2, with immediately useful operating guidance. **Owner:** Max for changed acceptance/configuration decisions; coordinator applies existing accepted discretion. **Dependencies:** preserve reliable evidence and control identity from WP1/WP2. [S04–S06, S11, S18–S20]

Use the existing R0–R3 scheme. Add a short execution statement to the existing accepted task: current deliverable and non-goals; material risks; one representative user/consumer outcome; required checks; rerun triggers; relevant external capability dependencies; and concrete stop/decision conditions. For R0/R1 this can be a few sentences in the existing task—not a new Issue, matrix or separate baseline. Existing exact approvals remain exact; already accepted implementation choices should not be reopened at routine milestones.

**Separate risk from cadence.** R2 determines assurance needed for the accepted result; it does not mean every edit is a fresh release candidate. Use focused checks during the edit loop, affected consumer checks at meaningful integration points, and the required full profile on the final frozen R2 object. Re-run affected review after relevant fixes; do not automatically repeat every previously satisfied specialist question. Scope security to actual relevant boundaries under the existing review/scan budgets. The standing safeguards remain mandatory.

**Stop the tracked-log feedback loop first without weakening fingerprints.** Keep raw runs in the native evidence store and publish progress/current disposition in the existing PR/Issue or approved retained handoff location. Do not append each completed run to a source-tracked execution diary and then repeatedly rerun the entire product suite merely to certify the diary edit. Preserve accepted plans and executable/control documentation as real inputs. Promote a useful durable summary deliberately, with its original input identity. Do not blanket-exclude Markdown: documentation can contain accepted requirements, fixtures, executable examples or agent/security instructions.

If later evidence justifies more selective result reuse, make its input-dependency contract a separate accepted change. Require positive invalidation tests for source, tests, lockfiles, tool versions, relevant environment, shared contracts and control/baseline changes. Do not silently reuse an old full result merely because a human labels the delta documentation-only. This plan prefers better record placement before a new cache/invalidation system.

**Keep ONI’s successful parallel mutation design.** Record critical-path wall time separately from total runner time and ordinary-test time. Preserve accepted thresholds unless Max explicitly reaccepts a changed assurance design. Qualify Stryker incremental mode only for the actual runner and invalidation boundary: official documentation warns that dependency/environment inputs are not automatically all tracked; the command runner does not supply the same test-coverage information as richer integrations. Blind incremental reuse of the CLI mutation result is not a safe default. [S19, S21, S22, S33]

**Use bounded specialist work.** Independent verification follows writer stop and input freeze. Research answers the unresolved selection/compatibility question; it does not repeat a completed library survey for every implementation slice. General review plus risk-triggered specialist coverage replaces default role fan-out. Do not infer delegation authority from an installed role. A failed worker remains missing evidence, not agreement. These are applications of existing policy, not a new reviewer organization. [S06, S11]

**Bring representative user outcomes forward.** For WebVOWL, run the real pinned AQFO load-to-SVG path early enough to challenge the design; for ONI, exercise the real description and the installed packed consumer before optimizing test totals. Later final qualification must still cover the final integrated revision. A single representative case is not the whole acceptance suite, but it prevents thousands of passing internal tests from becoming a proxy for the requested job. [S17–S20]

**Observe effectiveness using existing data:** unnecessary pause reasons; reruns and which inputs caused them; full-verification critical path; concrete defects detected per review/check; unaccounted retained worktrees; and successful user outcomes. Do not create a new mandatory telemetry platform or make measured time savings a prerequisite for an otherwise justified engineering improvement. Establish a real baseline before claiming productivity gains.

**Done:** a routine low-risk prose change has a genuinely light route; an executable/security-sensitive change still receives its proper controls; a converter edit does not automatically rerun unrelated release work at every checkpoint; and the required final R2 profile and independent outcome evidence remain present.

### WP8 — Close product findings and qualify selective adoption

**Priority:** P1 for currently blocking product defects; P2 for broad adoption. **Owner:** respective product maintainer; Universal Ontology remains first SDLC testbed. **Dependencies:** appropriate accepted product scope and separately authorized repository changes.

For WebVOWL, file or link the unversioned-header projection defect and misleading unexpected-error classification. Use an independently authored valid unversioned model to demonstrate the optional-version contract, then repair at the owning boundary and preserve genuine cancellation semantics. Verify the pinned AQFO job in a stable independent workspace through native tool load, exact entity/relationships, visible framing, actual exported SVG inspection and actual delivery limitation/result. Do not substitute a generated diagram or a source-loader-only pass. Review output facts against the source independently, not against the converter being tested. [S17]

For ONI, attach the exact current dependency-review failure to the existing release/qualification work and resolve the advisory through the accepted dependency decision route. Preserve other known release/security limitations; successful mutation, local package checks or an advisory-specific decision do not close unrelated blockers. No public exploit details or unpublished upstream reproductions need to be copied into a general SDLC report. [S20, S25]

Record SDLC source commit, selected components, adopter-specific overlays, qualification evidence and outstanding deviations in the existing adoption materials. A shared “1.0.0” label is not proof of byte-equivalent or host-equivalent deployments. Treat ONI’s baseline adaptation as a candidate upstream contribution with tests, not an implicit universal policy decision. Preserve repository-specific Python/Node, consumer checks, browser configuration and existing work.

Qualify Universal Ontology first, then selectively apply accepted fixes to ONI and WebVOWL through independent adoption decisions. Issue #33 itself excludes a cross-repository distribution mechanism and does not authorize downstream rollout. Stop propagation of a failed fix; preserve active state and failed evidence. Revert only the identified change through normal authority, without resetting dirty worktrees, deleting runtime state, refreshing digests or rewriting accepted history.

**Done:** each adopter can state which fix it actually runs and what has passed in that host; the real combined MCP/SHACL integration and the two downstream user outcomes are reported under their actual scopes. No blanket “SDLC fixed everywhere” claim follows from the first passing fixture.

## 6. Implementation sequence and acceptance boundaries

| Sequence | Deliverable | Acceptance gate |
|---|---|---|
| 0 | WP0 current inventory and preserved evidence | Owners/consumers/dispositions known or explicitly held; no destructive inference. |
| 1 | WP1 reporting/capture fixes and their regressions | Actual Windows entry point plus native record inspection; independent verification. |
| 2 | WP2 isolation/exclusivity tests and minimal repair | Controlled competing starts and real linked worktrees; #33 requirements accepted. |
| 3 | WP3 lifecycle visibility and approved handoff wording | Pending/blocked/retained resources survive completion and remain owned; no automatic removal. |
| In parallel where authorized | WP4 diagnosis and WP5 installed-agent qualification | Actual protected host behavior and narrow workaround disposition, not source-only claims. |
| 4 | WP6 trusted-base compatibility/preflight | Separate trusted policy acceptance; both baseline routes and negative controls. |
| 5 | WP7 proportionate cadence/record placement | Real low-risk and elevated-risk examples retain required assurance with fewer unjustified repeats. |
| 6 | WP8 actual integration and selective adoption | Product outcomes on combined/final inputs; adopter-specific evidence and unresolved limits. |

The work packages are a proposed decomposition, not a requirement for nine simultaneous branches, nine mandatory dossiers, or one giant merge. Separate changes at trust/approval boundaries and where independent regression/rollback is useful. Use the existing issue as the maintained acceptance authority wherever one exists. Small related implementation edits may share a PR after scope is accepted; do not merge unrelated repairs into #33 by convenience.

## 7. Acceptance matrix for implementers

| Test | Required observable result | Primary work package |
|---|---|---|
| A01 — failed Unicode output | Real default Windows launcher exits truthfully; failed command output and input identity remain in a new run; previous history is intact. | WP1 |
| A02 — accepted text capture | Non-ASCII Issue/body text round-trips byte-for-byte under default Windows settings; schema pass cannot conceal identity mismatch. | WP1 |
| A03 — competing task starts | Deterministically overlapping processes yield exactly one accepted owner and one actionable nonzero rejection. | WP2 |
| A04 — interrupted acquisition | Established or incomplete ownership is preserved and visible; no automatic takeover by timeout. | WP2 |
| A05 — linked-worktree isolation | A’s begin/verify/pause/resume does not modify B’s active record, failed output or retained runs. | WP2 |
| A06 — integration/control movement | A changed combined source, baseline or control identity cannot reuse incompatible earlier success; real combined consumer checks run. | WP2/WP8 |
| A07 — preservation | Required tracked/untracked/ignored content and detached/local commits remain recoverable through the approved preservation route. | WP0/WP3 |
| A08 — blocked or nested release | Active consumer, unknown owner, nested registration or DCG rejection yields a held disposition without alternate deletion. | WP3 |
| A09 — protected benign dispatch | Original safe semantics work through the actual guarded Windows path; corresponding inert negative controls remain denied. | WP4 |
| A10 — installed workflow inventory | Actual native helper covers intended changed workflow paths in qualified modes; remaining exclusions have individual dispositions. | WP5 |
| A11 — trusted baseline | Accepted Issue and committed-plan routes work at the trusted base; traversal, candidate-only or altered content and fake acceptance fail. | WP6 |
| A12 — remote readback | Handoff identifies exact PR head/run/attempt and failed dependency gate, not just local or aggregate success. | WP6 |
| A13 — proportionate routing | Low-risk prose does not inherit converter-release ceremony; security/control/contract inputs cannot hide behind a prose-only label. | WP7 |
| A14 — representative outcome | Frozen WebVOWL candidate completes or honestly fails the AQFO artifact job; ONI real packed consumer/description behavior is demonstrated. | WP7/WP8 |

These are proposed tests to implement or exercises to perform, not results obtained by this research. Mechanical fixtures establish their mechanical boundary only; real host and product outcomes remain separately named.

## 8. Tracker changes to prepare, not silently create

| Proposed tracker action | Scope and treatment |
|---|---|
| Extend #32 | Keep launcher/output and record-retention repair together under the observed bug; link the distinct baseline UTF-8 capture regression rather than claiming it was already reported there. |
| Refine #33 | Reuse REQ/AC-001–008, actual linked-worktree fixtures, deterministic exclusivity and integration ownership. Preserve its accepted separate-worktree direction and excluded global/multiwriter scope. |
| Extend #30 | Add the captured real hook envelope, minimized cases and established component ownership; reuse the existing WebVOWL comment. |
| Add linked baseline-capture defect if absent | “Windows baseline capture can decode accepted UTF-8 Issue text with the locale codec.” Preserve v1/v2 evidence and test exact bytes. |
| Add scoped lifecycle implementation item if needed | “Surface retained worktree ownership, evidence promotion and blocked release in existing handoffs.” Do not title it automatic cleanup or orphan removal. |
| Reuse ONI PR #4’s known baseline blocker | Separate trusted-base support from candidate feature code; upstream the minimal accepted-plan contract only after review. |
| Add/link WebVOWL product defects if absent | Valid unversioned ontology projection; truthful classification of unexpected load failure; frozen AQFO acceptance regression. |
| Add/link ONI dependency disposition | Exact `nwmatcher@1.3.9` advisory, comparison lockfile and run/job. Keep separate from the successful mutation parallelization. |
| Record process/adoption improvements | Proportionate cadence, record placement, preflight and dated remote readback can live in one bounded accepted SDLC improvement rather than one ticket per sentence. |

## 9. Explicit non-goals

No forced cleanup, age-based deletion, branch deletion, Git reset, automatic lease theft, native-guard bypass or permission broadening. No arbitrary credential/evidence publication. No central scheduler, general multiwriter checkout mode, merge queue, new branch-protection configuration or cross-repository deployment service. No generic reduction of coverage/mutation thresholds, broad advisory suppression, or unconditional incremental-cache reuse. No assertion that duplicated candidate bytes invalidate independent verification. No claim that an upstream merge proves installed capability. No automatic reopening of accepted product intent or expansion of #33 into other repositories.

## 10. Source index

Repository links are pinned wherever the observed file state matters. Issue/PR/Actions links are mutable records inspected on 10 September 2026; consult the stated observation window and revisions when reproducing. Official documentation was used for native capabilities, not to replace the repositories’ accepted requirements.

- **S01 — Uploaded handoff:** `sdlcworktreelifecyclehandoff20260910.md`, prepared 10 September 2026, supplied by Max. Local observational source; no independent live inspection of the six survivors.
- **S02 — Issue #30 and discussion:** [Issue](https://github.com/Hadden-Industries/universal-ontology/issues/30).
- **S03 — Issue #32:** [Windows Unicode evidence-loss bug](https://github.com/Hadden-Industries/universal-ontology/issues/32).
- **S04 — Issue #33:** [Independent worktree execution proposal](https://github.com/Hadden-Industries/universal-ontology/issues/33).
- **S05 — SDLC how-to:** [Pinned guide](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/howto.md).
- **S06 — Subagent playbook:** [Pinned playbook](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/subagent-playbook.md).
- **S07 — Native lifecycle implementation:** [scripts/sdlc.py](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc.py).
- **S08 — State and repository boundaries:** [_sdlc_state.py](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_sdlc_state.py); [_repository.py](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_repository.py).
- **S09 — Python launcher:** [runRepositoryPython.js](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/runRepositoryPython.js).
- **S10 — Adoption state:** [adoption.md](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/adoption.md).
- **S11 — Native security workflow:** [codex-security.md](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/codex-security.md).
- **S12 — Temporary-artifact policy:** [temporary-artefacts.md](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts.md).
- **S13 — Operational procedure:** [temporary-artefacts-howto.md](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts-howto.md).
- **S14 — Baseline capture defect and v2 recovery:** [Issue #25 baseline README](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/baselines/issue-25/README.md); [capture commit c1a0727](https://github.com/Hadden-Industries/universal-ontology/commit/c1a07276fd2e1122e69382e5c4ae704fae404cad).
- **S15 — Shared command helper:** [_commands.py](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_commands.py).
- **S16 — WebVOWL head:** [7fe9561](https://github.com/Hadden-Industries/webvowl/commit/7fe956151e3dd77a8b7e07cdee4e65d068deebc1).
- **S17 — WebVOWL evaluation:** [Pinned evaluation](https://github.com/Hadden-Industries/webvowl/blob/7fe956151e3dd77a8b7e07cdee4e65d068deebc1/docs/evaluations/webmcp-integration.md), especially motivating AQFO scenario and September 9 attempt.
- **S18 — ONI execution record:** [Pinned execution document](https://github.com/MaksymShostak/oxygen-not-included/blob/f92f16d943cb612350b706c8479358245671894c/docs/plans/2026-09-08-steam-community-bbcode-execution.md), including accepted scope, shared-checkout collision, baseline adaptation and qualification.
- **S19 — Mutation CI repair:** [f92f16d](https://github.com/MaksymShostak/oxygen-not-included/commit/f92f16d943cb612350b706c8479358245671894c), plus final execution-record section at S18; preceding run [34333962240](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34333962240).
- **S20 — ONI PR #4:** [Steam Community BBCode PR](https://github.com/MaksymShostak/oxygen-not-included/pull/4), draft at the inspected revision.
- **S21 — Actual post-repair workflow:** [34342366498](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34342366498); [library mutation job 102435886828](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34342366498/job/102435886828). Jobs and timestamps read from native GitHub Actions API.
- **S22 — Actual CLI mutation job:** [102435886919](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34342366498/job/102435886919).
- **S23 — SHACL source proposal:** [22bcfdd](https://github.com/Hadden-Industries/universal-ontology/commit/22bcfddfa538d04be22c811169069dbc4ea56f1d).
- **S24 — SHACL Issue:** [#31](https://github.com/Hadden-Industries/universal-ontology/issues/31), including its historical local/unpushed statement.
- **S25 — Actual dependency-review failure:** [job 102435886909](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34342366498/job/102435886909). Its decoded native log was directly read: failure on `nwmatcher@1.3.9`, GHSA-6394-6h9h-cfjg; configured `fail-on-severity: low` and runtime/development/unknown scopes.
- **S26 — Git native worktrees:** [Official git-worktree documentation](https://git-scm.com/docs/git-worktree).
- **S27 — Python stream behavior:** [Official sys documentation](https://docs.python.org/3/library/sys.html).
- **S28 — Python UTF-8 mode/environment:** [Official command-line/environment documentation](https://docs.python.org/3/using/cmdline.html).
- **S29 — Upstream diff inventory repair:** [Codex Security PR #820](https://github.com/openai/codex-security/pull/820), including its four-file patch and merge metadata.
- **S30 — Native dependency-review behavior:** [actions/dependency-review-action](https://github.com/actions/dependency-review-action), official action configuration and gate semantics.
- **S31 — Installed Codex plugin context:** [Official OpenAI plugins documentation](https://help.openai.com/en/articles/20001256-plugins-in-codex/). No installed build or #820 propagation deadline was established by this research.
- **S32 — ONI accepted-plan contract:** [Pinned _sdlc_baseline.py](https://github.com/MaksymShostak/oxygen-not-included/blob/f92f16d943cb612350b706c8479358245671894c/scripts/_sdlc_baseline.py).
- **S33 — Stryker native optimization boundaries:** [Official incremental mode](https://stryker-mutator.io/docs/stryker-js/incremental/); [official configuration](https://stryker-mutator.io/docs/stryker-js/configuration/).

## 11. Final acceptance statement to use after implementation

Do not prefill this as passed. Replace each field with actual evidence when the accepted work is performed:

> The accepted SDLC change is implemented at [revision], using [baseline and approved configuration identity]. Windows verification and baseline capture were exercised through [actual host/launcher], with successful, failed and interrupted evidence retained at [locator]. Same-checkout competing starts and two real linked worktrees passed [run identities]. Pending worktrees and evidence have [owners/dispositions], including [operator-blocked or deliberately retained resources]. Codex Security has [installed identity/capability result]; [specific workaround] remains or was retired because [qualification]. Trusted-base validation and remote CI were read back at [base/head/run/attempt]. The real product/integration outcomes are [results and limitations]. Adoption is qualified only for [repositories/hosts]; no other deployment, release or cleanup is implied.
