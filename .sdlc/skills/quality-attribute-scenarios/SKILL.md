---
name: quality-attribute-scenarios
description: Convert material reliability, performance, security, privacy, usability, accessibility, interoperability, maintainability, recoverability, and operability claims into falsifiable QA-### scenarios. Use explicitly after acceptance/domain discovery and before consequential design.
---

# Quality Attribute Scenarios

## Purpose

Replace vague non-functional adjectives with observable scenarios that can guide
design, verification, production telemetry, and release decisions.

## Inputs

- accepted or draft requirements and domain invariants;
- risk route;
- affected architecture/data/operations;
- known workloads, threats, SLOs, obligations, and baselines;
- accountable owners.

## Scenario schema

For every material `QA-###`, record:

| Field | Required meaning |
|---|---|
| Source | Actor/system/condition producing the stimulus |
| Stimulus | Event, load, attack, fault, or change |
| Artifact | Affected system/component/data/interface |
| Environment | Normal, peak, degraded, attack, recovery, migration, etc. |
| Response | Required behaviour |
| Response measure | Falsifiable threshold or bounded outcome |
| Verification | Test, benchmark, analysis, exercise, or proof |
| Production signal | How the property is observed after release |
| Owner | Person accountable for accepting the threshold/result |
| Rationale/evidence | Source, baseline, obligation, and uncertainty |

Also state priority, hard constraint versus optimisation, and risk if unmet.

## Procedure

1. Select only qualities materially affected by the change.
2. Locate existing measured baselines/SLOs/obligations before inventing numbers.
3. Write concrete scenarios for normal and relevant adverse conditions.
4. Distinguish design targets from release gates and production objectives.
5. Define verification and production evidence before selecting an architecture.
6. Identify conflicting scenarios and the accountable trade-off decision.
7. Link each scenario to `REQ-###`, `AC-###`, `DEC-###`, and evidence where
   applicable.

Reject words such as *fast*, *secure*, *scalable*, *robust*, *resilient*,
*maintainable*, and *user-friendly* unless operationalised.

## Output

- scenario table with stable IDs;
- missing baselines/owners/threshold decisions;
- scenario conflicts and trade-offs;
- proposed verification and telemetry;
- design implications clearly labelled as implications, not requirements.

## Stop conditions

Stop for human or specialist decision when:

- a threshold expresses appetite for loss, safety, legal compliance, or cost;
- no representative workload/threat/environment can be established;
- measurement would create unacceptable privacy, cardinality, or cost risk;
- scenarios conflict and no owner can accept the trade-off.

Do not design the complete solution, fabricate a benchmark, or mark a vague claim
satisfied.
