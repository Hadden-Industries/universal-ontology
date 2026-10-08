# [Bug]: Windows SDLC verification can lose run evidence when printing Unicode diagnostics

## Observed behaviour

During MCP modernization on 2026-09-09, redirected `npm run sdlc -- verify`
completed the JavaScript, Python and SDLC tests, then crashed while reporting an
ESLint failure containing U+2716 (`✖`):

```text
ERROR: 'charmap' codec can't encode character '\u2716' in position 818: character maps to <undefined>
```

The native invocation exited 1 without writing a new run JSON or updating the
current profile record. The older `verification/full.json` remained from an
earlier task. The actual lint failure was two `no-unsafe-finally` findings in the
new cache regression test; that product-test issue was corrected separately.
The encoding crash did not produce an exit-zero result, but it prevented the
SDLC helper from retaining the failed attempt in its normal evidence store.

## Expected behaviour and authoritative source

The supported Windows npm entry point must print or otherwise handle Unicode
diagnostics without aborting verification bookkeeping. A failed check must retain
its actual output, status, return code and task/input identity in a new failed run
record. A current attempt must not be represented by a stale successful record.

The existing `verify_task` contract explicitly says to retain each attempt,
including failures. The repository SDLC guide also requires truthful failures and
preservation of native lifecycle evidence. See
[`scripts/sdlc.py` at 79d1878](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc.py#L64)
and [the SDLC guide](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/howto.md).

## Reproduction

The actual failure arose from the ordinary full-profile command on the retained
pre-correction MCP test snapshot. Do not recreate a product lint defect in a live
worktree merely to repeat it.

A minimal reproduction of the same launcher/output boundary, in a normal Windows
PowerShell session with Python UTF-8 mode disabled, is:

```powershell
node scripts/runRepositoryPython.js -c 'print("\u2716")' *> encoding-default.log
$LASTEXITCODE
```

Observed: `UnicodeEncodeError` from `encodings/cp1252.py`; exit 1. The same input
through the same existing repository `.venv`, with only an invocation-local Python
setting, succeeds:

```powershell
$env:PYTHONUTF8 = '1'
node scripts/runRepositoryPython.js -c 'print("\u2716")' *> encoding-utf8.log
$LASTEXITCODE
```

Observed: the expected glyph and exit 0. Use a separate process for this comparison
so the setting does not leak into later baseline observations. This minimal case
reproduces output encoding, not the complete SDLC record contract; the original
full-profile failure supplies evidence for the missing record.

A maintained regression should execute the real SDLC CLI in an owned disposable
repository, with a selected command that writes UTF-8 bytes containing U+2716 and
exits nonzero. Exercise a non-UTF-8 redirected parent stream, then inspect the
actual failed run/profile records. Also cover successful Unicode output and retain
the existing failure-followed-by-success history assertions.

## Evidence and diagnosed mechanism

Observed source sequence in `scripts/sdlc.py:88-109`:

1. Capture child stdout/stderr and decode it explicitly as UTF-8.
2. Print the decoded string to the parent Python `sys.stdout`.
3. Append that command's result, then write the run/profile JSON records.

The ordinary `scripts/runRepositoryPython.js` launcher invokes `.venv` Python
with `-B` and inherited stdio, without selecting an output encoding. A fresh
invocation on this host reported `sys.stdout.encoding == 'cp1252'` and
`sys.flags.utf8_mode == 0`. The observed exception at step 2 explains why the
subsequent bookkeeping was absent. This is a supported causal explanation, not
an inference that every possible persistence failure is fixed by choosing UTF-8.

The existing `test_verification_preserves_utf8_command_output` invokes the helper
under an in-process captured stream. It checks child-output decoding and record
content, but does not exercise the actual redirected Windows parent stream.

Retained local evidence belongs to MCP task `894311c537324f0e954d0177bfb488a9`:

- `cache-repair-full-verification.log`: original full-profile failure, SHA-256
  `46292b9cb7af019e4fd5fb89601446a5f08a23839520cbf849a5334bc339e5c6`.
- `sdlc-encoding-launcher-default.log` and `sdlc-encoding-launcher-utf8.log`:
  the two minimal observed outcomes above.
- A separate verifier using invocation-local `PYTHONUTF8=1` retained the actual
  lint failure in native run `43cc2939c9914aeb990eaacf981fe38d`, SHA-256
  `43b46a2aa5a5d31f7cd693ac54c8ea12abf35aa158d90e83c59f53f050040568`.

These logs are retained in task runtime storage; their hashes identify local
evidence and do not imply that raw logs are attached to this report.

## Environment and version

- Windows; PowerShell 7.6.5; existing repository `.venv` Python 3.14.7.
- Node 24.20.0; npm 12.0.2; SDLC package 1.0.0, pre-release, repository-deployed.
- Base `79d187802f9255134c03d0786ff75181ed1070ee`, with the MCP implementation diff.
  The affected SDLC helper/launcher themselves are unchanged from that base.
- `scripts/sdlc.py` SHA-256:
  `ec1eaf52b5207c79e198210a3d0716da3320b46e41021b1e6ae3f577a484d97b`.
- `scripts/runRepositoryPython.js` SHA-256:
  `bfe04799a53bb769a18717c5dd8efb37e09d804c26e600cbb60e6bf9e983065e`.
- Redirection through the normal npm/Node/Python execution path; no shared-worktree
  state collision was observed. This defect is separate from parallel-task policy.

## Known-good comparison

Invocation-local `PYTHONUTF8=1` permits a normal retained failed run on the original
linting snapshot. After correcting those lint findings, a fresh full profile in
the same runtime mode passed all 11 commands and wrote native run
`3edaa0ca3de443058589a0bb9a8a1fd3`.

That is a temporary execution setting, not a repair of the default launcher or
the ordering of verification-record persistence. No SDLC implementation or
configuration was changed while preparing this report.

## Impact

Bounded inconvenience with an available execution setting. The lifecycle impact
is missing failed-attempt evidence and an older profile record remaining on disk.
The existing input-identity checks were not observed accepting that stale record;
do not claim an approval bypass or silently mark the attempted run successful.

Elevated-risk consideration for routing: verification-evidence retention and
cross-process execution. No security vulnerability or production outage is claimed.

## Acceptance criteria for a repair

- The documented Windows npm entry works with redirected Unicode output without
  requiring the caller to supply an undocumented UTF-8 setting.
- Both successful and nonzero Unicode-emitting commands retain truthful native
  run/profile records, including original command status, output and input identity.
- A reporting/output problem cannot silently prevent retention of an already
  completed command's evidence; failures to persist must themselves remain explicit.
- A real subprocess regression detects the original Windows boundary, while
  current native control tests continue to pass on supported platforms.
- Preserve existing interpreter selection, permissions, command protection,
  configuration approval boundaries and prior failed evidence. Route any required
  configuration change separately before editing it.

The observed symptom, causal source trace and proposed repair acceptance criteria
are distinguished above. This report does not accept a design or authorize a fix.
