# WP3 — Exact proposed policy and procedure amendments

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Prepared:** 10 September 2026.  
**Status:** proposal for exact configuration/policy approval; not applied.  
**Source anchor:** `Hadden-Industries/universal-ontology` at `79d187802f9255134c03d0786ff75181ed1070ee`.  
**Companion:** `implementation-plan.md`.

These edits implement the accepted WP3 direction only after the owner approves their exact text and executable interfaces. Preserve existing TA-02 conditions, authority boundaries, declared policy/package status and retained evidence. The proposed `record-resource-disposition` command and changed `status` contract are not existing commands/contracts at the source anchor.

Apply each insertion once at the named semantic anchor. If WP1/WP2 or another accepted change has moved or revised that anchor, reconcile the actual text and present the resulting precise delta; do not overwrite intervening work. Do not create additional copies of the requirements in generated skill directories. Ordinary approved skill activation remains a separate operation. The exact command and source changes are specified in the main plan.

## 1. `docs/sdlc/temporary-artefacts.md`

### 1.1 Insert at the end of TA-07, before TA-08

```markdown
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
```

### 1.2 Insert at the end of TA-08, before “Evidence basis and implementation limits”

```markdown
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
```

**Preserved:** the policy header, version/status, all seven TA-02 conditions, TA-04 evidence requirements, TA-06 prohibitions, existing Stop/lifecycle boundaries and native command-protection requirements. This amendment neither adopts a new retention period nor supplies a deletion implementation.

## 2. `docs/sdlc/temporary-artefacts-howto.md`

### 2.1 Replace the opening paragraph below the heading

Replace the paragraph beginning “This is a proposed extension to the supplied SDLC…” with:

```markdown
This procedure applies the temporary-artefact policy through the existing task
and handoff workflow. The approved resource-disposition helper records metadata
and presents read-only status. It does not execute resource disposal, create a
new orchestrator, grant permission or run cleanup from a hook. Policy and helper
adoption status remain recorded in the repository's existing approval records.
```

This text is for the accepted implementation, not a claim that helper adoption has occurred while this amendment remains proposed.

### 2.2 Insert after the operating sequence, before “Practical example”

```markdown
## Keep the post-handoff obligation visible

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
```

### 2.3 Append to “DCG and legitimate cleanup”

```markdown
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
```

**Preserved:** the existing operational example, non-forced Git route, existing inspection commands, no universal TTL, no synthetic broad adoption pilot and prohibition on equivalent-path guard evasion. Revise the earlier “statements only” explanation where necessary to avoid contradicting this approved metadata-only implementation; do not change its no-cleanup-orchestrator conclusion.

## 3. `docs/sdlc/subagent-playbook.md`

### Insert after “Collect, adjudicate and release resources,” before command-safety inheritance

```markdown
When resources survive a worker or implementation handoff, obtain their exact
locations, candidate/evidence identity, originating owner, remaining consumers
and proposed disposition with the worker's normal result. The coordinator names
the next actor and reassessment event in the existing handoff and retains required
evidence outside any disposable copy. Do not infer completion from a worker's
exit, cancellation or silence.

The coordinator may record dispositions without reopening a completed
implementation. A guarded operator action remains a separately visible pending
obligation, not authority to modify protection or dispatch the same operation
through a different tool. Confirm consumer release and actual evidence retrieval
before the normal disposal checkpoint. This adds neither automatic delegation
nor a new cleanup worker. Use the resource-disposition procedure in
`temporary-artefacts-howto.md`.
```

## 4. `docs/sdlc/howto.md`

### Insert before “Evaluation through useful work”

```markdown
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
```

## 5. `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md`

### Insert at the end of “Temporary artefact disposition,” before “Verification order and freshness”

```markdown
For a resource that survives the handoff, distinguish the originating execution,
resource owner, coordinator and next actor. Supply its exact identity/location or
safely scoped group, candidate, remaining consumers, retained-evidence/readback
reference, proposed disposition and reassessment event. Use the normal handoff;
no separate per-file register, reviewer or red-green commit is required.

The receiving coordinator retains these obligations outside any resource or
containing worktree that may be disposed of. Metadata can remain pending after
implementation handoff without reopening an implementation task. Use the actual
retained summary with the existing `--evidence-reference` argument. A record,
field or hash is not proof that the evidence was preserved or the operator was
notified.

If native protection blocks an otherwise appropriate operation, return the exact
observed denial and scoped operator request; do not execute another route to the
same deletion. A worktree being dirty after preservation remains dirty for the
native removal check. Do not clean away user edits or failed evidence to make it
removable. Actual removal is a separate observed outcome, not an inference from
this skill's successful implementation work.
```

## 6. Configuration and verification follow-through

These amendments are accompanied by the specifically proposed schema, Python metadata module, CLI/status change, native regression tests and the selector's one-path addition. The main plan inventories their exact responsibilities. The existing CI matrix and verification profiles are not changed by these text amendments.

No amendment is proposed to `AGENTS.md`, `REVIEW.md`, `.codex` hook/trust files, native DCG configuration, retention periods, branch rules or `.sdlc/PACKAGE_STATUS.json`. Inspect their actual compatibility; do not edit them merely for textual uniformity. Record an actual discovered conflict separately.

Verify the adopted Markdown with existing native formatting/link checks and focused semantic review. Check the actual record/status behavior through the regressions in the main plan. Presence of these paragraphs is not evidence of agent compliance, operator receipt, preservation or safe disposal.
