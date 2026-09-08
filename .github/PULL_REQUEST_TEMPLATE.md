<!-- These seven fields are the metadata-check contract. R0/R1 may use 'none'. -->
Change issue: none
Accepted baseline: none
Risk class: select R0/R1/R2/R3
Acceptance IDs implemented: none
Baseline-only: no
New functionality: select yes/no
Software selection: pending

## Purpose, accepted scope and outcome

State the accepted task/decision reference, intended outcome/invariant and guardrails.
For R0/R1, a concise accepted brief here is sufficient; do not invent an Issue or
extra plan merely to populate the template. R2/R3 use the prior accepted baseline.

## Evidence and principles review

Summarise in a few sentences for a small change; expand only where material:
- NAM-01: added/changed code and filesystem names reviewed, including retained
  names whose functionality changed; corrections and affected consumers.
- NSH-01: no new/extended shim, or specific prior approved exception reference.
- REU-01: completed deep reuse research reference; source-backed alternatives,
  supported configuration/composition/extension, exact residual custom gap.
- VER-01: current authoritative stable/LTS source, selected version, checked-at date,
  immutable resolved identity and integration work; no convenience downgrade.
- LIC-01/VAL-01: exact licence/riders/terms and applicable clearance/restrictions;
  supported consumer validation and separate business/security checks.
- OUT-01: why this still advances the higher outcome without shifting hidden cost.
- Actual focused/affected/full evidence selected by the route; source identity and gaps.
- CLEAN-01: removed/promoted/retained material with concrete consumer and expiry trigger.

## Independent review and security (when required)

Ordinary reviewer, exact frozen object, principle findings and dispositions.
Codex Security trigger or not-required rationale; native scan/bundle and matching
revisions/version; coverage/proof gaps; separate fix/verify-fix references where used.
Use restricted references for undisclosed vulnerabilities, not raw public exploit data.

## Release / follow-up (only where applicable)

Compatibility, migration, observability, rollback/restore/forward-fix, outcome
measurement and cleanup owners. Implementation success is not outcome validation.

## Acceptance checks

- [ ] Names of added/changed code and filesystem objects are semantically correct and precise; behaviour changes triggered name reassessment.
- [ ] No unresolved NAM-01 nonconformity or unauthorised compatibility shim remains.
- [ ] Evidence describes the actual current change and required gaps are explicit.
- [ ] The route is proportionate and still serves the accepted higher outcome.
- [ ] Required independent human/code-owner approvals and applicable security decisions are recorded.

<!-- Checkboxes are declarations, not approval or proof. Do not auto-close a dossier on merge. -->

## Command safety (when guard/execution policy changes)

- DCG release/source/config and affected command surfaces:
- Native protocol evidence versus real-host interception evidence:
- Residual gaps and independently enforced restrictions:
- Initial host acceptance or scoped-exception decision reference:

After an actual host acceptance, ordinary changes may reference that record.
This package itself has not been deployed. Do not create a new guard acceptance record for each edit.
