# Proportionate CI for Universal Ontology

**Status:** Draft HISEW change dossier and implementation plan, 6 October 2026.
**Decision owner:** Maksym Shostak.
**Authority:** The request in Codex chat `01a112de-8ac2-7252-8a74-3b9a8d8cbade` to synthesize repository best practice and propose a UO plan.
Planning is authorized; implementation, exact configuration changes, delegation for implementation, scans, workflow dispatches, repository settings, commits, pushes and publication require their applicable separate authority.

Make each CI result answer a specific acceptance question with the least necessary setup and execution.
First narrow UO's broad change scopes and test ownership.
Then reuse successfully executed qualification after demonstrably equivalent integration, using OwlAPI's authenticated evidence model.
Keep expensive build-product reuse conditional on measured benefit.

This extends the [September PR optimization plan](2026-09-29-github-actions-pr-optimization.md), whose central selector, aggregate and product/distribution separation already exist.
It is one proposed change, with independently useful slices, rather than a replacement workflow programme.
The draft requirements, route, design and oracle inventory below must be accepted and captured before implementation; earlier repository approvals are historical context, not approval of these changes.

## Current baseline and useful precedents

The inspected UO checkout is clean at `05d7b73c71345bc0b4fd7917d8a00cfb233ee093` on `main`.
OwlAPI source was inspected at `4f6adbd3a925ad2e0ccfc98550f216642957f870`; its unrelated working-tree documentation edits were preserved.
Refresh source and hosted identities at implementation admission.

OwlAPI's [current main CI](https://github.com/Hadden-Industries/owlapi/actions/runs/37507561056) reports successful verification strategy, installed OWL contract and required aggregate jobs.
The earlier plan files retain proposal-stage language in places; the current code and hosted readback establish the implemented contract above those historical descriptions.

| Repository and source                                                                                                                                                                                                                                                                                                                                                                                              | Proven or currently implemented practice                                                                                                                                                                         | Reuse implication                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UO [September plan](2026-09-29-github-actions-pr-optimization.md), `selectPullRequestChecks.js`, `evaluatePullRequestChecks.js`                                                                                                                                                                                                                                                                                    | Versioned plan, exact checkout identity, conservative unknown-path fallback, complete consumer inventory, internal completion, one stable PR gate; minimal docs/style installs; downloadable packages are opt-in | Extend the existing seams; do not add a competing selector or another required status.                                                                                                                                         |
| OwlAPI [qualification reuse plan](https://github.com/Hadden-Industries/owlapi/blob/4f6adbd3a925ad2e0ccfc98550f216642957f870/docs/plans/2026-09-29-ci-verification-reuse.md), `scripts/ci-verification.mjs` and its command/tests                                                                                                                                                                                   | Ordinary-main qualification can reuse a directly executed, authenticated PR result only after tree, parents, workflow, environment, jobs and retained artifact admission                                         | Adapt its evidence reader and adversarial tests for UO's actual checks and policy. A green head SHA alone is insufficient.                                                                                                     |
| OwlAPI [input-aware plan](https://github.com/Hadden-Industries/owlapi/blob/4f6adbd3a925ad2e0ccfc98550f216642957f870/docs/plans/2026-10-03-ci-input-aware-qualification.md), [ADR 0012](https://github.com/Hadden-Industries/owlapi/blob/4f6adbd3a925ad2e0ccfc98550f216642957f870/docs/adr/0012-gated-native-java-reference-reuse.md)                                                                               | Bounded observation and trusted Java build-product reuse; integration tests remain required. The reported warm/fresh observations did not establish overall latency savings                                      | Reuse build preparation separately from verdicts. Do not claim that OwlAPI proves arbitrary PR test omission or profitable caching.                                                                                            |
| OwlAPI current `ci-qualification.mjs`, `ci-check-coverage.mjs`, `owl-contract-evidence.mjs`, `consumer-source-snapshot.mjs`                                                                                                                                                                                                                                                                                        | `FULL_ONLY`, policy version 4; live Java and installed OWL contract coverage. `CI / installed OWL contract` replaced broad downstream application qualification; source-snapshot changes reject proof reuse      | Borrow native assertion accounting and current-source admission. UO owns its materialization, website and MCP acceptance; OwlAPI owns its public OWL interfaces. Historical WebVOWL receipt formats are superseded.            |
| ONI [proportionate CI plan](https://github.com/MaksymShostak/oxygen-not-included/blob/e192a8775dbc20c2ff6c28ecfb1772087dbdac38/docs/plans/2026-10-06-proportionate-github-actions.md), [delivery record](https://github.com/MaksymShostak/oxygen-not-included/blob/e192a8775dbc20c2ff6c28ecfb1772087dbdac38/docs/reviews/2026-10-06-proportionate-ci-delivery.md), `tools/ci/checks.py`, `tests/test_ci_checks.py` | One selector/gate, consumer-specific setup, mixed-change union, bounded native Git, conservative fallback and actual-workflow mutation tests. A genuine docs-only push exercised the small documentation path    | Reuse classification and hostile-workflow test cases; retain UO's native JavaScript implementation rather than introduce a Python control-plane dependency. ONI's blanket `docs/` boundary is not automatically UO's boundary. |

The HISEW evidence registry corroborates the accepted R2 precedents: UO snapshot `a30d24d0-9ca7-4e3f-923c-e1084dc11608` and execution `4aa3eee1-2336-4cdf-b685-2c4865458b52`; OwlAPI snapshot `b4d42546-f315-4a1e-bc7b-421337d6045c` and execution `9ce6fead-b130-4fff-8971-ac5022c92fb1`; Java continuation execution `0738b74d-12d3-4ea1-87be-b9e8818ea47f`.
Read their canonical handoffs and current policy when reusing evidence: retained `execution.json` status fields alone do not establish current ownership or completion.
These earlier executions are not adopted by this planning task.

### Measured UO example

[PR validation run 37501015791](https://github.com/Hadden-Industries/universal-ontology/actions/runs/37501015791), attempt 1, tested `6c31b42cbbbaf159af71609bff22b95629ddd6d2`.
Its landed [commit](https://github.com/Hadden-Industries/universal-ontology/commit/05d7b73c71345bc0b4fd7917d8a00cfb233ee093) changed only `manual-mcp-packages.yml`, `verifyUniversalOntologyMcpRelease.js` and `manual-mcp-cache-budget.test.js`.

| Executed work                                                                                                       | Observed duration                            | Implication                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node job / its Jest step                                                                                            | 405 / 377 seconds                            | The dominant cost is selected tests, not its 8-second npm install. Profile suite contributions before tuning installs or concurrency.                                |
| Website job / build step, after Node                                                                                | 218 / 197 seconds                            | The current orchestration adds a serial full website build for this control change. Establish the actual contract that requires it before retaining that dependency. |
| Python tests, Linux / Windows                                                                                       | 184 / 269 seconds                            | A global orchestration change selects both suites; Windows spent 47 seconds in development setup and 169 seconds in tests.                                           |
| Active-set ontology qualification, Linux / Windows                                                                  | 87 / 189 seconds                             | Control changes currently widen to expensive semantic qualification even where ontology inputs did not change.                                                       |
| Subsequent [main run 37502641768](https://github.com/Hadden-Industries/universal-ontology/actions/runs/37502641768) | 22 successful jobs, 2,006 summed job-seconds | Main repeated substantial selected work after the PR. This is runner work, not elapsed latency or billing.                                                           |

One run identifies an opportunity, not a representative saving.
Unknown/orchestration paths currently select all core scopes; `product_tests` also broadly includes JavaScript scripts and tests.
`website_build` selects Node first, whose suite includes build fixtures, before the production website build.
Some suites deliberately build isolated fixtures: those are separate behavioral oracles, not duplicates that may simply be deleted.
Ordinary main pushes use the changed-input plan; scheduled and manual full routes select all source scopes.
The workflow's name, `Full qualification`, does not make every main push a full run.

## Proposed risk route

### Risk class:

R2 proposed, consistent with the earlier UO and OwlAPI CI assurance routes.

### Decision owner:

Maksym Shostak owns check meaning, exact configuration approvals and activation.

### Reasoning:

Inference from the inspected gate and release verifier: narrowing mandatory execution or accepting cross-run proof can admit an inadequately qualified change.
Cross-system evidence admission, concurrency/reruns and assurance controls justify R2; no identified R3 consequence applies to this bounded proposal.

### Potential blast radius:

PR/main acceptance, ontology/publication safeguards, MCP release policy readers and maintainers relying on required checks.

### Reversibility:

Retain a fresh conservative path, version the protocol, and disable reuse independently.
An ordinary reviewed forward change can restore broader selection.
Keep failure/provenance evidence; reversal does not undo an already merged inadequately checked change.

### Principal unknowns:

Complete test-input ownership, representative workload, useful reuse hit rate, environmental/external equivalence and rights to transplant exact OwlAPI code.

### Required artifacts:

This compact dossier, accepted protected snapshot, reviewed input/assertion inventory, coordinated protocol changes, consolidated review disposition and focused/affected/final evidence.
Store execution measurements and raw reviews externally; authored contracts and tests belong in the repository.

### Required specialist lenses:

Architecture/correctness and verification of omission controls; scoped security assessment for new cross-run admission; rights/provenance for exact reused code or redistributed build products.
Confirm these obligations at route acceptance; this draft does not dispatch reviewers or scans.

### Required verification:

Focused selector/gate/ownership tests during work, affected native application regressions, and the configured HISEW full profile on the frozen candidate.
Hosted selected/fallback/reuse acceptance remains separate from local success.

### Required human approvals:

Accept the dossier and route; approve each exact configuration batch; authorize any GitHub settings, dispatch, commit/push or publication separately.
Independent enforcement changes and matrix reductions require their own explicit decision.

### Maximum sensible autonomy:

Current authority covers inspection and this draft.
After acceptance, perform authorized reversible implementation and focused checks; no assumption of release, remote publication or unrelated execution ownership.

### Next lifecycle step:

Accept the draft baseline and the first exact configuration proposal, then capture that accepted requirement snapshot and start the applicable owned execution.

## Requirements and acceptance criteria

IDs are local to this draft and remain stable through acceptance.

| Requirement                                      | Acceptance criterion                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 Preserve meaningful assurance            | AC-001: every required consumer and registered native assertion succeeds; missing, duplicate, failed, cancelled, unexpectedly skipped or stale coverage fails the aggregate.                                                                                     |
| REQ-002 Select by actual inputs                  | AC-002: mixed changes select the union; complete native Git includes deletes, boundary-crossing renames and mode/type changes; unknown paths widen coverage. A narrowed control scope must retain the checks that prove that control.                            |
| REQ-003 Acquire only needed tools                | AC-003: docs/style/pure-control/Python-only paths avoid unrelated graphs. A negative missing-tool fixture fails normally, rather than silently skipping its contract.                                                                                            |
| REQ-004 Execute each obligation once             | AC-004: every discovered suite/assertion has one declared canonical owner per required environment; changed imports/fixtures alter selection; new/unregistered suites cannot disappear. Separate fixture and production builds retain separate ownership.        |
| REQ-005 Admit equivalent integration proof       | AC-005: eligible ordinary main integration may reuse only direct original execution with authenticated current run/job/artifact/commit identity, environment and external-input equivalence; every unsupported or unavailable case executes fresh selected work. |
| REQ-006 Separate verdict and build-product reuse | AC-006: restoring a qualified build product never counts as a test pass. Changed output/producer/input identity rejects restoration. Publication still runs its exact-source and output receipt validators.                                                      |
| REQ-007 Report and recover truthfully            | AC-007: summaries distinguish current success, policy-not-applicable, original-execution reuse and fallback; reuse failure cannot hide a selected test failure; independent disablement preserves a conservative route.                                          |
| REQ-008 Prove proportionality                    | AC-008: representative changes show intended consumers absent, required coverage unchanged, and measured setup/execution/transport/queue/storage effects. Keep optimizations only when the saved work justifies their added controls.                            |

### Domain invariants and design decisions

- DEC-001: extend UO's selector, schema and aggregate; preserve required `PR validation` from GitHub Actions application `15368` and its strict update policy.
- DEC-002: narrower same-run selection follows reviewed consumer input contracts.
  Cross-run omission additionally requires original execution proof; path equality alone never means a previous test passed.
- DEC-003: missing push base selects full source coverage; an unverifiable PR identity blocks acceptance.
  Bounded lookup failures select fresh work; behavioral failure remains failure.
- DEC-004: keep current Linux/Windows assurance initially. Later replace duplicate pure semantic execution with an explicit Windows portability subset only after its inventory is accepted; retain complete scheduled/manual coverage.
- DEC-005: optimize routine main integration separately from PR selection.
  Schedules and manual full qualification remain fresh; package, ontology and website publication authority and freshness stay unchanged.
- DEC-006: retain offline ontology catalogs, installed OWLAPI identity, structural/independent-engine oracles, complete active-set policy and generated-full-output receipt semantics.
  Never replace these with an upstream package verdict.
- DEC-007: security analysis uses its own input/language model and cadence.
  This plan does not remove CodeQL or authorize live scans.
- DEC-008: narrow globally widened workflow changes only after actual-workflow mutation tests prove each specific control's execution and admission dependencies.
  Changes to shared selector/schema/aggregate still widen conservatively.
- DEC-009: prefer native Git/Node and existing artifact actions.
  Adapt maintained capabilities; create no second test framework, general CI platform, shim or speculative package split.

### Falsifiable quality scenarios

| Scenario                                                                                                 | Required response                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001 Ordinary authored Markdown only                                                                   | Documentation and small control jobs; no production website, ontology qualification, Python/product matrices or downloadable packages. Policy/oracle Markdown is classified by its readers instead. |
| QA-002 One MCP manual-package control changes                                                            | Its native policy/release-verifier tests and Actions security scope execute; unrelated semantic/build suites are omitted only after reviewed dependency/mutation proof.                             |
| QA-003 Materializer/catalog or ontology source changes                                                   | Closure/full-output, affected query/build/publication contracts and applicable ontology qualification execute, preserving independent expected results.                                             |
| QA-004 A fixture moves across an ownership boundary, a suite is added, or a file changes mode            | Both affected consumers are selected; unregistered/ambiguous cases widen or fail. No loss through extension-only matching or truncated path lists.                                                  |
| QA-005 Required consumer cancelled, suppressed, renamed, or tolerates failure                            | Real workflow mutation is rejected, and the completion gate cannot report success.                                                                                                                  |
| QA-006 Equivalent normal merge versus squash/rebase/multi-commit push                                    | Only the admitted normal merge reuses direct original proof; all unsupported forms execute fresh checks.                                                                                            |
| QA-007 Proof expired/corrupt/foreign, partial rerun, API unavailable or producer changes during transfer | Bounded lookup and mutable readback reject admission and select fresh work. A failed original execution is never reused.                                                                            |
| QA-008 Restored output changes or lacks a complete input/ownership manifest                              | Reject output reuse; build fresh. No publish call can use a stale active-set or generated-full receipt.                                                                                             |
| QA-009 Hosted image, installed dependency or externally resolved source changes                          | Reject equivalence unless an explicitly accepted compatibility model proves it; freshness-dependent checks execute now.                                                                             |
| QA-010 Lookup/storage/maintenance exceeds useful savings                                                 | Stop expanding reuse and retain/restore the cheaper conservative route; preserve observations and required failure evidence.                                                                        |

## Reuse and native capability selection

| Maintained component                                           | Proposed treatment                                                                               | Residual UO work                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UO selector/evaluator/schema generator and policy verifier     | Keep as owners; evolve one coordinated protocol                                                  | Consumer-specific input inventories, merge-parent validation, bounded Git/process reads, fine-grained suite ownership and completion evidence.              |
| ONI selector and actual-workflow rejection fixtures            | Translate proven cases into existing UO Git/Jest/policy-mutation tests                           | UO paths, oracle documents, internal matrices and Node-native bounded I/O. Do not copy its Python selector wholesale.                                       |
| OwlAPI `ci-verification.mjs`, command reader and tests         | Adapt the tested bounded transport, exact integration admission and direct-original lineage      | Replace OwlAPI job/package constants with UO inventories and exact receipts; handle current external inputs and UO's existing policy reader.                |
| OwlAPI `ci-check-coverage.mjs` and `owl-contract-evidence.mjs` | Reuse native-result accounting concepts and appropriate reusable functions                       | Register UO-specific native assertions; do not copy Java's 23-assertion inventory as UO coverage.                                                           |
| OwlAPI Java reference reuse modules                            | Treat as a later protocol reference                                                              | UO consumes verified Jena distribution bytes already; it does not compile OwlAPI's Java reference in normal CI. No direct Java-bundle adoption is proposed. |
| UO documentation/style tool extraction                         | Preserve current lean installs                                                                   | Shared newer tooling adoption may be coordinated separately; CI selection need not wait for a formatter migration.                                          |
| GitHub native artifact and REST facilities                     | Use existing pinned official actions, immutable IDs/digests, run attempts and native inventories | Repository-specific admission and failure policy, with bounded reads and transport.                                                                         |

OwlAPI's root licence is AGPL-3.0, while UO's package manifest declares MIT.
Establish exact file copyright/licence and owner-approved reuse terms before transplanting implementation; common ownership alone is not recorded clearance.
Use existing licensed code where cleared and retain notices, or obtain an explicit owner disposition.
Do not reimplement a restricted capability just to bypass its terms.
No source has been copied by this plan.

The checked native contracts support job-level selection, same-commit reusable workflows, run-attempt readback and exact artifact transport.
GitHub treats skipped jobs as successful statuses, so UO must retain its explicit aggregate accounting rather than infer executed coverage from a green badge.
See [status checks](https://docs.github.com/en/pull-requests/reference/status-checks), [reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs) and [artifacts](https://docs.github.com/en/rest/actions/artifacts).
Preserve least privilege and prohibit privileged consumption of PR-controlled executable content; see [secure workflow use](https://docs.github.com/en/actions/reference/security/secure-use).
Implementation research must verify the latest stable/applicable LTS identities and exact selected action/runtime pins before an approved upgrade; this plan proposes no version changes.

## Implementation slices and proof

### SLICE-001 Establish the input and obligation inventory

Trace scripts, tests, fixtures, policy documents and runtime consumers into a compact checked inventory.
Profile native Jest durations and count fixture versus production builds in the measured control-change case.
Exercise proposed selection in observation mode while retaining current work.
Do not introduce another hosted selector job just to collect diagnostics.

Likely seams: existing selector/schema generator, `tests/pr-check-scopes.test.js`, distribution policy tests and native Jest result capture.
Capture representative docs, fixture, ontology, query, frontend, Python/tooling, dependency and control changes through complete Git histories.
Prove suite discovery equals the declared ownership union with no duplicate canonical owners; do not derive expected semantic results from the candidate itself.
Output the exact smallest activation batch and its input/oracle evidence.

### SLICE-002 Activate bounded same-run selection and lean setup

Deliver one complete case first: a local MCP package-control change runs its affected native policy tests without full unrelated application/ontology suites.
Then extend the same input contracts to pure Python, build fixtures, import closure, query, frontend and MCP families.
Preserve mixed-change union, conservative unknowns and global widening for shared admission controls.
Keep suite ownership inside the existing Node/development consumers where practical; add a runner only when independent execution materially improves feedback.

The Python suite contains real Skills CLI and setup dependencies.
Separate pure Python policy/utility tests from Node-backed setup acceptance before removing `npm ci` from that consumer.
The pure subset uses hash-locked `.venv` installation and `pip check`; setup acceptance still exercises actual `set-up:development` on supported platforms.
No missing tool may turn required tests into silent skips.

Likely seams: selector/evaluator, reusable development/ontology/distribution workflows, Node worker test entry points and exact native suite accounting.
Mutation tests must reject missing gate dependencies, suppressed selected consumers, weakened cancellation/failure handling, forged revision, altered matrix inventory and narrow control rules without their verifier.
Keep fixture build failure/recovery oracles and the real production build separately selectable.
Changing the serial Node-before-website relationship requires evidence of independent inputs and reliable gate behavior, not simply faster parallel YAML.

### SLICE-003 Retain and reuse exact PR qualification on ordinary main integration

Emit a versioned qualification record only after the complete selected PR plan and native assertions succeed.
The record states exactly what was executed and what the accepted input policy excluded; it must not label selected coverage as FULL.
Bind repository, event, tested tree/parents, workflow/control identities, job IDs/names/producing attempts, environment, dependency/input identities, assertions and any retained candidate outputs.

Adapt OwlAPI's bounded native reader and direct-original lineage.
For one ordinary two-parent main merge, independently authenticate PR association, captured base/head, tested and landed tree equivalence, accepted policy, latest native job inventory, attempts, retained immutable artifacts and current environment/external inputs.
Current source lookups used by any checker must be re-admitted, as OwlAPI now does for consumer-source snapshots.
Never follow recursive reused-proof chains or search history for a convenient success.
Unavailable proof, unsupported protocol, forks outside the admitted producer policy, direct/squash/rebase/multiple merges or any mismatch execute fresh selected checks.

Only a validated integration receipt may permit the aggregate's expected reused consumers to be skipped.
All other unexpected skips/failures still fail.
Bound lookups using the OwlAPI starting limits of 32 requests, 60 seconds total, 10 seconds per request and 2 MiB JSON bodies, with closed bounded record/archive inventories; adjust only through measured, accepted changes.
Use exact-ID official download and digest rejection, then independently recheck mutable native identity after transfer.
Grant `actions: read` only to jobs needing that read; never attach secrets or writable tokens to PR execution.

Version writers, readers, graph verifier and admission tests together; old records fall back, with no coercion or backfill.
First deploy receipt production with fresh main behavior, then activate read/admission in a separately approved batch and verify an actual normal merge plus fallback cases.
Publication and scheduled/manual full qualification never accept this record as their freshness receipt.

### SLICE-004 Evaluate same-run build handoff before cross-run products

Measure whether tests or consumers actually repeat the same build with identical inputs.
If justified, hand off one closed same-run website/MCP application candidate to its validators using exact artifact identity and UO's existing output manifests.
Independent fixture builds remain independent.
Never reuse a test-produced fixture tree as the production tree.

Retain active-set and generated-full validation at their existing admission boundaries.
A restore cannot repair a partial build, stale receipt, changed catalog/OWLAPI/environment or unowned output.
Cross-run build-product reuse is a later gated option only if same-run transfer savings, complete causal inputs, hostile-archive validation, redistribution rights and bounded storage costs are demonstrated.
Neither `node_modules` nor `.venv` restoration is the proposed acceptance mechanism.

### SLICE-005 Qualify operation and hand off

Freeze a consolidated candidate; perform one broad architecture/correctness review and scoped security assessment where the accepted route requires it, with bounded material follow-ups.
Run final HISEW verification and retain supplemental native/hosted observations separately.
Compare representative scenarios with the baseline: selected obligation counts, time to required-green, summed job-seconds by platform, setup/test/build/transport/queue time, fallback reasons, artifact generation/retention/storage and maintenance surface.
Keep runner minutes separate from wall-clock latency and actual billing.

Document observed fresh/reused/fallback outcomes and any genuine-change scenarios still pending.
A local fixture cannot establish hosted fork permissions, artifact transfer, native matrix completion or rerun behavior.
The owner accepts operating benefit and any later portability subset; avoid an open-ended trial or automatic cleanup campaign.

### Traceability and ordering

| Slice     | Requirements and decisions                                  | Proof                                                                                                                       | Rollout and cleanup implication                                                                  |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| SLICE-001 | REQ/AC-001,002,004,008; QA-001–005; DEC-001,002,008         | Native ownership inventory and observation on complete Git cases                                                            | No omission yet; keep diagnostic evidence externally.                                            |
| SLICE-002 | REQ/AC-001–004,007,008; QA-001–005,009; DEC-001–004,006–009 | Actual selector CLI, discovered assertion coverage, workflow mutants and genuine hosted selected paths                      | First useful reduction; retain full fallback and current platform floor.                         |
| SLICE-003 | REQ/AC-001,005,007,008; QA-005–007,009,010; DEC-001–003,005 | Authenticated native-shaped service fixtures, real Git histories, hostile records and hosted normal-merge/fallback readback | Reuse switch independent; unsupported/expired evidence executes fresh; no receipt backfill.      |
| SLICE-004 | REQ/AC-001,006–008; QA-003,008–010; DEC-005,006,009         | Candidate/manifest corruption and input-change probes; comparable build/transfer measurements                               | Optional only when useful; retain failed candidate evidence and remove only owned spent scratch. |
| SLICE-005 | All accepted criteria                                       | Consolidated review, final full profile and bounded hosted evidence                                                         | Operating handoff distinguishes implemented, activated and observed states.                      |

The implementing task owns integration across shared selection/accounting/receipt semantics.
Slices 001 and 002 precede selective activation; 003 can follow once the selected coverage contract is stable; 004 is optional and can be declined independently.
Research on rights and measurements can proceed independently, but this plan grants no parallel-agent authority and avoids concurrent writes to coupled controls.

## Exact configuration approval map

These are proposed seams, not approved edits.
For each slice, present the concrete diff and smallest exact setting batch before editing configuration.

| File or setting                                                    | Smallest proposed change and pipeline impact                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/pr-validation.yml`                              | Select declared native suite families and expose coverage; later upload an exact PR record. Keep unconditional PR events and stable gate.                                                        |
| `.github/workflows/full-qualification.yml`                         | Keep fresh schedules/manual full mode; later add bounded ordinary-main strategy and authenticated aggregate admission. Permission changes are limited to explicitly identified read/upload jobs. |
| `.github/workflows/development-checks.yml`                         | Split pure Python execution from real setup contracts and remove unrelated installation only from the proven pure path; retain current platform floor.                                           |
| `.github/workflows/ontology-validation.yml`                        | Consume narrower accepted scope/accounting without changing the complete active-set/two-engine contract.                                                                                         |
| `.github/workflows/verify-universal-ontology-mcp-distribution.yml` | Execute affected source/application/docs contracts; later consume exact same-run application output only if qualified. Downloadable-package policy remains opt-in.                               |
| `scripts/pullRequestCheckPlan.schema.json`                         | Add reviewed native test-family/coverage fields; coordinate generated validator and every consumer. Regenerate from source, never hand-edit generated code.                                      |
| `package.json`                                                     | Only if needed, add exact focused npm entry points delegating to the accepted suite runner; no dependency/lock/version change is implied.                                                        |
| `.github/workflows/codeql.yml`                                     | Only if a selected change requires coordinated language/control inputs; retain its separate security meaning and cadence.                                                                        |
| External HISEW project registration                                | Optional exact command/input declarations for relevant profiles after an owner-approved proposal. Do not alter profiles simply to lower assurance or mask failures.                              |

`selectPullRequestChecks.js`, evaluator and tests implement repository policy even where their extension is source code; submit exact policy changes for approval too.
`verifyUniversalOntologyMcpRelease.js` currently seals twelve reviewed control files and rejects changed graphs.
Update its reviewed identities only after coordinated graph review and rejection tests; hashes cannot be learned automatically from the candidate to authorize itself.
No change to `jest.config.js`, lockfiles, action/runtime pins, repository rulesets, `MCP_PACKAGE_CI_ENABLED`, manual-package/publication permissions or distribution release inputs is proposed implicitly.

Live UO ruleset `22485773` currently requires strict `PR validation`, zero ordinary approving reviews and no bypass actors.
Candidate YAML and candidate tests do not independently enforce themselves merely because the verifier seals their bytes.
Before expanding omission authority, the owner must explicitly accept the current trust model or separately approve stronger independent enforcement; do not import OwlAPI's previously declined enforcement proposal as UO approval.
Receipts authenticate what executed, not the adequacy of a self-modified policy.

## Verification cadence and HISEW handoff

Personal applicability is active; current status reports no work in progress for this worktree.
The configured profiles are `focused` → `test:unit`, `affected` → `test:consumer`, and `full` → `check:qualification`.
Inspection reports undeclared coverage/input semantics, so the profile labels alone do not establish CI-control coverage or mutation ordering.
Add the specific selector, ownership, distribution policy and receipt tests as supplemental proof; obtain exact profile approval if canonical declarations need amendment.

Use current session ownership and accepted context, not an earlier chat's execution.
Capture the accepted dossier through HISEW, select the route, recheck applicability before engine mutations, and retain the required profiles/reviews under that execution.
Use focused npm entry points while iterating and one final route-selected assurance pass after freezing the candidate; repeat only for changed inputs, failures or concrete proof gaps.
Python executes through the existing `.venv`; no environment installation is authorized by this draft.

New measurements, native reports and review evidence belong under the configured external evidence root `C:/Users/maksy/.hi/w/e`, rediscovered before the first new execution artifact.
Product manifests, accepted protocol specifications, tests and authored guides remain in the repository.
Keep failed reports and retained artifacts until their consumers/recovery decisions finish; remove only task-created disposable scratch after those consumers are done.

## Activation, recovery and replanning

First accept the requirements, input/oracle inventory and exact initial configuration batch.
Activate narrow same-run selection with the conservative fallback intact, then separately admit routine-main reuse.
No new database, source backfill or ontology migration is needed; evidence format changes are coordinated version changes whose old inputs select fresh work.
Interrupted production never emits a success record; partially rerun consumers retain exact producing attempts and must match the complete latest native inventory.

The owner or implementing task observes required-green time, coverage inventories, fallback reasons, storage and failure rates during bounded hosted qualification.
Disable proof reuse independently on integrity, admission or disproportionate overhead; restore broader selected scopes through ordinary reviewed changes if ownership is uncertain.
Preserve non-PR concurrency behavior, existing artifact holds and original retention decisions.
Do not discard work or delete evidence merely because an optimization did not help.

Replan when new suites/consumers or executable policy documents alter input cones, supported platforms or public interfaces change, the package/release verifier gains a dependency, external source freshness changes, shared-tool licence clearance fails, hosted read/transfer limits prove unsuitable, or measured benefit cannot justify maintenance.
The higher outcome is faster trustworthy engineering feedback: an optimization that makes the evidence harder to audit or maintain needs reassessment even if it reduces one job's duration.

Implementation completion requires native and hosted evidence for the activated paths, preserved publication safeguards, truthful remaining proof gaps and an accountable operating handoff.
It does not by itself mean package, website, registry or consumer release acceptance.
