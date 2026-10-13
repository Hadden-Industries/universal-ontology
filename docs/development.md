# Development guide

How to set up a checkout, what each command does, which integrations are optional, and how to verify a change.
Nothing here is a prerequisite for opening a pull request; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup

Requirements: Git 2.46 or later, an LTS build of Node.js 24.21.0 or a newer 24.x release, stable npm 12.2.0 or later, stable Python at or above the minimum in `.python-version`, and optionally a JDK matching `.java-version` for the second-engine ontology checks.
`package.json` declares `devEngines.packageManager.version` as `>=12.2.0` with `onFail: "error"`; npm enforces this native contract before install, clean install and script execution, and development setup uses npm's bundled validator.
Later stable npm majors satisfy the range; prereleases do not.
The exact `packageManager` reference remains `npm@12.2.0`, and CI and release builds explicitly select and verify that version for reproducibility.
CI provisions the exact Python version in that file through SHA-pinned `astral-sh/setup-uv` with uv 0.13.0 and caching disabled.
The action activates an isolated environment under the runner's temporary directory; subsequent setup creates the repository `.venv` and installs the hash-locked requirements through pip.
Development setup accepts newer stable versions and preserves the existing `.venv`.
The README's [development setup](../README.md#development-setup) section explains the version selection.

```sh
npm run set-up:development
npm run configure:git-hooks
```

`set-up:development`:

- checks the Node.js, npm and Python versions;
- runs `npm ci --include=dev --ignore-scripts` from `package-lock.json`;
- acquires the separate integrity-pinned Markdown tooling graph with anonymous registry settings and lifecycle scripts disabled;
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
Local `file:` sources, including the vendored Braces repair and retained Markdown tooling archives, preserve their source identities.
OwlAPI is an owner-approved exception to registry ranges: `devDependencies.owlapi` in the root `package.json` is its sole editable source/version selector.
Use either `git+https://github.com/OWNER/REPOSITORY.git#FULL_40_CHARACTER_COMMIT` or `npm:PACKAGE_NAME@EXACT_VERSION`, including an exact prerelease when selected.
The local dependency name and all consumer imports stay `owlapi` and `owlapi/...` for either form.
The import-closure policy references this manifest entry; package names, versions, sources and integrity values in `package-lock.json` are generated observations, not independent settings.
Root `.npmrc` sets `allow-git=root`, admitting this direct dependency while rejecting transitive Git dependencies under npm 12; setup and CI continue disabling lifecycle scripts.
The PR selector treats `.npmrc` as a manifest-dependent input, and the release verifier pins its exact contents alongside the approved package manifest and selector.
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

| Command                                | Effect                                                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run set-up:agent-skills`          | Refresh the external Agent Skills declared in `skills-lock.json` into `.agents/skills` and `.claude/skills` using the pinned Skills CLI. A branch reference tracks its current tip; the CLI records the installed content hash in the lock. |
| `npm run set-up:mcp-servers -- --help` | Show the MCP server installer's options before choosing its download/network actions. `--check` only verifies the checked-in host configuration documents.                                                                                  |
| `npm run publish:website`              | Upload built site assets to S3. Requires the AWS CLI and separate authorization; refuses to publish without a current qualification receipt (see below).                                                                                    |

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
| Website build              | `npm run build:verify`                                   | Preserves tracked inputs and writes ignored `dist/` output. `npm run build` also runs Vite directly.             |
| JSON-LD generation         | `npm run generate:json-ld`                               |                                                                                                                  |
| MCP package                | `npm run build:mcp-package`                              | See [docs/mcp/local-development.md](mcp/local-development.md).                                                   |

`npm run test:python -- --granularity test` runs each Python test method in its own process instead of each module.
Use the focused checks that match what you changed while working, and the wider suites before opening or updating a pull request.
Report failures, skips and checks you could not run as they are.

### JSON quality and safe fixing

`npm run check:json` automatically discovers and checks source and generated JSON read-only, including untracked and Git-ignored files.
`npm run lint:json` checks inventory, strict JSON syntax, decoded duplicate keys and native interoperability rules with zero warnings.
`npm run format:json:check` checks inventory and presentation.
`npm run format:json` performs the full lint and producer-format preflight, Prettier's debug check, the permitted writes and a final read-only check.
`lint`, `format:check` and `check:qualification` include JSON quality; `format`, `fix:all` and `fix:code-style` reach the JSON writer exactly once.
`format:node` and `format:node:check` select non-JSON sources only.
They pass their mode to the same `format:node:files` selection, so its glob list is maintained once.

[The JSON policy](../.json-quality.json) schema v4 records defaults and sparse exceptions rather than an admission allowlist.
Ordinary `.json`, `.jsonld` and `.sarif` files need no policy entry or staging: create, check, fix and stage the final bytes.
Defaults require strict syntax, native interoperability lint, NFC for every decoded key and string value, and standard presentation.
There is one shared lint contract; the obsolete `lintProfile` field is rejected in defaults and exceptions.
Exceptions specify their owner and reason for external boundaries, write protection or producer-defined presentation.
The existing 66 tracked producer/retained files remain protected; new files within their protected families inherit that protection.
Git ignore rules never suppress checking.
Ignored untracked files are always read-only to the generic formatter.
Installed dependencies (`**/node_modules/**`), `.venv`, installed agent skills/tools, Git administration and local workflow/tool state are explicit external boundaries.
Boundary rules never conceal tracked JSON; discovery prunes external trees and independently includes every indexed JSON path.
`npm run check:json:inventory` prints encountered external boundaries and their reasons.
Missing tracked files, unmerged/case-colliding paths, unsafe links and conflicting exceptions fail closed.
JSONC, JSON5, JSON Lines and NDJSON are detected but require separate dialect qualification; they cannot silently escape checking.
Suffix discovery does not detect extensionless or embedded JSON, which needs an owning producer/consumer contract.
The mandatory Linux/Windows JSON jobs run `build:verify` before `check:json -- --require-generated`; absent generated JSON-LD or the query catalog fails the final gate.
The read-only command checks existing files; it does not build or fix anything itself.
Package qualification also rebuilds the source bundle and validates actual packed target bytes through the shared contracts.
The shared byte boundary rejects malformed UTF-8 and a leading UTF-8 byte order mark (BOM) before parsing or presentation checks.
Failures identify the repository-relative file; protected/generated files and normalization-preservation exceptions retain this requirement.
U+FEFF inside a valid JSON string remains data and is preserved under the existing key, NFC and presentation rules.
Repair a failing artifact through its owning source or producer; checks never remove a BOM automatically.

The token-based preservation oracle directly declares Apache-2.0 `@humanwhocodes/momoa` as a development dependency.
Its selected version remains 3.3.13; the declaration does not change public runtime dependencies or replace the independent oracle with production quality logic.

The locked native tools are Prettier 3.9.10 and ESLint 10.12.0 with official `@eslint/json` 2.1.1.
Strict JSON rejects comments, trailing commas, unquoted keys and non-JSON numeric forms.
Duplicate keys are compared after escape decoding.
Unsafe-value checks reject integer literals outside the safe range, overflow, nonzero underflow, subnormal numbers and lone surrogates.
Shared interoperability checks also reject Unicode noncharacters in every decoded key and string value, including escaped characters and supplementary planes.
Every mathematically integral JSON number must lie within -9007199254740991 through 9007199254740991, including decimal/exponent spellings such as `9007199254740992.0` and `9.007199254740992e15`.
The exact source lexeme determines whether a number is integral; binary64 rounding never supplies that decision.
Ordinary fractions such as `0.1` remain valid; these checks do not guarantee arbitrary decimal precision.
Keys must be nonempty, contain a non-whitespace character and have no leading/trailing whitespace after escape decoding.
Interior spaces and empty/whitespace-bearing string values remain valid.
The owner/reason `allowEmptyKeys` exception lists exact JSON Pointers ending in an empty segment; the only current exception is `/packages/` in `**/package-lock.json`, where npm identifies the root package.
It permits only the literal empty key at that location; other empty keys, whitespace-only keys, duplicate keys, unsafe values and non-NFC data still fail.
Shared checks apply independently of write protection and normalization preservation, and expose no automatic data fix.
NFC applies by default to every decoded JSON key and string value, including nested values, array/root strings, JSON-LD and generated products.
The shared ESLint rule reports non-NFC strings and keys that would collide after NFC; it deliberately exposes no automatic ESLint fix.
`normalization: "preserve"` is an explicit `.json-quality.json` exception requiring an owner, reason and `allowFormatWrites: false`; it preserves exact string identity while retaining strict syntax, duplicate-key, unsafe-value and presentation checks.
Write protection alone never exempts a file from NFC validation.
The former control-key override is redundant and has been removed.
Formatting never normalizes keys or values, sorts members or repairs schema/domain errors.

Use the explicit authored-source repair command with literal repository-relative paths:

```sh
npm run normalize:json -- path/to/source.json another/source.json
npm run format:json
npm run check:json
```

The normalizer requires at least one explicit discovered, writable source path.
It preflights every selected input and the prospective full corpus before the first write, rejecting NFC key collisions, invalid/unsafe JSON, protected outputs, preservation exceptions, ignored untracked files and changed source bytes.
Only string tokens needing NFC are replaced; member/array order, numeric lexemes, unchanged escapes and surrounding whitespace are preserved.
Normalization is idempotent and does not perform NFKC, trimming or case conversion.
Keep source writers quiescent; multi-file writes are not a transaction.
After interruption, inspect completed writes and retained failure output before resuming.
Fix protected/generated data in its owning source and regenerate it instead of applying this command to the output.

An owning JSON producer can import the pure `normalizeJsonSource(text, contract)` operation from [shared contracts](../scripts/jsonQuality.js) at its source-input boundary.
It uses the same native parser, interoperability preflight and collision analysis, returns normalized text without writing, and refuses a preservation contract.
The producer must still validate its schema, graph, references and digests before publishing derived products; normalization can change exact string identity even when text looks identical.
For JSON-LD, fix the owning RDF source and retain existing graph verification rather than silently normalizing serialized literals.
Prettier's explicit `json-stringify` presentation uses two spaces, LF, double quotes, no trailing commas and one final newline while preserving member order and numeric lexemes.
Read-only formatting uses the native Prettier API across every policy record, independently of its write eligibility.
The retained Oxigraph notice uses `producer-json-body`: its existing LF/CRLF envelope and absent final newline are permitted, while native Prettier checks the entire JSON body.
Other tracked files currently use standard Prettier presentation.
Generated ontology/query/distribution products using native `JSON.stringify(..., null, 2)` receive exact two-space, final-LF producer serialization checks.
The retained npm SPDX report permits its original CRLF envelope; the retained Jest report requires compact native JSON plus final LF.
These are presentation contracts, not lint exemptions.
Schema, graph and digest checks remain owned by the producer/consumer.
Consumer comparisons of Registry/OCI metadata, MCP application identity, archive-entry records, public-smoke provenance, full-build receipt records and cursor criteria ignore object-member insertion order while retaining array order and exact member/value checks.
Duplicate legacy interpretation identity uses the validated fields in a stable tuple, so reordering object members cannot conceal a duplicate.
Canonical semantic digest formats, opaque cursor integrity bindings, exact-byte artifact hashes and producer presentation remain their own contracts; formatting does not sort JSON to compensate for consumer comparison errors.
All JSON npm commands enter [one native-tool adapter](../scripts/runJsonQuality.js), which reconciles inventory once before its selected operation.
[Shared contracts](../scripts/jsonQuality.js) supply the policy reader, native ESLint rules and producer-presentation check to repository checks and rebuilt-package qualification.
The inventory checker compares effective ESLint configuration and resolved Prettier options with these authorities to detect drift.
`.prettierignore` blocks all JSON from direct Prettier CLI writes; it does not select the read-only checks.
The supported writer derives both its exact native argument list and temporary ignore selection from discovered files, exception rules and Git write eligibility; it verifies native selection, debug-checks, writes and removes its temporary selection in a `finally` block.
The temporary ignore file resides in the repository root because native ignore patterns are relative to their file's directory.
After writes, the adapter reconciles inventory again and reruns lint and presentation across the complete corpus.

Consumer validators remain authoritative: the local MCP Registry schema, PR-plan standalone validator, release-input Ajv reader, projection-history schema/domain tests, provenance digests and JSON-LD graph equivalence checks.
Schema tests use existing Ajv without coercion, defaults, property removal or remote reference resolution.
Fix a producer or authored source when its validation fails; do not rewrite protected output to conceal the failure.

Prettier writes are not a transaction.
Before a bulk fix, preserve the current task-owned candidate and hashes in an approved checkpoint or disposable copy, with any unrelated work retained separately.
After interruption, inspect which eligible files changed, compare the checkpoint, rerun the full lint/debug preflight and complete formatting only when the candidate is understood.
Reverse only this task's edits if recovery is needed; do not reset or restore someone else's changes.
Concurrent source writers and direct CLI overrides such as `--no-ignore`, `--ignore-path`, `--parser` or ESLint JSON `--fix` are outside the supported safe-fix contract.
Regression tests exercise real native binaries in disposable Git checkouts, check byte preservation and idempotence, and reject invalid inputs before the first write.

### Preventing order-sensitive JSON identities

`npm run lint:js` enables `uo/no-json-stringify-identity` at error severity for the JavaScript inputs selected by ESLint.
The same rule applies when ESLint is invoked on JS, MJS or CJS files; existing npm glob selection is unchanged.
It rejects raw `JSON.stringify` results used in equality/inequality, `Object.is`, native Node equality assertions, Jest/Vitest equality matchers, known Set/Map keys, array membership, computed property keys and native hash inputs.
Ordinary file, log and transport serialization remains allowed.
Use structured comparisons for semantic data; native deep comparison preserves array order and exact fields/values while ignoring object-member order.
The rule has no automatic fix because choosing a semantic comparison, canonical digest or byte contract requires knowing the consumer.

The [local rule](../scripts/eslint/noJsonStringifyIdentity.js) uses native ESLint binding analysis for direct, computed-literal, destructured, assigned and bound aliases, and selected string/Buffer transformations.
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
The release verifier binds the rule and its regression tests in the reviewed 44-input policy graph.

### Python and Markdown style

`npm run check:style` runs full Markdown checking, Python linting and Python formatting checks.
`npm run lint:python:fix` applies Ruff's safe fixes; `npm run format:python` formats Python.
Ruff retains its configured Python scope and runtime.

`npm run install:markdown` installs the isolated development-only graph in `tooling/markdown` from the retained core/native archives and frozen lock, with anonymous registry access for the remaining dependencies, empty npm configuration files and no lifecycle scripts.
`npm run check:markdown` invokes the maintained native capability in full-selection mode without writing or installing anything.
`npm run format:markdown` formats the same complete corpus; preservation guards reject changes to parsed meaning or literals.
Both support `-- --json` for the capability's canonical result schema.
Exit 0 means no blockers, 1 means blocking findings or formatting drift, and 2 means an operational failure; advisory findings remain visible on success.
Consumers must check process and report identity together.
Changed-path shortcuts are rejected because deleting a non-Markdown link target can break an unchanged document.

The policy is `"include": ["**/*.md"]` with no ignore inputs.
Markdown policy is declared in `.markdown-quality.json`; scripts must not maintain competing exclusion lists.
The owner-approved exclusions include `docs/sdlc/*`, `docs/reviews/*`, `vendor/*` and the specific `docs/policy/Editing-Policy.generated.md` file, alongside installed skill/tool and build-output paths.
The shared package reconciles full selection with the Git inventory and records each tracked document as selected or policy-excluded.
`npm run inspect:markdown -- --json` exposes those decisions and exclusion reasons.
Selected unsafe or missing content fails explicitly; excluded content remains unchanged.
Repair missing physical-file links against real files or pinned historical sources; source annotations that are plain prose must be escaped as plain prose.
Strict whitespace and heading rules remain enabled.
Generated policy is processed through the public logical-document operation at the canonical output path against the actual repository root, without scratch files or checkout writes.
Its configured exclusion preserves raw graph-rendered bytes; freshness still rejects a changed graph or hand-edited document.
Regenerate with `npm run generate:editing-policy`.

Root npm commands invoke installed public bins in the isolated tooling project.
The generator resolves the public bin declaration; the package owns bounded invocation, validation, selection, staging and native observation.
`.markdown-quality-execution.json` is the sole consumer qualification profile: it references the runtime declarations and archive/lock identities, and carries finite operational bounds without Markdown content policy.
The retained archive tuple is paired with producer source `2a8f162cd98a8548d8fa7b065cd6fe1828efcab7`; its manifest version alone does not identify this development implementation.

Every functional PR/main route runs a fresh full-corpus check on Windows and Ubuntu, even for a target-only change.
Independent UO consumer assertions remain in Jest; generic transport and trust probes are owned by the producer.
Documentation does not select unrelated product or ontology work.
The existing selected Node assertion reuse remains authenticated and bounded; it never reuses Markdown checking, and the main gate still requires fresh Markdown completion at the exact main revision.
The separate trusted dispatch workflow calls the SHA-pinned producer workflow, takes an explicit reviewed `trusted_sha`, and treats the candidate exclusively as data.
Its six-run resource windows and provider identities are retained as qualification evidence, separate from ordinary CI.

`npm run check:qualification` includes full Markdown through lint before wider product verification.
`npm run qualify:markdown -- --help` describes the separate exact-commit resource qualification; it requires committed inputs and the selected Python runtime.
The application's workspaces and shipped dependency graph do not include the AGPL Markdown tooling.
Python source edits retain their existing independent checks; style-tool/configuration changes retain the platform regression matrix.

## Publication safeguards

`scripts/validate_ontologies.py --purpose latest-active` writes its qualification receipt under `.sdlc/runtime/policy-reports` (ignored by Git; `--report-directory` selects another location).
`scripts/upload_to_s3.py` reads the same receipt and refuses to publish when it is missing, was produced for a diagnostic purpose, or no longer matches the current policy, authority snapshot, dependency lock, active module set, sources or built artifacts.
Historical receipts do not qualify a later publication.

The website build also discovers every valid dated ontology at or after `20260714` under the three ontology source roots.
Roots declaring imports get freshly materialized `-full`, `-full.jsonld` and `-full.csv` outputs, using checked-in release mappings and local catalogs with network acquisition disabled.
Roots without imports get no full counterparts.
The pinned OwlAPI renders these closures as readable RDF/XML by default: semantic prefixes, four-space indentation, typed OWL elements, banners, nested expressions and safe collections.
Unclassified resources and cases requiring explicit graph representation can still use `rdf:Description`.
The consumer continues calling public `OWLOntologyManager.saveOntology`; there is no UO formatter or Java runtime dependency.
It preserves authored RDF/XML root prefix preferences through `RDFXMLDocumentFormat.copyPrefixesFrom`, including explicit unused prefixes, rather than combining imported documents' prefix maps.
The generated file passes strict offline structural verification before atomic replacement; JSON-LD and CSV retain their existing graph and projection checks.
No Java OWLAPI generator footer is added, and authored comments or whitespace are not reconstructed.
The same path is available through `npm run generate:full-ontologies`; maintained full copies at or after the cutoff are rejected.

For a future nondefault presentation policy, configure the output manager in `scripts/materializeImportClosure.js` immediately after creating it and before `writeVerifiedOntology`:

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

Generation invalidates the previous `full-ontology-build.json` receipt before work starts and seals a new one only after all output bytes are verified.
Both normal and forced publication invoke `node scripts/verifyFullOntologyBuild.js --repository . --output dist` without regenerating anything.
The upload wrapper copies the complete built tree into an isolated candidate, verifies its identity and qualification, and passes that candidate to the existing upload helper.
Successful candidates are removed; failed candidates remain under the ignored policy-report directory for diagnosis.
Rebuild when inputs, producer bytes, installed OWLAPI, candidate selection or outputs change.
Unknown stale full files are preserved and cause refusal; only matching prior receipt-owned stale files are removed automatically.

## Continuous integration

PR validation cancels superseded runs of the same pull request; unrelated pull requests remain separate.
Full qualification has no concurrency group, so later main, scheduled, or manual runs cannot replace its pending or running work.
CodeQL retains its separate PR-only cancellation policy and unique non-PR run/attempt groups.

Pull requests run, as applicable to the changed files:

- [Ontology validation](../.github/workflows/ontology-validation.yml): the editing policy on the changed sources, policy/publication-gate tests, and the Linux/Windows two-engine qualification of the active set.
- [Development checks](../.github/workflows/development-checks.yml): fresh full-corpus Markdown and JSON checks on Linux and Windows on every route, Python style on Linux, Python tests on Linux and Windows when their inputs change, an offline validation of `skills-lock.json` on Linux when the lock or its tooling changes, and Linux/Windows matrices for affected style tools or development tools.
  Development and toolchain verification use `npm run set-up:development`; the JSON matrix installs the root locked Node graph with lifecycle scripts disabled, while the Markdown matrix installs its isolated locked tools.
  Python tests have two native owners: twelve Python-only modules use the hash-locked `.venv` without Node dependency installation; three modules covering Skills/MCP setup and website publication retain full development setup.
  Both owners keep Linux and Windows coverage.
  Changes wholly within the twelve known Python-only test files select the Python-only owner; source, mixed, runtime and shared-control changes retain Node-backed assurance.
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

[Full qualification](../.github/workflows/full-qualification.yml) uses affected checks on pushes to `main`, comparing the exact push revision with its `before` commit.
An unavailable push comparison conservatively selects every source scope.
Manual dispatch and Wednesdays at 04:17 UTC select every source scope; package work remains disabled unless explicitly enabled.
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
The distribution verifier also checks an explicit forty-two-file policy manifest covering the entry points, reusable consumers, selection/evaluation inputs, native test runners, shared JSON contracts/adapter, JSON policy/configuration/lock and manual candidate validator.
A semantic workflow or control-input change requires coordinated review, updated assertions, negative tests, and a deliberate digest update.

`scripts/selectPullRequestChecks.js` decides which jobs apply from the changed paths.
Authored documentation selects only its content check; preserved documents do not select style checks by themselves.
Mixed changes retain every applicable consumer check.
Unselected ontology work needs no Python provisioning; the aggregate independently verifies selection and every selected consumer's completion receipt.

Reviewed test-only edits can select the complete build, import-closure, query/projection, frontend, MCP, distribution or utility family inside the existing Node consumer. The closed inventory contains 74 existing test files. Mixed known test families run their union. Source, fixture, dependency, new/unknown test, deletion, rename and shared-control changes retain the conservative route.
Full qualification retains complete discovery and tooling ownership.
No production website build is needed solely for an isolated reviewed test-file edit; fixture builds within its selected family still execute.

The PR qualification writer retains selected Node execution only after the existing gate and every selected consumer's native job/output identities agree.
It records exact tested merge/tree/parents, host and locked tool inputs, native discovery and selection, suite/assertion labels/counts, and each producing job attempt.
Forks, unsupported plans and unavailable evidence retain fresh behavior without a reusable record.
Receipts expire after three days.
Ordinary main qualification may reuse this directly executed Node proof for control, reviewed test-family and broader source plans after an exact, same-repository two-parent integration.
The selector authenticates the latest successful original PR run and every producing job attempt, the tested and landed Git tree/parents/workflow, the current supported environment, and the native artifact ID, digest, expiry and bounded ZIP bytes.
It rereads the source run and artifact after checking jobs; a newer failed or pending run, rerun, mismatch, missing evidence or exhausted budget selects fresh work.
Only the selected Node consumer may be omitted; every other selected consumer, including the website build, still runs fresh.
The stable full completion gate verifies the source record and current checkout, requires each fresh consumer's completion at the landed revision, and rejects unexpected, failed, cancelled or skipped work.
The reused result remains original PR evidence and is never reissued as fresh execution.
Schedules, manual runs, reusable publication callers, package opt-in, squash/rebase/direct or multiple-integration pushes remain fresh.
The manual package qualification caller grants read-only Actions permission because reusable workflows cannot elevate their caller token; its selector still chooses fresh work.
Set the independent Actions variable `UO_PR_QUALIFICATION_REUSE_DISABLED` to literal `true` to force fresh work; this implementation does not write that repository setting.
Admission permits at most 32 bounded JSON reads and one exact-ID native archive operation within 60 seconds; each operation has a ten-second ceiling.
The native Git snapshot has a 30-second total budget and 1 MiB per-call bound; JSON API responses are limited to 2 MiB, the ZIP to 128 KiB, the sole regular `qualification.json` member to 512 KiB and the decoded admission output to 400 KiB.
Native coverage retention is limited to 256 KiB decoded.
Both Node proof handoffs use gzip/base64 capped at 64 KiB, keeping nested job outputs below the runner's per-environment-string limit.
Proofs exceeding either bound fall back to fresh Node execution; decoding also enforces the original size limit.
The existing GitHub CLI transports authenticated archive bytes, and the Ubuntu runner's native Info-ZIP 6.00 inspects and reads the single member without extracting files.
Unavailable native tooling retains fresh work; no npm provisioning is added to the selector.
