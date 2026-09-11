# WP4 operator diagnostic worksheet — proposal

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

Use this as a section in the existing protected investigation/environment record. It is not a new runtime schema, a permanent per-command logging requirement, or permission to run a command. The main implementation plan owns the proposed procedure and source register. No field below is prefilled with an assertion about the current Windows host.

## 1. Scope and permissions

| Field | Actual value / evidence |
|---|---|
| Existing task / Issue #30 reference | To record |
| Accepted diagnostic activity and operator | To record |
| Current repository/worktree and owner | To record |
| Current main/candidate full SHA and relevant dirty inputs | To record |
| Original case | C4-PS or C4-CMD; keep separate records |
| Event kind | Historical evidence; present reproduction; synthetic probe; candidate qualification |
| Original task-owner/receiving-owner reference | To record; unknown stays unknown |
| Raw protected evidence location and permitted writer/readers | To record |
| Permitted trace/configuration scope | To record |
| Candidate binary execution/installation authority | To record separately; none implied |
| Real host/model-run authority | To record separately; none implied |
| Configuration/trust-change authority | Exact authorised diff or none |
| Upstream publication authority and destination | To record separately or none |
| Retention/reassessment event | Existing policy/consumer event; no invented automatic expiry |

Do not begin by changing hooks or upgrading DCG. Preserve the recorded baseline first. Do not access or alter another worktree's active state to make diagnostic commands possible.

## 2. Historical evidence inventory

| Item | Original retained locator | Accessible now? | Provenance/limit |
|---|---|---|---|
| Full reported command | | | Published transcription is not original hook bytes |
| Original tool invocation including shell/login/cwd | | | Missing values must not come from today's defaults |
| Original hook stdin and response | | | A UI reason alone is not the whole envelope |
| Native `unknown`/`ps`/`cmd` diagnostic outputs | | | Preserve decision/rule and process exit separately |
| Historical binary/config/hook/pack receipt | | | Reported hashes do not prove current equality |
| Eight earlier smaller PowerShell controls | | | Exact text not present in Issue; do not invent it |
| WebVOWL reduced positive control | | | Its patterns differ from the original search |
| Original semantic input files | | | Use WP0's actual preservation evidence where available |

Store a published transcription and a new host capture under different identities. Never mark a reconstructed envelope as the original payload. A redacted copy receives its own digest and a reference to the restricted original if retained.

## 3. Correlated occurrence record

### Request and actual execution

| Field | Actual value / evidence |
|---|---|
| UTC timestamp and correlation IDs | |
| Desktop/CLI interface and exact build | |
| Embedded execution-engine identity, if exposed | Unknown until observed; installed CLI is not a substitute |
| OS/build, native/WSL distinction, process architecture | |
| Requested tool name and complete permitted arguments | |
| Requested shell executable, login and cwd | |
| Effective selected shell executable, arguments and cwd | |
| Fallback or rewritten input, including responsible component | |
| Native PowerShell argument-passing mode, where material | |
| Actual cmd flags/expansion/startup behavior, where material | |
| Command value byte representation used for hashing | |
| Command digest/length and newline/BOM observations | |
| Relevant executable resolution and version/digest | |
| Actual semantic fixture/input identity | |

### Native guard and hook

| Field | Actual value / evidence |
|---|---|
| DCG absolute executable path, version, digest and OS | |
| Native source/release identity and required verification receipt | |
| Exact terms/rider and applicable execution decision reference | |
| Hook sources, handlers, matcher and synchrony | |
| Hook enabled/trusted state and exact definition identity | |
| Duplicate matching hooks and their attributable results | |
| Managed-only effects or explicitly excluded sources | |
| Raw hook-input length/digest/restricted locator | |
| Decoded event/tool/turn/session/cwd and material extra fields | |
| Effective configuration location/digest and native readback | |
| Loaded packs, custom-pack validity and their identities | |
| Relevant environment key presence and safe values | |
| Sensitive environment values | Restricted reference only where necessary; no public dump |
| Native protocol selection and resolved/refined dialect | Observed or source-inferred; distinguish explicitly |
| Rule/source/match span/reason actually returned | Unknown field stays unknown |
| Native stdout/stderr raw references | |
| Native exit code and separate process error/timeout | |
| Host's interpreted deny/allow/error result | |

Do not infer the actual shell from `tool_name: Bash`. Do not infer DCG's input from a sibling observer's log. Any temporary observation change has its own exact approval, capture scope and retirement condition; it does not modify the command or verdict.

### Outcome and preservation

| Field | Actual value / evidence |
|---|---|
| Was the target consumer actually invoked? | |
| Native hook attribution | Actual trace/event or explicit gap |
| Target return code and output | Separate from guard's return code |
| Independent expected result | Defined before checking candidate output |
| Semantic match or failure | |
| Inputs/control identities before and after | |
| Known permitted side effects and actual observations | |
| Raw evidence retained/read back | |
| Public/sanitised derivative and redactions | |
| Current conclusion and uncertainty | |
| Next actor and concrete unmet dependency | |

## 4. Diagnostic comparison table

Use one row per actual invocation. Do not fill future rows with expected results.

| Run reference | Case/text digest | Envelope kind | DCG OS/version/digest | Config identity/scope | Explicit/resolved dialect | Native decision | Rule/reason | Process exit/error | Target executed? | Result scope |
|---|---|---|---|---|---|---|---|---|---|---|
| To record | | | | | | | | | | |

Envelope kinds: native CLI text diagnostic; synthetic command-only Codex envelope; original captured envelope; sanitised derivative; actual protected-host event. An actual host occurrence is not manufactured by replaying JSON to a standalone process.

For native `explain`, all diagnostic exit codes may be zero while decisions differ. For the existing minimal Codex hook contract, silent zero and zero with deny JSON are different outcomes. A binary error, malformed reply, unknown request skipped by the guard or another component's refusal is not a completed native decision proof.

## 5. Reduction log

| Candidate | Parent/digest | Specific reduction | Outer/embedded syntax check | Independent benign meaning | Native failure signature | Keep/reject and reason |
|---|---|---|---|---|---|---|
| Original | | None | | | | Preserve |

Reduce only through native data diagnostics. Do not execute the candidate script to decide whether it parses. A changed syntax error, missing path, different policy or truncated envelope is not the same failure. Record local minimality with the attempted reduction strategy rather than claiming a globally shortest command.

## 6. Causal decision

| Field | Actual conclusion / evidence |
|---|---|
| First demonstrated divergence | |
| Correct intended behavior and authoritative basis | |
| Strongest competing explanation tested | |
| Responsible owner(s) | |
| Selected branch | D4-PRODUCER / D4-HOST / D4-CONSUMER / D4-PARSER / D4-DEPLOYMENT / D4-UPSTREAM-PENDING |
| Exact source/configuration change | Pending until demonstrated; no speculative production patch |
| Safety invariant that must remain true | |
| Relevant native positive/negative regression IDs | |
| Required upstream report or producer-consumer agreement | |
| Current local issue disposition | |

## 7. Exact deployment proposal — fill only after diagnosis

| Surface | Current exact identity/setting | Proposed exact identity/setting | Necessity and behavioral impact | Preservation/recovery | Approval |
|---|---|---|---|---|---|
| Binary | | | | | |
| Hook definition | | | | | |
| Trust/enabled state | | | | | |
| Effective native configuration/custom packs | | | | | |
| Host release/engine | | | | | |

“No change” is a valid entry. Do not edit an unrelated surface just to make every row active. Keep canonical hook matching, synchronous enforcement, native policy ownership and coexisting Stop controls. A new supported effective-shell protocol requires the actual host and consumer to agree; a guessed field in a local example is not that agreement.

## 8. Final A09 and handoff

| Claim | Actual evidence or remaining gap |
|---|---|
| Full C4-PS safe semantics through installed guarded Windows path | |
| C4-CMD actual safe semantics and separate quoting disposition | |
| Corresponding destructive specimens denied strictly as native input data | |
| Affected host-denial scope, using non-destructive-by-construction evidence only | |
| Coexisting controls and restricted unproved surfaces | |
| Actual current native configuration/hook/binary/host identity | |
| Required local/native final tests and independent review | |
| Original failed and candidate evidence retained/read back | |
| O41 real useful-work result | |
| O42 receiving-maintainer handoff | |
| Upstream fix released and actually installed? | |
| Removed diagnostic working copies or deliberate survivors | |
| Next review trigger | |

Choose the actual status: diagnosis incomplete; cause established/upstream or deployment pending; candidate qualified/host acceptance pending; protected Windows scope qualified. No field, checklist, hash or agent-written approval authenticates a human decision or supplies permission to bypass a guard.
