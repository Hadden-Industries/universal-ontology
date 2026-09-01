# Install the Universal Ontology MCP server locally

The Universal Ontology MCP server is a page-independent, read-only `stdio`
server. An MCP host launches it as a child process; the server opens no inbound
port and performs ontology search, ranking, resolution, and result rendering on
the user's computer.

> **Development-only distribution:** the software built from this repository
> is not a release. There is no public npm package, no public GHCR image, no
> MCP Registry record, no GitHub Release, no immutable software artifact, and
> no publisher signature or attestation. Reserved package, image, Registry,
> and release coordinates are future compatibility contracts, not install
> sources. Build from a trusted checkout or use an authenticated, short-lived
> GitHub Actions artifact as described below.

> **Current data-origin status:** the public stable artifact origin is not yet
> established. The server software can be built and configured now, but an
> uncached query using its default base URL will fail closed with an HTTP `404`.
> Repository-local setup is usable now because it defaults to the generated
> filesystem artifacts under `dist/query/v1`; it does not contact that public
> origin. HTTP mode remains available for development against an explicitly
> selected channel or base URL.

## What crosses the network

The local executable has the same operating-system authority as the MCP host
that launches it. Install only code and candidate artifacts obtained through a
trusted repository identity, and review host configuration before enabling the
server.

The executable contains the query engine but no ontology catalog or index. It
composes exactly one query-artifact repository selected at process launch:

- `file-system` reads a generated `catalog.json` and its content-addressed
  release indexes from an operator-selected local root. It performs no ontology
  artifact network request.
- `http` makes HTTPS `GET` requests for the selected channel manifest, its
  content-addressed catalog, and only the content-addressed release indexes
  needed by the query. Verified immutable bytes are retained in a private local
  cache.

Query text, entity identifiers, labels, definitions, and tool results remain
local in both modes and are not sent to the artifact origin. In HTTP mode,
request paths and timing can still reveal the selected channel and retrieved
artifact, so an operator-controlled proxy remains part of the privacy boundary.
The standalone executable defaults to `http` and `stable`, because a distributed
installation cannot assume a checkout-local artifact tree. The repository setup
command explicitly defaults its generated host entries to `file-system` and
`dist/query/v1`.

Channel manifests are unsigned publisher selections. Each manifest selects a
catalog by byte length and SHA-256, and each catalog selects release indexes by
the same properties. Verification therefore rejects corruption or substitution
after selection; it does not establish who made the channel selection. HTTPS
authenticates the configured origin under the operator's CA trust policy.

## Requirements

- A trusted checkout of this repository and Git.
- Python 3.11 or later in the checkout's `.venv` when using the repository-local
  installation command below. The script itself uses only the standard library
  and the repository's shared command/repository helpers.
- Node.js 24 or later for the source-checkout and local npm-tarball forms. The
  self-contained archives carry the pinned Node.js 24.20.0 runtime.
- npm using the repository lockfile. Every command below explicitly selects and
  checks npm 12.0.2; the `packageManager` field alone does not switch npm.
- An MCP host that can launch a local `stdio` command.
- HTTPS access to the configured ontology-artifact origin for a cold HTTP-mode
  query; filesystem mode needs no ontology-artifact network access.
- Docker or a compatible OCI runtime only for the locally built OCI form.
- An authenticated GitHub account with repository read access, plus GitHub CLI,
  only when retrieving a short-lived GitHub Actions artifact.

Choose one software form. All forms execute the same canonical application
bundle and can read the same independently changing ontology data from either
an explicitly selected filesystem tree or the HTTP repository:

| Development form               | Runtime supplied by              | Persistent files you manage                         |
| ------------------------------ | -------------------------------- | --------------------------------------------------- |
| Source checkout                | System Node.js                   | Checkout plus the operating-system cache            |
| Locally packed npm tarball     | System Node.js                   | Local installation directory plus cache             |
| Locally built platform archive | Self-contained pinned Node.js    | Extracted archive plus cache                        |
| Locally built OCI image        | Image                            | Local image plus named cache volume                 |
| GitHub Actions artifact        | Selected archive or tarball form | Downloaded three-day candidate, installation, cache |

## Install both repository-local MCP servers

Contributors who want this checkout to supply its MCP servers to supported
project-scoped hosts can run the hardened, rerunnable installation command from
the repository root:

```powershell
.\.venv\Scripts\python.exe .\scripts\set_up_mcp_servers.py
```

On Linux or macOS, use the checkout's corresponding virtual-environment
interpreter:

```sh
./.venv/bin/python ./scripts/set_up_mcp_servers.py
```

The command installs two distinct local programs:

- `github` is the official GitHub MCP Server executable for the current
  operating system and architecture. The latest GitHub release is resolved on
  every run; its selected archive is bounded, checked against the release's
  single SHA-256 manifest, and constrained to one regular executable member.
- `universal_ontology` is this checkout's canonical single-file MCP application
  bundle. The command selects the npm version declared by `packageManager`, runs
  `npm ci --ignore-scripts`, builds the bundle, and—under the default filesystem
  source—runs the existing authoritative `npm run mcp:index` generator. Setup
  checks the bundle's byte length, SHA-256 digest, package identity, and package
  version against generated build metadata. It then requires the copied staging
  file's byte length and SHA-256 digest to match that validated snapshot before
  writing the installation record, so a concurrent canonical-bundle replacement
  cannot make the record describe different bytes.

Before changing active files, setup verifies the staged GitHub executable with
`--version` and connects to the staged Universal Ontology bundle with the
official MCP v2 client pinned to protocol version `2026-07-28`. That protocol
probe requires the exact `universal-ontology` server identity and exactly
`search_entities` and `resolve_entity`. It then calls `search_entities` for
`Person` in the latest stable `universal/core` release and requires the expected
Universal Ontology entity IRI before activation. Filesystem verification reads
the newly generated `dist/query/v1` tree. HTTP verification uses the selected
remote source and a unique operating-system-temporary `--cache-directory`, then
closes the MCP process and removes that cache. Verification therefore tests the
actual selected data path without depending on or mutating the developer's
persistent HTTP runtime cache. If the authoritative verifier exits non-zero,
setup reports its bounded, control-character-sanitized stderr diagnostic instead
of replacing it with a generic subprocess failure.

Only after both staged programs pass does the command publish the per-file
atomic replacements as one rollback-capable transaction. Rendering retains the
byte-exact presence and contents of every host document. Activation checks those
optimistic-concurrency preconditions before preparing replacements and again
immediately before the first live replacement, then rechecks each host document
at its own replacement boundary. For an existing host document, the operating
system atomically retains the exact file displaced by publication: Windows uses
`ReplaceFileW` with a backup path, Linux uses
`renameat2(RENAME_EXCHANGE)`, and macOS uses `renamex_np(RENAME_SWAP)`. Setup
compares that displaced file with the render-time bytes before committing the
wider transaction. For a host document that was absent when rendered, a
same-directory hard link publishes the staged regular file only if the
destination name is still absent. If a user or host edited or created a document
while setup was downloading, building, or activating earlier files, setup
restores or preserves those exact bytes, rolls back its preceding replacements,
and asks you to rerun against the current document. An unsupported native
exchange or no-clobber filesystem operation fails closed.

For an existing generated program or installation record, setup first creates
and synchronizes a sibling activation backup without moving the live path. It
then performs one replace-over-destination operation, so an observer never sees
a missing path between backup and replacement. Existing host documents instead
use the native displaced-file operation above, which also keeps the destination
continuously present. An ordinary later failure atomically restores every
preceding program, installation record, and host document from the applicable
copy or displaced file. If the operating system also prevents rollback, setup
retains the exact recovery file and reports its path instead of deleting the only
remaining copy.

Before rollback restores or removes an already replaced destination, setup
recomputes the live regular file's byte length, SHA-256 digest, and complete
file-permission bits and compares them with the replacement state it published.
If another process changed, removed, or replaced that destination with a
non-regular filesystem object, rollback preserves the concurrent state instead
of overwriting it. Any preceding synchronized backup or atomically displaced
file is retained as an exact recovery copy, and setup reports both the
conflicted destination and recovery path.

Matching bytes are not sufficient to skip a program replacement on POSIX: the
installed and staged execution-permission bits must also match, so setup repairs
an executable whose contents are intact but whose execute permission was lost.

On Windows, a running executable may deny replacement. That failure leaves the
existing path and bytes active; stop the MCP host and rerun setup. If a scanner
or another process instead denies cleanup of an inactive superseded backup after
a committed replacement, setup reports the exact path as deferred cleanup but
does not retroactively fail the activation.

An operating-system file lock under `.agent-tools/` permits only one setup
process to enter that transaction at a time; the kernel releases the lock after
a normal exit or crash, so the persistent lock file is not a stale-lock
sentinel.

Generated software and digest-bound installation records live under the
Git-ignored `.agent-tools/` root:

```text
.agent-tools/
├── .set_up_mcp_servers.lock
├── bin/
│   ├── github-mcp-server[.exe]
│   └── universal-ontology-mcp-server.mjs
├── github-mcp-server/installation.json
└── universal-ontology-mcp-server/installation.json
```

The installation command then manages these portable, project-scoped host
entries:

| Path                      | Scope and ownership                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.mcp.json`               | Checked-in Claude Code project configuration using its top-level `mcpServers` document.                                  |
| `.codex/config.toml`      | Checked-in Codex project configuration; only marker-delimited `github` and `universal_ontology` tables are script-owned. |
| `.agents/mcp_config.json` | Git-ignored, machine-local Antigravity configuration; it may contain unrelated local entries that setup preserves.       |

The root `.agent-tools/` ignore rule is anchored to this checkout, so it does not
hide a same-named directory nested in a package. Same-directory staged and
activation-backup files for all three host documents have narrowly scoped ignore
rules as well. Those artifacts can contain a complete machine-local
`.agents/mcp_config.json`, including preserved credentials; a crash or a
reported rollback failure therefore cannot make such a copy eligible for an
accidental `git add -A`. Setup creates each randomized transaction file empty,
requires Git to ignore that exact repository-contained path, and only then
writes or copies potentially sensitive host-configuration bytes into it.

Each launch entry runs a small Node bootstrap that asks Git for the checkout's
top-level directory, changes the child process to that directory, and imports
the exact repository-relative server entry point. Moving the checkout therefore
does not embed an old absolute path, and starting an MCP host from a nested
repository directory does not reinterpret the paths beneath that directory.
Git remains a runtime prerequisite for these repository-local entries. The
Universal Ontology entry explicitly selects the filesystem repository at
`dist/query/v1` by default. The query data remains outside `.agent-tools` and is
not bundled into the installed application. The setup command regenerates it
before it verifies and activates the server.

The GitHub configuration writes no credential. When
`GITHUB_PERSONAL_ACCESS_TOKEN` is absent, the GitHub MCP Server can begin its
browser-based OAuth flow when authorization is first required. If that variable
is already present, its value takes precedence; setup reports only the variable
name and never prints or persists the token.

### Select the repository-local query-artifact source

The no-argument setup command is equivalent to selecting the filesystem source:

```powershell
.\.venv\Scripts\python.exe .\scripts\set_up_mcp_servers.py --universal-ontology-query-artifact-source=file-system
```

It runs `npm run mcp:index`, verifies a real query against `dist/query/v1`, and
renders these application arguments into all three supported host documents:

```text
--query-artifact-source=file-system
--query-artifact-root-directory=dist/query/v1
```

The repository-rooting bootstrap resolves that relative directory after changing
the MCP child process to the checkout root. A user does not need to start
`npm run mcp:serve`, keep a terminal open, or prefill an HTTP cache.

To exercise the HTTP artifact repository instead, rerun setup with the explicit
source selector:

```powershell
.\.venv\Scripts\python.exe .\scripts\set_up_mcp_servers.py `
  --universal-ontology-query-artifact-source=http `
  --universal-ontology-query-artifact-channel=development
```

When the channel should come from a noncanonical origin, add an operator-approved
absolute HTTPS URL ending in `/`:

```powershell
.\.venv\Scripts\python.exe .\scripts\set_up_mcp_servers.py `
  --universal-ontology-query-artifact-source=http `
  --universal-ontology-query-artifact-channel=development `
  --universal-ontology-query-artifact-base-url=https://artifacts.example.test/ontology/query/v1/
```

If the channel is omitted in HTTP mode, repository setup selects `development`.
The MCP server—not the Python setup script—authoritatively validates the URL and
all query-artifact documents during the pre-activation `Person` query. Because
the canonical public origin is not complete yet, selecting it is expected to
fail closed before any host configuration or installed program is activated.

Rerun the first command to switch back to local artifacts. Source changes affect
new child processes only, so restart or reload the MCP host after setup succeeds.
The read-only drift check accepts the same source, channel, and base-URL options;
pass the selectors matching the configuration you intend to check.

To check the checked-in host documents without downloading, building,
installing, launching, or writing anything, run:

```powershell
.\.venv\Scripts\python.exe .\scripts\set_up_mcp_servers.py --check
```

The check intentionally excludes `.agents/mcp_config.json` because that file is
local and may contain credentials or machine-specific servers. Rerun the normal
command after pulling software changes or when updating the GitHub MCP Server.
Reload the MCP-capable host after a successful run.

This command creates no Universal Ontology GitHub Release, npm publication,
container publication, MCP Registry record, AWS or Google Cloud resource, CDN
object, or remote MCP deployment. GitHub remains only the source of the official
GitHub MCP Server dependency and, elsewhere in this guide, the permitted
short-lived development-candidate store.

## Build and run from a source checkout

From the repository root, install exactly the locked dependency graph without
running dependency lifecycle scripts, then build the canonical single-file
bundle:

```powershell
$selectedNpmVersion = npx --yes npm@12.0.2 --version
if ($selectedNpmVersion -cne "12.0.2") { throw "Expected npm 12.0.2." }
npx --yes npm@12.0.2 ci --ignore-scripts
npx --yes npm@12.0.2 run mcp:package:build
$serverEntryPath = (Resolve-Path ".\packages\universal-ontology-mcp-server\dist\universal-ontology-mcp-server.mjs").Path
node $serverEntryPath --version
node $serverEntryPath --help
```

The expected version is `1.0.0`. Use the absolute value of
`$serverEntryPath` in the host configuration. A later checkout update is not
visible to a running host: rebuild, restart the host, and repeat the acceptance
query. For rollback, check out the previously accepted commit, rebuild it, and
restart. The content-addressed cache can normally be retained across a software
rollback.

## Install a locally packed npm tarball

This is a local package-file workflow. It does not contact an npm package
registry for the Universal Ontology package:

```powershell
npx --yes npm@12.0.2 ci --ignore-scripts
New-Item -ItemType Directory -Path ".\dist\releases" -Force | Out-Null
npx --yes npm@12.0.2 run mcp:package:pack
$packageArchivePath = (Resolve-Path ".\dist\releases\universal-ontology-mcp-server-1.0.0.tgz").Path
$installationRoot = Join-Path $PWD ".local-mcp-installation"
npx --yes npm@12.0.2 install --prefix $installationRoot --ignore-scripts --omit=dev $packageArchivePath
$serverEntryPath = Join-Path $installationRoot "node_modules\universal-ontology-mcp-server\dist\universal-ontology-mcp-server.mjs"
node $serverEntryPath --version
```

Point the MCP host at `node` plus the absolute installed entry path, not a
package coordinate. To update or roll back, stop the host and install a locally
built tarball from the chosen source revision into a new installation
directory; switch the absolute host path only after its help/version checks
pass. Removing that directory uninstalls this form.

For a locally created tarball, record its digest next to the source commit:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath $packageArchivePath
```

That digest detects subsequent byte changes but does not add a publisher
identity.

## Build a self-contained platform archive

The archive builder downloads the exact Node.js runtime declared in
`scripts/distribution/universalOntologyMcpReleaseInputs.json`, bounds its size,
and verifies its pinned upstream SHA-256 before creating an archive. Select one
of `windows-x64`, `linux-x64`, `linux-arm64`, `macos-x64`, or `macos-arm64`:

```powershell
npx --yes npm@12.0.2 ci --ignore-scripts
npx --yes npm@12.0.2 run mcp:package:build
npx --yes npm@12.0.2 run mcp:archives:build -- --target=windows-x64
Get-FileHash -Algorithm SHA256 -LiteralPath ".\dist\releases\universal-ontology-mcp-server-v1.0.0-windows-x64.zip"
```

Extract the archive into a version-specific directory without overlaying a
previous version. The inner archive root contains the following executable
pair:

```text
runtime/node.exe                         # Windows
runtime/bin/node                         # Linux and macOS
app/universal-ontology-mcp-server.mjs   # All targets
```

For example, after placing the inner Windows archive contents at
`C:\Tools\UniversalOntologyMcpServer`, verify them directly:

```powershell
$runtimePath = "C:\Tools\UniversalOntologyMcpServer\runtime\node.exe"
$applicationPath = "C:\Tools\UniversalOntologyMcpServer\app\universal-ontology-mcp-server.mjs"
& $runtimePath --version
& $runtimePath $applicationPath --version
& $runtimePath $applicationPath --help
```

Node runtime options must precede the application-bundle path. For example,
use `& $runtimePath --use-system-ca $applicationPath --version`, not an option
after `$applicationPath`. Update and rollback by extracting side-by-side
versioned directories, verifying the selected pair, then changing the host's
absolute paths and restarting it. Delete an unused extracted directory only
after no host references it.

## Build and run a local OCI image

The image is local development output. Build it from the checkout and do not
assign or resolve a remote registry name:

```powershell
npx --yes npm@12.0.2 ci --ignore-scripts
npx --yes npm@12.0.2 run mcp:package:build
docker build --tag universal-ontology-mcp-server:development packages/universal-ontology-mcp-server
docker volume create universal-ontology-mcp-cache
docker run --rm --interactive --read-only --cap-drop=ALL --security-opt=no-new-privileges --mount type=volume,source=universal-ontology-mcp-cache,target=/home/node/.cache/universal-ontology-mcp-server/v1 universal-ontology-mcp-server:development
```

`--interactive` preserves stdin for MCP frames. The named volume is the only
expected writable path; the root filesystem is read-only, Linux capabilities
are dropped, and privilege escalation is disabled. There is deliberately no
port mapping because the process uses `stdio`. HTTP-mode queries require
outbound HTTPS access to the data origin, so do not add `--network=none` in that
mode. A filesystem source requires a separately mounted read-only artifact tree
and matching source/root arguments. The verification workflow uses an isolated
network for its data-free software checks; its deterministic query checks supply
their own test artifacts.

An MCP host can use `docker` as the command and the complete sequence from
`run` through the local image name as its arguments. Keep `--rm` so a stopped
host does not leave containers, and keep the named volume if warm/offline
behavior is desired. To update, rebuild under a commit-specific local tag,
smoke it, then change the host argument. Remove unused images with
`docker image rm` and remove the cache, only if desired, with
`docker volume rm universal-ontology-mcp-cache` after every referencing
container has stopped.

## Use a short-lived GitHub Actions artifact

The read-only development workflow may retain a complete candidate as a
GitHub Actions artifact for three days. It is authenticated repository output,
not a GitHub Release and not an immutable release artifact. Identify an
accepted workflow run and its exact SHA-256-suffixed candidate artifact, then
download it while signed in with repository read access:

```powershell
gh run list --repo hadden-industries/universal-ontology --workflow verify-universal-ontology-mcp-distribution.yml
$artifactName = "universal-ontology-mcp-server-development-candidate-<64-lowercase-hex-digest>"
gh run download RUN_ID --repo hadden-industries/universal-ontology -n $artifactName --dir .\downloaded-mcp-candidate
```

The candidate includes `SHA256SUMS`. Verify every listed subject before using
the local npm tarball or extracting the platform archive:

```powershell
$candidateDirectory = (Resolve-Path ".\downloaded-mcp-candidate").Path
$checksumManifestPath = Join-Path $candidateDirectory "SHA256SUMS"
$selectedPayloadName = "universal-ontology-mcp-server-v1.0.0-windows-x64.zip" # Replace with the exact payload you will execute.

# The Actions artifact name commits to the exact SHA256SUMS bytes. Capture the
# expected digest before later regular-expression matches replace $Matches.
if ($artifactName -notmatch '^universal-ontology-mcp-server-development-candidate-(?<candidateSha256>[0-9a-f]{64})$') {
    throw "The Actions artifact name does not contain a valid candidate identity."
}
$expectedChecksumManifestSha256 = $Matches.candidateSha256
$actualChecksumManifestSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $checksumManifestPath).Hash.ToLowerInvariant()
if ($actualChecksumManifestSha256 -cne $expectedChecksumManifestSha256) {
    throw "SHA256SUMS does not match the digest in the Actions artifact name."
}

$checksumRecords = @(
    foreach ($checksumRecordLine in Get-Content -LiteralPath $checksumManifestPath) {
        if ($checksumRecordLine -notmatch '^(?<sha256>[0-9a-f]{64})  (?<name>.+)$') {
            throw "Invalid SHA256SUMS record."
        }
        [PSCustomObject]@{
            ExpectedSha256 = $Matches.sha256
            Name = $Matches.name
        }
    }
)
if ($checksumRecords.Count -eq 0) {
    throw "SHA256SUMS contains no candidate subjects."
}

foreach ($checksumRecord in $checksumRecords) {
    # Candidate subjects are flat release files. Reject path-bearing records
    # before joining them to the trusted download directory.
    if ($checksumRecord.Name -match '[/\\]' -or $checksumRecord.Name -in @('.', '..')) {
        throw "Invalid SHA256SUMS record."
    }

    $subjectPath = Join-Path $candidateDirectory $checksumRecord.Name
    $actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $subjectPath).Hash.ToLowerInvariant()
    if ($actualSha256 -cne $checksumRecord.ExpectedSha256) {
        throw "Candidate subject failed SHA-256 verification."
    }
}

$selectedPayloadRecords = @(
    $checksumRecords | Where-Object { $_.Name -ceq $selectedPayloadName }
)
if ($selectedPayloadRecords.Count -ne 1) {
    throw "The selected payload must occur exactly once in SHA256SUMS."
}
```

The artifact-name comparison binds the downloaded manifest to the selected
GitHub Actions artifact, while the per-subject checks bind the selected payload
to that manifest. These checksums detect corruption and substitution, but they
do not authenticate the publisher. No publisher signature or attestation
accompanies a development candidate. Preserve the workflow run identity,
source commit, artifact name, and verified checksum manifest in local test
records. Because Actions retention is three days, do not depend on it as a
rollback store; retain a trusted source commit or locally verified candidate.

## Configure an MCP host

Every example below uses an absolute source-checkout bundle path. Substitute
the locally installed tarball path, the archive runtime/application pair, or a
locked-down local container invocation as appropriate. These examples are
manual alternatives to the repository-local installation command above. That
command manages only this checkout's `.mcp.json`, `.codex/config.toml`, and
Git-ignored `.agents/mcp_config.json`; it does not modify a user-profile MCP
configuration.

The server exposes exactly two read-only tools:

1. `search_entities` searches authored labels, identifiers, IRI local names,
   and lexical definitions.
2. `resolve_entity` resolves an exact IRI, UUID URN, or preferred label and
   reports `found`, `ambiguous`, or `not_found` without guessing.

### Codex

Build the bundle and let the Codex CLI record its absolute entry path:

```powershell
npx --yes npm@12.0.2 ci --ignore-scripts
npx --yes npm@12.0.2 run mcp:package:build
$serverEntryPath = (Resolve-Path ".\packages\universal-ontology-mcp-server\dist\universal-ontology-mcp-server.mjs").Path
codex mcp add universal_ontology -- node $serverEntryPath
```

The equivalent manual configuration is:

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

`default_tools_approval_mode = "writes"` allows correctly annotated read-only
tools to run without a write approval while ensuring that any future
write-capable tool requires approval. Inspect the registered entry with
`codex mcp get universal_ontology`, and remove it with
`codex mcp remove universal_ontology` before deleting its executable.

For the extracted Windows archive, the runtime is the command and the
application is its first argument:

```toml
[mcp_servers.universal_ontology_archive]
command = "C:\\Tools\\UniversalOntologyMcpServer\\runtime\\node.exe"
args = ["C:\\Tools\\UniversalOntologyMcpServer\\app\\universal-ontology-mcp-server.mjs"]
enabled_tools = ["search_entities", "resolve_entity"]
default_tools_approval_mode = "writes"
```

### Claude Desktop

Open Claude Desktop's developer configuration UI and edit its MCP configuration
manually. On current desktop clients the document has a top-level
`"mcpServers"` object:

```json
{
  "mcpServers": {
    "universal_ontology": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\universal-ontology\\packages\\universal-ontology-mcp-server\\dist\\universal-ontology-mcp-server.mjs"
      ]
    }
  }
}
```

Fully quit and restart Claude Desktop after changing the file. This repository
does not currently produce an MCP Bundle (`.mcpb`), so the configuration above
is an explicit development installation rather than a one-click extension.

### Visual Studio Code

VS Code accepts local MCP servers in a user-profile configuration or a
workspace `.vscode/mcp.json`. Do not commit a machine-specific absolute path.
The current schema uses a top-level `"servers"` object:

```json
{
  "servers": {
    "universal_ontology": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\universal-ontology\\packages\\universal-ontology-mcp-server\\dist\\universal-ontology-mcp-server.mjs"
      ]
    }
  }
}
```

Start or restart that server from VS Code's MCP server controls after updating
the bundle or configuration.

### Generic stdio host

A generic stdio host needs an executable plus an argument array and must keep
stdin/stdout connected for the process lifetime:

```json
{
  "name": "universal_ontology",
  "transport": "stdio",
  "command": "node",
  "args": [
    "C:\\absolute\\path\\to\\universal-ontology\\packages\\universal-ontology-mcp-server\\dist\\universal-ontology-mcp-server.mjs"
  ],
  "enabledTools": ["search_entities", "resolve_entity"]
}
```

Field names outside `command` and `args` vary by host; use that host's current
documentation. Never put a logging wrapper between the host and stdout unless
it preserves MCP frames exactly.

## Select a query-artifact source

The standalone application defaults to the HTTP repository. Make that selection
explicit in long-lived host configuration so its data boundary remains obvious:

```toml
[mcp_servers.universal_ontology]
command = "node"
args = [
  "C:\\absolute\\path\\to\\universal-ontology-mcp-server.mjs",
  "--query-artifact-source=http",
]
```

To read artifacts generated by `npm run mcp:index` directly, select the
filesystem repository and its root directory:

```toml
[mcp_servers.universal_ontology]
command = "node"
args = [
  "C:\\absolute\\path\\to\\universal-ontology-mcp-server.mjs",
  "--query-artifact-source=file-system",
  "--query-artifact-root-directory=C:\\absolute\\path\\to\\universal-ontology\\dist\\query\\v1",
]
```

The equivalent environment variables are
`UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_SOURCE=file-system` and
`UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_ROOT_DIRECTORY`. A CLI value takes
precedence. Relative root-directory values resolve from the server process's
working directory; use an absolute path unless a host bootstrap deliberately
establishes that directory. The server rejects HTTP-only channel, base-URL, and
cache options under the filesystem source, and rejects a filesystem root under
the HTTP source, rather than silently ignoring a contradictory setting.

## Select an HTTP data channel

HTTP mode defaults to `stable`. It is intended for ontology data accepted for
normal use. `development` is explicit opt-in for rapidly changing query
artifacts and may change without a software rebuild:

```toml
[mcp_servers.universal_ontology]
command = "node"
args = [
  "C:\\absolute\\path\\to\\universal-ontology-mcp-server.mjs",
  "--query-artifact-source=http",
  "--artifact-channel",
  "development",
]
```

The equivalent environment variable is
`UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL=development`; a CLI value takes
precedence. A server process pins one fully verified channel/catalog snapshot.
Restart the MCP process to observe a later channel promotion. Switching channel
never silently substitutes a release missing from the selected catalog.

Use `--artifact-base-url` or
`UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL` only for an operator-approved,
absolute HTTPS base URL ending in `/`. Embedded credentials, query strings, and
fragments are rejected. Plain HTTP is available only for an explicitly enabled
loopback development fixture.

## HTTP persistent cache and offline behavior

The default maximum persistent cache size is 512 MiB (`536870912` bytes).
Override it with `--cache-maximum-bytes` or
`UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES`. Default paths are:

| Platform                      | Default cache root                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Windows                       | `%LOCALAPPDATA%\UniversalOntology\McpServer\Cache\v1` (falling back to the profile's `AppData\Local`)         |
| macOS                         | `~/Library/Caches/io.hadden-industries.universal-ontology-mcp-server/v1`                                      |
| Linux and other POSIX systems | `$XDG_CACHE_HOME/universal-ontology-mcp-server/v1`, or `~/.cache/universal-ontology-mcp-server/v1` when unset |

These cache settings apply only to the HTTP repository. The filesystem
repository validates and reads the selected local tree without copying it into
the HTTP cache. An absolute HTTP-cache override can be supplied with
`--cache-directory` or
`UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY`.

- **Cold start:** cache initialization runs locally; the first ontology query
  retrieves and verifies the channel manifest, catalog, and required indexes.
- **Warm start:** verified immutable bytes are reused. The server conditionally
  checks the mutable channel manifest when online and can retain the exact
  last-known-good snapshot.
- **Offline:** a complete last-known-good snapshot and every index required by
  the query continue to work. An absent or corrupt required byte sequence
  returns an explicit `QUERY_INDEX_CATALOG_UNAVAILABLE` or
  `QUERY_INDEX_UNAVAILABLE`; it never selects a nearby release.

The cache is a private integrity boundary:

- On POSIX, owned directories are restricted to mode `0700` and files to
  `0600`; group/other-writable entries fail closed.
- Symbolic links and other unexpected object types are rejected throughout
  managed paths. The installer does not follow a symbolic link to a cache
  object.
- Startup performs a hard-link capability probe, including no-clobber collision
  behavior, before trusting the filesystem's atomic publication primitive.
- On Windows, an explicit override must be inside a private directory whose
  inherited ACL grants access only to the intended operator and trusted system
  principals. The process relies on those inherited ACLs; do not select a
  shared, removable, or broadly writable directory.
- `UNSAFE_CACHE_DIRECTORY` means an ownership, mode, link, containment, object-
  type, cleanup, or usability invariant failed. `UNSUPPORTED_CACHE_FILE_SYSTEM`
  means the filesystem did not provide the required hard-link semantics. Do
  not bypass either failure or move the cache to a weaker shared filesystem.

To clear the cache safely, stop every MCP host using it, confirm the exact
absolute cache root, remove only that versioned root, and restart. Never delete
cache files while the server is running. Online corrupt bytes are quarantined
and refetched by exact digest; if repeated integrity failures persist, stop the
host, preserve diagnostics, clear the exact root, and investigate the origin or
proxy before retrying. Offline corruption correctly remains a safe failure.

## Proxy and private-CA configuration

Node.js 24 can use operator-supplied proxy environment variables when
`NODE_USE_ENV_PROXY=1` (or the Node runtime option `--use-env-proxy`) is set.
It reads `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` at process startup. This
Node 24 environment-proxy facility is marked active development: enable it only
for an operator-authorized, trusted proxy, and include the artifact hostname in
`NO_PROXY` when it must bypass interception.

For private CA roots, use one of:

- `NODE_EXTRA_CA_CERTS=C:\absolute\path\to\trusted-ca-bundle.pem`;
- `NODE_USE_SYSTEM_CA=1`; or
- the Node runtime option `--use-system-ca` before the application path.

CA environment values are read only when the Node process starts, so restart
the MCP host after changing them. Archive invocations must put Node runtime
options before `app/universal-ontology-mcp-server.mjs`. Never set
`NODE_TLS_REJECT_UNAUTHORIZED=0`; disabling certificate validation destroys
the HTTPS origin-authentication boundary.

## Shutdown and process I/O

Normal MCP frames are written only to stdout. Bounded, redacted operational
events are JSON lines on stderr. Query text, ontology-authored strings, source
IRIs, response bodies, local paths, and stack traces are excluded from those
events.

Portable graceful shutdown is stdin EOF: the host closes the child's stdin and
the server aborts lifecycle work, closes the stdio server once, and allows up
to ten seconds for closure. On POSIX, `SIGINT` and `SIGTERM` use the same path.
Windows registers `SIGINT`; Windows process signaling does not guarantee a
portable `SIGTERM`, so hosts should close stdin rather than depend on that
signal. There is no proprietary MCP shutdown message. Do not send an invented
request after closing the protocol session.

## Verify the `Person` definition

The default repository-local setup performs this acceptance query through the
official MCP client before it activates any generated program or host document.
After restarting the host, repeat it through the agent to prove host discovery
and launch as well as server behavior. Do not treat a successful build,
`--help`, or `--version` check as equivalent query evidence.

Default-origin **HTTP** host acceptance remains deferred until a complete stable
artifact origin is established. The filesystem setup does not depend on that
origin.

For an independent HTTP-adapter check, verify the actual locally packed server
against the repository's deterministic loopback artifact origin. This test
fresh-installs the tarball, starts an ephemeral origin on `127.0.0.1`, passes
the explicit HTTP source, `--artifact-base-url`, and
`--allow-insecure-loopback-artifact-origin`, performs the `Person` MCP call, and
removes the fixture afterward:

```powershell
npx --yes npm@12.0.2 test -- --runInBand tests/distribution/universal-ontology-mcp-npm-package.test.js
```

Once an operator-approved HTTPS base URL serves a complete `stable` channel,
configure it explicitly with `--artifact-base-url`, restart the host, close every
browser page, and ask:

```text
Find the definition of Person in the Universal Ontology and cite the ontology release and source IRI.
```

The host should call `search_entities` with the equivalent structured input:

```json
{
  "queryText": "Person",
  "ontologyReleaseSelection": {
    "selectionKind": "latest_stable_releases",
    "ontologyArtifactFamilyIds": ["universal/core"]
  },
  "preferredLanguageTags": ["en-GB", "en"],
  "maximumResultCount": 10
}
```

The deterministic fixture's acceptance record—and the record required of the
future stable channel—is:

| Field                   | Expected value                                                     |
| ----------------------- | ------------------------------------------------------------------ |
| Entity IRI              | `https://haddenindustries.com/ontology/universal/core/Person`      |
| Entity kind             | `owl_class`                                                        |
| Preferred label         | `Person` (`en`)                                                    |
| Definition property     | `http://www.w3.org/2004/02/skos/core#definition`                   |
| Definition language     | `en-gb`                                                            |
| Assertion scope         | `source_artifact_graph`                                            |
| Artifact family         | `universal/core`                                                   |
| Immutable release       | `20260714`                                                         |
| Source-artifact URL     | `https://haddenindustries.com/ontology/universal/core/20260714`    |
| Source-artifact SHA-256 | `9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228` |
| Entity source IRI       | `urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24`                      |

The exact English (Great Britain) lexical form is:

> Entity, i.e. a natural or legal person, recognised by law as having legal
> rights and duties, able to make commitment(s), assume and fulfil resulting
> obligation(s), and able to be held accountable for its action(s)

Describe this as an **asserted lexical definition** in the selected
`source_artifact_graph`, not an inferred OWL definition or logical class
expression. The entity's `dcterms:source` IRI is a separate assertion about the
entity description; it does not alone prove the provenance of the individual
definition assertion.

## Troubleshooting

| Symptom                                       | Meaning and action                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host reports invalid JSON or framing          | A wrapper probably wrote diagnostics to stdout. Launch the bundle directly; leave stdout exclusively to MCP and inspect stderr.                                                                               |
| Startup timeout                               | Cache safety checks or cold startup exceeded the host allowance. Inspect stderr and use a bounded host `startup_timeout_sec`; do not disable checks.                                                          |
| Tool timeout                                  | An authorized proxy, DNS, TLS, or origin request may be slow. Inspect safe stderr events and set a bounded `tool_timeout_sec`; do not retry in a tight loop.                                                  |
| HTTP `401` or `403` from the artifact origin  | A future public data path should need no credentials. Check the exact base URL, proxy authorization, corporate interception, and origin policy. Never put credentials in the URL.                             |
| HTTP `404` or `410`                           | The exact channel, catalog, or index object is absent. Confirm the base URL and channel; do not substitute a similarly named release.                                                                         |
| Invalid channel manifest or catalog           | Schema, size, UTF-8, digest, or embedded identity validation failed. Preserve stderr diagnostics and investigate publication; do not edit cached JSON.                                                        |
| Invalid or digest-mismatched release index    | Treat the exact object or proxy response as corrupt. Online operation may quarantine/refetch it; offline operation must fail.                                                                                 |
| Explicit offline miss                         | `QUERY_INDEX_CATALOG_UNAVAILABLE` or `QUERY_INDEX_UNAVAILABLE` means the exact last-known-good bytes are incomplete. Reconnect to the trusted origin or restore a previously verified cache.                  |
| `UNSAFE_CACHE_DIRECTORY`                      | Stop and correct ownership, permissions, links, object types, or the absolute cache location. Do not weaken the invariant.                                                                                    |
| `UNSUPPORTED_CACHE_FILE_SYSTEM`               | Move the cache to a private local filesystem with the probed no-clobber hard-link behavior. Network and removable filesystems are unsuitable.                                                                 |
| Legacy Codex table cannot be safely rewritten | `tomllib` found an obsolete server under a valid but noncanonical TOML spelling. Remove it, or rewrite its header exactly as setup reports, then rerun; setup deliberately does not approximate TOML parsing. |
| Result still uses an older channel snapshot   | Restart the MCP process. A running process intentionally pins one verified snapshot.                                                                                                                          |
| Shutdown exits non-zero                       | Closure failed or exceeded ten seconds. Inspect the redacted stderr lifecycle event and let the host terminate the child; no cache-integrity bypass is needed.                                                |

## Remove the development installation

1. Remove or disable the MCP-host entry and stop every running server process.
2. Delete only the selected checkout build, local npm installation directory,
   extracted archive, or local OCI image.
3. Retain the cache for rollback, or delete its exact versioned root after all
   users stop. For OCI, remove the named volume separately if its cached data is
   no longer required.
4. Remove downloaded Actions candidates when their local evidence is no longer
   needed.

The server creates no service, scheduled task, listener, browser extension,
automatic updater, or remote MCP compute deployment.

## Relationship to WebMCP and loopback development

The capabilities are complementary:

- [WebMCP entity-definition lookup](../webmcp-ontology-entity-definition-lookup.md)
  is page-scoped. A supporting browser exposes the ontology page currently
  open in that page's lifecycle.
- This installed MCP server is page-independent. Its local process can serve
  any configured MCP host while all browser pages are closed.
- [Loopback HTTP development](local-development.md) runs from repository-
  generated data at `127.0.0.1` for protocol and implementation development;
  it is not the installed `stdio` topology.

Hosted MCP compute is not required for local `stdio` queries. A separately
authorized hosted adapter may be useful later for clients that cannot launch a
local process, but it is not part of this development installation.

## Current authoritative references

- [MCP `stdio` transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Claude Desktop and Claude Code MCP configuration](https://code.claude.com/docs/en/mcp)
- [VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [GitHub Actions artifact downloads](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
- [Node.js command-line and environment options](https://nodejs.org/api/cli.html)
