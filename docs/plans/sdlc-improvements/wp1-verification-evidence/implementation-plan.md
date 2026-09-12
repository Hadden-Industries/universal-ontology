# WP1 — Repair text boundaries and persist verification before presentation

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Detailed implementation plan · 10 September 2026**

**Parent:** `../implementation-plan.md`, WP1; parent acceptance criteria A01 and A02.  
**Repository:** `Hadden-Industries/universal-ontology`.  
**Primary issue:** #32, Windows verification evidence lost while printing Unicode diagnostics.  
**Linked defect:** the separately recorded Issue #25 baseline-capture Unicode corruption.  
**Priority:** P1. **Proposed implementation risk route:** R2, subject to the existing acceptance procedure.  
**Status:** implementation proposal, not an accepted baseline, applied repair, configuration approval or claim of Windows qualification.

## 1. Objective and completion boundary

Implement the parent's two distinct repairs: make the supported Windows npm → Node → repository-Python entry point handle Unicode predictably, and make verification evidence survive failures in decoding or presenting already captured command results. Also repair the explicitly linked baseline-capture protocol so accepted Issue text is not silently decoded using the host's legacy code page. [P1, R02, R10]

The decisive outcomes are:

| Outcome | Required result |
|---|---|
| A01 — failed Unicode output | The ordinary documented Windows entry point needs no undocumented caller setting. A failed Unicode-emitting check retains a new identified attempt, its actual output, original process result and relevant input identity. Earlier evidence remains intact. |
| A02 — accepted text capture | UTF-8 Issue JSON produces the independently expected Issue body and body digest, without normalization, replacement characters or silent mojibake repair. A valid JSON document or internally consistent hash does not substitute for equality with the accepted text. |
| Evidence-first verification | Every admitted attempt is distinguishable from prior success before a configured check starts. Completed-command evidence is saved before its terminal presentation. |
| Truthful failure handling | Check failure, unavailable execution, timeout, interruption, decode failure, reporting failure and storage failure retain their distinct meanings. Nothing claims knowledge of an exit status or output that was never captured. |
| Preserved controls | Keep existing task/baseline/control/workspace identity checks, route requirements, interpreter selection, command guards, permissions and history. |

This plan selects concrete implementation contracts where the parent deliberately left the design open. Those selections are **proposals**, identified below as D1–D10. The repository observations are evidence for the proposal; they do not themselves approve it.

### Explicit exclusions

WP1 does not implement competing task-start locks, support multiple independent writers in one checkout, create a central run database, alter worktree lifecycle, delete retained artifacts, repair DCG dialect selection, install or requalify Codex Security, introduce committed-Markdown baseline support, change risk thresholds, add mutation-testing targets, change the full verification profile, or distribute the change into the other repositories. These belong to other work packages or separate decisions. [P1]

No machine/user-wide locale, environment, code-page, ACL, sandbox, hook-trust, shell or branch-rule change is part of this repair. Do not disable a guard to reproduce a fixture. Do not rewrite old baseline or run records to make them resemble results from the repaired implementation.

## 2. Evidence baseline, current observations and limits

### 2.1 Source identities

The parent file used for this expansion has SHA-256:

```text
b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82
```

The current GitHub `main` read during preparation resolved to:

```text
79d187802f9255134c03d0786ff75181ed1070ee
```

The implementation files inspected below are pinned to that full commit. Issue #32 remains open with `state:draft`; an Issue number and this plan are not an accepted R2 baseline. Refresh these mutable facts at execution and record any differences rather than treating this document as a live inventory. [R01, R02]

### 2.2 Diagnosed boundaries

| ID | Source-supported observation | What it does and does not establish |
|---|---|---|
| E1 | `verify_task` decodes captured child output as UTF-8, then prints it, then appends the result, and writes the run/profile JSON only after the profile loop. | Printing can prevent retention. The reported Windows occurrence establishes the loss; it did not produce an exit-zero result or demonstrate acceptance of stale evidence. [R02, R03] |
| E2 | `runRepositoryPython` selects only the checkout `.venv`, passes `-B`, and inherits stdio without selecting UTF-8 mode. | The issue's observed redirected stream was `cp1252`. Source inspection alone does not establish every host's default codec. [R02, R05] |
| E3 | `_commands.run` uses `text=True` with no explicit codec; baseline capture uses it for both `gh ... --json` calls. | The Issue #25 record reports a reproducible incorrect `cp1252` decode of valid UTF-8 JSON. This is distinct from failed terminal encoding. [R06, R10] |
| E4 | The existing Unicode verification regression runs under in-process `StringIO`; launcher tests mock `spawnSync`. | They test useful narrower contracts, but not the complete redirected Windows npm/Node/Python path. [R07, R08] |
| E5 | The current evidence reader checks profile success, input identities and command count; it has no maintained verification-run JSON Schema or canonical run/profile correspondence check. | A small extension is needed to consume pending and incomplete receipts truthfully; this is not a reason to replace the evidence platform. [R04, R09] |
| E6 | The atomic JSON helper writes a same-directory temporary file and replaces the destination, rejecting symlink/junction redirection. | Retain its visibility and containment properties. It is not a multi-file transaction, exclusive-start lock, adversarial sandbox or demonstrated power-loss-durable store. [R04] |
| E7 | The Stop gate permits a bounded follow-up blocker report after its initial rejection, and uses JSON on stdout. | Preserve this distinction: permission to report a blocker is not permission to claim verified completion. [R11] |
| E8 | The existing SDLC control workflow already runs on Windows and Ubuntu and selects the relevant launcher/control tests. | New regressions can use the existing matrix. No new CI platform, action or permission is selected. [R13] |

The Issue #25 README also contains historical statements about publication and merge status. Use its retained corruption mechanism and evidence identities; do not repeat those historical workflow statements as current status. [R10]

### 2.3 What was not accessed or executed

The Windows implementation/verification worktrees, original local logs, actual Codex/DCG dispatch and live `.venv` were not accessed in preparing this plan. No repository code, npm verification profile, baseline-capture operation, remote write or repair was executed. Small independent Python process/codec and schema checks are described in section 15; they are research evidence, not implementation acceptance.

The six worktrees in the handoff remain protected by WP0. WP1 may use their preserved Issue #32 evidence with the owner's authority, but must not commandeer an active worktree or discard its original failures. A separate owned implementation checkout allows independent progress without waiting for every unrelated WP0 ownership question to close. [P0, H1]

## 3. Preconditions, ownership and approval surface

### 3.1 Responsibilities

| Responsibility | Existing owner | Completion evidence |
|---|---|---|
| Accept repair requirements, route and exact configuration changes | Max | Attributable decision for the actual scope and file/settings proposal. |
| Implement and integrate | SDLC maintainer | Reviewed writer/reader changes, meaningful failing regressions before repair, current verification evidence. |
| Independently verify | Already authorized verifier | Actual Windows entry-point evidence plus independent examination of records and relevant failures. |
| Review evidence semantics and maintainability | Normal reviewer; combine lenses where appropriate | Exact target reviewed; no borrowed claim of independent execution. |
| Retain source failures and reproduction material | Existing task/evidence owners | Approved locators and actual readback; no new public artifact store by assumption. |

These responsibilities do not authorize delegation. Use the current permitted reviewer arrangement; do not create a new review hierarchy solely because the implementation plan has several tasks.

### 3.2 Proposed route and bootstrap

R2 is recommended for the combined run-format, completion-reader and failure-retention change, because a mistake affects the evidence used to hand off elevated-risk work. This is not an assertion that every Unicode launcher edit independently warrants R2 or that the issue already approved the route.

Use #32 as the maintained repair item, with an explicit link/disposition for the separately recorded Issue #25 capture defect. Check for an existing linked issue before preparing another; do not fabricate a tracker number. The exact accepted requirements must exist in the repository's supported baseline representation before ordinary R2 implementation. Committed-Markdown baseline support is WP6, not a prerequisite to invent here. [P1, R02, R14]

If preparing that baseline itself needs the documented invocation-local UTF-8 workaround, reuse its actual approved scope. Capture a new baseline version, compare its body against the independently accepted text, and retain the command and its environment setting. Do not repair, overwrite or recapture Issue #25 v1/v2 as part of this bootstrap. [R10]

### 3.3 Exact proposed maintained change inventory

| Path | Proposed change | Boundary/approval note |
|---|---|---|
| `scripts/runRepositoryPython.js` | Add native `-X utf8` before caller arguments, preserving `.venv`, cwd, inherited environment, stdio and process result handling. | No global setting, shell wrapper or extra interpreter. |
| `scripts/_commands.py` | Add optional explicit codec/error keywords; add a small human-diagnostic writer reused by command echoes and the SDLC CLI. | Audit callers first; do not assign UTF-8 to every external protocol. |
| `scripts/sdlc.py` | Explicit UTF-8 for Issue JSON; stable attempt identity, raw output capture, checkpointing, failure separation and final receipt ordering. | Keep lifecycle authority, selected argv and baseline history. |
| `scripts/_sdlc_state.py` | Validate v3 run receipts and paired current/canonical records; reuse existing identity/path/atomic-write helpers. | No history scan, scheduler or weakening of fingerprints. |
| `.sdlc/schemas/verification-run.schema.json` **new** | Consumer-owned Draft 2020-12 v3 receipt schema, from the attached proposal after exact approval. | New configuration requiring explicit approval; not an existing schema being silently replaced. |
| `tests/run-repository-python.test.js` | Update exact spawn contract and preservation tests. | Mocks remain labeled as mocks. |
| `tests/sdlc/test_pipeline_controls.py` | Add receipt, codec, real-subprocess, Stop/handoff and failure tests; preserve existing cases. | Existing unittest discovery and CI matrix. |
| `tests/sdlc/fixtures/verification_process.py` **new** | Small synthetic process with explicit output/result/readiness modes. | Test data/behavior only; no production debug flags or permission workaround. |
| `docs/sdlc/howto.md` | Brief documented encoding/evidence/failure/retry instructions, after approval. | Do not duplicate the full design or add a second procedure. |
| `docs/sdlc/verification.md`, `docs/sdlc/adoption.md` | Append actual executed results and exact qualification limits at completion. | Prospective plans are not adoption evidence. |

`scripts/sdlc_stop_gate.py` is a consuming boundary to exercise, not an assumed implementation edit. Prefer fixing its existing shared reader. Change it only if an observed failure cannot be resolved there, and state the exact delta before editing.

No default edit is proposed for `package.json`, lockfiles, `.sdlc/verification.json`, `.sdlc/pipeline-policy.json`, existing baseline schemas, runtime version files, `.codex/hooks.json`, hook generation, GitHub workflows, `AGENTS.md` or skill files. Tests must verify scope selection for the new schema/fixture. A demonstrated omission requires its own small, exactly approved selector change—not a blanket expansion.

Schema version 3 below is the **run-receipt format**, not an SDLC package/version change. Keep active-task schema 2, verification-configuration schema 2, accepted-baseline schema 1 and the current package status unchanged.

## 4. Selected design decisions

### D1 — Select a UTF-8 default; do not seize control of caller settings

Proposed launcher argument prefix:

```javascript
["-B", "-X", "utf8", ...args]
```

Preserve the existing executable path, cwd, `stdio: "inherit"`, `windowsHide: true`, environment inheritance, missing-interpreter error, literal arguments and result/signal behavior. No `shell: true`, environment mutation or runtime fallback is added. [R05]

Python's UTF-8 mode affects default text behavior, but an explicitly supplied `PYTHONIOENCODING` still controls standard streams. The plan therefore treats UTF-8 mode and presentation robustness as separate changes. Record actual effective stream settings in run evidence; do not infer them from the flag alone. A caller deliberately overriding startup flags is not covertly rewritten. The ordinary documented route must work without such overrides. [D01, D04, D05]

`-X utf8` can also affect existing callers that rely on default subprocess decoding. Audit and test those callers explicitly rather than claiming that adding an optional helper parameter leaves every process behavior unchanged.

### D2 — Decode known protocols explicitly; preserve semantic text exactly

Extend `_commands.run` with optional keyword-only `encoding: str | None = None` and `errors: str | None = None`, forwarded to native `subprocess.run`. Retain current defaults for callers that do not specify a codec. At both `gh ... --json` call sites, supply `encoding='utf-8', errors='strict'`. Keep the existing executable selection, argv, check behavior and JSON parser. [R03, R06, D02, D06]

For captured Issue values, never trim, normalize Unicode, unescape HTML, replace invalid bytes, use a fallback code page or guess a repair from characters such as `â`. A legitimate U+FFFD in source text is not itself evidence of corruption. Invalid protocol bytes or malformed JSON cause a failure, not an accepted baseline.

Make the body hash explicitly a SHA-256 of `issue_body.encode('utf-8')`. For newly created Markdown capture output, use explicit newline handling (`newline='\n'`) so Windows does not translate the concatenated string a second time. Preserve line breaks already contained in the Issue body; do not normalize its CRLF to LF. This is a proposed future-write correction within the exact-text contract, not authority to rewrite historical Markdown.

The JSON file's envelope serialization need not match GitHub's original JSON serialization. The requirement is exact equality of the decoded Issue body and its UTF-8 bytes/digest, plus the unchanged existing title/metadata semantics. Independent comparison with the accepted text remains required; recomputing a hash of incorrectly decoded text does not detect the error. [R10]

### D3 — Keep one profile attempt and the current native layout

Allocate a new `runId` before admitting each selected profile attempt. Preserve task identity separately. Use:

```text
.sdlc/runtime/
  runs/<taskId>/<runId>.json
  runs/<taskId>/<runId>/commands/0001.output.bin
  runs/<taskId>/<runId>/commands/0002.output.bin
  verification/<profile>.json
```

The run JSON is the retained canonical receipt. The profile JSON remains a **full current receipt**, not a new pointer format. Both carry `runId`, task/profile identity and revision state. This preserves the existing recognizable layout and permits bounded direct comparison without a global log index.

Only the current attempt's files change while it runs. A later attempt gets another ID and does not alter previous receipts or raw files. Temporary files used for atomic replacement are not historical receipts.

### D4 — Invalidate the current slot before any check can execute

After route/configuration validation, create pending records with `passed: false`. Publish each selected current-profile pending record **first**, then its canonical run record. Admit no configured command until every selected profile's initial publications succeed.

The current-slot-first order matters: if canonical creation subsequently fails, the old current success has already been invalidated. During subsequent checkpoints, write canonical first and current second; discrepancies remain non-passing. Initialize pending records before computing the potentially failing workspace identity, then record the actual initial identity before starting checks.

The admission boundary does not retroactively cover failure to load/validate the task or failure before any recording is possible. Section 6 defines the explicit limit for an entirely unwritable store.

### D5 — Capture bytes through the existing process boundary

Use native `subprocess.Popen` with the same resolved executable and argv, `cwd=repo`, existing deadline, no new shell, and combined stdout/stderr directed to a newly created owned binary file. Keeping the existing combined-stream model avoids inventing separate stdout/stderr ordering guarantees. [R03, D02]

Create and record the command slot before launch. File-backed capture avoids making recoverable output depend exclusively on an in-memory pipe and keeps already emitted bytes available after a runner interruption. Do not create a generic process-supervision framework.

After normal exit or owned direct-child timeout handling, retain the observed result/timing in the command slot immediately. Close the parent file handle, determine available byte length/digest, and checkpoint raw-output provenance and the original result **before decoding or presenting it**. If closing, reading or hashing the capture fails, checkpoint the already known return code/timing with incomplete capture and that actual problem wherever the evidence store still works; do not lose an observed process result merely because a later capture operation failed. Then perform strict UTF-8 decoding and checkpoint the decoded text/result. Raw evidence is authoritative for bytes; `output` is its decoded textual view. No newline normalization is performed on raw data.

On malformed UTF-8, retain the bytes and actual return code, set textual `output` to null with an explicit decode failure, and leave the attempt incomplete/non-passing—even when the child returned zero. Do not turn an encoding error into a different child exit code.

### D6 — Human-readable escaping is allowed; evidence rewriting is not

Add one small `write_console_diagnostic` responsibility to `_commands.py`, not a general logging library. Use it for human command echoes, verifier headers, outputs, summaries and applicable error messages; do not alter hook JSON or external protocol bytes.

Where a stream has an encoding, produce a representable display using its native codec with `backslashreplace` before writing. This makes unrepresentable characters visible even if the inherited stream error mode is `ignore`. Where a test stream has no encoding, preserve the Unicode string. Flush at defined publication checkpoints so buffered presentation errors occur before final success publication. [D03, D05]

A representable escaped display is successful presentation (`presentation: escaped`); original Unicode and raw bytes remain unchanged in the receipt/store. A real write, closed-stream or flush error is an infrastructure failure. The owning verifier records it and exits nonzero; the helper must not silently redirect all future output or make the check appear successful.

An explicit legacy codec in the verifier does not force arbitrary children to emit UTF-8. If a Python child inherits settings that make the child itself fail to print, record that genuine child failure. Tests must distinguish a failing child from a successful byte producer whose parent presentation needs escaping.

### D7 — Publish success only after required presentation and identity checks

Keep `passed: false` in every in-progress receipt. Save each completed command before its output is printed. After all intended checks and required human reporting have completed and flushed, compute the fresh final input identity, calculate the result, validate the final receipt, write canonical then current, and return.

Do not print another fallible “PASSED” banner after publishing `passed: true`. A pre-publication summary may accurately state that the checks passed and the receipt is being recorded; it must not claim final verification is already complete. The exit result and final receipt then establish the actual outcome.

This ordering prevents the particular false association of a post-publication reporting failure with a successful verification receipt. It does not claim a transactional guarantee across OS shutdown, a failed filesystem and a terminal.

### D8 — Extend the consumer, not the definition of approval

Use the new maintained JSON Schema with the existing Draft 2020-12 validator. Add semantic checks in `required_verification_gaps`: current/canonical correspondence, exact configured command inventory, complete and successful run/output states, current identity equality, and safe task-owned raw references.

Do not scan all prior runs or rehash every large output on every Stop invocation. At normal gate evaluation, use the named run and bounded metadata checks, plus existing workspace identity computation. Verify raw bytes/digests at capture and independent evidence readback. This remains a development guardrail, not a tamper-proof attestation service. [R04, R11]

Keep the Stop hook's first rejection, continuation blocker message, paused behavior and stdout JSON protocol. Handoff cannot pass merely because the continuation response exits zero.

### D9 — Preserve old evidence without fabricating a migration

Historical schemaVersion 2 run JSON stays byte-for-byte intact and remains readable as history. It cannot satisfy the new receipt-completeness contract. Require a fresh native verification attempt for current acceptance after the new reader is deployed. Do not manufacture missing raw output, timestamps, run IDs or interruption status for old records.

No active-task rewrite is needed: keep active schema 2 and its original authority and digests. Existing source/control drift remains subject to normal rerouting; fresh verification must not silently alter those digests.

Writer, receipt schema and completion reader must be landed/deployed as one coherent change. A separately reviewed encoding-only commit can be useful, but it is not closure of #32. Rolling back must not relabel v3 records as legacy successes; use an approved forward repair or an explicit paused handoff.

### D10 — Preserve the single-execution assumption and state its limits

WP1 assumes one coordinated verifier per physical checkout. Independent tests use owned disposable repositories; independent implementations use separate worktrees. Do not add cross-worktree locks, scheduling, automatic stale-process takeover or the #33 repair here.

Run/profile pair validation prevents a partially published pair from being used as success under this execution model. It is not a proof that arbitrary same-checkout concurrent writers cannot interfere. Record any reproduced race for WP2 rather than silently widening WP1.

## 5. Proposed receipt contract

The companion `verification-run.schema.proposed.json` provides the exact proposed JSON shape. Its intended maintained destination is `.sdlc/schemas/verification-run.schema.json` after approval. Treat its title/comment as proposal provenance, not a published schema or already installed configuration.

### 5.1 Run fields

| Field | Contract |
|---|---|
| `schemaVersion` | Integer 3, specific to this receipt format. |
| `runId`, `taskId`, `profile` | Distinguish this attempt, its existing routed task and its configured profile. Validate against actual current task/profile, not only syntactic shape. |
| `startedAt`, `recordedAt`, `finishedAt` | Actual UTC event times; finish is null while pending/running. A start timestamp is not proof that a child was launched. |
| `status` | `pending`, `running`, `completed`, `interrupted` or `incomplete`. |
| `passed` | True only for a completed, fully recorded and correctly identified profile with all required successful commands. |
| `identityBefore`, `identityAfter` | Existing full identity object, nullable when capture could not establish it; either null prohibits success. |
| `expectedCommandCount` | Frozen count from this selected configuration; not proof that those commands ran. |
| `commands` | Ordered slots actually entered, including pending/running or unavailable slots; do not fabricate executed results for unreached commands. |
| `runtime` | Allowlisted actual Python executable/version, UTF-8 mode and stdout/stderr codecs/error handlers. Do not record whole environment or secrets. |
| `problems` | Actual infrastructure problems with phase, optional command ordinal, exception type and actionable message. |

The existing identity fields remain: taskId, activeDigest, head, workspaceFingerprint, policyDigest, configurationDigest, policyFileDigest, configurationFileDigest and nullable baselineDigest. Their meaning and input selection do not change. [R04]

### 5.2 Command fields

Each command slot has ordinal, configured name and literal argv, resolved executable when known, effective timeout, actual start/finish times, status, nullable original return code, nullable decoded output, decode status, raw capture reference and presentation state.

Command statuses are `pending`, `running`, `passed`, `failed`, `timeout`, `unavailable`, `interrupted`. A process can have `status: passed` for an observed exit zero while the **run** is incomplete because decoding or reporting failed; the separate fields prevent conflating those facts. Consumers must not inspect command status alone.

`decodeStatus` is `pending`, `decoded`, `invalid-utf8` or `not-captured`. `presentation` is `pending`, `written`, `escaped`, `failed` or `not-attempted`.

The raw capture reference contains a contained repository-relative path, nullable observed byte length/digest, and `complete`. `complete` means the captured byte stream has been closed and checked for the capture contract, not that the command succeeded or that every descendant process is proven dead. Success requires complete capture with actual length and SHA-256, even for empty output.

Timeout/interruption may retain partial bytes and a null return code where the runner never observed one. If native timeout cleanup yields an actual return code, record it without letting it override timeout status. Never fabricate `0`, `1` or a signal code to fill a required field.

### 5.3 State transitions

```text
pending ──> running ──> completed (passed=true or passed=false)
   │           ├────> interrupted (passed=false)
   │           └────> incomplete  (passed=false)
   └───────────────> incomplete  (passed=false)

Uncatchable runner termination: last persisted pending/running record remains.
A later attempt uses another runId; it does not rewrite the earlier chronology.
```

`completed` with `passed: false` includes ordinary failed checks, timeouts or unavailable commands when bookkeeping completed correctly. `incomplete` is for unmet evidence/reporting/identity/persistence obligations. An uncatchable kill does not let a future reader assert exactly when the process died; it can only report unfinished evidence and require an owner check before retry.

### 5.4 Required semantic validation beyond JSON Schema

The maintained reader must establish all of the following before returning no gaps:

| Validation | Why schema alone is insufficient |
|---|---|
| Current task and selected profile match both receipts | A well-formed record could belong to another task. |
| Current and canonical receipt values agree, including `runId` and terminal state | Atomic writes to two files are not one transaction. |
| Both identities equal the freshly computed current identity | A shape-valid identity need not describe current inputs. |
| Count, ordering, ordinal, names, literal argv and effective deadlines match the configured profile | A same-length list of different commands is not equivalent verification. |
| Every required command returned zero, has complete captured output, decoded successfully, and was presented/escaped successfully | Exit zero alone does not discharge evidence obligations. |
| No unresolved infrastructure problem remains | Failed storage/reporting is not a harmless annotation on a passing run. |
| Raw paths are the expected task/run-owned paths, with no escape/redirection and actual regular-file metadata | A string schema is not safe filesystem resolution. |
| The overall receipt is completed and `passed` is true | A partial or historical green field cannot be read in isolation. |

Use existing path checks and reject symlinks/junctions at relevant ancestors. Do not add a second filesystem sandbox or claim race-proof protection against hostile local processes. Use schema validation for structure and this small consumer logic for relationships; neither authenticates human approval.

## 6. Execution and failure-ordering contract

### 6.1 Normative implementation sequence for `verify_task`

The following is implementation pseudocode, not a new shell command or an alternative to the native CLI. It expresses the ordering that tests must make observable.

```text
1. Load the existing active task and validate its route/configuration.
   Reject paused, unsupported, reroute-required and unknown-profile cases normally.

2. Allocate a runId for every selected profile and construct schema-valid pending
   receipts, all passed=false. Record actual allowlisted runtime information.

3. For each selected profile:
      atomically publish its current-profile pending receipt;
      atomically publish the corresponding canonical pending receipt.
   If any admission publication fails: execute no configured check; fail explicitly.

4. For each admitted profile:
      compute initial input identity;
      checkpoint it in canonical then current receipts;
      set running, retaining passed=false.

5. For each configured command, in the configured order:
      append its pending slot with exact configured arguments/deadline;
      checkpoint canonical then current;
      present/flush its header; on reporting failure, stop as incomplete;
      create its exclusively named, contained raw-output file;
      resolve and start the ordinary native executable; record what actually starts;
      await the existing effective deadline; retain normal/timeout/interrupt result;
      close capture handles and record available raw identity/result/timings;
      checkpoint BEFORE attempting decode or terminal output;
      strictly decode complete bytes as UTF-8; record success or explicit failure;
      checkpoint BEFORE presenting the decoded output;
      present/flush output with native display escaping if necessary;
      record presentation outcome and checkpoint;
      apply existing keep-going behavior only to ordinary check outcomes.

6. After the selected execution/reporting steps:
      flush the truthful pre-publication summary;
      re-read active/control/input identity using the existing rules;
      compute final result; record unavailable identity explicitly rather than guess;
      validate the terminal receipt;
      atomically publish canonical, then the matching current-profile receipt;
      perform no further fallible human output after successful final publication.

7. Return zero only if every selected profile completed and passed. Otherwise
   return the existing nonzero failure result, preserving original child codes.
```

The finalized record's `recordedAt` must be generated once for a checkpoint and used in both copies, so the writer does not manufacture a mismatch by separately timestamping two otherwise identical documents.

Centralize checkpoint construction and pair publication in a small helper used by this command. It may live in `_sdlc_state.py` with existing persistence responsibilities. Keep command execution and decision-making in `sdlc.py`. Do not duplicate the pass predicate in several wrappers; use one shared semantic consumer with negative tests.

### 6.2 Failure cases and required retained truth

| Failure | Required behavior | Completion consequence |
|---|---|---|
| Configured check returns nonzero | Preserve its original return code and exact raw/decoded output; stop or continue according to the existing `--keep-going` contract. | Completed failed profile, never success. |
| Executable unavailable | Preserve unresolved/resolved facts and the actual discovery/spawn error; no invented child output or return code. | Non-passing, retaining ordinary keep-going behavior where safe. |
| Timeout | Stop/wait for the owned direct child using supported native process operations; retain available bytes, observed result and primary timeout status. | Non-passing even if cleanup returns zero. |
| Malformed UTF-8 | Keep raw bytes and original process status. Decode failure is separate; never replace bytes to turn it into a textual pass. | Incomplete/nonzero; no assurance from a zero-exit producer. |
| Reporting or flush failure | Retain already checkpointed command evidence; append the actual report problem if the store works. Stop further work even with `--keep-going`. | Incomplete/nonzero. |
| Final identity read fails | Preserve earlier commands and `identityBefore`; leave `identityAfter` null and record the failure. | Incomplete/nonzero. |
| Inputs change during execution | Preserve both real identities; do not silently refresh the accepted baseline or control digests. | Non-passing under current rules. |
| Canonical checkpoint succeeds but current copy fails | Keep canonical evidence and previous current copy. A mismatch or nonterminal current record cannot satisfy the gate. | Incomplete publication/nonzero. |
| Persistence fails before a reporting step | Do not proceed to ordinary presentation as though evidence was saved; best-effort diagnostic identifies the failed recording boundary. Keep raw files already written. | Stop; nonzero. |
| Catchable interruption | Record an interrupted result with known completed slots and available partial output; clean up only owned process/handles. | Non-passing; no automatic resume of the interrupted attempt. |
| Uncatchable runner termination | Last pending/running receipt and raw bytes remain as available. Reader reports unfinished evidence, not a guessed finish time or code. | No pass; owner confirms producer state before a new attempt. |
| Cleanup of an owned temporary file fails while another error is in flight | Preserve the primary failure; record cleanup as secondary where possible. | Never substitute a cleanup error for the original result or erase original evidence. |

`--keep-going` does not authorize continued execution after the evidence mechanism or reporting channel has become unusable. It remains a way to collect ordinary check failures, not a way to disregard infrastructure failure.

### 6.3 Entirely unwritable store: explicitly bounded guarantee

If the **first pending current-slot write cannot succeed**, the process cannot guarantee any new durable record in that store. Execute no configured command. Return nonzero with an explicit pre-admission recording failure through whatever already authorized diagnostic channel remains usable. Preserve any partial file and existing records; do not call the attempt admitted or claim that the older receipt represents it.

An older successful receipt may physically remain when no new write was possible. A later stateless reader cannot discover an event that was never recorded anywhere. Accordingly, the current operator/task must retain the observed blocker in its existing record and must not hand off using that older receipt. After restoring the existing storage capability under appropriate authority, perform a fresh native attempt. This is a stated limit, not a fabricated claim that a filesystem can record its own total inability to write.

Once the pending current receipt has been published, normal later failure paths leave a non-passing current state or a mismatched receipt pair. Tests distinguish the two cases; they must not assert an impossible global durable guarantee for zero successful writes.

### 6.4 Process and crash limits

The configured process is expected to wait for its output-producing children and finish within its configured deadline. File capture and direct-child timeout handling do not establish reliable termination of every descendant, especially across Windows shell/package-manager processes. Do not infer that a log is complete if an identified producer can still append to it. Record a capture/cleanup gap and keep the attempt non-passing.

For bounded fixtures, give children their own finite wait so a deliberately terminated verifier cannot leave a runaway fixture. Use native waiting and owned-process cleanup; no process-name-wide termination. A general Windows Job Object supervisor or cross-platform process-tree framework is outside WP1 unless a separately accepted, reproduced requirement demands it.

Atomic replacement here establishes visibility of complete JSON files under the existing helper's supported filesystem assumptions. It does not demonstrate durability across power loss, disk failure, network-filesystem semantics or concurrent hostile mutation. Do not add arbitrary `fsync` calls and describe the entire multi-file evidence store as transactional. [R04, D02, D04]

## 7. Detailed implementation tasks

The eight tasks below are execution slices inside one repair—not a requirement for eight Issues, eight worktrees, eight approvals or eight full-profile repetitions. Reuse the existing accepted task, one owned implementation checkout and its evidence record.

### WP1.1 — Bind the accepted scope and map the real consumers

**Inputs:** P1, #32, the Issue #25 corruption record, actual local `AGENTS.md`/SDLC policy, current source revision and available WP0-preserved failures.  
**Owner:** implementer; Max only for genuinely missing acceptance/configuration decisions.  
**Dependencies:** no runtime repair; obtain required acceptance before implementation.

Establish the actual starting commit and local dirty state. Use a separate owned checkout, not one of the six evidence-bearing worktrees. Read the local effective instructions and record any differences from the pinned observations. Use the existing `.venv`; do not install or change tools merely because the issue lists historical versions.

Inventory the callers of `_commands.run` and the consumers of run/profile JSON, including imports with renamed references, tests, Stop handling, handoff, local scripts and generated host calls. The source search already identifies Git/path queries, Node/npm version probes and the two `gh --json` calls; confirm all actual callers locally before changing shared defaults. [R15]

Create a short table in the existing record: call site, subprocess protocol, intended codec, whether text normalization is acceptable, expected error behavior and regression that preserves it. For unknown external byte protocols, do not guess a code page. Keep binary interfaces binary and leave unrelated callers unchanged unless a demonstrated default-mode effect requires a scoped correction.

Present D1–D10 and the section 3.3 file/settings inventory as the concrete proposal. Accept the new run schema and the historical-v2 evidence rule explicitly. Bind the linked capture defect to #32 or its existing tracker, without treating capture as an approval service.

**Exit evidence:** attributable scope/route/configuration decisions; frozen starting identity; consumer inventory; actual source-evidence locators; native tool identities and constraints. No reproduction is counted yet.

### WP1.2 — Establish independent failing boundary tests

**Inputs:** unchanged source and accepted test scope.  
**Owner:** implementer; expected text/outcomes are authored independently.  
**Dependencies:** WP1.1.

Extend `LocalVerificationControlTests` using its existing disposable-repository model. Keep fixture profile commands small; do not run the actual full product suite for every negative control. Create a tiny owned process fixture whose modes emit specific UTF-8 or invalid bytes, return an explicit code, or wait at a bounded readiness checkpoint. Expected byte strings and exit codes must be literals independent of the writer under test.

Add a real subprocess fixture that invokes the maintained `scripts/runRepositoryPython.js`, not a mock or a copied fake interpreter. A minimal disposable npm package can invoke the actual launcher by its quoted absolute path and pass the copied fixture repository's `scripts/sdlc.py` by absolute path. The launcher then uses the already approved source checkout `.venv`; the copied SDLC script derives its disposable repository and writes only there. State this boundary honestly: it tests actual npm/Node/launcher/CLI processes while avoiding a new environment installation. A later real-worktree test covers the ordinary relative-path entry exactly.

For the Windows regression, launch a fresh process with `PYTHONUTF8=0` and no inherited `PYTHONIOENCODING`, capture stdout/stderr separately as bytes, and establish the pre-repair effective codec. Use a command that writes the U+2716 UTF-8 bytes directly and returns 7, so the check's output encoding does not obscure the parent's reporting failure. The expected repaired outcome is a retained failed receipt and return 1 from the verifier, with child returnCode 7. Also cover successful Unicode output.

Separately establish the known-protocol regression at `_commands.run`: a real fixture process emits UTF-8 JSON with a literal em dash and non-ASCII body, while the consuming Python process runs without UTF-8 default mode under the applicable locale. Do not mock the completed string in this test, since that bypasses decoding. A test-only adapter may replace external `gh` execution with the byte fixture while asserting the exact intended `gh` argv; label it a protocol-boundary test, not actual GitHub authentication or approval.

On platforms where the default codec is UTF-8, retain portable tests and exercise an explicitly selected `cp1252` negative control without calling it a Windows-default reproduction. The Windows job must exercise the actual default behavior and report its codec; a skip cannot count as Windows acceptance.

Run and retain the meaningful failures **before adding `-X utf8`**, which could otherwise mask the shared-helper defect. Retain the existing in-process Unicode and mocked-spawn tests as narrower useful coverage. Add a baseline oracle with literal expected text/UTF-8 bytes and a separately established digest; malformed or incorrectly decoded text must not acquire its expected result from the capture under test.

**Expected RED evidence:** actual default-path missing failed receipt/output exception; exact body mismatch on locale decoding; a reporter-failure test observing absence of completed-command persistence. Installation/import/startup errors are not behavioral RED.

**Exit evidence:** runnable small fixtures, independently authored expectations, original failures with actual process codes/stream settings, and explicit unexercised host boundaries.

### WP1.3 — Repair launcher and Issue-capture text boundaries

**Files:** launcher, `_commands.py`, baseline capture in `sdlc.py`, launcher/baseline regressions.  
**Dependencies:** WP1.2.

Add the exact D1 flag prefix and no other process setting. Update the mocked-spawn contract for that precise change. Assert that literal arguments, spaces, semicolons and normal failure results are preserved and that missing `.venv` still causes rejection without a global fallback. Confirm no inherited environment entry was changed in the parent process.

Add the optional codec/error parameters to the existing helper and explicitly use UTF-8/strict at both Issue/repository JSON calls. Exercise the helper with a child returning nonzero to prove the original `check=True` behavior is retained. Do not weaken subprocess checking to extract JSON from an error result.

Make new baseline Markdown writes explicit about newline behavior, and hash the exact decoded Issue body as UTF-8. Test Greek/CJK/emoji text, composed versus decomposed Unicode, literal backslashes, CRLF inside a JSON string and empty optional body. Preserve current title, labels, metadata and approved representation. Assert no new accepted output pair for malformed UTF-8, malformed JSON or failed transport; preserve any already created artifact of a later write failure for diagnosis rather than silently deleting history.

Verify old Issue #25 files have the same raw hashes before/after. Reuse the native linkage validator for valid-versus-mismatched body comparisons. Do not use a new auto-repair heuristic or broaden this into baseline schema/approval changes.

Re-run the consumer tests identified in WP1.1. Where the new Python default affects Git/path or setup output, qualify the actual supported boundary; keep binary/native data ownership. Record any additional needed code change instead of silently changing every helper caller.

**GREEN criterion:** the real redirected launcher and exact protocol tests pass under their stated boundaries, explicit standard-stream overrides remain visible, and unrelated interpreter/argument/capture behavior is preserved.

**Partial-completion warning:** this slice does not make verification evidence-first. #32 remains open until WP1.4–WP1.8 establish persistence and real Windows acceptance.

### WP1.4 — Add the receipt contract, admission and reader semantics

**Files:** new run schema, `_sdlc_state.py`, admission in `sdlc.py`, control tests.  
**Dependencies:** WP1.3; coherent delivery with WP1.5–WP1.6.

Install the exactly approved v3 schema using the existing validator. Add a small pure receipt-construction/validation helper and a pair-publication helper; avoid an extensible event system, class hierarchy or new persistence backend.

Implement D4 admission, with pending current records written before canonical records and before any configured command. Use UUID identities from the existing standard-library approach. All selected profiles must be admitted before execution begins. A failure during preparation leaves an explicit incomplete/pending outcome, not a partially executed unrelated profile campaign.

Add the semantic current/canonical reader checks from section 5.4. Reuse the existing freshly computed input identity and configuration. Keep error messages actionable and bounded: identify the affected profile/run and whether evidence is missing, malformed, incomplete, stale or mismatched. Do not dump raw output or secrets into Stop JSON.

Preserve active schema 2 and existing baseline/current policy digests. Reject v2 as new proof without modifying its bytes. Existing route checks still determine whether focused, affected or full evidence is required; the new reader cannot decide that independently.

Test that a previously successful profile with the **same task/input identity** becomes non-passing as soon as the new pending record is admitted. This case must not modify source/configuration merely to arrange the failure, or it would prove only the old stale-input rule. Use controlled fixture output or a narrowly injected process result with the limitation recorded.

**Exit evidence:** schema and semantic negative controls pass; no command can start before admission; old history is retained; current/canonical partial publication cannot satisfy handoff.

### WP1.5 — Persist raw command output and checkpoint every completed result

**Files:** execution loop in `sdlc.py`, contained output helpers in `_sdlc_state.py` where justified, fixtures/tests.  
**Dependencies:** WP1.4.

Replace the in-memory-only text subprocess path with D5's file-backed binary capture. Keep one ordered command sequence and the original effective default deadline of 600 seconds when unspecified. Preserve configured timeouts, command names, literal argv, cwd and native executable resolution.

Create each raw output file exclusively; validate ownership/containment before opening. A collision or reparse point is an error, not permission to overwrite another artifact. Do not place new output inside an accepted baseline or a tracked fixture. Save the command slot's pending state before executing it and record the resolved executable only when known.

On completion, retain the observed return code and raw output reference/timings in the receipt before strict decoding. If decoding succeeds, preserve decoded text exactly, including CRLF when present. If it fails, retain all raw bytes and a structured decode problem. Do not change the producer's result to an invented `unavailable` status solely because its output is not UTF-8.

Use native owned direct-child timeout/wait handling; record partial capture and cleanup limits. Keep failures distinct from missing executable and runner interruption. Preserve existing ordinary `--keep-going` semantics but stop on infrastructure errors that prevent trustworthy collection.

Exercise invalid bytes with both exit zero and nonzero; an empty output capture with exit zero; Unicode split at a timeout boundary; an unavailable executable; a failed check followed by a successful later attempt. Inspect actual artifact bytes and records, not only mocks reporting that a write function was called.

**Exit evidence:** a fault raised at the presentation boundary sees completed-command result/raw evidence already on disk; available bytes survive decoder failure; previous runs remain unchanged.

### WP1.6 — Make presentation bounded and final publication truthful

**Files:** `_commands.py`, reporting/finalization in `sdlc.py`, Stop/handoff consumers and tests.  
**Dependencies:** WP1.5.

Implement D6 once, using native codec escaping rather than a custom Unicode transliterator. Do not mutate global `sys.stdout` or call `reconfigure` on shared streams as an implicit host-setting repair. A stream without normal encoding metadata remains supported through its ordinary write contract; a real write/flush error propagates to the owning verifier.

Exercise explicit `PYTHONIOENCODING=cp1252:strict` and `ascii:ignore` with a successful UTF-8 byte producer. The terminal should visibly escape unrepresentable characters rather than lose them, while raw bytes and decoded receipt text remain exact. Separately verify that a genuinely failing child retains its nonzero result.

Checkpoint report problems after earlier saved command evidence. Keep later commands unexecuted on report/capture/persistence failure regardless of `--keep-going`. Use a best-effort existing stderr diagnostic for terminal failures, avoiding recursive reporting errors. If both streams fail, nonzero exit and retained incomplete evidence are the available observations; do not claim a visible message was delivered.

Implement D7 finalization. Flush required output before publishing success, compute actual final identity, validate, write canonical then current. Unit tests must inject failure at final summary write/flush and both final receipt writes. Do not leave a post-commit success print that can fail after the receipt becomes green.

Exercise real Stop gate input/output: ordinary incomplete attempt returns 2; continuation emits JSON explaining the blocker and returns 0 without authorizing completion; paused behavior is retained; a valid completed run yields the normal empty JSON. Exercise `handoff` separately and prove it rejects incomplete records while preserving active state and history. Preserve existing native Windows COMSPEC-delivery tests; no hook command regeneration is needed merely to adopt shared-reader semantics.

**Exit evidence:** terminal failure cannot erase completed-command evidence or produce an accepted new success; Stop remains bounded and handoff remains evidence-gated.

### WP1.7 — Qualify interruption, storage failure and preservation boundaries

**Files:** existing control tests and the small fixture.  
**Dependencies:** WP1.4–WP1.6.

Use deterministic readiness signals: a first command has a persisted completed slot; a second has entered running state and signaled readiness; the test then terminates the owned verifier process. Do not rely on sleep duration alone. The fixture has a finite self-expiry and owned cleanup so the negative control cannot strand unlimited work.

Inspect retained first-command bytes/result, second-command available output and unfinished state. Do not infer the killed runner's unknown second-command exit status. For catchable interrupts, verify a terminal interrupted receipt where the platform delivers the intended signal; for uncatchable termination, assert only the persisted pending/running contract. Label platform differences explicitly.

Inject storage failures at native write/replace seams in unit tests, and include a real owned filesystem failure in subprocess tests. If running with rights that invalidate a permission-mode test, do not report chmod as a genuine unwritable-store proof; use a deterministically invalid owned destination or an appropriate unprivileged test boundary and state which condition was exercised. Do not alter host ACLs to satisfy the test.

Cover admission current-slot failure, canonical-start failure after invalidation, per-command checkpoint failure, final canonical/current mismatch, raw-file collision and cleanup failure while handling a primary exception. Preserve exact prior-file bytes. Validate the zero-write limitation from section 6.3 rather than expecting a new receipt when all writes were rejected.

Re-run preservation controls: source/active/control/baseline/untracked and declared ignored input changes invalidate success; ordinary runtime scratch does not; pause/resume identity changes remain distinct; path traversal and redirection cannot write outside owned evidence; early ordinary failure cannot claim an unexecuted command passed.

**Exit evidence:** executable failure matrix with actual observations and limitations; no source overwrite, hidden retry, fabricated old-run migration or new multiwriter claim.

### WP1.8 — Verify the frozen repair on Windows and land coherently

**Inputs:** final writer/schema/reader candidate and retained failures.  
**Dependencies:** all earlier slices, required existing approvals.

Before final qualification, complete documentation edits and remove only spent task-owned diagnostic scaffolding that affects maintained inputs. Leave permanent regression fixtures in place. Freeze the candidate identity; do not revise a tracked execution diary while the final verifier runs.

Use the actual supported Windows checkout and its existing `.venv`, Node/npm entry point, PowerShell surface and command guard. Run the real redirected Unicode success/failure fixture without caller-supplied UTF-8 settings. Record actual effective stream codecs, executable identities and command outputs; historical issue versions are context, not automatic current qualification.

Run the relevant focused tests and the existing SDLC matrix on Windows and Ubuntu. Confirm the new fixture/schema are selected through the actual Git scope test, without adding a new workflow. Inspect the current candidate's actual workflow jobs/results. A previous green head, mocked spawn or Linux-only local run does not establish Windows acceptance. [R13]

Run the existing R2 full profile on the final frozen implementation after the last relevant edit. It currently contains eleven configured commands, including direct Vite build without prebuild auto-fixes. Do not replace it with focused fixtures or extend it with an unrelated exhaustive campaign. Preserve a new failing attempt if anything fails; repair only the actual defect and rerun the affected evidence plus required final profile. [R12]

The independent verifier must inspect actual v3 JSON and raw bytes, exercise the original reporting boundary and negative gate behavior, and compare baseline text independently. A fixture that substitutes `gh` is not a live Issue capture: perform a bounded authorized read/capture comparison through the actual GitHub CLI when available, without editing an accepted Issue or overwriting historical snapshots. Missing live capability remains a reported boundary.

Only then append actual outcomes and scoped limitations to the existing verification/adoption record, using a separate runtime/PR evidence location for results that would otherwise invalidate the tested source. If a tracked documentation edit changes the final candidate, obtain the required fresh qualification of that new candidate rather than calling the older receipt current.

Land the receipt writer, schema and reader together. Detailed commits, pushing, PR edits and merge retain separate existing authority. Version/package status remains unchanged. Closing #32 requires owner acceptance and the completed A01 evidence; disposition the linked capture defect using A02 separately. Do not close either solely because the other passes.

**Exit evidence:** exact reviewed candidate, protected-host Windows readback, both-platform control results, fresh full-profile receipt, independent verification, retained counterevidence, actual approval references and truthful remaining boundaries.

## 8. Regression catalogue and independent oracles

These are required behaviors, not mandatory separate test files or repeated full-suite invocations. Group inexpensive cases in existing fixtures. Unit fault injection belongs at actual process/file/presentation seams; it must not add production environment switches, test-only CLI bypasses or another command classifier.

**Boundary codes:** U = unit/native helper; P = real process/owned filesystem fixture; W = actual Windows npm/Node/repository-Python boundary; G = gate/consumer; I = final integration/independent verification.

| Test | Boundary | Setup and independent expected result | Meaningful failure/sensitivity |
|---|---|---|---|
| T01 — default Unicode success | W | Fresh redirected process, no `PYTHONIOENCODING`, caller UTF-8 mode disabled; raw fixture emits the literal UTF-8 bytes of `✖ 漢字 😀\n`, returns 0. New v3 run succeeds with exact bytes/text. | Pre-repair actual default-path exception or absent receipt; codec observed, not assumed. |
| T02 — default Unicode failed check | W | Same byte fixture returns 7. Verifier returns nonzero; command returnCode is 7, output remains exact, run is non-passing. | Original #32 boundary without recreating the real lint defect. |
| T03 — explicit legacy stream | W/P | `PYTHONIOENCODING=cp1252:strict`; successful UTF-8 byte producer. Parent uses visible escape for unsupported display; raw/decoded evidence is unchanged. | Removing presentation adaptation reproduces unrepresentable output. |
| T04 — inherited lossy error mode | P/W | `PYTHONIOENCODING=ascii:ignore`. Required characters are visible as escapes, not silently dropped. | A blind `print` loses characters despite exit zero. |
| T05 — launcher preservation | U/P | Exact `.venv`, cwd, stdio, inherited environment, literal/spaced/metacharacter arguments and normal exit code; missing `.venv` rejects. | Deliberately wrong flags/path/argument handling fail existing consumer assertions. |
| T06 — baseline exact Unicode | P/W | Literal independently authored Issue JSON; exact body bytes/digest, including distinct NFC/NFD and CRLF content. | Wrong decode can leave valid JSON but produces an exact-text mismatch. |
| T07 — capture transport failures | P/U | Invalid UTF-8, invalid JSON and nonzero protocol process. No accepted new baseline pair, original error not reclassified as valid text. | Replacing strict decode or disabling `check` is detected. |
| T08 — historical baseline preservation | U/I | Hash/read original v1/v2 before/after; native linkage rejects known mismatched body and accepts matching fixture. | Any silent rewrite or schema-only success claim fails. |
| T09 — admission precedes execution | P/G | Observe pending current and canonical receipts before releasing the first fixture command. | Marker written after spawn cannot satisfy the assertion. |
| T10 — same-input old green invalidation | P/G | Existing successful same-task/same-input receipt; new attempt admitted then blocks/fails without source/control mutation. | Gate must reject immediately; existing fingerprint drift cannot be the reason. |
| T11 — history failure then success | P/G | Failing attempt then new passing attempt; separate run IDs and raw files; original failed bytes unchanged. | Reusing an ID or overwriting counterevidence fails. |
| T12 — first-write store failure | P/U | Reject first current-slot publication. Assert no configured child starts and CLI is nonzero. Preserve old files; record pre-admission limitation. | Test explicitly does not expect a durable record in an unwritable store. |
| T13 — canonical admission failure | U/G | Pending current slot succeeds; canonical creation fails. | Current pending record rejects old green; no child execution. |
| T14 — completed evidence before output | U/P | Reporter inspects on-disk record/raw content then raises. Original result and completed bytes must already exist. | Reordering checkpoint after display fails this oracle. |
| T15 — header reporting failure | U/P | Fail first header write/flush after admission. | Pending/incomplete run retained; check has not executed. |
| T16 — final summary/flush failure | U/G | All checks succeed, but required pre-publication reporting fails. | No accepted success receipt; no late fallible success print. |
| T17 — final receipt split failure | U/P/G | Canonical final write succeeds, current write fails, and converse earlier-stage failure is exercised. | Pair mismatch or nonterminal state rejects success. |
| T18 — invalid bytes preserve result | P | Literal `b'original\xff\r\n'`, once exit 0 and once exit 7. Exact raw bytes preserved; output null/decode failure; original codes preserved. | Text-only capture or replacement decode fails. |
| T19 — exact empty/CRLF output | P | Empty successful stream and explicit CRLF stream. Length/digest/text reflect the original bytes. | Universal newline normalization or absent empty capture fails. |
| T20 — timeout with partial Unicode | P | Owned child writes a valid prefix and partial UTF-8 sequence, signals ready, then exceeds its deadline. | Timeout stays primary; available bytes retained; no success or invented complete decode. |
| T21 — executable unavailable | P/U | Missing executable and permitted spawn failure fixtures. | `unavailable`, null unobserved return code and actionable error remain non-passing. |
| T22 — catchable interruption | P | Platform-appropriate interrupt at controlled readiness. | Retain known completed evidence; report interrupted where caught; no fake code. |
| T23 — uncatchable runner termination | P | First command checkpointed; second signals readiness; terminate only owned verifier. | First result/raw data survives; second remains unfinished with no invented finish/result. |
| T24 — identity capture failure | U/P/G | Force failure reading final identity after a completed check. | Completed evidence survives; final identity null/problem, non-passing. |
| T25 — existing input/control freshness | U/P/G | Change source, active task, baseline, control bytes, untracked or declared ignored input; preserve runtime-scratch exception. | Existing stale-evidence checks still reject each relevant change. |
| T26 — complete configured inventory | U/G | Alter name/argv/order/ordinal/deadline/count while retaining plausible successful fields. | Reader rejects different or incomplete checks, even with same list length. |
| T27 — receipt validation | U/G | Old version, malformed states, foreign task/run/profile, unmatched current/canonical and unexecuted required checks. | Schema plus semantic reader rejects; old history bytes remain. |
| T28 — contained create-only evidence | U/P | Existing raw filename, path traversal, symlink/junction or foreign task path in owned fixtures. | No overwrite or out-of-scope write; no `--force`/alternate writer. |
| T29 — atomic/cleanup failure | U/P | Fail write/replace and then temp cleanup. Preserve original prior JSON and primary exception. | Partial JSON publication or masked primary failure is detected. |
| T30 — keep-going distinction | P | Ordinary failing check can continue when requested; reporting/storage failure cannot. | Later marker indicates only the allowed continuation path executed. |
| T31 — Stop/handoff contract | P/W/G | Incomplete first Stop, continuation, paused task, passing task and handoff. | Preserve 2/0 protocol semantics; a continuation zero is never completion authority. |
| T32 — actual integration and consumers | W/I | Current Windows ordinary relative entry, existing Ubuntu/Windows controls, shared setup consumers, exact baseline readback and final eleven-command R2 profile. | No substitute from mocks, previous candidate or an older/nonselected runtime. |

For T20–T23, readiness must be an observed file/IPC event owned by the fixture with bounded waiting. Sleep-based races alone do not establish the intended interleaving. No production debug interface is necessary: helper-level faults can be injected by existing unit-test mechanisms, while process tests use normal observable files and signals.

For T12/T13/T17/T29, include both a controlled injected fault and a native filesystem/process boundary where practical. A mock alone does not establish Windows filesystem behavior. Conversely, an unavailable unprivileged/NTFS capability is reported as missing evidence, not bypassed with broader permissions.

### Baseline fixture shape

Use an independently authored semantic body such as the following; the exact bytes are fixture data, not an actual Issue or accepted product requirement:

```text
Accepted — no silent repair.
Greek: Καλημέρα; CJK: 漢字; supplementary: 😀.
Keep the composed é distinct from the decomposed e + combining acute.
Keep an embedded CRLF and literal backslash sequences unchanged.
```

Store the fixture's expected bytes in an unambiguous binary/UTF-8 fixture or construct them from independently specified code points. Do not obtain expected body bytes by reading the resulting baseline. Include a separate assertion that the JSON envelope remains syntactically valid under the wrong `cp1252` control so the test proves semantic corruption can escape schema validity.

### Preserve success/failure chronology honestly

Already-correct behaviors use preservation tests; do not deliberately break production to claim RED. New tests that fail at environment setup or invalid fixture construction are not evidence that the target behavior was absent. Keep those failures, label them and fix the fixture. Use exact test selection/readiness observations to distinguish “not run” from “passed.”

## 9. Verification commands and execution environment

These existing entry points are available at the inspected revision. Run them only in the authorized implementation or verification checkout, using its existing selected tools. Any new fixtures must first be integrated through the approved change.

```powershell
# Focused launcher preservation and exact process-call contract.
npm test -- --runInBand tests/run-repository-python.test.js
if ($LASTEXITCODE -ne 0) { throw 'Launcher regression failed.' }

# Existing discovered lifecycle/control regressions, including the new WP1 cases.
npm run test:sdlc
if ($LASTEXITCODE -ne 0) { throw 'SDLC regression failed.' }

# Shared helper/setup consumer regressions.
npm run test:python
if ($LASTEXITCODE -ne 0) { throw 'Repository Python regression failed.' }

# Read-only generated configuration check, not a setup or host-trust operation.
npm run check:sdlc
if ($LASTEXITCODE -ne 0) { throw 'Generated configuration is not current.' }
```

Focused test filtering may be used through the actual current unittest/Jest interface; record the number and names actually selected. Do not add convenience aliases or a new verification profile solely for this plan.

After an actually accepted and correctly routed task exists, the existing final command is:

```powershell
npm run sdlc -- verify --keep-going
if ($LASTEXITCODE -ne 0) { throw 'Final verification failed or is incomplete.' }
```

For the issue's redirected path, retain stdout and stderr separately under an owned evidence location through a byte-preserving test harness. Do not use a global `$env:PYTHONUTF8='1'` during the decisive default-path acceptance test. Use process-local settings for negative controls, remove only those local settings in the next child process, and record actual observed modes.

The ordinary full profile already invokes the direct Vite build without prebuild auto-fixes, source ontology invariants, JSON-LD generation and the MCP bundle. Preserve that profile and inspect actual identities before/after. Do not run `npm run build` as an equivalent read-only verification command when it invokes auto-fixes. [R12, R14]

### Host evidence table to populate from real execution

| Evidence | Required value |
|---|---|
| Source and controls | Full candidate SHA; relevant dirty-state identity; active task and route; policy/configuration digests. |
| Process chain | Actual npm/Node command, repository `.venv` executable, Python version, PowerShell/Codex versions where applicable. |
| Codec settings | Actual UTF-8 mode, redirected stream codecs/error policies, named process-local overrides only. |
| Native guard | Actual protected execution outcome; any denial remains distinct from a failed test. |
| Failed fixture | Original child code, CLI code, raw bytes/digest, receipt pair and prior evidence hashes. |
| Successful fixture | Exact Unicode output, successful receipt pair and independent reader result. |
| Baseline | Exact input body/UTF-8 digest, new captured identity, native comparison result; fixture versus live read explicitly distinguished. |
| CI | Workflow/run/attempt and actual tested head or merge candidate; Windows and Ubuntu outcomes and skips. |
| Independent verification | Verifier identity/authority, fresh reviewed target, checks actually executed and gaps. |

The operating-system versions in the original issue are historical observations. Do not upgrade/downgrade the toolchain to match them automatically. Use the approved supported toolchain and record what actually ran; a new version selection requires its usual qualification.

## 10. Acceptance and closure criteria

| ID | Requirement | Traceability/evidence |
|---|---|---|
| AC1-01 | Ordinary redirected Windows execution handles Unicode without an undocumented caller setting. | Parent A01; T01–T05, T32. |
| AC1-02 | Failed Unicode checks retain original result, exact raw/decoded output and task/input identity in a new receipt. | Parent A01; T02, T11, T14. |
| AC1-03 | Issue text round-trips exactly through the UTF-8 protocol; independent identity comparison catches plausible corrupted JSON. | Parent A02; T06–T08, T32. |
| AC1-04 | A new admitted attempt invalidates older current success before any configured check executes. | Parent unfinished-attempt requirement; T09–T13. |
| AC1-05 | Reporting errors occur after completed evidence is saved and cannot publish accepted success. | T14–T17, T30. |
| AC1-06 | Malformed bytes, unavailable execution, timeout and interruption preserve known facts and remain non-passing. | T18–T24. |
| AC1-07 | Store failures are explicit; partial pair publication is rejected; total-write failure is neither hidden nor falsely described as retained. | T12, T13, T17, T29; section 6.3 limit acknowledged. |
| AC1-08 | Existing freshness, profile-selection, argv, path and interpreter boundaries remain enforced. | T05, T25–T28, T32. |
| AC1-09 | Historical run and baseline bytes are retained, with no invented v2→v3 migration. | T08, T11, T27. |
| AC1-10 | Stop JSON/exit behavior remains bounded; no continuation or pause result is mistaken for verified handoff. | T31 and existing native-hook regressions. |
| AC1-11 | Actual Windows and existing supported-platform evidence, current full R2 profile and independent verification cover the final coherent candidate. | T32; exact CI/head readback; no mock-only or previous-head substitution. |
| AC1-12 | Approved docs/adoption/issue dispositions match executed scope; no unauthorized configuration, installation, guard, publication or cleanup change occurs. | Section 3.3 diff review and final handoff. |

**Complete:** all applicable criteria have actual evidence, the final writer/schema/reader candidate is accepted, A01 and A02 are independently demonstrated, and remaining scope limitations are recorded without being mistaken for failures covered by the repair.

**Implementation complete, qualification incomplete:** code and portable tests may be ready while actual Windows or independent evidence is missing. Preserve the candidate and blocker; do not close #32 or retire its workaround globally.

**Incomplete implementation:** a required retention, pairing, original-result, capture or consumer test still fails. Keep both failures and partial successful slices. Passing the encoding-only slice cannot satisfy persistence criteria.

## 11. Integration, deployment and rollback

### 11.1 Coherent delivery

Use the existing accepted baseline/commit/PR process. A useful commit decomposition is: independently reviewable text-boundary changes with their tests; then receipt writer/schema/reader and complete failure coverage; then final observed documentation where required. This is a reviewability suggestion, not authority for commits or a requirement for extra PRs.

Do not deploy a reader expecting v3 before its writer/schema are available, or write v3 while a consumer assumes legacy success semantics. After integration, run fresh evidence on the actual combined revision. Other ongoing MCP/SHACL work remains independent; coordinate shared script changes at integration rather than overwriting their copies.

Old v2 records remain historical evidence, but current active tasks need new runs under the repaired contract. If actual control/accepted-baseline movement requires rerouting, use the existing explicit lifecycle decision—not a hand edit of `active.json`. A mere receipt-format upgrade does not authorize changing task scope.

### 11.2 Bounded workaround retirement

Retire the caller-supplied UTF-8 workaround only for the actual entry point and host scope that passed default-path qualification. Do not remove intentional user stream overrides. Do not declare #30/DCG, Codex Security artifact I/O, baseline acceptance authentication or unrelated subprocess encoding universally fixed.

The baseline-capture UTF-8 workaround is retired on its own exact-text evidence, not merely because Unicode diagnostics print successfully. Preserve the historical use of the workaround in old receipts and baseline notes.

### 11.3 Failure after deployment

Stop completion/promotion for affected runs, retain v3 receipts and raw files, and use an approved targeted forward repair where possible. A rollback of maintained code is a normal authorized source change, not permission to rewrite or delete evidence. Preserve the active task and record an honest pause/handoff as required.

If an older reader is temporarily restored, explicitly prevent it from being treated as evidence of the new contract. Do not down-convert v3 receipts or copy an earlier green profile over a failed current attempt. Requalification follows the actual restored/fixed candidate and its approved scope.

## 12. Evidence retention and handoff

Use the existing task evidence location for raw fixture results, original failures, targeted RED/GREEN outputs, native Windows/CI results and independent readback. Keep runtime artifacts out of source commits unless a specific durable regression fixture or sanitized record has been deliberately approved for promotion.

Raw verifier output may contain local paths or sensitive diagnostics. Preserve existing access restrictions; do not add a full-environment dump or publish raw security/credential-bearing evidence as public CI artifacts merely to make the report convenient.

The implementation task owns its new fixture repositories/output. Required source failures from WP0 remain owned by their originating tasks. Remove only genuinely spent task-owned scratch after consumers and retention are resolved; never clear active state or discard failed receipts to make a workspace look complete. [P0, R14]

A compact addition to the existing Issue/PR/handoff is sufficient:

```markdown
## WP1 disposition

Candidate: <actual full SHA and relevant input identity>
Accepted scope/configuration: <actual existing decision references>

| Contract | Evidence | Actual outcome / remaining boundary |
|---|---|---|
| Default Windows Unicode, A01 | <run and raw output references> | <observed> |
| Exact Issue capture, A02 | <independent input/capture comparison> | <observed> |
| Persistence and interruption | <failure matrix / receipt pairs> | <observed> |
| Reader, Stop and handoff | <actual native controls> | <observed> |
| Final full profile / CI | <candidate-specific runs> | <observed> |
| Independent verification | <review identity and execution> | <observed> |

Historical evidence preserved: <actual locators and identities>
Workaround retirement: <exact qualified host/entry scope, or still required>
Remaining gaps and owner: <specific, or none>
Task-owned scratch disposition: <removed / retained with consumer and checkpoint>
No package-version, policy-route, guard or publication change: <confirm actual diff>
```

Place prospective check descriptions in the plan and actual results in runtime/PR evidence. Do not continually edit tracked test inputs to narrate a final run and then claim that same run verifies the changed narration.

## 13. Why these choices are proportionate

The selected external capabilities are already part of the approved toolchain: native Python startup/codec/process/file handling, native Node spawning, GitHub CLI JSON, the existing JSON Schema validator, unittest/Jest and the existing CI matrix. No new third-party runtime, logging service, database, schema interpreter, workflow engine or compatibility shim is needed. [R03–R09, R13, D01–D06]

The residual custom responsibility is narrowly repository-specific: identifying an attempt before execution; recording selected command results; distinguishing evidence and reporting states; and deciding whether the current receipt covers the actual required checks and inputs. This belongs in the existing SDLC helper/consumer.

Alternatives rejected for this scope:

| Alternative | Reason not selected |
|---|---|
| Only document `PYTHONUTF8=1` | Leaves default usage and evidence ordering defective. |
| Force a global UTF-8 code page or overwrite all inherited stream settings | Broader host behavior/authority than required; still does not fix persistence ordering. |
| Assume every external command's text is UTF-8 | Conflates known protocol codecs with arbitrary subprocess output. |
| Decode malformed bytes with replacement and continue green | Loses required original content and can conceal semantic corruption. |
| Save everything in `finally` after console printing | Still loses normal progress if the process is terminated first and cannot guarantee correct final identity/status. |
| Add a central event store, automatic resumer or lock service | Duplicates native worktree-local state and expands into WP2/WP3 without need. |
| Keep only a current profile receipt | Erases prior attempts and counterevidence. |
| Scan/replay all historical runs on every Stop | Unnecessary latency and complexity; current/canonical correspondence is enough for the scoped gate. |
| Permanently pin success to the last known green when recording fails | Misrepresents the latest attempt; use pending/incomplete states and explicit limits instead. |
| Add new coverage percentages, mutation thresholds or more operating systems | Does not target the observed text/persistence boundary; use the existing matrix and specific negative controls. |

Prefer focused regression loops per slice and one fresh required final full profile on the stable candidate. Repeat affected verification after relevant fixes, not every unrelated assurance campaign after a prose edit. This preserves the parent's proportionality requirement without weakening the required final R2 checks.

## 14. Traceability to other work packages

| Interface | WP1 contribution | Boundary retained |
|---|---|---|
| WP0 | Uses approved preserved #32/capture evidence; returns new retained run locations and ownership. | Does not clean, move or reactivate original worktrees. |
| WP2 / #33 | Supplies reliable run receipts for linked-worktree tests and integration qualification. | Does not implement exclusive `begin`, multiwriter synchronization or automatic takeover. |
| WP3 | Makes unfinished verification observable through existing evidence/gate semantics. | Does not introduce the general resource-disposition ledger or worktree-release mechanism. |
| WP4 / #30 | Retains an actual command denial distinctly from test execution when encountered. | Does not bypass, reclassify or repair DCG here. |
| WP5 | Retains native security evidence references when required. | Does not install Security updates or retire unrelated workarounds. |
| WP6 | Preserves exact Issue-snapshot behavior for current baseline consumers. | Does not add a committed-plan representation or execute candidate policy in trusted CI. |
| WP7 | Avoids repeated full runs caused by unnecessary tracked-result narration. | Does not introduce dependency-aware verification caching or new policy routing. |
| WP8 | Provides the reliable verification capability to qualify a future combined product state. | Does not claim product acceptance, cross-repository adoption or publication. |

## 15. Preparatory checks performed for this plan

These checks were performed solely to validate design assumptions and the proposed schema. They did not execute or patch the repository implementation.

### 15.1 Process and codec mechanics

`text-boundary-research-checks.json` records six successful small checks on **Linux with Python 3.13.5**:

1. `-X utf8` supplies UTF-8 redirected output even when process-local `PYTHONUTF8=0` is present.
2. Explicit `PYTHONIOENCODING=cp1252:strict` still causes an unsupported glyph to fail, despite UTF-8 mode.
3. Native codec display escaping keeps the unsupported glyph observable as an escape.
4. An explicit wrong `cp1252` protocol decode can corrupt an em dash while JSON remains valid.
5. Explicit strict UTF-8 protocol decoding preserves independently expected body bytes/digest and CRLF inside the JSON value.
6. Native binary-file capture retains invalid UTF-8 bytes and the original exit 7 for a later strict-decode failure.

These establish the tested language/process mechanisms only. There was no Windows, PowerShell, Codex, DCG, npm launcher, repository verification/gate or actual GitHub capture execution. Selecting `cp1252` explicitly on Linux is not a reproduction of Windows default locale behavior.

### 15.2 Proposed schema mechanics

`verification-run-schema-checks.json` records schema validation and **22 expected positive/negative outcomes** for `verification-run.schema.proposed.json`, using the installed JSON Schema validator in the research environment.

The cases cover pending receipts, completed successes/failures, invalid UTF-8 with exit zero, interruption, escaped presentation and rejection of old schema/invalid successful states, missing identity/digest, nonzero successful commands, malformed timestamps and unknown fields.

Three deliberately shape-valid cases demonstrate limits the runtime consumer must reject: unequal before/after identities, configured-command count mismatch and an unsafe capture path. The schema check accepting those examples is expected; schema validity alone cannot establish those cross-object/current-filesystem obligations.

This is not validation of the proposed runtime reader, atomic publication, process cleanup, real Windows behavior or the completed WP1 acceptance matrix. Minor errors encountered while constructing the research generator are not production behavioral RED and are not represented as such.

## 16. Source index

References identify the sources actually used and the claims they support. The new D1–D10 contract, task sequence, receipt format and acceptance decomposition are this plan's proposals. Repository source and documentation establish observed behavior; official language/tool documents establish native interfaces, not the correctness of this entire design.

### Supplied project materials

| ID | Source | Use |
|---|---|---|
| P1 | `../implementation-plan.md`, WP1 and A01/A02; SHA-256 `b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82` | Scope, priorities, exact-text/persistence requirements and boundaries. |
| P0 | `../wp0-worktree-preservation/implementation-plan.md`; SHA-256 `5c789f1250de378b46388c0d9806a7d4c0527cbaf425beaa976e8356e052eba7` | Preservation and ownership interface; no prerequisite to mutate original worktrees. |
| H1 | `sdlcworktreelifecyclehandoff20260910.md` | Historical locations of relevant local evidence; not a current host inventory. |

### Repository observations

All file URLs below are pinned to `79d187802f9255134c03d0786ff75181ed1070ee`. Issue and branch URLs are mutable readbacks from preparation on 10 September 2026.

| ID | Source | Use |
|---|---|---|
| R01 | `https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main` | Refreshed main revision. |
| R02 | `https://github.com/Hadden-Industries/universal-ontology/issues/32` | Observed Windows failure, reported environment, original limits and acceptance requirements. |
| R03 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc.py` | Actual writer, capture, lifecycle and failure ordering. |
| R04 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_sdlc_state.py` | Current state layout, identity/fingerprint, atomic writer and completion reader. |
| R05 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/runRepositoryPython.js` | Native launcher contract and interpreter selection. |
| R06 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_commands.py` | Shared subprocess helper and locale-dependent text capture. |
| R07 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/tests/sdlc/test_pipeline_controls.py` | Existing lifecycle, Unicode, history, identity and hook regression boundaries. |
| R08 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/tests/run-repository-python.test.js` | Existing mocked launcher contract. |
| R09 | `https://github.com/Hadden-Industries/universal-ontology/tree/79d187802f9255134c03d0786ff75181ed1070ee/.sdlc/schemas` | Three existing schemas; no maintained verification-run schema at this revision. |
| R10 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/baselines/issue-25/README.md` | Separately retained Unicode corruption and exact-body comparison evidence. |
| R11 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc_stop_gate.py` | Stop JSON, incomplete/paused and bounded-continuation behavior. |
| R12 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.sdlc/verification.json` | Existing route profiles and eleven-command full verification. |
| R13 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.github/workflows/sdlc-control-tests.yml` | Existing Windows/Ubuntu CI, selected tests and permissions. |
| R14 | `https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/AGENTS.md` | Exact configuration approval, `.venv`, existing task authority and preserved work. |
| R15 | Connector code search for `capture=True` in the pinned repository: `sdlc.py`, `_repository.py`, `set_up_mcp_servers.py`, associated tests | Initial shared-helper caller inventory; execution must complete local consumer inspection, not treat search hits as exhaustive. |

### Official external documentation

| ID | Source | Use |
|---|---|---|
| D01 | `https://docs.python.org/3.14/using/cmdline.html` | `-X utf8`, process-local runtime controls and standard-stream overrides. |
| D02 | `https://docs.python.org/3.14/library/subprocess.html` | Binary/text capture, explicit codecs, native Popen and process timeout/result interfaces. |
| D03 | `https://docs.python.org/3.14/library/io.html` | Text/binary streams, codec/error and newline handling. |
| D04 | `https://docs.python.org/3.14/library/os.html` | UTF-8 mode context and filesystem/process interface limits. |
| D05 | `https://docs.python.org/3.14/library/sys.html` | Actual Python stream/encoding state and redirected stream behavior. |
| D06 | `https://cli.github.com/manual/gh_issue_view` | Supported Issue JSON fields and interface. |

### Attached proposed/mechanical artifacts

| Artifact | Status and appropriate use |
|---|---|
| `verification-run.schema.proposed.json` | Exact proposed receipt structure for review/adoption; not already installed. |
| `verification-run-schema-checks.json` | Mechanical schema checks and explicit runtime-consumer limits. |
| `text-boundary-research-checks.json` | Six Linux/Python process/codec observations; not Windows or repository acceptance. |

## 17. Final acceptance statement for the implementation owner

Use this statement only after actual evidence establishes it, replacing placeholders with the real identities:

> WP1 is accepted for `<candidate>` and `<qualified host/entry-point scope>`. The ordinary redirected Windows entry works without a caller-supplied UTF-8 workaround; failed commands retain their original result and exact output before presentation; admitted unfinished attempts cannot reuse an older current success; and Issue body capture preserves the independently accepted UTF-8 text. Run/profile reader, Stop, handoff and prior identity checks pass on the same coherent implementation. Historical baseline/run evidence is unchanged. Actual full-profile, CI and independent verification references are `<locators>`. Power-loss durability, arbitrary concurrent writers, unobserved process outcomes and unrelated host/plugin defects are not claimed. The linked capture defect and #32 have their separate actual dispositions.

**The completion target is reliable, truthful evidence—not a terminal that always looks green.**
