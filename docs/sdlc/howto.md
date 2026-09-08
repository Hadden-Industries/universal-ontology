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
