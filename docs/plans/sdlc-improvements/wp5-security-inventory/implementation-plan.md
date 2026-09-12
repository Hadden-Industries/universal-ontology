# WP5 — Qualify PR #820 and retire only the relevant workaround

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Parent:** `../implementation-plan.md`, §5/WP5 and acceptance criterion A10.  
**Research date:** 10 September 2026.  
**Primary repository:** `Hadden-Industries/universal-ontology`.  
**Status:** detailed implementation and operational-qualification proposal. Not an accepted baseline, installation instruction already authorised, completed native scan, or workaround-retirement decision.  
**Parent priority:** P1 adoption qualification; P1 is not an R0–R3 risk class.  
**Accountability:** Max accepts the relevant scope and policy decisions; the operator owns installed-plugin/update/configuration authority; native Codex Security owns every authorised scan and its artifacts.

## 1. Intended outcome and scope

The installed Codex Security path used by the operator must include the intended changed workflow files for each qualified diff mode. The SDLC must know which inventory-related alternative can cease to apply, which other scope limitations remain, and whether the separate Windows artifact procedure remains necessary. A public merge, plugin listing, version label, successful refresh, or nonempty file count is insufficient evidence of that outcome. [P01; R01–R05]

Preserve the parent's exact acceptance boundary:

> **A10 — installed workflow inventory:** Actual native helper covers intended changed workflow paths in qualified modes; remaining exclusions have individual dispositions.

Deliver the qualification in the existing task/PR and operational adoption records. Use native inventory artifacts, native scan context, and native completed bundles where applicable. Do not introduce a runtime selector, findings schema, policy engine, global registry, automatic scanner, updater, or mandatory per-task qualification suite. [P01; R03]

**Included:** installed-path discovery; preservation of the prior observation; supported operator update when authorised; bounded workflow-only and mixed-file fixtures; exact Git/path reconciliation; current desktop inventory confirmation during authorised real work; precise policy wording and cause-specific workaround disposition.

**Excluded:** patching the installed plugin cache; copying security skills or helper implementations into the repository; widening permissions/ACLs; changing scanner exclusions to make a fixture green; credentialed CI adoption; repeated paid scans for propagation polling; worktree disposal; changes to DCG or the repository verifier; retroactive alteration of native bundles; automatic adoption in WebVOWL or ONI.

A10 can be demonstrated with installed selection evidence without commissioning an unrelated full vulnerability assessment. A claim that the *desktop native scan route* has returned to service additionally needs its actual prepared/paged inventory and applicable artifact/finalisation evidence. Use the next already justified authorised scan for that observation. A separate fresh-scan requirement applies when retiring the Windows artifact workaround. Do not manufacture a new scan for each fixture or matrix cell. [P01; R03; R08–R10]

## 2. Research baseline: source facts versus proposed work

### 2.1 Observation identities

| Subject | Refreshed/source observation | Meaning and limit |
|---|---|---|
| Universal Ontology `main` | `79d187802f9255134c03d0786ff75181ed1070ee` | Source/policy observation, not inspection of the local Windows checkout. |
| PR #820 | Merged 10 September 2026, `06:19:21Z` / `09:19:21` Asia/Nicosia; merge `be7807de836b9c0aaca696c4f6b8b985097c26a5` | Upstream implementation identity, not installed capability. |
| Later inspected upstream source | `00afa60adc3f39850b0f903fc77036ecbff04539` | Two commits after the merge in the retrieved comparison; the comparison changes deep-scan/preflight and SDK-related files, not the two inventory helpers. It is not a native desktop build identity. |
| Existing Windows issue | `openai/codex#43791`, still open at readback | Separate artifact-access report; no inference that #820 repairs it. |
| ONI PR #4 | Draft/open; head `f92f16d943cb612350b706c8479358245671894c` | Records a specifically owner-authorised R2 alternative for a historical 70/164 inventory. No native completion claimed. |
| Operator's running environment | Not inspected in this research | Host/build, selected plugin, exposed helper identities, permissions and actual capabilities must be established locally. |

Sources: [P01; R01–R04; R11–R13]. No minimum plugin-version number containing #820 or deployment deadline was established. Do not substitute a source-package version for an installed build or assume every channel rolls out simultaneously.

### 2.2 What the patch actually does

The four-file patch adds `path_is_diff_excluded` in `generate_rank_input.py`. It returns false when the first two path components are exactly `.github` and `workflows`; otherwise it delegates to the existing general exclusion function. Both the canonical changed-file inventory and legacy diff-rank generator now use it. The extension filter and content/type checks remain separate. [R01; R02; R05; R06]

This is an exemption for that **path subtree**, not a promise to include every `.github` file or every file type. It is not a new YAML parser, workflow validator, security assessment, or broad removal of repository-ranking exclusions. Native filesystem/type/extension rules and a material security-review scope are different concepts. A file omitted by a native selector may still require review under the accepted task. [R02; R03; R05–R07]

The added upstream assertions place `.github/workflows/ci.yml` into committed-diff cases and `.github/workflows/ci.yaml` into local-patch cases. The latter tests combine staged/unstaged work with a workflow addition; the patch does **not** individually prove every staged, unstaged, untracked, deleted, renamed, or type-changed workflow case. The matrix in this plan expands qualification of the parent's requested modes; it does not misreport those new tests as already executed upstream. [R02]

### 2.3 Important unchanged boundaries found in the native implementation

| Boundary | Source-derived behavior | Consequence for WP5 |
|---|---|---|
| Canonical revision mode | Reads committed diff metadata and selected head blobs, rather than relying on the checked-out working copy for those blobs. | Dirty checkout content must not silently redefine a committed-range claim. Retain full base/head IDs. |
| Canonical local-patch mode | Uses the native union of staged, working-tree and non-ignored untracked paths; nondeleted candidates are then checked against the current filesystem. | Do not describe this as an index-only snapshot or proof that both staged and working bytes were reviewed. |
| Deletions | A deleted eligible path remains a candidate; its removed content must be inspected at the baseline. | Never discard a deletion because the current file does not exist. |
| Renames/copies | The inspected selection parsers retain the destination path; the complete Git change record has additional source information. | Keep both sides in the reconciliation record. Inventory membership alone does not prove baseline-side analysis. |
| Change-status filter | The inspected helpers request `ACMRD`; this is not an all-status universe. | Type changes, unresolved/conflicting state and other statuses cannot vanish from the independent denominator. |
| Symlink/index-only differences | Canonical revision metadata rejects symlink blobs; local canonical handling can omit absent nondeleted candidates. Legacy handling is not identical for all such cases. | Characterise safely; do not require artificial parity beyond the qualified common contract, and do not count either output as complete without disposition. |
| Line-based inventory | Canonical output rejects paths containing CR/LF; it is not a NUL-delimited path transport. | Do not split one unsupported pathname into several apparent review items. Preserve the explicit error and scope limitation. |
| Binary/extension checks | `.yml` and `.yaml` are eligible extensions. Unsupported suffixes and binary samples remain filtered; sampling is not a general file-validity proof. | Use controlled UTF-8 fixtures; retain an independent reason for any exclusion. |
| Desktop route | `prepareCodexSecurityReviewItems` resolves the helper from bound `context.pluginRoot`, uses its resolved Python, and binds the diff target from authoritative scan context. Listing is paged. | A direct helper pass does not prove the desktop invoked that helper or retained the same target. Confirm the bound runtime and every page. |

Sources: [R05–R08]. These are source observations at pinned revisions. The selected installed version must be characterised afresh; a later supported change can legitimately alter an edge case, but needs an explicit updated expectation, not silent compatibility guessing.

## 3. Selected approach and smallest change surface

Use an **operator-led capability qualification with a documentation-only default repository increment**. Reuse the installed helpers and existing native scan workflow. Keep local fixture/oracle output as bounded evidence. Do not add a mandatory repository runtime wrapper for a plugin-owned selector. [P01; R03]

| Existing location | Proposed responsibility | When to edit |
|---|---|---|
| `docs/sdlc/codex-security.md` | Add the installed-capability rule; make workflow-specific retirement conditional; preserve exact-path accounting, general omissions and separate Windows criteria. | After exact policy text is accepted. |
| `docs/sdlc/adoption.md` | Append actual host/channel/helper qualification and separate workaround dispositions, including pending states. | Only after the recorded events actually occur. |
| `docs/sdlc/verification.md` | Optional short reference to real qualification evidence where this is the established repository record. | Only useful results/limits, not copied raw logs or an invented pass. |
| Existing task/PR handoff and approved evidence store | Maintain target, environment, matrix results, scope table, retained artifacts and next actor. | During authorised execution; no new per-test Issues. |
| Existing native upstream tests | Reuse for source validation; propose missing native regressions upstream if a demonstrated gap warrants them. | Separate contribution authority; not automatic local cache edits. |

No default edits to `scripts/sdlc.py`, `_sdlc_state.py`, `package.json`, locks, `.sdlc/verification.json`, `.sdlc/pipeline-policy.json`, `.codex/*`, `SECURITY.md`, CI workflows, source-package historical manifests, or the plugin's installed files are required. Fixture workflows stay in owned offline fixture repositories and are never pushed or registered as real Actions workflows.

If a small repeatable comparison utility later becomes necessary, it may parse native output and compare supplied literal path sets only. It must not embed `EXCLUDED_DIRS`, port `path_is_diff_excluded`, infer risk from extensions, create findings, or become a second authoritative inventory. Such an additional maintained tool needs its own precise justified change surface; it is not selected by default here.

## 4. Authority, routing, dependencies and responsibilities

### 4.1 Acceptance boundaries

The user's request commissions this plan. It does not itself authorise installation, a paid/native security assessment, configuration edits, GitHub writes, commits, pushing, or public disclosure. Reuse existing valid decisions inside their exact scope; do not ask again for approvals already recorded and applicable. [P01; R03]

For an actual material change to SEC-01's standing alternative or to relied-upon security deployment behavior, propose **R2**, justified by the security-assurance boundary. Agree the exact route and baseline through the existing process. Bounded read-only investigation and helper qualification against an already approved installation are not automatically a new R2 software project. Do not create a baseline, approval, reviewer or PR for each fixture.

Keep these authorities distinct: (a) inspect installed identity; (b) run local inventory helpers; (c) update/import/refresh a plugin; (d) start/continue a native scan with its resource and data scope; (e) perform a particular Windows host artifact operation; (f) accept a policy edit or retirement; (g) publish/merge. An allowance at one boundary does not grant the others.

### 4.2 Responsibilities

| Responsibility | Existing accountable role | Concrete obligation |
|---|---|---|
| Scope and retirement decision | Max / accepted security-policy owner | Accept exact affected cause, scope, remaining gaps and policy text. |
| Installed capability | Operator / relevant workspace administrator | Establish actual channel/build; use supported update; preserve access/trust restrictions. |
| Qualification coordination | Existing SDLC task owner | Assemble exact target/path expectations, read native output, retain results and actionable dependency. |
| Native assessment | One authorised Codex Security assessment owner | Own preflight, threat model, paged inventory, analysis, candidates, native drafts and finalisation. |
| Independent review | Existing authorised reviewer selected by route | Check oracle, installed-path binding, non-retired limitations and policy change; no automatic fan-out. |
| Remaining issue | Existing upstream/adoption owner | Track concrete defect/rollout dependency without repeatedly restarting scans. |

### 4.3 Dependency rules

* WP0 is required only for use of evidence or resources it actually preserves. Its six historical worktrees are not fixtures. A new owned standalone fixture need not wait for their disposal.
* WP1 helps retain truthful default-Windows diagnostics, but its proposal is not an installed repair. Record any still-authorised invocation-local text setting. Do not change native MCP interpreter selection to make it match the repository launcher.
* WP2 provides one execution per physical checkout and linked-worktree isolation. Do not invoke a new task in another execution's active checkout. Separate independent work continues.
* WP3 can carry pending capability/operator obligations once deployed. Until then use the existing task/handoff record; do not require its proposed command/schema to conduct WP5.
* WP4 owns a blocked native guard dispatch. A helper or artifact access denial is a real gap; it is not permission to run equivalent effects through another channel.
* WP6–WP8 and adopter changes remain separately scoped. ONI's accepted R2 alternative and product/publication obligations are not retroactively cancelled by this qualification.

## 5. Establish the installed capability and update boundary

### 5.1 Record only what can actually be observed

In the existing qualification record, bind:

| Item | Required observation |
|---|---|
| User surface | Actual Codex desktop/terminal/other supported route and intended qualified scope. |
| Host/build | Application identity and actual running/bundled engine identity where exposed; a separate `codex --version` is labelled separately. |
| Plugin delivery | Curated/native, local, individually imported, or administrator-synced marketplace; actual plugin ID/source and manifest version if exposed. |
| Effective selection | Which installed plugin/skill the task selects; exposed resolved root/path or native context linking the run to it. |
| Helper identities | Canonical helper and directly loaded selection dependencies where readable, with path and digest. An unavailable digest remains unavailable, not guessed from GitHub. |
| Runtime | Actual helper Python selected by the native host; separately record the repository `.venv` used for repository controls. |
| Settings | Relevant effective native configuration and scope; source `SECURITY.md` authority; required permissions/trust, without dumping secrets or the whole environment. |
| Evidence location | New run-specific approved output directory, outside the reviewed diff; actual readable retained location. |
| Workarounds | Existing cause-specific alternatives and Windows procedure, with exact authority and scope. |

The inspected native desktop source uses a bound plugin root and a resolved Python command. Match the evidence to that runtime instead of merely discovering a similar helper elsewhere on disk. Do not recursively search the entire user profile or read unrelated sessions/credentials. [R08]

### 5.2 Preserve the baseline observation

When available through an already approved installation, run the smallest workflow-only selector case once and retain its actual output/exit status. Record the source and installed identity before any update. If the old installation is no longer available, preserve existing genuine evidence and label the old comparison not rerun. Do not downgrade the host merely to manufacture RED evidence or fabricate an old installed-path result from a source checkout.

### 5.3 Use only the actual channel's supported refresh

For an administrator-synced GitHub marketplace, the current official help describes `Sync now`; an individually imported plugin may expose `Refresh`; `Refresh plugin list` only reloads the displayed list. Those controls are different. Use them only when they exist for the installed channel and the operator has authority. A personal curated/native installation is not assumed to be an imported workspace marketplace. [R14]

For a local/curated Codex path, inspect the installed native management help/UI and use its supported update action. This plan does not invent `codex plugin update`, a version-pin flag, a cache path, or an administrator control available to a personal account. Do not add a second imported copy simply to reach new source. Do not edit cache code, repack helpers, splice skills, uninstall/reinstall indiscriminately, or broaden trust.

If the native update requires a new task/session/restart to load the new installation, follow that documented mechanism after preserving active scan identity and evidence. Capture the post-update effective identity. Do not infer that an existing scan now uses different code; use its native context and recheck the actual helper/route.

No directory refresh interval or repository merge time is a service-level deadline for #820 propagation. An unavailable update is a **capability dependency** with owner and reassessment trigger. Recheck after an actual release/update notification, an acknowledged completed refresh or the next authorised use; do not poll through full scans.

## 6. Independent target and path accounting

### 6.1 Define the object before generating inventory

For a committed range, resolve full base and head commit IDs and record how base was selected. The inspected helper compares `BASE..HEAD` directly; it does not compute a PR merge base for the user. If the accepted review is merge-base-to-head, obtain that base explicitly and record it. A moving branch name is not a frozen target. [R05; R06; R15]

For a local patch, bind the selected base, current HEAD, index state, tracked working content, required non-ignored untracked content and relevant controlled ignored inputs. Keep the owner-coordinated snapshot stable for inventory and any later analysis. Before/after identities support that coordination; they are not a transactional snapshot guarantee.

The upstream local mode unions staged/working/untracked *paths*, then reads current working files for nondeleted source inspection. Where staged and working bytes differ, retain both identities and state exactly which snapshot is in the scan. An index-only added file removed from disk must not be called reviewed just because a legacy worklist contains its name with an empty preview. [R05; R06]

### 6.2 Build the denominator with native Git, not scanner exclusions

Use native NUL-delimited output captured as bytes. These are inspection commands to adapt to the already bound target:

```text
git -C <repo> diff --no-ext-diff --no-textconv --name-status -z --no-renames <BASE> <HEAD> --
git -C <repo> diff --no-ext-diff --no-textconv --name-status -z --find-renames <BASE> <HEAD> --
```

The first preserves a simple old/new path obligation set; the second retains rename relationships. For local mode, separately retain working comparison to the chosen base, `--cached` comparison to that base, non-ignored untracked paths (`git ls-files --others --exclude-standard -z`), and native stage/mode identities as needed. Do not apply the helper's `ACMRD` filter to this independent denominator. Retain conflicts/type changes as explicit obligations or blockers. [R15; R16]

Resolve and inspect all subprocess exit statuses. Capture stdout/stderr separately; a truncated, malformed or unreadable record is not an empty list. Use existing byte-safe capture, not a shell text pipeline that rewrites NULs or pathname bytes. Do not normalize case, trim filenames, decode Git paths as JSON, or treat display quoting as part of a path.

### 6.3 Reconcile five distinct sets

Use these labels in the existing scope table; they are explanatory notation, not a new runtime schema:

* **G:** complete native Git change obligations, including old/new rename sides and selected local states.
* **E:** literal independently expected native inventory paths for each controlled fixture; or an explicitly accepted expected path set for the real target. Never compute E with the selector under test.
* **I:** actual output of the installed selector, retaining malformed/duplicate/error observations.
* **D:** actual desktop prepared/listed items, all pages, where that route is being qualified.
* **R:** paths required for the accepted security assessment, including directly relevant support where necessary. R is not automatically equal to I or all of G.

For controlled fixtures compare I with E exactly. For real work reconcile G and R against I, and D against the authoritative scan target and intended review inventory. Show missing and unexpected sets separately. An equal count with substituted paths must fail; nonempty output is insufficient. Selection is not analysis, and analysis is not native finalisation.

Each omission receives a disposition with path(s), Git status, selected content identity, native behavior, security relevance, accepted reviewer/decision, remaining obligation and evidence. Shared reasoning may group genuinely equivalent omissions, but the exact member paths remain identifiable. No blanket assertion that tests, fixtures, Markdown or generated files are harmless.

For rename destinations, explicitly retain the old-path baseline obligation even if the native inventory represents the change with the new path alone. A documented representation mapping is not an unreviewed-scope exemption. If the installed path cannot provide required original content or semantics, it remains a coverage gap.

## 7. Executable qualification sequence

### 7.1 Discover and check the supported helper interface

Obtain the helper path from the selected installed plugin's supported context/guidance. Inspect its actual `--help` before relying on the source-derived invocation below. Do not copy it into the fixture or substitute the upstream checkout. Supply an already approved Python executable compatible with that installed path; the native desktop may select a different approved Python from the repository `.venv`. [R05; R08; R09]

The canonical interface at the inspected source is:

```text
<approved-python> <installed-plugin>/scripts/generate_in_scope_files.py \
  --repo <owned-fixture-root> --scope . \
  --diff-base <full-base-sha> --diff-head <full-head-sha> \
  --diff-mode revisions --out <new-approved-output>/in_scope_files.txt
```

For local mode use `--diff-mode local-patch`, retaining the selected base and actual local content separately. The inspected function does not use `head` to redefine the working snapshot. The multi-line form above describes argv; on Windows invoke the actual executable with a PowerShell argument array, not a POSIX continuation pasted unchanged.

PowerShell dispatch pattern, after all variables are bound to approved actual values:

```powershell
$Arguments = @(
    $InstalledInventoryHelper,
    '--repo', $FixtureRoot, '--scope', '.',
    '--diff-base', $Base, '--diff-head', $Head,
    '--diff-mode', $Mode, '--out', $NewInventoryPath
)
& $ApprovedPython @Arguments
$NativeExitCode = $LASTEXITCODE
if ($NativeExitCode -ne 0) {
    throw "Native inventory failed (exit $NativeExitCode); preserve this attempt."
}
```

Use the existing approved capture path for actual stdout/stderr, argv, timestamps and files. Choose a new output directory per attempt. The upstream writer can replace an existing inventory; WP5 prevents accidental evidentiary overwrite by never reusing the prior attempt's output path. A failed new attempt cannot be counted from a pre-existing good file.

The legacy source interface is:

```text
<approved-python> <installed-plugin>/scripts/generate_rank_input.py make-diff-rank-input \
  --repo <owned-fixture-root> --base <full-base-sha> --head <full-head-sha> \
  --mode revisions --out <new-approved-output>/rank_input.jsonl
```

Exercise it only when the installed version exposes/supports that route or a consumer still uses it. Record not-applicable with actual evidence otherwise. Do not generate ranked worklists for an active desktop diff scan: the current native skill explicitly uses the prepared inventory and forbids those extra worklists in that workflow. [R06; R09; R17]

### 7.2 Controlled fixture topology

Use an owned standalone local Git repository with no remote, no credentials and no live CI. Put expected outputs and diagnostic artifacts **outside** its candidate tree. Do not use the six preserved worktrees, the user's active implementation, or plugin caches. Create the minimal baseline and candidates through already authorised fixture operations. All fixture file changes are to newly owned data; no `reset --hard`, broad clean, forced removal or source restoration is required.

The accompanying fixture recipe defines regular UTF-8 files and literal expected sets. Preserve the independent oracle before invoking the installed helper. For local mode, prepare all staged/working states before capture and avoid edits until readback is complete. No workflow file is submitted to GitHub or executed as Actions.

### 7.3 Minimum fixture groups

| Group | Construction | Core expected outcome |
|---|---|---|
| F51: workflow-only revisions | Add/change regular `.github/workflows/*.yml` and `*.yaml` in committed candidates. | Every literal changed eligible workflow appears; no empty success when E is nonempty. |
| F52: mixed revisions | Same workflows plus ordinary source, root README, `.github/scripts`/action metadata, tests, and controlled binary/unsupported-extension specimens. | Include the known eligible workflows/source; retain individual dispositions for unchanged exclusions. |
| F53: local states | Independently staged workflow, unstaged tracked workflow, untracked workflow; both suffixes. | Each supported present workflow appears once; no output file contaminates the change set. |
| F54: deletions/renames | Delete a workflow; rename within workflow directory, into it and out of it. | Deleted paths retained where supported; native rename representation reconciled with both-side obligations. |
| F55: content-state boundaries | Staged and working bytes differ; index-only file removed from disk; symlink/type-change or unresolved states where host permits safe fixtures. | Characterise exact supported scope; never claim all content states reviewed from membership alone. |
| F56: preservation controls | Unchanged repository, repository ranking, unchanged workflow, unrelated `.github` file, binary/unsupported suffix. | #820 does not become a global exclusion override. Legitimate empty results are distinguished from missed expected files. |
| F57: integrity and failure | Unicode/spaces, unsupported newline names on supported platforms, invalid base, missing helper/runtime, output failure, moving input and same-count wrong paths. | No false pass, stale-file substitution, path splitting, state mutation or concealed unavailable test. |

Run the core common-contract cases on the **actual Windows installed helper**. A Linux/source run is useful supporting evidence, not Windows or installed-agent qualification. Conditional filesystem cases need not cause privileged environment changes; an unavailable boundary is explicit and constrains the qualified scope.

## 8. Qualification through the actual desktop route

### 8.1 Do not confuse direct helper execution with native scan integration

The inspected native desktop implementation binds `context.pluginRoot`, `context.pythonCommand` or its native resolution, `targetContract.diffTarget`, and a native artifact destination when preparing review items. A manually invoked helper cannot prove those values match. [R08]

During the next separately authorised useful diff assessment:

1. Continue an existing `scanId` with the installed workflow when applicable. Otherwise start one authorised diff scan with the intended frozen target. Read the authoritative returned identity/directory/base/head; compare them before analysis.
2. Follow installed preflight. An unsupported local baseline/host has its documented native route or a reported gap; do not silently change to a terminal workflow and call it the same desktop assessment.
3. Have the native assessment owner prepare review items once, using its supported preparation tool. Read every page through the native list tool, preserving cursor completion and unique path membership. A total count or first page is not complete evidence.
4. Reconcile against R and the direct-helper target where comparable. If they diverge, diagnose actual bound helper/runtime/target/artifact freshness before source analysis; do not overwrite the native inventory with the expected list.
5. Check the required artifact writer before source analysis using the existing approved native capability route. A host-side pass is not sandbox-side readiness. If the currently approved Windows data-only host operation is needed, preserve its exact scan/path/payload authority and the denied sandbox observation.
6. Only then let the one native owner conduct the accepted review. Keep target, review coverage, deferred paths, candidates, validation and finalisation native. Read the completed bundle only if the native workflow actually completes.

The current source names include `get_codex_security_scan_context`, `start_codex_security_prompt_only_scan`, `prepare_codex_security_review_items`, `list_codex_security_review_items`, and native completion/retrieval operations. These names document the inspected source, not tools guaranteed to be available to this chat or every installed version. Use the installed schema rather than inventing arguments or pagination limits. [R09]

### 8.2 Source and scan snapshots must remain aligned

Bind a desktop working-tree target to the actual frozen local content, not just the returned head SHA. Check baseline, HEAD, index, selected working/untracked bytes and relevant policy movement. If the target changed, retain the earlier evidence under its original identity and use the native workflow's permitted continuation/retargeting decision. Do not quietly re-run inventory against different files while preserving an unchanged scan claim.

A native scan marked complete may still declare deferred coverage. Preserve that declaration. Zero findings, a green helper, valid JSON, or a completed UI card does not by itself establish that every required path was analysed.

### 8.3 Preserve failure continuity and proportionality

Inventory mismatch before scan launch should prevent unnecessary launch. After a scan exists, preserve its identity and native state; use supported recovery/continuation and the existing budget. Do not create replacement scans, mark a scan failed/cancelled just to clear state, or forge sealing/completion fields. The installed skill distinguishes recoverable readiness blockers from explicitly cancelled or confirmed unrecoverable scans. [R03; R09]

This work package is the separately accepted qualification/diagnostic scope when ordinary per-review troubleshooting is insufficient. It does not erase the review's existing budget or justify repeatedly repeating a finished assessment. Record actual run duration and usage where available; do not claim productivity improvement without comparable observations.

## 9. Cause-specific workaround disposition

The following labels are local shorthand in this plan, not new native state fields or extra tracker items.

| Item | Existing cause/authority | Retirement predicate | What remains unchanged |
|---|---|---|---|
| **W5-WORKFLOW** | Alternative assessment relied on solely because the diff selector omitted changed `.github/workflows` files. | Installed helper passes the required workflow modes; actual used native route is bound to that qualified capability; the same review's required path set is accounted for; owner accepts the scoped return to the native route. | Every-review coverage accounting, risk route, independent review, native preflight and artifact duties. |
| **W5-OTHER-SCOPE** | Other native omissions: tests, fixtures, generated outputs, other `.github` paths, unsupported types/statuses, or unresolved content-side coverage. | Each cause needs its own demonstrated native capability or accepted alternative for the actual scope. #820 alone is insufficient. | Exact omission identities and existing deterministic checks. No blanket weakening of R2/R3. |
| **W5-WINDOWS-IO** | `openai/codex#43791`; required scan artifact unavailable to the sandbox reviewer; per-operation approved host data transport. | A fresh authorised native scan proves the required writer's direct allowed creation/readback, native completion, retained-bundle retrieval and applicable restart readback without the workaround, under the accepted criterion. | Sandbox/DCG/ACL boundaries; original failed evidence and canonical native bundle. |
| **General scope accounting** | SEC-01's ongoing requirement, not a workaround. | Not retired by this work package. | Full Git path denominator, support-code relevance and native final coverage verification. |
| **WP4/WP1 restrictions** | Command-dispatch and verifier-output defects. | Their own acceptance evidence. | No claim that #820 repaired them. |

### 9.1 When workflow selection improves but a different gap remains

Example: workflow files now appear, but `.github/scripts/release.py` and security-relevant test changes remain omitted. Record that W5-WORKFLOW's original source cause is repaired for the tested modes; **do not claim that the entire target has become native-assessable**. Retain or obtain the appropriately scoped accepted alternative for W5-OTHER-SCOPE. A mixed assessment must state exactly which method and reviewer covered each part; manual coverage does not become native coverage by aggregation.

For bounded R0/R1 work, the existing standing alternative remains restricted to its stated inventory-omission conditions. R2/R3 or an explicit native-assurance requirement needs a separately accepted alternative. A schema-valid reference or a lower risk label cannot create that acceptance. [R03]

### 9.2 ONI's historical 70/164 observation

The current PR records the owner's specific approval of direct R2 assessment because the native inventory covered 70 of 164 frozen paths. It also gives a later PR total of 194 changed files. These are different recorded snapshots/denominators. Do not calculate an upgrade success rate by subtracting one from the other, or assume all historically missing 94 paths were workflows. [R12]

Locate the exact historical frozen path list and retained native inventory only if already available under the assessment's approved access. Otherwise label that detailed comparison unavailable. For a current authorised ONI qualification, derive the current complete path set anew, pin its candidate, and record both repaired workflow inclusion and the other omissions. Do not rerun the converter's mutation campaign or reopen its accepted publication/legal scope solely to qualify a path selector.

No automatic ONI/WebVOWL adoption or PR modification is performed by the Universal Ontology WP5. Record transfer of the qualification method and each adopter's own host/policy decision separately.

### 9.3 Windows artifact procedure remains a distinct branch

The open Windows report explicitly says the inventories contained the changed file; its failure was access to the required threat-model artifact directory after a ready preflight. Selection qualification is therefore not evidence of writer capability. [R10]

Use the next appropriately authorised real scan to evaluate this only when the owner intends to retire W5-WINDOWS-IO. Do not create repeated synthetic scans to test an unannounced fix. A prior manually repaired directory does not demonstrate the behavior of a newly created native scan directory.

If a future upstream design moves materialisation to a native secure writer and removes the reviewer filesystem-write obligation, record the changed native contract and ask the accountable owner to accept the corresponding revised retirement criterion. Do not silently call a native host write a successful sandbox filesystem write or claim the old denial was removed. The current proposed plan does not itself amend #43791's criteria.

Archive the whole completed bundle with original relative links and native contents. Append reviewer/risk/retirement dispositions externally. Never edit a sealed bundle to make scope appear larger or erase a failure. [R03; R10]

## 10. Detailed implementation slices

The eight slices are an order of work, not eight mandatory branches, approval loops or PRs. Work that changes no source does not acquire product-test obligations solely because this document is detailed.

### WP5.1 — Bind the accepted scope and existing workaround causes

**Inputs:** parent WP5/A10; current SEC-01; actual accepted task/route; relevant prior inventory and scan evidence.

**Actions:** identify W5-WORKFLOW, W5-OTHER-SCOPE and W5-WINDOWS-IO separately; locate the operator and next actor; bind repository, host/channel and evidence destination; establish which direct and desktop modes are actually used; preserve existing accepted alternatives and original failures. Record unknowns without expanding collection to unrelated sessions.

**Exit:** a compact accepted scope stating the operation authorities, intended qualified surface, cause-specific success conditions and what is not authorised. If a material policy change is proposed, use the existing R2 acceptance/baseline process as appropriate. Do not create another global bug merely to represent every fixture.

### WP5.2 — Characterise the actual installed baseline

**Inputs:** approved inspection/helper authority and the selected installed plugin context.

**Actions:** capture actual runtime/manifest/helper identity; inspect local native help; map canonical and any used legacy path; confirm actual Python; preserve one workflow-only baseline result when available; read current effective policy and canonical native guidance once. Verify that output is written outside the inspected diff and retained under the approved store.

**Exit:** attributable installed-path record. Possible outcomes include already fixed, still omitting workflows, path unavailable or no old baseline available. A source checkout result cannot fill an installed-path gap.

### WP5.3 — Obtain the supported update, without assuming propagation

**Inputs:** explicit operator update authority where an update is needed; actual channel; preserved prior identity.

**Actions:** use that channel's supported update/refresh; retain actual success/error response; perform required supported reload/new-session transition safely; recapture effective identity and rerun the smallest relevant selector probe. Read marketplace sync errors rather than treating a completed command as universal package success.

**Exit:** actual new capability available, or a named unresolved update/activation dependency. No manual cache patches, duplicate plugin installation, broader permissions or repeated full scans. Work independently on the plan/tests while propagation remains unavailable.

### WP5.4 — Qualify canonical and applicable legacy helper behavior

**Inputs:** stable fixture repositories; independently authored expectations; actual installed helper; selected identity.

**Actions:** execute F51–F57 proportionately, recording all required workflow-only/mixed, suffix and state cases; compare exact paths; inspect exit status and original outputs; test ordinary exclusions without recreating their selector; document common-contract and intentional edge-case differences between canonical/legacy paths. Use native consumer parsing and the existing approved runtime.

**Exit:** A10's installed-helper evidence for named modes, plus explicit omissions/limits. Missing required workflow paths block those modes; unperformed conditional boundaries remain unqualified. A legitimate empty-control pass is never a security verdict.

### WP5.5 — Reconcile the real target and native desktop binding

**Inputs:** the next separately authorised real assessment or existing scan continuation; current G/R path obligations; helper qualification.

**Actions:** bind authoritative native context; native owner performs its required preflight and preparation; read all pages; compare D and R, including rename source/deletion obligations; inspect the actual writer before analysis. Stop the assurance claim on mismatch; retain the existing scan and native error. Do not hand-edit its list or create replacement scans to bypass readiness.

**Exit:** desktop/native route confirmed for the tested scope, or direct-helper capability qualified with native-route confirmation pending. Inventory success alone does not imply source analysis or native scan completion.

### WP5.6 — Complete a useful native assessment, only where authorised

**Inputs:** ready authorised native scan, complete required path accounting and permitted writer.

**Actions:** one native owner follows installed threat-model/discovery/validation/semantic checkpoint/finalisation rules; review deleted/baseline-side content and relevant support; retain deferred coverage honestly; read back completed artifacts using matching native tools. Evaluate W5-WINDOWS-IO on a fresh scan only when separately intended and authorised.

**Exit:** native assessment's actual status and bundle, or an explicit incomplete continuation. The helper fixture does not require this slice to be repeated per case. Any completed scan's actual finding/coverage status is retained without reinterpretation.

### WP5.7 — Apply exact policy wording and record separate decisions

**Inputs:** accepted text amendment and actual qualification evidence; source drift check; owner decision.

**Actions:** apply only the accepted changes in `docs/sdlc/codex-security.md`; append actual host/cause-specific adoption facts; retain earlier paragraphs as historical where needed rather than rewriting failed evidence. Use the companion proposed amendments as the exact review surface. Do not prefill successful qualification or a Windows retirement. Update the existing task/PR record only with existing GitHub authority.

**Exit:** a readable policy that sends fixed scopes back to the native route but retains every other applicable gap, and an adoption record linking the real evidence. No native source, finding schema, installed cache or verification gate is replaced.

### WP5.8 — Verify, land and hand over the bounded increment

**Inputs:** frozen maintained changes, native/installed evidence, route and deployment scope.

**Actions:** run source-diff/format/link and actual relevant repository checks; confirm changed policy selects existing CI as expected; run the current required routed profile, including full if the accepted R2 change requires it. Obtain the route's existing independent review of exact scope, native binding and retirement decisions; no extra scanner per reviewer. Record actual PR head/base/run/attempt if publishing is authorised. Retain restricted native evidence and concrete next actors for remaining modes/bugs/adopters.

**Exit:** one of the honest completion states in §15. No claim that the broad full profile proves a plugin update reached the actual desktop. No automatic cross-repository adoption, release or cleanup follows.

## 11. Proposed verification catalogue

These **32 scenarios** are requirements for execution, not reported results. The machine-readable companion gives each case an independent oracle, layer, condition and initial `not-run` status. Cases can share fixture setup and one output readback; this does not mandate 32 scans or fixture repositories.

| ID | Scenario | Required result / evidence boundary |
|---|---|---|
| T501 | Effective installed path | Run bound to the actual selected helper/runtime, not a copied source version. |
| T502 | Supported update and reload | Post-update effective capability recorded; stale/unchanged loading remains explicit. |
| T503 | Workflow-only committed `.yml` | Exact expected path included; empty result fails. |
| T504 | Workflow-only committed `.yaml` | Exact expected path included. |
| T505 | Mixed committed paths | Literal eligible workflow/source set matches; other omissions individually visible. |
| T506 | Staged workflow addition/change | Present supported staged path included once; its content side is identified. |
| T507 | Unstaged tracked workflow | Present supported workflow included against the selected base. |
| T508 | Untracked workflow | Non-ignored new workflow included; output artifacts do not contaminate input. |
| T509 | Both suffixes in local states | `.yml`/`.yaml` behavior qualified across staged/unstaged/untracked states. |
| T510 | Deleted workflow | Candidate retained where supported; baseline content obligation explicit. |
| T511 | Rename within workflow tree | Destination representation plus old-path/baseline accounting, no lost obligation. |
| T512 | Rename into workflow tree | New workflow inclusion and source obligation retained. |
| T513 | Rename out of workflow tree | Old workflow removal is not hidden by destination exclusion. |
| T514 | Revision selection vs dirty checkout | Committed claim stays bound to base/head blobs, not incidental current edits. |
| T515 | Partial staging / different bytes | Index and working identities distinguishable; no false claim to review both from one name. |
| T516 | Index-only then absent on disk | Canonical/legacy difference recorded; missing required content remains a gap. |
| T517 | Unrelated `.github` paths | #820 does not silently broaden all `.github` coverage; actual required omissions dispositioned. |
| T518 | Repository ranking control | General ranking exclusions remain as the installed native contract states. |
| T519 | Unsupported suffix / binary | Controlled items excluded as characterised; exclusion is not a safety verdict. |
| T520 | Spaces, Unicode, supported case spellings | Path identity preserved without trimming, case folding or display-quote corruption. |
| T521 | CR/LF path or unrepresentable name | Explicit unsupported/error result; no split/fabricated path. Conditional on host support. |
| T522 | Symlink/type-change/conflict | Native behavior characterised without path escape; unhandled status is not silently complete. |
| T523 | Legitimately empty change | Empty result recognised only when independent E is empty; no vulnerability verdict. |
| T524 | Missing helper/runtime, bad ref or unreadable input | Nonzero/unavailable retained; no previous output substituted. |
| T525 | Output failure or reused artifact | Original evidence preserved; failed attempt does not inherit a previous success. |
| T526 | Target/control/plugin movement | A relevant change invalidates affected qualification; no stale claim. |
| T527 | Equal counts, different paths | Exact-set negative control detects substitution/missing workflow despite equal totals. |
| T528 | Applicable legacy selector | Common contract qualified separately; unsupported/unused route not guessed or emulated. |
| T529 | Desktop prepared inventory and all pages | Authoritative scan target and every page reconcile; count/first page alone insufficient. |
| T530 | Other omissions and R2 alternative | #820 pass does not retire unrelated omissions or grant R0/R1 exception to R2/R3. |
| T531 | Windows artifact independence | Selection pass cannot retire I/O procedure; actual new-scan writer/finalisation evidence required for its retirement. |
| T532 | Native evidence and final handoff | Original runs/bundles intact; each qualified or pending cause has evidence, owner and next step. |

### Operational exercises

**O51 — next useful authorised diff assessment.** Establish actual installed/native route binding and exact review coverage for the real target, including workflows and remaining omissions. Reuse the native assessment's original artifacts. This is not a replay of an entire unrelated implementation or a new synthetic adoption campaign.

**O52 — Windows artifact-workaround retirement, only if pursued.** A fresh native scan, actual required identity/writer, no workaround, native completion and retained-bundle retrieval, with restart readback where required by the issue's acceptance. Otherwise mark not-run/not-in-scope and keep the procedure. O52 not being pursued does not stop W5-WORKFLOW qualification.

### Sensitivity without a shadow selector

For T527, supply two small literal path lists of equal length in a test-only comparison exercise, one with a required workflow replaced by an unrelated path. The comparison must expose both missing and unexpected entries. Do not mutate native scan output to create this control. This tests the oracle's sensitivity, not the installed selector.

For source-level #820 regression sensitivity, reuse genuine prior installed output if available or the upstream regression's preserved pre-fix test evidence. A source-only old/new helper execution is labelled source qualification. No dependency download, plugin modification or historical downgrade is authorised solely to obtain a red result.

## 12. Failure behavior and recovery

| Condition | Required action | What is prohibited |
|---|---|---|
| Update not available / old helper still effective | Record capability dependency, owner and specific reassessment event. | Repeated scans, manual cache patch or invented propagation deadline. |
| Installed helper cannot be located safely | Use supported installed guidance/context; record unavailable exposure. | Treating a same-name GitHub file as the installed helper. |
| Helper errors and old output exists | New attempt remains failed; preserve raw failure and original artifact separately. | Using the old list as current output. |
| Required workflows remain missing | Keep matching workaround/assurance gap; investigate source/runtime/target attribution. | Adding files by hand to native inventory or weakening expected sets. |
| Workflows present, other required paths absent | Separate repaired cause from incomplete target; use only accepted scope alternative. | Calling the whole native review complete. |
| Native inventory differs from direct helper | Check actual target/mode/pluginRoot/runtime and artifact freshness. | Overwriting the native list or silently retargeting the scan. |
| Input changes during inventory/review | Preserve earlier identity; follow supported continuation/reverification. | Retrospective hash refresh. |
| Review pagination or native artifact read incomplete | Preserve scan identity and missing page/read error. | Counting total/first page as complete. |
| Artifact writer denied | Retain access failure; apply only an already authorised exact operation or stop. | Broader ACLs, bypass of DCG, arbitrary host execution. |
| Native scan blocked | Use installed recovery and existing budget; hand over same scan honestly. | Replacement scans or forged failure/cancellation/sealing fields. |
| Native security finding discovered | Preserve/report through accepted native workflow and appropriate restricted channel. | Fixing/publishing/closing it under inventory-only authority. |
| New unsupported edge case found | Record scope, evidence and relevant upstream follow-up if separately authorised. | Expanding WP5 into a general selector rewrite. |

Preserving a named reference or hash is not preservation of missing bytes. Keep the entire required native bundle and relevant precheck evidence in the approved store with original relative relationships, raw errors and candidate identities. Local scratch follows existing retention/consumer rules; no new cleanup automation is selected. [R03; P02]

## 13. Scope and workflow retirement decision procedure

Perform the following decision against the **specific future target**, not a global version number:

1. Is the installed/native selector identity or attributable capability known? If not, keep qualification pending.
2. Did all required workflow cases for this surface/mode pass? If not, W5-WORKFLOW remains applicable where actually authorised.
3. Are all required real-target paths and content sides accounted for? If not, retain the corresponding W5-OTHER-SCOPE gap/accepted alternative; workflow repair alone does not make the route complete.
4. Is the actual required writer available or covered by an exact existing procedure? If not, the native assessment cannot claim completion.
5. Does the actual desktop or terminal route use the qualified target/helper and perform its native obligations? If not observed, distinguish helper qualification from operational adoption.
6. Has the owner accepted the particular workaround retirement? Record its cause, host/channel, modes, effective identity, evidence and remaining procedures. Do not retire a procedure merely because its wording says “temporary.”

Keep historic alternative review valid for the scope it actually reviewed. Do not relabel it a native scan or require an automatic retrospective scan of all already accepted changes. A newly discovered material assurance gap is its own accountable triage, not permission to erase prior evidence.

## 14. Proposed acceptance criteria

| ID | Criterion | Required evidence |
|---|---|---|
| AC5-01 | Parent scope and authorities preserved | Accepted qualification scope; no implied install/scan/config/Git authority. |
| AC5-02 | Actual installed capability identified | Host/channel/runtime and helper identity where exposed; unavailable facts explicit. |
| AC5-03 | Supported update/readback | Actual update and effective post-update observation, or justified no-update/pending state. |
| AC5-04 | A10 core workflow modes qualified | Actual installed-helper results for workflow-only/mixed `.yml`/`.yaml`, committed and supported local states. |
| AC5-05 | Independent complete accounting | Native Git denominator and independent E/R, exact differences, rename/deletion/content-side dispositions. |
| AC5-06 | Unchanged/unsupported boundaries truthful | Repository-ranking, other exclusions, type/binary/filename/partial-staging behavior explicitly scoped. |
| AC5-07 | Used native route bound | Actual desktop paged inventory or supported terminal route confirmed for the claimed operational surface. |
| AC5-08 | Failure evidence preserved | Errors, stale outputs, movement, unavailable pages/writers and original scans cannot become successful assessment claims. |
| AC5-09 | Workflow-only retirement is cause-specific | Exact evidence and owner decision for W5-WORKFLOW; W5-OTHER-SCOPE separately assessed. |
| AC5-10 | Windows artifact boundary preserved | Procedure retained or separately qualified through a fresh actual native scan without the workaround. |
| AC5-11 | Policy/verification integration complete | Exactly approved documentation, routed checks and independent review on the actual maintained candidate. |
| AC5-12 | Handoff and adoption limits explicit | Recorded completed/pending scope, next actor/event and retained native artifacts; no auto-adoption elsewhere. |

An unqualified required mode means that mode is pending, not “passed with caveats.” Optional/unused routes may be not-applicable only with evidence. Count actual observations, not the number of rows in a filled template.

## 15. Completion, rollback and reassessment

Use one of these states in the existing record:

| State | Meaning |
|---|---|
| **Installed capability pending** | Source fix known, but actual host update/helper behavior or required evidence is unavailable. |
| **Installed selector qualified; native-route confirmation pending** | A10 fixture behavior demonstrated through the installed helper for named modes, but an asserted desktop route has not yet been observed. |
| **Workflow selection qualified; other scope/artifact obligations retained** | Qualified native selection and scoped workflow disposition; unrelated limitations remain active and named. |
| **WP5 accepted for the recorded environment** | Required used surfaces, actual route, exact policy decision and evidence are accepted; Windows procedure may still legitimately remain under its separate unresolved cause. |

A10 does not require every Codex Security limitation to be fixed. Conversely, upstream availability alone is not WP5 completion. Do not insist on zero findings, zero retained workarounds, or a universal “all hosts” pass.

If a candidate update regresses required coverage, preserve its failed evidence and use the operator's supported rollback or supported containment decision. Do not manually restore plugin caches, change native exclusions, or claim an old completed scan qualifies the new target. Any rollback is bound to its actual identity and previous qualified scope; update/restart behavior must be rechecked as appropriate. Independent accepted work can continue under unchanged authorised controls.

Reassess when the relevant host/engine, plugin, helper/dependency, native inventory/scan contract, accepted policy, writer identity, permission boundary, or target/mode changes. Do not rerun the entire fixture catalogue after every unrelated application edit; retain every-review path reconciliation and rerun only affected qualification boundaries plus the actual required profile.

### Final handoff statement — fill only with actual evidence

> WP5 is [state] for [actual host/channel/plugin/native route] at [observed effective identity]. Installed inventory qualification [evidence] covers [modes and path/content boundaries]. The frozen real target is [base/head/local identity]; [required paths] are covered by [method], with [remaining omissions] dispositioned at [reference]. W5-WORKFLOW [retired/remains/not present] because [evidence and owner decision]. W5-OTHER-SCOPE [disposition]. W5-WINDOWS-IO [retained or separately retired] on [actual evidence], with no broader permission or scan claim. Native scan [ID/status, or not started] retains its original [bundle/incomplete artifacts]. The next action belongs to [actor] at [trigger]. Qualification does not imply other-host adoption, product publication, cleanup or Issue closure.

## 16. Supplied artifacts and verification limits

The package includes this plan, exact proposed policy text, an operator worksheet, a fixture recipe, a verification catalogue and a small native-Git/oracle mechanical-check script with its actual result. None is installed into the repository or plugin by delivery.

The mechanical check creates only fresh owned local synthetic Git data, exercises native diff/index/path observations and an exact-set comparison, and makes no network requests. It does not execute Codex Security, a scan, workflow jobs, repository product code, a Windows host, or the candidate native inventory helper. Its results must not be counted as T501–T532 or operational O51/O52. All those proposed qualification scenarios remain `not-run` in the delivered catalogue.

## 17. Source index and evidence classification

**P** entries are user-supplied planning/observation sources. **R** entries are refreshed repository or official primary sources. Proposed implementation choices in this document are new recommendations, not claims that a standards body or upstream project mandates them. Native source behavior is distinguished from actual local host evidence throughout.

- **P01.** `../implementation-plan.md`, supplied parent, especially WP5 and A10; read directly from the uploaded file. SHA-256 is retained in the package integrity inputs.
- **P02.** `sdlcworktreelifecyclehandoff20260910.md`, supplied observations; historical worktree identities, preservation questions and scope boundaries, not proof that worktrees are abandoned or currently unchanged.
- **P03.** Supplied WP0–WP4 detailed plans, used only for interface/dependency boundaries; their existence is not deployment evidence.
- **R01.** PR #820 metadata: <https://github.com/openai/codex-security/pull/820>. Refreshed merged status and merge time; test counts in its description are author-reported, not rerun here.
- **R02.** PR #820 four-file patch: <https://github.com/openai/codex-security/pull/820/files>. Exact inclusion-predicate and regression-assertion changes.
- **R03.** Universal Ontology SEC-01 integration: <https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/codex-security.md>. Existing coverage precheck, alternatives, native ownership and Windows operation boundaries.
- **R04.** Universal Ontology main observation: <https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main>. Returned `79d187802f9255134c03d0786ff75181ed1070ee`; mutable endpoint.
- **R05.** Canonical helper: <https://github.com/openai/codex-security/blob/be7807de836b9c0aaca696c4f6b8b985097c26a5/plugins/codex-security/scripts/generate_in_scope_files.py>. Blob `3dfa4a7561851066ae636470a75e1f9dea0c9361`.
- **R06.** Diff/ranking helper: <https://github.com/openai/codex-security/blob/be7807de836b9c0aaca696c4f6b8b985097c26a5/plugins/codex-security/scripts/generate_rank_input.py>. Blob `05c5b15216af48a8384c18a2aa20153994d0d0b7`; relevant CLI, exclusion and changed-path sections inspected.
- **R07.** Preview extensions/content behavior: <https://github.com/openai/codex-security/blob/be7807de836b9c0aaca696c4f6b8b985097c26a5/plugins/codex-security/scripts/rank_preview.py>. Blob `a5f48e7988a7d7deac0f2a31ec4f92846cdc7ca1`; extension list and binary sampling inspected.
- **R08.** Desktop preparation/paging: <https://github.com/openai/codex-security/blob/00afa60adc3f39850b0f903fc77036ecbff04539/plugins/codex-security/mcp-app/src/artifact-inventory.ts>. Blob `8a6f2b200f007f61c2ad1bfcefa580abde6355fe`.
- **R09.** Current inspected native diff workflow: <https://github.com/openai/codex-security/blob/00afa60adc3f39850b0f903fc77036ecbff04539/plugins/codex-security/skills/security-diff-scan/SKILL.md>. Blob `af59e39c25249bcbda53cf1ddcc012d2ee8dd3a6`.
- **R10.** Separate Windows writer issue: <https://github.com/openai/codex/issues/43791>. Open at readback; original report distinguishes inventory from artifact access.
- **R11.** Post-merge source comparison: <https://github.com/openai/codex-security/compare/be7807de836b9c0aaca696c4f6b8b985097c26a5...00afa60adc3f39850b0f903fc77036ecbff04539>. Retrieved two-commit comparison; no inventory helper changes listed.
- **R12.** ONI PR #4: <https://github.com/MaksymShostak/oxygen-not-included/pull/4>. Refreshed head `f92f16d943cb612350b706c8479358245671894c`, specific R2 direct-review authority and 70/164 historical observation.
- **R13.** Existing adoption record (parent-referenced baseline): <https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/adoption.md>. Historical operational scope remains distinct from new observations.
- **R14.** Official OpenAI plugin management: <https://help.openai.com/en/articles/20001256-plugins-in-codex/>. Retrieved current guidance distinguishes marketplace sync, individual refresh, list refresh, access and installation. No #820 rollout deadline was established.
- **R15.** Official Git diff output: <https://git-scm.com/docs/git-diff-tree>. Native NUL-delimited name/status and rename representation. Use installed `git diff --help` for actual command availability; no Git upgrade selected.
- **R16.** Official Git index/untracked enumeration: <https://git-scm.com/docs/git-ls-files>. Stage and untracked/ignored selection semantics.
- **R17.** Native source distribution list: <https://github.com/openai/codex-security/blob/00afa60adc3f39850b0f903fc77036ecbff04539/plugins/codex-security/plugin-files.json>. Search/source discovery confirms inventory helpers are distribution entries; not proof of deployed copies.

The actual Windows environment, native installed plugin, retained private logs, live scans, CI jobs and source qualification suites were not accessed or executed for this research. The independent synthetic Git/oracle check is identified separately. This preserves the distinction between a usable implementation plan and evidence that its implementation has already succeeded.
