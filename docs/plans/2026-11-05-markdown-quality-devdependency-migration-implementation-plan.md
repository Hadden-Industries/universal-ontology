# Markdown Quality root development dependency migration implementation plan

Date: 2026-11-05.

## Outcome, authority and inspected baseline

Adopt the normal root npm development dependency `"@hadden-industries/markdown-quality": ">=3.0.0"` and remove the isolated Markdown archive installation route.
Use the installed public CLI for repository commands and the public result validator for generated Editing Policy content.
Preserve ontology semantics, generated publication ownership, historical evidence and the PR policy graph's truthful completion accounting.

This is a plan only.
It creates no implementation authority, configuration approval, install, build, product test, commit, push, deployment or hosted dispatch.
The user requested completion without questions; genuine decisions are recorded with recommendations.
No repository controls were executed to prepare this document.

Read-only inspection observed clean branch `chore/tooling-and-external-ontology-updates` at `7a5881c9dddaa5fdf664fd33941d5160d2010089`.
Retain that branch and treat all later concurrent edits as user-owned.
Refresh inspection found the same HEAD and no tracked changes; the proposed plan itself is untracked.
Applicable root `AGENTS.md` requires explicit approval for exact configuration changes and preservation of existing work.
This plan proposes those changes without applying them; future implementation must follow its actual authorization.
`docs/development.md` was read: routine controls use npm entry points; Python uses the existing `.venv`; builds have autofix lifecycle side effects.
Do not run `npm run build` merely to validate this migration; the documented `build:verify` route avoids those lifecycle fixes when build verification is actually selected.

The upstream context is [the upstream migration chat](codex://threads/01a1aad3-14cf-78f2-8a37-ced8c85759fb).
Read-only owning-source inspection used `C:/Users/maksy/GitHub/markdown-quality`, supplied HEAD `f2128b1b4929dec5c47b5696b92d1bf2ceaa45aa` on `fix/stdin-request-refusal-code`, with ongoing uncommitted 3.0 implementation.
Sources inspected include `src/cli-admission.js`, `src/quality.js`, `src/qualify-git-cli.js`, `src/result-validation.js`, execution/configuration schemas and maintained consumer/trust docs.
This establishes planning contract details, not publication or hosted acceptance.
Assume registry 3.0.0 core and matching optional native packages are available.
There is no publication, release, availability or adoption prerequisite, 2.x bridge, persistent archive fallback or Git dependency.
The requested root range is exactly `>=3.0.0`, never a caret range or an exact 3.0.0 manifest pin.

JSON Quality's current tested precedent is local signed commit `9c038b10e01da9ae2ff93d5a009205c92e7eb775`, root manifest and `docs/markdown-quality.md`.
It uses `>=3.0.0`, direct npm PATH scripts with explicit roots and write intent, and no content or execution config where package defaults suffice.
The earlier `b54b426b60cf9db1a8248b8e57f68ffb13ae998f` remains historical 2.x acquisition-cleanup context for removal of isolated manifests/lock/source/three archives and unnecessary config/test ceremony.
Follow the tested 3.0 route while retaining UO's real generator/corpus/receipt tests.
JSON Quality's Windows local full check covered 43 Markdown files, exited 0 and retained 12 advisory historical warnings; real disposable-file proof covered missing-mode exit 2, read-only preview, one exact candidate write, convergence and external-cwd npm root selection.
This evidence qualifies that precedent only, not UO, Linux or hosted CI.
This refresh read the installed `json-quality/node_modules/@hadden-industries/markdown-quality` 3.0.0 manifest, public SDK/consumer contracts and schemas; its matching optional Windows/Linux native family is 3.0.0.
Its exported result schema and validator establish result 5; the migration-guide table still mentioning result 4 is stale documentation and must not become an oracle.
Do not copy unrelated script renames.

## Requirements, acceptance and boundaries

| ID             | Requirement and falsifiable acceptance                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-01 / AC-01 | One root manifest/lock owns Markdown core/native resolution; normal root installation works on supported hosts without isolated acquisition or native compilation.              |
| REQ-02 / AC-02 | Root scripts use npm PATH and explicit filesystem write intent; read-only check/preview and refusals preserve disposable source bytes.                                          |
| REQ-03 / AC-03 | Sparse schema3 configuration keeps legitimate authored/generated/history boundaries and default rules; new findings are classified rather than hidden.                          |
| REQ-04 / AC-04 | Editing Policy generation uses the installed root public API/CLI and result5 validator, preserves logical path/request identity and writes only through the existing generator. |
| REQ-05 / AC-05 | PR scopes, native suite ownership, workflow graph, policy digests and completion receipts agree after acquisition changes.                                                      |
| REQ-06 / AC-06 | Old archive files/wrappers/metadata disappear only after live consumers migrate; unrelated JSON tooling and ontology/distribution material remain intact.                       |

QA-01: check, inspect, help/version, dry-run and refused repair write no source bytes.
QA-02: malformed/incomplete/wrong-identity reports cannot authorize generated output or fresh proof.
QA-03: Windows x64 and Linux x64 execute the matching installed native package under existing supported Node policy.
QA-04: generated policy remains deterministic with exact graph semantics, stable anchors and manifest binding.
QA-05: selected, preview, repair and excluded-content results establish only their actual scope.

The implementer owns coherent source/contract/test migration.
The owner decides substantive content changes and any changed public/persisted compatibility obligation.
Future review consists of one Review Agent plus narrow repair review, without a security or external-review campaign.
Use minimal existing workflow bookkeeping; create no parallel receipt framework.

## Live consumer map and proposed edits

| Path                                                                                                                               | Current route and proposed change                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                                                                     | Add the exact root range; replace Markdown script delegation; remove `install:markdown` callers and qualification wrapper if obsolete. Preserve unrelated script names and workspaces.                                                  |
| `package-lock.json`                                                                                                                | Update the coherent root resolution once with managed npm; retain ordinary resolved/integrity and optional OS/CPU identities.                                                                                                           |
| `tooling/markdown/package.json`, `tooling/markdown/package-lock.json`                                                              | Remove isolated core/native `file:` graph after all consumers migrate; do not lift old KaTeX/math overrides blindly.                                                                                                                    |
| `tooling/markdown/archives/hadden-industries-markdown-quality-1.0.3.tgz`                                                           | Remove retired ordinary core acquisition file once no live path requires it.                                                                                                                                                            |
| `tooling/markdown/archives/hadden-industries-markdown-quality-win32-x64-1.0.3.tgz`                                                 | Remove retired ordinary Windows native file at the same boundary.                                                                                                                                                                       |
| `tooling/markdown/archives/hadden-industries-markdown-quality-linux-x64-1.0.3.tgz`                                                 | Remove retired ordinary Linux native file at the same boundary.                                                                                                                                                                         |
| Remaining `tooling/markdown` acquisition/source/notice files                                                                       | Inventory tracked contents before deletion; remove obsolete live installer material but preserve applicable rights/evidence. Never delete unrelated tooling by directory resemblance.                                                   |
| `.markdown-quality.json`                                                                                                           | Rebuild from defaults as sparse schema3 policy with justified authored/generated/history exceptions.                                                                                                                                    |
| `.markdown-quality-execution.json`                                                                                                 | Replace execution1 resources with only needed execution2 leaves; ordinary root use needs no archive-shaped toolchain object.                                                                                                            |
| `scripts/installRepositoryQualityTools.mjs`                                                                                        | Current CLI admits only `markdown`; JSON-named exported limits/cleanup helpers are presently not imported by searched scripts/tests. Verify all owners before retiring the file, and preserve any newly discovered JSON branch/exports. |
| `scripts/setUpDevelopmentEnvironment.js`                                                                                           | Stop invoking `install:markdown` after root installation; preserve Python, JSON and skill setup.                                                                                                                                        |
| `scripts/render_editing_policy.py`                                                                                                 | Replace isolated metadata resolution and removed `document` command with a narrow root-installed public adapter; keep graph freshness and byte-output ownership in Python.                                                              |
| `scripts/ontology_policy/documentation_outputs.py`                                                                                 | Remove isolated-lock inventory input; retain root lock and current policy/profile/adapter inputs so generated manifest freshness reflects the real graph.                                                                               |
| `docs/policy/Editing-Policy.manifest.json`                                                                                         | Regenerate through existing generator after input inventory changes; do not hand-edit digest assertions.                                                                                                                                |
| `docs/policy/Editing-Policy.generated.md`, sidebar/model/preservation/assets                                                       | Regenerate only where actual generator inputs alter bytes; preserve graph meaning and publication ownership.                                                                                                                            |
| `docs/policy/Editing-Policy.toolchain.json`, `scripts/ontology_policy/render_diagrams.py`                                          | Current generated fields are Node/browser/Mermaid/font/rasterizer versions, not Markdown archive evidence. Preserve this diagram toolchain owner; regenerate only if actual output inputs change.                                       |
| `scripts/selectPullRequestChecks.js`                                                                                               | Replace retired tooling paths with actual root dependency/adapter control paths in style-tooling, Python and ontology-policy scopes; retain conservative fallback for unknown/mixed inputs.                                             |
| `scripts/runPullRequestNodeChecks.js`                                                                                              | Remove stale explanation that product jobs lack the private Markdown graph; decide ownership of meaningful Markdown tests explicitly and preserve native discovery/receipt completeness.                                                |
| `scripts/verifyPullRequestPolicyGraph.js`                                                                                          | Update only affected workflow call allowlist/pin expectations; retain exact permissions and fail-closed graph validation.                                                                                                               |
| `.github/workflows/development-checks.yml`                                                                                         | Remove separate install steps, use root-installed CLI; retain style-tooling job and its actual semantic test inventory as appropriate.                                                                                                  |
| `.github/workflows/ontology-validation.yml`                                                                                        | Remove separate Markdown install; existing root dependency must serve policy generation without introducing redundant provisioning.                                                                                                     |
| `.github/workflows/markdown-quality.yml`                                                                                           | Manual SHA-pinned trusted qualifier is a distinct current route, not an automatic obligation to keep ordinary archives. Assess concrete consumers below.                                                                                |
| `.github/workflows/pr-validation.yml`, `.github/workflows/full-qualification.yml`                                                  | Preserve stable aggregate completion, strict result/readback and fresh/reused qualification boundaries; change only if ownership mapping requires it.                                                                                   |
| Distribution policy manifests and verifier                                                                                         | Review root manifest/lock, adapter and workflow digest inventory together; update through canonical owner with semantic assertions retained.                                                                                            |
| `tests/markdown-quality.test.js`                                                                                                   | Retain real link deletion, invalid UTF8, inventory exclusions and refusal behavior; resolve installed root graph and migrate argv/result5 oracle.                                                                                       |
| `tests/pr-check-scopes.test.js`, `tests/pr-node-checks.test.js`                                                                    | Replace retired path cases and stale isolated ownership assumptions, retaining actual native suite discovery and selected-job union.                                                                                                    |
| `tests/development-workflow.test.js`, `tests/set-up-development-environment.test.js`                                               | Remove isolated installation expectations; assert root dependency ownership and preserved setup behavior.                                                                                                                               |
| `tests/distribution/pr-qualification-policy.test.js`                                                                               | Keep immutable workflow/permission/control-input policy; update deliberate digest/pin changes with corresponding negative assertions.                                                                                                   |
| `tests/test_editing_policy_rendering.py`, `tests/test_editing_policy_documentation.py`, `tests/test_editing_policy_publication.py` | Preserve deterministic bytes, identity/refusal, graph preservation, manifest integrity and publication safety; no live publication runs.                                                                                                |
| `tests/editing-policy-gfm.test.js`, `scripts/editingPolicyGfm.js`                                                                  | Keep separate meaningful GFM admission where it protects the generated publication; Markdown package migration does not remove its oracle.                                                                                              |
| `docs/development.md`, `docs/policy/README.md`                                                                                     | Replace archive setup/old contract instructions with ordinary root route and exact generation/qualification limits.                                                                                                                     |

Search hidden/tracked/serialized consumers before final removal, including `tooling/markdown`, `install:markdown`, `markdown-quality-qualify`, `document`, `--inventory`, schema markers and registry-target metadata.
Remove meaningless `registryUpgradeTarget` metadata wherever found after root dependency adoption.
Historical plans and evidence may continue mentioning those routes accurately as history.

## Intended root manifest fragment and 3.0 contract

```json
{
  "scripts": {
    "check:markdown": "markdown-quality check --root . --diagnostic-display-level warning",
    "format:markdown": "markdown-quality format --write --root . --diagnostic-display-level warning",
    "inspect:markdown": "markdown-quality inspect --root . --json"
  },
  "devDependencies": {
    "@hadden-industries/markdown-quality": ">=3.0.0"
  }
}
```

This fragment changes existing Markdown routes only.
The display filter follows the tested human-output choice and is optional; preserve existing verdict strictness whether it is retained or removed.
Use npm's first separator for script options and second for literal filenames; silence npm banners when consuming JSON:

```sh
npm run --silent inspect:markdown
npm run --silent check:markdown -- --json -- README.md
npm run format:markdown -- -- README.md
npm exec -- markdown-quality format --dry-run --root . -- README.md
```

Preview invokes the public command directly; appending `--dry-run` to the write wrapper would request both modes and refuse.
Exercise `npm --prefix <repository> run --silent inspect:markdown` from an external cwd and assert the reported root.
Preserve native child exit codes: PowerShell wrappers may otherwise report outer exit 1 for native exit 2; an explicit wrapper must propagate `exit $LASTEXITCODE`.
Full requests already reconcile tracked Markdown by default in a Git checkout, preserving the corpus's inventory assertions without a redundant flag.
Omit forced reconciliation from ordinary scripts so explicit file requests remain selected operations; retain an explicit inventory only for a separately demonstrated obligation.
Remove the separate install command rather than alias it to another installer.
Do not retain a `qualify:markdown` alias that suggests a local check creates trusted immutable proof.
If actual callers need a qualification command, keep it as a separately explicit truthful route with its own contract.

| Existing contract            | Target and consumer consequence                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Implicit filesystem `format` | `format --write`; real preview uses `--dry-run`; exactly one is required even for empty selections.                          |
| `--inventory git`            | `--reconcile-inventory git`; change embedded tests/argv as well as scripts.                                                  |
| `--diagnostic-level`         | `--diagnostic-display-level`; human filtering never changes blocking findings.                                               |
| CLI `document`               | `format --stdin-request --json` for JSON/base64 logical document envelope.                                                   |
| SDK `processDocument`        | Public `processLogicalDocument`, only where SDK integration is used.                                                         |
| Raw stdin                    | Requires `--stdin-filepath`; raw transforms emit source only and reject JSON/write/dry-run and selection flags.              |
| Config/effective2, preset1   | Config/effective3, authored-gfm@2; defaults replace old rule switches.                                                       |
| Fresh operation result       | Result5 with candidates, hashes, byte counts and explicit preview/refusal semantics; validator belongs to installed package. |
| Execution1 old budget keys   | Execution2 named resource leaves; do not perform a blind dictionary rename.                                                  |
| Report comparison            | Comparison3 only where an actual reader consumes it.                                                                         |
| Old qualify bin              | `markdown-quality-qualify-git` accepts explicit immutable flags, no old consumer positional token.                           |
| Physical SDK writes          | Existing SDK behavior remains; do not invent a `write` option because CLI writing became explicit.                           |

JSON stdout is one complete document; human diagnostics use stderr.
Quiet affects routine success presentation only; help/version are inert.
Paths after `--` are literal canonical root-relative forward-slash names, including from nested cwd.
`--files-json []` intentionally means no selection; nearest verified Git/package/cwd root discovery is unchanged.
Selected, empty, preview and repair success cannot be promoted to full authored-corpus acceptance.
Upstream's Node >=22.13.0 is a development-tool floor, not an automatic product/runtime-engine change.
Use the repository's actual managed Node/npm policy and matching npm optional native packages; install no compiler or native bootstrap.

## Minimum content policy and execution profile

| Decision                                  | Recommendation                                                                                                                                   | Evidence needed during implementation                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Default include                           | Start with `**/*.md`; preserve current authored breadth.                                                                                         | Inspect actual selected paths, including hidden directories.                              |
| Agent installations/tool state            | Retain only legitimate `.agents/skills`, `.claude/skills`, `.agent-tools` installed-state boundaries not already invariant upstream exclusions.  | Actual inventory establishes whether these are exposed.                                   |
| Generated website/vendor                  | Keep justified dist/vendor output boundaries without adding source-wide exemptions.                                                              | No generated corpus enters authored repair.                                               |
| Historical research/reviews/SDLC          | Preserve original evidence and historical documents with attributable scope decisions; do not exclude all future maintained docs by convenience. | Inventory and policy tests distinguish nested preserved records from new authored work.   |
| Generated Editing Policy Markdown/sidebar | Preserve generator ownership; excluded supplied content is pass-through, not a package quality certificate.                                      | Existing exact byte-preservation and generator semantic checks remain meaningful.         |
| Layout and lint                           | Prefer default LF/tab2 and complete rules; omit empty/default fields and old `links.localFiles`.                                                 | Fresh NFC/fragment/case/style findings are recorded and repaired through their owners.    |
| Exclude merge behavior                    | A supplied exclusion list replaces package defaults, so retain needed vendor/cache/coverage defaults explicitly when supplying exceptions.       | Selection fixture proves intended omissions, including arbitrary excluded bytes.          |
| Resources                                 | Prefer finite package defaults; retain only measured named execution2/analyzer limits.                                                           | Large real policy documents or reports justify any raised bound; no `unlimited` shortcut. |
| Runtime declarations                      | Reuse `.node-version` and `.python-version` only where profile needs explicit runtime observation.                                               | Installed public profile reader validates the sparse execution2 shape.                    |
| Toolchain evidence                        | Omit archive-shaped toolchain from ordinary profile.                                                                                             | Normal root install/check succeeds without fabricated archive paths.                      |

An absent content config is preferred if no real exception survives review.
Unknown schema2 keys must fail rather than silently being ignored.
Keep meaningful authored/generated/corpus tests; remove only archive census or implementation ceremony.

## Editing Policy adapter and generated outputs

Today `format_generated_document` finds isolated package metadata, resolves its public bin and runs removed `document` argv.
Its Python checks only shallow fields and base64/request identity; those checks must not become a second incomplete result5 validator.
Use a small repository-owned Node entry invoked by the existing Python generator and importing the root-installed public package.
It may call public `processLogicalDocument` directly, or invoke the public envelope CLI through npm's supplied PATH; choose one narrow route, not a generic integration framework.
Recommended SDK route avoids cross-platform shell launcher handling and lets the adapter call the installed `validateQualityResult` before returning admitted document bytes.
The adapter is part of the input inventory and installed behavior tests.

Bind root, operation, logical generated path and request ID; require successful operation, no checkout writes and admitted document output before base64 decoding.
Preserve the actual package's excluded-document semantics: excluded generated content can round-trip unchanged without proving authored quality.
Python continues to own graph loading, deterministic rendering, freshness comparison and output writes.
Do not write temporary source into the checkout to obtain formatting results.
Do not silently fall back to raw rendered text on CLI/SDK/schema failure.

Update `documentation_outputs.py` inventory to remove only the isolated lock input, retain root lock, and include the adapter/current policy/profile inputs actually used.
If defaults remove a content or execution config, remove that nonexistent file's mandatory inventory entry and any explicit adapter profile argument together; preserve freshness binding through the root lock and actual surviving inputs rather than creating empty config files to satisfy old hashes.
Regenerate `Editing-Policy.manifest.json` and any changed generated outputs through the existing canonical renderer after the whole graph is ready.
Assert stable requirement IDs, anchors, rule fingerprints, typed language, shared/cyclic RDF and preservation counts.
No ontology policy rule or website/publication meaning change is justified solely by a formatter upgrade.
Any changed generated Markdown bytes require reviewing link/anchor consequences; never hand-edit generated output to bypass graph ownership.

## CI ownership and qualification boundary

The current manual Markdown workflow pins `7e24e6f806d9d532c1425f76c52fdd0923af985a` and is explicitly allowlisted in the PR workflow policy graph.
Inspected PR/full scope controllers consume native job completion and Node qualification facts; no concrete product reader of Markdown archive receipts was identified in those routes.
Do not infer a product requirement for archive qualification merely from the existence of this manual workflow.
Recommended ordinary CI route is root `npm ci --ignore-scripts` and `npm run check:markdown`, with the existing required check identity, failure strictness and permissions preserved wherever it currently gates authored Markdown.
Retire archive-specific local qualification ceremony if it has no actual caller or receipt consumer.
Document that this is ordinary policy checking, not equivalent trusted archive qualification.

If a separately required product/release consumer is discovered, name its exact reader, original artifact and immutable identity contract before retaining or changing it.
Execution2 `toolchain` is optional, but when present requires `lockFile`, `coreArchive` and both `nativeArchives`.
The Git qualifier also requires real producer/core/native/workflow hashes plus candidate/trusted identities and runtime paths.
Do not supply npm integrity strings or installed-tree hashes as archive evidence.
Existing producer-owned frozen archives in a separately retained trusted workflow are legitimate evidence inputs, distinct from ordinary consumer installation.
Prefer the existing exact workflow owner over a generic registry adapter if that concrete route must remain.
Shared workflow code pins remain immutable while used; archive removal does not authorize changing a pin to `main`.

Preserve PR union selection, native discovery, unknown-input conservative fallback, mixed-scope ownership and aggregate completion.
Choose explicitly whether meaningful Markdown tests stay in style-tooling or move into normal Node ownership now that all root installations have the package.
Recommendation: retain current style-tooling ownership initially, remove only stale isolated-install rationale, and prove each test has exactly one selected owner without changing product scope unnecessarily.
Update canonical policy manifests/digests and negative tests together when workflow/control inputs change.
Never make old proof reusable under changed root lock, policy, adapter or workflow identity.
A new manual workflow requires default-branch registration; use an existing registered entry if future authorized hosted verification needs dispatch.
Do not push main to work around platform registration.

## Ordered, reviewable slices

| Slice    | Trace, implementation seam and demonstration                                                                            | Completion/cleanup consequence                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| SLICE-01 | REQ-01/02, AC-01/02, QA-01/03: root dependency/lock/scripts/setup plus installed tiny-file check/preview/write/refusal. | Ordinary route works without isolated graph; do not remove old files until generators migrate.                   |
| SLICE-02 | REQ-03, AC-03, QA-01/05: sparse defaults, justified exclusions and execution2 resources.                                | Inventory and content findings are visible; content repairs remain separately reviewable.                        |
| SLICE-03 | REQ-04, AC-04, QA-02/04: Python-to-root public adapter, result validator and generated input inventory.                 | Real generated/check behavior and malformed reply refusals pass; regenerate outputs once after candidate freeze. |
| SLICE-04 | REQ-05, AC-05, QA-02/05: setup/workflows/scopes/native test ownership/policy graph and digest assertions.               | Existing required contexts retain strict outcomes; qualification proof identity stays truthful.                  |
| SLICE-05 | REQ-06, AC-06: retire isolated files/wrapper/metadata, update maintained documentation and rights context.              | No live stale paths remain; focused proof and one review complete migration.                                     |

Keep each producer, argv builder, validator, schema reader and test oracle coherent in its slice.
Inspect syntax/contract failures through the owning validator before expensive native execution.
Freeze one candidate and reuse passing installed proof until relevant inputs change; do not rebuild/reinstall after every edit.
These slices are review seams within one coherent migration batch: inspect every live SDK, CLI, workflow, serialized and release-only consumer first, then use one managed root `npm install --ignore-scripts` lock refresh with matching optional natives and a lock-based clean install only where proof needs it.
Cheaply validate all actual callers' argv, installed exports, config/profile shapes and reader contracts before expensive proof, including manual/package-release policy routes; add no acquisition-only tests or publication trial.

## Meaningful verification through existing entry points

The following are future selectors, not executed planning checks.
Use the current Jest/node/Python framework and existing `.venv`; create no replacement test harness.

| Selector                                                                                                                   | Required evidence                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -- --runInBand --runTestsByPath tests/markdown-quality.test.js`                                                  | Real native full check is read-only; target-only deletion fails; invalid UTF8 is exit2; excluded bytes/inventory remain unchanged; unsupported shortcuts refuse.                                        |
| `npm test -- --runInBand --runTestsByPath tests/pr-check-scopes.test.js tests/pr-node-checks.test.js`                      | Root graph and adapter changes select all affected scopes; draft plans stay documentation-only; mixed jobs retain union; native suite inventories and receipts agree.                                   |
| `npm test -- --runInBand --runTestsByPath tests/development-workflow.test.js tests/set-up-development-environment.test.js` | One root install and unchanged existing setup responsibilities; no isolated path dependency.                                                                                                            |
| `npm test -- --runInBand --runTestsByPath tests/distribution/pr-qualification-policy.test.js`                              | Exact workflow graph/permission/control policy and deliberate digest changes, including negative mutations.                                                                                             |
| `npm test -- --runInBand --runTestsByPath tests/editing-policy-gfm.test.js`                                                | Generated GFM admission stays independent and meaningful.                                                                                                                                               |
| `npm run test:policy-rendering`                                                                                            | Existing editing-policy Python tests through existing `.venv`, including determinism, graph preservation and refusal. Inspect expensive assets/browser prerequisites before selecting the whole family. |
| `npm run check:editing-policy`                                                                                             | Existing canonical generated bundle freshness with zero tracked writes after adapter/input inventory migration.                                                                                         |

Useful exact existing Python methods include `CanonicalFormatterFailureTest.test_excluded_generated_document_preserves_input_bytes`, `test_non_object_native_report_is_an_operation_failure` and `test_logical_reply_cannot_change_request_or_document_identity`.
Keep `RendererCommandTest.test_check_mode_passes_for_the_committed_document_and_writes_nothing` and `test_complete_bundle_is_deterministic_and_check_rejects_a_changed_asset`.
Retain `WikiPublicationTest.test_qualified_manifest_binds_inputs_and_outputs_before_any_wiki_write`; use disposable mocked/local publication boundaries only, never a live Wiki write.
Existing graph round-trip and mutation tests in `test_editing_policy_documentation.py` protect semantic output and should not be replaced by formatter snapshots.

Add only missing integration assertions to those owning tests: dirty real file check, real dry-run candidate hashes/bytes, explicit write convergence, missing/both modes, whole-batch refused write and result5 package/request/root identity.
Record the dirty file's preimage hash; preview must preserve raw bytes with zero writes, explicit write must match candidate hash/byte count, second format must write nothing, and check must exit 0.
Exercise NFC normalization separately from layout formatting and require reviewed anchor-change handling.
Check stdout as one complete JSON report where promised; human stderr, quiet warnings, inert help/version and syntactic refusal streams follow actual CLI contracts.
Use literal filenames after `--`, empty `--files-json []`, nested/spaced cwd, policy exclusion and invalid config fixtures.
Exercise raw stdin restrictions and retained envelope behavior where the adapter or actual supported editor route uses them.
Verify Windows/Linux matching optional native package versions and genuine installed execution; source-only tests do not prove packaged behavior.
Do not automatically run complete product/corpus/build/qualification campaigns merely because the root lock changed; follow conservative repository selection and actual affected contracts.

Apply JSON Quality lessons without copying unrelated implementation:

- Resolve package bare/local import edges through their owning graph; hoisted `../../ajv` with dependency-cruiser `undetermined` classification is not permission to relax containment.
- Migrate stale independent event/schema4 oracles to the actual current5 producer with strong expectations intact.
- Validate installed package/native behavior in addition to source tests.
- Broken-pipe fixtures need finite adequate limits and proof that real output was reached; isolate runtime compile cache and keep output lifetime independent of workspace cleanup.
- Remove archive-census ceremony while keeping semantic scope, refusal, receipt and ontology corpus assertions.

## Content, history, rights, rollback and decisions

Run initial installed inspect/check without disabling rules and classify actual NFC, case, missing-target/fragment, link-label, alt-text, HTML and style findings.
Separate layout/NFC mechanical changes from semantic document repairs and from generated policy regeneration.
Keep preserved research, review records, fixtures and historical plans unchanged unless their real owner explicitly authorizes a different task.
Normalization anchor updates need review of `anchorChanges`; selected backlink coverage does not prove external backlinks.

Update maintained development/policy setup docs, replacing archive route instructions and old flags with root dependency and explicit repair modes.
Preserve `docs/plans/markdown-quality-integration-plan.md` and other historical plans/evidence as history.
Review `tooling/markdown/NOTICE.md`, `LICENSE` and upstream/current package notices before removing copied live material; retain applicable attribution/source obligations in their proper owner.
Dev-tool package licensing does not automatically relicense the MIT application or justify deleting historical evidence.

Capture coherent manifest/lock/config/profile/adapter/generator preimages and any document bytes before actual repair.
Rollback is targeted restoration of the complete reviewed migration, old matching lock/install where authorized, and actual modified content preimages.
Package downgrade alone cannot recover rewritten Markdown, generated manifests or qualification identity.
Interrupted output generation must remain a failed/stale bundle until canonical check succeeds; do not publish partial outputs or reissue old proof as fresh.

| Open decision                      | Recommendation and minimum evidence                                                                                                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remaining manual trusted qualifier | Retire local archive-only ceremony if no concrete receipt reader exists; preserve ordinary required context and strict check. Name any actual product/release reader before retaining a separate immutable workflow route.                                                       |
| Adapter transport                  | Use one small Node SDK adapter importing root public API and validator, invoked by existing Python generator; test correlation and real installed refusal. No generic framework.                                                                                                 |
| Markdown semantic test ownership   | Keep current style-tooling owner initially, removing only isolated-install assumptions; assert exact native discovery and selected ownership.                                                                                                                                    |
| Preservation exclusions and bounds | Keep only justified history/generated boundaries and finite measured needs; compare inventory and semantic corpus before accepting policy.                                                                                                                                       |
| Version consequences               | Root development-tool migration alone does not force application/workspace version changes. A changed public persisted manifest/receipt schema or generator contract requires its own compatibility decision; preserve existing schema meaning where only inputs/digests change. |

Replan when actual installed public contract materially differs, an unobserved receipt consumer appears, generated policy meaning changes, or branch/concurrent edits affect the mapped owners.
Registry availability is assumed, not an adoption gate.
Completion requires coherent root install, working public routes and generator, truthful selected/qualified evidence, accepted content findings, updated policy graph/digests, no live retired-path consumers and focused passing proof plus one review.
Future per-file commit messages need the user's actual review approval; no commit/push authority is granted here.
