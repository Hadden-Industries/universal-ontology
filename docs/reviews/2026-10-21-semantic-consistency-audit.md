# Semantic consistency audit: source, generated artifacts, website and query/MCP surfaces

**Status:** Final review report. Planning and review only.
**Date:** 21 October 2026.
**Repository:** `Hadden-Industries/universal-ontology`, branch `main`, commit `eb653e5c598dbe90f019c3f023e8c52f2b767edf` (2026-10-20 18:03:46 +0300).
**Working tree at start:** `AGENTS.md` modified (user-owned, untouched); `docs/reviews/2026-10-21-entity-browser-design.md` untracked (entity-browser thread, untouched).
**Related repository:** `C:\Users\maksy\GitHub\owlapi` was not needed beyond the public issue; the consumer's selected dependency is `git+https://github.com/Hadden-Industries/owlapi.git#e15320d6438b27c5aaa7aa9302b6919749873ec9` (`package.json` line 102).

## How to read this report

Nothing was installed, built, regenerated, executed, tested, committed or published.
Evidence comes from three places, and every finding says which one it uses:

- **Source:** behaviour read directly from code, documents, ontology files and Git history. Line references are `file:line`.
- **Retained:** generated artifacts already on disk before this review (mainly under `dist/` and `.sdlc/runtime/policy-reports/`), inspected read-only with text tools and `sha256sum`.
- **Predicted:** what the code would produce for a given input. These are reasoned traces, not reproduced failures.

Finding classes: **SC** confirmed source contradiction; **PD** plausible defect; **IL** intentional limitation; **AE** accepted exception; **EG** evidence gap.

## 1. Summary

The core closure pipeline is sound against its own contract: it fails closed, attributes ontology metadata only to the root, keeps imported axioms, and publishes atomically. The material problems sit at the boundaries *between* surfaces, where one shared policy or artifact family is interpreted differently by different consumers.

The most important conclusions, in priority order:

1. **Two producers write different query catalogs to the same directory (SC, observed).**
   The website build calls the shared query-artifact generator without the source catalog, ownership inventory or repository root (`scripts/build/ontologyAssets.js:54-55`).
   The CLI generator used for MCP passes all three (`scripts/generateOntologyQueryIndexes.js:171-191`).
   Both write `dist/query/v1/`, which is also the local MCP default root (`.mcp.json:23`, `.agents/mcp_config.json:23`).
   The retained `dist/query/v1/catalog.json` (written 2026-10-05) is the website variant: all 164 releases have `"activePublication": false`, `"ownedNamespaces": []`, `"ownershipPolicySha256": null` and `"catalogSha256": null`, and it lists 121 `not_catalogued` imports (SKOS, OWL-Time, Gregorian months and others).
   Against that catalog the documented definition-review request (`active_publications` + `root_module`) is predicted to fail. The generator's own comment claims both publishers expose byte-identical documents (`scripts/build/createOntologyQueryArtifacts.js:115-118`).
2. **Query and MCP surfaces report dataset and ontology descriptions as definitions (PD, data-confirmed).**
   The projection history keeps `dcterms:description` as an *applicable* definition property for every Universal release, including after the switch to `skos:definition`.
   The website table uses that retention only to keep citations of identical text (tested in `tests/ontology-view-model.test.js:184-247`).
   The query index and MCP context treat every such literal as a definition assertion.
   In `src/universal/reference-data/20260912`, 138 `dcat:Dataset` individuals have a `dcterms:description` and no `skos:definition` (for example `"N/A"@en`). The retained index records `"N/A"` as the dataset's lexical definition, and the ontology-context guide's counts (`docs/mcp/ontology-context.md:144-146`) include these as root-owned uncited definitions.
3. **A published dated release was amended in place (AE, owner-approved, provenance caveat).**
   `src/iso-iec/11179/-3/ed-4/20260912` gained one `owl:AnnotationProperty` declaration on 5 October (commit `ece0315`); its SHA-256 changed from `f532f33c…` to `b621c3d5…` under the same version IRI. `policy/activation.ttl:27` and `:101` record the approval and the new digest.
   Consumers that pin by version IRI alone (WebMCP, caches, catalogs) can no longer assume one byte sequence per version IRI.
4. **The WebMCP `sourceIris` field omits definition-level citations (IL, high misreading risk).**
   For `core:Activity` the definition is cited by Lexico and WordReference, the HTML table lists both, MCP context reports `definition_source_recorded`, but WebMCP returns `sourceIris: []` because it projects only entity-level `dcterms:source`.
5. **The UML/XMI export adds constraints the ontology does not state (PD).**
   It sets an upper bound of 1 on every datatype property without a restriction, merges cardinalities across restrictions with different fillers, and ignores the projection-property history (pre-transition releases lose all definitions).
6. **Verification shares parsers with the thing it verifies (EG).**
   The real-distribution closure oracle reloads sources with the same OWLAPI parser; JSON-LD "equivalence" compares the JSON-LD with the same streaming parser's quads. The only independent-implementation evidence (Java OWLAPI 5.5.1, `javaOutcome: MATCH`) is bound to the historical rc.1 tarball, not the current Git dependency.
7. **Documentation drift (SC, low):** the WebMCP guide still describes query artifact format version 1 and six entity kinds; the code reads format 2 and also returns `named_resource`.
8. **Latent divergences that the current corpus does not trigger:** text decoding (fatal on one path, U+FFFD replacement on the other) and base-IRI resolution differ between the closure path and the streaming path. All 164 dated releases are valid UTF-8 and declare `xml:base`, so none fires today.

No ontology definition needs rewriting to resolve any of these. Every fix belongs in a transformation, a projection rule, a test, or documentation.

## 2. Surface contract and lineage matrix

### 2.1 Lineage

```text
working files (core/universal-core.owl …) + catalog-v001.xml + policy/*.ttl
   │ E1 authored release process (SHACL editing policy; not traced in detail)
   ▼
src/<family>/<yyyymmdd>  RDF/XML, xml:base declared; external vocabularies in src/external/
   │
   ├─E2─ OWLAPI loader (fatal decoding; base = root file: URL; catalog + release mappings)
   │        └─E3 merger → root ID + root annotations ─E4 RDF/XML save → offline reload → fingerprint → atomic rename
   │              → <date>-full ─E5 streaming parser → -full.jsonld ─E6 view model → -full.csv
   │
   ├─E7─ rdfxml-streaming-parser (Buffer.toString; fallback base = public directory URL)
   │        ├─ .jsonld (round trip against the same quads) ─E8 view model → .csv and HTML table
   │        └─E11 release query index + RDFC-1.0 N-Quads dataset → catalog.json (two producers)
   │                 ├─E12 channel manifest → E15 remote MCP (HTTPS, lexical only)
   │                 ├─E13 WebMCP (same-origin, page-pinned)
   │                 └─E14 local MCP (filesystem, snapshotRef, Oxigraph worker)
   ├─E9─ raw RDF/XML DOM → UML/XMI (browser, on demand)
   └─E10 aliases: latest (byte copy), latest-unstable (regex import rewrite) → rendered via E7/E8
policy/activation.ttl + scripts/ontology_policy/modules.py ─E17→ ownership inventory → catalog (CLI producer only)
saved working file ─E16→ working snapshot (CLI --source)
```

### 2.2 Edges

| Edge | Authority and transformation | Identity binding | Failure behaviour |
| --- | --- | --- | --- |
| E2 load closure | OWLAPI strict loader; catalog then authored IRI; offline in builds (`fullOntologyAssets.js:41-47`) | Root ID from parsed header; document digests recorded per load | Fatal on diagnostics, unparsed triples, synthesized declarations, missing imports (`assertLosslessOntologyLoad.js`) |
| E3 collapse | `OWLOntologyMerger` + `SetOntologyID` + root annotations (`collapseImportsClosure.js:14-52`) | Root `OWLOntologyID` | Throws if ID, imports, annotations or axiom union differ |
| E4 publish `-full` | Save → temp → fresh offline reload → structural fingerprint → rename (`atomicOntologyWriter.js`, `verifyStandaloneOntology.js`) | Root version IRI; receipt binds output SHA-256 | Destination unchanged on failure; build receipt not sealed |
| E5/E6 full alternates | Streaming parse of `-full` with fallback base = ontology IRI (`fullOntologyAssets.js:405-417`) | Receipt output hashes | Throws on JSON-LD round-trip mismatch; CSV unchecked |
| E7 per-release JSON-LD | Streaming parse, serializer, quads-to-JSON-LD round trip (`rdfXmlToJsonLd.js:261-296`) | Path, not digest | Build fails |
| E8 view model | Path-keyed projection properties; classes and named individuals in `https://haddenindustries.com/` only (`ontologyViewModel.js:325-454`) | Path | No verification |
| E9 XMI | XML DOM walk of RDF/XML (`OwlToUmlXmiConverter.js`) | None | Browser console error only (`ontology.js:328-342`) |
| E10 aliases | Greatest dated name per directory; regex rewrite of internal imports (`ontologyAliases.js:17-81`) | Keeps the dated `owl:versionIRI` | Fails only if no import was rewritten |
| E11 index/catalog | Worker projects quads; immutable objects then `catalog.json` last (`generateOntologyQueryIndexes.js:117-132`) | `sourceArtifactSha256`, `queryIndexSha256`, dataset SHA-256, `snapshotId` | Source change during generation aborts publication |
| E12 channel | Validates current catalog bytes and every release (`stageOntologyQueryArtifactChannel.js:168-226`) | Catalog SHA-256 | Stages nothing on invalid input |
| E13 WebMCP | Same-origin fetch; index digest verified; displayed release must match catalog release (`createOntologyEntityDefinitionResolver.js:156-177`) | Family, version tag, ontology IRI, version IRI from the page | `DISPLAYED_RELEASE_IDENTITY_MISMATCH`; tool not registered for unindexed documents |
| E14 local MCP | Catalog/dataset digests; snapshotRef; Oxigraph worker | `snapshotRef` (catalog, root, graph set, dataset digests) | Explicit errors; bounded, with omission flags |
| E15 remote MCP | Verified channel/catalog/index cache; filters and context rejected (`createOntologyQueryModule.js:928-940`; `createUniversalOntologyMcpServer.js:307-322`) | Channel snapshot pinned per process | `QUERY_INDEX_UNAVAILABLE` for local-only features |

### 2.3 Surface contracts

| Surface | Documented contract (scope) | Lossy by design | Owner and main tests |
| --- | --- | --- | --- |
| Dated release | Authored RDF/XML; dated releases are treated as immutable | No | Editing policy; `scripts/validate_ontologies.py` |
| Activation policy | Names the active artifact path and content digest per module | No | `policy/activation.ttl`; Python policy tests |
| `-full` RDF/XML | Structural axiom union; root identity and root annotations only; no imports; strict offline reload (contract §3-§4) | Imported headers, module membership, syntax layout | `scripts/ontology/*`; `tests/import-closure/*` |
| `-full.jsonld` | RDF graph of the `-full` document | Same as `-full` | `fullOntologyAssets.js`; `tests/import-closure/create-full-versions.test.js` |
| Per-release `.jsonld` | Same RDF graph as the parsed release | None intended | `rdfXmlToJsonLd.js`; `tests/rdf-xml-to-json-ld.test.js` |
| HTML table and `.csv` | One row per UO-namespace class or named individual; selected label and definition; merged sources; named superclasses | Properties, datatypes, DCAT datasets/distributions, external IRIs, other languages, class expressions | `ontologyViewModel.js`, `ontologyCsv.js`; `tests/ontology-view-model.test.js`, `tests/ontology-csv.test.js` |
| XMI | UML class model; not documented as a semantic contract | Undefined | `OwlToUmlXmiConverter.js`; `tests/owl-to-uml-xmi-converter.test.js` (5 cases) |
| `latest`, `latest-unstable` | Mutable document aliases; version IRI is the immutable identity (WebMCP guide 56-77) | `latest-unstable` rewrites imports | `ontologyAliases.js`; `tests/build/ontology-aliases.test.js` |
| Release query index | Asserted data of one source graph; no imports, inference or flattening (`createOntologyReleaseQueryIndex.js:422-430`) | Class expressions, non-UO properties | query package tests |
| Query catalog | Release list with latest-stable and active-publication flags, ownership, import coverage, dataset reference | Producer-dependent (finding F-01) | `createOntologyQueryArtifacts.js`; `tests/build/ontology-query-artifacts.test.js` |
| WebMCP | Exact entity in the page's release; selected label and definition; UUID URNs; entity-level source IRIs (guide 17-21, 233-234) | No imports, no inference, five-item caps | `src/webmcp/*`; `tests/webmcp/*` |
| Local MCP search/resolve | Lexical search and resolution over the selected catalog releases | Selection rules | MCP and query package tests |
| Local MCP context | Asserted RDF and projected OWL structure kept separate; exact definition citations; bounded with explicit omissions (context guide) | Bounds | `ontologyContextQueries.js`; context tests |
| Remote MCP | Lexical search and resolution only (README "Runtime boundary") | Context, filters, cursors | MCP server tests |

## 3. Representative entities

Hashes are of the current working-tree files; all are Git-tracked.

| Sample | Release and SHA-256 | Source lines | Boundary exercised |
| --- | --- | --- | --- |
| `core:AddressRelationship` | `src/universal/core/20260912`, `214f21e9116c0515bd52e5e8e893c83fcf93eb4ce586a49dbd8afc8a05e2c190` | 2285-2314 | Three qualified exact-cardinality restrictions in blank nodes; filler from reference data; uncited definition |
| `core:Activity` | same | 2135-2158 | Named superclass plus minimum-zero restriction; two identifiers (SNOMED IRI and UUID URN); definition-axiom citations |
| `core:Organisation` | same | block with `en-gb`/`en-us` labels | Two preferred labels in different languages |
| `core:Product` | same | `skos:definition xml:lang="en-us"` | Definition only in a non-preferred language |
| Core ontology header `…/universal/core/` | same | 18-25 | Ontology-level `dcterms:description` |
| `core:ProductOrService` | `src/universal/core/20260423`, `470ed6b1f22ed510384cf1497c783d24f7c2600522369fdc7619ea15e8f019e6` | 3746-3765 | Historical properties (`dcterms:title`, `dcterms:description`, `dc:creator`); `owl:unionOf` class expression; scheme-only source IRI `iso:std:iso:22300:ed-3:v1:term:3.1.191`; `rdfs:label` that differs from the title |
| `extended:GLONASS` | `src/universal/extended/20260912`, `92ad97ccb1acf4f2413dc3f1100433adbaa965ce98821f863de9df22eced7f24` | 10058-10065 | Russian `skos:altLabel` on a named individual |
| Dataset `…/dataset/a038cfce-5334-48a9-86b0-283b81069162` | `src/universal/reference-data/20260912`, `1354d260a8bf33d0e67b6145b45438be719203f71e0280d61fc498b697860260` | dataset block | Individual that is also a `dcat:Dataset`; `dcterms:description "N/A"@en`; SDMX URN identifier; owned through `/ontology/dataset/` (`policy/activation.ttl:73-75`) |
| `vann:preferredNamespacePrefix` declaration | `src/iso-iec/11179/-3/ed-4/20260912`, now `b621c3d545343cbfab9e8c41cf296046df32722204b8ff76251b7b5a6f3a2e74`, previously `f532f33c8a511261d17bd645b5ded1a538c896aebb83eee4a4d9681e75ed2213` | added by `ece0315` | In-place amendment of a published release |
| `core:QuantityValue_numericalQuantityValue` | core `20260912` | DatatypeProperty block; `QuantityValue` class at 4638-4639 | Non-functional datatype property with no cardinality restriction |

No punned IRIs (one IRI declared with two OWL entity kinds) were found in the three `20260912` Universal releases by text inspection.
"Multi-role" coverage therefore relies on the dataset individual (OWL individual plus DCAT dataset), the ontology header treated as an entity, and core entities that also appear in extended and in `-full` closures.

## 4. Worked entity traces

### 4.1 `core:AddressRelationship` (core `20260912`)

Source: `skos:definition "Way in which Addresses are connected"@en`; `skos:prefLabel` and `rdfs:label "Address Relationship"@en`; `dcterms:identifier <urn:uuid:5c5e6851-34ed-49dd-b45d-6bf3db156690>`; three `rdfs:subClassOf` restrictions with `owl:qualifiedCardinality 1` on `hasAddressIs`/`Address`, `hasAddressOf`/`Address`, `hasAddressRelationshipType`/`reference-data:AddressRelationshipType`; no `dcterms:source`, no annotated axiom.

| Surface | Expected or observed output | Verdict |
| --- | --- | --- |
| HTML/CSV | Class row; label and definition as above; Sources empty; Superclasses empty (blank nodes filtered at `ontologyViewModel.js:408-410`) | Consistent within its projection |
| Query index, WebMCP | `entityKinds: ["owl_class"]`; label and definition with basis `preferred_language_lookup` (`en-GB` truncates to `en`); `directNamedSuperclassIris: []`; one UUID URN; `sourceIris: []` | Consistent |
| MCP context | Three restriction connections with roles, qualifiers and cardinality 1; `no_recorded_source` (context guide 133-136 records this local observation) | Consistent; restrictions are not reported as facts |
| XMI | Properties have domain `AddressRelationship` and range equal to the filler, so each attribute is predicted as `[1..1]` | Consistent for this case |
| `-full` | Restrictions retained structurally; blank-node labels and layout differ | Consistent with contract §9 |

### 4.2 `core:Activity` (core `20260912`)

Source: `rdfs:subClassOf core:Event`; `owl:minQualifiedCardinality 0` on `Activity_hasResource` with `owl:onClass core:Resource`; identifiers `<http://snomed.info/id/257733005>` and `<urn:uuid:de266b65-ae3e-4fca-9d85-e131471584de>`; definition `"Deed, action, or function that a person or group does or has done"@en`; an `owl:Axiom` (lines 2153-2158) cites `https://www.lexico.com/en/definition/activity` and `https://www.wordreference.com/definition/activity` for exactly that definition.

| Surface | Expected or observed output | Verdict |
| --- | --- | --- |
| HTML/CSV | Sources column lists both URLs (merged from the definition axiom, `ontologyViewModel.js:367-398`); Superclasses `core:Event` | Intentional merge (tested at `tests/ontology-view-model.test.js:124`) |
| Query index (retained) | Definition assertion carries both URLs in `assertionAnnotations`; `entitySourceIris: []` (`dist/query/v1/releases/universal/core/20260912/e16d3565….json`, lines 2272-2288) | Observed |
| WebMCP | `sourceIris: []`, `sourceIriCount: 0`, because only `entitySourceIris` is projected (`createOntologyEntityDefinitionResolver.js:214-259`) | **F-04**: a cited definition looks uncited |
| MCP context | `definition_source_recorded` with both sources; minimum zero kept as structure (context guide 133-137) | Consistent |
| XMI | Attribute `Activity_hasResource` `[0..*]` | Consistent |

### 4.3 `core:ProductOrService` (core `20260423`, pre-transition)

Source: `dcterms:title "Product Or Service"@en`, `rdfs:label "ProductOrService"@en`, `dcterms:description "Output or outcome provided by an organisation to interested parties"@en-gb`, `dc:creator`, `dcterms:source <iso:std:iso:22300:ed-3:v1:term:3.1.191>`, `owl:equivalentClass` of an `owl:unionOf (core:Product core:Service)` class expression, `rdfs:comment` examples.

| Surface | Predicted output | Verdict |
| --- | --- | --- |
| HTML/CSV | Label "Product Or Service" (`dcterms:title` for this version); definition from `dcterms:description`; Sources `iso:std:…` | Follows projection history |
| Query index, WebMCP | Same label and definition; `iso:std:…` is entity-level, so it appears in `sourceIris` if the IRI schema accepts the `iso:` scheme (not verified) | Follows history |
| MCP context | `labels` come only from `skos:prefLabel` and `rdfs:label` (`ontologyContextQueries.js:345-351`), so the packet shows "ProductOrService", not "Product Or Service"; definition via the applicable `dcterms:description`; status `entity_source_only` | **F-12**: label differs from the other surfaces |
| XMI | Class name "ProductOrService" from `rdfs:label`; **no definition comment**, because the converter reads only `skos:definition` (`OwlToUmlXmiConverter.js:546-569`) | **F-05** |

The legacy rule that promotes `dcterms:references` values starting with `urn:iso:std` (`field-property-history.v1.json:8-30`) does not apply here: this value is already `dcterms:source`. Its scheme is `iso:`, so it would not match the `urn:iso:std` prefix anyway. This is an authored-data observation for the owner, not a transformation defect.

### 4.4 Dataset `a038cfce-…` (reference-data `20260912`)

Source triples include:

```turtle
<https://haddenindustries.com/ontology/dataset/a038cfce-5334-48a9-86b0-283b81069162>
    a owl:NamedIndividual , dcat:Dataset ;
    dcterms:description "N/A"@en ;
    dcterms:title "Eurostat Activity And Employment Status Codelist Version 12"@en ;
    rdfs:label "Eurostat Activity And Employment Status Codelist Version 12"@en ;
    dcterms:identifier <urn:sdmx:org.sdmx.infomodel.codelist.Codelist=ESTAT:WSTATUS(12.0)> .
```

| Surface | Output | Verdict |
| --- | --- | --- |
| HTML/CSV | No row (DCAT datasets excluded, `ontologyViewModel.js:350-352`) | Intentional scope |
| Query index (retained) | `lexicalDefinitionAssertions: [{ assertionPropertyIri: dcterms:description, lexicalForm: "N/A", languageTag: "en" }]` in `…/reference-data/20260912/009a0012….json` | Observed; **F-02** |
| WebMCP | Predicted `selectedLexicalDefinition` = `"N/A"` from `dcterms:description` (no `skos:definition` competes) | **F-02** |
| MCP search | Counted as a root-owned `no_recorded_source` definition (dataset namespace is owned, `policy/activation.ttl:73-75`; counts at `docs/mcp/ontology-context.md:144-146`) | **F-02** |
| MCP context | Labels from `rdfs:label`; definition "N/A" | **F-02** |

### 4.5 Language variants

- `core:Organisation`: `"Organisation"@en-gb` and `"Organization"@en-us`. The table (`["en-gb","en"]`, `ontologyViewModel.js:182`), the query module (`createOntologyQueryModule.js:302-342`) and XMI (`LANG_PRIORITY`, line 46) all select "Organisation"; exact-label lookup accepts either spelling. Consistent.
- `core:Product` and `core:Service`: the only definition is `@en-us`; every surface shows it; WebMCP marks it `deterministic_fallback`. Consistent.
- `extended:GLONASS`: the Russian `skos:altLabel` is searchable through MCP search (`alternative_label` candidates) but not through WebMCP, which accepts only preferred labels, IRIs and UUIDs. Documented limitation.
- Every language tag in the corpus is already lowercase (`en`, `en-gb`, `en-us`, `ru`, `zxx`), so case normalization (finding F-15) changes nothing today.

### 4.6 ISO/IEC 11179-3 ed-4 `20260912` amendment

`git show ece0315 -- src/iso-iec/11179/-3/ed-4/20260912` adds:

```turtle
<http://purl.org/vocab/vann/preferredNamespacePrefix> a owl:AnnotationProperty .
```

Retained catalogs show the source digest change under the same release identity: `dist/query/v1/catalogs/25eae0ed….json` (2026-09-23) records `f532f33c…`; `7b643318….json` (2026-10-05, the current `catalog.json`) records `b621c3d5…`.
The entity kind of the VANN IRI in this release moves from `named_resource` to `owl_annotation_property`; no definition changes.

## 5. Audit by theme

### 5.1 IRI and base resolution, roles, ambiguity and blank nodes

- **Base IRI.** The closure path parses the root with its `file:` URL as document IRI (`ontologyDocumentLoader.js:303-315`) and imports with their mapped `file:` URLs (`:286-294`). The streaming path uses `https://haddenindustries.com/ontology/<directory>/` (`ontologyAssets.js:11-13`); Turtle imports in the query generator use the import IRI (`ontologyAssetWorker.js:45-56`). All 164 dated releases declare `xml:base`; the one relative-looking reference (`iso:std:…` in core `20260423`) is an absolute IRI with an `iso:` scheme. `skos.rdf` and `time.rdf` declare `xml:base`; `dc.rdf`, `dcterms.rdf` and `dcat3.rdf` have no relative references. Latent only (F-10). `tests/build/ontology-assets.test.js:175-210` fixes the website fallback for a baseless `-full` document; nothing fixes the closure path's behaviour.
- **Root identity.** Discovery checks the header and version IRI for every dated release with the streaming parser (`fullOntologyAssets.js:145-157`), but it compares the OWLAPI-parsed identity only for roots *without* imports (`:167-184`). For importing roots the published `-full` identity is whatever OWLAPI parsed (F-10).
- **Roles.** The query index gives every named node in any position an entity description, including citation URLs and external vocabulary IRIs, with kind `named_resource` when no OWL type is asserted (`createOntologyReleaseQueryIndex.js:498-505`, `:379-381`). The table shows one row per class or individual and labels a class that is also an individual as "Named Individual" (`ontologyViewModel.js:402-413`). `classOfNamedIndividual` is the first non-OWL `@type` and can be a blank-node label. Latent; no punning found.
- **Ambiguity.** WebMCP returns `ambiguous` with candidates. MCP context resolution throws `UNKNOWN_ENTITY` for ambiguous labels (`createNodeOntologyQueryModule.js:444-457`); the message says "missing or ambiguous" (`ontologyQueryErrors.js:8-11`) but no candidates are returned, unlike the plan's AC-002 (F-13).
- **Blank nodes.** The closure standardizes anonymous individuals apart; `tests/import-closure/collapse-imports-closure.test.js:7-50` has a hand-written oracle with `_:same` in two Functional-syntax modules. RDF/XML `rdf:nodeID` is not exercised by tests, and no current release uses it. Context queries scope blank nodes by graph; the view model filters blank nodes from superclasses; XMI resolves restrictions by DOM ancestry, so restrictions nested in anonymous classes are dropped (`OwlToUmlXmiConverter.js:177-201`).

### 5.2 Literals: spelling, datatype, language, direction and property history

- **Spelling.** JSON-LD and the index keep lexical forms. CSV prefixes `'` to values starting with `=`, `+`, `-` or `@`, joins multi-values with `\n`, and does not quote a lone `\r` (`ontologyCsv.js:16-32`). XMI collapses whitespace. These are projections, but undocumented ones (F-14).
- **Datatype.** The index enforces the RDF rule that only `rdf:langString` carries a language (`ontologyQuerySchemas.js:397-415`). The view model infers datatypes for native JSON values (`ontologyViewModel.js:121-162`).
- **Language.** The streaming parser lowercases tags; the test asserts `en-GB` → `en-gb` (`tests/rdf-xml-to-json-ld.test.js:82-113`), and the index lowercases again (`createOntologyReleaseQueryIndex.js:67`, `:93`). RDF 1.1 defines the value space of language tags as lowercase, so this is not a semantic loss; the WebMCP guide's "preserves … language tag" means the value, not the authored spelling (F-15).
- **Selection rules differ by surface.** The table uses the current property only, prefers `en-gb` then `en`, else the first literal in JSON-LD order. The query module ranks language before property history, uses lookup truncation, prefers untagged over other languages, then sorts deterministically. XMI uses `skos:prefLabel` or `rdfs:label` and `skos:definition` only. They agree for the current corpus samples; they diverge when an entity has an untagged literal plus a non-English one, two non-preferred languages, or a preferred-language legacy property (F-16, latent).
- **Projection-property history.** One API (`resolveApplicableOntologyProjectionPropertyIris`) is used for two different jobs: citation matching for identical text in the view model, and "which predicates are definitions" in the query index and MCP context (F-02).
- **Direction.** Accepted exception (F-17). No dated release contains `its:dir` or `rdf:dir`; the closure path reads RDF/XML and Turtle, so the JSON-LD input exception is not exercised by maintained inputs. The query index does not represent direction (WebMCP guide 231-232).

### 5.3 Imported versus root assertions; header versus axiom attribution

- The closure keeps imported annotation assertions and drops imported ontology annotations (contract §4). `-full.jsonld` and `-full.csv` inherit that: imported ontology titles disappear, imported entities appear under the root's identity, and the CSV applies the root's projection-property history to imported entities (`fullOntologyAssets.js:405-417` passes the root path). For current imports, all at transition-era dates, this changes nothing.
- The query index and MCP context treat the ontology header IRI as an entity. Its `dcterms:title` becomes a preferred label and its `dcterms:description` a "definition" (retained core index lines 2130-2142; F-02).
- Per-release query artifacts never materialize imports (WebMCP guide 221-224). Local MCP context can add catalogued imports as separate graphs with provenance.

### 5.4 Asserted facts, projected restrictions and inferred claims

- The query index and WebMCP report only named superclasses; restrictions are omitted, not flattened (`createOntologyReleaseQueryIndex.js:364-372`).
- MCP context reports restrictions as structure with witnesses and never as ordinary facts (context guide 50-55).
- XMI is the only surface that *strengthens* meaning: a default upper bound of 1 for datatype properties (`OwlToUmlXmiConverter.js:728-729`), and cross-filler merging of qualified cardinalities (`:731-760`). See F-05.
- No surface runs a reasoner. The HTML table's "Superclasses" are asserted named superclasses only.

### 5.5 Missing imports, truncation, omitted details, unsupported inputs

- The closure is fatal on a missing import; build mapping fails on an unmapped import declared by any root (`fullOntologyAssets.js:360-361`).
- Context generation records unresolved imports as `not_catalogued` or `file_unavailable` (`createOntologyQueryArtifacts.js:328-343`). The website producer has no catalog, so every external import is `not_catalogued` (F-01).
- Context results flag omissions (`detailsOmitted`, truncation reasons, `search_incomplete`). WebMCP caps lists at five with counts and flags. The release index silently drops blank-node annotation values (`toRdfObjectValue` returns `null`, `createOntologyReleaseQueryIndex.js:79-99`, `:183-190`), so structured citations vanish from WebMCP and search without a flag (F-18). MCP context describes them with `complete` flags.
- Unsupported inputs: invalid UTF-8 is fatal on the closure path but replaced on the streaming path (F-09). RDF 1.2 direction on path B is undetermined (F-17).

### 5.6 Aliases, channels, caches, stale artifacts and immutable provenance

- The `latest` alias and the catalog's `latestStableRelease` flag agree (both pick the greatest dated name per family, including future dates). Active publication is a separate selection (context guide 14-16). The website catalog loses it (F-01).
- `latest-unstable` keeps the dated version IRI while its imports change (F-06). WebMCP on that page reports the dated artifact's URL and SHA-256 (`createOntologyEntityDefinitionResolver.js:298-307`).
- A cached older page keeps its authored version IRI. After the ed-4 amendment, a page loaded from the old bytes queries the index built from the new bytes, because the pin is the version IRI, not the content digest (F-03).
- Retained `dist/query/v1/channels/development.json` (2026-08-31) references `catalogs/d879e8c5….json`, a format-1 catalog with 3 releases; current readers would reject it because the schema requires format 2 (F-19, local state).
- Snapshot IDs include the catalog and ownership digests (`createOntologyQueryArtifacts.js:161`), so the two producers mint different `snapshotRef`s for identical source bytes. Snapshot refs are not portable between local and remote artifacts.

### 5.7 Atomic publication and preservation of previous valid outputs

- `-full` outputs: temp file in the same directory, flush, offline verification, rename; cleanup on failure. A failed batch leaves no receipt (`createFullVersions.js`).
- The retained receipt `.sdlc/runtime/policy-reports/full-ontology-build.json` (2026-10-16) lists 24 outputs; all 24 `dist` files match its SHA-256 values (checked with `sha256sum`, observed).
- Query generation writes immutable objects first and swaps `catalog.json` last (`generateOntologyQueryIndexes.js:34-53`, `:117-132`). Channel staging is atomic (`stageOntologyQueryArtifactChannel.js:228-240`).
- The website build writes the same `dist/query/v1/catalog.json` path through Vite, not through the CLI's atomic publisher, and with different content (F-01).

## 6. Test audit: can a shared error pass?

| Comparison | Kind of equality | Independent of the code under test? | Can a shared error pass? |
| --- | --- | --- | --- |
| Collapse unit test (`collapse-imports-closure.test.js:7-50`) | OWL structural, hand-written counts and blank-node identity | Yes (hand oracle) | No, for Functional syntax inputs |
| Offline verifier (`verifyStandaloneOntology.js`) | OWL structural fingerprint (RDFC-1.0 over an encoding) | No: compares the merged model with its own reload | Yes, any parser loss upstream |
| Real-distribution contract (`real-distribution-contract.test.js:101-124`) | OWL structural; "independent" union built by reloading sources with the same OWLAPI parser | Independent of the merger only | Yes, source-to-model loss |
| Historical Java comparison (`docs/import-closure/registry-consumer-qualification.json`) | Structural, different implementation | Yes | Bound to rc.1 tarball `4e18d8a1…`, not the current Git source (F-08) |
| JSON-LD round trip (`rdfXmlToJsonLd.js:94-121`) | RDF graph isomorphism (RDFC-1.0) | No: compares with the same parser's quads | Yes, RDF/XML parse errors |
| Quad parsing test (`rdf-xml-to-json-ld.test.js:82-113`) | Selected hand-written terms | Partly | Mostly no, for the cases covered |
| Query index tests (`ontology-release-query-index.test.js`) | Object equality on hand-authored fixtures | Yes | No, within the fixtures |
| View-model tests | Hand-written rows | Yes | No, but they define projection semantics that the query side does not follow (F-02) |
| XMI tests (5 cases) | XML attribute checks | Yes | Cover split restrictions with one filler; not different fillers, defaults or history |
| JSON-LD direction baseline (`materialize-import-closure-cli.test.js:16-55`) | Characterization of the accepted behaviour | Accepted exception | Not applicable |
| Cross-surface agreement (table vs WebMCP vs MCP vs XMI) | — | None exists | Yes: nothing compares selections, citations or labels across surfaces |

## 7. Findings register

Severity reflects consequence for a reader of the surface, not effort.

| ID | Class | Sev. | Finding | Evidence (status) |
| --- | --- | --- | --- | --- |
| F-01 | SC | High | Website and CLI producers emit different catalogs for the same artifact family into the same `dist/query/v1`; the website variant has no activation, ownership or import-catalog data, yet is the local MCP default root and the remote origin | `ontologyAssets.js:54-55` vs `generateOntologyQueryIndexes.js:171-191`; claim at `createOntologyQueryArtifacts.js:115-118`; `.mcp.json:23`; retained `dist/query/v1/catalog.json` (observed) |
| F-02 | PD | High | Query index and MCP context treat every applicable historical definition property as a definition, so DCAT dataset descriptions and ontology descriptions become "definitions"; the table follows a narrower, tested meaning | `ontologyProjectionProperties.js:231-243`; `createOntologyReleaseQueryIndex.js:475-480`; `createNodeOntologyQueryModule.js:242-257`; `ontologyContextQueries.js:297-305`; `ontologyViewModel.js:328-386`; retained index (observed); 138 datasets (source) |
| F-03 | AE | Med | Dated release ed-4 `20260912` amended in place; one version IRI now has two byte sequences; WebMCP and caches pin by version IRI | `ece0315`; `policy/activation.ttl:27`, `:101`; retained catalogs (observed) |
| F-04 | IL | Med | WebMCP `sourceIris` covers entity-level `dcterms:source` only, so a definition with recorded citations returns an empty list | `createOntologyEntityDefinitionResolver.js:214-259`; retained core index lines 2272-2288 (observed); guide 233-234 |
| F-05 | PD | Med | XMI strengthens and drops semantics: default upper bound 1 for datatype properties; cardinality merged across different fillers; restrictions under anonymous classes or non-domain classes ignored; no projection history | `OwlToUmlXmiConverter.js:177-201`, `:546-569`, `:727-760` (predicted) |
| F-06 | IL | Low | `latest-unstable` keeps the dated version IRI with rewritten imports; WebMCP provenance names the dated artifact | `ontologyAliases.js:17-51` |
| F-07 | SC | Low | WebMCP guide says query artifact format 1 and six entity kinds; code uses format 2 and also `named_resource` | guide 123-133, 222-224, 231; `ontologyQuerySchemas.js:105-113`, `:583`, `:589` |
| F-08 | EG | Med | No independent-implementation oracle for the current OWLAPI Git dependency; same-parser comparisons cannot detect source-to-model loss | Section 6; `package.json:102` |
| F-09 | PD | Low | Decoding differs: fatal with BOM/charset/declaration handling on the closure path; `Buffer.toString("utf8")` replacement on the streaming path. Latent: all 164 releases are valid UTF-8 | `ontologyDocumentLoader.js:20-56`; `rdfXmlToJsonLd.js:239`, `:313` |
| F-10 | PD | Low | Base IRI differs by path for baseless documents; importing roots get no OWLAPI-versus-public identity check. Latent | `ontologyDocumentLoader.js:303-315`; `ontologyAssets.js:11-13`; `fullOntologyAssets.js:167-184` |
| F-11 | PD | Low | `latest-unstable` rewrite needs only one match; other internal imports may stay dated, and non-universal non-ED-4 targets are rewritten to aliases that are never generated. Latent | `ontologyAliases.js:8-9`, `:31-48`, `:82` |
| F-12 | PD | Low | Context packet labels use `skos:prefLabel` and `rdfs:label`; index, WebMCP and table use projection history (`dcterms:title` before the transition) | `ontologyContextQueries.js:345-351`; trace 4.3 (predicted) |
| F-13 | IL | Low | Ambiguous label in context and connections returns `UNKNOWN_ENTITY` without candidates | `createNodeOntologyQueryModule.js:454-455`; plan AC-002 |
| F-14 | IL | Low | CSV and XMI alter cell text (formula guard, joins, whitespace); undocumented | `ontologyCsv.js:16-32` |
| F-15 | IL | Low | Language tags normalized to lowercase on streaming-derived surfaces; documents say "preserved" | `rdf-xml-to-json-ld.test.js:82-113`; `createOntologyReleaseQueryIndex.js:67`, `:93` |
| F-16 | PD | Low | Label and definition selection rules differ between table, query module and XMI for untagged, non-preferred and legacy-property cases. Latent | Section 5.2 |
| F-17 | AE | — | JSON-LD `@direction` dropped by default conversion (accepted Java parity; issues 117 and owlapi 28 open) | contract 149-153; characterization test |
| F-18 | PD | Low | Release index drops blank-node annotation values without a completeness flag | `createOntologyReleaseQueryIndex.js:79-99`, `:183-190` |
| F-19 | EG | Low | Local channel manifest references a format-1 catalog current readers reject | retained `dist/query/v1/channels/development.json` (observed) |
| F-20 | EG | Low | Build receipt `validation` flags are constants; no CSV projection check exists behind `csvProjection` | `fullOntologyAssets.js:433-437` |
| F-21 | PD | Low | Index fabricates `versionIri = sourceArtifactUrl` when none is authored (dependency snapshots, `ed-3/v1`), and silently picks one of several headers | `createOntologyReleaseQueryIndex.js:211-256` |

### 7.1 Counterexamples and source traces for SC and PD findings

**F-01.** Input: the current repository. Steps: website build (Vite plugin → `createOntologyBuildAssets` → `createOntologyQueryArtifacts({ ontologySources, workerCount })`); then the local MCP reads `dist/query/v1`. Oracle: `policy/activation.ttl:55-57` names `src/universal/core/20260912` with digest `214f21e9…` as active. Retained result: `"activePublication": false` for that release. Predicted MCP response to `{"ontologyReleaseSelection":{"selectionKind":"active_publications","ontologyArtifactFamilyIds":["universal/core"]}}`: `UNKNOWN_ONTOLOGY_RELEASE` with the message "has no cataloged latest stable release" (`createOntologyQueryModule.js:128-140`; the Node module repeats the selection at `createNodeOntologyQueryModule.js:86-128`).

**F-02.** Smallest input: one release at path `universal/reference-data/20260912` containing

```turtle
<https://haddenindustries.com/ontology/dataset/x> a owl:NamedIndividual , dcat:Dataset ;
    dcterms:description "N/A"@en .
```

Oracle (projection history, `field-property-history.v1.json:108-115`): from `20260624` the definition field uses `skos:definition`; the view-model tests retain `dcterms:description` only to attach citations to identical `skos:definition` text. Expected: no definition. Trace: `resolveApplicableOntologyProjectionPropertyIris("universal/reference-data/20260912","definition")` returns `[dcterms:description, skos:definition]` (`ontologyProjectionProperties.js:231-243`), so the index adds `"N/A"` to `lexicalDefinitionAssertions` and the context adds it to `definitions`. Observed in the retained index.

**F-05.** (a) Default bound: `core:QuantityValue_numericalQuantityValue` (non-functional; no restriction on `QuantityValue` for it) is predicted as `[0..1]`; OWL permits any number of values. (b) Different fillers:

```turtle
:C rdfs:subClassOf [ a owl:Restriction ; owl:onProperty :p ; owl:qualifiedCardinality 1 ; owl:onClass :A ] ,
                   [ a owl:Restriction ; owl:onProperty :p ; owl:minQualifiedCardinality 2 ; owl:onClass :B ] .
:p rdfs:domain :C ; rdfs:range :R .
```

Trace: lower bound search tries `minQualifiedCardinality` first → 2 (from `:B`); upper bound search reaches `qualifiedCardinality` → 1 (from `:A`). Predicted multiplicity `[2..1]`. (c) History: core `20260423` has 0 `skos:definition` and 108 `dcterms:description`, so XMI comments carry no definitions.

**F-07.** Compare the guide's "release query artifact format version 1" with `queryArtifactFormatVersion: z.literal(2)`; WebMCP reads through the shared parser.

**F-09.** Input: a release whose literal contains byte `0xFF`. Closure: `UnloadableImportError` (`INVALID_ENCODING`). Website/query: the literal contains U+FFFD in JSON-LD, CSV, table and index; the JSON-LD round trip passes because both sides already contain U+FFFD.

**F-10.** Input: `<owl:Class rdf:about="Term"/>` with no `xml:base`, at path `universal/x/20261101`. Website and index: `https://haddenindustries.com/ontology/universal/x/Term`. Closure: `file:///…/src/universal/x/Term` (predicted from the document IRI). Discovery would reject a relative header for a dated release at or after the cutoff, but an entity IRI is not checked.

**F-11.** Input: a universal release with two internal imports, one written `<owl:imports rdf:resource="&rd;20260912"/>` through an XML entity. Predicted: one import rewritten, the other left dated, no error.

**F-12.** Trace 4.3: index and WebMCP label "Product Or Service"; context packet label "ProductOrService".

**F-16.** Input: `:E skos:definition "Определение"@ru , "Definition"` (untagged). Query module: untagged wins (rank before fallback). Table: `literals[0]`, whichever comes first in JSON-LD array order.

**F-18.** Input: `[] a owl:Axiom ; owl:annotatedSource :E ; owl:annotatedProperty skos:definition ; owl:annotatedTarget "D"@en ; dcterms:source [ dcterms:title "Book" ] .` Index: `assertionAnnotations: []`. Context: `definition_source_recorded` with a described blank-node source.

**F-21.** Input: an imported vocabulary with no `owl:versionIRI` (for example `src/external/skos.rdf` captured as a dependency snapshot). The catalog `versionIri` equals the import IRI, which is not authored as a version IRI.

## 8. Proposed differential and metamorphic tests

| ID | Smallest input | Independent oracle | Existing tests to extend | Boundary owner |
| --- | --- | --- | --- | --- |
| T-01 Producer parity | Two-release fixture plus ownership inventory and catalog | Both producers must emit byte-identical catalogs, or the website catalog must declare unknown fields explicitly | `tests/build/ontology-query-artifacts.test.js`, `tests/build/ontology-assets.test.js` | Query artifact generation |
| T-02 Definition predicate scope | The F-02 dataset fixture plus a transition entity with identical text in both properties | Hand-written: dataset has no definition; transition entity keeps its citation | Query index tests; context tests; view-model tests | Projection policy |
| T-03 Cross-surface selection agreement | One entity per language case (en-gb, en-us only, untagged plus ru, legacy property in preferred language) | Hand-written expected label and definition, applied to view model, query module and XMI | New cross-surface suite | Projection policy |
| T-04 Citation-level agreement | `core:Activity` shape and an entity-level-only source | Hand-written: definition cited vs entity cited, per surface field | WebMCP and context tests | WebMCP, query |
| T-05 Parser differential | Every dated release | Oxigraph's RDF/XML parser (already a dependency) or RDFLib in `.venv`: canonical N-Quads must equal the streaming parser's | `tests/rdf-xml-to-json-ld.test.js` | RDF/XML ingestion |
| T-06 Decoding parity | Invalid UTF-8 byte; ISO-8859-1 declaration; UTF-8 BOM | Hand-written: both paths reject, or both decode identically | Loader and JSON-LD tests | Ingestion |
| T-07 Base and identity parity | Baseless entity IRI; importing root with relative header | Hand-written absolute IRIs; OWLAPI ID equals discovery header for importing roots | `tests/build/ontology-assets.test.js`, `create-full-versions.test.js` | Build discovery |
| T-08 Source-to-model closure | Fixture with every axiom kind in RDF/XML and Turtle, plus nodeID blank nodes | Pinned Java OWLAPI 5.5.1 differential, or a hand-written Functional-syntax expected ontology | `real-distribution-contract.test.js` | Import closure |
| T-09 `-full` metamorphic | Root with one import | Graph of `-full` equals the union of source graphs minus imported headers and `owl:imports`, modulo blank nodes; documented exceptions listed | `create-full-versions.test.js` | Import closure |
| T-10 Alias completeness | Two internal imports (one via entity); one ISO 31073 import | Count of internal import quads before and after; every target exists | `tests/build/ontology-aliases.test.js` | Aliases |
| T-11 XMI faithfulness | F-05 fixtures (a)-(c) | Hand-written UML multiplicities; never stronger than OWL | `tests/owl-to-uml-xmi-converter.test.js` | XMI |
| T-12 Digest-pinned provenance | Release bytes changed under one version IRI | Page or snapshot bound to old digest must report a mismatch, not silently answer from new bytes | WebMCP and query module tests | WebMCP, query |
| T-13 Receipt honesty | CSV projection fault injected | Receipt cannot claim a check that did not run | `create-full-versions.test.js` | Full build |
| T-14 Structured citations | F-18 fixture | Index flags incomplete source evidence or projects it | Query index tests | Query |

## 9. Remediation plan

Slices are ordered by consequence and independence. None needs an ontology edit.

| Slice | Change (where) | Compatibility and migration | Decision or approval |
| --- | --- | --- | --- |
| R-1 | Give one artifact family one producer meaning: pass `repositoryRoot`, the core source catalog and the ownership inventory into `createOntologyQueryArtifacts` from the website path (`scripts/build/ontologyAssets.js`, threaded from the `repositoryDirectory` already given to `ontologyAssetsPlugin`). Add T-01 | Catalog and snapshot IDs change; regenerate; old snapshot refs remain valid only while their artifacts are retained | D-1 |
| R-2 | Separate "definition predicates" from "citation-retention predicates" in the projection policy API; make the index and context use the current property per release; keep the legacy property for citation matching of identical text. Add T-02 | Index content and digests change; same format 2 shape | D-2 |
| R-3 | WebMCP and MCP documentation: format 2, `named_resource`, lowercase tag values, `sourceIris` scope, alias and amendment provenance. Optionally add definition-level citations to the WebMCP result (result schema 2) | Documentation now; schema 2 only if accepted | D-4 for the schema |
| R-4 | XMI: no invented upper bounds; merge only restrictions with the same filler; handle restrictions on non-domain classes as notes; use projection-policy resolvers. Add T-11 | Downloaded XMI changes; document the UML mapping | D-5 |
| R-5 | Independent oracles: T-05 in Jest using Oxigraph; re-run the pinned Java comparison for the current dependency or record where HISEW holds it | A JDK-dependent check in `check:qualification` would be a configuration change | C-3 |
| R-6 | Ingestion parity: reuse the loader's fatal decoding in `rdfXmlToJsonLd.js`; check OWLAPI identity for importing roots; reject baseless dated releases at or after the cutoff | Fails builds that are currently silently wrong; current corpus unaffected | None |
| R-7 | Alias rewrite: compare internal import quads before and after; reject alias targets that are not generated | Current corpus unaffected | None |
| R-8 | Provenance pinning: carry `sourceArtifactSha256` as part of the WebMCP page identity where the page can know it, or document version-IRI-only pinning | Possibly a page-side digest source | D-3 |
| R-9 | Small fixes: return ambiguity candidates from context resolution (F-13); flag dropped blank-node citations (F-18); make catalog and index `versionIri` nullable (F-21, format change); derive receipt flags from executed checks or remove `csvProjection` (F-20) | F-21 is a format change; the others are additive | None, except F-21 format |
| R-10 | Local hygiene: re-stage or remove the stale development channel (F-19) | Local `dist` only | Owner's choice |

### 9.1 Decisions for the owner

**D-1 — Should the website-published query catalog carry the same activation, ownership and import data as the MCP generator?**
Today `dist/query/v1/catalog.json` says `"activePublication": false` for `universal/core/20260912`, while `policy/activation.ttl:55-57` names that file (digest `214f21e9…`) as active.
Option (a), recommended: the website build passes the same inputs, so both producers write identical bytes. Option (b): keep two producers but give the MCP generator its own output root (configuration change C-1). Option (c): make those catalog fields explicitly unknown in website catalogs (format 3).
Unchanged in every option: ontology files, activation policy, index content.

**D-2 — Which literals count as definitions after the property transition?**
Today these triples are reported as definitions by WebMCP and MCP search/context:

```turtle
# src/universal/reference-data/20260912 (and 137 similar datasets)
<https://haddenindustries.com/ontology/dataset/a038cfce-5334-48a9-86b0-283b81069162> dcterms:description "N/A"@en .
# src/universal/core/20260912 (ontology header)
<https://haddenindustries.com/ontology/universal/core/> dcterms:description "Set of concepts and categories, applicable to almost all domains, that shows their properties and the relations between them"@en .
```

Option (a), recommended: after a release's transition date only the current property (`skos:definition`) yields definitions; `dcterms:description` is used only to retain citations for identical `skos:definition` text, matching the tested view-model behaviour. Option (b): keep the applicable set but exclude subjects typed `dcat:Dataset`, `dcat:Distribution` or `owl:Ontology`. Option (c): keep today's behaviour and document it.
Unchanged: every `skos:definition` triple; releases before each transition date keep `dcterms:description` as their definition property; no source file changes.

**D-3 — How should future corrections to a published dated release be identified?**
The 5 October amendment added `<http://purl.org/vocab/vann/preferredNamespacePrefix> a owl:AnnotationProperty .` to `src/iso-iec/11179/-3/ed-4/20260912` (digest `f532f33c…` → `b621c3d5…`). Options: (a) future corrections get a new dated release; (b) in-place corrections stay allowed, with surfaces treating version IRI plus content digest as the identity. The existing amendment stays as approved.

**D-4 — Should WebMCP return definition-level citations?** Adding them changes the result schema (`resultSchemaVersion` 2).

**D-5 — Should the XMI export be "lossy but never stronger" than OWL?** Recommended yes.

### 9.2 Configuration proposals (each needs explicit approval)

- **C-1 (only for D-1 option b):** change `--query-artifact-root-directory=dist/query/v1` in `.mcp.json:23` and `.agents/mcp_config.json:23` to a dedicated directory (for example `dist/query/mcp/v1`). The same value must change in the defaults at `packages/universal-ontology-mcp-server/src/universalOntologyMcpStdioConfiguration.js:448` and `scripts/set_up_mcp_servers.py:1142`, plus the `.codex/config.toml` launcher. Impact: the local MCP stops reading website-produced catalogs; regenerate with `npm run generate:ontology-indexes -- --output dist/query/mcp/v1`; documentation updates.
- **C-2 (D-1 option a):** if threading the repository root needs `scripts/build/createWebsiteConfig.js` or `vite.config.mjs`, those are build configuration. The smallest version reuses the `repositoryDirectory` that `createWebsiteConfig.js:85-90` already passes for full-ontology generation, so neither file should need to change.
- **C-3 (R-5):** adding a JDK-backed Java OWLAPI comparison to the `check:qualification` script in `package.json:37` changes CI and local qualification requirements. The alternative is a separate manual qualification command, which needs no configuration change.

## 10. Contracts and caveats for the entity-browser thread

These are semantic facts the browser can rely on. They do not prescribe UX.

1. **Identity.** A release is identified by version IRI *and* `sourceArtifactSha256`. The version IRI alone does not guarantee bytes (F-03). Snapshot refs bind catalog, root, graph set and dataset digests, and differ between producers.
2. **Selections are distinct.** Latest stable (greatest dated name, future dates included), active publication (activation policy), working snapshot, and document alias (`latest`, `latest-unstable`) are different. Until F-01 is fixed, website-produced catalogs report no active publication.
3. **`latest-unstable`** shares its dated version IRI but rewrites imports.
4. **Scope differences.** The HTML table and CSV show only UO-namespace classes and named individuals, excluding DCAT datasets and distributions. The query index covers every IRI in the graph, with `named_resource` when untyped.
5. **Labels and definitions.** Each surface has its own selection rule (Section 5.2); the query module ranks language before property history. Prefer the query or context result plus its `selectionBasis` and `assertionPropertyIri` when exact provenance matters.
6. **Definitions by property.** A "definition" from `dcterms:description` after a family's transition date may be a DCAT description or an ontology description (F-02). Show the assertion property.
7. **Citations.** Definition-level and entity-level citations are different facts. The CSV/table "Sources" merges them; WebMCP `sourceIris` shows only entity-level IRIs and never literals; MCP context separates them and reports `source_evidence_incomplete`. An empty `sourceIris` does not mean "uncited".
8. **Structure versus facts.** Restrictions are structure. Minimum zero imposes nothing; qualified cardinality constrains successors in the filler class only. Only MCP context exposes restrictions; the table and WebMCP omit them; XMI may overstate them (F-05).
9. **Closures.** `-full` documents carry the root's identity and annotations; imported ontology titles are absent; module membership is not recoverable. WebMCP does not register on `-full` pages.
10. **Literals.** Language tags appear lowercase. Absence of a direction field is not evidence of no direction. CSV text is not exact literal spelling.
11. **Ambiguity.** WebMCP returns candidates; MCP context returns `UNKNOWN_ENTITY` for both missing and ambiguous labels, so disambiguate with search first.
12. **Completeness.** Treat `detailsOmitted`, truncation reasons, `search_incomplete`, `*Truncated` flags and unresolved import coverage as part of the answer.

## 11. Skeptical second pass

| Apparent mismatch | Checked against | Verdict |
| --- | --- | --- |
| `-full` lacks imported ontology titles and module membership | Closure contract §4, §10 | Intended; IL |
| `-full` bytes and blank-node labels differ from sources | Contract §9 (structural gate, not bytes) | Intended |
| JSON-LD drops `@direction` | Contract 149-153; issues 117, 28 | AE; no maintained input carries direction |
| Language tags lowercased | RDF 1.1 language-tag value space | Not a semantic loss; documentation wording only (F-15) |
| Table "Sources" merges citation levels | View-model tests assert the merge | Intended projection; risk only in interpretation |
| Base-IRI divergence for `latest-unstable` (interim report) | `createUnstableAlias` parses only to detect `owl:imports`; rendering uses the directory base | **Withdrawn** for the alias; latent elsewhere (F-10) |
| Decoding divergence | `iconv` check: all dated releases valid UTF-8; 14 declare UTF-8; no BOM | Latent; downgraded to Low (F-09) |
| `activePublication: false` everywhere | Confirmed the retained catalog is the website variant; the CLI producer computes the field | Kept as SC (F-01) |
| ed-4 bytes changed under one version IRI | `policy/activation.ttl:27` records owner approval and requalification | AE, not a defect (F-03) |
| Dataset "N/A" as definition | Context guide reports the counts; view-model tests show the narrower intended meaning | Kept as PD pending D-2 (F-02) |
| XMI `[0..1]` default | No documented XMI contract found; UML defaults are a design choice | Kept as PD because it states a constraint OWL does not (F-05); owner decision D-5 |
| Ambiguous label → `UNKNOWN_ENTITY` | Error text discloses ambiguity; plan AC-002 asked for candidates | Downgraded to IL (F-13) |
| Query index treats citation URLs as entities | Index documented as "every named resource"; WebMCP guide lists six kinds | Documentation gap only (F-07) |
| Index `versionIri` fallback | Every dated release has exactly one named version IRI (build discovery rejects otherwise) | Limited to dependencies and `ed-3/v1`; Low (F-21) |
| Full-build receipt vs `dist` | All 24 outputs match the receipt hashes | No issue beyond F-20 |
| WebMCP on `latest` reports dated provenance | Guide 56-77 | Intended; F-06 only for `latest-unstable` |

## 12. Evidence appendix

- **Documents read:** closure contract and plan (headings, checkpoints), materialization guide, MCP context guide and plan, WebMCP guide, query-data-path plan (historical; its dual `latest`/`all` layout is not implemented in the current code), policy README, development guide, MCP server README, `docs/plans/2026-10-05-generated-full-ontology-publication.md` (DEC-010).
- **Issues:** UO #117 and owlapi #28, both open with no comments (read with `gh issue view`).
- **Release hashes (current):** core `20260912` `214f21e9…c190`; extended `20260912` `92ad97cc…7f24`; reference-data `20260912` `1354d260…0260`; ISO 31073 `20260912` `bca8f977…1319`; ISO/IEC 11179-3 ed-4 `20260912` `b621c3d5…2e74`; core `20260625` `df5d0bbe…987b`; core `20260423` `470ed6b1…19e6`.
- **Retained artifacts inspected:** `dist/query/v1/catalog.json` (2026-10-05); `dist/query/v1/catalogs/` (five catalogs, two format 2); `dist/query/v1/channels/development.json` (2026-08-31); release indexes `…/core/20260912/e16d3565….json` and `…/reference-data/20260912/009a0012….json`; `.sdlc/runtime/policy-reports/full-ontology-build.json` (2026-10-16).
- **Not done:** no execution of any product code, test, validator, build or MCP server; no fetch of the public website or remote artifacts; HISEW records were not inspected, so any HISEW-held Java comparison for the current dependency is unverified.
