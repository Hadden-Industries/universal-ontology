# WP6 — Reuse the accepted-plan adaptation and align local/remote preflight

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

## Implementation proposal and acceptance boundary

This is the detailed implementation plan for **WP6** in `../implementation-plan.md`. It preserves the parent’s terminology, responsibilities, priority and A11/A12 acceptance boundaries. It does not implement the change, approve the converter, create an accepted baseline, grant GitHub or installation authority, or claim that the proposed tests have run. [P0]

**Priority:** P1 for the Oxygen Not Included (ONI) trusted-baseline blocker; P2 for general SDLC adoption improvement. **Accountable owners:** the SDLC maintainer and each adopter’s trusted-base policy owner. Max accepts changed policy, scope and consequential decisions through the existing procedure. P1/P2 here are delivery priorities, not R1/R2 risk classes. Propose **R2 for the material baseline-policy/trusted-validator increment**, because it affects acceptance linkage and the trusted/untrusted execution boundary. Preparation and read-only inspection do not acquire implementation authority merely by being in this plan.

**Selected direction:** reuse ONI’s small `_sdlc_baseline.py` and its actual consumer/test adaptations; retain the Issue-snapshot route; strengthen native object identity at the trusted boundary; use existing commands for a small preflight and remote readback. Do not build a Markdown requirements engine, new baseline database, universal preflight runner, approval oracle, release gate aggregator, or cross-repository installer.

**Deliverable:** an accepted and tested two-format baseline contract in the actual trusted consumers, concise operational guidance at existing task/handoff points, and a current ONI handoff with the real dependency-review outcome and owner disposition. Fixing baseline linkage does not by itself make all ONI product or release checks pass.

The code, wording and test designs below are proposals. “MUST” and “MUST NOT” identify proposed project requirements where used; they do not assert an external standards mandate. References distinguish supplied plans, inspected repository evidence and external primary documentation.

Companions: [proposed policy amendments](policy-amendments.proposed.md), [preflight/remote worksheet](preflight-and-remote-handoff.proposed.md), and [verification catalogue](verification-catalogue.proposed.json). These are implementation aids, not independent acceptance authorities.

## 1. Parent traceability and current evidence

### 1.1 The two parent acceptance criteria

| Parent criterion | Preserved requirement | WP6 implementation boundary |
|---|---|---|
| **A11 — trusted baseline** | Accepted Issue and committed-plan routes work at the trusted base; traversal, candidate-only or altered content and fake acceptance fail. | Native path/blob integrity and format/linkage checks, plus independent verification of actual acceptance. A non-placeholder string is not authenticated approval. |
| **A12 — remote readback** | Handoff identifies exact PR head/run/attempt and failed dependency gate, not just local or aggregate success. | Current PR and exact workflow/job observations, distinguished from policy execution revision, tested product revision and historical narrative. |

The parent explicitly requires retaining the current Issue-snapshot contract, avoiding a fictitious converter Issue, landing policy support separately before relying on it, and preserving trusted `pull_request_target` execution. It calls for a small preflight, not another universal dossier. [P0]

### 1.2 Refreshed observation boundary

The parent’s investigation is historical. These new reads were made for WP6 on 10 September 2026; re-read mutable refs and decisions before implementation.

| Object | Observed identity/result | Consequence |
|---|---|---|
| Universal Ontology (UO) `main` | `4aeae598b12aa005570bfe597b820fdf6aad706a`; PR #34 merged at `2026-09-10T19:02:17Z`, described as capturing WP1’s accepted baseline. | Do not use `79d1878` as current main or infer that WP1’s implementation has landed. The inspected validator remains Issue-only. [S01, S04] |
| ONI PR #4 target | Base `975acf599d06ec3d274c55bac8d1731278ffa153`; head `c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1`; draft/open at read. | The PR description’s `f92f16d…` candidate is stale. Use native current metadata, not the narrative, for execution identity. [S02] |
| ONI adapter | `_sdlc_baseline.py`, blob `87b181bb21e4434d7d00fe45d5376d6b19664c92`, at the observed candidate. | Reuse the existing three-function format contract, not a newly invented format. [S03] |
| Selected converter plan | `docs/plans/2026-09-08-steam-community-bbcode-implementation-plan-v2.md`; blob `28cf4f2b74026b4f79e6304e6ecc61bf8fdca1e8` returned at both base and head. | The document already exists at the base with the same reported blob identity. This is not proof of its human acceptance; native tree mode and full readback remain implementation checks. [S11, S12] |
| ONI trusted linkage run | Run `34524389602`, attempt 1, `pull_request_target`, failed. Job `103029579766` checked out `975acf5…` and emitted `SDLC PR linkage failed: Invalid baseline path.` | The current remote failure is the actual trusted consumer, not merely an old plan note. [S16, S17] |
| ONI BBCode checks | Run `34524391937`, attempt 1; dependency review failed; converter and mutation matrix jobs skipped; aggregate failed. | Early dependency gating is already implemented and operating. Preserve it; do not re-propose the old mutation-job split or mark skipped work passed. [S13–S15] |

The two inspected trusted linkage workflows are byte-identical at their observation revisions: they use `pull_request_target`, check out `${{ github.sha }}`, install only trusted policy dependencies, give the validation step a read-scoped token, and execute the policy validator rather than candidate code. [S09, S10]

### 1.3 Current dependency failure, not the obsolete form-data summary

The decoded dependency-job log for job `103029588085`, run `34524391937`, attempt 1, reports two **moderate** vulnerabilities in `tools/steam-community-bbcode/comparison/node/package-lock.json`, package `qs@6.5.5`: `GHSA-6rw7-vpxm-498p` and `GHSA-4mjr-xmp4-gh2g`. The final error is vulnerable dependencies, not merely the earlier snapshot warning or the separate Scorecard warnings. These are observations of that job, not a fresh reachability assessment or remediation recommendation. [S15]

Its configuration fails on severity **low** and above, across **runtime, development and unknown** scopes. A statement that the packaged production graph has no audit findings, or that a comparison audit has no high/critical findings, does not satisfy this differently scoped/thresholded check. [S13, S15, W08, W09]

The newest candidate commit describes revised local performance/licensing dispositions and supersession of unsupported prerequisites. The still-old PR body must not be copied into WP6 as current acceptance authority. At execution, read the actual owner decisions and current execution/release documents; neither an old narrative nor a commit-message claim independently proves an approval. WP6 does not reopen the converter’s product requirements or impose independent counsel/universal renderer qualification. [S02, S16]

### 1.4 Explicit limits of this research

No user Windows worktree or installed agent was accessed. No user repository was changed. No proposed validator, remote workflow, security scan, dependency repair or release was executed. Current workflow/job data and existing decoded logs were read; this is not a rerun. Branch/ruleset enforcement was not established, and the contradictory-looking branch summary fields are not interpreted as an enforcement guarantee. The historical worktree handoff remains observations and questions, not a disposition decision. [H0]

A small native-Git/codec probe accompanies this plan and is described in §12. It does not satisfy A11/A12 or the implementation regression catalogue.

## 2. Scope, responsibilities and dependencies

### 2.1 In scope

Implement the canonical committed-plan path/text/reference contract alongside the real Issue JSON path; bind accepted plan text to native immutable blob identity at the trusted base; preserve local start/resume and verification freshness semantics; test candidate-forged input and trusted execution boundaries; perform a minimal capability preflight; record actual remote status and the owner’s dependency disposition. Review actual setup/projection and check-selection consumers so the new module is not omitted when the accepted SDLC subset is adopted.

### 2.2 Out of scope

No Markdown parser or renderer for validating requirements. No conversion of accepted plans into fake Issue snapshots. No new baseline JSON format or central acceptance registry. No candidate validator or package lifecycle code in a credential-bearing trusted-policy job. No token expansion, automatic repository/Issue creation, dependency installation, merge, push, rebase, publication, plugin cache patch, guard exception, risk downgrade, branch-rule change, ignored failure or automated cleanup. No automatic adoption in WebVOWL or any fourth repository.

Do not reduce mutation thresholds or inherited product assurance as a consequence of adding preflight. Do not repair `qs` or change an exception policy under baseline-format authority alone. Those decisions may be delivered in an already accepted adopter work item, but have their own exact scope and evidence.

### 2.3 Responsibility assignment

| Responsibility | Accountable party | Required output in existing record |
|---|---|---|
| Accept the two-format contract and exact policy edits | Max / existing policy owner | Actual accepted revision, risk and configuration decisions |
| Maintain common baseline logic and regressions | SDLC maintainer | Source provenance, qualified change and regression evidence |
| Land ONI trusted support | ONI trusted-base policy owner | Separately reviewed policy increment and actual trusted revision |
| Verify plan acceptance | Existing independent reviewer/accountable decision-maker | Attributable decision, matching exact plan content and scope; explicit gaps |
| Preflight current work | Existing task coordinator | Small ready/blocked/unknown summary with next actor, not a new dossier |
| Disposition dependency findings | Accepted dependency/security owner | Exact finding/graph/use boundary and approved resolution or hold |
| Read back remote result | Task/PR handoff owner | Actual refs, run/attempt/job identities, findings and remaining decisions |

These are responsibilities, not instructions to spawn additional agents. Independent assurance follows the accepted R2 scope; installed roles do not mandate reviewer fan-out.

### 2.4 WP0–WP5 and WP7 integration

**WP0:** the six retained worktrees and their evidence are not fixtures. Their presence need not stop work in a new owned checkout. Do not import their old active state or clear it to start WP6. **WP1:** preserve whatever text/persistence repair actually lands; use strict UTF-8 at GitHub/JSON text boundaries and do not transplant ONI’s older verifier over it. **WP2:** retain exclusive start and separate-worktree ownership; baseline adaptation is not a concurrent-writer mode. **WP3:** use its adopted status/handoff contract where present; do not infer it has landed from the uploaded proposal. **WP4:** a guard denial is a recorded unavailable operation, not a reason to use a different interpreter. **WP5:** consume actual native inventory/writer qualification; do not reproduce its selectors or retire unrelated workarounds. **WP7:** consume its future cadence rules without making them a dependency for the urgent trusted-baseline repair. [P1–P5]

## 3. Selected baseline contract

### 3.1 Preserve two existing representations

| Concern | Issue snapshot | Previously accepted committed plan |
|---|---|---|
| Stored representation | Existing `accepted-baseline.schema.json` JSON | Existing opaque UTF-8 `.md` text |
| Canonical location | Existing `docs/sdlc/baselines/issue-N/vN.json` | Existing `docs/plans/.../*.md` location contract |
| Admission | Actually accepted Issue revision; existing baseline-only route before implementation | Plan already committed in trusted base; actual acceptance verified independently |
| PR metadata | Existing Issue, risk, baseline, acceptance IDs and functionality fields | Same fields, `Change issue: none` permitted where appropriate; one `Baseline acceptance:` field |
| Acceptance references | Existing `AC-NNN` references in the actual Issue body | Existing JSON array of distinct exact source-line references |
| Validation authority | Maintained native JSON Schema plus real Issue content/labels | Small format/integrity helper; no Markdown semantics engine |
| Human approval | Separate from supplied acceptance metadata and schema pass | Separate from non-placeholder reference, blob presence and source-line matching |

Keep R0/R1’s existing option of an accepted task/normal PR without an artificial Issue or baseline. Preserve R2/R3’s selected profiles and prior-baseline requirements. A plan is an alternative accepted representation, not a risk exception. If a plan PR also links an Issue, preserve the applicable real Issue checks; do not skip them simply because the baseline suffix is `.md`. [S03–S08]

### 3.2 Reuse the existing three functions

Start with ONI’s actual `is_canonical_plan_path`, `require_plan_text`, and `require_acceptance_reference`. Import only the relevant changes into UO; reconcile each adopter’s existing overlays. In particular, ONI’s local snapshot helper has explicit origin-repository handling and older verification behavior that must not be copied wholesale into UO. [S03, S07]

The helper remains a leaf or near-leaf module: format checks and shared immutable-baseline value handling, not GitHub requests, authentication, lifecycle orchestration or Markdown parsing. Native Git/GitHub reads remain owned by the existing local/remote consumers.

Maintain clear names. Do not rename a reference validator to `verify_approval`, call a parsed plan an authenticated acceptance, or silently broaden a helper that only compares linkage.

### 3.3 Exact canonical path contract

Select formats by the maintained canonical location contract, not a failed JSON parse followed by a permissive Markdown fallback. The selected plan path must be a string, repository-relative, POSIX-separated, canonical as written, under `docs/plans`, with a nonempty filename and exact `.md` suffix. Retain ONI’s rejection of absolute paths, traversal components, backslashes and normalized aliases. Reject NUL/control characters and Windows stream/drive ambiguity (`:`); do not normalize a rejected path into acceptance.

The current PR line contract captures a non-whitespace path. Preserve that limit in this increment rather than silently promising space-containing baseline paths. The repository checkout location itself may contain spaces/Unicode and must work. Unicode and bracket characters in an otherwise supported filename are not shell syntax: use literal object lookup, not an arbitrary ASCII-only naming rewrite.

Use exact path components in Git and API tree lookups. Reject a path that resolves through a symlink/junction locally, a Git symlink in the selected tree, a submodule, a directory, an ambiguous match or an unsupported host path. Do not implement an entire Windows pathname normalizer; report unsupported exact paths. Percent-like text is literal data, not an invitation to decode it twice. Do not follow a supplied URL or remote from the baseline field.

Before adopting additional guards, add the independently expected path cases; preserve admitted legitimate paths. `PurePosixPath` canonicalization alone is not proof of native filesystem containment or Git mode. The adapter’s small scope remains deliberate. [S03, W03–W07]

### 3.4 Exact text and reference contract

Read a plan as bytes, decode **strict UTF-8**, require nonempty/non-whitespace text and no NUL, and retain the original bytes for identity. Do not trim, case-fold, newline-normalize, replace undecodable bytes, render, execute code fences, expand inclusions, fetch links or repair mojibake. BOM handling, when present, must not erase byte identity. A file that cannot be decoded or unambiguously represented is an actionable format failure, not an opportunity to select a different decoder.

Keep the existing acceptance-reference placeholder rejection (`none`, `n/a`, `-`, `pending`, empty/blank, case-insensitively). Require exactly one well-formed metadata field when the plan route is used. Duplicate valid or conflicting fields must fail instead of selecting the first. A plausible string is still only a reference.

For plan `Acceptance IDs implemented`, retain the existing JSON-array contract: nonempty, distinct nonblank strings, each identifying an exact source line appearing once in the accepted text. Preserve line contents; do not resolve a heading slug, case-insensitive substring or current rendered DOM. Duplicate source lines make that reference ambiguous. These checks establish linkage, not substantive implementation coverage. The reviewer still tests the selected behavior. Do not insert fabricated `AC-001` markers into already accepted plan bytes merely to conform to the Issue representation. [S05]

### 3.5 Resolve the apparent “fake acceptance” tension explicitly

The source helper deliberately does not authenticate acceptance. The parent likewise states that identity is not approval. Preserve that distinction while satisfying A11 at the **complete acceptance boundary**, rather than weakening it or claiming impossible evidence from a string. [P0, S03–S06]

Use the existing owner decision/task/Issue/PR review as the acceptance authority. The independent decision check must establish: who actually accepted; their authority for this repository/scope; the inspectable decision and context; which exact plan revision/content it refers to; any subsequent accepted amendments; and that acceptance precedes reliance on it. Where an older decision names a file/version rather than a blob, the reviewer explicitly binds its retained exact content to the current native blob. If that mapping cannot be established, obtain clarification/reacceptance through the existing decision process rather than invent a timestamp.

A quoted “I approve,” a matching author name, an agent-generated receipt, `Baseline-only: yes`, an `acceptedBy` field, or the fact that a document is committed does not establish that decision. An unavailable/private decision may be reviewed through the approved restricted route, with a safe reference in the public PR; do not publish private chat content automatically.

**Automated linkage may pass for a syntactically plausible but fabricated reference. That is not acceptance and MUST NOT be reported as it.** Keep the validator’s explicit non-approval output. A negative automated test proves that no approval state is emitted or granted; operational exercise O61 proves the accountable acceptance gate rejects a fabricated, wrong-author, wrong-scope, candidate-only or wrong-content reference. If branch enforcement is claimed, inspect the actual native rule and required human review; otherwise report the limitation and retain operator-controlled merge authority. Do not silently invent a signed-attestation subsystem or claim CI authenticates arbitrary chat references.

This plan does not turn an unsupported A11 claim into a pass. If the actual deployment lacks both inspectable acceptance and a working accountable acceptance gate, A11 remains unqualified until the owner establishes them. Configuring a missing native enforcement mechanism needs its own exact approval; a YAML file is not proof that protection exists.

## 4. Bind native object identity without executing candidate policy

### 4.1 Distinguish four revisions

Use explicit identities in the existing evidence:

| Symbol in this plan | Meaning |
|---|---|
| **P** | Exact trusted policy revision actually executed, including its validator/schema/dependencies |
| **B** | Actual PR target/base revision against which prior baseline presence is checked |
| **H** | Actual candidate head revision |
| **T** | Actual product revision tested by a job, which may be a synthetic merge rather than H |

These symbols explain the procedure; they do not mandate new schema fields. P and B happened to match in the observed ONI linkage job. Never assume that they must always match. H and the merge object T are also distinct. The API’s workflow `head_sha` does not prove which policy checkout ran. Inspect the selected ref and actual checkout result. [S09, S10, S16, S17]

For the observed dependency run, the retained logs identify a product checkout of `5b4a9b95d8976cddc971cca3c8fdea3f03525321`, combining the observed B/H, while the API run head is `c8b9d0…`. Do not label that job a direct H-only test. [S15]

### 4.2 In-memory baseline object, not a new persisted format

Pass an explicit internal value between trusted readers and linkage validation containing repository, full revision, exact path, mode/type, Git object ID and raw bytes. The decoded Issue object or plan text is a projection of those bytes. An immutable dataclass is reasonable if it makes the boundary clearer; it is not an additional accepted-baseline file or migration.

Do not compare a JSON dictionary with a Markdown string through unchecked duck typing. The validated path selects the representation, the reader returns the corresponding object, and the maintained consumer validates it. Existing Issue dictionaries continue through their schema/title/body/risk/repository/version checks.

For a selected plan baseline required prior to implementation:

- B contains the exact regular-file entry at the canonical path; H contains that same entry with matching blob bytes/object identity and unchanged selected-file mode.
- The selected plan is not introduced, edited, deleted, renamed away, renamed into place, or type/mode-replaced in the implementation PR. Inspect both current and previous filenames and native mode metadata.
- The relevant local baseline bytes match the committed object for local routing. A local HEAD containing a plan proves local presence, not trusted-base admission; the remote preflight supplies the latter.
- Independent acceptance is bound to those exact bytes and the relevant accepted scope. Equality between B/H alone cannot rescue an unrelated or unaccepted plan already present in B.

Record Git object identity as a Git object identity. Do not label a Git blob SHA as SHA-256 of the file. A separate content SHA-256 may be retained for an approved evidence locator, but is not a replacement for native tree/revision linkage.

### 4.3 Local reader

Reuse native Git object reads. Resolve full commit identities with the supported native command, find the exact tree entry with literal path semantics and NUL-delimited output, validate its mode/type, then read the object with `git cat-file blob <object-id>`. Do not use text-converting filters, external diff helpers, working-tree checkout or a rendered document as the prior baseline. Git owns tree/object semantics. [W06, W07]

Reuse `require_repository_file` and its containment checks for the actual local file; add a parent-link/junction regression where required for this baseline use. Report inability to establish containment rather than following a redirected path. Compare bytes after selecting the actual file. Fingerprinting/verification must continue to invalidate source/baseline/control movement; do not update stored task digests silently.

The `.venv` and lifecycle state belong to their physical checkout. A separate trusted-policy check must not use `sdlc begin` in another owner’s active worktree. Keep WP2’s acquisition behavior intact. A pause/resume is an explicit existing lifecycle transition, not an automatic response to another task progressing.

### 4.4 Remote reader

Use the existing read-scoped `gh api` boundary and native Git Data endpoints. Pin every read to full revisions/objects obtained from authoritative repository/PR metadata. Resolve the commit’s tree, walk the selected path components, require ordinary tree parents and a regular-file blob leaf, then fetch that blob. Check native response type/ID, decoding, advertised byte length and any bounded reader limits before handing data to the format validator. Reject truncated or incomplete tree evidence. Walking exact component trees avoids treating a truncated recursive listing as absence. [W04, W05]

GitHub’s Contents API can return a symlink target’s file content. Therefore, `type: file` plus successful text decoding is not sufficient proof that the selected Git entry was a regular file. Establish mode through native tree data, and do not follow symlinks/submodules. This is the specific reason for strengthening the existing remote reader. [W03]

Use strict UTF-8 for the GitHub JSON transport and the plan text. Decode native base64 strictly after its documented line wrapping is handled; verify returned size and object linkage. Report a 403/rate-limit/network failure differently from a proven path missing from a complete tree. Do not catch all failures and substitute `None`, a cached old baseline or the candidate’s file. Never execute `download_url`, follow a baseline-provided URL, or import Python from candidate content.

For a fork, identify B in the base repository and H in the head repository as supplied by the authoritative PR. Verify both repository identities and access. When a commit cannot be read through the approved route, report the unavailable boundary; do not broaden credentials or check out candidate code as recovery. Limit endpoints to the intended GitHub host/repository and native GET operations. Candidate-controlled names/text must stay data, never shell interpolation.

Choose finite input/read limits explicitly in the accepted implementation. Retain the current practical small-document boundary; do not silently change how very large baselines are supported. Document the chosen limit and test its boundary. A limit error is not an empty-plan pass.

### 4.5 Preserve existing Issue-snapshot behavior

Retain the maintained schema, live Issue number/repository/risk labels/state checks, exact title/body checks, UTF-8 body digest, path/version correspondence, prior protected-base presence and baseline-only directory restriction. Do not normalize Issue body content to make a mismatch disappear. Preserve failed historical captures, including Issue #25’s distinct v1/v2 evidence. [S04–S06, P1]

Transport may carry raw objects for both formats, but do not silently impose a different Issue baseline policy while introducing plan support. Any newly discovered Issue gap gets a tested, accepted disposition. In all cases, previously accepted snapshot files may not be modified by the implementation PR. Plan support does not grant that authority.

### 4.6 Freshness and adversarial candidate tests

Retain the validator’s first/last PR base/head/body readback and applicable Issue movement checks. Fully account for changed-file pagination, expected count and renames; do not use the first page as a complete list. Reject relevant movement during validation. Record a stale outcome instead of extending a success onto the new target. [S04, S05]

Use a synthetic candidate containing a script that would create a sentinel if imported. The trusted validator must read only its baseline/metadata as data; the sentinel stays absent and a process-call spy proves no candidate script, hook, build, `npm install`, action, or package dependency is dispatched. This is a fixture with no live token, not a real privileged exploit test.

## 5. Small preflight at existing routing and handoff points

### 5.1 The selected minimum

Use a short section in the existing task/PR/handoff. It records the current P/B/H or local candidate identity, each necessary capability and the next actor. It is not a new file per run, universal schema, background observer or mandatory checklist for every R0 edit.

| Boundary | Evidence to reuse or obtain | Stop only what depends on it |
|---|---|---|
| Actual acceptance and baseline | Inspectable decision; exact regular-file blob at B and H; selected trusted consumer can parse and link it | Baseline-dependent qualification/acceptance; unrelated authorized work may continue |
| Native security inventory | Installed capability and exact required path accounting from WP5; existing scope-specific alternative when accepted | The unsupported assurance claim, not every engineering activity |
| Required artifact writer | Actual writer/identity/directory qualification, separate from inventory | Native assessment completion if its required writer is unavailable |
| Dependency policy | Actual native action/version, threshold/scopes, selected graphs and accepted dispositions | Expensive dependent qualification or merge claim blocked by the unmet policy |
| Runtime/tools | Actual required native executables, relevant versions and `.venv`/locked requirements availability | Commands whose prerequisites are unavailable; no silent install or global fallback |
| Remote enforcement when claimed | Actual applicable required checks/rules and approvals | Enforcement/merge-readiness claims not established by inspectable native data |

Outcomes are **ready for the stated next step**, **blocked**, **unknown/unavailable**, or **not applicable with reason**. None means product approval. A completed preflight must not run the full product suite as its own prerequisite. Consume still-current evidence instead of restarting scans or installing every optional tool.

### 5.2 Reuse the actual trusted validator locally

Do not add `sdlc preflight` or a new online check to `begin`, `status` or the Stop hook in this increment. The existing validator can be exercised through its current event/environment interface from an independently trusted policy checkout. [S04–S06, S09, S10]

For a PR that exists, retain one actual native PR read; create a temporary **input snapshot**, clearly labelled as local preflight rather than a delivered GitHub event, with the real PR number and head/base objects required by the existing entry point. Bind its digest and observed P/B/H in the current handoff. Execute `scripts/validate_sdlc_pr.py` from P with that checkout’s approved interpreter and only the existing read authority. Its own live re-read prevents a stale input snapshot from passing unchanged-target validation.

Conceptual PowerShell invocation, after actual variables and authority are established:

```powershell
# Run in the trusted policy checkout, not the candidate checkout.
# $PolicyPython, $PolicyScript and $CapturedEventJson are actual inspected paths.
# Provide GITHUB_REPOSITORY/GITHUB_EVENT_PATH only to this bounded child invocation.
& $PolicyPython -B $PolicyScript
if ($LASTEXITCODE -ne 0) {
    throw 'Trusted baseline linkage is unavailable or failed; retain the actual diagnostic.'
}
```

The complete child-environment recipe is in the companion worksheet. It changes only the child environment, leaves parent/global variables unchanged and never prints a token. It does not invent a CLI flag or run another checkout’s npm scripts to select the interpreter. A zero result is only linkage success. Required owner acceptance is still a separate reviewed fact.

Before a PR exists, inspect the actual trusted base and prospective metadata through the same pure validation kernel with explicit synthetic inputs. Label that result **prospective local compatibility**, not remote CI success. Do not invent a PR or owner approval to exercise it. If the existing consumer has no plan support, report that exact readiness gap before costly final qualification.

### 5.3 Reassessment triggers

Recheck the affected boundary when its relevant baseline, owner decision, policy revision, target base/head, PR metadata, inventory scope/plugin, artifact writer, dependency graph/threshold/advisory observation, mandatory runtime or credential capability changes. Do not attach a universal expiry or assume source fingerprints attest every external system. A new dependency advisory can alter a remote result without code changes; record its actual assessment time.

A tracked execution diary can invalidate workspace evidence when edited. Use the existing task/PR and native run store for ongoing status; promote an eventual summary deliberately. Do not exclude all Markdown from fingerprints or repeatedly edit the tested inputs solely to write the next status sentence. WP7 owns broader invalidation/cadence reform. [P0, P1]

## 6. Dependency-policy alignment: preserve native checks and current improvements

### 6.1 Diagnose the actual mismatch

For the ONI failure, record the exact lockfile path, `qs@6.5.5`, both observed advisory IDs, low threshold and all three scopes, native action pin, B/H/T and run/attempt/job. Distinguish graph inclusion, exploitability, accepted comparator-use scope and gate semantics. Moderate severity is not evidence of a false positive, and an approved limited use is not automatically an exception the action consumes. [S13–S15]

npm audit’s configured severity affects its failure threshold, not a claim that lower severities ceased to exist. Native Dependency Review also has its own diff/graph scope. A local audit and remote dependency-diff check need not have identical inputs even with the same nominal threshold. Compare them explicitly rather than implementing a second vulnerability evaluator. [W08, W09]

### 6.2 Owner-selected resolution branches

| Branch | Required decision and evidence |
|---|---|
| **D61 — compatible dependency remediation** | Separately approve the exact dependency change; retain pre/post graph and behavior evidence; run affected comparator/package checks and the actual remote review. Do not claim a patched version here without current native verification. |
| **D62 — native, precisely understood exception** | Bind actual advisory, package/graph, use and acceptance rationale; inspect the installed native action’s exception granularity and reassessment. If broader than the accepted scope, disclose that breadth and require explicit acceptance or choose another branch. |
| **D63 — justified boundary/architecture change** | Separately accept removing or isolating a dependency/use so the native assessed graph changes truthfully; retain provenance and affected behavior. Do not merely move a lockfile out of detection to hide it. |
| **D64 — remain blocked** | Preserve the failed outcome and next owner/action. Baseline-format delivery may complete while the feature’s dependency gate remains blocked. |

The pinned action documents `allow-ghsas` by advisory ID, not a manifest-scoped exception. A comparator-only acceptance must not silently become an exception for every affected occurrence. Raising the global threshold, excluding all development dependencies, disabling checks, `warn-only`, blanket permissions or `continue-on-error` are not routine WP6 repairs. [W08]

### 6.3 Keep the dependency-first DAG already present

ONI’s current workflow orders `dependency-review → converter → mutation`, keeps library/CLI mutation jobs parallel within their matrix, and has an always-evaluated aggregate that requires all required upstream groups to succeed. The actual current failure skipped the dependent groups and failed the aggregate. That is preservation evidence, not unfinished work for WP6 to rebuild. [S13, S14]

Inspect event-specific conditions: a dependency-review step skipped on a non-PR event is not a fresh successful dependency assessment. Likewise, an out-of-scope job/step has a different meaning from a required job skipped because its dependency failed. Report which occurred. Keep current check identities and rules unless an exact change is separately approved. Do not alter mutation thresholds, caches, qualification scope or job count merely to demonstrate preflight.

## 7. Current remote readback and trusted deployment sequencing

### 7.1 Land support before relying on it

The urgent adopter increment is a **separate trusted-base policy change**, not a merge of the converter to obtain its validator. Bootstrap that increment using the already supported, genuine Issue-snapshot policy route or an explicitly applicable pre-existing owner-approved configuration/bootstrap procedure. A real policy-change Issue is not a fictitious converter Issue. Do not retroactively create a fake converter acceptance record.

Implement and review the common adapter from ONI’s identified source with the shared tests. The ONI trusted-base increment can proceed when its own acceptance/evidence is ready; it need not wait for unrelated WP1–WP5 delivery. Reconcile the common change into UO as the maintained SDLC test bed, with actual adopter overlays and source identity documented. Do not create a general cross-repository synchronization mechanism or assume a UO merge updates ONI automatically.

Tests of candidate policy may run in the existing unprivileged candidate-test workflow, with synthetic data and no live approval credential. The real trusted linkage job continues to run P, not H. Do not set unsafe checkout options, download candidate artifacts and execute them, or install candidate requirements in the trusted job. [S09, S10, W01]

### 7.2 A rerun is not an update event

After support lands on the trusted branch, obtain a legitimate, authorized new eligible event for the real PR (for example the needed metadata correction or subsequent substantive synchronize). Do not create a meaningless commit, close/reopen unnecessarily, or forge a workflow event merely to obtain green checks.

GitHub reruns retain the original `GITHUB_SHA` and `GITHUB_REF`. With checkout pinned to `${{ github.sha }}`, rerunning the old failed linkage job does not demonstrate that the newly landed policy ran. Confirm actual P from the new run’s checkout. Keep the old failure; it is evidence that the original consumer did not support the selected format. [W02, S09, S10, S17]

### 7.3 Readback algorithm using existing GitHub tools

Use native `gh`/GitHub APIs or connected reads under existing authority; no background monitor is proposed.

1. Read PR repository/number, head/base repo/ref/full SHA, body, draft state and relevant current acceptance references. Record the observation time and distinguish narrative from native identity.
2. Identify the actual workflow runs relevant to that PR and target, including **both** candidate `pull_request` checks and trusted `pull_request_target` linkage. A commit-run helper filtering only pull-request events is not a complete inventory.
3. Bind each selected run to its run ID, event, workflow path, run attempt and expected PR/target. Record status/conclusion and actual policy/product checkout revision where it matters.
4. List **all** jobs for the specific attempt; follow pagination and validate the reported count. Preserve failed, cancelled, skipped, pending and unavailable as distinct results. Do not mix old and latest-attempt jobs.
5. Read relevant failed steps/logs and supporting native artifacts; retain safe locators and readback. A log or artifact access failure is an explicit evidence gap, not a green result.
6. Inspect required status-check/ruleset/approval enforcement only to the extent a claim depends on it. Record unavailable administration access rather than granting it or relying on a `mergeable` boolean.
7. Re-read actual B/H/body and material decisions; if they moved, keep the observations under the earlier identity and collect the new target’s necessary evidence. Never relabel a previous success.
8. Update the existing handoff with baseline outcome, dependency disposition, scope-specific assurance limitations and release blockers. Publishing that update needs its existing GitHub write authority; preparation alone does not grant it.

Native job APIs provide an attempt-specific jobs endpoint. Use it instead of interpreting a latest-attempt convenience result as evidence for an earlier run attempt. [W10]

### 7.4 ONI observation to carry forward, not a prefilled future pass

| Boundary | Observed 10 September result | Next required action |
|---|---|---|
| Baseline file | Same reported blob at B/H | Independently confirm accepted scope/content and regular native entry; qualify accepted trusted consumer |
| Trusted linkage | `34524389602` / attempt 1 / job `103029579766`: invalid baseline path | Separate accepted base-policy increment and a new eligible run that demonstrably executes it |
| Dependency review | `34524391937` / attempt 1 / job `103029588085`: vulnerable `qs` graph | Actual owner selects D61–D64; do not inherit an obsolete form-data-only status |
| Converter/mutation jobs | Skipped due to failed dependency chain | Not current qualification passes; run when legitimate prerequisites permit |
| Aggregate | Job `103029708307`: failure | Preserve causal failure; do not mark complete from unrelated passing workflows |
| PR description | Candidate/status narrative lags native H | Prepare an accurate update using current decisions, with required publication authority |
| Product release | Remains a separately accepted boundary | No npm/Steam publication or destination extraction is authorized by WP6 |

## 8. Detailed implementation slices

### WP6.1 — Establish authority, scope and consumer inventory

**Inputs:** P0, selected UO/ONI revisions, existing owner decisions, actual workflow and current adopter execution record. **Owner:** coordinator with policy owners.

Inspect the current `AGENTS.md`, review/engineering principles, route policy, validator/schema, local lifecycle callers, baseline tests, workflow, PR template and real setup/projection sources. Find every consumer that assumes a baseline must be Issue JSON or parses the validator result. Inventory only this SDLC change surface, not the entire organization. Check whether `_sdlc_baseline.py` is already in check selection and any real distribution manifest. Do not assume `set_up_sdlc.py` copies source scripts merely because it sets up configuration.

Confirm one owned implementation checkout and the actual protected evidence store. Preserve pre-existing changes and WP0 resources. Bind the genuine WP6 accepted scope/route and exact proposed text/configuration changes. Identify actual ONI acceptance material and current dependency owner. Record unresolved enforcement/read access explicitly.

**Exit:** a concise existing-task record with actual source/consumer identities, approved scope and decisions. No invented approval, active-record reset, plugin installation or feature baseline rewrite.

### WP6.2 — Establish failing and preservation tests before repair

**Inputs:** independently authored fixtures and the existing ONI tests. **Owner:** implementation owner; independent oracle review as accepted.

Reuse ONI’s actual tests for committed-plan local start, unchanged prior blob, required full profile and modified-plan stale/resume rejection. Retain Issue-path tests unchanged as a preservation baseline. Add a trusted-P/candidate-H fixture: old P receives a valid pre-existing plan baseline and rejects it; candidate H’s adapted consumer can link it locally. The defect oracle is the trusted format mismatch, not a failure to create a fixture or authenticate a live token. [S08]

Create fixtures in owned temporary repositories without remotes, credentials, real user baselines or historic worktrees. Commit synthetic baselines before their synthetic implementation commits, preserving exact independent text. Exercise actual native Git reads and native lifecycle entry points where applicable, not just dictionaries supplied directly to a kernel. Use API doubles only for transport/error/race boundary tests, explicitly labelling them.

**Exit:** meaningful RED for the supported-format gap and retained Issue-route behavior. Actual current CI failure S17 supplies operational context, not permission to edit the live failure merely to reproduce it.

### WP6.3 — Reuse and harden the shared contract

**Actions:** bring the reviewed ONI helper into the UO maintained subset; add only tested path/type/error guards required by §3. Add an explicit internal raw-baseline value if needed, without a persisted format. Keep opaque text and exact source-line references. Require strict decoding and placeholder/duplicate-field failures. Maintain R0/R1 and Issue semantics.

Test native path modes and caller boundaries before any broader refactor. Reconcile WP1 changes actually present, including strict GitHub text capture, rather than copying older ONI `_commands` or verifier code. Include selected plan mode/bytes in the comparison without pretending it authenticates acceptance.

**Exit:** shared contract tests pass; naming/authority boundaries remain precise; native reader and publication integration still explicitly unfinished until subsequent slices.

### WP6.4 — Integrate local lifecycle and trusted remote readers

**Actions:** adapt only the baseline branches in `sdlc.py` and `validate_sdlc_pr.py`. Implement native tree/blob reads, preserve API field-count/changed-path checks and first/last target readback, and return safe actionable errors. Preserve active-task schema, verification evidence ownership, exclusive acquisition and Stop behavior. Keep all candidate material as data.

Exercise local HEAD vs B distinction, missing/altered plans, renamed/type-changed paths, symlink Contents-API alias shape, invalid base64/UTF-8, fork repository identity, partial pagination and mid-read movement. Run an actual local subprocess through the approved repository interpreter in a path containing spaces/Unicode. Do not count StringIO-only tests as the supported Windows boundary.

**Exit:** both representations link correctly through their real local/pure remote consumers; simulated unavailable/malicious inputs fail honestly; no candidate code/credential crossover occurs. Automated linkage remains non-approval.

### WP6.5 — Add the proportionate preflight and consistent guidance

**Actions:** apply the exact accepted policy amendments in the companion document after reconciling intervening WP1–WP3 text. Keep baseline representation explicit at the existing route, PR template, governance and handoff points; remove or qualify incompatible Issue-only wording wherever it is actually normative. Preserve Issue-snapshot baseline-only behavior and accepted R2/R3 profiles.

Use the existing validator’s environment/input interface from P for local remote-compatibility checking; test that routine local `begin`/Stop does not silently gain network, credential or install side effects. Add the four necessary preflight boundaries and direct references to native security/writer evidence. Add the new helper to actual CI check-selection and source projection inputs where absent, testing a helper-only diff. Never recompute historical source-package hashes as if they were a current deployment manifest.

**Exit:** the correct procedure is discoverable through existing entry points and the new code cannot be omitted from the actual adopted subset. No new universal dossier, command or orchestrator exists.

### WP6.6 — Qualify and land the separate trusted-base increment

**Actions:** freeze the candidate source/test/configuration, run focused/affected checks during implementation and the final accepted R2 full profile after the last relevant change. Obtain independent review for baseline integrity, candidate trust and acceptance limits. Apply exact commit/push/merge authority normally. In the trusted workflow, retain P checkout and read-scoped dependencies; candidate test workflows remain separate.

Land the ONI compatibility increment without merging the converter to obtain its policy. Reconcile common behavior into UO with the identical test contract, but do not automatically distribute unrelated changes. Confirm the actually merged P and deployment consumers by readback; a local copy is not installed remote support.

**Exit:** real trusted policy support available in each claimed adopter; a new eligible linkage event is ready or explicitly pending. Keep the old invalid-path result intact.

### WP6.7 — Perform actual preflight and ONI remote handoff

**Actions:** refresh B/H and actual acceptance material; verify the same accepted plan through the new trusted consumer and read its actual new run/attempt. Independently inspect the owner’s acceptance and exact bound content. Reconcile scope-specific security inventory/writer availability without another scan unless separately authorized.

Read the current dependency job, not the stale PR summary; bind both current `qs` advisories to the owner’s actual D61–D64 decision. Retain the already working dependency-first DAG. Where a genuine remediation or exact policy decision is authorized, run its required new native checks and read back the new attempt; otherwise record the blocker. Update the handoff/PR only with existing publication authority.

**Exit:** A12 has an actual current target/run/job and owner disposition. The feature may correctly remain blocked while WP6’s baseline and visibility increment is accepted.

### WP6.8 — Validate useful outcomes and maintain the boundary

**Actions:** execute O61/O62. Revisit known false acceptance and stale-evidence scenarios with an independent maintainer. Confirm retrievability of baseline acceptance and relevant failures after the implementing session ends. Verify that setup/projection did not alter hooks, package status, guarded permissions, existing baselines or active work. Record actual limitations and remaining release decisions.

**Exit:** both parent criteria qualified within the accepted deployment scope, or a precise intermediate outcome under §11. Do not close the feature or publish the package merely because policy linkage now passes.

## 9. File-by-file change plan

| Surface | Selected responsibility | Preserve / do not assume |
|---|---|---|
| `scripts/_sdlc_baseline.py` | Reuse ONI contract; add demonstrated canonical/type guards and internal raw identity structure where useful | No acceptance oracle, HTTP client, Markdown engine or new persisted baseline |
| `scripts/sdlc.py` | Admit selected plan locally with exact committed bytes; preserve existing lifecycle freshness | Do not copy older verifier/persistence code or overwrite active state |
| `scripts/validate_sdlc_pr.py` | Two-format parsing/linkage, native pinned object reads, exact target freshness and non-approval result | Execute only from trusted P in the trusted job |
| `scripts/_commands.py` | Only the exact text-codec support actually required or already supplied by WP1 | Do not change every external tool’s protocol codec by assumption |
| `scripts/_sdlc_state.py` | Inspect consumers; change only if required for shared contract integration | No new active/verification schema for this format extension |
| Existing baseline/PR/lifecycle tests, primarily `tests/sdlc/test_pipeline_controls.py` | Reuse ONI tests; add separate native/API trust regressions | Preserve existing Issue behavior and tests; hold-out expectations are independent |
| `scripts/selectPullRequestChecks.js` and its existing tests | Include new baseline helper where absent; demonstrate helper-only selection | Do not widen every product job for all documentation changes |
| Actual setup/projection distribution sources and tests | Include helper/imports in the adopted SDLC subset where an actual copier/manifest owns them | No speculative central installer; historical source records remain historical |
| `docs/sdlc/howto.md`, `github-governance.md`, relevant routing/handoff references | Concise two-format, preflight and trusted rollout procedure | Reconcile exact existing normative wording at execution |
| `.github/PULL_REQUEST_TEMPLATE.md` | Explain conditional `Baseline acceptance` and exact source-line-array references | Do not insert multiple competing metadata examples into actual filled PR fields |
| `.github/workflows/sdlc-pr.yml` | Preservation target; bounded identity logging only if needed and approved | No candidate checkout, unsafe opt-out, broader token or candidate requirements |
| ONI `.github/workflows/steam-community-bbcode.yml` | Preserve dependency-first chain and native low/all-scope gate | No default source edit for WP6; dependency policy changes separately accepted |
| `docs/sdlc/verification.md` / existing PR execution record | Append truthful useful-work and limitation references | Do not create a tracked per-run diary feedback loop |

Do not touch every candidate path merely because it is listed. The acceptance-approved change set names the actual modified files after the consumer inventory. If a new maintained module is introduced, include it in the actual check-selection/projection contract; do not assume a `scripts/*.py` glob already covers it.

## 10. Verification catalogue

The companion `verification-catalogue.proposed.json` carries the same 40 scenario IDs and two operational exercises. All are **not-run** as WP6 implementation acceptance. Parameterized cases can share fixtures; these are not 40 separate mandatory pipelines. Existing tests may satisfy preservation rows once the actual executed boundary and candidate are recorded.

| ID | Scenario / independent oracle | Execution boundary and required result |
|---|---|---|
| T601 | Old trusted validator versus adapted candidate | Synthetic P/B/H with real native baseline: old P rejects plan; candidate-only pass is not trusted acceptance |
| T602 | Existing Issue success | Valid independently authored Issue JSON, live body/risk linkage and prior baseline continue to pass linkage |
| T603 | Issue corruption / metadata mismatch | Bad body hash/title/repository/number/version/risk/state fail applicable maintained checks |
| T604 | Issue baseline history | Changed existing snapshot and out-of-scope baseline-only paths rejected; old failure bytes unchanged |
| T605 | Valid committed plan | Native B/H regular blob, Unicode text and distinct source references link without a fictitious Issue |
| T606 | Noncanonical paths | Absolute, traversal, dot/repeated separator and backslash forms fail before reading outside scope |
| T607 | Path protocol/host ambiguity | NUL/control/stream colon and unsupported whitespace paths reject; valid Unicode/bracket literal path succeeds |
| T608 | Text boundary | Empty/blank/NUL/invalid UTF-8 fail with exact reason; no replacement decoder |
| T609 | Byte identity | LF/CRLF, BOM and Unicode-normalization differences do not disappear through text comparison |
| T610 | Reference/metadata shape | Missing/placeholder/duplicate acceptance fields; malformed/empty/duplicate/nonexistent/ambiguous source-line arrays fail |
| T611 | No fabricated authority output | Plausible supplied approval string never creates an authenticated-approval result/state; O61 tests actual acceptance refusal |
| T612 | Candidate-only plan | Exists at H/local HEAD but absent at B: remote prior-baseline failure, no candidate fallback |
| T613 | Changed selected plan | Candidate edit/delete/rename-old/rename-new/mode change rejected even when misleading metadata says unchanged |
| T614 | Git types and local containment | Regular files distinguished from symlink/submodule/directory; redirected local parents reported safely |
| T615 | Contents API alias trap | A file-shaped symlink-target response cannot substitute for a regular selected tree entry |
| T616 | Blob transport integrity | Wrong ID/type/size/base64 or exceeded finite limit fails without using old bytes |
| T617 | Remote failure classification | 403/rate limit/network/truncated tree cannot become proven absence, empty plan or success |
| T618 | Complete changed-path accounting | Multi-page files and both rename sides consumed; count mismatch/incomplete listing fails |
| T619 | Target/Issue movement | Change B/H/body or relevant Issue during readback; preserve earlier result as stale, not current success |
| T620 | Repository and endpoint binding | Fork head/base identities use actual PR metadata; no candidate-provided remote URL or token expansion |
| T621 | Small-route preservation | R0/R1 tasks requiring no baseline retain their native route without extra Issue/dossier/network dependency |
| T622 | Elevated-route preservation | Plan route retains configured R2/R3 prior baseline and required full profile; no risk downgrade |
| T623 | Native local lifecycle | Begin through actual approved interpreter in spaces/Unicode checkout; rejected admission preserves incumbent state/runs |
| T624 | Resume and input freshness | Plan/control changes invalidate evidence; supported explicit transition preserved; no baseline/digest hand edit |
| T625 | Local/remote compatibility preflight | Same selected plan tested from actual trusted P; missing format capability found before expensive qualification |
| T626 | Candidate code remains data | Candidate import/hook/build sentinel never executes; process trace shows only allowed trusted/native reads |
| T627 | Credential and codec boundary | Synthetic token stays with trusted read subprocess; no command interpolation or token logging; JSON decoded explicitly |
| T628 | Helper-only CI selection | Real Git change touching only `_sdlc_baseline.py` selects required SDLC checks |
| T629 | Actual projection/import closure | Any selected code projection includes helper and imports; irrelevant historical manifests are not rewritten |
| T630 | Security inventory limitation | Missing required paths remains a scoped assurance gap even if workflow paths are present; no copied selector |
| T631 | Artifact-writer independence | Inventory success with unavailable required writer is not a completed native security capability |
| T632 | Missing runtime | Missing interpreter/tool/dependency produces precise unavailable result; no install/global fallback or old evidence reuse |
| T633 | Dependency threshold/scope mismatch | Independent native-report/config fixture exposes moderate comparison dependency versus low/all-scope gate; local high-only result insufficient |
| T634 | Existing early-gate preservation | Actual aggregate failure cases and dependency chain keep required skipped work non-passing; no reduced mutation obligation |
| T635 | P/B/H/T distinction | Trusted policy SHA, candidate SHA and synthetic product merge kept distinct in readback and claims |
| T636 | Workflow attempts and pagination | Exact attempt jobs fully read; old/latest attempts, unrelated green and required skipped jobs cannot be conflated |
| T637 | Rerun versus new event | Original-event P remains on rerun; accepted new event’s actual P demonstrated, not inferred from current main |
| T638 | Unavailable remote evidence | API/log/artifact/rules access failure leaves explicit gap, not an empty-success result or automatic permission grant |
| T639 | Fresh external state | New advisory/result/owner decision after earlier read remains linked to its actual time/target; historical evidence retained |
| T640 | Handoff side-effect boundary | Preflight/remote-read routines do not mutate active records, baseline bytes, candidate source, PRs or policy without separate authority |

**O61 — real acceptance and trusted-format adoption.** Use the real pre-existing accepted ONI plan and an actual Issue-snapshot case through their qualified trusted consumers. Independently verify the real owner decision and exact content binding. Challenge a fabricated/incorrect acceptance reference without granting authority; report the distinction between syntactic linkage and acceptance. Do not create public fake approvals for testing. Evidence includes the actual new policy revision and linkage run, not merely local fixture output.

**O62 — actual ONI readiness handoff.** Read the current PR and exact dependency/linkage run/attempt/jobs, bind every failed/skipped result correctly, and record the owner’s D61–D64 disposition. A maintainer starting from the handoff can find the next action without confusing `f92f16d…` with the new head or declaring that a skipped mutation suite passed. An accepted hold is a legitimate outcome; unsupported feature/release completion is not.

### Verification discipline

Run focused regressions during development, the affected SDLC/Python/launcher/check-selection tests for the actual modifications, and the final accepted R2 full profile on the frozen increment. Preserve existing Windows/Ubuntu CI coverage. UO’s product/ontology consumers and ONI’s adopter-specific consumers remain distinct; a synthetic profile named `full` is not their real full verification.

Real Windows subprocess evidence is required for local supported behavior; Linux Git research and mock transport tests are not substitutes. Native API readback and current CI establish the remote boundary; schema tests do not. Independent review inspects the actually delivered P/B/H contracts and raw failures, not only a report saying all tests passed.

Select additional specialist coverage only for the demonstrated risk. The work is security-relevant at a trust boundary, so retain the existing accepted security-assessment requirements and any individually accepted alternative; no automatic scanner fan-out or public disclosure is authorized here.

## 11. Acceptance criteria, deployment and recovery

| ID | Required evidence |
|---|---|
| **AC6-01** | Accepted WP6 scope/route and exact policy/configuration changes are attributable; converter intent is not fabricated or rewritten. |
| **AC6-02** | Existing Issue-snapshot behavior and immutable history remain intact through actual consumers. |
| **AC6-03** | Canonical committed-plan path/text/source-reference route works without a fictitious Issue. |
| **AC6-04** | Native B/H mode/path/blob identity and local raw-byte checks reject candidate-only, altered and redirected baseline representations. |
| **AC6-05** | Acceptance references never substitute for approval; actual accountable gate rejects forged/unrelated/unverifiable acceptance, with enforcement limitations explicit. |
| **AC6-06** | Trusted P reads H as data; candidate code, requirements, hooks and credentials never cross into privileged policy execution. |
| **AC6-07** | Local lifecycle ownership, required profiles, evidence freshness and prior failure retention are preserved, including actual supported Windows execution. |
| **AC6-08** | Actual trusted-base format support is landed separately and observed through a new eligible run; local candidate success and old reruns are not deployment proof. |
| **AC6-09** | Small preflight exposes actual baseline/security/writer/dependency/runtime blockers before dependent costly qualification without creating a universal dossier or silent mutation. |
| **AC6-10** | ONI dependency policy has the actual failed result and an explicit owner D61–D64 disposition; existing early gating and assurance are preserved. |
| **AC6-11** | Handoff distinguishes P/B/H/T, exact workflow event/run/attempt/jobs, stale narrative, skipped work, read gaps and remaining release authority. |
| **AC6-12** | Required final routed verification, actual trusted/adopter observations, independent assurance and retained readback qualify the stated scope; no unperformed test is labelled passed. |

AC6-02–08 and O61 cover **A11**; AC6-09–11 and O62 cover **A12**. Both independent acceptance and mechanical identity are necessary at the complete boundary.

### Delivery outcomes

**Implementation prepared / adoption pending:** code and tests are ready but the policy acceptance, actual trusted-base merge or new native run is missing. **Trusted baseline qualified / feature blocked:** actual two-format support is accepted, preflight/readback operate, and the feature remains correctly blocked by a named dependency or release obligation. **WP6 accepted for the recorded adopters:** A11/A12 and AC6-01–12 are met, with an explicit owner disposition for unrelated blockers. **Incomplete:** a required identity, acceptance, trust, evidence or actual consumer test remains unestablished.

A successful outcome need not include a green converter PR or package publication. Conversely, a passing parser with no real trusted-consumer adoption cannot be called WP6 complete.

### Recovery and rollback

A bad candidate policy is not deployed; preserve its failed tests. If a deployed reader causes false acceptance, block reliance through the owner’s existing authority, retain affected decisions/runs and review the scope of prior reliance. Reverting a code change does not undo accepted records or safely supersede task state. Use an ordinary separately approved revert/forward fix and requalify the actual P/B/H path. Do not restore old “successful” status files or recapture a baseline to disguise the problem.

If a new baseline contract is unavailable after rollback, report plan-route capability unavailable; do not silently convert plans, lower risk or run H’s validator. Preserve plans and Issue snapshots as historical records. Any later stronger machine-authenticated acceptance design needs its own concrete authority and compatibility contract.

A dependency remedy that changes the target requires fresh affected native evidence. An exception expiry is a reassessment trigger, not permission to discard findings. A failed action, missing API or untrusted environment is a hold with a next actor, not grounds to broaden tokens or disable a check.

## 12. Supporting research executed for this deliverable

`baseline-boundary-check.json` records **18 native-Git/codec research checks**, all passed in the recorded Linux/Python/Git environment. The accompanying script uses a newly owned local repository with no remotes. It demonstrates committed object equality, raw newline/BOM/Unicode distinctions, staged versus working content, candidate-only absence, native symlink/regular/mode distinctions, literal Unicode/bracket path lookup and strict UTF-8/JSON behavior.

It did **not** execute either repository’s validator, the proposed implementation, a live token, GitHub API mutation, Windows host, native security scan, current CI or an authenticated owner-acceptance gate. These checks are supporting mechanism evidence, not T601–T640 or O61/O62 results. The fact that example Markdown was only read as data is not proof of the yet-unimplemented validator’s complete trust boundary.

Artifact checks separately verify document/catalogue consistency and ZIP payload identity. Integrity hashes identify delivered bytes, not correctness or approval.

## 13. Sources and provenance

### Supplied basis and adjacent plans

- **[P0]** `../implementation-plan.md`, actual supplied parent, WP6 and A11/A12; also WP5/WP7 boundaries. This document expands that source, not a substitute parent scope.
- **[P1]** Supplied `../wp1-verification-evidence/implementation-plan.md`; proposal, not proof of deployed receipt/UTF-8 repair.
- **[P2]** Supplied `../wp2-independent-execution/implementation-plan.md`; proposal, separate physical execution and integration boundary.
- **[P3]** Supplied `../wp3-resource-disposition/implementation-plan.md`; proposal, resource visibility and retention.
- **[P4]** Supplied `../wp4-command-dispatch/implementation-plan.md`; proposal, command-protection diagnosis/qualification.
- **[P5]** Supplied `../wp5-security-inventory/implementation-plan.md`; proposal, actual native inventory and cause-specific workaround qualification.
- **[H0]** Supplied `sdlcworktreelifecyclehandoff20260910.md`; historical observations/questions, not removal authority or confirmed root causes.

### Inspected repository and operational evidence

- **[S01]** [UO main readback](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main); observed full revision recorded in §1, mutable endpoint.
- **[S02]** [ONI PR #4](https://github.com/MaksymShostak/oxygen-not-included/pull/4); native refs and stale description distinguished.
- **[S03]** [ONI candidate `_sdlc_baseline.py`](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/scripts/_sdlc_baseline.py).
- **[S04]** [UO trusted validator](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/scripts/validate_sdlc_pr.py).
- **[S05]** [ONI candidate validator](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/scripts/validate_sdlc_pr.py).
- **[S06]** [ONI trusted-base validator](https://github.com/MaksymShostak/oxygen-not-included/blob/975acf599d06ec3d274c55bac8d1731278ffa153/scripts/validate_sdlc_pr.py).
- **[S07]** [ONI candidate lifecycle helper](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/scripts/sdlc.py); baseline-specific source inspected, unrelated verifier replacement not selected.
- **[S08]** [ONI lifecycle tests](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/tests/sdlc/test_pipeline_controls.py); committed-plan and preservation cases inspected.
- **[S09]** [UO trusted linkage workflow](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/.github/workflows/sdlc-pr.yml).
- **[S10]** [ONI trusted linkage workflow](https://github.com/MaksymShostak/oxygen-not-included/blob/975acf599d06ec3d274c55bac8d1731278ffa153/.github/workflows/sdlc-pr.yml).
- **[S11]** [Selected plan at B](https://github.com/MaksymShostak/oxygen-not-included/blob/975acf599d06ec3d274c55bac8d1731278ffa153/docs/plans/2026-09-08-steam-community-bbcode-implementation-plan-v2.md); native returned blob identity inspected, not independent approval.
- **[S12]** [Selected plan at H](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/docs/plans/2026-09-08-steam-community-bbcode-implementation-plan-v2.md); same returned blob identity.
- **[S13]** [ONI dependency-first workflow](https://github.com/MaksymShostak/oxygen-not-included/blob/c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1/.github/workflows/steam-community-bbcode.yml).
- **[S14]** [BBCode run 34524391937 attempt 1 jobs](https://api.github.com/repos/MaksymShostak/oxygen-not-included/actions/runs/34524391937/attempts/1/jobs?per_page=100); four returned jobs, failure/skip distinctions.
- **[S15]** [Dependency job 103029588085](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34524391937/job/103029588085); decoded logs read through the connector, including the two qs findings, actual checkout, threshold and scopes. No native rerun performed.
- **[S16]** [Linkage run 34524389602](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34524389602); attempt 1 and target metadata read. Latest candidate commit description retained as claims, not owner-approval proof.
- **[S17]** [Linkage job 103029579766](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34524389602/job/103029579766); decoded log read, trusted checkout 975acf5 and invalid-baseline-path failure.

- **[S18]** [UO GitHub governance](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/docs/sdlc/github-governance.md); current seven-field contract, trusted execution and non-approval limits.
- **[S19]** [UO PR template](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/.github/PULL_REQUEST_TEMPLATE.md); actual field/instruction anchors.

### External primary sources, checked for this plan

- **[W01]** [GitHub: securely using pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target).
- **[W02]** [GitHub: re-running workflows/jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs); original event SHA/ref retained.
- **[W03]** [GitHub Contents API](https://docs.github.com/en/rest/repos/contents); symlink target behavior and limits.
- **[W04]** [GitHub Git Trees API](https://docs.github.com/en/rest/git/trees); exact path/mode/type/object and truncation behavior.
- **[W05]** [GitHub Git Blobs API](https://docs.github.com/en/rest/git/blobs); native immutable blob reads.
- **[W06]** [Git ls-tree](https://git-scm.com/docs/git-ls-tree); native tree/mode/path output.
- **[W07]** [Git cat-file](https://git-scm.com/docs/git-cat-file); native raw object reads.
- **[W08]** [Dependency Review Action at the observed pin](https://github.com/actions/dependency-review-action/blob/a1d282b36b6f3519aa1f3fc636f609c47dddb294/README.md); threshold, scopes, advisory-level exclusions and native outputs.
- **[W09]** [npm audit v12](https://docs.npmjs.com/cli/v12/commands/npm-audit/); failure threshold and report semantics.
- **[W10]** [GitHub workflow job API](https://docs.github.com/en/rest/actions/workflow-jobs); attempt-specific job reads.

The external sources establish native behavior, not acceptance of this repository policy. Refresh current external/native contracts at the actual adoption boundary without changing selected versions or permissions by implication.
