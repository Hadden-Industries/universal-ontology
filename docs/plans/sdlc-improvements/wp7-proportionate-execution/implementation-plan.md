# WP7 — Make proportionality an execution rule, not another document set

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

## Implementation proposal

**Prepared:** 11 September 2026. **Parent:** `../implementation-plan.md`, WP7. **Priority:** P2, with immediately useful operating guidance. **Accountable owner:** Max for changed acceptance, policy and configuration; the coordinator exercises existing accepted discretion. **Primary acceptance:** A13; representative-outcome contribution to A14, shared with WP8. [P0]

This is a plan for implementation, not an applied policy change, an accepted baseline, a report of executed repository tests, or authority to operate on an existing worktree. Proposed requirement words in this document describe this increment; they are not attributed to an external standard.

**Selected implementation:** a cohesive amendment to existing routing, execution and review instructions; narrowly extended preservation tests in the existing SDLC test suite; and observation through useful authorised work. Keep the current R0–R3 routes, verification profiles, receipt checks, workspace fingerprints, independent-assurance obligations and accepted product thresholds. Do not introduce a new classifier, result cache, task database, scheduler, runtime command, telemetry service, mandatory per-task document set, or automatic cleanup.

The central separation is between **the assurance required for an accepted result** and **when useful evidence is gathered during its implementation**. A focused check inside an R2 task does not lower its risk or finish its assurance. A historical full pass does not become a current pass simply because an intervening edit looks harmless.

Companion: [exact proposed instruction amendments](policy-amendments.proposed.md). The [verification catalogue](verification-catalogue.proposed.json) is a delivery aid for implementing this work package, not a new input consumed by the SDLC or a required file for ordinary tasks.

## 1. Parent contract, source boundary and current observations

### 1.1 Preserve the parent's organisation and obligations

| Parent requirement | Implementation in this plan | Completion evidence |
|---|---|---|
| Short execution statement in the existing accepted task | Section 3; WP7.1/WP7.3 | A small real task needs no additional Issue, matrix or baseline merely for cadence. |
| Separate risk from cadence | Section 4; WP7.4 | Focused edit-loop checks, affected integration checks, and the actual required final profile remain distinguishable. |
| Stop tracked-log feedback before changing fingerprints | Section 5; WP7.2/WP7.4 | Operational output can change without changing product inputs; tracked and executable/control Markdown remain protected. |
| No implicit selective result reuse | Sections 4–6 | No cache, receipt relabelling, hidden input exclusion or approval-by-file-extension is introduced. |
| Preserve ONI's mutation optimisation and assurance | Section 7 | Existing scheduling and thresholds remain; no blind CLI incremental mode. |
| Bounded specialist work | Section 8 | Each worker has a material question; relevant fixes receive relevant review; independence is not waived. |
| Bring representative outcomes forward | Section 9; O73 | Native delivered-artifact paths, not internal test totals, challenge the implementation. |
| Observe effectiveness using existing data | Section 10; O71/O72 | Reruns and pauses have attributable reasons; no invented saving or mandatory monitoring service. |

**A13 — proportionate routing:** low-risk prose does not inherit converter-release ceremony; security/control/contract inputs cannot hide behind a prose-only label.

**A14 — representative outcome:** the frozen WebVOWL candidate completes or honestly fails the AQFO artifact job; ONI's real packed consumer/description behavior is demonstrated. WP7 moves these checks to useful checkpoints and preserves truthful evidence. WP8 retains ownership of outstanding product repair and final selective adoption. An honest early failure is useful diagnostic evidence, not product acceptance. [P0]

The parent investigation's 72-hour window remains historical. The later observations below refresh this implementation plan; they do not rewrite the parent's findings as though those facts had been known during the original investigation.

### 1.2 Pinned research inputs

| Repository/surface | Inspected identity | What this establishes |
|---|---|---|
| Universal Ontology `main` | `a0374bad8203aa95f87a0e47a85013fd4b938c7e` | The inspected source/control baseline for this proposal. The latest merge concerns the WP2 baseline; a baseline merge is not WP2 implementation. |
| ONI `steam-community-bbcode`, PR #4 | Head `fe75c5d8e29f68e43812439fbc6ec73df2f43b05`; base `975acf599d06ec3d274c55bac8d1731278ffa153` | Current source and PR metadata read for this plan. The PR description still names older `f92f16d…` evidence. |
| WebVOWL `feature/webmcp-integration` | `80b302214d24bce195986af89ef7a34d24274928` | Includes the later production-preview D3 repair and updated completion record. |
| Supplied worktree handoff | Historical observations prepared 10 September 2026 | Preservation/ownership questions; not a current inventory or proof of orphaned worktrees. |

The Universal Ontology merge is dated 10 September 2026, 21:14:07 UTC—11 September, 00:14:07 in Cyprus. Research dates in this document therefore differ deliberately from the parent's filename. No new native Windows, browser, security-agent, mutation or remote CI qualification was performed during preparation. [S01, S10, S17, P1]

### 1.3 Findings that change the implementation starting point

**Existing rules already support proportionate execution.** The router gives R0 focused evidence, R1 affected evidence, and elevated routes their prior baseline and specified independent assurance. The playbook already rejects automatic specialist fan-out; TDD evidence guidance already permits fuller checks to subsume earlier scopes without duplicating equivalent work. The gap is application, clear triggers and consistent handoff—not the absence of an entire methodology. [S02–S07]

**WP1 is now visible in maintained implementation.** The inspected state reader accepts the maintained version-3 verification receipt, checks canonical/current agreement and exact task/input/configured-command relationships. The guide describes pending attempts, raw capture before presentation and retained failures. WP7 must preserve this delivered contract rather than import a previous draft or weaken it to make reuse easier. [S03, S08, S09]

**ONI's profile names do not imply all release checks.** Its `full` and `affected` profiles both invoke the affected-component runner. That runner selects the converter's existing `check` command, which includes installed-package tests but does not call mutation testing, live renderer qualification or registry publication. Additional accepted assurance obligations remain separate. This is why the implementer must inspect actual command composition before recommending that an alleged repeated release campaign be removed. [S11–S14]

**Later ONI work provides positive proportionality examples.** Its record describes short-check prerequisites before expensive mutation, an assertion-bearing renderer repair, correction of an unsupported independent-lawyer prerequisite, and retirement of an unsupported executable comparator with historical results preserved. The latest retirement reports 200 retained observations and four retained npm graphs—not the earlier five-provider/250-observation current result. These are recorded execution claims; the underlying local bundles were not reopened in this research. Do not reopen the superseded dependency repairs or reconstruct a fresh result from the stale PR description. [S10, S15, S16]

**WebVOWL progressed beyond the parent's AQFO failure.** The updated record reports native AQFO loading, source-grounded framing and independent inspection of the exported SVG. A later production-preview failure exposed unshipped D3 imports despite earlier development-server qualification; the latest commit repairs that boundary with a production-module regression and affected preview checks. The latest preview subset is not a new execution of every earlier browser job. Keep each claim bound to its own object and surface. [S17–S19]

**Active scope reclassification is a separately reported gap.** Issue #36 remains open: an accepted R1→R2 expansion could not be represented by the available native transition without misleading completion or direct state edits. WP7 must not advertise an unavailable `amend`/`reroute` command or claim that changing cadence repairs that defect. [S20]

## 2. Scope, authority and dependencies

### 2.1 What this increment changes

The default maintained change set is six existing instruction surfaces and the existing lifecycle test suite. `docs/sdlc/proportional-workflow.md` owns the consolidated cadence rule; the other surfaces connect their existing responsibilities to it. An implementation aid does not become a second requirements authority.

The proposal addresses: disproportionate milestone repetition; tracked progress-log churn; unclear distinction between risk and loop checks; unnecessary repeat research/reviewer dispatch; delayed consumer-outcome checks; and unsupported extra obligations invented during execution.

It does not remove a requirement simply because it is expensive. Material public contracts, security, concurrency, data or availability changes retain their proper route. An accepted 90% mutation gate remains accepted until an accountable amendment changes it.

### 2.2 Responsibilities

| Responsibility | Existing owner | Required action |
|---|---|---|
| Accept policy/assurance changes | Max/accountable SDLC authority | Accept exact instruction changes and any separately needed configuration change. |
| Choose ordinary execution cadence | Task coordinator within accepted discretion | Identify the next useful check, stop unnecessary repeats, preserve the final obligations. |
| Implement one slice | Assigned writer | Use the real source/test boundary, retain failures, stop before independent verification. |
| Independently verify | Authorised verifier | Receive accepted intent and frozen inputs; execute required independent checks; do not repair their own oracle. |
| Review correctness/principles | Existing reviewer, or permitted R0 self-check | Validate applicability, scope and evidence; reject invented mandatory prerequisites or disguised sensitive changes. |
| Own specialist/native security work | Existing selected specialist/native workflow | Answer the specific unresolved question; keep its own required phases and evidence. |
| Accept adopter use/remote operations | Relevant repository/operator owner | Approve deployment, pushes, CI dispatch, publication or other external action separately. |

**Risk for implementing WP7:** propose R2 for the cohesive change to assurance-selection instructions and their preservation tests, subject to the existing acceptance process. P2 is a priority, not the risk classification. This does not make every subsequent use of the guidance R2. Do not create a baseline or approval for each test fixture or ordinary prose edit.

### 2.3 Required dependency boundaries

| Dependency | What WP7 needs | What it does not assume |
|---|---|---|
| WP1 | Truthful persisted verification and its actual deployed receipt consumer | That every adopter has UO's new implementation. |
| WP2 | One owned physical checkout, stable verification input and no competing writer | That the recently merged WP2 baseline delivered the concurrency repair. Avoid competing starts while unqualified. |
| WP0/WP3 | Evidence retained outside disposable sole copies; owners/consumers remain visible | Any permission to remove the six historical worktrees or to deploy WP3's proposed commands. |
| WP4 | Required protected command paths work or remain explicit gaps | That a different spelling/tool may execute a denied operation. |
| WP5 | Native security coverage and approved alternatives retain their actual scope | That workflow inventory qualification fixes all omissions or Windows artifact I/O. |
| WP6 | Supported baseline/trusted-consumer format and actual remote readback | That a plan-format adapter solves active risk amendment. |
| WP8 | Final product and selective adopter qualification | That a past demonstration or this instruction amendment closes all product obligations. |

Preparation and instruction review may proceed while an adopter has a blocked capability. The blocked assurance claim may not proceed as though the capability existed. Do not make historical worktree cleanup or universal multi-repository adoption a prerequisite to the UO increment. [P0, P1, S20]

## 3. Add one execution statement to the existing task

### 3.1 Content and placement

At the first material planning point, reuse the accepted task, PR brief or retained handoff to state:

- the current deliverable and explicit non-goals;
- material risks and the already accepted route;
- one representative consumer outcome and its independent expected result;
- actual required checks, the next checkpoint and relevant rerun triggers;
- external capability dependencies and concrete conditions requiring a decision.

For a small task, one paragraph is sufficient. This is not a new form, Issue, structured state field, schema or separate approval. The router's existing output headings remain unchanged; its `Required verification` and `Next lifecycle step` sections can carry the information. Do not reopen accepted design, library or version choices merely because another milestone was reached. Reassess when relevant evidence or scope actually changes. [P0, S04]

**Illustrative low-risk statement, not a real accepted task:**

> Correct the explanatory sentence in the named maintainer note; do not change instructions, executable examples, interfaces, release content or policy. Use the accepted R0 route, inspect the actual sentence and link in context, and run the existing focused profile plus the relevant documentation check. Keep progress in this task. Stop for rerouting if the edit changes a command, contract, access rule or shipped artifact obligation.

**Illustrative elevated-task statement, not an approval:**

> Implement the accepted converter behavior without changing publication authority or the declared API. Keep the accepted R2 scope. Use the directly affected native tests while editing, the affected component checks at integration checkpoints, and the required full profile and specified independent/product qualifications on the frozen final target. Exercise the retained real-description input through the installed packed CLI. Reassess after changes to conversion rules, tests, package contents, dependencies, runtime, tool configuration or accepted assumptions; blocked guard, native coverage or artifact access remains a scoped evidence gap.

Neither example supplies a real baseline path, authorisation reference, result or usable release permission. Implementers must use actual task facts rather than copying an illustrative risk label.

### 3.2 Prevent expansion of the deliverable by process

A request to convert one description does not itself request a reusable package, comparison campaign or release pipeline. Conversely, ONI's accepted package scope cannot be retroactively called an R0 description edit to avoid its obligations. Distinguish the original accepted product, the currently authorised delivery checkpoint and deferred publication work. A local source handoff is not npm publication; a release-preparation task is not authority to activate publishers. [P0, S10, S15]

Every mandatory activity must trace to accepted intent, an applicable governing requirement, or an explicit decision arising from a concrete risk. Preserve research and licence assessment duties. Do not turn a recommendation for specialist advice into a universal independent-counsel requirement when the accepted source does not require it. Unresolved material terms still need an accountable decision. The later ONI record illustrates this correction; it is not a general legal conclusion about every future release. [S15]

### 3.3 Prevent artificial decomposition from lowering assurance

Use independently valuable, accepted slices to organise work, not to hide the accumulated R2 change. A focused run within the existing R2 execution stays an R2 execution. Do not repeatedly close or restart tasks to move `startingHead` past unfinished implementation or to reset acceptance scope.

A truly distinct follow-up may have a different justified risk, but must identify the earlier qualified object and its bounded delta. It does not erase remaining parent obligations. Where the installed lifecycle cannot record a necessary accepted scope/risk change, retain the original state, expose the conflict and follow a separately accepted supported transition. Do not edit JSON, fabricate a completed handoff, or pretend `resume` accepts a new risk argument. [S20]

## 4. Make cadence explicit without weakening completion

### 4.1 Execution checkpoints

| Checkpoint | Execute | Preserve/avoid |
|---|---|---|
| Before implementation | The cheapest required native compatibility/scope check that can invalidate the approach; a representative outcome when a usable seam exists | Reuse still-applicable research; do not repeat a complete market survey or create a synthetic project. |
| During the edit loop | Direct behavioral RED/GREEN, characterization or preservation checks appropriate to the change | Failed checks remain failures. A configuration/removal repair can use an actual prior native failure rather than an artificial unit-test RED. |
| Meaningful integration point | Affected consumer/component checks over the actual integration delta | Do not promote a narrow slice's pass into coverage of the whole accepted change. |
| Independent review checkpoint | General review and the risk-triggered specialist questions on a frozen object | No concurrent source writer, role fan-out by default or repeated resolved questions. |
| Final consequential object | Every currently required route profile and accepted independent/product obligation on its proper target | No missing checks disguised as subsumption; no stale profile or metadata substitution. |
| Actual delivery/adoption | The actual packed, built or native host consumer and required remote readback | A build exit, development server or local test is not proof of the delivered surface. |

This table selects the time and purpose of evidence, not a replacement for configured command inventories. A development check can be directly invoked through its supported test runner and retained as slice evidence; it does not become a native SDLC profile receipt. The existing `verify --profile focused` remains useful, but the inspected focused profile contains whitespace/setup checks, not every possible behavioral regression. [S02, S03, S09]

### 4.2 Rerun decision procedure

At each meaningful change, the coordinator performs this bounded reasoning in the existing task:

1. Identify what changed since the last relevant evidence: source, oracle/test, fixture, data, package content, build configuration, dependency/tool/runtime, accepted requirement, deployed boundary or output only.
2. Identify the claim the earlier evidence actually supports and the consumer affected by the change. Compare exact inputs where available; do not infer applicability from a filename or unchanged commit label alone.
3. During implementation, run the smallest useful valid check for that change. At finalisation, run the required current profile regardless of whether earlier slice evidence was useful.
4. Rerun the affected review question; expand review only if the delta, uncertainty or shared contract warrants it. Preserve mandatory independent execution rather than calling an implementer's existing run independent.
5. If the existing instructions/configuration force unnecessary duplication, record the exact cause and propose a separate authorised repair. Do not skip configured rows or lower thresholds in the current task.

No per-edit decision file or automated impact graph is required.

### 4.3 Trigger and invalidation table

| Change | Immediate response | Final/assurance consequence |
|---|---|---|
| Behavior, parser, CLI, shared contract | Focused trigger and prohibited-neighbor checks; then affected consumers | Fresh required final profile; affected review and representative product behavior. |
| Test/oracle/fixture | Check independently expected behavior and sensitivity | A prior green result under the old oracle is not silently requalified. |
| Package contents, exports, declarations or packaging script | Native package/declaration/installed-consumer checks where relevant | Reidentify the delivered archive; unchanged source does not imply identical package bytes. |
| Lock, runtime, environment or tool version | Native compatibility/security/affected checks for the actual changed input | Record relevant environment explicitly; current fingerprint is not exhaustive environment attestation. |
| Pipeline, profile, baseline or assurance instruction | Obtain required exact acceptance and use a supported lifecycle transition | Earlier route/control evidence cannot satisfy the new contract by digest refresh or relabelling. |
| Operational output only in an existing excluded output location | Record the event without modifying native receipts or accepted task state | No product rerun solely to certify the output; required freshness and evidence retention still apply. |
| Tracked Markdown summary or diary | Review the actual content change and dependencies | Current fingerprint changes; an old required full receipt remains stale even when semantics look unchanged. |
| New commit/merge or relevant HEAD movement | Rebind the object and compare the real integration | The inspected fingerprint includes HEAD; same file tree alone does not preserve receipt identity. |
| External host/service behavior changes | Scope a fresh observed consumer check to that surface | Previous internal tests cannot establish new external behavior. |
| Time/allowance interruption, no changed inputs | Retain and inspect the actual checkpoint | No automatic full re-survey merely because time elapsed; a new attempt/transition still obeys native identity rules. |

The implementation's input checks include tracked/untracked content, declared ignored inputs, HEAD, baseline and active/control identities. They do not prove that every environment variable, installed dependency or external service is automatically detected. Human responsibility for those inputs cannot be replaced with a claim that a fingerprint is a complete attestation. [S08]

### 4.4 Subsumption is about obligations, not receipt conversion

A full command may already execute format, lint or tests requested at an earlier phase. Record the actual command chain and avoid invoking it again solely through a differently named outer script on the same target and authority boundary. However:

- Do not skip a separately configured required command without the accepted configuration change.
- Do not copy a `full.json` file into `affected.json`, relabel its profile, merge receipt fragments or fill in a missing independent run.
- Do not reuse evidence across different artifact, environment, test-oracle or acceptance identities without the contract that supports that inference.
- An independent verifier's required execution is not redundant merely because the writer already ran the command.

The current completion reader compares the configured inventory, task/profile and exact inputs, as well as the canonical and current receipts. WP7 preserves those checks. [S08]

## 5. Stop the tracked-progress feedback loop

### 5.1 Classify content by its actual role

| Material | Correct treatment |
|---|---|
| Accepted requirements, design baseline, executable examples, instructions, policy, security assumptions | Maintained input under its existing governance; do not move into ignored output to avoid verification. |
| Test fixture, expected output used as an oracle, generated source needed by consumers | Declared test/build input even when the extension is `.md`; protect its identity. |
| Native run receipt and raw output | Keep the native layout and original bytes, including failures; never rewrite to match a new target. |
| Native security bundle | Preserve the complete supported bundle and links under the approved restricted store. |
| Current progress and next-action narrative | Existing task/PR comment or approved retained operational handoff/output location; do not append every event to a tracked source diary. |
| Useful durable implementation summary | Deliberate maintained promotion at a planned checkpoint; describe historical evidence by its original identity. |
| Sole-copy dirty implementation/evidence in a worktree | Preserve and establish consumers through WP0/WP3 before disposition. Ignore status does not make it disposable. |

The record-placement repair is an **output-location decision**, not a new ignore rule. Git ignore rules do not exempt already tracked files. The inspected fingerprint's tracked diff still covers tracked changes; its explicit runtime/tmp exclusion applies to untracked enumeration, and it rejects those directories as declared additional verification inputs. [S08, S22]

### 5.2 Transition an existing execution diary once

For the chosen task, inspect whether maintaining the diary is itself an accepted requirement. If so, get the exact required amendment before changing the practice. Then:

1. Preserve the current diary, its original evidence links, meaningful variants and acceptance decisions. Do not delete or overwrite historical failures.
2. Identify a permitted existing current-status destination and the receiving owner. A restricted local handoff is acceptable when public posting or remote operations are not authorised.
3. If useful, make one reviewed tracked pointer/update before the final freeze identifying where later operational progress will reside. Do not embed a claim about the file's own not-yet-created final commit hash.
4. Put subsequent raw output in the native store and update progress only at the selected operational location. Do not use reserved native receipt files, `active.json`, or a handoff consumer's machine records as an informal diary.
5. Retain externally necessary evidence in a real approved durable location before a disposable workspace is released. A local ignored filename, hash or narrative alone does not preserve the content.

Confirm that retained source/reproduction snapshots are outside active test discovery. A runtime directory name or Git ignore status alone does not prove this. If necessary, archive the snapshots as evidence through the existing accepted process; do not hide legitimate maintained tests or silently change discovery configuration. WebVOWL's completion record retains an instance where review snapshots were accidentally discovered as tests. [S19]

An existing accepted Issue **body** is not interchangeable with an Issue comment: the repository treats normative title/body edits as changed intent. Operational progress should not mutate the accepted text merely to avoid tracked-file churn. Use an authorised comment or handoff; preserve any independently triggered metadata checks. [S21]

The supplied six-worktree handoff is not authority to reorganise their content during WP7. Unknown ownership remains a hold. Separate evaluators using the same candidate bytes can be legitimate; distinct dirty worktrees may contain distinct evidence even when source is near-identical. [P1]

### 5.3 Plan finalisation around the real identity rules

The efficient order is to complete intended tracked content—including any durable summary, tests and reviewed configuration—before the final frozen qualification. Keep ensuing run/review output external to those inputs.

Where the accepted Git sequence permits committing that candidate before final qualification, the later run can bind the final commit while retaining the execution's original accepted scope. Do not move the task's starting point to hide work. Where current policy requires checks before a commit, obey it: a commit changes HEAD and can require subsequent fresh evidence. Report that cost rather than pretending WP7 removed it.

After final verification, an independently required source, test or tracked-document edit still invalidates applicable current evidence. Make the edit, freeze again and perform the required fresh checks. A purely external result reference can describe the observed run without forcing a source edit; it does not exempt a real input change.

### 5.4 No default cache or hidden exclusion

Do not add blanket `*.md` exclusions, skip-worktree/assume-unchanged markers, a success flag, a resume exception, or a path heuristic to treat “documentation-only” as verified. Do not stop tracking the diary merely to make a failing freshness test pass.

If later real evidence justifies selective result reuse, open a separately accepted input-dependency design covering source, tests, fixtures, locks, package contents, tools, relevant environment, shared contracts, control/baseline changes, failed attempts and unavailable inputs. That future work must prove invalidation. It is not an implementation slice of this WP7 plan. [P0]

## 6. Bind checks to their real consumers

### 6.1 Audit command composition once, then retain the decision

For the accepted task, inspect the actual profile and invoked scripts at the selected revision. Record a compact mapping in the existing execution statement only where names hide materially different behavior.

| Inspected consumer | Current relevant behavior | Consequence for WP7 |
|---|---|---|
| UO `focused` | Whitespace and generated configuration checks | Add the appropriate direct behavioral/document check when required; a focused profile pass is not automatically semantic correctness. |
| UO `affected` | The focused checks plus JavaScript, Python and SDLC tests | Preserve the actual checks; do not assume it is a per-file test-selection engine. |
| UO `full` | Eleven configured commands, including lint/format, ontology validation, direct Vite build and generated/artifact checks | Final elevated qualification still uses this actual profile. The direct Vite entry avoids assuming a mutating outer build is equivalent. |
| ONI `full` | Existing affected-component runner | Retain its component selection and all separately accepted product obligations. |
| ONI converter `check` | Static/documentation/conformance/runtime/performance/declaration and installed-package checks | Mutation, live renderer and public-registry qualification are not implied by this command's name or success. |
| WebVOWL production preview | Actual emitted modules and browser behavior | Development-server success alone is not production qualification. |

These are observations at the research pins, not universal meanings of the profile names. Verify the actual adopter configuration before use. [S09, S11–S14, S17–S19]

Do not duplicate a formatter/test already executed by a current native command merely to list its name again. Equally, do not skip separately configured checks because a human suspects overlap. A necessary profile change is a separately accepted exact change; the default WP7 patch leaves profiles untouched.

### 6.2 Preserve whole-task and integration ranges

ONI's affected runner defaults to the active task's `startingHead` and supports an explicit `--base`. An explicit later base is useful for an affected slice, but must be labelled as that slice. It cannot replace the whole accepted range at final qualification. Preserve deletions, renamed inputs, shared contracts and other work integrated since the original scope began. [S12]

A supporting command inventory should record relevant source, tests, configuration, runtime and artifact identity once. It is not a new per-test manifest. The final required receipt remains owned by the native verifier; policy/approval references remain owned by their existing records.

## 7. Preserve and use ONI's mutation design proportionately

### 7.1 What to retain

Preserve the two accepted library/CLI qualification commands, selected mutant scopes and their 90% break thresholds. The library configuration uses the TAP runner with per-test coverage; the CLI uses the command runner with coverage off. These different contracts must not be concealed by an aggregate “mutation passed” claim. [S23, S24]

Retain the implemented short-check prerequisites and parallelism inside the mutation stage. The execution record describes the earlier parallelisation and later dependency/converter-before-mutation repair. Those are existing improvements; WP7 does not reimplement them, remove failure propagation or automatically alter workflow triggers. Before an adopter change, inspect its actual workflow at the selected revision and preserve all unrelated scheduling and permissions. [S15, S16]

No mutation run, live renderer call, registry request or publication is performed merely to exercise the new instructions. Use the next authorised affected task or actual qualification obligation.

### 7.2 Rerun triggers, without weakening the accepted gate

| Situation | Proposed execution treatment |
|---|---|
| Editing mutation-covered source or its tests | Use direct focused tests during editing; perform the applicable accepted mutation qualification at its required checkpoint. |
| Changing mutation configuration, runner or relevant runtime/dependency | Qualify the changed mutation contract; do not infer applicability from unchanged application source alone. |
| Scheduling-only workflow repair | Exercise the actual dependency/aggregate behavior, syntax and negative controls under its accepted route; do not rerun all mutants solely to prove scheduling syntax. Do not claim this proves new remote scheduling or mutant outcomes. |
| Unchanged mutation inputs, useful previous qualification exists | Retain the result with its original identity and explicit applicability. Any current required full/CI gate still runs when its contract requires it. |
| Comparator-only or narrative change outside mutation inputs | Verify actual dependency and consumer isolation; use its accepted preservation route. Do not treat directory naming as proof of isolation. |
| Failed, missing, cancelled, stale or partial mutation evidence | Preserve the gap. Startup-only, dry-run and a prior pass are not silently converted into current full mutation qualification. |

Stryker's official documentation says incremental reuse does not detect all nonmutated inputs or environment/dependency changes. The command runner reports no test details, whereas TAP has file-level reporting without locations. Therefore, do not enable incremental mode in either profile as part of WP7, and especially do not claim CLI test edits invalidate its cached results automatically. Any future adoption needs its own tested input-dependency contract. [S25]

The preceding paragraph is a tooling limitation and design consequence, not evidence that the installed version was run here.

### 7.3 Preserve limits on what timing proves

Parallel jobs can reduce elapsed critical path while consuming a similar or greater total of runner time. Record actual job intervals and queue/wait information when available. Do not add overlapping durations and label the total wall-clock time, or infer reduced billed cost from a shorter aggregate duration.

The parent's historical timing observations are retained as historical comparisons. Later early failures can skip expensive jobs; their shorter run is not a successful product qualification or a like-for-like speedup. Use fresh exact run/attempt data only when that remote read is actually needed for the adopted claim. [P0, S16]

## 8. Bound review, research and delegation

### 8.1 Review the delta against its parent evidence

A bounded follow-up review receives the original accepted scope and reviewed object, actual subsequent diff, previous findings and their dispositions, and the question affected by that diff. The reviewer decides whether broader context is needed; “bounded” is not a forced line-count or finding-count cap.

For each surviving earlier conclusion, retain its scope and justification for continued applicability. For each new or reopened question, obtain the required evidence. Do not describe an unreviewed final delta as covered by a prior whole-diff review. A control change, changed oracle, new trust boundary or changed delivery behavior can require wider review even when textual size is small. [S06, S07]

### 8.2 Use the existing owners, not a role checklist

R0 may use the permitted combined self-check; identify it as such. R1 retains its normal independent reviewer. R2/R3 add the actual accepted independent verification and risk-triggered specialist coverage. Naming and other mandatory principle checks remain part of the relevant review, not automatic separate agents for every principle. [S04, S06, S07]

Before dispatching a specialist, state the unresolved question, scope, inputs, expected evidence and why existing work does not answer it. Installed role definitions do not grant permission to spawn workers. Preserve a failed worker's failure as missing evidence; do not treat silence, timeout or unavailable execution as agreement.

The implementation writer stops changing the verification object before the verifier begins. A separate checkout alone does not make simultaneous candidate edits compatible with a frozen-target claim. A verifier may create test/build outputs in its authorised space but must not edit the source, oracle or expected outcome to obtain a pass. [S05, S06]

### 8.3 Keep native security ownership and budgets

Retain the existing native-security triggers, budgets, recovery rules, evidence and independently accepted alternative assessments. One native security workflow owns its phases and internal workers; the coordinator does not launch a duplicate scanner to answer the same question. General correctness review is not a replacement for required security assurance.

Changes to inventory capability, artifact access and deployment assumptions remain WP5/WP6 concerns and actual assurance dependencies. A small CI/permission/parser change can still be security-relevant. A pre-existing alternative applies only within its actual accepted scope, not to every task using these instructions. [P0, S05–S07]

### 8.4 Reuse research without freezing assumptions forever

Reopen software-selection work when a new capability, version/rights restriction, incompatibility, vulnerability, changed interface or material environment invalidates its result. At routine implementation milestones, use still-applicable accepted research rather than restarting a general market comparison.

Local absence of a selected tool is an integration question, not automatic permission to downgrade it. A passing dependency audit is not a licence determination. A requirement to assess terms is not automatically a requirement to retain independent counsel for every change. Preserve the actual source and uncertainty of the decision. [S04, S07, S15]

## 9. Bring representative delivered outcomes forward

### 9.1 General procedure

Choose the accepted user job, its real input, the independently expected outcome and the delivered boundary. Execute it as soon as a stable, usable seam exists and before expensive broad qualification would conceal a fundamental failure. For a not-yet-buildable component, perform the cheapest meaningful precursor and keep the delivered-outcome check explicitly pending; do not pretend the precursor completes the job.

Record source/artifact identity, the real runtime/host, actual output and limits. On failure, identify the boundary and retain the failed result. Implement the corresponding regression in the owning component under its normal authority. Reuse a later confirmed repair; do not turn an old failure into a permanent repeated diagnostic campaign.

At final qualification, inspect what changed since the representative run. Re-exercise materially affected delivery behavior and satisfy the current required profile. A bounded later preview check can supplement earlier broader evidence, but must not be described as a new execution of all earlier scenarios. [S17–S19]

### 9.2 WebVOWL AQFO-to-SVG

Use the already selected AQFO RDF/XML at source revision `dee2aa72ba268473cd60a18b62f1ae941eee7dec`, with retained SHA-256 `0a35e466d5765b56ed66777e4ead6359410eef0b688f0c6e9eeeb41405258b6c`. Do not replace it with a GitHub HTML page or regenerate an illustrative graph. The canonical source is linked in the existing WebVOWL evaluation record. [S18, S19]

The expected semantic anchors are independently established source assertions: exact IRI `http://w3id.org/aqfo/aqfo_00002008` denotes person and is a subclass of household member `aqfo_00002214`; the existing oracle also identifies the man/woman/child subclass relations. A descriptive mention of Fishing Vessel is not a class declaration. The original motivating session was not independently reproduced, so do not claim that this fixture proves every detail of that incident. [S18, S19]

For the authorised representative run:

1. Freeze the actual application, built output and pertinent browser/native-tool capabilities. Use the production build/preview when making a delivered-build claim; keep development-only qualification labelled as such.
2. Load the pinned source through the real supported native action; inspect source identity and warnings.
3. Resolve the exact entity and frame its real neighborhood. Highlighting without the requested viewport behavior is not sufficient.
4. Compare relevant rendered entities and asserted directions with the independent source oracle; distinguish VOWL presentation records, filters and viewport limits.
5. Export the actual view, retrieve the actual SVG, parse and open it independently, and compare it with the observed view. Keep dimensions/hash checks separate from semantic and visual correctness.
6. Report actual artifact delivery or the client's attachment limitation. A page download, local retrieval and conversation attachment are different events.

The updated source record already reports a successful AQFO job; reuse it for its qualified object. The later `80b3022…` production repair records affected FOAF/SIOC/menu/export checks, not a repeat of all twenty jobs or an explicitly new AQFO run on that latest build. Decide the necessary final representative recheck from the actual delivered delta rather than asserting either universal coverage or mandatory replay of every job. [S17–S19]

### 9.3 ONI description and installed packed consumer

Locate the actual description input selected by the accepted converter task and confirm its permitted use. Its exact bytes and an independently authored expected semantic account are needed; a synthetic example or a package-test total cannot silently replace the actual requested description. If the real input or permission is unavailable, keep that part of A14 unverified.

Use the existing supported package-consumer route to exercise the archive that is actually delivered. The inspected converter supplies `test:package` and `release:pack`; the ordinary `check` already invokes the former. Select the route required by the current accepted deliverable and authority rather than running both solely to duplicate the same installed-consumer obligation. Archive creation or audit may have additional permitted-write/network requirements; inspect the actual command before dispatch. [S14]

Verify native installation from the retained archive, the exported API and installed CLI, conversion of the actual description, important literal/structure preservation, diagnostics and expected losses, and applicable declaration/type-consumer contracts. Keep original input and output in the appropriate evidence store. A plausible Markdown string is not proof of exact literal preservation or renderer behavior.

Where GitHub-rendered presentation is part of the accepted claim, use the existing assertion-bearing renderer scenario and actual returned content—not HTTP 200 alone. Do not activate a remote schedule, publish to Steam/npm or create a new network test solely for WP7. The newer ONI record reports a repair for this false-success boundary and later comparator retirement; preserve those implemented improvements. [S15, S16]

A new archive changes artifact identity even when much source is unchanged. Earlier installed-package evidence remains historical; the current delivered archive receives the required consumer evidence. No source-transfer, registry-publication or licence scope is silently added by this plan.

## 10. Observe effectiveness without creating another service

Use existing task notes, native receipts, review findings and actual CI job metadata. Add a brief disposition at the next meaningful handoff; do not require a stopwatch entry per edit or a separate reporting platform.

| Observation | Record when useful | Do not infer |
|---|---|---|
| Pause/restart | Actual reason: missing authority, input change, capability gap, owner handoff, or avoidable repeated decision | Every pause is waste or every delayed operation should bypass a gate. |
| Rerun | The changed input/obligation or independent-verification reason | Every repeated test is redundant; an unavailable reason means unknown, not automatically unjustified. |
| Check composition | Which actual checks were already executed within an outer command | Similar command names prove equivalence. |
| Duration | Observed elapsed critical path, queue/user wait and sum of actual job durations separately where available | Sum of parallel durations is elapsed time, CPU time or billed cost. |
| Review yield | Concrete causal findings and the boundary that detected them | More comments, roles or tests necessarily mean better assurance. |
| Resource accountability | Known owner, retained evidence and next consumer/decision event | Fewer worktrees means better preservation or permission to delete. |
| Product outcome | Actual installed/built/native user job and its limits | Internal pass count is user success. |
| Usage | Native token/usage evidence when available, otherwise unavailable | Reconstructed estimates are actual measurements. |

A useful comparison may contrast an earlier retained run with a later genuinely comparable checkpoint. State changed source, dependency, platform and workload where they confound the comparison. Do not replay historical projects or invent features to produce a baseline; the existing guide specifically prefers upcoming useful work. Do not require a numerical saving to accept a justified correction, and do not claim productivity improvement before measuring a relevant baseline. [P0, S03]

## 11. Maintained change map

| File/surface | Selected change | Preserve |
|---|---|---|
| `docs/sdlc/proportional-workflow.md` | Add the canonical short execution statement, cadence, rerun and record-placement rules | Existing R0–R3 meanings, approval requirements and profile names |
| `docs/sdlc/howto.md` | Connect normal commands and finalisation order to the canonical procedure | WP1 receipt behavior, explicit input freshness and existing capability limits |
| `.sdlc/skills/sdlc-route/SKILL.md` | Put cadence under existing verification/next-step outputs; prohibit risk laundering and invented obligations | All current output headings and mandatory risk triggers |
| `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md` | Distinguish output records, historical applicability, native receipts and final freeze | Real oracles, raw failures, evidence retention and independent execution |
| `docs/sdlc/subagent-playbook.md` | Add bounded question/delta handoff and effect-based specialist selection | Existing permission, worker-count ceilings, security ownership and writer freeze |
| `REVIEW.md` | Trace mandatory recommendations to governing sources; review the actual final delta and delivered boundary | NAM-01, NSH-01 and all other mandatory findings/assurance |
| `tests/sdlc/test_pipeline_controls.py` | Extend existing route/freshness/retention fixtures only where not already covered | Native task/receipt consumers and actual subprocess boundary where claimed |
| Existing setup/projection consumers | Verify updated maintained skills appear through the supported projection/check | Do not hand-edit generated agent copies or change unrelated host configuration |
| Actual task/PR/handoff | One execution statement and concise observed disposition | Accepted baseline content, existing history, confidentiality and posting authority |
| ONI/WebVOWL adopter guidance | Apply only after separately authorised reconciliation with their current owners and stage | Local-only directions, future-destination decisions, product and remote obligations |

No default change is needed to `scripts/sdlc.py`, `_sdlc_state.py`, receipt/active schemas, `.sdlc/pipeline-policy.json`, `.sdlc/verification.json`, dependency/lock files, mutation configurations, workflow jobs, check names, `.gitignore`, hook/trust/permission settings or package status. A preservation test that exposes an actual runtime defect gets a separately identified scope and decision; do not stretch WP7 into a hidden cache or reclassification repair.

Use the actual source-of-truth skill paths above. Read the repository's writing-for-agents instructions if available to the implementation environment. The companion provides exact proposed text; it does not itself deploy skills or establish that an agent followed them.

## 12. Detailed implementation slices

The sequence below describes one cohesive increment with bounded adoption work. It does not prescribe eight pull requests, eight independent reviewers or eight full-suite cycles. Existing authority for editing, configuration, commits and publication remains separate.

### WP7.1 — Bind the instruction change and execution scope

**Owner:** coordinator; Max accepts material policy/assurance changes. **Inputs:** parent WP7, current effective instructions, actual accepted task, current repository/adopter states and the evidence references above.

1. Re-read the actual repository revision and effective instructions before writing. Record material differences from the research pin, particularly intervening WP1/WP2/WP3/WP6 changes.
2. Identify the real accepted source for this WP7 increment and its required route. Do not treat this downloaded plan, its proposed amendments or its acceptance labels as already accepted.
3. Confirm an owned checkout and the implementation/verification handoff. Do not start in or commandeer one of the six historical worktrees.
4. Bind the exact six maintained instruction edits, existing-test changes and any separately authorised generated-skill projection. Leave fingerprint/profile/threshold changes outside the default scope.
5. Write the short execution statement in the existing task. Identify the next genuine low-risk/elevated use that can exercise the guidance, without inventing a product feature or delaying a justified patch until such a task exists.

**Exit:** inspectable acceptance/scope reference, real owners, an owned checkout, identified instructions/consumers and explicit limits. If a needed capability or acceptance is unavailable, complete the read-only preparation and report the blocked next step rather than granting authority to itself.

### WP7.2 — Characterise the current safeguards and reproduction boundary

**Owner:** implementation writer. **Dependencies:** WP7.1 and a working instance of the actual deployed receipt/state code.

1. Read `tests/sdlc/test_pipeline_controls.py` and reuse its actual repository fixture and native functions. Inventory existing cases before adding duplicates.
2. Re-run the existing focused route/freshness/retention tests under the selected supported runtime. Record the actual result. These tests may already pass; they protect existing behavior rather than reproduce a new runtime defect.
3. Add only missing cases from T701–T712: focused R2 work leaves full obligations; operational output stays output; tracked Markdown and HEAD changes remain inputs; failures and raw evidence survive later work.
4. Demonstrate the feedback distinction using an owned test fixture: successful verification followed by a tracked diary append becomes stale, while a progress-only file in an existing excluded output location does not change the verified input identity or mutate the native receipts. Inspect the real receipt reader, not a reimplementation of its fingerprint.
5. Keep the fixture's tiny commands explicitly synthetic. Passing a fixture profile named `full` tests orchestration, not UO's full ontology/build/MCP suite.
6. If the fixture reveals an actual runtime defect, retain the failure and seek the bounded implementation decision. Do not silently change production fingerprinting or weaken an expected failure as part of a documentation repair.

**Exit:** a test-gap inventory and source-controlled regression/characterization additions with actual results. No artificial RED is required where preserved behavior is correct; documentation intent is assessed through the instruction and useful-work exercises, not fabricated code breakage.

### WP7.3 — Apply the canonical cadence rule and connect existing instructions

**Owner:** writer; reviewer checks wording/authority boundaries. **Dependencies:** accepted exact amendments, WP7.2 characterization.

1. Apply the companion text to `proportional-workflow.md` as the canonical operational rule.
2. Add the small connectors to the guide, router, TDD handoff, subagent playbook and review policy. Preserve every router output heading and current mandatory risk/principle rule.
3. Search the affected instruction surfaces for contradictory statements such as “full after every step”, universal independent-counsel/reviewer requirements, implied receipt reuse or an unavailable reroute command. Retain legitimate higher-assurance obligations. Amend only statements demonstrably inside the accepted change.
4. Reconcile previous work-package insertions rather than append duplicate preflight, resource-disposition or native-security instructions.
5. Validate the actual local skill/front-matter/link consumer and the existing setup projection. If generated copies require a separately authorised write, obtain it; do not edit them manually or claim a source edit deployed the host instructions.
6. Review worked examples as illustrative, not operational approvals or evidence.

**Exit:** one coherent instruction set with exact changed anchors, valid existing consumers, and no new mandatory document/agent machinery.

### WP7.4 — Change progress-record practice at one useful checkpoint

**Owner:** coordinator and current record owner. **Dependencies:** WP7.3, applicable preservation authority.

1. Identify the active record locations and whether the accepted task explicitly requires a tracked execution diary.
2. Obtain any necessary amendment to that practice. Preserve the existing diary and its evidence; do not rewrite its historical source, claim or timestamps.
3. Select an authorised task/PR comment or existing retained operational location for current progress. Keep native state/receipt filenames reserved for their actual writers.
4. Prepare any useful tracked handoff pointer or durable summary before the final input freeze. Do not perpetuate the loop by appending “latest full passed” inside tracked source after every final run.
5. Demonstrate that the receiving maintainer can locate required content and the next actor. If the record is only local, state that limitation and satisfy any preservation/transfer requirement before disposal.
6. Verify tracked input identity and active state remain untouched by output-only progress. Apply normal freshness if the transition itself edits tracked content.

**Exit:** the chosen real task has one discoverable progress source and retained raw evidence; no required input was hidden or sole-copy evidence destroyed. If the task must keep a tracked diary, retain that requirement and its honest rerun cost instead of declaring this step successful through an exclusion.

### WP7.5 — Apply cadence to a genuine implementation/integration slice

**Owner:** coordinator and writer. **Dependencies:** WP7.4; actual task authority and relevant capabilities.

1. Inspect the actual profile and nested commands once; identify direct behavioral tests and additional product obligations not represented by the profile name.
2. Run focused checks while editing, preserving original failures. Make affected checkpoints when contracts/components integrate or a material input changes, not after every prose progress update.
3. Keep the task's risk, baseline, starting scope and full final obligations unchanged. An explicit later `--base` in an affected check is labelled as a slice, not the accepted whole.
4. Bring the representative consumer forward at the first stable usable seam. A failure here is a design/product finding for its owner, not grounds for test-count optimisation or scope invention.
5. Preserve ONI's existing mutation scheduling and thresholds. Do not add incremental mode or remote jobs. For other adopters, use their accepted commands rather than copying ONI's profile.
6. At the final frozen object, execute all actually required native profile and independently accepted obligations. Unnecessary repeated progress updates stop; necessary reruns after input changes remain.

**Exit:** the actual run history distinguishes edit-loop, integration and final evidence; no narrow pass is falsely labelled a full/current/independent result.

### WP7.6 — Perform bounded independent review and outcome assessment

**Owner:** authorised reviewer/verifier; coordinator supplies frozen handoff. **Dependencies:** stable target and required independent authority.

1. Stop the implementation writer before independent verification. Supply accepted intent, exact target/dirty inputs, independent oracles, changed contracts and raw evidence.
2. Use one ordinary correctness/principles review, with the specified additional specialists only for concrete unresolved risks. Preserve mandatory independent verifier execution and native security workflow rules.
3. After relevant fixes, send a bounded delta with the earlier review's scope and unresolved questions. The reviewer may widen scope when justified; the coordinator cannot suppress a governing finding to preserve a small count.
4. Challenge mandatory recommendations against their cited authority. Distinguish a proposed improvement from a condition already required for acceptance; route new consequential obligations to the owner.
5. Inspect the representative actual artifact and delivery surface, not just logs. When execution is unavailable, distinguish source review from runtime/visual evidence and retain the gap.
6. Group duplicate manifestations by causal defect after review; preserve disagreement, failed workers and residual uncertainty.

**Exit:** review and verification claims match their real methods/objects; required independent assurance and user-outcome gaps are visible. No universal specialist replay is introduced.

### WP7.7 — Qualify and land the maintained increment coherently

**Owner:** implementation owner and independent verifier; publication remains separately authorised.

1. Complete all intended tracked instruction/test changes and approved source-of-truth projection before final freeze. Check no profile, fingerprint, threshold, host setting or package dependency drift entered the change.
2. Run the selected targeted tests and real supported-platform controls. A supported focused command for the UO test suite is:

   ```text
   node scripts/runRepositoryPython.js -m unittest discover -s tests/sdlc -p test_pipeline_controls.py -v
   ```

   This is a future execution recipe, not a report of a run performed for this document. Use the configured repository runtime/dependencies and existing command protection.
3. Exercise the existing setup/check path and relevant instruction/link validation. Do not install a new linter, skill pack or test runner for WP7.
4. Execute the current required full profile on the final elevated candidate, together with its required independent review and security disposition. A source-contained full profile name or passing syntax check is insufficient.
5. Follow the actual permitted commit/PR sequence. Where commit or integration changes receipt identity, perform the required fresh qualification; never manually copy evidence to the new SHA.
6. If pushing or updating a PR is authorised, inspect actual CI event/run/attempt and target via the existing WP6 readback procedure. If not authorised, retain a local-qualified/not-published status. Do not commission an unnecessary remote run to make the plan look complete.

**Exit:** the delivered maintained increment is qualified at its actual identity, with publication/remote gaps explicit. All earlier receipts and negative controls remain.

### WP7.8 — Observe use and disposition the work package

**Owner:** coordinator and Max/adopter owner. **Dependencies:** qualified instructions and the next relevant authorised work.

1. Use O71 and O72 to observe a genuine low-risk case and an elevated case, incorporating the manual instruction challenges without creating product features or historical replay projects.
2. Use O73's two product boundaries when actually authorised, or bind already retained evidence to its precise object and state the unverified current delta. WP8 receives remaining product/adopter obligations.
3. Record a short handoff on pauses/reruns, actual check composition, findings, resource accountability and outcome. Use existing evidence and mark unavailable measurements unavailable.
4. Decide whether the instruction increment is implemented but awaiting useful-work observation, or adopted for the named observed scopes. Do not claim universal adoption from one host or task.
5. Retain any exact opportunity for a future configuration/selector/invalidation repair as a separately scoped proposal. No such future optimisation is silently activated.

**Exit:** an accountable completion state under section 15 with real evidence references and named next actions, not an asserted numerical efficiency gain.

## 13. Verification catalogue

**All T701–T728 are proposed and not run during preparation of this plan.** Existing test names identify preservation targets; new names below are proposed. Prefer parameterising or extending existing tests over adding duplicate tests. The full catalogue is repeated as machine-readable planning data in the companion JSON solely for implementer convenience.

### 13.1 Automated lifecycle preservation and characterization

| ID | Boundary / proposed implementation | Expected observation |
|---|---|---|
| T701 | Reuse `test_r0_requires_only_focused_evidence` | Valid R0 has required focused evidence, no invented full profile or baseline requirement. This does not classify arbitrary prose automatically. |
| T702 | Reuse R1 affected and focused-insufficiency tests | The affected obligation is required; focused alone cannot satisfy it. |
| T703 | Add/extend R2 focused/affected-before-full case | Accepted fixture baseline; focused and affected runs do not change R2, starting scope or full requirement; completed handoff is rejected until current full passes. |
| T704 | Reuse failed-run retention and current receipt checks | Original failing receipt/raw output survives a later pass byte-for-byte; the new pass belongs to its actual task/input identity. |
| T705 | Add `test_runtime_progress_output_preserves_current_verification` | With a native current fixture receipt, create/update a noninput progress file in an existing excluded runtime output directory; active/current/canonical/raw bytes and verification identity remain unchanged. |
| T706 | Add `test_tracked_execution_note_invalidates_current_verification` | Append the same progress text to a tracked Markdown note; the native reader reports stale evidence. Do not weaken this expected failure. |
| T707 | Parameterise Markdown input variants | Tracked accepted instructions, a Markdown fixture and executable-example content each invalidate earlier evidence after an edit; `.md` grants no exclusion. |
| T708 | Add tracked-file-under-ignored-prefix boundary | A fixture file deliberately tracked under an otherwise ignored runtime prefix remains covered by the tracked diff. Its change is not silently treated as output. |
| T709 | Extend zero-exit-after-input-write with a Markdown input | A configured command that changes tracked Markdown then exits zero cannot publish accepted passing evidence for unchanged inputs. |
| T710 | Add same-tree/new-HEAD fixture | A metadata-only/empty fixture commit moves HEAD; prior current evidence becomes stale even if file-tree content is identical. Only owned test Git state is used. |
| T711 | Reuse control/baseline/input-change cases | Changed policy/config/baseline cannot be accepted by refreshing a digest, editing the active record or reusing old success. |
| T712 | Exercise declared-input/output separation | Declaring reserved runtime/tmp as an additional verification input is rejected by the actual configuration consumer; genuine ignored inputs outside those output locations retain their existing fingerprint test. |

T705 is a characterization of correct existing exclusion behavior, not a new exempt-file feature. T708 must use an owned synthetic repository; it does not authorise adding tracked evidence to the real runtime store. The current source has existing route, source-change, scratch and raw-retention tests that should be reused. [S08, S26]

### 13.2 Instruction, review and process challenges

These are review/use scenarios, not claims that the current Python CLI understands prose intent. Do not implement a natural-language risk grader merely to automate them.

| ID | Scenario | Expected observation |
|---|---|---|
| T713 | Pure operational output versus inaccessible evidence | Progress uses an authorised output destination; a failed write/readback stays a gap rather than a fabricated retained record or hidden source edit. |
| T714 | Harmless prose versus security/control Markdown | Reviewers allow the genuinely low-risk route but reject a prose-only label concealing changed permissions, executable instructions or a public contract. A dishonest CLI risk argument is not assumed self-detecting. |
| T715 | Invented mandatory specialist or counsel prerequisite | Reviewer requires its accepted/governing source; an unsupported recommendation is not silently enforced as an existing obligation. Concrete unresolved material risks still reach the owner. |
| T716 | One-off description versus accepted reusable package | Neither automatic scope expansion nor retrospective downgrade is accepted; current deliverable and deferred obligations are explicit. |
| T717 | Small final delta after broader review | Reviewer sees the prior target and real delta; affected questions are rechecked, unrelated conclusions remain scoped, and an unreviewed delta cannot inherit whole-diff approval. |
| T718 | Research reuse and changed assumption | Unchanged applicable research is reused; actual version, terms, interface or threat changes reopen the relevant question rather than being ignored or causing an unrelated market survey. |
| T719 | Installed role and failed worker | A role file is not delegation authority; timeout, unavailable run or silent worker is missing evidence, not approval. |
| T720 | Verifier starts while source is changing | The qualification target is held/unqualified until frozen; the verifier does not edit source or derive expected values from the implementation. |
| T721 | Incremental mutation proposal | The command-runner test-change limitation and other input gaps are retained; no automatic incremental mode, threshold reduction or old-result promotion enters WP7. |
| T722 | Scheduling-only change with expensive downstream assurance | Existing scheduling/aggregate-preservation checks are used under accepted scope; no fresh mutant outcome or real CI behavior is claimed from syntax/startup checks alone. |

### 13.3 Product, finalisation and observation challenges

| ID | Scenario | Expected observation |
|---|---|---|
| T723 | Real description through the actual packed ONI consumer | Exact input and archive, installed API/CLI behavior, literal/structure/loss expectations and applicable declaration consumers are evidenced; missing real input remains unverified. |
| T724 | AQFO through the actual delivered WebVOWL path | Native load, exact entity/direction, framing, actual SVG inspection and truthful delivery/coverage; development-only or failed retrieval is not production success. |
| T725 | Green outer result with absent/mismatched consumer result | No whole-product claim based on an unrun child, skipped matrix, HTTP status, empty result or stale branch narrative. Relevant remote evidence follows the existing WP6 boundary. |
| T726 | Tracked summary or commit after final verification | Native freshness is preserved; actual new input/HEAD requires fresh required qualification. External output-only reporting remains separate. |
| T727 | Native security/guard/writer gap | Retain the exact limitation and only its accepted alternative; no channel switch, self-granted exception, duplicate scan or missing phase disguised as completion. |
| T728 | Claimed efficiency improvement | Existing attributable intervals and comparable workload support any claim; parallel duration sum, cancelled work, unknown tokens and test count are not treated as demonstrated savings or outcomes. |

T723/T724 are outcome checks shared with WP8. Early failure with correctly retained evidence meets the truthful-observation part, but does not close an accepted product requirement. Historical success is useful only for the target and method it actually covered.

## 14. Useful-work operational exercises

**O71 — genuinely low-risk prose.** Use the next real accepted low-risk note/help-prose correction that does not change an executable example, contract, permission or shipped-artifact obligation. Record one short task statement, perform the existing focused and relevant content checks, and use the permitted combined review. Observe that no converter release, mutation, broad selection survey or default subagent campaign is imposed. During normal instruction review, contrast this with a data-only hypothetical sensitive-Markdown change; require the correct governing route without actually weakening any live permission. Do not manufacture a new product task for the exercise.

**O72 — elevated implementation with stable output reporting.** Use the WP7 increment itself or the next genuine authorised elevated slice. Keep its original accepted scope and required profiles. Retain focused pre/post-change evidence, selected affected checkpoints, output-only progress, a frozen independent handoff and current final full/other required obligations. Check a tracked-input or HEAD change using the owned test fixture, not by corrupting the live candidate. At handoff, identify both avoided unjustified repeats and justified repeats due to independence, input changes or actual requirements. Do not claim savings without a comparable baseline.

**O73 — the two representative product boundaries.** Use the next authorised ONI description/packed-consumer job and WebVOWL AQFO/delivered-artifact job. They may occur in separate tasks and have separate owners. Reuse the existing oracles and implemented regressions, and bind retained historical evidence rather than presenting it as a fresh run. Where a task's current authority is local-only or a required host/input is unavailable, complete only the authorised portion and name the remaining dependency. Do not push, publish, activate a schedule, run a scanner or create a new browser feature solely to complete the observation. WP8 owns necessary product repair/adoption beyond this instruction increment.

These exercises are **not-run** in this deliverable. A policy update may be technically qualified while a suitable real use remains pending. That is preferable to invented pilot activity or fabricated adoption evidence. [S03]

## 15. Acceptance criteria and completion states

The AC7 labels below are traceability labels in this proposed plan. They are not pre-existing Issue acceptance IDs or evidence of approval. Use the repository's actual accepted-baseline mechanism before implementation where required.

| ID | Requirement | Principal evidence |
|---|---|---|
| AC7-01 | The actual WP7 scope, owners, risk and exact maintained changes are accepted without implied Git/host/publication authority | WP7.1; accepted task/baseline and exact patch |
| AC7-02 | The six instruction surfaces form one coherent procedure without new mandatory forms, role fan-out or unavailable interfaces | WP7.3; T715–T720 |
| AC7-03 | A13's low-risk route is genuinely light; sensitive/executable/contract inputs are not hidden by a prose label | T701/T702/T714/T716; O71 and accountable semantic review |
| AC7-04 | Focused edit-loop work inside R2 does not change risk, accepted range or final full/independent obligations | T703/T711/T726; O72 |
| AC7-05 | Operational output is separated from tracked inputs without new exclusions, cache or receipt rewriting | T705–T712; actual record-placement transition |
| AC7-06 | Required history, failure evidence and worktree content remain preserved and discoverable | T704/T713; WP7.4 handoff; relevant WP0/WP3 decisions |
| AC7-07 | Check subsumption and follow-up review use actual commands, scope and identities rather than labels or old results | T717/T725/T726; command/claim mapping |
| AC7-08 | ONI mutation scheduling, required scopes and thresholds are preserved; incremental reuse is not silently adopted | T721/T722; actual unchanged configurations and accepted obligations |
| AC7-09 | Research/delegation/security work is bounded by relevant questions without waiving mandatory independent or native assurance | T715/T718–T720/T727; actual review scope/dispositions |
| AC7-10 | A14's two product boundaries have truthful target-specific evidence and named unresolved final/adopter gaps | T723/T724; O73; WP8 handoff |
| AC7-11 | The actual maintained increment passes required supported-platform controls and its current final qualification | WP7.7; real native receipts/CI/reviews, not fixture profile labels |
| AC7-12 | Useful-work observations and the final disposition report actual outcomes and uncertainty without invented efficiency gains | T728; O71/O72; next actors and explicit completion state |

Use one of these explicit states:

**Prepared, not accepted:** the researched plan and proposed amendments exist, but implementation authority and execution evidence have not been established. This is the state of this deliverable.

**Maintained increment qualified; useful-work/adopter evidence pending:** the accepted instruction/test change passes its required actual qualification, but a named O71/O72/O73 observation or adopter-specific boundary remains unavailable. Do not report every WP7 acceptance criterion satisfied.

**Adopted for recorded scopes, with explicit retained obligations:** the relevant useful-work evidence exists, the owners accept the scoped procedure, and unresolved product/deployment/resource obligations are accurately assigned. This is not universal agent compliance or unconditional WP8 completion.

**Incomplete:** a required instruction, identity, preservation, test or assurance boundary cannot be established. Report the completed portion and exact next actor/decision; do not lower the route to force completion.

WP7 does not automatically close Issue #36, reopen a fixed AQFO projection defect, retire security alternatives or approve a product release.

## 16. Failure handling, rollout and recovery

| Condition | Required response |
|---|---|
| Actual route/accepted source unclear | Keep the material next step blocked; gather the smallest missing decision evidence. No automatic downgrade. |
| Procedure guidance conflicts with the current machine gate | Preserve the stricter effective contract and report the exact mismatch for acceptance; no state or digest edits. |
| Tracked diary is an explicit accepted deliverable | Amend that requirement through its owner before changing practice, or retain it and the genuine verification cost. |
| Progress/evidence destination unavailable | Preserve available results, report incomplete retention and use only an already authorised alternative location. No claim that a write occurred. |
| Required runtime/test tool unavailable | Retain unavailable evidence; no substitute runner or older tool solely to produce green. |
| Writer changes target during verification | Preserve the failed/invalidated attempt and obtain a fresh frozen checkpoint; no reconstructed success. |
| Review worker fails or finds an unresolved defect | Keep the result/gap; rerun or disposition only through actual authority. |
| Late product/packaging/control change | Perform required fresh affected and final qualification; identify legitimate repeated work rather than hiding it. |
| Installed security inventory/writer or native guard blocks required work | Use WP4/WP5/WP6's actual scoped decision; no bypass or implicit workaround retirement. |
| Unsupported active risk amendment | Preserve lineage/state and raise the #36 dependency; do not fake handoff or reset starting scope. |
| Remote action not authorised | Stop at local qualification and provide the actual deferred step. Published previous commits do not grant future push authority. |
| No comparable timing data or suitable pilot task | State the measurement/adoption limit; do not manufacture history or make a speculative saving an acceptance condition. |

Land the source-of-truth instructions and preservation tests coherently; project generated skills only through the existing supported path with its required approval. Apply adopter changes selectively after inspecting their actual local policy and current delivery stage. Do not bulk-copy UO runtime code into ONI or WebVOWL as part of this instruction patch.

A failed adoption is recovered by pausing the affected changed practice, preserving records, and making an explicitly reviewed corrective instruction/configuration change under normal controls. No hard reset, force-push, automatic worktree cleanup or rewrite of accepted history is prescribed. Reversal itself may change fingerprinted instructions and requires its applicable verification. Keep earlier evidence with its original identity.

## 17. Sources and preparation limits

### 17.1 Supplied materials

**[P0]** `../implementation-plan.md`, 62,272 bytes, SHA-256 `b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82`. WP7, A13/A14, sequencing and historical findings are the requested basis. The original file is unchanged.

**[P1]** `sdlcworktreelifecyclehandoff20260910.md`, 13,079 bytes, SHA-256 `a9cf76ae85ab314b15e80164150e0a69d8c18af836c32a83e8ca689e1a4d16d6`. Historical resource observations and explicit no-cleanup boundary; not a present-day verification result.

**[P2]** Earlier supplied WP1–WP6 detailed plans are dependency proposals and continuity context. Their existence does not prove implementation or deployment. Current source takes precedence for observed interfaces; any changed accepted contract needs its own accountable reconciliation.

### 17.2 Repository and primary technical sources

All source observations below were read for this plan; mutable refs/decisions require refresh before implementation. URLs identify the inspected content, not approval or host execution.

**[S01]** UO research revision and merge metadata: <https://github.com/Hadden-Industries/universal-ontology/commit/a0374bad8203aa95f87a0e47a85013fd4b938c7e>.

**[S02]** Proportionate workflow: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/proportional-workflow.md>.

**[S03]** Current guide, receipt/freshness behavior and useful-work evaluation: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/howto.md>.

**[S04]** Router skill and existing output headings: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/skills/sdlc-route/SKILL.md>.

**[S05]** Subagent playbook: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/subagent-playbook.md>.

**[S06]** TDD evidence and handoffs: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md>.

**[S07]** Review policy: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/REVIEW.md>.

**[S08]** Native state, fingerprint and completion reader: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/scripts/_sdlc_state.py>.

**[S09]** UO configured profiles: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/verification.json>.

**[S10]** ONI PR #4 metadata: <https://github.com/MaksymShostak/oxygen-not-included/pull/4>. Read head `fe75c5d8e29f68e43812439fbc6ec73df2f43b05`; description retains older claims.

**[S11]** ONI profiles: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/.sdlc/verification.json>.

**[S12]** ONI affected-component execution: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/scripts/runAffectedChecks.js>.

**[S13]** ONI native npm converter wrapper: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/scripts/runSteamCommunityBbcodeChecks.js>.

**[S14]** Actual converter commands and package content: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/tools/steam-community-bbcode/package.json>.

**[S15]** ONI execution record, mutation scheduling and later performance/renderer/licence scope: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/docs/plans/2026-09-08-steam-community-bbcode-execution.md#short-ci-checks-before-mutation-testing--10-september-2026>. Also sections “Performance, renderer and licence qualification” and “Local delivery and future repository move”.

**[S16]** Later ONI comparator retirement, historical preservation and affected verification in the same pinned record: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/docs/plans/2026-09-08-steam-community-bbcode-execution.md#retire-the-unsupported-executable-comparator--10-september-2026>.

**[S17]** WebVOWL production-preview fix: <https://github.com/Hadden-Industries/webvowl/commit/80b302214d24bce195986af89ef7a34d24274928>.

**[S18]** WebVOWL existing AQFO job/oracle and retained earlier failures: <https://github.com/Hadden-Industries/webvowl/blob/feature/webmcp-integration/docs/evaluations/webmcp-integration.md>. The initial read used the named branch; use the pinned completion record below for the later result. The branch link is mutable and is not itself an immutable evidence identity.

**[S19]** WebVOWL current completion and production supplement: <https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/docs/evaluations/2026-09-10-webmcp-completion.md>.

**[S20]** Open active-reclassification report #36: <https://github.com/Hadden-Industries/universal-ontology/issues/36>. An observed interface gap, not an executed state-mutation test or a WP7 repair.

**[S21]** GitHub governance and normative Issue edits: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/github-governance.md>.

**[S22]** Git primary documentation, tracked versus ignored content: <https://git-scm.com/docs/gitignore>.

**[S23]** ONI library mutation configuration: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/tools/steam-community-bbcode/stryker.config.json>.

**[S24]** ONI CLI mutation configuration: <https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/tools/steam-community-bbcode/stryker.cli.config.json>.

**[S25]** StrykerJS primary documentation, incremental limitations and runner reporting: <https://stryker-mutator.io/docs/stryker-js/incremental/>.

**[S26]** Existing lifecycle regression fixture and WP1 tests: <https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/tests/sdlc/test_pipeline_controls.py>.

### 17.3 What the deliverable checks establish

The companion `deliverable-checks.json` records only checks actually executed against these generated planning files: text/structure/catalogue consistency, required boundaries, source labels, input-file preservation. The ZIP payload is independently read back against its manifest after packaging. It is not a native SDLC run, a security assessment, a Windows test, an agent-compliance evaluation, product qualification or evidence that a proposed instruction was adopted. All proposed verification and useful-work scenarios remain not-run.

**Completion principle:** spend assurance effort on the accepted risk and real delivered outcome, eliminate avoidable reporting/review loops at their source, and retain the exact current evidence and mandatory safeguards that make the result trustworthy.
