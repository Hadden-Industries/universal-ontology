# Distributable Local Universal Ontology MCP Server Design

**Status:** Accepted for implementation

**Owner:** `universal-ontology`

**Design date:** 2026-08-31

**Owner approval date:** 2026-08-31

**Implementation plan:**
`docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md`

**Protocol baseline:** Model Context Protocol specification `2026-07-28`
with the stable modular TypeScript/JavaScript SDK v2 line

## 1. Purpose and authority

This design turns the existing Universal Ontology MCP implementation into a
versioned software product that an MCP host can install and execute locally.
The local process retrieves only versioned query artifacts from the public
Universal Ontology CloudFront origin. It does not require an ontology web page
to be open, and it does not require a remotely hosted MCP runtime.

The first required end-to-end use case remains:

> Find the definition of `Person` in the Universal Ontology.

The answer must continue to identify the exact ontology entity, preserve the
authored definition lexical form, distinguish an asserted lexical definition
from an inferred logical definition, and report immutable ontology-release
provenance.

This document governs the distribution, remote-artifact, persistent-cache,
and `stdio` interfaces. The completed local-development plan at
[`docs/plans/2026-08-30-local-universal-ontology-mcp-server.md`](../plans/2026-08-30-local-universal-ontology-mcp-server.md)
remains historical evidence for the existing query core, tools, and guarded
loopback development transport. Where that plan proposed a hosted MCP runtime
as the production direction, this newer design supersedes that direction.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**,
and **MAY** are used normatively in this document.

## 2. Outcome and operating-cost model

The production interaction path is:

```text
MCP host
  -> launches local Universal Ontology MCP child process
  -> exchanges MCP messages over stdio
  -> first ontology query reads a small channel manifest from CloudFront
  -> local process downloads only an uncached catalog or selected release index
  -> local process verifies, persists, parses, searches, and resolves locally
  -> local process returns the tool result over stdio
```

The architecture therefore has no metered remote compute facility per MCP
tool call. Search, ranking, entity resolution, language selection, and result
rendering consume the user's local CPU and memory. The remotely chargeable
surface is limited to ordinary software distribution plus S3/CloudFront
requests and transfer for cache misses. AWS Lambda, Bedrock AgentCore Runtime,
AgentCore Gateway, API Gateway, ECS, and another continuously running MCP
runtime are not required.

This does **not** mean the system has zero operating cost. CloudFront and S3
request/transfer charges, domain and certificate administration, GitHub/npm
distribution limits, observability for artifact publication, and release
engineering remain. It means those costs are artifact-delivery costs rather
than per-query MCP execution costs.

## 3. Accepted decisions

The implementation MUST follow these decisions:

1. The supported installed-server transport is MCP `stdio`.
2. The existing loopback Streamable HTTP runner remains a repository
   development and compatibility facility; it is not the public installation
   contract.
3. The installed process exposes the existing `search_entities` and
   `resolve_entity` tools without adding `ontology` or `universal_ontology` to
   either tool name.
4. The ontology query module remains the semantic authority. Transports,
   package formats, HTTP retrieval, and disk caching are adapters around it.
5. Executable releases contain code and runtime dependencies only. They MUST
   NOT contain fast-changing catalogs, release indexes, ontology source
   artifacts, or an offline data snapshot.
6. Canonical query artifacts remain uncompressed UTF-8 JSON in S3. CloudFront
   supplies Brotli or Gzip transfer representations when eligible. Integrity
   is always computed over the decoded canonical JSON bytes.
7. A mutable channel manifest selects an immutable content-addressed catalog;
   that catalog selects immutable content-addressed release indexes.
8. The default public artifact channel is `stable`. The `development` channel
   is explicitly selectable for rapid ontology-index testing without a server
   software release.
9. A persistent local cache supports warm startup and last-known-good offline
   operation. A missing artifact is never replaced by a nearby release or a
   different channel silently.
10. GitHub Releases, npm, and optionally GHCR distribute the local software.
    The MCP Registry stores discovery metadata only; it does not host package
    bytes.
11. No AWS stack, deployment, or remote MCP runtime change belongs to the
    implementation plan derived from this design.

## 4. Standards and current implementation baseline

At the design date, the current stable MCP specification is `2026-07-28`.
That revision is stateless, carries protocol version and client capabilities
per request, and defines `stdio` and Streamable HTTP as the standard
transports. The stable JavaScript server SDK is the modular v2 line; this
repository already pins `@modelcontextprotocol/server@2.0.0` and uses its
modern server factory.

The installed entry point MUST use `serveStdio(() => buildServer())` from
`@modelcontextprotocol/server/stdio`. It MUST NOT connect one hand-constructed
server directly to `StdioServerTransport`, because the official SDK uses the
factory form to negotiate and pin the modern `2026-07-28` era while retaining
the intended legacy compatibility behavior.

The protocol baseline is not a floating dependency policy. The implementation
plan MUST recheck the official specification, SDK release line, Inspector,
Registry schema, Node.js LTS patch, npm CLI, and release-action versions on the
day implementation begins. It MUST pin exact package versions in the lockfile
and record why each compatibility-sensitive version was selected.

The existing implementation already provides:

- deterministic, content-addressed release query indexes;
- a validated catalog and immutable release-selection semantics;
- an in-memory, byte-bounded release-index cache;
- exact `search_entities` and `resolve_entity` MCP contracts;
- structured and text tool results with safe application failures;
- cancellation propagation into repository reads and query work;
- source-artifact and ontology-release provenance;
- a guarded loopback Streamable HTTP development runner; and
- a browser Fetch repository used by the complementary WebMCP feature.

The new work MUST reuse those deep modules rather than implement a second
search engine, result schema, ranking algorithm, or definition resolver.

## 5. System architecture

```text
                                   SOFTWARE DISTRIBUTION
                     +------------------------------------------+
                     | npm package / GitHub archives / OCI image|
                     | code, runtime, notices, metadata; no data |
                     +---------------------+--------------------+
                                           |
                                           v
MCP host -> stdio runner -> MCP tool adapter -> ontology query module
                                           |          |
                                           |          +-> bounded in-memory
                                           |              runtime-index cache
                                           v
                         persistent HTTP query-artifact repository
                                           |
                         +-----------------+------------------+
                         |                                    |
                         v                                    v
                persistent disk cache                  HTTPS fetch adapter
                         ^                                    |
                         +-----------------+------------------+
                                           |
                                           v
                        CloudFront /ontology/query/v1/
                              | channel manifests  (mutable)
                              | catalogs           (immutable)
                              | release indexes    (immutable)
                              v
                                  private S3 origin
```

The interfaces are deliberately asymmetric:

- MCP carries user intent and ontology results only between the host and the
  local process.
- HTTP carries only publisher-selected artifact paths. User query text,
  preferred language tags, entity identifiers, matched definitions, and tool
  results MUST NOT be sent to CloudFront or S3.
- The disk cache stores only public query-artifact bytes and small validation
  metadata. It MUST NOT store MCP requests or results.

## 6. MCP server contract

### 6.1 Identity and tool names

The direct MCP identity remains:

```json
{
  "name": "universal-ontology",
  "title": "Universal Ontology",
  "version": "<server-package-semver>"
}
```

The software package version, advertised MCP server version, Git tag, GitHub
release version, npm package version, OCI tag, and MCP Registry version MUST be
the same semantic version for one release.

The catalog still exposes exactly these public tool names in this order:

1. `search_entities`
2. `resolve_entity`

Those names are semantically complete within the visible `universal-ontology`
server namespace. Adding `ontology` to each would repeat context rather than
distinguish behavior. Cross-server collision handling belongs to the MCP host
or an explicit aggregator. Internal JavaScript operations remain qualified as
`searchOntologyEntities` and `resolveOntologyEntity`, because imported methods
do not have the visible server namespace that direct MCP tools have.

The existing tool schemas, read-only/idempotent annotations, structured result
shapes, error-safety rules, and server instructions MUST remain unchanged in
the initial distributable release. Distribution concerns MUST NOT leak into
tool arguments. In particular, a model cannot select an artifact origin,
cache directory, or artifact channel through `tools/call`.

### 6.2 Transport behavior

With no CLI subcommand, `universal-ontology-mcp-server` starts the `stdio` MCP
server. It MUST:

- read newline-delimited MCP messages only from stdin;
- write only valid MCP messages to stdout;
- write human or structured operational output only to stderr;
- propagate MCP cancellation to pending cache reads, HTTP reads, digest work,
  and ontology queries;
- exit promptly when stdin reaches EOF;
- close the SDK handle on `SIGINT` or `SIGTERM` where the platform delivers
  those signals; and
- avoid opening a listening socket.

The `stdio` process needs no MCP authentication because the host creates a
private child-process channel. The downloaded executable still runs with the
host user's privileges, so release provenance, minimal filesystem authority,
an explicit network destination, and clear installation instructions are
security requirements.

### 6.3 Snapshot consistency

One process invocation resolves one artifact-channel manifest and pins one
validated catalog snapshot. Every query in that process uses the same catalog.
A channel promotion becomes visible when the MCP host restarts the child
process; it MUST NOT change the catalog midway through a request or silently
change “latest” release selection during a long-lived process.

This process-restart point is intentional. It provides reproducible answers and a
simple development refresh: change the remote `development` channel, restart
the configured server, and query again without reinstalling or releasing the
software.

## 7. Semantically precise vocabulary and naming

Every new or changed public name MUST describe the represented concept rather
than its current implementation. Avoid generic names such as `data`, `thing`,
`manager`, `service`, `handler`, `remote`, `latest`, `cache`, or `config` when
the narrower domain concept is available.

| Required term or example name                 | Exact meaning                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ontologyQueryArtifactBaseUrl`                | Slash-terminated HTTPS base URL below which channel manifests, catalogs, and release indexes live. |
| `ontologyQueryArtifactChannelName`            | Mutable publication stream name, initially `stable` or `development`.                              |
| `ontologyQueryChannelManifest`                | Small mutable document that binds one channel name to one immutable catalog reference.             |
| `ontologyQueryCatalogReference`               | Relative path, SHA-256 digest, and canonical byte length of one immutable catalog.                 |
| `ontologyQueryCatalog`                        | Immutable set of cataloged ontology releases and their release-index references.                   |
| `ontologyReleaseQueryIndex`                   | Immutable searchable projection of one exact ontology source-artifact graph.                       |
| `maximumInMemoryQueryIndexCacheByteSize`      | Byte budget for parsed/runtime indexes retained in one process.                                    |
| `maximumPersistentQueryArtifactCacheByteSize` | Byte budget for canonical artifact files retained across processes.                                |
| `ontologyQueryArtifactCacheDirectoryPath`     | Absolute filesystem directory containing only persistent public query artifacts and metadata.      |
| `lastKnownGoodChannelManifest`                | Most recently validated manifest for a named channel, retained for origin-unavailable startup.     |
| `selectedOntologyQueryCatalog`                | Catalog snapshot pinned for the current process.                                                   |
| `ontologyQueryArtifactRepository`             | Byte-read interface for the query catalog and the release indexes it references.                   |
| `latest_stable_releases`                      | Existing tool-level ontology release-selection policy inside the selected catalog.                 |

`stable` in `ontologyQueryArtifactChannelName` is a software-data publication
channel. `latest_stable_releases` is an ontology family release-selection
policy. The implementation and documentation MUST keep those two concepts
distinct.

Factory functions use `create...` only when they construct a new owned object.
Operations use verb-object names, booleans use affirmative predicates, byte
quantities end in `ByteSize` or `ByteLength` according to whether they are a
budget or a measured representation, URLs end in `Url`, paths end in `Path`,
and SHA-256 values end in `Sha256` unless they are fields inside an explicitly
typed digest reference.

Existing names that remain accurate MUST not be churned solely for stylistic
uniformity. An existing ambiguous name that must now distinguish the memory
cache from the persistent artifact cache SHOULD be renamed in the same
behavior-preserving test-first change that introduces the distinction.

The existing `ontologyReleaseIndexRepository` parameter and
`*OntologyReleaseIndexRepository` adapter names are narrower than the
interface they already implement: every adapter reads both a query catalog
and release indexes. The implementation MUST therefore rename that interface
and its filesystem, browser-fetch, and new persistent-HTTP adapters around
`ontologyQueryArtifactRepository`. The existing generic
`maximumCacheByteSize` option likewise becomes
`maximumInMemoryQueryIndexCacheByteSize` when the persistent byte budget is
introduced. These are semantic corrections to internal names; they do not
rename either MCP tool or alter a result contract.

## 8. Query-artifact publication contract

### 8.1 Public layout

The version-one public root remains:

```text
/ontology/query/v1/
├── channels/
│   ├── development.json
│   └── stable.json
├── catalogs/
│   └── <catalog-sha256>.json
├── releases/
│   └── <ontology-artifact-family-id>/
│       └── <version-tag>/
│           └── <release-query-index-sha256>.json
└── catalog.json
```

`catalog.json` remains a mutable compatibility document for the existing
WebMCP and repository-local consumers during this increment. New installed
servers MUST begin at `channels/<name>.json`, not at `catalog.json`.

### 8.2 Channel manifest schema

The new document is strict and intentionally small:

```json
{
  "queryArtifactKind": "universal_ontology_query_channel_manifest",
  "queryArtifactFormatVersion": 1,
  "ontologyQueryArtifactChannelName": "stable",
  "ontologyQueryCatalogReference": {
    "relativePath": "catalogs/<catalog-sha256>.json",
    "sha256": "<64-lowercase-hexadecimal-characters>",
    "byteLength": 123456
  }
}
```

The manifest MUST contain no generated timestamp, host path, deployment ID,
S3 version ID, CloudFront ETag, source-control branch, or server version. The
bytes are deterministic for a given channel-to-catalog binding. HTTP metadata
can report publication time without making semantic artifact bytes
nondeterministic.

The manifest schema MUST require:

- artifact kind and format version exactly as shown;
- channel name `stable` or `development` in v1;
- a normalized, contained path exactly matching
  `catalogs/<declared-sha256>.json`;
- a lowercase SHA-256 digest; and
- a positive safe integer canonical byte length no greater than the catalog
  limit.

`development` selects the newest completely published query-artifact snapshot
intended for rapid testing. `stable` changes only through an explicit
promotion after its referenced snapshot has passed acceptance. Promotion
changes one small manifest; it does not copy or rename immutable objects.

### 8.3 Immutable catalog and release indexes

The existing catalog schema remains format version 1. Its canonical bytes are
also published at `catalogs/<sha256>.json`, where the path digest equals the
SHA-256 of those exact bytes. The compatibility `catalog.json` may contain the
same bytes but is not itself an immutable identity.

Release-index paths remain content-addressed by the SHA-256 of their own
canonical bytes. A source-artifact digest MUST remain embedded separately,
because source identity and query-projection identity are different facts.

All artifact JSON MUST be serialized deterministically as UTF-8, with the
repository's fixed indentation and one terminal newline. Digests and declared
byte lengths apply to those canonical uncompressed bytes.

### 8.4 Publication order and cache metadata

Publication MUST be monotonic and failure-safe:

1. generate and validate every release index;
2. upload missing content-addressed release indexes without overwriting an
   existing digest path;
3. generate, validate, and upload the content-addressed catalog without
   overwriting its digest path;
4. verify every referenced immutable object through the public origin;
5. publish the mutable compatibility catalog where still required;
6. publish the selected channel manifest last; and
7. verify the manifest, catalog digest, and at least the golden `Person` path
   through CloudFront.

Immutable catalogs and indexes SHOULD use:

```text
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/json
```

Channel manifests and the compatibility catalog SHOULD use:

```text
Cache-Control: public, max-age=0, must-revalidate
Content-Type: application/json
```

Immutable objects do not require invalidation. Mutable channel objects use
conditional revalidation. An HTTP ETag MAY reduce transfer, but it MUST NOT be
used as the artifact's cryptographic identity because CloudFront can weaken an
ETag when it creates a compressed representation.

The S3 objects remain canonical and uncompressed. CloudFront automatic
compression applies only when the response media type, size, response status,
and viewer `Accept-Encoding` satisfy its documented conditions. The current
largest release index is below the 10,000,000-byte automatic-compression
ceiling. The client MUST still work when CloudFront returns an uncompressed
representation, because compression is an optimization rather than a data
contract.

## 9. Persistent HTTP query-artifact repository

### 9.1 Responsibility

A new Node-specific repository adapter composes HTTPS acquisition with a
persistent disk cache and satisfies the existing query module's catalog and
release-index byte-read port. Its proposed constructor name is:

```js
createPersistentHttpOntologyQueryArtifactRepository({
  ontologyQueryArtifactBaseUrl,
  ontologyQueryArtifactChannelName,
  ontologyQueryArtifactCacheDirectoryPath,
  maximumPersistentQueryArtifactCacheByteSize,
  fetchImplementation,
  clock,
});
```

The factory name says what persists, how uncached bytes are acquired, and what
domain artifacts it owns. It is not called a database, downloader, data
manager, API client, or remote ontology service.

Its external interface remains deliberately small:

```text
readOntologyQueryCatalog({ signal })
  -> Promise<Uint8Array>

readOntologyReleaseQueryIndex({ relativePath, signal })
  -> Promise<Uint8Array>
```

Both operations resolve to validated canonical `Uint8Array` bytes or reject
with an existing safe ontology-query error. Channel resolution, HTTP
negotiation, persistent paths, locks, last-known-good state, and eviction are
implementation details behind that interface. `fetchImplementation` and
`clock` are injected internal seams for deterministic tests; MCP, CLI, and
query-module callers do not coordinate those mechanics.

The repository owns:

- channel-manifest retrieval and validation;
- immutable catalog retrieval and digest validation;
- persistent cache layout, containment, atomicity, and eviction;
- decoded response byte limits and content-type checks;
- conditional manifest requests;
- coalescing identical in-process cold reads;
- safe last-known-good fallback; and
- precise private operational diagnostics.

The ontology query module continues to own catalog interpretation, release
selection, release-index digest/schema/identity checks, runtime-index
construction, ranking, and entity resolution.

### 9.2 Default origin and controlled overrides

The built-in public base URL is:

```text
https://haddenindustries.com/ontology/query/v1/
```

It MUST be parsed once and require HTTPS, no credentials, no query, no
fragment, and a slash-terminated path. Redirects are rejected. Every resolved
artifact URL must retain the exact origin and base-path prefix after URL
resolution.

An operator may explicitly override the base URL for testing. Non-HTTPS is
accepted only for an exact loopback host and only with a separately explicit
insecure-loopback option. Neither an MCP request nor ontology-authored content
can supply or modify this URL.

### 9.3 Fetch validation

For each response, the adapter MUST:

- request `application/json`;
- reject redirects rather than following them;
- require HTTP 200, except that a conditional channel request may accept 304;
- require `application/json` or `application/*+json` media type;
- stream the decoded body through the artifact-specific byte ceiling;
- use a finite connection/response deadline and the caller cancellation
  signal;
- validate canonical byte length when a trusted reference declares it;
- compute SHA-256 over decoded bytes before JSON parsing or final cache
  installation;
- validate the complete strict schema and embedded identity; and
- discard partial bytes on every failure.

`Content-Length` for a compressed response describes the transfer
representation and therefore cannot prove the decoded canonical length. It is
only an early-rejection hint when safe; the decoded streaming counter remains
authoritative and protects against compressed expansion.

The v1 decoded ceilings remain deliberately below CloudFront's automatic
compression maximum:

| Artifact                     | Maximum canonical byte length |
| ---------------------------- | ----------------------------- |
| Channel manifest             | 64 KiB                        |
| Ontology query catalog       | 1 MiB                         |
| Ontology release query index | 8 MiB                         |

### 9.4 Persistent cache layout

The logical layout is:

```text
<platform-cache-root>/universal-ontology-mcp-server/query-artifacts/v1/
├── channels/
│   ├── development/
│   │   ├── last-known-good.json
│   │   └── http-metadata.json
│   └── stable/
│       ├── last-known-good.json
│       └── http-metadata.json
├── catalogs/sha256/<catalog-sha256>.json
├── release-indexes/sha256/<release-query-index-sha256>.json
├── locks/<artifact-cache-key>.lock
└── temporary/<unique-installation-name>.part
```

The platform default follows the operating system's user-cache convention:

- Windows: the current user's local application-data cache;
- macOS: the current user's `Library/Caches` hierarchy; and
- other Unix-like systems: `XDG_CACHE_HOME`, falling back to the user's
  `.cache` hierarchy.

An explicit absolute cache-directory override is allowed. The implementation
MUST NOT infer a writable location from the process working directory, package
installation directory, source checkout, or executable directory.

Cache paths are constructed from validated channel names and lowercase
digests, never from arbitrary URL text or ontology identifiers. Cache
directories are user-only where the operating system honors POSIX-style
permissions. Existing symbolic links or non-regular files at managed paths
are rejected rather than followed.

### 9.5 Atomic installation and concurrency

For every immutable artifact cache miss:

1. acquire an artifact-specific inter-process lock with bounded waiting and
   stale-owner recovery;
2. check the final cache path again after acquiring the lock;
3. stream into a uniquely named temporary sibling while hashing and bounding;
4. validate the digest, byte length, UTF-8, schema, and identity;
5. flush the file before making it reachable;
6. atomically rename it to the digest-derived final path;
7. flush directory metadata where supported; and
8. remove the temporary file and release the lock on every outcome.

The implementation MUST account for Windows rename and process-termination
semantics explicitly. A second process that loses the install race validates
and reuses the winner's immutable file. It never overwrites it.

Within one process, concurrent requests for the same cold artifact share one
read promise. One caller's cancellation stops only that caller while another
waiter remains; the underlying network or disk read is aborted when no waiter
remains. This preserves the existing query module's cancellation isolation.

### 9.6 Last-known-good and offline behavior

On the first catalog demand, the repository conditionally retrieves the
configured channel manifest. Tool discovery therefore remains available even
when no artifact origin or cache is available. After one manifest and catalog
validate successfully, the query module pins that catalog for the process
lifetime and performs no later channel refresh. The repository promotes a
newly fetched manifest to last-known-good only after the manifest, referenced
catalog bytes, digest, byte length, schema, and contained references all
validate.

If the origin is unavailable, times out, or returns an invalid new manifest,
the process MAY use the preceding last-known-good channel manifest and cached
catalog. It MUST emit a safe stderr warning that an offline/stale snapshot is
active. It MUST NOT log local cache paths, user queries, ontology-authored
strings, or exception details by default.

Offline fallback is exact, not approximate:

- a cached requested release index may be used after digest validation;
- an uncached requested index fails with the existing safe unavailable error;
- an unknown family or release is evaluated against the pinned catalog;
- no different release, channel, or compatibility catalog is substituted;
- first-ever startup without a valid channel/catalog cache fails the first
  query clearly; and
- corruption of the last-known-good bytes is fatal for that candidate and
  never bypasses validation.

The persistent cache defaults to a 512 MiB budget, distinct from the existing
64 MiB in-memory runtime-index budget. Eviction is least-recently-used among
validated immutable artifacts, protects objects participating in active
reads, and never deletes the last-known-good manifest or its selected catalog
until a replacement is fully durable. Cache pruning is best-effort after a
successful read; failure to prune is reported safely but does not corrupt an
otherwise valid query result.

## 10. Security, privacy, and trust model

### 10.1 Local process authority

The local process needs only:

- stdin/stdout for MCP;
- stderr for safe operational events;
- outbound HTTPS to the configured artifact origin;
- read/write access to its dedicated cache directory; and
- read access to its own installed code/runtime files.

It does not need repository access, the user's documents, credentials, shell
execution, child-process creation, a listening socket, AWS credentials, or a
browser session. Documentation SHOULD show sandbox or Node permission-model
examples as defense in depth where the selected packaging form supports them,
while accurately stating that Node's permission model is a seat belt for
trusted code rather than a sandbox for malicious code.

### 10.2 Artifact trust chain

The executable's trust chain is the signed/attested software release. The
default data-selection trust anchor is the fixed HTTPS origin controlled by
the Universal Ontology publisher. The channel manifest selects a catalog;
SHA-256 then detects corruption, wrong cache objects, decompression mistakes,
and inconsistent publication throughout the immutable object graph.

This v1 chain does not claim that a digest authenticates the publisher. A
party that controls the authorized HTTPS origin can publish a different valid
manifest and matching content. A future signed-metadata/TUF-style design may
be added if the threat model requires protection against an origin or
publisher-control compromise. Such a change requires its own key lifecycle,
rollback, expiry, and recovery design and is not approximated by calling S3 or
CloudFront ETags signatures.

### 10.3 Untrusted ontology-authored content

Digest and schema validation establish byte identity and shape, not truth or
instruction authority. Labels, definitions, notes, identifiers, and IRIs are
still untrusted ontology-authored data. Existing warnings and result rendering
continue to tell models not to interpret authored strings as instructions and
not to present asserted graph content as inferred fact.

### 10.4 Logging

Operational events go to stderr as one bounded JSON object per line. Safe
fields include timestamp, severity, event name, server version, artifact kind,
artifact channel name, cache outcome, duration, response status class, byte
count, and stable safe error code.

Logs MUST NOT contain query text, definition text, labels, entity identifiers,
entity/source IRIs, MCP request bodies, tool results, authorization headers,
full URLs with unexpected components, local paths, usernames, stack traces,
or private exception messages by default.

## 11. CLI and operator configuration

The installed command is:

```text
universal-ontology-mcp-server
```

No arguments starts `stdio`. The initial supported non-protocol invocations
are limited to `--help` and `--version`. They may write ordinary CLI output to
stdout because they do not start the MCP transport.

Server configuration uses explicit CLI options and corresponding environment
variables with one documented precedence order: CLI option, then environment,
then built-in default. The initial concepts are:

| CLI option                                  | Environment variable                         | Default               |
| ------------------------------------------- | -------------------------------------------- | --------------------- |
| `--artifact-channel <name>`                 | `UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_CHANNEL`    | `stable`              |
| `--artifact-base-url <url>`                 | `UNIVERSAL_ONTOLOGY_MCP_ARTIFACT_BASE_URL`   | public CloudFront URL |
| `--cache-directory <absolute-path>`         | `UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY`     | platform cache root   |
| `--cache-maximum-bytes <positive-integer>`  | `UNIVERSAL_ONTOLOGY_MCP_CACHE_MAXIMUM_BYTES` | `536870912`           |
| `--allow-insecure-loopback-artifact-origin` | none                                         | disabled              |

The option spelling is user-facing CLI convention; internal objects use the
fully qualified vocabulary from Section 7. Unknown options, duplicate
single-valued options, invalid integers, relative cache paths, unsupported
channel names, and unsafe origins fail before `stdio` starts. Secrets are not
accepted because the default public artifact origin needs no credentials.

The existing repository-only HTTP configuration remains separate. Its
`UNIVERSAL_ONTOLOGY_QUERY_ROOT`, loopback port, and HTTP admission controls do
not become installed-stdio options.

## 12. Software packaging and distribution

### 12.1 Canonical npm package

The primary package coordinate is:

```text
universal-ontology-mcp-server
```

It was unclaimed in the public npm registry during design research on
2026-08-31; availability MUST be checked again immediately before the first
publish because an unscoped package name is not reserved by this document.

The package exposes one `bin` entry named
`universal-ontology-mcp-server`. It contains the bundled server program,
license, third-party notices, package README, and source/repository metadata.
It contains no query artifact or ontology source. The root website package
remains private; the MCP server is a separate npm workspace/package with its
own semantic version and explicit published-file allowlist.

The public package metadata MUST set:

```json
{
  "mcpName": "io.github.hadden-industries/universal-ontology"
}
```

That value is the MCP Registry's npm ownership-verification link and MUST
equal the `name` in `server.json` exactly.

The package is published through npm trusted publishing from one narrowly
permissioned GitHub-hosted workflow. OIDC replaces a long-lived npm publish
token, and npm provenance remains enabled. The workflow first verifies the
exact `npm pack` contents and runs the packed-tarball acceptance test.

A typical Codex installation command will be:

```powershell
codex mcp add universal_ontology -- npx -y universal-ontology-mcp-server@1.0.0
```

Documentation may also show an unpinned `@latest` convenience, but acceptance,
bug reports, and reproducibility examples MUST use an exact version.

### 12.2 GitHub Release assets

The Git tag namespace is independent from ontology date releases:

```text
universal-ontology-mcp-server-v<semver>
```

One immutable GitHub Release contains:

- the exact npm tarball published to npm;
- self-contained platform archives for the supported matrix;
- a deterministic SHA-256 checksum manifest;
- an SPDX 2.3 JSON software bill of materials;
- third-party notices; and
- build-provenance and SBOM attestations.

Self-contained archives bundle the same compiled JavaScript entry plus a
verified official Node.js LTS runtime and a minimal platform launcher. They do
not use Node single-executable injection in the first release. Node's SEA
facility remains in active development in the current LTS documentation and
has platform/tooling constraints; repackaging the official pinned LTS runtime
is larger but relies on stable runtime behavior and remains testable on every
advertised target. SEA can replace that packaging layer later without changing
the MCP or artifact contracts when its stability and support matrix justify
the change.

Initial archive names are:

```text
universal-ontology-mcp-server-v<semver>-linux-x64.tar.gz
universal-ontology-mcp-server-v<semver>-linux-arm64.tar.gz
universal-ontology-mcp-server-v<semver>-macos-x64.tar.gz
universal-ontology-mcp-server-v<semver>-macos-arm64.tar.gz
universal-ontology-mcp-server-v<semver>-windows-x64.zip
```

Each advertised archive MUST be built and smoke-tested on its target operating
system and architecture. A target without a reliable hosted runner or
supported Node runtime is omitted rather than published as untested. The npm
package remains available anywhere the declared Node.js engine range is
supported.

GitHub release immutability SHOULD be enabled. The workflow prepares a draft,
attaches every asset, verifies the asset set, and publishes only when complete.
Every third-party GitHub Action is pinned by full commit SHA, workflow
permissions are least-privilege per job, and release builds use `npm ci` from
the committed lockfile without dependency caching.

### 12.3 OCI image

An OCI image MAY be published at:

```text
ghcr.io/hadden-industries/universal-ontology-mcp-server:<semver>
```

It runs the same `stdio` entry as a non-root user, declares
`io.modelcontextprotocol.server.name=io.github.hadden-industries/universal-ontology`
for MCP Registry ownership verification, and contains no ontology data.
Container documentation MUST preserve stdin (`-i`) and mount a dedicated
cache volume; otherwise every process start discards the cache and repeats
downloads.

The image is an installation alternative, not a hosted server. Publishing it
to GHCR does not create a running workload. Tags are convenience references;
digests are the immutable OCI identity.

### 12.4 MCP Registry metadata

The Registry server name is:

```text
io.github.hadden-industries/universal-ontology
```

The repository root contains one validated `server.json` using the current
official schema. It identifies the npm and, when available, OCI packages as
`stdio` transports and contains no remote Streamable HTTP URL. Its version is
rendered or checked against the release version; stale metadata blocks a
release.

The official Registry is still preview infrastructure. Registry publication
MUST be the last distribution step, after package bytes are public and
verified. A Registry failure does not justify mutating an already published
software version; it is retried with the same immutable metadata.

MCPB is deliberately deferred. It is useful for hosts that implement one-click
bundle installation, but npm plus self-contained archives cover the initial
host-neutral requirement without adding another manifest and update mechanism.
It can be added as another packaging adapter after an actual supported-host
need is confirmed.

## 13. Versioning and compatibility dimensions

The implementation MUST treat these as separate dimensions:

| Dimension                            | Version or identity mechanism                   |
| ------------------------------------ | ----------------------------------------------- |
| MCP wire protocol                    | Date revision negotiated by official SDK        |
| MCP server software                  | Semantic version                                |
| Tool names and input/output contract | Changes governed by server semantic version     |
| Channel-manifest schema              | `queryArtifactFormatVersion` plus artifact kind |
| Catalog schema                       | Its own artifact kind and format version        |
| Release-index schema                 | Its own artifact kind and format version        |
| Selected catalog snapshot            | SHA-256 of canonical catalog bytes              |
| Ontology release                     | `ontologyArtifactFamilyId` plus `versionTag`    |
| Ontology source artifact             | `sourceArtifactSha256`                          |
| Release query projection             | `queryIndexSha256`                              |
| npm/GitHub/OCI package               | Package semver plus registry/release digest     |

A server software update is not required when only a channel points to a new
compatible catalog. A data schema change is not smuggled in as “new data”; it
uses a new format version and server compatibility decision. A server patch
must not change tool semantics incompatibly. A breaking tool or CLI contract
requires a major server version even when the MCP protocol revision is
unchanged.

## 14. Source and package architecture

The implementation plan SHOULD retain these ownership seams:

```text
src/mcp/
  createUniversalOntologyMcpServer.js        protocol/tool adapter
  runUniversalOntologyMcpStdioServer.js      installed stdio composition

src/ontologyQuery/
  createOntologyQueryModule.js               semantic query authority
  persistentHttpOntologyQueryArtifactRepository.js
                                              HTTP + durable-cache adapter
  ontologyQueryChannelManifestSchemas.js     new artifact schema
  ontologyQueryArtifactCache.js              contained atomic persistence

packages/universal-ontology-mcp-server/
  package.json                               public npm metadata and bin
  README.md                                  installed-package guide

scripts/
  buildUniversalOntologyMcpPackage.js         one canonical application bundle
  buildUniversalOntologyMcpPlatformArchive.js release archive adapter

tests/mcp/
tests/ontology-query/
tests/distribution/
```

Exact files may be refined in the implementation plan after inspecting module
depth, but responsibilities MUST not collapse into one CLI script. In
particular, HTTP fetching, persistent cache state, MCP registration, and
ontology query semantics require independently testable interfaces.

The canonical application bundle is built once from the same source entry for
npm, platform archives, and OCI. Packaging adapters MUST not carry divergent
server logic or version strings.

## 15. Code-comment and documentation policy

Created and materially changed code MUST be well commented according to
modern practice:

- exported factories, schemas, policy constants, and lifecycle handles have
  concise JSDoc describing responsibility, inputs, outputs, ownership, and
  exceptional behavior;
- security, containment, digest, cancellation, concurrency, atomic-write,
  offline-fallback, and cross-platform branches explain the invariant and why
  the obvious simpler alternative is unsafe;
- format-version and naming decisions identify the semantic distinction they
  protect;
- workflow comments explain non-obvious permissions, provenance, target
  matrices, and immutable-release ordering;
- comments do not narrate syntax, duplicate type/schema information, preserve
  obsolete history, or excuse unclear names; and
- every comment is updated or removed in the same change that alters its
  invariant.

User documentation is split by audience:

- `docs/mcp/local-development.md` remains the source-checkout and loopback HTTP
  developer guide;
- a new `docs/mcp/local-installation.md` covers npm, GitHub archive, and OCI
  installation; Codex and generic MCP-host `stdio` configuration; cache paths;
  `stable` versus `development`; privacy; offline behavior; update and removal;
  checksum/attestation verification; and troubleshooting;
- `packages/universal-ontology-mcp-server/README.md` is a concise package-local
  route to the same canonical guide; and
- the repository `README.md` links both WebMCP page-scoped lookup and the
  page-independent installed MCP server without presenting either as a
  replacement for the other.

The Codex examples MUST follow current official guidance: Codex supports local
`stdio` servers started by a command, can add them with `codex mcp add`, and
shares MCP configuration across its local clients on the same host. Examples
must preserve the existing read-only tool approval annotations and exact tool
allowlist.

## 16. Test-first engineering and acceptance

Implementation proceeds through test-driven development throughout. Every
behavioral slice begins with the smallest failing automated test that proves
the absent behavior, records the expected failure, implements only enough to
pass, and then refactors under green tests. A test written after its production
code does not satisfy this requirement merely because it passes.

Persistent-repository behavior is tested through its two-operation interface,
using a deterministic loopback HTTP fixture and an operating-system temporary
cache root. Tests observe returned bytes, safe errors, HTTP requests,
cross-process behavior, and restart recovery. They do not couple ordinary
behavior assertions to private helper calls. Clock, cancellation, and
filesystem-failure controls remain named internal seams used only where the
same outcome cannot be induced reliably through the external interface.

Required test layers include:

### 16.1 Schema and path tests

- valid and invalid channel manifests;
- digest/path equality and lowercase hexadecimal rules;
- channel-name distinction from ontology release selection;
- strict unknown-field rejection;
- URL origin/base-path containment;
- percent/query/fragment reinterpretation attacks; and
- platform cache-root and explicit absolute-path validation.

### 16.2 HTTP and cache tests

- compressed and uncompressed canonical bytes produce the same digest;
- chunked decoded bodies enforce the canonical byte ceiling;
- invalid content type, status, redirect, timeout, truncation, UTF-8, JSON,
  schema, digest, byte length, and embedded identity all fail safely;
- conditional manifest retrieval and 304 reuse;
- immutable hit, cold miss, and corrupt-hit replacement behavior;
- last-known-good use when the origin is unavailable;
- no fallback when no complete last-known-good snapshot exists;
- concurrent in-process and inter-process cold reads;
- one-waiter and all-waiter cancellation;
- simulated process failure at every atomic-install step;
- Windows and POSIX path/rename semantics;
- persistent-cache eviction and protected active artifacts; and
- proof that no HTTP request contains a query string or entity value.

### 16.3 MCP `stdio` tests

- official v2 client/Inspector launches the real command;
- modern and intended legacy protocol-era behavior comes from `serveStdio`;
- stdout contains only parseable MCP messages;
- stderr diagnostics do not corrupt the protocol;
- tool discovery preserves identity, instructions, order, schemas, and
  annotations;
- invalid arguments are rejected before the query module;
- cancellation reaches a blocked cold artifact read;
- stdin EOF and termination signals close promptly;
- no listening network socket is created; and
- both tools return the existing structured/text result contract.

### 16.4 Distribution tests

- `npm pack --dry-run` and the actual tarball contain only the allowlisted
  files and no ontology/query data;
- installation into a new temporary directory works with production
  dependencies only;
- `--version` equals package, server, tag fixture, Registry, and OCI metadata;
- exact-version `npx` can complete the golden `Person` call;
- every platform archive runs on its advertised target and uses its dedicated
  cache directory;
- OCI runs as non-root, uses stdin, persists a mounted cache, and contains no
  shell or unnecessary package manager in the final image where practical;
- checksums, SBOM, provenance subjects, license, and notices cover every
  shipped asset; and
- a draft release fails closed when any expected asset or attestation is
  absent.

### 16.5 Golden semantic acceptance

With every ontology website page closed, a freshly installed server configured
for `stable` must answer the golden prompt for `Person`. It must select the
cataloged Universal Core stable release, return the exact asserted
`skos:definition`, source-artifact graph scope, source IRI, release identity,
and source-artifact SHA-256 already specified by the existing MCP acceptance.

Repeat the call:

1. online with an empty persistent cache;
2. online with a warm persistent cache and no artifact body transfer;
3. offline with a complete cache;
4. offline with the selected release index deliberately absent; and
5. against `development` after changing only the channel/catalog artifacts.

Cases 1–3 return the same semantic result. Case 4 fails explicitly without a
release substitution. Case 5 proves that compatible data can change without a
server software release.

## 17. Implementation governance and Git scope

The implementation plan derived from this design MUST:

- execute inline without implementation subagents;
- enumerate every planned configuration file and exact setting before code
  work starts; owner approval of that plan authorizes those listed
  configuration edits, but not an unlisted configuration change;
- preserve unrelated working-tree changes and stage only task-owned paths;
- use a failing test before every behavioral production change;
- run focused checks after each red/green slice and the complete applicable
  suite before review;
- pause at the repository's built-in review gate for each coherent nontrivial
  implementation increment and resolve or explicitly defer every confirmed
  P0–P2 finding before committing it;
- generate a detailed, semantically accurate signed commit message and create
  the approved increment's commit without asking for separate commit-message
  or commit authorization; and
- neither push nor ask whether to push.

Likely configuration changes include the root and public-package
`package.json` files, `package-lock.json`, lint/format script coverage for the
new package sources, one MCP Registry `server.json`, one container definition,
and one narrowly permissioned GitHub release workflow. The detailed plan must
name the exact files, settings, dependencies, scripts, workflow triggers,
permissions, and pipeline effects before any of them is edited.

## 18. AWS scope and existing handoffs

This design requires no hosted MCP compute and authorizes no edit to the AWS
CDK stack. The Universal Ontology implementation plan MUST NOT modify
`amazon-aws/infrastructure/stack.py`, deploy CDK, upload to S3, invalidate
CloudFront, or create an AWS resource.

Potential AWS delivery changes remain separate work in these handoffs:

- [`amazon-aws/docs/issues/2026-08-31-amazon-aws-json-content-type-handoff.md`](../../../amazon-aws/docs/issues/2026-08-31-amazon-aws-json-content-type-handoff.md)
  for explicit `.json` media type and UTF-8 upload treatment; and
- [`amazon-aws/docs/issues/2026-08-31-cloudfront-ontology-query-artifact-cdk-handoff.md`](../../../amazon-aws/docs/issues/2026-08-31-cloudfront-ontology-query-artifact-cdk-handoff.md)
  for a dedicated `ontology/query/*` CloudFront behavior and explicit
  compression isolation.

Those handoffs should be amended, as documentation only, to reference this
design and the eventual implementation plan, the finalized channel/catalog
paths, and the cache-control distinction between mutable and immutable
objects. Any uploader cache-control capability not already covered must be
proposed there as separate AWS-repository work. The Universal Ontology plan
must not implement it indirectly.

The current Universal Ontology deployment wrapper invokes managed deletion
for the deployed `ontology` prefix. That is incompatible with channel
manifests selecting older content-addressed catalogs: a later website build
contains only the artifacts reproducible from its checkout and could delete
an immutable object still selected by `stable`. Before channel publication is
production-ready, the handoffs MUST therefore define a separate monotonic
query-artifact publication path or an equivalently safe deletion scope. It
must upload immutable indexes and catalogs before mutable manifests, retain
every object reachable from a published channel, and perform garbage
collection only as a separate reachability-aware operation. The plan in this
repository may generate and validate the required artifacts, but it MUST NOT
change or invoke the remote publisher.

The present CloudFront configuration already uses the managed
`CachingOptimized` policy and high-level CDK behavior whose documented
compression default is enabled. The proposed dedicated query behavior is
architectural isolation, not a prerequisite for correctness of explicit JSON
paths under the current rewrite function. Release readiness nevertheless
requires verifying the real public response metadata and decoded digest.

## 19. Failure, rollback, and recovery

### Software release failure

A failed build or test publishes nothing. Release assets are assembled in a
draft. Once an immutable release and npm version are public, they are never
replaced; a fix receives a new semantic version. An OCI mutable tag may be
repointed only by the documented release policy, while the digest remains the
accepted identity.

### Artifact publication failure

A failure before channel publication leaves the preceding channel untouched.
Unreferenced content-addressed objects are harmless and may be garbage-
collected only by a separate reachability-aware process. A failed channel
promotion is rolled back by atomically restoring the preceding validated
manifest, not by overwriting or deleting immutable artifacts.

### Client recovery

If a newly published manifest or catalog is inconsistent, an installed client
keeps the last-known-good snapshot and emits a safe warning. If an immutable
cache file is corrupt, it is quarantined or removed only after its exact path
has been validated, then fetched again when online. No repair rewrites bytes
under an existing digest name.

## 20. Explicit non-goals

This increment does not:

- host the MCP server on AWS, Google Cloud, or another remote runtime;
- change the AWS CDK stack or deploy infrastructure;
- bundle ontology query artifacts with software releases;
- add precompressed `.br` or `.gz` S3 objects;
- change `search_entities`, `resolve_entity`, or their semantic results;
- add a generic SPARQL, query-language, reasoning, mutation, or ontology-edit
  tool;
- turn the WebMCP page tool into a dependency of the MCP server;
- hot-swap catalogs inside one process;
- promise offline first use;
- add MCP resources, prompts, tasks, elicitation, sampling, or UI extensions;
- implement a public remote Streamable HTTP endpoint;
- add MCPB packaging in the first distribution release;
- treat Node SEA as a release prerequisite while it remains an active-
  development packaging facility; or
- claim cryptographic publisher authentication for unsigned channel metadata.

## 21. Design acceptance criteria

This design is ready for implementation planning only when the owner accepts
all of the following:

- local `stdio` is the public transport and loopback HTTP remains development
  only;
- tool names and semantic contracts remain unchanged;
- code distribution and fast-changing data publication are independent;
- npm is the primary package, GitHub Releases provide verifiable assets and
  self-contained platform archives, and OCI is an optional local alternative;
- no executable release contains ontology data;
- channel manifests select content-addressed catalogs and release indexes;
- `stable` and `development` channel semantics are distinct and documented;
- persistent cache, exact offline behavior, and last-known-good rules are
  accepted;
- integrity is over decoded canonical JSON, with CloudFront compression only
  an HTTP optimization;
- the v1 trust model and unsigned-channel limitation are explicit;
- TDD, comment quality, semantic naming, review, autonomous detailed commits,
  and no-push constraints are accepted; and
- AWS changes remain separate and are referenced only through the handoffs.

## 22. Primary references

### MCP

- [MCP specification `2026-07-28`](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP `stdio` transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP cancellation](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)
- [MCP security best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Official JavaScript SDK v2 server package](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/packages/server)
- [Official SDK `stdio` serving guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md)
- [MCP Registry overview](https://modelcontextprotocol.io/registry/about)
- [MCP Registry package types](https://modelcontextprotocol.io/registry/package-types)
- [MCP Registry versioning](https://modelcontextprotocol.io/registry/versioning)

### Distribution and runtime

- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub artifact and SBOM attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [Node.js supported release lines](https://nodejs.org/en/about/previous-releases)
- [Node.js single-executable applications](https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html)
- [Node.js permission model](https://nodejs.org/docs/latest-v24.x/api/permissions.html)
- [GitHub MCP Server release `v1.11.0`](https://github.com/github/github-mcp-server/releases/tag/v1.11.0)

### CloudFront and Codex

- [CloudFront automatic compression](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)
- [CloudFront compression-size quota](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html)
- [CloudFront managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
- [Official OpenAI documentation for MCP in Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

## 23. Artifact ownership

There is one canonical distribution design and, after approval, one canonical
implementation plan:

```text
universal-ontology/
  docs/specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md
  docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md
```

The completed 2026-08-30 plan remains the record of the first local server.
AWS handoffs retain only AWS-repository delivery work and references to these
canonical Universal Ontology documents. Installation guides explain usage;
they do not become competing architecture specifications.
