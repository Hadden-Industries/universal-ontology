# WP4 proposed documentation amendments

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

These are exact proposed additions to the existing command-safety and acceptance documents at the parent observation commit `79d187802f9255134c03d0786ff75181ed1070ee`. They require the repository's normal exact policy/configuration approval before implementation. They are not active policy, a live configuration patch or claims that the commands/tests have run.

Reconcile intervening edits by meaning without replacing unrelated text. The main WP4 implementation plan owns the source register. Do not update historical package/source hashes or mark a new host accepted merely because this document is adopted.

## A. `docs/sdlc/command-safety.md`

**Insertion point:** in section `## 7. Operator response during ordinary work`, after the existing response paragraphs and before the next section. Preserve the existing exception boundaries and all unrelated text.

### Proposed addition

```markdown
### Diagnose a suspected benign-command rejection

Keep the original denied operation and the actual native result. A successful
shorter command or explicit-dialect diagnostic is comparison evidence, not proof
that the original protected dispatch is repaired. Separate a valid safe command
from a quoting or argument-construction error; correct intended semantics as well
as classification.

For the affected occurrence, identify the requested tool/shell/login/cwd, actual
selected executable and arguments, permitted raw hook request, native protocol
and resolved dialect where observable, host and DCG versions, effective native
configuration and loaded packs, and hook enabled/trusted state. Record missing
facts rather than infer them from defaults. The canonical hook name `Bash` is not
proof that the command executes in a POSIX shell. A model-requested shell is not
necessarily the effective shell after host resolution.

Keep original and derived/redacted payloads separately identified. Use existing
protected operational evidence storage; do not turn on blanket command logging,
dump credentials, or install a forwarding/classifying wrapper. A separately
approved observation change must preserve the actual command and native verdict,
keep protocol stdout clean, and have a bounded removal condition.

Native `explain` and hook replay examine text as data. Their process exit codes,
JSON decisions and actual host interception establish different facts. A silent
reply is not proof that an unsupported request was classified. The repository
protocol probe deliberately uses isolated candidate state and synthetic envelopes;
it must not be described as a deployed-policy or host-interception test.

Minimize the full benign input while preserving its valid intended syntax and
material native failure. Retain the original, reduction lineage and safety
neighbors. Choose the repair at the demonstrated producer, host, native DCG or
deployment owner. Do not force all Windows requests to one dialect, relabel a
canonical hook event, mask entire interpreter bodies, or allowlist an executable
merely to remove a false positive.

Qualify the actual installed combination after repair. Require the original safe
semantics through the protected host, and corresponding forbidden-operation text
still denied as inert native diagnostic input. Where the accepted work package
prohibits real destructive testing, that boundary overrides the broader example
matrix: use only non-destructive-by-construction host challenges or record the
unproved subclaim and retain its restriction. Another control's block, a missing
executable, an absent-target error or agent refusal is not native DCG attribution.

An upstream fix, current release number, successful installation or `doctor`
result does not establish propagation into the running host. Retain the local
acceptance item until its installed-path criteria pass. Continue other independent
authorised work without retrying the denied effect through a weaker channel.
```

## B. `docs/sdlc/dcg-acceptance.md`

**Insertion point 1:** append the following rows to the existing evidence matrix. Do not replace its rights, configuration, integration or limitation rows.

```markdown
| Selected shell and request provenance | Requested and effective execution context are distinguished; original versus synthetic/redacted hook payload is explicit; canonical tool name is not substituted for resolved shell identity. |
| Benign rejection regression | Full original or explicitly accepted semantically faithful correction succeeds on the actual protected path; a shorter non-equivalent command or native explicit-dialect allowance is insufficient. |
| Native safety-neighbor preservation | Corresponding forbidden-operation specimens remain denied by the native consumer; the accepted task's limits on live destructive testing are preserved. |
| Guard-result attribution | Native process status, native protocol decision, host handling and target result remain separate; skipped/unsupported requests and another control's block do not count as DCG interception. |
| Installed repair and scope | Actual selected binary/configuration/packs/hook/host identities are recorded after propagation; unrelated tool, worker and interactive-input coverage is not inferred. |
```

**Insertion point 2:** after the existing evidence-matrix safety paragraph and before `## Residual gaps`.

```markdown
For a suspected shell-context defect, keep the original request and each diagnostic
variant separately identified. Record native Windows versus WSL/other process OS,
actual shell arguments and relevant argument-passing modes. A replay on another
OS or with a supplied dialect cannot establish the original host-selected path.

The command-safety guide's diagnosis procedure defines capture, minimization and
repair ownership. Use it within the accepted task, not as a mandatory per-task
ceremony. If original raw evidence cannot be recovered, retain that historical
gap and qualify a new attributable occurrence without inventing earlier metadata.

Use the actual identified corpus and retained prior host acceptance. The blank
26-case template and a later extended operator receipt are not interchangeable
case counts. Changes to material native interpretation or policy require the
relevant safety regressions, not merely a new positive example.
```

## C. `docs/sdlc/verification.md` — execution entry template, not a result

No completed-result prose is proposed before execution. At the actual implementation handoff, append one dated entry using the existing evidence style and this content contract:

```markdown
## Issue #30 protected-dispatch qualification — <actual date>

Repository candidate: <full SHA and relevant dirty identity>.
Installed host/guard/configuration: <actual protected receipt reference>.

| Case | Original evidence | Demonstrated cause or remaining uncertainty | Actual repair | Native diagnostic evidence | Actual protected-host result | Remaining scope |
|---|---|---|---|---|---|---|
| C4-PS | <reference> | <observation> | <change or pending> | <reference and layer> | <actual result or not-run> | <gap> |
| C4-CMD | <reference> | <quoting and dispatch dispositions separately> | <change or pending> | <reference and layer> | <actual result or not-run> | <gap> |

Relevant forbidden-operation specimens: <inert native results and identities>.
Host-denial attribution: <non-destructive evidence or explicit unproved scope>.
Coexisting controls and final verification: <actual results>.
Original failures and trace evidence retained at: <approved real locators>.
Current issue/adoption decision: <actual accountable decision or pending>.
```

Do not commit the placeholders as historical evidence. An existing protected task/Issue record is sufficient until the durable summary is ready.

## D. `docs/sdlc/adoption.md` — factual update boundary

Preserve the historical 0.14.1 receipt and its limits. Append actual newly accepted environment facts only after execution: candidate source/release identity; binary signature/provenance and digest; actual effective configuration and loaded-pack identities; native hook definition and enabled/trusted state; exact host/engine/shell scope; original-regression and native-negative references; coexisting-control results; excluded surfaces; accountable acceptance and next reassessment event.

This document deliberately does not supply future digests, invented acceptance dates or an unconditional v0.14.2 replacement instruction. The implicated live configuration file/settings are unresolved until diagnosis; their exact diff must be reviewed separately.

## E. Explicitly unchanged surfaces

No unconditional edit is proposed to hook matchers, exception stores, enabled packs, fail-closed settings, fallback behavior, user/global configuration, native security plugin configuration, Stop hooks, runtime/active-state schemas, package versions, lockfiles or branch rules. Corpus additions and probe code changes are made only for the evidenced native contract described in the main implementation plan.
