---
name: test-driven-development
description: Use when explicitly assigned an accepted implementation slice, reproducible bug repair, or behaviour-preserving refactor. Do not use for requirements discovery, read-only review, incident command, or release approval.
license: MIT
metadata:
  version: "1.0.0"
  upstream: "obra/superpowers"
---

# Test-Driven Development

## Purpose and boundary

Implement one accepted behaviour at a time with an independent expected result,
observable feedback, and small red-green-refactor cycles. A failing check proves
sensitivity to that case, not correctness of the requirement or all behaviour.

This is the repository-adapted Superpowers skill. Use this version, not the
unmodified upstream instructions in parallel. The repository lifecycle owns
requirements, risk, approvals, review dispatch, and release. This skill owns only
the bounded implementation-and-test loop. It grants no additional permissions.

## Repository principles

Read `docs/sdlc/engineering-principles.md` for material work. NAM-01 requires
semantically correct and precise names for added/changed code and filesystem
objects. Reassess retained names when functionality or responsibility changes;
rename or redesign rather than waive correctness. NSH-01 prohibits new/extended
shims without a specific prior override. Reuse native/consumer-owned validators
before building alternatives; independent expected test results are still required.
Keep the higher-level outcome/guardrails in view and escalate locally correct but
globally counterproductive work. Use only the selected risk-route ceremony.

## 1. Establish the slice contract

Read applicable repository instructions, the accepted task/baseline, relevant
domain definitions and decisions, existing tests, and supported test commands.
Inspect the starting diff; preserve existing user work. Reuse approved decisions
instead of asking for the same approval again.

State the following briefly in the task record; reference existing artifacts:

- Task/baseline identity, risk class, slice and acceptance/invariant IDs.
- Expected behaviour, prohibited effects, independent oracle source, and higher-outcome purpose anchor.
- Test boundary, fixture preconditions, and realistic failure to detect.
- Focused command; affected regression scope; required final verification.
- Route: `test-first`, `preservation`, `characterization`, or
  `alternative-verification`; include the authorizing policy/decision for tailoring.

A public boundary means a meaningful consumer-facing contract, including an
internal module contract; do not export private details solely to test them.
Select affected tests using callers, dependency/build/test maps, contracts, and
shared data, not filenames alone. If impact is uncertain, widen verification.

Requirements conflict, a materially changed baseline, missing authority, or an
ambiguous consequential oracle blocks the affected slice. Do not invent intent,
downgrade risk, or silently edit an accepted baseline. Unrelated safe work may
continue only within the already authorized scope.

## 2. Select the truthful route

Default to `test-first` for new or changed executable behaviour and causal bug
repair. When an accepted behaviour is already satisfied, retain the meaningful
passing test; verify fixture/path validity and check sensitivity as appropriate.
Do not break correct code or change the expectation merely to manufacture red.

For preserved behaviour, legacy code, configuration, generated artifacts,
non-functional work, unavailable environments, or pre-existing implementation,
read [verification-routes.md](references/verification-routes.md). Existing policy
may authorize a route; otherwise seek the required accountable decision. State
non-TDD routes honestly. They are not an exception to verification.

## 3. Write a meaningful test

Read [writing-good-tests.md](writing-good-tests.md) when adding or changing tests.
Write one coherent scenario, including as many assertions as its contract needs.
Parameterize distinct meaningful cases where useful. Do not batch all speculative
tests before learning from the first vertical slice.

Use accepted examples, independently checked fixtures, contracts, properties,
or an appropriately independent reference. Neither the implementation under test
nor an equivalent copy of its algorithm is an oracle. Prove material fixture
preconditions, exercise the real path, and verify both required and prohibited
outcomes. Do not substitute a mock for the decision being tested.

## 4. Observe RED for a test-first slice

Run the focused command against the pre-change implementation. Confirm that the
intended test was discovered, reached the claimed input/state and production
boundary, and failed because the required behaviour is absent or incorrect.
Record the command, actual result, diagnostic, and source/test state identity.

A missing tool, typo, import failure, permissions failure, zero tests, or unrelated
setup failure is not behavioural red. Establish an executable seam without the
new behaviour, or record the deliberate compile-time contract check as such.
A negative compile-time API test can be legitimate when that is the requirement;
a broken runner is not. Never fabricate a failure or its chronology.

If a test unexpectedly passes, inspect its inputs, discovery, assertions, path,
and existing behaviour. Correct a defective draft test without changing accepted
intent; otherwise recognize existing coverage or an already-satisfied requirement.

## 5. Implement GREEN

Make the smallest coherent, repository-native change satisfying the accepted
contract, not a hard-coded answer for the visible fixture. Preserve relevant
security, compatibility, error, lifecycle, and data invariants. Do not add
speculative features or unrelated redesign.

Run the focused test and affected regressions. Investigate new failures. Do not
weaken assertions, delete/skip inconvenient tests, mock away the defect, regenerate
snapshots blindly, suppress checks, or relax timeouts/thresholds to produce green.

A wrong draft fixture may be repaired with an explained diff. A conflict with an
accepted requirement or independently accepted reproduction requires separate
review/reacceptance. Preserve the prior artifact and evidence; see the routes
reference. Do not claim implementation correctness by making code and test agree
on a new, unauthorized rule.

Before calling GREEN complete, reassess affected names against the actual new
behaviour and check for unauthorised shims, shadow validators and shifted system
cost. A passing test does not waive a semantic naming defect. Correcting names
includes appropriate consumers/imports/paths and fresh checks.

## 6. Refactor while GREEN

After relevant checks pass, remove duplication introduced by the slice, clarify
names, and improve local structure without changing accepted behaviour. Keep the
same behavioural oracle and rerun focused plus affected checks. Broader interface,
data, architecture, or policy changes require a separately routed decision/slice.

For a pure refactor, start from representative passing preservation checks rather
than an artificial failing test. Behavioural invariants should survive the change.

## 7. Verify and hand off

Before final verification, apply `docs/sdlc/temporary-artefacts.md` when available.
Promote useful reproductions into maintained tests and preserve required raw
evidence; remove disposable probes, diagnostics and undeclared scratch dependencies
from the deliverable. Keep pending-review, downstream-task and recovery inputs.
If repository cleanup policy is absent, dispose only of proven task-owned scratch
within existing authority; preserve uncertain material and report it.

A commit alone does not release all temporary artefacts. After consumers finish,
remove eligible local working copies without deleting tests, accepted baselines,
retained evidence or lifecycle-control state. Record retained temporary material's
consumer/reason, owner and removal/reassessment trigger. No cleanup subagent or
security scan is spawned by this skill.

After the last source, test, fixture, dependency, or relevant configuration change,
run fresh focused, affected, and risk-route-required final checks. Reuse equivalent
runs with recorded scope; do not run the whole repository after every keystroke.
Where configured, use the repository verification entry point. Do not invent a
command or assume a successful build executes tests.

Distinguish new failures, established baseline failures, warnings, and unavailable
checks. Do not fix unrelated pre-existing failures without authorization or call
an incomplete/failed mandatory check successful. Only the lifecycle authority may
accept a documented waiver; the actual run remains failed or unavailable.

Assess whether important assertions detect realistic faults. For elevated-risk
oracles, ambiguous fixtures, or new tests of already-working behaviour, execute a
safe targeted negative control/mutation or replay against a preserved defective
version when feasible. Do this only in an authorized disposable copy or suitable
mutation-tool workspace; preserve the working tree. Record the actual result and
limits. Mental simulation and mutation coverage percentages are not proof.

Use [evidence-and-handoffs.md](references/evidence-and-handoffs.md) for the record
and delegated workflows. Return:

- Scope and route: baseline, slice, requirement/invariant IDs; deviations.
- Changes and test boundaries; oracle and meaningful fixture checks.
- RED or alternative evidence; current GREEN and regression evidence.
- Commands, source/test identities, logs, relevant environment and seeds.
- New, pre-existing, waived, failed, and unavailable results without relabelling.
- Residual risk, required independent verification/review, and remaining decisions.
- Temporary artefacts removed, promoted/archived, retained with owner/reason/trigger,
  or unresolved; state whether cleanup required new verification.

This handoff is not approval, release readiness, or proof of a production outcome.
Keep tests with the implementation. Do not merge, deploy, close the Issue, publish
a vulnerability, or mark a security finding fixed as a side effect of this skill.

## Recovery and stop rules

| Observation | Required response |
|---|---|
| Code already exists without test-first evidence | Preserve it; characterize or replay against a safe prior state. Report chronology honestly. |
| Test changes its own oracle to match output | Stop; restore intended semantics and independently justify expectations. |
| Critical fixture condition is unproved | Inspect/assert that condition before interpreting the result. |
| Test only checks a private helper or a mock's existence | Move to the contract and real observable effect. |
| Required check cannot run | Record the exact gap; do not escalate permissions or claim green. |
| Verification predates a relevant edit | Rerun; old evidence does not describe the current artifact. |
| Specialist workflow already owns remediation | Supply only its delegated test/implementation task; do not start another orchestrator. |
| Scope or accepted risk must change | Return that decision to the repository lifecycle owner. |

## Reuse, current versions and rights gate

Apply REU-01, VER-01 and LIC-01 from `docs/sdlc/engineering-principles.md`.
For new functionality, reference the completed deep software-selection research
before design or implementation. Establish native/reused capability, latest stable
or latest applicable LTS identity, supported consumer validation, actual licence/terms
clearance and the precise residual custom gap. Reuse approved still-current research
only after checking for material changes. Local tool absence is an integration gap,
not permission to select an older target. Do not fabricate research or clearance.
The router may identify this as the next prerequisite without implementing; release
assessment must inspect any remaining blocked adoption or integration evidence.
This is a gate in the existing workflow, not another mandatory agent fan-out.
