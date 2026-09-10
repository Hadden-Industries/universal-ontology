# Subagents and independent review

Use native Codex delegation rather than a home-made process fan-out. The current
OpenAI docs support named `.codex/agents/*.toml` roles and `[agents]` defaults.
This package does not choose an unverified model ID; the actual host selects a
supported approved model. Configuration examples must be smoke-tested in that host.
The current configuration permits at most four concurrent subagent threads. That
is an initial coordination budget, not a throughput target. Security plugin scans
may need an explicitly reviewed different budget; never change it silently.

## Choose a route

R0: no default subagents. R1: ordinary review; delegate only a genuinely independent
question. R2/R3: independent verification/specialist evidence according to risk.
Read-heavy research/review can run in parallel once the object and scope are frozen.
Run the verifier after implementation; fixes invalidate affected verification/review.
Parallel writers require separate worktrees, contracts and integration ownership.

A role file gives instructions and requested permissions, not organisational
independence or a complete security boundary. Verify effective sandbox, tool access,
network and credentials. A verifier may need disposable write space to run builds;
read-only reviewers must not change source or silently elevate permissions.

## Research prompt (interactive Codex)

```text
For <accepted task>, investigate these independent questions; do not implement.
Spawn repo_explorer for <precise repository question>, using <frozen revision>.
Spawn researcher for <specific version-sensitive external question>, using approved
primary-source retrieval. Do not broaden network access or make up unavailable facts.
Give each worker the accepted purpose/constraints, one question and its evidence
contract. Do not pass one worker's conclusion to the other. Neither may delegate.
Wait for both, inspect their evidence and return facts, contradictions and open
owner decisions. If spawning is unavailable, report it and do not call sequential
reasoning independent research.
```

Repository research returns paths/symbols/revisions. External research returns
primary sources, versions/dates, applicability and uncertainty. A repository's
current implementation is not authoritative business intent. Do not create a
research dossier for a trivial discoverable local fact.

## Principles reviewer prompt

```text
Use principles_reviewer for <exact BASE..HEAD> against <accepted brief/baseline>.
Purpose anchor: <beneficiary, outcome/invariant, non-goals, system guardrails>.
Review NAM-01, NSH-01, REU-01, VAL-01 and OUT-01. Check retained names on objects whose
behaviour changed, not just newly typed identifiers. A naming semantic mismatch is
blocking even when runtime severity is low. Return coverage and evidence-backed
findings; do not fix, approve, scan, delegate or read other reviewers' conclusions.
```

This pass is optional as a separate worker; its checks are mandatory within normal
review. It implements the NOISE principle without inventing a new installed skill
or assuming a separately installed NOISE package.

## Verifier prompt

```text
Use verifier sequentially after the implementing writer stops. Accepted task:
<reference>; reviewed object: <full SHA and any retained dirty-tree identity>.
Run the required profile(s) from the accepted route and exercise changed/prohibited
behaviour and important neighbouring paths. Do not edit source, tests, baselines
or policy. Work in a suitable disposable verification workspace if execution needs
writes. Return actual commands, state, results, skipped checks and evidence locations.
Do not manufacture green, revise the oracle, delegate, approve or release.
```

## Frozen review and true fresh-context fallback

Ask Codex to use the named role; it uses its available agent-spawning tool internally.
There is no proposed `codex spawn` shell command or invented TOML fresh-context key.
Request a fresh independent context, but do not certify that request succeeded
without inspecting the actual run. Do not pass implementation reasoning/history.

For stronger isolation, start a **new** Codex chat/session against the same frozen
checkout. A shell entry point for read-only review is:

```text
codex --sandbox read-only
```

Then invoke `/review` and explicitly instruct it to read REVIEW.md, the accepted
brief/baseline and exact revisions. Do not resume the implementation session. Use
`/agent` where supported to inspect spawned threads; it is not a guarantee of fresh
context. The custom role schema documents names/descriptions/developer instructions
and supported configuration fields, not statistical independence.

For general review, use one `/review` pass, plus triggered operability/maintainability
or oracle work. The principles checks belong in the shared review contract. Keep
broad standalone review skills explicit-only so they do not take over the invocation.

## Security ownership

Run Codex Security as one top-level workflow from `codex-security.md`. Do not spawn
`review_security` to run another complete scan; that generic role is retired.
`security_requirements_reviewer` checks accepted requirements and coverage. It
receives the completed native bundle when needed, rather than being advertised as
an independent vulnerability-discovery pass that was given the scanner's answers.
The security plugin may orchestrate its own narrow workers; do not wrap each in
another security orchestration layer.

## Collect, adjudicate and release resources

Wait for all requested workers. A failed worker is missing evidence, not agreement.
Deduplicate causal findings, preserve genuine disagreements and use the accountable
owner for disputed meaning/risk. Reviewers do not accept their own fixes. After a
fix, freeze the new object, reverify and rerun affected review. Preserve required
raw scan/run evidence before releasing worktrees. No worker deletes another's
scratch; the coordinator confirms consumers have finished under CLEAN-01.

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

## Command-safety inheritance

The coordinator MUST verify that any adopted DCG hook, trust/config and command-path
coverage apply to the actual worker runtime; a role name or shared executable does
not prove inherited enforcement. Workers do not install guards, approve exceptions,
change allowlists or resume a blocked command through stdin/another tool. Research
and reviewers remain read-only within their task authority even when DCG permits a
command. Read-only roles need real permission boundaries. One native guard per
covered dispatch; no wrapper that recursively invokes itself. See [CMD-01 setup](command-safety.md).

## New-functionality reuse research

Before design/implementation, use the existing `researcher` and, when useful,
`repo_explorer` with the exact assignment in `software-selection.md`. Require primary
sources, latest stable/LTS identity, actual licence/riders/terms, capability fit,
native consumer validators and residual custom gap. Share accepted requirements,
not a predetermined custom design. Both are read-only and must not recursively
spawn agents. The coordinator waits, reconciles evidence and records actual decisions.
No new research platform or extra reviewer is mandatory solely to satisfy this rule.

## Questions and bounded follow-up

Before dispatch, identify the unresolved question, affected object, required evidence
and why existing accepted work does not answer it. A role's availability is not a
requirement or permission to spawn it. Use the ordinary combined review and the
specialists justified by actual risk; do not repeat a completed selection survey
or native security campaign at each checkpoint without a material trigger.

A follow-up reviewer receives the earlier reviewed target, accepted scope, actual
delta and remaining questions. Recheck affected conclusions and widen scope where
needed; do not imply an unreviewed final delta is covered by old approval. Required
independent verifier execution is not redundant simply because the writer ran the
same command. Freeze the input before verification, preserve failed workers and
counterevidence, and follow the existing evidence/consumer-release procedure.

Refer to the execution-cadence section of `proportional-workflow.md`. These rules
change neither the autonomy ceiling nor the authority to install tools, amend
requirements, change assurance, grant access, publish or dispose of resources.
