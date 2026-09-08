# DCG deployment acceptance — reusable environment record

This is a **blank procedure/template**, not an accepted deployment or a per-task
ceremony. Store the completed record in the existing protected operational/change
record and refer to it from tasks. Reassess after a material binary, policy, hook,
trust, shell, Codex, permission or execution-path change. CMD-01 remains in force.

## Rights before execution

The actual v0.14.0 LICENSE includes a non-standard OpenAI/Anthropic rider.
Max authorizes repository use; retain that decision separately from the upstream
terms and any author-issued exception. Read the decision in
[package-reuse-assessment.md](package-reuse-assessment.md#dcg-owner-decision).
The [adoption record](adoption.md#command-safety) identifies the later operator
selection and bounded host acceptance. This blank template grants no additional scope.

## Identity and authorization

Record the actual operator, approver and inspectable change/approval reference;
OS/build and shell; Codex version/interface (desktop, CLI, non-interactive, WSL);
parent/subagent surfaces; identity/permissions; native binary path/version/digest;
release/source and verification method; config path/digest; native effective-config
output; enabled packs and rule decisions; allowlists/exception stores; hook
path/definition/digest; trust/enabled status; and effective managed-only settings.
Do not put secrets in the record. Unsigned tag status is not binary signature status.

## Evidence matrix

Record `passed`, `failed`, `not-run`, `skipped`, or `not-applicable with evidence`.
For each row record exact environment, action/data, command, actual result, retained
record and whether it blocks adoption. A skipped test is never converted to passed.

| Check | Required result |
|---|---|
| Licence/terms clearance | Exact selected text/rider, intended use, actual clearance or required written permission; blocked means no execution |
| Release verification and identity | Approved version/source, real binary digest and required verified signature/provenance |
| Native schema/config loading | Consumer schema accepts candidate; deployed effective config matches approved intent |
| Native diagnostics | Enabled/reachable trusted hook and actual diagnostic output; no unexplained failure |
| Isolated 26-case protocol suite | Actual versioned binary gives expected JSON/allow behaviour; raw evidence retained |
| Real safe commands | Work normally without DCG noise or inappropriate intervention |
| Real hard reset/force/delete in disposable fixtures | DCG hook event attributable; original sentinel and Git state unchanged |
| Options/wrappers used on the host | Actual Windows/POSIX spellings and executable variants are covered |
| force-with-lease | Disallowed under the approved strict policy, not silently treated as authorized |
| Rebase checkout/restore recovery | Real interrupted-rebase fixture tested; unwanted loss blocked or independently prevented |
| Temp-directory deletion | Remaining consumers/evidence respected; literal temp allowance does not imply disposal permission |
| Native unified execution | Actual `exec_command` path intercepted by this installed version |
| Interactive stdin/other tool paths | Unhooked paths explicitly restricted with real capabilities or excluded from authorized operations |
| Worker sessions | Effective native hook, trust/policy and permissions verified on actual spawned workers |
| Missing/disabled/untrusted/malformed/timed-out hook | Missing protection detected; no claim of successful enforcement or automatic high-privilege continuation |
| Scoped exception | Granted only by independent authority; exact scope and lifetime understood and tested |
| Legitimate maintenance | Approved rebase/amend/worktree cleanup has a workable operator route without evasion |
| Coexisting controls | SDLC Stop hook, sandbox, Issue/merge controls and unrelated hooks still function |
| Initial host smoke | Native interception and coexisting controls work under the adopted exact host configuration |

Do not create real cloud/database resources, remotes, public Issues or vulnerable
production data merely for a smoke test. Most rule evaluation uses inert command
strings. Any actual destructive host probe belongs entirely in a disposable,
authorized fixture with recovery and sentinel verification, never the working repo.

## Residual gaps

For each unresolved gap specify affected surface, cause, consequence, actual
restriction/compensating mechanism, independent owner, evidence and next review.
A prompt promise is not a capability restriction. If an essential surface cannot be
protected adequately, block reliance there or keep that operation operator-only
under enforceable permissions. No home-grown generic fallback is supplied.

## Initial acceptance decision

Record adopted and excluded surfaces, licence/permission decision, version/config-bound
evidence, residual-risk controls and reassessment triggers. This is independent of
an agent-generated result. Only after actual acceptance may the recorded protected
operations rely on DCG. The SDLC package's deployment status changes only when Max
explicitly confirms it, not because an example record has been filled in.

## Continued operation

Reference accepted environment evidence instead of rerunning this entire suite for
every task. Recheck latest stable before selecting a refreshed binary and test the
new exact configuration before relying on it. Changes to execution path, permissions,
trust or native hook invalidate affected assurance. Do not claim absence of errors
or a successful installation as intercepted-command evidence.
