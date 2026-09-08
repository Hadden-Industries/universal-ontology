# Proportionate workflow and verification

Version 1.0.0 · Pre-release.

| Route | Documentation/approval | Required local profile | Research obligation |
|---|---|---|---|
| R0 | Existing accepted task, concise criterion and review | focused | Mandatory deep assessment if adding capability; compact native reuse can be sufficient. No unrelated survey for a typo. |
| R1 | Accepted brief and normal PR; snapshot may accompany code | affected | Completed/current assessment before a new capability's design or implementation. |
| R2 | Prior protected accepted baseline, independent assurance | full relevant | Source-backed selection, actual rights, current versions and material integration/recovery work. |
| R3 | R2 plus controlled assurance and required separation | full + accepted assurance | Same research duty, with the required independent/legal/security decisions. |

No route permits false naming, fabricated searches, unauthorised shims, inaccurate
licence clearance or convenience downgrades. Small scope reduces record length and
agent fan-out, not the correctness and reuse obligations. Preserve an existing
thorough research record after substantively refreshing its applicability.

## R0 maintenance example

```text
npm run sdlc -- begin correct-help --risk R0 --intent-reference <actual-task> --purpose "Make CLI help describe existing behaviour" --no-new-functionality
npm run sdlc -- verify
```

Use a relevant help/CLI check; don't claim full product security. Review semantic
accuracy of the text and named operation. No new requirements document, separate
research agent or feature scan is required.

## R1 new capability example

```text
npm run sdlc -- begin format-output --risk R1 --intent-reference <accepted-task> --purpose "Produce the consumer's required output format" --new-functionality --software-selection-reference <completed-format-library-assessment>
npm run sdlc -- verify --profile focused
npm run sdlc -- verify
```

Research the native serializer or consumer-format library before hand-writing a
formatter. Select current stable/LTS, inspect terms, demonstrate exact format and
error handling. An affected run is required even if the focused check passed.

## R2 example

```text
npm run sdlc -- begin issue-123 --risk R2 --baseline docs/sdlc/baselines/issue-123/v1.json --intent-reference <actual-approval> --purpose "Enforce the accepted tenant disclosure rule" --new-functionality --software-selection-reference <accepted-research-record>
npm run sdlc -- verify
```

The baseline must actually exist unchanged in the selected Git state. Use actual
product commands; no CLI argument authenticates a supplied approval. Add only the
assurance needed for the risk: fixture validity, native policy validation, independent
verification, security assessment and deployment/recovery evidence.

## Missing tools and incomplete work

Keep the intended current runtime/component target and record the unavailable test.
Do not run older tooling then call it target validation. Use `pause` with an actual
blocker and evidence reference rather than deleting state. A blocked licence or
research requirement cannot be turned into a pass by changing the risk label.

The local helper stores all run attempts and checks input identity. It neither
parses your product semantics nor proves research depth, legal rights, approval or
system-level value. Use supported native validators plus independent review.
