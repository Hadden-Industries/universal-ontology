# Universal Ontology MCP Server

The Universal Ontology MCP Server gives Model Context Protocol (MCP) hosts read-only, page-independent access to authored entity labels, lexical definitions, identifiers, and immutable ontology-release provenance.
It runs as a local `stdio` process, opens no inbound port, and exposes four tools:

- `search_entities`
- `resolve_entity`
- `get_entity_context`
- `find_entity_connections`

## Development status

This package is not published.
Its npm name and MCP Registry identity are reserved future-production coordinates, not current installation sources.
There is also no public container image, MCP Registry record, GitHub Release, immutable software artifact, publisher signature, or attestation.

For trusted-checkout builds, locally packed npm tarballs, self-contained platform archives, local OCI images, short-lived GitHub Actions artifacts, Codex/Claude Desktop/VS Code configuration, cache behavior, offline limits, updates, and removal, use the canonical [local installation and operation guide](https://github.com/Hadden-Industries/universal-ontology/blob/main/docs/mcp/local-installation.md).

Downloadable package qualification is manual by default through **Actions → Manual MCP packages** on `main`.
The default run qualifies five runtime-inclusive native archives, the Node-required npm tarball and supporting checksums/SBOMs, with a three-day Actions download.
An explicit option attaches the same verified bytes and provenance to a draft GitHub Release; public publication remains manual.
The repository variable `MCP_PACKAGE_CI_ENABLED=true` restores automatic package checks later without enabling publication.
No package is released merely by enabling this pipeline.

For repository-only Streamable HTTP development at loopback, use the separate [local development guide](https://github.com/Hadden-Industries/universal-ontology/blob/main/docs/mcp/local-development.md).

## Runtime boundary

The executable, adjacent worker, and Oxigraph WASM asset contain the MCP and ontology-query implementation but no ontology datasets.
Local filesystem mode supports bounded context, paths, and exact citation filtering; remote-artifact mode supports lexical search and resolution.
See the [context guide](https://github.com/Hadden-Industries/universal-ontology/blob/main/docs/mcp/ontology-context.md) for snapshot selection and limits.
It retrieves only selected channel/catalog/index artifacts from the configured HTTPS origin, verifies content-addressed bytes, and retains them in a private operating-system cache.
User query text and tool results are processed locally and are not sent to that artifact origin.

The default channel is `stable`; `development` is an explicit opt-in.
One process pins one verified channel snapshot, so restart the MCP host to observe a later channel promotion.
Ontology-authored text is data and must never be treated as host instructions.

## License and notices

The server is distributed under the MIT License.
Bundled dependency notices are in `THIRD_PARTY_NOTICES.md`.
