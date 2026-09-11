# WP0 — Preserve and establish ownership of the handoff worktrees

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Implementation plan · 10 September 2026**

**Parent:** *SDLC reliability, worktree lifecycle and proportionality — implementation plan*, WP0.
**Repository:** `Hadden-Industries/universal-ontology`.
**Priority:** P0 preservation precaution; not a declaration of an incident or a risk-class assignment.
**Status:** proposed execution instructions. The six source worktrees have not been accessed, copied, modified or removed in preparing this plan.

## 1. Objective and completion boundary

Execute the existing WP0 scope: reconcile the six worktrees in the supplied handoff with current local state; establish their owners, purposes and consumers; preserve required implementation and evidence; prove that the retained content is recoverable; and record each worktree's next disposition in the existing task/Issue/PR handoff. [P1, H1]

The outcome is **accounted-for resources and verified recovery material**, not clean Git status, merged code, completed product assurance or removed worktrees. All six worktrees may legitimately remain present when WP0 finishes.

WP0 ends before implementing lifecycle visibility changes (WP3), exclusive task creation (WP2), the Unicode repair (WP1), command-guard diagnosis/repair (WP4), or plugin qualification (WP5). Findings for those packages are linked from the normal handoff; they are not implemented here.

The underlying policy already distinguishes durable assets, retained evidence, temporary working material, and uncertain or externally owned material. This plan applies that classification; it does not replace it with a new SDLC policy or a central resource database. The policy/how-to files retain their own stated status and approval history. Planning WP0 does not retrospectively approve any proposed policy text. [R1–R3]

### Scope and authority

| Within WP0 | Outside WP0 |
|---|---|
| Read-only local inventory and scoped ownership research. | Editing product code, tests, requirements or accepted baselines. |
| Owner-coordinated capture checkpoints for the individual resources being copied. | Stopping every repository task, terminating processes, or claiming an OS snapshot from ordinary copying. |
| Approved, create-only preservation in an existing restricted evidence/recovery location. | Creating a new cloud store, changing access controls, installing backup software, or publishing raw evidence by assumption. |
| Retrieval, checksum comparison and reconstruction in a separate, authorised recovery scratch location. | Applying a reconstruction to an original worktree or activating an archived lifecycle record. |
| A dated disposition section and specific unresolved decisions in the existing record. | A permanent capture service, cleanup daemon, automatic expiry policy, new reviewer hierarchy or global task database. |
| Recording prior removal/guard observations as historical evidence. | Worktree/branch deletion, pruning, stashing, committing, pushing, configuration changes or guard exceptions. |

A planning request supplies no authority to execute these operations on the Windows host. At execution, bind the actual source/read scope, destination/write scope and existing permissions once in the task record. Reuse valid authority; ask only for genuinely missing decisions. Do not create an R2 baseline merely because the priority is P0. The coordinator should use the smallest justified existing operational route; any proposed permanent tool or control change leaves WP0. [P1, R1]

## 2. Source basis and known unknowns

The supplied handoff is a **historical observation**, not a live inventory or proof that a worktree is abandoned. Its reported counts, short SHAs, creation times and branch availability must not become current facts without readback. Do not rewrite the original handoff to reflect later changes. [H1]

The following remain unknown until the host execution: current worktree registration and contents; actual owners and consuming sessions; whether an adequate retained copy already exists; local hook decisions; the existing approved evidence store and its retention/access arrangements; the installed Git/PowerShell capabilities; and whether live content needs a consistency mechanism beyond a cooperative writer checkpoint.

The parent WP0 says apparently duplicate candidates may be legitimate verification copies. Preserve that framing. Matching filenames or counts do not prove duplicate evidence; a verification copy containing the same candidate does not by itself prove loss of reviewer independence. Ownership, review context, the expected-result source, and the exact candidate identity are separate questions. [P1]

### Historical seed inventory — do not populate live results from this table

Let:

- `MAIN = C:\Users\maksy\GitHub\universal-ontology`
- `SHACL = C:\Users\maksy\GitHub\universal-ontology-worktrees\shacl-policy-source-of-truth`

The IDs below are local shorthand for this execution plan, not new SDLC task identities.

| ID | Historical physical location | Attachment reported in handoff | Reported untracked / deleted / modified | First question |
|---|---|---|---|---|
| WT-01 | `MAIN\.sdlc\runtime\worktrees\mcp-workspace-modernization` | `feat/mcp-workspace-modernization` | 74 / 54 / 37 | Which execution owns the implementation and its authoritative current candidate? |
| WT-02 | `MAIN\.sdlc\runtime\worktrees\mcp-semantic-negative-control` | Detached | 1 / 0 / 1 | Which intentional defect/control and expected failure must remain reproducible? |
| WT-03 | `MAIN\.sdlc\runtime\worktrees\mcp-projection-verification` | Detached | 8 / 4 / 16 | Which projection checkpoint and reviewer consume this copy? |
| WT-04 | `MAIN\.sdlc\runtime\worktrees\mcp-query-verification` | Detached | 46 / 33 / 33 | Which query checkpoint and review evidence does this copy represent? |
| WT-05 | `SHACL\.sdlc\runtime\worktrees\shacl-policy-baseline` | `docs/shacl-policy-baseline` | 1 directory / 0 / 0 | Who owns the inner worktree and the untracked Issue #31 baseline directory? |
| WT-06 | `MAIN\.sdlc\runtime\worktrees\mcp-final-verification` | Detached | 73 / 54 / 37 | Which frozen candidate was copied from WT-01, and what independent evidence belongs here? |

All six were reported at `79d1878`, corresponding to the parent plan's full SHA `79d187802f9255134c03d0786ff75181ed1070ee`. The handoff reports eight total registrations, including the main checkout and the outer SHACL worktree. Those two user-owned worktrees are **not preservation targets** here; inspect only the boundary/ownership metadata necessary for the six targets. Do not assume WT-05's reported directory count is its actual number of files. [H1, P1]

The three previously removed worktrees—`mcp-modernization-baseline`, `mcp-modernization-design`, and `windows-stop-hook-repair`—belong in historical context, not the six-current-target checklist. Do not recreate them or investigate all deleted branches without a concrete WP0 dependency. A historical clean/merged report alone does not independently establish the status of ignored evidence or former consumers. Record any specific resulting gap without asserting loss or no loss beyond the evidence. [H1]

## 3. People, responsibilities and execution inputs

| Responsibility | Accountable actor | Required contribution |
|---|---|---|
| Coordinate WP0 | Existing task coordinator | Scope inventory, avoid interference, maintain the disposition section, assemble and verify recovery evidence. |
| Confirm a worktree's role | Actual originating/receiving execution owner | Identify candidate, consumers, needed bytes, and a suitable capture checkpoint. |
| Authorise storage and restricted handling | Existing evidence-store owner/operator | Bind approved destination, writer/reader access and applicable retention. |
| Resolve unknown ownership/retention | Max | Decide stewardship or retain an explicit hold; do not invent the originating owner. |
| Readback/recovery check | Coordinator or an already authorised verifier | Verify the actual retained bytes and reconstruction; report who did it and limitations honestly. |

These are responsibilities, not instructions to spawn agents. One coordinator can do the bounded operational work. Use an existing independent reviewer only when the accepted route requires it; do not create six reviewers or launch security scans for this inventory.

Before copying, bind these execution inputs in the existing record:

| Input | Value to obtain | Default while unresolved |
|---|---|---|
| Existing task/Issue/PR/handoff | Actual record and permission to update it. | Prepare a private draft; do not publish it. |
| Source allowlist | Verified physical roots for the six targets, plus specifically authorised external evidence. | Read only the known metadata; do not sweep the user profile. |
| Evidence root | Existing approved restricted location, outside every targeted/removable worktree. | Continue read-only inventory; preservation remains blocked. |
| Recovery-test root | Approved private scratch separate from source and evidence roots. | Do not reconstruct into a source worktree. |
| Capture checkpoints | Actual owner acknowledgements for each target; include any shared mutable evidence group. | Provisional observation only; no coherent-snapshot claim. |
| Retention/reassessment | Applicable existing policy plus concrete next consumer/checkpoint. | Hold for Max's decision; invent no automatic expiry. |

Neither a plausible directory name nor a convenient cloud-sync folder is an approved destination. Avoid a destination under the main checkout, under either `.sdlc/runtime/worktrees` hierarchy, or under a containing worktree whose removal could delete it. The chosen location must already have appropriate confidentiality; needing changed ACLs or a new storage service is an operator dependency, not permission to create one. [R2, R3]

## 4. Execution sequence

Perform **WP0.1 → WP0.2 → WP0.3**, then **WP0.4–WP0.6 per available worktree**, then **WP0.7**. An unknown owner in one worktree must not prevent safe authorised preservation of the others. Start high-value capture with WT-01/WT-06 and WT-05 where their owners can provide checkpoints, but do not delay a ready sole-copy resource to enforce that ordering.

### WP0.1 — Establish a non-interfering operating position

**Input:** the parent WP0, original handoff, effective local repository instructions and existing permissions.

1. Read the actual local `AGENTS.md` and relevant SDLC documents before the source walk. Record their revision/content identity and any material difference from the researched source. Do not reconcile proposed/adopted wording by editing it. [R1–R3]
2. Do not run `sdlc begin`, `verify`, `handoff`, `pause` or `resume` in any target: those records may belong to an existing execution. A cooperative capture checkpoint is not the SDLC `pause` transition. Do not clear `active.json` to make room for WP0.
3. Use an already authorised coordinator context. Any task-owned notes, command output or copy must be written outside source working files. Read archived task records as data; do not activate or edit them.
4. Record the actual tool versions and destination/readback permissions. Use existing supported tools. Do not upgrade Git, PowerShell, Python, Node, DCG or the agent as part of WP0.
5. Record a no-disposal instruction in the existing coordination record for these exact resources until their predicates are reviewed. This is an operational hold, not `git worktree lock`, a new hook or an OS lock.

**Output:** a short execution header containing actor, authority references, source boundary, destination, tool identities and no-disposal scope.

**Stop rule:** absent copy/storage authority prevents copying, not source inventory. An active task record does not prove current use, but it is sufficient reason not to overwrite or commandeer the execution.

### WP0.2 — Reconcile the native inventory and containment

**Input:** the six historical locators.

Use installed Git's supported inventory/path interfaces. Resolve each target's top level, administrative Git directory, common Git directory and HEAD through Git. A linked worktree has per-worktree and shared administrative data; do not build `.git/worktrees/<name>` paths by string substitution. Use the native `--git-path` result for the index and `logs/HEAD`. [G1, G2]

For every target distinguish:

- registered and present at the historical path;
- registered at a different path, with evidence linking its identity;
- directory present but no matching registration;
- registration present but directory unavailable;
- absent, with or without an attributable removal/preservation record.

A nonzero Git result is an error to retain, not an empty directory. A missing child path must not accidentally cause Git to inspect its containing repository. Check path existence and compare the returned top level with the intended filesystem identity before collecting task content.

Capture the native inventory before and after the execution. Keep the six original rows even when live state differs. For new registrations, record enough metadata to identify their relationship, then obtain scope before copying unrelated content. Do not run `worktree prune` or `repair` merely to tidy the inventory.

**WT-05 boundary:** independently resolve the inner worktree; record its containment in SHACL and the outer owner's obligation to retain that containing path while the inner target is unresolved. Do not traverse the outer worktree as part of an inner capture. Do not infer technical support for nesting merely because the path currently exists.

**Output:** a dated reconciliation table with actual full paths, full SHAs, attachment, native Git/common-directory identities, observed availability and historical differences.

**Acceptance:** every original row has a current observation or an explicit inaccessible/missing disposition. Eight current registrations is not an expected-value test; the inventory may legitimately have changed.

### WP0.3 — Establish owners, purpose and consumers

**Input:** live inventory and specifically relevant task evidence.

Search the known task boundary only: each target's lifecycle record/handoffs/runs, referenced plan or execution document, originating task/subagent record available through supported interfaces, and already linked Issue/PR. Use Issue #25 for the MCP task and Issue #31 for the SHACL baseline only where the local records actually link them. Issue #32 may identify encoding evidence, but does not establish ownership of every MCP file.

Obtain an attributable owner acknowledgement that identifies:

- worktree and task/execution identity;
- purpose: implementation, independent verification, negative control, baseline preparation, recovery copy or another evidenced role;
- current candidate and whether work is still being written;
- outstanding reviewers, jobs or other consumers and their next step;
- required unique content, relevant external evidence and current retention restrictions;
- agreed checkpoint for an internally consistent capture.

A process inventory is supporting information, not proof of no consumers. Read-only reviewers and future named consumers matter too. If process inspection is denied, record that limitation rather than elevate or terminate processes. Inspecting task records is not permission to read arbitrary session databases or the entire host profile.

For WT-01/WT-06, record separately whether the source candidate matches and whether the verification/review evidence is independent. For WT-02, ask what altered input or implementation makes the expected negative result meaningful; do not fix the control. For WT-05, preserve the baseline directory without changing its acceptance status.

Record an unknown owner as **unknown, decision with Max**, not “Max created this worktree.” Max can accept stewardship of unresolved preservation without being retrospectively identified as the original author.

**Output:** owner/purpose/consumer fields in the same disposition table, with evidence references.

**Stop rule:** inability to establish consumer release blocks any future disposal. It need not block an authorised conservative copy; such a copy may still lack a stable checkpoint and must be labelled accordingly.

### WP0.4 — Define the required recovery set

**Input:** native file inventories, local task records and the owner acknowledgement.

Keep three separate meanings: committed Git history, the index/staging state, and actual working files. Add retained evidence and only the ignored/external data needed for the recovery claim. Git status alone omits relevant ignored material. [G3, G4]

The default selection is all present tracked working files and non-ignored untracked task files, plus specifically relevant ignored evidence/reproduction data. Before capture, review large recreatable directories as groups rather than inspecting every dependency/cache file. Do not copy every `node_modules`, `.venv` or build cache merely because it exists. Conversely, do not omit a modified dependency or generated candidate needed to reproduce a finding merely because it is normally regenerable.

| Content | Required preservation and interpretation |
|---|---|
| Committed candidate/history | Full selected commit identities and sufficient Git objects to restore them without the original worktree/common repository. Include necessary local/detached/reflog-only checkpoints. |
| Staged state | Native stage/mode/object/path inventory and required object bytes. Preserve partial staging and conflict stages when present; a raw index alone is insufficient if its objects are absent. |
| Tracked working files | Raw current bytes, original relative path, type and checksum. Record expected absences for tracked deletions. Do not restore deleted source files. |
| Untracked files | Raw bytes and provenance; preserve by default until specifically classified otherwise. Do not stage them to simplify capture. |
| Ignored evidence | Actual failed/successful runs, handoffs, review/scan bundles, reproduction inputs, and needed candidate artifacts. Keep sealed bundles intact, including relative links. |
| Regenerable installation/cache | Record relevant version/lock/recipe identity and the owner's specific reason to exclude it. A pinned lock is not evidence that an external registry will remain available; do not promise offline environment recreation unless its inputs are retained and tested. |
| Live database or rotating log set | Coordinate a stable set or use the tool's supported snapshot/export under existing authority. Ordinary copying during writes is provisional, not application-consistent recovery. |
| Credentials or private security evidence | Retain only through appropriate restricted storage and access. Put a non-sensitive locator in public-facing records; do not paste contents or low-entropy secret hashes. |
| Symlink/junction/reparse point | Inspect without following it into another tree. Record the link/reparse type and target where permitted. Required target content needs explicit scope and separate capture. |
| Git LFS/submodule/alternate object dependency, if encountered | Identify and preserve the required actual content through its existing native tooling; a parent Git blob, pointer or gitlink is not a backup of the external content. Do not silently fetch or install missing material. |
| NTFS-specific metadata, if material | Record whether alternate streams, permissions, encryption or link topology are part of the recovery need. Use an approved tool that preserves them or retain an explicit gap. Do not claim a full NTFS image from regular-file hashes. |

**Named evidence to locate from the handoff:**

- `docs/reviews/2026-09-09-mcp-workspace-modernization-execution.md`
- `docs/reviews/2026-09-09-sdlc-windows-verification-encoding-bug.md`
- `docs/plans/2026-09-09-mcp-candidate-version-configuration-proposal.md`
- `docs/plans/2026-09-09-mcp-workflow-policy-digest-proposal.md`
- WT-05's `docs/sdlc/baselines/issue-31/`

Search those exact names in the six selected roots. Record absence as absence. Preserve different copies under their worktree identities; never overwrite by basename. Inspect the baseline directory's actual files and companion metadata; do not promote an unaccepted snapshot to an accepted baseline. [H1]

**Output:** a scoped capture manifest with included objects/files, explicit deletions, excluded recreatable groups and reasons, external locators, restrictions and gaps. This is snapshot evidence, not a new operational task registry.

**Acceptance:** every material category is included, supported by a retrievable external copy, explicitly excluded with a recovery limitation, or held for a decision. Unknown required content cannot be silently classified as expendable.

### WP0.5 — Capture a stable, create-only recovery package

**Input:** approved store, required recovery set and an owner-coordinated capture checkpoint.

#### A. Establish capture consistency

For the individual worktree, record checkpoint acknowledgement and capture start. Record HEAD/attachment, index inventory and relevant file/evidence inventories before copying. Writers of the selected content should refrain from changing it until the capture is checked. Coordinate only relevant shared evidence; unrelated worktrees can continue.

Hash the selected source files, copy them, then read/hash the retained copies and recheck source membership, bytes, stage inventory and HEAD. End the checkpoint explicitly. A before/after match is corroboration, not a transactional snapshot or proof that an uncoordinated writer never changed anything in between. Do not label a changing copy stable simply because its counts match.

If a writer cannot provide a checkpoint, a permitted best-effort copy can reduce risk but is labelled **provisional**. Preserve its limitations and obtain a later stable capture before satisfying the coherent-candidate acceptance criterion. Do not kill a process, modify lifecycle state, or introduce a system-wide freeze.

#### B. Preserve Git history through native Git

Use a self-contained Git bundle for each distinct required history set, created outside the source. Specify a named `HEAD` and any other required in-scope commit tips explicitly. Do not assume an all-refs bundle is a backup of staging or working files, and do not rely on the continued existence of a local branch. [G5]

Example, after binding the real variables and required commit list:

```powershell
# Source read; writes only the new, approved destination file.
git --no-optional-locks -C $Worktree bundle create $BundlePath HEAD @AdditionalRequiredCommitOids
if ($LASTEXITCODE -ne 0) { throw 'Git history preservation failed; retain the error and keep the source.' }
```

`$AdditionalRequiredCommitOids` is an array of validated, required commit IDs, including any necessary reflog-only checkpoint identified in WP0.4; it may be empty. `HEAD` provides the named reference. Resolve and record the full candidate SHA before/after. Enumerate and verify every required commit in the independently restored object store; advertised bundle heads alone are not sufficient for additional raw commit IDs.

Use a fresh destination so there is no previous bundle to overwrite. Do not create backup branches/tags in the source. Sharing an already validated identical history bundle between worktree packages is optional; keep the per-worktree provenance and do not build a deduplication mechanism for this task.

#### C. Preserve the index separately

Retain `git ls-files --stage -z` as raw output. For each needed staged blob not already safely retained, use `git cat-file blob <object-id>` and store its exact output under its object identity. During recovery use Git's object importer and verify that the resulting object ID is unchanged. Preserve stage numbers and modes, including unmerged entries if present. Git owns the index/object interpretation. [G4, G6, G7]

A copied raw index and its dependent split-index file may be useful evidence, but do not install them into another live checkout. Record exceptional flags or in-progress merge/rebase state when material. If exact operation resumption is required, qualify it separately; this plan's normal recovery is the candidate, staging semantics and required evidence, not arbitrary resurrection of a running Git operation.

#### D. Preserve working files and evidence as data

Create a raw file copy for the selected regular files with original relative names, sizes and SHA-256 values. Preserve BOMs, line endings, binary bytes and intentional absence. Do not pass file content through a formatter, Markdown renderer, JSON reserialiser or Git clean/smudge filter. Capture complete required evidence bundles without editing their native manifests.

Use the already approved byte-preserving copy/backup primitive against inspected exact paths and new destinations. Do not use mirror, purge, move, overwrite or privileged backup-mode options. With Node's existing filesystem API, a bounded helper can use exclusive creation/copy and independent readback; this is not proof of complete NTFS metadata preservation. With Robocopy, verify actual option and exit-code semantics rather than treating only zero as success. Neither tool's success is the acceptance oracle; manifest/readback checks are. [N1, M2]

Do not create source-linked hard links, object alternates or symbolic links and call them independent copies. A snapshot needs retained bytes, not another reference to the same mutable file. Do not follow a link during recursive copying; links require their own disposition. Unknown reparse behavior stops that item.

Machine-readable Git output and blob bytes must use a byte-preserving native capture. PowerShell 7.4+ preserves native stdout bytes through direct redirection, but text pipelines and combined diagnostic streams are not interchangeable with that contract. Record the actual host version and keep stdout/stderr separate. Do not route preservation through the already suspect Python text/reporting path and presume #32 is repaired. [M1, P1]

#### E. Finish and retain failures

Write the completion receipt last, after reads are closed and the manifest and readback checks succeed. Preserve failed/incomplete attempts with their actual status; never overwrite one attempt with a green successor. On a source change, retain the attempt as provisional and recapture only the affected consistency group at a new checkpoint. Changes to unrelated refs/tasks do not by themselves require recopying all six worktrees.

**Output:** identifiable history/object/file/evidence packages and a capture receipt for each stable checkpoint, or a precisely bounded preservation failure/provisional status.

**Acceptance:** the package is readable from its actual retained destination; required bytes and absences match the captured state; required history is self-contained; no source, source index, lifecycle record, branch, registration, guard or configuration was changed by WP0.

### WP0.6 — Prove recovery without touching the originals

**Input:** completed capture and a separate approved recovery-test location.

1. Reopen the retained destination using the intended reader identity. If the store synchronises asynchronously, test the actual retained object, not only a local unsynchronised cache; otherwise report only local durability.
2. Verify every required copied file's length and SHA-256. Confirm the expected membership set and recorded deletions, not just equal file counts. Check that every included evidence locator resolves and that required bundle-relative links still resolve within the preserved package.
3. Verify the history bundle in an empty, independent Git repository. Restore its objects locally, without contacting origin or borrowing the source object store. Confirm every required commit ID. This detects missing prerequisites that could be hidden by verification in the original repository. [G5]
4. For each distinct dirty candidate, reconstruct the captured working-file set and required index semantics in an independently initialised recovery repository. Import retained staged blobs; rebuild the index with Git's native facilities. Preserve deletion and partial-staging differences.
5. Compare restored regular-file bytes, the native `(path, mode, object, stage)` map, intended absences and applicable Git change inventory with the captured oracles. Use raw snapshots/manifests prepared from the source—not expected values produced by the restoring implementation.
6. Keep archived `.sdlc/runtime` records and native security bundles as retained evidence. Do not run `sdlc resume`, open an agent session in the reconstructed tree, activate archived host configuration, invoke project hooks, install dependencies or execute candidate code merely to verify copying.
7. For identical candidate manifests, one reconstruction may cover the shared candidate, provided each worktree's distinct evidence and ownership mapping is separately read back. Any differing relevant byte, staged state or control requires its own check. WT-02's intended failure is preserved, not required to become green.
8. Record the tester, exact input/package identities, commands, results and limits. Coordinator verification is not independently executed product review. Dispose of ordinary verification scratch only under its existing authority after required check evidence is retained; disposal of the original six targets is still outside WP0.

**Output:** recovery-check receipt linked to each original worktree/snapshot. A readback-only result is labelled as such; do not report Git reconstruction, application consistency or environment reproduction that was not tested.

**Acceptance:** every required unique candidate/evidence set is recoverable within its declared boundary without the original source. Recovery blockers stay visible and prevent an unqualified WP0 completion claim.

### WP0.7 — Record disposition and hand over actionable findings

**Input:** inventory, owner evidence, captures and recovery checks.

Update the existing task/Issue/PR handoff with a dated WP0 section. Store detailed locators and contents privately where required; the public-facing record only references a safe evidence identity. Keep the original handoff unchanged.

For each worktree choose a truthful disposition, for example:

- retained for a named active implementation/reviewer;
- preserved, awaiting consumer release;
- preserved, ownership/retention decision with Max;
- preservation incomplete because of a named access/consistency/content gap;
- missing or changed since the historical handoff, with its evidence and recovery consequence.

These are descriptions in the record, not new CLI states or a removal eligibility service. Even “preserved, no consumer found” is not disposal permission.

Answer the seven questions from the handoff only to the extent the local evidence supports them. Identify any release decision or guard-block event actually found; do not issue a removal command to manufacture a reproduction. Absence of a located event is not proof that none occurred. Treat the shared branch position, duplication and nesting questions independently of cleanup eligibility.

Route bounded findings to their existing owners: Unicode/evidence-store failures to WP1/#32, execution/isolation findings to WP2/#33, missing surfaced release obligations to WP3, and actual command-classification evidence to WP4/#30. Do not file duplicate issues or publish sensitive logs by assumption.

**Output:** one current disposition section plus linked raw evidence; each unresolved row has a decision owner and concrete reassessment event.

**Acceptance:** all six original rows are accounted for, required unique bytes have a tested recovery path, and no unauthorised cleanup occurred. Ownership uncertainty can remain as an explicit accepted hold; a missing required byte or unverified preservation cannot be converted into success by assigning a hold.

## 5. Native inspection runbook

These are command contracts, not a bulk script to run blindly. `$Worktree`, `$OutputDirectory` and other variables must be bound to inspected, authorised locations. Run one target at a time; record exit status immediately. Check containment and actual filesystem identity before using a reported path. All raw outputs go to newly created private files outside the targets.

### 5.1 Repository registration

```powershell
$Repository = 'C:\Users\maksy\GitHub\universal-ontology'

git --version
if ($LASTEXITCODE -ne 0) { throw 'Git is unavailable.' }

git --no-optional-locks -C $Repository worktree list --porcelain -z
if ($LASTEXITCODE -ne 0) { throw 'Worktree inventory failed; do not infer an empty list.' }
```

Capture NUL-delimited stdout without text conversion. Use the documented record format rather than split-on-whitespace parsing. The `--no-optional-locks` global option avoids optional Git index-refresh writes during observation; it neither bypasses native command protection nor establishes exclusive ownership. [G1, G3]

### 5.2 Per-worktree commands and evidence outputs

| Command after `git --no-optional-locks -C $Worktree` | Retain as | Purpose |
|---|---|---|
| `rev-parse --show-toplevel` | identity field/raw output | Verify this is the intended worktree, not its parent. |
| `rev-parse --absolute-git-dir` | identity field/raw output | Resolve this worktree's administration. |
| `rev-parse --path-format=absolute --git-common-dir` | identity field/raw output | Resolve shared administration without guessing. |
| `rev-parse --path-format=absolute --git-path index` | identity field/raw output | Locate the actual index for permitted read-only evidence. |
| `rev-parse --path-format=absolute --git-path logs/HEAD` | identity field/raw output | Locate the HEAD reflog; absence is a recorded limit. |
| `rev-parse --verify HEAD` | `head.txt` | Obtain the full revision identity. |
| `rev-parse --show-object-format` | `object-format.txt` | Use matching object semantics for recovery. |
| `rev-parse --is-shallow-repository` | `shallow.txt` | Expose a possible history completeness limitation. |
| `symbolic-ref --quiet HEAD` | `attachment.txt` | Native attached ref; exit 1 for a detached HEAD is not an inventory failure. |
| `status --porcelain=v2 --branch -z --untracked-files=all` | `status-before.bin` | Staged/unstaged/untracked observations. |
| `ls-files --stage -z` | `index-entries.bin` | Exact stage, mode, object and path records. |
| `ls-files --cached -z` | `tracked-paths.bin` | Index-tracked path membership. |
| `ls-tree -r --name-only -z HEAD` | `head-paths.bin` | Baseline paths, including paths deleted from the index. |
| `ls-files --others --exclude-standard -z` | `untracked-paths.bin` | Non-ignored untracked paths. |
| `reflog show --format=%H HEAD` | `head-reflog-oids.txt` | Candidate local history needing a preservation decision. |
| `diff --cached --binary --full-index --no-ext-diff --no-textconv --no-renames HEAD --` | `staged.patch` | Supplemental index-vs-HEAD evidence. |
| `diff --binary --full-index --no-ext-diff --no-textconv --no-renames --` | `unstaged.patch` | Supplemental worktree-vs-index evidence. |

Patches are optional explanatory evidence, never the only copy. If custom filters, incomplete object stores or other unexpected behavior would require execution or network retrieval, retain the boundary and stop that operation; native Git does not authorise arbitrary filter programs or fetching. Verify commands against the installed Git help before use where a capability is uncertain. [G2–G6]

For ignored material, start from the owner-declared evidence locations and a bounded filesystem inspection. This targeted Git command is useful after its path is confirmed:

```powershell
git --no-optional-locks -C $Worktree ls-files --others --ignored --exclude-standard -z -- .sdlc/runtime/
if ($LASTEXITCODE -ne 0) { throw 'Ignored evidence inventory failed.' }
```

Do not treat its result as a complete recursive inventory of nested repositories, reparse targets or tool-managed databases. Review the exact target directory without traversing links. Check the native registered-worktree inventory first so a nested worktree can be treated as its own target, not copied recursively as anonymous ignored data.

Record stage conflicts, partial staging, absent index/reflog files, skipped-worktree or assume-unchanged entries, and in-progress operations when actually present. Do not clear an index lock or normalise the index to make observation easier.

### 5.3 Raw-output capture on the actual host

For PowerShell 7.4 or later, direct native stdout redirection is a documented byte-preserving boundary. The following is a pattern after verifying the version and creating a fresh owned destination:

```powershell
if ($PSVersionTable.PSVersion -lt [version]'7.4') {
    throw 'This redirection recipe requires PowerShell 7.4+; use an already qualified byte-capture interface.'
}

$StatusOutput = Join-Path $OutputDirectory 'status-before.bin'
$StatusError = Join-Path $OutputDirectory 'status-before.stderr.txt'
if ((Test-Path -LiteralPath $StatusOutput) -or (Test-Path -LiteralPath $StatusError)) {
    throw 'Capture targets must be new; preserve existing evidence.'
}

git --no-optional-locks -C $Worktree status --porcelain=v2 --branch -z --untracked-files=all > $StatusOutput 2> $StatusError
$StatusExit = $LASTEXITCODE
if ($StatusExit -ne 0) { throw "Status capture failed with exit $StatusExit; retain both outputs." }
```

The destination has one writer and is inspected as part of the approved capture. The existence check is not a general race-proof filesystem protocol. Do not use `*>`, `Tee-Object`, `Out-File`, JSON reserialisation or an in-memory text pipeline for payload/blob bytes. Stderr is diagnostic evidence and must remain separate from source bytes. A blocked command is preserved and escalated rather than expressed through another tool to evade the denial. [M1, R3]

## 6. Recovery package and manifest contract

Use the existing evidence system. The following layout is a concrete task-local arrangement **within that system**, not a requirement to create a new store or SDLC directory:

```text
<approved-evidence-root>/<existing-change-id>/wp0/<capture-id>/
  capture.md
  inventory/
    worktrees-before.bin
    worktrees-after.bin
  history/
    <identified-history-set>.bundle
  WT-01/
    identity.json
    manifest.json
    git-observations/
    index-objects/<object-id>.blob
    working-files/<original-relative-path>
    retained-evidence/<original-relative-path>
    recovery-check.json
  WT-02/ ... WT-06/
```

Do not recreate a copied `.git` file as the administration of this package. A linked worktree's `.git` pointer is a historical locator, not a self-contained Git repository. Store it as inert metadata only if required; the native bundle and index-object evidence are the recovery inputs. Keep sensitive environment/configuration evidence private and inactive.

`identity.json` records actual source path, resolved Git/common-directory identity, original attachment, full HEAD, object format, capture checkpoint/time interval, task/owner references and history-package locator.

`manifest.json` needs only the data this capture uses:

| Field/group | Meaning |
|---|---|
| Capture/worktree identity | Identifies the exact attempted snapshot, not a reusable agent lease. |
| Source checkpoint | Owner reference and before/after candidate observations. |
| `entries` | Original relative path, classification, entry type, byte length, SHA-256, retained locator and original stage/mode/object references where applicable. |
| `absentPaths` | Explicitly absent tracked paths that must remain absent on reconstruction. |
| `links` | Non-followed link/reparse observations and separate target disposition. |
| `excludedGroups` | Precisely scoped recreatable groups, reason, owner/obligation decision and limits. |
| `externalEvidence` | Approved retrievable locators, identities and actual retrieval checks. |
| `errors` / `gaps` | Unreadable, changed, inaccessible or not-yet-qualified items. |
| Validation reference | Actual readback/recovery result and actor. |

This is an evidence serialization, not a new published JSON Schema or operational API. Reuse a suitable existing manifest/export if one already supplies these facts. Do not implement a custom Git index parser, archive format, transactional backup system or retention service.

Protect metadata too: full local paths, reports, configuration and hashes can be sensitive. A public handoff may use only worktree labels and restricted evidence references. Do not mutate a native security bundle to redact it; retain the original in the proper store and prepare an explicitly separate sanitised summary.

## 7. Recovery verification specification

### 7.1 Assertions for each actual capture

| Check | Required observation |
|---|---|
| Target identity | Reconstructed HEAD is the captured full revision; no substitute current `main`. |
| History availability | Each required local/detached/reflog-only commit can be read from the independently restored object database. |
| Working content | Every selected regular file has equal length and SHA-256, with original path spelling and bytes. |
| Deletions | Every intentionally absent tracked path remains absent. |
| Index | Original path/mode/object/stage inventory matches; staged bytes do not accidentally become the unstaged version. |
| Untracked content | Required new files are recovered even though absent from any committed tree. |
| Ignored evidence | Required failed and successful results are present with their original identities and relationships. |
| Native bundles | Original bundle file membership and required relative references are intact. |
| External independence | No source `.git` pointer, object alternate, source-linked file or network fetch is needed for the declared recovery. |
| Source preservation | Source content/index/task-state comparisons show WP0 made no changes; attributable owner activity is recorded separately. |

For index reconstruction, Git's existing `hash-object -w --stdin`, `read-tree --empty` and `update-index -z --index-info` can import retained objects and the stage map **only in a fresh authorised recovery repository**. This deliberately writes the recovery repository, not the source. Do not emit these as maintenance commands for the original checkout. Mode `160000` entries require the separately scoped submodule handling rather than a blob import. Exceptional index flags or operation state need separately stated qualification. [G6–G8]

Byte equality is not product correctness. Do not run the MCP server, materialise an exploit, repair a negative control or launch the expensive R2 full profile to demonstrate that a copy is readable. Product acceptance remains with the originating tasks.

### 7.2 Qualification actually performed for this plan

A small disposable fixture exercised the native recovery recipe on **Linux, Git 2.47.3**. It established:

- a self-contained bundle with named `HEAD` plus an explicitly selected detached checkpoint retains that otherwise unreferenced commit;
- the bundle alone does **not** contain a staged-only blob, which was the expected negative control;
- separately exported/imported index objects and raw working files recover partial staging, binary content, an unstaged deletion and a Unicode untracked path;
- CRLF/Unicode bytes and ignored failed/successful run records remain intact;
- capture/reconstruction left the fixture source index bytes and Git status unchanged.

The retained result is `recovery-recipe-check.json`. It is bounded tool-recipe evidence, not execution of the six worktrees or a synthetic SDLC-adoption pilot. The actual Windows host, DCG path, PowerShell transport, NTFS/reparse/stream/ACL behavior, live-writer consistency and unmerged-index recovery have **not** been qualified by that fixture. [E1]

## 8. Failure handling and continuation

| Condition | Required response | Effect on completion |
|---|---|---|
| Owner or purpose unknown | Preserve under existing authority when possible; record Max as decision owner, not fabricated originating owner. | Ownership hold can remain; required recovery still must be demonstrated. |
| Writer still active | Agree an individual checkpoint, or take a clearly provisional permitted copy. | No stable-snapshot claim until resolved. |
| Required file changes during capture | Retain the attempted capture and observations; recapture its consistency group at a new checkpoint. | That capture remains provisional. |
| Required bytes unreadable/missing | Retain exact failure and locate any authorised existing copy; do not clear ACLs/locks. | Preservation incomplete. |
| Insufficient storage | Estimate required data and reuse genuinely identical retained history where simple; request capacity or record a gap. | Do not omit unique bytes to fit a quota silently. |
| Destination already exists | Preserve it; use a new task-owned capture identity after inspecting the conflict. | No overwrite-based retry. |
| Checksum or manifest mismatch | Keep both observations; diagnose capture consistency/transfer before retry. | Recovery not accepted. |
| Secret/private evidence found | Stop disclosure; use the existing restricted handling path. | Other non-sensitive targets may proceed. |
| Required link target outside scope | Preserve link metadata; bind separate scope or retain a target gap. | No complete claim for dependent content. |
| Guard denial | Record original operation/rule and seek the scoped operator decision. | Do not switch command, interpreter or tool to achieve the same denied action. |
| No consumer-release evidence | Keep the worktree with a named reassessment trigger. | Not a WP0 failure if preservation is complete; always prevents disposal. |
| Registered worktree is absent | Record observed absence, locate attributable history/evidence and report any unrecoverable gap. | Never mark “removed safely” from absence alone. |

Do not repeatedly diagnose a capture tool inside WP0 while leaving sole-copy evidence unsecured. Retain what is safely capturable, surface the precise blocking operation and use the existing operator route. This adds no permission to circumvent a block.

## 9. Final handoff template

This replaces or extends the existing disposition section; it is not a separate issue requirement. Populate actual results before reporting completion. Do not turn the placeholders below into claims.

```markdown
## WP0 — Worktree preservation and ownership

Observed at: <actual UTC timestamp>
Coordinator and authority: <actual actor/reference>
Historical source: sdlcworktreelifecyclehandoff20260910.md (unchanged)
Preservation root: <approved restricted locator or safe evidence reference>
Recovery scope: <source/index/history/evidence; explicit environment/metadata limits>

| Worktree | Live identity / role | Owner and consumer evidence | Verified retained snapshot | Current disposition | Next actor and reassessment event |
|---|---|---|---|---|---|
| WT-01 mcp-workspace-modernization | <observed> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |
| WT-02 mcp-semantic-negative-control | <observed> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |
| WT-03 mcp-projection-verification | <observed> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |
| WT-04 mcp-query-verification | <observed> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |
| WT-05 shacl-policy-baseline | <observed; containing SHACL owner> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |
| WT-06 mcp-final-verification | <observed> | <confirmed or unknown> | <capture/result or gap> | <actual> | <actual> |

Differences from historical inventory: <actual observations>
Required content still unpreserved: <actual gaps, or none after verification>
Ownership/retention decisions: <specific unresolved questions and decision owner>
Nested boundary: <WT-05 and outer-worktree obligations>
Guard/access limitations: <actual attempted operations and retained evidence>
Source mutation by WP0: <observed result; investigate any unexpected change>
Removal by WP0: none.
Product/security acceptance claimed by WP0: none.
WP0 acceptance: <accepted / preservation accepted with ownership holds / incomplete>
Follow-up references: <existing work packages/issues; no raw private material>
```

Use event-based reassessment such as “MCP owner accepts the retained candidate”, “query verifier retrieves and accepts replacement evidence”, or “Max resolves WT-05 baseline stewardship.” These are examples, not established consumers. Add a date only when the owner actually agrees one. An event/date triggers reassessment, never automatic deletion.

## 10. Acceptance checklist

| ID | Requirement | Pass evidence |
|---|---|---|
| AC0-01 | All six historical survivors are reconciled. | Six dated rows, actual native observations and explicit differences/availability gaps. |
| AC0-02 | Main/outer user worktrees remain outside preservation scope. | Only needed boundary metadata was read; WT-05 containment and outer owner are recorded. |
| AC0-03 | Purpose/ownership/consumers are attributable or explicitly unresolved. | References/acknowledgements or a named Max decision hold; no inference from filename alone. |
| AC0-04 | Required content scope is explicit. | Tracked/index/untracked/ignored/history/evidence treatment and justified exclusions. |
| AC0-05 | Required unique bytes are retained. | Actual readable payloads, not merely diffs, filenames, hashes or unavailable URLs. |
| AC0-06 | Declared history and index recovery is complete. | Required commits/staged objects and native stage maps recovered independently. |
| AC0-07 | Capture consistency is honest. | Owner checkpoint and before/copy/after evidence, or explicit provisional/incomplete status. |
| AC0-08 | Recovery was tested from the retained copy. | Full included-file readback and bounded reconstruction of distinct candidate states. |
| AC0-09 | Counterevidence and original baselines are preserved. | Failed runs, negative controls, variant reviews and baseline bytes retained without semantic promotion. |
| AC0-10 | Confidentiality is preserved. | Approved private storage/access; sanitised references rather than raw public evidence. |
| AC0-11 | No source/control/disposal mutation occurred. | No source edits, lifecycle transitions, commits, branch/worktree operations, settings changes or guard bypass. |
| AC0-12 | Every survivor has a next disposition. | Existing handoff records owner/decision holder, consumer or reason, and bounded reassessment event. |

**Acceptance outcomes:**

**Accepted:** all preservation/recovery requirements hold and ownership/consumer disposition is established.

**Preservation accepted with ownership holds:** required bytes are recoverable and all resources are accounted for, but Max retains explicit ownership/retention decisions. This is compatible with the parent WP0. It does not permit disposal.

**Incomplete:** any required byte, history, evidence, access, consistency or recovery test remains unestablished. Report completed rows and blockers rather than forcing a global pass.

The approving record must identify which of these applies. Do not require all six resources to be deleted as a WP0 success metric.

## 11. Expected change surface and proportionality

The normal WP0 change surface is **the existing handoff section and approved retained evidence only**. There is no planned edit to `scripts/sdlc.py`, `_sdlc_state.py`, schemas, skills, `AGENTS.md`, package/lock files, test configuration or CI. There is no new implementation branch merely to inspect six existing worktrees.

Use ordinary source/candidate copying and native Git recovery, not broad requalification. One bounded fixture/check of the selected mechanism plus actual all-required-byte readback is appropriate; do not introduce full mutation testing, repeated security campaigns, universal backup tooling or per-file ownership bureaucracy. Do not suppress an existing required control; keep the plan's new work outside source/fingerprinted inputs where the current method allows.

Repeated content may share validated retained bytes only when identities and provenance are preserved and the storage already supports it. Avoid deduplication during the first safety copy. Do not substitute reproducibility aspirations for actual copies of irreplaceable content.

## 12. Sources, identities and research limits

### Supplied basis

**[P1]** *SDLC reliability, worktree lifecycle and proportionality — implementation plan*, 10 September 2026, WP0. Uploaded file `../implementation-plan.md`, 62,272 bytes; SHA-256 `b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82`.

**[H1]** *Handoff — `.sdlc/runtime/worktrees` lifecycle in `universal-ontology`*, 10 September 2026. Uploaded file `sdlcworktreelifecyclehandoff20260910.md`, 13,079 bytes; SHA-256 `a9cf76ae85ab314b15e80164150e0a69d8c18af836c32a83e8ca689e1a4d16d6`.

These identify the supplied documents, not the current Windows source contents. Source-derived scope and historical facts are marked above. The sequence, package arrangement, conditional handling and acceptance checks are this plan's proposed implementation detail.

### Repository authorities read through GitHub

**[R1]** `AGENTS.md`, pinned SDLC revision `79d187802f9255134c03d0786ff75181ed1070ee`:
`https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/AGENTS.md`

**[R2]** `docs/sdlc/temporary-artefacts.md`, read from `main`; returned Git blob `ca648e3ed3406ef1e4994374440d4316bc236820`, matching the earlier inspected content. TA-01 through TA-08 supply classification, preservation, consumer and disposition responsibilities:
`https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts.md`

**[R3]** `docs/sdlc/temporary-artefacts-howto.md`, pinned revision above; operational sequence and DCG/legitimate-cleanup boundary:
`https://github.com/Hadden-Industries/universal-ontology/blob/79d187802f9255134c03d0786ff75181ed1070ee/docs/sdlc/temporary-artefacts-howto.md`

The handoff additionally identifies `docs/sdlc/subagent-playbook.md`, `command-safety.md`, `dcg-acceptance.md` and local host evidence as material execution references. Inspect their effective local content before performing relevant operations; this plan does not substitute a remote read for current host authority.

### Primary tool documentation checked for this plan

**[G1]** Git worktrees: registration, per-worktree/shared state and supported path handling.
`https://git-scm.com/docs/git-worktree`

**[G2]** Git revision/path resolution.
`https://git-scm.com/docs/git-rev-parse`

**[G3]** Git status: porcelain formats and optional index refresh.
`https://git-scm.com/docs/git-status`

**[G4]** Git file/index enumeration.
`https://git-scm.com/docs/git-ls-files`

**[G5]** Git bundles: self-contained history, verification, named refs and omitted non-history state.
`https://git-scm.com/docs/git-bundle`

**[G6]** Git raw object inspection.
`https://git-scm.com/docs/git-cat-file`

**[G7]** Git native index import.
`https://git-scm.com/docs/git-update-index`

**[G8]** Native recovery sequence additionally exercised in the bounded fixture below. `hash-object`/`read-tree` were used only in the disposable recovery repository; no target-host claim follows from that exercise.

**[M1]** Microsoft PowerShell redirection, including 7.4 native-byte behavior.
`https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_redirection?view=powershell-7.5`

**[M2]** Microsoft Robocopy: copy options and exit-status semantics. This is a conditional tool option, not an assertion it is the host's approved preservation tool.
`https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy`

**[N1]** Node filesystem native byte-copy/exclusive-create interfaces. Use the installed approved release's supported API; no new Node release is selected by this plan.
`https://nodejs.org/api/fs.html`

**[E1]** Locally executed synthetic native-Git recipe check: `recovery-recipe-check.json`, Linux/Git 2.47.3. The five recorded observations and platform limits are evidence of those tests only.

### Explicit limits

No Windows filesystem inventory, original worker interrogation, source snapshot, operator approval, private-store readback, actual worktree restoration or native DCG decision was performed during this research. No actual ownership, current count, completed handoff or deletion eligibility is inferred from public repository state. The requested Deep Research provider was not available through plugin discovery; research used the supplied files, connected GitHub reads, primary tool documentation and the explicitly bounded Git fixture.
