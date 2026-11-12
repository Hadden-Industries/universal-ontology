# Development guide

How to set up a checkout, what each command does, which integrations are optional, and how to verify a change.
Nothing here is a prerequisite for opening a pull request; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup

Use Git 2.46 or later, stable Node.js compatible with your npm version and the locked dependencies, stable npm meeting the minimum in [the root manifest](../package.json), and stable Python at or above the minimum in `.python-version`.
For the optional second-engine ontology checks, use a JDK matching `.java-version`.
PR validation, Main CI and full qualification use the exact Node reference from [`.node-version`](../.node-version).
The `devEngines.packageManager` declaration makes npm enforce the local minimum before install, clean install and script execution.
Development setup uses npm's bundled validator.

Later stable npm majors satisfy the range; prereleases do not.
CI and release builds explicitly select and verify the exact `packageManager` version in [the root manifest](../package.json).
CI provisions the exact Python version in [`.python-version`](../.python-version) through SHA-pinned `astral-sh/setup-uv` and the uv version selected by [the shared Python setup action](../.github/actions/setup-python/action.yml), with caching disabled.

The action activates an isolated environment under the runner's temporary directory; subsequent setup creates the repository `.venv` and installs the hash-locked requirements through pip.
Development setup accepts newer stable versions and preserves the existing `.venv`.
The README's [development setup](../README.md#development-setup) section explains the version selection.

```sh
npm run set-up:development
npm run configure:git-hooks
```

`set-up:development`:

- checks Node.js against the installed npm's supported range, applies the manifest's native npm minimum, and checks Python;
- runs `npm ci --include=dev --ignore-scripts --engine-strict` from `package-lock.json` so npm enforces the installed dependencies' Node requirements;
- creates `.venv` if it does not exist (an unusable existing `.venv` stops setup so you can repair it), then installs `requirements.lock.txt` with `--require-hashes --only-binary=:all: --no-binary=pyyaml` and refuses a `.venv` whose installed distributions differ from that lock;
- runs `pip check`;
- warns if the AWS CLI is missing (only deployment needs it).

It installs nothing globally and configures no agent, workflow, hook trust, MCP server or skill.
`requirements.txt` holds the ontology runtime dependencies and `requirements-dev.txt` the development tools; `requirements.lock.txt` is their resolved, hash-pinned closure.
Development requirements declare minimum versions without upper bounds.
Routine setup and CI install the exact locked versions rather than resolving those ranges again.

PyYAML 6.0.3 has no CPython 3.15 wheel, so setup and full-lock CI installs build only PyYAML from its hash-pinned source archive; all other locked requirements remain binary-only.
Pip's isolated source build may acquire additional build-time dependencies.
PyYAML works without its optional LibYAML extension; source-build compatibility must be verified on each CI platform.

Node.js dependencies are locked via `package-lock.json`.
Repository-owned package manifests declare registry and workspace dependencies and development dependencies using `>=` minimum version ranges, including the version inside npm aliases and the vendored Braces package's `fill-range` dependency.
Registry minimums track the highest published stable release when updated; workspace minimums use the accepted local package version.

A dependency without a stable release uses its explicitly accepted prerelease.
Local `file:` sources, including the vendored Braces repair, preserve their source identities.
OwlAPI is an owner-approved exception to registry ranges: `devDependencies.owlapi` in the root `package.json` is its sole editable source/version selector.

Use either `git+https://github.com/OWNER/REPOSITORY.git#FULL_40_CHARACTER_COMMIT` or `npm:PACKAGE_NAME@EXACT_VERSION`, including an exact prerelease when selected.
The local dependency name and all consumer imports stay `owlapi` and `owlapi/...` for either form.
The import-closure policy references this manifest entry; package names, versions, sources and integrity values in `package-lock.json` are generated observations, not independent settings.

Root `.npmrc` sets `allow-git=root`, admitting this direct dependency while rejecting transitive Git dependencies under npm 12; setup and CI continue disabling lifecycle scripts.
The PR selector treats `.npmrc` as a manifest-dependent input; consumer tests verify the selected dependency source and installed payload.

Use `npm ci --include=dev --ignore-scripts` when changing between registry and Git sources with the same package version: an incremental install can retain the old bytes.
After an approved selector edit, regenerate the npm lockfile, then clean-install it with the command above and requalify the consumer.

The package boundary tests check the exact manifest/lock source and public API bindings, and compare all installed package files with the original archive retained in npm's cache by the lockfile integrity.
A missing or inconsistent cached archive fails verification; installed files never supply their own expected hashes.

The retained registry verification documents describe the historical rc.1 publication; they do not qualify a different selected source or assert a new npm release.
The policy allows every newer stable version, then qualifies each refreshed lockfile before adoption.
Routine setup and CI use the exact lockfile graph; a range permits resolution but does not establish compatibility, including for future major upgrades.

Refresh qualification covers the affected runtime, build and distribution contracts, including libraries bundled from development dependencies.
Distribution qualification retains exact bundled component and artifact checks and requires the public MCP package to declare no separately installed runtime dependencies.

`configure:git-hooks` sets the repository-local `core.hooksPath` to `.githooks`.
The pre-commit hook runs the SHACL editing policy on the exact staged ontology bytes using the `.venv` interpreter and blocks the commit on any violation.
It is a local convenience, not an acceptance requirement: GitHub runs the same validator on every pull request.

Run repository Python through the existing environment, either directly (`.venv/Scripts/python.exe` on Windows, `.venv/bin/python` elsewhere) or via `node scripts/runRepositoryPython.js <script-or-module arguments>`.

### Updating the Python lock

Edit `requirements.txt` or `requirements-dev.txt`, then regenerate the lock with the pinned resolver in `.venv`:

```sh
node scripts/runRepositoryPython.js -m piptools compile --allow-unsafe --generate-hashes --no-strip-extras --output-file=requirements.lock.txt requirements.txt requirements-dev.txt
```

Review the resulting diff; a lock change changes the qualified environment.
The compile command preserves existing selections when they still satisfy the requirements.
For a deliberate upgrade, add `--upgrade-package NAME`, review the lock diff, rerun setup, and execute the relevant checks.

## Optional integrations

These are explicit commands with their own effects.
Ordinary development and contribution do not need them.

| Command                                              | Effect                                                                                                                                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run plan:skill-reconciliation`                  | Stage remote skills selected by `skills-lock.json` using `skills@latest` and additional agent/policy options from `repository-skills.json`; show the exact diff and plan ID. Optional pins remain in the native lock. |
| `npm run apply:skill-reconciliation-plan -- PLAN_ID` | Apply that reviewed candidate without reacquisition. Preserve unrelated skills and native lock entries; recovery is available through the shared CLI.                                                                 |
| `npm run set-up:mcp-servers -- --help`               | Show the MCP server installer's options before choosing its download/network actions. `--check` only verifies the checked-in host configuration documents.                                                            |
| `npm run publish:website`                            | Upload built site assets to S3. Requires the AWS CLI and separate authorization; refuses to publish without a current qualification receipt (see below).                                                              |

## Verification commands

| Check                      | Command                                                  | Notes                                                                                                            |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| JavaScript tests           | `npm test -- --runInBand`                                | Product, MCP workspace and development-tool suites.                                                              |
| Python tests               | `npm run test:python`                                    | Ontology policy, publication gate and setup tools. Jena-related tests skip visibly without a JDK/Jena runtime.   |
| Ontology policy tests only | `npm run test:ontology-policy`                           |                                                                                                                  |
| Lint                       | `npm run lint`                                           | HTML, CSS, JavaScript, Python, Markdown prose and classified JSON.                                               |
| Formatting                 | `npm run format:check`                                   | `npm run format` rewrites files.                                                                                 |
| Ontology validation        | `npm run validate:ontologies -- --purpose draft`         | Diagnostics on changed sources; `--staged` validates the staged bytes (what the pre-commit hook does).           |
| Active-set qualification   | `npm run validate:ontologies -- --purpose latest-active` | Qualifies the active module set recorded in `policy/activation.ttl` and writes the publication receipt.          |
| Generated editing policy   | `npm run check:editing-policy`                           | Fails when `docs/policy/Editing-Policy.generated.md` is stale; `npm run generate:editing-policy` regenerates it. |
| Policy accessibility       | `npm run check:editing-policy:accessibility`             | Local GFM, links, eight viewport/theme cases, keyboard disclosures and Axe; live Wiki acceptance is separate.    |
| Website build              | `npm run build:verify`                                   | Preserves tracked inputs and writes ignored `dist/` output. `npm run build` also runs Vite directly.             |
| JSON-LD generation         | `npm run generate:json-ld`                               |                                                                                                                  |
| MCP package                | `npm run build:mcp-package`                              | See [docs/mcp/local-development.md](mcp/local-development.md).                                                   |

`npm run test:python -- --granularity test` runs each Python test method in its own process instead of each module.
Use the focused checks that match what you changed while working, and the wider suites before opening or updating a pull request.
`check:qualification` runs code formatting before lint and checks the skill lock and generated editing policy before the wider test suites.
CI checks formatting before lint; generated JSON qualification still follows the build that produces it.
Policy rendering is checked before downloading its browser.
This fail-fast order preserves all checks and producer prerequisites; reuse a passing result only while its relevant inputs and environment remain unchanged.
Report failures, skips and checks you could not run as they are.

### Shared declarations and derived settings

Change the owning declaration rather than updating copied settings in consumers:

| Shared knowledge                                                  | Owning declaration                                                                                                            | Consumers and drift control                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node CI identity and qualification profile                        | `.node-version`, read by `scripts/nodeTarget.js`                                                                              | Full qualification uses the exact pin for both fresh execution and reused Node proof. Explicit Markdown execution profiles also use the exact pin.                                                                                                                |
| Node runtime shipped in MCP archives and the container            | `.node-version`, projected by `scripts/repositoryNodeProjections.js`                                                          | `--check` compares the release inputs, Dockerfile and installation guide offline; `--write` also refreshes upstream digests from nodejs.org and Docker Hub.                                                                                                       |
| Exact npm used by CI and release tooling                          | Root `package.json.packageManager`                                                                                            | `scripts/installRepositoryNpm.js` installs and verifies it before dependency setup. `scripts/repositoryNpmTarget.js --check` checks the release-input projection; `--write` updates only that field. The workflow tests exercise an alternate manifest selection. |
| JSON check resources and generated-output obligation              | `.json-quality.json.runtimeControls` and root `package.json` script `check:json:generated`                                    | The native policy owns the shared finite time/scratch budgets. CI and qualification use the generated-output command.                                                                                                                                             |
| Hosted Python provider and isolated environment                   | `.github/actions/setup-python/action.yml`                                                                                     | Development and ontology workflows invoke this composite; each caller retains its own condition. `.python-version` still owns the interpreter selection.                                                                                                          |
| Query identities, channels and cache defaults                     | Query package modules `ontologyQueryDigest.js`, `ontologyQueryChannelManifestSchemas.js` and `ontologyQueryArtifactLimits.js` | Query schemas, caches and MCP hosts share declarations while validating their own inputs. `ontologyQueryArtifactHttpOrigin.js` owns loopback hostname spellings without importing Node transports into browser exports.                                           |
| Query RDF vocabulary                                              | Query package module `ontologyRdfVocabulary.js`                                                                               | Indexing, context queries and value schemas derive their IRIs from the same namespaces.                                                                                                                                                                           |
| MCP build and release layout, reproducible epoch and asset bounds | Package build module `universalOntologyMcpPackageLayout.js` and `scripts/distribution/universalOntologyMcpReleaseLayout.js`   | Package paths remain available in standalone workspace snapshots. Release readers share output defaults, epoch and bounds; integrity and corruption checks remain independently exercised.                                                                        |
| Repository ontology publication coordinates                       | `scripts/build/ontologyPublication.js`                                                                                        | Build producers share the public root and dated-version grammar. The reusable query package remains independent of deployment coordinates.                                                                                                                        |
| Ontology validation purposes                                      | `scripts/ontology_run_purpose.py`                                                                                             | Runner and policy consumers share the enum and choices. Planning still works before installing SHACL dependencies. Generated-policy report links derive from the renderer's document path.                                                                        |

Configuration changes, including regeneration, still require the approval described in `AGENTS.md`.
Use `node scripts/repositoryNpmTarget.js --write` after an approved npm selector update, then run the affected workflow and distribution checks.
This follows the existing `scripts/pythonTarget.js` projection pattern.

The `ubuntu` release in [the runner policy](../.github/runner-policy.json) selects the GitHub-hosted Ubuntu jobs and the Linux x64 and ARM64 archive lanes.
After changing it, run `node scripts/repositoryRunner.js --write` to regenerate the workflow and release input labels.
`node scripts/repositoryRunner.js --check` detects drift, and PR qualification uses the same policy to check the observed image family and job labels.

Keep separate meanings separate: local tool eligibility and exact CI selection, deployment Node and bundled archive Node, source and decoded-artifact bounds, independent expected test vectors, immutable historical releases and generated lock observations are different contracts.
GitHub checkout pins must remain literal before repository-local actions are available; separate workflow responsibilities retain their reviewed pins.

The release-input action inventory governs MCP distribution, and does not govern unrelated CI jobs.
The current MCP protocol revision is owned by `universalOntologyMcpMetadata.js`; release inputs retain a separately checked declaration as part of explicit release qualification.
Reassess deliberate duplication when a shared requirement changes or a new consumer needs that same contract.

### JSON quality and safe fixing

Root `package.json` declares `@hadden-industries/json-quality` as an ordinary `>=1.0.0` devDependency.
The root npm lockfile selects the core and its matching optional platform package; npm owns resolution and package integrity.
Consumers import the public API and ESLint plugin directly.
See the supplier's [consumer guide](https://github.com/Hadden-Industries/json-quality/blob/main/docs/consumer-guide.md), [CLI](https://github.com/Hadden-Industries/json-quality/blob/main/docs/cli.md) and [API](https://github.com/Hadden-Industries/json-quality/blob/main/docs/api.md) for its quality rules and supported controls.

The repository commands are:

| Command                                      | Effect                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run check:json`                         | Complete read-only check of source and existing generated JSON, including untracked and Git-ignored files. |
| `npm run format:json:check`                  | The same complete read-only check.                                                                         |
| `npm run inspect:json`                       | The same check with `--ndjson` machine output.                                                             |
| `npm run format:json`                        | Explicit `format --write` for eligible authored sources.                                                   |
| `npm run normalize:json -- -- authored.json` | Explicit `normalize --write` for the named authored source.                                                |
| `npm run check:json:generated`               | Complete check requiring generated JSON-LD and `dist/query/v1/catalog.json`.                               |

Checks do not build or fix files.
CI builds with `build:verify` before the generated-output gate; missing required outputs fail.
The small `scripts/runRepositoryJsonQuality.js` adapter owns only the bound repository root and these additive generated-output requirements.
The supplier owns discovery, argument validation, checking and writes.
Its repository session exposes `check()`; consume through `execution-terminal` and close the session in `finally`.

[The sparse JSON policy](../.json-quality.json) records only repository-specific resource and ownership overrides.
It inherits the installed package's current schema, Prettier JSON presentation, NFC checking, Git/dependency boundaries and producer-owned npm lockfile rules.
It adds local Python/agent/workflow boundaries, protected retained/vendor/provenance families and the native presentation contracts of UO, Oxigraph, Jest and npm SPDX producers.
Tracked JSON remains checked even below an external boundary.

The policy retains the measured 512 MiB aggregate source capacity (`maxTotalSourceBytes`), 300-second check deadline and 4 GiB temporary-storage allowance.
Other controls inherit package defaults; resource overrides use the supplier's current names.
For example, `npm run check:json -- --max-source-bytes 67108864` changes the per-source admission limit.

`lint` and `format:check` include the complete JSON check; `format`, `fix:all` and `fix:code-style` reach the JSON writer once.
The Node formatting selection contains no JSON, and `.prettierignore` also protects JSON from direct Prettier writes.
Producer-owned bytes must be repaired through their producer.
Consumer schema, domain, provenance-digest and JSON-LD graph checks retain their separate authority.

JSON Quality performs guarded per-file replacements, rather than a multi-file transaction.
After interruption, inspect the completed and uncertain paths, preserve unrelated work and rerun the check before continuing.
The local consumer suite covers required outputs, UO write protection and the bound root; generic parser and built-in policy conformance stay with the supplier.

### Preventing order-sensitive JSON identities

`npm run lint:js` enables `json-quality/no-json-stringify-identity` at error severity for the JavaScript inputs selected by ESLint.
The same rule applies when ESLint is invoked on JS, MJS or CJS files; existing npm glob selection is unchanged.
It rejects raw `JSON.stringify` results used in equality/inequality, `Object.is`, native Node equality assertions, Jest/Vitest equality matchers, known Set/Map keys, array membership, computed property keys and native hash inputs.

Ordinary file, log and transport serialization remains allowed.
Use structured comparisons for semantic data; native deep comparison preserves array order and exact fields/values while ignoring object-member order.
The rule has no automatic fix because choosing a semantic comparison, canonical digest or byte contract requires knowing the consumer.

The [shared plugin](https://github.com/Hadden-Industries/json-quality) uses native ESLint binding analysis for direct, computed-literal, destructured, assigned and bound aliases, and selected string/Buffer transformations.

Tracking is conservative across assignments and bounded to 64 lexical analysis frames and 100,000 steps per file; exceeding either bound fails lint and asks for a simpler alias graph.
It does not prove arbitrary imported/local helper behavior, reflective calls, dynamic property mutation or all collection-producing callbacks.
Keep independent object-permutation and array/mutation regression tests at semantic consumer boundaries.

Intentional representation identities need one local declaration immediately before the serializer or its containing statement:

```js
// json-identity-contract: ordered-tuple; owner: Projection policy; reason: Validated scalar fields define this tuple identity.
const key = JSON.stringify([pathPrefix, throughVersion]);
seen.add(key);
```

The only contract kinds are `bytes`, `digest` and `ordered-tuple`; both owner and reason are required.
One declaration covers one serializer, never a whole file or several serializers on the same line.
Malformed, ambiguous, misplaced and unused declarations fail lint.

Existing producer-presentation checks, permutation byte oracles and versioned RDF identities retain explicit local contracts; no digest or cursor-format migration is introduced.
Unused ESLint disable directives also fail at error severity.
The release verifier binds the root dependency manifest and lockfile, UO adapter and consumer regression tests in the reviewed policy graph.

### Python and Markdown style

`npm run check:style` runs full Markdown checking, Python linting and Python formatting checks.
`npm run lint:python:fix` applies Ruff's safe fixes; `npm run format:python` formats Python.
Ruff retains its configured Python scope and runtime.

`npm ci --include=dev --ignore-scripts` installs Markdown Quality with the root development graph and matching optional native package from the frozen root lock.
`npm run check:markdown` invokes the maintained native capability in full-selection mode without writing or installing anything.
`npm run format:markdown` explicitly writes the same complete corpus; preservation guards reject changes to parsed meaning or literals.
Preview a selected file without writing with `npm exec -- markdown-quality format --dry-run --root . -- README.md`.
Both support `-- --json` for the capability's canonical result schema.

Exit 0 means no blockers, 1 means blocking findings or formatting drift, and 2 means an operational failure; advisory findings remain visible on success.
Consumers must check process and report identity together.
Changed-path shortcuts are rejected because deleting a non-Markdown link target can break an unchanged document.

The default selection is `**/*.md` with no ignore-file authority.
Markdown policy is declared in `.markdown-quality.json`; scripts must not maintain competing exclusion lists.
The owner-approved exclusions preserve historical SDLC, reviews, research and plans, vendor content and generated Editing Policy pages, alongside installed skill/tool and build-output paths.
The shared package reconciles full selection with the Git inventory and records each tracked document as selected or policy-excluded.

`npm run inspect:markdown -- --json` exposes those decisions and exclusion reasons.
Selected unsafe or missing content fails explicitly; excluded content remains unchanged.
Repair missing physical-file links against real files or pinned historical sources; source annotations that are plain prose must be escaped as plain prose.

Strict whitespace and heading rules remain enabled.
Generated policy is processed through the public logical-document operation at the canonical output path against the actual repository root, without scratch files or checkout writes.
Its configured exclusion preserves raw graph-rendered bytes; freshness still rejects a changed graph or hand-edited document.

Regenerate with `npm run generate:editing-policy`.
Generation now checks the complete model, preservation report, sidebar, manifest and seven light/dark SVG/PNG diagram families.
It uses the locked root Mermaid tooling and the existing Playwright Chromium headless shell without downloading packages or browsers.
Browser installation is a separate explicit operation: `npm run install:editing-policy-browser`.

Rendering CLI tests belong to the Node-backed Python family; pure extraction and local Wiki preparation tests remain in the Python-only family.
The generated sidebar is also excluded from authored Markdown formatting because its links target Wiki page names.
See the [documentation authoring guide](editing-policy/README.md) for source ownership and release acceptance limits.

Root npm commands invoke the installed public bin using explicit repository roots.
The generator calls a small Node adapter using public `processLogicalDocument` and `validateQualityResult`; Python owns graph freshness and publication writes.
The adapter independently requires result schema 5, successful operation, unchanged request/path identity and no checkout writes.
`.markdown-quality-execution.json` retains the ordinary 30-second execution ceiling; package defaults supply other finite bounds.

Every functional PR/main route runs a fresh full-corpus check on Windows and Ubuntu, even for a target-only change.
Three UO consumer checks remain in Jest and exercise the root npm commands for maintained selection, independently expected historical exclusions, literal preservation, read-only checking and native exit propagation.
Generic transport and trust probes are owned by the producer.
Documentation does not select unrelated product or ontology work.
The existing selected Node assertion reuse remains authenticated and bounded; it never reuses Markdown checking, and the main gate still requires fresh Markdown completion at the exact main revision.
Ordinary checks and generated-output admission do not create trusted qualification receipts.

`npm run check:qualification` includes full Markdown through lint before wider product verification.
The application's workspaces and shipped dependency graph do not include the AGPL Markdown tooling.
Python source edits retain their existing independent checks; style-tool/configuration changes retain the platform regression matrix.

## Publication safeguards

`scripts/validate_ontologies.py --purpose latest-active` writes its qualification receipt under `.sdlc/runtime/policy-reports` (ignored by Git; `--report-directory` selects another location).
`scripts/upload_to_s3.py` reads the same receipt and refuses to publish when it is missing, was produced for a diagnostic purpose, or no longer matches the current policy, authority snapshot, dependency lock, active module set, sources or built artifacts.
Historical receipts do not qualify a later publication.

The website build also discovers every valid dated ontology at or after `20260714` under the three ontology source roots.
Roots declaring imports get freshly materialized `-full`, `-full.jsonld`, `-full.csv` and `-full.xmi` outputs, using checked-in release mappings and local catalogs with network acquisition disabled.

Roots without imports get no full counterparts.
The pinned OwlAPI renders these closures as readable RDF/XML by default: semantic prefixes, four-space indentation, typed OWL elements, banners, nested expressions and safe collections.
Unclassified resources and cases requiring explicit graph representation can still use `rdf:Description`.

The consumer continues calling public `OWLOntologyManager.saveOntology`; there is no UO formatter or Java runtime dependency.
It preserves authored RDF/XML root prefix preferences through `RDFXMLDocumentFormat.copyPrefixesFrom`, including explicit unused prefixes, rather than combining imported documents' prefix maps.
The generated file passes strict offline structural verification before atomic replacement; JSON-LD and CSV retain their existing graph and projection checks.

No Java OWLAPI generator footer is added, and authored comments or whitespace are not reconstructed.
The same path is available through `npm run generate:full-ontologies`; maintained full copies at or after the cutoff are rejected.

For a future nondefault presentation policy, configure the output manager in `scripts/ontology/loadCollapsedOntology.js` immediately after creating it and before `writeVerifiedOntology`:

```js
import { OWLOntologyWriterConfiguration } from "owlapi/model";

outputManager.setOntologyWriterConfiguration(
  new OWLOntologyWriterConfiguration()
    .withIndentSize(2)
    .withBannersEnabled(false),
);
```

That public, Java-shaped configuration controls the existing renderer and atomic verification path.
Current generation intentionally uses its defaults; a one-class fixture demonstrates identical bytes for explicit defaults and successful verified publication with two-space, banner-free output through `writeVerifiedOntology`.

`withIndenting(boolean)` and `withLabelsAsBanner(boolean)` are also available; all four settings affect RDF/XML only, and arbitrary format parameters remain unsupported.
Changing the presentation policy requires an accepted change and a fresh build receipt.

The schema-2 build receipt binds each XMI to its exact verified OWL bytes and the same collapsed in-memory model.
The exporter explicitly selects the `normative-v1` OwlAPI behavior profile.
The sole OwlAPI selector now points to an immutable upstream Git commit; the lock records its transitive payload.

Generated pages offer the full XMI through explicit receipt-backed associations.
See the [UML/XMI metadata contract](uml/README.md) for carriers, inverse recovery, projection, bounds, rights notes and native qualification.

`npm run qualify:uml-xmi -- --dependencies DIR --corpus-root DIR --output DIR --existing-output-root dist` checks the eight frozen controls plus changed current outputs with two native reader implementations.
Add `--acquire` only to download the declared qualification libraries; it does not install into the repository Python environment.

Generation invalidates the previous `full-ontology-build.json` receipt before work starts and seals a new one only after all output bytes are verified.
Both normal and forced publication invoke `node scripts/verifyFullOntologyBuild.js --repository . --output dist` without regenerating anything.
The upload wrapper copies the complete built tree into an isolated candidate, verifies its identity and qualification, and passes that candidate to the existing upload helper.

Successful candidates are removed; failed candidates remain under the ignored policy-report directory for diagnosis.
Rebuild when inputs, producer bytes, installed OWLAPI, candidate selection or outputs change.
Unknown stale full files are preserved and cause refusal; only matching prior receipt-owned stale files are removed automatically.

## Continuous integration

| Workflow                                                          | When it runs                                                 | Node evidence                                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PR validation](../.github/workflows/pr-validation.yml)           | Pull requests, with checks selected from the changed inputs. | Runs selected Node suites on the exact repository reference and records their actual environment.                                                  |
| [Main CI](../.github/workflows/main-ci.yml)                       | Pushes to `main`.                                            | May reuse authenticated PR Node results after the source, selected tests and other recorded inputs pass the reuse checks.                          |
| [Full qualification](../.github/workflows/full-qualification.yml) | Scheduled, manual and reusable release calls.                | Scheduled/manual runs on `main` may reuse a matching full Node selection at the exact pinned runtime; package and release qualification run fresh. |

All three use the same authored Node/npm reference selections described under [Setup](#setup).
Main CI preserves the Node version actually recorded in accepted PR proof; its wider admission rule can accept a newer qualifying runtime without relabelling that evidence as a run on the pin.
Full qualification requires an exact Node match.
Missing, incomplete or mismatched evidence causes fresh Node execution.
Website, ontology, development and distribution checks keep their own fresh execution requirements.

PR validation cancels superseded runs of the same pull request; unrelated pull requests remain separate.
Main CI and Full qualification run independently.
Full qualification retains each scheduled or manual run through completion.
CodeQL retains its separate PR-only cancellation policy and unique non-PR run/attempt groups.

Pull requests run, as applicable to the changed files:

- [Ontology validation](../.github/workflows/ontology-validation.yml): the editing policy on the changed sources, policy/publication-gate tests, and the Linux/Windows two-engine qualification of the active set.
- [Development checks](../.github/workflows/development-checks.yml): fresh full-corpus Markdown and JSON checks on Linux and Windows on every route, Python style on Linux, Python tests on Linux and Windows when their inputs change, an offline validation of `skills-lock.json` on Linux when the lock or its tooling changes, and Linux/Windows matrices for affected style tools or development tools.
  Development and toolchain verification use `npm run set-up:development`; JSON and Markdown consumers install the root locked Node graph with lifecycle scripts disabled.
  Python tests have two native owners: fourteen Python-only modules use the hash-locked `.venv` without Node dependency installation; three modules covering policy rendering, MCP setup and website publication retain full development setup.
  Both owners keep Linux and Windows coverage.
  Changes wholly within the fourteen known Python-only test files select the Python-only owner; source, mixed, runtime and shared-control changes retain Node-backed assurance.
  Newly discovered modules belong to the Node-backed family until reviewed.
  `npm run test:python` still runs every module; `-- --family python-only` and `-- --family node-backed` select the two inventories.
- [MCP distribution](../.github/workflows/verify-universal-ontology-mcp-distribution.yml): affected application bundle and documentation checks; product tests and website builds have distinct jobs in the caller.
  Downloadable archive, container and npm candidate qualification is disabled automatically by default.
- [CodeQL](../.github/workflows/codeql.yml).

The [PR validation workflow](../.github/workflows/pr-validation.yml) is the sole functional PR entry point and calls the three reusable consumers above.
Its single selector emits a versioned plan for the tested merge revision; every consumer checks that revision before executing product code.

The final `PR validation` job rejects failed, cancelled, missing, or unexpectedly skipped work and requires a matching completion output from each selected consumer.
Reusable consumers also check their internal jobs before publishing that output.
CodeQL remains separate and is not included in this functional gate.

When automatic package CI is disabled, a change wholly within the six reviewed MCP release-control inputs selects eleven native control suites in the existing Node consumer.
This selected coverage does not claim full product qualification.
Mixed or shared-control changes retain conservative coverage; explicit package CI retains its artifact obligations.

The `main` ruleset requires `PR validation` from the GitHub Actions app and requires PRs to be up to date with `main`.
The obsolete `OWL Differential Analysis` required context and duplicate workflow triggers have been removed after live failure trials.
CodeQL is not a required status in that ruleset; fork PR analysis remains limited by its same-repository condition.

[Main CI](../.github/workflows/main-ci.yml) uses affected checks on pushes to `main`, comparing the exact push revision with its `before` commit.
An unavailable push comparison conservatively selects every source scope.
[Full qualification](../.github/workflows/full-qualification.yml) selects every source scope on manual dispatch, on Wednesdays at 04:17 UTC and when invoked by a reusable-workflow caller.
Package work requires explicit enablement.

Repository maintainers own failures and should use their GitHub Actions notification subscriptions to receive failure notifications.
Maintainers must inspect the most recent successful full run before relying on it, and dispatch an authorized full run at the exact intended release revision when necessary.

Schedules can be delayed or disabled after repository inactivity; re-enable a disabled workflow through its Actions page, then obtain an exact-revision successful run.
The original consumer filenames accept only `workflow_call`; no compatibility workflows or temporary consumers remain.

The graph gives each Jest suite one Linux owner when all scopes are selected; bootstrap and formatter qualification retain Windows coverage.
Python unit tests own the full suite when selected, while generated-policy checks, active-set qualification, and Jena parity remain distinct.

Set the repository Actions variable `MCP_PACKAGE_CI_ENABLED` to the literal `true` to restore automatic package qualification.
Unset, empty or `false` disables it; other values fail selection visibly.
When enabled, package, runtime, platform and packaged README inputs select all five native archives, the container smoke check and complete npm/checksum/SBOM candidate assembly.

Scheduled and ordinary manual full runs also include that complete matrix when enabled.
This option never enables Release publication.
Application bundles are still built through the standalone paths: no measured artifact-transfer benefit has yet justified reuse.

Use [Manual MCP packages](../.github/workflows/manual-mcp-packages.yml) on `main` to qualify its exact dispatch commit, independently of the automatic option.
The default `create_draft_release=false` runs every source check and the complete package matrix, then validates the disposable candidate without creating a Release.

Selecting `create_draft_release=true` adds provenance attestations and attaches those exact verified files to a draft GitHub Release.
The isolated draft job has publication permissions; builders do not.
Existing tags or releases cause refusal rather than replacement, and a partially created draft requires deliberate operator recovery.

Public publication requires manually publishing that draft in GitHub Releases.
There is no automatic npm, GHCR or MCP Registry publication.
See the [installation guide](mcp/local-installation.md#manual-package-qualification-and-release) for package contents and where downloads live.

Ordinary Python style jobs install only the exact hash-locked Ruff wheel and reject a changed runtime dependency closure.
Bootstrap jobs continue to exercise full development setup.
Selectors and release-candidate jobs have caching disabled; other functional consumers use read-only cache access.
No trusted cache warmer is introduced before measurement.

When editing the execution policy, update its schema and regenerate the standalone validator with `node scripts/generatePullRequestCheckPlanValidator.js --write`.
Use `--check` to verify freshness without writing.
The distribution verifier also checks an explicit policy manifest covering entry points, reusable consumers, selection/evaluation inputs, native test runners, the root dependency manifest and lockfile, UO adapter, JSON policy and manual candidate validator.
A semantic workflow or control-input change requires coordinated review, updated assertions, negative tests, and a deliberate digest update.

`scripts/selectPullRequestChecks.js` decides which jobs apply from the changed paths.
Authored documentation selects only its content check; preserved documents do not select style checks by themselves.
Mixed changes retain every applicable consumer check.
Unselected ontology work needs no Python provisioning; the aggregate independently verifies selection and every selected consumer's completion receipt.

Reviewed test-only edits can select the complete build, import-closure, query/projection, frontend, MCP, distribution or utility family inside the existing Node consumer. The closed inventory contains 73 existing test files. Mixed known test families run their union. Source, fixture, dependency, new/unknown test, deletion, rename and shared-control changes retain the conservative route.

Full qualification retains complete discovery and tooling ownership.
No production website build is needed solely for an isolated reviewed test-file edit; fixture builds within its selected family still execute.

The PR qualification writer retains selected Node execution only after the existing gate and every selected consumer's native job/output identities agree.
It records exact tested merge/tree/parents, host and locked tool inputs, native discovery and selection, suite/assertion labels/counts, and each producing job attempt.
Forks, unsupported plans and unavailable evidence retain fresh behavior without a reusable record.

Receipts expire after three days.
Main CI may reuse this directly executed Node proof for control, reviewed test-family and broader source plans after an exact, same-repository two-parent integration.
Both Node versions must meet the repository minimum.
Main CI retains the original Node version in the proof and compares the other environment fields exactly.

The selector authenticates the latest successful original PR run and every producing job attempt, the tested and landed Git tree/parents/workflow, the current supported environment, and the native artifact ID, digest, expiry and bounded ZIP bytes.
It rereads the source run and artifact after checking jobs; a newer failed or pending run, rerun, mismatch, missing evidence or exhausted budget selects fresh work.

Only the selected Node consumer may be omitted; every other selected consumer, including the website build, still runs fresh.
The shared gate verifies the source record and current checkout, requires each fresh consumer's completion at the landed revision, and rejects unexpected, failed, cancelled or skipped work.
The reuse result reports the original PR run, attempt and Node version.

Scheduled and manual Full qualification on `main` may reuse the original PR Node proof for its exact merge commit.
The proof must match the full Node test selection, the pinned Node version and the rest of the recorded environment.
Package and release qualification, squash merges, rebases and direct pushes require fresh checks, as do pushes with multiple integrations.
Set the independent Actions variable `UO_PR_QUALIFICATION_REUSE_DISABLED` to literal `true` to force fresh work; this implementation does not write that repository setting.

Admission permits at most 32 bounded JSON reads and one exact-ID native archive operation within 60 seconds; each operation has a ten-second ceiling.
The native Git snapshot has a 30-second total budget and 1 MiB per-call bound; JSON API responses are limited to 2 MiB, the ZIP to 128 KiB, the sole regular `qualification.json` member to 512 KiB and the decoded admission output to 400 KiB.

Native coverage retention is limited to 256 KiB decoded.
Both Node proof handoffs use gzip/base64 capped at 64 KiB, keeping nested job outputs below the runner's per-environment-string limit.

Proofs exceeding either bound fall back to fresh Node execution; decoding also enforces the original size limit.
The existing GitHub CLI transports authenticated archive bytes, and the Ubuntu runner's native Info-ZIP 6.00 inspects and reads the single member without extracting files.
Unavailable native tooling retains fresh work; no npm provisioning is added to the selector.
