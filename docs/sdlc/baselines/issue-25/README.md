# Issue #25: accepted baseline capture

Use [v2.json](v2.json), with the [human-readable acceptance record](v2.md), for
[Issue #25](https://github.com/Hadden-Industries/universal-ontology/issues/25).
It captures the unchanged owner-approved requirements and design exactly.
The baseline has not been committed or merged. Keep `state:ready-to-baseline`
until the authorized merge/lifecycle transition; capture is not implementation
authority or evidence of the MCP outcome.

## Acceptance and identity

Max accepted the concrete design in Codex task `UO: Modernize MCP`
(`01a081ea-cffb-7dc2-ad5f-e9e5a17913f3`), user message
`01a0829c-c672-7761-8b9a-267efd84cdd4`, recorded at `2026-09-08T20:01:47Z`.
His subsequent "I approve", user message `01a082b6-f6b4-7212-8c8c-6273a0812b03`
in turn `01a082b6-f61a-71f1-8869-023ca45c8a4e`, explicitly approves
MCP-CONFIG-01 revision 1 and authorizes creating the prepared Issue with the
specified labels, then capturing its baseline. `acceptedAt` uses the app-recorded
approval turn start, `2026-09-08T20:30:23Z`; it is not a publication timestamp.
The full reference is retained in v2.md. The helper does not authenticate acceptance.

The approved Issue-body file, live Issue body and v2 body are identical:
21,422 UTF-8 bytes, SHA-256
`4a535c8798fc72eeef897e46c35962176de7ba08bb2cde5e2e429bb3e2d69ecd`.
The approved MCP-CONFIG-01 revision 1 file has SHA-256
`14670a3be32b461acf3681b0282ddae7d678717216e7a1bca7968b06b0a9bdf2`.
The Issue was created at `2026-09-08T20:34:41Z`; v2 was captured at
`2026-09-08T20:38:08.965286Z`.

## Retained failed capture

[v1.json](v1.json) and [v1.md](v1.md) are failed capture evidence, not an accepted
alternative baseline. The native helper's subprocess text decoding used this
Windows host's `cp1252` default (Python 3.14.7, UTF-8 mode off), corrupting Unicode:
for example, `—` became `â€”`. Encoding the approved text as UTF-8 and decoding it
as Windows-1252 reproduces the entire v1 body. Its incorrect body SHA-256 is
`2fdca79af8d8433bdbe4844e9e46cbddbdb0cae2604f5c4abee0a0afd6468502`.
The v1 schema pass did not establish identity with accepted intent.

The unchanged repository command was run again with `--version 2` and the same
acceptance metadata, using process-local `PYTHONUTF8=1`. Python's
[native UTF-8 mode](https://docs.python.org/3/using/cmdline.html#envvar-PYTHONUTF8)
sets the subprocess decoding correctly here. No persistent environment,
configuration file, helper source, Issue content or acceptance decision changed.
The helper's default Windows decoding remains a reproducible follow-up defect.
The failed capture files were not deleted, overwritten or silently repaired.

## Executed validation and remaining gate

The actual repository `parse_pull_request_fields` and
`validate_pull_request_linkage` functions ran against the live Issue and captured
files through the repository `.venv` launcher in UTF-8 mode. This includes the
accepted-baseline schema and the real title/body hash comparison. Version 2
returned no errors. Version 1 returned exactly
`Current Issue title/body differs from the baseline.`
The approved file, live body and v2 body were also compared directly for equality.

The candidate baseline-only metadata used for that local validation was:

```text
Change issue: #25
Accepted baseline: docs/sdlc/baselines/issue-25/v2.json
Risk class: R2
Acceptance IDs implemented: none
Baseline-only: yes
New functionality: no
Software selection: none
```

This checks candidate document linkage; no actual PR, remote CI run, protected-base
merge or human PR review has occurred. A baseline-only PR may contain only this
Issue's baseline directory. Publish the advisory/dossier/plan/configuration
documents separately under the required Git authority. Product implementation
requires v2 to exist unchanged in the protected base first.
