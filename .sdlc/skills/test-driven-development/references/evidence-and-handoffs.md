# Evidence and Handoffs

Read when recording completion, delegating a slice, or working inside a specialist
workflow. Use existing dossier, PR and CI evidence storage; do not introduce a
second authoritative requirements store or a new issue for each red-green cycle.

## Minimum evidence per behaviour/slice

| Field | Required content |
|---|---|
| Identity | Issue/task, accepted intent or required baseline identity, slice and acceptance/invariant IDs. |
| Oracle | Authoritative source and independently derived expectations. |
| Boundary | Real execution seam, important fixture preconditions, relevant doubles. |
| Route | Actual verification route and policy/decision authorizing tailoring. |
| Pre-change evidence | Observed red, preservation baseline, characterization, or explicit gap. |
| Post-change evidence | Focused plus affected regressions; final required check references. |
| Run identity | Command/arguments, working directory, source/test/config identity, environment, seeds and timestamps as applicable. |
| Results | Pass, fail, unavailable or not-run; intended diagnostic, discovered test count where available, log reference/hash. |
| Sensitivity | Executed negative-control/mutation/replay result when required, or explicit unverified claim/gap. |
| Handoff | Residual risk, owner decisions, independent verification and review still required. |

For a dirty tree, a commit SHA alone does not identify what ran. Reuse the
repository workspace fingerprint or retain the actual source/test diff and
untracked inputs. Record versions of runtime, dependencies, build flags and
platform when they affect the inference. Do not hash unrelated secrets or persist
sensitive payloads merely for reproducibility; use the approved restricted store
and sanitized evidence references.

Tool/CI output, not an agent's reconstructed narrative, is the run evidence.
A structured record and hash establish identity, not honesty, completeness or
correctness. They are not signatures, tamper-proof storage, or human approval.
Retain raw logs under repository policy. Clearly label examples and simulations.

For R0/R1, concise task/PR evidence referencing CI is normally sufficient. For
R2/R3, bind the consequential oracle and evidence to the accepted baseline and
provide the specific independent assurance required by the lifecycle. Do not
create one commit per red-green operation or dump redundant logs into Git.

## Temporary artefact disposition

Read `docs/sdlc/temporary-artefacts.md` if supplied by the repository. Preserve useful
regression cases as maintained tests and required raw output in the approved evidence
store before removing a working copy. Do not preserve every draft forever, but do
not remove the only reproduction, source/test input, original security bundle or
counterevidence needed by an active review, downstream task or retention obligation.
A commit is not proof that these consumers have finished.

Remove deliverable-affecting temporary instrumentation before final checks. After
all consumers finish, dispose of eligible task-owned local scratch. Use exact
inspected scope; do not infer disposal authority from ignored/untracked status,
follow links outside the owned workspace, or erase lifecycle-control state to
bypass a gate. Changed inputs or fingerprinted state require the applicable fresh
verification; discarded detached scratch is not automatically a product change.

Use the existing handoff record for removed groups, promoted/evidence locators,
retained temporary items with owner/reason/trigger, and unresolved questions.
A worker reports its temporary outputs; the coordinator owns shared-resource
release after collecting all workers' evidence. This skill grants no extra
filesystem authority and does not create a new cleanup orchestrator.

## Verification order and freshness

Use the approved test commands, then affected regression checks, then the required
final profile. A full profile may subsume earlier scopes. Record that fact rather
than repeat expensive equivalent work. A material edit to source, tests, fixtures,
lockfiles or runtime/config invalidates affected prior success claims.

With the previously supplied scaffold, first configure its actual verification
profiles. Its entry points are:

```text
npm run sdlc -- verify --profile focused
npm run sdlc -- verify
```

These are repository helper commands, not Codex built-ins. A focused red run must
remain recorded as failure; never alter the helper or verification record to
make a hook happy. Final profile success is necessary only to the extent the
repository policy requires it; it is not by itself proof of correctness.

## One implementation writer

The caller selects one implementation owner for a slice. Do not spawn research,
implementation, or review agents automatically from this skill. The outer SDLC
may delegate independent read-only questions and later invoke a fresh verifier.
Do not have concurrent agents modify the same source/tests/baseline or let the
implementer revise held-out grading tests.

A verifier receives the accepted behaviour, source revision/diff, tests and actual
run evidence, not a claim that the code is correct. It reruns evidence and checks
neighbouring behaviour as required. A test run can write caches/build products:
use a disposable verification workspace with appropriate filesystem permissions,
not an assurance that a prompt saying 'read-only' prevents all writes.

A separate context reduces anchoring; it does not establish organizational or
statistical independence. Reviewers report, do not repair or approve their own
findings. Human decisions and deterministic gates remain external to this skill.

## Codex Security ownership

When Codex Security `fix-finding` owns an accepted security remediation, it retains
its patch strategy, scoped review, validation gates, artifacts and outcome
contract. This TDD procedure may be explicitly used for the bounded regression
and implementation task only. Do not recursively invoke another security scan,
start a second review fan-out, or declare the vulnerability fixed from green tests.

Test the original trigger and legitimate behaviour; retain applicable alternate
input/bypass and compatibility checks. Preserve the scanner's original artifacts.
The outer lifecycle obtains independent `verify-fix`/runtime evidence as applicable
and authorizes closure. A static assessment is not runtime reproduction. Missing
required execution remains a proof gap even if a tool's narrower verdict is fixed.

The standalone `verify-fix` workflow is verification-only: do not use this skill to
edit its checkout or change its native JSON result contract. Version-pin and verify
installed plugin behaviour; repository `main` may differ from the installed build.

## Authority boundary

This skill cannot accept requirements, lower risk, change security policy, grant
credentials, publish findings, close an Issue, merge, deploy, or certify production
outcomes. If another instruction requires an incompatible action, expose the
conflict and follow applicable authority; do not quietly combine workflows.

## Principles disposition

Include a concise NAM-01 name/functionality check, NSH-01 exception or no-shim result,
REU-01/VAL-01 native capability choice and OUT-01 alignment. Reuse the current PR/task
record, not a new per-test ledger. None authorises a release or security closure.

## Command safety during implementation

Apply CMD-01 in `docs/sdlc/engineering-principles.md`. Do not change or bypass DCG,
grant exceptions, or reroute an equivalent blocked action through an interpreter,
stdin or another tool. A required command blocked by policy is an explicit evidence
gap until resolved by the authorized owner, not a green run. Preserve temporary
negative-control workspaces until consumers finish; DCG allowance does not grant
disposal authority. The outer lifecycle owns command-safety deployment acceptance.
