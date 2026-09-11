# WP2 — Exact proposed policy and skill amendments

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Status:** approval text only; not applied or accepted.  
**Requirements authority:** Universal Ontology Issue #33, SDLC-PARALLEL-01.  
**Read with:** `implementation-plan.md`.  
**Observation base:** `79d187802f9255134c03d0786ff75181ed1070ee`.

These three edits elaborate physical execution ownership, initial-start failures and integration evidence in the existing owners. They do not authorize a new scheduler, cleanup operation, reviewer fan-out, configuration waiver or product release. Recheck the exact target text on the implementation base and obtain approval for the actual diff. Do not edit generated `.agents/skills` copies directly.

## P-01 — `docs/sdlc/howto.md`

### Insertion A

Insert the following section after `## Start and scope` and its existing text, before `## Development entry points`. Preserve the existing start/baseline requirements.

```markdown
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
```

### Insertion B

Insert the following subsection at the end of `## Record evidence`, before `## Evaluation through useful work`.

```markdown
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
```

**Behavioral impact:** users can distinguish a rejected request, unacquired preparation and established task after a reporting failure. Parallel coordination stays in existing records. This wording assumes the selected complete-file publication mechanism has passed its acceptance gate; amend it if a different mechanism is explicitly accepted.

## P-02 — `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md`

Under `## One implementation writer`, insert these paragraphs after the paragraph ending `implementer revise held-out grading tests.` Keep existing verification/independence text and all other sections.

```markdown
The single-writer boundary concerns one physical copy. Independent implementations
use separate worktrees even when their proposed paths differ. Separate copies may
change the same logical contract; record its ownership, dependency and integration
order rather than assuming a textually clean merge resolves semantic overlap.

Use the existing handoff to identify the physical worktree, actual candidate,
implementation owner, accepted intent, relevant shared mutable resources and
integration owner. Link native local task/run identity where available; do not
create a second task ledger or change active state merely to report progress.
A verification copy may contain the same candidate bytes as the implementation;
that does not substitute for an independent oracle, fresh context where required,
and frozen inputs. Branch-local evidence must not be presented as evidence of an
untested combined target.

The coordinator releases shared resources only after their actual consumers finish
and required evidence is retained. A wait in another worktree is not by itself a
reason to pause this execution. Report the concrete dependency, capability or
owner decision that prevents the next authorized step; this skill adds no automatic
agent dispatch, global lock, lifecycle transition or cleanup authority.
```

**Behavioral impact:** distinguishes physical-copy ownership from logical overlap and clarifies the independent-verifier candidate contract without creating another orchestration role.

## P-03 — `REVIEW.md`

Under `## Independence, target and handoff`, insert this paragraph before `Report target, accepted brief/baseline...`.

```markdown
When cross-worktree integration is material, state whether each cited result covers
an isolated branch/candidate or the actual combined target. Identify the integration
owner, relevant input revisions, semantic overlap decisions and outstanding combined
consumer checks. Check that source, baseline and control movement received fresh
applicable evidence and the required owner decisions. Do not accept a clean merge,
copied verification record or another branch's successful run as proof of combined
behavior. Keep this in the normal risk-proportionate review and existing handoff;
no separate reviewer or additional dossier is mandatory solely for this statement.
```

**Behavioral impact:** adds an explicit target-coverage statement to existing review; does not change independence requirements, approval authority or reviewer count.

## Factual verification record

No proposed passing paragraph is supplied for `docs/sdlc/verification.md`.
After actual execution, append its source/host/filesystem/receipt identity,
commands, results, limitations and C02 status. Record controlled fixture results
as control evidence, not operational adoption or a completed product integration.
