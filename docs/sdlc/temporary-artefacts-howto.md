# Applying the temporary-artefact policy

This procedure applies the temporary-artefact policy through the existing task
and handoff workflow. The approved resource-disposition helper records metadata
and presents read-only status. It does not execute resource disposal, create a
new orchestrator, grant permission or run cleanup from a hook. Policy and helper
adoption status remain recorded in the repository's existing approval records.

## Operating sequence

1. **Start:** use the existing change ID; inspect pre-existing work. Put task-owned
   disposable output in its own ignored subdirectory. Keep required evidence in
   the existing evidence system, not exclusively under scratch.
2. **Implement:** remove superseded scratch safely as you go. Promote a useful
   reproduction into a regression test or a genuine reusable helper into maintained
   tooling. Record only temporary survivors crossing a handoff boundary.
3. **Prepare final verification:** remove task-added probes, instrumentation,
   temporary dependencies and accidental scratch references from the deliverable.
   Rerun the applicable checks on the final source/test/configuration state.
4. **Review:** freeze the reviewed source as usual. Keep any precise inputs needed
   by an active verifier/reviewer. The reviewer checks the disposition but does
   not delete files from another task.
5. **At the agreed handoff and each applicable release checkpoint:** reconcile
   task-created locations using the procedure below. Merge, consumer acceptance
   and producer/coordinator retirement can release different resources. Collect
   results, secure required evidence and remove eligible, authorised and unblocked
   scratch. Inspect actual paths immediately before disposal; do not force a tool
   past a dirty-worktree or permission warning.
6. **Retain deliberately:** record a concrete remaining consumer or obligation,
   owner, next actor and reassessment checkpoint for each surviving owned group.
   When its checkpoint occurs, remove, promote or justify a new bounded use;
   do not carry forward an obsolete hold without checking its current basis.
7. **Close out:** report actual removals, retained evidence and remaining resources
   with scoped locations and approximate sizes, stating unknown sizes honestly.
   Separate justified retention, unresolved decisions and actual blocked operations.
   A metadata write or absent Git registration is not completed filesystem cleanup.

## Reconcile all task-created locations

Start with the creating task's output locations, capture/restoration manifests,
prior handoffs and recorded resource identities. Include external recovery copies,
archives and reconstruction-test directories; Git's worktree inventory cannot
discover these. Search only the known task scope. An empty disposition list means
no resources were recorded in that coordinator, not that no resources exist.

Separate retained captures/evidence from their disposable reconstruction copies
when their consumers or removal conditions differ. Use `owned-directory-group`
for such copies in the existing schema. Record approximate logical bytes and the
measurement checkpoint in the existing purpose/rationale or linked assessment;
do not extend the schema or recursively inspect unrelated storage just to obtain
a total. Resource records describe groups, not a new per-file asset register.

At the applicable checkpoint, inspect the authoritative consumer-release decision
and follow the producer's recorded locations to its related copies. Reassess each
group under TA-02; a merged source or retired worktree does not release an
independent recovery consumer. If a hold is superseded, record the decision and
release reference in a successor snapshot rather than rewriting historical records.
If any condition remains unresolved, name that condition and the next actor.

Before retiring the coordinator, reconcile its complete known resource list with
the receiving coordinator. Read back the receiving records and required evidence,
and obtain the receiving owner's acknowledgement. Stored records are scoped to
their coordinator: copying their JSON unchanged into another checkout is not a
valid transfer. Use new caller-input records in the receiving coordinator, link the
source record identities and transfer decision, and preserve the source history
outside the resource being retired. A scope error or missing record blocks a claim
of completed reconciliation, not unrelated implementation work.

Run native status after recording the current dispositions and compare its returned
locations with the scoped list above. For ordinary directory groups, status retains
the declaration without inspecting their contents; independently inspect the exact
authorised candidates before disposal. Required captures and active consumers must
survive. After a successful authorised operation, verify exact-path absence and
retained-evidence readability before recording `removed-confirmed`. For a real
denial, record `operator-blocked` with the actual result and received operator
request. Before an operation is attempted, keep an unresolved permission decision
as a hold; do not manufacture a denial.

Once every condition holds, carry out eligible disposal in the authorised scope;
do not replace action with another status update. When the user requires a merge
before cleanup, record that precise hold and revisit it after merge. The existing
implementation handoff remains distinct from disposal completion.

## Keep the post-handoff obligation visible

Retained source-named review copies must not enter product test discovery. Git
ignore rules do not constrain Jest or other test runners. Prefer a verified archive
that preserves original relative paths and entry hashes, or a separately owned
evidence location outside the runner's discovery roots. Before removing redundant
unpacked copies, verify archive readback and remaining reviewer/consumer needs.
If unpacked evidence must remain inside a checkout, qualify the actual configured
discovery: the real product test must be selected and the retained copy excluded.
Any necessary discovery configuration change needs its normal explicit approval.
Preserve original failed runs; never suppress a real source-test failure or broaden
fingerprint exclusions to conceal an evidence/discovery mismatch.

Select an explicitly authorised coordinator location that will outlive the
resources being considered. Use its existing task/Issue/PR and
`.sdlc/runtime/handoffs/` records. Pending records and required evidence must not
exist solely inside a worktree, or a containing worktree, proposed for disposal.
Identify the receiving evidence owner and actual readback, not just a directory
name, digest or download link.

Record one resource or one genuinely common owned group. Split groups whose
owners, consumers, preservation or dispositions differ. The metadata includes
identity, owner or ownership hold, purpose, candidate, consumers, preservation,
next actor and reassessment event. A completed task with a retained review
worktree is normal when its consumer and future obligation are explicit.

From the selected coordinator checkout, use:

`npm run sdlc -- record-resource-disposition --input <contained-json-file>`

The input is a contained regular UTF-8 JSON document conforming to the caller-input
branch of the maintained resource-disposition schema. A stored-output record is
not accepted as input. A new resource uses a null resource ID; the helper
returns the assigned identity. A later full snapshot names the same resource and
the exact record it supersedes. Retain earlier records. Conflicting successors
require an explicit reconciled snapshot; clock time does not select a winner.

The command only retains metadata. Its successful exit does not mean that a
resource is eligible, approved or removed. References and recorded command text
are data; the helper does not fetch them or execute them. An anticipated guard
restriction is held with a policy reference, not labelled as an actual denial.

`npm run sdlc -- status` presents the active task, retained resource dispositions,
a read-only native worktree inventory and explicit read problems. It works when
there is no active implementation. The JSON envelope separates recorded facts
from current observations and names its coordinator/host scope. Unattributed
worktrees must be reconciled with their owners, not cleaned up automatically.
Status neither crawls other worktrees' private evidence nor hashes their entire
contents; a same-HEAD observation is not fresh dirty-candidate verification.

For machine consumption use `npm --silent run sdlc -- status`, or the existing
direct Node/repository-Python entry. Ordinary npm lifecycle messages are not part
of the application JSON. This is an invocation-local logging selection, not a
change to `.npmrc` or the project's diagnostic retention.

A successful status read can contain held or operator-blocked resources.
A partial or failed read returns nonzero while retaining the available report.
Neither exit status means that implementation is verified or cleanup complete.
The verification and Stop controls keep their separate existing responsibilities.

## Practical example (illustrative, not executed)

Issue #123 adds a tenant-disclosure rule. The implementation has been committed;
independent review and rollout validation remain in progress.

| Artefact | Disposition | Reason/checkpoint |
|---|---|---|
| `.sdlc/tmp/issue-123/run-a/probe_disclosure.py` | Remove when redundant | The maintained regression now exercises the real protected-record fixture. |
| Maintained tenant-disclosure tests and fixtures | Keep | They are durable protection, not a temporary reproduction. |
| Local copied security report | Remove only after retained bundle is checked | Reviewers need the original scan evidence; local duplication does not add value. |
| Disposable exploit checkout | Keep briefly, then remove | A named reviewer is still validating the original attack path; collect its evidence first. |
| Accepted Issue baseline | Keep under record policy | Historical acceptance must remain identifiable. |
| Backfill script needed by Issue #128 | Retain or promote | Consumer #128 is concrete; owner records reconciliation and rollback release conditions. |
| Draft plan duplicated by the accepted baseline | Remove working copy | No unfinished decision or consumer needs the draft; the accepted reasoning is retained. |
| Temporary production telemetry | Remove in a later reviewed change | Its rollout purpose has not yet ended just because code was committed. |

An existing Issue/PR section is sufficient:

```markdown
## Temporary artefact disposition

Removed: owned run-a probes and duplicate outputs after regression promotion.
Promoted: disclosure reproduction -> tests/claims/test_tenant_disclosure.py.
Retained evidence: EV-017 at <actual restricted evidence locator>.

| Temporary item/group | Consumer or obligation | Owner | Remove when | Reassess at |
|---|---|---|---|---|
| Exploit checkout for issue-123 | Reviewer validating original finding | Security reviewer | Validation finishes and required evidence is retained | Review handoff |
| Backfill helper | Issue #128 and release recovery window | Data-service owner | Reconciliation accepted and recovery dependency released | Release outcome review |

Unresolved: none.
Cleanup affecting tested inputs: probe removal was verified before final review.
```

Replace illustrative locators with real records. A table is not evidence that
an archive exists or that a dependent task has completed.

## Inspection commands, not blanket deletion

Run from the intended repository root. Inspect the known task subtree only:

```text
git status --short --untracked-files=all -- .sdlc/tmp/issue-123/run-a/
git ls-files -- .sdlc/tmp/issue-123/run-a/
git ls-files --others --ignored --exclude-standard -- .sdlc/tmp/issue-123/run-a/
git worktree list --porcelain
```

These Git commands help inspect tracked/untracked status; they do not prove
ownership, safe directory traversal, completed consumers, or retention eligibility.
A filesystem inspection of the exact directory is also required; do not traverse
links into unrelated data. Do not paste a deletion command until its specific
scope and authority have been established.

For an authorised tracked removal, preview the ordinary version-controlled change,
then record it through the normal PR/commit process. For a disposable linked
worktree, inspect all required local data and commits first, then use the normal
non-forced Git operation. Neither operation authorises removal of user-owned or
unknown material.

## Why not add a generic cleanup skill or post-commit hook?

Cleanup is a completion responsibility of the lifecycle owner. A post-commit hook
cannot infer completion of human review, dependent jobs, rollback use, incident
preservation or evidence retention. A second orchestrator adds overlap with the
TDD, release and specialist workflows. Keep the policy in AGENTS.md plus the
referenced policy document, and put checks at the existing review/handoff points.

A future deterministic helper may enforce an owned-path allowlist, path containment,
no links, no active lease, exact preview, and unchanged candidates. Its validated
mechanical checks still cannot prove the absence of a business/retention obligation.
Such a helper needs separate destructive-operation tests and authorisation. This
package does not implement one.

## Retention and verifiable documentation

The right operation is often **preserve the useful record, remove the redundant
working copy**. GitHub Actions supports per-artefact `retention-days` within the
repository/organisation limit. Deleting a run also deletes its artefacts, and
artefact deletion is not reversible [S4-S5 in the policy]. Do not leave an accepted
evidence record pointing only at an expired download; arrange the required retained
copy before expiry. OWASP applies retention obligations to temporary debug logs
and their copies too [S6]. This policy intentionally specifies no universal TTL.

A plain removal commit is not secure erasure of historical data. An exposed secret
requires the security response route, including revocation/rotation as appropriate
[S7]. Do not use routine cleanup to erase inconvenient failures or an incident
record.

## Acceptance tests for the policy

No synthetic adoption corpus is enabled here. If a real cleanup defect needs
reproduction, use a disposable repository with synthetic data and known file
identities under that task's accepted scope. Assert
preservation/deletion effects and truthful handoffs, not just the presence of
words in SKILL.md. Required negative cases include another task's scratch, ignored
credentials, active consumers, symlink escapes, lost-only evidence, unknown
retention, and attempted deletion of active lifecycle control state.

## DCG and legitimate cleanup

Native DCG may allow some temporary paths and block `git worktree remove` under
`strict_git`. Neither changes TA-02's ownership, consumer and evidence predicate.
If blocked, report the exact operation and seek a scoped operator decision; do not
substitute `rm`, PowerShell, Python or a file tool to accomplish the same forbidden
action. The operator can perform approved maintenance outside the agent or use an
appropriately scoped native exception. Do not grant that exception yourself.

Retain the exact denied operation as data, its native rule or permission diagnostic
and actual result, the named
resource/owner, available preservation evidence and the scoped operator request.
Use the existing handoff/Issue channel; record whether the operator has actually
received or acknowledged the request. A local record alone does not notify an
operator. Continue independent authorised work where the blocked operation is
not a real dependency.

Before an authorised operator acts, recheck TA-02 against the actual resource,
including nested registrations, relevant dirty/untracked/ignored data, consumers,
retention and preserved evidence. A backup does not make a dirty worktree clean:
if non-forced Git removal refuses it, retain the refusal and seek the actual
next decision. Do not discard edits, stage/commit merely to clear the warning,
add `--force`, or use another deletion tool as a shortcut.

Record removal as confirmed only after the authorised native operation succeeds,
Git's registration inventory can be read, and the exact resource path is verified
absent through a permitted metadata check. Distinguish missing from inaccessible
paths and missing parent storage. Missing registration with a remaining directory
is not complete removal. A resource disappearing without operation evidence is
an unexplained observation, not retrospective approval. Retained evidence must
still be readable outside the disposed resource.

A branch, shared Git objects, evidence retention and secure erasure are separate
lifecycles. Worktree removal does not authorise those additional operations.
If no real resource is eligible and independently authorised, do not remove one
merely to complete an adoption exercise; state that live removal confirmation
remains unqualified.
