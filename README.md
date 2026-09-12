# Universal Ontology

**Set of concepts and categories, applicable to almost all domains, that shows their properties and the relations between them**

### Community and reporting

See [Contributing](CONTRIBUTING.md) for the contribution and review process and
the [Code of Conduct](CODE_OF_CONDUCT.md) for community expectations. Report
vulnerabilities through the private [security reporting process](SECURITY.md).
The [communication privacy notice](PRIVACY.md) covers private reports and related
governance correspondence.

### Development setup

Install Git 2.46 or later, the Node.js version in `.node-version`, and the npm
version declared by `packageManager` in `package.json`. The Python version in
`.python-version` is also required. An
existing `.venv` is reused, or setup creates one using `python` on Windows and
`python3` on macOS/Linux.
The system interpreter must be available on `PATH` when creating `.venv`.

From the repository root, run:

```sh
npm run setup:development
npm run configure:git-hooks
```

The development setup command installs npm dependencies with
`npm ci --include=dev --ignore-scripts`, which replaces `node_modules` using the
existing lockfile without dependency lifecycle scripts. It records the bootstrap
pip version, installs the hash-locked `requirements.lock.txt` (the reviewed
resolution of `requirements.txt` and `requirements-sdlc.txt`) inside `.venv` with
`--require-hashes --only-binary=:all:`, refuses a `.venv` whose installed
distributions differ from that lock, runs `pip check`, then merges the approved
repository Codex configuration and activates six local SDLC skills.
An unusable existing `.venv` causes setup to
stop so it can be repaired manually. AWS CLI is checked and produces a warning
if unavailable; it is needed for S3 uploads, and setup does not install it.

The Git hook command sets repository-local `core.hooksPath` to `.githooks`,
replacing any previous local value. Run it once per clone; it is safe to rerun.
It verifies the hook exists and leaves staged changes intact. This command runs
independently of dependency installation.

Once enabled locally, the pre-commit hook runs the SHACL editing policy on the
exact staged ontology bytes (`scripts/validate_ontologies.py --purpose draft
--staged`) using Python from `.venv`. A missing interpreter blocks the commit
with setup instructions; every policy violation also blocks the commit. The hook
uses `.venv/Scripts/python.exe` on Windows or `.venv/bin/python` on macOS/Linux.

The policy itself lives in `policy/*.ttl` (SHACL is the source of truth) and
its human-readable projection is generated into
[docs/policy/Editing-Policy.generated.md](docs/policy/Editing-Policy.generated.md)
(`npm run generate:editing-policy`; `npm run check:editing-policy` fails when it
is stale). `policy/activation.ttl` records the active module set; `npm run
validate:ontologies -- --purpose latest-active` qualifies it and writes the
receipt that the publication gate in `scripts/upload_to_s3.py` requires.

On GitHub, [the ontology validation workflow](.github/workflows/ontology-validation.yml)
runs on pushes and pull requests. It provisions Python and dependencies on the
runner, then calls the same `scripts/validate_ontologies.py` with `--diff-base`
and `--diff-head` to select the commit range and `--purpose draft` for the
diagnostics; a separate job qualifies the latest active set on Linux and
Windows with Apache Jena as the second engine. It does not invoke the local
pre-commit hook or require its `.venv`. Pushing commits to GitHub does not
itself run the pre-commit hook.

### Repository-owned SDLC

The experimental [SDLC guide](docs/sdlc/howto.md) describes proportionate routes,
npm entry points, verification boundaries and evaluation through real work.
The methodology is deployed in this repository as **1.0.0, pre-release**. See
[the adoption record](docs/sdlc/adoption.md) for the accepted host scope, evidence
and upstream limitations, and [SDLC-BOOTSTRAP-01](docs/sdlc/SDLC-BOOTSTRAP-01.md)
for the original integration approval.

Portions of this software or document may use, include material copied from, or derive from the following standard vocabularies and ontologies:

- **[Dublin Core Metadata Initiative (DCMI) Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)**: Copyright © [Dublin Core Metadata Initiative](https://dublincore.org/). Licensed under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license.
- **[Financial Industry Business Ontology (FIBO)](https://spec.edmcouncil.org/fibo/)**: Copyright © [EDM Association dba EDM Council, Inc.](https://edmcouncil.org/) and [Object Management Group, Inc. (OMG)](https://www.omg.org/). Licensed under the [MIT License](https://opensource.org/licenses/MIT).
- **[ISO Standards](https://www.iso.org/standards.html)**: Copyright © [International Organization for Standardization (ISO)](https://www.iso.org/). All rights reserved.
- **[Schema.org Vocabulary](https://schema.org/)**: Copyright © [Schema.org Sponsors](https://schema.org/docs/about.html). Licensed under the [Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/) license.
- **W3C Ontologies and Vocabularies**: Copyright © [World Wide Web Consortium](https://www.w3.org/). Licensed under the [W3C Software and Document Notice and License](https://www.w3.org/copyright/software-license-2023/). Including:
  - [Data Catalog Vocabulary (DCAT) - Version 3](https://www.w3.org/TR/vocab-dcat/)
  - [Extensible Markup Language (XML) 1.0 (Fifth Edition)](https://www.w3.org/TR/xml/)
  - [OWL 2 Web Ontology Language (OWL)](https://www.w3.org/TR/owl2-overview/)
  - [Resource Description Framework (RDF) 1.1](https://www.w3.org/TR/rdf11-concepts/)
  - [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/)
  - [SKOS Simple Knowledge Organization System](https://www.w3.org/TR/skos-reference/)
  - [Time Ontology in OWL](https://www.w3.org/TR/owl-time/) (including Gregorian calendar definitions)
  - [W3C XML Schema Definition Language (XSD) 1.1](https://www.w3.org/TR/xmlschema11-1/)

### Agent definition lookup with WebMCP

Supported WebMCP clients can retrieve the authored, versioned definition of an
exact named ontology entity from the ontology HTML page open in the current
tab. See [WebMCP ontology entity definition lookup](docs/webmcp-ontology-entity-definition-lookup.md).

### Page-independent access with a local MCP server

The distributable Universal Ontology MCP server exposes the read-only
`search_entities` and `resolve_entity` tools over `stdio`. An MCP host launches
the process locally, so definition lookup remains available with every website
and browser page closed. Software search and resolution run locally. The server
can read ontology catalogs and indexes either directly from a generated
filesystem tree or from a configured HTTP artifact origin with a verified local
cache.

The server is currently development-only: no public package, image, Registry
record, or GitHub Release is an installation source. See the
[local MCP installation and operation guide](docs/mcp/local-installation.md)
for trusted-checkout, local package/archive/container, and short-lived GitHub
Actions-artifact use.

For a repository-local contributor installation, the hardened
`scripts/set_up_mcp_servers.py` command builds and verifies the Universal
Ontology `stdio` bundle, installs the checksum-verified official GitHub MCP
Server beside it, and transactionally updates the supported project-scoped host
documents. By default it regenerates `dist/query/v1`, configures the server to
read that filesystem tree, and proves the staged server with a real `Person`
query before activation. HTTP artifacts remain an explicit setup option; their
rapidly changing data is not bundled into the installed software. The exact
commands for switching sources, generated paths, authentication behavior,
read-only drift check, and rollback guarantees are documented under
[Install both repository-local MCP servers](docs/mcp/local-installation.md#install-both-repository-local-mcp-servers).

WebMCP and the installed server are complementary. WebMCP is page-scoped and
inherits the lifecycle of an open supporting page; the installed MCP process is
page-independent and available to any configured local host.

### Repository-only MCP development

Contributors testing the Streamable HTTP adapter and repository-generated
query artifacts can instead use the fixed loopback development server. It is a
separate development topology documented in the
[local MCP development guide](docs/mcp/local-development.md); it is not the
installed `stdio` server and must not be exposed beyond loopback.
