# WP3 — Make resource release owned, visible and non-destructive by default

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Date:** 10 September 2026.  
**Parent:** `../implementation-plan.md`, §5 WP3; §7 A07 and A08.  
**Implementation repository:** `Hadden-Industries/universal-ontology`.  
**Observed source revision:** `79d187802f9255134c03d0786ff75181ed1070ee`.  
**Status:** researched implementation proposal. Neither this document nor its companion schema authorises implementation, configuration changes, resource disposal, GitHub writes, deployment or a change in SDLC version/status.

## 1. Decision and intended result

Implement WP3 as an extension of the existing handoff records and an on-demand, read-only status view. Retain the existing human/operator disposal procedure. Do not create a cleanup command, daemon, scheduler, global registry, cross-repository service or new permission mechanism.

The proposed increment has three parts:

1. Make the coordinator, receiving consumer and next actor explicit when a temporary resource survives a handoff.
2. Add a metadata-only `record-resource-disposition` subcommand to the existing `sdlc` entry point and a versioned resource-disposition record in the existing `.sdlc/runtime/handoffs/` directory. Record follow-up decisions without requiring a new active implementation task.
3. Replace the active-only `status` result with a documented status envelope that includes retained dispositions even when `active.json` is absent, plus Git's native worktree inventory and explicit gaps.

**No WP3 production code executes resource removal.** Its only writes are its own new disposition records and bounded publication scratch. A command text recorded after a guard denial is data, never an executable recovery instruction.

This selects the executable-visibility option that the parent makes conditional on acceptance. The owner must accept the exact interface, record and policy changes before implementation. The procedural amendments can be adopted independently, but procedural adoption alone must not be described as completion of the executable status requirement. [S01, S07–S12]

**Successful outcome:** a maintainer can locate every in-scope surviving resource, understand its purpose and required evidence, identify its owner or ownership hold, and see the next action after implementation handoff. Required evidence is recoverable outside a resource that may be disposed of. A blocked removal remains visible without changing guard policy or trapping unrelated implementation work.

The outcome is not zero worktrees, zero pending records, a clean Git status, or an automatic approval to delete.

## 2. Research basis and precise limits

### 2.1 What the supplied materials establish

The parent assigns WP3 P1 priority, coordinator responsibility, operator responsibility for blocked operations, dependence on WP0 preservation, and coordination with WP2 record changes. It permits existing handoff/status changes and narrowly scoped tooling only when accepted. A07 concerns actual recoverability; A08 concerns a held disposition for active consumers, unknown ownership, nested registration or guard rejection. Its named negative cases remain in §15 below. [S01]

The uploaded worktree handoff reports six dirty resources in `.sdlc/runtime/worktrees/`, including a baseline worktree nested in the SHACL worktree. It reports candidate copies, untracked plans/reviews and guard restrictions. These are historical observations, not a current local inventory or proof of abandonment. WP0 provides the recovery/ownership procedure; its supplied plan is not proof that the procedure has been executed. [S02, S03]

The handoff asks whether near-duplicate candidates weaken independence. This plan does not adopt that question as a finding. Candidate copies can be legitimate; verification independence depends on the reviewer, oracle, permissions and stable candidate identity. Likewise, a branch at the base revision with dirty work does not prove an omitted commit. Preserve the source's questions and obtain actual owner evidence before a causal disposition. [S01–S03, S15]

The handoff's assertions about unique content and earlier loss-free removals have not been independently tested on the Windows filesystem. Git cleanliness does not itself establish that ignored evidence, external consumers or retention obligations are absent. Do not reopen the three earlier removals without a concrete preservation gap; do not use their reported cleanliness as blanket disposal precedent. [S02, S11, S21]

### 2.2 Current source observations

The GitHub connector resolved `main` to the revision above during this research. At that revision:

| Observation | Source | Consequence |
|---|---|---|
| `record_task_disposition` writes a handoff containing the active task and evidence reference, then removes the active pointer on implementation handoff. | `scripts/sdlc.py` | The history exists; implementation completion need not keep the active pointer alive. |
| `status` is a lambda that loads and prints only `active.json`. | `scripts/sdlc.py` | An idle/handed-off checkout cannot expose pending resource decisions through this command. |
| The existing policy already requires preservation, consumer completion, exact scope and a separate authorised lifecycle transition. | `temporary-artefacts.md`, TA-02/04/07/08 | Extend visibility; do not invent a different disposal predicate. |
| The operational guide already anticipates a `strict_git` block and operator escalation. | `temporary-artefacts-howto.md` | A blocked operation is not necessarily a classifier defect or permission to use another tool. |
| The playbook assigns coordination and collection of workers' evidence before release. | `subagent-playbook.md` | Name the next actor and receiving evidence location at the existing handoff. |
| SDLC check selection enumerates Python helper paths explicitly. | `scripts/selectPullRequestChecks.js` | A new helper must be added to `CHECK_INPUTS.sdlc`, with a real-Git routing regression. |

These are inspected-source findings, not a reproduced Windows release incident. Searches for `handoffs` and `worktree` found policy, lifecycle and test references; they did not establish a generic SDLC worktree-creation/removal orchestrator. The implementation discovery slice must trace actual creating sessions/tools, not assume such an orchestrator exists. A bounded issue search returned related #30–#33 records, not a separate resource-visibility item; repeat the duplicate check before filing. [S07–S13, S18]

### 2.3 Native capability research

Use Git's documented `worktree list --porcelain -z` and path-resolution interfaces, the existing Python JSON/JSON Schema stack, and ordinary file metadata APIs. Git owns registration, branch/HEAD and worktree administration. Our residual custom work is the association between those observations and the project's handoff obligations. Do not introduce GitPython, a second Git parser, a lease package, a cleanup SDK or a new database. [S19–S24]

Git's machine-readable inventory supports paths containing whitespace/newlines. Default `git status` excludes ignored files and can perform an optional index refresh; selected inspection should use the documented ignored-file interfaces and `--no-optional-locks`. File absence checks must distinguish a missing entry from access or I/O failure. These facts constrain the implementation; they do not prove disposal authority. [S19–S22]

References to GitHub Actions evidence must include the actual retention/readback boundary when relevant. Artifacts can expire and are deleted with their workflow run; a URL or digest is not a retained copy. No universal number of retention days is selected here. [S25]

### 2.4 Work performed for this deliverable

The parent, handoff and supplied WP0–WP2 deliverables were read. Current relevant source, native documentation and bounded repository search results were inspected. The companion schema and illustrative records were mechanically checked in the research environment; the separate check record identifies exactly what was exercised. No implementation of the new commands, repository test suite, local Windows observation, live guard exercise, worktree removal or completed WP0 preservation is claimed.

## 3. Scope, authority and dependencies

### 3.1 Included and excluded

| Included | Excluded |
|---|---|
| Resource facts in the existing handoff/evidence channel. | New task database or global ownership service. |
| Read-only native registration inventory and metadata association. | Filesystem crawling to discover every possible task directory. |
| Explicit unknown, retained, blocked and confirmed historical dispositions. | Age-based cleanup, lease expiry or automatic ownership takeover. |
| Operator request and post-operation readback procedure. | A `cleanup`, `release`, `remove` or `execute-recorded-command` subcommand. |
| Preservation locators/readback references supplied by WP0 or later real work. | A new backup/archive implementation or credential-bearing publication. |
| Same-repository, authorised coordinator records. | Automatic discovery/reading of every other worktree's private runtime store. |
| Tests of status, recording, held outcomes and absence of deletion. | Changing DCG, hooks, permissions, branch protection or installing a scan. |

The six historical resources are initial reconciliation subjects, not disposable regression fixtures. The main and outer SHACL checkouts remain outside their disposal scope. The main checkout may host coordinator evidence only with explicit recording authority; being outside disposal scope does not confer general write authority. [S01–S03]

### 3.2 Proposed risk and delivery route

Use the existing acceptance process. Propose R2 for the executable combination because it changes a public status result and records consequential cross-task retention/removal claims. This does not classify each individual metadata update or prose correction R2. The actual route and exact policy/schema/interface changes require Max's acceptance. A new metadata-recording capability should not be declared `--no-new-functionality` solely to avoid selection research.

Reuse the existing accepted implementation item if it genuinely covers this extension. Otherwise prepare one scoped change item for resource disposition visibility, linked to #33 and the parent, rather than broadening #33 silently or creating a ticket per field. Its accepted Issue snapshot uses the actually supported baseline route. Do not assume WP6's Markdown baseline support has landed.

### 3.3 Interfaces with other work packages

| Work package | WP3 consumes | Boundary |
|---|---|---|
| WP0 | Actual inventory, preservation receipts, ownership/consumer decisions and holds. | Never prefill a successful recovery from the WP0 plan alone. Missing preservation blocks disposal, not read-only design work. |
| WP1 | Accepted text/capture/reporting behavior and the deployed receipt contract. | Do not introduce a second verifier receipt or reimplement the Unicode fix. Recorded process-local workarounds remain labelled when still necessary. |
| WP2 | One physical implementation owner, native root identity, worktree fixtures and accepted publication primitives where applicable. | Do not change its active-task acquisition or build shared-checkout multiwriter support. |
| WP4 | Actual guard incident evidence when diagnosis is warranted. | An intentional strict removal block is recorded, not repaired by WP3. |
| WP5 | Native bundle identity and retained proof gaps. | Never mutate a sealed scan bundle to remove a failed result. |
| WP7 | Proportionate record placement and verification cadence. | No tracked run diary that continually invalidates final verification. |
| WP8 | Actual adoption and receiving-owner evidence. | No automatic deployment to WebVOWL/ONI or a cross-repository status service. |

## 4. Responsibility and release trigger

The coordinator owns the disposition decision workflow, not necessarily every originating file. Each resource record distinguishes its owning execution, known owner, coordinator/steward and next actor. Max may own the unresolved decision without being retrospectively represented as the creator.

A worker returns the exact resource or group, candidate, outputs, consumers and proposed disposition through its normal handoff. The coordinator collects outputs and obtains the relevant consumer-release decisions. The operator performs a separately authorised operation when the guard or permissions require that route. The receiving evidence owner confirms that required retained material can be retrieved.

The disposal checkpoint is the agreed handoff/checkpoint **and** satisfaction of all existing TA-02 conditions, including preservation and release of relevant consumers. Session termination, successful tests, a local commit, PR merge or elapsed time is insufficient by itself. Superseded scratch can follow the policy's earlier bounded checkpoint; do not turn this rule into an obligation to retain every temporary file until project completion. [S11, S12]

An implementation can be correctly handed off while resources remain deliberately retained or operator-blocked. The completion statement must say so and name the next actor. It must not say all cleanup completed. Conversely, an actually eligible, authorised and unblocked disposal must not be postponed indefinitely merely because recording a pending state is convenient.

## 5. Selected design: retained handoff metadata, not a disposal engine

### 5.1 Physical placement

Use a stable, explicitly selected coordinator checkout and its existing directory:

```text
<coordinator>/.sdlc/runtime/handoffs/
  <existing-task-handoff>.json
  resource-<recordId>.json
  resource-<later-recordId>.json
```

Existing task handoffs are unchanged. A resource record is a typed handoff supplement for one resource or one precisely scoped owned group. Multiple members may share one record only when owner, consumers, preservation and disposition genuinely apply to every member. Use separate records where their conditions differ; do not store a whole-worktree decision for a parent containing an independently owned nested worktree.

The coordinating record and retained evidence MUST NOT exist solely inside a resource or containing worktree proposed for disposal. The normal Issue/PR/handoff must identify the actual coordinating location. A file under ignored runtime is local evidence, not automatically backed up: verify its required retained copy under the existing storage policy. Before a coordinator itself is retired, its receiving owner must acknowledge a retrievable transfer of pending records and history. That is a normal evidence handoff, not an automatic store-discovery/import feature.

Do not put new shared mutable lifecycle state under `git-common-dir`. Do not write into each target's `active.json` or create a new active execution merely to record post-handoff obligations. One coordinator writes its record set; workers return facts instead of independently mutating that set.

### 5.2 Record semantics

The companion `resource-disposition.schema.proposed.json` describes the proposed input and stored record using one maintained Draft 2020-12 schema. Adopt it as `.sdlc/schemas/resource-disposition.schema.json` only after exact approval. It does not modify the active-task schema, WP1 verification-run schema or package version.

| Field group | Required meaning |
|---|---|
| Record envelope | Record kind/version; writer-assigned record ID; actual recording timestamp; input byte digest; coordination task and writer/decision references. |
| Resource identity | Stable local resource ID, host, kind and exact member paths; native identity reference when available. A path, branch or basename is not lifetime identity. |
| Ownership | Actual task reference; actual task ID when known; owner or null; coordinator and next actor. |
| Purpose/candidate | Why the resource exists; independently retained candidate/input identity reference, where relevant. |
| Consumers | Named requirement, reviewer, process, release or recovery consumer; required/released/unknown state and evidence for release. |
| Preservation | Required/not-required/incomplete/verified state; actual retained location, readback reference and independence from the disposable resource. |
| Disposition | One descriptive recorded disposition, reasons/blockers and reassessment event. |
| Review/removal evidence | Inspection and TA-02 assessment reference, actual operation or denial reference, and post-removal observation when confirmation is asserted. |
| Supersession | Exact earlier record IDs for the same resource that this complete snapshot supersedes. |

The schema distinguishes caller input (`recordType: resource-disposition-input`) from writer output (`recordType: resource-disposition`). The recorder must require the input branch explicitly, not accept any document merely because it validates against the root union. Stored record identity, timestamp, input digest, scope and `confirmationObservation` are writer-owned. `entry.candidate.head` and its observation time permit comparison with a current native HEAD; its dirty-input reference remains separate. Missing candidate facts stay null rather than being inferred from the baseline.

Metadata references are opaque references, not remote fetch instructions. Never execute or automatically follow a command, URL, local path or plugin invocation found in a record. Record content may be wrong or malicious; schema validity does not establish approval, ownership, successful preservation or authenticity.

### 5.3 Descriptive dispositions

| Recorded disposition | Meaning and mandatory limit |
|---|---|
| `held` | A specific ownership, preservation, identity, nesting, access or decision gap remains. A next actor and reassessment event are required. |
| `retained-for-consumer` | A named consumer/obligation needs the resource. It does not imply that preservation is already complete. |
| `preserved-pending-review` | Required content has a verified retained copy, but review/disposition is not complete. |
| `operator-blocked` | An actual guard/permission denial prevents the proposed authorised path. Keep its exact evidence, native rule or permission diagnostic, and scoped operator request. A merely anticipated block is `held` with a policy reference, not a fabricated attempted denial. |
| `eligible-for-approved-removal` | The coordinator has recorded a supported TA-02 assessment. This is historical assessment, not current deletion permission. Fresh inspection and existing authority are still required. |
| `removed-confirmed` | The authorised native removal, its actual outcome and registration/filesystem readback have been retained. It confirms the named resource and observation time, not secure erasure or branch deletion. |

Owner may be unknown in a held/blocked record. A record asserting eligibility or confirmed removal requires a known owner or explicit disposal authority, released consumers, appropriate preservation evidence, and the inspection/assessment references. These checks constrain declarations; they do not replace the human decisions.

No record contains an executable `approvedToDelete` flag. `status` must present **recorded disposition**, **current observation** and **attention/reassessment reasons** separately. It never emits a machine-authoritative removal permission.

### 5.4 History without a second current-state database

Write a complete new resource snapshot for each material cross-handoff decision. Do not mutate the original denial, original handoff or previous snapshot. The stable `resourceId` associates revisions; `supersedes` identifies the exact earlier snapshot(s).

The status projection selects the unique unsuperseded leaf for each resource. Do not order by filesystem mtime, clock time or lexicographic UUID. Reject dangling, self-referential, cyclic or cross-resource supersession. If accidental concurrent updates produce two leaves, show both as a conflict and preserve them. An accountable reconciliation creates one new snapshot referencing both. This is bounded local history interpretation, not general multiwriter support or a distributed consensus service.

An omitted resource is not removed. Closing task A cannot drop task B's resource facts. Same-name files, identical candidate SHAs or re-used paths cannot merge distinct resource identities automatically. A later directory/registration at an old removed path produces a new-or-reappeared observation, not restoration of the old disposal permission.

## 6. Proposed CLI contracts

### 6.1 Metadata-only recording

**New interface, not currently installed:**

```text
npm run sdlc -- record-resource-disposition --input .sdlc/tmp/<task>/resource-disposition.json
```

Input is a contained, inspected, regular UTF-8 JSON file in the coordinator checkout. No URL, stdin-command interpretation, globbed input set, caller-selected output path, shell command or arbitrary external reference loading is supported. The filename above is illustrative, not a mandatory per-file scratch convention.

The input schema permits `resourceId: null` for a new resource. The writer assigns the stable ID and returns it with the new record ID/path. Updates supply the existing resource ID and exact superseded record ID(s). Validate that the resource already exists locally, that predecessors belong to it, and that every currently known leaf being reconciled is named; a non-null unknown resource ID is not a way to invent an originating execution. Concurrent publications can still create the visible conflict described in §5.4. `recordedAt`, `recordId` and the input digest are writer-owned, not caller assertions.

Algorithm:

1. Derive the coordinator root through the existing script/Git boundary. Inspect the contained input and bounded handoff directory without following symlinks/junctions.
2. Decode strict UTF-8; reject duplicate JSON object keys and non-JSON numeric constants using Python's native decoder options; require and validate the approved caller-input branch. Reject a stored-output document submitted as command input even though the root schema also describes stored records.
3. Validate local record associations and required declaration/evidence fields. Reject a resource set that claims disposal of the coordinator's main worktree, or embeds that worktree in an owned-directory group.
4. For a proposed `removed-confirmed` record, require the actual successful operation evidence and perform fresh, permitted metadata readback as specified in §9. For a worktree, both registration and path absence are required. For an owned-directory group, check every exact authorised member and reject unresolved contained worktree registrations; `not-applicable` registration is only a group-member declaration whose actual context has been checked. Failure to establish the readback rejects the confirmation; record a held observation instead through a new explicit input.
5. Construct the complete stored snapshot, validate it, and publish under a new unique name in the existing handoff directory without replacing history.
6. Read back the published bytes. Return the record and resource identities; do not modify active task, verification receipts, source, resource paths or Git registration.

Success means **record retained**, including for `held` or `operator-blocked`. It does not mean release approved or resource removed. Parse/validation, storage and publication failures return nonzero. If recording succeeds but its acknowledgement fails, the stored record remains; inspect before retrying rather than claiming no record exists.

Publication should reuse the already-qualified complete-file/no-overwrite standard-library approach from WP2 when accepted on the selected filesystem. Reuse a genuinely generic primitive if that implementation exposes one; do not call an active-task-specific function to write a different object or rename it deceptively. Otherwise use the same small native preparation-plus-`os.link` composition locally. Unsupported capability is an explicit adoption gap, not a silent copy/replace fallback. Do not turn this into a new common storage framework. [S05, S24]

### 6.2 On-demand status

**Changed interface:** `npm run sdlc -- status` returns a JSON envelope, not the old flat active-task JSON. This is an explicit output-contract change. Inspect callers before implementation, update actual consumers and documentation in the same accepted increment, and test the new output. Do not retain an undocumented compatibility alias or guess that no consumer exists.

For machine consumption use the supported invocation-local silent form:

```text
npm --silent run sdlc -- status
```

The existing direct entry `node scripts/runRepositoryPython.js scripts/sdlc.py status` is also a qualification target. The ordinary `npm run` spelling remains suitable for interactive use but npm may emit its own lifecycle messages. Do not strip arbitrary leading output to manufacture valid JSON, mutate `.npmrc`, or assume `--quiet` equals `--silent`. The recorder has the same launcher distinction when its acknowledgement is consumed as JSON. Inspect actual pre/post script side effects; a launcher log/cache write is not a WP3 resource mutation, but must not be described as zero filesystem activity. The WP3 reader itself performs no writes. [S26]

Required envelope fields are:

```text
statusFormatVersion = 1
observedAt
scope = { coordinatorRoot, gitCommonDirectory, host, recordLocation }
active = original active-task object | null
activeReadState = present | absent | unreadable | invalid
resourceDispositions = [{ recorded, currentObservation, attention }]
unattributedWorktrees = [{ nativePath, nativeHead, nativeAttachment, observation }]
legacyHandoffsWithoutResourceMetadata
readProblems = [{ code, location/reference, explanation }]
```

`active: null` is valid only with an explicit absent/read-problem distinction. An unreadable or malformed file is not an idle checkout. Readable current dispositions remain visible if the active record is unreadable.

The new command returns zero when the requested bounded status view was read successfully, even if resources remain held, retained or blocked. Return nonzero with partial structured data for malformed records, conflicts, incomplete inventory, unreadable state or safety/coverage gaps. Zero is successful reporting, not product completion. Ordinary known retention is not a process failure.

Reserve stdout for one JSON document. Route repository-location command echo and diagnostic text to stderr for these two new/changed structured-output paths; do not refactor all unrelated lifecycle output. Ensure pipe/flush errors do not produce a success claim. Use the accepted WP1 reporting behavior where available.

Do not make the Stop hook call this inventory. Preserve its bounded continuation behavior and the existing verification/handoff gate. The resource status view does not waive verification and pending valid retention does not keep `active.json` open forever. Use the existing `--evidence-reference` to link the implementation handoff to the coordinating disposition record/task; no new handoff flag is required.

### 6.3 Reader scope and limits

Default status reads only the coordinator checkout's existing handoff directory, its active pointer and native registration metadata for this common repository. It does not recurse into each linked worktree's runtime store, recursively scan `.sdlc/runtime/worktrees`, read document contents, enumerate processes, download evidence or crawl the whole GitHub backlog.

Old task handoffs remain valid historical records. Absence of a new resource section means **not recorded in this view**, not an empty resource set. Native registered worktrees with no associated resource record are unattributed. This includes resources whose records may live elsewhere; do not call them ownerless, abandoned or managed by this coordinator. Main/user-owned worktrees are visible as context but are not automatically added to its disposal task.

Use finite native-command deadlines and bounded record loading. Proposed local metadata limits are 256 KiB per resource snapshot, 4,096 candidate handoff files and 16 MiB aggregate input per invocation; native read-only Git queries use a 15-second process deadline. These are proposed implementation resource bounds, not measured performance promises or retention limits. An exceeded bound produces incomplete status; it never triggers deletion, automatic archival or silent truncation. Accept changes explicitly if the actual existing record population needs a different bound. Blocking filesystem I/O can exceed a Python-level deadline; claim no universal wall-clock guarantee.

## 7. Native inventory and path boundaries

Obtain registrations with a fixed argument vector:

```text
git --no-optional-locks -C <coordinator-root> worktree list --porcelain -z
```

Parse native record fields and NUL separators, not columns, line-splitting, shell words or a home-grown Git state model. Retain unknown additive fields; duplicate required fields, malformed termination or a failed command produce an incomplete inventory. A bare/main/locked/prunable entry is metadata, not disposal eligibility. Resolve common/per-worktree paths with native `rev-parse` interfaces when a permitted identity check needs them; never derive administrative paths from a basename. [S19, S20]

Resource paths in a record are not sufficient authority for arbitrary filesystem access. Associate worktree members with this repository's native inventory and the explicitly accepted host/scope first. Off-host records, arbitrary directory groups, or unmatched historical paths remain `not-inspected` unless the current task explicitly authorises that exact metadata read. No resource-file contents are read by status; bounded handoff metadata and existing active-control state are the only file-content inputs.

For permitted metadata inspection, use component-aware native path comparisons, not string prefixes. Inspect links/reparse boundaries before following anything; preserve the original path text as evidence. Windows case/drive semantics differ from POSIX; do not lowercase every path on every platform. Use `lstat`/appropriate native metadata and distinguish `FileNotFoundError`, `PermissionError` and other I/O errors. Do not use a Boolean `exists()` result as proof of removal under all error conditions. [S22]

A status observation is as-of evidence, not an atomic snapshot of every process and file. Detect a changed record-file listing or changed native inventory during the read and report/retry once; continuing movement is a partial view. No read operation takes over a task or obtains a release lease. Immediately before a real disposal, the operator rechecks the actual material and consumers independently of this report.

## 8. Preservation and nested-resource handling

### 8.1 Reuse WP0, do not implement another backup system

A verified preservation entry references the actual retained copy, content/candidate identity, reader/readback or restoration result and applicable retention. A successful hash comparison identifies bytes but does not prove that the store will remain accessible. A digest or path without retained content cannot satisfy A07. A record can truthfully say preservation is incomplete while the resource remains held. [S01–S03, S11]

Preserve staged versus working bytes, untracked and relevant ignored content, necessary local/detached commits, and original review/scan failures through WP0's actual procedure. Keep different same-name review documents separately until their content/inputs are compared. Promote durable tests or useful design decisions to their maintained owner only through the accepted change process. Do not reformat an immutable baseline or sealed security bundle.

Status does not scan for real credentials. Negative tests use synthetic sentinels. Actual suspected secrets or sensitive security findings follow the existing restricted procedure, not public JSON upload. Retained references must survive disposal of the source and any containing disposable worktree.

### 8.2 Nested registration

Find component containment among native registered paths on the same host. An inner registration under an outer root creates a visible dependency edge. Do not assume Git will infer and enforce this project's owner/retention requirements for an ignored nested resource.

For the existing SHACL baseline worktree, associate its observed identity and WP0 decision with the outer SHACL owner. The outer worktree stays outside the six-resource disposal scope. A proposed outer release remains held while inner registration, ownership, evidence or receiving-consumer obligations are unresolved. A lexical containment warning can be useful before all filesystem metadata is available; label it as such and do not follow unresolved reparse points.

Avoid creating new managed worktrees inside another task's worktree unless an accepted need justifies the dependency. WP3 does not move existing worktrees, repair registration, change their lock state or rewrite an active task's path metadata. A required move/repair is a separately authorised Git operation.

### 8.3 Stale candidate or reused path

Keep the recorded candidate and the current native HEAD distinct. A changed HEAD, conflicting resource record, new nested registration or previously removed path reappearing creates a held/reassessment attention item. Unchanged HEAD does not establish unchanged dirty content; the default status view does not hash all worktree files.

Consequently `eligible-for-approved-removal` is always displayed as **recorded eligibility; fresh operator inspection required**. A changed untracked/ignored file can invalidate the old assessment without being detectable from native HEAD alone. Tests must assert this limitation and no automatic dispatch, rather than falsely claim a full stale-dirty-input detector.

## 9. Operator procedure and confirmation

The following is the existing disposal route made explicit; it is not a new agent-executed removal feature.

1. The coordinator resolves ownership/authority and confirms the agreed checkpoint, released consumers, preservation, retention and dependency conditions under TA-02.
2. Inspect the exact current resource, staged/working/untracked/relevant ignored content, required commits, nested registrations and link boundaries. Bind the proposed operation to that identity.
3. Request the existing authorised native non-forced Git operation for one exact resource. Do not bundle local/remote branch deletion, pruning, unlocking or permission changes into the request.
4. Where native protection blocks the agent path, retain the actual command/dispatch, rule, time, resource identity, original denial reference and named operator request in `operator-blocked`. Do not issue another deletion spelling or self-grant an exception. A known policy restriction can be routed to the operator without deliberately attempting a real deletion merely to manufacture a denial.
5. The operator, within the separately established authority, performs the supported operation. The coordinator records its actual outcome and performs permitted readback. Failure remains a held/blocked record; it is not silently relabelled successful.
6. Record `removed-confirmed` only with the actual successful operation evidence, a successful fresh registration readback and an unambiguous filesystem observation at the exact path. Verify the retained evidence is still retrievable outside the disposed resource.

The standard `git worktree remove` operation refuses dirty worktrees without force. **Preserving a dirty worktree does not make it clean or make non-forced removal succeed.** Such a resource remains held until its owner has completed an ordinary authorised content disposition or another separately accepted maintenance decision. WP3 supplies no `reset`, `restore`, staging, commit, recursive deletion or force workaround to make the check pass. [S11, S12, S19]

For confirmation, registration absent plus directory present is not complete removal. A successful native operation followed by unavailable filesystem access is removal-outcome evidence with unconfirmed readback, not `removed-confirmed`. A missing/unmounted containing location is not unambiguous target deletion. A disappeared path without an operation record is an unexplained disappearance, not a success. Any same-resource move or path reuse must be reconciled against the operation and native identities before confirmation.

The recording command verifies only the permitted current registration/path observations; it does not parse arbitrary transcripts to authenticate an operator. Declaration, actual tool output and human authority remain distinct. Never claim a local mutable record is a tamper-proof deletion certificate.

## 10. File-by-file implementation proposal

| Path | Exact responsibility and bounded change |
|---|---|
| `scripts/sdlc.py` | Add `record-resource-disposition --input`; replace active-only status lambda with structured status handler; keep active lifecycle commands and their verification gates intact. Route incidental stdout to stderr only for structured-output paths. |
| `scripts/_sdlc_resource_disposition.py` (new) | Own contained metadata input, schema validation composition, immutable handoff-snapshot publication, supersession projection, native inventory association and status construction. No resource deletion/export/network APIs. |
| `.sdlc/schemas/resource-disposition.schema.json` (new) | Adopt the companion input/stored metadata contract after approval. Do not change unrelated schemas or verification-run versions. |
| `tests/sdlc/test_resource_dispositions.py` (new) | Behavioural input, history, projection, path, blocked/nested and no-deletion regressions, using existing tooling. |
| `tests/sdlc/test_pipeline_controls.py` | Add actual handoff-to-idle-status and unrelated-task preservation cases; reuse WP2's accepted real-linked-worktree fixtures where available. |
| `scripts/selectPullRequestChecks.js` | Add exactly `scripts/_sdlc_resource_disposition.py` to `CHECK_INPUTS.sdlc`. Preserve other scopes. |
| `tests/pr-check-scopes.test.js` | Exercise a helper-only change through the existing real-Git routing fixture; require SDLC selection and preserve unrelated scope behavior. |
| `docs/sdlc/temporary-artefacts.md` | Clarify coordinator/next actor, independent retained location, descriptive disposition and operator/nested readback without changing TA-02's predicate. |
| `docs/sdlc/temporary-artefacts-howto.md` | Replace its now-inaccurate “statements only” introduction when tooling is adopted; add concrete post-handoff recording/status and operator procedure. Preserve guard restrictions. |
| `docs/sdlc/subagent-playbook.md` | Add the resource/evidence/consumer return contract to the existing collect-and-release section. No new role or fan-out. |
| `docs/sdlc/howto.md` | Explain versioned status output, metadata command, zero-exit semantics and separate completion/disposition. |
| `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md` | Reconcile with WP2's exact wording; add outside-resource retention and post-handoff next-actor references. |
| `docs/sdlc/verification.md` | Add only dated actual results/limits after qualification, or use the existing task record until durable summary is appropriate. |

Inspect `scripts/_sdlc_state.py`, `_repository.py`, `sdlc_stop_gate.py`, source-package/adoption manifests and generated skill activation as consumers. Do not assume they need edits. Import the existing root/state/schema primitives instead of duplicating their responsibilities. An outdated historical source-package digest is not to be silently rewritten into an adoption claim.

The companion policy-amendment document supplies the exact proposed prose. Its source anchors are pinned; rebase it semantically against the accepted WP2 paragraphs once. Do not paste competing owner/release definitions into the same guide.

No new dependencies, package scripts, runtime pins, workflow jobs, hooks, guard packs, Git extensions, remote settings or SDLC package-version change are proposed. The existing `tests/sdlc` discovery and Windows/Ubuntu workflow are the qualification path. A newly discovered configuration requirement must be stated and accepted exactly before editing. [S16–S18]

## 11. Detailed implementation slices

### WP3.1 — Bind acceptance, ownership and actual consumers

**Inputs:** parent WP3; actual WP0 outputs or explicit absence; current code/policy; accepted WP2 text and interfaces, where landed.

The implementer refreshes the repository head and relevant Issues, reads the deployed source rather than assuming the attached plans have landed, and inventories callers of `status`, handoff readers and source/check-selection consumers. Trace the actual creation of the six resources through available task/tool evidence; code references to worktrees are not proof of a creation service.

Present one exact approval bundle: the scoped change brief, proposed R2 route, new command and status shape, companion schema, helper/check-selector changes and five policy amendments. Identify a stable coordinator location and recording authority. Keep the old task/Issue as authority where it already covers this work; otherwise link one new scoped accepted item. A draft Issue or this document is not its accepted baseline.

**Deliverable:** existing task record with source/control identity, actual accepted configuration list, deployment dependencies, writer/coordinator and read/record scope. Include a per-WP0 resource lookup, not a copied second inventory claiming newer facts.

**Exit:** requirements/interface acceptance and baseline requirements are actually satisfied before material implementation. There is no dependency on deleting the six resources or solving unrelated #30/#32 defects first.

### WP3.2 — Add meaningful failing status and retention tests

**Boundary:** actual `scripts/sdlc.py` subprocess in an owned disposable repository, with the selected existing interpreter and real JSON/files.

First add the anchor test: start and verify a synthetic task with existing native commands, retain a proposed resource-disposition fixture in its handoff store, complete the normal implementation handoff, then call native `status`. Assert valid structured output, absent active state and a visible retained resource/next actor. The old code fails because its status handler still requires `active.json`; this is the intended behavioral RED.

Add a second anchor for an unassociated native registered worktree. The old implementation must not be credited with ownership or visibility simply because Git can list it independently. Add a no-resource idle case so the replacement does not require invented resources.

Preserve existing success/failure history assertions and Stop/handoff behavior. Use exact expected facts authored independently; don't calculate the expected status by calling the same projection function. Discovery/setup failures are not the intended RED. No live user worktree or real secret is used.

**Exit:** the known source gap is reproduced through the actual command and records. The maintained failing tests identify their intended assertion, not a test import error or missing runtime.

### WP3.3 — Implement the metadata contract and create-only recording

Use the companion schema as the accepted shape, with `Draft202012Validator` and format checking from the repository's existing maintained validator. Schema-check the schema once in tests; validate actual inputs/records at the consuming boundaries. Cross-record references, live paths and authority are not schema proofs. [S23]

Implement strict bounded JSON input, unique recording/resource identities, explicit same-resource supersession and complete-file create-only publication in the new private module. Reuse the qualified native WP2 publication composition where appropriate without importing its active-task semantics. Retain publication/acknowledgement failures; no exception path removes an existing handoff or `active.json`.

For initial legacy holdings, unknown owner/task ID remains null with a hold, next actor and source reference. Do not fabricate a historical native task ID or import active state from the target. A record update uses the current resource ID and exact prior ID. Test UUID/name collision refusal, failed write/readback, interruption before/after publication and no timestamp-based winner selection.

**Exit:** valid records survive readback, rejected inputs change neither old records nor target resources, and every recorded limitation remains explicit. The publication mechanism is qualified on the actual supported filesystems before adoption; a Linux shape test is not Windows acceptance.

### WP3.4 — Implement status projection and native inventory

Build current resource views from the coordinator's bounded existing handoff store. Preserve legacy record distinctions. Add the fixed native inventory and component-aware containment association. The module may return data; the CLI owns JSON output and exit semantics.

Return pending records with or without an active task. Return usable partial data plus nonzero on read/parse/conflict/coverage failures. For a complete view, zero means reporting succeeded even when the next action belongs to the operator. Never output a root-level “all work complete” conclusion.

Test paths with spaces, Unicode, quotes and supported newline cases, locked/prunable/detached/main metadata and inaccessible/off-host historical paths. Default status must not read a linked checkout's `.sdlc/runtime` or a referenced evidence bundle. It must not silently convert an unresolved filesystem identity to “not present.”

**Exit:** the anchor tests are green, source state is unchanged, expected local scopes are visible, and incomplete status cannot masquerade as no pending work.

### WP3.5 — Exercise blocked, stale, nested and confirmation outcomes

Record an actual-shaped *synthetic* guard denial as data and assert the exact rule/reference/operator request survives implementation handoff. Instrument command dispatch to fail on anything outside the small read-only Git allowlist; independently assert resource and sentinel bytes remain unchanged. This establishes no-delete implementation behavior, not actual host interception.

Create two real linked worktrees, including one physically nested in the other's ignored task directory, only in owned test storage. Assert the native inventory exposes both, containment is reported and a proposed outer disposal remains held. Do not invoke real removal as a negative test. For positive removal confirmation, use injected native-operation/readback outcomes in unit tests and the separately authorised actual operator exercise in WP3.8.

Test a changed native HEAD, a modified ignored/untracked file under unchanged HEAD, and path reappearance. In the latter dirty case the metadata-only status must explicitly require fresh inspection and must not claim detection it cannot perform. Test present directory/absent registration, unreadable parent, interrupted preservation and expired-only evidence references. These cases must never produce automatic release.

**Exit:** A08's named blockers produce visible retained obligations and no alternative deletion path. Confirmation claims require distinct operation and readback evidence, not schema labels alone.

### WP3.6 — Reconcile exact policy and handoff wording

Apply only the accepted companion amendments. Preserve TA-02, the distinction between temporary material and durable/evidence assets, and the existing authority boundaries. Make a concise field group sufficient for routine survivors; do not require a per-file ledger for scratch removed within its creating task.

Amend the how-to's “statements only” wording to reflect the approved metadata/status code, while preserving “no cleanup orchestrator.” Add the new command's record-only semantics and the documented status output change. Reconcile the TDD/how-to paragraph once with WP2; do not blindly paste both proposal versions. Existing generated skill activation follows its supported approved path; do not hand-edit generated `.agents/skills` copies or change global agent settings.

Prepare the normal handoff section and operator request template in §13. Use source links rather than copying this implementation plan into each policy page. Documentation tests check actual links/format where supported; keyword-presence tests do not establish operator compliance.

**Exit:** one consistent policy source per responsibility, exact approved text landed in the intended files, and no new release role, mandatory review fan-out or retention duration.

### WP3.7 — Qualify the integrated implementation and route it correctly

Before the new helper is used as maintained infrastructure, add its exact path to `CHECK_INPUTS.sdlc`. Reproduce the old selector's omission using the existing real-Git fixture, then add the one path and preserve other scope expectations. A helper-only future change must reach SDLC CI.

Run focused metadata/status tests during the loop, affected lifecycle/launcher/root-boundary tests at integration, and the actual required full profile on the final frozen R2 candidate. Preserve WP1's current writer/schema/reader set, WP2 exclusive start and linked isolation, and existing Stop behavior. Check the deployed native help, ordinary npm entry, redirected Unicode JSON output and raw receipt/history preservation on the actual Windows path.

Use the existing Windows/Ubuntu CI jobs, selected toolchain and dependencies. Missing native tests, permissions or exact-output qualification are gaps; don't change the runtime matrix or silently use another compiler/interpreter. Independent review covers evidence history, path/read boundaries and whether the implementation's call graph can dispatch any destructive or record-supplied command. An installed reviewer role does not authorise delegation.

**Exit:** actual command/test results, source/control identity, CI head/run/attempt and independent review are retained. Local schema checks are not counted as native SDLC passes. No version/host adoption claim is made without its actual acceptance.

### WP3.8 — Adopt through the actual handoff and operator decision

Reconcile the live six-resource inventory with WP0, without rescanning unrelated data or re-copying already verified unchanged evidence. Record real owners/holds, candidate/evidence references and next actors in the chosen stable coordinator channel. Confirm that a real handed-off task with no active pointer still exposes its retained obligations to Max/the receiving maintainer.

Perform two observational exercises: O31 (find purpose/evidence/next actor for all six or explain every current difference) and O32 (follow one real pending operator/consumer decision through recording and readback). Reuse an already retained genuine guard denial where available; otherwise state that live interception was not exercised. Do not attempt a deletion simply to obtain a screenshot of a block.

If an actually eligible resource is independently authorised for native removal, the operator can complete the existing procedure and provide operation/readback evidence. If no such resource is eligible, preserve a held result; simulated positive confirmation remains only fixture evidence and the first live confirmation is an explicit follow-up obligation. This does not justify deleting one of the historical worktrees for demonstration.

**Exit:** the visibility/ownership outcome has real user-work evidence. Any still-required live removal confirmation is explicitly pending; no unconditional claim that all removal paths or original worktrees were disposed of is made.

## 12. Failure and recovery contract

| Failure | Required response | Prohibited shortcut |
|---|---|---|
| No active implementation | Return null active state and retained resource status. | Delete records or create a dummy task to make status run. |
| Unknown owner | Hold; name coordinator/Max as next decision actor without claiming historical authorship. | Infer ownership from the path, branch, login or age. |
| Missing/unverified retained evidence | Hold and invoke the existing preservation decision. | Accept a bare checksum or empty directory as preservation. |
| Native guard denial | Preserve exact denial and operator request as data. | Re-spell through another shell, interpreter, file API, `--force` or disabled protection. |
| Dirty/non-forced refusal | Retain outcome and return to owner content disposition. | Reset/restore/stash/commit/discard edits to manufacture cleanliness. |
| Nested or unresolved link identity | Record containment/identity hold; do not traverse or remove. | Guess the owner or dispose of the outer root first. |
| Expired assessment or changed candidate | Reassess the actual resource; preserve historical decision. | Treat old eligibility as continuing authority. |
| Duplicate/conflicting snapshots | Show unresolved leaves and require attributable reconciliation. | Last-writer/mtime/UUID winner selection. |
| Malformed/future-version/unreadable record | Partial status with a precise problem, preserving the original. | Ignore it and print “nothing pending.” |
| Interrupted record publication | Retain complete published record or preparation failure; inspect before retry. | Erase old state or claim universal crash/power-loss durability. |
| Successful write, failed acknowledgement | Preserve record; locate its returned/generated identity or bounded history. | Blindly replace evidence to retry. |
| Successful operation, failed readback | Hold confirmation and retain actual operation result. | Infer path absence from `exists() == false` after an error. |
| Inaccessible evidence destination | Report the gap and preserve source resources. | Change permissions, leak evidence publicly or declare backup successful. |
| Status size/deadline limit | Return incomplete bounded result. | Silently truncate, auto-prune history or add a deletion expiry. |

Preparation files are task-owned publication scratch, not active tasks or removal leases. Do not automatically promote a stale preparation file or remove an older published record. A required recovery decision uses the existing coordinator/evidence process. If even the first recording write cannot succeed, preserve the report through another already authorised evidence channel or state the absence honestly; the tool cannot prove a durable event that could not be written anywhere.

## 13. Normal handoff and operator-request templates

Use the following in the existing task/PR/handoff. Do not create a separate permanent dossier for every resource. Exact paths and sensitive details may remain in restricted references.

```markdown
## Resource disposition — <actual observation date>

Implementation outcome: <actual handoff/paused state and candidate>.
Resource record location: <actual stable coordinator location/reference>.
This section records disposition; it does not grant disposal or publication authority.

| Resource/group | Owning execution and owner | Why retained / consumers | Required evidence and readback | Recorded disposition | Next actor and reassessment event |
|---|---|---|---|---|---|
| <exact resource identity> | <actual owner or explicit unknown> | <concrete consumer/obligation> | <retained copy + actual readback or gap> | <descriptive state> | <person/responsibility + event> |

Native inventory observation: <actual Git record/identity and scope>.
Nested/containing-resource dependencies: <actual relationship or none observed in scope>.
Unaccounted or inaccessible resources: <specific gap, not a guessed clean result>.
Source/test input changes caused by disposition: <actual effect and verification, or none>.
```

For a blocked operation, add only:

```markdown
### Scoped operator action

Resource and current identity: <exact target; latest inspection reference>.
Coordinator and authority: <actual references>.
Proposed native operation: <one exact non-forced operation; no extra branch deletion>.
Actual denial: <time, dispatch/command reference, native rule and original evidence>.
Consumer release / retention / preservation: <actual evidence or outstanding gap>.
Decision requested from: <named operator/Max>.
Reassessment trigger: <operator decision or concrete prerequisite>.

Operator outcome: <not performed | actual success/failure reference>.
Post-operation registration and filesystem readback: <actual observations or unverified>.
Retained evidence readback after operation: <actual result or gap>.
```

A known restriction without an attempted operation uses “anticipated restriction; operation not attempted,” not the actual-denial fields. Supply no executable payload to the record reader. Do not use an illustrative command as an instruction to dispose of a real target.

## 14. Historical six-resource adoption worksheet

This is a lookup guide to WP0, not a new current inventory and not six pre-populated successful records. The historical task ID/owner/capture result remains unknown until actual evidence establishes it. [S02, S03]

| Historical resource | WP3-specific question / initial safe disposition |
|---|---|
| `mcp-workspace-modernization` | Who owns implementation and the exact dirty candidate? Retain for that owner or hold; don't infer a lost commit from the branch tip. |
| `mcp-final-verification` | Which frozen candidate/reviewer/consumer does it support? Preserve its distinct review evidence even where candidate files match implementation. |
| `mcp-projection-verification` | Which projection checkpoint and downstream review needs it? Preserve exact outputs and decisions instead of merging by filename. |
| `mcp-query-verification` | Which query checkpoint, failures and consumer obligations remain? A later implementation result does not automatically supersede its evidence. |
| `mcp-semantic-negative-control` | Which expected failure/reproduction must remain recoverable? Do not repair the deliberate control or discard its failure. |
| `shacl-policy-baseline` inside the outer SHACL worktree | Who owns `docs/sdlc/baselines/issue-31/`, its acceptance state and the nested registration? Hold outer release while the inner obligations remain unresolved. |

The user-owned main and outer SHACL worktrees are context, not disposal candidates. If a survivor is now absent, moved, committed or legitimately released, record the actual dated difference and its evidence; don't rewrite the original handoff. If WP0 preservation is not complete, status still records the hold but A07 is not accepted.

## 15. Regression catalogue

All cases below are **tests to implement**, not executed repository results. Use synthetic credentials/evidence and actual native boundaries where identified. Small pure/schema tests supplement real-process tests; they cannot replace them. Reuse the existing unittest/Jest/native Git fixtures and WP2 linked-worktree helpers where accepted.

| ID | Scenario and required observation | Boundary |
|---|---|---|
| T301 | Native implementation handoff removes active pointer; status still exposes retained resource/next actor. | Real CLI, Git fixture, retained files. |
| T302 | Idle checkout with no resources returns valid scoped report, not a missing-active exception. | Real CLI. |
| T303 | Unreadable/malformed active state does not hide readable resource obligations or claim idle. | Reader and subprocess. |
| T304 | New record persists/readbacks without changing active, runs, source or target sentinel bytes. | Native filesystem/CLI. |
| T305 | Post-handoff update works without manufacturing a new task ID; original handoff stays unchanged. | Real CLI. |
| T306 | Invalid UTF-8, duplicate keys, invalid structure/version, unknown properties and stored-output-as-input reject before publication. | Native decoder and maintained schema. |
| T307 | Unknown originating identities are not fabricated; unknown owner without an explicit disposal-authority reference stays held/blocked with a next actor. A supplied authority reference is not authenticated approval. | Schema plus semantic validation. |
| T308 | Routine no-survivor handoff needs no fabricated record or per-file ledger. | Existing lifecycle preservation. |
| T309 | A later resource snapshot preserves original denial/failed evidence and selects the exact superseded chain. | Native records and pure projection. |
| T310 | Two concurrent successors produce visible conflict; timestamps and filenames do not choose one. | Controlled publisher processes plus projection. |
| T311 | Missing, self, cyclic or cross-resource predecessors fail; corrupt history is not silently ignored. | Pure and file consumers. |
| T312 | Legacy handoffs without metadata remain historical/unknown, not asserted empty sets. | Native mixed store. |
| T313 | Inventory returns spaces/Unicode/quotes/newline paths correctly; locked/prunable/detached are metadata only. | Actual Git fixture; newline case where OS supports it. |
| T314 | Registered worktree with no matching local record appears unattributed; no recursive runtime read occurs. | Actual linked worktree; read spy/sentinels. |
| T315 | Two tasks/worktrees keep separate records; A's recording/handoff doesn't overwrite B's state/evidence. | Real linked worktrees. |
| T316 | Dirty source remains unchanged and never triggers an attempted removal. | Native sentinel/diff comparison. |
| T317 | Ignored synthetic credential/evidence can coexist with clean ordinary status; reporting never reads its contents or treats cleanliness as safe disposal. | Actual Git ignored paths. |
| T318 | Missing structural readback fields reject verified preservation; an independently established sole-copy/unavailable-evidence condition stays held. Nonempty opaque references alone cannot authenticate preservation. | Validation plus bounded operator fixture. |
| T319 | Named active or unknown consumer prevents eligibility/confirmation assertion; consumer release requires its reference. | Contract validation. |
| T320 | Actual-shaped simulated guard denial produces operator-blocked record; no supplied command or alternative dispatch executes. | Native record CLI + strict dispatch spy + unchanged resource. |
| T321 | Anticipated guard restriction is not falsely recorded as an executed denial. | Contract validation. |
| T322 | Nested linked registration reports containment and holds the proposed outer disposition. | Actual nested Git fixture, no removal. |
| T323 | Symlink/junction/reparse escape, prefix-collision sibling and foreign-host path remain uninspected/held without target traversal. | Native relevant platform metadata + access spy. |
| T324 | Native HEAD changes after inspection: old assessment is historical and requires reassessment. | Actual Git and status. |
| T325 | Dirty/untracked/ignored bytes change under unchanged HEAD: reporter still requires fresh inspection and never claims a complete freshness or deletion pass. | Native file change, metadata-only limitation check. |
| T326 | Candidate/group falsely includes coordinator/main or unresolved nested worktree: no eligibility/removal claim is accepted. | Contract/native association. |
| T327 | Simulated successful authorised operation plus both actual-shaped absence readbacks can record confirmed removal; input and writer observations are distinct, path membership is checked, and inputs alone cannot supply current readback. | Injected operation evidence and controlled observer; live exercise separate. |
| T328 | Absent registration with present path, unreadable/missing parent or failed native inventory prevents confirmation. | File/API error injection and native fixture. |
| T329 | Old removed path reappears or native identity moves: report new/reappeared/identity gap, not inherited permission. | Native registration/metadata fixture. |
| T330 | Record store redirects, record-ID collision, write/readback failure, interruption before/after publication preserve prior state. | Native filesystem; deterministic boundary injection. |
| T331 | Interrupted preservation or expired-only remote evidence remains a gap; no network fetch/credential expansion is attempted. | Contract/reference handling, controlled evidence result. |
| T332 | Record/inventory movement or finite read limit causes a partial report/nonzero, not an empty success. | Bounded reader and controlled concurrent writer. |
| T333 | WP3 status code performs no writes, resource deletion, remote calls, hooks or verifier runs; command data remains data. Distinguish native launcher diagnostics from protected resource/control mutations. | Strict dispatch/file-effect instrumentation and native CLI. |
| T334 | Redirected Unicode/default Windows application JSON remains parseable through direct and silent-npm entry points; ordinary npm preambles are not treated as JSON, and root-discovery chatter stays on stderr. | Actual npm/Node/.venv Windows entry. |
| T335 | Retained/blocked resources do not waive failed verification or alter Stop's bounded continuation; valid handoff can retain resources. | Actual existing Stop/handoff subprocesses. |
| T336 | New helper-only change selects SDLC CI; unrelated existing scope selections remain correct. | Existing actual-Git selector fixture. |

### Operational observations, distinct from tests

**O31 — actual handoff discoverability:** Max or the receiving maintainer identifies purpose, owner/hold, retained evidence and next actor for the actual six-resource reconciliation, without inspecting every implementation transcript or starting another active task. Retain answers, observation identity, missing facts and limits. No invented onboarding-time saving is required.

**O32 — actual operator/consumer follow-through:** follow one real retained or blocked decision through the existing channel after implementation handoff. Reuse genuine denial evidence if available. Record whether it remains held, receives consumer release, or has an independently authorised native operation with readback. A simulated denial or removal result remains fixture evidence. No deletion is required merely to conduct this observation.

## 16. Acceptance criteria and traceability

| ID | Required acceptance evidence | Parent / principal tests |
|---|---|---|
| AC3-01 | Exact scope, command/status/schema and policy changes accepted through the existing route. | WP3 boundary; WP3.1. |
| AC3-02 | Current actual in-scope resources have owner or explicit ownership hold, purpose, consumers and next actor. | WP3 outcome; T307/T314, O31. |
| AC3-03 | Required unique content and evidence are retrievable outside the disposable resource/containing tree. | **A07**; actual WP0 readback, T318/T331. |
| AC3-04 | Retained/blocked records remain discoverable after native implementation handoff and without active state. | WP3 visibility; T301/T302/T305. |
| AC3-05 | Original histories and other executions remain intact; conflicts and legacy gaps are explicit. | T309–T315. |
| AC3-06 | Unknown ownership, active consumers, nested registrations, dirty data, unresolved links and preservation gaps never produce disposal authority. | **A08**; T316–T326. |
| AC3-07 | Actual-shaped blocked dispatch is retained as data with operator ownership; no alternative deletion path exists. | **A08**; T320/T321/T333, O32 limits. |
| AC3-08 | Confirmed removal requires actual operation evidence and permitted registration/filesystem/evidence readback, with uncertainty preserved. | T327–T329; actual confirmation separately if available. |
| AC3-09 | Status is a scoped read-only observation, handles errors/limits truthfully and never substitutes for fresh operator inspection. | T303/T323–T325/T332–T334. |
| AC3-10 | Existing active acquisition, verification freshness and bounded Stop behavior remain valid; resources don't cause an endless gate. | WP1/WP2 regression preservation, T335. |
| AC3-11 | Exact helper/configuration/consumer changes receive actual supported Windows/Ubuntu, selected full-profile and independent-review evidence. | T334/T336, WP3.7. |
| AC3-12 | Actual receiving-maintainer/operator workflow is observed, remaining obligations owned, and adoption/closure claims state limits. | O31/O32 and WP3.8. |

A shape check, mandatory field, a successful status exit, a passing unit test or an agent's `APPROVED` string does not establish these real-work obligations.

## 17. Verification, delivery, rollback and status of completion

During implementation use the relevant test filter via existing repository entry points. Confirm each supported argument in the actual checkout's help/package scripts rather than inventing a new command wrapper. Representative existing routes are:

```text
npm run test:sdlc
npm test -- --runInBand tests/pr-check-scopes.test.js tests/run-repository-python.test.js
npm run check:sdlc
npm run sdlc -- verify --keep-going
```

The final command is run only in the accepted active implementation with its actual route and configured profiles. It is not run inside the six historical resources to manufacture evidence. Source/configuration changes after the frozen check require the applicable fresh evidence; place evolving execution receipts in the existing evidence/task channel rather than repeatedly editing a tracked diary.

Land the schema, writer, reader, selector test and exact docs coherently. The eight slices do not require eight branches or eight full profiles. The primary code paths should remain reviewable as a bounded change. Separate actual metadata migration/adoption from product source change and preserve unknown legacy states.

If the new view is defective, stop relying on it for resource decisions and use the existing documented handoff/operator process while preparing an authorised forward fix or scoped revert. Preserve all resource snapshots and old native task evidence. Do not silently downgrade the stored record format, delete metadata to make the old reader work, or represent the older active-only status as evidence that no resources remain. No automatic active-task or WP1 run-schema migration is part of rollback.

Use one of these completion statements:

- **Implementation qualified; operational adoption pending:** actual source/host/CI/review evidence passes, but the live six-resource reconciliation or receiving-owner exercise has not occurred.
- **Visibility adopted with explicit retained obligations:** current resources and required preservation are accounted for, the real handoff/next-actor workflow is observed, and named consumers/operator decisions still require retention. The absence of real removal qualification is stated where relevant.
- **Incomplete:** required preservation, identity, permissions, code/host verification or ownership disposition is not established. Report the completed subset and exact next actor; do not demand cleanup as the remedy.

Do not close an existing source issue or mark A07/A08 passed solely because this plan and its fixtures exist. There is no SDLC version bump, independent cross-repository adoption or resource-removal authorization in any of these statements.

## 18. Prepared tracker text

Use only after the duplicate and accepted-scope check; do not publish automatically:

> **[Change]: Surface retained resource ownership and blocked release after SDLC handoff**
>
> Keep temporary-resource dispositions discoverable after an implementation's active pointer is removed. Reuse the existing handoff store and native Git inventory, with a metadata-only recorder and a documented read-only status envelope. Preserve existing consumer, evidence, authority and guard predicates. No automated cleanup, branch deletion, lease takeover, permission expansion or cross-repository registry is included. Parent criteria are A07 preservation and A08 held blocked/nested release; actual WP0 evidence and receiving-owner observations remain required.

Link the parent, handoff, relevant WP0 preservation and WP2 accepted coordination records. Keep #30's dispatch diagnosis and #32's encoding repair separate. The proposed blocked-state record does not itself prove that either defect caused the original accumulation.

## 19. Sources and source identity

`S01–S06` are supplied project documents; their exact file digests are included in the companion check record. They are proposals/observations, not proof that their implementations have landed. Repository file sources are pinned. Mutable GitHub state was read on 10 September 2026. Official documentation establishes native interfaces, not the project's business authority.

- **S01** — `../implementation-plan.md`, §5 WP3, §6 order, §7 A07/A08, §8 tracker boundaries.
- **S02** — `sdlcworktreelifecyclehandoff20260910.md`, supplied 10 September 2026; historical observations/questions and protected six-resource inventory.
- **S03** — `../wp0-worktree-preservation/implementation-plan.md`; operational preservation/ownership plan, not executed preservation receipts.
- **S04** — `../wp1-verification-evidence/implementation-plan.md`; verification evidence/text proposal, distinct from resource metadata.
- **S05** — `../wp2-independent-execution/implementation-plan.md`; single-checkout publication, linked isolation, integration and WP3 boundary.
- **S06** — `../wp2-independent-execution/policy-amendments.proposed.md`; exact earlier proposed text to reconcile, not silently overwrite.
- **S07** — [Current branch read](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main); observed commit `79d187802f9255134c03d0786ff75181ed1070ee`.
- **S08** — [Pinned lifecycle implementation](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc.py), especially `record_task_disposition`, `resume_task` and `status` dispatch.
- **S09** — [Pinned state primitives](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_sdlc_state.py).
- **S10** — [Pinned root locator](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/_repository.py).
- **S11** — [Temporary artefact policy](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts.md), especially TA-02–TA-08.
- **S12** — [Temporary artefact procedure](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts-howto.md), including guard/operator section.
- **S13** — [Subagent playbook](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/subagent-playbook.md), collect/adjudicate/release and command inheritance.
- **S14** — [SDLC how-to](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/howto.md).
- **S15** — [TDD handoff reference](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md) and [review policy](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/REVIEW.md).
- **S16** — [Existing CI matrix](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/.github/workflows/sdlc-control-tests.yml).
- **S17** — [Existing Stop gate](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/sdlc_stop_gate.py).
- **S18** — [Existing scope selector](https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/scripts/selectPullRequestChecks.js); connector searches for `handoffs`, `worktree` and Issues containing `worktree` in this repository, read during this research.
- **S19** — [Git worktree documentation](https://git-scm.com/docs/git-worktree): native inventory, removal constraints, shared/per-worktree state.
- **S20** — [Git rev-parse documentation](https://git-scm.com/docs/git-rev-parse): native path-resolution interfaces.
- **S21** — [Git status](https://git-scm.com/docs/git-status) and [Git ls-files](https://git-scm.com/docs/git-ls-files): ignored/untracked and machine-readable inspection boundaries.
- **S22** — [Python pathlib](https://docs.python.org/3/library/pathlib.html): path components, metadata, junctions and error distinctions.
- **S23** — [python-jsonschema validation](https://python-jsonschema.readthedocs.io/en/stable/validate/) and [Python JSON](https://docs.python.org/3/library/json.html): native validation/decoder composition. Do not upgrade the repository's dependency to the documentation site's version by assumption.
- **S24** — [Python os interfaces](https://docs.python.org/3/library/os.html#os.link): native link/file publication and error boundaries; actual filesystem qualification remains necessary.
- **S25** — [GitHub artifact removal/retention](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts): expiry and deletion consequences; no new project retention period selected.

- **S26** — [npm logging](https://docs.npmjs.com/cli/v12/using-npm/logging/): native silent log level and launcher diagnostic boundaries; no persistent npm configuration change selected.

## 20. Final acceptance statement — fill only from actual execution

> WP3 is implemented at <revision> against <accepted scope/baseline and exact configuration>. The metadata-only recorder and status view were exercised through <actual Windows/Ubuntu entry points and run identities>, retaining <history, blocked, nested and failure evidence>. The actual handoff resource set is <scope/current reconciliation>, with required content preserved and read back at <references>. Every retained item has <owner or explicit hold, consumer and next actor>. Implementation completion is <actual state>; resource disposal is <actual separate state>. Native removal confirmation was <actually exercised on the independently authorised resource / not exercised, with named follow-up>. Original evidence, verification/Stop behavior and guard settings remain <verified result>. This statement authorises no additional deletion, publication, version change or cross-repository adoption.
