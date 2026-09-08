# Engineering principles and decision rules

Version: 1.0.0 · Pre-release · Verified-source date: 2026-09-07.
Repository deployment status and accepted scope: [adoption record](adoption.md).

The package version MUST remain 1.0.0 until Max explicitly approves a version change.
Do not generate package change notes, upgrade paths, compatibility layers or
migration patches for earlier drafts. Maintain the current design and its evidence.
Schema versions and actual product/data migrations are separate concerns.

MUST, MUST NOT, SHOULD and MAY are normative only when capitalised (BCP 14).
These are the repository owner's requirements, not a claim of scientific validation
of this exact workflow. They apply to humans and agents. Tool permissions, accepted
security constraints and legal obligations remain in force.

## Authority, scope and proportionality

These principles constrain all changes, including small changes, tests, tools,
configuration, agent instructions and filesystem objects. The record can be as
small as a sentence in the existing task/PR; no per-identifier ledger is required.
An agent MUST NOT self-approve a prohibited exception. Approval must identify the
actual decision-maker and an inspectable decision; a string in generated metadata
is not approval. Relevant policy changes require their normal independent review.

Routine tasks MUST NOT expand into unrelated repository-wide renaming, refactoring,
research or replacement. A discovered issue outside scope is reported separately.
A material conflict inside scope blocks the affected work until resolved.

## NAM-01 — Semantic correctness and precision (NOISE)

**Names of every added or changed code object or filesystem object MUST be
semantically correct and semantically precise in the object's applicable context.**

This is a non-waivable acceptance condition for the proposed pipeline. Urgency,
small size, historical naming, passing tests, review-comment limits and style
preferences do not excuse a misleading name. When an object's functionality,
meaning, responsibility, effects, representation or scope changes, its name MUST
be reassessed even when the identifier itself was not edited. It MUST be renamed
or the implementation redesigned if the old name no longer accurately denotes it.

Code objects include variables, parameters, properties, functions, methods, types,
modules, packages, commands, configuration keys and declared resources. Filesystem
objects include files, directories and links created or modified by the change.
For a content edit, assess whether the enclosing file/directory name still denotes
its role; do not rename unaffected ancestors merely to produce activity.

Correctness means the name does not assert a false concept or behaviour. Precision
means it discriminates the intended concept from plausible alternatives at its use
site. Consider domain, actor, ownership, lifecycle state, units, cardinality, return
semantics, side effects and responsibility **where material**. Do not encode every
implementation detail or manufacture long names; established context may supply
qualifiers. Familiar abbreviations are acceptable only when unambiguous in context.

Use the accepted domain vocabulary, bounded-context meaning, interface contracts
and language/repository naming conventions. Do not silently conflate adjacent terms
or introduce synonyms for the same concept in the same context. Resolve contested
meaning with the domain owner. Names such as `data`, `manager`, `helper`, `new`,
`final` and `v2` are not automatically forbidden, but are inadequate when they hide
the object's specific meaning; numeric versions are appropriate for real versions.

Examples (illustrative, not a universal vocabulary):

| Mismatch | Required treatment |
|---|---|
| `customer_id` now identifies an account | Rename to the accepted account-identifier term and update consumers. |
| `validate_configuration` now persists a repair | Separate validation from repair/persistence, or give the operation an accurate name. |
| `timeout` is ambiguous between seconds and milliseconds | Qualify or use a type/context that makes the unit unambiguous. |
| `report.json` contains a schema, not a report | Use the repository's precise schema filename and update references. |
| `parse_invoice.py` now performs import and persistence | Reassess both entry point and file name; do not preserve false parsing-only semantics. |

### Externally fixed identifiers and compatibility

Conventional consumer-required names (`AGENTS.md`, `SKILL.md`, `SECURITY.md`,
`__init__.py`, prescribed wire keys) retain their specified role. This is context,
not a licence to misrepresent newly changed semantics. Do not rename required entry
points so that their consumer can no longer discover them. Keep mandated identifiers
at the actual boundary and give internal objects accurate domain names.

If a public name cannot change without breaking an accepted contract, do not either
silently break it or waive semantic correctness. Preserve its original behaviour,
introduce an accurately named operation, and obtain an explicit NSH-01 decision if
any compatibility bridge is needed. If no compliant design is available, block and
escalate. Documentation alone cannot repair a false internal name.

### Review requirement

Every relevant implementation/review pass MUST assess both new names and retained
names of behaviourally changed objects. Check call sites, tests, imports, manifests,
paths, schemas, generated source inputs and documentation affected by a rename.
Use language-aware rename tools when available, and test the resulting contracts.
A semantic naming defect is a policy/contract defect, not a style nit. Its precise
mismatch and expected correction must be reported even if runtime severity is low.
The reviewer need not claim hypothetical production harm to enforce this condition.
Static style/lint passes and an LLM verdict do not prove semantic precision.

## NSH-01 — No shims without an explicit override

Agents MUST NOT introduce or extend compatibility shims, legacy aliases, polyfills,
monkey patches, duplicate old/new entry points, version-detection fallbacks or
silent compatibility coercions without a prior, scoped, explicit owner decision.
Repair the owning implementation and its in-scope consumers coherently by default.
Do not assume a compatibility obligation solely because old code exists.

A shim is a bridge added to hide or preserve an obsolete/incompatible contract or
work around an integration mismatch. A deliberate adapter between legitimate,
ongoing boundaries is not automatically a shim; state its stable responsibility,
consumer and authoritative contract. Renaming a shim `adapter`, `helper` or
`normalizer` does not exempt it. Normal error handling and validated resilience
behaviour are not shims merely because they contain a branch.

The exception record belongs in the existing decision/Issue/PR and MUST contain:
- exact scope and affected consumers/contracts;
- why a coordinated direct change or native capability is insufficient;
- accountable approver and actual approval reference;
- risk, tests, observability and containment;
- owner, removal condition and reassessment date/checkpoint.

A reusable organisational exception may satisfy this only if it explicitly covers
the case and is still valid. Blanket approval of the PR or 'maintain compatibility'
without acknowledging the bridge is not a specific exception. Expiry blocks new
reliance and triggers review, not unsafe automatic deletion. Existing in-use shims
outside scope must not be removed unilaterally.

## PRP-01 — Proportionate process, invariant correctness

Choose the least process that establishes the required confidence given impact,
uncertainty, reversibility, consumers and obligations. Small diff is not synonymous
with low risk. Semantic correctness, preservation of user work, honest evidence,
no unauthorised shims and accepted security boundaries apply at every risk level.

| Route | Minimum task artefacts and evidence |
|---|---|
| R0 | Existing task/PR intent and criterion, naming/reuse/outcome check, focused evidence, diff and cleanup inspection. No mandatory Issue, new plan document, research subagent or scan. |
| R1 | Compact accepted task or Issue brief, ordinary PR and affected checks. A frozen brief may be included in the same PR. One ordinary review covers principles; no automatic specialist fan-out. |
| R2 | Previously accepted protected baseline, plan only for unresolved material design/coordination, full relevant verification, independent verifier and triggered specialists. |
| R3 | R2 plus accountable assurance design, controlled evidence/retention and organisational independence as required. |

R1 implementation starts from accepted intent (for example the user's instruction
or an accepted Issue revision), not from an invented requirement. Review of the
combined PR later binds the exact requirement representation and implementation.
R2/R3 retain the prior-baseline gate. Large or uncertain R1 work may justifiably use
R2-like artefacts without relabelling every small change as elevated risk.

Reuse existing accepted decisions, evidence and documentation. Create another
artefact or agent task only if it has an identifiable consumer or decision benefit.
Do not remove assurance because a check is inconvenient. An R0/R1 outcome check can
be a concise before/after statement; it does not require a dashboard or KPI study.
Selected verification profiles are mandatory; 'full' means all relevant obligations,
not indiscriminately every test in an enterprise. Global CI floors still apply.

For bounded work, load only the instructions and source needed for the current
decision. Reuse material already read; refresh it when the target, contract or
evidence changes. Batch independent reads with bounded output, retrieve only
missing portions, and stop searching when the decision has sufficient evidence.
Keep the existing task/PR record; additional investigation or artifacts must serve
a named unresolved requirement. Report unrelated discoveries as follow-up work.

For live security reviews, apply the
[bounded assessment rules](codex-security.md#bounded-security-assessment).
A process limit never waives required evidence or converts incomplete work to a pass.

## REU-01 — Mandatory deep research before building new functionality

**Before designing or implementing new functionality, the SDLC MUST perform deep,
source-backed research into existing software that could satisfy the requirements.
Reuse of suitable existing software is the default; custom implementation is the
residual option, not the starting assumption.** This applies equally to product
code, automation, validators, agents, skills and the SDLC's own controls.

Translate the accepted need into capability requirements before committing to a
solution. Inspect existing repository/organisation capabilities, the standard
library, current dependencies, platform/vendor services, and credible maintained
external packages/modules. Search beyond the first familiar candidate. Follow
primary documentation, release information, supported APIs, licence/terms and
relevant source/tests far enough to establish actual fit and material limitations.
Do not substitute stars, marketing, a search snippet, memory or an AI verdict for
that investigation. Do not transmit private code or requirements to public search.

Record the research question, sources and dates, current candidate versions,
requirement-by-requirement fit, use of supported consumer validators, restrictions,
integration work and rejected alternatives in the existing task/Issue/plan. Evaluate
configuration, composition and supported extension before a parallel implementation.
Custom code MUST identify the precise unmet requirement and why credible reuse or
extension does not satisfy it; implement only that residual gap.

Research is mandatory for a new capability at every risk level. Proportionality
controls breadth, record length and number of agents, not whether research occurs.
An obvious standard-library solution can have a compact but substantive assessment.
A typo, pure rename or repair that adds no capability does not require a fresh market
survey. Reuse a prior thorough assessment only after checking that requirements,
selected release, licensing/terms and material alternatives remain current; cite it
and record the refresh. Do not invent a candidate-count quota or survey indefinitely.

Apply VER-01 and LIC-01 to each material adoption. Existing integration friction,
prior familiarity or 'we already wrote it' is not sufficient to reject a suitable
current component. Architecture coupling, licence restrictions, unsafe effects,
required offline operation, deployment constraints and genuine lifecycle cost are
legitimate evidence-based concerns, not labels for avoiding research.

When retrieval or essential evidence is unavailable, report the research gap and
block custom implementation of that affected new capability. Continue independent
already-authorised work only; do not declare that no reusable solution exists.
Use [software selection](software-selection.md), the existing researcher/explorer
roles and native package/vendor tools. Do not build a second search service,
dependency resolver, licence classifier or freshness crawler.

## VER-01 — Latest stable / latest applicable LTS is the default

**New or newly incorporated functionality MUST endeavour to use the latest stable
release of every selected package, module, runtime, tool or integration. Where an
applicable official LTS channel exists, select the latest patch of the newest
applicable supported LTS line. Otherwise select latest stable.** An older LTS is
not the default merely because it still receives support. No invented LTS status.

Verify the release/channel with the authoritative registry, maintainer release
service and support policy at selection time; record version, source and checked-at
date. Exclude prereleases, nightlies, withdrawn/yanked releases and moving source
branches unless the owner explicitly authorises a different channel. For source-only
skills without releases, state that limitation and select a reviewed current source
commit; do not call it a verified stable package release.

Select latest first, then solve and test integration. Missing binaries on the agent
host, a stale example, untested compatibility, a new major version or implementation
convenience MUST NOT silently move the target backwards. Record required integration
work and its unverified status. A concrete legal/security/platform prohibition needs
an accountable decision: choose another suitable current component or explicitly
approve a narrowly scoped exception with evidence, owner and reassessment trigger.
'Older feels safer' and 'latest is more work' are not sufficient exceptions.

Latest selection and reproducibility are complementary. Resolve the selected release
to exact versions/commits/digests using native tools and lock the resulting dependency
graph. Do not execute unreviewed floating `latest` during tests or builds. A pin is an
identity for one assessed selection, not permission to remain stale. Recheck before
new adoption, material extension, dependency refresh and actual first deployment.
Do not silently mutate the dependencies of a running verification or scan.

Use existing native update services and package managers; no local generic resolver
or version-comparison grammar. An update bot proposes changes, not license acceptance,
security approval or automatic merge. Track unsupported update surfaces explicitly.
The package's fixed pre-release 1.0.0 label does not freeze third-party dependencies.
See [toolchain selection](toolchain-selection.md).

## LIC-01 — Licence, terms and other adoption restrictions

Before introduction or execution, inspect the exact selected component's licence
text and applicable terms, including additional riders, dual-licence choices,
transitive/runtime assets, notices, source-offer/copyleft obligations, patents and
permitted use/distribution. Establish the consuming product's licence, deployment
and distribution model; do not infer compatibility from a repository badge or an
SPDX identifier alone. Publicly readable is not equivalent to unrestricted use.

Consider commercial/service terms, cost, data residency, telemetry/privacy, network
requirements, export/organisation restrictions and platform constraints where they
apply. Use existing organisation approvals and native compliance tools when available.
Do not invent legal clearance. A material unknown, conflict or non-standard rider
blocks the affected adoption pending the accountable licence/security/owner decision
or required written permission. An agent cannot waive a third party's restrictions.

Keep technical selection, licence clearance and integration validation as separate
statuses. Retain required notices and exact provenance. Do not copy restricted
software into this package as a shortcut; resolving an adoption block is not a reason
to reimplement the same capability without renewed REU-01 research.

## VAL-01 — The consumer owns its input contract

Use the actual consuming component's supported parser, validator, schema, typed
constructor, configuration checker or dry-run API for its input rules where one
exists and can be used safely. Do not hand-roll a shadow grammar/validator or
reproduce vendor enums/acceptance rules that will drift. Use the supported version's
contract, not assumptions about `main`. Reuse the parsed/validated value rather
than introducing different parse paths when feasible.

The contract may be supplied by the consumer as a schema: validate that schema with
a maintained implementation, rather than implement the schema language yourself.
Schema validation alone does not execute semantics or establish business correctness.
When no safe supported validator exists, record that limitation and the specific
local checks required; do not invoke a destructive consumer as a pretend validator
or make a compatibility shim without NSH-01 approval.

This does not eliminate boundary validation, authorisation, tenant checks, resource
limits, business rules or safe output encoding. Those are separate obligations.
Apply necessary safe limits before an expensive parser; constrain remote schema
resolution and parser capabilities. Catch the consumer's documented errors and
preserve useful diagnostics without leaking secrets. Production reuse does not
permit test expected values to be computed by the same implementation under test.

## OUT-01 — Recheck the higher-level outcome

Every material change/slice MUST identify the accepted outcome or invariant it
serves. Preserve a short 'purpose anchor': beneficiary, desired result, non-goals,
system constraints and guardrails. Explicitly assess negative effects on other
components, stakeholders, operations, later tasks and lifecycle cost.

Check alignment at task routing, option/plan acceptance, material discoveries or
scope changes, pre-review handoff and release/outcome review. Reference existing
records; do not generate a new outcome report for each edit. For each checkpoint
ask: does the proposed action still advance the accepted objective, or merely a
local proxy such as fewer changed lines, faster tests, more closed tickets or a
green scanner result? A traceability ID is not evidence of a beneficial outcome.

Compare credible materially different options when new evidence undermines the
current route, including simplification, native reuse, coordinated migration or
not implementing the change. Do not demand exhaustive global optimisation or
claim a mathematical global optimum. Show the system boundary, trade-offs and
uncertainty. If a locally correct implementation is globally counterproductive,
raise a decision and replan; do not unilaterally broaden scope or rewrite accepted
requirements. Policy constraints, including NAM-01, are not traded away in a score.

## SEC-01 — Native security workflow, repository-owned authority

Use Codex Security as the default agentic vulnerability workflow when security
assessment is required and the installed capability is available and approved.
Use the plugin as a whole, not extracted skills in the standalone skill installer.
Follow `docs/sdlc/codex-security.md`. A small non-security change need not start a
scan; relevant trust-boundary, authorisation, input/parsing, secret, filesystem,
network, dependency or privileged-workflow changes trigger the scoped assessment.
General review and deterministic security controls remain required as applicable.

Freeze the exact target; run one top-level security workflow and let it own its
bounded internal workers. Review coverage, proof gaps and the accepted threat and
deployment assumptions, not only finding count. Preserve original bundles in a
suitable restricted store, bind scan identity to revisions and plugin/model version,
and separate triage, remediation, fix verification and release authority. Required
but unavailable scanning is a gap requiring an accountable alternative, not a pass.

A scan cannot waive semantic naming, authorise a shim, broaden permissions, publish
findings or approve release. Codex Security `fix-finding` owns its remediation;
TDD supplies only the explicitly delegated implementation loop. Do not recursively
start scanners/reviewers or reinterpret source-supported evidence as runtime proof.

## CMD-01 — Native destructive-command protection

The approved Destructive Command Guard (DCG) executable MUST be the default
classifier for covered destructive-command risks on adopted shell execution paths.
Do not build or maintain a parallel general-purpose parser or pattern catalogue
for risks adequately handled by DCG. Use its supported configuration, packs,
protocol and diagnostics. A standalone skill is not an execution-time control.

A DCG allow result is neither task authorization nor proof that the action is safe.
Preserve Codex sandboxing, restricted credentials/network access, GitHub permissions,
project-specific lifecycle approval rules, evidence gates and CLEAN-01. A temporary
path, active rebase or passing classifier MUST NOT authorize discarding user work,
removing evidence, rewriting history, merging or deploying. Codex Security examines
application vulnerabilities; it does not replace this execution-time guard.

Agents MUST NOT disable, replace or weaken DCG; change trust, packs, config paths,
environment overrides or allowlists; self-grant an allow-once; or route an equivalent
blocked operation through an interpreter, stdin, file edit, SDK, MCP or remote tool
to evade the decision. A genuinely safer alternative must satisfy the underlying
policy. A required exception needs a prior, exact, independently authorized scope,
reason, actor, target, time/use limit, recovery/evidence plan and decision reference.
Use native scoped exception facilities when suitable; do not implement a bypass.
DCG's technical ability to grant an exception is not proof of human authorization.

Version-identify and review the executable, source/release, policy, enabled packs,
allowlists, hook definition, trust state and Codex/OS/tool-path versions. Protect
these from the implementing agent to the extent supported by host administration.
Select the latest stable release under VER-01, then freeze its assessed identity.
No floating execution, automatic policy relaxation or unreviewed self-healing.
Revalidate after material changes; protect release signatures and actual digest
records. Checksums alone do not authenticate a release or establish trust.

Adoption requires actual host interception, not just installation or a standalone
classifier pass. Record safe-control and blocked-action results in disposable
fixtures, including unchanged sentinels and attributable hook events. A missing,
untrusted, disabled, failed, timed-out or untested hook is not active protection.
A required check that is unavailable/skipped remains a gap. Restrict unsupported
surfaces with real capabilities/permissions or stop the affected operation; do not
claim that a matcher or a prompt closes an unhooked path.

Use the [adoption record](adoption.md#command-safety) for the selected DCG release,
owner decisions, tested host scope and remaining gaps. Preserve the exact licence
rider and [owner decision](package-reuse-assessment.md#dcg-owner-decision); do not
infer an upstream licence exception. Preserve actual sandbox/provider restrictions
and do not construct a substitute classifier.
Run exactly one approved native DCG hook per supported dispatch.
Read [DCG integration](command-safety.md) and [deployment acceptance](dcg-acceptance.md).

## CLEAN-01 — Remove spent working artefacts without losing evidence

Apply `temporary-artefacts.md`: remove eligible task-owned temporary working material
at its appropriate checkpoint, keep durable tests/knowledge/evidence, preserve
active consumers, and record surviving temporary items with owner/use/removal trigger.
Cleanup that changes tested inputs requires corresponding fresh verification.
Do not delete lifecycle control state, failed results or security counterevidence
to manufacture completion. No auto-deletion hook is introduced.

## Enforcement and exceptions

| Rule | Main assessment | Deterministic support | Waiver |
|---|---|---|---|
| NAM-01 | Meaning/behaviour/name review of the changed objects | Language-aware references, paths, lint and rename checks | None |
| NSH-01 | Bridge classification and approval | Exception-reference presence can be checked; not its truth | Specific prior owner override |
| PRP-01 | Risk/uncertainty and minimum route | Profile routing and baseline rules | Stronger controls may be explicitly selected |
| REU-01 | Deep reuse research and explicit residual-gap justification | Required research-reference presence, not research quality | No silent research omission for new functionality |
| VER-01 | Authoritative latest stable/LTS selection and current pins | Native registry/manager/update tooling | Explicit evidenced owner exception, not convenience |
| LIC-01 | Exact terms, intended use and actual clearance | Existing compliance tooling and retained notices | No agent waiver of third-party restrictions |
| VAL-01 | Actual consumer-contract evidence | Native parsers and schema validators | Justified missing/unsafe interface decision |
| OUT-01 | Purpose anchor, cross-system trade-offs and reassessment | Link presence only; not value or optimality | No silent outcome change |
| SEC-01 | Native scan evidence and accountable disposition | Native schemas, scanners, access/CI controls | Risk-owned alternative when required capability unavailable |
| CMD-01 | Native DCG decisions, actual host interception, and separate authority | Native packs/protocol, sandbox and provider permissions | Exact operator-owned exception; no self-bypass |
| CLEAN-01 | Ownership, remaining consumers and retention | Tool-specific scoped operations | Retain with explicit reason and trigger |

An agent declaration, checked box, schema pass or renamed file does not prove
adherence. CI enforces only what it actually measures; independent review supplies
judgement. New instructions and control changes need observed behavior before
promotion. The owner selected evaluation through useful real work; see
[the repository guide](howto.md#evaluation-through-useful-work). No synthetic
pilot or model-compliance claim is established by this bootstrap.
