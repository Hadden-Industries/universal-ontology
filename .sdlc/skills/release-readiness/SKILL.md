---
name: release-readiness
description: Assess whether a frozen, verified change has sufficient compatibility, migration, telemetry, rollout, recovery, ownership, and cleanup evidence for release. Use explicitly after review; never merge or deploy.
---

# Release Readiness

## Purpose

Determine whether the exact reviewed change can be released within its accepted
risk route. Passing tests and code review are necessary but not sufficient.

For R0/R1, reuse the ordinary PR completion check unless release risk requires
this separate assessment. Apply `docs/sdlc/engineering-principles.md`.

## Inputs

- accepted baseline and risk class;
- frozen `BASE_SHA..HEAD_SHA`;
- route-selected deterministic verification and any required fresh-verifier report;
- review findings and dispositions;
- release, migration, telemetry, and recovery evidence;
- authorised owners and waivers.

## Checks

### Behaviour and compatibility

- accepted `AC-###` and relevant `QA-###` evidence is current;
- public/API/event/data compatibility is understood;
- old/new readers and writers can coexist for the rollout window where needed;
- dependencies and consumers are identified.

### Data and migration

- expand/contract or equivalent strategy is explicit;
- backfill/reconciliation is observable, idempotent, interruptible, and resumable;
- backup/restore, rollback, or forward-fix route is tested and truthful;
- retention, deletion, audit, and cleanup consequences are covered.

### Operability

- operator questions are answerable by bounded telemetry;
- success, hold, and abort thresholds are explicit;
- dashboards/queries and actionable alerts exist where justified;
- privacy, sampling, cardinality, cost, and retention are acceptable.

### Rollout and recovery

- cohort/canary stages match blast radius and detectability;
- accountable observer and decision authority are named;
- kill switch/flag exists only where its lifecycle cost is justified;
- rollback/restore/forward-fix is rehearsed to the level required by risk;
- emergency communication/escalation is clear.

### Completion lifecycle

- docs/runbooks/contracts are updated;
- `docs/sdlc/temporary-artefacts.md` is applied: eligible working material is removed,
  required evidence is retrievable, and temporary survivors have consumers/reasons,
  owners and reassessment triggers;
- cleanup has not removed supported migrations, recovery assets, security evidence,
  or live diagnostic capability; relevant post-cleanup verification is current;
- compatibility paths, feature flags, temporary telemetry, and migration code
  have owners and removal criteria/dates;
- production behaviour and intended outcome have post-release review dates.

### Cross-cutting principles and native security

- no unresolved NAM-01 naming defect or unauthorised NSH-01 shim;
- REU-01/VAL-01 native capability/input contract decisions remain valid;
- OUT-01 outcome/guardrails still justify release rather than merely local green;
- required Codex Security native bundle identifies the actual reviewed revision,
  coverage and proof gaps; remediation and independent fix verification are distinct;
- required but unavailable security evidence is NOT READY pending an accountable
  alternative; do not infer a waiver from a scan that returned zero findings.

## Decision

Return exactly one:

- `READY`
- `NOT READY`
- `READY WITH EXPLICIT WAIVER`

For every unmet item state evidence, consequence, owner, and resolved-when
condition. A waiver must identify the accountable human, scope, rationale,
expiry, compensating control, and residual risk. The agent may not invent or
approve a waiver.

## Stop conditions

Return `NOT READY` when the reviewed object changed, required evidence is stale,
an R2/R3 recovery or migration path is untested, an unresolved high-severity
finding exists, or decision authority is absent.

Do not merge, deploy, alter environments, or change Issue state.

## Command-safety control changes

When release changes command execution, guards or privileged automation, inspect
CMD-01 deployment acceptance: exact native DCG/config/Codex versions, interception
coverage, unresolved surfaces and separate authority. Never report ready solely
because DCG installed, schema-parsed or returned zero. Do not disable the SDLC Stop
hook or GitHub release controls during DCG integration.

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
