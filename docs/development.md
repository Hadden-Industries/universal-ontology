# Development guide

How to set up a checkout, what each command does, which integrations are optional, and how to verify a change.
Nothing here is a prerequisite for opening a pull request; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup

Requirements: Git 2.46 or later, an LTS build of Node.js 24.15.0 or later, npm 12 (`package.json` declares the exact `packageManager` version; compatible patch/minor updates are accepted), the Python version in `.python-version`, and optionally a JDK matching `.java-version` for the second-engine ontology checks.
The README's [development setup](../README.md#development-setup) section explains the version selection.

```sh
npm run set-up:development
npm run configure:git-hooks
```

`set-up:development`:

- checks the Node.js, npm and Python versions;
- runs `npm ci --include=dev --ignore-scripts` from `package-lock.json`;
- creates `.venv` if it does not exist (an unusable existing `.venv` stops setup so you can repair it), then installs `requirements.lock.txt` with `--require-hashes --only-binary=:all:` and refuses a `.venv` whose installed distributions differ from that lock;
- runs `pip check`;
- warns if the AWS CLI is missing (only deployment needs it).

It installs nothing globally and configures no agent, workflow, hook trust, MCP server or skill.
`requirements.txt` holds the ontology runtime dependencies and `requirements-dev.txt` the development tools; `requirements.lock.txt` is their resolved, hash-pinned closure.

Node.js dependencies are locked via `package-lock.json`.
Workspace package manifests declare their required build and test tooling under `devDependencies` using standard semver ranges.
Distribution qualification validates this dependency boundary (ensuring no runtime dependencies are shipped and only approved development tools are declared) without pinning development-only patch versions in test assertions.

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
| Lint                       | `npm run lint`                                           | HTML, CSS, JavaScript, Python and Markdown prose.                                                                |
| Formatting                 | `npm run format:check`                                   | `npm run format` rewrites files.                                                                                 |
| Ontology validation        | `npm run validate:ontologies -- --purpose draft`         | Diagnostics on changed sources; `--staged` validates the staged bytes (what the pre-commit hook does).           |
| Active-set qualification   | `npm run validate:ontologies -- --purpose latest-active` | Qualifies the active module set recorded in `policy/activation.ttl` and writes the publication receipt.          |
| Generated editing policy   | `npm run check:editing-policy`                           | Fails when `docs/policy/Editing-Policy.generated.md` is stale; `npm run generate:editing-policy` regenerates it. |
| Website build              | `npm run build:verify`                                   | Preserves tracked inputs and writes ignored `dist/` output. `npm run build` also runs Vite directly.             |
| JSON-LD generation         | `npm run generate:json-ld`                               |                                                                                                                  |
| MCP package                | `npm run build:mcp-package`                              | See [docs/mcp/local-development.md](mcp/local-development.md).                                                   |

Use the focused checks that match what you changed while working, and the wider suites before opening or updating a pull request.
Report failures, skips and checks you could not run as they are.

### Python and Markdown style

`npm run check:style` runs Python linting and formatting checks, Markdown checks, and the prose-tool regression tests.
`npm run lint:python:fix` applies Ruff's safe fixes; `npm run format:python` formats Python.
Ruff checks correctness and import ordering with the Python version declared in `ruff.toml`.
`npm run fix:all` includes these controls alongside the existing frontend fixes.

`npm run format:docs` combines Prettier's Markdown layout with native Snapper sentence breaks.
`npm run format:docs:check` checks without writing, including native prose diagnostics even when Snapper's preservation backstop leaves a document unchanged.
Such findings can require manual sentence breaks.
Both operations select root Markdown, `docs/**/*.md`, and `packages/*/*.md` through Prettier's API and the current `.gitignore` and `.prettierignore`; negated ignore patterns work the same way in checks and fixes.
Markdown prose wrapping and embedded-language formatting are disabled in Prettier, and Snapper uses unlimited sentence width without clause breaks.
Use `prettier-ignore` on literal examples whose trailing spaces carry meaning.

The preserved scope includes `AGENTS.md`, `docs/reviews/`, `docs/sdlc/`, `docs/plans/sdlc-improvements/`, `docs/policy/migration-evidence.md`, and the generated `docs/policy/Editing-Policy.generated.md`.
Generated policy still has its dedicated freshness check.
Dependencies, vendored sources, generated output and Python fixtures are excluded from Ruff as configured in `ruff.toml`.

`npm run check:qualification` includes Python and Markdown checks.
The distribution jobs retain `test:node`, `lint:node`, `format:node:check`, and the Prettier-only `format:docs:prettier:check` so their Node-only environments do not acquire a Python dependency.
The dedicated style matrix installs both locked toolchains on Linux and Windows.

## Publication safeguards

`scripts/validate_ontologies.py --purpose latest-active` writes its qualification receipt under `.sdlc/runtime/policy-reports` (ignored by Git; `--report-directory` selects another location).
`scripts/upload_to_s3.py` reads the same receipt and refuses to publish when it is missing, was produced for a diagnostic purpose, or no longer matches the current policy, authority snapshot, dependency lock, active module set, sources or built artifacts.
Historical receipts do not qualify a later publication.

## Continuous integration

Pull requests run, as applicable to the changed files:

- [Ontology validation](../.github/workflows/ontology-validation.yml): the editing policy on the changed sources, policy/publication-gate tests, and the Linux/Windows two-engine qualification of the active set.
- [Development checks](../.github/workflows/development-checks.yml): independently selected Linux/Windows jobs for Python and Markdown style, and for the ontology runner, setup-tool, launcher, hook and check-selection tests.
  Both use a clean `npm run set-up:development`.
- [MCP distribution](../.github/workflows/verify-universal-ontology-mcp-distribution.yml): product tests, website build, package, archive and container checks.
- [CodeQL](../.github/workflows/codeql.yml).

`scripts/selectPullRequestChecks.js` decides which jobs apply from the changed paths.
Authored documentation selects the style matrix; preserved documents do not select it by themselves.
