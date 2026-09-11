# WP2 — Prove and harden independent worktree execution

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Detailed implementation plan · 10 September 2026**

**Parent:** `../implementation-plan.md`, WP2; parent acceptance criteria A03–A06.  
**Repository:** `Hadden-Industries/universal-ontology`.  
**Maintained requirements/acceptance authority:** Issue #33, `SDLC-PARALLEL-01`.  
**Priority:** P1. **Proposed implementation route:** R2, as proposed in Issue #33, subject to actual acceptance.  
**Accountable decision owner:** Max. **Implementation owner:** the assigned SDLC maintainer. **Combined-product evidence owner:** the named MCP/SHACL integration owner.  
**Status:** researched implementation proposal. No repository repair, configuration approval, accepted baseline, host adoption or completed product integration is claimed.

## 1. Objective and completion boundary

Deliver the parent's bounded change: make competing native task starts in one checkout establish exactly one execution; demonstrate lifecycle/evidence isolation in actual linked Git worktrees; make material cross-worktree ownership and dependencies discoverable in existing records; and require fresh evidence for the actual combined product. Keep independent implementation in separate worktrees. There is no later shared-checkout multiwriter stage. [P1, R01]

| Parent criterion | Required result | WP2 evidence boundary |
|---|---|---|
| A03 — competing task starts | Deterministically overlapping valid starts produce one successful start and one actionable nonzero rejection identifying the established task. | Real child processes invoking the actual CLI parser/lifecycle functions, controlled at the relevant boundary; actual state and results inspected. |
| A04 — interrupted acquisition | Established or incomplete ownership is preserved and visible; no time-based automatic takeover. | Pre-/post-publication interruption tests, pre-existing malformed-state rejection, phase-specific recovery guidance. |
| A05 — linked-worktree isolation | A's begin/verify/pause/resume leaves B's active state, failed output and retained history unchanged. | Two actual linked worktrees with the same native Git common directory, not two independent repositories. |
| A06 — integration/control movement | Incompatible old success cannot qualify changed source, baseline or controls; the combined product is actually checked. | Native freshness/transition regressions plus the later real MCP/SHACL integration, coordinated with WP8. |

This is not a general transaction manager for the entire SDLC. The exclusivity repair is for **native initial task publication**. One coordinated verifier and coordinated lifecycle transitions per checkout remain the operating model. Ordinary subordinate build/test processes do not become separate independent executions merely because they are processes. The helper does not prevent an arbitrary editor, an old helper already loaded into another process, or another filesystem identity from writing files. [P1, P2, R01]

**Two delivery statements remain separate:**

- The WP2 code/procedure increment can be implemented, independently verified and handed off on its frozen candidate.
- Issue #33's combined-product outcome remains pending until the actual authorized integration has been checked. Neither a document walkthrough nor the synthetic integration regression closes that outcome.

## 2. Research basis and observed limits

### 2.1 Binding to the supplied documents

| Input | SHA-256 used for this expansion |
|---|---|
| Parent implementation plan | `b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82` |
| WP1 detailed proposal | `68594f4df7bb0144c633054ba1decba5a9540580aff8a1ba974af94de15409b1` |
| Worktree lifecycle handoff | `a9cf76ae85ab314b15e80164150e0a69d8c18af836c32a83e8ca689e1a4d16d6` |

The refreshed GitHub `main` resolved to `79d187802f9255134c03d0786ff75181ed1070ee`. Issue #33 still says its separate-worktree scope direction is accepted while the detailed implementation proposal is not accepted; the comments read returned none. These are observations, not permission to implement. [R01, R02]

The supplied WP1 file is a **proposal**, not evidence that its encoding changes or version-3 receipts have landed. Do not write a WP2 test that silently accepts either receipt contract to conceal an integration mismatch. [P2]

### 2.2 Source-derived findings

| ID | Observed fact | Consequence |
|---|---|---|
| O01 | `_repository.derive_repo_from_script` derives the root from the script, then compares it with Git's top level. | Reuse it. Demonstrate linked-worktree behavior before changing it. [R03] |
| O02 | `begin_task` checks `active.json.exists()` and later calls `write_json_atomically`. | The check and acquisition are separate. Preserve this source-level finding until a maintained native-process test supplies actual RED evidence. [R04] |
| O03 | The atomic writer ends with `os.replace`, rejecting existing symlink/junction redirection. | Atomic replacement is correct for updates but does not provide exclusive initial creation. Do not change every writer to create-only behavior. [R05] |
| O04 | Active state is schema version 2 under worktree-local `.sdlc/runtime`; resume gives a new task ID, retains historical fields and reloads route/control digests. | Keep existing valid active state readable; no metadata migration is needed for the selected design. [R04, R05] |
| O05 | `required_verification_gaps` owns current task/control/input checks; run history and current profile evidence are local. | Keep freshness in its current owner; integrate with WP1's accepted consumer when deployed. [R05, P2] |
| O06 | Existing lifecycle tests build standalone temporary repositories; the existing non-overwrite test is sequential. | Add real linked-worktree and controlled competing-process boundaries, retaining current tests. [R06] |
| O07 | CLI commands are `snapshot`, `begin`, `verify`, `resume`, `status`, `handoff`, `pause`; there is no `reroute`, `amend`, `supersede` or `recover-start` command. | Use the actual supported same-scope pause/resume path; expose unsupported scope changes rather than inventing flags. [R04] |
| O08 | The guide, handoff reference and review policy already require truthful evidence, independent review where applicable and proportionate work. | Add concise exact wording to these owners, not a parallel policy or mandatory new dossier. [R07–R09] |
| O09 | The SDLC control workflow already runs on Ubuntu and Windows and discovers the SDLC tests. | Use the existing workflow; no additional workflow, permissions or runtime update is selected. [R10] |

The Windows worktrees, native Codex/DCG dispatch and local original run evidence were not accessed during this research. The handoff is historical observation, not live inventory. Its questions about duplicated candidate copies, time spent retained and cleanup do not establish a lifecycle defect. In particular, the same candidate bytes can properly be given to an independent verifier; independence of the oracle/context and stability of the target are separate questions. [P3, R08]

### 2.3 Evidence terminology

**Source observation** means inspected code/documents or remote state. **Operational observation** means a source reports a local execution that was not independently opened here. **Proposed contract** means new design in this plan requiring acceptance. **Research probe** means a bounded local experiment on synthetic data, not a repository test result or host adoption. Maintain these distinctions in every completion statement.

## 3. Scope, dependencies and authority

### 3.1 In scope

The change consists of narrowly replacing the initial active-task publication primitive, improving competing-start diagnostics, adding native concurrency/isolation/freshness regressions, and making physical ownership, shared resources and integration targets discoverable in the existing task/PR/handoff. The code and process use the existing toolchain and local evidence model. [P1, R01]

### 3.2 Explicit non-goals

No central scheduler, global task database, global lock service, new task hierarchy, lease renewer, TTL takeover, multiwriter checkout, mandatory merge queue, branch-rule change, automatic worktree cleanup, worktree relocation, credential expansion or cross-repository distribution is included. WP2 does not repair the six historical worktrees, replay old tasks as an adoption pilot, reimplement WP1 receipts, diagnose DCG dialect selection or claim Codex Security adoption. It does not implement arbitrary concurrent verify/pause/resume/handoff transactions within one checkout. [P1, P2, R01]

A reproduced additional same-checkout lifecycle race is retained and assessed against its actual scope; it is not automatically folded into this repair. The accepted single-execution model must not be renamed to conceal new scheduling behavior.

### 3.3 Dependency handling

| Other work | Relationship | Execution rule |
|---|---|---|
| WP0 | Protects required unique bytes in the historical worktrees. | Do not reuse, clean or reroute those worktrees for WP2. A new authorized isolated checkout can proceed without waiting for every historical ownership decision. |
| WP1 | Preferred evidence-retention foundation. | Land/consume its accepted writer, receipt schema and reader together before final joint qualification where available. Exploratory WP2 tests may use recorded process-local `PYTHONUTF8=1` on the old host; that is not closure of #32. |
| WP3 | Owns persistent release/disposition visibility improvements. | Record necessary ownership/consumers now in the existing handoff. Do not add its status subsystem or cleanup behavior in WP2. |
| WP4 | Owns command-dispatch diagnosis. | A native guard denial remains an explicit gap; no alternate interpreter/tool route. |
| WP6 | Owns committed-plan baseline adoption and broader preflight. | Use the actual accepted Issue snapshot for #33. Do not transplant ONI's Markdown route here. |
| WP8 | Owns later selective adoption and product acceptance. | Share one actual combined-product evidence record; do not run two equivalent acceptance campaigns. |

### 3.4 Routing and approval

Keep Issue #33 as the maintained requirements authority. Record acceptance of its actual revision, the selected publication mechanism/filesystem scope and the exact policy/skill text before the appropriate edits. Capture and merge the accepted baseline through the existing procedure. Do not manufacture approval from a schema pass, a CLI reference or this plan.

The recommended working branch is `fix/sdlc-exclusive-task-start`; it may hold the related linked-worktree tests and coordination wording under #33. This is a naming proposal, not a request to create or push it. The proposed functionality declaration is maintenance of the existing single-execution contract (`--no-new-functionality`), with the completed native-capability assessment retained because the integration is material. Confirm that declaration as part of the actual route. A deliberate new user-facing capability would require its own accurate declaration.

Use a new authorized checkout, an existing approved runtime and the repository-adapted TDD procedure. There is no authorization to install another tool, change configuration or issue Git/GitHub writes from merely reading the plan. Existing accepted authority can be reused within its scope; do not ask repeatedly for decisions already recorded. [R01, R07–R09]

## 4. Requirements traceability

| Issue #33 requirement | Implementation or procedural responsibility | Primary evidence |
|---|---|---|
| REQ/AC-001 — execution identity | Existing intent/evidence reference links to a compact execution record identifying physical copy, owner, branch/HEAD, actual scope and dependencies. | C01 walkthrough; T22; final record. |
| REQ/AC-002 — local state isolation | Worktree-local state remains unchanged in B while A transitions. | T16–T21. |
| REQ/AC-003 — ownership and overlap | One independent execution per physical checkout; overlapping logical files coordinated across separate copies. | C01; T01–T04; T29. |
| REQ/AC-004 — shared resources | Native worktree identity plus explicit relevant environment/output/port/common-config ownership. | T16–T18, T22, T24; C01/C02. |
| REQ/AC-005 — integration evidence | Combined source identity, semantic overlap decisions and real consumer/full verification. | T25, T29; C02. |
| REQ/AC-006 — controls/baseline | Reject stale/incompatible evidence; use supported explicit same-scope transition; reaccept material requirements. | T23, T25–T28, T30, T32. |
| REQ/AC-007 — proportionate progress/retention | Concrete pause reasons; independent work continues; no cross-task cleanup or extra fan-out. | T19–T21, T24; C01/C02 and handoff. |
| REQ/AC-008 — exclusive task start | One native no-overwrite publication point, identifiable collision, preserved interrupted ownership. | T01–T15, T31. |

C01/C02 are actual procedure/product exercises, not additional automated-test counts. The T identifiers below denote regression scenarios and may map to parameterized tests; they are not a promised count of test functions.

## 5. Selected design

The following D1–D9 are **proposed implementation decisions**, not facts already implemented by the repository.

### D1 — Keep the physical worktree as the execution boundary

Retain `ACTIVE_TASK_PATH = .sdlc/runtime/active.json` relative to the root established by the existing repository locator. Never relocate active state or the start guard under `--git-common-dir`: doing so would make independent linked worktrees compete for one execution. Git's ordinary refs/configuration are shared while the working files, HEAD and index have worktree-local aspects. [R03–R05, N01]

Use Git's `--show-toplevel`, `--absolute-git-dir`, `--git-common-dir` and `--git-path index` interfaces to record and test actual identity. Do not parse the directory name in `.git/worktrees` or assume `.git` is a directory in a linked checkout. [N02]

No new stable global worktree ID is required. At an observation/checkpoint, the native physical root and Git administrative identity identify the copy; `taskId` identifies the local execution. A branch name is neither physical ownership nor a frozen candidate identity.

### D2 — Publish a complete active record without replacing an existing one

Select **same-directory, complete-file publication using `os.link`** for initial active-task creation, subject to qualification on the actual supported local filesystems.

The implementation prepares the complete schema-2 record in a unique temporary regular file, closes it, then calls `os.link(candidate_path, active_path)` once. A successful link creation is the ownership-establishment point. A destination collision rejects the start; it never replaces the existing active path. Remove only the successful caller's exact temporary name after publication and any required inspection/readback. Do not write through that temporary name again.

This is a short native filesystem operation, not a long-lived lock. Python supplies the API on Unix and Windows; POSIX documents atomic link creation and `EEXIST` rejection. Microsoft's documented implementation supplies same-volume file hard links with filesystem/host limitations that must be qualified, not assumed away. [N03–N05]

**Why this selection:** it permits readers to see either no newly established task or a complete record, without introducing a second active-state machine solely for a partly written `active.json`. It keeps existing active/paused state and the later atomic-update path intact. The choice is local to initial publication.

| Alternative | Assessment |
|---|---|
| Existing existence check plus `os.replace` | Reject: replacement can overwrite another contender after both pass the check. |
| Direct exclusive `open(..., 'x')`/`O_EXCL` on `active.json` | Legitimate alternative, but it can expose an empty/partial authoritative record after interruption. Selecting it would require explicit incomplete-state/recovery handling; do not silently substitute it for the selected complete-record contract. |
| Atomic directory claim plus owner record | Can provide exclusion, but adds an incomplete-claim lifecycle and another shared record with recovery obligations. Not selected for this bounded initial publication. |
| OS-specific advisory locks or a new lock dependency | Requires additional platform/inheritance/lifetime contracts while active state is already the continuing ownership marker. Not selected without a demonstrated need. |
| `git worktree lock` | Not an execution lock; its documented role protects worktree administration/removal/movement. Do not use it to claim task-start exclusion. [N01] |
| New Git ref, database or global lease | Misplaces the boundary or introduces a new authority/scheduler. Out of scope. |

**Filesystem acceptance is a real gate.** Inspect the actual Windows volume and each supported runtime location. A Linux probe does not qualify NTFS; Windows does not imply NTFS; support for one NTFS location does not establish network-share or ReFS behavior. No silent filesystem-support removal, volume conversion, fallback or permission change is authorized. An already-supported environment incompatible with this mechanism requires an accepted design amendment, not a best-effort copy/replace fallback. [N05]

### D3 — Keep preparation distinct from acquired ownership

Before the `os.link` succeeds, a temporary candidate is preparation material, not a claimed execution. An interrupted candidate is preserved for diagnosis when relevant, but its existence is not a lease and must not automatically block a later explicit valid start. That later start still must acquire the actual active path exclusively.

After publication succeeds, `active.json` is the complete ownership record even if the process dies before printing success. Never remove it to make a failed invocation appear rolled back. A subsequent start rejects it and directs the user to inspect the established task.

The selected algorithm avoids deliberately publishing an incomplete active record. Nevertheless, **pre-existing empty, malformed, unsupported or otherwise unreadable active state remains a hold**, not an idle checkout and not permission to overwrite it. Preserve its bytes/location and obtain an attributable state decision. There is no TTL, PID-liveness takeover, automatic resume or automatic cleanup.

### D4 — Preserve current active-state and receipt contracts

Keep active schema version 2 and its current fields. Do not add owner/worktree/dependency fields merely because an existing task/PR record can already hold them. Existing `intentReference` and handoff `evidenceReference` can locate the compact record. Use `taskId` from actual state, never invent an ID before an execution exists.

No persistent pending-start schema, acquisition journal, status database or migration is selected. WP1's receipt version is separate from active-task version. Preserve whatever writer/schema/reader set is actually accepted and deployed; final integration with WP1 uses its accepted version-3 contract without relabeling historical receipts. [P2]

Do not insert current branch/path metadata into the active record on every status read. That would alter `activeDigest`, invalidate evidence and turn a read into a lifecycle write.

### D5 — Preserve atomic updates; specialize initial creation

Add one narrowly named helper in `_sdlc_state.py`, proposed interface:

```python
def create_active_task_exclusively(repo: Path, active: dict[str, object]) -> None:
    """Publish the complete initial task without replacing existing active state."""
```

The exact typing can follow the file's existing style; the contractual name must convey **creation/exclusion**, not generic saving. Do not add a boolean `exclusive=False` mode that makes callers guess which semantics apply.

`begin_task` alone uses the new helper. `pause`, `resume`, evidence checkpoints and disposition archives retain their accepted atomic-update behavior. Reuse/factor the existing path-redirection check and JSON serialization only as needed; do not rewrite the whole state module or turn it into a general storage framework. [R04, R05]

### D6 — Make rejection/actionability truthful

Normal conflict diagnostics identify the observed established task's `task`, `taskId` and active/paused state, plus the actual checkout. They should state that the rejected request did not replace that state and that independent work needs its own authorized worktree. Do not infer the human owner from an OS username or branch label.

If the existing record cannot be safely read, identify the path and exact limitation; do not fabricate the established ID. If another authorized lifecycle action changes/removes the record between collision and inspection, report that change and reject this request. Do not retry acquisition invisibly.

Reuse the appropriate accepted presentation behavior when available; do not assume WP1 supplies a generic reporter callable that its implementation does not expose. A print or temporary-name cleanup failure after publication cannot remove active state. Report through an available channel that the task **was established** and that the secondary operation failed; if all output channels fail, the retained state remains authoritative. Use `status`, not a blind new `begin`, to resolve the ambiguity. Ordinary complete success is exit 0; rejected/failed execution is nonzero through the existing CLI. Parser usage codes remain their existing behavior. There is no release/approval meaning in these codes.

### D7 — Keep protection scope honest

Retain the current rejection of symlink/junction-redirection paths and inspect the destination even when it is a dangling link or unexpected filesystem object. Distinguish an actual collision from access denial, unsupported operation, I/O error or missing directory. Do not catch every `OSError` and call it 'another active task'.

The private candidate is a regular file created with the maintained standard-library secure temporary-file primitive in the destination directory. Its generated name includes the generated task identity, not arbitrary task text used as a path. Do not create links into another checkout, hold an open write handle to the candidate during publication, or change file ACLs. [N06]

A hard link is a second name for the same file, **not a backup**. A leftover temporary name after publication must never be edited or advertised as an independent preserved copy. Later accepted atomic replacement of active state leaves the old candidate's bytes separate; test this behavior. [N05]

Existing path checks are accidental-redirection guardrails, not a complete adversarial filesystem sandbox or full TOCTOU defense. No wider security claim is introduced. Command guards and OS permissions still apply.

### D8 — Reroute only through actual supported transitions

For source-only integration with unchanged accepted scope/controls, run fresh verification on the new source identity; do not gratuitously restart the execution.

For an accepted **same-scope** policy/configuration change, the existing supported sequence is an explicit pause followed by an explicitly authorized resume. Resume reloads controls, assigns a new task ID and leaves prior evidence historical. It does not automatically accept changed requirements or grant new Git/tool authority. The retained `startingHead` remains historical; obtain the actual current head from Git/run identity rather than rewriting the field to look current. [R04]

A changed accepted baseline/reference or expanded task scope cannot be implemented by inventing `sdlc reroute`, editing old digests, removing active state or misusing resume's decision reference. Finish and hand off the old scope first only where it genuinely is complete and its evidence is current. Otherwise preserve the incomplete execution and obtain an explicit supported supersession/rebaselining decision; the current helper does not implement that arbitrary transition. Independent work in other copies continues. This limitation is documented, not solved by adding another lifecycle command in WP2.

### D9 — One integration record, not a second coordinator service

Keep branch-local evidence with its original identity. At material integration, use one existing Issue/PR/handoff section recording input revisions, semantic overlap decisions, integration owner, actual combined candidate, relevant shared-resource state and required consumer results. The local `full` receipt is not a substitute for the higher product outcome, and a textually clean merge is not evidence that those consumers agree. [P1, R01, R09]

## 6. Exact initial-publication algorithm and failure contract

### 6.1 Preconditions

Validate the accepted task declaration, required research reference if applicable, route, known profiles and prior baseline using existing owners. Determine the complete schema-2 candidate before publication. Existing active state may be rejected early as an optimization, but early existence checking is never the authority for exclusivity.

A rejected invalid request must not claim the checkout. An already occupied checkout must preserve its active state and run/history bytes. No independent implementation should be editing the same physical checkout while these steps run. Concurrency in this section deliberately exercises accidental competing **starts**, not accepted multiple writers.

### 6.2 Algorithm (specification, not deployed code)

```text
BEGIN(request, repo)
    run the existing validation and baseline/route checks
    construct the complete existing active-task value
    serialize it before touching the authoritative active path
    validate the worktree-local state path and parent components
    create an exclusively named temporary regular file in active.parent
    write the serialized bytes; flush; close successfully
    recheck the relevant path-redirection boundary

    attempt os.link(private_candidate, active_path) ONCE
        destination exists:
            retain the established state, inspect it for the rejection message
            dispose only the request's own unneeded preparation file when allowed
            return actionable nonzero rejection
        another publication error:
            retain relevant preparation/failure evidence
            return the actual nonzero failure; never copy/rename/replace as fallback
        success:
            active_path is now the ownership record

    remove only this invocation's exact private candidate name when permitted
    report the established task
    return success only when the invocation's required operations completed
```

Do not put `active_path.unlink()` in a failure cleanup or `finally` block. A `finally` cleanup must not mask the original error, and must not apply a broad prefix/directory sweep. All handling is stage-aware: failures before ownership and failures after ownership have different meanings.

Closing/flushing the candidate before publication makes the intended bytes available to readers; it is not a claim of power-loss durability. This increment supplies no cross-file transaction or storage-failure-proof ledger. Adding `fsync` or directory durability policy is not required merely to prove exclusion; any stronger durability claim needs its own tested contract.

### 6.3 Failure/interruption matrix

| Point/condition | Authoritative state | Required result and next action |
|---|---|---|
| Validation or serialization fails before candidate creation | Unchanged; no new owner | Ordinary rejection; no fake lifecycle entry. |
| Candidate write/flush/close fails | No new active publication | Preserve relevant partial candidate/error; no copy fallback or automatic retry. |
| Process dies after preparation but before publication | No ownership from this request | Candidate may survive. It is not a stale lease. Inspect/retain as needed; another explicit valid start can acquire normally. |
| Two completed candidates race at publication | Exactly one can create the active name under the qualified primitive | Winner establishes task; loser cannot alter winner state or history and identifies it where readable. |
| Existing active or paused task | Existing owner remains | Reject; no queue, wait loop, automatic pause or timeout takeover. |
| Existing empty/malformed/unsupported active record | Preserved hold | Actionable diagnosis; no overwrite, automatic quarantine or inferred owner. |
| Candidate/destination path is redirected or unexpected | Existing paths preserved | Reject under existing path controls; report actual type/error. |
| Filesystem does not support the selected primitive | No newly established task unless post-operation readback proves otherwise | Fail explicitly; obtain design/capability decision, not a silent weaker primitive. |
| Process dies after successful publication but before acknowledgement | Complete task survives | Subsequent begin rejects; inspect status and actual state. Do not assume nonzero/lost output means no start. |
| Cleanup of private name fails after publication | Complete task survives; candidate alias may remain | Nonzero/actionable result describing established task and exact leftover. No active rollback. |
| Human output fails after publication | Complete task survives | Preserve it; report through available supported diagnostics. No blind start retry. |
| Collision followed by disappearing/unreadable state | Observations may differ | Reject this invocation, report uncertainty; do not take over during diagnostic recovery. |

### 6.4 Recovery procedure without a new command

Read the exact native active path using supported `status` and file inspection. A valid schema-2 record is an established task regardless of the previous process's exit code. Resume it only if it was explicitly paused and the existing resume decision is authorized. A task need not be paused merely because a previous `begin` process ended unexpectedly.

For malformed pre-existing state, preserve bytes and relevant history first, determine ownership/consumers with Max and obtain the exact state action. The current helper cannot repair arbitrary malformed JSON through `resume`. Do not include an automatic deletion, 'repair' CLI or direct edit recipe that manufactures completion. Use a separate authorized worktree to continue independent work while the hold is resolved.

Inspect a surviving private candidate by its actual path and task identity. Do not publish it later by hand; it may describe stale validation inputs. Reissue a new accepted start through the native helper when no ownership exists. Any eligible preparation-file disposal uses existing temporary-artifact rules; a native guard denial must be escalated, not bypassed. [P3, R08]

## 7. Shared-resource and worktree contracts

### 7.1 Native identity observations

The following are inspection recipes; substitute an actual validated root and retain each command's exit status. They do not authorize creating/moving/removing a worktree.

```text
git -C <worktree> rev-parse --show-toplevel
git -C <worktree> rev-parse --absolute-git-dir
git -C <worktree> rev-parse --path-format=absolute --git-common-dir
git -C <worktree> rev-parse --path-format=absolute --git-path index
git -C <worktree> rev-parse HEAD
git -C <worktree> symbolic-ref --quiet HEAD
git -C <worktree> worktree list --porcelain -z
```

An absent symbolic branch in detached HEAD is a legitimate state, not a missing repository. A missing intended directory or a mismatched returned top level must fail inspection rather than silently operating on a containing repository. Keep complete path arguments, non-ASCII names and spaces; do not split human output on whitespace. Use native object/path identity where necessary instead of lowercasing every path to guess equivalence. [N01, N02]

### 7.2 Resource-selection rule

Record only material resources used by the actual executions. No per-file ledger or organisation-wide dependency survey is required.

| Resource | Preferred boundary | When coordination is needed |
|---|---|---|
| Working files, index, task state and run/profile records | Native separate physical worktrees and worktree-local runtime directories | Always for multiple independent implementations; separate logical paths in one checkout are insufficient. |
| `.venv`, `node_modules`, generated build trees | Per-worktree mutable installations/output | Any shared installation or directory being mutated; do not upgrade dependencies while a consumer's frozen run depends on them. |
| Download/package caches | Existing native cache behavior; consumers may share a supported read/cache interface | Shared mutation outside the native tool's contract, or cache state that is actually a verification input. No blanket cache lock. |
| Fixed listening ports, preview servers, sockets | Independent native port/output selection when supported | A fixed shared endpoint, or a test that could unknowingly talk to another worktree's process. Record process/target identity. |
| Git ordinary refs, config, remote tracking and common administration | Native Git semantics; no copied common-directory lock | Config changes, branch movement relied upon by another task, fetch/integration/maintenance operations with real consumers. |
| Explicit Git/environment overrides | Existing documented target-specific values | `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` or other overrides redirect identity/input ownership. Do not silently clear intentional settings; expose unsupported/shared use. [N07] |
| External scans, artifact stores and publication channels | Existing authorized service and identity | Exact target, write authority, access and active consumers; no release/publication grant from a local task. |
| Verification fixtures | Owned disposable test storage | Fixture processes and outputs must finish/be retained before teardown. Actual guard denial remains a blocker. |

Do not mutate shared state merely because worktrees are separate. Conversely, a B-only commit or unrelated remote-ref movement is not by itself a reason to invalidate A's unchanged local source and declared inputs or pause A. Record relevant inputs, not an ever-changing digest of all common Git objects. This preserves the parent's proportionate progress requirement. [P1, R01]

## 8. Test architecture: how to prove the intended interleavings

### 8.1 Reuse the existing fixture infrastructure

Extend `tests/sdlc/test_pipeline_controls.py`. Reuse its copied repository scripts, native policy/configuration/schema consumers and actual Git initialization; do not create an independent fake implementation of `begin` or the verification gate. The existing small `focused`/`affected`/`full` fixture profiles remain **test fixtures**, not replacements for the production R2 full profile. [R06]

Use one fresh synthetic seed repository and **two linked worktrees**, A and B, created with native `git worktree add` and distinct branches. Do not accidentally test two clones. Put the roots as siblings in one owned temporary test directory; nested real worktree cleanup is not needed to prove this boundary. Assert that A/B have the same resolved common directory, different Git directories/index paths, different roots and actual `.git` link files.

Synthetic setup must not mutate the real repository or global Git settings. Use fixture-scoped identity/configuration; avoid executing unrelated user hooks or obtaining credentials. Keep the existing command protection on the actual dispatch. A fixture-isolation environment is not a mechanism to disable DCG.

The native Python CLI tests can execute each copied `scripts/sdlc.py` using the already selected repository `.venv` interpreter, as the current fixtures do. Sharing that **read-only test interpreter** reduces setup cost but proves local filesystem state isolation only—not independent mutable environments. Separately exercise the ordinary npm/Node/worktree-local `.venv` entry on the actual supported Windows host after authorized setup. Do not turn every unit fixture into another dependency installation.

### 8.2 Deterministic competing-start RED/GREEN

Use a minimal test-only child driver, proposed path `tests/sdlc/fixtures/concurrent_lifecycle_child.py`, that imports the target checkout's real `sdlc` module and invokes its actual `main()` with normal parsed arguments. The driver may insert a readiness/release barrier around a real existing boundary; it must not manufacture task JSON, replace the publication result, skip baseline checks or contain its own successful-start algorithm.

For the anchor race test, instrument `sdlc.load_verification_controls` **after its real call returns**, before `begin_task` can reach publication. The old implementation has already passed its initial active existence check at that point. With an initially idle fixture, await `READY-A` and `READY-B` before releasing either process. This yields a controlled schedule in which both old processes have passed that check. The new implementation must survive the same schedule because exclusivity is established later at publication, not by that earlier check.

The parent drives dedicated process channels/readiness observations and records both stdout/stderr and exit status. Use bounded waits only as failure deadlines; do not use sleeps as evidence of overlap. On a missed readiness event, report fixture failure, not the product defect's intended RED. On supported platforms, join/terminate only known fixture children and retain failure diagnostics; do not run broad process-kill operations.

The maintained assertion is **one accepted start, one actionable nonzero rejection, exact winner state retained**. Against the unmodified code the expected useful RED is two successful calls; do not modify expectations to accept two merely because the fixture reproduces the old behavior. Supplement the instrumented test with uninstrumented public CLI starts/occupied-state checks. Be explicit that the instrumented driver controls scheduling, while the public entry tests establish launcher/dispatch behavior.

No production `--test-barrier`, hidden environment switch, sleep, arbitrary callback hook or alternate publication method is introduced to make this test possible.

### 8.3 Interruption tests at observable points

Test both sides of the ownership-establishment point. Use the test driver to call the real primitive, emit a readiness observation and block, or to block immediately before calling it. Killing a process that merely started does not establish which side it reached.

Before publication: retain the prepared candidate, assert no new active task, and show that a new explicit request can acquire independently. After publication: assert complete active bytes and a subsequent rejected start even though the first process did not finish its acknowledgement. Test pre-existing malformed state separately; it must not be treated as idle.

Inject deterministic write/flush/link/unlink/reporting failures at their actual seams in ordinary unit tests, and use real subprocess/native-filesystem tests for the behavior claimed at those boundaries. A mocked `PermissionError` checks handling; it does not prove a Windows ACL scenario. An unsupported local capability is reported as such, never silently skipped and counted as qualified.

### 8.4 Real linked-worktree lifecycle test

Begin native tasks in both A and B. Configure the same profile name to execute actual commands with independently expected outputs: A succeeds; B prints a distinctive marker and exits 7. Run them with controlled overlap, then let both finish. Read actual state/run/profile files from each root and preserve failed evidence.

Only after B's run is quiescent, snapshot B's complete relevant runtime manifest—paths plus bytes, including its failed run and raw output when WP1 is present. Pause and explicitly resume A, run A again and hand off A where its verification permits. Assert B's snapshot remains byte-identical. Then reverse the roles: let B's subsequent authorized corrected check pass and prove its earlier failed record remains while A's retained history is unchanged.

Do not compare B's bytes while B itself is still legitimately writing and label its own progress interference. Do not rely on record counts alone. On WP1, inspect the actual canonical/current receipt pair and raw outputs; on pre-WP1 exploratory tests, label that narrower contract honestly. Final tests target the accepted deployed contract rather than a permissive v2/v3 adapter.

### 8.5 Freshness and combined-state tests

Run real native source changes/commits and an actual merge in owned fixtures. Prove that the required gate rejects older same-task evidence once relevant local source/HEAD, baseline or controls change. Preserve that rejected receipt with its original identity; do not overwrite it with an edited 'fresh' one.

Add a clean-merge semantic counterexample with independently authored consumer expectations. Each isolated branch satisfies its local checked scenario; their textually clean combination violates the actual combined consumer contract. The combined test must fail, then pass only after a legitimate fixture repair. The purpose is sensitivity to semantic integration, not simulation of the complete MCP/SHACL product. Never derive the expected integrated output from either implementation branch.

Also retain the positive control: a B-only commit/ref update with A's own inputs unchanged does not invalidate A just because their Git object database is shared. This catches accidental serialization/fingerprinting of irrelevant common state.

## 9. File-by-file change and approval inventory

| File | Exact planned responsibility | Change classification |
|---|---|---|
| `scripts/_sdlc_state.py` | Add `create_active_task_exclusively`; reuse bounded path/JSON facilities; preserve all atomic-update and identity responsibilities. | Runtime source, no new dependency or general lock API. |
| `scripts/sdlc.py` | Route only initial `begin` publication through the new helper; identify occupied/paused/malformed state accurately; preserve post-publication ownership on errors. | Runtime source; existing CLI grammar/active schema retained. |
| `scripts/_repository.py` | Inspect/reuse and test root derivation in real linked copies and from other working directories. | No default source edit. Repair only a reproduced mismatch within accepted scope. |
| `tests/sdlc/test_pipeline_controls.py` | Add the native start, linked-worktree, interruption, isolation and input-movement scenarios; retain all existing regression obligations. | Test integration. Use existing fixture/schema/runtime owners. |
| `tests/sdlc/fixtures/concurrent_lifecycle_child.py` | Minimal test-only coordination of the actual lifecycle entry and selected failure/scheduling seams. | New bounded test fixture, not a production test switch or second SDLC. |
| `docs/sdlc/howto.md` | Add the exact separate-worktree/progress/integration procedure and interrupted-start guidance in the companion approval text. | Repository-policy text: exact approval required. |
| `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md` | Clarify physical-copy ownership, candidate identity and shared-resource handoff without expanding the skill's orchestration role. | Skill/policy text: exact approval required. |
| `REVIEW.md` | Require a branch-local versus combined-target coverage statement when integration is material. | Repository-policy text: exact approval required. |
| `docs/sdlc/verification.md` | Append actual candidate/host/commands/results and explicit pending real integration after execution. | Factual evidence record; never prepopulate a passing adoption result. |

Inspect the selectors and consumers for these exact paths. The inspected workflow already discovers the SDLC tests. A demonstrated path-selection omission requires its own smallest approved correction; no speculative workflow/package change is selected. [R10]

No default edit is proposed to `AGENTS.md`, generated `.agents/skills`, `.codex` configuration, `sdlc_stop_gate.py`, package or lockfiles, dependency pins, `.sdlc/pipeline-policy.json`, `.sdlc/verification.json`, active/baseline schemas, runtime version files, branch rules or SDLC package status. Do not edit generated skill activation in place; any needed local activation uses the existing authorized mechanism and preserves unrelated activations.

The companion `policy-amendments.proposed.md` contains the exact three text proposals. It is an approval aid, not a second accepted policy or rival Issue. Land the accepted text only at its owning repository paths.

## 10. Ordered implementation slices

### WP2.1 — Bind the accepted object and protect existing work

**Inputs:** parent WP2, Issue #33's actual revision, accepted text/mechanism decisions, current candidate/host identity and WP1 status.

Read the effective local instructions and existing adoption scope. Confirm the current Issue acceptance/baseline and exact source/policy change authority. Reconcile the actual selected checkout with native Git and inspect its active state; never clear somebody else's record. Record the implementation owner, integration owner or unresolved assignment, accepted scope, existing evidence location and material shared resources. Use the new authorized checkout without modifying the six historical worktrees.

Record whether the receipt/encoding dependency is the accepted WP1 implementation or the explicit temporary old-host mode. Preserve failure evidence outside any disposable resource when its retention requires that. Branch/commit/push/installation/live-scan permissions stay distinct. The method may proceed independently while an unrelated task or WP0 ownership decision is waiting.

**Exit:** attributable scope and approval record; no inferred requirement acceptance, no data loss and no invented active-state migration. Read-only research can precede acceptance; production/runtime/policy edits cannot.

### WP2.2 — Establish the two anchor tests before runtime repair

Implement the controlled native competing-start test and the two-linked-worktree lifecycle test described in section 8. Retain the old-code race outcome, commands, actual identities and raw process results. The linked-worktree behavior may already pass: record it as preservation evidence rather than manufacture RED by breaking correct code.

Use actual successful/nonzero commands and inspect both state trees. Exercise A pause/resume after B's failed run. Prove the test's topology is actually linked. Add the public-entry smoke boundary so a patched Python function alone is not represented as host/launcher acceptance.

**Exit:** useful old-code RED for the violated exclusive-start requirement, plus honest existing behavior evidence for worktree isolation. A setup/import/permission failure is not the required race reproduction.

### WP2.3 — Qualify native complete-file publication

Before adopting the runtime primitive, exercise same-directory temporary creation, complete write/close, no-overwrite link publication and single-name cleanup using the selected repository Python runtime. Qualify the actual supported Windows filesystem and the Linux CI/test filesystem separately. Include an existing ordinary file, paused record, malformed/empty file, directory and available link/reparse negative controls.

Demonstrate one winner under controlled concurrency and stable complete JSON observation at publication. Confirm post-publication interruption leaves an owner; pre-publication preparation is not a held lease. Check that a later ordinary atomic active update does not write through a leftover candidate alias. Retain actual native errors for unsupported/access/path cases. Use the already adopted security boundary; do not elevate or change the host merely to make the mechanism pass.

**Exit:** supported-file/location capability evidence and accepted selection, or an explicit design amendment/capability gap. The supplied Linux research probe is input, not this qualification.

### WP2.4 — Implement the smallest runtime repair

Add the named helper and route `begin_task` through it. Preserve all original route/research/baseline checks and schema-2 fields. Pre-serialize, create the private same-directory candidate, close before publication, attempt no-overwrite publication once and dispose only the exact private name as permitted. Reuse existing path controls and native exceptions.

Improve conflict reporting from observed existing state. Avoid broad fallback branches and don't replace `write_json_atomically` globally. Do not write another task's runs or reset verification. Preserve the existing public argument grammar and correct source names; do not introduce aliases for old unsafe helpers.

Rerun the exact T01 RED: require exactly one success and a nonzero loser identifying the winner. Run the existing route/baseline/active-state controls and the linked preservation test. An already-correct baseline or isolation case is qualification, not newly authored test-first behavior.

**Exit:** corrected native race behavior with actual winner identity and all existing obligations intact.

### WP2.5 — Complete interruption and error-boundary coverage

Exercise the observable pre-/post-publication termination cases and the complete failure table. Prove no path automatically removes established active state. Inspect both stderr/exit and filesystem state, especially a nonzero invocation whose task was already established. Test the narrow loser cleanup, malformed active hold, unexpected filesystem types, collision diagnostic races and publication/output errors.

Retain any original failure and the exact remaining candidate path after unsuccessful cleanup. Do not infer owner death from a PID or time; do not add stale-file scanning. No fault-injection control is enabled in production or exposed as a user CLI option.

**Exit:** phase-specific failure contract passes on its actual tested boundaries, with missing platform/ACL/guard cases explicitly unqualified.

### WP2.6 — Prove isolation, progression and integration freshness

Complete T16–T30 on actual linked fixtures. A and B run independently, preserve each other's state/history and remain independently actionable. Exercise different caller working directories and the true script-root check. The per-worktree state directories remain local even though ordinary refs are shared.

Test source/HEAD/control/baseline movement separately so a simple task-ID mismatch cannot accidentally be the sole reason every stale case fails. Test the native same-scope pause/resume control refresh, including new task ID and unchanged historical evidence. Do not rewrite the current active record to change its baseline or risk. Preserve the absence of an arbitrary native reroute/supersede command as an explicit boundary.

Execute the clean-merge semantic failure fixture and its legitimate correction. Do not respond to a successful text merge with a synthetic 'integrated' marker. Check the actual combined consumer.

**Exit:** A05 and the mechanical part of A06 are demonstrated; the real combined-product outcome remains C02.

### WP2.7 — Apply approved coordination wording and prepare the real handoff

Apply only the approved snippets in the companion document at their specified anchors. Keep the existing requirements owner and the skill's bounded implementation role. Review human clarity: a maintainer must distinguish physical copy, logical file overlap, branch-local evidence, combined evidence and retained resources without reading a new database.

Use the execution/handoff template in section 13 within the existing task/PR record. Complete C01 using the actually available MCP/SHACL records, marking unavailable local facts as unknown. Do not modify those implementations or pretend to know their current worktree state from the September 10 inventory. Link outstanding work to the existing owners/issues rather than create duplicate bugs for every observation.

**Exit:** a reviewer can find the real owner/scope/dependencies and knows which decisions block which work. No routine pause or extra reviewer is mandated merely by another active branch.

### WP2.8 — Qualify the frozen SDLC increment and land coherently

Freeze the final source/test/policy candidate after integrating the accepted WP1 set where applicable. Preserve the required exact baseline and any existing active state. Run focused/affected controls while editing, then the actual required final R2 full profile. Use the actual supported Windows npm/Node/local-Python path and the existing Ubuntu/Windows CI matrix. Capture native command outcomes and test-discovery counts; do not count skips as support.

An authorized independent verifier checks the same frozen object in suitable separate execution storage. Supply accepted requirements and independent expected outcomes, not instructions to agree with the implementer. Obtain focused operability/ownership review for the interruption boundary; select additional specialist/security work only if triggered and authorized, not automatically per test or reviewer role.

Read back the actual remote candidate/head/run/attempt/check results after separately authorized publication. A trusted-base metadata pass is not product test execution, and a local controlled-driver pass is not native host interception. Document real results in `verification.md` or the existing evidence record without a tracked-log edit/reverify loop; never predeclare them.

**Exit:** code/procedure increment complete on its stated host/candidate scope, or implementation ready with specific qualification gaps. Do not close the real integration outcome.

### WP2.9 — Check the real combined MCP/SHACL target

At the actual authorized integration, the integration owner records both accepted inputs, semantic overlap decisions, the combined revision/dirty identity and resource/environment identity. Execute C02 in section 14 and the actual required R2 full profile after the final relevant merge/rebase/fix/control changes. Preserve individual branch histories and prior evidence.

This is shared work with WP8, not a duplicate acceptance campaign and not authority to publish the ontology, Wiki, MCP package or an SDLC release. If one implementation is not ready, record the exact dependency and keep independent allowed work moving. Retain an outcome-pending reference in #33 and the existing handoff.

**Exit:** actual combined consumer and owner-accepted outcome evidence, or a precise failure/unfinished integration record. Only this closes the later real-product part of A06/REQ-005.

The nine slices are implementation ordering, not nine mandatory branches, plans, approvals or full-suite executions. Parallel read-only preparation can proceed where authorized; independent writers use separate checkouts and an integration owner for shared source paths.

## 11. Regression catalogue

**Legend:** R = expected useful pre-repair RED; P = preservation/qualification; F = controlled fault/interruption; H = host-specific qualification. Expectations are proposed, not test results obtained by this research.

| ID | Scenario / route | Independent oracle and required outcome |
|---|---|---|
| T01 | Controlled two-start race — R | Both processes pass the real prepublication validation seam before release; exactly one success, one nonzero rejection; the persisted ID/scope matches the winner, not the last writer. |
| T02 | Same race in a linked checkout — R/P | The same exclusion holds when `.git` is a native link file and the common Git directory is elsewhere. |
| T03 | Existing active owner — P | Rejected start leaves active bytes and all existing run/history bytes unchanged and identifies the owner task. |
| T04 | Existing paused owner — P | Paused is occupied; no implicit resume/takeover, and paused state/history remain intact. |
| T05 | Empty, truncated, malformed or unsupported active state — P/F | Preserve each exact object; reject as a state hold without inventing an identity or declaring idle. |
| T06 | Invalid intent/route/research/baseline prerequisite — P | Existing native negative controls still reject; no active acquisition occurs merely because publication is now exclusive. |
| T07 | Unexpected/redirection paths — P/H | Real supported symlink/junction/directory cases do not overwrite/follow unintended state; unavailable platform capabilities remain explicit gaps. |
| T08 | Unsupported link or native publication failure — F/H | No copy/replace/rename fallback; no existing state modification; distinguish real errors from collisions. |
| T09 | Serialization failure — F | No authoritative active path is created; existing files/history unchanged. |
| T10 | Candidate write, flush or close failure — F | No incomplete active publication; retain relevant preparation/error without automatic takeover or false success. |
| T11 | Termination observed before publication — F | Prepared candidate may remain, but no task was acquired; a subsequent explicit native request can acquire. |
| T12 | Termination observed after publication — F | Complete owner survives; later begin rejects; no fabricated acknowledgement or rollback. |
| T13 | Conflict record changes during diagnostic read — F | Return truthful nonzero/uncertain diagnosis and do not retry acquisition automatically. |
| T14 | Private-name cleanup failure after publication — F | Task stays established; exact alias/secondary failure is reported; active state is never unlinked by cleanup. |
| T15 | Output/flush failure after publication — F | Existing ownership remains; invocation failure cannot be misreported as 'no task created'; no blind retry. |
| T16 | Native linked topology — P | Same common directory, distinct roots/Git directories/indexes and actual linked worktrees, verified through Git. |
| T17 | Independent A/B starts overlap — P | Both succeed in separate physical worktrees; no common-directory/global start lock. |
| T18 | Concurrent A-pass/B-exit-7 verification — P | Each real output, status and task/input identity belongs to its own worktree; no result-count-only oracle. |
| T19 | A pause/resume after B's failed run — P | B's quiescent active/run/profile/raw evidence manifest is byte-identical; A's new execution cannot use its old receipts. |
| T20 | A verified handoff while B is active/paused — P | Only A's permitted active transition occurs; B's files/history/resources remain untouched. |
| T21 | B failure followed by corrected success — P | Original B failure remains and A's evidence is unchanged; a latest green is not a history replacement. |
| T22 | Different caller directory and non-ASCII/spaced paths — P/H | Running B's actual script from A/another directory targets B; misplaced/missing roots fail, not silently select a parent. |
| T23 | Local tracked/untracked/declared-input movement — P | Old same-task A evidence becomes stale for A, while unaffected B evidence remains valid for B. |
| T24 | B-only commit/shared-ref update with A unchanged — P | A is not needlessly invalidated or paused merely because the object/ref store is shared. |
| T25 | Native merge/rebase/integration head movement — P | Actual changed combined state rejects incompatible old receipts; fresh required checks use the new target. Exercise selected operations natively, not by editing recorded SHAs. |
| T26 | Policy/configuration movement — P | Same task with changed controls cannot reuse old green or run with silently changed requirements; formatting-only raw-file changes are assessed through current configured identity semantics. |
| T27 | Baseline changed, absent or unaccepted replacement — P | Old success/restart cannot silently establish acceptance. Original baseline/history remain; native prior-baseline checks still apply. |
| T28 | Authorized same-scope pause/resume after control change — P | New task ID/current control digests through the supported operation; prior state/history preserved and no automatic baseline/scope replacement. |
| T29 | Clean textual merge, failing combined consumer — P | Independent expected product value/contract fails on the actual combined fixture despite isolated successes; only a legitimate fixture fix plus fresh run qualifies it. |
| T30 | Accepted WP1 receipt integration — P | Actual deployed writer/schema/reader agree; rejected starts do not touch old receipts; WP2 does not rewrite or permissively relabel v2/v3 history. |
| T31 | Actual protected Windows npm/Node/local-Python entry — H | Uninstrumented native task lifecycle/public entry agrees with controlled tests on the qualified filesystem; exact host/runtime recorded; no global Python fallback or guard changes. |
| T32 | Stop and handoff consumers — P/H | Incomplete/stale evidence is rejected; the existing bounded continuation can report a blocker without authorizing completion; a completed valid task can hand off and preserve history. |

**C01 — coordination walkthrough:** using actual accessible task/PR records, an independent reader can identify each execution's owner, accepted scope, physical copy, overlap/shared-resource decisions, next integration target and precise pause reason, if any. Do not invent an unavailable fact or demand a separate reviewer for each field.

**C02 — real integrated product:** execute the source-grounded combined scenario in section 14 on the actual candidate, with independent expectations, affected consumers, required full verification and explicit owner acceptance. Record failure/pending states honestly.

## 12. Policy/skill implementation and review

The exact candidate wording is in `policy-amendments.proposed.md`, P-01 through P-03. It specifies two insertions in the existing guide, a physical-copy clarification in the existing handoff reference, and a combined-target coverage paragraph in the existing review policy. Its applied diff—not merely the filename—requires the existing exact configuration/policy approval. [R01, R07–R09]

Review these additions against three independent examples. A low-risk isolated task should not be forced into extra worktrees or a full dossier merely because worktrees exist elsewhere. Two truly independent implementations cannot share one physical index/active record even when their filenames differ. Two separate copies changing one logical interface must coordinate its meaning and verify integration without stopping unrelated work.

Do not add text-matching tests that purport to prove agents will comply with the prose. Ordinary link/format checks can establish document mechanics; C01 and later real work provide the relevant usability/operational observations. Do not call a checked box proof of ownership or a copied context proof of independence.

If WP3 changes the same guide/handoff, reconcile the exact paragraphs once with its owner. Do not land two competing release-state definitions or include a pending-disposition scanner as a side effect of WP2.

## 13. Compact execution and integration handoff

Use this section in the existing task/PR/handoff, not as another mandatory standalone file. Replace placeholders with observed facts; unknown facts are marked unknown with a responsible next actor. The template is deliberately a record format, not an authority or new validation schema.

```markdown
## Execution and integration context

Accepted intent/baseline: <actual immutable reference and decision reference>
Execution owner: <actual assigned owner>
Native task ID: <observed ID, or not yet started>
Physical worktree: <actual root; restricted reference where necessary>
Git identity: <resolved Git directory/common directory and current attachment>
Candidate: <full HEAD plus actual relevant dirty/input identity>
Owned change scope: <bounded scope>
Evidence: <actual native run/profile and retained evidence references>

Material overlap/dependencies: <contract, other execution, dependency or none identified>
Shared mutable resources: <resource, owner, isolation/coordination; scope of inspection>
Integration owner/target: <actual owner and planned/observed combined target>
Outstanding decision/blocker: <specific question and actor, or none>
Next authorized step: <actual next step>

### At material integration

Inputs: <actual source revisions/accepted baselines>
Combined target: <actual full revision plus dirty/input identity if any>
Semantic overlap decisions: <decisions and their authority>
Current checks: <actual commands, results and evidence on this combined target>
Earlier evidence: <explicitly branch-local references>
Remaining product outcome: <passed, failed, or pending with reason/owner>
Resources: <existing disposition section/reference; consumers and next checkpoint>
```

Record the task's native fields by reading them, not by amending `active.json`. A newly added progress comment or evidence reference is not a newly accepted requirements baseline. A task ID, a path and a reviewer role do not authenticate human authority.

For an interrupted start, retain a concise exception record in this same context:

```markdown
Start request: <accepted request/reference>
Observed invocation: <entry point, runtime, actual exit/output reference>
Observed active state: <absent / complete task ID / malformed or unavailable>
Publication conclusion: <established / not established / unresolved and why>
Preparation material: <exact retained location, if any>
Preserved prior evidence: <reference>
Next actor/decision: <specific action; no automatic takeover>
```

Never infer 'not established' solely from an invocation exit code. No normal start requires an additional permanent failure ledger, and no routine successful start requires a second handoff document.

## 14. Real MCP/SHACL integration contract (C02)

### 14.1 Preparation and overlap inventory

Use the actual accepted and available versions of Issue #25 and Issue #31 and their implementation records. The parent identifies the material shared root package/verification/ontology responsibilities; it does not prove their current code or approvals. Refresh these at execution. Do not assume a historical branch name is still a current target. [P1, R01]

| Shared concern | Integration decision/evidence needed |
|---|---|
| Root/workspace `package.json` and lock ownership | One coherent command/dependency graph; no lost workspace entries, ignored direct dependencies or accidental version/permission change. |
| Verification policy/configuration and native entry points | Actual accepted required profiles resolve to the integrated commands and tests. An old command path is not silently preserved as a shim. |
| Ontology source selection/context | SHACL's accepted target/context selection and metadata semantics remain correct without inventing release-promotion obligations. |
| Query/projection/MCP consumers | Existing source-grounded identity/definition/provenance contracts survive ownership or validation changes. |
| Builds and generated data/documentation | The accepted native generators/checkers still agree on inputs and output ownership; no accidental dependence on another task's scratch. |
| Runtime, host and outputs | Local `.venv`/dependencies, ports and generated paths refer to the intended candidate, not another running worktree. |
| Accepted baselines | Neither task's immutable accepted reference is edited to erase a conflict; material change is reaccepted through the actual owner. |

Keep the inventory bounded to material overlap. It is not an obligation to inspect every repository or perform another unrelated software-selection survey.

### 14.2 Combine and freeze

The integration owner obtains the actual Git authority and combines the accepted source inputs in an owned integration target using the chosen native Git operation. A separate integration copy is preferred when the implementation worktrees are still active; do not redirect their state or make both use one checkout.

Record exact input revisions, conflict resolutions and relevant dirty bytes. If native integration changes controls, use the supported authorized same-scope transition or obtain the material baseline/scope decision before claiming verification. A source-only merge with unchanged controls needs new evidence, not fabricated acceptance.

Freeze the combined candidate before independent verification. Do not copy an old `active.json` or successful verification directory from a different execution and label it current integration evidence. A separate verifier receives the exact candidate and accepted expectations, establishes its own authorized local execution/evidence and reports its actual scope.

### 14.3 Product exercise

The real exercise must remain within the accepted product boundaries:

1. Independently inspect the selected immutable ontology fixture/source at a fixed identity. Establish the expected entity IRI, authored definition including lexical/language/datatype distinctions, and release/source provenance without using the query/projection implementation to generate the oracle.
2. In an authorized disposable candidate input, exercise an actual accepted SHACL structural rule through the accepted staged/working-source validation path. Include an independently specified invalid change that yields the expected rule/focus-node/source diagnostic and a legitimate valid case. Do not invent new ontology requirements for WP2.
3. Exercise the accepted human-readable policy generation/freshness relationship where delivered by #31. This checks the candidate artifact, not permission to publish the Wiki or promote dated releases.
4. Run the actual integrated MCP/query/package consumers required by #25 for the affected scope, including its source-grounded Person lookup and its applicable transport/installed-consumer obligations. Retrieve actual commands from the integrated package manifests/accepted plan rather than inventing a `test:shacl` or new MCP flag.
5. Exercise the material cross-component generation/build/validation boundaries and run the actual required R2 full profile after the final relevant edits. Record every unavailable or failed obligation separately from a narrower pass.
6. Retain the actual owner walkthrough/acceptance of the integrated result, explicit limits, original failures and resources needed by unresolved consumers.

Working-source SHACL validation and immutable-release MCP query fixtures may be different inputs under the accepted architecture. Record that distinction. Do not demand new release promotion or a new live feed between them merely to create a single demonstration. The proof is that their actual shared integrated contracts and accepted product outcomes hold on the same combined implementation.

### 14.4 Outcome and continued work

Record C02 as passed only for the observed combined object and accepted obligations. A failed semantic merge returns to the actual contract owners for a scoped repair/reacceptance; it is not permission for unilateral requirement changes. A missing implementation, capability or authority yields a precise pending result with a next actor.

Other independent work may continue while this integration is waiting. Do not count elapsed waiting time as evidence that either branch is defective. A good code-level #33 repair can be handed off while this real integration remains visibly outstanding; do not erase that distinction in Issue closure or an adoption record.

## 15. Verification, review and delivery

### 15.1 Command plan

Inspect the actual entry points and effects on the frozen implementation base. These established commands are the relevant starting points, not assertions they have been executed for WP2:

```text
npm run sdlc -- --help
npm run test:sdlc
npm run test:python
npm test -- --runInBand tests/run-repository-python.test.js tests/pr-check-scopes.test.js
npm run check:sdlc
npm run sdlc -- verify --keep-going
```

During development, invoke the actual added test cases or a verified selection through the existing unittest entry point; inspect discovery counts so an empty or unintended selection cannot become a pass. Do not run a complete R2 suite after every barrier/fixture change simply to fill a record. Existing controls remain necessary and final R2 verification remains mandatory to the accepted extent. [R06, R07, R10]

For a same-scope accepted control change, the actual supported lifecycle shape is:

```text
npm run sdlc -- pause --reason <actual reason> --evidence-reference <retained reference> --acknowledge-retained-evidence
npm run sdlc -- resume --decision-reference <actual authorized same-scope decision>
npm run sdlc -- verify --keep-going
```

These are templates: replace placeholders and establish existing authority before execution. There is no `sdlc reroute` command. Do not call pause simply because another worktree exists, or resume a task that is not explicitly paused. [R04]

Keep final run evidence in existing runtime/evidence storage and status in the existing task/PR. If a tracked evidence summary is edited after a run, preserve that run's original target and refresh the applicable evidence for the new target rather than call it unchanged. No Markdown-wide fingerprint exclusion is part of this package. [P2]

### 15.2 Platform qualification

| Surface | Required evidence | Claim it does not establish |
|---|---|---|
| Controlled native Python processes | Actual parser/lifecycle calls plus controlled race schedule and real file outcomes | Uninstrumented host dispatch, all filesystem/ACL behavior or every scheduling interleaving |
| Windows ordinary npm entry | Selected worktree `.venv`, actual shell/native guard path, target filesystem and real receipt/state inspection | Other Windows volumes, network shares, all DCG commands or unapproved hosts |
| Existing Ubuntu/Windows CI | Actual candidate job/run/attempt, native tests and meaningful skips/gaps | Local Codex permission/guard inheritance or the real MCP/SHACL outcome |
| WP1 integration | Coherent accepted receipt writer/schema/reader and preserved history | Automatically repaired unrelated startup/reporting APIs |
| C01/C02 | Actual coordination and combined-product result | A general productivity improvement or complete statistical independence |

No new supported operating system or filesystem is adopted implicitly. Do not fix qualification by choosing an older toolchain, weakening controls, changing branch rules or adding broad exemptions. Missing required evidence leaves the relevant qualification pending.

### 15.3 Independent review brief

Provide one compact brief to the authorized verifier/reviewer:

```text
Review WP2 / Issue #33 against the actually accepted baseline and exact candidate.
Inspect the real exclusive publication point, not only the preliminary existence check.
Verify the controlled competing-start RED/GREEN and the actual linked-worktree topology.
Check winner/loser identity, paused/malformed preservation, and both interruption sides.
Confirm that no failure path deletes established active state or silently falls back.
Check worktree-local state versus shared refs/resources and unchanged B evidence.
Verify stale source/control/baseline rejection and the real supported transition limits.
Preserve WP1's accepted receipt contract and old history; do not change requirements.
Use independent expected outcomes; do not edit the implementation or inspect another
reviewer's conclusions before returning. Report actual commands, paths, gaps and whether
the result is branch-local, an SDLC integration candidate, or the real combined product.
Do not add agent fan-out, scans, cleanup, approvals or publication without authority.
```

This is one review assignment with the relevant lenses, not permission to spawn multiple roles. Required native security assessment, if triggered by the accepted change and authorized, remains a separate bounded workflow; #33's publication does not authorize it. [R01, R09]

### 15.4 Delivery sequence

Land the accepted baseline separately where the existing policy requires it. Keep runtime helper/caller and their regression tests coherent; they can share a scoped implementation PR with the approved documentation. Separate commits are useful when they preserve a reviewable regression/repair boundary, but do not manufacture one commit per test.

Prefer final joint qualification after WP1 is landed; if WP2 is developed in parallel, reconcile shared `_sdlc_state.py`, `sdlc.py` and control-test edits semantically before the final run. No permanent version-detection shim should accommodate an unmerged proposal.

After actual commit/push/PR authority, read back exact candidate, checks and remaining blockers. Prepare the `verification.md` entry from observed evidence, not from this plan. Keep code/procedure readiness and real product outcome status separate. No SDLC package version/status change, host adoption, ontology publication, release or worktree removal is authorized by implementation completion.

## 16. Acceptance criteria

| ID | Acceptance condition | Primary evidence |
|---|---|---|
| AC2-01 | The actual Issue #33 revision/route/mechanism and exact policy edits are accepted where required; source and scope are bound without invented authority. | WP2.1 record, actual baseline/decision references. |
| AC2-02 | Controlled competing starts on main and linked checkouts establish one owner and reject the other request with truthful identity. | T01–T03, T31. |
| AC2-03 | Existing active, paused, empty/malformed/unsupported and redirected state cannot be replaced by a new start. | T03–T08. |
| AC2-04 | Pre-/post-publication interruption and secondary failures preserve their actual ownership state; no automatic takeover, rollback or silent fallback occurs. | T09–T15. |
| AC2-05 | Native linked worktrees isolate active state, success/failure output, pause/resume and retained history. | T16–T21. |
| AC2-06 | Repository identity follows the intended script/worktree and relevant shared-resource boundaries are explicit without a global start lock or irrelevant common-state invalidation. | T16, T17, T22, T24; C01. |
| AC2-07 | Source/HEAD/control/baseline changes reject incompatible prior verification; original evidence remains unchanged. | T23, T25–T27, T30, T32. |
| AC2-08 | Same-scope explicit control refresh uses actual pause/resume; unsupported baseline/scope changes remain explicit decisions rather than hand edits or invented commands. | T28; procedure review. |
| AC2-09 | Existing task/PR/handoff reveals owner, physical copy, accepted intent, actual candidate, material overlap/resources and integration responsibility without active-state migration or a second database. | C01 and approved text. |
| AC2-10 | The actual supported Windows/native entry and existing supported-platform tests qualify the selected filesystem primitive; WP1 integration is coherent where deployed. | T07, T08, T22, T30–T32 and actual host/CI evidence. |
| AC2-11 | Final R2 verification and required independent review cover the frozen SDLC increment; safety, retained history, package status and proportionality constraints remain intact. | Full receipt, review, diff and evidence readback. |
| AC2-12 | The actual combined MCP/SHACL target satisfies its accepted consumer and higher product outcome, with fresh evidence and owner disposition. | C02, shared with WP8; not replaced by T29. |

**Completion states:**

- **Implementation incomplete:** necessary code, tests or approved procedure remains unfinished.
- **Implementation complete, qualification incomplete:** the candidate exists but a required native Windows/filesystem/independent check is not established.
- **SDLC increment qualified, real integration pending:** AC2-01–AC2-11 satisfied; AC2-12 has a named owner and actual dependency/reference. This is not complete real-product acceptance or unconditional #33 closure.
- **Work package/outcome complete:** every applicable acceptance condition, including the actual combined product, has observed evidence and accountable disposition.

Do not use an old completed receipt, a schema pass, a test count, a clean merge or a terminated process as a substitute for the relevant acceptance condition.

## 17. Recovery and rollback after delivery

Preserve every valid active schema-2 record and its history. The new publication algorithm is not a data migration; a valid existing active file remains valid input for the current lifecycle. There is no reason to reinitialize it, relabel its owner or clear it because the helper changed.

If the new primitive is unqualified or fails on an actual accepted location, stop **new starts at that affected boundary** and retain the exact failure. Continue safe read-only diagnosis and independent authorized work elsewhere. Obtain a small forward repair or accepted alternative design. Do not automatically fall back to the old racing writer or change filesystem/permissions.

If source rollback is separately authorized, treat the old initial-publication race as restored until requalified. Coordinate dispatch so an already loaded older helper does not compete in a checkout claimed to have the repaired guarantee. Do not kill unrelated processes or manipulate tasks to make rollback convenient. Preserve WP1's coherent receipt writer/schema/reader if it is already deployed; reverting WP2 must not silently downgrade evidence semantics.

After either forward repair or accepted rollback, retain the failure and run fresh applicable verification on the actual resulting candidate. Any existing temporary-name alias is handled through exact owned-path inspection and current artifact policy; it never authorizes worktree cleanup.

## 18. Bounded research probe supplied with this plan

The companion `publication-mechanism-probe.py` and its actual JSON result record a **14-observation research check**, performed in this conversation in a Linux container using Python 3.13.5, Git 2.47.3 and an overlay filesystem. All 14 observations matched their stated mechanical expectations.

The intentionally unsafe synthetic check-then-replace schedule produced two successful processes. The no-overwrite link publication produced one successful process and one rejected contender identifying the published probe task. Further checks covered occupied valid/empty/malformed/paused content, observed interruptions on either side of publication, exact private-alias removal, subsequent atomic update, occupied directory/symlink behavior and two actual linked Git worktrees publishing independently.

This is **not** execution of the repository's `sdlc.py`, a maintained #33 regression, native Windows/NTFS/DCG qualification, power-loss testing, or a complete linked begin/verify/pause/resume exercise. The probe transparently implements the relevant algorithmic patterns on synthetic records to assess the selected primitive. Its native Git check establishes topology/publication only. The mandatory repository and host tests above remain unperformed by this research.

The probe creates only fresh synthetic temporary resources and retains them for inspection; it performs no network call, reads no user checkout and does not supply a cleanup tool. Review it and use an authorized environment before replay. Its existence does not authorize bypassing a guard that rejects a proposed replay.

## 19. Implementer start brief

Begin at WP2.1 using Issue #33 and the actual accepted baseline, not by cleaning the six historical worktrees. Confirm WP1's deployed contract. Build the two anchor tests against the actual selected base and retain their real outcomes. Qualify the native no-overwrite primitive on the accepted filesystem before adopting it, implement only the bounded source/caller change, and prove both interruption sides and cross-worktree preservation. Apply only the approved policy snippets. Finish with actual native Windows and R2 independent qualification, and leave the real combined-product outcome explicitly pending until C02 is performed.

If a fact or capability is unavailable, record the precise affected step; do not invent a command, owner, approval, filesystem guarantee, concurrency pass or integration result. Unrelated authorized work should continue.

## 20. Sources and applicability

The P references are supplied source documents. R references are repository material read through the connected GitHub source. N references are primary tool/OS documentation researched for the proposed mechanism. They support the named behavior or observation, not approval of this design. Repository paths below are pinned to the observation base; refresh them only as part of the actual implementation baseline.

### Supplied basis

- **[P1]** `../implementation-plan.md`, sections 4–7, particularly WP2 and A03–A06; SHA-256 in section 2.1. Primary scope authority for this expansion.
- **[P2]** `../wp1-verification-evidence/implementation-plan.md`, exclusions, D8–D10 and delivery/interaction sections; SHA-256 in section 2.1. A proposal, not deployed functionality.
- **[P3]** `sdlcworktreelifecyclehandoff20260910.md`, observation/disposition questions and safety constraints; SHA-256 in section 2.1. Historical local evidence, not an inspected live filesystem.

### Repository sources

- **[R01]** [Issue #33 — independent worktree execution](https://github.com/Hadden-Industries/universal-ontology/issues/33), including its existing REQ/AC-001–008 and acceptance boundary; comments also read and returned none during preparation.
- **[R02]** [Native main-branch observation](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main), resolved to `79d187802f9255134c03d0786ff75181ed1070ee` during preparation. This says nothing about unpublished local changes or effective branch-rule enforcement.
- **[R03]** [`scripts/_repository.py`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_repository.py), Git blob `ee63cbbff392b394e6aa281f5789d0b63c9de82a`; script-root derivation/native Git agreement.
- **[R04]** [`scripts/sdlc.py`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc.py), Git blob `99abbbea11e9ff8b20db60c21ce5d0eb1b0370f1`; begin, verify, pause/resume/handoff and actual CLI grammar.
- **[R05]** [`scripts/_sdlc_state.py`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_sdlc_state.py), Git blob `f2a77a8df8b27953e8001ab4bc1a5860a5b3de07`; atomic update, local state and input-identity gate.
- **[R06]** [`tests/sdlc/test_pipeline_controls.py`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/tests/sdlc/test_pipeline_controls.py); existing standalone fixture, sequential rejection, lifecycle/history/freshness and guardrail tests. The relevant first 320 lines were reread; additional inherited test obligations must be preserved in the actual full file.
- **[R07]** [`docs/sdlc/howto.md`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/howto.md), Git blob `ed7c550af6dbe18ed63814f7f1768e22cb30535d`; proportional start, native entry points and useful-work evaluation.
- **[R08]** [TDD evidence and handoffs](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md), Git blob `8acdf0958b91e813a675536882aed154d3aac69e`; evidence, physical writer, independent verification and retention boundaries.
- **[R09]** [`REVIEW.md`](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/REVIEW.md), Git blob `99e7ad2cfe668bbd490f98d5d864bf49fa1b2eba`; risk-proportionate review and frozen targets.
- **[R10]** [SDLC control workflow](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.github/workflows/sdlc-control-tests.yml), Git blob `a75d5522ff2ff5f7a4e676768c57d3bb3c3e1225`; existing Windows/Ubuntu qualification surface, not a current successful run.

### Native capability research

- **[N01]** [Git worktree documentation](https://git-scm.com/docs/git-worktree): linked worktrees, shared/per-worktree resources, native identity and the meaning of `worktree lock`.
- **[N02]** [Git rev-parse documentation](https://git-scm.com/docs/git-rev-parse): supported root/Git-common/index path resolution rather than directory-name reconstruction.
- **[N03]** [Python 3.14 OS interfaces](https://docs.python.org/3.14/library/os.html#os.link): `os.link`, `os.replace` and native exception/availability boundaries. This does not qualify the installed filesystem.
- **[N04]** [POSIX.1-2017 `link`/`linkat`](https://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html): atomic link creation and existing-name failure semantics. The 2024-edition page could not be retrieved during preparation; no claim of having inspected that edition is made.
- **[N05]** [Microsoft CreateHardLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createhardlinkw): file/same-volume behavior, shared underlying file, permissions and documented filesystem limitations. Actual local host acceptance remains required.
- **[N06]** [Python 3.14 tempfile](https://docs.python.org/3.14/library/tempfile.html#tempfile.mkstemp): standard-library unique temporary-file creation. Reuse instead of predictable handcrafted file names.
- **[N07]** [Git command/environment documentation](https://git-scm.com/docs/git): native location overrides and optional locking scope; overrides can affect the asserted execution boundary.

## 21. Final statement to populate only after execution

```text
WP2 candidate: <actual frozen source/input identity>
Accepted requirements/route: <actual #33 baseline and decision references>
Initial-publication qualification: <actual filesystem/host evidence>
Competing starts / interruption: <actual outcomes and retained evidence>
Linked lifecycle isolation / freshness: <actual outcomes and retained evidence>
WP1 contract used: <actual deployed writer/schema/reader identity>
Final R2 verification / independent review: <actual results>
Coordination record and retained resources: <actual references>
Real MCP/SHACL integration: <passed / failed / pending; target, owner and reason>
Unresolved support or authority limits: <actual limits>
No additional cleanup, publication or release authority is inferred.
```
