# Software-selection research and adoption gate

Version 1.0.0 · Pre-release. Governing rules: REU-01, VER-01, LIC-01.

## Trigger and outcome

Every proposed new capability must complete deep reuse research before committing
to a design or implementation. This includes adding functionality to the SDLC
itself, even when a custom script seems easy. Classify the actual semantic change,
not its file count: a new parser is a capability; correcting its misspelled local
variable is not. Reimplementing an existing capability also triggers comparison.
A repair that reuses the existing supported mechanism can reference a refreshed
prior assessment instead of researching the whole ecosystem again.

The output is an evidence-backed selection, an explicit residual custom gap, or a
blocked decision. It is not a preference for one author's tools, an obligation to
install something, or permission to outsource sensitive requirements to public search.

## Procedure

### 1. Define the capability without assuming its implementation

Read the accepted task, domain vocabulary, outcome, required interfaces, quality
scenarios and constraints. Identify the consuming component and its actual input
contract. State required behaviour and prohibited effects. Distinguish genuinely
required constraints from preferences inherited from the existing implementation.

### 2. Investigate existing supply deeply

Inspect repository and organisational functionality first. Search the standard
library, current dependencies, supported platform/vendor features, canonical package
registries and credible external implementations. Trace advertised capabilities to
maintainer documentation, APIs, schemas, examples, source/tests and relevant issues.
Use the existing repository explorer and researcher roles; external access must be
approved and queries must not disclose private source, secrets or confidential intent.

Compare the strongest plausible alternatives and an existing/native solution when
available. Follow leads beyond the first result. Do not impose an arbitrary minimum
candidate count, install tools merely to claim reuse, or conclude 'none exist' from
one unsuccessful query. Keep a useful search record: questions/queries, sources,
versions, checked-at dates, material exclusions and remaining uncertainty.

Depth means resolving the material fit questions, not a large word count. A small
standard-library capability may need only a concise assessment of its contract and
limitations; a new security service may need source review, a prototype and owner
input. The research itself is mandatory; extra documents and subagents are not.

### 3. Select the current stable channel before solving integration

Query the official registry/release service and support policy. Select latest
stable, or the newest supported applicable LTS line and its latest patch. Exclude
nightlies, release candidates, withdrawn/yanked releases and an unlabelled branch
head unless explicitly approved. Do not confuse a latest GitHub commit, package
release, model alias or marketplace channel with each other.

Record the intended current version first. Discover upgrade/runner/platform/API
work and test against that target. An older local interpreter or an unresolved
integration error is not a reason to lower the selected target. When a concrete
constraint forbids the target, present another current candidate or an explicit
owner exception with reason, evidence and reassessment trigger. Do not silently
freeze on an old LTS or pin 'latest compatible with our existing code'.

After selection, resolve exact commits/digests and use the native package manager
to generate its lock. Never hand-author a transitive lock, execute a moving latest
during a frozen run, or claim that a pin is still latest without a new lookup.
A newly released version during an active test is a new decision, not grounds for
mutating that run's inputs. Refresh before incorporation or first deployment.

### 4. Establish rights and adoption restrictions

Inspect the exact version's licence files and all riders, selected dual-licensing
terms, bundled assets and material transitive obligations. Identify intended use:
internal tooling, distribution, source incorporation, hosted service, agent/model
access, commercial use and derivative work. Check the consuming product's licence
and actual organisational approvals. A badge, SPDX token, source availability or a
passing scanner is not a compatibility conclusion.

Record attribution/NOTICE and source-offer obligations, patent or use restrictions,
commercial fees, service terms, privacy/telemetry/data residency, network/offline
needs, supported platforms and relevant export/organisation rules. Use available
approved compliance tooling and an accountable reviewer for unresolved legal issues.
No actor can waive a third party's restriction merely by labelling it accepted risk.

Unknown or conflicting rights block adoption/execution of the affected component.
Technical selection may remain recorded as a candidate; it must not be called cleared.
Do not publish restricted code or confidential evidence. See the actual DCG licence
finding in `package-reuse-assessment.md` for a concrete gate, not a hypothetical one.

### 5. Compare reuse, configuration, composition and extension

Map each important requirement to supported behaviour and evidence. Evaluate the
consumer's native validation, error semantics, lifecycle/cleanup, observability,
security boundaries, operational burden, maintainer support and portability.
Prefer configuration or supported extension to a wrapper that recreates semantics.
A genuine stable adapter is distinct from an NSH-01 compatibility shim; classify
it honestly. A prototype may test a decisive fit question in a disposable workspace
once licence and execution authority permit it. Do not interpret a blocked prototype
as licence to build the product implementation speculatively.

### 6. Justify custom code only for the residual gap

A build decision must name the unmet requirement and the exact reason credible
reuse/extension candidates fail it. 'Faster to write', 'we know this language',
'latest integration is work', 'no additional dependencies' or sunk custom-code cost
is insufficient alone. A tiny specialised business rule may legitimately be the gap;
a general parser, task runner or command classifier needs especially strong evidence.
Custom orchestration may connect supported native tools, but must not reimplement
their contract, resolver, schema dialect or safety engine.

### 7. Record, review and proceed

Use the existing Issue/plan/PR; make a separate file only when its consumers justify
one. Separate these statuses: research complete/incomplete, technically selected,
rights cleared/blocked/unknown, integration verified/unverified, and owner decision.
Reference immutable content or a specific accepted revision for consequential work.
A record locator passed to the helper is not proof of any of these statuses.

If no approved retrieval is available, record the exact gap and block that affected
new capability. Continue independently safe existing work without fabricating searches.
If prior deep research is reused, verify its requirements, release/channel, terms
and material alternatives remain applicable; name the record and refresh performed.

## Compact record contract

```markdown
### Software selection: <task/capability>
- Requirement/outcome and scope:
- Researcher, checked-at date and source/revision:
- Search questions, scope and material exclusions:
- Current candidates and latest stable/LTS authority:

| Candidate/version | Requirement fit and supported API | Licence/terms and intended use | Constraints/integration work | Decision and source |
|---|---|---|---|---|

- Configuration/composition/extension options assessed:
- Selected component/version/commit/digest:
- Required notices, restrictions and actual approval reference:
- Integration and verification still required:
- Residual custom gap and candidate-specific rejection reasons:
- Status: research / technical selection / rights / integration / owner decision:
- Refresh trigger and remaining uncertainty:
```

A source link plus 'MIT' does not establish rights compatibility. An empty shortlist
with no search trail does not establish absence of reusable software. Do not copy
this whole table into an R0 typo change merely because a template exists.

## Exact delegation pattern

Use the host's supported subagent interface, not a invented shell command:

```text
Research reuse for <accepted capability>, before any implementation.

repo_explorer: inspect in-repository/approved organisational capabilities,
existing dependencies, the consuming contract and native validators. Read-only.
Return evidence and gaps; do not propose a parallel implementation.

researcher: independently investigate credible native/platform and external
software candidates. Verify latest stable or latest applicable LTS releases.
Inspect exact licence text/riders, terms, supported API, restrictions and
requirement fit. Separate selection, rights clearance and runtime evidence.
No repository edits, installation, credentials or recursive agent spawning.

WAIT for both. Reconcile candidates, reuse/extension options and residual gaps
against the accepted higher-level outcome. Record sources and uncertainty.
Do not implement new custom functionality before the research and rights gates.
```

One researcher is enough when the questions do not benefit from parallelism. The
coordinator owns the decision record and scope; workers do not accept requirements.

## Using the local helper and PR gate

```text
npm run sdlc -- begin new-status-filter --risk R1 --intent-reference <accepted-task> --purpose "Expose only authorised status" --new-functionality --software-selection-reference <completed-assessment>
npm run sdlc -- begin correct-help-text --risk R0 --intent-reference <accepted-task> --purpose "Describe the current command accurately" --no-new-functionality
```

The PR declares `New functionality: yes|no` and `Software selection: <reference>|none`.
A new capability with a pending/absent reference is rejected. The checker only
checks the declaration and reference: independent review must inspect the record,
actual changes, selected release and rights. It cannot infer all new capabilities
or authenticate legal approval, and it does not execute code from linked records.

## Sources informing the procedure (not validation of this exact policy)

- GitHub Dependabot configuration: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- GitHub secure Actions use and immutable action pins: https://docs.github.com/en/actions/reference/security/secure-use
- SPDX canonical licence identifiers, not a compatibility decision: https://spdx.org/licenses/
- OpenChain licence-compliance programme/specification: https://openchainproject.org/license-compliance
- Python lifecycle: https://www.python.org/downloads/
- Official Node release channels: https://nodejs.org/en/about/previous-releases
