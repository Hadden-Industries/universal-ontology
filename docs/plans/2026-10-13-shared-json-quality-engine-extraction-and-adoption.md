# Shared JSON quality engine extraction and adoption plan

Status: **Accepted for implementation on 14 October 2026; staged gates below remain binding.**
Prepared 13 October 2026 for `Hadden-Industries/json-quality`, Universal Ontology (UO), and WebVOWL.

The intended outcome is one maintained JSON quality engine that both consumers actually use, with complete owned-file discovery, safe source repair, and explicit producer and fixture contracts.
A new shared rule should need one implementation change and attributable consumer qualification, while each repository retains authority over its domain semantics and generated artifacts.
Reducing copied code is useful only if that outcome and the existing safeguards survive extraction.

The user authorized implementation through HISEW on 14 October 2026, including detailed per-file commit messages, commits, pushes, and configuration changes required by this plan.
Commit this plan at the first implementation checkpoint; consolidate before broad reviews, review repair deltas narrowly, and allow at most 30 minutes for all reviews.
The maintained committing skill, Review Agent, and Codex Security are available; use Claude for the final external review.
This instruction accepts the proposed R2 route and implementation scope; unresolved licence choices, exact exception contracts, and configuration values retain their explicit gates.
It does not authorize merges, registry publication, releases, or deployment.
The approvals recorded in the earlier JSON plans applied to the completed UO change and PR 143; they do not authorize this extraction.
All `REQ`, `AC`, `QA`, `DEC`, `CFG`, and `SLICE` entries below are proposed acceptance terms until the owner accepts an exact revision.

## Authority and proposed HISEW route

The repository owner, Maksym Shostak / Hadden Industries, is the decision, exception, adoption, and acceptance owner unless a particular responsibility is explicitly assigned elsewhere.
The future coordinating implementation agent owns integration only after assignment.
Producer owners named in repository policy own the correctness and regeneration of their outputs; the shared package does not take that authority.

The plan follows the installed HISEW planning and routing procedures in `hisew-dev/0.1.0-dev.21`, particularly DRY-01, REU-01, VER-01, LIC-01, VAL-01, NAM-01, NSH-01, SEC-01, and the verification cadence.
UO and WebVOWL both require explicit approval for the exact configuration file and setting before any configuration edit.
Creation of a new package manifest, schema, workflow, or repository policy is a configuration change too.
Implementation approval must identify the accepted configuration rows and any finalized values; a general request to continue cannot be substituted for the repository's exact-change requirement.

**Risk class:** proposed **R2**, pending owner acceptance.
This is an inference from a new public package/API, cross-repository adoption, filesystem write admission, parsing of potentially hostile data, and changes to qualification gates.
No observed requirement establishes an R3 consequence.

**Decision owner:** the repository owner above.

**Reasoning:** a missed input or weakened rule could admit incorrect artifacts; a broad rewrite could destroy canonical or negative-test evidence; an overbroad gate could block both repositories.
An isolated package deployment is reversible before activation, but rewritten data and published package identities require separate recovery.

**Potential blast radius:** the package's CLI/library/plugin consumers, UO source and generated JSON/JSON-LD and packed-target checks, WebVOWL physical and logical corpus documents, local development commands, and both CI completion gates.
Ontology meaning, canonical VOWL representations, schemas, digests, and the distributed application runtimes retain their existing owners.

**Reversibility:** aborting an unactivated candidate is straightforward if old inputs remain retained.
Package downgrade alone cannot restore formatted or normalized bytes.
After accepted cutover, prefer restricting the affected writer or an accountable forward fix; reactivating an obsolete engine requires a separate, qualified recovery decision.

**Principal unknowns:** full logical-corpus findings and presentation contracts, exact expected-negative and opaque-payload entries, operational limits, final licensing clearance, transported-package behavior, and suitable native verification declarations for the new repository.
The prerequisites and cheapest experiments below own these uncertainties.

**Required artifacts:** this accepted plan revision and its requirement snapshot; exact configuration proposals; source/archive/lock provenance and notices; focused and final evidence; substantive review/security reports; consumer adoption and recovery records.
Use existing task/PR records and native evidence storage rather than adding a new project-management system or tracked execution diary.

**Required specialist lenses:** normal correctness and HISEW principles review; R2 independent verification under the actual governing reviewer route; a scoped native security assessment because input parsing, filesystem writes, dependencies, and CI boundaries change; accountable licence/terms review before adopting or distributing the selected graph.
These obligations arise from the routing and engineering methods, not merely from the availability of reviewers.
Use the maintained native providers and available local agents; tool-binding metadata alone does not establish that a provider is unavailable.
An empty or denied successful-looking worker result is not a substantive review.

**Required verification:** focused development feedback, consumer integration at stable seams, transported clean-consumer proof, and one required native full run per final repository candidate after planned tracked-input writers and authorized commits settle.
Generated JSON is checked after its producers run.
Hosted checks and publication proof remain separate evidence classes.

**Required human approvals:** accepted R2 baseline and design; exact configuration and HISEW setup/profile changes; implementation and any data migrations; licence/exception dispositions; commits and pushes separately; and any later merge, registry publication, tag, release, or deployment operation.
This draft does not ask for those approvals while planning is incomplete.

**Maximum sensible autonomy:** current authority permits read-only investigation and this plan only.
After an accepted implementation instruction, proceed within its exact scope and existing ownership, but stop the affected operation for unresolved rights, required configuration values, changed semantic requirements, or unsafe recovery.

**Next lifecycle step:** obtain owner acceptance of the plan/R2 baseline, applicable rights decisions, producer HISEW setup, implementation scope, and exact initial producer configuration rows; then implement and qualify that authorized producer scope.
Admission is staged: the implemented packed artifact in GATE-006 and its final archive identities are outputs of producer work, not prerequisites to writing producer code.
Before a new-representation slice, finalize its research, schema, and exact producer configuration decisions.
Before consumer cutover, finalize and approve the applicable exceptions, qualified archive/lock identities, and consumer CI/configuration rows.
When implementation and committing are later authorized, commit the accepted plan at the first implementation checkpoint using the maintained committing skill and applicable HISEW prerequisites.

## Observed baseline and evidence boundaries

These identities were checked during planning on 13 October 2026.
Recheck them, working-tree ownership, and instructions before mutation.
All four source repositories were clean before this plan was added.

| Repository       | Local root and source identity                                                                 | Observed state                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UO               | `C:/Users/maksy/GitHub/universal-ontology`, `main`, `015a356e1fac8bcea3fcfb213954a191ab6f6851` | PR 143 is merged. Current JSON policy is schema 4. Root licence is MIT.                                                                                                           |
| WebVOWL          | `C:/Users/maksy/GitHub/webvowl`, `main`, `c9c3f3983494ac7d526c499313357c401490410f`            | Root and VOWL workspace are AGPL-3.0-only. Existing generic format commands omit JSON.                                                                                            |
| json-quality     | `C:/Users/maksy/GitHub/json-quality`, `00874bcb4b441d9c8133a56688cc75970453c162`               | Repository contains `.git` and GNU AGPL v3 `LICENSE` only. No existing manifest, API, package release, workflow, or project instructions can be assumed.                          |
| markdown-quality | `C:/Users/maksy/GitHub/markdown-quality`, `cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2`           | Manifest says `@hadden-industries/markdown-quality` 1.0.3, AGPL-3.0-only. Its documentation explicitly distinguishes current development contracts from published 1.0.3 behavior. |

The parent freshly inspected HISEW applicability and profiles read-only.
UO is personal/active, with no newly selected risk route; its preceding work was handed off.
`json-quality` was unregistered during planning; on 14 October it was registered with personal controls and no verification profiles because only `LICENSE` exists.
Actual verification declarations remain a prerequisite to producer implementation.
WebVOWL has a pre-existing R2/full obligation associated with baseline `79ae9c33...`, which is different from the current Git HEAD.
Do not adopt, reroute, complete, or otherwise mutate that execution without its actual task/session authority.
Coordinate distinct repository executions under one accepted cross-repository plan; merely reading status does not transfer ownership.

| Repository   | Observed native profile declarations                                                                                                                                                                            | Implication for this work                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| UO           | `focused`: `npm run test:unit`, 600 seconds; `affected`: `npm run test:consumer`, 600 seconds; `full`: `npm run check:qualification`, 1,800 seconds. Legacy-inherited declarations under shared project policy. | The first two omit relevant tooling/distribution checks. Name the required focused suites explicitly; do not infer coverage from the profile names. |
| WebVOWL      | `focused`: `npm run lint`, 600 seconds; `affected`: `npm run test`, 600 seconds; `full`: `npm run check`, 600 seconds. Worktree-local declarations under shared project policy.                                 | The new corpus checks must be measured before assuming the existing timeout and command composition suffice.                                        |
| json-quality | No registered project profile.                                                                                                                                                                                  | Propose real focused, affected, and full commands with different costs and coverage; separately approve registration and exact declarations.        |

Historical UO native run `bfc64100-e3c6-48ff-8d79-00a0ff72bacb` qualified source `aaadfc7c278902aae670667eba321da0c5a3eb55`: 97 JavaScript suites, 1,962 passed tests plus one skip, and 219 Python tests plus five skips; lint, formatting, and build passed.
PR validation and CodeQL passed for that delivered change.
Those results do not qualify this plan's future extraction, installed package, consumer migrations, or release.

### Current UO authority and actual callers

At the observed baseline, the reusable implementation is concentrated in [shared contracts](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/jsonQuality.js), [inventory](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/checkJsonInventory.js), [the operation runner](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/runJsonQuality.js), and [the serialization-identity rule](https://github.com/Hadden-Industries/universal-ontology/blob/015a356e1fac8bcea3fcfb213954a191ab6f6851/scripts/eslint/noJsonStringifyIdentity.js).
Their current generic responsibilities include strict byte decoding, native JSON lint composition, NFC inspection/normalization, policy validation/resolution, producer presentation checking, complete physical discovery, and guarded write selection.
`JSON_ROOT` and the hard-coded `dist/` presence checks are UO-specific and must not become package-relative repository discovery or universal generated-output requirements.

Direct shared-module consumers found in current source are `eslint.config.js`, the inventory/runner, `tests/json-quality.test.js`, `tests/distribution/universal-ontology-mcp-npm-package.test.js`, and `tests/distribution/mcp-registry-server-metadata.test.js`.
The identity rule is imported by ESLint and its rule tests.
The selector, reviewed release-control manifest, policy tests, package scripts, and development documentation also refer to the current paths.
Search the complete current tree again before deletion; these observations are a starting map, not permission to discard an unexamined caller.

`scripts/build/fullOntologyAssets.js` and `packages/universal-ontology-mcp-server/scripts/verifyUniversalOntologyMcpApplicationBundle.js` do **not** currently import this shared module.
They own independent build/domain/runtime checks; generic JSON extraction does not justify changing them.
Packed-package tests already inspect actual installed JSON bytes and map them back to their final UO policy paths, including the Oxigraph notice and application-bundle metadata.
Retain that meaningful installed boundary while changing its library import.

`scripts/distribution/verifyUniversalOntologyMcpRelease.js` and `tests/distribution/pr-qualification-policy.test.js` bind an explicit 44-input reviewed control graph.
The current development prose still says forty-two; implementation should reconcile the documentation with the deliberately reviewed final membership.
Replacing local engines with archives, a lock, policy, and adapters changes that graph.
Neither automatic hash refresh nor retaining inert old wrappers solely to preserve old pins is acceptable.

### WebVOWL assessment: measured facts and remaining work

The parent performed a read-only assessment against the stated source.
No repository installation, build, or format migration was used to manufacture these results.

| Surface                                                 | Measured result                                                                                                                                                                                                               | Planning consequence                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracked physical JSON-like paths                        | 1,228 files, 105,817,885 bytes: 1,222 `.json`, two `.jsonld`, four `.jsonl`.                                                                                                                                                  | The package must handle a much larger corpus than a small configuration repository.                                                                                                |
| Bounded owned-tree discovery                            | 1,247 physical paths, including 16 ignored deployment outputs and three local tool settings. Dependency, Git, and environment boundaries were inventoried rather than traversed; tracked paths were reconciled independently. | This is repository-scoped evidence, not an all-machine inventory. Generated output cannot disappear through `.gitignore`. Local machine settings need explicit boundary decisions. |
| Current UO byte/lint contract on 1,224 strict documents | No UTF-8, leading-BOM, or syntax failure; 42 files fail substantive rules.                                                                                                                                                    | Copying UO policy unchanged is not a valid adoption.                                                                                                                               |
| Empty default namespace                                 | 33 files have the empty key at `/header/prefixList/`: `src/app/data/personasonto.json` and 32 Java-reference outputs.                                                                                                         | Use an exact semantic pointer exception with owner/reason and precise path scope. Renaming this key changes namespace meaning.                                                     |
| Non-NFC lexical data                                    | 11 values across four files: `docs/owlapi-js/conformance/generated/w3c-jsonld.json`, `w3c-trig.json`, `w3c-turtle.json`, and `packages/vowl/conformance/supplemental/negative/vectors/language-non-ascii-subtag/source.json`. | Preserve justified external/negative lexical identities read-only; do not normalize a negative test into a different test.                                                         |
| Unicode noncharacters                                   | Six U+FDD0 diagnostics in five files: `bundles/field-contract-07.json`, `-13.json`, `-23.json`, `-24.json`, and `conformance/negative/noncharacter-text/source.json` under the VOWL corpus.                                   | Distinguish embedded payloads from container metadata and exact expected-negative findings. No directory-wide waiver.                                                              |
| Ordinary Prettier comparison                            | 814 of 1,224 strict documents differ: eight controls, 22 documentation artifacts, 722 conformance files, 62 source artifacts; no parser failures.                                                                             | This is presentation mismatch, **not** evidence that 814 files should be rewritten. Establish producer and preservation contracts first.                                           |
| Bundled corpus                                          | `storage-inventory.json` lists 7,227 logical artifacts in 64 physical bundles, including 5,851 logical `.json` members.                                                                                                       | Checking the outer JSON does not check encoded JSON. Full logical-byte assessment remains outstanding.                                                                             |
| JSON Lines                                              | Four files, 249 records; native `JSON.parse` accepts each and no leading BOM was observed.                                                                                                                                    | This does not establish duplicate-key, Unicode, exact-number, or presentation conformance. Per-record native quality checking is required.                                         |
| Serialization-identity guard                            | 68 diagnostics across 28 of 407 inspected JavaScript-family files in current lint path prefixes.                                                                                                                              | Diagnostics are candidates, not 68 confirmed bugs; a comparison can report both operands. Adjudicate each semantic use.                                                            |

The JSONL paths are the two `docs/owlapi-js/provenance/history-reconstruction/phase19A/{control,operations}/ref-operation-journal.jsonl` files, and `packages/vowl/conformance/supplemental/compatible-artifact-v1/vectors.jsonl` and `compatible-artifact-v2/vectors.jsonl`.
Their observed record counts are one, 16, three, and 229 respectively.
The largest JSONL family is approximately 6.8 MB; use exact measured byte and record sizes when selecting limits.

Known presentation distinctions already invalidate a one-preset migration: compact canonical examples and `canonical.json` can have no final LF; schema producers use native two-space JSON plus LF; legacy examples have their own indentation; retained Java/Jackson outputs include CRLF, no final terminator, and different colon/array layout.
UO's existing compact contract requires a final LF, and its Prettier body contract does not establish Jackson compatibility.

Reuse `packages/vowl/conformance/storage.mjs` and `packages/vowl/scripts/verify-corpus-storage.mjs` for member reconstruction and independent path/size/hash preservation.
Do not build a second corpus storage implementation, restore obsolete loose copies, or change bundle member text, inventory hashes, and generated expectations to get a green result.

## Scope, requirements, and acceptance

The work includes extraction, the minimum public package/delivery surface, UO adoption, and WebVOWL adoption with the additional capabilities its actual corpus requires.
JSONL framing, logical documents, exact expected-negative validation, and narrow opaque-payload preservation are new capabilities; they are not described as already implemented by UO.
Their acceptance is separate from extraction parity, and unresolved research or contracts block their implementation/adoption slice.

Non-goals are a new JSON parser or formatter, canonical JSON or RDF canonicalization, a universal schema registry, generic semantic-equality helpers, wholesale corpus rewriting, new Python/native executables, a policy service, a general plugin framework, replacing either CI architecture, adopting other repositories, or automatically releasing to npm.
JSONC and JSON5 remain detected and refused until separately qualified; their presence must never be silently ignored.

| Requirement                                                    | Proposed acceptance criterion                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001: One authority for shared JSON knowledge.              | AC-001: both consumers invoke the installed package for byte admission, native lint composition, policy resolution, generic presentation, normalization, and the identity guard. No active copied engine or fallback remains after accepted cutover.          |
| REQ-002: All owned JSON is checked by default.                 | AC-002: tracked, untracked, ignored-generated, newly added, hidden, and tracked-inside-boundary inputs are accounted for without an admission allowlist; unsupported dialects and missing expected outputs fail explicitly.                                   |
| REQ-003: Preserve UO's established quality contract.           | AC-003: the compatibility corpus retains all accepted/rejected byte, syntax, duplicate, number, Unicode, key, NFC, normalization, and five existing presentation decisions. Any intended interface change has a named decision and migration test.            |
| REQ-004: Separate checking from effects.                       | AC-004: check/inspect/document operations acquire no tools and write no checkout files; format and normalize preflight the complete relevant corpus before the first write, reject protected inputs and changed preimages, and report actual partial effects. |
| REQ-005: Repository owners retain producer/domain contracts.   | AC-005: schema, RDF graph, canonical VOWL, digest, cursor, storage, and downstream runtime tests remain authoritative; protected outputs are repaired at the owning source/producer.                                                                          |
| REQ-006: Inspect WebVOWL's complete relevant representations.  | AC-006: all physical documents, all JSONL records, and all inventory-declared logical JSON members are reconciled. Expected-invalid and opaque-payload entries have exact identities, owner/reason, and fail-closed independent checks.                       |
| REQ-007: Prevent accidental order-dependent identity.          | AC-007: a single package ESLint rule preserves UO detection/exception behavior; WebVOWL findings are individually repaired or justified with narrow byte/digest/ordered-tuple contracts and appropriate tests.                                                |
| REQ-008: Reproducible, attributable package adoption.          | AC-008: each consumer uses a qualified retained archive and frozen native lock with full producer source identity; a clean installation outside all sibling checkouts exercises public CLI/library/plugin exports.                                            |
| REQ-009: Honest diagnostics and operational limits.            | AC-009: versioned results distinguish findings, operational failure, inspected scope, expected findings, incomplete coverage, and actual writes; bounded failures cannot become success or conceal unchecked inputs.                                          |
| REQ-010: Preserve and extend qualification gates deliberately. | AC-010: every newly required local/hosted obligation is selected and enforced at the right revision, Linux/Windows JSON coverage survives, post-producer checks run, and historical receipts cannot satisfy the new contract.                                 |
| REQ-011: Preserve authority, rights, and recoverability.       | AC-011: configuration/setup/actions have the required exact approval; origin notices and licences survive; adoption can be aborted before activation; post-cutover repair does not silently resurrect superseded code.                                        |

## Reuse, runtime selection, and rights

The 10 October research response at `C:/Users/maksy/Downloads/2026-10-10-json-quality-tooling-research-brief-response.md` was inspected as historical selection context.
Its layered model and caution about generated/negative artifacts still apply.
Its cited versions and pre-PR-143 UO inventory are historical: preserve that dated response as evidence, and use the refreshed selection and dependency ownership below for implementation.
The earlier portfolio audit was static and did not qualify all repositories at runtime.

Fresh read-only registry metadata checked by the parent on 13 October reports `@eslint/json` 2.1.1, ESLint 10.12.0, Prettier 3.9.10, Ajv 8.20.0, and `@humanwhocodes/momoa` 3.3.13.
These match the intended current native stack; the registry metadata is evidence of versions and declared licence identifiers, not completed rights clearance or successful integration.
On 14 October, a read-only recheck of the npm registry confirmed Prettier 3.9.10 and `@eslint/json` 2.1.1 as the latest releases.
UO already declares `prettier: ">=3.9.10"` and `@eslint/json: ">=2.1.1"`; its root lock and installed tools resolve those versions.
WebVOWL's root lock also resolves Prettier 3.9.10, but its manifest and root lock declaration still allow `>=3.9.9`.
Include the smallest floor correction to `>=3.9.10` in CFG-WV-004's exact configuration proposal, refreshing the selected release if it changes before adoption; do not treat the historical response as an instruction to downgrade either repo.
The shared module replaces consumer-owned JSON control composition, while retaining the official `@eslint/json` implementation as its own runtime dependency.
Keep UO's already-current direct dependency until its remaining imports move; remove it only under CFG-UO-004's direct-import proof, rather than performing a redundant interim upgrade or prematurely removing it.
The official [Node download page](https://nodejs.org/en/download) and [release policy](https://nodejs.org/en/about/previous-releases) identify 24.21.0 as latest LTS, 26.11.1 as Current, and 22.23.3 as another supported LTS at planning time.
Both consumers currently declare 24.21.0 in `.node-version`.
The owner additionally selected Node 26.11.1 support on 14 October: qualify Node 24 at 24.21.0 or newer within Node 24 and Node 26 at 26.11.1 or newer within Node 26 on Windows x64 and Linux x64.
Retain Node 24 as the reference toolchain; do not add Node 22 or unqualified future major lines by copying Markdown's matrix.
Refresh stable/LTS and dependency identities before actual adoption; unavailability on the host is an integration gap, not authority to downgrade.

| Capability                                                  | Reuse and residual custom responsibility                                                                                                                                                 | Evidence and open gate                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON grammar, decoded duplicate names, native unsafe values | Continue the official `@eslint/json` language and ESLint APIs. Do not implement a parser or replace native rule semantics.                                                               | [Official plugin](https://github.com/eslint/json) documents strict JSON, JSONC, JSON5, and native rules; JSONL needs framing around its strict language. Preserve current rule vectors.                                                        |
| Formatting                                                  | Continue Prettier's supported API/CLI and explicit `json-stringify` options. Native serialization checks remain appropriate only for producers that actually emit those bytes.           | [Prettier API](https://prettier.io/docs/api); UO token oracle and producer fixtures establish the exact required behavior.                                                                                                                     |
| Policy/result schema validation                             | Continue strict Ajv validation, with local shipped schemas, no remote resolution, coercion, defaults, or data mutation.                                                                  | [Ajv options](https://ajv.js.org/options.html); inspect exact installed terms and strict-mode behavior at implementation.                                                                                                                      |
| UTF-8, paths, filesystem, Git metadata                      | Native Node decoding, filesystem/path APIs and native Git inventory; preserve fatal decoding and explicit leading-BOM rejection.                                                         | Existing UO code and tests; [Node TextDecoder](https://nodejs.org/download/release/v24.21.0/docs/api/util.html#new-textdecoderencoding-options). No replacement decoder or shell parser.                                                       |
| Identity misuse detection                                   | Move the bounded local rule onto its public plugin surface using ESLint's parser/scope/rule-test APIs.                                                                                   | [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules); no general interprocedural taint engine.                                                                                                                            |
| JSONL                                                       | Reuse Node byte/stream primitives for record framing and run the same native strict JSON pipeline per record.                                                                            | [JSON Lines format](https://jsonlines.org/) requires UTF-8, a valid JSON value per line, and defined line separation. Research/qualify exact framing, bounds, and error locations before custom work.                                          |
| Logical corpus bytes                                        | Reuse WebVOWL's actual `createCorpusReader`, storage verifier, and independent inventory. Feed owned byte buffers and canonical member identities to a public read-only API.             | Full assessment of 5,851 JSON members is pending; no parser substitution is justified by the physical scan.                                                                                                                                    |
| Expected negatives and opaque payloads                      | Compose native diagnostics and existing corpus provenance rather than disabling checks or making another validator.                                                                      | New precise admission/accounting contract requires the discriminating experiments below; never infer expected findings from the candidate's current failures.                                                                                  |
| Alternatives                                                | Retain the prior assessment of Biome, `eslint-plugin-jsonc`, and schema-only CLIs: none has demonstrated a reason to replace the qualified native stack for these two Node repositories. | Recheck material changes if the residual requirements cannot be met through supported extension. Existing `@streamparser/json` and `canonicalize` in VOWL remain domain tools, not implicit replacements for duplicate-aware quality analysis. |

The proposed package owns exact selected runtime dependencies on ESLint, `@eslint/json`, Prettier, and Ajv because its installed CLI/library executes them.
Declare `@humanwhocodes/momoa` directly as a development dependency while the independent token-oracle tests import it; do not rely on its transitive presence through `@eslint/json`.
The owner selected `>=` declarations for development dependencies on 14 October; declare the verified Momoa floor as `>=3.3.13` and freeze its resolved version/integrity in the native lock.
If implementation introduces a production Momoa import, move its declaration to runtime dependencies and justify the extra parse boundary.
Use native npm lock generation after approval; freeze exact versions and integrity, inspect the resolved transitive graph, and prohibit acquisition during ordinary product operations.
Consumers retain their own ESLint/Prettier/Ajv dependencies for their separate JavaScript, style, and domain responsibilities.
Do not remove a consumer dependency merely because the shared package also uses it.
Qualify any selected tool-version change against the existing JSON behavior and affected non-JSON consumers; use a read-only formatting comparison before any approved rewriting and retain independent byte/token preservation checks.
Do not combine a version refresh with unrelated dependency, lockfile, or bulk formatting changes.

Preserve `json-quality/LICENSE` exactly.
The owner selected AGPL-3.0-only on 14 October and clarified that UO is the organization's own code: do not create a UO third-party notice or `LICENSES/universal-ontology-MIT.txt` for this extraction.
Retain source commit/path provenance as engineering evidence, with AGPL-3.0-only declarations in the shared package and the existing UO repository licence unchanged.
Third-party notices cover actual upstream dependencies and any separately copied third-party code.
The owner must inspect the actual combined package, notices, source-delivery obligations, distribution model, and exact direct/transitive terms before activation or publication.
Keep UO's application/workspace/runtime licence declarations unchanged; copied Markdown implementation, if any, carries its original AGPL attribution.
Prefer adapting its documented design and native APIs over copying its execution/observer infrastructure.

## What to take from markdown-quality

The inspected local evidence includes `README.md`, `docs/centralized-contracts.md`, `docs/consumer-guide.md`, `docs/ci-trust.md`, `docs/support-and-release.md`, `docs/release-operations.md`, and the actual quality/configuration/documents/replacement/result/execution/packing sources.
No file named `docs/plans/centralize-producer-contracts.md` exists in the inspected revision; use the actual centralized-contracts guide and implementation history rather than citing an invented plan path.

| Treatment   | Design lesson                                                                                                                                                                 | JSON application                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adopt       | One authority for scope and effective rules; logical documents use the same policy and final canonical path.                                                                  | Mandatory physical inventory plus explicit additional logical records; no consumer-supplied list may replace filesystem/Git reconciliation.                                                            |
| Adopt       | Closed versioned configuration/result schemas and semantic result validation.                                                                                                 | Reject unknown versions/fields, inconsistent counts/status, duplicate identities, missing observations, and writes claimed by read-only operations.                                                    |
| Adopt       | Installed identity differs from source manifest version.                                                                                                                      | Bind full clean producer commit, archive digest, lock integrity, and observed installed versions; never identify an archive solely as version `1.0.3` or a future JSON version.                        |
| Adopt       | Real package and clean-consumer qualification.                                                                                                                                | Exercise only exported entry points from a transported archive without sibling repositories or source-relative paths.                                                                                  |
| Adopt       | Complete preflight and honest replacement results.                                                                                                                            | Preserve bytes before effects, verify preimages, and report changed/unchanged/unprocessed paths; make no whole-batch transaction claim.                                                                |
| Adapt       | Root and isolated installations are separate consumer boundaries.                                                                                                             | Prefer isolated `tooling/json` in both repositories and qualify the narrow public-export bridge required by ESLint/tests/adapters.                                                                     |
| Adapt       | Trusted candidate data and credentials remain separate.                                                                                                                       | Run ordinary checks without write/publication credentials; no arbitrary modules or commands named by candidate JSON policy. Keep normal PR source execution inside its existing unprivileged boundary. |
| Adapt       | Finite operational controls and diagnostic limits.                                                                                                                            | Measure the 105 MB physical corpus and expanded logical corpus first. Do not import Markdown's 8 MiB transport or 32 MiB batch defaults.                                                               |
| Do not copy | Snapper, native platform packages, Python observers, multi-runtime release matrices, reusable trusted-workflow transport, archive orchestration, and a qualification service. | A single Node package needs none of these merely for symmetry. Add only a demonstrated requirement with a revised plan and exact configuration approval.                                               |

UO, WebVOWL, Google, and OwlAPI currently retain Markdown tarballs in isolated `tooling/markdown` projects with frozen locks.
Their command options differ, and this observation does not prove every latest Markdown producer contract has been adopted.
WebVOWL's `util/markdownIntegration.probes.mjs` uses `createRequire` rooted at the isolated manifest and resolves the public package export; that is a concrete small precedent for the JSON import bridge.
Google's separate `registryUpgradeTarget` is a policy marker, not the identity of its installed archive.

## Proposed architecture and ownership

### DEC-001: a single ESM package with public CLI, library, and ESLint export

Use the proposed name `@hadden-industries/json-quality` and binary `json-quality`, subject to checking registry/package-name availability before any publication decision.
The repository is already created; this plan does not create it or assume its registry namespace exists.
Use native JavaScript modules and Node's existing test runner in the producer; add no transpilation or native build layer without a concrete need.

Proposed public exports are the root library, `./eslint`, `./configuration-schema`, and `./result-schema`.
Export only documented contracts; disallow deep source imports through the package export map.
The root library should expose operations equivalent to `runJsonQuality`, `inspectJsonInventory`, `checkJsonDocument`, `normalizeJsonSource`, and `validateJsonQualityResult`.
Final names must describe effects precisely: checking bytes, planning normalized text, and writing source are different operations.
This is a contract sketch, not prescribed function signatures or complete proposed code.

The CLI supports `check`, `inventory`, `format`, and explicit-path `normalize`; retain distinct lint/presentation/protected-producer operations where needed to preserve the existing consumer npm commands.
The owner clarified the verb boundary during implementation: `check` enforces quality, whereas `inventory` reports scope and resolved contracts with analysis phases explicitly unperformed; remove the redundant `inspect` command without an alias.
Resource defaults must be overridable through policy and per-invocation CLI/API settings, with an explicit no-limits bypass that leaves every quality rule and write safeguard enabled.
Use shared operation implementations, not separate CLI and library rule engines.
Malformed arguments, unsupported modes, inaccessible inputs, or invalid configuration fail before writes.
Machine output is an opt-in versioned result; human output names actionable paths and owning producer instructions without dumping JSON payloads or secrets.

### DEC-002: package-owned mandatory analysis, repository-owned exceptions

The package owns strict byte/syntax/interoperability rules and the standard JSON presentation preset.
It uses native ESLint with package-supplied configuration and Prettier with explicit package options, without executing a consumer's JavaScript ESLint/Prettier configuration to decide JSON admission.
It does not load arbitrary remote schemas or plugins from policy.
This replaces UO's current reconciliation against root native JSON options with a deliberately different boundary: changing or disabling a root ESLint rule can no longer weaken the package check.
Prove that property with tamper tests and preserve direct-formatter write guards.

The consumer's `.json-quality.json` remains the sole authority for repository exceptions, protected outputs, representation contracts, and explicit external boundaries.
The package supplies a new closed public schema version 1, with an explicit migration from UO's local schema 4; the numerical versions belong to different documented contracts.
Support one current schema at activation, not a dual-version fallback.
The migration translates every existing exception and detects loss/conflict; an unconverted local schema 4 file is an actionable failure.
Bootstrap policy bytes through strict native checking before Ajv, preserving duplicate-key and BOM rejection.

The existing mandatory defaults remain strict `.json`, `.jsonld`, and `.sarif`, all-string NFC, meaningful keys, standard presentation, and writes only for eligible authored sources.
Each deviation requires a nonempty owner and reason.
Contradictory matching exceptions fail closed, and tracked files cannot be hidden by an external boundary.
Existing JSON Pointer semantics, including npm's exact `/packages/` exception, remain defined and tested.
Do not add a universal `disableLint`, permissive format mode, or catch-all include list.

### DEC-003: isolated tools with one minimal resolution boundary per consumer

Use `tooling/json/package.json`, its native lock, and a retained qualified package archive in both consumers.
Do not add `tooling/json` to application workspaces or runtime dependencies.
A small `tooling/json/public-api.mjs` module may resolve/re-export only the documented package library and ESLint export from that isolated installation.
It must have no rule, policy, selection, formatting, fallback, or installation logic.
This is an explicit deployment-resolution boundary, not a compatibility copy of the old UO engine.

Repository command adapters live at predicted paths `scripts/runRepositoryJsonQuality.js` in UO and `util/runRepositoryJsonQuality.mjs` in WebVOWL.
They supply the repository root, strictly parse the existing npm command modes, attach repository-owned generated-output/corpus contracts, invoke the public engine, and return its validated result/exit outcome.
They cannot replace mandatory discovery or post-process a failed shared result into success.
Keep adapter data/results closed and validated at the public boundary; malformed, duplicate, missing, or noncontained identities fail.

The alternative is a root development dependency, which has simpler resolution and fewer installation steps.
Isolation is recommended because it follows existing local adoption practice, separates package-owned JSON tool versions from application tooling, and makes the UO shipped-runtime boundary explicit.
It costs an extra small lock/install boundary and a real bridge test; if implementation shows these costs exceed the benefit, re-decide this single boundary before configuration changes rather than creating both layouts in production.
Isolation is not a legal clearance or sandbox claim.

### DEC-004: minimum package transport before optional public release

Create a clean-source archive through reviewed native packing in an owned external evidence/temporary destination.
Retain a small provenance record containing full producer commit/tree, source-cleanliness result, package name/version, archive SHA-256, npm integrity, and dependency-lock identity.
If provenance is embedded during packing, generate it in a staging copy rather than dirtying the qualified producer checkout; document that generated membership in the pack verifier.
Do not insert a self-referential archive digest into the same archive's identity record.

Install the exact archive into each isolated tool project after explicit installation/lock authority.
Use an unambiguous archive basename including the selected version and source identity, and never replace an already adopted archive path with different bytes.
Committed dependencies use a retained repository-relative archive, never `file:../../../json-quality`, a symlink, or a moving branch.
Qualified source adoption does not require a public npm release.
An eventual registry release must have a separately approved version/channel and credential/provenance/readback procedure; this plan does not authorize one.

### DRY decision record

| Shared knowledge or distinct domain                  | Current authority and latest consumers                                   | Strategy, ownership, and drift control                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON byte/rule/presentation/normalization contract   | UO modules and callers at the stated HEAD; WebVOWL is the next consumer. | Move once into the package; adopt the same qualified source contract in both consumers. Retained old code is historical evidence, not an active fallback.                   |
| Policy schema and operation/result meaning           | Currently local UO code; new package creates a public boundary.          | Ship authoritative schemas and semantic validators. Derive configuration use and diagnostics from one policy context per operation.                                         |
| JSON serialization as identity                       | UO ESLint rule plus both repositories' JS consumers.                     | One exported rule and exception grammar; local code owns whether its identity is bytes, digest, ordered tuple, or semantic value.                                           |
| Generated-output inventory and producer presentation | UO ontology/query/distribution owners and WebVOWL VOWL/Java/Vite owners. | Keep declarative repository exceptions and narrow trusted adapters; shared engine enforces generic admission. Distinct producer meanings are not duplicated generic policy. |
| Bundled corpus representation                        | WebVOWL storage reader and independent manifests.                        | Reuse that reader and verifier; package receives logical documents and attributable field mappings, not another storage parser.                                             |
| Schema/RDF/canonicalization/cursor/hash semantics    | Existing consuming modules, schemas, and standards.                      | Deliberate separation. Preserve actual consumer tests; ordinary JSON equality or formatting does not become their oracle.                                                   |
| Consumer shell wiring and locks                      | Each repository's installation and CI boundary.                          | Small local wiring is justified deployment knowledge; public-export/identity probes catch drift. No new policy service or shared operational framework.                     |

## Detailed behavior and safety contracts

### DEC-005: preserve quality decisions and strengthen effect accounting

Extraction parity includes fatal UTF-8 decoding, explicit rejection of a leading BOM, and preservation of interior U+FEFF as data.
Strict grammar rejects comments, trailing commas, non-JSON numbers, and escaped-equivalent duplicate keys.
Keep native overflow/underflow/subnormal/surrogate checks and the existing additional test for mathematically integral numbers outside the safe integer range regardless of exponent or decimal spelling.
An exact-integer decision must not first round the lexeme through binary64 or expand an unbounded exponent.
Do not advertise exact arbitrary-decimal arithmetic.

Meaningful-key checking rejects empty, whitespace-only, and surrounding-whitespace keys, except for exact owned empty-key pointers.
NFC applies to decoded keys and string values at every depth, including scalar roots and JSON-LD, unless a precise preservation contract applies.
Normalization has an explicit source path list, collision preflight, and a pure source-input operation that producers can call.
It preserves numeric lexemes, member/array order, and non-string tokens; it never silently sorts keys or trims names.
JSON-LD repairs still begin at the owning RDF source and retain graph verification.

Formatting preserves decoded string meaning and numeric lexemes and does not perform NFC repair.
Keep Prettier's supported preservation/debug-check boundary and the independent token regression oracle.
Preflight all selected inputs and required protected-producer checks before starting writes.
The package writer must record the original regular-file identity and bytes, reject unsupported links or changed preimages, and recheck immediately before replacement.
Use native filesystem primitives with exclusive task-owned temporary files if replacement staging is needed; qualify Windows and Linux failure behavior and preserve relevant permissions.
This per-file replacement/preimage/reporting work is a deliberate strengthening inspired by Markdown, with its own tests, rather than a claim that UO's present native CLI writer is already a transactional engine.

Do not claim whole-batch atomicity.
If a later replacement fails, return nonzero with completed, unchanged, failed, and unprocessed paths; preserve the actual files and failure evidence.
The caller may resume only after rereading current bytes and redoing admission, not by replaying an assumed all-or-nothing transaction.
A process killed before it can report leaves an unknown/incomplete operation requiring inspection.
Concurrent writers are outside the supported guarantee; containment and preimage checks reduce accidental damage but are not an OS sandbox or proof against every race.

### DEC-006: physical and logical inventory are cumulative

The normal repository check always reconciles native Git's indexed inventory with a filesystem walk of the owned tree, including untracked and ignored-generated files.
External boundaries are explicit owner/reason entries and are reported when encountered.
Tracked entries inside them remain included and protected from generic writes.
Unmerged, missing, case-colliding, path-traversing, or nonregular selected entries fail explicitly, with literal argument handling on both platforms.
Do not use `.gitignore`, `.prettierignore`, root ESLint globs, or a custom adapter list as a checking allowlist.

Adapters may add logical documents and expected generated artifacts; they cannot remove a physical document.
Each logical document has a stable canonical identity, bytes, representation/dialect, and provenance to a physical producer/container or an explicitly supplied in-memory producer request.
For repository checks, reconcile declared logical inventory against actual returned members: missing, extra, duplicate, unsafe, or inconsistent members fail before success.
Do not silently deduplicate two sources that claim one canonical path; an explicitly declared storage relationship must explain them.
Logical operations are read-only by default and never create a checkout file merely because their final path is supplied.
Any future producer use of returned normalized content must separately enforce its domain and publication contract.

For UO's existing packed-package proof, use each installed file's actual bytes with its final repository policy path, preserving the distinction between installed location and canonical contract identity.
For WebVOWL, use `storage-inventory.json`, `createCorpusReader`, and the storage verifier; generic outer-file inspection remains mandatory in addition to logical checks.

### DEC-007: JSON Lines is a representation with per-record checks

Introduce a closed `json-lines` representation for `.jsonl` and `.ndjson`, with strict JSON analysis of every record and physical-file/record/line locations in diagnostics.
Do not claim that native `JSON.parse` alone is adequate; use the same duplicate-aware and interoperability-aware native analysis as a standalone JSON document.
Test LF, CRLF, a permitted absent final terminator, escaped newline characters inside strings, scalar values, leading/inter-record BOMs, blank records, malformed records, and final/truncated input.
The accepted framing rule must distinguish a final terminator from an empty record and must not discard whitespace-only records silently.
Bound input bytes and individual record size before an unbounded line accumulator or parser allocation.

The observed journals and vector streams are initially read-only and preserve record order, envelope, and exact history bytes.
A complete JSONL check validates all records and reports their count; a failure in an early record cannot lead to a complete-pass claim for later records.
No ordinary multiline Prettier rewrite is permitted.
Select each producer's actual record presentation contract or explicit byte-preservation contract; generic formatting/normalization of an entire JSONL file is outside the initial writer scope.

### DEC-008: expected negatives and opaque payloads stay narrow and observable

Expected-negative validation is a new explicit contract, not suppression of arbitrary errors.
An entry identifies the exact physical or logical document, independent retained content identity where applicable, expected stable diagnostic code/rule, location, multiplicity, owner, and reason.
Locations use the native stable pointer/span/record coordinates appropriate to the rule; malformed bytes require a byte/record location rather than a fabricated JSON Pointer.
Validate the contract's shape and supported codes, then compare the complete observed diagnostic multiset: a missing expected failure, unexpected extra failure, duplicate expectation, stale hash, or changed location fails the gate.
Never generate the accepted expectation set from the current failing result during checking.
Owner approval of an explicit exception is required before it can admit a fixture.

An expected-invalid result remains visibly invalid for the relevant rule, while conforming to the declared negative-test contract.
If intentional syntax or encoding failure makes later checks impossible, report those phases as unperformed with that reason; do not count the fixture as valid strict JSON or claim all rules ran.
Its independent byte-preservation and owning parser/domain regression must establish the intended negative behavior.
If the expanded corpus needs a materially different negative contract, stop that adoption slice and revise this design before adding bypasses.

Four observed noncharacter findings occur inside physical bundle `entry.text` strings.
These are payload representations, and normalizing that outer string could silently change the embedded artifact.
A narrow opaque-payload contract may cover only exact declared string fields tied to a verified bundle/member identity, encoding, byte length, and hash from the existing storage authority.
It must prove the linkage between that container field and the reconstructed bytes, and keep outer syntax, duplicate keys, metadata, and all unrelated strings under ordinary checks.
Reconstructed JSON receives the full logical JSON pipeline, including its exact expected-negative contract when needed.
Non-JSON payload members remain governed by their existing corpus/domain validators and explicit preservation ownership.
Report the field-level preservation separately; do not pretend its literal contents passed ordinary all-string normalization/interoperability rules.

Neither `bundles/**`, `negative/**`, `docs/**`, nor `src/app/data/**` is an acceptable blanket lint waiver.
The new schema/API must be no more general than the measured fixture/payload need.
A declarative policy cannot name arbitrary JavaScript, shell commands, dynamically downloaded schemas, or executable validators.
Repository-owned code adapters are statically imported trusted source and receive no additional privileges merely because they are adapters.

### DEC-009: producer presentation and immutable evidence are different contracts

Preserve UO's five current contracts and exact byte decisions: ordinary `prettier-json`, Prettier body with retained envelope, native indented JSON plus LF, native indented body with retained envelope, and native compact JSON plus LF.
The package can supply a compact/no-final-LF native contract if the actual WebVOWL encoder proves that exact equivalence.
Canonical VOWL order and encoding must continue to be established by the VOWL encoder, not by sorting or a generic `JSON.stringify(JSON.parse(...))` proxy.

For a producer with a supported serializer, validate against the actual owning serializer or supported read-only verification path.
A narrow adapter can return a closed presentation result and the contract identity; it cannot waive syntax, byte admission, or unrelated lint rules.
For immutable historical Java/Jackson/evidence bytes that are not reproducible under an available supported native consumer, use explicit retained-byte preservation tied to independent provenance/hash, retain all applicable quality checks, and state the missing serializer qualification.
Do not invent a Jackson formatter or claim Prettier validates that layout.
Any new general presentation contract needs positive/negative native vectors and an owner-defined reason for change.

### DEC-010: truthful, bounded operation results

Propose result schema version 1, distinct from package semver and configuration schema.
Bind operation, root-relative identities, producer/package source identity, actual installed tool versions, effective policy digest, discovered physical/logical/record counts, exception provenance, diagnostics, coverage/completion, and write outcomes.
The result validator must check semantic consistency, not only JSON Schema: unique accounting, no lost inventory, no writes for read-only modes, no successful incomplete check, correct expected/unexpected counts, and exit/outcome consistency.
It does not authenticate a caller-supplied report or turn an operator report into native HISEW proof.

Use conventional exits: `0` for complete conformance to the declared contract, `1` for quality/expected-contract findings, `2` for configuration/input/tool/operational failure.
Expected negative diagnostics remain present and separately counted when contract conformance yields zero.
Diagnostic truncation, budget overflow, unavailable version identity, or incomplete member discovery is operational failure, not a successful partial report.
Order reports deterministically by canonical identity and stable location; escape terminal-control characters and omit document bodies by default.
If a message would expose a literal payload value, prefer its rule/code and location.

Measure maximum physical document, expanded logical document, record, total bytes, entry count, diagnostic volume, elapsed time, and memory on both supported platforms before approving finite defaults.
Keep byte, entry, diagnostic, and child-command bounds explicit; handle giant exponents/nesting/error floods through the supported parser and bounded execution controls.
No arbitrary 8 MiB global request limit is justified by the observed corpus.
Start with sequential or bounded processing and streamed logical enumeration; avoid retaining every AST, result payload, or decoded member simultaneously.
Do not add worker farms, a native observer, caching, or a generic resource-profile framework until measurement demonstrates the need.
Any inability of the chosen process boundary to enforce a promised timeout/memory guarantee must be documented as a gap, not hidden behind a configuration number.

## Consumer migrations

### UO cutover

Move the generic JSON engine and its generic regression/rule tests to `json-quality`, retaining original provenance and independently accepted expectations.
Keep UO integration tests for actual npm wiring, generated output, protected source behavior, default discovery, policy migration, public installed imports, and packed-target bytes.
Do not duplicate the full shared test suite in UO merely to preserve a historical count.

Migrate `.json-quality.json` schema 4 to the public schema, preserving every current boundary/owner/reason, format contract, write guard, NFC choice, and npm empty-key exception.
The new engine reads the migrated policy; there is no runtime fallback to the old one.
Move standard JSON presentation options into the package and remove the redundant UO JSON override from `.prettierrc.json` after equivalent behavior is demonstrated.
Root ESLint imports the package's identity guard under an accurate package namespace, while JSON analysis uses the package-owned native configuration.
Removing UO's policy-built root JSON language configuration is an intentional supported-entry-point change: `check:json` and its documented subcommands own complete JSON admission.
Direct ad hoc ESLint invocation is not a replacement for that inventory gate.

Preserve the existing npm command names and each operation's meaning, changing their implementation target to the thin repository adapter.
The UO adapter retains `--require-generated` and checks the actual ontology/query output requirements through the current producer inventory or the existing minimum presence contract until a fuller producer inventory is deliberately accepted.
It must at least reject absent `dist/**/*.jsonld` and `dist/query/v1/catalog.json`; do not represent these two checks as proof that every conceivable output was generated.
The normal discovered corpus always includes all present `dist/` JSON regardless of that flag.

Update the distribution tests to use the installed public byte/document contract without consulting source files in the producer repository.
Keep the independently expected packed member list, byte comparison with retained notices, BOM mutations, graph/runtime checks, and real `--omit=dev` installed-server exercise.
Prove that neither `@hadden-industries/json-quality` nor its isolated tooling leaks into UO's application/workspace runtime dependencies or shipped bundle/packlist.

Review selector and release-control membership as one coordinated graph change: remove superseded engine/rule paths, add the archive/provenance/lock/policy/adapter/current integration inputs needed to reproduce enforcement, and update assertions and mutation tests before refreshing digests.
Shared-tool/configuration changes must select sufficient source and control coverage; they cannot be mistaken for isolated documentation or test-only changes.
Archive and lock identity must participate in any affected reuse predicate.
Run the post-build JSON gate after `build:verify` in final qualification, and retain existing Linux/Windows CI JSON jobs.

After all callers are migrated and verified, delete the old generic modules/rule implementation from the active UO tree.
Update development documentation to the public package boundary and actual supported commands.
Never keep an alias, copied old engine, or catch-and-fallback path without an explicit NSH-01 override; none is proposed here.

### WebVOWL cutover

Complete the physical/logical classification before enabling a required gate.
Use the current root inventory plus all declared logical JSON and JSONL records; preserve raw counts and identities so the final diff can distinguish newly discovered inputs from changes in admission.
The final owner-reviewed exception set must include the exact npm-lock root key, the legitimate default namespace pointer only at the actual relevant outputs, justified NFC preservation, specific negative expectations, and precisely linked opaque payloads.
The 19 observed extra physical inputs need disposition: the 16 deployment outputs remain checked; `.agents/mcp_config.json`, `.claude/settings.local.json`, and `.mcp.json` are not automatically excluded merely because they are local or hidden.
For each, establish tracked ownership and whether a machine-local external boundary is justified, preserving the tracked-file override.

The trusted corpus adapter should call the existing storage verifier, enumerate inventory-declared logical members, reconstruct bytes with `createCorpusReader`, and pass those bytes and provenance to the shared document operation.
Make it impossible for a bundle that omits a member, changes encoding/hash, duplicates an identity, or supplies a traversal path to receive a complete-pass report.
Retain the storage/preservation/provenance tests and independent baseline; format-only outer changes that invalidate a recorded physical bundle hash must not be applied casually either.

Qualify the actual producers: `packages/vowl/scripts/generate-schemas.mjs`, `util/regenerateCanonicalExamples.mjs`, `util/generate-owl2vowl-java-test-fixtures.py`, and the Vite deployment manifest/copied data paths.
Schema generation writes tracked files; run it only within its specifically approved producer change and settle those writes before final assurance.
Canonical example regeneration currently emits a distinct owned candidate/report using a pinned closure; it does not authorize rewriting historical examples.
Use WebVOWL's `.venv` for any Python script execution.
Java availability and an unchanged-input regeneration result, if needed, are separate integration evidence and are not assumed from saved fixtures.

Triage the 68 guard diagnostics by consumer meaning before enabling the rule at error severity.
Concrete inspection targets include `src/app/js/controller/canonicalWebVowlController.js`, `packages/vowl/src/migrate/artifact.js`, and `util/dependency-graph.mjs`.
Use existing domain equality/semantic-key operations where their contracts fit; distinguish unordered objects from ordered arrays, canonical byte identities, hashes, and scalar tuples.
Retain valid byte/digest/ordered-tuple contracts through the rule's immediately attached owner/reason annotation and tests.
Do not replace legitimate numeric, array-order, or canonical semantics with a generic deep-equality guess.
The rule remains a bounded lexical guard, not a proof of all semantic comparisons.

Inspect the actual lint command: it covers `src/`, `util/`, and VOWL `src/`, `test/`, and `scripts/`; conformance derivation scripts are outside those prefixes.
Make an explicit scope decision for newly added adapters and any materially affected derivation scripts.
Do not silently claim repository-wide JavaScript coverage or expand every unrelated historical tool into the migration.

Wire complete JSON checks into ordinary lint/check commands and generic writers into explicit format/fix commands exactly once.
Add direct Prettier write protection for all detected JSON-family suffixes without using the ignore file to select checks.
The default check includes deploy output when present; final generated qualification explicitly requires the observed Vite manifest/data products after the build.
Keep schema, canonicalization, JSON-LD/RDF, corpus, and existing app behavior tests as separate acceptance oracles.

Extend `.github/workflows/webvowl-ci.yml` deliberately with fresh Linux/Windows JSON qualification and post-producer checks.
The smallest predictable initial design is a JSON matrix that installs the locked root graph and isolated JSON tools, runs the existing direct Vite bundle command, and checks physical/logical/JSONL inputs plus required generated outputs.
It does not rerun the full application test suite in those lanes.
Retain the existing application build/test ownership until a measured, separately reviewed sharing design justifies changing it; do not invent cross-job artifact reuse to save an unmeasured cost.
JSON matrix completion is required independently of reused historical application evidence.
Update the aggregate, receipt policy, and tests so cancelled, failed, missing, or unexpectedly skipped JSON jobs cannot yield a successful required context.

## Exact configuration-impact proposal

Every row is **proposed only**.
Before editing, the implementing agent must present the exact selected settings/diff and obtain the approval required by the repository instructions.
Rows with unresolved measured values or exception entries are not ready for approval merely because the file is named here.
No package manager, formatter, generator, installer, or workflow may be used to make the unapproved edits indirectly.

### New producer repository

| ID         | Exact proposed file/settings                                                                                                                                                                                                                          | Behavioral and pipeline impact; smallest scope                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-JQ-001 | `json-quality/package.json`: proposed name, ESM type, initial prerelease/version decision, `bin`, explicit `exports`, `files`, Node support range, exact runtime dependencies, direct test dependencies, and approved SPDX licence.                   | Defines a single installable Node tool. No native optional packages, consumer workspaces, lifecycle acquisition, or implicit publishing. Version/licence/name values require owner selection; package eligibility is not publication authority. |
| CFG-JQ-002 | `json-quality/package-lock.json`: native lock for exactly CFG-JQ-001.                                                                                                                                                                                 | Reproducible producer installs and attributable dependency graph. Generate natively after approval; no hand-edited integrities.                                                                                                                 |
| CFG-JQ-003 | `json-quality/schemas/configuration.schema.json` and `schemas/result.schema.json`: closed public version-1 structures and admitted representation/exception/result fields.                                                                            | Creates consumer contracts. Final expected-negative, opaque-payload, and limit structures require the prerequisite experiments and review before schema acceptance. No remote refs or silent old-version coercion.                              |
| CFG-JQ-004 | `json-quality/.node-version`: reference 24.21.0, refreshed to the latest applicable LTS patch at adoption if it changes; matching manifest engine declaration.                                                                                        | Reproducible reference toolchain and explicit supported floor. Any changed selected version needs the exact proposal and target testing.                                                                                                        |
| CFG-JQ-005 | `json-quality/eslint.config.js` and `.prettierrc.json`: minimal producer JavaScript/style policy; `.prettierignore`: ordinary generated/dependency boundaries and JSON write guards.                                                                  | Provides producer self-checks without copying UO browser/domain rules or permitting generic JSON writes around the package. Details must be reviewed as new configuration.                                                                      |
| CFG-JQ-006 | `json-quality/.json-quality.json`: current package schema/defaults and only the producer's actual owned exceptions/boundaries.                                                                                                                        | Dogfoods the source engine without a self-dependency. Policy and synthetic fixture construction must avoid quietly exempting real package metadata.                                                                                             |
| CFG-JQ-007 | `json-quality/.gitignore`: only task-approved `node_modules/` and actual generated pack/coverage locations if needed.                                                                                                                                 | Prevents accidental staging of installed/generated tools; does not hide owned JSON from the checker. Prefer external pack/evidence storage to unnecessary ignored trees.                                                                        |
| CFG-JQ-008 | `json-quality/.github/workflows/ci.yml`: proposed PR/main read-only source and transported-package jobs on Windows x64/Linux x64 at the selected Node LTS, pinned actions, explicit installs with lifecycle scripts disabled, no publish permissions. | Hosted source/consumer proof for the new product. Exact events/jobs/timeouts and required-context setup are separately reviewable; do not create a publish workflow by analogy with Markdown.                                                   |
| CFG-JQ-009 | `json-quality/SECURITY.md` if selected as new repository policy, plus any HISEW registration/profile declarations in their actual external store.                                                                                                     | The owner must accept support/reporting scope and actual `focused`/`affected`/`full` commands. Do not invent contacts, reporting SLAs, scans, external-storage paths, or a local policy file format.                                            |

`README.md`, consumer/support documentation, source, tests, notices, and a small packing/consumer-verification script are expected implementation artifacts.
Their appearance in the package allowlist is part of CFG-JQ-001.
Changing the existing `LICENSE`, adding release bots, broad dependabot policy, runtime instrumentation, or a publishing workflow is not included in this proposal.

### UO

| ID         | Exact proposed file/settings                                                                                                                                                                                                                               | Behavioral and pipeline impact; smallest scope                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-UO-001 | `tooling/json/package.json`: private isolated tool manifest with exact retained `@hadden-industries/json-quality` archive dependency; `tooling/json/package-lock.json`: matching frozen graph.                                                             | Adds explicit development-tool acquisition, outside application workspaces. Exact archive version/source/digest is selected only after producer qualification.                                                                                                 |
| CFG-UO-002 | `.json-quality.json`: migrate local schema 4 to package schema 1; translate all current defaults/exceptions and add only needed package contract fields.                                                                                                   | A coordinated schema cutover with no weakening or fallback. Unknown/old versions fail; compare the resolved before/after contract for every existing path.                                                                                                     |
| CFG-UO-003 | `package.json`: redirect the seven existing JSON scripts to `scripts/runRepositoryJsonQuality.js`; add explicit `install:json`; append `check:json -- --require-generated` after `build:verify` in `check:qualification`.                                  | Stable user-facing operations now use the installed package; final local proof covers fresh generated JSON. Preserve one JSON writer in the format/fix chain.                                                                                                  |
| CFG-UO-004 | `package.json` and root `package-lock.json`: remove `@eslint/json` and `@humanwhocodes/momoa` only after direct-import search proves their UO uses moved.                                                                                                  | Shared JSON runtime/test ownership moves to the producer. Retain root ESLint, Prettier, Ajv, and other dependencies with independent UO callers; native lock updates only.                                                                                     |
| CFG-UO-005 | `eslint.config.js`: import the shared identity plugin via the isolated public export; change `uo/no-json-stringify-identity` to `json-quality/no-json-stringify-identity`; remove local generic JSON config composition.                                   | Identity detection remains error severity and retains unused-disable enforcement. Package-owned JSON analysis replaces consumer-config reconciliation; test tamper resistance and supported-entry-point documentation.                                         |
| CFG-UO-006 | `.prettierrc.json`: remove the standard JSON-specific override now owned by the package. `.prettierignore`: retain complete JSON direct-write guards; change only if tests establish a required missing suffix/path.                                       | Eliminates duplicate presentation authority without making direct CLI JSON writes part of the supported workflow. Markdown/non-JSON options are outside this change.                                                                                           |
| CFG-UO-007 | `.github/workflows/development-checks.yml`: add explicit isolated JSON acquisition before JSON/tooling consumers; retain Linux/Windows build-then-required-generated check; update affected tooling test selection where tests move.                       | Fresh whole-corpus JSON remains required on every existing route. Root graph installation remains needed for Vite and non-JSON tools.                                                                                                                          |
| CFG-UO-008 | Any additional existing workflow job that directly installs the root graph and then imports the shared plugin/API: exact discovered job and `install:json` step, including PR/full/distribution consumers as applicable.                                   | Avoids a source-tree-only success caused by pre-existing local tool installs. Inventory actual transitive job needs before approval; no wholesale CI rewrite.                                                                                                  |
| CFG-UO-009 | `scripts/selectPullRequestChecks.js`, `scripts/distribution/verifyUniversalOntologyMcpRelease.js`, and policy tests: reviewed scope/membership and digest changes; `scripts/pullRequestCheckPlan.schema.json` only if its actual output shape must change. | Repository-policy changes require exact approval even when stored in JavaScript. Bind new current controls, remove obsolete entries, preserve unknown/shared-input conservative selection and mutation rejection. No plan-schema change is presumed necessary. |
| CFG-UO-010 | `scripts/setUpDevelopmentEnvironment.js`: call the explicit JSON acquisition entry after the existing prerequisites; related setup tests/documentation.                                                                                                    | Development setup installs both independently locked tool graphs. Ordinary checks continue to install nothing; environmental setup remains explicit.                                                                                                           |

Expected source changes also include the resolution module, repository adapter, moved/deleted engine files, updated integration/distribution tests, and `docs/development.md`.
If their implementation reveals another configuration file, identify its exact setting and impact before editing rather than treating this table as blanket permission.

### WebVOWL

| ID         | Exact proposed file/settings                                                                                                                                                                                                                                                                                                                                                                                                                         | Behavioral and pipeline impact; smallest scope                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-WV-001 | `tooling/json/package.json` and `tooling/json/package-lock.json`: private isolated manifest with the same qualified producer contract and retained exact archive.                                                                                                                                                                                                                                                                                    | Adds development-tool acquisition without adding the engine to VOWL/application runtime dependencies or workspaces.                                                                                                                                                                                                                                                        |
| CFG-WV-002 | `.json-quality.json`: new current-schema defaults, explicit external boundaries/protected producers, exact npm/default-prefix keys, representation/preservation/negative/opaque-payload contracts.                                                                                                                                                                                                                                                   | Activates default complete checking. Final exception entries are blocked on full corpus assessment and owner review; broad path waivers are unacceptable.                                                                                                                                                                                                                  |
| CFG-WV-003 | If the final bounded exception inventory needs a separate file, proposed `tooling/json/corpus-contracts.json` referenced as validated data by the trusted adapter.                                                                                                                                                                                                                                                                                   | Keeps a large exact fixture contract reviewable. This is conditional configuration, not permission to create an automatically learned baseline; approve its exact contents and independent provenance first. Prefer one policy file if the result remains readable.                                                                                                        |
| CFG-WV-004 | `package.json`: add `install:json`, `check:json:inventory`, `lint:json`, `format:json:check`, `check:json`, `format:json`, `normalize:json`, `check:json:producers`; invoke JSON checking in `lint`/`check`, and invoke the writer once in explicit `format`. Raise the root `prettier` minimum from `>=3.9.9` to `>=3.9.10`, with the matching root declaration in `package-lock.json`; refresh the exact proposal if the selected release changes. | Ordinary verification reaches the entire JSON gate and explicit fixing reaches only approved authored JSON. Append required-generated JSON checking after the existing `build:bundle` in `check`. The Prettier floor excludes the older patch; the currently locked version is already 3.9.10. Root lock changes only to mirror approved manifest/dependency observations. |
| CFG-WV-005 | `eslint.config.js`: shared identity plugin at error severity for the accepted current JS/MJS/CJS scope; unused-disable reporting; exact newly needed adapter/tool source globs.                                                                                                                                                                                                                                                                      | Newly exposes adjudicated semantic comparisons. Do not switch on a gate with unresolved findings or blanket disable comments.                                                                                                                                                                                                                                              |
| CFG-WV-006 | `.prettierignore`: add direct-write guards for `.json`, `.jsonld`, `.sarif`, `.jsonl`, `.ndjson`, `.jsonc`, `.json5`.                                                                                                                                                                                                                                                                                                                                | Direct generic Prettier cannot bypass JSON write ownership. Existing ignored documentation/data paths do not exempt read-only JSON checking. Package-owned JSON options require no new root `.prettierrc.json` override.                                                                                                                                                   |
| CFG-WV-007 | `.github/workflows/webvowl-ci.yml`: fresh Linux/Windows JSON jobs, explicit JSON installation where imported, Vite producer followed by required-generated check, and required-gate dependencies/results.                                                                                                                                                                                                                                            | Adds complete source/logical/record/generated coverage while preserving existing application, tooling, documentation, permissions, and independent checks. Propose measured job timeouts before approval.                                                                                                                                                                  |
| CFG-WV-008 | `util/selectCiChecks.mjs`, `util/ciEvidenceCommand.mjs`, its actual supporting evidence modules, and their policy tests: JSON scope/completion identity and receipt compatibility.                                                                                                                                                                                                                                                                   | Old receipts cannot satisfy newly required JSON work; JSON stays fresh unless a later separately accepted exact-input reuse contract exists. Preserve fail-closed aggregate behavior and existing authorized application reuse.                                                                                                                                            |
| CFG-WV-009 | `util/setUpDevelopmentEnvironment.mjs`: explicit isolated JSON installation and the relevant setup tests.                                                                                                                                                                                                                                                                                                                                            | Fresh development setup can run lint/build without a hidden pre-existing package. No install fallback inside checks.                                                                                                                                                                                                                                                       |
| CFG-WV-010 | External HISEW verification declarations only if measured coverage/time requires a change from `lint`/`test`/`check` and 600-second bounds.                                                                                                                                                                                                                                                                                                          | Requires exact owner-approved command, timeout, worktree, and execution-ownership disposition; never amend the unrelated active execution implicitly.                                                                                                                                                                                                                      |

The VOWL workspace manifest/lock, runtime dependencies, retained corpus hashes, Java tooling, `.mcp.json`, deployment settings, GitHub rulesets, and repository licences have no blanket change approval in these rows.
An actual need to change any of them creates a new exact proposal with its own impact and owner decision.

## Vertical implementation slices and dependencies

The slices are observable integration increments, not independent permission grants.
Early package candidates are development artifacts; no slice assumes an npm release or activation of an incomplete consumer.
The integration owner coordinates source/schema/adapter changes so a final consumer cannot point at an obsolete package contract.
Read-only research and independently owned tests/documentation can proceed concurrently where authorized; shared schemas, package identity, exception semantics, and final lock/CI changes remain semantically coupled.
Do not assign parallel writers to those coupled decisions before their contracts settle.

### SLICE-001: qualify a strict JSON check through a real package

Purpose: demonstrate the reusable end-to-end path before a consumer depends on the extraction.
After the setup, rights, exact configuration, and accepted-baseline gates, extract the smallest complete strict check, policy reader, physical inventory, document API, result validator, and ESLint identity rule into the producer.
Bring across the relevant independent test vectors and notices, not UO-specific root/output assumptions.
Likely producer modules are `src/quality.js`, `src/configuration.js`, `src/documents.js`, `src/presentation.js`, `src/normalization.js`, `src/cli.js`, and a small `src/eslint/` rule surface; these names are predictions, not a mandatory file count.
Split modules only around coherent responsibilities and actual consumers.

Demonstrate an ordinary strict file and a protected producer file through CLI and library in a disposable Git fixture, then through the installed packed public exports outside the producer checkout.
Include newly created ignored JSON, policy tampering, and an explicit invalid byte vector.
Compare extracted decisions against independently retained UO expectations before changing UO's active imports.
The focused proof is package-native unit/contract tests plus one clean installed CLI/library/plugin path; the affected proof includes inventory and source/packed behavior parity.
The result is a qualified development seam, not consumer cutover or public release.

### SLICE-002: preserve source fixing and exercise UO through the installed engine

Purpose: prove both useful correction and no unintended effects with UO's actual contracts.
Complete guarded formatting, explicit source normalization, preimage checks, and truthful partial-write reporting through the same engine.
Use disposable source/producer fixtures for writer tests; measure changes against retained bytes and an independent token oracle.
Then migrate UO's policy, isolated installation, public-export bridge, thin adapter, ESLint guard, and consumer tests under the exact approved rows.
Keep producer-generated inputs and packed targets read-only and use their real validators.

Demonstrate `check:json`, explicit safe formatting/normalization, the required-generated check, and actual rebuilt/installed package JSON through the public API.
Use focused UO JSON/guard tests and affected setup/selector/distribution tests while editing.
Remove active local engine copies only after caller search and the public installed path pass.
Any remaining reference must be an intentional historical document or test fixture, not executable fallback.
UO remains a candidate until the final package including WebVOWL-required extensions is frozen and its exact archive is requalified.

### SLICE-003: admit JSONL and bundled expected-negative documents

Purpose: make the engine useful for WebVOWL without destroying evidence or weakening default checks.
This slice begins only after the complete logical assessment and the new-capability research/exception-schema decisions below are accepted.
Implement the minimum public record/logical-document and exact expectation contracts, with opaque-field linkage only where the actual stored corpus needs it.
Use a small corpus representative of an ordinary logical document, a JSONL journal, an expected-negative member, and an outer container with a preserved payload.
The same package analysis must serve all four paths.

Demonstrate rejection of a lost member, altered hash, extra/unexpected diagnostic, missing expected failure, malformed frame, and unlinked opaque field.
Verify that other container strings and metadata retain ordinary checks.
Adopt additional producer-presentation behavior only after its supported native oracle is established.
Run the core strict/UO compatibility tests after these changes; new representations must not change ordinary strict JSON decisions.
Do not widen to unsupported dialects or a general plugin framework when a specific corpus case is awkward.

### SLICE-004: make WebVOWL's real default workflow pass honestly

Purpose: complete actual consumer adoption, including its corpus and producers, rather than delivering a dormant package dependency.
Add the isolated tool project, resolution bridge, trusted corpus/producer adapter, finalized explicit exception data, and ordinary command wiring.
Repair only owner-approved authored formatting/normalization and genuine semantic-comparison defects; preserve legacy/negative/canonical/retained bytes through their accepted contracts.
When a producer change is needed, change its owning source and verify regeneration/domain preservation before updating its outputs.

Demonstrate full physical, logical, and record reconciliation, a new ignored generated JSON failure, the post-Vite required-output gate, and one real adjudicated identity comparison with an order-permutation regression.
Use affected storage/schema/migration/controller/dependency-graph tests where the code actually changed.
Record the before/after inventory and retained-byte deltas, not an arbitrary target number of formatted files.
Measure operational limits on both platforms and settle any required explicit profile/timeout proposal.

### SLICE-005: freeze one producer tuple and enforce both consumers' final gates

Purpose: prove the same current contract at every delivered boundary.
Consolidate the producer and both consumers before broad review; do not create separate broad reviews for every small internal refactor.
Resolve review findings, then freeze the complete producer source and archive tuple.
Both consumers must update to that exact qualified contract, with independent archive/lock readback and clean installed probes.
If a consumer exposes a producer defect, fix the producer once, create a new attributable candidate, and update affected consumers coherently.

Complete UO reviewed-control graph/selector changes and WebVOWL fresh JSON matrix/aggregate/receipt guards with negative tests.
Inspect native profile declarations and select the actual final capture route before an expensive run.
Settle authorized formatting, tracked generators, notices, schemas, archive membership, consumer locks, staging, and commits before the final required native full proof for that candidate.
Then obtain the actual hosted Linux/Windows results through separately authorized source delivery.
This slice establishes source and consumer adoption acceptance; it is not npm publication or deployment.

### SLICE-006: deliver, observe, and retire task-owned remnants

Purpose: finish the authorized delivery route with attributable state and recovery ownership.
If commits and pushes are approved, publish only the scoped signed candidates through each repository's actual permitted route and read back the landed revision/tree and required statuses.
Attach any PR actually created to the task; do not create issues, PRs, or comments merely to satisfy a prose template.
Activation must identify the producer source/archive and both consumer revisions, final check outcomes, and any remaining limitations.

Observe the representative installed operations and the first applicable hosted producer/check sequence at the adopted revisions.
Resolve failures through the recovery policy below, retain native/security/hosted evidence externally, and remove spent task-owned scratch after its consumers finish.
Optional registry publication is a later separately authorized boundary with its own immutable version, rights, provenance, clean registry installation, and readback checks.

### Traceability

| Slice     | Requirements / acceptance           | Quality scenarios and decisions                             | Falsifiable proof                                                                                                                                | Release and cleanup implication                                                                      |
| --------- | ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| SLICE-001 | REQ/AC-001, 002, 003, 008, 009, 011 | QA-001, 002, 003, 011, 012; DEC-001, 002, 004, 006, 010     | Native vectors plus a transported public CLI/library/plugin check in a clean external consumer; no lost physical inventory.                      | Development archive only; preserve source/provenance and failures; no consumer activation.           |
| SLICE-002 | REQ/AC-001 through 005, 007, 008    | QA-003 through 006, 009, 011; DEC-002 through 006           | UO parity, source-writer/preimage/partial-failure tests, actual packed-target bytes, no tool dependency in shipped runtime.                      | Remove obsolete active UO engine paths after migrated callers pass; retain historical provenance.    |
| SLICE-003 | REQ/AC-002, 003, 005, 006, 009      | QA-007, 008, 010, 012; DEC-006 through 010                  | Complete representative logical/record admission and exact-negative/opaque-link mutations; ordinary UO behavior stays stable.                    | New capability remains unactivated while exact corpus contracts or bounds are unresolved.            |
| SLICE-004 | REQ/AC-002, 004 through 010         | QA-001, 004, 007 through 010, 012; DEC-003, 005 through 010 | Full real WebVOWL inventory; producer/schema/storage/permutation proof; retained bytes independently checked.                                    | No blanket migration; remove only explicitly task-owned temporary fixtures after evidence retention. |
| SLICE-005 | REQ/AC-001, 003, 008 through 011    | QA-009, 011 through 014; DEC-002 through 004, 010           | Exact frozen tuple; meaningful consolidated review; native final profiles; policy mutation/CI completion guards; actual hosted platform results. | Consumer activation requires the accepted current tuple, not manifest version or old receipts.       |
| SLICE-006 | REQ/AC-008, 010, 011                | QA-013, 014; DEC-004, 005, 010                              | Authorized remote revision/status readback, installed outcome, recoverability and retained-resource accounting.                                  | No registry/release/deployment claim without its distinct authorization and evidence.                |

## Quality scenarios and verification oracles

These are proposed falsifiable scenarios, not claims of completed tests.
The package owns generic tests; UO and WebVOWL own actual integration/domain tests.
Keep independent expected decisions, bytes, hashes, and domain outcomes; do not compute the expected answer by calling the implementation under test.
Share neutral fixture construction where useful, but never share away the oracle.

| ID                                                 | Stimulus / environment                                                                                                                                                                                               | Required response and measurement                                                                                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-001: complete discovery                         | Add ordinary, hidden, untracked, ignored-generated, and tracked-inside-external-boundary JSON; remove a required generated member.                                                                                   | All present owned inputs appear exactly once in physical inventory; each invalid addition fails; tracked boundary content remains protected; missing required output fails. Assert both count and exact identities.                             |
| QA-002: policy cannot weaken mandatory admission   | Disable root ESLint JSON rules, change root formatter options/ignores, supply old/unknown schema fields, duplicate policy keys, or conflicting exceptions.                                                           | Shared checks retain mandatory rules or reject invalid policy before effects; documented direct-write guards remain effective. Candidate policy cannot execute commands/modules.                                                                |
| QA-003: byte and semantic parity                   | Exercise malformed UTF-8/BOM, interior U+FEFF, escaped duplicates, surrogate/noncharacter values, scalar roots, safe/unsafe integer boundaries with exponent/decimal spellings, meaningful keys, and NFC collisions. | Same substantive UO decisions under all relevant public entry points; no preprocessing discards bytes that ought to fail; exact owner/pointer exceptions permit only their intended case.                                                       |
| QA-004: no hidden acquisition or writes            | Run check/inspect/logical operations with network and install markers in a disposable environment and read-only sentinels around the selected tree.                                                                  | No tool acquisition or checkout mutation; output/exit records actual findings. A missing tool is operational failure, not an installer invocation.                                                                                              |
| QA-005: safe formatting and normalization          | Batch includes one invalid/protected input; a key collision; a preserve exception; exponent lexemes and deliberate member/array order.                                                                               | All required preflight precedes first write; refusal leaves every sentinel unchanged. Successful formatting preserves tokens/meaning; explicit normalization changes only admitted string tokens and is idempotent.                             |
| QA-006: interruption and changed preimage          | Change source identity/bytes during preflight; deny a later write; interrupt an owned operation after an earlier replacement.                                                                                        | Refuse the changed preimage, report actual completed/unprocessed paths, return failure, retain evidence. Never claim whole-batch rollback; a kill without report is incomplete evidence.                                                        |
| QA-007: JSONL record fidelity                      | Use 249 observed records plus synthetic duplicate/unsafe/blank/malformed/truncated records with LF/CRLF and optional last terminator.                                                                                | Every record receives strict analysis and correct file/record/line locations; count/byte preservation is exact; malformed framing fails; no multiline reformat or silent record omission.                                                       |
| QA-008: logical and opaque provenance              | Remove/duplicate/alter a bundled member; modify size/hash/encoding/path; mark an unrelated field opaque.                                                                                                             | Existing storage and shared inventory admission reject the mutation. Exact linked payload preservation retains bytes while container metadata and reconstructed JSON receive their own checks.                                                  |
| QA-009: identity means what its consumer expects   | Permute unordered object members; change ordered tuple positions; exercise alias/shadow/bound/Buffer/hash uses and malformed/stale annotations.                                                                      | Semantic comparisons tolerate only domain-permitted permutations; intentional byte/digest/tuple identities retain meaning; lexical guard reports the established sinks without blanket disables.                                                |
| QA-010: negative fixtures stay negative            | Remove an expected U+FDD0 diagnostic, add an unexpected unsafe value, change an expected span/hash, or make a negative input valid.                                                                                  | Exact expectation comparison fails each mutation; ordinary unaffected rules still run; intentionally unperformable later phases are reported, not counted as passed.                                                                            |
| QA-011: transported package and runtime separation | Install exact archive in a clean consumer outside sibling checkouts; import every public export; remove producer-source access; inspect UO packlist/runtime dependency graph.                                        | CLI/library/plugin work using only shipped files and declared dependencies; deep source imports fail; source/archive/installed identities match; JSON tooling is absent from shipped application/runtime assets.                                |
| QA-012: bounded, truthful reporting                | Exceed measured entry/byte/record/diagnostic limits; forge duplicate or incomplete result accounting; return unknown schema/source identity.                                                                         | Deterministic operational failure, bounded output, no effects, no complete-pass claim. Semantic result validation rejects inconsistent results. Record actual elapsed/memory metrics without claiming unmeasured limits.                        |
| QA-013: CI and evidence admission                  | Mutate a reviewed control input/archive; omit/fail/cancel/skip a required JSON job; offer an old receipt or wrong source/tree/attempt.                                                                               | Correct selector scope and completion gate reject every case. Existing permitted application reuse remains scoped; new JSON checks are attributable fresh work.                                                                                 |
| QA-014: controlled recovery                        | Abort before activation or encounter a post-cutover producer/writer defect; retain unrelated-file sentinels and original migration bytes.                                                                            | Restrict affected operation, preserve evidence, restore only explicitly authorized task-owned changes or deliver a forward fix, then requalify affected contracts. Old unsupported engines and altered archives are never silently substituted. |

Use native ESLint RuleTester for the shared lexical rule, native Ajv for shipped schemas, the supported Prettier and JSON parser APIs for actual operation, and the independently retained token expectations for formatting preservation.
Use real temporary Git trees and files for path, inventory, link, and write tests where possible.
Use deterministic fault injection at the narrow filesystem boundary only for races/errors that cannot be safely reproduced otherwise; pair it with real platform filesystem probes.
Do not mock all of Git, native lint, formatter, package installation, or corpus storage and then claim installed integration.
Network/publication/GitHub services are genuine external boundaries; ordinary checks should need none of them.

Likely focused UO suites are `tests/json-quality.test.js`, `tests/lint/no-json-stringify-identity.test.js`, the JSON-related distribution tests, `tests/pr-check-scopes.test.js`, and `tests/distribution/pr-qualification-policy.test.js`, adjusted deliberately as generic tests move.
Setup and Markdown integration tests run when their actual wiring inputs change, not because they share a tools directory.
Likely affected WebVOWL suites include `packages/vowl/test/corpusStorage.test.js`, `corpusPreservation.test.js`, `corpusProvenance.test.js`, `schema.test.js`, `migrate.test.js`, `src/app/js/controller/canonicalWebVowlController.test.js`, and the `util/ciEvidence.test.js` / `util/ciWorkflow.test.js` controls.
Select additional suites from the actual repaired comparisons and producer inputs, preserving the existing domain oracles.
These are source-backed starting points rather than an exhaustive frozen test allowlist.

Producer `check:focused`, `check:affected`, and `check:full` are proposed new entry points, not commands available in the empty repository today.
The first should run cheap rule/byte/policy vectors, the second add inventory/writer/CLI/public API integration, and the full command add the complete package suite, style/schema/dogfood checks, and transported consumer qualification.
Define the actual composition before registering profiles, inspect side effects, and do not make all three aliases for the same expensive suite.
UO's current final command is `npm run check:qualification`; WebVOWL's is `npm run check`; their proposed post-producer extensions are listed above.
All Python execution uses the selected repository's existing `.venv` and documented wrapper.

## Commit, review, verification, and delivery cadence

Before implementation, inspect the actual installed HISEW engine, project applicability, session ownership, external evidence/temporary destination, profile definitions, and verification gaps.
Resolve the unregistered producer and existing WebVOWL execution explicitly.
Do not select legacy `.sdlc/runtime` or `.sdlc/tmp` as a default artifact location, adopt another worktree, or create a new lifecycle execution merely to write this plan.

At the first authorized implementation commit point, commit the owner-accepted plan revision in UO using the maintained `committing-to-git` skill and applicable HISEW commit prerequisites.
Subsequent commits should capture coherent observable slices with focused evidence.
Commit authorization does not authorize push, and a push instruction does not authorize staging/committing unrelated changes.
Stage exact task paths and preserve user-owned working-tree changes throughout all repositories.

During editing, run focused checks and affected integration checks where they answer a changed question.
Consolidate the producer/API/policy/consumer changes before the broad correctness/principles/security review.
Use narrow repair-delta review after corrections, widening only when the defect changes the threat model, contract, or affected consumers.
Reserve any selected external review for the final consolidated candidate; do not ask an external provider to rereview each incremental edit.
The separate planner is planning evidence, not final independent verification of implemented code.

SEC-01 applies because the package changes parser/byte admission, filesystem writes, dependency delivery, and required CI behavior.
Use one scoped top-level native security workflow for the frozen applicable target, let it own its internal workers, and retain its substantive coverage and gaps.
Do not recursively fan out reviewers or treat a tool's successful completion as a finding-free report without reading it.
R2 independent verification follows the actual governing method/provider, including cross-vendor execution where that selected route requires it; normal local agent review does not silently replace that obligation.
A genuinely unavailable required capability needs an accountable alternative or a retained gap.

Freeze the final producer source before creating its immutable adoption archive, and freeze the consumer archive/lock/policy/source tuples after installed qualification.
Resolve every tracked writer, generated schema/notice, final lock, staging operation, and authorized commit before expensive native assurance.
Review final package membership and origin notices against the actual archive, not only the source tree.
Post-build checks belong after the producer inside the actual final command composition.
They qualify generated inputs; they are not late tracked-source formatting.

Inspect HISEW's advised final verification route before launching it.
Use the native governed repository commands as the canonical final run instead of first running an equivalent manual full suite solely to repeat it for a receipt.
On an unchanged final candidate, execute each required expensive suite once unless a recorded invalidation, failure, incomplete capture, or explicit independent obligation justifies another run.
For eligible fresh-only environments, select the supported coordinated final route before execution; do not discover that restriction after a redundant full run.
Reuse only evidence that the native owner actually admits for unchanged relevant inputs; never reconstruct receipts from logs or conversation text.

If a correction follows verification, record the delta and affected source/oracle/dependency/control inputs, retain old receipts under their original identity, and rerun the actual invalidated obligations.
A formatter label or Markdown extension alone does not establish semantic irrelevance.
Do not widen testing solely for bookkeeping, or narrow it merely because a required suite is slow.

Keep the following claims distinct in the handoff:

| Evidence class                  | What it can establish                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source unit/contract tests      | Behavior of the named source candidate and chosen inputs.                                                                                                     |
| Installed/packed consumer tests | Shipped membership, declared dependencies, public exports, and actual installed consumer behavior for the named archive.                                      |
| Native HISEW receipts           | Captured commands and admitted candidate/environment/ownership identities under the selected workflow.                                                        |
| Operator or reviewer artifacts  | Their actual observations and judgments; a reference does not convert them into native captured proof.                                                        |
| Hosted CI                       | The observed provider revision, job/run attempt, environment, and completion outcome.                                                                         |
| Registry/release evidence       | Actual published bytes, visibility, immutable version/tag, provenance/readback, and fresh registry installation, only if separately authorized and performed. |
| Application deployment          | A separate operation and acceptance boundary; no package extraction test proves it.                                                                           |

## Activation, observation, and recovery

Activate the package first as an attributable internal development tool tuple, then accept each consumer only after its complete installed and hosted obligations pass.
All adopted consumers must use the current accepted contract; retain independent repository rollout ownership without keeping an active old-engine fallback.
An intermediate incomplete consumer migration remains a candidate and must not be described as complete shared-engine adoption.

The owner or delegated integration observer records the producer source/archive, consumer commit/tree, policy digest, actual installed versions, complete physical/logical/record counts, exception counts, generated-presence outcome, and required native/hosted results.
The useful operational questions are whether a new generated file is automatically checked, whether an invalid fixture remains intentionally invalid, whether a protected output stays unchanged, whether a legitimate authored repair works, and whether both consumers actually execute the same installed contract.
Use existing command reports and CI artifacts; no new telemetry service or unattended monitor is proposed.
No performance saving is claimed until measured.

Abort activation when rights or setup are unresolved, inventory loses members, unexplained retained bytes change, expected-negative contracts are incomplete, source/archive/lock identity mismatches, writes occur during checking, or a required review/verification/CI result is missing or failed.
Preserve the last accepted inputs and failure artifacts; do not delete inconvenient generated data or update expected hashes simply to make the gate pass.

Before activation, retain exact migration-owned preimages, producer/consumer base revisions, the original policy/lock/archive identities, and unrelated-change sentinels.
If abandoning a draft implementation, reverse only the task's own approved edits; do not use blanket Git restoration, hard reset, or directory deletion to discard user work.
After activation, restrict the affected writer or block qualification and deliver a scoped forward fix.
A separately authorized reversion must identify the exact scope and requalify the restored contract; unsupported superseded consumers are not automatically acceptable recovery targets.
Formatting/normalization recovery restores approved preimages through the owning source/producer, not an npm downgrade.

If an optional future npm publication partially succeeds, preserve attempted/confirmed/unknown effects and query actual provider state before retrying.
Never overwrite a released version or repoint an adopted archive path to changed bytes; changed payloads require a new immutable candidate/version and consumer requalification.
Registry publication, distribution-tag promotion, signed tags, GitHub release assets, consumer merges, and application deployment require their distinct explicit authorization.

| Resource                                                                                                      | Owner and retention/removal trigger                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted plan, public schemas, source/tests, notices, consumer policies, qualified adopted archives and locks | Durable repository inputs; retain with their actual source history and supported consumer contract.                                                                                                                                                      |
| Native HISEW and security/review evidence                                                                     | Native/external evidence owner; retain original successes and failures according to the actual selected workflow/security policy. Do not invent a new retention duration.                                                                                |
| Hosted artifacts needed for acceptance/reproduction                                                           | Integration owner exports required evidence before provider expiry and records revision/run/attempt/artifact identity.                                                                                                                                   |
| Pack staging, test repositories, temporary copied corpora, installation probes                                | Task-created temporary owner; clean only after processes and evidence consumers finish and necessary diagnostics are retained. Verify final absolute containment before recursive deletion/move on Windows; use the approved recoverable disposal route. |
| Other worktrees, active executions, local settings, retained historical corpus                                | Their existing owners; this task has no implied adoption or cleanup authority.                                                                                                                                                                           |

## Prerequisites, cheapest experiments, and replanning conditions

The gaps below are deliberate implementation gates.
This plan does not claim deep research, legal clearance, all-member corpus acceptance, platform qualification, or a usable package has already been completed.
Its proposed architecture is reviewable, but affected new-capability work must wait for the relevant gate to close.

| Gate                                                      | Minimum next evidence                                                                                                                                                                                                                                                                                                             | Decision owner and affected work                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-001: accepted authority and workflow ownership       | Accepted plan/R2 baseline and exact configuration/implementation authority for the stage being started; genuine current session/applicability; approved producer registration/profile setup before producer implementation; disposition of WebVOWL's pre-existing execution before its implementation, without implicit adoption. | Repository/workflow owner. Blocks mutations in an unapproved stage; does not require later-stage artifacts or configuration identities before authorized producer implementation. |
| GATE-002: complete logical corpus and exception semantics | Read every inventory-declared logical JSON member through the existing reader; classify strict/expected-invalid/preserved representations; collect raw native findings with canonical identities and phase applicability. Compare against independent corpus intent/tests before proposing exact exceptions.                      | WebVOWL corpus owner and integration owner. Blocks final new exception schema and WebVOWL gate activation; does not require re-auditing unrelated repositories.                   |
| GATE-003: supported reuse for new representations         | Small read-only experiments using Node framing plus native JSON analysis, existing storage APIs, and actual serializers; inspect supported APIs/terms and meaningful alternatives where a residual gap remains. Record why any custom framing/expectation/payload composition is necessary.                                       | Package design owner. Blocks custom JSONL/negative/opaque/presentation capability implementation until source-backed selection is complete.                                       |
| GATE-004: exact immutable/presentation contracts          | Representative original bytes and supported producer results for compact-without-LF, schema output, retained Jackson/evidence, canonical examples, JSONL envelopes, and Vite products. Identify true byte-preservation cases and missing native qualification.                                                                    | Respective producer owners. Blocks those policy entries, generic rewrites, and consumer acceptance.                                                                               |
| GATE-005: rights and source attribution                   | Owner selected AGPL-3.0-only and clarified first-party UO extraction, requiring source provenance without a UO third-party licence copy; inspect selected exact upstream dependency/transitive licence texts and terms, actual notices and distribution obligations. | Accountable repository/licence owner. Blocks affected adoption/distribution where material upstream clearance remains missing. |
| GATE-006: package identity and isolated consumer fit      | Check name availability; choose initial development version; pack a clean supported source; inspect membership/provenance; install outside siblings; resolve CLI/library/plugin through public exports and measure duplicate-root-tool impact.                                                                                    | Package/integration owner. Blocks frozen consumer archive selection and claims of installability.                                                                                 |
| GATE-007: operational limits and profile sufficiency      | Bounded size/entry/record inventory and one representative full read-only assessment on Windows/Linux; record actual time/memory/output and overflow behavior. Propose exact finite limits/timeouts based on that result and owner capacity expectations.                                                                         | Package/consumer owners. Blocks claims of bounded platform support or acceptance of unmeasured timeout/profile changes.                                                           |
| GATE-008: final configuration and exception approval      | Concrete diffs for the selected CFG rows, exact archive identities, complete exception entries, and exact CI/profile settings.                                                                                                                                                                                                    | Repository owner. Unresolved rows cannot be implemented by treating the table as blanket consent.                                                                                 |

Replan the affected part before proceeding if a new logical dialect or extensionless/embedded source cannot be accounted for, if the required native parser/serializer changes meaning, if the corpus needs broad rule suppression, if a canonical/negative fixture would have to be rewritten, or if a domain validator would be replaced by generic JSON checking.
Also replan for licence conflict, a different supported runtime/platform need, an archive requiring lifecycle execution or sibling access, an unmanageable performance/budget result, a public API/schema change after candidate freeze, or CI receipt/privilege changes beyond the bounded proposals.
Unrelated checkout changes and conflicting execution ownership require coordination rather than restoration.

The higher-outcome checkpoint at each material slice is whether both repositories gain reliable current JSON checking with less independent policy implementation, while retaining their data meaning, native domain validators, reproducible tooling, and usable development workflow.
If the solution accumulates a generic framework, duplicates storage/serializer knowledge, hides unchecked data, or saves source lines at the cost of unclear ownership, simplify or revise the design before calling the extraction successful.

## Source reference map

The baseline identities above delimit every local observation.
Sources are not assertions that a later checkout or hosted default branch is unchanged.

| Evidence                                   | Source locations inspected or supplied by the parent                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UO current contracts and migration context | [Development guide](../development.md), [strict JSON plan](strict-json-quality-implementation-plan.md), [byte-validation follow-up](json-quality-byte-validation-dependencies-profile-cleanup-plan.md), [JSON policy](../../.json-quality.json), [package commands](../../package.json), generic modules and tests listed above.                                                                                                 |
| UO native/CI policy                        | `.github/workflows/development-checks.yml`, `scripts/selectPullRequestChecks.js`, `scripts/distribution/verifyUniversalOntologyMcpRelease.js`, `tests/distribution/pr-qualification-policy.test.js`, actual profile inspection supplied by the parent.                                                                                                                                                                           |
| Markdown producer design                   | At `C:/Users/maksy/GitHub/markdown-quality`: `README.md`, `docs/centralized-contracts.md`, `docs/consumer-guide.md`, `docs/ci-trust.md`, `docs/support-and-release.md`, `docs/release-operations.md`; `src/quality.js`, `configuration.js`, `documents.js`, `replacement.js`, `result-validation.js`, `execution.js`, `candidate-staging.js`; `scripts/pack.js`, `verify-publication.js`; package manifest and workflow context. |
| Existing Markdown consumers                | UO `tooling/markdown/package.json`, `scripts/installMarkdownTools.mjs`, generated-policy integration and tests; WebVOWL `tooling/markdown/package.json`, `util/markdownIntegration.probes.mjs`; Google and OwlAPI isolated manifests; consumer execution profiles. These examples inform design, not JSON authority.                                                                                                             |
| WebVOWL producer/corpus/CI behavior        | At `C:/Users/maksy/GitHub/webvowl`: `package.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.node-version`; storage reader/verifier/inventory and native corpus tests; schema/canonical/Java producer scripts; `.github/workflows/webvowl-ci.yml`, `util/selectCiChecks.mjs`, `util/ciEvidenceCommand.mjs`, `util/ciEvidence.mjs`, and their tests.                                                          |
| Fresh empirical WebVOWL findings           | Parent read-only physical discovery/lint/Prettier/identity-rule assessment at `c9c3f398...`, with measured scope and limitations retained in this plan. The original probe outputs are operator evidence; implementation must retain its own native attributable full assessment.                                                                                                                                                |
| Native software selection                  | Fresh parent registry queries and the primary Node, ESLint JSON/rule, Prettier, Ajv, and JSON Lines documentation linked above. Exact installed/packed dependency and rights qualification remains a gate.                                                                                                                                                                                                                       |
| HISEW governing method                     | Installed `hisew-dev/0.1.0-dev.21` planning/routing skills and `method/engineering-principles.md`, `risk-routes.md`, `verification-procedures.md`, `engine-invocation.md`; actual applicability/profile findings supplied by the parent.                                                                                                                                                                                         |

Draft creation ends with this reviewable document.
Implementation readiness is established only after the owner accepts an exact baseline and the affected prerequisites above are satisfied.
