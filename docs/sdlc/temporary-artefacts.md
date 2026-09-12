# Temporary artefact lifecycle

Status: proposed repository policy, version 1.0.0 (2026-09-07).

Normative keywords such as MUST, MUST NOT, SHOULD and MAY use the meanings of
BCP 14 (RFC 2119 and RFC 8174), only when capitalised. These are proposed project
requirements, not a claim that a standards body mandates this exact policy.

## Purpose and scope

Keep the maintained repository and task workspace free of obsolete working
material without losing product assets, user work, reusable knowledge, required
evidence, or inputs to an unfinished task. Classify by purpose and obligation,
not by filename, age, generator, directory, or Git tracking status.

A temporary artefact is an output or resource created for a bounded engineering
purpose with an identifiable end to its useful life. Examples include exploratory
scripts, diagnostic instrumentation, draft notes, duplicate reports, disposable
validation checkouts, and intermediate data. A regression test, accepted baseline,
release package, or required security record does not become disposable merely
because the change that created it has been committed.

The same rules apply to developers and agents. They grant no additional tool,
filesystem, credential, publication, or lifecycle permissions. A read-only
reviewer reports cleanup findings; it does not delete anything.

## TA-01 — Classify and place deliberately

The creator MUST distinguish:

| Class | Treatment |
|---|---|
| Durable asset | Maintain with the product: code, regression tests/fixtures, contracts, accepted baselines, ADRs, useful runbooks, maintained tooling and licensed/provenance material. |
| Retained evidence | Store under the applicable access and retention policy: actual test results, accepted reproductions, review dispositions, security scan bundles and release/incident evidence. |
| Temporary working material | Keep only for a bounded use; remove when the cleanup predicate below is satisfied. |
| Uncertain or externally owned material | Preserve while resolving its owner, purpose, dependencies or retention obligations. |

An artefact MAY move from temporary to durable/evidence status, but promotion MUST
include an appropriate maintained location, ownership and verification/retention
arrangements. Renaming `tmp.py` to `utility.py` is not sufficient promotion.

New task scratch SHOULD use an isolated, ignored directory such as
`.sdlc/tmp/<change-id>/<run-id>/`, or a tool-managed disposable workspace. It MUST
NOT be the sole location of a deliverable, accepted baseline, retained evidence,
or input required by a downstream job. Do not put sensitive data in Git; use
approved restricted temporary/evidence storage. Keep ordinary scratch out of
commits. A committed transient document is permissible when it is deliberately
needed for collaboration or review and its disposition is recorded.

Ownership MAY be tracked for one isolated task directory rather than separately
for every scratch file. Shared locations need precise ownership boundaries. An
ignore rule prevents accidental staging; it does not authorise deletion.

## TA-02 — Remove at the appropriate completion checkpoint

The task owner MUST remove eligible temporary working material as part of task
completion, without requiring a separate cleanup request. Safe deletion requires
all of the following:

1. Ownership or explicit disposal authority is established for the exact material.
2. Its purpose and declared release/removal condition have been satisfied. For
   retained post-change working material, the supported change is durably recorded
   at the agreed checkpoint. Superseded scratch with no further role MAY be removed
   earlier; it need not be committed merely to become deletable.
3. Relevant tasks, agents, review jobs and processes have finished consuming it.
4. A scoped dependency check finds no concrete remaining use that justifies
   retention, or the receiving consumer has accepted an adequate replacement.
5. Required knowledge, reproducibility inputs and evidence have been promoted or
   archived, and the retained version is identifiable and retrievable.
6. No active retention requirement, preservation hold, recovery dependency or
   security/incident restriction prohibits deletion.
7. Removal is within scope, does not destroy unrelated work, and will not silently
   invalidate the claimed verification or required build/deployment behaviour.

A local commit is a useful checkpoint, not proof that review, merge, deployment,
rollback support, outcome validation or required retention has finished. Select
the checkpoint for the artefact, not one blanket event for every file. Do not
infer a remote backup or release from local commit success.

Once all conditions hold, keeping task scratch solely because it might be useful
someday is not acceptable. Where a condition cannot be established, preserve the
material and record the specific unresolved question, owner and reassessment
trigger; do not use uncertainty to retain everything indefinitely.

## TA-03 — Establish reasonable next use proportionately

Check the accepted plan, linked/blocked follow-up tasks, current PR/review work,
known subagent handoffs, relevant build/test/config references, and the applicable
rollout/recovery/incident obligations. Search only the scope needed for the
particular decision. Do not scan an entire organisation's backlog to delete a
known disposable local probe, or claim to have inspected inaccessible systems.

A reasonable next use identifies a consumer or obligation, the action for which
the material is needed, why the durable replacement/recreation is insufficient,
and a bounded decision point. Examples include pending regression promotion,
reviewer reproduction, a named dependent issue, and the supported rollback window.
A specifically evidenced expensive recreation may justify a bounded cache with
an owner; an unspecified possible future task does not.

For temporary material surviving a task boundary, the existing Issue/PR/handoff
MUST record its locator or task-directory group, owner, concrete retention reason,
consumer or obligation, and removal condition plus a review date/checkpoint.
Expiry is a reassessment trigger unless policy explicitly makes it a deletion
trigger and every safety condition is satisfied. There is no universal number of
days. Short-lived routine scratch removed in its creating task needs no separate
Issue, per-file ledger or permanent tombstone.

## TA-04 — Preserve value and evidence before discarding the working copy

Promote useful bug reproductions into maintained regression tests/fixtures;
material design knowledge into the accepted dossier or ADR; genuinely reusable
scripts into reviewed tooling; and required raw outputs into the evidence store.
Check that the retained item preserves the relevant information and can be read.
Fix links to point to the retained identity before discarding a cited local copy.

Do not replace execution evidence with an agent-written summary or a bare hash
of content that no longer exists. Retain the scope, source/test/config identity,
commands, material inputs/seeds, actual outcomes and required raw records. Required
counterevidence and failed results MUST NOT be discarded to leave a misleading
success-only record. Retention limits still apply: verifiability does not mean
keeping every draft, transcript, cache and copied log forever.

Sealed security scan bundles and accepted reproductions remain under their
workflow/evidence retention policy. Temporary exploit workspaces may be removed
only after required evidence is secured and validation/review consumers finish.
Do not edit a sealed bundle to clean it up.

## TA-05 — Use two cleanup passes around verification

Before final verification and review, remove task-added diagnostic hooks,
unneeded test harnesses, temporary dependencies/configuration, debug output and
other disposable material that affects the deliverable. Keep permanent regression
tests, supported migrations and required telemetry. An intentional temporary
production mechanism has its own owner and removal conditions; treat its removal
as an ordinary reviewed code change.

After the related change is recorded and all consumers finish, remove remaining
local scratch, duplicate outputs and disposable execution resources that satisfy
TA-02. A source, test, fixture, dependency, relevant configuration, input or
fingerprinted-state change requires fresh evidence to the extent required by the
repository gates. Do not reuse a previous green result as proof of a changed tree.
Pure deletion of detached scratch outside the test inputs need not force an
otherwise unnecessary rerun; it must not defeat a stricter configured gate.

The supported build/test path MUST work without undeclared task scratch. For a
suspected scratch dependency, or risk requiring reproducibility verification,
verify in a fresh disposable checkout with declared dependencies/configuration.
A clean Git status is not a test of this property.

## TA-06 — Do not use broad deletion as a cleanup shortcut

Use exact, inspected paths or a tool's documented disposal operation. Check actual
containment without following symlinks/junctions into unrelated locations. Do not
recursively delete shared scratch roots or another task's workspace. A dry-run
list MUST be rechecked if contents or ownership can change before execution.

This policy does not authorise repository-wide `git clean -fdx`, broad `rm -rf`,
`git reset --hard`, forced worktree removal, stash deletion, branch-history
rewriting, cloud teardown, deletion of user uploads or changes to global agent
configuration. Do not classify files as disposable merely because they are
untracked, ignored, generated, old, named `tmp`, or absent from the latest plan.

An already tracked temporary artefact is removed through an ordinary reviewed
change and normal commit authority. Do not silently amend or rewrite history.
Keep immutable accepted baselines under their retention policy; clean up draft
copies and mark superseded records rather than treating all closed-task documents
as rubbish. Suspected secret exposure follows the security response process;
ordinary deletion does not erase earlier copies or exposed credentials.

## TA-07 — Coordinate agent, workspace and control-state lifetimes

The coordinating task owner releases shared resources only after every consuming
agent/job has completed and its required output has been collected and retained.
Cancellation or failure is not evidence that partial work and diagnostics are
worthless; inspect and preserve anything required for recovery or investigation.
Each worker SHOULD return the locations, ownership, consumers and proposed
disposition of its temporary outputs with its normal handoff.

Before removing a Git worktree, preserve any needed unmerged or detached commits,
local changes, untracked/ignored data and review evidence, and establish that no
worker still uses it. Use the installed tool's supported operation, such as
non-forced `git worktree remove`, rather than recursively deleting its directory.
A failed safety check is a reason to inspect, not to add `--force`. Shared caches
and generated skill directories follow their owning tools' lifecycle; they are
not per-task scratch.

In the supplied scaffold, `.sdlc/runtime/active.json` and verification records are
lifecycle control/evidence state, not free scratch. Agents MUST NOT remove or alter them,
the Stop hook, or another control solely to bypass incomplete/failed verification
or make the workspace appear complete. Closing control state requires a separate
authorised lifecycle transition, after the necessary evidence is retained. The v2 helper provides explicit `handoff`/`pause`/`resume` operations; these do not
authorise release or delete retained run history. See the proportional workflow.

### Resource disposition across handoffs

When a temporary resource survives an implementation or review handoff, the
coordinator MUST make its disposition discoverable through the existing task,
Issue, PR or retained handoff record. Record the exact resource or safely scoped
owned group; originating execution and owner when known; purpose and remaining
consumers; relevant candidate/evidence identity; preservation location and
readback; recorded disposition; next actor; and reassessment event. Identify
unknown ownership explicitly rather than assigning it from a directory name.
Routine scratch removed within its creating task needs no additional register.

The coordinator collects worker results and consumer-release decisions. A worker
reports its resources but does not dispose of another worker's workspace. When
an operator must act, the coordinator records the actual scoped request and
remaining blocker. These responsibilities confer no new filesystem, Git,
credential, configuration or publication authority.

Implementation handoff and resource disposal are different outcomes. Removing an
active implementation pointer MUST NOT hide a retained resource obligation.
A justified retained or operator-blocked resource need not prevent an otherwise
valid implementation handoff; report that resource state separately. Actual
eligible, authorised and unblocked disposal remains a completion responsibility
under TA-02, not a task to defer indefinitely through repeated metadata updates.

Keep pending disposition records and required evidence retrievable outside any
resource or containing worktree that may be disposed of. An ignored local runtime
record is not by itself a backup. Before its coordinator location is retired,
obtain the receiving owner's acknowledgement of a retrievable transfer under the
existing evidence policy. Preserve earlier denials and failed results.

For an existing nested worktree, record both the inner resource and the outer
owner's containment dependency. Outer disposal MUST remain held while the inner
registration, consumer, ownership or retention obligation is unresolved. Avoid
creating a new managed worktree inside another task's worktree unless the actual
need and containment obligations are recorded. Do not repair this arrangement
by moving, pruning, forcing removal or recursively deleting without the normal
separate authority and native operation.

The resource-disposition helper records declarations and presents observations;
it does not decide deletion permission or execute cleanup. A recorded eligibility
assessment always requires fresh inspection and the existing authority before an
operation. `removed-confirmed` requires the actual authorised operation and
registration/filesystem readback; it is not a claim of secure erasure or branch
removal. File absence, an expired date, a merged branch or successful schema
validation supplies none of those decisions.

## TA-08 — Make disposition part of completion

At handoff, report a concise summary in the existing task/PR record:

- removed temporary material (exact paths or a safely scoped owned group);
- promoted artefacts and retained evidence locations;
- material kept temporarily, with consumer/reason, owner and reassessment trigger;
- unresolved disposal authority, retention or dependency questions;
- whether cleanup changed tested inputs and what verification followed.

Report `none created` or `none eligible` when true; do not invent cleanup work.
The task is complete when eligible disposable material has been removed and every
necessary survivor has an explicit disposition. Pending rollout/recovery use is
not a reason to withhold an otherwise valid implementation handoff, provided its
owner and future cleanup obligation are recorded. Unexplained leftovers and
missing required evidence are unresolved completion items.

The handoff summary MUST distinguish implementation verification, required
preservation, recorded resource disposition and actual removal. Name the next
actor and concrete reassessment event for every survivor or unresolved group.
Use the existing record rather than opening a new Issue for every resource.
A remaining ownership question can have Max as its decision owner without
retroactively making Max the resource's creator.

Read-only status can expose retained handoffs after implementation ends. It MUST
show its scope and read limitations, and distinguish recorded assessment from
current observation. An unrecorded worktree is unattributed in that view, not
abandoned. Access failure, malformed metadata, conflicting snapshots or a read
limit MUST NOT be reported as an empty inventory or a successful cleanup.

## Evidence basis and implementation limits

The lifecycle, classification and checkpoint rules above are proposed engineering
policy. The following primary sources establish relevant tool behaviour and
retention constraints; they do not scientifically validate this exact policy.

- [S1] Git `git-clean`: untracked/ignored deletion and dry-run/path scoping.
  `https://git-scm.com/docs/git-clean.html`
- [S2] Git `git-worktree`: worktree removal and administrative lifecycle.
  `https://git-scm.com/docs/git-worktree`
- [S3] Git `gitignore`: ignore patterns do not change already tracked files.
  `https://git-scm.com/docs/gitignore`
- [S4] GitHub workflow artefact deletion/retention: deletion is not reversible;
  deleting a workflow run also deletes its artefacts.
  `https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts`
- [S5] GitHub per-artefact `retention-days`, capped by repository/organisation policy.
  `https://docs.github.com/en/actions/tutorials/store-and-share-data`
- [S6] OWASP Logging Cheat Sheet, disposal: apply the required retention period to
  logs and their copies, including temporary debug logs.
  `https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#disposal-of-logs`
- [S7] GitHub sensitive-data removal: revoke/rotate exposed secrets first and handle
  historical copies through a coordinated security process.
  `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository`
- [S8] OpenAI AGENTS.md: repository instruction discovery and concise review rules.
  `https://developers.openai.com/codex/guides/agents-md/`
- [S9] BCP 14 keyword convention.
  `https://www.rfc-editor.org/rfc/rfc8174.html`

Instruction text, a checkbox, file age, or an agent's classification is not a
sandbox or trustworthy deletion boundary. Use existing tool permissions and
independent review. No deletion script or automatic Stop-hook cleanup is supplied.
