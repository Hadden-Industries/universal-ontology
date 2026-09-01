# Universal Ontology

**Set of concepts and categories, applicable to almost all domains, that shows their properties and the relations between them**

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
