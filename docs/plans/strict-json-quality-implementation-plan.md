# Strict JSON quality implementation plan

Status: **accepted for implementation by the repository owner on 13 October 2026**.
Prepared 13 October 2026 for Universal Ontology (UO).

This plan makes authored JSON consistently readable and rejects ambiguous or unsafe interchange before it reaches configuration consumers, schemas, ontology projections or release controls.
It preserves producer-owned outputs and retained evidence.
The repository owner is the decision, integration, migration and acceptance owner unless another owner is explicitly appointed.

## Basis and authority

The repository owner subsequently requested implementation of this plan, including committing this document at the first commit point.
That request authorizes the plan's dependency, configuration, formatting, commit, push and pull-request changes.
It requires consolidated broad reviews and narrowly scoped follow-up reviews using available local agents.
Deployment and release remain separate decisions.

### Accepted DRY amendment, 13 October 2026

The owner requested implementation of the follow-up simplification and a DRY review of the complete change set beginning at `f0ce0fe6ccbfb94a8cfd55da96d686eca8d05ecf`.
Keep the accepted R2 assurance, all-file checks, producer contracts and source-PR delivery scope.
Rename policy `format` to `allowFormatWrites` and advance its schema version; checking presentation remains mandatory for every record.
Remove the hand-maintained JSON allowlist from `.prettierignore`; direct Prettier CLI calls remain blocked from JSON writes.
Use one policy-derived native-tool entry point for JSON inventory, lint, presentation and safe formatting, performing inventory once per check invocation.
Share native lint configuration and producer-presentation adaptation with package qualification.
Retain independent regression oracles and reviewed release-control digests rather than deriving expected results from the implementation being tested.
The approved configuration changes are confined to `.json-quality.json` field/version migration, `.prettierignore` JSON write protection, `eslint.config.js` shared JSON configuration and `package.json` JSON entry points plus a shared non-JSON Prettier glob selection, together with selector/release binding of their new shared modules.
No dependency, tracked-file classification, non-JSON formatter scope, ontology meaning or deployment change is proposed.
After consolidation, perform the existing three local review lenses, focused native-tool/package/routing tests, full qualification and naturally triggered hosted CI; review subsequent repairs narrowly.

### Accepted coverage amendment, 13 October 2026

The owner subsequently required that no tracked JSON be excluded from quality checks and selected **full validation with producer-defined formatting** for historical, third-party and package JSON.
This amendment supersedes the original lint exclusions and formatting-check selection below; write protections remain in force.
All 105 tracked JSON files (including the new policy) receive strict syntax, duplicate-key, unsafe-value and read-only presentation checks.
Thirty-nine authored files use native Prettier writes; the remaining 66 files receive full validation without generic mutation.
Each policy record declares a formatting contract in addition to write eligibility.
The retained Oxigraph notice uses native Prettier validation of its JSON body while permitting its producer's absent final newline and checkout LF/CRLF envelope.
All other current tracked JSON uses the standard native Prettier presentation contract.
`scripts/checkJsonFormats.js` supplies only this read-only native API adaptation; it adds no parser, serializer, CLI orchestrator or writer.
`format:json:check` checks all policy records; `check:json:producers` preflights protected presentation before the authored writer runs.
Package qualification rebuilds the MCP source bundle and packed target and checks every packaged JSON file plus its generated build metadata for syntax, interoperability and producer-defined formatting.
The notice must remain byte-identical to its source.
Existing provenance, schema, query serialization and RDF graph checks continue to qualify their owning producers.
Configuration approval includes the all-file ESLint selection, per-record formatting contracts, revised command composition and CI/release graph binding of the additional checker.

The supplied research response is `C:\Users\maksy\Downloads\2026-10-10-json-quality-tooling-research-brief-response.md`, SHA-256 `21685e111558685bec2f03aa44dfcbe219b3822b4953e48bb72658a17a381dbb`.
Its portfolio recommendation and adversarial cases inform this plan.
Its embedded citation tokens are not portable references, and its behavioral matrix is explicitly unmeasured.

Repository observations below are from clean HEAD `77cf8b2eebb43d6deae6a81336745fc03e731219`.
Read the [repository instructions](../../AGENTS.md) and [development guide](../development.md) before implementation.
The implementation request explicitly approves configuration changes required by this plan.

HISEW inspection found personal applicability active and the selected worktree admitted.
The accepted implementation route is **R2**, because this change adds input parsing dependencies, expands mutating formatter reach and changes required CI/release-control behavior.
The requirements, acceptance criteria, QA scenarios and decisions below are the accepted implementation baseline.
Independent review and verification will use the owner's authorized local agents after consolidation.
The identifiers below are local draft proposals, not accepted project requirements.
These prerequisites block implementation acceptance, not delivery of this reviewable draft.

## Current UO boundary

- [Root npm scripts](../../package.json) use Prettier 3.9.9, ESLint 10.12.0, Ajv 8.20.0 and ajv-formats 3.0.1 in the lock.
  `@eslint/json` is absent.
  `lint:js` selects JavaScript; [ESLint configuration](../../eslint.config.js) has an unscoped JavaScript recommended block that must be scoped before introducing JSON.
- `format:node` and `format:node:check` already select package manifests, package source/data JSON, `server.json` and distribution JSON.
  `format` calls `format:node`; `fix:all` reaches it through `format`.
  Adding a separate safe command without repairing those routes leaves bypasses.
- The complete tracked extension inventory contains **104 JSON files**: root 10, docs 55, packages 6, policy 3, scripts 2, tests 25, tooling 2 and vendor 1.
  No tracked `.jsonc`, `.json5`, `.jsonld`, `.jsonl`, `.ndjson` or `.sarif` paths were found.
  This is a path inventory, not evidence that all bytes already pass the proposed policy.
- JSON-LD and query-channel JSON are generated.
  [JSON-LD conversion](../../scripts/rdfXmlToJsonLd.js) already compares RDF graphs using RDFC-1.0; [query generation](../../scripts/generateOntologyQueryIndexes.js) owns catalog/index output.
  [Authority ingestion](../../scripts/ontology_policy/authorities.py) owns provenance serialization and digest checks.
- The [selector](../../scripts/selectPullRequestChecks.js), [completion evaluator](../../scripts/evaluatePullRequestChecks.js) and reusable [development workflow](../../.github/workflows/development-checks.yml) jointly determine CI completion.
  The [release verifier](../../scripts/distribution/verifyUniversalOntologyMcpRelease.js) currently binds **33** reviewed control inputs.
  The guide's older nineteen-file description is stale.
- Registered HISEW profiles currently invoke `test:unit` (focused), `test:consumer` (affected) and `check:qualification` (full).
  Inspection reports their ordering semantics unknown.
  Their names do not establish JSON coverage.

## Selected approach and version gates

Reuse native Prettier for presentation, official `@eslint/json` for strict syntax/interoperability, and existing consumer validators/Ajv for schema and domain contracts.
Do not build a JSON parser, serializer, generic runner, compatibility shim or alternate schema engine.

Official registry metadata checked on 13 October 2026 identifies these candidates:

| Component         | Current UO lock | Proposed qualification target | Reason                                                                            |
| ----------------- | --------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| Prettier          | 3.9.9           | 3.9.10                        | Current stable; qualify all existing formatter consumers affected by the upgrade. |
| ESLint            | 10.12.0         | 10.12.0                       | Reuse current stable and existing flat configuration.                             |
| `@eslint/json`    | Absent          | 2.1.1                         | Official native JSON language plugin; supersedes the report's stale 2.0.1.        |
| Ajv / ajv-formats | 8.20.0 / 3.0.1  | Same versions                 | Reuse existing schema machinery.                                                  |

Sources: official npm metadata for [Prettier](https://registry.npmjs.org/prettier/latest), [ESLint](https://registry.npmjs.org/eslint/latest), [JSON plugin](https://registry.npmjs.org/@eslint%2fjson/latest), [Ajv](https://registry.npmjs.org/ajv/latest) and [ajv-formats](https://registry.npmjs.org/ajv-formats/latest).
These observations are selection evidence, not runtime qualification.

Follow UO's declared minimum-version policy: propose `devDependencies["@eslint/json"] = ">=2.1.1"` and `devDependencies.prettier = ">=3.9.10"`.
Native npm resolution must produce an exact reviewed lock graph; CI uses that graph with lifecycle scripts disabled.
Do not replace the minimum policy with exact manifest pins or silently downgrade to the report's older versions.
Recheck stable releases before incorporation and freeze the selected graph during qualification.

The plugin declares Node `^20.19.0 || ^22.13.0 || >=24`; UO's Node 24 line fits that declaration.
Compatibility with UO's exact toolchain remains to be executed.
Registry metadata identifies Apache-2.0 for the plugin and MIT for the existing tools; actual selected license texts, transitive obligations and intended development-only use still need rights review.
Keep these tools out of shipped bundles and preserve the separate Markdown tooling graph.

The supplied research also considered Biome, eslint-plugin-jsonc and check-jsonschema.
No UO requirement currently justifies replacing its formatter/linter stack, introducing an additional JSONC style layer, or duplicating Ajv.
Reopen selection if native capabilities fail the accepted probes.

## Proposed strict policy

Strictness means deterministic formatting, blocking diagnostics, complete coverage and explicit exceptions.
It does not justify changing ontology identifiers or inventing data constraints.

| Concern             | Proposed rule                                                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialect             | `language: "json/json"` for selected JSON. Reject comments, trailing commas, single quotes, unquoted names, trailing content and invalid syntax. New JSONC/JSON5/JSON Lines paths require a separate consumer-backed classification.                                               |
| Duplicate members   | `json/no-duplicate-keys: "error"`, including escape-equivalent names. Never choose a winning value automatically.                                                                                                                                                                  |
| Unsafe values       | `json/no-unsafe-values: "error"`, including lone surrogates, overflow, unintended underflow, unsafe integers and subnormal values covered by the native rule. It is not an arbitrary-precision decimal validator.                                                                  |
| Owned control keys  | `json/no-unnormalized-keys: ["error", { "form": "NFC" }]` on owned manifests, tool configuration, schemas and active control declarations only. No automatic normalization.                                                                                                        |
| Domain-bearing keys | Do not apply NFC policy to RDF/JSON-LD terms, externally defined keys, retained provenance or compatibility fixtures. Preserve string values, language tags and IRIs exactly.                                                                                                      |
| Formatting          | Native Prettier `json-stringify` parser, two spaces, no tabs, LF, final newline, double quotes, no trailing commas, `printWidth: 80`. Width is a formatter preference, not a hard limit on long strings. Freeze native array/object layout through representative golden examples. |
| Other rules         | Do not extend the plugin's moving recommended preset. Explicitly leave `no-empty-keys`, `sort-keys` and `top-level-interop` off. Empty strings/containers and scalar roots remain valid unless their actual schema prohibits them.                                                 |
| Enforcement         | Zero warnings; no suppression baseline, changed-file-only escape, silent empty selection or automatic semantic repair.                                                                                                                                                             |

The [official plugin](https://github.com/eslint/json/tree/json-v2.1.1) supports explicit language configuration.
Its [NFC rule](https://github.com/eslint/json/blob/json-v2.1.1/docs/rules/no-unnormalized-keys.md) supports the selected form and warns about external compatibility; its [unsafe-value rule](https://github.com/eslint/json/blob/json-v2.1.1/docs/rules/no-unsafe-values.md) defines the numerical boundary.
Qualification must test these claims against the locked package.

## One classification authority, native execution

Propose `.json-quality.json` as the sole owner-approved classification source.
Each exact tracked path records class, owner, lint profile, format eligibility, consumer validation and preservation reason where relevant.
It classifies itself after creation.
The appendix accounts for all 104 current paths; proposed treatment is 38 format candidates, six producer-owned read-only inputs and 60 preserved files.
Owner acceptance and preservation probes are required before any candidate becomes writable.

A small proposed `scripts/checkJsonInventory.js` has only the residual repository-specific responsibility that native tools lack: reconcile Git paths and ownership with effective tool selection.
It may report paths/classes/counts and selection errors; it must not orchestrate formatters, parse a replacement JSON dialect or write files.

Its contract:

1. Reconcile the full NUL-delimited Git inventory, including hidden files and the additional extensions above; inspect nonignored untracked candidates without admitting them to the writer.
2. Fail on unclassified paths, duplicate/conflicting entries, stale entries, unsupported dialects, empty expected selection and selected missing/nonregular/symlink paths.
   Recognize case collisions on Windows.
   Deleted/renamed entries require deliberate reconciliation.
3. Account explicitly for excluded generated outputs, local caches, dependencies and installed skills.
   An ignore pattern alone is not classification of a tracked file.
4. Compare ESLint's supported effective configuration and Prettier's supported file-info/ignore behavior against policy.
   Catch accidental exclusions and broader write selection before mutation.
5. Print relative paths and reasons; do not echo MCP/environment values or whole document contents.

ESLint consumes every declared JSON path through its native flat configuration.
Scope JavaScript recommended rules and language options to JavaScript so they cannot execute on JSON ASTs.
Protected JSON receives strict syntax plus duplicate/unsafe checks without stylistic mutation.

Prettier retains [its existing configuration](../../.prettierrc.json) with a JSON-only override.
[Its ignore file](../../.prettierignore) denies all JSON by default and re-includes only accepted exact format paths.
This native mirror is deliberate: Prettier's CLI cannot consume the classification document directly.
The inventory check proves exact parity, and the repository owner maintains both in the same reviewed change.
Do not add a custom formatter writer to eliminate this small declaration duplication.

Remove JSON arguments from both `format:node` commands, including `package.json`, `packages/*/package.json`, JSON in `packages/*/src/**/*.{js,json}`, `packages/*/data/*.json`, `server.json` and `scripts/distribution/*.json`.
Route aggregate formatting through `format:json` exactly once.
`format:check` and `check:qualification` must include the new JSON checks; `lint` includes JSON lint while `lint:node` retains its existing purpose.
Test `fix:all` and `fix:code-style` transitively.
Editor and direct native CLI behavior must respect the same ignore boundary; deliberate CLI overrides are outside the supported safe command contract.

### Proposed command interfaces

These commands **do not exist yet**. npm composes native binaries; no custom execution runner is proposed.

| Interface                      | Proposed behavior                                                                                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:json:inventory` | `node scripts/checkJsonInventory.js`; read-only full reconciliation.                                                                                                                                                                    |
| `npm run lint:json`            | Inventory check, then `eslint "**/*.json" --max-warnings 0 --no-warn-ignored` against the approved flat-config selection. Suppressed native ignore notices are acceptable only because inventory independently reports every exclusion. |
| `npm run format:json:check`    | Inventory check, then `prettier --check "**/*.json"` with the native deny-by-default ignore policy.                                                                                                                                     |
| `npm run check:json`           | JSON lint followed by JSON formatting check; generic JSON quality, not a replacement for domain qualification.                                                                                                                          |
| `npm run format:json`          | JSON lint, native `prettier --debug-check "**/*.json"`, native `prettier --write "**/*.json"`, then `check:json`. A preflight failure prevents writes.                                                                                  |

Quote globs for Windows/Linux portability.
Use installed bins, no floating npx acquisition, shell-generated filename strings, caches or custom error translation.
Preserve native diagnostics and nonzero failures; inventory errors must identify missing policy or operational failures distinctly.
[Prettier CLI documentation](https://prettier.io/docs/cli) defines checking, writing, debug checking and ignore behavior.

The writer is intentionally nontransactional: a crash may leave a partially formatted set.
Record pre-run path identities and retain a task-owned recoverable checkpoint before an approved migration; avoid concurrent edits.
On interruption, inspect actual diffs, preserve failures, repair only task-owned partial edits and rerun all checks.
Never promise native Prettier provides atomic multi-file rollback.

## Schema, ontology and provenance compatibility

Use explicit local schema-to-instance relationships.
Never download an arbitrary `$schema` or `$ref` during checks, and keep Ajv `coerceTypes`, `useDefaults` and `removeAdditional` disabled.
Unknown references and schema compilation failures remain failures.
Preserve justified per-consumer options, including the MCP schema's existing `strictRequired: false` and declared annotation keyword.

| Input                                              | Current owner and required proof                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.json`                                      | [MCP metadata suite](../../tests/distribution/mcp-registry-server-metadata.test.js), its retained official schema and topology assertions.                                                                                                                                                                                                                                                                      |
| PR check-plan schema                               | [Ajv standalone generator](../../scripts/generatePullRequestCheckPlanValidator.js) and [schema tests](../../tests/pr-check-plan-schema.test.js); `node scripts/generatePullRequestCheckPlanValidator.js --check` proves freshness.                                                                                                                                                                              |
| MCP release inputs                                 | [Native release-input reader](../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js), its strict Ajv schema and distribution tests.                                                                                                                                                                                                                                                            |
| Projection history                                 | [Public projection implementation](../../packages/universal-ontology-projection-policy/src/ontologyProjectionProperties.js) and [existing tests](../../packages/universal-ontology-projection-policy/tests/ontology-projection-properties.test.js) own temporal ordering, valid dates and IRI constraints. Add a focused local Ajv schema assertion to these tests if absent; do not replace domain validation. |
| Authority provenance                               | Existing Python authority/policy tests verify producer digests and membership. No generic rewrite or automatic rights change.                                                                                                                                                                                                                                                                                   |
| JSON-LD, catalogs, indexes, build/release receipts | Existing generators, graph/projection tests and publication verifier remain authoritative. They are excluded from generic formatting, including ignored `dist/` and beside-source generated files.                                                                                                                                                                                                              |

No new schema is needed merely because a JSON document exists.
No graph canonicalization, object-key sorting, backfill of historic ontology versions or regeneration of historical evidence belongs to this change.
If a generated output fails a justified generic check, repair and qualify its producer or record an owner-approved exception; do not normalize its output afterward.

## Proposed traceability and delivery slices

All IDs are draft-local.
Independent oracle review belongs to the repository owner/designated verifier; expected outcomes must not be generated by the implementation being tested.

| Requirement                                  | Acceptance criterion                                                                 | Quality scenario                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| REQ-001: complete classification             | AC-001: 100% tracked candidates accounted for; unknown/renamed paths fail visibly    | QA-001: add root, hidden, nested, spaced and non-ASCII paths; remove or conflict an entry. |
| REQ-002: strict, interoperable authored JSON | AC-002: every selected syntax/rule case returns the expected blocking result         | QA-002: duplicates, escapes, Unicode and numeric edge cases.                               |
| REQ-003: safe deterministic presentation     | AC-003: only eligible files change; second pass changes zero bytes                   | QA-003: semantic/order preservation, protected sentinels and interrupted writes.           |
| REQ-004: retain consumer contracts           | AC-004: mapped schema/domain checks stay nonmutating and meaningful                  | QA-004: invalid schema instance, broken reference, invalid date/IRI and graph mismatch.    |
| REQ-005: unavoidable CI coverage             | AC-005: every functional route requires fresh JSON completion at its tested revision | QA-005: missing, skipped, failed, cancelled or stale JSON work cannot pass the aggregate.  |
| REQ-006: reproducible adoption               | AC-006: locked tools, rights, platform qualification and recovery evidence accepted  | QA-006: offline installed checks, Windows/Linux parity and candidate-change invalidation.  |

Decisions proposed: DEC-001 native tool reuse/version targets; DEC-002 class authority and narrow writes; DEC-003 explicit rules/NFC boundary; DEC-004 schema/domain ownership; DEC-005 fresh CI ownership; DEC-006 recoverable migration without transactional claims.

| Slice                                             | Linked proposals                     | Observable delivery and proof                                                                                                                                                          | Release/cleanup implication                                                                                                                  |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-001: classify and check one complete corpus | REQ/AC/QA-001, 002, 006; DEC-001–003 | Obtain precise approvals; resolve rights/lock; implement inventory plus native lint; demonstrate a valid authored file and each rejected adversarial case. Full corpus runs read-only. | No formatter migration or enforcement claim until failures are dispositioned; retain baseline diagnostics.                                   |
| SLICE-002: format an approved representative set  | REQ/AC/QA-003, 004; DEC-002–004, 006 | Qualify native formatting on copies; migrate approved authored paths and close every aggregate bypass; rerun independent schema/domain oracles.                                        | Expand from representative manifests/schema/data to the 38 candidates only after proof; remove spent copies after evidence consumers finish. |
| SLICE-003: make CI completion mandatory           | REQ/AC/QA-005, 006; DEC-005          | Integrate Linux/Windows JSON work in the existing development consumer; exercise selector/completion/release-policy rejection tests.                                                   | Enable blocking checks only with a clean accepted baseline; no separate required GitHub context or deployment.                               |
| SLICE-004: qualify final candidate and hand off   | All IDs                              | Accepted route's full profile, impacted regressions, independent verification and scoped dependency/filesystem/workflow security assessment where required.                            | Record exact identities, failures/skips, approval and cleanup; hosted execution and release remain separately evidenced.                     |

Dependencies are sequential: classification precedes writes; qualified selection precedes CI activation.
Documentation and independent oracle review may proceed alongside implementation only if separately assigned.
No parallel writers to shared policy, lock or CI controls are assumed.

## CI and exact configuration approval proposal

Prefer a dedicated `json-quality` job inside the existing development workflow, with Ubuntu 24.04 and Windows 2025 variants.
Run full inventory and `check:json` on **every functional route**, including documentation-only, no-change and Node-proof-reuse routes.
Add its regression suite to the existing `style-tooling` matrix when policy/tool inputs change, with one declared suite owner to avoid duplicate full Jest discovery.

The development consumer already runs on every route for Markdown.
Extend its internal completion contract to require JSON too, retaining revision verification before execution and fresh completion afterward.
Do not rely solely on the reusable Node consumer: authenticated Node proof reuse may omit that consumer.
Keep selector execution dependency-free and avoid importing `@eslint/json` into it.

Every row below is a proposed exact change family requiring owner approval before mutation; implementation must present the concrete diff if it differs.

| File/control                                                                    | Smallest proposed change and impact                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json` and `package-lock.json`                                          | Add plugin minimum, refresh Prettier minimum/locked graph, add five JSON commands, update aggregate routes and remove competing JSON globs. Affects setup, all formatter consumers and qualification.                                |
| `.json-quality.json`, new                                                       | Record exact paths/classes/profiles/owners and preservation reasons; fail visible on gaps. This is repository policy, not an automatically approved data file.                                                                       |
| `eslint.config.js`                                                              | Scope JS-only defaults; import native JSON language; explicit selected rules and class-specific exclusions/NFC scope.                                                                                                                |
| `.prettierrc.json` and `.prettierignore`                                        | JSON-only formatting override and exact deny-by-default JSON write selection. Preserve existing non-JSON settings.                                                                                                                   |
| The 38 appendix format candidates                                               | Approve their concrete formatting diff. Configuration candidates still need exact approval even when parsed values stay equal. No automatic approval of all future paths.                                                            |
| `.github/workflows/development-checks.yml`                                      | Add JSON matrix, locked install/check steps and completion dependencies with existing read-only permissions.                                                                                                                         |
| `scripts/selectPullRequestChecks.js` and `scripts/evaluatePullRequestChecks.js` | Classify JSON tool/test inputs for platform regression; require the internal JSON job on every development route. No new plan scope is needed for the always-required content check.                                                 |
| `scripts/runPullRequestNodeChecks.js`                                           | Assign JSON regression suite ownership when the style matrix is selected; preserve native coverage/discovery accounting.                                                                                                             |
| `scripts/distribution/verifyUniversalOntologyMcpRelease.js`                     | Deliberately extend/refresh the 33-entry reviewed-input manifest for new authoritative JSON controls and affected existing controls, with independent rejection tests. Never learn expected hashes from unreviewed candidate output. |
| HISEW project configuration, only if needed                                     | Confirm accepted route/profile coverage. Preferred path retains `full -> check:qualification` and incorporates JSON through npm. Any profile/binding edit requires separate exact approval through supported configuration tools.    |

The proposed helper and tests are predicted new files, not existing interfaces.
Likely tests are `tests/json-quality.test.js` plus targeted changes to [selector tests](../../tests/pr-check-scopes.test.js), [completion tests](../../tests/pr-check-results.test.js), [Node ownership tests](../../tests/pr-node-checks.test.js) and [release-policy tests](../../tests/distribution/pr-qualification-policy.test.js).
Update [development documentation](../development.md) with truthful command effects and the current manifest count.

If a new selector scope becomes necessary, separately approve coordinated edits to `scripts/pullRequestCheckPlan.schema.json` and its generated validator.
Do not change the schema merely to attach an always-required job.
Existing PR/full callers should not need new top-level consumers; any actual caller, proof-reuse identity or release-workflow changes require corresponding review/digest/negative-test updates.

## Qualification and migration acceptance

Use real locked ESLint and Prettier in disposable test repositories.
Mock network failures or process interruption only at those external boundaries; do not mock the parser, formatter or expected policy decision.

Required adversarial evidence includes:

- Strict rejection of comments, trailing commas, NaN/Infinity tokens, trailing garbage, duplicate and escape-equivalent keys; acceptance of legal scalar roots and empty keys/values where schemas allow them.
- Safe integer boundaries, `9007199254740992`, `1e400`, `1e-400`, subnormals, long decimals, negative zero and exponent spellings.
  Native unsafe lint is not proof of decimal exactness.
  Keep lexical-sensitive files check-only if native formatting changes a required numeric representation.
- Lone surrogate rejection; valid surrogate pairs, escaped names and multilingual values; NFC rejection on owned control keys and deliberate preservation of non-NFC domain strings.
- Before/after equality of decoded scalars and ordered arrays, preserved member order and required numeric lexemes, plus native debug checking.
  `JSON.parse` equality alone loses duplicates and precision and is insufficient.
  Use maintained token/AST facilities in tests, not a production replacement parser.
- SHA-256 equality for every preserved path, protected invalid fixtures and generated sentinels after supported formatting and aggregate fix routes; zero second-pass diff.
- Missing files, symlinks, paths outside the repository, case collisions, new ignored tracked JSON, empty selection and operational failure.
  Windows and Linux must agree on selection and outcomes.
- Schema checks leaving input bytes/data unchanged, local reference resolution, malformed/broken references and independent consumer failures.
- CI mutation tests for required JSON job omission/failure/cancellation/stale revision and manifest tampering.
  A passing local command does not prove hosted gate behavior.

Record counts, selected/excluded paths, per-rule findings, tool/lock/config identities, before/after hashes, command exit status, elapsed time and peak memory.
Propose a 60-second warmed full-corpus JSON-check budget per platform, excluding dependency installation; measure it before acceptance and revise with owner evidence if unsuitable.
This is a proposed criterion, not a measured result.

Capture initial failures before migration.
Resolve duplicates, unsafe values and non-NFC control keys by owner-reviewed source changes, never autofix.
Formatting batches must start from actual working contents and exclude unrelated edits.
Requalify generators only when their inputs or producers change; retain existing receipts as historical evidence and produce new receipts only through their owners.
Do not rerun or publish ontology generation solely to make JSON style green.

Focused implementation checks should use `npm test -- --runInBand --runTestsByPath` with the actual affected suites, the proposed JSON commands and existing schema freshness check.
The R2 proposal requires the accepted `full` profile after integration; `test:unit` alone does not cover this tooling, and `test:consumer` excludes several relevant CI/distribution suites.
Inspect lifecycle effects first and use `build:verify` where a website build is required.
No build, installation or JSON behavior qualification was run to produce this plan.

## Release, recovery and unresolved decisions

Before activation, the repository owner must accept the route/baseline, exact configuration diffs, classification, tool rights, measured probes, final independent review and any required native security assessment.
No no-shim exception is proposed.
The plan does not authorize starting a scan or publishing findings.

The observer is the repository owner or appointed maintainer.
Acceptance signals are complete inventory, stable formatting, preserved protected bytes, passing consumer contracts and fresh required CI completion.
Missing output, a lost path, unexpected rewriting or altered consumer meaning stops rollout.

Before merge, reverse only task-created edits when abandoning a candidate.
After activation, recovery is an owner-approved corrective change or reviewed revert commit limited to this change, with fresh control digests and checks.
Do not restore unsupported consumers, reset the checkout, discard unrelated work or claim an old receipt qualifies a changed candidate.
No deployment or automatic remote CI dispatch is needed for plan delivery; eventual hosted runs, commit/push, merge and publication have their own authority.

Remaining gates are explicit: accepted HISEW prerequisites; exact selected-license clearance; candidate 3.9.10/2.1.1 execution; full corpus syntax/format results; extensionless/embedded JSON ownership; generator output limits; NFC compatibility; Windows/Linux performance; exact final control-manifest membership; and hosted completion behavior.
Check-only source inspection does not close them.

Replan if an unknown dialect appears, identities depend on lexical bytes, native tools cannot preserve accepted semantics, generated output must become writable, dependency upgrades alter other formats, selector proof reuse changes, a schema needs remote resolution, or scope expands beyond UO.
Reassess the purpose at each slice: clearer maintained JSON must not weaken ontology meaning, evidence fidelity or release assurance.

Retain durable tests, this plan and decision/evidence records.
Store supplemental workflow evidence in the currently resolved HISEW external evidence destination; do not invent a new `.sdlc/runtime` scratch convention.
Remove only task-owned spent temporary copies after their consumers finish, and retain failure evidence with an owner and disposition.

## Complete tracked-path classification proposal

This appendix is exhaustive for the inspected 104-path inventory.
It is a proposal, not blanket write approval.
Exact path entries prevent broad directory exceptions from silently admitting later files.
Future files and the new policy/test inputs must be classified explicitly.

### Authored format candidates: 38

Strict syntax and duplicate/unsafe lint apply.
NFC applies only to the owned manifest/configuration/schema/control subset; the projection data and ontology oracle fixtures keep domain text untouched.
Existing consumers remain the semantic oracles.
All writes require the accepted per-path migration scope.

```text
.htmlvalidate.json
.markdown-quality-execution.json
.markdown-quality.json
.mcp.json
.prettierrc.json
.stylelintrc.json
docs/import-closure/contract.v1.json
package.json
packages/universal-ontology-mcp-server/package.json
packages/universal-ontology-projection-policy/data/field-property-history.v1.json
packages/universal-ontology-projection-policy/data/field-property-history.v1.schema.json
packages/universal-ontology-projection-policy/package.json
packages/universal-ontology-query/package.json
scripts/distribution/universalOntologyMcpReleaseInputs.json
scripts/pullRequestCheckPlan.schema.json
server.json
tests/fixtures/ontology-policy/axiom/axiom.expected.json
tests/fixtures/ontology-policy/complete/complete.expected.json
tests/fixtures/ontology-policy/dcat/dcat.expected.json
tests/fixtures/ontology-policy/entity-created/created.expected.json
tests/fixtures/ontology-policy/entity-metadata/metadata.expected.json
tests/fixtures/ontology-policy/labels/labels.expected.json
tests/fixtures/ontology-policy/naming/naming-iso.expected.json
tests/fixtures/ontology-policy/naming/naming.expected.json
tests/fixtures/ontology-policy/ontology-header/header-impossible-info-date.expected.json
tests/fixtures/ontology-policy/ontology-header/header-leap-day-valid.expected.json
tests/fixtures/ontology-policy/ontology-header/header-malformed-info.expected.json
tests/fixtures/ontology-policy/ontology-header/header-mismatched-iri.expected.json
tests/fixtures/ontology-policy/ontology-header/header-missing-version-iri.expected.json
tests/fixtures/ontology-policy/ontology-header/header-modified-datetime.expected.json
tests/fixtures/ontology-policy/ontology-header/header-modified-mismatch.expected.json
tests/fixtures/ontology-policy/ontology-header/header-modified-offset.expected.json
tests/fixtures/ontology-policy/ontology-header/header-non-leap-day.expected.json
tests/fixtures/ontology-policy/ontology-header/header-two-version-infos.expected.json
tests/fixtures/ontology-policy/ontology-header/header-valid-modified-z.expected.json
tests/fixtures/ontology-policy/ontology-header/header-valid-no-modified-trailing-slash.expected.json
tests/fixtures/ontology-policy/ontology-header/header-valid.expected.json
tooling/markdown/package.json
```

### Producer-owned check-only inputs: 6

Apply strict syntax and duplicate/unsafe lint read-only after corpus qualification; use existing producer/domain checks for meaning and digests.
No generic formatting or NFC enforcement.

```text
policy/authorities/eu-file-type.provenance.json
policy/authorities/iana-media-types.provenance.json
policy/authorities/loc-iso639-1.provenance.json
tests/fixtures/ontology-policy/authorities/derived/eu-file-type.provenance.json
tests/fixtures/ontology-policy/authorities/derived/iana-media-types.provenance.json
tests/fixtures/ontology-policy/authorities/derived/loc-iso639-1.provenance.json
```

### Preserved inputs: 60

These include npm/skills locks, historical verification/proposal evidence, vendored schema/package content and third-party notices.
Their designated consumers validate semantics; generic lint and read-only presentation checks cover them without rewriting their bytes.
Draft-looking historical filenames are not authority to refresh them.
A future intentionally invalid fixture must use a non-JSON extension and an explicit rejection-test purpose; it cannot bypass the all-JSON validation contract.

```text
docs/import-closure/registry-artifact-verification.json
docs/import-closure/registry-consumer-qualification.json
docs/plans/sdlc-improvements/wp0-worktree-preservation/recovery-recipe-check.json
docs/plans/sdlc-improvements/wp1-verification-evidence/text-boundary-research-checks.json
docs/plans/sdlc-improvements/wp1-verification-evidence/verification-run-schema-checks.json
docs/plans/sdlc-improvements/wp1-verification-evidence/verification-run.schema.proposed.json
docs/plans/sdlc-improvements/wp2-independent-execution/original-delivery-manifest.json
docs/plans/sdlc-improvements/wp2-independent-execution/publication-mechanism-probe.json
docs/plans/sdlc-improvements/wp3-resource-disposition/artifact-checks.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/eligible-assessment.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/held.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/held.stored.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/operator-blocked.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/preserved-pending-review.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/removed-confirmation.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/removed-confirmation.stored.json
docs/plans/sdlc-improvements/wp3-resource-disposition/examples/retained-for-consumer.input.json
docs/plans/sdlc-improvements/wp3-resource-disposition/resource-disposition.schema.proposed.json
docs/plans/sdlc-improvements/wp4-command-dispatch/artifact-checks-verified.json
docs/plans/sdlc-improvements/wp4-command-dispatch/diagnostic-cases.proposed.json
docs/plans/sdlc-improvements/wp4-command-dispatch/preparation-history/artifact-checks-final.json
docs/plans/sdlc-improvements/wp4-command-dispatch/preparation-history/artifact-checks.json
docs/plans/sdlc-improvements/wp4-command-dispatch/sources.json
docs/plans/sdlc-improvements/wp4-command-dispatch/test-catalogue.proposed.json
docs/plans/sdlc-improvements/wp5-security-inventory/artifact-checks.json
docs/plans/sdlc-improvements/wp5-security-inventory/git-oracle-check.json
docs/plans/sdlc-improvements/wp5-security-inventory/original-delivery-manifest.json
docs/plans/sdlc-improvements/wp5-security-inventory/verification-catalogue.proposed.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/artifact-checks.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/baseline-boundary-check.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/original-delivery-manifest.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/planning-checks/artifact-check-initial-failure.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/remote-observations.json
docs/plans/sdlc-improvements/wp6-trusted-baselines/verification-catalogue.proposed.json
docs/plans/sdlc-improvements/wp7-proportionate-execution/deliverable-checks.json
docs/plans/sdlc-improvements/wp7-proportionate-execution/original-delivery-manifest.json
docs/plans/sdlc-improvements/wp7-proportionate-execution/verification-catalogue.proposed.json
docs/plans/sdlc-improvements/wp8-selective-adoption/deliverable-checks.json
docs/plans/sdlc-improvements/wp8-selective-adoption/input-identities.json
docs/plans/sdlc-improvements/wp8-selective-adoption/original-delivery-manifest.json
docs/plans/sdlc-improvements/wp8-selective-adoption/research-observations.json
docs/plans/sdlc-improvements/wp8-selective-adoption/verification-catalogue.proposed.json
docs/reviews/editing-policy-design/verification/clause-inventory.json
docs/reviews/editing-policy-design/verification/local-preview-report.json
docs/reviews/editing-policy-design/verification/preservation-report.json
docs/sdlc/archive/PACKAGE_STATUS.json
docs/sdlc/archive/SOURCE_PACKAGE.json
docs/sdlc/baselines/issue-25/v1.json
docs/sdlc/baselines/issue-25/v2.json
docs/sdlc/baselines/issue-32/v1.json
docs/sdlc/baselines/issue-33/v1.json
docs/sdlc/baselines/issue-36/v1.json
docs/sdlc/baselines/issue-40/v1.json
docs/sdlc/baselines/issue-42/v1.json
package-lock.json
packages/universal-ontology-mcp-server/third-party/oxigraph/component-notices.json
skills-lock.json
tests/fixtures/distribution/mcp-registry-server-schema-2025-12-11.json
tooling/markdown/package-lock.json
vendor/braces/package.json
```
