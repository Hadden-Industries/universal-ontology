---
name: thin-implementation-plan
description: Create a reviewable, falsifiable plan of vertical slices, seams, dependencies, proof, migration, observability, release, and replanning conditions from an accepted design. Use explicitly before implementation; do not write code or microscopic step scripts.
---

# Thin Implementation Plan

## Purpose

Create a durable handoff that records the implementation hypothesis and its
proof without pretending that every local coding decision is known in advance.

This skill is not mandatory for R0/R1 when the accepted brief already provides
adequate scope/evidence. Reference `docs/sdlc/engineering-principles.md`.

## Preconditions

- accepted/draft change dossier with stable `REQ-###` and `AC-###` IDs;
- risk route;
- domain invariants and relevant `QA-###` scenarios;
- selected design and consequential decisions;
- known repository architecture and verification commands.

If these are absent, report the missing prerequisite rather than filling it with
assumption.

## Required plan contents

1. Accepted baseline or draft revision being planned.
2. Scope and non-goals.
3. Vertical `SLICE-###` increments, each independently demonstrable and, where
   practical, releasable/reversible.
4. Linked requirements, acceptance criteria, quality scenarios, and decisions.
5. Architectural seams and likely files/modules, marked as predictions.
6. Dependencies, ordering, integration owner, and semantically independent work
   that may be parallelised.
7. Falsifiable proof for each slice: focused check, impacted regressions, and
   route-selected final verification profiles.
8. Test-oracle ownership and genuine external mocking boundaries.
9. Data/schema compatibility, backfill, reconciliation, interruption/resumption,
   and cleanup where applicable.
10. Security/privacy and trust-boundary work where applicable.
11. Observability questions/signals and production acceptance.
12. Rollout, abort, rollback/restore/forward-fix, and responsible observer.
13. Principal unknowns and cheapest discriminating experiments.
14. Conditions requiring re-planning or re-baselining.
15. Higher-outcome purpose anchor, cross-system trade-offs and reassessment triggers.
16. Material names/meaning changes; native reuse/consumer-validator choices.
17. Any specific prior no-shim override and native security assessment ownership.

Keep these compact and reuse existing facts. NAM-01 cannot be waived; do not plan
an alias/shim as a shortcut without the explicit NSH-01 decision.

## Vertical slicing rule

Prefer one complete observable path over horizontal layer batches. Do not plan:
“all database work, then all service work, then UI, then tests” when a thin path
can cross those layers and produce evidence sooner.

## Output

Return a plan suitable for the Issue's `Implementation plan` section or a linked
`plan.md`. Include a traceability table:

```text
SLICE-### → REQ/AC/QA/DEC IDs → proof → release/cleanup implication
```

## Prohibitions

Do not include:

- complete proposed code;
- predicted line numbers;
- an enormous sequence of two-minute red/green microtasks;
- implementation beyond the accepted scope;
- parallel write tasks with unresolved semantic coupling;
- an unsupported claim that rollback is possible.

## Stop conditions

Stop when a missing requirement, risk decision, oracle, migration strategy, or
recovery route could materially change the plan. Name the decision owner and the
minimum evidence needed to continue. Do not implement, approve, or baseline the
plan.

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
