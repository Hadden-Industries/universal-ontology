# Distributable Local Universal Ontology MCP Server Implementation Plan

> **For agentic workers:** Execute this plan inline, one checked step at a
> time. Implementation delegation is prohibited. Keep the approved design,
> this plan, test evidence, review findings, and commits in the same task.

**Status:** Implementation in progress; public software publication deferred

**Plan date:** 2026-08-31

**Authoritative design:**
[`docs/specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md`](../specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md)

**Protocol baseline:** Model Context Protocol current revision `2026-07-28`,
official modular JavaScript SDK v2

### Development-publication amendment — 2026-09-01

This amendment supersedes every later instruction that would publish a
development build. The active workflow is verification-only: it runs for
branches and pull requests, has no release-tag trigger, grants no write or
OIDC permission, and may retain build outputs only as private, short-lived
GitHub Actions artifacts for three days. It must not create a GitHub Release
or attestation, publish npm or OCI content, authenticate to the MCP Registry,
or write to AWS, CloudFront, S3, Google Cloud, or another remote service.

Package names, OCI coordinates, Registry metadata, publisher pins, CDN paths,
SBOM subjects, and release-building scripts remain reserved production stubs
and locally testable contracts. Their presence is not evidence that an
artifact is public. Enabling any remote publication—including an immutable
GitHub Release—requires a later, explicit owner-approved plan amendment.

## 1. Outcome

Turn the existing repository-local Universal Ontology MCP implementation into
a distributable local product. An MCP host launches the product as a child
process and communicates over `stdio`. The process retrieves only publisher-
selected, canonical query artifacts from
`https://haddenindustries.com/ontology/query/v1/`, verifies and caches those
artifacts locally, and executes ontology search and entity resolution on the
user's machine.

The future production release is designed to support all of these
installation forms from one canonical application bundle:

1. `npx --yes universal-ontology-mcp-server@1.0.0` and an ordinary npm install;
2. self-contained GitHub Release archives for Linux x64, Linux arm64, macOS
   x64, macOS arm64, and Windows x64; and
3. a multi-platform OCI image at
   `ghcr.io/hadden-industries/universal-ontology-mcp-server:1.0.0`.

During development, those same formats are built and tested from the checkout
or downloaded as short-lived GitHub Actions artifacts. Nothing is installed
from, or pushed to, the reserved public npm, OCI, Registry, or Release names.

No software package or image contains an ontology catalog, release query
index, source ontology, or another fast-changing data snapshot. Remote costs
are S3/CloudFront artifact-delivery costs on cache misses, not hosted MCP
compute for each tool call.

The release acceptance question remains:

> Find the definition of Person in the Universal Ontology and cite the
> ontology release and source IRI.

With every ontology page closed, a cold online install, warm online install,
and complete offline cache must return the same authored
`skos:definition`, graph scope, entity IRI, release identity, source IRI, and
source-artifact SHA-256 already asserted by the existing acceptance tests.

## 2. Scope boundaries

### Included

- Preserve the public `search_entities` and `resolve_entity` tool contracts.
- Correct existing internal repository/cache names before adding a second
  cache concept.
- Add strict channel-manifest and persistent-cache schemas.
- Generate content-addressed catalogs and deterministic channel manifests.
- Add a bounded HTTPS reader and a persistent HTTP query-artifact repository.
- Add exact last-known-good, offline, cancellation, and concurrent-process
  behavior.
- Add the installed `stdio` entry point, CLI configuration, and redacted
  stderr operational events.
- Produce and test the npm package, five platform archives, local OCI image,
  checksums, and SPDX 2.3 SBOM without publishing them.
- Add future MCP Registry metadata and a fail-closed, read-only development
  distribution-verification workflow.
- Add installation, update, removal, integrity, cache, privacy, and
  troubleshooting documentation.

### Excluded

- No edit to `C:/Users/maksy/GitHub/amazon-aws/infrastructure/stack.py`.
- No CDK synthesis, deployment, S3 upload, CloudFront invalidation, or remote
  publisher invocation from this plan.
- No AgentCore, Lambda, ECS, API Gateway, hosted Streamable HTTP MCP endpoint,
  or another remotely executed MCP runtime.
- No bundled ontology data and no precompressed `.br` or `.gz` source object.
- No new MCP tool, resource, prompt, task, elicitation, sampling, UI, SPARQL,
  mutation, inference, or ontology-editing contract.
- No mid-process channel hot swap.
- No MCPB package and no Node single-executable-application dependency in the
  first release.
- No push. Plan execution must neither push nor ask whether to push.
- No npm, OCI/Container Registry, MCP Registry, GitHub Release, attestation,
  AWS, or Google Cloud write. Development artifacts may exist remotely only
  as three-day GitHub Actions artifacts.

The AWS delivery work remains in these handoffs:

- [`amazon-aws-json-content-type-handoff`](../../../amazon-aws/docs/issues/2026-08-31-amazon-aws-json-content-type-handoff.md)
- [`cloudfront-ontology-query-artifact-cdk-handoff`](../../../amazon-aws/docs/issues/2026-08-31-cloudfront-ontology-query-artifact-cdk-handoff.md)

## 3. Mandatory engineering protocol

No implementation subagent may be spawned, delegated a task, asked to review
code, or used to continue this plan. All implementation and review follow-up
remain inline in the executing task.

### 3.1 Preserve user-owned work

Before every task:

- [ ] Run `git status --short --branch`.
- [ ] Record the task-owned paths named by that task.
- [ ] Treat every other change as user-owned and leave it untouched.
- [ ] Stage only the explicit task-owned paths; never use `git add .` or
      `git add -A`.
- [ ] Use the repository `.venv` for any Python command. This implementation
      is JavaScript-first and should not introduce a Python build dependency.

### 3.2 TDD is the implementation order

Every behavioral checkbox group follows red, green, refactor:

1. write the smallest externally observable test for one absent behavior;
2. run the focused test and record the expected failure, including why it
   fails for the intended missing behavior;
3. write the minimum production change that satisfies it;
4. rerun the focused test until green;
5. refactor names, comments, and module depth only while the test stays green;
6. run the task's focused suite and applicable repository checks.

A production implementation written before its failing test is not accepted
as TDD. Do not combine several unproved behaviors into one initial red test.

### 3.3 Code comments and naming

Created or materially changed code must use semantically precise domain names.
In particular:

- `ontologyQueryArtifactRepository` is the byte-read boundary for catalogs
  and release indexes;
- `ontologyQueryArtifactChannelName` is `stable` or `development`;
- `latest_stable_releases` remains the separate tool-level release-selection
  policy;
- measured bytes end in `ByteLength`; byte budgets end in `ByteSize`;
- filesystem names end in `Path`; URL values end in `Url`; SHA-256 values end
  in `Sha256` unless enclosed by a typed digest reference; and
- public MCP tool names remain exactly `search_entities` and
  `resolve_entity`.

Exported factories, policies, schemas, lifecycle handles, and non-obvious
return unions require concise JSDoc. Comments must explain security,
containment, digest, canonical-byte, cancellation, coalescing, atomic-write,
lease, eviction, offline-fallback, cross-platform, or release-ordering
invariants. Do not narrate syntax or preserve obsolete implementation history.

### 3.4 Authoritative format and protocol tooling

Use authoritative tools to execute and validate their own formats; write
repository code only for invariants those tools cannot know.

- Use the official MCP SDK/client for negotiation, transport, and tool
  discovery. Repository assertions may require the exact server identity,
  protocol pin, capabilities, and tool surface, but must not emulate an MCP
  peer.
- Use the selected exact npm CLI for lockfile installation, workspace/package
  selection, `pack --json`, tarball creation, and npm SBOM generation.
  Repository code may enforce file allowlists, digest agreement, component
  coverage, and cross-form version identity.
- Ask Git about tracking and ignore behavior for every exact generated or
  transaction path. Never approximate `.gitignore` semantics with pathname
  matching.
- Use maintained JSON, TOML, YAML, archive, and JSON Schema implementations to
  parse or validate the complete result. Repository code may preserve
  comments/ordering and ownership markers, reject duplicate JSON members, and
  enforce domain-specific containment or cross-field invariants; it must then
  reparse the final document with the format implementation.
- Use Docker to build, inspect, and execute the OCI form. Repository code owns
  the expected inputs, identity, privilege, mount, network, and content
  invariants, not an OCI runtime substitute.

Do not accept a source-text grep, regex, handwritten parser, or duplicated
formatter rule as proof when an authoritative executable, parser, schema, or
runtime can validate the artifact itself. A textual check is reserved for an
invariant that authority cannot express, such as a forbidden embedded
repository path, generated ownership marker, or secret-shaped output.

### 3.5 Review and commit gate

After each non-trivial behavioral task has green focused and applicable full
checks, but before staging or committing, the implementer must say exactly:

`Implementation complete; /review pending`

The accompanying message must ask for built-in `/review` over that task's
uncommitted paths and name those paths. Resolve every confirmed P0, P1, and P2
finding, or record the owner's explicit deferral, rerun affected checks, and
only then commit.

Use the repository's `committing-to-git` workflow for every commit. The
approved execution policy authorizes a detailed signed commit for each
reviewed increment without another commit-message question. Confirm the
staged snapshot contains only task-owned paths, verify the signature and HEAD
identity, and report the resulting commit. Do not push.

Pure documentation-only changes may skip the code-review gate, but still use
the same scoped staging and signed-commit workflow.

## 4. Configuration changes authorized by this plan

The following is the complete configuration-edit inventory. Approval of this
plan authorizes exactly these changes during implementation. If implementation
discovers another configuration file or materially different setting, amend
and review the plan before editing it.

| File                                                               | Exact planned settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Behavioral and pipeline effect                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                     | Add `packageManager: "npm@12.0.2"` and `workspaces: ["packages/universal-ontology-mcp-server"]`; exact dev dependencies `ajv: "8.20.0"`, `ajv-formats: "3.0.1"`, `esbuild: "0.28.2"`, `tar: "7.5.22"`, `yaml: "2.9.0"`, `yazl: "3.3.1"`, and `yauzl: "3.4.0"`; add the `mcp:stdio`, `mcp:channel:stage`, `mcp:package:build`, `mcp:package:pack`, `mcp:archives:build`, `mcp:sbom:create`, and `mcp:release:verify` scripts specified below; include root `package.json`, `packages/universal-ontology-mcp-server`, `server.json`, `scripts/distribution/*.json`, and `docs/mcp/*.md` in the existing narrow Prettier commands.                                                                                                                                | Gives npm one future-public workspace that is built only as development output, declares one exact build/package CLI, provides offline Registry-schema/workflow validation, reproducible packaging tools, named local/candidate entry points, and formatting coverage. Root stays `private: true`; ontology dependencies remain exact. |
| `package-lock.json`                                                | Regenerate with npm `12.0.2` after the workspace and seven exact dev dependencies are added; retain lockfile version 3 and exact resolved integrity data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Makes `npm ci` under the selected npm CLI reproduce the workspace, schema/workflow validators, and packaging toolchain.                                                                                                                                                                                                                |
| `eslint.config.js`                                                 | Add a later override with Node globals and ECMAScript 2025 for `src/mcp/runUniversalOntologyMcpStdioServer.js`, `src/mcp/universalOntologyMcpStdioConfiguration.js`, `src/mcp/universalOntologyMcpOperationalEvents.js`, and the Node filesystem/HTTP cache adapters named by this plan. Do not broaden browser globals for other source files.                                                                                                                                                                                                                                                                                                                                                                                                                | Lets Node-only source use `process` and platform APIs without weakening the browser boundary.                                                                                                                                                                                                                                          |
| `packages/universal-ontology-mcp-server/package.json`              | Create future-public package metadata for `universal-ontology-mcp-server` version `1.0.0`, `type: "module"`, `bin.universal-ontology-mcp-server: "dist/universal-ontology-mcp-server.mjs"`, explicit `files`, `engines.node: ">=24.0.0"`, `mcpName: "io.github.hadden-industries/universal-ontology"`, inactive `publishConfig.access: "public"`, inactive `publishConfig.provenance: true`, MIT license, repository/homepage/bugs metadata, and a `prepack` script that builds the canonical bundle. It has no runtime dependencies because the allowlisted dependencies are bundled.                                                                                                                                                                         | Defines and locally tests the future npm installation and Registry ownership contract without publishing software or ontology data.                                                                                                                                                                                                    |
| `server.json`                                                      | Create Registry schema `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`; name `io.github.hadden-industries/universal-ontology`; title `Universal Ontology`; version `1.0.0`; GitHub repository; npm and OCI package records; `stdio` transport only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Validates future package/image discovery metadata offline. It does not claim that bytes are published, host bytes, execute requests, or authorize Registry publication.                                                                                                                                                                |
| `scripts/distribution/universalOntologyMcpReleaseInputs.json`      | Create a strict, versioned release-input document containing Node `24.20.0`, selected npm CLI `12.0.2`, the five official runtime archive URLs and SHA-256 values in section 6, the pinned OCI base index digest, MCP Publisher `1.8.1` download/checksum, release target names, archive formats, runner labels, executable paths, and application/runtime byte allowlists.                                                                                                                                                                                                                                                                                                                                                                                    | Centralizes supply-chain identities and prevents workflow/build-script drift.                                                                                                                                                                                                                                                          |
| `packages/universal-ontology-mcp-server/Dockerfile`                | Create a multi-platform `stdio` image from `node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`; copy only the built bundle and notices; label `io.modelcontextprotocol.server.name=io.github.hadden-industries/universal-ontology`; create the declared cache mount point as UID/GID 1000 (`node`) with mode `0700` before declaring the volume; run as `node`; set the bundle as the exec-form entry point; expose no port.                                                                                                                                                                                                                                                                                  | Produces a non-root local container whose first empty named volume inherits the cache ownership required by the server's fail-closed filesystem boundary.                                                                                                                                                                              |
| `.github/workflows/verify-universal-ontology-mcp-distribution.yml` | Create path-scoped pull-request and branch validation only; omit tag and manual publication triggers; use Node `24.20.0`; after every `setup-node` invocation install npm `12.0.2` globally and assert the exact `npm --version` before any npm operation; run repository validation, the five-runner archive matrix, a non-publishing local-container job, and exact candidate assembly; pin each used action to its full section 6 SHA; set workflow default permissions to `{}` and every job to `contents: read`; upload only intermediate and assembled GitHub Actions artifacts with three-day retention; contain no attestation, GitHub Release, npm publish, OCI push/login, MCP Publisher login/publish, environment, write permission, or OIDC path. | Continuously proves that development outputs are buildable and internally consistent without claiming or mutating any public release namespace. GitHub Actions is the only permitted remote artifact store and its outputs expire after three days.                                                                                    |

No `.npmrc`, `.codex/config.toml`, AWS configuration, CloudFront function,
repository policy, or existing workflow is edited. The already ignored `dist/`
tree remains the only local release-output root, so `.gitignore` needs no
change.

### Approved follow-up: repository-local MCP host integration

The original distribution increment above intentionally stopped at manually
configurable software forms. The separately approved repository-local
development integration of 1 September 2026 supersedes only its
`.codex/config.toml` and `.gitignore` exclusions. It does not broaden any
production publication, AWS, CDN, Registry, npm, OCI, or GitHub Release scope.

That follow-up makes these exact configuration changes:

| Path                      | Approved repository-local setting and ownership                                                                                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`              | Root-anchor the generated `/.agent-tools/` installation and local `/.agents/mcp_config.json`; ignore only the same-directory `.staged.tmp` and `.activation.backup` name patterns produced for `.mcp.json`, `.codex/config.toml`, and `.agents/mcp_config.json`; retain the existing, independent `.agents/skills/` rule.     |
| `.mcp.json`               | Track complete `github` and `universal_ontology` `stdio` entries whose shared Node bootstrap asks Git for the checkout root before resolving repository-relative launcher/application paths; select `--query-artifact-source=file-system` and repository-relative `--query-artifact-root-directory=dist/query/v1` by default. |
| `.codex/config.toml`      | Replace the legacy `universal_ontology_local` loopback table with marker-owned `github` and `universal_ontology` `stdio` tables; retain `sandbox_workspace_write.network_access = true`; require the ontology server; enable only `search_entities` and `resolve_entity`; retain write-only approval mode.                    |
| `.agents/mcp_config.json` | Generate the same two portable entries locally while preserving unrelated local servers; never include it in the checked-in drift gate.                                                                                                                                                                                       |

Implementation adds `scripts/set_up_mcp_servers.py`, the checked-in GitHub
launcher, and an official-client Universal Ontology bundle verifier. The setup
operation renders every host document before network or build work; stages and
verifies both server programs; uses the repository's authoritative
`npm run mcp:index` generator when the selected ontology query-artifact source
is `file-system`; makes a real `Person` query through the official MCP client;
and then publishes per-file atomic replacements as one rollback-capable
transaction. Generated programs and records remain
present while a synchronized activation-backup copy is prepared, then change
through one replace-over-destination operation. Existing host documents use the
native displaced-file primitive for the current operating system—Windows
`ReplaceFileW`, Linux `renameat2(RENAME_EXCHANGE)`, or macOS
`renamex_np(RENAME_SWAP)`—and validate the exact displaced bytes before the
wider transaction commits. An originally absent host document is published by
a same-directory hard link that cannot overwrite a concurrently created file.
Byte-exact host-document observations are therefore compare-and-replace
preconditions: an edit made during download, build, earlier activation, or at
the native replacement boundary is preserved and aborts the transaction. A
platform or filesystem without the required primitive fails closed. Before
restoring or removing any replacement during rollback, setup
requires the destination's regular-file byte length, SHA-256 digest, and complete
permission bits to equal the exact state setup published; a concurrent change is
preserved and its preceding synchronized backup or displaced file is retained
and reported. Each randomized staged or recovery host-document path is created empty,
confirmed to be repository-contained and exactly Git-ignored, and only then
receives potentially sensitive host-configuration bytes. Setup non-fatally
reports an inactive backup
whose cleanup is denied after a committed activation, and repairs mismatched
POSIX execution-permission bits even when program bytes match. A Windows lock on
the live executable fails without removing the existing installation. Legacy
Codex migration removes each obsolete server's complete descendant-table
subtree. `tomllib` then requires the obsolete semantic key to be absent; a valid
but noncanonical table spelling that the conservative source editor does not own
fails with a precise remediation instead of motivating a second TOML parser.
Ordinary and array-of-tables headers both delimit the conservative source-edit
span, so an unrelated `[[table]]` following an obsolete server is retained and
then validated by `tomllib`. The host entries use one small Node bootstrap that
asks Git for the checkout root, so they launch from the repository root even
when a host session begins in a nested directory. Both the checked-in GitHub
launcher and official-client verifier are derived from the setup script's
actual sibling directory, preserving the script's one-directory-below-root
location contract without a hard-coded `scripts/` assumption. A failed
official-client verification reports bounded, control-character-sanitized
stderr. The copied ontology bundle's byte length and SHA-256 digest must equal
the validated build snapshot before its installation record is written. A
process-scoped operating-system lock enforces one setup writer per checkout and
is released automatically after a crash. Tests proceed
failure-first for merge ownership, read-only checking, generated-root and
configuration-path safety, bounded download and archive handling, software
metadata, staged protocol verification, legacy descendant-table removal,
array-table preservation, semantic legacy-key rejection, nested-session launch
resolution, setup-companion path derivation, surfaced verifier diagnostics,
staged-copy identity binding, Python-3.11 Windows junction recognition, exact
transaction-artifact ignore coverage before sensitive bytes, concurrent-edit
rejection (including the native replacement boundary and absent-path creation),
strict rejection of non-finite JSON constants, rollback conflict preservation,
continuous-path atomic replacement,
execution-permission repair, locking, transaction rollback, and deferred backup
cleanup. The Universal Ontology protocol verifier supplies a unique operating-system-temporary
`--cache-directory` to an HTTP-source child process and removes it after
closure, so HTTP installation verification never depends on or mutates the
developer's normal persistent runtime cache. Filesystem verification instead
uses the generated `dist/query/v1` tree without creating an HTTP cache.

The repository-local follow-up also adds one explicit source discriminator.
`--universal-ontology-query-artifact-source=file-system` is the setup default;
it renders `--query-artifact-source=file-system` and
`--query-artifact-root-directory=dist/query/v1` into every supported host.
`--universal-ontology-query-artifact-source=http` renders the server's HTTP
repository instead, with optional `--universal-ontology-query-artifact-channel`
and `--universal-ontology-query-artifact-base-url` selections. The setup command
rejects HTTP-only selectors for the filesystem source, passes the same source
selection through read-only drift checking, and verifies the selected repository
before activation. This changes no package, lockfile, workflow, AWS, CDN, or
remote-publication configuration.

The setup command may use the exact npm configuration already authorized by
this plan, but it does not edit `package.json`, `package-lock.json`, a workflow,
or another configuration file. It never creates or pushes a Universal Ontology
release or publishes anything outside the existing short-lived GitHub Actions
development-candidate mechanism.

The root script values are exactly:

```json
{
  "mcp:stdio": "node scripts/runUniversalOntologyMcpStdioServer.js",
  "mcp:channel:stage": "node scripts/stageOntologyQueryArtifactChannel.js",
  "mcp:package:build": "node scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js",
  "mcp:package:pack": "npm pack --workspace universal-ontology-mcp-server --pack-destination dist/releases",
  "mcp:archives:build": "node scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js",
  "mcp:sbom:create": "node scripts/distribution/createUniversalOntologyMcpSpdxSbom.js",
  "mcp:release:verify": "node scripts/distribution/verifyUniversalOntologyMcpRelease.js"
}
```

The existing `format` and `format:check` commands retain their current inputs
and add only these arguments:

```text
"package.json"
"packages/universal-ontology-mcp-server/**/*.{json,md}"
"server.json"
"scripts/distribution/*.json"
"docs/mcp/*.md"
```

## 5. Architecture and public contracts

### 5.1 Runtime composition

```text
MCP host
  -> local stdio process
  -> createUniversalOntologyMcpServer
  -> createOntologyQueryModule
  -> persistentHttpOntologyQueryArtifactRepository
       -> persistentOntologyQueryArtifactCache
       -> httpOntologyQueryArtifactReader
       -> CloudFront query/v1 artifacts
```

The MCP layer never receives a caller-selectable URL, cache path, or channel.
Those values are process-owner configuration. User query text, identifiers,
definitions, and tool results never enter an artifact HTTP URL, header, body,
cache filename, or operational event.

### 5.2 Query-artifact repository port

The deep query module continues to see only this two-operation shape:

```js
const ontologyQueryArtifactRepository = Object.freeze({
  readOntologyQueryCatalog({ signal }),
  readOntologyReleaseQueryIndex({ relativePath, signal }),
});
```

Filesystem, browser Fetch, and persistent Node HTTP adapters implement the
same port. Digest, schema, release selection, ranking, language choice, and
ontology-result construction remain inside shared query modules.

### 5.3 Remote artifact layout

```text
query/v1/
├── channels/
│   ├── development.json
│   └── stable.json
├── catalogs/
│   └── 64-lowercase-hexadecimal-sha256.json
├── releases/
│   └── ontology-artifact-family-id/version-tag/
│       └── 64-lowercase-hexadecimal-sha256.json
└── catalog.json
```

`catalog.json` remains a compatibility document. New installed processes start
from `channels/stable.json` by default. One process pins one validated catalog
snapshot. Restarting the process is the refresh boundary.

### 5.4 CLI contract

With no arguments, `universal-ontology-mcp-server` starts `stdio`. It also
supports `--help`, `--version`, and these value options:

| CLI option              | Environment variable                         | Default                                           |
| ----------------------- | -------------------------------------------- | ------------------------------------------------- |
| `--artifact-channel`    | `UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL`    | `stable`                                          |
| `--artifact-base-url`   | `UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL`   | `https://haddenindustries.com/ontology/query/v1/` |
| `--cache-directory`     | `UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY`     | OS cache root from section 12                     |
| `--cache-maximum-bytes` | `UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES` | `536870912`                                       |

`--allow-insecure-loopback-artifact-origin` is CLI-only and has no environment
equivalent. Precedence is CLI, then environment, then default. Options accept
`--name value` and `--name=value`; a duplicate, missing value, unknown option,
relative cache path, invalid byte value, or unsupported channel exits 2 before
opening MCP or network I/O.

### 5.5 Installed process behavior

The process must:

- use `serveStdio(() => buildServer())` from
  `@modelcontextprotocol/server/stdio`;
- emit only MCP frames on stdout and only redacted operational events on
  stderr;
- open no listening socket;
- propagate cancellation through every pending query/cache/HTTP operation;
- use stdin EOF as the portable host-driven graceful-shutdown path; close its
  SDK handle for POSIX `SIGINT`/`SIGTERM` and for Windows `SIGINT` when Node
  delivers it, without promising a catchable Windows `SIGTERM`;
- advertise software version `1.0.0` from the same package-version authority
  used by npm, Registry metadata, archives, and OCI; and
- expose exactly `search_entities`, then `resolve_entity`, with the existing
  schemas, annotations, instructions, structured content, and text rendering.

## 6. Pinned implementation baseline and revalidation gate

These values were current on 2026-08-31:

| Construct                         | Selected value |
| --------------------------------- | -------------- |
| MCP current revision              | `2026-07-28`   |
| `@modelcontextprotocol/server`    | `2.0.0`        |
| `@modelcontextprotocol/client`    | `2.0.0`        |
| `@modelcontextprotocol/node`      | `2.0.0`        |
| `@modelcontextprotocol/inspector` | `2.4.0`        |
| `zod`                             | `4.5.4`        |
| Node LTS                          | `24.20.0`      |
| npm CLI bundled with Node         | `11.19.0`      |
| Selected build/candidate npm CLI  | `12.0.2`       |
| MCP Registry schema               | `2025-12-11`   |
| MCP Publisher                     | `1.8.1`        |
| `esbuild`                         | `0.28.2`       |
| `tar`                             | `7.5.22`       |
| `yazl`                            | `3.3.1`        |
| `yauzl`                           | `3.4.0`        |
| `ajv`                             | `8.20.0`       |
| `ajv-formats`                     | `3.0.1`        |
| `yaml`                            | `2.9.0`        |

Official Node runtime inputs:

| Target      | Official archive                                                     | SHA-256                                                            |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Linux x64   | `https://nodejs.org/dist/v24.20.0/node-v24.20.0-linux-x64.tar.gz`    | `855d581f8a4eb1a8117e3426de25fe02770592febcfb31369aee1ffbfee9e8ec` |
| Linux arm64 | `https://nodejs.org/dist/v24.20.0/node-v24.20.0-linux-arm64.tar.gz`  | `3515603e2487879a39bc75716f1a2affd027500c64ba50e845cf72cb33219013` |
| macOS x64   | `https://nodejs.org/dist/v24.20.0/node-v24.20.0-darwin-x64.tar.gz`   | `9e5b2644cf107befb6aefca676b96d3296bc10138096f022ed378d6233ed81f4` |
| macOS arm64 | `https://nodejs.org/dist/v24.20.0/node-v24.20.0-darwin-arm64.tar.gz` | `40e5607e5ecb3db9192723776da2d75d966260fc74a7a9e731c1bd67dda96bc8` |
| Windows x64 | `https://nodejs.org/dist/v24.20.0/node-v24.20.0-win-x64.zip`         | `6cac9ffbca8f6a47091e4b5c772e0606049c3871cb67d900c0cedde630e545ba` |

The development distribution-verification workflow pins the checkout, setup,
upload, and download actions below when used. The remaining pins are inactive
future-production inputs and MUST NOT appear in the active workflow:

| Action                          | Full commit SHA                            |
| ------------------------------- | ------------------------------------------ |
| `actions/checkout@v7`           | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node@v7`         | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-artifact@v7`    | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact@v8`  | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |
| `actions/attest@v4`             | `1e69f48acb82d1966a394da916b4c1698aa569d6` |
| `docker/setup-buildx-action@v4` | `37fe631027851001ddb9b187196cc803df7f5f0e` |
| `docker/login-action@v4`        | `dbcb813823bdd20940b903addbd779551569679f` |
| `docker/build-push-action@v7`   | `53b7df96c91f9c12dcc8a07bcb9ccacbed38856a` |
| `docker/metadata-action@v6`     | `dc802804100637a589fabce1cb79ff13a1411302` |

MCP Publisher `1.8.1` is downloaded only from
`https://github.com/modelcontextprotocol/registry/releases/download/v1.8.1/mcp-publisher_linux_amd64.tar.gz`.
Its archive SHA-256 is
`a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc`.
Never execute a `latest` download.

Node `24.20.0` bundles npm `11.19.0`; that executable is bootstrap tooling, not
the selected release-build identity. Local lockfile-generating commands invoke
npm `12.0.2` explicitly. Every workflow job installs npm `12.0.2` immediately
after `actions/setup-node`, asserts that `npm --version` equals `12.0.2`, and
only then runs `npm ci`, tests, builds, packing, or SBOM generation.
The root `packageManager` field and release-input document carry the same exact
selected npm version. Do not use Corepack as an npm-version manager.

Every unqualified `npm` command shown below denotes npm `12.0.2`. The local
implementer first checks `npm --version`; when it is not exactly `12.0.2`, run
the command as `npx --yes npm@12.0.2 <subcommand>` instead. In particular, no
other npm version may create or change `package-lock.json`, pack the
future-public workspace locally, generate an SBOM, or exercise the candidate
verifier.

At the beginning of Task 1, recheck these values against primary upstream
sources. A compatible patch update must be recorded in the release-input JSON,
lockfile, tests, and plan execution notes before code depends on it. A new MCP
revision, SDK major, Node major, Registry schema, package name, or behavior-
changing dependency requires a plan amendment. Immediately before any future
publication is separately approved, re-run
`npm view universal-ontology-mcp-server version`; if the previously unclaimed
name is no longer available, stop rather than publish under a guessed name.

## 7. Planned source tree

```text
src/mcp/
  createUniversalOntologyMcpServer.js
  runUniversalOntologyMcpStdioServer.js
  universalOntologyMcpMetadata.js
  universalOntologyMcpOperationalEvents.js
  universalOntologyMcpStdioConfiguration.js

src/ontologyQuery/
  createOntologyQueryModule.js
  createWaiterAwareSharedOperation.js
  fetchOntologyQueryArtifactRepository.js
  fileSystemOntologyQueryArtifactRepository.js
  httpOntologyQueryArtifactReader.js
  ontologyQueryArtifactCanonicalBytes.js
  ontologyQueryArtifactLimits.js
  ontologyQueryArtifactParsing.js
  ontologyQueryArtifactRelativePath.js
  ontologyQueryArtifactCacheInitializationErrors.js
  ontologyQueryChannelManifestSchemas.js
  ontologyQueryPersistentCacheSchemas.js
  persistentHttpOntologyQueryArtifactRepository.js
  persistentOntologyQueryArtifactCache.js

packages/universal-ontology-mcp-server/
  Dockerfile
  LICENSE
  README.md
  THIRD_PARTY_NOTICES.md
  package.json
  dist/universal-ontology-mcp-server.mjs

scripts/distribution/
  buildUniversalOntologyMcpApplicationBundle.js
  buildUniversalOntologyMcpPlatformArchive.js
  createUniversalOntologyMcpSpdxSbom.js
  universalOntologyMcpReleaseInputs.json
  verifyUniversalOntologyMcpRelease.js

tests/distribution/
tests/mcp/
tests/ontology-query/
```

`packages/universal-ontology-mcp-server/dist/` and all release assembly remain
ignored through the existing `dist/` rule. Generated files are inspected and
tested but not committed.

## 8. Task 1: Revalidate upstreams and correct the repository vocabulary

**Behavioral ownership:** names only; query bytes and tool results must remain
identical.

**Rename:**

- `src/ontologyQuery/fileSystemOntologyReleaseIndexRepository.js` to
  `src/ontologyQuery/fileSystemOntologyQueryArtifactRepository.js`;
- `src/ontologyQuery/fetchOntologyReleaseIndexRepository.js` to
  `src/ontologyQuery/fetchOntologyQueryArtifactRepository.js`;
- the two matching test files;
- factory exports to `createFileSystemOntologyQueryArtifactRepository` and
  `createFetchOntologyQueryArtifactRepository`;
- `ontologyReleaseIndexRepository` parameters/fixtures to
  `ontologyQueryArtifactRepository`; and
- `maximumCacheByteSize` in the query-module API to
  `maximumInMemoryQueryIndexCacheByteSize`, with constant
  `DEFAULT_MAXIMUM_IN_MEMORY_QUERY_INDEX_CACHE_BYTE_SIZE`.

Keep `readOntologyQueryCatalog` and `readOntologyReleaseQueryIndex`; those
operations already name the distinct artifacts precisely.

### Steps

- [ ] Record `git status --short --branch`, the Node version, Node-bundled npm
      version, separately selected npm `12.0.2` version, the upstream
      revalidation evidence from section 6, and the npm package-name result.
- [ ] Add a focused failing test that imports only the new factory names and
      constructs `createOntologyQueryModule` with the new option names. The
      expected red is a missing export or rejected new property, not a changed
      query result.
- [ ] Rename files, exports, imports, test fixture fields, JSDoc, errors, and
      the loopback-development option without adding aliases. Internal aliases
      would prolong an unshipped ambiguous API.
- [ ] Run the focused repository and query-module tests after each factory and
      option rename.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/file-system-ontology-query-artifact-repository.test.js tests/ontology-query/fetch-ontology-query-artifact-repository.test.js tests/ontology-query/ontology-query-module.test.js tests/mcp/local-universal-ontology-mcp-server.integration.test.js tests/webmcp/ontology-entity-definition-resolver.test.js
npm run lint:js
npm run format:check
```

- [ ] Inspect a `Person` result before and after the rename and prove deep
      equality.
- [ ] Enter the formal review gate with `/review` scoped to the renamed source,
      tests, imports, and developer guide references.
- [ ] After review resolution, create a signed commit with this message:

```text
refactor(ontology-query): Name the artifact repository boundary precisely

- describe the existing catalog-and-index byte port as an ontology query
  artifact repository across filesystem, Fetch, fixtures, and consumers
- distinguish the parsed in-memory query-index budget from the forthcoming
  persistent artifact-cache budget
- preserve tool names, query semantics, generated bytes, and runtime behavior
```

## 9. Task 2: Extract canonical artifact parsing and shared cancellation

**Files:**

- Create `src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js`.
- Create `src/ontologyQuery/ontologyQueryArtifactParsing.js`.
- Create `src/ontologyQuery/createWaiterAwareSharedOperation.js`.
- Create their focused test files.
- Modify `src/ontologyQuery/createOntologyQueryModule.js` and existing tests.

The canonical-bytes module owns the one fixed, application-specific UTF-8
representation: two-space JSON indentation, recursively schema-declared object
field order, schema-declared array order, and one terminal newline. It rebuilds
each strict artifact shape in the declared order rather than trusting caller
object insertion order. An artifact schema may contain a variable-key mapping
only when that field declares ascending lexicographic ordering of UTF-8 key
bytes; identifiers that look numeric remain string values and never depend on
JavaScript's integer-index property enumeration. It also owns SHA-256 and
byte-reference verification. The parser module owns fatal UTF-8 decoding, JSON parsing,
artifact-kind and format-version checks, strict Zod parsing, deep freezing, and
reserialization equality. Changing this canonicalization later requires a new
artifact format version. Export these narrow operations:

```js
serializeCanonicalOntologyQueryJsonDocument(document);
parseOntologyQueryCatalogBytes(bytes);
parseOntologyReleaseQueryIndexBytes(bytes);
calculateSha256(bytes);
verifyCanonicalArtifactReference({ bytes, expectedByteLength, expectedSha256 });
```

`createWaiterAwareSharedOperation` must coalesce equal work while giving every
waiter its own cancellation result. The shared underlying operation is aborted
only after all current waiters cancel. Completion, rejection, and last-waiter
cancellation must remove the registry entry.

### Steps

- [ ] Write failing parser tests for invalid UTF-8, invalid JSON, wrong kind,
      wrong format, strict-schema rejection, noncanonical whitespace/property
      order/terminal newline, byte-length mismatch, digest mismatch, and
      immutable success. Prove that reordered caller properties serialize to
      identical bytes and that undeclared variable-key maps are rejected.
- [ ] Move the existing private parsing/digest behavior without changing its
      safe `OntologyQueryError` mapping; run query-module tests green after
      each extraction.
- [ ] Write failing shared-operation tests for two waiters/one invocation, one
      cancelled waiter, all waiters cancelled, shared rejection, and retry
      after settlement.
- [ ] Implement the shared operation with one internal `AbortController` and
      comments explaining why caller cancellation cannot abort another caller's
      useful work.
- [ ] Replace the query module's private coalescing implementation with the
      shared primitive and keep all existing cancellation tests green.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/ontology-query-artifact-parsing.test.js tests/ontology-query/waiter-aware-shared-operation.test.js tests/ontology-query/ontology-query-module.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review` over this task's source/tests, resolve P0-P2 findings,
      rerun checks, and commit:

```text
refactor(ontology-query): Share artifact validation and cancellable loads

- expose one canonical byte-validation boundary for catalogs and release
  indexes without moving ontology semantics into transport adapters
- coalesce duplicate loads while preserving independent waiter cancellation
- retain existing safe errors, cache behavior, and query results
```

## 10. Task 3: Add channel manifests and content-addressed catalogs

**Files:**

- Create `src/ontologyQuery/ontologyQueryChannelManifestSchemas.js`.
- Modify `ontologyQueryArtifactLimits.js` to add the manifest limit; retain its
  accurate artifact-boundary name because the ceilings apply before and
  independently of either cache.
- Rename `ontologyReleaseIndexRelativePath.js` to
  `ontologyQueryArtifactRelativePath.js` and add artifact-specific parsers.
- Create `scripts/build/createOntologyQueryChannelManifest.js`.
- Create `scripts/stageOntologyQueryArtifactChannel.js`.
- Modify `scripts/build/createOntologyQueryArtifacts.js`,
  `scripts/build/ontologyAssets.js`, and
  `scripts/generateOntologyQueryIndexes.js`.
- Add focused schema, build, and staging tests.

### 10.1 Strict manifest schema

Use exactly this wire shape:

```json
{
  "queryArtifactKind": "universal_ontology_query_channel_manifest",
  "queryArtifactFormatVersion": 1,
  "ontologyQueryArtifactChannelName": "stable",
  "ontologyQueryCatalogReference": {
    "relativePath": "catalogs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "byteLength": 1234
  }
}
```

The schema is strict at both levels. Channel is `stable` or `development`.
`relativePath` must exactly equal `catalogs/${sha256}.json`; digest is 64
lowercase hexadecimal characters; length is a positive safe integer no larger
than `MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH`. The decoded manifest limit is
`MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH = 65_536`.

### 10.2 Producer return contract

`createOntologyQueryArtifacts` returns:

```js
{
  catalog,
  catalogContent,
  catalogSha256,
  catalogRelativePath,
  artifactContentsByRelativePath,
}
```

The map inserts release indexes first, then
`catalogs/${catalogSha256}.json`, then compatibility `catalog.json`. Both
catalog paths contain the same canonical bytes. Vite therefore publishes
immutable catalogs without publishing or promoting either channel.

### 10.3 Explicit local channel staging

`stageOntologyQueryArtifactChannel` takes an absolute query root and one
channel name. It reads and validates `catalog.json`, computes its digest,
ensures the matching content-addressed catalog exists with identical bytes,
builds canonical manifest bytes, and atomically replaces only
`channels/stable.json` or `channels/development.json` after all immutable files
exist. It performs no HTTP request or upload.

The root script is:

```json
"mcp:channel:stage": "node scripts/stageOntologyQueryArtifactChannel.js"
```

The explicit development command is:

```powershell
npm run mcp:channel:stage -- --channel development --query-root dist/query/v1
```

### Steps

- [ ] Start with failing schema tests for every invariant above, including
      unknown fields, uppercase digests, digest/path disagreement, traversal,
      and channel/release-selection vocabulary confusion.
- [ ] Implement and comment the strict frozen schemas and normalized relative-
      path functions, then add manifest parsing through the shared canonical-
      byte boundary.
- [ ] Add failing producer tests for canonical catalog identity, identical
      compatibility bytes, map/array ordering, byte ceilings, and byte-for-byte
      determinism across reordered RDF input and caller object-construction
      order.
- [ ] Modify the producer and standalone generator minimally; keep existing
      query-index digests unchanged.
- [ ] Add failing staging tests for missing catalog, corrupt immutable copy,
      interrupted temporary write, stable/development isolation, and manifest-
      last ordering observed through an injected filesystem seam.
- [ ] Implement staging with a unique same-directory temporary file, flush,
      atomic rename, and exact temporary cleanup. Do not delete preceding
      immutable files.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/ontology-query-channel-manifest-schemas.test.js tests/build/ontology-query-artifacts.test.js tests/build/stage-ontology-query-artifact-channel.test.js tests/build/ontology-assets.test.js
npm run mcp:index -- --latest-universal-only
npm run mcp:channel:stage -- --channel development --query-root dist/query/v1
npm run lint:js
npm run format:check
```

- [ ] Verify the generated content-addressed catalog digest over exact file
      bytes and verify no `stable.json` is created by ordinary website build.
- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(ontology-query): Introduce deterministic artifact channels

- publish canonical catalogs at immutable digest paths while retaining the
  compatibility catalog bytes
- validate strict stable and development manifests that bind one channel to
  one exact catalog
- stage a selected local channel atomically after every referenced immutable
  artifact exists, without performing a remote publication
```

## 11. Task 4: Implement the persistent query-artifact cache

**Files:**

- Create `src/ontologyQuery/ontologyQueryPersistentCacheSchemas.js`.
- Create
  `src/ontologyQuery/ontologyQueryArtifactCacheInitializationErrors.js`.
- Create `src/ontologyQuery/persistentOntologyQueryArtifactCache.js`.
- Create `tests/ontology-query/persistent-ontology-query-artifact-cache.test.js`.
- Create a child-process fixture below
  `tests/fixtures/ontology-query/persistent-cache-worker.js`.

### 11.1 Owned layout

The cache owns only this contained tree:

```text
ontologyQueryArtifactCacheDirectoryPath/
└── repositories/
    └── cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/
        ├── artifacts/sha256/aa/
        │   └── aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json
        ├── channels/stable/
        │   └── state-0000000000000001.json
        ├── channels/development/
        │   └── state-0000000000000001.json
        ├── locks/artifacts/
        ├── locks/channels/
        ├── quarantine/
        └── temporary/
```

The illustrated repository-directory segment denotes the lowercase SHA-256 of
the canonical UTF-8 base-URL string; the implementation field is
`ontologyQueryArtifactBaseUrlSha256`. The directory namespace prevents a
retained `development` loopback state from satisfying a later production-
origin request with the same channel name. The strict channel state repeats
that base-URL identity and rejects a mismatch. The unhashed URL is not written
to cache metadata.

On POSIX, every managed directory is created with mode `0700` and every managed
file with mode `0600`, then verified without following links. Before use,
reject an entry whose effective owner differs from the process's effective user,
whose type is not the expected directory or regular file, or whose group/other
write bits are set. Never silently take ownership of an existing path. On
Windows, keep the default under the current user's `LOCALAPPDATA`; reject
symbolic links, reparse-point links, and unexpected object types. An explicit
override is documented as requiring an ACL controlled by the intended user,
but the process neither presents POSIX modes as ACL verification nor blindly
strips inherited Windows ACLs. Unsafe path/security state fails without
including the path in output, using the stable operational error code
`UNSAFE_CACHE_DIRECTORY`; inability to create, secure, or remove an ordinary
probe file in the owned temporary directory is unsafe-directory state.

`ontologyQueryArtifactCacheInitializationErrors.js` owns the closed two-value
safe vocabulary and exports
`OntologyQueryArtifactCacheInitializationError`. Its `safeErrorCode` is either
`UNSAFE_CACHE_DIRECTORY` or `UNSUPPORTED_CACHE_FILE_SYSTEM`; its public message
is fixed and path-free, while the original platform exception remains only as
an unrendered `cause`. No caller may copy an arbitrary filesystem error code or
message into stderr or an MCP result.

Cache initialization performs a no-clobber capability probe in the owned
`temporary/` directory. Exclusively create and flush one unique source file,
hard-link it to a second unique name in that same directory, and verify the
linked bytes. Then attempt to hard-link over a third pre-existing file holding
different bytes: require `EEXIST` and prove the sentinel bytes are unchanged.
Clean up all three invocation-owned names. An unsupported hard-link operation,
link-operation policy/permission denial after ordinary file access has passed,
or a result that cannot establish the required semantics fails closed with the
path-redacted operational error code
`UNSUPPORTED_CACHE_FILE_SYSTEM`. Do not fall back to copying or a
replace-existing rename. Local NTFS, APFS, and ordinary Linux filesystems
normally pass, but the probe—not a filesystem-name allowlist—decides whether a
default, custom, removable, or network location is supported.

Immutable artifact installation uses a unique temporary file in the same
filesystem, `open` with exclusive creation, file flush, close, and an atomic
hard-link into the digest path. `EEXIST` means another process won; verify the
winner and discard only this invocation's temporary file. Never rename over an
existing digest path.

Last-known-good channel state is an append-only sequence under a per-channel
lease. The writer validates every referenced cached artifact, writes and
flushes the next zero-padded generation, and only then prunes generations
beyond the newest two valid states. Readers choose the highest fully valid
generation and can fall back to the second retained valid generation if the
newest file is later corrupted. This avoids relying on replace-existing
`rename` behavior that differs between Windows and POSIX.

The strict state schema contains:

```js
{
  persistentCacheStateKind:
    "universal_ontology_query_channel_last_known_good_state",
  persistentCacheStateFormatVersion: 1,
  ontologyQueryArtifactBaseUrlSha256:
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  ontologyQueryArtifactChannelName: "stable",
  ontologyQueryChannelManifestReference: {
    sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    byteLength: 512,
  },
  ontologyQueryCatalogReference: {
    relativePath:
      "catalogs/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.json",
    sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    byteLength: 1234,
  },
  channelManifestHttpValidator: {
    entityTag: '"published-representation-tag"',
    lastModifiedHttpDate: "Mon, 31 Aug 2026 10:00:00 GMT",
  },
}
```

HTTP validator fields are nullable, bounded untrusted metadata. They are not
artifact identity and never enter semantic results.

### 11.2 Cache interface

```js
const cache = await createPersistentOntologyQueryArtifactCache({
  ontologyQueryArtifactCacheDirectoryPath,
  ontologyQueryArtifactBaseUrlSha256,
  maximumPersistentQueryArtifactCacheByteSize,
  writeOperationalEvent,
});

cache.readVerifiedArtifact({ expectedByteLength, expectedSha256, signal });
cache.installVerifiedArtifact({
  bytes,
  expectedByteLength,
  expectedSha256,
  signal,
});
cache.readLastKnownGoodChannelState({
  ontologyQueryArtifactChannelName,
  signal,
});
cache.installLastKnownGoodChannelState({ state, signal });
cache.withArtifactPopulationLease({ expectedSha256, signal, operation });
cache.prune({ protectedArtifactSha256Values, signal });
```

The factory rejects a non-absolute root, a root that is a file or symbolic
link, and symbolic links anywhere in its owned descendants. Every deletion or
rename target is derived from a validated digest/channel and rechecked below
the resolved owned root. Corrupt exact cache files move to `quarantine/` under
a unique name; they are never accepted or repaired in place.

Artifact-population and channel-state leases use atomic directory creation,
a random owner token, a bounded acquisition deadline, and a heartbeat. A
contender may reclaim a genuinely stale lease only by atomically renaming the
exact lease directory to a unique stale name and deleting that renamed owned
directory. Release verifies the owner token. Process IDs alone are not proof
of ownership because they are reused.

Eviction counts only canonical artifact-file bytes, updates access recency on
a successful verified read, and removes least-recently-used unprotected
artifacts until the 536,870,912-byte default is met. Channel-state files,
locks, and temporary files have their own small fixed bounds. The manifest and
catalog selected by every retained last-known-good state are protected.
Release indexes needed by active work are protected for that operation; other
indexes remain evictable, so an offline request for an evicted index fails
explicitly rather than claiming full offline coverage.

### Steps

- [ ] Begin with failing initialization/path tests, including a relative root,
      symlink/reparse-point root, linked descendant, digest traversal,
      file-as-root, wrong effective owner, POSIX group/other-writable entries,
      exact `0700`/`0600` creation modes, unexpected Windows object types, and
      ordinary probe-file permission failure, plus a state from a different
      base-URL identity. Assert the redacted `UNSAFE_CACHE_DIRECTORY` code where
      applicable.
- [ ] Add failing capability-probe tests for success, unsupported hard links,
      hard-link-specific policy/permission denial, required `EEXIST` collision
      with an unchanged sentinel, unexpected collision behavior, and cleanup on
      every outcome. Assert `UNSUPPORTED_CACHE_FILE_SYSTEM` and prove no copy or
      rename fallback executes.
- [ ] Add failing cold-install, verified-hit, corrupt-hit quarantine,
      no-overwrite `EEXIST` race-winner validation, and cancellation tests
      through the public cache API.
- [ ] Implement the minimal contained immutable store with detailed comments
      at the hard-link and containment boundaries.
- [ ] Add failing state-generation tests: no state, one valid state, invalid
      newest state, crash before link, two writers, and cleanup after a newer
      valid generation.
- [ ] Implement strict state parsing and channel leases. Inject monotonic time,
      wall time, random token, and bounded wait only where deterministic tests
      require them.
- [ ] Add failing eviction tests for exact byte accounting, recency, protected
      manifest/catalog, active index, incomplete cleanup, and over-budget
      protected state.
- [ ] Add child-process tests proving two processes cannot corrupt one cold
      installation and a terminated lease owner can be recovered after its
      lease expires.
- [ ] Simulate failure after temporary creation, after write, after flush,
      after hard-link, and before state-generation cleanup. Restart against
      each fixture and prove the preceding valid state remains readable.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/persistent-ontology-query-artifact-cache.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review` over the cache, schemas, tests, and fixture; resolve all
      P0-P2 findings and commit:

```text
feat(ontology-query): Persist verified query artifacts safely

- install immutable canonical bytes without overwriting digest identities
  across concurrent Windows and POSIX processes
- retain append-only validated channel generations for crash-safe
  last-known-good startup
- bound and prune persistent storage without deleting active or channel-root
  artifacts, following symlinks, or escaping the owned cache root
```

## 12. Task 5: Implement the bounded HTTP artifact reader

**Files:**

- Create `src/ontologyQuery/httpOntologyQueryArtifactReader.js`.
- Create `tests/ontology-query/http-ontology-query-artifact-reader.test.js`.
- Create `tests/fixtures/ontology-query/createOntologyQueryArtifactHttpFixture.js`.

### Interface

```js
const reader = createHttpOntologyQueryArtifactReader({
  ontologyQueryArtifactBaseUrl,
  allowInsecureLoopbackOntologyQueryArtifactOrigin,
  fetchImplementation,
  requestTimeoutMilliseconds: 15_000,
});

reader.read({
  relativePath,
  maximumDecodedByteLength,
  conditionalRequestValidator,
  signal,
});

// Result union:
{
  retrievalStatus: ("fetched", bytes, responseValidator);
}
{
  retrievalStatus: ("not_modified", responseValidator);
}
```

The base URL must be slash-terminated, credential-free, query-free, and
fragment-free. HTTPS is mandatory. Plain HTTP is accepted only when the
explicit CLI flag is present and the URL hostname is exactly `localhost`,
`127.0.0.1`, or `[::1]`; arbitrary hostnames that happen to resolve to
loopback are rejected.

Every relative path passes the transport-neutral contained POSIX parser and an
HTTP-specific rejection of `%`, `?`, and `#`. After URL resolution, recheck
the exact origin and base-path prefix. Use `redirect: "error"`, credentials
omission, `Accept: application/json`, and caller/timeout abort composition.
Never add query parameters.

Accept only status 200 for an unconditional/changed response and 304 when a
conditional validator was sent. Accept `application/json` or a structured
`application/*+json` media type. Bound decoded response chunks, not compressed
wire bytes. Node Fetch transparently decodes `br`/`gzip`; a compressed
`Content-Length` must not be compared with the canonical decoded ceiling.
Reject an absent body, non-byte chunk, truncation, stream failure, and a body
that exceeds its artifact-specific limit.

Accept a bounded strong or weak ETag and valid HTTP-date from the response as
conditional-retrieval metadata. Neither value substitutes for SHA-256.

### Steps

- [ ] Build a deterministic loopback fixture that can return identity, Brotli,
      Gzip, chunked, delayed, redirected, truncated, malformed, conditional,
      and oversized responses while recording exact request targets/headers.
- [ ] Write failing base-URL and relative-path tests for credentials, schemes,
      localhost flag behavior, origin changes, traversal, percent decoding,
      query, fragment, and prefix confusion.
- [ ] Implement URL validation and prove no recorded request target contains
      `queryText`, an entity IRI, or any URL search component.
- [ ] Add one failing test at a time for status, redirect, media type, missing
      body, decoded byte ceiling, timeout, caller cancellation, 304, ETag, and
      Last-Modified behavior.
- [ ] Prove the same canonical JSON bytes and SHA-256 emerge from identity,
      Brotli, and Gzip responses.
- [ ] Prove caller cancellation is distinguishable from the fixed 15-second
      timeout and both release body readers promptly.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/http-ontology-query-artifact-reader.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(ontology-query): Bound remote artifact retrieval

- constrain query-artifact requests to one validated HTTPS origin and path
  tree, with an explicit localhost-only development exception
- enforce status, redirect, media-type, timeout, cancellation, and decoded-byte
  limits for compressed and identity responses
- retain HTTP validators only as revalidation metadata while preserving
  canonical SHA-256 as artifact identity
```

## 13. Task 6: Compose the persistent HTTP artifact repository

**Files:**

- Create
  `src/ontologyQuery/persistentHttpOntologyQueryArtifactRepository.js`.
- Create
  `tests/ontology-query/persistent-http-ontology-query-artifact-repository.test.js`.
- Modify `src/ontologyQuery/ontologyQueryErrors.js` only if a new safe
  acquisition failure cannot be represented by an existing code.

### Initialization state machine

The first `readOntologyQueryCatalog` call coalesces this operation:

1. read and fully validate the retained last-known-good state, if one exists;
2. conditionally GET
   `channels/${ontologyQueryArtifactChannelName}.json` using its stored HTTP
   validator;
3. on 304, use the retained exact manifest and catalog;
4. on 200, bound and parse the strict manifest, require its channel to match,
   and verify its own cached canonical bytes;
5. read the referenced content-addressed catalog from cache or HTTPS under an
   artifact-population lease;
6. verify byte length, SHA-256, fatal UTF-8, JSON, catalog kind/version, strict
   schema, and catalog/release relative paths;
7. install manifest and catalog immutable bytes, then install the new
   last-known-good state;
8. pin that catalog snapshot for this process and return its bytes.

An origin network error, timeout, 429, 5xx, invalid newly fetched manifest, or
invalid newly fetched catalog emits a redacted warning and uses a complete
retained state if one validates. A configuration error, cancellation, cache
containment failure, or absent complete retained state does not silently
fallback. A 401/403 is treated as an origin-policy failure and fails closed;
it is not disguised as ordinary offline operation.

A 404/410 for a previously retained channel or immutable reference may use the
same-base-URL retained state with a warning, because incomplete publication or
accidental deletion must not make a preceding verified snapshot unreadable. A
first-use 404/410 has no state and fails explicitly. No fallback can cross the
base-URL namespace.

Once pinned, later catalog reads return the same bytes without re-fetching the
channel. A process restart is required to observe promotion.

### Release-index reads

`readOntologyReleaseQueryIndex` accepts only the catalog-selected normalized
relative path. Parse the final digest from that path, find the selected catalog
entry, and require path/digest agreement before touching cache or network.
Read and verify a cache hit. On a miss or quarantined corrupt hit, coalesce by
digest across local waiters and take the inter-process population lease before
fetching. Validate canonical byte length, SHA-256, UTF-8, strict release-index
schema, and embedded ontology-release identity before installation and return.

Never select another release, channel, catalog, or cached digest after a
specific index is missing. Offline cache miss returns the existing safe
`QUERY_INDEX_UNAVAILABLE` shape.

### Operational events

Use a provided `writeOperationalEvent` callback. Events contain only a fixed
event name, severity, outcome, safe error code, channel, cache outcome, byte
count, elapsed milliseconds, and a randomly generated correlation identifier.
They must not contain URLs with user-controlled text, local paths, entity
values, query text, definitions, labels, source IRIs, stack traces, or HTTP
body excerpts.

### Steps

- [ ] Add failing cold-start tests for manifest, catalog, and one release index
      using the real loopback HTTP fixture and OS temporary cache root.
- [ ] Implement the smallest online path through the reader/cache ports and
      keep the query module unchanged.
- [ ] Add failing warm-restart and 304 tests proving no catalog or index body
      transfer when verified bytes exist.
- [ ] Add one failing offline test at a time for complete cached `Person`, no
      retained state, corrupt state, absent catalog, and absent selected index.
- [ ] Add failing inconsistent-promotion tests: wrong channel, catalog digest,
      length, schema, release path, and embedded release identity. Prove a
      preceding valid state remains selected when fallback is allowed.
- [ ] Add failing concurrency tests for duplicate catalog/index callers,
      one-waiter cancellation, all-waiter cancellation, two processes, retry
      after failure, and process restart after interruption.
- [ ] Add a negative privacy assertion over every recorded HTTP request and
      emitted operational event while querying a unique sensitive test string.
- [ ] Run:

```powershell
npm test -- --runInBand tests/ontology-query/persistent-http-ontology-query-artifact-repository.test.js tests/ontology-query/ontology-query-module.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(ontology-query): Resolve remote channels into exact local snapshots

- revalidate mutable channel manifests and pin one fully verified immutable
  catalog for each process
- combine digest-keyed disk caching, bounded HTTPS retrieval, waiter-aware
  cancellation, and crash-safe last-known-good fallback
- fail explicitly on missing exact indexes without transmitting ontology query
  content or substituting another release
```

## 14. Task 7: Add installed-process configuration and safe events

**Files:**

- Create `src/mcp/universalOntologyMcpStdioConfiguration.js`.
- Create `src/mcp/universalOntologyMcpOperationalEvents.js`.
- Create matching tests.
- Modify `src/mcp/universalOntologyMcpMetadata.js` so its version comes from
  the single package-version authority rather than a second literal.

### OS cache defaults

Resolve the default once at startup:

| Platform          | Default absolute path                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows           | `%LOCALAPPDATA%/UniversalOntology/McpServer/Cache/v1`; if `LOCALAPPDATA` is absent, use `os.homedir()/AppData/Local/UniversalOntology/McpServer/Cache/v1` |
| macOS             | `os.homedir()/Library/Caches/io.hadden-industries.universal-ontology-mcp-server/v1`                                                                       |
| Linux/other POSIX | `$XDG_CACHE_HOME/universal-ontology-mcp-server/v1`; if absent, use `os.homedir()/.cache/universal-ontology-mcp-server/v1`                                 |

An explicit cache directory must already be absolute after platform parsing;
do not resolve it relative to the current working directory. Empty environment
values count as absent, not as the current directory. The ownership,
permissions, link/object-type, and hard-link capability requirements from Task
4 apply equally to a default or explicit cache directory.

### Parsed configuration

```js
{
  operationMode: "serve_stdio" | "print_help" | "print_version",
  ontologyQueryArtifactChannelName: "stable" | "development",
  ontologyQueryArtifactBaseUrl: URL,
  ontologyQueryArtifactCacheDirectoryPath: string,
  maximumPersistentQueryArtifactCacheByteSize: 536_870_912,
  allowInsecureLoopbackOntologyQueryArtifactOrigin: false,
}
```

Help and version modes must not create the cache, make a network request, or
initialize MCP. Error messages identify the invalid option but do not echo an
environment secret or arbitrary value.

The operational-event writer serializes one bounded JSON object per stderr
line. On serialization/write failure, it emits one fixed fallback line at
most once and continues protocol service where safe. It never writes stdout.

### Steps

- [ ] Add table-driven failing tests for defaults, every CLI/env setting,
      precedence, both option syntaxes, duplicates, invalid/empty values,
      channels, URLs, cache paths, byte overflow, unknown options, help, and
      version.
- [ ] Implement strict parsing without a third-party CLI dependency and add
      JSDoc for exit-code and value-precedence semantics.
- [ ] Add failing platform-default tests by injecting platform, environment,
      and home-directory reads.
- [ ] Add event-writer tests for allowlisted fields, redaction, bounded string
      values, serialization failure, and stdout non-use.
- [ ] Import the root package version into metadata through a build-compatible
      JSON module boundary and prove root, server, and public workspace
      versions match.
- [ ] Run:

```powershell
npm test -- --runInBand tests/mcp/universal-ontology-mcp-stdio-configuration.test.js tests/mcp/universal-ontology-mcp-operational-events.test.js tests/mcp/universal-ontology-mcp-server.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(mcp): Define the installed server configuration boundary

- parse stable channel, artifact origin, persistent-cache location, and byte
  budget with explicit CLI-over-environment precedence
- choose contained platform cache defaults and require an explicit flag for
  insecure loopback artifact development
- unify advertised software versioning and constrain operational output to
  redacted stderr events
```

## 15. Task 8: Compose and test the real `stdio` process

**Files:**

- Create `src/mcp/runUniversalOntologyMcpStdioServer.js`.
- Create `scripts/runUniversalOntologyMcpStdioServer.js`.
- Create `tests/mcp/universal-ontology-mcp-stdio-server.test.js`.
- Create
  `tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js`.
- Modify `src/mcp/createUniversalOntologyMcpServer.js` to merge each MCP
  request's cancellation with the installed process lifecycle signal.
- Modify `package.json` to add
  `"mcp:stdio": "node scripts/runUniversalOntologyMcpStdioServer.js"`.

### Composition

The source runner accepts injected process streams, arguments, environment,
fetch, and signal-registration seams for tests. Production defaults use the
real process. Its serve branch constructs the persistent cache, HTTP reader,
persistent repository, query module, and MCP server inside the factory passed
to the official SDK:

```js
const stdioServerHandle = serveStdio(
  () =>
    createUniversalOntologyMcpServer({
      ontologyQueryModule,
    }),
  {
    legacy: "serve",
    onerror: writeSafeSdkErrorEvent,
  },
);
```

The SDK factory pins one connection-era instance and retains intended
handshake-era compatibility. Do not construct `StdioServerTransport`
directly. Keep the returned `StdioServerHandle`; its `close()` method is the
single idempotent shutdown path for stdin EOF, POSIX `SIGINT`/`SIGTERM`, a
Windows `SIGINT` when delivered, startup failure, and test cleanup. Do not add
a proprietary MCP shutdown message.

Create one `serverLifecycleAbortController`. Each tool invocation passes
`AbortSignal.any([context.mcpReq.signal, serverLifecycleSignal])` to the query
module. On shutdown, abort that lifecycle signal before calling `close()` so a
blocked cold fetch cannot hold process termination open. Use a fixed
10,000-millisecond graceful shutdown deadline with an unreferenced timer; emit
a fixed safe failure event and set exit code 1 if close exceeds it.

Do not preload a channel at process startup. `tools/list` and initialization
must work offline with an empty cache; the first ontology tool call triggers
artifact selection. Help/version modes return before runtime composition.

### Process semantics

- stdout is reserved entirely for the SDK transport;
- all server and SDK diagnostics use the safe stderr event writer;
- stdin EOF stops accepting protocol input, aborts in-flight query acquisition,
  closes the SDK handle, and lets the process exit on every platform;
- on POSIX, `SIGINT` and `SIGTERM` use that same graceful path; on Windows,
  host-driven graceful shutdown is stdin EOF and a delivered console `SIGINT`
  may use the same path, but no catchable `SIGTERM` behavior is promised;
- forced Windows process termination is a crash case: subsequent startup must
  recover owned temporary files and stale leases without accepting partial
  state;
- signal handlers are removed on closure and repeated signals cannot run
  cleanup twice; and
- no HTTP listener, health port, WebSocket, or background refresh timer is
  created.

### Steps

- [ ] Add failing unit tests for help/version short-circuit, lazy artifact
      access, one-time server construction, idempotent close, handler cleanup,
      stdin EOF, platform-specific signal registration, and safe startup
      failure.
- [ ] Implement composition and shutdown around `serveStdio` with comments at
      the legacy-era and protocol-output boundaries.
- [ ] Launch the real script through official
      `@modelcontextprotocol/client` `StdioClientTransport` in an integration
      test against the loopback artifact fixture.
- [ ] Add failing assertions for server identity, instructions, exact tool
      order, input/output schemas, annotations, no resources/prompts, and the
      existing structured/text `Person` result.
- [ ] Exercise a 2026-era request and an intended 2025-era initialization path
      from the same factory; prove a connection pins one era.
- [ ] Capture stdout separately and parse every frame as protocol JSON. Send
      operational warnings to stderr and prove they never appear on stdout.
- [ ] Block an artifact response, cancel the MCP call, and prove cancellation
      reaches the HTTP fixture without aborting a second waiter.
- [ ] Add platform integration cases: send `SIGINT` and `SIGTERM` on POSIX;
      close stdin on Windows; exercise Windows `SIGINT` only where the runner
      can deliver it reliably; forcibly terminate a Windows cache writer and
      prove the next process recovers without accepting partial bytes.
- [ ] During the running integration test, attempt to connect to the old
      loopback default port and inspect active test-owned handles to prove this
      process did not open a listening socket.
- [ ] Run the exact-version Inspector against the real command:

```powershell
npx --yes @modelcontextprotocol/inspector@2.4.0 --cli node scripts/runUniversalOntologyMcpStdioServer.js --method tools/list
```

Keep the ad-hoc stdio target before Inspector flags; Inspector 2.x otherwise
may resolve a saved catalog entry instead of the intended process.

- [ ] Run:

```powershell
npm test -- --runInBand tests/mcp/universal-ontology-mcp-stdio-server.test.js tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js tests/mcp/universal-ontology-mcp-server.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(mcp): Serve Universal Ontology over local stdio

- compose the persistent remote-artifact repository with the unchanged query
  and MCP tool modules behind the official SDK stdio factory
- preserve modern and intended legacy protocol behavior while reserving stdout
  exclusively for MCP frames
- propagate cancellation and close the owned transport cleanly on EOF and
  process termination without opening a listener
```

## 16. Task 9: Build and verify the future-public npm package locally

**Files:**

- Modify the three package/lint configuration files authorized in section 4.
- Create `packages/universal-ontology-mcp-server/package.json`.
- Copy the root `LICENSE` to the public package.
- Create `packages/universal-ontology-mcp-server/README.md` and
  `THIRD_PARTY_NOTICES.md`.
- Create
  `scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js`.
- Create `tests/distribution/universal-ontology-mcp-npm-package.test.js`.

### Public metadata

Use this package contract, completed with the repository URLs and descriptions
shown here:

```json
{
  "name": "universal-ontology-mcp-server",
  "version": "1.0.0",
  "description": "Read-only local MCP access to versioned Universal Ontology definitions and entity descriptions.",
  "type": "module",
  "bin": {
    "universal-ontology-mcp-server": "dist/universal-ontology-mcp-server.mjs"
  },
  "files": [
    "dist/universal-ontology-mcp-server.mjs",
    "LICENSE",
    "README.md",
    "THIRD_PARTY_NOTICES.md"
  ],
  "engines": { "node": ">=24.0.0" },
  "keywords": [
    "model-context-protocol",
    "mcp",
    "ontology",
    "semantic-web",
    "knowledge-graph",
    "universal-ontology"
  ],
  "mcpName": "io.github.hadden-industries/universal-ontology",
  "publishConfig": { "access": "public", "provenance": true },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/hadden-industries/universal-ontology.git",
    "directory": "packages/universal-ontology-mcp-server"
  },
  "homepage": "https://github.com/hadden-industries/universal-ontology#universal-ontology-mcp-server",
  "bugs": {
    "url": "https://github.com/hadden-industries/universal-ontology/issues"
  },
  "scripts": {
    "prepack": "node ../../scripts/distribution/buildUniversalOntologyMcpApplicationBundle.js"
  }
}
```

Add useful search keywords, but do not add a postinstall script, update
checker, telemetry, runtime dependency, install-time download, or data file.
The declared Node floor remains `>=24.0.0`, matching the `node24` bundle target
and the tested LTS line. Supporting Node 22 would require a separate plan
amendment, `node22` build target, compatibility review, and Node 22 CI matrix;
do not imply that support from untested syntax compatibility alone.

### Canonical bundle

Build from `scripts/runUniversalOntologyMcpStdioServer.js` using esbuild with
`bundle: true`, `platform: "node"`, `format: "esm"`, `target: "node24"`,
`minify: false`, `treeShaking: true`, `legalComments: "eof"`, an executable
Node shebang, and `metafile: true`. Bundle all non-built-in runtime
dependencies. Do not externalize `@modelcontextprotocol/*` or Zod.

The build script:

- reads version from both package files and fails on disagreement;
- builds and validates each application-bundle candidate in a uniquely named
  directory below root `dist/release-work/`, synchronizes its bytes, then
  atomically replaces the canonical package `dist/` bundle without first
  removing the live bundle another verifier may be using;
- atomically replaces the synchronized release-work metadata document and
  removes unexpected package `dist/` entries only after successful candidate
  publication; immediately before publication and each destructive cleanup,
  `lstat` rejects a symbolic-link or Windows-junction component and `realpath`
  confirms the owned directory still resolves inside the repository;
- normalizes output mode to executable on POSIX;
- scans the metafile for only allowlisted source roots and runtime packages;
- scans output for absolute repository paths, ontology artifact paths, source
  ontology content, source maps, unexpected network origins or dynamic code
  loading, and accidental secrets;
- records bundled component names/versions/licenses for notices and SBOM; and
- produces byte-identical output from two clean builds at the same commit.

`THIRD_PARTY_NOTICES.md` identifies the bundled official MCP packages, Zod,
and transitive runtime components using lockfile versions and their licenses.
The test fails if the metafile contains a bundled package missing from notices.

### Steps

- [ ] Add failing metadata tests for name, `mcpName`, bin, exact files,
      versions, engines, exact root `packageManager`, no runtime dependencies,
      no install hooks, and root/workspace version equality.
- [ ] Make the exact configuration edits in section 4 with selected npm
      `12.0.2` and `npm install --save-dev --save-exact` for the seven approved
      packages; assert the CLI version immediately before the command and
      inspect both manifest and lockfile diffs before continuing.
- [ ] Add a failing bundle test for the expected executable entry point, then
      implement the minimal esbuild script.
- [ ] Add a failing concurrency regression that observes the canonical bundle
      throughout a rebuild and run the package and application-bundle-verifier
      suites in separate workers; require continuous availability and fully
      validated candidate publication.
- [ ] Add a failing linked-output regression proving package cleanup rejects a
      symbolic-link or junction parent without deleting its external target.
- [ ] Add failing allowlist, path-leak, data-exclusion, notice-completeness,
      deterministic-build, `--help`, and `--version` tests.
- [ ] Run `npm pack --dry-run --json --workspace
universal-ontology-mcp-server`, assert the exact file list, then create
      the actual tarball below `dist/releases/`.
- [ ] Install that tarball into a fresh OS temporary directory with
      `npm install --ignore-scripts --omit=dev`; invoke its bin for help,
      version, tools/list, and loopback-fixture `Person`.
- [ ] Recursively scan the unpacked tarball and prove no `query/v1`, `.owl`,
      `.jsonld`, release-index JSON, root source path, test fixture, or build
      metadata is present.
- [ ] Run:

```powershell
npm run mcp:package:build
npm run mcp:package:pack
npm test -- --runInBand tests/distribution/universal-ontology-mcp-npm-package.test.js tests/mcp/universal-ontology-mcp-stdio-server.integration.test.js
npm run lint
npm run format:check
```

- [ ] Enter `/review` with configuration, lockfile, package, build script, and
      tests in scope; resolve P0-P2 findings and commit:

```text
feat(distribution): Package the local MCP server for npm

- add a public Registry-owned workspace whose executable is one bundled stdio
  application with no install-time download or ontology data
- pin the packaging and schema-validation toolchain in the root lockfile
- verify deterministic contents, runtime licenses, version identity, fresh
  installation, and the packaged Person lookup before publication
```

## 17. Task 10: Build deterministic self-contained platform archives

**Files:**

- Create
  `scripts/distribution/universalOntologyMcpReleaseInputs.json`.
- Create
  `scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js`.
- Create `tests/distribution/universal-ontology-mcp-platform-archive.test.js`.

### Release-input document

Make the JSON document strict and include a
`releaseInputFormatVersion: 1`. Record all values from section 6 plus this
matrix:

| Target name   | Runner             | Runtime executable | Release format |
| ------------- | ------------------ | ------------------ | -------------- |
| `linux-x64`   | `ubuntu-24.04`     | `runtime/bin/node` | `tar.gz`       |
| `linux-arm64` | `ubuntu-24.04-arm` | `runtime/bin/node` | `tar.gz`       |
| `macos-x64`   | `macos-15-intel`   | `runtime/bin/node` | `tar.gz`       |
| `macos-arm64` | `macos-15`         | `runtime/bin/node` | `tar.gz`       |
| `windows-x64` | `windows-2025`     | `runtime/node.exe` | `zip`          |

The implementation-day upstream check may replace a digest only together with
the immutable URL/version and review evidence. Build scripts never infer a
runtime from the host or download a floating URL.

### Archive layout

Each archive contains exactly one top-level directory named like the archive:

```text
universal-ontology-mcp-server-v1.0.0-linux-x64/
├── app/universal-ontology-mcp-server.mjs
├── runtime/bin/node
├── LICENSE
├── README.md
└── THIRD_PARTY_NOTICES.md
```

Windows uses `runtime/node.exe`. The runtime binary comes from the verified
official Node archive; the notices include the Node license. Host
configuration calls the included runtime executable with the included app
path as its first application argument, avoiding dependence on a shell or
system Node. A documented Node runtime option such as `--use-system-ca` appears
before that application path. Convenience `.cmd`/shell launchers are
intentionally absent from the first archive contract.

### Safe deterministic construction

- Stream the runtime download with a 134,217,728-byte compressed ceiling and a
  fixed timeout; calculate SHA-256 while writing to an owned temporary file.
- Reject the download before extraction on checksum disagreement.
- Extract only the exact allowlisted runtime executable and Node license path.
  Reject absolute paths, `..`, links, devices, duplicates, and case-folded
  collisions even though upstream is trusted.
- Use `tar` for safe `.tar.gz` selection/creation and lazy-entry `yauzl` for
  reading ZIP. Use `yazl` for deterministic output ZIP.
- Sort entries by binary path order. Normalize file modes, owners, group,
  mtimes from `SOURCE_DATE_EPOCH`, path separators, and Gzip metadata.
- Set the POSIX runtime and app bundle executable modes. Do not give write bits
  to group/other.
- Build into a unique `dist/release-work/` directory, verify, then atomically
  move the final archive into `dist/releases/`.

### Steps

- [ ] Add failing strict-schema and matrix tests for the release-input JSON,
      including unique target/archive names, digest/URL/version agreement, and
      selected npm equality with the root `packageManager` field.
- [ ] Add malicious archive fixtures for traversal, absolute paths, symlinks,
      duplicate entries, case collisions, oversize, checksum failure, and
      unexpected runtime paths.
- [ ] Implement bounded download and allowlisted extraction one failing case at
      a time.
- [ ] Add a failing archive-content test, then implement normalized tar/ZIP
      creation.
- [ ] Build the current-host archive twice with the same source epoch and prove
      identical SHA-256. Extract it into a fresh directory without using the
      build tree.
- [ ] Invoke the included runtime directly for `--version`, `--help`,
      tools/list, and the loopback-fixture `Person` result.
- [ ] In CI, repeat the smoke on each target's native runner and prove the
      runtime reports exactly `v24.20.0`.
- [ ] Run:

```powershell
npm run mcp:archives:build -- --target windows-x64
npm test -- --runInBand tests/distribution/universal-ontology-mcp-platform-archive.test.js
npm run lint:js
npm run format:check
```

- [ ] Enter `/review`, resolve P0-P2 findings, rerun, and commit:

```text
feat(distribution): Build verified local platform archives

- derive five release targets from one strict manifest of official Node LTS
  runtime URLs and checksums
- extract only allowlisted runtime files and assemble normalized tar and ZIP
  artifacts around the canonical MCP application bundle
- prove deterministic contents, native runtime identity, data exclusion, and
  packaged stdio behavior before release
```

## 18. Task 11: Add the non-root local OCI package

**Files:**

- Create `packages/universal-ontology-mcp-server/Dockerfile`.
- Create `tests/distribution/universal-ontology-mcp-container.test.js`.
- Extend the release verifier for OCI metadata.

Use the exact pinned multi-platform Node image index from section 4. The file
must be equivalent to this contract:

```dockerfile
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

LABEL org.opencontainers.image.title="Universal Ontology MCP Server" \
      org.opencontainers.image.licenses="MIT" \
      io.modelcontextprotocol.server.name="io.github.hadden-industries/universal-ontology"

WORKDIR /opt/universal-ontology-mcp-server
COPY --chown=node:node dist/universal-ontology-mcp-server.mjs ./server.mjs
COPY --chown=node:node LICENSE README.md THIRD_PARTY_NOTICES.md ./

RUN install --directory --owner=node --group=node --mode=0700 /home/node/.cache/universal-ontology-mcp-server/v1
USER node:node
VOLUME ["/home/node/.cache/universal-ontology-mcp-server/v1"]
STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "/opt/universal-ontology-mcp-server/server.mjs"]
```

A future authorized production build may supply version, revision,
created-time, source, and description OCI labels. The active development
workflow uses the Dockerfile metadata, builds only a local image tag, and
performs no registry login or push. The image declares no port and no health
check because it is a one-connection `stdio` process, not a network service.
`STOPSIGNAL SIGTERM` applies to this Linux OCI runtime and does not imply that
native Windows processes receive a catchable `SIGTERM`.

### Steps

- [ ] Start with static failing tests for digest-pinned base, exact MCP label,
      non-root final user, exec-form entry point, no `EXPOSE`, no data copy,
      only the five allowlisted copied files, and a node-owned mode-`0700` cache
      mount point created before `USER` and `VOLUME`.
- [ ] Add the minimal Dockerfile and keep it package-context buildable after
      `npm run mcp:package:build`.
- [ ] Where Docker is available, build the native image and inspect its config
      for user, labels, entry point, volumes, environment, exposed ports, and
      layers.
- [ ] Run it with stdin, `--read-only`, `--cap-drop=ALL`,
      `--security-opt=no-new-privileges`, and a named cache volume. Exercise
      help/version, tools/list, cold `Person`, container restart, warm
      `Person`, and offline `Person`.
- [ ] Prove an absent cached selected index fails offline and the container
      never binds a port.
- [ ] Let the development-verification workflow build the native Linux image
      under a local `:development` tag and run the locked-down smoke without a
      registry login, push, remote cache export, provenance upload, or Registry
      publication.
- [ ] Run static checks on hosts without Docker and record the real-container
      suite as a development-runner acceptance requirement, not a silently
      skipped success.
- [ ] Enter `/review`, resolve P0-P2 findings, rerun available checks, and
      commit:

```text
feat(distribution): Add a non-root stdio container package

- package the canonical application bundle on a digest-pinned Node LTS image
  with exact MCP Registry ownership metadata
- run as the unprivileged Node user with no listening port and a dedicated
  persistent artifact-cache volume
- verify locked-down stdin execution, warm restart, exact offline behavior,
  and exclusion of ontology data from image layers
```

## 19. Task 12: Add future Registry metadata, SBOMs, and development distribution verification

**Files:**

- Create `server.json`.
- Vendor the versioned official Registry schema as
  `tests/fixtures/distribution/mcp-registry-server-schema-2025-12-11.json`.
- Create `scripts/distribution/createUniversalOntologyMcpSpdxSbom.js`.
- Create `scripts/distribution/verifyUniversalOntologyMcpRelease.js`.
- Create `.github/workflows/verify-universal-ontology-mcp-distribution.yml`.
- Create focused Registry, SBOM, release-candidate-verifier, and
  development-workflow tests.

### 19.1 Registry document

Create exactly this initial package topology:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.hadden-industries/universal-ontology",
  "title": "Universal Ontology",
  "description": "Read-only local access to versioned Universal Ontology definitions and entity descriptions.",
  "repository": {
    "url": "https://github.com/hadden-industries/universal-ontology",
    "source": "github"
  },
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "universal-ontology-mcp-server",
      "version": "1.0.0",
      "transport": { "type": "stdio" }
    },
    {
      "registryType": "oci",
      "identifier": "ghcr.io/hadden-industries/universal-ontology-mcp-server:1.0.0",
      "transport": { "type": "stdio" }
    }
  ]
}
```

Treat this as inactive future-production discovery metadata. Validate it
offline with Ajv 2020 plus `ajv-formats` against the vendored official schema.
Assert `server.json.name === package.json.mcpName`, all versions agree, both
packages use `stdio`, and each package ownership proof is present in its
underlying package/image metadata. Validation MUST NOT contact, authenticate
to, or update the MCP Registry.

### 19.2 SPDX 2.3

Generate one release SBOM and a package-specific SBOM from the esbuild
metafile, lockfile, release-input document, built archive manifests, and OCI
metadata. Use deterministic SPDX identifiers and document namespaces derived
from package version plus artifact SHA-256; do not use random UUIDs. Derive the
required `creationInfo.created` timestamp from `SOURCE_DATE_EPOCH`, which the
development workflow sets to the tested Git commit time, rather than the
current wall clock. Describe:

- the Universal Ontology MCP application;
- every bundled npm runtime component and license;
- Node 24.20.0 in each self-contained archive;
- every release asset filename and SHA-256; and
- `CONTAINS`, `DEPENDS_ON`, `GENERATED_FROM`, and `DESCRIBES` relationships
  that reflect actual packaging.

Run `npm sbom --workspace universal-ontology-mcp-server --sbom-format spdx
--sbom-type application` as an independent comparison. The custom release
SBOM must not omit any component npm or esbuild reports, while adding bundled
runtime/archive subjects npm cannot see.

### 19.3 Release verifier

The verifier takes a local candidate staging directory and a synthetic exact
tag-shaped software identity. The identity exercises future-release version
agreement without creating a Git tag. It fails unless:

- tag is `universal-ontology-mcp-server-v${softwareVersion}` and all version
  authorities agree;
- expected assets are present exactly once and no unexpected file exists;
- every `SHA256SUMS` line matches exact bytes;
- every archive content manifest matches its target allowlist;
- npm tarball, archives, SBOM, notices, Registry document, and OCI metadata
  exclude ontology data and secrets;
- each asset is represented in the SBOM input;
- GitHub workflow action references are full 40-character commits from the
  section 6 allowlist;
- the canonical semantic representation of the complete workflow matches one
  reviewed SHA-256 policy-manifest digest, so any changed trigger, job field,
  action input, shell, environment value, step, or run script fails closed;
- workflow YAML parses, exactly the four development jobs form the intended
  dependency graph, and every job grants only `contents: read`;
- every Actions artifact has three-day retention; and
- the workflow contains no tag/manual publication trigger, environment, OIDC
  permission, write permission, attestation, GitHub Release, npm publish, OCI
  login/push, MCP Publisher login/publish, AWS, Google Cloud, or CDN write
  path.

### 19.4 Workflow topology

Use path-scoped branch and pull-request validation only. The workflow has no
tag or manual trigger. `permissions: {}` is the workflow default, and every
job explicitly grants only `contents: read`:

```yaml
on:
  pull_request:
    paths:
      - ".github/workflows/verify-universal-ontology-mcp-distribution.yml"
      - "README.md"
      - "docs/mcp/**"
      - "docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md"
      - "package.json"
      - "package-lock.json"
      - "packages/universal-ontology-mcp-server/**"
      - "scripts/build/createOntologyQueryArtifacts.js"
      - "scripts/build/ontologyAssets.js"
      - "scripts/distribution/**"
      - "scripts/generateOntologyQueryIndexes.js"
      - "scripts/runUniversalOntologyMcpStdioServer.js"
      - "scripts/stageOntologyQueryArtifactChannel.js"
      - "server.json"
      - "src/mcp/**"
      - "src/ontology.js"
      - "src/ontologyQuery/**"
      - "tests/distribution/**"
      - "tests/mcp/**"
      - "tests/ontology-query/**"
      - "tests/webmcp/ontology-entity-definition-resolver.test.js"
  push:
    branches: ["**"]
    paths:
      - ".github/workflows/verify-universal-ontology-mcp-distribution.yml"
      - "README.md"
      - "docs/mcp/**"
      - "docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md"
      - "package.json"
      - "package-lock.json"
      - "packages/universal-ontology-mcp-server/**"
      - "scripts/build/createOntologyQueryArtifacts.js"
      - "scripts/build/ontologyAssets.js"
      - "scripts/distribution/**"
      - "scripts/generateOntologyQueryIndexes.js"
      - "scripts/runUniversalOntologyMcpStdioServer.js"
      - "scripts/stageOntologyQueryArtifactChannel.js"
      - "server.json"
      - "src/mcp/**"
      - "src/ontology.js"
      - "src/ontologyQuery/**"
      - "tests/distribution/**"
      - "tests/mcp/**"
      - "tests/ontology-query/**"
      - "tests/webmcp/ontology-entity-definition-resolver.test.js"
```

Every job that invokes npm runs this immediately after the pinned
`actions/setup-node` step and before its first npm command; the workflow tests
cross-check the literal with both `packageManager` and the release-input JSON:

```yaml
- name: Select exact npm CLI
  shell: bash
  run: |
    npm install --global --no-audit --no-fund npm@12.0.2
    test "$(npm --version)" = "12.0.2"
```

The Node-bundled npm `11.19.0` performs only this bootstrap. Lockfile use,
`npm ci`, tests, builds, packing, and `npm sbom` all run under npm `12.0.2`;
Corepack is not used to manage npm.

1. `validate`: `contents: read`; select npm `12.0.2`, install with
   `npm ci --ignore-scripts`, run all tests/lint/format/build, build the
   canonical package bundle, validate Registry/workflow metadata offline, and
   output the strictly parsed version, target matrix, and commit-derived
   `SOURCE_DATE_EPOCH`. Do not access the not-yet-established public ontology
   artifact origin; deterministic loopback tests cover network behavior.
2. `archive` matrix: `contents: read`; depend on `validate`, run all five native
   archive builds and native `--version`/`--help` smoke tests, and upload each
   target as a GitHub Actions artifact with `retention-days: 3`.
3. `container`: `contents: read`; depend on `validate`, build the Docker image
   under a local development tag without logging into any registry, then run
   it with stdin preserved, a named cache volume, a read-only filesystem,
   dropped capabilities, `no-new-privileges`, and no port mapping. Complete an
   MCP initialize/tools-list exchange so the job exercises cache ownership rather
   than only the help/version early exits. Never invoke a registry login, build
   push, image push, or remote cache export.
4. `assemble`: `contents: read`; depend on `validate`, `archive`, and
   `container`; download the exact archive artifacts, build and pack the local
   npm tarball, generate npm and deterministic SPDX SBOMs, assemble checksums
   and notices, and run the fail-closed candidate verifier with the synthetic
   identity `universal-ontology-mcp-server-v1.0.0`. Upload the complete
   candidate once as a GitHub Actions artifact whose name contains its SHA-256
   and whose retention is three days.

Set concurrency to the branch or pull-request ref with
`cancel-in-progress: true`. Actions artifacts are the only remote outputs and
are disposable development evidence, not releases. Never expose a GitHub token
to a shell step, pipe a download into a shell, use an environment, request
OIDC, or call npm, OCI, MCP Registry, GitHub Release, attestation, AWS, Google
Cloud, or CDN publication interfaces. The inactive `server.json`, package
publication metadata, future publisher/action pins, and CDN handoffs remain
locally validated stubs for a later owner-approved production plan.

Treat the parsed workflow itself as the publication-policy manifest. Compute a
SHA-256 digest over canonical JSON: recursively sort mapping keys, preserve
sequence order, and exclude YAML comments and mapping presentation order. The
candidate verifier must compare that digest with the reviewed value before it
interprets individual workflow fields. This closed-world check intentionally
rejects every unapproved executable addition, including an otherwise local-only
command. Do not approximate Bash, PowerShell, and `cmd.exe` with a shared lexer;
their distinct quoting, escaping, comment, continuation, and command-resolution
rules make such a scanner both bypassable and prone to rejecting valid syntax.
Update the reviewed digest only together with the workflow change and focused
policy tests.

### Steps

- [ ] Add failing Ajv tests for the exact Registry document and ownership/
      version cross-checks; vendor the versioned schema with its source/license
      note.
- [ ] Add failing SPDX tests for deterministic identity, all bundled
      components, Node runtimes, asset checksums, relationships, and licenses;
      implement one assertion at a time.
- [ ] Add failing release-verifier tests using complete, missing, extra,
      renamed, corrupt, mismatched-version, data-containing, and
      insufficient-SBOM candidate fixtures.
- [ ] Add failing workflow-policy tests before changing the workflow. Parse it
      with `yaml@2.9.0` and require branch/PR-only triggers, read-only
      permissions, the exact four-job dependency graph, three-day artifact
      retention, full-SHA pins for every used action, exact npm bootstrap and
      version assertion before every npm operation, local-only container
      handling, an exact canonical semantic policy-manifest digest, rejection
      of every added or changed executable step, and the absence of every
      prohibited publication construct.
- [ ] Implement each workflow job only after its structural test is red.
- [ ] Exercise the workflow scripts locally against a synthetic development
      candidate; do not create a tag, publish, authenticate to a registry,
      create an attestation or Release, or invoke a cloud write API.
- [ ] Run:

```powershell
npm run mcp:sbom:create
npm run mcp:release:verify -- --tag universal-ontology-mcp-server-v1.0.0 --release-directory dist/releases
npm test -- --runInBand tests/distribution/mcp-registry-server-metadata.test.js tests/distribution/universal-ontology-mcp-spdx-sbom.test.js tests/distribution/universal-ontology-mcp-release-verifier.test.js tests/distribution/universal-ontology-mcp-distribution-workflow.test.js
npm run lint
npm run format:check
```

- [ ] Enter `/review` over Registry metadata, schema fixture, SBOM/verifier,
      workflow, authorized configuration, and tests; resolve P0-P2 findings and
      commit:

```text
fix(distribution): Keep MCP builds in development verification

- replace the tag-triggered publish graph with branch and pull-request
  verification that grants read-only permissions
- retain cross-platform candidates only as three-day GitHub Actions artifacts
  and build the container locally without registry access
- fail workflow-policy tests on npm, OCI, Registry, attestation, GitHub Release,
  or cloud publication commands while retaining inactive future stubs
```

## 20. Task 13: Document development installation and operations

**Files:**

- Create `docs/mcp/local-installation.md`.
- Modify `packages/universal-ontology-mcp-server/README.md`.
- Modify root `README.md`.
- Modify `docs/mcp/local-development.md`.
- Add `tests/distribution/universal-ontology-mcp-documentation.test.js`.

### Required guide content

The canonical guide must cover:

- trust model: the local executable has the user's authority; channel
  manifests are unsigned publisher selection; immutable bytes are protected
  against corruption/substitution after selection by explicit SHA-256;
- network/privacy: only channel/catalog/index GETs reach the fixed artifact
  origin and no user query or result is sent;
- an explicit development-only notice: no public npm package, GHCR image, MCP
  Registry record, GitHub Release, immutable software artifact, or attestation
  exists yet, and none of the reserved public coordinates is an install source;
- prerequisites for a source checkout, locally packed npm tarball, locally
  built/extracted archives, locally built OCI image, and authenticated download
  of an optional three-day GitHub Actions artifact;
- local installation, SHA-256 integrity verification, update, rollback, and
  removal for each development format, plus the current absence of publisher
  identity attestations;
- Codex, Claude Desktop, VS Code, and generic MCP-host `stdio` examples where
  authoritative current syntax is available;
- stable/development semantics, process restart refresh, cache paths/limits,
  cold/warm/offline behavior, safe cache clearing, and corrupt-cache recovery;
- cache security and compatibility: POSIX `0700` directories/`0600` files,
  Windows inherited-ACL expectations for explicit overrides, link rejection,
  the required hard-link capability probe, and safe handling of
  `UNSAFE_CACHE_DIRECTORY` and `UNSUPPORTED_CACHE_FILE_SYSTEM`;
- self-contained archive configuration using its runtime executable plus app
  path;
- local OCI build and execution with stdin, a named cache volume, read-only
  filesystem, dropped capabilities, no-new-privileges, and no port mapping;
- exact `Person` smoke call and expected provenance fields;
- portable stdin-EOF shutdown, POSIX signal handling, the absence of guaranteed
  Windows `SIGTERM`, and the absence of a proprietary MCP shutdown message;
- stdout/stderr troubleshooting, timeout, 401/403, 404, invalid
  manifest/catalog/index, and explicit offline miss;
- Node proxy configuration using `NODE_USE_ENV_PROXY=1`, `HTTP_PROXY`,
  `HTTPS_PROXY`, and `NO_PROXY`; private/system CA configuration using
  `NODE_EXTRA_CA_CERTS`, `NODE_USE_SYSTEM_CA=1`, or `--use-system-ca`; and an
  explanation that Node 24 environment-proxy support is active development and
  only for operator-authorized, trusted proxies, CA environment values are read
  at Node startup, and runtime options precede the archive's application-bundle
  path; plus an explicit warning never to use
  `NODE_TLS_REJECT_UNAUTHORIZED=0`; and
- the complementary WebMCP page-scoped capability versus the installed,
  page-independent MCP server.

The primary Codex development command builds the canonical bundle from the
checkout and registers its absolute path:

```powershell
npm ci --ignore-scripts
npm run mcp:package:build
$serverEntryPath = (Resolve-Path ".\packages\universal-ontology-mcp-server\dist\universal-ontology-mcp-server.mjs").Path
codex mcp add universal_ontology -- node $serverEntryPath
```

The equivalent configuration is:

```toml
[mcp_servers.universal_ontology]
command = "node"
args = ["C:\\absolute\\path\\to\\universal-ontology\\packages\\universal-ontology-mcp-server\\dist\\universal-ontology-mcp-server.mjs"]
startup_timeout_sec = 15
tool_timeout_sec = 30
required = true
enabled_tools = ["search_entities", "resolve_entity"]
default_tools_approval_mode = "writes"
```

Explain that `writes` lets annotated read-only tools run without a write
prompt while requiring approval for any future write-capable tool. Do not
create a user's Codex configuration.

For an extracted locally built Windows archive, show direct runtime/app
arguments; for example, if extracted at
`C:/Tools/UniversalOntologyMcpServer`:

```toml
[mcp_servers.universal_ontology_archive]
command = "C:\\Tools\\UniversalOntologyMcpServer\\runtime\\node.exe"
args = ["C:\\Tools\\UniversalOntologyMcpServer\\app\\universal-ontology-mcp-server.mjs"]
enabled_tools = ["search_entities", "resolve_entity"]
default_tools_approval_mode = "writes"
```

The package README stays concise, labels the package as unpublished
development output, and links the canonical repository guide. The root README
links WebMCP, repository loopback development, and local `stdio` use distinctly.
Replace the obsolete AgentCore-first production summary in
`local-development.md` with a link to the accepted distribution design and
explain that hosted compute remains an optional later adapter, not the chosen
production requirement. Examples MUST NOT use `npx` with the reserved public
package, `docker pull` from GHCR, a GitHub Release URL, or an MCP Registry
installation claim.

### Steps

- [ ] Add failing documentation tests for the development-only publication
      notice; absence of public npm/GHCR/Release/Registry install commands;
      exact package/tag/tool names; version agreement; current Codex keys;
      every local format; archive runtime invocation; security limitations;
      cache paths; no-data promise; hard-link/filesystem and lifecycle guidance;
      every exact proxy/CA variable above; the insecure-TLS prohibition; no
      AWS-hosted-runtime claim; and live local links.
- [ ] Write the canonical guide and concise cross-links. Do not duplicate the
      architecture specification into each README.
- [ ] Run every documented help/version/Inspector/Codex-add command that is
      safe locally against the checkout bundle, packed tarball, or extracted
      native archive. Test config examples through the actual CLI parser where
      possible. Do not resolve a reserved coordinate through a public registry.
- [ ] Run:

```powershell
npm test -- --runInBand tests/distribution/universal-ontology-mcp-documentation.test.js
npm run format:check
```

- [ ] Because this is documentation-only after its executable examples pass,
      create a scoped signed commit without the behavioral review gate:

```text
docs(mcp): Document unpublished local server operation

- explain checkout, local tarball, platform-archive, locked-down local OCI, and
  short-lived Actions-artifact operation for the page-independent stdio server
- document Codex configuration, stable and development channels, persistent
  cache behavior, privacy, offline limits, updates, and removal
- distinguish installed MCP, loopback development, WebMCP, and optional hosted
  compute while making every public publication path explicitly unavailable
```

## 21. Task 14: Complete implementation acceptance without publishing

This task changes no production code unless acceptance reveals a defect. It
does not tag, push, upload, deploy, invalidate, or publish.

### 21.1 Repository checks

- [ ] Run the focused suites from every preceding task.
- [ ] Run the complete current checks:

```powershell
npm test -- --runInBand
npm run lint
npm run format:check
npm run build
npm run mcp:package:build
npm run mcp:package:pack
npm run mcp:sbom:create
npm run mcp:release:verify -- --tag universal-ontology-mcp-server-v1.0.0 --release-directory dist/releases
```

- [ ] Run `npm audit --omit=dev --audit-level=high` and record the registry
      timestamp/result. Review rather than automatically alter any dependency.
- [ ] Run Inspector 2.4.0 against source, the npm tarball install, and the
      current-host platform archive.
- [ ] If Docker is available, run the locked-down container suite. Otherwise,
      require its green native GitHub development-verification job before
      accepting the container candidate.

### 21.2 Golden semantic matrix

Use the deterministic loopback artifact origin first, with every browser page
closed:

| Case                                              | Expected result                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `stable`, empty cache, online                     | Exact current `Person` success and all canonical bytes cached         |
| Same process, repeat call                         | Same result; no manifest/catalog/index body transfer                  |
| Restart, online, 304 manifest                     | Same result; conditional manifest only                                |
| Restart, complete cache, offline                  | Same result from exact last-known-good snapshot                       |
| Restart, selected index removed, offline          | Explicit `QUERY_INDEX_UNAVAILABLE`; no release substitution           |
| `development` with a different compatible catalog | New selected data only after restart; software version remains 1.0.0  |
| Corrupt cached index, online                      | Quarantine exact corrupt file, refetch exact digest, same result      |
| Corrupt cached index, offline                     | Explicit safe failure; no corrupt result                              |
| One of two coalesced callers cancels              | Cancelled caller fails; other caller succeeds                         |
| All coalesced callers cancel                      | Underlying HTTP/cache operation aborts and leaves no partial artifact |
| Unsafe owned cache entry                          | Redacted `UNSAFE_CACHE_DIRECTORY`; no artifact request                |
| Cache location fails hard-link probe              | Redacted `UNSUPPORTED_CACHE_FILE_SYSTEM`; no fallback or request      |
| Process terminated during artifact installation   | Restart removes/reclaims owned remnants and accepts no partial bytes  |

For every successful `Person` call, assert:

- entity IRI
  `https://haddenindustries.com/ontology/universal/core/Person`;
- entity kind `owl_class`;
- preferred label `Person` with language `en`;
- exact authored `skos:definition` lexical form;
- definition language `en-gb`;
- assertion scope `source_artifact_graph`;
- family `universal/core` and version `20260714`;
- source URL
  `https://haddenindustries.com/ontology/universal/core/20260714`;
- source-artifact SHA-256
  `9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228`;
  and
- entity source IRI `urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24`.

State explicitly that this is an asserted lexical definition, not an inferred
OWL logical definition.

### 21.3 Future public-origin release gate

The code implementation may be accepted locally before AWS delivery work is
executed. A public software release may not be created until the separately
approved AWS handoffs have produced and verified:

- correct `application/json` object metadata;
- content-addressed catalogs and indexes retained monotonically;
- stable/development manifests uploaded last;
- mutable versus immutable `Cache-Control` metadata;
- the dedicated query behavior or an explicitly accepted current-behavior
  decision;
- automatic Brotli/Gzip transfer with digest over decoded bytes; and
- the public-origin cold/warm/offline `Person` matrix.

The active development workflow deliberately has neither a tag path nor a
write-capable job and therefore does not contact the not-yet-established
public origin. A future owner-approved production-publication amendment MUST
add a read-only public-origin smoke before its first write-capable job. A
missing `channels/stable.json` must then prevent publication rather than
produce software that cannot serve its default configuration.

### 21.4 Final review and repository state

- [ ] If acceptance required any code/config fix, introduce a failing
      regression test, implement it, run affected/full checks, enter the formal
      `/review` gate, and create a separate signed fix commit.
- [ ] Record `git status --short --branch` and prove every pre-existing
      user-owned modification remains present and unstaged by this work.
- [ ] List all implementation commits and verify each signed commit.
- [ ] Confirm no remote ref changed and no release/tag/package/image/Registry
      write occurred.

## 22. Deferred production-publication operations

These are future owner-operated prerequisites, not actions authorized by this
plan. They require a later explicit design/plan amendment before any workflow
or operator performs them:

1. complete and deploy the separately approved AWS delivery changes;
2. publish and verify `stable` through CloudFront;
3. configure npm trusted publishing and protected GitHub environments;
4. enable immutable GitHub Releases and appropriate tag protection;
5. invoke built-in `/review` over the complete release diff if commits have
   changed since their increment reviews;
6. create and push signed tag
   `universal-ontology-mcp-server-v1.0.0`; and
7. supervise the separately approved production workflow through Registry
   publication.

The implementation agent must stop after local commits and handoff. It must
not perform step 6, push commits, or ask for permission to push.

## 23. Primary implementation references

### MCP and Registry

- [MCP current specification `2026-07-28`](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP versioning and compatibility](https://modelcontextprotocol.io/docs/2026-07-28/learn/versioning)
- [MCP `stdio` transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP tool contract](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP cancellation](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)
- [MCP security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Official JavaScript SDK stdio guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md)
- [MCP Registry quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)
- [MCP Registry GitHub Actions publishing](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx)
- [MCP Registry package types](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx)
- [MCP Publisher command reference](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md)

### Runtime and supply chain

- [Node release lines](https://nodejs.org/en/about/previous-releases)
- [Node 24.20.0 distribution checksums](https://nodejs.org/dist/v24.20.0/SHASUMS256.txt)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm SPDX SBOM command](https://docs.npmjs.com/cli/v12/commands/npm-sbom/)
- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [Docker Official Node image](https://hub.docker.com/_/node)

### Host and artifact delivery

- [Official Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [CloudFront automatic compression](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)
- [CloudFront managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)

## 24. Definition of implementation complete

Implementation is complete only when:

- every behavioral production change was preceded by its focused red test;
- every created/materially changed code path carries the comments required by
  section 3 without comment noise;
- internal names implement the approved semantic vocabulary while public tool
  names/results remain unchanged;
- cold, warm, last-known-good offline, corrupt-cache, cancellation, and
  cross-process behavior pass;
- cache ownership/mode/link checks and the fail-closed no-clobber hard-link
  capability contract pass on every advertised native target;
- source, locally packed npm tarball, five locally built archives, and local
  OCI image all use one canonical bundle and contain no ontology data;
- version, inactive Registry metadata, package, archive, image, checksum, and
  SBOM identities agree locally;
- root metadata, release inputs, lockfile operations, builds, SBOM generation,
  and candidate assembly all agree on npm `12.0.2`;
- the development workflow is branch/PR-only, read-only, retains GitHub Actions
  candidates for three days, and fails policy validation if any public or
  cloud publication path is introduced;
- every non-trivial increment passed its formal review gate and every commit is
  signed;
- unrelated working-tree state is preserved; and
- no commit, tag, package, image, Registry record, or deployment was pushed or
  published by plan execution.
