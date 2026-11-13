# GitHub Python setup migration plan

Date: 2026-11-13.

## Direction and evidence

Replace the hosted Python provider with the latest stable `actions/setup-python` while retaining the shared composite action and repository-owned Python selection.
The user requested the migration, HISEW planning and the latest dependency version.
The user approved the exact configuration change and requested verification against the other local repositories' DRY Python declarations and `.venv` setups.
That approval accepts this R1 plan for local implementation, verification, review and a signed commit; publication remains separately authorized.

Read-only inspection found a clean working tree at `7588ab73c252897b34a406a1c82389eba0faa2f2` before creating this plan.
HISEW `inspect-project-applicability` returned `personal` and `active: true` for this worktree.
`inspect-workflow-progress` identified a completed, committed handoff for a different task; it supplies no risk acceptance or execution authority for this migration.
Use a new execution after acceptance rather than adopting that task.

Commit `e4c0d19fc095ec655a3a2b95a6710ca9513832da`, dated 2026-10-10, explicitly records that GitHub's Python manifest lacked stable Python 3.15.0 and that uv restored Linux and Windows provisioning.
Commit `dd03bd87459b45fe8904d30dabbc06dd72085b94` later selected Python 3.15.2 through `.python-version`.

Upstream inspection on 2026-11-13 established:

- [The latest stable setup-python release](https://github.com/actions/setup-python/releases/tag/v7.1.0) is v7.1.0, commit `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`.
- [GitHub's Python manifest](https://raw.githubusercontent.com/actions/python-versions/main/versions-manifest.json) lists stable 3.15.2 with x64 assets for Linux 26.04 and Windows, matching this repository's Python jobs on `ubuntu-26.04` and `windows-2025`.
- [The selected action contract](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/action.yml) supports `python-version-file`, adds Python to the job environment by default, disables dependency caching unless selected, and runs under Node 24.
- [The selected artifact's MIT licence](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/LICENSE) permits this use as a hosted CI dependency. No action source is copied into this repository; upstream retains its licence notice. Repository configuration acceptance remains separate.

The original reason for using uv is resolved by the available interpreter assets.
Retaining uv remains technically possible, but supplies no required capability missing from setup-python for these callers.
Use the native version-file input directly, with no custom version parser, fallback provider or compatibility shim.
This establishes technical selection and source-level fit, not successful execution on a GitHub runner.

## Risk route

Risk class: R1, accepted with the approved plan.

Decision owner: The requesting repository owner.

Reasoning: Inspection shows a bounded CI provider substitution behind one existing composite. A failed download or interpreter selection stops checks before product tests; no persistent data, public API, authentication policy or deployed runtime changes are proposed. Ordinary engineering risk is an inference from those boundaries.

Potential blast radius: Python provisioning in six development-check jobs and three ontology-validation jobs, including their Linux and Windows matrix instances.

Reversibility: Reverse the specific action, test and documentation edits, or create a normal follow-up commit restoring them after incorporation. Preserve unrelated working-tree changes and do not reset or rewrite history.

Principal unknowns: Actual hosted installation, pip bootstrap and dependency installation with the selected provider remain unverified. Asset availability is observed; runner success is not.

Required artifacts: This compact plan and the eventual reviewed diff, verification evidence and signed local commit. No separate specification, Issue or release campaign is needed.

Required specialist lenses: Ordinary review of provisioning, version ownership, immutable pinning and unchanged workflow conditions. No new credential, permission or data boundary is intended; reconsider that assessment if implementation changes one.

Required verification: Focused workflow and selector checks during editing; the configured R1 affected profile and ordinary review for the frozen candidate. Hosted evidence must be reported separately from local checks.

Required human approvals: The user approved the exact composite configuration below under `AGENTS.md`. A push or hosted dispatch requires its own authorization. Existing instructions authorize a signed local commit of completed task changes.

Maximum sensible autonomy: Implement, verify, review and commit locally within the approved scope.

Next lifecycle step: Complete SLICE-001 under execution `0f4c812b-f21b-41bc-a3c8-568428c182b1`, started after rechecking applicability with the accepted brief and R1 route.

## Cross-repository verification

Read-only inspection on 2026-11-13 compared the actual local owners and consumers:

| Repository | Version ownership and hosted consumption | Virtual environment ownership |
| ---------- | ---------------------------------------- | ----------------------------- |
| JSON Quality | `.python-version` is read directly by `.github/actions/setup-producer/action.yml` through setup-python v7.1.0 at the same SHA selected here. | The inspected producer action supplies an interpreter without activating another virtual environment; its consumers own later setup. |
| Markdown Quality | `scripts/python-target.js` reads `.python-version`; the shared setup action resolves it before uv provisioning. | `repositoryPython()` requires the explicitly activated hosted environment or the repository `.venv`; it rejects a missing interpreter. |
| Software Engineering Workflow | `packaging/managed-python.json` owns the selected Python; `scripts/python-target.js` reads that owner. Its `.python-version` is a projection, not another editable authority. | `scripts/set-up-development-environment.js` preserves and probes an existing `.venv`; uv synchronizes the locked environment from the selected interpreter. |
| Google | `scripts/python_target.py` reads `.python-version` and derives native Python settings; workflow outputs supply the selected interpreter. | The Photos workflow performs `uv sync --locked --all-extras --all-groups`; dependency setup belongs to the project rather than setup-python. |

The shared practice is one owning version declaration, derived consumers and explicitly owned dependency environments; the provider and lock installer differ by repository.
Universal Ontology already follows that practice through `.python-version`, `scripts/pythonTarget.js`, `scripts/setUpDevelopmentEnvironment.js` and `scripts/runRepositoryPython.js`.
Its local setup preserves an existing `.venv`, refuses an unusable one and installs the hash-locked graph into that environment; the runtime runner refuses global-Python fallback.
The approved native `python-version-file` input removes implicit provider discovery without duplicating the selected version, and existing CI `.venv` creation remains at its current caller boundary.
No peer repository needs editing for this migration.

## SLICE-001: Replace the provider through its existing owner

REQ-01: Hosted jobs select exactly `.python-version`, currently 3.15.2, through one shared native provider declaration.
REQ-02: Adopt the latest stable setup-python release identified above with a full commit pin.
REQ-03: Preserve caller conditions, runner selection and hash-locked dependency installation into the repository `.venv`.

The exact configuration proposal is confined to `.github/actions/setup-python/action.yml`:

- Set the provider's `uses` to `actions/setup-python@6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`, with the version comment `v7.1.0`.
- Replace uv-specific inputs with `python-version-file: .python-version`.
- Leave dependency caching unselected, using the action's disabled default.
- Update the description to describe hosted Python provisioning accurately; the composite will no longer create or activate a temporary uv environment.

Pipeline effect: setup-python supplies the job interpreter from GitHub's tool cache or downloads; the existing callers still create `.venv` and install their existing locked requirements through pip.
The temporary `${{ runner.temp }}/python` environment is intentionally removed because those callers already own dependency isolation.
The agent-skills lock job continues using its existing `python -I -B` invocation.
Do not add global dependency installation to compensate for the removed environment.

Predicted accompanying edits:

- `tests/development-workflow.test.js`: adapt the existing shared-provider assertion to the native input and SHA pin; update the uv-specific test descriptions. Retain coverage for one shared provisioning call per job and the conditional ontology setup.
- `docs/development.md`: describe the selected provider, version ownership, disabled dependency cache and repository `.venv` accurately, including the shared-declarations table.

No changes are proposed to the consuming workflow files, `.python-version`, dependency requirements or locks, package scripts, runner policy, permissions or release controls.
The existing PR selector treats `.github/actions/` edits as orchestration changes and already selects broader checks; retain that behavior.
The existing composite remains the provider-setting owner and workflows remain consumers, so no duplicated provider or Python version declarations are needed.

## Proof, delivery and reconsideration

SLICE-001 maps REQ-01 through REQ-03 to the following proof:

1. Run the existing focused checks through `npm test -- --runInBand tests/development-workflow.test.js tests/pr-check-scopes.test.js tests/set-up-development-environment.test.js tests/run-repository-python.test.js`. These check the composite contract, orchestration selection, caller conditions and preserved setup semantics. They do not execute GitHub's action.
2. Check changed JavaScript formatting with the existing `format:node:check` entry point, JavaScript lint with `lint:js`, and prose with `check:markdown`. Inspect any YAML formatting using existing installed tooling; do not add or change formatting configuration.
3. Prepare a stable diff, use the configured R1 affected verification profile, and obtain the configured ordinary review. Verify the final target and record actual failures, skips and coverage limits. Do not install tools or change reviewer/workflow settings implicitly.
4. After separately authorized publication, observe the existing Python-consuming jobs on both Linux and Windows: the exact interpreter resolves, repository `.venv` creation succeeds, and existing locked installs and checks execute. The repository owner or receiving coordinator observes those runs. Preserve failed logs. Without that authorization, deliver the signed local commit with hosted verification explicitly outstanding.

Independent oracles are the selected upstream action contract, GitHub's version manifest, `.python-version` and the accepted existing workflow conditions and lock-install commands.
Do not relax the Python pin, enable prereleases or replace locked dependency installation merely to make a check pass.

There is no data migration or backfill.
No new scratch directory or retained downloaded artifact is needed for this plan; ordinary runner-owned tool-cache and temporary cleanup remain with GitHub Actions.
The implementer owns the coherent action/test/documentation change and local evidence; the repository owner approves configuration and any publication.

Reconsider the affected decision if the selected release changes before implementation, a required runner asset disappears, runner admission fails, a caller depends on uv's temporary environment, permissions would need changing, or the provider breaks locked dependency installation.
Diagnose a concrete failure before choosing a different provider or expanding configuration scope.
If local proof passes but hosted proof is unavailable, retain that proof gap instead of claiming the migration is hosted-qualified.
