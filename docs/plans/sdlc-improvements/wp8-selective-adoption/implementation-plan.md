# WP8 — Close product findings and qualify selective adoption

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

## Implementation proposal

**Prepared:** 11 September 2026. **Parent:** `../implementation-plan.md`, WP8. **Priority:** P1 for product defects that actually remain blocking; P2 for wider SDLC adoption. **Accountable owners:** the respective product maintainer and each adopting repository's policy/host owner. Universal Ontology (UO) remains the first SDLC testbed. **Primary acceptance:** A06 and A14, with adopter-specific readback of the applicable WP0–WP7 obligations. [P0]

**Selected implementation:** verify and close the remaining product obligations on exact candidates; integrate the real accepted MCP and SHACL implementations when available; port only independently accepted, qualified SDLC changes using a file-by-file three-way comparison; and record actual component and host coverage in the existing adoption materials. Do not build a cross-repository distribution mechanism, a new approval service, another scanner, a new lifecycle schema, or a universal release gate.

This is a plan, not an accepted baseline, an applied repair, a deployment authorisation, or evidence that the proposed checks have run. The research read repository content and existing remote job results. It did not access the user's Windows worktrees, run WebVOWL, install the converter, exercise Codex Security, or execute a combined MCP/SHACL candidate. Local research-file checks described in the companion record establish only the integrity of this planning package.

The critical delivery distinction is **source-qualified → adopter-integrated → host-qualified → product-outcome-qualified**. These are descriptions of evidence, not new runtime states. A source commit, a passing control fixture, a package label of `1.0.0`, and an actual native-host result establish different things.

Companions: [adoption/integration worksheet](adoption-and-integration-worksheet.proposed.md), [proposed adoption-record amendments](adoption-record-amendments.proposed.md), and [verification catalogue](verification-catalogue.proposed.json). They support this work package; they are not mandatory new documents for every ordinary change.

## 1. Preserve the parent contract and refresh its starting point

### 1.1 Parent traceability

| Parent requirement | Implementation owner in this plan | Required evidence |
|---|---|---|
| Close/link WebVOWL's unversioned-header and unexpected-error findings | WebVOWL maintainer; §§5–6; WP8.3/WP8.4 | Existing repair and regression inspected, or a genuinely failing independent regression followed by a bounded repair; actual AQFO artifact outcome. |
| Disposition ONI's current dependency-review failure without concealing other obligations | ONI maintainer; §7; WP8.5 | Exact current run/job result; a new remediation only when still necessary; actual installed archive/description behavior. |
| Record source commit, selected components, overlays, evidence and deviations | Each adopter; §§3–4 and 9–10 | A retrievable file-level adoption delta and actual host qualification. |
| Qualify UO first and adopt separately | UO source owner, then each adopter; §4 | The selected source fix is accepted and qualified before its downstream adoption. |
| Exercise the real combined MCP/SHACL result | Accepted MCP/SHACL integration owner; §8; WP8.6 | Real accepted inputs, their combined target, fresh required verification and semantic consumer results. |
| Stop propagation of a failed change without erasing work | Coordinator and affected owner; §11 | Failed evidence retained; named hold or authorised bounded recovery. |

**A06 — integration/control movement:** a changed combined source, baseline or control identity cannot reuse incompatible earlier success; real combined consumer checks run.

**A14 — representative outcome:** the frozen WebVOWL candidate completes or honestly fails the AQFO artifact job; ONI's real packed consumer/description behavior is demonstrated. An honestly recorded failure satisfies truthful reporting, not the product's positive acceptance requirement. [P0]

WP8 consumes WP1's text/evidence guarantees, WP2's execution ownership, WP3's resource obligations, WP4's actual protected dispatch, WP5's installed security capability, WP6's trusted-baseline/preflight rules and WP7's proportionate cadence. Their plans, baselines, candidate branches and actual implementations must not be conflated. WP8 does not reimplement every work package inside a single integration PR.

### 1.2 Research pins and new observations

These are observations at the research read, not moving execution targets. Re-resolve the intended refs and review intervening changes before implementation. Preserve the parent's original findings as historical evidence.

| Surface | Observed identity | Supported conclusion and limit |
|---|---|---|
| UO `main` | `a0374bad8203aa95f87a0e47a85013fd4b938c7e` | Latest inspected merge captures the WP2 baseline. Actual WP1 version-3 receipt behavior is already present in source. This does not establish WP2 or every later WP as deployed. |
| UO SHACL branch | `22bcfddfa538d04be22c811169069dbc4ea56f1d` | A published proposal branch. Issue #31 describes draft scope; no combined implementation was qualified by this research. |
| UO exclusive-start branch | `eb631007ff143a23b2e2ae450fd84591faec48b0` | A separate candidate ref was visible. Branch existence is not source-main integration, acceptance or host qualification. |
| WebVOWL feature branch | `80b302214d24bce195986af89ef7a34d24274928` | Includes the production-preview D3 repair and an updated completion record. |
| ONI PR #4 | Base `975acf599d06ec3d274c55bac8d1731278ffa153`; head `fe75c5d8e29f68e43812439fbc6ec73df2f43b05` | Draft/open at read. Its description still names older `f92f16d…` evidence; the API target is the current source identity. |
| ONI BBCode workflow | Run `34529893438`, attempt 1, at `fe75c5d…` | All ten observed jobs succeeded, including the executed dependency-review action, six converter/packed-consumer matrix jobs, both mutation jobs and the aggregate. |
| ONI trusted linkage workflow | Run `34529892678`, attempt 1, `pull_request_target`, same candidate | Failed. The green product workflow is not a green trusted-linkage result or merge approval. |
| Supplied worktree handoff | Historical observations prepared 10 September 2026 | Six evidence-bearing worktrees need current reconciliation through WP0/WP3; their age, names and dirty counts do not establish disposal authority. |

The UO baseline merge is dated 10 September 2026 at 21:14:07 UTC, which is 11 September at 00:14:07 in Cyprus. This plan's date deliberately differs from the parent filename. [S01–S07, P1]

The current ONI dependency result supersedes the parent's active dependency-failure assumption for that inspected candidate. Do not deliberately reinstall the retired comparator, reopen the fixed `nwmatcher`/`qs` selections, or generate another dependency change merely to follow an obsolete step literally. Preserve the failure-to-decision-to-repair history and attach the later successful native observation. The current linkage failure remains distinct; its exact current diagnostic should be read before deciding its remedy. [S05–S07, S17]

### 1.3 WebVOWL's actual repair is not the earlier proposed representation

The current projector forwards string-valued `header.version`, including `""`, and otherwise supplies `null`. Its consuming `createOntologyHeaderRecord` now accepts a **string or null**, rejecting other types at that boundary. The earlier nonempty-string restriction is no longer present there. The controller also contains separate `createLoadFailedError` (`LOAD_FAILED`) and `createLoadAbortedError` (`LOAD_ABORTED`) constructors. Their complete error-routing behavior still needs the relevant tests, not inference from constructor names. [S08–S10]

Consequently, WP8 must not impose an empty-string-to-null rewrite just because the earlier diagnostic suggested it. Verify the maintained contract against its actual accepted intent: an absent version must not prevent a valid ontology from loading, meaningful source text must survive, invalid typed inputs must fail at their owner, and ordinary failure must not masquerade as cancellation. Source implementation alone does not authenticate an acceptance decision. Any further representation change needs its own accepted justification and consumer impact assessment.

The completion record reports a successful native AQFO job and later records a different production-preview failure. The latter was repaired by bundling the required existing D3 exports. The production-preview subset checked startup, human loading and native export; it is not a repeat of every earlier job or a newly observed AQFO result on every host. [S11–S13]

### 1.4 Evidence levels used throughout

**Observed source/API fact** means content or remote metadata read during this research. **Recorded operational evidence** means an existing maintainer report whose underlying local bundle was not reopened here. **Proposed test/decision** means work still to perform under authority. **Inference** means a conclusion limited by the evidence stated beside it.

The repository's existing source manifests, adoption records and version labels are not authenticated attestations. Branch-protection enforcement, current installed plugin behavior and the user's current filesystem contents were not established by this research. A read failure or truncated listing is not evidence of absence.

## 2. Scope, authority and delivery structure

### 2.1 Three independently accountable workstreams

**Product closure:** WebVOWL and ONI maintainers verify existing fixes and address any remaining product defect in their own accepted scopes. They can do useful authorised work without waiting for an unrelated SHACL implementation or all SDLC ports.

**UO combined integration:** the integration owner obtains the real accepted MCP and SHACL inputs, integrates them with the selected SDLC controls and validates the combined semantics. It must not turn a draft SHACL proposal into approved implementation simply to complete a checklist.

**Selective SDLC adoption:** qualify each selected source fix in UO first, then obtain an independent adoption decision for ONI and WebVOWL. UO-first applies to adoption of shared SDLC fixes, not a prohibition on fixing an independently owned WebVOWL product defect.

Do not create a cross-repository mega-branch. Within one repository, separate changes where trust, approval, rollback or distinct product responsibilities require separation. Related edits may share a PR when that scope is actually accepted. P1/P2 are priorities, not R1/R2 risk classifications.

### 2.2 Risk and permission decisions

Propose R2 for a consequential shared-control adoption or combined MCP/SHACL integration that changes accepted verification, metadata, concurrency or cross-component behavior. A bounded product repair may have a lower independently justified route; the existing D3 correction was recorded as R1. Do not raise every observational read to R2 or downgrade inherited R2 obligations to simplify adoption. [S12, S24]

The following permissions remain separate: inspect evidence; modify source/tests; modify configuration or policy; create a verification workspace; install approved dependencies; access a browser/network endpoint; invoke a paid/native scan; write or update an Issue/PR; commit/push; merge; deploy/publish; and dispose of resources. Accepting this implementation design does not silently grant all of them.

The default scope excludes npm/Steam publication, a new repository or repository migration, hosted deployment, origin-trial activation, changes to credentials/ACLs/guard exceptions, blanket dependency upgrades, new browser/runtime support, global Git settings and source-package version promotion. ONI's existing local-only decisions and later specific publication exceptions must be read as actual decisions; a past authorised push is not standing permission for the next one. [S17, P1]

### 2.3 Responsibilities, not mandatory extra agents

| Responsibility | Accountable party | Concrete output |
|---|---|---|
| Accept intended result, material policy and consequential exceptions | Existing owner/Max as applicable | Inspectable decision tied to the relevant scope/content. |
| Qualify selected shared SDLC changes | UO maintainer | Source commit and actual source/Windows qualification references. |
| Preserve and supply integration inputs | Each implementation owner | Accepted requirement identity, exact candidate and retained required evidence. |
| Integrate MCP/SHACL | Named integration owner | Combined candidate, conflict decisions and semantic result. |
| Close downstream product gaps | Respective product maintainer | Relevant regression and actual user-outcome evidence. |
| Verify independently where required | Existing authorised verifier/reviewer | Exact reviewed object, commands run, findings, gaps and preservation. |
| Adopt and qualify effective host behavior | Each adopter/operator | Selected file delta and actual installed/loaded scope. |
| Retain/dispose resources | Existing coordinator/operator | WP0/WP3-compatible disposition; no implicit cleanup. |

One person can perform several permitted responsibilities, but that does not create organisational independence. Independent review and human approval are not interchangeable with a second process or a separate chat.

## 3. Build the smallest complete adoption delta

### 3.1 Start from the existing records and the selected fix

For each selected fix, add a concise section to the existing task/PR or adoption record. Bind the source acceptance reference, exact source commit, source qualification, adopter's pre-change revision, selected paths, retained overlays, affected entry points and required host checks. Group genuinely identical handling; expand only actual conflicts or risks.

Do not use the whole `.sdlc` directory as the unit of adoption. WebVOWL's current `.sdlc/UPSTREAM.json` records an immediate import from ONI at `1d352b9040005e144a9fc4a1ac7dd628241e7284`, a UO target source at `b3984ffbfe9b38cca7bd4570aeb3f5bc0fa6f20e`, and file-level adaptations. That is a two-hop lineage with local choices, not a byte-identical UO deployment. [S14]

A component is selected because its accepted correction is needed, not because a later source tree happens to include it. Use the applicable earlier WP's actual implementation and acceptance evidence. A proposal file from this conversation is not a substitute for the deployed source.

### 3.2 Minimum dependency closure per component

| Selected component | Examine and deliver together where applicable | Do not silently import |
|---|---|---|
| WP1 text/evidence | Python launcher, shared text helpers, lifecycle writer, receipt schema, completion reader, relevant tests and setup/check-discovery changes | An old lifecycle implementation over the adopter's accepted baseline logic. |
| WP2 exclusive execution | Initial publication helper, `begin` caller, actual linked-worktree tests, local path ownership and approved handoff guidance | A global lock/scheduler, or an unqualified candidate simply because its branch exists. |
| WP3 retained resource visibility | Its actual accepted writer, reader, schema/CLI and resource guidance, if implemented and selected | Draft record formats, automatic removal or other worktrees' runtime histories. |
| WP4 command dispatch | The specific native/host correction and matching local configuration decision, if established | A wrapper, forced dialect, broad allowlist or implied worker coverage. |
| WP5 Security qualification | Installed capability evidence, scope-accounting and cause-specific workaround disposition | Copied plugin internals, presumed propagation of PR #820, or artifact-access retirement by analogy. |
| WP6 baseline support | Shared format contract, local lifecycle integration, trusted validator/readers, tests and exact guide/template adaptations | Candidate-controlled trusted policy, fabricated acceptance or forced Issue conversion. |
| WP7 proportional execution | Accepted instruction changes and relevant preservation tests | Changed risk classes, fingerprint exclusions, skipped final assurance or a result cache. |

This is an inspection list, not a statement that every row is currently implemented or must be selected. If selecting one fix requires an unaccepted new contract, stop that selection and obtain its decision; do not silently expand the import.

### 3.3 Perform a real three-way comparison

For each file, identify **B**, the source actually used at the last applicable import; **U**, the accepted qualified upstream version being selected; and **D**, the adopter's current destination. B may differ across files or import hops. Resolve the actual immutable source instead of assuming a single manifest-wide base explains all history.

Compare B→U for the intended correction and B→D for local adaptation. Classify the result as unchanged, direct accepted import, adapted import, independently equivalent local implementation, intentionally not selected, or conflict requiring decision. Preserve actual source/destination paths and bytes/hashes in the existing record when those establish applicability.

For a conflict, name the semantic responsibilities involved: baseline format, root resolution, interpreter selection, run-receipt contract, source fingerprinting, test selection, generated configuration, or actual product commands. Use the existing source owners and native tools; do not resolve by copying whichever file is newer. A patch applying cleanly proves neither preserved behavior nor compatible surrounding imports.

At the inspected revisions, UO and ONI use `scripts/` lifecycle helpers; WebVOWL has adopted `util/` lifecycle paths. Resolve actual imports, script-root locators, tests and generated references rather than mass replacing the word `scripts`. Preserve the adaptor's Node/Python choices and approved package-manager dispatch. [S15, S16, S19, S22]

### 3.4 Preserve histories, licences and overlays

Keep import-origin manifests as historical evidence unless their existing documented maintenance contract explicitly calls for a reviewed update. Never rewrite their old hashes to imply the new bytes were present at bootstrap. Append the current adoption delta and link the old provenance. If an existing current-state manifest is updated, retain its predecessor in ordinary version history and describe the new actual integration rather than changing its original meaning.

Preserve applicable UO/ONI/WebVOWL licence notices, adapted TDD notices and the separately governed DCG terms. Do not infer rights from a source-package version or re-run unrelated licensing campaigns where accepted evidence remains applicable. No legal clearance is granted by this plan. [S14, S17]

Do not import `.venv`, `node_modules`, `.sdlc/runtime`, user `.codex` state, personal credentials, global hooks or security bundles as configuration. Evidence may be separately preserved/transferred through an approved restricted route; that is not activation of its old runtime records.

## 4. Qualify the selected source in UO before downstream adoption

### 4.1 Establish actual implementation status

Read the accepted decision, exact source delta, relevant merged PR and existing qualification. Categorise each selected item as baseline-only, candidate-only, source-implemented, source-qualified, host-qualified or blocked. These descriptions can be recorded in one existing table; no state-schema change is required.

For WP1, maintained source and adoption text already describe version-3 receipts. For WP2, the inspected main merge concerns its baseline and a candidate branch is visible. Neither fact by itself supplies its complete native acceptance. WP3–WP7 must likewise be checked against their actual source and decisions rather than marked done because their detailed plans exist. [S01–S03]

Where a source repair has already been independently qualified on the precise inputs and supported host, retain that evidence and inspect only subsequent affected deltas. Do not force a fake RED on repaired main. A missing regression should receive an independently authored check; report whether it characterises already-correct behavior or reveals a new defect.

### 4.2 Verify the source contract through its actual entry points

Read UO's current package scripts, required route and verification configuration. At the inspected source, the maintained interfaces include `npm run check:sdlc`, `npm run test:sdlc`, `npm run test:python` and `npm run sdlc -- verify`. Invoke lifecycle commands only against the execution the coordinator actually owns. [S19, S20]

Select the relevant existing regression from the originating WP and run the actual default Windows boundary where it is material. Retain raw failures, source/control identity, exact commands, environment and expected result. The final consequential source candidate still receives its actual required full profile and independent assurance.

The inspected UO full profile has eleven named checks, including the five source-ontology invariant inputs, direct Vite build, JSON-LD generation and MCP application bundle. Root `npm run build` invokes prebuild auto-fixes; the configured direct Vite invocation deliberately avoids them. Do not swap these paths or call a small synthetic profile the repository's full qualification. [S19, S20]

### 4.3 Readiness to port is scoped

A source-qualified component can become a downstream candidate once its independent adoption decision exists. That does not require every unrelated WP or the draft SHACL project to be finished. Conversely, the source-control check cannot discharge a claim about combined MCP/SHACL semantics; §8 and A06 remain independently outstanding.

If source acceptance reveals a regression, stop propagating that component. Continue independent authorised work that does not rely on it. Preserve the failed object and return the defect to its existing owner rather than weakening the downstream test to make the import possible.

## 5. WebVOWL: close the actual defect, not an obsolete prescription

### 5.1 Reconcile and link the two historical findings

In the existing WebMCP evaluation/completion record, identify the original optional-version failure, the misleading error result, the actual intervening source changes and relevant tests. Search for an existing issue or PR anchor before creating anything. If the defect is fixed with attributable evidence, link that repair and its qualification rather than file a new open issue claiming it is still present. If an acceptance gap remains, state that gap separately from the repaired behavior.

Do not close a tracker item merely because this plan exists. A source read can establish that a check changed, but not that the entire original native browser job now succeeds on the adopting host. Preserve the original failed AQFO run and source oracle. [S08–S12]

### 5.2 Optional-version contract and tests

Use the maintained files:

- `src/app/js/controller/vowlModelInspectionProjector.js` and its `.test.js`;
- `src/app/js/controller/renderedGraphRuntimeContracts.js` and its `.test.js`;
- the owning source-loader tests where source-to-VOWL behavior is relevant.

Construct a minimal valid VOWL model independently of the production converter, with independently specified class identity and valid required fields. Pass it through `projectOntologyInspectionSnapshot` and the real snapshot constructor. Cover omitted version, `null` as represented by the projector, explicit empty string, a nonempty Unicode version string and invalid values at the constructor boundary.

At the inspected contract, the empty string is valid and preserved; non-string/non-null constructor values reject. Do not demand that the projector reject a value it intentionally represents as absent without first establishing an accepted source contract. Do not replace every invalid value with `null`, make all required fields optional, or synthesize a version to make AQFO pass. [S08, S09]

Use independently supplied expected records and meaningful assertions about the surviving entity and metadata, not an output snapshot generated by the same projector. Preserve valid explicit version text exactly. Distinguish missing/unknown metadata from a claim that the ontology has a particular version.

If these tests already pass and sensitivity is adequate, retain them and record characterization of the existing repair. If a current boundary fails, reproduce it first and repair only the owning module. A negative control may use an isolated reproduction of the prior nonempty-string rule; it must not leave a fault flag or changed production validator in the delivered code.

### 5.3 Error classification and cancellation preservation

Use `src/app/js/controller/webVowlController.js`, `webVowlControllerContracts.js` and their existing tests. Supply the unexpected failure through an existing injectable source-loader/projector/renderer dependency in the test fixture; do not add a runtime `forceFailure` feature.

Exercise an ordinary uncoded `TypeError` in the valid, current, uncancelled load generation. The outward result must be the accepted load-failure classification, not `LOAD_ABORTED`. The current source provides `LOAD_FAILED`; inspect the complete catch path and public projection to verify that it is actually used appropriately. Keep useful diagnostics in their approved private/detail boundary rather than leaking unrestricted exception content. [S10]

Separately test an actual caller cancellation, a superseded generation, the supported abort representations and genuine coded fetch/parse errors. Specify which source/view remains usable, which generation is current and whether a stale completion can overwrite it. An aborted operation is not a load failure; an ordinary exception is not evidence of cancellation. Retaining the previous graph after a failed replacement is not evidence that the requested new ontology loaded.

Use controlled promise/readiness barriers for overlapping operations rather than timing-only sleeps. Assertions cover the public result, accepted generation/source and relevant preserved state. Broader renderer recovery is changed only if an independently reproduced defect requires it; do not reopen the full lifecycle redesign under WP8.

### 5.4 Production-module repair remains a preservation target

The inspected production-preview fix already removes D3 externalisation and the obsolete output-global mapping from `vite.config.mjs`, and adds `src/productionBundle.integration.test.js`. Preserve its actual shipped-module negative control and the classic D3 asset. Do not duplicate that repair or remove its regression merely because development-server tests pass. [S04, S12, S13]

An approved normal build can produce ignored output, but final verification must not silently modify the frozen tracked input. Inspect build/prebuild hooks, expected output locations and source identity. If a build rewrites tracked inputs, retain the result, return ownership for the necessary correction and establish a new frozen candidate; do not label the old identity verified.

## 6. WebVOWL: qualify the complete AQFO artifact job

### 6.1 Bind the source, target and real host

Use the pinned AQFO input already selected by the accepted evaluation, not GitHub's HTML blob page:

```text
Repository: WorldFishCenter/fish-ontology
Revision: dee2aa72ba268473cd60a18b62f1ae941eee7dec
Path: aquaculture_small_scale_fisheries_ontology.owl
Historical byte length: 398529
Historical SHA-256: 0a35e466d5765b56ed66777e4ead6359410eef0b688f0c6e9eeeb41405258b6c
Requested entity: http://w3id.org/aqfo/aqfo_00002008
```

These are the evaluation's recorded source facts. At execution, retrieve or reuse the retained exact source through authorised access and verify it. A mismatch is a new input decision, not permission to update the expected digest silently. The same bytes can be retained locally for an independent oracle without changing the input URL supplied to the native job. [S11, S12]

Record WebVOWL's full source revision and relevant dirty inputs, actual build artifact, browser/client/model identity when available, execution surface, native WebMCP capability, and accepted restrictions. Freeze the candidate with the implementation owner. The verifier must not share a checkout that is still being edited or a server that rebuilds from an unowned changing tree.

Use the real locally built preview when qualification claims cover the delivered static application. Vite preview serves a local build; it is not production-host deployment qualification. An origin/permission requirement not available on that surface remains a limit. Never patch or mock `document.modelContext` and call it native availability. [S12, W02]

### 6.2 Establish independent semantic expectations

Read the pinned RDF/XML independently of the production conversion, inspection and rendering modules. The recorded expected assertions are:

| Entity | Explicit source relationship |
|---|---|
| `aqfo_00002008` (`person`) | `rdfs:subClassOf` `aqfo_00002214` (`household member`) |
| `aqfo_00002009` (`man`) | `rdfs:subClassOf` `aqfo_00002008` |
| `aqfo_00002346` (`woman`) | `rdfs:subClassOf` `aqfo_00002008` |
| `aqfo_00002347` (`child`) | `rdfs:subClassOf` `aqfo_00002008` |

Use the full `http://w3id.org/aqfo/` IRIs. Preserve the asserted subclass direction even if a reviewer expects a different domain model. The earlier inspection found no explicitly declared class whose label is `Fishing Vessel`, while the phrase occurs in annotations. Scope that negative statement to the declarations and bytes actually examined; do not generalise it to every inferred/imported entity. The absence of `owl:imports` in the pinned bytes is likewise a source observation, not a proof of complete conversion. [S11, S12]

Check current source and exported structure against these independent expectations. VOWL presentation relationships, counts and spatial proximity are not interchangeable with OWL declarations or asserted edges. Do not apply UO-specific SHACL editorial rules to this third-party ontology merely because both workstreams involve ontologies.

### 6.3 Execute the actual reader's job

Give the authorised agent the pinned source and the existing request to load it, show the person region and provide the exported SVG. Let the actual host's discovered tools and supported input schemas determine native invocation. Reuse the existing browser qualification harness where applicable; a direct controller call is a bounded diagnostic, not the user job.

Observe the sequence: source loaded; exact IRI resolved; relevant neighborhood obtained; actual zoom/pan/framing applied; visible controls and warnings inspected; export requested; output retrieved; output independently opened; result delivered or its exact delivery limit explained.

Do not substitute highlighting for framing. Do not add a Fishing Vessel entity because the phrase appears in narrative text. Do not create a different illustration with an image generator or diagram library. The answer must describe the source's entity/relationship facts and actual view limitations.

### 6.4 Verify the actual artifact, not a success message

Retrieve the page-generated SVG before its Blob URL is retired or another export changes the active artifact. Record the actual bytes, media type, dimensions, source identity, render/filter state and digest. A filename ending in `.svg` or an HTTP 200 is not enough: reject HTML, an unavailable object URL, malformed XML and mismatched source/generation.

Parse the saved artifact with an independent XML consumer. Map the relevant displayed identifiers and relationships to the source oracle; open the saved artifact separately in an approved viewer and inspect legibility, cropping, labels, directions and styling against the live frozen view. Preserve meaningful filters, warnings and long-label limitations. Do not require byte-identical layouts or an earlier SVG hash for independent fresh runs.

Retain the native layout verdict. A timeout/best-effort export cannot be reported as settled. Inspect that export did not unexpectedly change the live state. Distinguish page export, successful retrieval, local retained file, clickable conversation delivery and unsupported automatic attachment. A real retained artifact with an honestly reported client limitation is different from pretending attachment occurred. [S11, S12]

### 6.5 Failure and rerun discipline

If load, projection, module linking, framing or retrieval fails, preserve the same attempt, exact source/candidate and diagnostics. Stop the claim at the failing boundary. Narrow diagnostics may identify a repair, but cannot overwrite the original native result.

After a correction, freeze the actual new candidate and rerun the affected obligations. Reuse earlier unaffected tests only with their precise applicability stated. For final delivered-build AQFO acceptance, require applicable evidence for that whole job; the prior FOAF/SIOC production-preview subset alone does not establish it. Do not repeat all twenty exploratory jobs by default where the accepted impact analysis requires a smaller preservation set.

Native file chooser, CORS, browser capability and client attachment restrictions stay visible. No security-policy bypass, alternate file-access path or origin-trial activation is authorised by this plan.

## 7. ONI: close the current dependency and packed-consumer obligations

### 7.1 Read the current result before prescribing a repair

At the inspected head `fe75c5d…`, BBCode run `34529893438`, attempt 1, has ten successful jobs. Dependency-review job `103047780807` actually ran its review action successfully. Library and CLI mutation jobs `103048991149` and `103048991235` ran their qualification step; six matrix jobs ran the converter and real packed-consumer check. This is new remote evidence, not a result of this research executing the jobs. [S06]

The existing execution record explains the intervening owner-approved retirement of the unsupported executable comparator. It retains a historical 250-observation report and reports 200 active observations over the retained four providers. Preserve those distinct scopes and the original failed jobs. The latest source record's pending-push wording is historical relative to the newly observed run; append a dated readback rather than rewriting its earlier result. [S17]

Re-read the actual candidate and exact run/attempt when WP8 executes. If the relevant current native dependency action passes on that candidate, record the repaired obligation; do not force a dependency edit. If a new failure exists, obtain its exact package/manifest/advisory, status and policy threshold, then use the accepted dependency decision route. A static reachability opinion or clean production-only audit cannot waive a different native gate. [P7, S06, S07]

Do not infer that all ONI checks pass: trusted-linkage run `34529892678`, attempt 1, is separately failed for the inspected candidate. Read that job's current diagnostic and use WP6's accepted trusted-consumer work where applicable. Product jobs and linkage execute different contracts. No patch to candidate policy, severity suppression, fictitious approval, changed baseline or forced merge is authorised.

### 7.2 Preserve unrelated decisions and limitations

Keep the retained comparator evidence, active provider/corpus identities, accepted performance limitation, unresolved upstream serializer proposal, licensing provenance, renderer scope and destination-specific release obligations under their actual decisions. Do not treat the retired graph as current installed tooling, resurrect it for a new audit, or copy its recovered installation into an adopter's active dependencies. The retained recovery directory remains a WP0/WP3 resource obligation. [S17]

Do not repeat an unsupported claim that independent counsel is required where the accepted plan and later owner decision do not say that. Equally, an internal licence assessment is not an externally supplied legal opinion. No confidential reproduction or undisclosed vulnerability material needs publication in the general adoption record.

Repository extraction, public registry qualification, trusted-publisher activation, signing credentials, release version and Steam publication remain separately scoped. A local archive can be a useful delivery without those operations. The current destination and permission to act there must be bound explicitly; a historical plan to move repositories does not authorise creating or publishing one now.

### 7.3 Bind the real description and expected behavior

Use the real Steam/Workshop description selected by the accepted task, together with its exact source reference, byte identity, selected dialect/profile and target rendering assumptions. That input was not supplied in this research, so the plan does not invent a filename, live Workshop ID or expected complete output.

Before running the converter, independently establish the important literal spans, supported constructs, relevant links, structure and expected lossy conversions or diagnostics. Reuse the approved construct registry and source-grounded prior evidence where unchanged. A generated conformance report cannot be the sole author of its own expected result.

Keep the deliberately partial reverse-conversion contract partial. Do not require an exact universal BBCode→GFM→BBCode round trip where information loss is accepted, and do not use semantic equivalence to erase meaningful literal whitespace or unsafe active-link changes. If the actual input is inaccessible or its scope is ambiguous, retain that specific outcome gap; synthetic fixtures can still qualify narrower contracts.

### 7.4 Exercise the installed archive using existing package tooling

Inspect the selected package's current scripts and consumer tests. The observed package exposes `test:package`, `release:pack`, `check`, `qualify:github` and applicable type/coverage commands. Ordinary `check` already contains installed-package qualification; do not run several equivalent pack/install campaigns merely to restate it. No observed ordinary check implies registry publication or live renderer qualification. [S18]

Retain the exact archive from the approved candidate, its native identity/checksum, source/build relationship and allowed dependency graph. If an existing packer enforces a clean candidate, satisfy it through the normal commit/ownership procedure; do not reset, clean or stash someone else's work.

Use the existing package-consumer script and a task-owned independent consumer directory outside the source/dependency ancestry. Establish that API imports and CLI execution resolve to the installed archive, not source-relative imports, development links or an ancestor `node_modules`. Native npm supports tarball installation; directory installation can have linking semantics, so a source-directory success is not equivalent evidence. [W03]

Keep the selected compiler roles, Node/npm versions and install-script/egress restrictions. A fresh native install may resolve dependency ranges differently from the author's lockfile; retain the actual installed graph and do not claim the source lock alone fixed it. If that differs from accepted qualification, disposition it before claiming equivalence.

Exercise the actual public API and the installed CLI on the same bound real description. Read the installed help/API contract before composing arguments; this plan does not invent a CLI syntax. Assert independently expected literals/structure/diagnostics, real exit statuses and applicable generated declarations through the selected TypeScript consumer. Include an independently malformed or prohibited input and a package-content/resolution negative control. Do not make production code execute a test-specific failure switch.

### 7.5 Rendering and delivery claims remain separate

If the requested outcome includes GitHub-rendered Markdown, use the existing opt-in qualification with separately authorised network access and assert the returned presentation and literal semantics. A recorded pass on synthetic renderer scenarios supports those scenarios, not every byte of the real description. Inspect the real description's applicable output where the user outcome requires it.

If Steam publication is not authorised, do not publish to prove rendering. Report the supported offline/conversion result and actual rendering limitations. Retain the real archive, output Markdown and diagnostic material in the approved store with readback; local success does not promise registry availability or a future repository's activated workflows.

### 7.6 Final current handoff

Report the actual PR base/head, tested merge or checkout where relevant, workflow/event/run/attempt, job/step conclusions and artifact identities. Read `pull_request_target` linkage separately from `pull_request` product workflows. A wrapper that lists only PR-triggered runs is not a complete required-check inventory.

A retried run retains the original event's `GITHUB_SHA`/`GITHUB_REF`; do not claim that rerunning an old linkage job adopts a newer trusted policy. Obtain an actual qualifying subsequent event under normal authority and inspect its executed policy identity. [W05]

Use the existing task/PR record and existing restricted evidence references. A new body update, remote rerun, dispatch, merge or push is a write requiring its own authority. Research readback alone grants none.

## 8. Qualify the real combined MCP/SHACL integration

### 8.1 Admission is conditional on real accepted implementations

The published SHACL branch and Issue #31 are proposal evidence at the inspected state. The handoff's local MCP worktrees may contain unique implementation and reviews, but their current contents were not accessed. Obtain actual owner handoffs and accepted implementation identities; do not infer absence of local work from the remote branch list or pretend proposal branches are complete code. [S02, S21, P1]

For each side, bind the accepted requirements/version, current full commit and relevant dirty inputs, required source/version context, native validator/query interfaces, affected shared files, completed evidence and remaining gaps. Record which owner may supply, integrate and accept each input. The candidate starts only when these prerequisites exist for the integration being claimed.

If an implementation is not ready or its policy is still unaccepted, record **combined integration pending** with the next owner and concrete event. UO control qualification, downstream product work and separately accepted adoption can continue. That intermediate status does not satisfy the positive combined-product portion of WP8.

### 8.2 Prepare an owned integration object

Use a new authorised integration workspace, not one of the six historical worktrees by assumption. Reuse an existing appropriately owned workspace only after its coordinator confirms the scope and consumers. Preserve the original implementation/review candidates and failures before any integration operation.

Git's native `rev-parse`/worktree interfaces establish physical roots, administrative paths and shared/common identity. Linked worktrees share some refs/configuration; they are not separate repositories or security sandboxes. Coordinate fetch/ref/configuration operations that can affect others and do not invent a worktree-local isolation guarantee from directory names. [W01]

Apply the accepted inputs through the normal repository integration procedure. Inspect shared package/lock files, verification policy/configuration, source discovery, ontology version selection, build outputs, query indexes, MCP resource schemas and documentation generation. Resolve semantic conflicts explicitly. Regenerate lockfiles only through the approved native package-manager decision; no handwritten lock reconciliation or unrelated version refresh is implied.

Record the actual combined commit and dirty identity, or retain an exact pre-commit combined snapshot when policy permits. Do not invent a merge SHA. The integration owner must still verify the final delivered combined object after a later merge/rebase or conflict resolution changes inputs.

### 8.3 Preserve source selection and policy scope

Apply only the version/context-selection rules actually accepted for the SHACL implementation. Issue #31 proposes explicit local context, changed-entity defaults, full contextual graph checks, staged-byte correctness, deterministic generated documentation and distinct audit mode. Until accepted and implemented, those are admission requirements to resolve with its owner—not newly activated WP8 policy. [S21]

Once the corresponding contracts are accepted, exercise:

1. A relevant conforming entity in the selected source context.
2. A deliberately violating entity with an independently expected rule/focus-node result.
3. A changed entity whose validation depends on another module in the same context.
4. Staged content differing from the working file when staged validation is the accepted input.
5. A retained legacy violation outside a changed-only scope, and explicit whole-context audit behavior.
6. A selected-context mistake, unavailable dependency or zero applicable targets, with a truthful result rather than a blanket validation pass.

Use owned fixtures or approved copied data, not edits to released ontology files. No live imports, arbitrary remote retrieval, SHACL-JS execution, rules execution, ontology-version promotion or Wiki publication is authorised merely by integration testing. A meta-SHACL pass verifies the relevant shapes contract, not completeness of editorial intent. A second engine result, when required by the accepted plan, is separately identified rather than presented as proof of universal semantic equivalence.

### 8.4 Carry validated semantics through the real product pipeline

Build/query only the accepted source context. Trace at least one independently selected ontology fact through source, applicable validation, generated JSON-LD/query artifacts, MCP resource/tool output and an actual consumer. Record the source and policy identities at each boundary. A successful validator on one revision does not qualify an index or server serving another revision.

The observed UO package exposes `generate:jsonld`, `generate:jsonld:all`, `mcp:index`, `mcp:stdio` and `mcp:package:build`; other commands stage channels or create release artifacts. Inspect the actual command contracts and use the accepted local build/test route. Do not invoke staging, publishing, hosted deployment or credentials merely because the script exists. [S19]

Use a fresh owned output location or verify the existing output provenance. The inspected `generate:jsonld` script is `--missing-only`; a successful invocation can leave previously present output unchanged. Therefore verify the actual generated/query artifact's source identity and independent facts. Do not label cached output as regeneration or delete an unowned output tree to force it.

For the MCP consumer, use the repository's supported native client/protocol tests or actual approved host. Establish transport readiness, selected data version, actual resource/query result and the expected entity/relationship/annotation semantics. Preserve declared pagination/truncation, missing context and failure behavior. A server process starting or a request returning success is insufficient when its contents are stale or wrong.

Test an incompatible or deliberately stale artifact in an owned fixture to demonstrate that the chosen boundary detects it, or record the limitation if the accepted product has no such guard. Do not write a second production selector, clone the ontology into test expectations, or add a new public API just to produce a green integration test.

### 8.5 Demonstrate lifecycle freshness on the combined object

Retain branch-local successes as history. Introduce an independently controlled source/test/configuration change in an owned fixture and confirm that incompatible earlier receipts cannot satisfy the current gate. Include actual required profile selection, canonical/current receipt matching and context changes that materially affect the consumer. Do not rewrite task IDs, baseline digests or `startingHead` to recycle a pass. [S22, S23]

On the actual final combined candidate, run its required R2 full profile and accepted semantic/independent obligations. An integration fixture called `full` is not that run; eleven root checks alone may still leave accepted SHACL or MCP consumer obligations to execute. Examine current command composition and the explicit implementation plan rather than relying on a historic list count.

A route/control movement requiring new authority stays blocked until that decision is supplied through a supported interface. Issue #36's missing active amendment path is a separate reported problem. WP8 does not fix it by editing active JSON, claiming a fictitious completed handoff, lowering risk or silently creating a new starting point that omits earlier work. [S15]

### 8.6 Output and acceptance

The integration handoff identifies both source handoffs, accepted context/rules, combined candidate, resolved conflicts, actual full/semantic tests, output identities, independent reviewer, unperformed operations and remaining decisions. Preserve the complete needed input/output/run bundles so another maintainer can reproduce the assertion without the original worktree.

A successful combined result does not release the ontology, publish a generated Wiki, certify every OWL inference, or make unrelated downstream hosts qualified. If integration is not completed, leave that obligation explicitly pending while reporting completed independent slices.

## 9. Selectively integrate and qualify each adopter

### 9.1 Qualify one accepted component set per adopter

After §4 establishes source qualification, apply the approved three-way adaptation from §3 in the adopter's owned checkout. Start with the smallest useful coherent set, such as the actual accepted WP1 writer/reader/schema/launcher contract where needed; this is a candidate selection to approve, not an automatic instruction to deploy it now.

Do not overwrite the adopter's `.sdlc/verification.json` with UO's eleven-check profile. ONI's .NET and converter selection and WebVOWL's build/browser checks have different consumers. Preserve baseline semantics, input scopes, package-manager dispatch and held-out test independence. Port tests to the actual maintained layout instead of importing a second test tree that discovers unrelated fixtures. [S14, S16, S18, S20]

Before tests run, inspect the actual test-discovery scope. A saved review snapshot containing `*.test.js` can accidentally join the product suite; the WebVOWL completion record retains such an incident. Keep replay/archive material outside discovery through the existing approved storage boundary; do not silence the issue by excluding every review-related or Markdown path from verification. [S12]

### 9.2 Handle existing task and receipt state without falsifying history

Inventory active and paused tasks and their actual owners before changing the code they use. Decide with those owners whether to finish a quiescent task under its existing compatible version, pause and use a supported accepted continuation, or qualify the change in a separate new execution. Do not automatically migrate all worktrees or call `begin` inside someone else's active checkout.

For a selected version-3 receipt adoption, deliver the writer, schema and reader coherently. Preserve historical version-2 receipts as history; obtain new native evidence where the new contract requires it. Do not rewrite history into v3, accept old green records as new qualification, or add a permissive fallback just to avoid a blocked transition. [S03, S22, P3]

When shared policy/configuration changes, follow the supported authority and rerouting behavior. A human-readable decision cannot make an unavailable native risk-amendment interface exist. Any approved temporary scope limitation is recorded explicitly, not represented as successful native reclassification. [S15]

### 9.3 Separate generated configuration from effective host behavior

Inspect each adopter's setup/projection code and supported options first. Apply exactly approved local configuration changes through the existing transaction, preserving unrelated MCP blocks, roles, skills and hooks. A `--check` pass establishes generated-file consistency; it does not prove that the running host loaded, trusted or invoked those files.

Qualify the actual user entry path and required worker path only where that coverage is claimed. Record desktop versus CLI, bundled engine versus another installed executable, Python/Node/runtime, filesystem capability, guard version/configuration, native Security plugin and artifact writer, and any relevant context/trust difference. Do not collect a full environment dump or secrets merely to populate an identity record.

For guard and Security obligations, reuse WP4/WP5's actual accepted host evidence only when the combination still matches. A merged fix or visible plugin is not operational capability; OpenAI's own guidance distinguishes installation, surface/workspace availability and the permissions of included apps. No universal propagation time or install command is inferred here. [W04, P5, P6]

### 9.4 Verify preservation and actual local behavior

Run the selected component's causal regression through the adopter's real entry point, then its affected controls/consumers and required final profile. Include input movement and at least one truthful failure when those are part of the adopted contract. In the Windows evidence path, inspect the retained result rather than only the exit code; in the exclusivity path, exercise actual competing starts in owned fixtures rather than sequential mocks.

Verify unrelated runtime/verification choices and active evidence were not altered. Use normal source diffs and preserved sentinels where appropriate; hashes identify bytes but do not authenticate claims. Confirm that a new evidence receipt belongs to this target, task and host, not the source testbed.

Adopters may qualify independently after the source fix: failure in one local layout does not prove the other failed, but neither may inherit the other's green evidence. Stop propagation of the implicated variant and scope the diagnosis.

### 9.5 Read actual remote enforcement separately

Where remote publication is authorised, inspect the resulting source/PR head and all relevant workflow families, exact attempts, actual checked-out policy/product revisions and job steps. Distinguish executed success, justified not-applicable work, skipped prerequisites, failed jobs and missing runs. A green aggregate with unavailable evidence cannot establish an unobserved consumer result.

Trusted policy support, especially WP6's accepted-plan route, must be present in the policy source actually executed. Never check out or execute a candidate's validator, workflows, dependency configuration or hooks in a trusted-base metadata job to make it accept itself. Keep existing tokens/read scopes and branch protections unchanged unless separately accepted. [P7, W06]

A local-only adoption can be accepted for that local surface without implying remote delivery. When the accepted current deliverable excludes ONI remote changes or names a future repository, record remote work as deliberately deferred to its owner; do not merge ONI merely to remove an old red badge.

## 10. Record adoption without creating a second authority

### 10.1 Use the existing materials

Update the existing adopter's `docs/sdlc/adoption.md` or its actual equivalent, with a concise entry for the selected change. Keep the original bootstrap/import material and link the precise per-file adaptation in the existing change record. Use the companion worksheet as a draft section, not a required new standalone report or state database.

An entry must answer: **which accepted fix, from which immutable source, adapted how, into which target, on which host, with which actual evidence, and what is still not qualified?** Record an evidence-store reference that the intended maintainer can actually read, with relevant retention/ownership. A local `.sdlc/runtime` path alone is not proof that the next maintainer can retrieve it after a worktree disappears. [P1, S03, S14]

The package status may remain `1.0.0`/pre-release with repository-local deployment recorded. Do not bump a source-package or product version, change global deployment flags, or label all hosts equivalent to finish this work package. The existing status object has its own owner decision. [S27]

### 10.2 Distinguish three records

| Record | Purpose | Not a substitute for |
|---|---|---|
| Source implementation/qualification | Explains the accepted correction and tested source identity | Downstream adoption authority or runtime evidence. |
| Adopter adaptation/qualification | Explains the selected files, retained overlays and actual host result | Product outcome beyond the tested scope or registry availability. |
| Product/integration outcome | Explains the real combined/user job, source/output identities and remaining limits | Host command safety, human approval or every future environment. |

Link these records; do not copy raw findings into multiple public reports or create a giant synthetic “all passed” receipt. Append risk/false-positive decisions beside native evidence, preserving original scanner bundles.

### 10.3 Avoid the progress-log feedback loop

Complete intended tracked instructions and summaries before final freeze where the accepted sequencing permits. Put subsequent operational progress in an authorised existing task/handoff location, not repeatedly into a fingerprinted document. Any post-verification tracked edit or commit that invalidates current evidence receives the required fresh qualification; do not add a fingerprint exception to make adoption easier. [P8, S22]

If the adoption entry itself must be committed after a product observation, preserve the original observation's exact object and separately assess the documentation delta, then satisfy the actual final gate. The source identity of the earlier browser/export result must not be retroactively rewritten to the later documentation commit.

## 11. Failure, rollback and resource handling

| Condition | Required action | Forbidden shortcut |
|---|---|---|
| Source fix fails its causal check | Retain failed evidence; stop propagating that variant; return to owning WP | Drop the check, claim the fixture is optional, or continue rollout as qualified. |
| Upstream/import identity cannot be established | Retain current adopter; obtain exact provenance or make an explicit accepted new baseline decision | Invent B or treat common version text as identity. |
| Local overlay conflicts with new schema/reader | Resolve the semantic contract with owners; qualify the coherent set | Copy only the writer or add an unaccepted compatibility fallback. |
| Active task or evidence is incompatible | Keep state and ownership; supported pause/handoff or separately owned qualification | Delete active state, reset `startingHead`, refresh digests or migrate old results silently. |
| Installed guard/plugin route unavailable | Record its exact scope/blocker and applicable accepted alternative | Disable guards, patch caches, expand credentials or equate source tests with host acceptance. |
| Browser/artifact job fails | Preserve source, candidate and actual failed output; repair only demonstrated owner | Substitute an illustration, source-loader pass or mislabeled HTML artifact. |
| Current dependency gate fails | Preserve native finding and obtain a current dependency decision | Raise threshold, hide development scope or treat an earlier advisory decision as universal exemption. |
| MCP/SHACL implementation/acceptance absent | Keep combined acceptance pending, with owner/event | Run draft policy as approved or claim branch-local results qualify a nonexistent combined object. |
| Evidence transfer/readback fails | Retain the original resource and state a preservation hold | Delete it because a manifest, path or checksum exists. |
| Relevant target/configuration moves | Identify affected evidence and reverify actual inputs | Retarget old receipts or omit early task changes with a later base. |

Recovery means an authorised focused forward fix or normal bounded revert of the identified source/configuration delta. First retain the failed version, active state, outputs and decision. Revert compatibility must include reader/schema/writer relationships and generated configuration. Restoring older code that cannot read newly produced state is not a completed rollback; keep the environment held until an accepted recovery path exists.

Do not use a hard reset, blanket checkout, recursive runtime deletion, worktree removal or branch pruning as rollback. Stop only task-owned processes after their consumers finish. Source tests may need writable scratch and builds; that is not authority to change another task's files.

Use WP0/WP3 preservation/disposition for surviving worktrees, test environments, archives, scan bundles and local servers. The historical six worktrees can all remain. Actual DCG or permission denials reach the operator through the existing channel; no alternate interpreter or file API is a remedy for a denied equivalent action. An observed old reversible retention decision in ONI is not general permission to move arbitrary protected resources. [P1, P2, P4]

## 12. Detailed implementation slices

These are accountable execution slices, not a requirement for eight separate PRs, eight independent reviewers, eight full-suite reruns or a serial barrier across every repository. WP8.3–WP8.5 can proceed independently under their product authorities. WP8.7 requires qualification of the selected shared source component; it need not wait for an unrelated draft SHACL feature. Whole-WP8 completion still reports the actual combined and downstream outcomes.

### WP8.1 — Reconcile accepted scope, current findings and candidate ownership

**Inputs:** parent WP8/A06/A14; actual accepted product/SDLC decisions; current repository refs; WP0 preservation receipts where the historical worktrees are involved; existing adoption and execution records.

**Actions:**
1. Read effective repository instructions and the actual authority for each write. Bind one coordinator and an existing handoff location; identify product, integration and adopter owners.
2. Re-read UO source status, WebVOWL feature head and ONI PR head/base. Preserve historical descriptions, but do not use stale body text as current execution identity.
3. Classify each parent finding: still reproducible; already repaired but qualification incomplete; repaired and qualified for a specific object; superseded by an accepted decision; or not established. Attach the exact evidence and remaining question.
4. Inventory selected SDLC components, actual implementation readiness and recipient overlays. Exclude unaccepted candidate code and unowned runtime content.
5. Separate authority to test local products from authority to update a PR, adopt configuration, launch a scan, publish or remove resources.

**Verification:** reviewer can map every proposed edit/test to the accepted requirement or an explicitly unresolved owner decision. Current observations distinguish the ONI successful product run from failed linkage. No historical worktree changed.

**Exit evidence:** a concise candidate/obligation section in the existing task record, with source pins, owner decisions and explicit holds. No fabricated baseline, native run or universal adoption claim.

### WP8.2 — Qualify the selected shared component in Universal Ontology

**Inputs:** accepted source change, exact dependency closure from §3, real UO checkout/host scope and existing WP-specific evidence.

**Actions:**
1. Confirm the selected correction is source implementation, not just its accepted baseline or branch label.
2. Inspect relevant tests and previous native evidence; preserve them. Run the meaningful causal or characterization check before any necessary repair.
3. Implement only a missing accepted correction, using the owning WP design and its tests. Do not reopen its mechanism selection solely under adoption.
4. Reconcile overlapping writer/reader/schema/setup/test changes and inspect actual generated outputs. Keep unrelated package/configuration behavior unchanged.
5. Freeze the consequential candidate; execute its required UO full and independent assurance, including the actual Windows entry boundary where applicable.

**Verification:** current source identity, native result and retained counterevidence are inspectable. Source-level fixture success remains distinct from hosted/worker coverage.

**Exit evidence:** one accepted source qualification reference per selected component set, or a named source hold that prevents its propagation. Already adequate unchanged evidence is reused with applicability stated.

### WP8.3 — Verify WebVOWL's header/error repairs and add only missing regressions

**Inputs:** accepted WebMCP scope; original AQFO failure; current projector, snapshot constructor, controller and tests.

**Actions:**
1. Link the historical findings to the actual repairs and existing tests. Do not create duplicate open defects for already-correct behavior.
2. Exercise the independent optional-version fixture, retaining the actual string-or-null contract. Check exact explicit version text and typed invalid input at its owner.
3. Exercise uncoded failure, expected coded failure, caller cancellation and supersession with controlled preconditions. Assert public classification and preserved accepted graph/generation.
4. Repair only a demonstrated current gap. Preserve the original failure and the existing production module-link regression; do not introduce a global catch-to-abort, null-coercion escape or production fault switch.
5. Obtain the bounded required independent review of the real changed object and regression oracles.

**Verification:** T809–T817 as applicable, using actual maintained modules. Characterization passes are not labelled behavioral RED. Test harness setup failures are kept separate from product reproductions.

**Exit evidence:** explicit source/regression disposition for each original defect and a stable candidate ready for the native artifact job. Source closure alone does not close that job.

### WP8.4 — Execute and inspect WebVOWL's native AQFO artifact outcome

**Inputs:** stable accepted candidate, pinned source, independent oracle, approved browser/build context and evidence destination.

**Actions:**
1. Bind source/build/host identity and establish no concurrent writer. Retrieve/verify the retained AQFO bytes and expected facts independently.
2. Exercise the actual built application's native load, exact entity lookup, meaningful framing and export. Record warnings, filters, layout verdict and relevant human-control behavior.
3. Retrieve the actual page-generated output, validate media/bytes/XML/dimensions and map relevant structure to the source. Independently open it and compare the visible result.
4. Deliver the actual artifact or record precisely which page download/retrieval/attachment step the client cannot perform.
5. Preserve the failed or successful attempt and source identity. After a repair, freeze the new candidate and repeat the affected end-to-end obligations; do not reconstruct a fresh result from the old diary.

**Verification:** T818/T819 and O82; applicable production module/startup checks remain intact. Real built-preview evidence is not production deployment or all-browser coverage.

**Exit evidence:** actual A14 WebVOWL result, with any unsupported boundary held; no substituted diagram or source-loader-only pass.

### WP8.5 — Close ONI's current dependency and real archive/description outcome

**Inputs:** actual current ONI target and permitted delivery scope; exact workflow family/run/attempt; accepted dependency decisions; retained real description and package-consumer tooling.

**Actions:**
1. Read all relevant job families and current steps, not just a combined status. At the research pin, record product/dependency success and separate failed linkage.
2. Preserve the comparator retirement and historical report; do not reinstall a superseded environment. If a new relevant dependency failure exists, follow its newly justified accepted disposition without suppressing the gate.
3. Bind the actual user description, profile, expected literals/structure/diagnostics and archive identity. Use the existing normal package consumer rather than another packer.
4. Establish installed-archive resolution in an independent consumer; run actual API/CLI and applicable type consumers, including a meaningful invalid-input/control case.
5. Run live rendering only where required and authorised. Record current remote/local distinction and destination/release limitations.

**Verification:** T820–T826 and O83. A package test does not qualify Steam publication, the whole original comparator set or a private upstream proposal.

**Exit evidence:** current dependency disposition and actual installed real-input result. Trusted-linkage and external release obligations remain separate and attributable.

### WP8.6 — Integrate accepted MCP/SHACL inputs and verify their combined semantics

**Inputs:** the real accepted implementations and contexts, exact source/dirty identities, preserved owner handoffs, selected compatible SDLC source and an owned integration workspace.

**Actions:**
1. Require real implementation/acceptance readiness. If missing, record its owner and event and keep this slice pending without blocking unrelated product work.
2. Integrate under normal authority; explicitly resolve package, lock, source-context, validator, index, MCP and verification-control conflicts.
3. Build a conforming/violating source scenario from independent accepted rule expectations. Cover cross-module, staged and explicit-audit distinctions required by the accepted SHACL contract.
4. Carry an independently checked source fact through generated/query artifacts and a real MCP consumer. Verify source context and artifact identities, including missing-only/cache implications.
5. Challenge stale/moved controls in owned fixtures, then run the actual required full/semantic qualification on the real final combined object and obtain required independent review.

**Verification:** T827–T832 and O81; existing native validators and clients own syntax/protocol validation. Zero targets, wrong context, startup-only success and clean textual merges do not qualify semantic acceptance.

**Exit evidence:** combined A06 result, or an explicit pending/failed integration with retained inputs and next action. No manufactured merge identity or ontology-release/Wiki publication.

### WP8.7 — Port accepted SDLC components and qualify each actual adopter

**Inputs:** source qualification from WP8.2; independent adopter decisions; three-way source/overlay mapping; active-state ownership and required host capabilities.

**Actions:**
1. Review the exact per-file adoption delta and required writer/reader/schema/test/setup closure. Retain each repository's consumer profiles, directory layout, runtime and dependency policy.
2. Apply only accepted changes in an owned checkout. Coordinate live task compatibility; keep original runs/baselines/import records.
3. Inspect test discovery and generated configuration. Use only approved setup transactions and do not infer live trust from generated-file equality.
4. Run the relevant regression on the adopter's actual entry point, affected consumer preservation and final routed qualification. Inspect raw result/evidence ownership.
5. Confirm actual native guard/plugin/writer coverage where relied upon, using unchanged applicable evidence or fresh supported qualification under its authority.
6. Where publication is authorised, read the actual remote target, policy revision and job attempts. Stop the implicated propagation on failure.

**Verification:** T801–T808 and T833–T835; O84. A successful adaptation in one adopter does not satisfy another's host or configuration.

**Exit evidence:** a scoped adopted-component statement for each selected recipient, or a clear nonselection/pending decision. No wholesale directory copy or “fixed everywhere” label.

### WP8.8 — Publish the bounded handoff and retain unfinished resources

**Inputs:** preceding slice evidence, actual acceptance decisions, native bundles and local/remote output identities.

**Actions:**
1. Append the actual source/adoption/product results in the existing records using the companion wording/template. Retain original historical records and explicit unknowns.
2. Verify that the intended maintainer can retrieve the required evidence outside any disposable original worktree. Preserve source, dirty data, counterevidence and private bundles through the approved route.
3. List completed, pending, failed and deliberately unselected obligations separately. Link active Issues such as #31/#33/#36 to their actual status rather than closing them from the plan.
4. Identify next actors, concrete reassessment events and current authority. A task completion does not authorise code publication, exception retirement or worktree disposal.
5. Obtain the accountable scoped acceptance. If a parent obligation remains pending, use the partial-completion wording below rather than changing its acceptance criterion.

**Verification:** T836 and the review of AC8-01–AC8-12. A maintenance reader can identify what actually runs, what actually passed, and where the unresolved work belongs.

**Exit evidence:** a truthful WP8 disposition and resource handoff. Retained worktrees can remain; no mandatory cleanup, blanket upgrade or global release declaration is required.

## 13. Maintained change surface

This table identifies actual owners/targets to inspect. “Conditional” means edit only when the selected accepted correction requires it; not every listed file must change.

| Repository / path | Treatment | Required preservation |
|---|---|---|
| UO `docs/sdlc/adoption.md` | Append actual source/adopter qualification and limits; optional accepted interpretive wording from companion. | Original bootstrap, host, Security and WP1 evidence. |
| UO `docs/sdlc/verification.md` | Add a bounded integration/adoption reference only when actual evidence exists. | Earlier failed and successful run identities. |
| UO `docs/sdlc/howto.md` | At most a concise selective-adoption cross-reference if needed. | Existing routes, entry points and WP1 semantics. |
| UO `.sdlc/PACKAGE_STATUS.json`, source manifests | Inspection by default; explicit separate change only under their owner contract. | Actual pre-release/local deployment meaning and historic origin identities. |
| UO `scripts/sdlc.py`, `_sdlc_state.py`, launcher, schemas/tests | Conditional missing-source repair or coherent integration of accepted WPs. | No accidental receipt downgrade, state reset or scope loss. |
| UO `package.json`, lockfile, `.sdlc/verification.json`, MCP/SHACL source/test owners | Conditional real combined integration under §8. | Native dependency resolution, current consumer checks, explicit source/version semantics. |
| WebVOWL `src/app/js/controller/vowlModelInspectionProjector.js`, `renderedGraphRuntimeContracts.js`, associated tests | Characterise existing optional-version repair; edit only a demonstrated gap. | Accepted string-or-null behavior; required field validation and source metadata. |
| WebVOWL `webVowlController.js`, `webVowlControllerContracts.js`, associated tests in the same directory | Verify exact failure/cancellation classification and relevant state preservation. | Genuine coded errors, abort/supersession and current-generation ownership. |
| WebVOWL `src/productionBundle.integration.test.js`, `vite.config.mjs` | Preserve the existing production-module repair and meaningful sensitivity. | Delivered module resolution and approved build hooks. |
| WebVOWL evaluation/completion records | Append actual new target/surface/outcome evidence; preserve historical diagnoses. | AQFO source oracle, failed attempts, actual artifacts and client limitations. |
| WebVOWL `.sdlc/UPSTREAM.json`, `.sdlc/*`, `util/*`, setup/tests | Exact selected adaptation only, using real path mapping and existing record contracts. | ONI→UO lineage, local overlays and source/evidence histories. |
| ONI `docs/plans/2026-09-08-steam-community-bbcode-execution.md`, existing adoption/release docs | Current dated readback through an authorised recording point. | Historical dependency failures, retirement decision, local-only scope and later specific exceptions. |
| ONI `tools/steam-community-bbcode/package.json`, consumer scripts/tests | Inspection/default reuse; bounded edit only for a demonstrated actual consumer defect. | Public API, CLI/declaration contracts, private flag and native package tooling. |
| ONI comparison results/historical evidence and dependency configuration | Preservation by default; no reopening of the retired graph. | Historical 250 versus active 200 scope and existing native thresholds. |
| ONI `scripts/*`, `.sdlc/*`, setup/tests | Conditional coherent selected SDLC adaptation. | .NET/converter routing, accepted-plan behavior and actual source/receipt contracts. |
| Installed plugins, guards, generated `.codex` and account/remote settings | No blanket change; exact separate operator decision when implicated. | Existing permissions, trust, supported native contracts and private evidence. |

Do not introduce a new synchronisation command, GitHub app, repository updater, acceptance JSON schema, cross-repository CI workflow, test-result cache, cleanup orchestrator or one-size-fits-all verification profile.

## 14. Verification catalogue and operational exercises

The companion JSON specifies T801–T836 with preconditions, action, independent oracle, expected result, evidence and scope limit. All are **not-run** for this proposal. Reuse an applicable maintained test or retained executed result; add only missing meaningful regression coverage. A test that passes on the existing repaired source is characterization, not manufactured RED. A newly observed behavioral failure is retained separately from a bad fixture setup.

| IDs | Boundary | Expected evidence |
|---|---|---|
| T801–T808 | Selection, provenance, source-first qualification, coherent ports, receipts and test discovery | Explicit component scope; genuine overlay reconciliation; no inherited or corrupted current success. |
| T809–T817 | WebVOWL optional version, typed metadata, failure/cancellation and production module graph | Existing repair protected; missing defects reproduced at the real owner without broad coercion or exception suppression. |
| T818–T819 | AQFO artifact and adversarial output states | Native built-candidate job; independent source/SVG inspection; wrong content or incomplete layout/delivery not falsely accepted. |
| T820–T826 | ONI current dependencies, historical comparator, real archive/API/CLI/description and authority | Current native disposition; installed resolution; exact accepted behavior and scoped remote claims. |
| T827–T832 | MCP/SHACL readiness, context, combined semantics and freshness | Actual accepted combined object and real consumers; no stale artifacts or baseline/control reuse. |
| T833–T836 | Actual host, trusted consumer, failed rollout and preservation | Scoped host acceptance, failed-variant propagation stop, compatible recovery and retained resources. |

**O81 — UO source and real combined integration.** Use the accepted implementations and actual combined object; inspect full and semantic evidence and an independently expected violation. Missing implementation keeps the integration part pending. Do not replay old work merely to manufacture a pilot.

**O82 — WebVOWL native reader job.** Use the pinned source and actual built candidate in its authorised real host; inspect and deliver the actual SVG or accurately state the delivery boundary. The independent semantic oracle is not derived from the view.

**O83 — ONI installed real-description job.** Use the task's real description and delivered archive, with actual API/CLI/type consumers, current dependency evidence and authorised rendering where required. Missing real input is not substituted silently.

**O84 — Selective adopter handoff.** For each actually selected recipient, another authorised maintainer identifies the source fix, overlays, effective host, evidence, limitations and remaining resource owner from the existing record. Independent authority is not inferred from two agent names.

These exercises can share useful work and evidence when their inputs and claims genuinely coincide. The plan does not require four paid scan campaigns, repetition of unchanged mutation runs, twenty browser jobs after every edit or all possible operating systems. Required supported surfaces and accepted assurance remain binding; unqualified surfaces stay named.

## 15. Acceptance criteria

| ID | Requirement | Decisive evidence |
|---|---|---|
| **AC8-01** | Preserve parent scope, authority and original counterevidence. | A06/A14 mapped; each product/adoption decision attributable; no unowned worktree changed. |
| **AC8-02** | Reconcile current facts before acting on historical defects. | Current pins, original/fixed finding dispositions, exact ONI product and linkage results distinguished. |
| **AC8-03** | Qualify selected shared source corrections in UO first. | Actual source implementation and required native/full/independent evidence, not baseline-only or branch-only status. |
| **AC8-04** | Deliver a coherent, selective adopter delta. | Three-way file mapping, dependency closure, retained overlays/licences, no wholesale runtime/configuration copy. |
| **AC8-05** | Protect WebVOWL's valid unversioned and truthful failure behavior. | Independent optional-version/error tests; genuine cancellations/coded failures preserved; no imposed obsolete null rule. |
| **AC8-06** | Report the real WebVOWL artifact outcome on the qualified object. | Pinned input, native built-candidate load/framing, actual SVG readback/inspection, correct source facts and explicit delivery limit. |
| **AC8-07** | Disposition the actual ONI dependency requirement. | Relevant current native job and decision; no unnecessary old repair, threshold weakening or unrelated blocker closure. |
| **AC8-08** | Demonstrate the real ONI installed consumer and description behavior. | Exact archive and installed resolution, independent real-input expectations, API/CLI/applicable type results and actual rendering scope. |
| **AC8-09** | Qualify the real accepted combined MCP/SHACL object. | Exact accepted inputs/context, combined source, actual required full/semantic consumers and independent outcomes. Missing implementation means pending, not pass. |
| **AC8-10** | Reject incompatible previous evidence and qualify actual used hosts/trusted consumers. | Current writer/reader/schema, input identities, effective host coverage, real remote policy/attempt where in scope. |
| **AC8-11** | Stop failed propagation and retain recoverable evidence/resources. | Scoped hold or authorised compatible recovery; failed and old state preserved; consumers and next actor known. |
| **AC8-12** | Make final acceptance precise and retrievable. | Existing adoption/product records state exact fixes/hosts/outcomes, source provenance, readback and residual obligations; no “fixed everywhere” declaration. |

Acceptance requires the relevant positive product requirements, not merely an honest account of failure. The parent explicitly permits truthful failure reporting; it does not instruct the maintainer to accept a broken outcome.

### 15.1 Bounded completion states

**Source/product slices qualified; adoption pending:** named independent work passed, but no claim is made about a recipient not yet integrated or observed.

**Selective adoption qualified; combined or user-outcome obligation pending:** the adopted component is proven for its stated scope, while the actual missing integration/input/host is held with an owner and reassessment event. This is partial parent completion, not silent removal of AC8-06/08/09.

**WP8 accepted for the recorded environments:** selected source/adopter changes and the real combined/downstream outcomes are qualified under the actual scopes; unselected deployments and separately authorised release actions remain outside that claim.

**Incomplete/failed:** retain completed slices and exact failed or unavailable obligations. Never manufacture a green receipt, an owner acknowledgement, an artifact delivery, a cancelled scan or a resource disposition to choose a nicer state.

## 16. Evidence and checks supplied with this proposal

The research observation companion contains curated facts transcribed from the actual connector reads, with canonical source URLs and limits. It is not the original raw API envelope, a signed attestation, a replay or a retained private scan bundle. Existing API/CI outcomes are not tests executed by this research.

The deliverable-check script validates this package's file references, acceptance/test identifiers, explicit not-run catalogue states, research identities, unchanged supplied inputs, UTF-8/JSON readability and final archive payload integrity. It does not install dependencies or call GitHub. Its results establish only planning-file consistency.

No current native WebVOWL/AQFO session, converter archive test, MCP/SHACL execution, Windows guard/plugin invocation or new CI run was performed here. Implementation T801–T836 and O81–O84 all remain not-run. Do not use the planning-file checks to satisfy any product or host acceptance criterion.

## 17. Source register

### Supplied materials

**[P0]** `../implementation-plan.md` — Parent WP8 and acceptance matrix; controlling requested scope. SHA-256: `b560e4b15685c2af42f1cafd1a223ff718d968cc8a0648e9a33522fb07601c82`.

**[P1]** `sdlcworktreelifecyclehandoff20260910.md` — Historical observations/questions; not a current inventory or deletion authority. SHA-256: `a9cf76ae85ab314b15e80164150e0a69d8c18af836c32a83e8ca689e1a4d16d6`.

**[P2]** `../wp0-worktree-preservation/implementation-plan.md` — Preservation design; its existence is not executed preservation. SHA-256: `5c789f1250de378b46388c0d9806a7d4c0527cbaf425beaa976e8356e052eba7`.

**[P3]** `../wp1-verification-evidence/implementation-plan.md` — Writer/reader/text design; use actual accepted delivered implementation. SHA-256: `68594f4df7bb0144c633054ba1decba5a9540580aff8a1ba974af94de15409b1`.

**[P4]** `../wp3-resource-disposition/implementation-plan.md` — Resource-disposition proposal; check actual implementation/acceptance before adoption. SHA-256: `2a78c43583efa96b5082b95077f1b38629198dd84e79e395f1ced512c9dcf82f`.

**[P5]** `../wp4-command-dispatch/implementation-plan.md` — Actual protected-host qualification, not a source-only classifier pass. SHA-256: `862266cc6b2adf253dbf035f178f115cfe9659fdcffc7d5879ad753fa31f6223`.

**[P6]** `../wp5-security-inventory/implementation-plan.md` — Installed scope and separate artifact-workaround obligations. SHA-256: `acab2f5bfb97398d90973648a7647da199bfc53e4b13134f2a30b8134684def9`.

**[P7]** `../wp6-trusted-baselines/implementation-plan.md` — Trusted baseline and current remote-readback boundary. SHA-256: `21923f8abc7f1644e39ede0da8a40e05813f3dcabe851846a2b64c9db0ed4e5e`.

**[P8]** `../wp7-proportionate-execution/implementation-plan.md` — Execution cadence, output placement and shared A14 exercises. SHA-256: `222928fef535acae1557e2e2b9e6d55e4675038a10c88f6bac0c031d9162cad4`.

**[P9]** `../wp2-independent-execution/implementation-plan.md` — Independent worktree execution and shared A06 integration boundary. SHA-256: `36263bd280bf331e855a9487590d8615d474d68ee1f494a5e4d56e23a0f11adf`.

### Inspected repository material and external primary documentation

Repository links are pinned where applicable. Mutable API/Issue/PR references retain the research identity stated above; they must be read afresh before action. Existing execution reports are not tests run during this research.

**[S01]** [UO main ref read](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches/main). Mutable ref read; research pin a0374bad8203aa95f87a0e47a85013fd4b938c7e.

**[S02]** [UO branch inventory](https://api.github.com/repos/Hadden-Industries/universal-ontology/branches?per_page=100). Proposal/candidate refs, not acceptance of their implementations.

**[S03]** [UO adoption record](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/adoption.md). Existing source/host and WP1 claims; local bundles not independently reopened here.

**[S04]** [WebVOWL production-preview repair commit](https://github.com/Hadden-Industries/webvowl/commit/80b302214d24bce195986af89ef7a34d24274928). Commit and stated repair scope.

**[S05]** [ONI PR #4](https://github.com/MaksymShostak/oxygen-not-included/pull/4). Mutable metadata; base 975acf599d06ec3d274c55bac8d1731278ffa153 and head fe75c5d8e29f68e43812439fbc6ec73df2f43b05 at read.

**[S06]** [ONI exact BBCode workflow attempt jobs](https://api.github.com/repos/MaksymShostak/oxygen-not-included/actions/runs/34529893438/attempts/1/jobs?per_page=100). Ten jobs; each succeeded; actual dependency, converter and mutation steps ran. Metadata is not archive-content inspection.

**[S07]** [ONI trusted-linkage run for the same candidate](https://github.com/MaksymShostak/oxygen-not-included/actions/runs/34529892678). Attempt 1, pull_request_target, failed. Current diagnostic not retrieved in this research.

**[S08]** [WebVOWL VOWL inspection projector](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/src/app/js/controller/vowlModelInspectionProjector.js). String version including empty string is forwarded; other values become null.

**[S09]** [WebVOWL rendered-graph contracts](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/src/app/js/controller/renderedGraphRuntimeContracts.js). createOntologyHeaderRecord accepts string or null; no nonempty version constraint.

**[S10]** [WebVOWL controller](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/src/app/js/controller/webVowlController.js). Separate LOAD_FAILED / LOAD_ABORTED constructors and abort recognition inspected; complete runtime qualification not performed.

**[S11]** [WebVOWL original and later evaluation](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/docs/evaluations/webmcp-integration.md). Pinned AQFO source facts, historical failure and later outcome references.

**[S12]** [WebVOWL completion and later production correction](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/docs/evaluations/2026-09-10-webmcp-completion.md). Reported native user outcomes and scoped limits; private/local artifacts not retrieved.

**[S13]** [WebVOWL production module-link regression](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/src/productionBundle.integration.test.js). Actual test source read; not executed by this research.

**[S14]** [WebVOWL import provenance](https://github.com/Hadden-Industries/webvowl/blob/80b302214d24bce195986af89ef7a34d24274928/.sdlc/UPSTREAM.json). First portion read: ONI immediate source, UO target lineage and per-file adaptation.

**[S15]** [UO Issue #36: active scope/risk amendment](https://github.com/Hadden-Industries/universal-ontology/issues/36). Existing separately reported interface gap, not repaired by a cadence or adoption document.

**[S16]** [ONI affected-component runner](https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/scripts/runAffectedChecks.js). Actual base selection and maintained consumer command composition.

**[S17]** [ONI execution/retirement evidence](https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/docs/plans/2026-09-08-steam-community-bbcode-execution.md). Recorded decisions, local results and retained-history distinctions; supplemented by S06/S07.

**[S18]** [ONI converter package scripts](https://github.com/MaksymShostak/oxygen-not-included/blob/fe75c5d8e29f68e43812439fbc6ec73df2f43b05/tools/steam-community-bbcode/package.json). Existing check, pack and consumer interfaces; not installation or publication evidence.

**[S19]** [UO package scripts](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/package.json). Actual source-side interface list, including missing-only JSON-LD and mutating prebuild.

**[S20]** [UO verification profile](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/verification.json). Actual eleven-command full profile at the inspected pin.

**[S21]** [UO Issue #31: SHACL proposal](https://github.com/Hadden-Industries/universal-ontology/issues/31). Draft scope and proposed semantic contracts; not implemented or accepted by WP8.

**[S22]** [UO state and receipt consumer](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/scripts/_sdlc_state.py). Current v3 receipt validation and fingerprint behavior; not host execution.

**[S23]** [UO Issue #33: independent worktree execution](https://github.com/Hadden-Industries/universal-ontology/issues/33). Existing scope excludes a cross-repository distribution mechanism; true combined integration required.

**[S24]** [UO proportionate workflow](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/proportional-workflow.md). Existing route/assurance boundaries, not automatic scope approval.

**[S25]** [UO independent review playbook](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/docs/sdlc/subagent-playbook.md). Existing independence, coordination and preservation instructions.

**[S26]** [UO TDD evidence/handoff reference](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md). Existing execution/evidence ownership; native histories and accepted scope.

**[S27]** [UO package status](https://github.com/Hadden-Industries/universal-ontology/blob/a0374bad8203aa95f87a0e47a85013fd4b938c7e/.sdlc/PACKAGE_STATUS.json). Pre-release repository-local deployment metadata; not global current byte/host equivalence.

**[W01]** [Git native worktree semantics](https://git-scm.com/docs/git-worktree.html). Shared versus per-worktree refs/configuration; resolve through native Git.

**[W02]** [Vite local static-build preview](https://vite.dev/guide/static-deploy.html). Preview is local built-application testing, not a production server.

**[W03]** [npm install package and tarball semantics](https://docs.npmjs.com/cli/install/). Native tarball install differs from a development directory/link. Read matching installed-version help for execution.

**[W04]** [OpenAI plugin capability/permission guidance](https://help.openai.com/en/articles/20001256-plugins-in-codex). Installation, account/workspace/surface availability and app permissions are separate.

**[W05]** [GitHub rerun identity](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs). Reruns retain original event SHA/ref; not implicit trusted-policy refresh.

**[W06]** [GitHub workflow event semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows). Distinguish pull_request and pull_request_target; preserve trusted execution boundary.

