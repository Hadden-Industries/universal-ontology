# JSON Quality stable upgrade

Date: 12 November 2026.
Baseline: `fb58332a8e79665c960079087eae5ac0e225f833`, initially clean.
The owner requested planning and implementation through HISEW, adopting JSON Quality 1.0.0 with minimal integration.
The owner approved the exact additional configuration changes below on 12 November 2026.

The first affected run passed 1,811 tests, skipped one and failed the unchanged filesystem-query fixture at Windows file-symlink creation (`EPERM`), before exercising the repository adapter. An isolated rerun reproduced that fixture failure. The owner then approved replacing it with a directory junction to the external fixture directory and checking `linked/outside.json`, preserving the other path assertions and the same per-component symlink guard. This bounded test repair changes no Windows configuration and skips no test.

## Risk and scope

Risk class: R1.
Decision owner: repository owner, through this task.
Reasoning: bounded development-tool upgrade with understood public interfaces and existing consumer checks. No shipped runtime, persistent-data migration, authentication, privacy, concurrency, financial or production-availability behavior changes. The repository's generated-output and packed-metadata obligations remain intact.
Potential blast radius: JSON authoring commands, CI JSON checks and development tests of packed metadata.
Reversibility: a targeted follow-up edit can select the previous manifest, lock and integration together; preserve unrelated work.
Principal unknowns: compatibility of the released APIs with the real repository and rebuilt package.
Required artifacts: this compact plan, native execution records, affected verification and ordinary diff review.
Required specialist lenses: ordinary consumer/API and ownership review; no separate security scan or delegation is justified by this bounded change.
Required verification: existing JSON consumer and packed-metadata checks, repository JSON checking, affected HISEW profile and focused formatting/lint checks.
Required human approvals: the exact additional configuration edits below are approved. Local commits are authorized by AGENTS.md; pushing and deployment are outside scope.
Maximum sensible autonomy: implement the approved slice, fix affected integration failures, verify and commit locally.
Next lifecycle step: implement SLICE-001 using alternative verification for dependency/configuration migration and preservation checks for the adapter.

## Accepted outcome and configuration changes

Use `@hadden-industries/json-quality: >=1.0.0` in root `package.json`, consistent with repository dependency policy, and let npm generate the exact 1.0.0 lock graph and enforce installation integrity. No second installation, package-byte verifier, compatibility reader or copied upstream conformance suite.

Approved exact configuration changes:

- `package.json`: add `--write` to `format:json` and `normalize:json`; replace `--json` with `--ndjson` in `inspect:json`; remove unused direct `@humanwhocodes/momoa` from `devDependencies`. Its only current references outside the lock are the declaration and stale development documentation. Regenerate `package-lock.json` with npm, retaining unrelated selections.
- `.json-quality.json`: omit the retired explicit schema marker and default presentation/NFC/rewrite declarations; remove the npm lockfile exception and npm lockfile membership in the protected family; remove built-in `.git/**` and `**/node_modules/**` boundaries. Rename `maxTotalBytes` to `maxTotalSourceBytes`, `exclude` to `excludeUntrackedSources`, and `allowFormatWrites` to `allowSourceRewrites`. Preserve the 512 MiB source, 300-second time and 4 GiB scratch overrides, remaining external boundaries, producer presentation and protected bytes. Omitted schema selects the installed package contract.
- `.prettierignore`: update only the explanatory comment from `allowFormatWrites` to `allowSourceRewrites`; no selection change.

The script changes preserve intended writes and machine output under the stable CLI. The sparse policy retains UO-specific ownership and measured resource needs while inheriting package defaults. No workflow, external HISEW profile, ESLint setting or unrelated dependency changes are proposed.

## SLICE-001: stable package through real consumers

REQ-1: npm installs the published stable core and matching optional platform package through the ordinary root lock.
REQ-2: read-only checks remain complete, explicit writes preserve authored values and producer bytes, and machine inspection uses current events.
REQ-3: generated JSON-LD and the query catalog remain additive required outputs; packed metadata still receives source-quality and domain checks.
REQ-4: keep only repository-owned decisions and meaningful consumer coverage locally.

Update the existing adapter only where the public session API requires it. Its retained responsibility is the repository root and required generated outputs; the package owns argument validation, discovery, policy resolution, checking and writing. Migrate direct test consumers to `resolveJsonQualityPolicy`, `resolveJsonSourceContract` and repository `check()`, retaining public source sessions for actual packed bytes. Remove obsolete contract-field reconstruction when the resolved public contract can be consumed directly. Update development documentation with current commands, defaults and ownership.

Likely edit seams: the manifest and lock, policy and Prettier comment above; `scripts/runRepositoryJsonQuality.js`; `tests/json-quality.test.js`; the two distribution tests importing retired policy APIs; and `docs/development.md`. These are predictions, not a requirement to rewrite working consumers.

Proof uses the released package documentation and actual consumer invariants: a complete real-repository check; absent required outputs fail and present outputs pass; selected format/normalization preserves unrelated protected bytes; actual packed metadata retains its independent schema and topology assertions. Existing tests of upstream grammar or retired CLI syntax may be reduced to meaningful UO ownership cases rather than ported mechanically. No tests of npm's version selection or integrity algorithm will be added.

Finish all input edits and staging before canonical affected verification. Use HISEW's existing affected profile once on the settled candidate; do not run an additional full campaign. Build verification writes ignored distribution output and precedes the generated-output gate when required. Inspect lifecycle effects before commands. Retain failures honestly and keep raw native evidence outside the repository under the inspected evidence root.

Abort dependent changes if npm cannot resolve 1.0.0, a required public operation is missing, producer ownership changes, or unrelated edits appear. Fix an affected integration failure against the existing contract; seek a new owner decision for changed acceptance or additional configuration. Remove task-owned scratch after its consumers finish, preserving failure evidence. Commit the reviewed task files locally; no push or deployment.

## Reused evidence

- npm registry observation on 12 November: core 1.0.0 is published, `latest` and `pilot` select 1.0.0, Node requirement is `>=22.13.0`, licence is AGPL-3.0-only. This remains an existing development dependency, without new runtime distribution.
- JSON Quality 1.0.0 source documentation and owning policy resolver: sparse configuration, built-in npm/Git/dependency rules, current control/field names and public CLI/API. Confirm against the installed release during implementation.
- SEW plan `docs/plans/2026-11-07-json-quality-root-tooling-migration-implementation-plan.md`: ordinary root npm ownership, sparse exceptions, explicit writes, NDJSON, no duplicate installer or verifier.
- Markdown Quality `79779cee0d00845f19fffb52acb1591c2644f500`: stable schema/API migration and actual consumer boundaries.
- WebVOWL `7a59050eac24b1653fa0c967fa170b8dc0e18920`: ordinary npm ownership and retaining only the generated-output adapter. Its commit is earlier schema-3 context, not evidence of a stable 1.0.0 upgrade.
- OwlAPI `e283b4287b0fb11afc485f74e2e35c23881522e6`: current public API/CLI changes while preserving producer ownership; unrelated toolchain and provenance refresh is excluded here.
