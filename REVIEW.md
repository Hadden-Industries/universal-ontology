# Repository review policy

Read `docs/sdlc/engineering-principles.md`. Review the actual frozen revision/diff
against accepted intent and the risk route. Do not rewrite the task or become its
implementer. An R0 self-check is not described as independent review.

## Common review, at every risk level

1. **NAM-01:** Inspect added/changed identifiers and paths, including unchanged
   names whose functionality/responsibility changed. State semantic mismatches;
   require accurate names or a coherent redesign. Check affected consumers.
2. **NSH-01:** Identify compatibility bridges/fallbacks. Require a specific prior
   owner override or a direct solution. Do not confuse genuine stable adapters
   with shims or accept a rename that disguises one.
3. **REU-01 / VAL-01:** Check existing/native capability use and the actual input
   contract owner. Identify unjustified shadow validators or duplicate policy.
4. **OUT-01:** Ask whether the implementation still advances the accepted higher
   objective, with cross-component, operational and future-task trade-offs.
5. **Correctness/evidence:** Required/prohibited behaviour, tests, error handling,
   meaningful fixtures, actual current results and limitations.
6. **CMD-01:** Native DCG is present on adopted command paths; changed guard
   configuration and exceptions have owner/evidence references. Do not accept a
   standalone classifier pass as host interception or an allow result as authority.
   Check native rights clearance and actual host acceptance; there is no legacy generic fallback.
7. **PRP-01 / CLEAN-01:** Appropriate process, no undeclared scratch dependency,
   required evidence preserved and temporary survivors justified.

A small change uses a brief combined pass, not separate reports or agents for every rule.
R1 uses the normal independent PR reviewer. R2/R3 add the accepted independent
verification and specialist coverage; no policy requires every specialist always.

## Security and specialist work

Use `docs/sdlc/codex-security.md` for native diff scan, findings, fix and verify-fix
routing. General correctness review remains separate. Add operability/migration,
Brooks maintainability, Logic Lens or test-oracle review only for concrete risks.
The native security workflow owns its internal workers; no generic scanner fan-out.
`security_requirements_reviewer` checks actual deployment assumptions, accepted
security requirements and scan gaps without reproducing the scanner's job.

## Review scope and evidence applicability

Apply `docs/sdlc/proportional-workflow.md#execution-cadence-and-evidence-placement`.
Inspect the actual meaning and consumer of prose changes: a Markdown permission,
fixture, executable example or public contract is not low-risk because of its file
extension. Conversely, do not impose unrelated release qualification on a genuinely
bounded prose correction. Require an accepted/governing source or an explicit owner
decision for a mandatory prerequisite; label additional recommendations as proposals.
Preserve all mandatory principle findings and independent assurance.

For a bounded follow-up, identify the prior reviewed object and the real subsequent
delta. State which conclusions remain applicable, which questions were rechecked
and what is unverified. A previous whole-diff review does not automatically cover
new code, packaging, environment or policy. Inspect the representative delivered
artifact and its actual execution boundary when that supports the claimed outcome;
internal test totals and development-only runs do not establish production behavior.

## Findings and blocking rules

For every finding provide exact anchor, changed object, governing rule or contract,
expected versus actual semantics/behaviour, evidence, certainty and resolved-when
condition. For behavioural defects include a concrete trigger and consequence.
For NAM-01 provide the meaning/name discrepancy; runtime harm need not already
exist. Distinguish a policy nonconformity from a speculative style preference.

**Any unresolved NAM-01 defect blocks acceptance regardless of runtime severity.**
A missing NSH-01 override also blocks. Missing required evidence is not 'no defects'.
Do not hide mandatory findings behind a comment-count cap. A reviewer may judge
alternative precise names acceptable; the policy does not prescribe personal taste.

Do not report formatting already enforced by CI, irrelevant rewrites, arbitrary
style preferences or duplicate manifestations as separate findings. Generated
identifiers are reviewed through their source-of-truth generator/schema when that
is owned by the change; generated origin does not excuse false names.

## Independence, target and handoff

Freeze exact base/head and any relevant uncommitted inputs. Preserve original
review results. Reviewers report and do not edit, approve their own work or inspect
others' conclusions before returning. Group by causal defect after all passes;
keep disagreement and ask an accountable decision-maker for disputed meaning/risk.
A semantic outcome concern triggers a scope/design decision, not unilateral scope
expansion. Triage feedback against the cited evidence and accepted contract;
do not require another skill installation for ordinary review.

When cross-worktree integration is material, state whether each cited result covers
an isolated branch/candidate or the actual combined target. Identify the integration
owner, relevant input revisions, semantic overlap decisions and outstanding combined
consumer checks. Check that source, baseline and control movement received fresh
applicable evidence and the required owner decisions. Do not accept a clean merge,
copied verification record or another branch's successful run as proof of combined
behavior. Keep this in the normal risk-proportionate review and existing handoff;
no separate reviewer or additional dossier is mandatory solely for this statement.

Report target, accepted brief/baseline, passes performed, commands actually run,
name/functionality pairs inspected (summarise groups where simple), findings,
security bundle reference where applicable, unresolved gaps and outcome alignment.
An `APPROVED` string from an agent is not the GitHub/human approval gate.


## Software selection review

Check the actual REU-01 research, not only its reference: credible reuse candidates,
primary sources, supported interfaces, residual custom gap, latest stable/LTS and
LIC-01 exact terms/clearance. A meaningful negative search needs recorded scope and
candidate-specific reasons. Do not accept untested integration as a reason to choose
an older version. Distinguish required evidence from agent assertions. Maintenance
without new functionality need not repeat an unrelated market survey.
