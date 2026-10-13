# JSON byte validation, dependency declaration and profile cleanup plan

Status: **accepted for implementation by the repository owner on 13 October 2026**.
Prepared 13 October 2026 for Universal Ontology (UO).

This follow-up closes three review findings in the JSON quality controls: a leading UTF-8 byte order mark (BOM) can disappear before byte-sensitive validation, the token-based test oracle imports an undeclared direct dependency, and the policy carries a lint-profile distinction with no behavioral effect.
The intended outcome is trustworthy validation of the bytes producers actually supply, reproducible test dependencies, and a smaller policy with the same substantive lint rules.
The repository owner is the decision and acceptance owner; the implementing agent is the integration owner only when explicitly assigned.

## Authority, baseline and proposed route

This document was originally prepared as a draft for owner review.
The repository owner subsequently requested implementation through HISEW, committing this plan at its first commit point, consolidating changes before broad reviews and using narrowly scoped follow-up reviews.
That instruction authorizes this plan's exact configuration changes, required native lock generation and clean installation, commit messages, signed commits and pushes to the existing PR source.
Merge and deployment remain separate decisions.
The [accepted strict JSON plan](strict-json-quality-implementation-plan.md) supplies the retained architecture and risk context; this follow-up's authority comes from the owner's subsequent implementation instruction.

The planning baseline is branch `json-quality`, commit `7ffb939c32c37c23cf4575649be76270229f4678`, tree `83cf42fced92ded3de33fc316cb25004e4773393`, with a clean working tree before this document was created.
[PR 143](https://github.com/Hadden-Industries/universal-ontology/pull/143) was open against `main` at `77cf8b2eebb43d6deae6a81336745fc03e731219` when the parent agent checked it.
Recheck these identities before implementation; do not infer current remote state from this snapshot.

The parent agent freshly confirmed personal, active HISEW applicability, a handed-off preceding execution, and no remaining verification gaps in that execution.
No execution was created or adopted to write this plan.
For future implementation, the coordinating agent must recheck applicability, session ownership, the selected installed engine and the current external evidence destination through supported HISEW interfaces.
It must not reopen or adopt another execution implicitly.

**Accepted route: continue the R2 quality-control risk context.**
The accepted plan already assigns R2 because a missed validation can admit incorrect artifacts and an overbroad gate can block qualification.
These repairs affect shared byte admission, policy interpretation, the development dependency declaration and reviewed release-control inputs.
The owner's implementation instruction accepts this follow-up's route, requirements, decisions and exact configuration proposal.
The planning-time evidence and conditional implementation gates below remain scoped to their stated candidates and effects.

The existing `full` profile maps to `npm run check:qualification`: lint, Node formatting checks, Python formatting checks, full Jest, Python tests and `build:verify`.
The configured `focused` and `affected` profile names do not by themselves identify the right tests: `test:unit` omits this tooling, and `test:consumer` excludes relevant distribution/control suites.
Use the explicit affected suites below and one route-required final native `full` run after the final planned tracked-input writers.

Prior native full receipt `c01370c3-3994-4e7f-b5dd-12e118de2d1a`, from execution `a52b285d-f9a5-409e-8203-3c7869b7e2b7`, is context only: 97 JavaScript suites, 1,934 passed tests and one existing skip; 219 Python tests in 15 modules with five skips; lint, formatting and build passed.
The preceding post-build JSON check reported 637 discovered files, 105 tracked, 39 writable and 598 protected, with zero errors or warnings.
That receipt does not qualify any changed implementation tree.
Operator notes and native receipts remain different evidence classes.

## Verified findings and behavioral changes

### Leading BOM disappears before validation

[Shared contracts](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/jsonQuality.js) currently decode with native `TextDecoder("utf-8", { fatal: true })`.
The default removes a leading BOM; the counterintuitive `ignoreBOM: true` option includes it in the decoded result.
Fatal mode rejects malformed UTF-8, but does not prohibit a BOM.
These behaviors are documented in the [Node 24.21.0 TextDecoder contract](https://nodejs.org/download/release/v24.21.0/docs/api/util.html#new-textdecoderencoding-options).

The parent agent reproduced `EF BB BF` followed by the UTF-8 bytes of `{}\n` passing `checkJsonPresentation` under `prettier-json`, `producer-json-indent` and `producer-json-compact`.
The decoder had removed bytes that the native serializers never emitted.
Direct ESLint checks of BOM-prefixed text also returned zero errors for an ordinary source path and a generated producer path; parser tolerance therefore cannot enforce this output contract.
[RFC 8259 section 8.1](https://www.rfc-editor.org/rfc/rfc8259.html#section-8.1) prohibits producers from adding a BOM to network-transmitted JSON while permitting parsers to ignore one.
The finding concerns UO's byte/presentation contract, not a claim that tolerant parsers violate the RFC.

Proposed behavior: the shared byte boundary rejects a leading UTF-8 BOM before any text transformation or presentation comparison.
Retain native fatal UTF-8 decoding, configure it to preserve the marker during decoding, and explicitly reject a decoded leading U+FEFF before returning text.
This is a small consumer-contract check around the native decoder, not a replacement decoder or tokenizer.
Changing `ignoreBOM` alone is insufficient because downstream linting tolerates the marker.
An encoding rejection throws, consistent with the existing malformed-UTF-8 failure path; callers must not convert it into a successful format result.

The pure decoder remains independent of filesystem paths.
The policy reader and inventory caller add the known repository-relative path when reporting an encoding failure.
For example, the diagnostic for `dist/query/v1/example.json` must identify that path and an unexpected leading UTF-8 BOM, leave its bytes intact, and return failure before any generic writer starts.
Do not dump JSON payload contents into diagnostics.

| Input or operation                                                      | Before                                                      | Required result after repair                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `EF BB BF` followed by `{}\n`                                           | Demonstrably passes the three presentation contracts above. | Reject at the shared byte boundary under all five presentation contracts.                 |
| BOM-prefixed `.json-quality.json`                                       | The policy bootstrap decoder removes the marker.            | Reject with policy-file context before ESLint/Ajv admission.                              |
| BOM-prefixed generated, retained or `normalization: "preserve"` input   | The decoder can hide the prefix regardless of ownership.    | Reject without mutation; preservation and body-envelope exceptions do not waive encoding. |
| Ordinary BOM-free producer bytes                                        | Checked against native serialization.                       | Same accepted bytes and same rejected indentation/newline/number presentations.           |
| A string value containing literal U+FEFF, or a key such as `a<U+FEFF>b` | Interior characters survive decoding.                       | Preserve exact characters and apply existing syntax, meaningful-key and NFC rules.        |
| `normalizeJsonSource("<U+FEFF>{}\n")`                                   | Already rejected by its native parse step.                  | Continue rejecting; do not describe this as a newly repaired acceptance path.             |
| `normalizeJsonSource` with U+FEFF inside a valid string value           | Already accepted without removing that character.           | Continue preserving it.                                                                   |

In this table `<U+FEFF>` denotes the literal character; a JSON escape inside a quoted string is data, not a byte prefix.
A key made entirely of U+FEFF or with it at a trimmed edge is still subject to the existing meaningful-key rules; the byte repair must not redefine those rules.
No blanket character ban, trimming, encoding conversion or automatic BOM removal is proposed.

A fresh read-only probe used the native inventory and inspected the first three bytes of every discovered file: **637 files, zero leading UTF-8 BOMs**.
The inventory contained 105 tracked files, 39 writable and 598 protected; presentation contracts were 110 `prettier-json`, 524 `producer-json-indent`, and one each of `producer-json-body`, `producer-json-indent-body` and `producer-json-compact`.
Eleven external boundaries were encountered under existing policy.
This probe establishes that no current corpus repair or BOM exception is needed; it is not a new full lint, build or runtime qualification.
If a later baseline contains a BOM, identify its owner and repair the owning source or producer under explicit authority instead of rewriting a protected artifact.

### The test oracle depends on accidental transitive availability

[JSON quality tests](../../tests/json-quality.test.js) directly import `tokenize` from `@humanwhocodes/momoa`.
The `meaning` helper preserves token order, decoded string values and raw numeric lexemes for formatting and write-preservation assertions.
The root manifest does not declare Momoa; the current lock obtains it through `@eslint/json`'s `^3.3.13` dependency.
The tests can therefore break after a legitimate transitive dependency or installation-layout change.

Proposed behavior: declare `devDependencies["@humanwhocodes/momoa"]` as **`>=3.3.13`** in the root [manifest](../../package.json), and regenerate the root [lockfile](../../package-lock.json) with native npm.
This follows the repository's minimum-version policy in the [development guide](../development.md#setup) and npm's distinction between production and [development/test dependencies](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/).
Keep the existing tokenizer and test oracle; do not replace them with the JSON quality implementation, vendor parser code, or create a custom tokenizer merely to avoid a declaration.

The registry was queried read-only on 13 October 2026.
Both `latest` and the highest published stable version were **3.3.13**, published 2 September 2026, matching the installed and locked version.
The proposal is a direct-declaration repair with the same selected package bytes, not a package upgrade.
Recheck immediately before adoption; a changed stable release or materially different resolution requires a revised exact proposal rather than an automatic upgrade.

| Selection evidence             | Verified identity and implication                                                                                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry and source            | [Momoa registry metadata](https://registry.npmjs.org/@humanwhocodes%2Fmomoa); repository `humanwhocodes/momoa`; release `gitHead` `625bcbec28623ccebb1da837c71389cf38014800`.                                                                                                                                    |
| Exact resolved artifact        | [Momoa 3.3.13 tarball](https://registry.npmjs.org/@humanwhocodes/momoa/-/momoa-3.3.13.tgz); registry and lock integrity agree: `sha512-AbKq3EW41+HY6pNMJgAOrz68iyiTTf0Nr1JRHHfuG5zwniJ9Dw8J3U7oa1I2ptpqYwmEf1sXKOGK6lbdZ9eqmg==`.                                                                                |
| Runtime and dependency surface | Node `>=18`; no declared runtime or optional dependencies. The planning checkout uses Node 24.21.0. No runtime/toolchain version change is proposed.                                                                                                                                                             |
| Licence evidence               | Apache-2.0 metadata and the exact source revision's [full licence text](https://raw.githubusercontent.com/humanwhocodes/momoa/625bcbec28623ccebb1da837c71389cf38014800/LICENSE) were inspected; no separate NOTICE file was found in that source tree. UO's root [licence](../../LICENSE) is MIT.                |
| Adoption boundary              | Existing test-only use becomes explicit. No new vendoring, public runtime dependency or redistribution of Momoa is proposed. The installed package has an Apache-2.0 README declaration but no standalone LICENSE file; this observation is not an invented blocker to declaring the already-present dependency. |

Retain provenance and applicable notices if distribution scope later changes.
Apache-2.0 redistribution conditions, including the licence copy, applicable attribution, modification notices and any supplied NOTICE, belong to that future distribution decision.
This assessment does not grant blanket legal clearance for future packaging.
Technical selection is established; final installation and consumer qualification remain pending implementation approval.

### A required policy field expresses no distinction

`jsonRules(lintProfile, normalization, allowEmptyKeys)` accepts `control` and `data` but returns the same rules for both.
`jsonLintConfig` always asks for `data`; the policy bootstrap's `control` field has no effect.
Nevertheless, the closed Ajv schema requires `defaults.lintProfile`, permits it in exceptions, and `jsonContract` propagates and conflict-checks the field.
[Registry metadata tests](../../tests/distribution/mcp-registry-server-metadata.test.js) also assert it.

Proposed behavior: remove `lintProfile` from the active policy, embedded schema, resolved contract properties, rule API, all current callers and fixture/assertion records.
The current repository search found active references only in `.json-quality.json`, `scripts/jsonQuality.js`, `scripts/checkJsonInventory.js` and that Registry test; repeat the search before editing.
Negative tests may retain the spelling specifically to prove that obsolete policy fields are rejected.

Use a small options object for the two meaningful `jsonRules` inputs, `normalization` and `allowEmptyKeys`, with NFC as the existing default.
That avoids a positional shift accidentally treating a normalization value as an empty-key exception.
Keep the shared function's name because it still supplies JSON rules; rename the internal `DATA_RULES` constant to an accurate shared/base-rules name if it otherwise implies a removed data/control distinction.
Do not add a mode enum, dispatch abstraction or compatibility wrapper.

The closed schema must reject `lintProfile` in either defaults or exceptions through its existing additional-property policy.
Remove it from both `required` and `properties`; merely making it optional would leave the false distinction supported.
Remove its conflict-resolution branch without weakening conflict checks for actual settings.
Keep schema version **4**, honoring the owner's recorded decision that these unreleased PR iterations land together.
No published external consumer requiring an old profile was identified; discovery of one is a replan trigger, not authority to add a silent shim.

## Scope, invariants and native reuse

The three fixes are bounded changes to the existing native-tool architecture.
Reuse Node's decoder, npm, the official `@eslint/json` language and rules, ESLint's effective configuration, Prettier presentation, Momoa tokenization and the existing closed Ajv policy schema.
The residual custom change is the UO-specific leading-marker guard, removal of inert metadata and coordination of existing consumers.
There is no new platform capability requiring a replacement-tool survey.

The following accepted contracts remain acceptance conditions:

- Sparse owner/reason exceptions and automatic tracked, untracked and ignored-generated discovery remain authoritative.
  Git ignore affects generic writes, not read checks; tracked JSON within an external boundary remains checked.
- The centralized strict extension contract remains `.json`, `.jsonld` and `.sarif`, with existing dialect and case behavior.
  This repair does not change discovery formats.
- Duplicate-key, unsafe-number, surrogate, noncharacter, meaningful-key and all-string NFC checks retain their severities and behavior.
  `normalization: "preserve"` retains string identity, not an encoding exemption.
- The npm empty-key exception remains exactly `/packages/` in `**/package-lock.json`, with its owner and reason.
  No broader whitespace or empty-key allowance is introduced.
- Producer-body exceptions retain only their accepted line-ending/final-newline envelope.
  Other producer contracts still compare native serialization exactly.
  Neither exception category permits arbitrary added bytes.
- The generic writer only changes eligible source presentation; collision-safe NFC source repair remains explicit.
  Producer-owned and retained outputs require their owners' repair/regeneration paths.
- JSON object comparison, canonical semantic digests, exact-byte hashes, opaque cursor integrity, ordered tuples, schema validation and JSON-LD graph equivalence keep their separate existing authorities.
- Packed qualification keeps the recent `jsonContract` resolution of the real application-bundle metadata path and the raw-byte preservation comparison for the Oxigraph notice.

No changes are proposed to ESLint configuration, Prettier configuration/ignore files, workflows, npm scripts, supported HISEW profiles, dependency-selection policy, ontology data, public package metadata, runtime network behavior, schema-version numbering or release topology.
If inspection shows any of those are necessary, revise the plan and exact approval proposal first.

## Requirements, acceptance and decisions

The accepted plan's `REQ/AC/QA-001` through `006` retain their original meanings: complete classification, strict interoperability, safe presentation, consumer contracts, unavoidable CI and reproducible adoption.
The following `007` through `010` identifiers are proposed follow-up requirements in this document, not retroactive amendments to accepted evidence.

| Requirement                           | Falsifiable acceptance criterion                                                                                                                                                                                                     | Quality scenario and inherited trace                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-007: byte-faithful JSON admission | AC-007: every shared-byte consumer rejects a leading UTF-8 BOM; malformed UTF-8 still rejects; valid interior U+FEFF remains unchanged. CLI failure names the offending relative path and BOM before any write.                      | QA-007: adversarial byte prefixes at policy, authored, protected/generated and packed boundaries, plus independent byte-preservation sentinels. Extends REQ/AC/QA-001, 002, 003 and 004. |
| REQ-008: explicit test dependency     | AC-008: root manifest and generated lock declare Momoa `>=3.3.13`; selected package identity remains 3.3.13 with the recorded integrity unless a new decision is accepted; a clean native install and token-oracle tests pass.       | QA-008: resolve the direct import after clean installation and exercise order, decoded-string and exact-number preservation. Extends REQ/AC/QA-003 and 006.                              |
| REQ-009: meaningful policy only       | AC-009: no active contract/API/caller depends on `lintProfile`; the profile-free v4 policy passes; obsolete defaults/exception fields fail closed; substantive lint outcomes and exceptions remain identical.                        | QA-009: default NFC, preservation, allowed/disallowed empty keys, overlapping exceptions, native effective-config tampering and obsolete-field rejection. Extends REQ/AC/QA-002 and 004. |
| REQ-010: qualified final controls     | AC-010: exactly the reviewed changed input hashes are refreshed; the graph still has 44 members; mutation rejection, targeted suites, final native full receipt and required final generated checks identify the accepted candidate. | QA-010: altered/missing control inputs fail, stale proof is not reused for changed inputs, and real packed artifacts satisfy shared contracts. Extends REQ/AC/QA-005 and 006.            |

| Proposed decision                                 | Rationale and owner                                                                                                                                                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-007: reject BOM at shared byte admission      | Repository owner accepts BOM-free encoding for all current JSON contracts. Native fatal decoding with BOM preservation plus an explicit prefix rejection supplies the smallest common enforcement point. No exception is required by the observed corpus. |
| DEC-008: declare the existing native token oracle | Repository owner accepts `>=3.3.13` as a root development dependency. Preserve independent formatting/write assertions; native npm owns the lock representation.                                                                                          |
| DEC-009: remove the no-op profile coherently      | Repository owner accepts the profile-free options API and closed v4 policy. Current consumers move together; no compatibility alias or shim is proposed.                                                                                                  |
| DEC-010: retain independent authorities           | Integrator preserves native consumer validation and independent expected outcomes. Sharing the production policy does not justify deriving every test expectation from that policy.                                                                       |
| DEC-011: use one final candidate qualification    | Owner accepts the R2 continuation and focused-then-full cadence. Consolidate changes and review repairs before final signed-commit qualification; reuse exact native proof only while its identity remains valid.                                         |
| DEC-012: preserve ownership and failure evidence  | Owner controls source/producer remediation, acceptance, publication and any rollback. No generic rewrite of protected bytes or deletion of required failure evidence is permitted.                                                                        |

These decisions apply HISEW's DRY-01, NAM-01, REU-01, VER-01, LIC-01 and consumer-owned validation principles.
NSH-01 has no requested override: the design contains no old-profile compatibility path.
Native security assessment remains owned by the repository's security policy and accepted route, not by a replacement local scanner or an agent's permission inference.

## Responsibility map and predicted files

DRY-01 is applied to shared knowledge, not merely similar text.
All current in-repository consumers of the byte and lint contracts are updated/qualified together; no independent deployed service consumes this internal helper API in the observed scope.

| Knowledge and current authority                                              | Latest consumers and failure boundary                                                                                                                                           | Planned strategy and drift control                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encoding admission: `decodeJsonBytes` in shared contracts                    | Policy bootstrap, inventory, normalization command preflight, presentation checks and actual packed JSON qualification. Each boundary must enforce before accepting or writing. | One pure guard around native decoding. Callers supply path context; no copied BOM detectors in package or CLI tests. Behavior tests use literal byte vectors independent of the decoder. |
| Policy shape and exceptions: `.json-quality.json` plus its closed Ajv schema | `readJsonPolicy`, `jsonContract`, ESLint file records, inventory and packed metadata resolution.                                                                                | Remove the field at both schema and document boundaries; keep other exception merging, ownership and conflict rules. Reject superseded policy fields.                                    |
| Lint rules: shared `jsonRules`/`jsonLintConfig`                              | Root ESLint, effective-config inventory verification, pure normalization preflight and packed-target checks.                                                                    | One meaningful options contract, coordinated callers and existing native semantic vectors. Root ESLint already delegates; no separate rules copy is needed.                              |
| Presentation: root native options plus named producer contracts              | One command adapter and packed-target tests.                                                                                                                                    | Retain native Prettier/serializer ownership and the existing body-envelope exceptions; byte admission runs first.                                                                        |
| Direct dependency intent: root manifest; resolution: npm lock                | Test import and clean checkout/setup.                                                                                                                                           | Manifest declares the actual direct use; native npm maintains the exact resolution. Avoid duplicate version constants in new source code.                                                |
| Preservation oracle: Momoa tokens, literal expected strings and byte buffers | Formatting, idempotence and writer tests.                                                                                                                                       | Deliberate independence from the implementation under test. The test owner retains manually specified expected decisions and mutations that can falsify them.                            |
| Reviewed execution graph: release verifier's explicit manifest               | Release policy admission and independent policy-mutation suite.                                                                                                                 | Keep 44 members; refresh only reviewed changed entries with the verifier's existing hash semantics. Expected hashes never come from unreviewed candidate artifacts.                      |

The following paths are predictions, not blanket write approval.

| Predicted path                                                                                                                       | Smallest intended change                                                                                                                                                                                                       | Approval or verification implication                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [scripts/jsonQuality.js](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/jsonQuality.js)                                                                               | Add BOM-preserving fatal decoding and explicit rejection; annotate policy-read errors with its path; remove profile schema/properties/branches and obsolete records; use meaningful rule options and accurate internal naming. | Shared policy/behavior change requires the exact approval below. Unit, bootstrap, policy and packed consumers need proof.                                   |
| [scripts/checkJsonInventory.js](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/checkJsonInventory.js)                                                                 | Pass the remaining rule options coherently and attach the current relative path to decoder failures.                                                                                                                           | No discovery/write-boundary change. Existing effective-rule verification remains mandatory.                                                                 |
| [.json-quality.json](../../.json-quality.json)                                                                                       | Delete only `defaults.lintProfile`.                                                                                                                                                                                            | Retain schema v4, all defaults/exception records and their owners/reasons.                                                                                  |
| [package.json](../../package.json)                                                                                                   | Add `@humanwhocodes/momoa: ">=3.3.13"` under root `devDependencies`.                                                                                                                                                           | No scripts, engines, overrides or public/runtime package changes.                                                                                           |
| [package-lock.json](../../package-lock.json)                                                                                         | Native regeneration for the direct declaration and only necessary lock metadata.                                                                                                                                               | Expect existing Momoa version/integrity and the rest of the selected graph to remain stable; inspect the actual delta.                                      |
| [tests/json-quality.test.js](../../tests/json-quality.test.js)                                                                       | Byte-boundary, actionable-diagnostic, no-write and obsolete-field regression cases; meaningful-options caller/fixture updates if needed.                                                                                       | Retain the Momoa oracle, existing substantive vectors and native executable fixtures.                                                                       |
| [tests/distribution/mcp-registry-server-metadata.test.js](../../tests/distribution/mcp-registry-server-metadata.test.js)             | Remove the inert profile expectation; keep actual contract expectations.                                                                                                                                                       | Add absence assertion only where it verifies the resolved public contract rather than mirroring field deletion.                                             |
| [tests/distribution/universal-ontology-mcp-npm-package.test.js](../../tests/distribution/universal-ontology-mcp-npm-package.test.js) | Add a bounded BOM mutation assertion using actual packed-document bytes if needed to prove this consumer boundary.                                                                                                             | Preserve real-path contract resolution, exact notices and bundled-component/public-dependency assertions. Reuse one existing package build/install fixture. |
| [scripts/distribution/verifyUniversalOntologyMcpRelease.js](../../scripts/distribution/verifyUniversalOntologyMcpRelease.js)         | Deliberately refresh affected reviewed-input hashes after reviewing those inputs.                                                                                                                                              | Existing membership/count and digest algorithms stay unchanged.                                                                                             |
| [docs/development.md](../development.md)                                                                                             | Document BOM rejection, interior-character preservation, owner repair and the single lint contract.                                                                                                                            | Current operational documentation changes; historical accepted plans remain intact.                                                                         |
| This plan                                                                                                                            | Record a later explicit acceptance/status change only when directed or authorized.                                                                                                                                             | Owner acceptance is recorded above; committing documentation alone supplies no additional authority.                                                        |

`scripts/runJsonQuality.js` is an existing consumer to inspect and test, not an expected change: its initial inventory already validates the corpus before any operation.
If a distinct unannotated reachable byte-error path requires caller context, add only that annotation after reviewing the actual need and include its existing release-pin entry in the approval/review delta.
Do not refactor the adapter while repairing these findings.
[PR policy tests](../../tests/distribution/pr-qualification-policy.test.js) already reject a semantic mutation of every reviewed input and assert 44 members; reuse that independent coverage rather than generating a second expected manifest.

## Exact configuration proposal for later approval

[AGENTS.md](../../AGENTS.md) requires explicit approval for the exact configuration change; approval to prepare this document is insufficient.
The approval request for implementation must name these concrete settings and effects together, with any discovered deviation presented separately.

| Proposed approved change                                                                                                                                                                                                                                   | Behavioral and pipeline impact                                                                                                                                         | Smallest boundary                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Remove `.json-quality.json` `defaults.lintProfile`; retain `schemaVersion: 4`.                                                                                                                                                                             | Removes inert configuration. Coordinated schema rejects the old field rather than silently accepting meaningless input.                                                | One deleted default; no exception, format, normalization or ownership changes.                                                                                                                                     |
| Change `scripts/jsonQuality.js` embedded policy/rule contract: delete profile requirements/properties/propagation; retain remaining options; reject leading UTF-8 BOM at shared decoding. Coordinate `scripts/checkJsonInventory.js` and existing callers. | Repository and packed qualification reject previously hidden bytes. Supported writer preflight fails before writes. Effective lint outcomes otherwise remain the same. | No new encoding setting, profile, mode, exception system or compatibility path.                                                                                                                                    |
| Add root `package.json` `devDependencies["@humanwhocodes/momoa"] = ">=3.3.13"`.                                                                                                                                                                            | Clean development/test installs explicitly supply the already-used token oracle. Existing production/bundle boundaries remain asserted.                                | One development declaration; no dependency upgrade is intended.                                                                                                                                                    |
| Regenerate root `package-lock.json` for that declaration.                                                                                                                                                                                                  | Manifest and lock become reproducibly consistent. The selected package remains 3.3.13 with the recorded integrity if resolution matches the proposal.                  | Only necessary native lock delta; no unrelated refresh, override or manual integrity editing.                                                                                                                      |
| Refresh the existing reviewed hashes in `scripts/distribution/verifyUniversalOntologyMcpRelease.js` for changed inputs.                                                                                                                                    | Admits the reviewed new controls while preserving rejection of later unreviewed changes.                                                                               | Six expected entries: `scripts/jsonQuality.js`, `scripts/checkJsonInventory.js`, `tests/json-quality.test.js`, `.json-quality.json`, `package.json`, `package-lock.json`. All already belong to the 44-member map. |

The hash list must follow the actual reviewed diff, not an assumption that all possible inputs changed.
The current verifier canonicalizes JSON documents, normalizes text CRLF to LF, and hashes archive bytes without text conversion; use its existing semantics.
Do not calculate or record replacement hashes as part of plan preparation, blindly refresh the whole map, change the 44-member count, or weaken negative tests.

Lock generation and clean installation are separately effectful actions to include in future authorization.
After the exact manifest edit is approved, the proposed native generation command is `npm install --package-lock-only --ignore-scripts`; inspect its diff before proceeding.
Then, once installation is authorized, use `npm ci --include=dev --ignore-scripts` and read back the direct package with `npm ls @humanwhocodes/momoa --depth=0`.
The first command updates lock metadata; the second replaces the installed dependency tree and can acquire packages from the registry/cache.
Inspect lifecycle effects first and retain the repository's existing `.npmrc`/source identities.
The native [install](https://docs.npmjs.com/cli/v12/commands/npm-install/) and [clean-install](https://docs.npmjs.com/cli/v12/commands/npm-ci/) contracts explain these distinct effects.
No `npm update`, broad dependency refresh, configuration edit to permit scripts, or toolchain upgrade is proposed.

## Vertical slices and sequencing

The slice numbers follow the original plan's four slices solely for traceability.
Each new slice is independently demonstrable; policy removal and its consumers are one atomic source change, and this follow-up should be delivered as one consolidated candidate after integration.

| Slice                                              | REQ / AC / QA / DEC links                 | Observable increment and proof                                                                                                                                                                                                                             | Release, recovery and cleanup implication                                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLICE-005: reject hidden byte prefixes             | 007; inherited 001–004; DEC-007, 010, 012 | Shared decoder rejects explicit BOM byte vectors; policy/inventory/CLI/packed paths surface failure; valid interior U+FEFF and prior producer envelopes pass; no-write sentinels remain unchanged. Run the JSON suite and relevant packed boundary checks. | No current corpus migration. If an owned artifact fails, retain its bytes and route source/producer repair to its owner. Disposable fixtures are removed after diagnostics are consumed. |
| SLICE-006: own the token-oracle dependency         | 008; inherited 003, 006; DEC-008, 010     | Exact approved manifest/lock delta, package identity readback after authorized clean install, and existing semantic-preservation/idempotence tests pass.                                                                                                   | A reproducible declaration with no intended package-byte change. Preserve install failures and do not qualify from a stale `node_modules` tree.                                          |
| SLICE-007: remove the false profile                | 009; inherited 002, 004; DEC-009, 010     | Profile-free v4 policy and options API operate across repository/bootstrap/packed consumers; stale fields reject; substantive native lint and exception vectors still pass. Run the JSON and Registry metadata suites.                                     | Policy and consumers move together. No dual-version migration or compatibility window; partial state must not be activated.                                                              |
| SLICE-008: qualify the consolidated control change | 010; inherited 005, 006; DEC-010–012      | Review final source/test/docs and lock, refresh only reviewed pins, pass policy mutation/affected distribution tests, obtain the route-required exact-commit native full receipt and final generated-corpus result.                                        | Record scoped approval, commit and source-publication state separately; preserve failures/skips and retained native evidence. Hosted CI, merge and release are distinct later evidence.  |

Obtain exact implementation/configuration authority before SLICE-005 through 007.
A first commit point may record this plan after explicit acceptance and commit authorization, consistent with plan-first delivery; it is not a reason to run a full product qualification on this document alone.
Load the maintained committing skill and HISEW commit procedure at that future commit point.

Implement SLICE-005 and SLICE-007 sequentially under one integration owner because both change shared contracts and tests.
The dependency declaration must be in place and its installation qualified before final test proof; it may precede either source slice once authorized.
Read-only licence review and documentation/oracle review are semantically independent, but this plan grants no further delegation or parallel write authority.
Use targeted feedback during integration and consolidate all planned source, configuration, dependency, documentation and test writers before broad review.

## Focused regression matrix and oracle ownership

Repository tests use actual installed native tools and disposable Git fixtures.
Do not mock TextDecoder, ESLint, Prettier, Ajv, Momoa, npm dependency resolution or the code that decides acceptance.
Existing local HTTP fixtures in package tests represent external artifact transport; retain that real external-boundary isolation rather than making tests contact production services.

| Scenario                                                                                                | Independent expected result                                                                                                                                                                                                 | Primary proof location                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BOM-free UTF-8, malformed UTF-8, leading BOM, BOM-only input and repeated leading marker                | Valid bytes retain exact text; malformed sequences and every BOM-prefixed input reject. Byte admission alone does not become a JSON syntax parser.                                                                          | Shared-decoder vectors in `tests/json-quality.test.js`; include a typed-array/subarray view to retain native input-view semantics.                     |
| All five format contracts with a prefix added to independently accepted bodies                          | The original body satisfies its declared contract; adding `EF BB BF` always rejects before envelope handling.                                                                                                               | Shared presentation tests; retain existing indentation, compactness, CRLF and final-newline negative cases.                                            |
| Literal and escaped U+FEFF in values and a valid interior-key position                                  | Decoder preserves literal characters; lint/format/NFC operations preserve string identity according to their existing contracts. No trimming or blanket rejection.                                                          | Native lint, presentation and normalization vectors using fixed expected bytes/text.                                                                   |
| BOM in the policy, an ordinary untracked source, a tracked source and ignored generated/protected input | Each selected path is detected; errors identify the relative filename and BOM. The policy case rejects during bootstrap.                                                                                                    | Existing disposable inventory/command fixture, with minimal representatives for distinct boundaries.                                                   |
| BOM behind `normalization: "preserve"` or a producer-body envelope                                      | Neither exception bypasses encoding admission; retained input bytes remain unchanged.                                                                                                                                       | Policy/command fixture plus all-contract presentation table.                                                                                           |
| Supported public JSON commands                                                                          | Inventory, lint, presentation check, combined check, producer check, format and explicit normalize all fail on discovered BOM input. Exercise each entry point once rather than a full command/path/contract cross-product. | Existing `runCommand` fixture; error text and exit status are both asserted.                                                                           |
| Writable source ready to change plus a BOM in another protected input                                   | `format:json` and `normalize:json` fail before the first write; independent before/after byte sentinels match for every involved source/output.                                                                             | Native writer/normalizer preflight tests.                                                                                                              |
| Pure normalization                                                                                      | Leading U+FEFF still rejects through the existing native parse; an interior string value retains U+FEFF; collisions, number lexemes and member/array order keep existing behavior.                                          | Existing `normalizeJsonSource` vectors and independent token oracle.                                                                                   |
| Profile-free policy and stale fields                                                                    | New v4 policy passes; `defaults.lintProfile` and exception `lintProfile` each fail the closed schema. No obsolete property appears in resolved contracts.                                                                   | Policy bootstrap/schema fixtures and Registry metadata assertions.                                                                                     |
| Meaningful rule options                                                                                 | NFC defaults, `preserve` behavior, exact empty-key pointers, genuine conflicting overlaps and native-config tampering retain their prior outcomes.                                                                          | Reuse existing native adversarial cases; add only a missing options-propagation case. Expected semantic decisions must not be computed by `jsonRules`. |
| Clean direct dependency and tokenizer behavior                                                          | Native install resolves declared Momoa 3.3.13; member order, array order, decoded strings, `-0`, exponents and decimal lexemes remain independently checked.                                                                | Manifest/lock readback, `npm ls`, existing preservation/idempotence tests. No redundant implementation-mirroring declaration test is required.         |
| Real packed documents and bundle metadata                                                               | Actual package and metadata bytes pass their resolved contracts; a BOM-prefixed mutation rejects. Public dependencies/bundled components and retained notice bytes stay as expected.                                        | Existing MCP npm-package suite, reusing its build/pack/install fixture.                                                                                |
| Reviewed control graph                                                                                  | Accepted inputs pass with 44 members; mutations to the six affected inputs and all previously covered inputs reject.                                                                                                        | Existing PR qualification policy suite and affected release-verifier tests.                                                                            |

The independent verifier owns expected outcomes and assesses mutation sensitivity.
Momoa is independent of the formatter/writer being checked, but it is also used by the ESLint JSON ecosystem; it is not evidence of complete parser diversity.
Literal invalid-byte vectors, exact expected strings, byte sentinels and native consumer/domain tests provide the other oracles.
Never use the updated decoder or formatter to generate the expected rejected bytes or semantic decisions.

## Verification cadence, review and delivery checkpoints

These are commands for a future authorized implementation, not commands executed by this planning task.
Run the narrowest affected group after a relevant edit; do not rerun every group after every slice.

For the shared JSON contract and profile cleanup:

```sh
npm test -- --runInBand --runTestsByPath tests/json-quality.test.js tests/distribution/mcp-registry-server-metadata.test.js
```

After the shared-boundary tests are stable, qualify actual packed bytes once for the consolidated change:

```sh
npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-npm-package.test.js
```

That suite deliberately builds application bundles, packs a tarball, installs it in a disposable directory and starts the local package consumer.
It can write ignored build output and temporary artifacts; inspect these side effects and include them in implementation/test authorization.
It does not authorize npm publication or deployment.
The existing final full suite will exercise the same consumer as part of its required coverage; do not add another standalone pack/build pass solely to duplicate it.

After the reviewed input hashes have been deliberately refreshed:

```sh
npm test -- --runInBand --runTestsByPath tests/distribution/pr-qualification-policy.test.js tests/distribution/universal-ontology-mcp-release-verifier.test.js
```

Use `npm run check:json` for read-only corpus acceptance after the integrated changes.
It already includes inventory, lint and presentation; do not also run all three component commands on the unchanged corpus solely to repeat the same proof.
The fixture tests above still exercise their separate entry-point guarantees.
Check documentation through the existing `npm run check:markdown` entry point, optionally adding `-- --diagnostic-level warning` to reduce informational output.
This performs the full bounded documentation check: the repository wrapper supplies `--inventory git`, which cannot be combined with explicit path selection.
Do not change configuration or scripts to enable a targeted check.
The parent agent owns this documentation check for the current planning task.

The final cadence is:

1. Rebaseline identities, permissions, HISEW ownership, accepted exact configuration scope and dependency selection.
   If the owner requests the first plan commit, create only that explicitly authorized commit.
2. Complete the three source slices, authorized lock generation/clean installation, tests and operational documentation.
   Run focused regressions where the inputs changed, retaining failures and diagnostic context.
3. Review the intended source/control inputs, then deliberately refresh only their existing reviewed hash entries using the verifier's established canonicalization.
   Do not manufacture acceptance by learning hashes from unreviewed outputs.
4. Consolidate the final candidate for the required local correctness/maintainability, scoped security and independent-verification lenses.
   Review the actual byte boundary, rule preservation, dependency provenance, safe-write behavior, hash delta and independent tests.
   No external reviewer is required merely because one is available; any route-required native security assessment follows repository policy and its own authorization.
5. Resolve findings with narrow repairs, affected tests and narrowly scoped follow-up review.
   Do not repeat a completed broad review or full suite without a changed input, failure or remaining concern that justifies it.
6. Once all planned tracked-input writers and reviews are complete, create the final signed implementation commit only with explicit commit authority and the required commit-procedure preconditions.
   Record its commit/tree, changed paths, dependency identities and retained unrelated changes.
7. Run the accepted native HISEW `full` profile once against that exact final commit.
   Its mapped `npm run check:qualification` includes the direct `build:verify` route.
   After the build finishes, run `npm run check:json -- --require-generated` once so newly generated JSON-LD/query output is covered; the ordinary lint phase runs before that final build.
   Record this supplemental generated-output result separately from the native full receipt.
8. Reuse the valid exact-candidate native receipt for handoff through supported HISEW mechanisms.
   Reuse requires unchanged qualified source tree/commit, policy/profile and relevant environment identities; the earlier baseline receipt does not satisfy this gate.
   A new code, test, config, lock or reviewed-input change invalidates the corresponding proof and requires a bounded reassessment plus any route-required fresh final qualification.
9. Only with separate push/GitHub-write authority, publish the scoped commits and update PR 143 if it remains the intended open destination. Wait for naturally triggered required hosted checks and record the actual revision and outcomes. Do not dispatch redundant hosted runs or claim local proof establishes hosted success. Source publication, merge approval, merged-main checks and release/deployment remain separate states.

Use `build:verify`, not `npm run build`, for verification: the repository warns that the regular build route invokes automatic fixes.
Python verification stays within the existing `.venv` through repository entry points.
Do not change project verification profiles or pipeline configuration to make a check convenient.
If a real native gate contradicts the planned single-final-full cadence, report the concrete gate and resolve it before adding redundant verification or inventing reusable proof.

## Compatibility, operations, recovery and retention

The observable activation is the stricter development/release quality gate; no hosted application rollout or database migration is required by the observed scope.
The profile removal changes an internal unreleased policy contract and all its current consumers in one candidate.
Do not activate the document/schema change separately from its consumers.
A late consumer of the obsolete shape fails closed and must be brought to the accepted current contract under explicit authority.

Acceptance signals are concrete: current-corpus checks pass; injected BOM cases fail with path context; supported writers leave all bytes unchanged on failed preflight; current rules/exception behaviors pass; the direct package resolves from the accepted lock; reviewed-input mutations reject; packed and generated products satisfy their real contracts; and final proof names the accepted candidate.
No new telemetry, counters, service or logging pipeline is needed.
The implementing agent observes local failures and artifacts; the repository owner accepts source delivery and separately decides merge/release.
Existing mandatory Linux/Windows JSON jobs remain the cross-platform acceptance route.
Record any unavailable, skipped, cancelled or failed result explicitly.

There is no planned BOM backfill because the observed corpus contains none.
If a future source has a BOM, obtain exact repair authority for that source, especially when it is configuration.
For generated JSON-LD, repair the RDF/input/producer boundary and retain graph validation; for npm output, repair through npm; for retained or third-party content, involve its recorded owner.
Preserve the failing bytes and provenance until the owner has accepted the remediation.
Do not remove a BOM from protected output, relax the default or add an exception without a separate design decision.

Before effectful implementation commands, record task-owned changed paths and relevant identities, preserve unrelated changes and inspect command side effects.
After interruption, inspect actual file diffs, installation state, generated artifacts and retained command results before resuming.
Do not treat a partial install, running process, empty reviewer report or stale receipt as success.
If installation is interrupted, retry the authorized native clean install from the reviewed consistent manifest/lock; it is not necessary to rewrite the lock again unless its inputs changed.
If profile removal is partially applied, complete or reverse only the task's coordinated edits before running an activation gate.

Before publication, an abandoned attempt can reverse its exact task-owned edits while retaining independent user changes and required evidence.
Do not use Git restoration/reset commands to discard working-tree contents.
After publication, prefer an accountable forward fix; a revert is a separately authorized reviewed commit that coordinates policy, callers, dependency declaration/lock and reviewed hashes, followed by the applicable proof.
Reverting the BOM guard reopens the known validation gap, so it must not be described as a safe functional rollback without an owner-approved containment decision.
The dependency declaration can only be reversed coherently with any continuing direct test import.

Resolve the current HISEW external evidence destination before producing implementation evidence.
Keep native receipts, independent review reports, failure diagnostics, approval records and source/hosted identities in their appropriate evidence classes.
Do not create a new `.sdlc/runtime` or `.sdlc/tmp` convention, amend old receipts or write native store files directly.
Remove task-created disposable fixtures, temporary package installations and scratch only when their consumers have finished and evidence has been retained.
Never delete retained reports or generated artifacts merely to make inventory counts or checks pass.
Plan preparation needs no separate phase documents or evidence-directory creation.

## Unknowns, cheapest checks and replan triggers

No unanswered material decision prevents implementation of this accepted plan.
The owner's implementation instruction supplies the exact configuration, required installation, commit and source-publication authority described above; merge and deployment remain separate decisions.

| Question at implementation time                                        | Cheapest discriminating check                                                                         | Replan or escalation condition                                                                                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Has the source, PR or workflow baseline moved?                         | Read Git status/diff, commit/tree, intended PR head/base and supported HISEW applicability/ownership. | Unexpected user edits, another owner, merged/rebased destination or changed route/policy invalidates assumptions. Preserve edits and resolve the conflict.                 |
| Is there now an owned BOM-bearing artifact?                            | Reuse native inventory and inspect only each file's leading bytes.                                    | A protected or identity-sensitive artifact needs owner remediation; a requested BOM exception changes the design and requires an exact decision.                           |
| Is 3.3.13 still the current stable adoption target?                    | Read authoritative registry/version/licence metadata and compare selected lock identity.              | A new stable version, withdrawal, changed rights or material security constraint needs a revised selection proposal; do not silently upgrade or lower the selected target. |
| Does native lock regeneration stay declaration-only?                   | Inspect the focused manifest/lock diff before installation.                                           | Changed unrelated versions, integrity, sources or workspace resolution exceed the approved minimum change. Diagnose and return to the owner with the actual delta.         |
| Are there additional current profile consumers?                        | Scoped `rg` of repository source, policy, tests and active documentation.                             | Published/external consumers or a real intended control/data distinction require an owner design decision. Do not create a shim or bump schema v4 by default.              |
| Is the proposed decoder guard faithful to native inputs?               | Fixed Buffer/typed-view, invalid-UTF-8, BOM and interior-character vectors.                           | A need for streaming state, custom decoding, broad character stripping or expanded encoding support is outside this bounded repair.                                        |
| Is any planned file absent from current review/qualification coverage? | Inspect actual consumer imports, the 44-member map and existing affected tests.                       | A new entry point, workflow, policy member, package boundary or consumer requires a revised approval/proof map; do not assume source similarity establishes coverage.      |
| Can the unchanged package/public boundaries be retained?               | Existing bundle-component, public dependency, notice and actual packed-byte assertions.               | Momoa enters a runtime bundle or distribution, or another package changes, requiring distinct licence/security and packaging assessment.                                   |

Reassess the higher outcome if any proposed shortcut would turn valid Unicode data into a false positive, replace an independent oracle with the implementation, widen writable files, alter a producer envelope, weaken schema rejection, erase ownership history or add unnecessary maintenance modes.
The repair is complete only when the three findings are closed with their acceptance evidence and the reported delivery state matches the actual authorized actions.
