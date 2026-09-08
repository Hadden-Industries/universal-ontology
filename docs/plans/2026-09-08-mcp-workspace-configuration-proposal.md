# MCP-CONFIG-01: exact configuration proposal

**Status:** Approved by Max in dossier SRC-016; not applied. Revision 2,
2026-09-08. This revision records approval only; all settings from revision 1
remain unchanged. Implements the accepted design in the
[plan](2026-09-08-mcp-workspace-modernization.md) and
[dossier](../specs/2026-09-08-mcp-improvement-change-dossier.md), SRC-015.

The approved revision 1 file has SHA-256
`14670a3be32b461acf3681b0282ddae7d678717216e7a1bca7968b06b0a9bdf2`.
Max's "I approve" on 2026-09-08, recorded at `2026-09-08T20:30:23Z`, answers the
explicit request to approve MCP-CONFIG-01 and authorize the prepared Issue and
baseline capture. The [dossier's acceptance record](../specs/2026-09-08-mcp-improvement-change-dossier.md#9-establish-the-accepted-baseline-before-implementation)
identifies the actual message and scope.

This approval covers the settings below and their consumer-complete
application within the accepted slices, after the R2 baseline gate. It does not
authorize a dependency version upgrade, product installation, live scan, Git commit,
push, publication or deployment. Existing unrelated settings are preserved.
All paths are relative to this repository; new source/export targets are proposed,
not files that already exist.

## 1. Package identities, dependencies and scripts

Use `1.0.0` for both new private workspace identities, matching this initial local
package graph. These private versions do not change ontology, query/cache formats,
MCP protocol revisions, the public CLI version or SDLC package status.

### Root `package.json`

Replace `workspaces` with:

```json
[
  "packages/universal-ontology-mcp-server",
  "packages/universal-ontology-query",
  "packages/universal-ontology-projection-policy"
]
```

The final root `dependencies` becomes:

```json
{
  "universal-ontology-projection-policy": "1.0.0",
  "universal-ontology-query": "1.0.0",
  "zod": "4.5.4"
}
```

Root WebMCP imports Zod directly. Root website/build code imports the two shared
packages directly. Remove root `@modelcontextprotocol/node` and
`@modelcontextprotocol/server` only in SLICE-004 when their consumers have moved.
Keep `@modelcontextprotocol/client: 2.0.0` in root `devDependencies`: root
distribution acceptance and release tooling still use it. Remove root
`devDependencies.esbuild` when the sole direct bundle-builder consumer moves.
Add `devDependencies.@jest/globals: 30.5.1` for existing direct root test imports;
retain the existing root Jest requirement `^30.5.1` and other devDependencies.

Replace these root script values:

```json
{
  "mcp:serve": "node scripts/runOntologyMcpDevelopment.js",
  "mcp:dev": "node scripts/runOntologyMcpDevelopment.js --refresh-index",
  "mcp:stdio": "npm run stdio --workspace universal-ontology-mcp-server --",
  "mcp:package:build": "npm run build --workspace universal-ontology-mcp-server"
}
```

`runOntologyMcpDevelopment.js` is the repository-owned index/listener orchestration
specified by the accepted plan. It owns `--refresh-index`, including when supplied
to `mcp:serve`, invokes the existing index generator with the selected query-output
directory and starts the workspace listener through its actual executable. It
preserves unknown-argument rejection, current environment interpretation, readiness
and signal/exit behavior. It is not a source import forwarder. In particular,
`npm run mcp:index && ...` is not an equivalent replacement: that CLI currently
writes the default output directory and would ignore a custom
`UNIVERSAL_ONTOLOGY_QUERY_ROOT` for refresh.

Keep `mcp:index`, `mcp:channel:stage`, `mcp:package:pack`, archive/SBOM/release scripts,
root `test`, `build`, setup and SDLC entry points. Existing root distribution
orchestration updates its imports/caller paths when the actual MCP builder moves.

### Existing MCP workspace `package.json`

In `packages/universal-ontology-mcp-server/package.json`, add:

```json
{
  "devDependencies": {
    "@jest/globals": "30.5.1",
    "@modelcontextprotocol/client": "2.0.0",
    "@modelcontextprotocol/node": "2.0.0",
    "@modelcontextprotocol/server": "2.0.0",
    "esbuild": "0.28.2",
    "jest": "30.5.1",
    "universal-ontology-query": "1.0.0",
    "zod": "4.5.4"
  }
}
```

Replace its `scripts` with:

```json
{
  "build": "node scripts/buildUniversalOntologyMcpApplicationBundle.js",
  "test": "node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config ../../jest.config.js --rootDir .",
  "stdio": "node scripts/runUniversalOntologyMcpStdioServer.js",
  "serve": "node scripts/runLocalOntologyMcpServer.js",
  "prepack": "npm run build"
}
```

Keep the current name/version, `bin`, `files`, engine requirement, registry identity,
repository metadata, license and publishConfig. Add no runtime, peer or optional
private dependencies and no `exports`, `prepare`, `install` or `postinstall` hook.
The full development installation builds the same self-contained executable;
installing its tarball does not install these source/build dependencies.

### New query workspace `package.json`

Create `packages/universal-ontology-query/package.json` with exactly:

```json
{
  "name": "universal-ontology-query",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "exports": {
    ".": "./src/index.js",
    "./schemas": "./src/ontologyQuerySchemas.js",
    "./artifacts": "./src/artifacts.js",
    "./repositories/same-origin-fetch": "./src/fetchOntologyQueryArtifactRepository.js",
    "./repositories/file-system": "./src/fileSystemOntologyQueryArtifactRepository.js",
    "./repositories/persistent-http": "./src/persistentHttpRepository.js",
    "./json-value-immutability": "./src/jsonValueImmutability.js"
  },
  "dependencies": {
    "universal-ontology-projection-policy": "1.0.0",
    "zod": "4.5.4"
  },
  "devDependencies": {
    "@jest/globals": "30.5.1",
    "jest": "30.5.1"
  },
  "scripts": {
    "test": "node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config ../../jest.config.js --rootDir ."
  }
}
```

The package entry modules expose the capabilities already accepted in the plan:
query/error identities at root, artifact construction/validation at `/artifacts`,
and the Node persistent repository/cache/HTTP-reader composition at its named entry.
They define the package's actual interface, not compatibility aliases for old paths.
Do not expose Node repositories from the browser-safe root. Move the actual
deep-freezing implementation into its named module and update its callers.

### New projection-policy workspace `package.json`

Create `packages/universal-ontology-projection-policy/package.json` with exactly:

```json
{
  "name": "universal-ontology-projection-policy",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "exports": {
    ".": "./src/index.js",
    "./field-property-history.v1.json": "./data/field-property-history.v1.json",
    "./field-property-history.v1.schema.json": "./data/field-property-history.v1.schema.json"
  },
  "devDependencies": {
    "jest": "30.5.1"
  },
  "scripts": {
    "test": "node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config ../../jest.config.js --rootDir ."
  }
}
```

The root entry exposes the three existing configured resolvers; test-only policy
constructors remain internal. Move the existing implementation and declaration/schema
under this owner; preserve their meaning and bytes. This module has no external
runtime package imports, so no runtime dependencies are proposed.

## 2. Native lockfile update

After each approved manifest stage, update root `package-lock.json` with the native
command `npm install --package-lock-only --ignore-scripts`. It records the private
workspace links, direct ownership and appropriate development flags. Inspect the
actual result before proceeding: retain current external versions/resolved artifacts
and integrity values, with no unapproved override, install strategy or registry change.
Do not manually author the resolved lock graph or claim its bytes are known now.
An unexpected external resolution change requires a separate exact proposal.

The new direct requirements match the versions already installed. On 2026-09-08,
native `npm view <package> version license --json` reported Jest/@jest/globals
30.5.1, esbuild 0.28.2 and Zod 4.5.4 as latest. Their installed top-level manifests
match and their full installed licenses were inspected as MIT, with notice
retention. This is an ownership change, not a new rights waiver. SDK 2.0.0 exact
rights and its embedded dependency restriction remain as recorded in dossier
SRC-011/EVD-004. No install or lockfile generation has run for this proposal.

## 3. Lint, format and focused test coverage

In root `package.json`, replace these script values exactly:

```json
{
  "lint:js": "eslint \"src/**/*.js\" \"scripts/**/*.js\" \"tests/**/*.js\" \"packages/*/src/**/*.js\" \"packages/*/scripts/**/*.js\" \"packages/*/tests/**/*.js\" \"vite.config.mjs\"",
  "format": "prettier --write \"src/**/*.{js,css,html}\" \"scripts/**/*.js\" \"templates/**/*.html\" \"tests/**/*.js\" \"vite.config.mjs\" \"package.json\" \"packages/*/package.json\" \"packages/*/*.md\" \"packages/*/src/**/*.{js,json}\" \"packages/*/scripts/**/*.js\" \"packages/*/tests/**/*.js\" \"packages/*/data/*.json\" \"server.json\" \"scripts/distribution/*.json\" \"docs/mcp/*.md\"",
  "format:check": "prettier --check \"src/**/*.{js,css,html}\" \"scripts/**/*.js\" \"templates/**/*.html\" \"tests/**/*.js\" \"vite.config.mjs\" \"package.json\" \"packages/*/package.json\" \"packages/*/*.md\" \"packages/*/src/**/*.{js,json}\" \"packages/*/scripts/**/*.js\" \"packages/*/tests/**/*.js\" \"packages/*/data/*.json\" \"server.json\" \"scripts/distribution/*.json\" \"docs/mcp/*.md\"",
  "fix:all": "stylelint \"src/**/*.css\" --fix && eslint \"src/**/*.js\" \"scripts/**/*.js\" \"tests/**/*.js\" \"packages/*/src/**/*.js\" \"packages/*/scripts/**/*.js\" \"packages/*/tests/**/*.js\" \"vite.config.mjs\" --fix && npm run format"
}
```

These patterns cover authored workspace code, manifests, docs and policy data while
avoiding generated package `dist` output. Retain `.prettierignore`. Apply only the
patterns whose directories exist in the corresponding slice, then reach the shown
final values; do not suppress unmatched-input errors globally. Preserve the actual
projection declaration/schema bytes when formatting is moved under their owner.
Both existing files passed the native read-only Prettier check during preparation;
no byte change was needed or performed.

In `eslint.config.js`, retain rule values and change only these file-selection and
runtime-global settings:

- Extend the frontend/source block's `files` with
  `packages/universal-ontology-query/src/**/*.js` and
  `packages/universal-ontology-projection-policy/src/**/*.js`.
- Exclude the query package's `fileSystemOntologyQueryArtifactRepository.js`,
  `httpOntologyQueryArtifactReader.js`, `persistentOntologyQueryArtifactCache.js`,
  `persistentHttpOntologyQueryArtifactRepository.js` and `persistentHttpRepository.js`
  from that browser block using those five exact paths under the query `src`.
- Replace the obsolete Node-source `files` list with
  `packages/universal-ontology-mcp-server/src/**/*.js` plus those five query paths.
  Retain `ecmaVersion: 2025`, ESM, Node globals and `strictRules` for that block.
- Extend the test block's `files` with `packages/*/tests/**/*.js` so moved fixtures,
  as well as `.test.js`/`.spec.js` files, retain the existing test globals/rules.
- Extend the final script block's `files` with `packages/*/scripts/**/*.js`, retaining
  its existing Node builtin globals and other rule behavior.

No `jest.config.js` change is requested. It retains Node test environment and no
transform. The native command
`npm test -- --showConfig --config ./jest.config.js --rootDir packages/universal-ontology-mcp-server`
confirmed that the supported `rootDir` override limits roots to that workspace
while retaining those settings. The top-level Jest package is 30.5.1; the native
report identifies its running CLI/core as 30.5.0. This observation is retained and
is not represented as a product test run or a dependency repair.

Package tests must resolve fixture/repository paths from their real owner, not
assume npm runs in the repository root. Shared cross-product fixtures remain root
test support; move only package-owned worker fixtures with their tests. Root Jest
discovery remains responsible for the whole repository; demonstrate that it finds
the moved suites before claiming equivalent coverage.

## 4. Pull-request check routing

In `scripts/selectPullRequestChecks.js`, change `CHECK_INPUTS` as follows. Preserve
the existing common inputs and SDLC/doc-only exclusions except the obsolete paths
explicitly replaced here.

| Scope | Exact additions | Exact removals/replacements |
|---|---|---|
| `product_tests` | `packages/universal-ontology-query`, `packages/universal-ontology-projection-policy` | Remove `src/projection` after the policy move. Retain the existing MCP workspace and root JS/test patterns. |
| `mcp_artifacts` | `packages/universal-ontology-query`, `packages/universal-ontology-projection-policy` | Remove `scripts/runUniversalOntologyMcpStdioServer.js`, `src/mcp`, `src/ontologyQuery`, `src/ontologyProjectionProperties.js`, `src/projection/field-property-history.v1.json` when their owners move. The MCP workspace is already included. |
| `website_build` | `packages/universal-ontology-query`, `packages/universal-ontology-projection-policy` | Remove `src/projection` after its move and `:(exclude)src/mcp` after MCP moves. Keep root source/build patterns. |

This routes shared changes to website, MCP artifacts and product regressions.
Do not add broad exclusions for package tests or schemas to reduce the check set.
Retain `sdlc` and `mcp_docs` routing unless a separately demonstrated consumer change
requires another proposal. Verify changed/unchanged scope decisions with the actual
consumer tests in `tests/pr-check-scopes.test.js`.

## 5. Website asset configuration

In `scripts/build/createWebsiteConfig.js`, add the following two static asset entries
to the inventory used by both `createContentAwareStaticCopyTargets` and
`outputCollisionPlugin`:

| Native package-resolved source | Output path relative to existing `/ontology/` base |
|---|---|
| `universal-ontology-projection-policy/field-property-history.v1.json` | `projection/field-property-history.v1.json` |
| `universal-ontology-projection-policy/field-property-history.v1.schema.json` | `projection/field-property-history.v1.schema.json` |

Resolve the source files through the package's declared exports using Node's native
package resolution, then pass their paths through the existing copy controls.
Retain collision detection against any source inventory entry with the same output
path. Do not emit a second authored copy, alter `base`, change the schema ID or
change the source bytes. Update the isolated built-page fixture to consume these
real package assets and validate their output; no Vite/plugin version change.

## 6. Bundle settings in the relocated builder

Move `scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js` to
`packages/universal-ontology-mcp-server/scripts/buildUniversalOntologyMcpApplicationBundle.js`.
Approve the following configuration within that file and its existing metadata
projection, with the consumer code updated in the same slice:

| Setting/responsibility | Exact new value or bounded change |
|---|---|
| Repository-relative entry | `packages/universal-ontology-mcp-server/scripts/runUniversalOntologyMcpStdioServer.js` |
| Repository input prefixes | `packages/universal-ontology-mcp-server/src/`, `packages/universal-ontology-query/src/`, `packages/universal-ontology-projection-policy/src/` |
| Additional allowed repository input paths | The entry above; `packages/universal-ontology-mcp-server/package.json`; `packages/universal-ontology-projection-policy/data/field-property-history.v1.json`. Replace the old root/version/projection paths. |
| Version projection | Read the MCP workspace manifest's version; match only that manifest in the esbuild projection hook and project only `version` into runtime metadata. Rename the hook/helper to reflect MCP ownership. Remove root/public version equality as a product invariant; retain runtime/package/distribution identity checks. |
| Dependency/component location | Resolve from actual bundled inputs and their owning package using native resolution. Recognize the official SDK Ajv-provider input under its resolved package path, including a nested workspace installation; do not assume root `node_modules` or loosen which component identities are allowed. |
| Output and esbuild options | Retain existing bundle/metadata output paths, `absWorkingDir` at repository root, Node platform, ESM, `target: node24`, bundling, tree shaking, no minification, `legalComments: eof`, metafile, no sourcemap, UTF-8 and silent build logging. |

Keep the three permitted directly bundled external components, the exact embedded
component inventory, dynamic-code exception, network-origin allowlist, forbidden
content checks and atomic/contained output handling. The changed source-path
forbidden-content checks must also cover moved package test/fixture paths. Required
notices must express the inspected SDK terms; changing location cannot turn a short
metadata license label into complete rights evidence.

The unchanged distribution-consumer tests verify actual input attribution and
packed output independently; update their expected ownership facts while retaining
the accepted product contract. Do not derive every expected tool/identity from the
same production metadata.

## 7. Apply by accepted slice and retain evidence

SLICE-005 introduces only the projection workspace/link, its source/consumer asset
settings and needed coverage. SLICE-006 adds query ownership/imports and coverage.
SLICE-004 moves MCP ownership, direct dependencies and scripts, then removes the
obsolete root declarations and routing. Each stage must be internally resolvable,
verified and reviewable; do not create references to missing later-stage packages.
SLICE-003 needs no currently identified additional configuration change.

The precise lockfile bytes and source-code diff are produced only after approval
and the baseline gate. Native lock/config/export/pack validation, actual moved-test
discovery, browser builds, bundle installation and semantic checks then establish
the result. This proposal records permission scope, not successful integration.
Any additional setting or external version change must be presented separately.
