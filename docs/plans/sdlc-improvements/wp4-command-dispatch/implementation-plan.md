# WP4 — Diagnose and qualify the real command-dispatch boundary (#30)

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Implementation plan — 10 September 2026**  
**Parent:** `../implementation-plan.md`, WP4 and acceptance criterion A09.  
**Maintained issue:** Hadden-Industries/universal-ontology #30.  
**Status:** proposed execution and acceptance plan; no runtime repair, configuration approval, deployment or host qualification is claimed.

## 1. Objective and decision

Restore the reported benign verification/search operations through their **actual protected Windows execution paths**, while retaining the adopted protection against corresponding destructive operations. Establish the cause at the command producer, host dispatch, native DCG consumer or deployed configuration boundary before changing behavior. A shorter command that happens to pass, a native diagnostic allowance, and a successfully installed release are separate observations—not substitutes for this outcome. [P01, R01, R02]

The selected approach is **diagnosis-led native repair**. Reuse the existing DCG executable, its diagnostics, the repository's inert protocol probe and existing environment-acceptance record. Add only the reproduced regression and the change belonging to its demonstrated owner. Do not build a second classifier, a shell-guessing wrapper, a runtime interception service, a generic minimization platform or a new lifecycle state model.

Two independent cases must be dispositioned: the complete PowerShell/Python inventory command in Issue #30 and the `cmd.exe`/ripgrep search in its WebVOWL comment. They may share a dispatch cause; that remains a hypothesis. Correcting the WebVOWL command's quoting, if necessary, does not automatically resolve its misleading shell classification or the PowerShell case. [R01, R02]

### 1.1 Parent contract preserved

| Parent requirement | WP4 implementation obligation |
|---|---|
| P1 diagnostic followed by the smallest evidenced repair | Begin with preserved evidence and native diagnosis. Select the runtime change only at the causal decision in WP4.5. P1 is priority, not an R0–R3 route. |
| Capture actual request, shell, login, escaping, cwd, environment, host, binary/config and dialect | Produce a correlated boundary record with explicit absent/unavailable fields; do not fill historical gaps from today's defaults. |
| Minimize the full failure; include the second case | Preserve original text and failure signature; syntax-valid reductions remain separate evidence. Do not replace either case with a convenient control. |
| Repair at the responsible owner | Use the producer, host, native consumer or operator branch in §7; no repository replacement classifier. |
| Exact configuration changes require approval | Present exact implicated file/settings after diagnosis, before applying them. The documentation amendments supplied here are also proposals. |
| A09: protected benign dispatch and inert negative controls | Require an attributable actual Windows dispatch with correct semantic output, plus corresponding native denials of destructive text retained strictly as data. |
| Preserve prior failures and adopted identities | Keep historical denials and environment receipts unchanged; append qualification and identify the installed candidate, not just upstream source. |
| No real destructive commands as negative tests | The catalogue's destructive specimens are never executed. Any host-denial challenge must be demonstrably non-destructive by construction, or its host claim remains unproved. |

This plan does not weaken the parent's no-destructive-test boundary even where a more general DCG acceptance template describes broader disposable destructive fixtures. [P01, R06]

### 1.2 Scope and authority

Read-only source analysis and preparation have no dependency on another work package. Installing/executing a newly selected binary, changing host hook/configuration/trust, capturing sensitive traces, running a real agent, committing, publishing an upstream report, pushing and accepting deployment remain separately authorised actions. The user request for this document is not those approvals. [R03, R06]

For a material host/guard behavior or deployment repair, propose **R2**, justified by changing a command-protection boundary. Use the accepted Issue/baseline procedure for that implementation. Bounded read-only diagnosis need not fabricate an R2 implementation baseline in advance of understanding the change. Do not describe the current draft issue as accepted or create a second issue solely to contain this plan. [R01, R03]

**Out of scope:** worktree removal and branch deletion; WP1's general verifier redesign; WP2 ownership/exclusive creation; WP3 disposition tooling; Codex Security scan inventory/artifact changes; new supported hosts; migration to another guard; blanket exceptions; automatic guard updates; unrelated native vulnerabilities or release-policy changes.

## 2. Evidence baseline and limits

The following are research observations, not executed qualification in the user's Windows environment. Repository `main` resolved to `79d187802f9255134c03d0786ff75181ed1070ee`. Issue #30 remained open with `sdlc:bug` and `state:draft`. Its last recorded update was 9 September 2026 at 10:55:12 UTC. No conclusion about private or uncommitted repairs follows from those public observations. [R00, R01]

### 2.1 C4-PS — original PowerShell inventory operation

The reported `functions.exec -> exec_command` operation reads local Markdown and Python, parses Python source using `ast.parse`, checks inventories and relative links, and prints the result. It was rejected before execution with:

```text
windows.filesystem:windows-filesystem-semantic-unverified
```

The reason refers to unresolved shell syntax in an executable or destructive-option position. The full command's native diagnostic comparison is recorded as follows. [R01]

| Explicit diagnostic dialect | Recorded JSON decision | Recorded denial rule |
|---|---|---|
| `unknown` | deny | `windows.filesystem:windows-filesystem-semantic-unverified` |
| `ps` | allow | none |
| `cmd` | deny | `windows.filesystem:windows-filesystem-semantic-unverified` |

All three diagnostic processes exited zero. The comparison does not establish the actual host-selected dialect. Eight smaller benign controls were allowed under `unknown`; their complete bytes are not supplied by the Issue, so this plan does not fabricate them. The complete input has not yet been minimized in the report. [R01]

Recorded environment: branch `feat/shacl-policy-source-of-truth`, HEAD `36a51ff4bb76b98c59fe7fe3d225b8762ab23eeb`; DCG 0.14.1, build `9569d4f181e43e7bdd4fba254834762a092b4b29`; executable SHA-256 `46d8b7c9d9e16e87b1b7b47bbbadb22aecea0d9575f07c663e6f32bb3431a534`. The actual Codex build, original hook envelope, inherited hook environment and resolved dialect remain missing. These values must not be inferred from a newer run. [R01]

The supplied `reproductions/issue-30-powershell-command.ps1.txt` transcribes the published text as data. Its UTF-8/LF serialization is a package choice, not proof of the original wire bytes. The numeric inventories 58 assertion sites, 33 Wiki groups and 27 decision IDs are historical expected facts for the reported inputs, not universal invariants to impose on later changed sources.

### 2.2 C4-CMD — WebVOWL search operation

The comment records requested shell `C:\Windows\System32\cmd.exe` and `login: false`. The blocked search was:

```text
rg -n -e Task.9 -e ^###.Task -e ^##.Task -e Remaining -e Status: docs/plans/2026-08-29-webmcp-integration.md
```

The native denial reason mentions PowerShell substitution and comment syntax. The comment supplies no rule identifier and no recaptured hook envelope/native binary identity; do not assign C4-PS's rule or binary to it. It also warns that the caret-heavy expressions are shell-sensitive and their intended quoting was not established. [R02]

The reduced search that subsequently ran uses `Task.9`, `Task.13`, `Task.14` and `Remaining`, omitting the original anchored/comment-like expressions and `Status:`. It is a useful positive comparison, not an equivalent replacement or proof of repair. WebVOWL's recorded branch HEAD is `7fe956151e3dd77a8b7e07cdee4e65d068deebc1`. [R02]

### 2.3 Existing acceptance is deliberately narrow

The adoption record describes DCG 0.14.1, 35 successful inert protocol cases and one attributable native Windows hard-reset argument-order denial aimed at a deliberately absent target. It expressly leaves other spellings, worker sessions, interactive input and other surfaces unproved. The checked-in default corpus currently contains 26 cases. These are different records: do not silently replace 35 with 26, invent nine cases, or demand a historical count while ignoring case identity. [R04, R07]

| Recorded object | Historical SHA-256 |
|---|---|
| DCG executable | `46d8b7c9d9e16e87b1b7b47bbbadb22aecea0d9575f07c663e6f32bb3431a534` |
| Operator configuration | `07c8f7cf372c00b2a2fbdda40ed9a4637d541984195f68e3543290853e719e16` |
| Hard-reset pack | `e62af55b59293b84194ded18117e4183f835922ca9f69d6fa829e7c124cff9aa` |
| User hook definition | `7ac64d496dd3fc4d7453629f167ddd6224c89e64fb9f47a0d227f9831fa54cef` |

These hashes identify the recorded environment, not today's installed state. Read back the actual files and effective configuration before comparisons. Preserve the exact licence/rider and owner decision without representing that decision as an author-issued licence exception. [R04]

### 2.4 Important native source evidence

In the pinned 0.14.1 source, `ToolInput` declares only `command`. `shell_dialect_for_tool_name` maps `bash` to POSIX, explicit PowerShell names to PowerShell and explicit cmd names to Cmd. A separate `codex_host_shell_dialect` handles a Codex-protocol, Bash-labelled command on a Windows host: sufficiently short input is examined using the native POSIX substitution parser; a successful parse selects `Unknown`, while its parse error selects PowerShell. Oversized input keeps `Unknown`. Explicit dialect labels and non-Windows hosts are treated differently. [U01]

This establishes a concrete source-level hypothesis: an ambiguous Bash-labelled Windows request can enter cross-dialect analysis even when the caller requested one particular shell. It does **not** prove the actual incident entered that function with those values, nor that a safe fix is to force every Windows request to PowerShell. The source explains the security reason for retaining conservative interpretation where executable syntax remains ambiguous. An environment variable or an invented JSON field is not a demonstrated consumed protocol. [U01]

A Linux replay does not execute the same Windows-specific path. Similarly, an explicit `--dialect ps` diagnostic is not equivalent to a native hook invocation whose protocol and host platform choose the interpretation. These distinctions must appear in every result table.

### 2.5 Current candidate release, not an established repair

GitHub's latest-release endpoint returned **DCG v0.14.2**, published **9 September 2026 at 11:10:21 UTC** (14:10:21 in Cyprus), with source/target identity `e4a2fed44e3813e4344d6f3029c0d8a32ac1c75e`. Refresh release and peeled tag identity when selecting an actual installation. [U02]

The inspected changelog includes a POSIX semicolon-joined heredoc masking fix (#393), more accurate diagnosis of invalid Codex hook configuration (#391), a credential-file-write rule and dependency updates. It does not establish that either local reproduction is fixed. In particular, a POSIX heredoc is not the original PowerShell here-string, and improved `doctor` reporting is not proof of interception. Do not upgrade first and lose the old comparison, or assume the newer release uses the same complete policy behavior. [U03]

### 2.6 Source-derived, inferred and still unknown

| Classification | Statement |
|---|---|
| Reported fact | The two original operations were rejected, and the recorded explicit-dialect/shorter-command comparisons differ. |
| Inspected code fact | The existing probe synthesizes a command-only Bash envelope in an isolated home; the pinned native consumer has Windows-specific interpretation. |
| Causal hypothesis | Missing or ignored effective-shell context could explain the observed cross-dialect false positives. |
| Not yet established | Actual bytes reaching DCG, actual selected parser path, correct intended cmd argv, exact installed candidate behavior, and responsible component for each incident. |
| Proposed requirement | The repair must retain native negative controls and demonstrate original safe semantics through the actual guarded Windows path. |

## 3. Evidence and responsibility architecture

### 3.1 Four different claims

| Layer | Question | Consumer/evidence | Does not establish |
|---|---|---|---|
| Semantic input | What operation and arguments should run? | Independently authored expectations; native shell parsing/argument observation; actual fixture data | Guard acceptance or hook execution |
| Native classification | How does this version/policy/dialect classify the text? | Native `explain`/test diagnostics with original output | Actual host dispatch or original selected dialect |
| Hook protocol | Does native DCG correctly consume this envelope and emit its protocol result? | Exact/synthetic-envelope replay to DCG stdin, clearly labelled | Hook loading/trust, actual target execution or original wire provenance |
| Protected host | Did this installed host invoke and consume the guard, then execute only the allowed operation correctly? | Correlated native event and target result/readback, effective identities | Protection on untested tools, worker hosts or later interactive input |

Only the fourth layer plus independent semantic expectations closes protected benign dispatch. The negative side additionally needs native deny evidence for the corresponding inert specimens and preservation of the adopted host-denial scope. No green result should be relabelled as evidence of another layer. [P01, R05, R06]

### 3.2 Ownership

| Responsibility | Owner |
|---|---|
| Maintain Issue #30, correlate the two cases, select the smallest local change | Existing repository integration maintainer |
| Control effective host executable, hook registration/trust, configuration and trace permissions | Existing authorised operator; Max accepts project decisions |
| Correct host request/resolution propagation if implicated | Codex host maintainer, coordinated through an appropriately scoped upstream report |
| Correct native input/dialect/parser behavior if implicated | DCG maintainer, using native tests and supported release path |
| Supply expected inventory/search results and original inputs | Original task owner or an attributable receiving owner |
| Verify the accepted repair and protected host | Already authorised independent verifier with the permissions actually needed |

This adds no compulsory new agent roles. A test author must not derive expected safe/unsafe results from the classifier under repair. An implementing agent does not grant itself hook trust, change exception stores, or reinterpret the owner's earlier unrelated authorisations.

### 3.3 Work-package dependencies

| Other package | Relationship |
|---|---|
| WP0 | Use its executed preservation records to access historical evidence where available. Its plan is not proof that a backup exists. Do not use the six historical worktrees for destructive tests. |
| WP1 | Prefer its actually landed text/evidence improvements for reliable output capture. Until then, document any approved invocation-local mode; do not silently change all environments or call the old default path fixed. |
| WP2 | Use an independently owned checkout and frozen candidate. Do not add a scheduler or mutate another execution's state to reproduce #30. |
| WP3 | A real guard-denied resource operation can have a visible operator disposition. Deliberate `strict_git` worktree restrictions are not targets for relaxation in WP4. |
| WP5 | Codex Security #820 is a scan inventory change. It neither classifies shell commands nor fixes this host boundary. |
| WP8 | Transfer the precise qualified scope and evidence. Another repository/host must confirm its own relevant configuration; no blanket cross-repository adoption. |

## 4. Bind the actual dispatch before changing it

Use the companion operator worksheet as a section in the existing protected investigation record. It is not a new required permanent schema. Keep large raw traces in the approved evidence location; use safe references in public issues.

### 4.1 Minimum correlated capture

| Boundary | Capture | Why it matters |
|---|---|---|
| Requested operation | Literal requested tool name, command, shell parameter, login value, cwd and invocation ID | Caller intent is not necessarily executed state. |
| Host identity | Desktop build, embedded execution-engine identity if exposed, interface and OS build | A separately installed CLI version does not identify the desktop's embedded engine. |
| Host resolution | Actual selected shell executable and arguments, resolved cwd, fallback/rewrites and effective argument-passing mode | A missing requested shell or changed launch command can invalidate diagnostic comparisons. |
| Hook event | Original event/tool name, IDs, complete permitted payload, raw length/digest and decoded command length/digest | Prevent silent dropping, truncation, double-unescaping or relabelling. |
| DCG process | Resolved binary/digest/version/architecture, actual process OS and command arguments | Windows and WSL/Linux can execute different native paths. |
| Native interpretation | Protocol selection, received label and resolved/refined dialect, match span/rule/source when actually exposed | The UI reason or explicit CLI dialect alone cannot prove this path. |
| Loaded policy | Config path/digest, native effective output, enabled and actually loaded custom packs, relevant exception/bypass state | An isolated candidate config is not a readback of the deployed process. |
| Hook activation | All applicable sources, synchronous handler, matcher, enabled/trusted state, duplicates and managed-only effects | A visible definition can be skipped or a second hook can be the actual blocker. |
| Result | Separate native stdout/stderr/exit/error; host accept/deny/error result; target exit and semantic output | Never conflate classifier exit, hook decision and target return code. |
| Preservation | Raw restricted copy, sanitised derivative, redaction map and readback | Public reproduction should not expose unrelated commands, secrets or local evidence. |

Record the host and guard environment structurally. Capture safe relevant values for shell selection, home/config resolution and native behavior; for credential/bypass/exception values that are sensitive, retain presence/type and a restricted reference rather than dumping the environment. Do not hash low-entropy secret values into a public record. Do not execute `config`, `doctor` or a probe through a different identity and call its result the hook process's effective state. [R03, R04]

### 4.2 How to obtain the evidence without replacing the guard

Start with the existing originating transcript, native hook event output, supported host diagnostic/export surface and operator environment receipt. Use only scoped access. The original reports do not supply a stable raw-stdin capture API; this plan does not invent one.

If the available native diagnostics cannot expose the needed payload/resolution, retain the exact missing boundary. Prepare a minimal maintainer-owned observation change in the responsible host/native component, limited to an authorised synthetic session: capture the already constructed hook payload and selected execution metadata without editing either, preserve original decision/exit behavior, disable it by default, restrict the destination, and retire it after the correlated observation. Its exact code/configuration and disclosure need approval. Do not insert a persistent shell wrapper between the host and DCG, guess missing fields, or install a second classifier merely for logging.

A second observational hook is not the preferred design. If separately authorised for a narrow purpose, label its receipt as that observer's copy. It does not itself prove the bytes received by the DCG handler. Coexisting matching hooks can run concurrently; do not use their apparent log order as a happens-before guarantee. Do not print trace text onto a machine-protocol stdout channel. Current host documentation also makes hook trust and tool coverage explicit; qualify the actual installed build rather than importing these facts as its acceptance record. [H01]

When the original raw request is irretrievable, retain the published command and a new correlated reproduction as separate records. A new occurrence can qualify the repaired present path; it cannot retroactively establish the exact historical shell or payload. If the original symptom no longer reproduces, preserve that result and identify what changed before attributing a fix.

### 4.3 Syntax and execution metadata are different

For C4-PS, identify PowerShell version and the actual `$PSNativeCommandArgumentPassing` value when relevant. Use the native parser for syntax and a harmless diagnostic argument receiver, where necessary and authorised, to observe transport. Do not infer argv from the visual tool-call string. For C4-CMD, inspect actual `/c`/`/s`/`/d` or other supplied arguments; `login: false` is not proof of any particular cmd flags or absence of startup behavior. [H02, H03]

An argument-receiver substitution is a **diagnostic variant**. It does not replace the required final run using the actual Python or ripgrep consumer. Native syntax acceptance likewise does not establish read-only intent or the expected inventory/search result. Never evaluate a minimized arbitrary script merely to discover whether it parses.

## 5. Replay and minimization contracts

### 5.1 Preserve exact input as data

The published transcriptions are initial seeds. Bind actual captured bytes separately when acquired. Preserve original command text, input serialization, line endings and final newline; compare decoded command values separately from JSON wire serialization. Hashes identify the representation actually hashed.

A safe replay process executes only a fixed, approved DCG binary with supported diagnostic arguments, or sends a hook envelope as stdin data to that binary with `shell=False`. It never calls the candidate text, shell, `eval`, `exec`, `Invoke-Expression`, a dynamic import, or a generated command. No wrapper or data filename may convert a previously denied operation into execution. Negative specimens stay inside this data boundary. [R05]

The Issue supplies this native diagnostic shape; check the installed help before using it:

```powershell
# Diagnostic only: command text is data to DCG, not invoked.
$CommandText = Get-Content -Raw -LiteralPath $CapturedCommandTextPath
& $Dcg explain --format json --dialect unknown $CommandText
& $Dcg explain --format json --dialect ps $CommandText
& $Dcg explain --format json --dialect cmd $CommandText
```

Bind `$Dcg` to the approved absolute binary. Preserve each invocation's distinct result using the approved byte-preserving evidence capture. Do not infer an allowance from `$LASTEXITCODE -eq 0`, and do not feed resulting shell text to another interpreter. A native JSON decision and rule/reason determine the diagnostic result. [R01]

Run the existing isolated suite through its established entry point when authorised:

```text
node scripts/runRepositoryPython.js scripts/probe_dcg_hook_protocol.py
  --dcg <approved-absolute-binary>
  --config <reviewed-candidate-config>
  --expected-version <selected-exact-version>
  --cases .sdlc/dcg/hook-probe-cases.json
  --output <new-owned-report-path>
```

This invocation is shown across lines for readability, not as a shell-specific paste command. Replace placeholders with real values. It is the existing candidate-policy probe, not deployed-state replay. It creates its own isolated home/configuration and preserves `hostInterceptionTested: false`. [R05]

### 5.2 Comparison matrix

For each original and accepted reduction record command digest, envelope provenance, guard OS/binary/config identity, explicitly selected or resolved dialect, native decision, rule/reason, process exit, capture errors and input context.

Compare the recorded installed version with an approved current candidate only after preserving the baseline. Keep config, command and test context constant where the comparison permits it. If an upgrade changes supported settings or rules, record that delta and classify the comparison accordingly instead of claiming a one-variable experiment.

Required rows are: explicit native dialects for diagnosis; the command-only synthetic Codex envelope on native Windows; the actual captured envelope under matching material conditions; the current protected host; and legitimate nearby controls. POSIX/WSL rows are selective safety/preservation controls, not new deployment promises.

### 5.3 Failure-preserving reduction

Define the reduction predicate before reducing:

> The candidate remains syntactically valid for the intended outer shell and embedded language, retains the independently checked benign operation category, and produces the same material native denial mechanism under the identified binary/configuration/platform/entry point.

A different syntax error, missing command, malformed JSON, timeout, permission failure or changed deny mechanism does not meet that predicate. If a native source/trace is unavailable, call the preserved property a matching observable failure signature, not a proven same internal cause.

Start at logical regions, then statements, expressions and argument segments. Preserve PowerShell literal here-string delimiters and the distinction between shell syntax and Python regex data. For cmd, reduce one pattern at a time and retain any corrected quoting variant separately. Use native syntax checks and Python `ast.parse` as bounded aids, not a custom shell grammar.

Retain the original seed, every retained candidate's parent/digest and change, syntax/semantic assessment, native observations and acceptance/rejection of that reduction. Keep the final positive neighbor and the corresponding forbidden-operation control as data. Stop when further reductions under the documented strategy no longer preserve the predicate; describe the result as locally minimal for that strategy, not globally shortest.

Do not require a fixed large replay count. Confirm the minimized signature and one original replay; investigate variability if observed. If reduction stops being useful, preserve the full deterministic reproducer and state the non-minimality. An exact reproducible full input remains actionable upstream.

## 6. Tooling reuse and bounded implementation changes

### 6.1 Keep the existing probe's responsibility

`probe_dcg_hook_protocol.py` already executes the native binary without executing candidate commands, obtains the native configuration schema, validates the candidate using the maintained `jsonschema` implementation, records effective-config output, checks selected inputs for changes and rejects unknown/malformed native replies. Its tests explicitly distinguish stub orchestration from native detection and host interception. Keep those boundaries. [R05, R08]

Its present limitations matter to this investigation:

| Source-inspected limitation | Treatment |
|---|---|
| Cases are exactly `{id, command, expectedDecision}` | Do not add imaginary shell metadata to the existing corpus. Keep richer diagnostic observations in the worksheet. Change the case contract only for an accepted, consumed native interface. |
| Every case gets a synthetic command-only `Bash` envelope with a turn ID | Use it for that precisely named case. Use separately identified actual-envelope data replay for host correlation. Never label manufactured IDs/fields as a captured request. |
| Home/configuration are deliberately isolated | Preserve this mode; deployed-policy diagnosis is a separate operator observation. Do not broaden the probe to inherit live credentials/configuration by default. |
| Native output uses UTF-8 replacement decoding | If exact diagnostic-byte retention is needed, first add a failing orchestration test, then preserve bytes before strict display/protocol decoding. Lossy display must not silently become a successful exact replay. |
| Timeout handling drops partial stdout/stderr | If exercised in the investigation, add a test and retain available partial output; timeout remains indeterminate. This is a diagnostic-capture limitation, not proof of the Issue #32 failure mechanism. |
| Silence plus exit zero is the documented allow shape | For an actual captured request, independently establish that the intended shell command was recognized. A skipped/unsupported input can also be silent; silence alone does not prove classification or interception. |

The last distinction is important when experimenting with event/tool labels. Do not “repair” a false positive by sending a label the guard ignores. Use known recognized envelopes, native trace/source evidence and attributable protected-host behavior.

### 6.2 Minimum code changes if the probe needs exact capture

Keep changes in `scripts/probe_dcg_hook_protocol.py` and `tests/sdlc/test_dcg_protocol_probe.py`; do not extract a new generic process library unless an actual shared consumer requires it.

Before edits, add tests for invalid UTF-8, retained partial timeout bytes, native decision versus process exit, no execution of payload content and no-overwrite reports. Change `invoke_native` to capture raw bytes first. Keep supported arguments fixed; `shell=False` remains. Preserve raw bytes in new run-owned artifacts or a clearly versioned binary representation, with digest/length and a text decoding result. Do not put arbitrary native bytes straight into unversioned JSON strings. Inspect every result consumer before accepting a report-format change.

Retain separate outcomes: native process completed; native protocol parsed; native decision; expectation comparison; evidence persisted; actual host not tested. If raw evidence cannot be retained, report failure before describing the run as complete. Do not swallow an output-write error or overwrite an earlier report.

This branch is **conditional tooling repair**, not a prerequisite framework. If the existing approved evidence capture already retains the needed native bytes and timeouts are not involved, use it and make no probe code change. The final implementation record must identify which branch actually ran and why.

### 6.3 Add only maintained regression data

After confirming cause and intended behavior, add the smallest stable benign native-hook regression plus the relevant safety neighbor to the owning upstream suite. Add a repository case only when its expected decision is justified under the actual candidate policy/platform and fits the existing corpus's contract. Retain the full original command as identified regression/reproduction evidence even when a smaller upstream test is sufficient for maintenance.

Do not turn the entire investigative matrix into a mandatory per-task suite. Do not change a historical expected deny to allow simply to make today's uncorrected candidate green. Clearly distinguish the old observed result, proposed requirement and repaired expectation.

## 7. Repair decision table and exact implementation branches

The final causal record must name the failing component, exact evidence, required/prohibited effect, selected change, rejected shortcuts, owner and requalification scope. Several components can be implicated; each change must remain attributable. Choose a branch only when its condition is demonstrated.

### 7.1 D4-PRODUCER — incorrect shell syntax or argument construction

**Condition:** native parsing/argv observation establishes that the command producer did not deliver the intended safe arguments, independently of the guard's conservative interpretation.

Repair the source that constructs the command, using the intended shell's supported quoting and literal data handling. Preserve the user's search predicates or inventory checks; do not remove regex anchors, skip assertions or replace the job with a weaker search. The original blocked text remains diagnostic evidence. Write a consumer test that verifies actual argv or the actual independently expected matches, not just the string spelling.

For C4-CMD, a properly quoted pattern variant is a new explicit case. Verify it through the same protected cmd path after approval. If the original was malformed, record that disposition; it does not prove DCG's cross-dialect reason was correct or resolve C4-PS. Do not modify the interpreter, guard policy, login mode or native argument preference merely to avoid triggering a deny. [R02, H02, H03]

**Acceptance:** the intended safe semantics survive through the real consumer and protected path; relevant forbidden-operation data are still denied. The producer defect and any remaining host/classifier defect have distinct closure conditions.

### 7.2 D4-HOST — selected execution context is lost or incorrectly represented

**Condition:** the host resolves a specific execution context, but the request reaching the native guard lacks it or contradicts it; a controlled comparison attributes the incorrect decision to that boundary.

Prepare a host-maintainer patch at the actual request-construction/resolution owner for the affected installed engine. Inspect and pin its source before naming an edit location; a DCG source comment mentioning a Codex source file is a research lead, not proof that today's desktop binary corresponds to it.

The producer/consumer contract must convey the **effective** selected executable/interpretation and relevant flags after fallback and authorised input rewriting, not merely a model-supplied requested shell. Keep `tool_name: Bash` when that is the host's canonical hook name. Agree the actual field names, schema/version and trust meaning upstream; none is prescribed here as already supported.

Required host tests cover default and explicitly selected PowerShell/cmd, a supported alternative shell where relevant to the existing surface, requested-shell resolution failure, input rewriting if enabled, absent/conflicting metadata and equality between guarded and launched command/context. If another hook changes input after a decision, the host must preserve its documented evaluation safety; do not assume that observing an earlier request proves the final command was checked.

A host-only metadata addition is insufficient if the native DCG version ignores the field. Coordinate the consumer branch and qualify the pair. Do not deploy a repository wrapper that reconstructs a shell from command text, OS, environment defaults or `tool_name`, and do not relabel the event to make an unrelated parser allow it.

**Acceptance:** the actual host emits the supported context consumed by the qualified native guard, it matches the launched operation, and the protected-host matrix passes. An upstream merge without propagation into the running desktop is pending deployment, not local repair.

### 7.3 D4-CONSUMER — supported effective metadata reaches DCG but is ignored/misused

**Condition:** captured data and the pinned consumer path show a supported host context is present, but DCG chooses an incorrect dialect or conflates protocol and shell identity.

Implement the repair in native DCG's actual input/resolution owner. The currently inspected anchors are `HookInput`, `ToolInput`, `shell_dialect_for_tool_name`, `codex_host_shell_dialect` and `refine_shell_dialect` in `src/hook.rs`; trace their real call sites before editing. Preserve output-protocol selection separately from shell interpretation. [U01]

Only an actual supported host contract can justify narrowing interpretation. A free-form field supplied inside arbitrary tool arguments is not automatically authoritative. Conflicting, malformed, missing or unknown context must retain a safe documented disposition. Nested explicit shell launchers and executable substitutions still require the native evaluator's applicable checks. Do not delete conservative widening merely to fix an allow column.

Add native tests for the same command under supported effective contexts, absent metadata, contradictory fields, unknown shell, another protocol and the native Windows platform branch. Retain the existing safety regressions for POSIX-shaped executable data and PowerShell-shaped commands. Classify command-size/oversized-envelope behavior through the native paths when this branch affects them; do not silently skip evaluation at a limit.

**Acceptance:** a released/native candidate processes the real supported envelope correctly and preserves safety neighbors; the installed host/binary pair passes A09. Repository fixture JSON is not an implementation of this native change.

### 7.4 D4-PARSER — the correct selected dialect still misclassifies inert data

**Condition:** a matching native diagnostic/hook comparison shows the correct dialect reaches the parser, but a valid benign data region is treated as executable/destructive syntax.

Keep the fix in the native grammar/token/role-analysis owner responsible for the minimized trigger. Inspect the actual source anchor before naming a module; only `src/hook.rs` is established here for context selection. Use the native language parser/analysis rather than adding a repository regular-expression rule for the observed string.

The test pair must distinguish the same suspicious text in a literal data argument from text in an executable/expanding region. Preserve checks after a here-string/heredoc terminator, in relevant wrappers and at malformed boundaries, but execute destructive variants only as data to the guard. Do not mask an entire Python or PowerShell body, trust every `rg` or `python` invocation, or treat “read-only” in a comment as a semantic proof.

Test the full original reproducer in addition to the minimum example. A narrow native test, corresponding existing upstream safety tests and a full native test command selected from that repository's actual instructions provide the implementation evidence; use its current approved build/format commands rather than invented package scripts.

**Acceptance:** the independently justified benign case is allowed by the native corrected analysis, its executable/destructive neighbors remain denied, and actual Windows dispatch/consumer evidence passes.

### 7.5 D4-DEPLOYMENT — wrong binary/configuration/pack/hook is effective

**Condition:** actual process/configuration evidence contradicts the accepted environment, or more than one hook is responsible for the observation.

Have the authorised operator correct only the identified path, enabled/trusted handler, duplicated registration or native policy deployment. Present the exact old/new configuration and behavioral impact before changing it. Preserve coexisting Stop and other controls; do not switch managed-only settings or rewrite an entire hooks document as a shortcut.

Validate the changed configuration using its native consumer schema and inspect the effective deployed result. Preserve and qualify the custom hard-reset pack and its loading path. A successful main configuration parse does not prove every external pack was loaded. If a required pack is unavailable or invalid, restrict reliance rather than obtaining a false green by omitting it. [R03, R04]

An environment override or stale alternate binary can explain a result only when the actual invocation is identified. Do not delete every installed version or erase evidence to make path resolution simpler. Use the supported deployment/selection mechanism and retain the old authorised recovery reference.

**Acceptance:** exact runtime identity, effective controls and attributable host decisions match the accepted deployment, with original cases and safety neighbors qualified. An intentional `strict_git` restriction remains intentional unless separately changed.

### 7.6 D4-UPSTREAM-PENDING — no supported corrected combination yet

File or append a sanitised upstream report through separately authorised GitHub action. Before publication, search both the exact failure signature and the reduced semantics; link related issues without claiming a duplicate from a similar title. Earlier issues about PowerShell/backtick handling are useful leads, not proof of #30's resolution.

The report should contain the two-case distinction, exact safe minimized input, full original reference, native version/configuration/platform, actual versus synthetic envelope, expected safe semantics, old/new diagnostic observations, negative-control obligations, the causal source anchor if proved and an explicit host-evidence gap if not. Exclude private file contents, local identities, credentials, entire transcripts and unrelated policy material. Record public source/redaction provenance rather than claiming the sanitised envelope is byte-identical to a secret original.

Keep Issue #30's local acceptance open. Continued independent safe work may proceed under existing authority; a supported non-equivalent alternative or operator-only route is a named temporary limitation, not a fix. Do not broaden an allowlist, enable fallback classification, remove a pack or run the blocked operation through another channel while waiting.

## 8. Detailed implementation slices

### WP4.1 — Freeze scope, evidence ownership and current capability

**Inputs:** parent WP4/A09, Issue #30 and comment, current repository/host records, relevant executed WP0 preservation references.

Use the existing task record and propose the implementation route/authority appropriate to the selected activity. Inspect the intended worktree and pending work without changing another execution. Bind exact authorised readers, raw-evidence destination and prospective report recipient. Record which local information is unavailable from remote research. Take current main and issue identities again if they moved since this plan.

Inventory the actual host and native tool identities before any upgrade. Record the historical adoption hashes separately. Inspect supported native help for `explain`, configuration, schema and diagnostics; use the installed meaning of each option, not a remembered newer interface. Review exact licence/rider and intended execution authority for a candidate before running it. No new toolchain installation or policy edit is implied.

**Deliverable:** filled scope/identity header in the operator worksheet, plus existing evidence references and explicitly unfilled historical fields.  
**Exit:** the team knows which path/case it is qualifying and what actions are actually authorised.  
**Failure path:** continue source/read-only preparation only; do not convert missing trace/binary rights into assumed qualification.

### WP4.2 — Capture a correlated protected-host occurrence

Acquire the permitted original transcript/raw evidence where it exists. In an authorised session, capture the actual benign request and its attributable guard result through supported surfaces. Record all intermediate representations from §4 that can be established, including the difference between session cwd and actual command cwd.

Preserve raw trace and a redacted view separately. Inspect hook multiplicity and exact native program invoked. A fresh observation must be labelled with its present host versions and inputs. If the command is still denied, do not resubmit it under a different shell. Complete observation through native diagnostic access or the narrowly approved maintainer observation route; leave missing facts missing.

**Deliverable:** C4-PS and C4-CMD boundary records, or separate explicit gaps.  
**Exit:** sufficiently correlated request/decision/context for meaningful reproduction; no claim that both cases have one cause.  
**Failure path:** retain `diagnosis incomplete` and the exact missing boundary. A mere UI screenshot of a reason cannot support a metadata-loss patch.

### WP4.3 — Reproduce natively and validate the intended semantics

Run the approved native diagnostic dialect comparisons with exact text as data; replay the known synthetic and permitted captured envelopes with their correct platform/configuration scopes. Run the unchanged existing candidate suite where authorised. Inspect decisions independently of process codes and retain raw output.

For semantics, independently inspect the intended files/results. For C4-PS, the actual retained source inventory is the oracle; in a synthetic fixture, author expectations before testing the checker and label the fixture as synthetic. For C4-CMD, compare actual matched line sets and argument handling; assess any corrected quoting variant independently. Do not treat the comment's reduced command as equivalent.

**Deliverable:** native comparison table with original, explicit-dialect and nearby-control results and a separate semantic oracle.  
**Exit:** at least one precise behavioral failure is reproducible, or non-reproduction and changed conditions are explicitly bounded.  
**Failure path:** unavailable native evidence is `not-run`/indeterminate; do not add pretend RED tests based only on text matching.

### WP4.4 — Minimize and locate the causal boundary

Apply §5.3's predicate and preserve each retained reduction. Inspect native trace/source at the selected branch; relate the exact command/request to the relevant parser or resolution decision. Trace host normalization only against an identified source/version; do not substitute upstream main for the installed binary.

Test the strongest competing explanation. Examples: correct parser under explicit context but wrong hook context; bad quoting under the intended shell; different effective config; duplicate guard producing the displayed reason. Keep at least one positive neighboring case and the relevant forbidden-operation data. Document the first evidenced boundary where intended and actual behavior diverge.

**Deliverable:** cause/disposition record per original case, minimal or explicitly non-minimal reproduction, and selected branch from §7.  
**Exit:** repair owner and exact acceptance obligation are supported.  
**Failure path:** do not write a speculative local parser or an unconditional forced-dialect patch.

### WP4.5 — Prepare and implement the smallest accepted repair

Present exact source/configuration changes, selected native release/source, affected invariants, positive/negative tests and rollback/restriction plan. Max's project approval and upstream contribution permissions remain separate. Capture an accepted implementation baseline where required by the selected R2 route.

Write the native consumer regression first at the demonstrated owner. Existing correct behavior uses preservation evidence, not an artificial failure. Implement the selected §7 branch, including a second component only when the producer/consumer contract requires it. If merely deploying an existing corrected release, retain an old-versus-candidate reproduction rather than manufacturing a source patch.

Apply only needed probe capture improvements and the accepted documentary changes. Proposed policy text appears in the companion file; actual live hook/configuration edits remain conditional on facts not supplied by the reports. Do not publish a guessed deployment patch as ready-to-apply exact configuration.

**Deliverable:** scoped reviewed native/local changes or an upstream report/candidate dependency with retained evidence.  
**Exit:** candidate passes its causal regression and applicable native safety tests; no unsupported execution authority has been introduced.  
**Failure path:** preserve RED and restrict the unqualified surface; do not waive a failed negative control.

### WP4.6 — Qualify the candidate and install through the approved operator route

Obtain the actual supported candidate by its native release or approved installation mechanism. Refresh release identity, exact licence/terms and verification requirements. Preserve the prior binary/config/hook record before changes. Use documented signature/provenance verification where required by existing adoption; a checksum alone is not authentication.

Run the actual native candidate/configuration suite without target command execution. Compare commands, cases and effective policy with the baseline. Reconcile changed rule names without erasing retained old identifiers. Any earlier adopted guard behavior touched by the update remains in the applicable safety set; a newer version number does not waive its regression.

The operator applies the exact accepted configuration/installation and verifies actual hook load, trust, synchronization, multiplicity and effective binary/configuration. Reopen/restart only as the supported host requires and with permission; confirm the running identity afterward. Installation and source merge are distinct from propagation into the native desktop engine.

**Deliverable:** candidate native report and installed-environment receipt with excluded/unproved surfaces.  
**Exit:** the installed candidate is actually available for protected-host acceptance.  
**Failure path:** no reliance on partially deployed or skipped/untrusted hooks; use previously accepted restricted operation or hold the surface. Do not automatically downgrade a guard with known safety regressions.

### WP4.7 — Execute A09 on the actual protected Windows path

Run the full original safe operation—or explicitly accepted semantically faithful correction for a proven producer defect—using the actual protected path. Record hook attribution, exact command/context and independent expected result. Repeat for the second case on its selected shell; retain a separate disposition where the input itself was wrong. The full C4-PS inventory must execute its intended checks, not only print a success label.

Run the relevant forbidden-operation specimens **only through native data classification/replay**. Supplement attributable host-denial scope only using §9's non-destructive-by-construction challenge. If that cannot be arranged without real destructive execution, leave the host-negative subclaim unproved and retain the restriction. No failed guard may expose a real repo, file, remote, snapshot or credential.

Verify coexisting Stop/sandbox/lifecycle controls and failure reporting. A failed target command after allowance remains a failed user job. A skipped hook, another control's block, an agent refusal or a missing command is not DCG interception. A previously accepted host receipt can be referenced only where its exact material conditions remain unchanged; a changed binary normally needs affected requalification.

**Deliverable:** A09 record tying each benign result and inert negative decision to the actual installed environment.  
**Exit:** original semantics, protection and retained evidence satisfy the selected acceptance criteria.  
**Failure path:** report `candidate qualified; host acceptance pending` or the actual failure—not issue closure.

### WP4.8 — Land evidence, update adoption and close only justified scope

Freeze local source/test/configuration changes for the accepted route. Run focused changed-boundary tests during development, the relevant existing suites, and the required full profile on the final R2 repository candidate. Preserve failures. If only external native source changes, run that repository's real accepted checks and separately qualify the local integration; do not replace either with the other's fixture pass.

Obtain the authorised independent verification/review of causal attribution, absence of guard weakening and actual host evidence. Update `adoption.md` and `verification.md` with observed facts and qualified scope; update #30 through separately authorised action. Reference upstream identifiers and unresolved releases if needed. Do not change package deployment/version status as a side effect.

Retire task-owned trace instrumentation and redundant working copies only after their consumers finish and evidence is retained. Do not delete original denials, failed native reports, accepted source snapshots or unrelated worktrees. Keep a real remaining operator restriction in the ordinary disposition record.

**Deliverable:** attributable final handoff and separately authorised issue/adoption updates.  
**Exit:** A09 satisfied, or a narrowly accurate pending status with owner/dependency; no broader host claim.  
**Failure path:** preserve usable partial output and the next actor; do not hide unperformed host work behind a local green CI result.

## 9. Non-destructive negative testing and failure handling

### 9.1 Separate classifier specimens from live dispatch

The native probe corpus contains destructive-looking strings, but the probe executes only DCG. Preserve that contract. No test must run the destructive string against a disposable real Git history, a real directory or a cloud resource; the parent expressly excludes that expansion. [P01, R05, R07]

For attribution on the actual host, first reuse an unaffected accepted environment record where logically applicable. When new host evidence is required, an operator may authorise a **non-destructive-by-construction challenge** matching the established adoption pattern: a command aimed at a unique absolute path that has been proven not to exist, using a known native executable and no remote, and whose syntax cannot reach a real target if the guard misses it. Pre/post inspection and isolation must establish that the target remained absent and no unrelated state changed. The exact specimen must be reviewed before submission; this plan deliberately includes no executable destructive command recipe. [R04]

A denial counts only if the actual native PreToolUse result is attributable. If the tool runs and merely fails because its path is absent, the harmlessness condition held, but **the interception test failed**. The command's inability to act is not the guard's success. If another process could create the target or the executable/argument resolution cannot be bounded, do not run this challenge.

For predicates that cannot be tested on a harmless absent target, keep native inert data coverage and state the host limit. Do not widen the task to live destructive testing merely to fill a matrix cell.

### 9.2 Required safety neighborhoods

Select neighborhoods caused by the actual repair: literal versus expanding data; correct versus missing/conflicting shell context; explicit nested interpreter; quoting and token boundaries; content after a data terminator; command size/error handling where affected; existing hard-reset option-order/custom-pack controls; and deliberate strict worktree/history restrictions. Do not enable every available pack or rerun an unrelated expensive scan.

Native tests must still detect forbidden executable/destructive variants in the correctly selected language. Conversely, inert text that resembles a destructive command inside a proven literal data argument must not become a reason to disable entire safety analysis. Native grammar ownership is the solution, not an unconditional executable allowlist.

### 9.3 Failures and required disposition

| Failure or ambiguity | Required disposition |
|---|---|
| Original hook input unavailable | Keep the historical gap; capture a new labelled occurrence; do not reconstruct provenance. |
| Semantic input/fixture invalid | Correct the independent fixture or record the producer defect; do not count as the requested classifier RED. |
| Native diagnostic exits zero with `deny` | Record deny; target did not execute. |
| Native binary timeout, unexpected output or invalid UTF-8 | Preserve available raw bytes and error; indeterminate, not allowance. |
| Native hook is absent, untrusted, skipped or not matched | Missing coverage; a tool's later success cannot close A09. |
| Another hook or capability control blocks the operation | Record useful protection and incomplete DCG attribution separately. |
| Effective config or binary changes during comparison | Invalidate comparison identity and recapture; retain both observations. |
| Required pack fails to load | Keep reliance restricted; do not quietly omit its expectations. |
| Output/capture/storage fails | Retain prior records and available partial evidence; no completed-run claim. |
| Candidate fixes positive case but loses a deny | Reject candidate for adoption and preserve the counterexample as inert data. |
| Upstream fix not in installed agent/binary | Pending deployment; do not patch vendor files or use a weaker dispatch path. |
| No exact change approval | Continue permitted analysis only; no assumed live configuration write. |
| Original host works after unrelated update | Record observed non-reproduction; causal fix still needs traceable change/evidence. |

## 10. File-by-file implementation surface

| Path/surface | Default decision and exact responsibility |
|---|---|
| Issue #30 and its existing discussion | Sole maintained defect/acceptance authority. Append current case disposition, cause and qualification with authorised writes; preserve original report. |
| `docs/sdlc/command-safety.md` | Add the exact proposed §7 diagnostic subsection in the companion amendments; distinguish canonical hook name from effective shell, and data replay from live dispatch. |
| `docs/sdlc/dcg-acceptance.md` | Add qualified shell-context and positive/negative attribution rows, plus two-case/freshness caveats; do not mark a blank template accepted. |
| `docs/sdlc/verification.md` | Append actual dated evidence only after execution; retain failed/partial observations. No synthetic test pass becomes host acceptance. |
| `docs/sdlc/adoption.md` | Append/update actual operator-selected identity, exact scope, limitations and reassessment triggers. Historical bootstrap/source-package identities remain historical. |
| `.sdlc/dcg/hook-probe-cases.json` | Add only accepted minimized native expectations fitting `{id, command, expectedDecision}`. Preserve existing deliberate denies; do not dump captured secrets or invent supported shell keys. |
| `scripts/probe_dcg_hook_protocol.py` | Conditional: bounded raw-output/partial-timeout capture or agreed native protocol integration; no new classifier, target executor, live-env default or invented reply success. |
| `tests/sdlc/test_dcg_protocol_probe.py` | Conditional orchestration regressions for the actual helper changes; existing fixture tests remain clearly not native/host qualification. |
| `.sdlc/dcg/operator-config.example.toml` | No default changes. Edit only an evidenced accepted native setting; an example is not the deployed authority. |
| Actual identified native host hook definition / any existing repository hook example | No default matcher, enablement, trust, duplication or command change. Correct only an implicated boundary with exact separate approval. |
| Native DCG source/test owner | Conditional parser/dialect/input repair at pinned inspected symbols; maintain in upstream native tests and qualify a supported candidate. |
| Native host source/test owner | Conditional effective-context propagation/diagnostics at the actual versioned resolution owner; coordinate consuming native contract. |
| Existing check selector and CI | Existing probe, `.sdlc`, docs and tests are already relevant SDLC inputs. Verify actual selection if new files are added; no default new CI workflow or downloads of unapproved guard binaries. |
| `scripts/sdlc.py`, state schemas, Stop hook, package/locks, version files | Preserve by default. WP4 does not need a new SDLC runtime command, receipt schema, dependency or task-state migration. |

Exact live configuration cannot be truthfully supplied before the implicated file and setting are established. That is a causal precondition, not a request to redesign WP4 later. The concrete diagnostic work, conditional repairs, source owners and acceptance gates are already specified here.

## 11. Verification catalogue

The companion JSON is a planning inventory, not a runtime schema or executable test harness. Every status is `not-run`. Source-dependent cases are activated only by the selected repair branch; exclusions require a reason, not silent skips. T401–T430 are 30 distinct scenarios, not a mandatory count of native runs.

| ID | Boundary and required observation | Owner |
|---|---|---|
| T401 | Published full C4-PS text retained separately from actual captured bytes; digest/newline provenance correct. | Evidence preparation |
| T402 | Full C4-PS explicit native `unknown`/`ps`/`cmd` comparison retains decision, reason and process exit separately. | Native diagnosis |
| T403 | Full C4-CMD and reduced control retained as different semantics; no borrowed rule/binary identity. | Evidence preparation |
| T404 | Actual native cmd argument/match observation detects quoting error or establishes intended predicates. | Semantic consumer |
| T405 | Captured request, host resolution, native invocation and result are correlated; missing fields explicit. | Host diagnosis |
| T406 | Native Windows command-only Bash-envelope replay exercises its actual platform-specific branch, not a Linux substitute. | Native consumer |
| T407 | A permitted captured-envelope replay remains distinct from synthetic label/dialect experiments. | Native diagnosis |
| T408 | Candidate reduction failing syntax, fixture setup or another rule is rejected as non-reproduction. | Diagnosis |
| T409 | Final minimized trigger and full original preserve the observable failure before repair; positive neighbor remains valid. | Native regression |
| T410 | Guard diagnostic/protocol/process and target return codes are not conflated. | Probe orchestration |
| T411 | Replay executes only the approved DCG process; malicious-looking strings and metadata are never shell-dispatched. | Probe orchestration |
| T412 | Invalid output, partial timeout and recording failure retain explicit incomplete evidence and never pass. | Conditional capture repair |
| T413 | Default isolated probe still excludes live credentials/bypasses and never claims deployed effective state. | Probe orchestration |
| T414 | Consumer-generated schema and actual loaded policy/pack identity remain checked; malformed/missing pack is not omitted. | Native deployment |
| T415 | Current candidate compared against the retained old binary with input/configuration differences explicit. | Candidate qualification |
| T416 | Effective-shell metadata, when implemented, agrees with actual resolution including fallback; requested label alone cannot narrow interpretation. | Conditional host/consumer repair |
| T417 | Missing, conflicting, malformed or unrecognized context retains a documented safe disposition. | Conditional native repair |
| T418 | Literal data versus executable/expanding text distinguishes benign and forbidden semantics without broad masks. | Conditional parser repair |
| T419 | Nested interpreter, trailing operation and affected size/error boundaries retain native safety analysis. | Conditional native repair |
| T420 | Existing hard-reset option-order and external-pack expectations are preserved as inert native data. | Native preservation |
| T421 | Existing strict worktree/history/force expectations remain denied; no workaround silently relaxes them. | Native preservation |
| T422 | Actual installed C4-PS guarded path executes all intended checks against independent known input and result. | Host A09 |
| T423 | Actual installed C4-CMD guarded path achieves intended matches; any corrected input disposition explicitly recorded. | Host A09 |
| T424 | Attributable non-destructive-by-construction host-denial challenge remains harmless even on a missed block; missing-target failure is not interception. | Authorised host qualification |
| T425 | Silent skipped/untrusted/incorrectly matched or duplicated hooks cannot masquerade as a successful repair. | Host qualification |
| T426 | Coexisting Stop, sandbox and lifecycle behavior remains; no recurring stdin/tool coverage is inferred. | Integration preservation |
| T427 | Source/binary/config/hook drift during a run invalidates affected comparison; older evidence stays intact. | Evidence identity |
| T428 | Existing raw evidence and output files are not overwritten; permitted trace data remain restricted and retrievable. | Evidence retention |
| T429 | Actual repository CI/test selection and accepted final routed profile cover delivered local changes; stub-only green is labelled. | Repository verification |
| T430 | Current installed acceptance is not inferred from upstream merge, release title, doctor success or an unrelated repository's receipt. | Handoff/independent review |

**O41 — original useful work:** after the repair is qualified, complete the actual retained/current accepted inventory or search task through the protected host. Record semantic output and any remaining task-specific differences. Do not invent a new product feature for an adoption pilot.

**O42 — receiving-maintainer handoff:** another authorised maintainer can identify the two case dispositions, exact installed scope, retained negative evidence, upstream dependency and next reassessment trigger from the existing record. If that review did not occur, report it as pending rather than simulate organisational independence.

## 12. Verification execution and proportionality

Use focused tests during diagnosis and each local/native repair. Replay the concrete defect and relevant safety neighborhood before broad qualification. For changed local probe code, the existing commands include:

```text
npm run test:sdlc
node scripts/runRepositoryPython.js -m unittest discover -s tests/sdlc -p test_dcg_protocol_probe.py
```

The second command targets the existing test module; use the actual accepted interpreter/dependencies in the executing checkout. Existing probe tests mostly stub native responses, so passing them proves orchestration only. The CI already runs control tests on Windows and Ubuntu without claiming a live native guard or paid-agent assessment. [R08, R09]

For the final accepted R2 local candidate, run the existing routed full verification after its last relevant edit. Confirm actual native report persistence and frozen identity. Do not revise the verification profile to make the guard task green. If a guarded test command itself is blocked, retain it as an actual unmet gate; do not execute it elsewhere and silently transfer the result.

Review only consequential relevant boundaries. An independent verifier should inspect the original and minimized inputs, the causal chain, selected native or host change, safety controls and actual host evidence without taking the implementer's assurance as an oracle. Separate roles need actual authority; no default fan-out or additional security scan is imposed merely because DCG is security-related.

There is no mandated maximum elapsed runtime, token budget, minimization count or per-task rerun of environment acceptance. Measure actual additional tool calls/interventions when useful, but do not assert productivity gains from fewer reported errors alone. Reassess on relevant host/guard/policy/dispatch change, not every harmless edit.

## 13. Acceptance criteria and closure

| ID | Requirement | Evidence |
|---|---|---|
| AC4-01 | Parent WP4/A09 and both reported cases have explicit scope and accountable owner. | Accepted task/issue record, with separate case IDs. |
| AC4-02 | Historical evidence and current capture are distinguished; no missing host facts are fabricated. | Raw/derived provenance, available boundary records and explicit historical gaps. |
| AC4-03 | Original benign semantics are independently defined, including cmd quoting and actual input inventories. | Expected argv/matches/invariants and identified fixture/source bytes. |
| AC4-04 | Reproduction/minimization preserves the relevant native failure, or clearly records why only the full original is available. | Native old-input results and reduction lineage, not alternative unrelated success. |
| AC4-05 | The selected repair belongs to the demonstrated source/configuration owner. | Causal trace, exact change/approval and regression evidence. |
| AC4-06 | Native relevant destructive specimens remain denied as data; no real destructive command is executed for WP4. | Native output, probe dispatch inspection and no-target-execution evidence. |
| AC4-07 | C4-PS succeeds through the actual protected Windows path with all intended semantic checks. | Correlated native hook/host and target result on the identified candidate. |
| AC4-08 | C4-CMD has an independently verified protected-path disposition, not just a shorter-search pass. | Actual matching result and separate input correction/remaining defect disposition. |
| AC4-09 | Installed binary, effective config/packs, hook trust and resolution are actually qualified. | Operator readback, required integrity/rights references and bounded host-denial evidence. |
| AC4-10 | Errors, skips, unknown labels, storage failures and evidence drift cannot be reported as protective success. | Applicable negative orchestration and host tests with retained counterevidence. |
| AC4-11 | Existing protections and unrelated work remain intact; no shim, broad exception or automatic cleanup is introduced. | Before/after control evidence, meaningful tests and independent review. |
| AC4-12 | Required final verification and adoption/handoff evidence are complete and scope-specific. | Frozen local/native candidate reports, O41/O42 and authorised issue/adoption disposition. |

A09 is the combined outcome, not a new mandatory schema field. An original historical trace can remain unavailable if present reproduction and qualification establish the corrected actual path and the historical uncertainty stays explicit; do not claim the missing historical cause was independently observed.

Use one of these statuses in the existing task record:

| Status | Meaning and next actor |
|---|---|
| **Diagnosis incomplete** | Missing reproduction/context/semantic facts prevent selecting a safe repair. Name the exact missing boundary and its owner. |
| **Cause established; upstream/deployment pending** | Reproduction and owner are clear, but no supported corrected installed combination exists. Retain restrictions and the concrete dependency. |
| **Candidate qualified; host acceptance pending** | Native/local tests pass, but actual protected Windows evidence is not complete. Operator/verifier owns the remaining action. |
| **Protected Windows scope qualified** | Both original cases have justified dispositions, A09 and affected acceptance criteria pass, and only the explicitly recorded scope is adopted. |

Do not close #30 merely because a report was filed upstream, a native patch merged, a release installed, `doctor` succeeded, a diagnostic selected `ps`, or an alternative search worked. Do not claim all worker, WSL, interactive stdin, direct-file or MCP paths are protected unless separately qualified. [P01, R03, R06]

### 13.1 Rollback and restriction

Before installation, identify the existing authorised management/recovery mechanism and retained prior binary/configuration evidence. If the candidate cannot be qualified, do not rely on it for protected operations. Revert only through the approved operator mechanism when the prior combination remains acceptable; a prior known vulnerable or insufficient control is not a safe automatic fallback. Otherwise hold or restrict the surface through existing effective capabilities.

Preserve failed candidate reports and source changes under ordinary version control authority. Do not overwrite accepted baseline versions, edit failed native evidence to appear successful, clear active state or remove a worker's resources as recovery. No restoration of an entire dirty checkout is required by this plan.

### 13.2 Final handoff contents

Report: original task/accepted intent; full candidate and host identities; separate C4-PS/C4-CMD conclusions; diagnostic versus real-host results; the actual repair and owner; native safety-neighbor results; any source/configuration approvals; untested/excluded surfaces; retained evidence locations and restrictions; current operator decision; upstream status and installed propagation; next reassessment event.

Use ordinary existing task/Issue and protected environment records. The supplied worksheet is a working aid, not a new authoritative policy store. A historical `allow` remains a scoped observation, not enduring permission.

## 14. Source register

These references distinguish the requested parent, repository facts, native-source research and current host-language documentation. Public URLs in this artifact are source locators, not automatic permission to download, execute or publish. All mutable observations were retrieved on 10 September 2026; recheck at implementation.

### Requested basis and predecessor boundaries

- **P01** — Supplied `../implementation-plan.md`, WP4 and A09; original file preserved. Parent digest is in `sources.json`.
- **P02** — Supplied `sdlcworktreelifecyclehandoff20260910.md`, especially §§3–4 and 6. It reports worktree observations and guard restrictions, not an established cause of accumulation.
- **P03** — Supplied WP0–WP3 detailed plans. Used only for package boundaries and proposed contracts; their existence is not evidence of implementation or host deployment.

### Repository and issue evidence

- **R00** — [Universal Ontology main branch readback](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main), resolved to `79d187802f9255134c03d0786ff75181ed1070ee`.
- **R01** — [Issue #30](https://github.com/Hadden-Industries/universal-ontology/issues/30), full original command, native diagnostic table and missing host context.
- **R02** — [Issue #30 comment 5600691267](https://github.com/Hadden-Industries/universal-ontology/issues/30#issuecomment-5600691267), WebVOWL cmd request and reduced positive comparison.
- **R03** — [Native command-safety guide at the observation commit](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/command-safety.md).
- **R04** — [Adoption record at the observation commit](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/adoption.md), limited DCG 0.14.1 host receipt and recorded identities.
- **R05** — [Existing native protocol probe](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/probe_dcg_hook_protocol.py), especially `isolated_environment`, `invoke_native`, `decode_hook_decision`, `load_cases`, `probe`, `main`.
- **R06** — [DCG environment acceptance template](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/dcg-acceptance.md), blank procedure and separate host qualification.
- **R07** — [Checked-in 26-case corpus](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.sdlc/dcg/hook-probe-cases.json), diagnostic input only.
- **R08** — [Existing probe tests](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/tests/sdlc/test_dcg_protocol_probe.py), orchestration/contract fixtures and declared limits.
- **R09** — [Existing Windows/Ubuntu SDLC workflow](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.github/workflows/sdlc-control-tests.yml).
- **R10** — [Existing check-scope selector](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/selectPullRequestChecks.js).

### Native upstream evidence

- **U01** — [DCG 0.14.1 `src/hook.rs`](https://github.com/Dicklesworthstone/destructive_command_guard/blob/9569d4f181e43e7bdd4fba254834762a092b4b29/src/hook.rs), `ToolInput`, protocol/shell distinction and Windows `codex_host_shell_dialect` behavior. Source evidence is not the missing local hook trace.
- **U02** — [DCG latest-release endpoint](https://api.github.com/repos/Dicklesworthstone/destructive_command_guard/releases/latest) and [v0.14.2 release](https://github.com/Dicklesworthstone/destructive_command_guard/releases/tag/v0.14.2), observed publication 2026-09-09T11:10:21Z; target/source `e4a2fed44e3813e4344d6f3029c0d8a32ac1c75e`. No installation or fix qualification performed here.
- **U03** — [DCG v0.14.2 changelog at its source identity](https://github.com/Dicklesworthstone/destructive_command_guard/blob/e4a2fed44e3813e4344d6f3029c0d8a32ac1c75e/CHANGELOG.md), first release section. Its POSIX heredoc/doctor changes do not establish #30 resolution.

### Current primary documentation

- **H01** — [Official Codex hooks](https://developers.openai.com/codex/hooks), retrieved official redirect to ChatGPT Learn. Used for current canonical tool coverage, separate trust/configuration concerns and observation caveats; not an installed-version attestation.
- **H02** — [Microsoft PowerShell about_Parsing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.5), native argument-passing and quoting differences.
- **H03** — [Microsoft cmd documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd), explicit command-processor arguments and quoting. It does not establish which flags the reported host used.

## 15. What preparing this package did and did not establish

Preparation read the supplied parent and predecessor documents, refreshed Issue #30 and its comment, inspected the pinned repository/native source and the latest native release metadata, and checked current primary host/language documentation. The companion artifact-check result records only checks actually executed on this package: structured-data validity, reference/ID coverage, reproduction-file integrity and syntax-only parsing of the transcribed embedded Python body.

No DCG executable was downloaded or run, no Windows or WSL process was exercised, no native shell was invoked on the reproduction text, no hook was installed/modified, no issue or PR was written, and no listed regression/adoption exercise was executed. The package's test catalogue therefore remains `not-run` throughout. Artifact hashes prove identity of these delivered files, not correctness of the proposed native repair or approval to deploy it.

**WP4 is complete when the original safe semantics work through the actual guarded Windows path, relevant native forbidden-operation specimens remain denied without being executed, and the demonstrated repair and installed scope are traceable without weakening the existing safety controls.**
