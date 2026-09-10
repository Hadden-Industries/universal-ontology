# Universal Ontology SDLC

Version and repository deployment status are recorded in
[PACKAGE_STATUS.json](../../.sdlc/PACKAGE_STATUS.json). Read the
[adoption record](adoption.md) for accepted host scope, evidence and upstream
limitations. This repository is the first test bed.

## Start and scope

Use the accepted user task, existing Issue or normal PR brief. Select R0 for
small reversible maintenance, R1 for bounded engineering work, and R2/R3 for
elevated assurance. Apply [engineering principles](engineering-principles.md).
All six local skills are available: sdlc-route, motivation-to-evidence,
quality-attribute-scenarios, thin-implementation-plan, test-driven-development,
and release-readiness. Select only those the task needs. The adapted TDD skill
owns implementation; the other skills do not impose six sequential ceremonies.

R0/R1 need no artificial Issue or separate baseline. For normal R2/R3 work, capture
an actually accepted Issue version and merge that baseline before implementation.
The owner-approved bootstrap is handled under the pre-existing repository
configuration rule; it does not fabricate a baseline for itself.

## Independent executions and integration

Use a separate physical Git worktree for each independent implementation.
One checkout has one active execution, including while that execution is paused.
Separate logical files within a shared checkout do not isolate its Git index,
active task or verification records. Coordinated work within one execution is
still one execution; this does not prohibit ordinary subordinate test processes.

In the existing task or PR record, identify the implementation owner, accepted
intent/baseline, actual worktree, branch or detached HEAD, current candidate and
owned change scope. For a dirty candidate, retain the relevant input identity as
well as HEAD. Use native Git path resolution; do not infer per-worktree paths
from a directory name. Keep sensitive locators in the approved restricted record.
No new task database or active-state metadata migration is required.

Before relying on another execution, record material shared contracts, dependencies,
shared mutable resources and the integration owner. Prefer native isolation for
mutable environments, outputs and endpoints. Separate worktrees do not isolate
ordinary Git refs/configuration or every external resource. Coordinate the actual
shared mutations; do not pause unrelated work merely because another task is active.

At integration, record the actual input revisions and combined target, resolve
semantic overlap as well as textual conflicts, and run the affected consumer
checks and required final profile on that target. Preserve prior evidence with its
original branch-local scope. A clean merge is not an integration verdict.
Changed controls or accepted requirements require their actual owner decision;
do not edit old digests or refresh a baseline merely to restore passing status.

A source-only change within unchanged scope normally needs fresh verification,
not a new task. The existing pause/resume operations can re-establish an explicitly
authorized same-scope execution against accepted current controls. They do not
accept new requirements or arbitrarily replace a task's baseline. If the required
transition is unsupported, retain the incomplete record and expose the concrete
decision rather than deleting state or inventing a reroute command.

A pause must identify an unmet dependency, required unavailable capability, decision
or separate authorization. Retain consumers and resource-disposition references
in the existing handoff; initial task creation or implementation handoff does not
authorize worktree removal, merge, deployment or publication.

## Development entry points

Run the selected Node/Python versions in the root version files and npm declared
in package.json. Use the existing development entry point:

```sh
npm run setup:development
npm run check:sdlc
```

Setup uses npm's lock, installs Python dependencies into .venv, merges the Codex
policy through the existing configuration transaction, and activates local skills
only. It preserves the existing MCP blocks, unrelated skills and Git hooks. It
does not refresh external skills, install an MCP server, grant trust, install a
plugin, change GitHub, run a scan or publish the product.

| Command | Effect |
|---|---|
| `npm run setup:sdlc` | Merge the approved .codex files and activate six local skills. |
| `npm run setup:skills` | Activate local Codex skills; preserve external activation and lock entries. |
| `npm run setup:mcp -- --help` | Inspect the existing MCP installer options before choosing its installation/network actions. |
| `npm run check:sdlc` | Compare generated Codex files; does not prove host loading or trust. |
| `npm run test:sdlc` | Exercise control fixtures, not a model or live security guard. |
| `npm run test:python` | Existing Python repository tests. |
| `npm run setup:sdlc:github` | Explicit remote action: create/update the 14 labels declared in the helper. Never run as part of setup. |
| `npm run sdlc -- --help` | Inspect lifecycle commands and their required arguments. |

External skill refresh uses the installed, pinned native Skills CLI. The existing
external declarations include moving or missing refs. Refresh refuses those until
an exact lock change is reviewed; local activation does not rewrite them.
Standalone skills remain usable. Global discovery is not modified.

## Record evidence

For an accepted small maintenance task, replace the example name and task reference:

```sh
npm run sdlc -- begin correct-help --risk R0 --intent-reference accepted-task-reference --purpose "Make help describe existing behavior" --no-new-functionality
npm run sdlc -- verify
```

New functionality requires `--new-functionality` and a completed
`--software-selection-reference`; a reference's presence does not prove research
quality. R2/R3 require `--baseline docs/sdlc/baselines/issue-N/vN.json`.
Use `snapshot --help` for capture arguments. Capture reads GitHub and writes
a new local baseline; it does not approve it.

Profiles in [.sdlc/verification.json](../../.sdlc/verification.json) are repository
configuration. Focused checks cover whitespace and generated configuration; they
are a minimum floor, not a product correctness verdict. Run the actual changed
behavior's tests and record their independent oracle in the task/PR. The affected
profile runs the JavaScript, Python and SDLC suites. Full additionally runs lint,
format checks, the five source ontology invariant checks, a direct Vite build,
JSON-LD generation and the MCP application bundle.

Build/generation write ignored dist outputs. The direct
`node node_modules/vite/bin/vite.js build` avoids the root prebuild auto-fixes.
The existing `npm run build` still invokes them. Deployment scripts access AWS
and remain outside verification. MCP distribution tests cover protocol/bundle
contracts; release publishing, signing identities, registry access and hosted
services require their actual independent evidence.

Source/config changes invalidate recorded success. The Stop hook asks for missing
evidence and permits an honest incomplete handoff instead of looping indefinitely.
Use the helper's explicit pause/resume/handoff commands; never remove state to
make the hook pass. Local records under .sdlc/runtime are mutable local evidence,
not attested approvals. Preserve necessary evidence before temporary cleanup.

The repository launcher selects Python UTF-8 mode while preserving an explicit
caller `PYTHONIOENCODING`. Human diagnostics escape unsupported console glyphs;
Issue JSON and command evidence are decoded strictly as UTF-8. Snapshot capture
preserves the Issue body's Unicode and line endings without repairing old text.

Each verification attempt first replaces its current profile receipt with a
non-passing pending record. Version 3 receipts live at
`.sdlc/runtime/runs/<taskId>/<runId>.json`, with an identical current copy at
`.sdlc/runtime/verification/<profile>.json`. Command bytes are retained alongside
the run in `<runId>/commands/0001.output.bin` and subsequent ordinal files.
Results and raw bytes are checkpointed before decoding or console presentation.
The gate requires matching receipts, current inputs, the exact configured checks,
and complete captured, decoded and presented successful results. Historical
version 2 receipts remain historical evidence; run fresh verification to qualify.

Use one coordinated verifier per checkout. After an interrupted attempt, confirm
that its producers have stopped before retrying; the next attempt gets a new ID.
`--keep-going` continues ordinary check failures, not broken recording or reporting.
A timeout stops the direct child; it does not prove every descendant has stopped.
If the first pending receipt cannot be written, no check runs, but an older receipt
may remain on disk. Retain that recording blocker and run a fresh attempt after
restoring storage; do not use the old receipt to claim that attempt passed.
Local atomic replacement is not a power-loss backup or an authenticated ledger.

### Competing or interrupted task starts

Initial task publication is exclusive within the physical checkout. An occupied
or paused task is not overwritten. Inspect the reported established task before
continuing; independent work belongs in its own authorized worktree. A command's
nonzero exit does not prove that no task was created: publication can succeed
before a later output or private-temporary-name cleanup failure.

The complete active record is the ownership marker. A preparation file that was
never published is not an active lease. Preserve relevant failed-start material
and inspect the actual state; do not automatically publish an old candidate,
retry a collision, or take over using elapsed time or a process identifier.
Existing empty, malformed or unsupported active state requires an explicit
state decision and must not be treated as idle or cleared to bypass verification.

The implementation's private staging name may temporarily refer to the same file
as the published active record. It is not an independent backup and must never
be edited. If its supported cleanup is blocked, retain its exact location and
escalate under the temporary-artifact policy; do not remove active ownership.
An unsupported publication capability remains an explicit setup/design decision,
not permission to substitute a weaker copy or replacement operation.

## Resource disposition after implementation handoff

Use [the temporary-artefact procedure](temporary-artefacts-howto.md) when task-owned
resources survive a handoff. The coordinator records the owner or explicit hold,
remaining consumers, preserved evidence, next actor and reassessment event in the
existing task/handoff channel. The actual preservation copy must outlive the
resource being considered. Routine scratch removed in its creating task requires
no additional resource record.

The metadata-only command is
`npm run sdlc -- record-resource-disposition --input <contained-json-file>`.
It writes a new disposition record under the coordinator's existing handoff
store; it does not begin a new implementation, modify the active pointer, change
verification evidence, approve disposal or execute a recorded command. Its input
and stored format use `.sdlc/schemas/resource-disposition.schema.json`.

`npm run sdlc -- status` returns the documented versioned JSON envelope with the
active task and retained resource obligations, including when no active task
exists. This replaces the earlier flat active-task output; consumers must use
the `active` field and explicit read state. Machine consumers use the silent npm
form or direct existing Node entry so launcher messages are not mistaken for
JSON. A complete status read can still show
retention or operator work. A partial read is not evidence of an empty resource
set, and a successful status command is not a verification or release verdict.

Keep the native `handoff` evidence reference linked to the actual retained task
summary and resource decisions. Do not remove active state manually to suppress a
hook, and do not keep it artificially active merely to remember a cleanup
obligation. Existing verification freshness and bounded Stop behavior are
unchanged. A recorded eligibility assessment is not permission to delete;
follow the existing native Git/operator procedure after fresh inspection.

## Evaluation through useful work

The owner declined replaying historical changes or inventing features for a pilot.
Use upcoming real tasks and existing PRs. A Python-to-JavaScript refactor is a
candidate only if actual contract/integration research justifies the total cost;
npm entry points already work with Python controls.

When the method helps or obstructs a task, record the task/revision, intended
outcome, independent oracle, defects/missed requirements, unnecessary shims or
custom code, human corrections, process time and actual result. Keep failures.
Compare with a genuinely comparable earlier task only when one exists; do not
invent a baseline, trial count or causal benefit. This bootstrap's observed
failures and checks are recorded in [verification](verification.md).

Keep existing safety controls in every comparison. Live Codex skill selection,
instruction compliance, role behavior and native hook trust need actual host
observations; no subagents or paid scans were used to simulate adoption.
