# Issue #32: accepted WP1 baseline

[v1.json](v1.json) captures the accepted WP1 repair requirements from
[Issue #32](https://github.com/Hadden-Industries/universal-ontology/issues/32).
The Issue includes the original failure report, D1-D10, the receipt/failure
contract, the approved schema value and the separate Issue #25 capture defect.
Native PR IDs AC-001 through AC-012 map one-to-one to the plan's AC1-01 through
AC1-12 requirements without changing their text.

## Acceptance and exact text

Max's "I approve, continue" is user message
`01a08c8b-b5b4-7861-b829-cf6c6cda4378` in Codex task
`01a08c3d-56a4-74a3-ac35-974a3ffdec2f`. The approval turn began at
`2026-09-10T18:19:21Z`. The subsequent "Keep going" message
`01a08c95-72c3-79a3-a3ad-eef581177551` continued the exact pending Issue
publication and verified capture. These references support the supplied metadata;
the capture helper does not authenticate human acceptance.

The approved review file, published Issue body and captured JSON body are equal:
64,451 UTF-8 bytes, SHA-256
`dba63b248f602402e12aaa09b4a84ecfd32505c19adfc27429deafbe514d2d74`.
Capture completed at `2026-09-10T18:31:50.084480Z` through the unchanged
`npm run sdlc -- snapshot` entry point, with invocation-local `PYTHONUTF8=1`.
No persistent environment, configuration, capture source or prior baseline changed.

The source plan has SHA-256
`68594f4df7bb0144c633054ba1decba5a9540580aff8a1ba974af94de15409b1`.
The approved proposed verification-run schema has SHA-256
`af0ab4a271e938bece719f7502afb729f45c532797a25c2812dfcd4ed3914d28`.
Its future maintained destination is `.sdlc/schemas/verification-run.schema.json`;
the schema is not installed by this baseline-only change.

## Validation and retained capture limitation

The existing accepted-baseline schema and native PR linkage validator accepted the
actual snapshot against the post-capture Issue readback. A deliberately corrupted
Unicode body was rejected. The live Issue remained unchanged during capture.
Issue #25 and its historical baseline files remain unchanged.

The native helper also generated a local `v1.md`. Its Windows newline translation
produced CRLF and doubled the carriage return in the original report's existing
CRLF ending. The raw output is retained unchanged as WP1 evidence, with SHA-256
`f36af1c9ea40105030029ec483cde1d34e8e538968d2bbf4d65fcee42d8c3696`.
It is not part of this commit proposal. This README is the maintained explanation;
the JSON body is the exact accepted-text baseline. No failed raw check is relabeled
as passing, and no generated snapshot is silently rewritten.

Private capture commands, process results, raw readbacks and validation receipts
remain in this task's `.sdlc/runtime/verification/wp1-baseline-preparation/`.
Owner: Max / WP1 implementation task. Retain until baseline review and WP1's
capture-regression consumers finish, then reassess; no automatic deletion.

## Remaining entry gate

This records requirements acceptance and capture, not implementation acceptance.
The baseline-only commit/PR proposal contains only this README and v1.json.
Keep `state:ready-to-baseline` until the authorized protected-base merge and
lifecycle transition. Ordinary R2 implementation requires this JSON baseline
unchanged in the protected base first. Commit, push, PR/merge and implementation
qualification remain distinct actions; no successful CI or repair is claimed here.
