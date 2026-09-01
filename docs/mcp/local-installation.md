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

## What crosses the network

The local executable has the same operating-system authority as the MCP host
that launches it. Install only code and candidate artifacts obtained through a
trusted repository identity, and review host configuration before enabling the
server.

The executable contains the query engine but no ontology catalog or index. On
a cold query it makes HTTPS `GET` requests for the selected channel manifest,
its content-addressed catalog, and the exact content-addressed release indexes
needed by the query. Query text, entity identifiers, labels, definitions, and
tool results remain local and are not sent to the artifact origin. Request
paths and timing can still reveal the selected channel and retrieved artifact,
so an operator-controlled proxy remains part of the privacy boundary.

Channel manifests are unsigned publisher selections. Each manifest selects a
catalog by byte length and SHA-256, and each catalog selects release indexes by
the same properties. Verification therefore rejects corruption or substitution
after selection; it does not establish who made the channel selection. HTTPS
authenticates the configured origin under the operator's CA trust policy.

## Requirements

- A trusted checkout of this repository and Git.
- Node.js 24 or later for the source-checkout and local npm-tarball forms. The
  self-contained archives carry the pinned Node.js 24.20.0 runtime.
- npm using the repository lockfile. The development build selects npm 12.0.2.
- An MCP host that can launch a local `stdio` command.
- HTTPS access to the configured ontology-artifact origin for a cold query.
- Docker or a compatible OCI runtime only for the locally built OCI form.
- An authenticated GitHub account with repository read access, plus GitHub CLI,
  only when retrieving a short-lived GitHub Actions artifact.

Choose one software form. All forms execute the same canonical application
bundle and fetch the same independently changing ontology data:

| Development form               | Runtime supplied by              | Persistent files you manage                         |
| ------------------------------ | -------------------------------- | --------------------------------------------------- |
| Source checkout                | System Node.js                   | Checkout plus the operating-system cache            |
| Locally packed npm tarball     | System Node.js                   | Local installation directory plus cache             |
| Locally built platform archive | Self-contained pinned Node.js    | Extracted archive plus cache                        |
| Locally built OCI image        | Image                            | Local image plus named cache volume                 |
| GitHub Actions artifact        | Selected archive or tarball form | Downloaded three-day candidate, installation, cache |

## Build and run from a source checkout

From the repository root, install exactly the locked dependency graph without
running dependency lifecycle scripts, then build the canonical single-file
bundle:

```powershell
npm ci --ignore-scripts
npm run mcp:package:build
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
npm ci --ignore-scripts
npm run mcp:package:pack
$packageArchivePath = (Resolve-Path ".\dist\releases\universal-ontology-mcp-server-1.0.0.tgz").Path
$installationRoot = Join-Path $PWD ".local-mcp-installation"
npm install --prefix $installationRoot --ignore-scripts --omit=dev $packageArchivePath
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
npm ci --ignore-scripts
npm run mcp:package:build
npm run mcp:archives:build -- --target=windows-x64
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
npm ci --ignore-scripts
npm run mcp:package:build
docker build --tag universal-ontology-mcp-server:development packages/universal-ontology-mcp-server
docker volume create universal-ontology-mcp-cache
docker run --rm --interactive --read-only --cap-drop=ALL --security-opt=no-new-privileges --mount type=volume,source=universal-ontology-mcp-cache,target=/home/node/.cache/universal-ontology-mcp-server/v1 universal-ontology-mcp-server:development
```

`--interactive` preserves stdin for MCP frames. The named volume is the only
expected writable path; the root filesystem is read-only, Linux capabilities
are dropped, and privilege escalation is disabled. There is deliberately no
port mapping because the process uses `stdio`. Do not add `--network=none` for
normal operation: a cold query needs outbound HTTPS access to the data origin.
The verification workflow uses an isolated network only for help/version
smokes that fetch no ontology data.

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
gh run download RUN_ID --repo hadden-industries/universal-ontology -n ARTIFACT_NAME --dir .\downloaded-mcp-candidate
```

The candidate includes `SHA256SUMS`. Verify every listed subject before using
the local npm tarball or extracting the platform archive:

```powershell
$candidateDirectory = (Resolve-Path ".\downloaded-mcp-candidate").Path
$checksumManifestPath = Join-Path $candidateDirectory "SHA256SUMS"

foreach ($checksumRecord in Get-Content -LiteralPath $checksumManifestPath) {
    if ($checksumRecord -notmatch '^(?<sha256>[0-9a-f]{64})  (?<name>.+)$') {
        throw "Invalid SHA256SUMS record."
    }

    $expectedSha256 = $Matches.sha256
    $subjectPath = Join-Path $candidateDirectory $Matches.name
    $actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $subjectPath).Hash.ToLowerInvariant()
    if ($actualSha256 -ne $expectedSha256) {
        throw "Candidate subject failed SHA-256 verification."
    }
}
```

Checksums detect corruption and substitution relative to the downloaded
manifest, but they do not authenticate the publisher. No publisher signature
or attestation accompanies a development candidate. Preserve the workflow run
identity, source commit, artifact name, and verified checksum manifest in local
test records. Because Actions retention is three days, do not depend on it as a
rollback store; retain a trusted source commit or locally verified candidate.

## Configure an MCP host

Every example below uses an absolute source-checkout bundle path. Substitute
the locally installed tarball path, the archive runtime/application pair, or a
locked-down local container invocation as appropriate. These examples are
manual configuration guidance; repository setup does not create or modify a
user's MCP-host configuration.

The server exposes exactly two read-only tools:

1. `search_entities` searches authored labels, identifiers, IRI local names,
   and lexical definitions.
2. `resolve_entity` resolves an exact IRI, UUID URN, or preferred label and
   reports `found`, `ambiguous`, or `not_found` without guessing.

### Codex

Build the bundle and let the Codex CLI record its absolute entry path:

```powershell
npm ci --ignore-scripts
npm run mcp:package:build
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

## Select a data channel

The default channel is `stable`. It is intended for ontology data accepted for
normal use. `development` is explicit opt-in for rapidly changing query
artifacts and may change without a software rebuild:

```toml
[mcp_servers.universal_ontology]
command = "node"
args = [
  "C:\\absolute\\path\\to\\universal-ontology-mcp-server.mjs",
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

## Persistent cache and offline behavior

The default maximum persistent cache size is 512 MiB (`536870912` bytes).
Override it with `--cache-maximum-bytes` or
`UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES`. Default paths are:

| Platform                      | Default cache root                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Windows                       | `%LOCALAPPDATA%\UniversalOntology\McpServer\Cache\v1` (falling back to the profile's `AppData\Local`)         |
| macOS                         | `~/Library/Caches/io.hadden-industries.universal-ontology-mcp-server/v1`                                      |
| Linux and other POSIX systems | `$XDG_CACHE_HOME/universal-ontology-mcp-server/v1`, or `~/.cache/universal-ontology-mcp-server/v1` when unset |

An absolute override can be supplied with `--cache-directory` or
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

After restarting the host, with every browser page closed, ask:

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

The current stable acceptance record is:

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

| Symptom                                      | Meaning and action                                                                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host reports invalid JSON or framing         | A wrapper probably wrote diagnostics to stdout. Launch the bundle directly; leave stdout exclusively to MCP and inspect stderr.                                                              |
| Startup timeout                              | Cache safety checks or cold startup exceeded the host allowance. Inspect stderr and use a bounded host `startup_timeout_sec`; do not disable checks.                                         |
| Tool timeout                                 | An authorized proxy, DNS, TLS, or origin request may be slow. Inspect safe stderr events and set a bounded `tool_timeout_sec`; do not retry in a tight loop.                                 |
| HTTP `401` or `403` from the artifact origin | The default public data path should need no credentials. Check the exact base URL, proxy authorization, corporate interception, and origin policy. Never put credentials in the URL.         |
| HTTP `404` or `410`                          | The exact channel, catalog, or index object is absent. Confirm the base URL and channel; do not substitute a similarly named release.                                                        |
| Invalid channel manifest or catalog          | Schema, size, UTF-8, digest, or embedded identity validation failed. Preserve stderr diagnostics and investigate publication; do not edit cached JSON.                                       |
| Invalid or digest-mismatched release index   | Treat the exact object or proxy response as corrupt. Online operation may quarantine/refetch it; offline operation must fail.                                                                |
| Explicit offline miss                        | `QUERY_INDEX_CATALOG_UNAVAILABLE` or `QUERY_INDEX_UNAVAILABLE` means the exact last-known-good bytes are incomplete. Reconnect to the trusted origin or restore a previously verified cache. |
| `UNSAFE_CACHE_DIRECTORY`                     | Stop and correct ownership, permissions, links, object types, or the absolute cache location. Do not weaken the invariant.                                                                   |
| `UNSUPPORTED_CACHE_FILE_SYSTEM`              | Move the cache to a private local filesystem with the probed no-clobber hard-link behavior. Network and removable filesystems are unsuitable.                                                |
| Result still uses an older channel snapshot  | Restart the MCP process. A running process intentionally pins one verified snapshot.                                                                                                         |
| Shutdown exits non-zero                      | Closure failed or exceeded ten seconds. Inspect the redacted stderr lifecycle event and let the host terminate the child; no cache-integrity bypass is needed.                               |

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
