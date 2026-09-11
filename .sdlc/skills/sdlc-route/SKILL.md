---
name: sdlc-route
description: Classify one proposed software change into R0-R3 and declare the minimum lifecycle artefacts, evidence, specialist lenses, approvals, and autonomy ceiling. Use explicitly before material work when risk has not been accepted. Do not use to design or implement the solution.
---

# SDLC Route

## Purpose

Route one change according to expected harm, detectability, reversibility, and
blast radius. The output is a control decision, not a solution design.

## Required inputs

- originating Issue or task;
- affected users, systems, data, contracts, and environments;
- known constraints and obligations;
- current evidence and unknowns;
- accountable decision owner where known.

Inspect repository evidence when needed. Do not infer business acceptance from
existing code.

## Risk classes

### R0 — trivial and highly reversible

All of the following normally hold: local scope; no persistent-data migration;
no public/external contract; no authentication, authorisation, privacy, secrets,
or material security effect; no material production-operability effect; easy and
rapid reversal; negligible expected harm.

### R1 — ordinary engineering change

Bounded impact, understood interfaces, normal test/review path, straightforward
rollback, and no R2/R3 trigger.

### R2 — elevated risk

Any material persistent-data change, migration/backfill, authentication or
authorisation, privacy/sensitive data, public contract, cross-system workflow,
concurrency/idempotency, financial effect, material availability/performance, or
difficult/slow reversal.

### R3 — high assurance

Safety-critical, high legal/regulatory/financial consequence, critical
infrastructure, or explicitly controlled assurance requiring separation of
duties, formal traceability, evidence retention, or specialist approval.

## Procedure

1. State the externally observable change and explicit non-goals.
2. Identify credible failure modes and affected stakeholders.
3. Estimate consequence, likelihood, detectability, reversibility, and blast
   radius. Use ranges and uncertainty rather than invented precision.
4. Apply every explicit R2/R3 trigger.
5. Select the highest justified class. Never downgrade merely to reduce work.
6. Tailor required artefacts, evidence, specialist lenses, approvals, and
   maximum autonomy.
7. Name unresolved facts that could change the route and the cheapest evidence
   that would resolve them.

## Minimum controls

Use `docs/sdlc/engineering-principles.md` and `.sdlc/pipeline-policy.json`.
NAM-01 semantic correctness/precision is mandatory at every level; no waiver.
R0 uses accepted task/PR intent, focused evidence and combined diff/principles check;
no mandatory Issue or subagent. R1 uses a compact accepted brief, ordinary PR and
affected evidence; no separate baseline PR required. R2/R3 use a prior protected
baseline, selected full obligations and independently required assurance.

Select only artefacts and specialists that resolve material uncertainty or risk.
Identify relevant reuse/native input validation, no-shim constraints, the higher
outcome/guardrails, security-scan trigger and cleanup obligations. A small diff in
a security boundary may be R2. No extra process merely to fill a template.

Within Required verification and Next lifecycle step, distinguish the next useful
check from final assurance. Refer to
`docs/sdlc/proportional-workflow.md#execution-cadence-and-evidence-placement`.
A short execution statement can remain in the existing task; it is not another
mandatory artifact. Do not lower risk, reset accepted scope or invent a separate
release campaign to suit the chosen cadence. Route by the changed meaning and
consumer, not by a Markdown extension or a prose-only label. Cite the actual
accepted/governing basis for mandatory specialist work; an optional recommendation
does not become a pre-existing acceptance requirement.

## Output contract

Return exactly these headings:

```text
Risk class:
Decision owner:
Reasoning:
Potential blast radius:
Reversibility:
Principal unknowns:
Required artifacts:
Required specialist lenses:
Required verification:
Required human approvals:
Maximum sensible autonomy:
Next lifecycle step:
```

For each conclusion, cite the observation or explicitly mark it as an inference.

## Stop conditions

Stop and request accountable human judgement when:

- classification depends on unavailable business/legal/safety intent;
- obligations or affected data cannot be established;
- a credible R3 consequence exists;
- stakeholders dispute acceptable loss or recovery;
- the proposed work lacks a decision owner.

Do not brainstorm, write implementation steps, edit source, approve a waiver, or
change GitHub lifecycle state.

## Reuse, current versions and rights gate

Apply REU-01, VER-01 and LIC-01 from `docs/sdlc/engineering-principles.md`.
For new functionality, reference the completed deep software-selection research
before design or implementation. Establish native/reused capability, latest stable
or latest applicable LTS identity, supported consumer validation, actual licence/terms
clearance and the precise residual custom gap. Reuse approved still-current research
only after checking for material changes. Local tool absence is an integration gap,
not permission to select an older target. Do not fabricate research or clearance.
The router may identify this as the next prerequisite without implementing; release
assessment must inspect any remaining blocked adoption or integration evidence.
This is a gate in the existing workflow, not another mandatory agent fan-out.
