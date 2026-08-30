# WebMCP Ontology Entity Definition Lookup Implementation Plan

> **For the implementing agent:** Execute this plan inline, one task at a time. Do not create, delegate to, or use subagents for implementation, review, or verification. Test-driven development is mandatory: no production behavior may be written until its test has been run and observed failing for the expected reason. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agent retrieve the selected authored lexical definition, when present, and immutable release provenance of one exact named ontology entity from the ontology document open in the current browser tab through one read-only WebMCP tool.

**Architecture:** Keep `createOntologyQueryModule()` as the single deep semantic query module already used by the local MCP server. Make that module Web-platform compatible, add a same-origin Fetch adapter beside its filesystem adapter, pin every browser query to the exact immutable release represented by the open page, and project the rich shared result into a compact WebMCP-specific result. WebMCP remains a thin browser adapter; it does not duplicate lookup, indexing, language selection, release selection, integrity verification, caching, or ambiguity logic.

**Tech Stack:** Native ECMAScript modules; the repository-pinned Node.js, Vite 8, Jest 30, Playwright 1.62, Zod 4, and RDF tooling; generated query-artifact format v1; the WebMCP Draft Community Group Report dated 26 August 2026; JSON Schema 2020-12; Fetch, URL, Encoding, Web Cryptography, Abort, OWL 2, RDF 1.1, SKOS, DCMI Terms, BCP 47, and RFC 9562. No package is added and no compatibility package is introduced.

**Spec:** This plan is self-contained. The sections **Normative behavior contract**, **Semantic vocabulary and names**, **Module and adapter design**, and **Acceptance matrix** are normative for implementation.

## Why this plan is being amended

The original plan predated the repository's completed local MCP server. Its central proposal—a new in-memory `OntologyEntityLookup` over table rows—is now the wrong seam. The repository already has a deeper and more complete query implementation:

- `src/ontologyQuery/createOntologyQueryModule.js` owns deterministic search and exact resolution, release selection, historical annotation-property interpretation, language selection, ambiguity, cache bounds, concurrent-load sharing, cancellation, and safe query errors.
- `src/ontologyQuery/createOntologyReleaseQueryIndex.js` and `scripts/generateOntologyQueryIndexes.js` materialize source-graph-preserving, content-addressed release indexes and a catalog.
- `src/ontologyQuery/ontologyQuerySchemas.js` owns the validated domain values and result shapes.
- `src/ontologyQuery/fileSystemOntologyReleaseIndexRepository.js` is the local byte-repository adapter.
- `src/mcp/createUniversalOntologyMcpServer.js` is already a thin outer adapter over that query module.

This amendment therefore removes the planned `src/ontologyEntityLookup.js` and `tests/ontology-entity-lookup.test.js`. It also reverses the old follow-up direction: WebMCP will consume the implemented query module; a future MCP server is no longer hypothetical.

The amendment deliberately does **not** reuse the MCP transport, MCP SDK, loopback HTTP handler, filesystem adapter, MCP `content`/`structuredContent` envelope, or text renderer. Those belong to a different outer adapter and execution environment.

## Global constraints

- The implementation **MUST** follow red–green–refactor for every behavior change. Each red step must fail because the named behavior is absent, not because of a syntax error, broken fixture, or unrelated failure.
- Production code **MUST NOT** be written before its failing test. Refactoring is allowed only from a green state and must be followed by the affected test suite.
- Tests **MUST** name the production defect they catch, use hand-authored expected values, and assert observable results through module interfaces. Test doubles are permitted only at true external seams such as Fetch and `document.modelContext`.
- Implementation, review, and verification **MUST** remain in one agent context. No subagent may implement, review, test, or verify any task in this plan.
- `createOntologyQueryModule()` **MUST** remain the sole authority for index validation, SHA-256 verification, exact entity resolution, preferred-label normalization, language selection, ambiguity, aggregation, caching, and cancellation.
- WebMCP code **MUST NOT** reimplement the query module's normalization or ranking algorithm. In particular, preferred-label equality inherits the shared NFKC, locale-independent lowercase, punctuation/separator/whitespace folding behavior.
- Browser code **MUST NOT** import `node:buffer`, `node:crypto`, `node:fs`, `node:path`, the MCP SDK, or the MCP server/HTTP modules.
- Production code **MUST** use only `document.modelContext`. It **MUST NOT** inspect `navigator.modelContext`, provide a forwarding alias, install a shim or polyfill, call a removed unregister method, or use removed context operations.
- WebMCP **MUST** be progressive enhancement. An unsupported browser must render, sort, filter, and export the ontology exactly as before, without warnings, retries, fallback globals, or WebMCP-specific network requests.
- The public WebMCP surface **MUST** contain exactly one tool named `get_ontology_entity_definition`. The 30-character name meets Chrome's current advisory name budget exactly.
- The tool **MUST** use the imperative API. No declarative form, hidden input, synthetic submit action, or new user interface is part of this increment.
- The tool **MUST** be registered only after JSON-LD loading, view-model construction, and human-page rendering succeed.
- The tool **MUST** resolve only against the immutable release represented by the open page. It **MUST NOT** use the query module's default `latest_stable_releases` selection.
- A mutable page alias such as `latest` or `latest-unstable` **MUST** be reported separately from the authored immutable `owl:versionIRI`. The alias must never substitute for a missing version IRI.
- If the page cannot establish an authored ontology IRI, authored immutable version IRI, repository artifact family, and valid immutable version tag, it **MUST NOT** register the tool. The human page remains available.
- The query result's family ID, version tag, ontology IRI, and version IRI **MUST** be checked against the displayed-page context before any resolved result is returned.
- The browser **MUST NOT** call the loopback MCP server or proxy WebMCP through Streamable HTTP, SSE, `stdio`, or another backend transport.
- Browser artifact reads **MUST** be same-origin, rooted under `/ontology/query/v1/`, non-redirecting, bounded by decoded byte length, cancellable, and limited to catalog-selected relative paths.
- The mutable catalog **MUST** be revalidated with Fetch cache mode `no-cache`. Content-addressed release indexes **MAY** use `force-cache`; their SHA-256 digest is still verified by the query module before JSON parsing.
- Digest verification **MUST** be described as catalog-to-index byte integrity and cache-corruption detection, not as an independent publisher-authenticity proof. Same-origin HTTPS supplies the origin boundary; a compromised origin could replace both catalog and index.
- `sourceArtifactSha256` **MUST** be described as build-recorded source provenance carried consistently by the catalog and verified release index. The browser recomputes `queryIndexSha256`; it does not refetch the RDF/XML source and recompute `sourceArtifactSha256` during a definition lookup.
- The catalog and release index **MUST NOT** be fetched during ordinary page load. The first tool execution may load them; later executions in the same page reuse the query module's catalog and LRU index cache.
- The exact selected lexical definition **MUST NOT** be truncated. Ambiguity candidates, UUID URNs, and source IRIs are bounded and report total counts and truncation explicitly.
- Typical serialized output for the Core `Person` fixture **SHOULD** remain within Chrome's current 1.5K-character advisory output budget. If the complete definition and required provenance exceed that advisory budget, preserve semantics and record the measured size.
- The tool annotation object **MUST** be `{ readOnlyHint: true, untrustedContentHint: true }`. Ontology-authored literals and referenced source IRIs are data, never instructions.
- Tool `name`, `title`, description, parameter descriptions, and schema **MUST** be static source-controlled literals. Never interpolate the ontology title, entity text, URL parameters, or other document-authored data into tool metadata; doing so would turn untrusted ontology content into a tool-poisoning surface.
- The registration call **MUST NOT** set `exposedTo`; same-origin exposure is the complete requirement for this increment.
- Registration **MUST** receive an `AbortSignal`. A non-persisted `pagehide` aborts registration; a persisted `pagehide` retains it for back/forward-cache restoration.
- Every execution **MUST** pass the WebMCP execution signal through the browser resolver, query module, Fetch adapter, and response-body reader. Native cancellation must remain cancellation rather than being converted to a normal domain result.
- The current WebMCP `ModelContextTool` dictionary has no `outputSchema`; production code **MUST NOT** invent one. The returned object must nevertheless cross a Zod runtime-validation boundary before it is returned.
- The WebMCP result **MUST** expose all entity kinds already represented by `ONTOLOGY_ENTITY_KIND_VALUES`, not only the class and named-individual subset rendered in the HTML table. `entityKinds` remains an array because OWL punning and multiple asserted kinds are semantically possible.
- The result **MUST** preserve RDF literal lexical form, datatype IRI, and language tag from the shared query result. It **MUST NOT** infer a label from an IRI or invent a definition.
- Query-artifact v1 does not represent RDF 1.2 literal base direction. This increment **MUST NOT** add `baseDirection: null`, because that would falsely claim an inspected absence. Directional literals require a separately designed artifact-format revision and parser/data-model support.
- Query-artifact v1 specifically exposes `entitySourceIris`. This increment **MUST** name the projected field `sourceIris`; it **MUST NOT** generalize it to `sourceValues` or imply that literal-valued `dcterms:source` assertions were preserved.
- UUID convenience output **MUST** include only identifier assertions that validate as RFC 9562 UUID URNs. It returns canonical lowercase UUID URNs, never guesses that another identifier is a UUID, and never rewrites the source assertion itself.
- Expected outcomes—resolved, ambiguous, not found, invalid input, and safe operational failure—**MUST** be discriminated JSON objects. Expected misses and ambiguity must not throw.
- Unexpected private exceptions **MUST NOT** cross the tool seam. They are reported through an injected reporting callback and returned as a stable `INTERNAL_QUERY_FAILURE` result. Native execution cancellation is the exception: it rejects with the cancellation reason.
- Runtime input validation **MUST** reject arrays, non-objects, additional properties, non-string references, empty raw references, whitespace-only references, and references longer than 512 Unicode code points. Count with `[...value].length`, not UTF-16 code-unit `.length`.
- Every created production module **MUST** begin with a module-level comment naming its responsibility and the behavior it deliberately leaves to another layer. Exported interfaces, public result variants, trust decisions, exact-release pinning, digest-before-parse ordering, URL/path double validation, cache decisions, RDF projections, cancellation boundaries, lazy-loading decisions, and bfcache lifecycle choices **MUST** have comments explaining semantic intent and invariants. Comments must not merely restate syntax.
- No package or lockfile change is part of this plan. The current native APIs and existing Zod dependency are sufficient.
- No shim, compatibility layer, browser-specific alternate implementation, or forwarding wrapper is permitted.
- Existing working-tree changes are user-owned. Preserve the current modifications to `reference-data/reference-data.owl` and `skills-lock.json`, and the current untracked `.github/workflows/verify-jsonld.yml`.
- Shell commands **MUST** be run individually and their exit status inspected before any dependent command.
- Commits and pushes require separate explicit authorization. Checkpoint commit messages in this document are proposals only.

## Standards baseline

Before writing tests, reopen these primary or official sources and compare their current definitions with this plan. If a fast-moving interface has changed, update this plan and the failing tests to the current official interface. Do not retain an obsolete shape through a compatibility branch.

When implementation guidance and the current Community Group Report disagree, treat the report's current WebIDL and algorithms as the target contract, record the implementation lag in documentation/manual evidence, and do not add a production compatibility branch. At amendment time, for example, the report's `executeTool()` WebIDL accepts an input object while one Chrome guidance example still describes a JSON string; this difference affects only manual inspection, not the registered tool callback.

- [WebMCP Draft Community Group Report, 26 August 2026](https://webmachinelearning.github.io/webmcp/) — `Document.modelContext`, `ModelContextTool`, `ToolAnnotations`, registration and execution signals, JSON serialization, same-origin exposure, permissions policy, and security considerations. It is an experimental Community Group report, not a W3C Standard.
- [Official WebMCP implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) — current browser and agent support. At plan amendment time it reports ChatGPT Desktop support, Brave experimental support, a Chrome 149 origin trial, and an Edge 150 origin trial.
- [Chrome imperative API guidance](https://developer.chrome.com/docs/ai/webmcp/imperative-api) — imperative registration, signal-based unregistration, cancellation, tool discovery, and execution.
- [Chrome WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices) — one intention per tool, contextual registration, precise descriptions, runtime validation, and bounded output.
- [Chrome WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools) — `readOnlyHint`, `untrustedContentHint`, same-origin defaults, and current character-budget guidance.
- [Chrome WebMCP evaluations](https://developer.chrome.com/docs/ai/webmcp/evals) — deterministic tool tests and probabilistic agent-selection/journey evaluations.
- [Fetch Standard](https://fetch.spec.whatwg.org/) — request cancellation, redirects, credentials, response bodies, and cache modes.
- [URL Standard](https://url.spec.whatwg.org/) — URL parsing and relative-reference resolution used for same-origin containment.
- [Encoding Standard](https://encoding.spec.whatwg.org/) — fatal UTF-8 decoding through `TextDecoder`.
- [Web Cryptography Level 2](https://www.w3.org/TR/WebCryptoAPI/) — native `SubtleCrypto.digest()` SHA-256 verification.
- [OWL 2 Structural Specification, Second Edition](https://www.w3.org/TR/owl2-syntax/) — ontology/version identity, entity IRIs, and OWL entity kinds.
- [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) — literal lexical forms, datatype IRIs, and language-tagged strings represented by query-artifact v1.
- [RDF 1.2 Concepts, Candidate Recommendation](https://www.w3.org/TR/rdf12-concepts/) — directional language-tagged strings; this is future format work, not a field to simulate in v1.
- [SKOS Reference](https://www.w3.org/TR/skos-reference/) — preferred labels and lexical definitions.
- [DCMI Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/) — identifier and source assertion meaning.
- [BCP 47 / RFC 5646](https://www.rfc-editor.org/rfc/rfc5646) — language-tag syntax and lookup semantics.
- [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562) — current UUID text and UUID URN syntax.
- [JSON Schema 2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core) and [Validation](https://json-schema.org/draft/2020-12/json-schema-validation) — the input declaration vocabulary. The declaration is descriptive; runtime validation remains mandatory.

## Module and adapter design

```text
immutable RDF/XML releases
          |
          v
query-artifact builder --> /ontology/query/v1/catalog.json
          |               /ontology/query/v1/releases/.../{sha256}.json
          |
          +--> filesystem byte adapter --> createOntologyQueryModule()
          |                                     |
          |                                     +--> local MCP outer adapter
          |
          +--> same-origin Fetch byte adapter --> same query module
                                                |
                                                +--> compact WebMCP outer adapter
```

The byte-repository seam is now real because it has two adapters. Both expose the existing two-method interface:

```javascript
{
  readOntologyQueryCatalog({ signal }): Promise<Uint8Array>,
  readOntologyReleaseQueryIndex({ relativePath, signal }): Promise<Uint8Array>,
}
```

The query module stays deep: callers learn two query operations while the implementation hides catalog selection, schema validation, source/index identity checks, SHA-256 verification, historical field rules, normalized exact matching, language selection, aggregation, concurrency, cancellation, and bounded caching.

The outer adapters remain intentionally different:

| Concern                  | Local MCP                           | WebMCP                                             |
| ------------------------ | ----------------------------------- | -------------------------------------------------- |
| Runtime                  | Node.js local process               | JavaScript in the open browser tab                 |
| Byte adapter             | Contained filesystem                | Contained same-origin Fetch                        |
| Public operations        | `search_entities`, `resolve_entity` | `get_ontology_entity_definition` only              |
| Release default          | Latest stable or caller-selected    | Always the exact release displayed in the tab      |
| Envelope                 | MCP content plus structured content | Direct JSON-serializable result                    |
| Output schema            | MCP SDK output schema               | Runtime Zod parse; no WebMCP `outputSchema` member |
| Untrusted-content signal | Text warning and MCP result         | `untrustedContentHint: true`                       |

## Normative behavior contract

### Primary journey

Given the user opens `/ontology/universal/core/latest.html`, that page's loaded JSON-LD states:

```text
owl:versionIRI  https://haddenindustries.com/ontology/universal/core/20260714
owl:versionInfo 2026-07-14
```

and the user asks:

```text
What is the definition of Person in the latest version of the Core Universal Ontology?
```

the agent calls:

```json
{
  "entityReference": "Person"
}
```

The tool pins the query to `universal/core` release `20260714`, verifies the content-addressed index, resolves the shared normalized exact preferred label, returns the complete selected SKOS definition and its RDF literal metadata, identifies the Core `Person` entity, and distinguishes the mutable `latest` document alias from the immutable version IRI.

### Page and release scope

- A dated page selects its dated artifact family and the version tag derived from its authored `owl:versionIRI`.
- A `latest` or `latest-unstable` page selects the immutable release named by its loaded JSON-LD, never whichever release the catalog currently marks latest.
- `ontologyDocumentIri` is the controller's normalized extensionless RDF source URL (`#sourceUrl`), not the `.html` presentation-route URL in `window.location`; catalog family/version paths use the same source-document convention.
- If the document's final path segment is itself a valid immutable version tag, it must equal the authored version-IRI tag; a dated URL serving mismatched ontology metadata does not register a tool.
- Any other document segment, including `*-full` import-closure artifacts and unrecognized aliases, is outside query-artifact v1's source-artifact identity contract and does not register a tool.
- A cached older alias page therefore continues to describe its loaded older immutable release correctly.
- Core, Extended, Reference Data, ISO, and ISO/IEC pages use the same code and are limited to their own selected release.
- A raw RDF/XML, JSON-LD, CSV, or query-index asset registers no tool because it does not run the ontology page application.
- Registration is skipped if exact displayed-release identity cannot be established.
- Resolution covers every named entity kind indexed from that source artifact, even if the HTML table does not render that kind.
- Resolution does not traverse imports, merge another release, dereference entity IRIs, infer OWL entailments, or query the local MCP server.

### Input classification and resolution precedence

The browser resolver trims surrounding whitespace once and returns the trimmed string as `requestedEntityReference`. It then applies these branches:

1. If the reference is an absolute IRI, resolve it first as `identifierKind: "entity_iri"` with exact case-sensitive equality.
2. If that IRI resolution is `not_found` and the reference is a syntactically valid UUID URN, resolve its canonical lowercase form as `identifierKind: "uuid_urn"`.
3. If the reference is bare RFC 9562 hex-and-dash UUID text, prepend `urn:uuid:`, lowercase it, and resolve as `uuid_urn`.
4. Otherwise resolve as `identifierKind: "preferred_label"` and let the shared query module apply its normalized exact-label comparison.

This preserves entity-IRI precedence even when an entity IRI itself is a UUID URN. It also lets the common case—UUID URN used as a `dcterms:identifier`—fall through to UUID resolution. Generic IRI-shaped text does not fall through to preferred-label matching.

The 512-code-point transport ceiling is an outer abuse bound, not a widening of the shared typed-query contract. A reference that reaches the preferred-label branch must pass the existing `NonBlankOntologyLookupTextSchema` before query I/O; otherwise the resolver returns `invalid_entity_reference`. Absolute IRIs remain governed by `AbsoluteIriSchema`, so a valid IRI longer than the preferred-label limit is not accidentally rejected as a label.

Shared preferred-label equality is exact **after** the query module's normalization: Unicode NFKC, locale-independent lowercase, punctuation/separator/whitespace folding to one ASCII space, and trimming. It is not prefix, substring, stemming, edit-distance, vector, or language-model matching. If normalization makes more than one entity equal, the result is ambiguous.

### Language and lexical-definition selection

The WebMCP adapter passes `preferredLanguageTags: ["en-GB", "en"]` explicitly. The query module remains authoritative for exact/lookup language preference, untagged selection, deterministic fallback, and historical annotation-property selection.

The compact selected assertion contains:

```javascript
{
  assertionPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
  literalValue: {
    lexicalForm:
      "Entity, i.e. a natural or legal person, recognised by law as having legal rights and duties, able to make commitment(s), assume and fulfil resulting obligation(s), and able to be held accountable for its action(s)",
    datatypeIri:
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    languageTag: "en-gb",
  },
  selectionBasis: "preferred_language_exact",
}
```

An absent selected preferred label or lexical definition is `null`. No label or definition is synthesized.

### Result variants

All results contain `resultSchemaVersion: 1`.

Resolved:

```javascript
{
  resultSchemaVersion: 1,
  status: "resolved",
  requestedEntityReference: "Person",
  matchedBy: "preferred_label",
  displayedOntologyRelease: {
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
    ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
    ontologyTitle: "Hadden Industries Universal Core Ontology",
    versionIri:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    versionInfo: "2026-07-14",
    priorVersionIri:
      "https://haddenindustries.com/ontology/universal/core/20260625",
    ontologyDocumentIri:
      "https://haddenindustries.com/ontology/universal/core/latest",
    documentVersionAlias: "latest",
    sourceArtifactUrl:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    sourceArtifactSha256:
      "9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228",
  },
  ontologyEntity: {
    entityIri:
      "https://haddenindustries.com/ontology/universal/core/Person",
    entityKinds: ["owl_class"],
    uuidUrns: ["urn:uuid:1ef827ec-12a3-43e6-88de-d149d3be2b8e"],
    uuidUrnCount: 1,
    uuidUrnsTruncated: false,
    selectedPreferredLabel: {
      assertionPropertyIri:
        "http://www.w3.org/2004/02/skos/core#prefLabel",
      literalValue: {
        lexicalForm: "Person",
        datatypeIri:
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
        languageTag: "en",
      },
      selectionBasis: "preferred_language_exact",
    },
    selectedLexicalDefinition: {
      assertionPropertyIri:
        "http://www.w3.org/2004/02/skos/core#definition",
      literalValue: {
        lexicalForm:
          "Entity, i.e. a natural or legal person, recognised by law as having legal rights and duties, able to make commitment(s), assume and fulfil resulting obligation(s), and able to be held accountable for its action(s)",
        datatypeIri:
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
        languageTag: "en-gb",
      },
      selectionBasis: "preferred_language_exact",
    },
    sourceIris: ["urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24"],
    sourceIriCount: 1,
    sourceIrisTruncated: false,
  },
}
```

Not found:

```javascript
{
  resultSchemaVersion: 1,
  status: "not_found",
  requestedEntityReference: "Persno",
  matchedBy: "preferred_label",
  displayedOntologyRelease: {
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
    ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
    ontologyTitle: "Hadden Industries Universal Core Ontology",
    versionIri:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    versionInfo: "2026-07-14",
    priorVersionIri:
      "https://haddenindustries.com/ontology/universal/core/20260625",
    ontologyDocumentIri:
      "https://haddenindustries.com/ontology/universal/core/latest",
    documentVersionAlias: "latest",
    sourceArtifactUrl:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    sourceArtifactSha256:
      "9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228",
  },
}
```

Ambiguous:

```javascript
{
  resultSchemaVersion: 1,
  status: "ambiguous",
  requestedEntityReference: "Example",
  matchedBy: "preferred_label",
  displayedOntologyRelease: {
    ontologyArtifactFamilyId: "universal/core",
    versionTag: "20260714",
    ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
    ontologyTitle: "Hadden Industries Universal Core Ontology",
    versionIri:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    versionInfo: "2026-07-14",
    priorVersionIri:
      "https://haddenindustries.com/ontology/universal/core/20260625",
    ontologyDocumentIri:
      "https://haddenindustries.com/ontology/universal/core/latest",
    documentVersionAlias: "latest",
    sourceArtifactUrl:
      "https://haddenindustries.com/ontology/universal/core/20260714",
    sourceArtifactSha256:
      "9cb764f62461835c2ea9d309a9a4d8aca362d464cd3aa43145c3a1d01a8ee228",
  },
  candidateCount: 7,
  candidatesTruncated: true,
  candidates: [
    {
      entityIri: "https://example.com/ontology/A",
      entityKinds: ["owl_class"],
      preferredLabelLexicalForm: "Example",
    },
  ],
}
```

Candidates are sorted by entity IRI using code-unit order in the shared query module, and the WebMCP projector returns at most five. The compact candidate shape deliberately omits definitions, identifiers, and source values; its exact entity IRI is the unambiguous reference for a follow-up call.

For resolved entities, the projector unions values across `sourceArtifactDescriptions`, deduplicates them before counting, and then applies stable ordering before slicing. `entityKinds` use the order declared by shared `ONTOLOGY_ENTITY_KIND_VALUES`; canonical lowercase UUID URNs and source IRIs use ascending JavaScript code-unit order. `uuidUrnCount` and `sourceIriCount` describe the full deduplicated sets, while each `*Truncated` flag is `count > 5`. These rules make “first five” reproducible rather than dependent on object traversal order.

Invalid input:

```javascript
{
  resultSchemaVersion: 1,
  status: "invalid_input",
  errorCode: "invalid_tool_input",
  message:
    "Provide exactly one entityReference string containing 1 to 512 Unicode code points.",
}
```

Use `invalid_tool_input` for argument-object/schema failures and `invalid_entity_reference` for a schema-shaped string that cannot be classified or accepted by the typed query input. The latter has the stable message `The entityReference must be a non-blank entity IRI, UUID, or preferred label accepted by the ontology query.` Invalid-input messages are descriptive, fixed by code, and never echo rejected caller text.

Safe operational failure:

```javascript
{
  resultSchemaVersion: 1,
  status: "failure",
  error: {
    errorCode: "QUERY_INDEX_UNAVAILABLE",
    message: "The ontology release query index is unavailable.",
    retryable: true,
  },
}
```

The failure union includes the shared ontology-query errors plus browser-specific `DISPLAYED_RELEASE_IDENTITY_MISMATCH`. It never includes a URL fetched from caller input, filesystem path, stack trace, response body, or private exception text.

## Semantic vocabulary and names

| Name                                             | Exact meaning                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OntologyReleaseIndexRepository`                 | The existing two-method raw-byte interface consumed by the query module. It is a real seam with filesystem and Fetch adapters.                      |
| `createFileSystemOntologyReleaseIndexRepository` | The existing contained local-filesystem adapter used by the MCP server.                                                                             |
| `createFetchOntologyReleaseIndexRepository`      | The new same-origin, query-root-contained, byte-bounded browser adapter.                                                                            |
| `OntologyQueryModule`                            | The deep shared module returned by `createOntologyQueryModule()`, with `searchOntologyEntities()` and `resolveOntologyEntity()`.                    |
| `DisplayedOntologyDocumentMetadata`              | Authored ontology identity/version fields projected from the JSON-LD loaded by the page.                                                            |
| `DisplayedOntologyReleaseContext`                | Validated page document metadata plus repository family/version selection and separately classified page alias.                                     |
| `ontologyArtifactFamilyId`                       | Stable repository-relative family path, such as `universal/core`; it is not an ontology IRI.                                                        |
| `versionTag`                                     | Immutable repository release segment, such as `20260714` or `v1`.                                                                                   |
| `versionIri`                                     | Authored immutable OWL ontology-version IRI.                                                                                                        |
| `ontologyDocumentIri`                            | Exact source-document IRI represented by the open page; it may contain a mutable alias.                                                             |
| `documentVersionAlias`                           | Exactly `latest`, `latest-unstable`, or `null`; `null` denotes an exact immutable-version document, never an unclassified alias.                    |
| `entityReference`                                | Caller text that may be an entity IRI, UUID URN, bare UUID, or preferred label. It is not called an identifier because labels are accepted.         |
| `matchedBy`                                      | `entity_iri`, `uuid`, or `preferred_label`, identifying the branch that produced the result.                                                        |
| `entityKinds`                                    | The complete array of indexed OWL/RDFS kinds asserted for the entity. It is intentionally not singular.                                             |
| `selectedLexicalDefinition`                      | The shared query module's selected authored definition assertion; `null` means no selected authored definition.                                     |
| `sourceIris`                                     | Bounded, deduplicated named-node source IRIs from query-artifact v1. The name does not claim literal values are present.                            |
| `uuidUrns`                                       | Bounded canonical convenience views of identifier assertions that validate as UUID URNs. Authored assertions remain unchanged in the shared result. |
| `resultSchemaVersion`                            | Version of the compact WebMCP result contract, independent of query-artifact format version.                                                        |
| `queryArtifactFormatVersion`                     | Version of the generated catalog/release-index format; this plan retains version 1.                                                                 |
| `QUERY_INDEX_UNAVAILABLE`                        | Shared safe query error for a selected release-index byte read that fails before validated bytes are available.                                     |
| `DISPLAYED_RELEASE_IDENTITY_MISMATCH`            | Browser-specific safe failure when the selected validated query release does not equal the open page's declared immutable release.                  |

## Planned file responsibilities

### Create

- `src/ontologyQuery/ontologyQueryErrors.js` — shared query error codes, definitions, class, and type guard used by core, MCP, and WebMCP.
- `src/ontologyQuery/ontologyQueryArtifactLimits.js` — shared catalog and release-index decoded-byte ceilings used by artifact production and browser consumption.
- `src/ontologyQuery/ontologyReleaseIndexRelativePath.js` — one normalized, contained relative-path validator shared by filesystem and Fetch adapters.
- `src/ontologyQuery/fetchOntologyReleaseIndexRepository.js` — same-origin Fetch byte adapter with redirect rejection, response validation, stream bounds, and signal forwarding.
- `scripts/build/createOntologyQueryArtifacts.js` — output-write-free creation of canonical content-addressed query assets for both the CLI publisher and Vite asset map.
- `src/webmcp/tryCreateDisplayedOntologyReleaseContext.js` — validates eligible page documents, returns `null` for unindexed document variants, and otherwise pins the page to one immutable artifact family/version.
- `src/webmcp/ontologyEntityDefinitionResultSchemas.js` — compact WebMCP result schemas and projection bounds.
- `src/webmcp/createOntologyEntityDefinitionResolver.js` — classifies one reference, calls the shared query module with exact release selection, verifies release identity, and projects/validates the compact result.
- `src/webmcp/registerDisplayedOntologyEntityDefinitionTool.js` — current imperative tool definition, runtime transport validation, lazy resolver loading, security annotations, and signal-based registration.
- `tests/fixtures/ontology-query/createInMemoryOntologyQueryFixture.js` — shared deterministic query fixture extracted from the existing query-module tests.
- `tests/ontology-query/fetch-ontology-release-index-repository.test.js` — browser byte-adapter contract tests.
- `tests/webmcp/displayed-ontology-release-context.test.js` — exact page-to-release mapping tests.
- `tests/webmcp/ontology-entity-definition-result-schemas.test.js` — strict compact result-shape and bound tests.
- `tests/webmcp/ontology-entity-definition-resolver.test.js` — compact resolution contract tests over the real shared query module.
- `tests/webmcp/displayed-ontology-entity-definition-tool.test.js` — WebMCP dictionary, validation, lazy loading, annotations, registration, and cancellation tests.
- `docs/webmcp-ontology-entity-definition-lookup.md` — user/operator guide, support caveats, security model, MCP/WebMCP distinction, and evaluation prompts.

### Modify

- `src/ontologyViewModel.js` — add authored ontology identity/version metadata without adding a second entity lookup projection.
- `tests/ontology-view-model.test.js` — lock metadata presence, absence, and immutable-version semantics.
- `src/ontology.js` — preserve existing UI behavior, conditionally load the WebMCP registration module, and own registration lifecycle.
- `src/ontologyQuery/createOntologyQueryModule.js` — use native `TextDecoder` and Web Crypto, import shared errors, and classify selected-index read failure precisely.
- `src/ontologyQuery/fileSystemOntologyReleaseIndexRepository.js` — use the shared relative-path validator with unchanged containment/symlink behavior.
- `src/mcp/createUniversalOntologyMcpServer.js` — import the shared error module after extraction.
- `src/mcp/universalOntologyToolSchemas.js` — delete the duplicate local MCP error-code list, derive the failure-code enum directly from the shared query error-code list, and include `QUERY_INDEX_UNAVAILABLE`.
- `tests/ontology-query/ontology-query-module.test.js` — use the shared fixture and lock Web-platform byte behavior/error mapping.
- `tests/ontology-query/file-system-ontology-release-index-repository.test.js` — prove path behavior survives validator extraction.
- `tests/mcp/universal-ontology-mcp-server.test.js` — lock the new shared release-index-unavailable failure arm.
- `scripts/generateOntologyQueryIndexes.js` — retain atomic filesystem publication while delegating canonical asset creation to the output-write-free builder.
- `scripts/build/ontologyAssets.js` — include `query/v1` artifacts in ordinary production builds.
- `tests/ontology-query/ontology-release-query-index.test.js` — preserve deterministic CLI generation and catalog-last behavior after extraction.
- `tests/build/ontology-assets.test.js` — require the Vite asset map to include readable query artifacts.
- `tests/build/built-ontology-page.test.js` — cover unsupported, registered, executed, cancelled, failed, lazy-fetch, and exact-release browser journeys.
- `README.md` — link the user guide without overclaiming browser support.

### Explicitly unchanged

- `src/ontology.html` and `src/ontology.css` — no new form, badge, panel, or visual redesign.
- `src/ontologyCsv.js`, CSV headers, and XMI behavior — no published export-contract change.
- Ontology source data and projection-history declarations.
- `package.json`, lockfiles, lint/test configuration, CI workflows, hosting configuration, deployment configuration, and repository policy.
- The local MCP HTTP handler, localhost origin/host checks, MCP metadata, and MCP text renderer except for shared error imports/schema enumeration explicitly named above.

## Configuration approval gate

Repository policy classifies build and bundler files as configuration. Before Task 4 changes build behavior, obtain explicit approval for this exact change:

- create `scripts/build/createOntologyQueryArtifacts.js` to produce the existing query-artifact v1 bytes in memory;
- modify `scripts/generateOntologyQueryIndexes.js` to consume those bytes while preserving release-first/catalog-last atomic publication;
- modify `scripts/build/ontologyAssets.js` so `createOntologyBuildAssets()` adds `query/v1/catalog.json` and all catalog-referenced content-addressed release indexes to Vite's emitted asset map.

Behavioral impact: `npm run build` will take longer and `dist/` will include the query catalog and immutable release indexes that deployment uploads. Pipeline impact: no package script, workflow, Vite setting, or deployment setting changes; the existing build command becomes sufficient because the existing ontology-assets plugin emits the additional map entries. This plan does not itself grant the required configuration approval.

## Pre-implementation gate

- [ ] Read this plan, the repository instructions, and every standards source relevant to the task being started.

- [ ] Inspect the working tree.

```powershell
git status --short
```

Expected pre-existing user-owned entries at plan amendment time, excluding this plan's own working-tree diff:

```text
 M reference-data/reference-data.owl
 M skills-lock.json
?? .github/workflows/verify-jsonld.yml
```

Treat every change as user-owned. If a planned file is modified when implementation starts, inspect and preserve the overlap; never restore or overwrite it.

- [ ] Establish the shared-query, MCP, view-model, and built-page baseline.

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js tests/ontology-query/file-system-ontology-release-index-repository.test.js tests/mcp/universal-ontology-mcp-server.test.js tests/ontology-view-model.test.js tests/build/built-ontology-page.test.js
```

Expected: all suites pass before the first red test is introduced.

- [ ] Reconfirm the WebMCP dictionary contains `name`, optional `title`, `description`, optional `inputSchema`, `execute`, and `annotations`; execution receives `{ signal }`; registration accepts `{ signal, exposedTo }`; annotations contain `readOnlyHint` and `untrustedContentHint`; and no `outputSchema` member exists.

---

### Task 1: Project exact displayed-ontology metadata

**Files:**

- Modify: `tests/ontology-view-model.test.js`
- Modify: `src/ontologyViewModel.js`
- Modify: `src/ontology.js`

**Interfaces:**

- Consumes: the loaded materialized JSON-LD and existing historical `ontologyPath` option.
- Produces: `createOntologyViewModel()` returning `{ ontology, rows }`, where `ontology` is `DisplayedOntologyDocumentMetadata` and `rows` remains the current table/CSV projection.

- [ ] **Step 1: Write the failing authored-metadata test**

Add ontology nodes containing exact `dcterms:title`, `dcterms:modified`, `owl:versionIRI`, `owl:versionInfo`, and `owl:priorVersion` values. Assert:

```javascript
expect(viewModel.ontology).toEqual({
  ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
  ontologyTitle: "Hadden Industries Universal Core Ontology",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260714",
  versionInfo: "2026-07-14",
  priorVersionIri:
    "https://haddenindustries.com/ontology/universal/core/20260625",
  modifiedAt: "2026-07-14",
});
```

Add a separate document with no `owl:Ontology` node and assert every metadata member is exactly `null`. Preserve existing exact row assertions.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
npm.cmd test -- --runInBand tests/ontology-view-model.test.js
```

Expected: FAIL because the current result has top-level `title`/`modified` strings and no nested immutable-version metadata.

- [ ] **Step 3: Implement the minimal metadata projection**

Add these property IRIs:

```javascript
versionIri: `${NS.owl}versionIRI`,
versionInfo: `${NS.owl}versionInfo`,
priorVersion: `${NS.owl}priorVersion`,
```

Return:

```javascript
return {
  ontology: {
    ontologyIri: ontologyNode?.["@id"] ?? null,
    ontologyTitle: ontologyNode
      ? (getPreferredLiteralTerm(ontologyNode, JSON_LD.title)?.value ?? null)
      : null,
    versionIri: ontologyNode
      ? (getReferencedIris(ontologyNode, JSON_LD.versionIri)[0] ?? null)
      : null,
    versionInfo: ontologyNode
      ? (getPreferredLiteralTerm(ontologyNode, JSON_LD.versionInfo)?.value ??
        null)
      : null,
    priorVersionIri: ontologyNode
      ? (getReferencedIris(ontologyNode, JSON_LD.priorVersion)[0] ?? null)
      : null,
    modifiedAt: ontologyNode
      ? (getLexicalValues(ontologyNode, JSON_LD.modified)[0] ?? null)
      : null,
  },
  rows,
};
```

Use `??`, not truthiness, so an authored empty lexical form is not silently converted to absence. Update JSDoc with a named `DisplayedOntologyDocumentMetadata` typedef. Do not add preferred-label or definition literal projections to rows; the shared query index already owns them.

- [ ] **Step 4: Run the test and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-view-model.test.js
```

Expected: PASS.

- [ ] **Step 5: Write the failing page-consumer regression**

In the existing built-page fixture, assert the title and XMI filename still use the nested metadata:

```javascript
expect(await page.title()).toBe("Hadden Industries Universal Core Ontology");
expect(xmiDownload.suggestedFilename()).toBe(
  "Hadden Industries Universal Core Ontology [2026-07-14].xmi",
);
```

- [ ] **Step 6: Run the browser test and verify RED**

```powershell
npm.cmd test -- --runInBand tests/build/built-ontology-page.test.js
```

Expected: FAIL because `src/ontology.js` still reads `viewModel.title` and `viewModel.modified`.

- [ ] **Step 7: Move the existing consumer to the nested contract**

Use only the new shape:

```javascript
if (viewModel.ontology.ontologyTitle) {
  document.title = viewModel.ontology.ontologyTitle;
  this.#fileName = viewModel.ontology.ontologyTitle;

  if (viewModel.ontology.modifiedAt) {
    this.#fileName += ` [${viewModel.ontology.modifiedAt}]`;
  }
}
```

Do not add fallbacks to removed top-level fields.

- [ ] **Step 8: Verify GREEN and refactor comments while green**

```powershell
npm.cmd test -- --runInBand tests/ontology-view-model.test.js tests/build/built-ontology-page.test.js
```

Expected: PASS with unchanged table and export assertions.

- [ ] **Step 9: Review the task diff**

```powershell
git diff --check
```

```powershell
git diff -- src/ontologyViewModel.js src/ontology.js tests/ontology-view-model.test.js tests/build/built-ontology-page.test.js
```

If a checkpoint commit is separately authorized, load the committing skill and propose:

```text
refactor(ontology): expose immutable document metadata
```

---

### Task 2: Make the shared query module Web-platform native

**Files:**

- Create: `src/ontologyQuery/ontologyQueryErrors.js`
- Create: `tests/fixtures/ontology-query/createInMemoryOntologyQueryFixture.js`
- Modify: `src/ontologyQuery/createOntologyQueryModule.js`
- Modify: `src/mcp/createUniversalOntologyMcpServer.js`
- Modify: `src/mcp/universalOntologyToolSchemas.js`
- Modify: `tests/ontology-query/ontology-query-module.test.js`
- Modify: `tests/mcp/universal-ontology-mcp-server.test.js`

**Interfaces:**

- Preserves: `createOntologyQueryModule({ ontologyReleaseIndexRepository, maximumCacheByteSize })` and both query methods.
- Produces: shared `ONTOLOGY_QUERY_ERROR_CODE_VALUES`, `OntologyQueryError`, and `isOntologyQueryError` from `ontologyQueryErrors.js`.
- Adds: safe retryable `QUERY_INDEX_UNAVAILABLE` for a selected release-index byte-read failure.

- [ ] **Step 1: Extract the reusable query fixture while green**

Move the existing `serialize`, `digest`, `createReleaseArtifact`, and `createInMemoryRepository` fixture logic into `tests/fixtures/ontology-query/createInMemoryOntologyQueryFixture.js`. Export semantically named helpers and update the existing query-module test imports. Do not change expected values.

- [ ] **Step 2: Prove fixture extraction remains GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js
```

Expected: PASS before production changes.

- [ ] **Step 3: Write the failing selected-index-unavailable test**

Change the existing transient `indexError` assertion to require:

```javascript
await expect(ontologyQuery.searchOntologyEntities(input)).rejects.toMatchObject(
  {
    name: "OntologyQueryError",
    errorCode: "QUERY_INDEX_UNAVAILABLE",
    message: "The ontology release query index is unavailable.",
    retryable: true,
  },
);
```

Add an MCP adapter assertion proving the same code is accepted by its output schema and returned without private adapter text.

- [ ] **Step 4: Run both suites and verify RED**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js tests/mcp/universal-ontology-mcp-server.test.js
```

Expected: FAIL because selected-index reads currently become `INTERNAL_QUERY_FAILURE` and the MCP failure enum duplicates the older code list.

- [ ] **Step 5: Centralize safe query errors and implement the new mapping**

Create `ontologyQueryErrors.js` with the existing definitions plus:

```javascript
QUERY_INDEX_UNAVAILABLE: {
  retryable: true,
  defaultMessage: "The ontology release query index is unavailable.",
},
```

Export the frozen code list from `Object.keys(ONTOLOGY_QUERY_ERROR_DEFINITIONS)`, the existing error class, and type guard. Import them from the query module and both MCP files. In the selected-index load catch, retain domain and cancellation branches and map only an unclassified repository read failure to `QUERY_INDEX_UNAVAILABLE`.

Delete the duplicate `ONTOLOGY_TOOL_ERROR_CODE_VALUES` declaration from `universalOntologyToolSchemas.js`; import `ONTOLOGY_QUERY_ERROR_CODE_VALUES` and pass it directly to the MCP failure-code enum. There is no compatibility alias or second vocabulary. Do not expose the definitions object or adapter exception. Keep `INTERNAL_QUERY_FAILURE` for unexpected defects outside a repository read.

- [ ] **Step 6: Run both suites and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js tests/mcp/universal-ontology-mcp-server.test.js
```

Expected: PASS.

- [ ] **Step 7: Write the failing fatal UTF-8 test**

Return `Uint8Array.from([0xc3, 0x28])` as catalog bytes and assert:

```javascript
await expect(
  ontologyQuery.searchOntologyEntities({ queryText: "Person" }),
).rejects.toMatchObject({
  errorCode: "QUERY_INDEX_SCHEMA_UNSUPPORTED",
  message: "The ontology query-index catalog is not valid UTF-8 JSON.",
  retryable: false,
});
```

- [ ] **Step 8: Run the focused suite and verify RED**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js
```

Expected: FAIL because `Buffer.toString("utf8")` replaces malformed sequences rather than using fatal decoding and the module still imports Node built-ins.

- [ ] **Step 9: Replace Node byte primitives with standards-native primitives**

Remove both `node:` imports. Use one module-level decoder:

```javascript
const UTF_8_DECODER = new TextDecoder("utf-8", { fatal: true });

function parseJsonBytes(bytes, invalidJsonMessage) {
  try {
    return JSON.parse(UTF_8_DECODER.decode(bytes));
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: invalidJsonMessage,
      cause: error,
    });
  }
}
```

Use separate exact messages for catalog and release index. Replace synchronous hashing with:

```javascript
async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
```

Await it before comparing `queryIndexSha256`. Do not add a Node fallback; supported Node runtimes and secure browser contexts provide these standards-native globals.

- [ ] **Step 10: Run the query suite and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js
```

Expected: PASS, including the existing digest-mismatch, concurrent-load, cancellation, and LRU tests.

- [ ] **Step 11: Prove Node-only imports are absent and MCP remains green**

```powershell
rg -n "node:buffer|node:crypto|\bBuffer\b|createHash" src/ontologyQuery/createOntologyQueryModule.js
```

Expected: no matches.

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js tests/mcp/universal-ontology-mcp-server.test.js tests/mcp/universal-ontology-mcp-http-handler.test.js
```

Expected: PASS.

- [ ] **Step 12: Review the task diff**

```powershell
git diff --check
```

```powershell
git diff -- src/ontologyQuery/createOntologyQueryModule.js src/ontologyQuery/ontologyQueryErrors.js src/mcp/createUniversalOntologyMcpServer.js src/mcp/universalOntologyToolSchemas.js tests/ontology-query/ontology-query-module.test.js tests/mcp/universal-ontology-mcp-server.test.js tests/fixtures/ontology-query/createInMemoryOntologyQueryFixture.js
```

Conditional checkpoint message:

```text
refactor(ontology-query): use Web-platform byte primitives
```

---

### Task 3: Add the contained same-origin Fetch byte adapter

**Files:**

- Create: `src/ontologyQuery/ontologyQueryArtifactLimits.js`
- Create: `src/ontologyQuery/ontologyReleaseIndexRelativePath.js`
- Create: `src/ontologyQuery/fetchOntologyReleaseIndexRepository.js`
- Create: `tests/ontology-query/fetch-ontology-release-index-repository.test.js`
- Modify: `src/ontologyQuery/fileSystemOntologyReleaseIndexRepository.js`
- Modify: `tests/ontology-query/file-system-ontology-release-index-repository.test.js`

**Interfaces:**

- Produces: `MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH = 1_048_576` and `MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH = 8_388_608`.
- Produces: `createFetchOntologyReleaseIndexRepository({ ontologyQueryRootIri, expectedOrigin, fetchImplementation })` satisfying the existing byte-repository interface.
- Preserves: filesystem containment and symlink rejection.

- [ ] **Step 1: Write failing shared-path regression tests**

Keep the existing filesystem assertions for empty, absolute, backslash, `.`, `..`, and escaping paths. Add percent-encoded separator/dot cases to the new Fetch suite:

```javascript
test.each([
  "../catalog.json",
  "releases/../catalog.json",
  "releases\\catalog.json",
  "/query/v1/catalog.json",
  "releases/%2e%2e/catalog.json",
  "releases/%2fsecret.json",
  "releases/%5csecret.json",
  "releases/file.json?download=1",
  "releases/file.json#fragment",
])("rejects a non-contained query-index path: %s", async (relativePath) => {
  await expect(
    repository.readOntologyReleaseQueryIndex({ relativePath }),
  ).rejects.toThrow(
    "The repository relative path must be a normalized contained POSIX path.",
  );
});
```

- [ ] **Step 2: Run the adapter suites and verify RED**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/file-system-ontology-release-index-repository.test.js tests/ontology-query/fetch-ontology-release-index-repository.test.js
```

Expected: the existing suite passes and the new suite fails because the Fetch adapter and shared validator do not exist.

- [ ] **Step 3: Extract one relative-path validator**

Move the filesystem adapter's existing normalized segment validation to browser-safe `ontologyReleaseIndexRelativePath.js`; that module must not import `node:path`. Reject non-strings, empty values, leading-slash paths, Windows drive-absolute forms such as `C:/...`, backslashes, and empty/`.`/`..` segments. Return a frozen segment array. Use it from the filesystem adapter; retain all lexical containment, symlink, `realpath`, and signal logic there. Add explicit POSIX-root, Windows-drive, and UNC regression cases. The extraction must not newly reject percent signs, query delimiters, or fragment delimiters from filesystem paths.

- [ ] **Step 4: Run the filesystem suite and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/file-system-ontology-release-index-repository.test.js
```

Expected: PASS with no filesystem behavior regression.

- [ ] **Step 5: Write failing successful-Fetch tests**

Use native `Response`, `ReadableStream`, and a recording Fetch test double. Assert catalog and release methods return exact `Uint8Array` bytes and issue requests with:

```javascript
{
  cache: "no-cache", // catalog; release uses "force-cache"
  credentials: "same-origin",
  headers: { Accept: "application/json" },
  redirect: "error",
  signal,
}
```

Assert the resolved URLs are exactly:

```text
https://example.test/ontology/query/v1/catalog.json
https://example.test/ontology/query/v1/releases/universal/core/20260714/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json
```

- [ ] **Step 6: Write failing trust-boundary tests**

Require synchronous factory rejection unless `expectedOrigin` is a canonical HTTP(S) origin string with no path, credentials, search, or fragment. Reject a query root that is cross-origin from it, contains credentials, search, or fragment, or lacks a trailing slash. Require read rejection for non-200 status, redirected responses, missing/non-JSON content type, a declared `Content-Length` above its bound, a streamed body that crosses its bound, a missing response body, and an already-aborted signal. Prove response text is never included in an error.

- [ ] **Step 7: Implement the minimal Fetch adapter and verify GREEN**

The factory first parses and canonicalizes `expectedOrigin`, then requires the supplied string to equal the parsed HTTP(S) URL's `.origin`. It validates `ontologyQueryRootIri` with `new URL()`, requires its origin to equal that canonical origin, and requires an `http:` or `https:` URL with no credentials/search/hash and a slash-terminated path. Each relative path first crosses the shared validator. The Fetch adapter then additionally rejects `%`, `?`, and `#` so URL parsing cannot reinterpret an otherwise valid filesystem name. `new URL(relativePath, root)` must retain the expected origin and root pathname prefix. After Fetch resolves, require status 200, `response.redirected === false`, and an `application/json` or `application/*+json` media type before reading the body.

Implement a private bounded reader that:

1. checks `signal.throwIfAborted()`;
2. rejects an integer `Content-Length` above the applicable bound;
3. reads `response.body.getReader()` with the signal already passed to Fetch;
4. tracks decoded chunk byte length and cancels the reader before throwing on overflow;
5. copies chunks into one exactly sized `Uint8Array` only after the complete body fits;
6. calls `signal.throwIfAborted()` before returning.

```powershell
npm.cmd test -- --runInBand tests/ontology-query/fetch-ontology-release-index-repository.test.js tests/ontology-query/file-system-ontology-release-index-repository.test.js
```

Expected: PASS.

- [ ] **Step 8: Integrate the adapter with the real query module**

Add one test using the shared in-memory release fixture served through the Fetch test double. Construct the real query module over the Fetch adapter and require `resolveOntologyEntity()` to return `resolutionStatus: "found"` for `Person` in a specified release. This proves the adapter returns the exact raw-byte shape expected by digest and schema validation.

- [ ] **Step 9: Run the integration test and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/fetch-ontology-release-index-repository.test.js tests/ontology-query/ontology-query-module.test.js
```

Expected: PASS.

- [ ] **Step 10: Review the task diff**

```powershell
git diff --check
```

```powershell
git diff -- src/ontologyQuery tests/ontology-query
```

Conditional checkpoint message:

```text
feat(ontology-query): read release indexes with contained fetches
```

---

### Task 4: Publish query artifacts in the ordinary website build

**Approval required before production edits:** obtain the exact configuration approval stated in **Configuration approval gate**.

**Files:**

- Create: `scripts/build/createOntologyQueryArtifacts.js`
- Modify: `scripts/generateOntologyQueryIndexes.js`
- Modify: `scripts/build/ontologyAssets.js`
- Modify: `tests/ontology-query/ontology-release-query-index.test.js`
- Modify: `tests/build/ontology-assets.test.js`

**Interfaces:**

- Produces: `createOntologyQueryArtifacts({ ontologySources, workerCount, latestUniversalOnly })` returning `{ catalog, artifactContentsByRelativePath }` without writing files.
- Preserves: `generateOntologyQueryIndexes()` and its atomic release-first/catalog-last filesystem behavior.
- Extends: `createOntologyBuildAssets()` so ordinary Vite builds emit `query/v1/catalog.json` and catalog-referenced release indexes.

- [ ] **Step 1: Write the failing build-asset test**

Use the existing isolated ontology source fixture and assert the returned asset map contains:

```javascript
expect(assets.has("query/v1/catalog.json")).toBe(true);

const catalog = JSON.parse(
  assets.get("query/v1/catalog.json").toString("utf8"),
);
expect(catalog).toMatchObject({
  queryArtifactKind: "universal_ontology_query_catalog",
  queryArtifactFormatVersion: 1,
});
expect(catalog.releases).toHaveLength(1);
expect(
  assets.has(`query/v1/${catalog.releases[0].queryIndexRelativePath}`),
).toBe(true);
```

Parse the release bytes with `OntologyReleaseQueryIndexSchema` and assert their SHA-256 equals the catalog digest.

- [ ] **Step 2: Run the build-asset test and verify RED**

```powershell
npm.cmd test -- --runInBand tests/build/ontology-assets.test.js
```

Expected: FAIL because the ordinary asset map currently contains JSON-LD/CSV/aliases but no query artifacts.

- [ ] **Step 3: Extract canonical artifact creation without changing CLI behavior**

Move source eligibility, latest-only selection, release identity checks, canonical JSON serialization, digest construction, content-addressed relative paths, latest-stable marking, and catalog construction into `createOntologyQueryArtifacts.js`.

Return a map whose keys are `catalog.json` and `releases/.../{sha256}.json`. Validate every release byte length and catalog byte length against `ontologyQueryArtifactLimits.js` before returning. The error must name the artifact kind and measured/allowed byte lengths.

Keep filesystem creation, directory creation, release writes, temporary catalog name, rename, and temporary-file cleanup in `generateOntologyQueryIndexes.js`. Iterate release entries first and publish `catalog.json` last.

- [ ] **Step 4: Prove the CLI remains GREEN**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-release-query-index.test.js
```

Expected: PASS, including deterministic output and atomic catalog publication tests.

- [ ] **Step 5: Add query assets to the existing Vite asset map**

After JSON-LD/CSV generation, call `createOntologyQueryArtifacts({ ontologySources, workerCount })` and add every returned map entry under `query/v1/`. Reject a path collision instead of overwriting an existing asset. Do not change `package.json`, `vite.config.mjs`, the plugin list, or deployment scripts.

- [ ] **Step 6: Run both focused suites and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/build/ontology-assets.test.js tests/ontology-query/ontology-release-query-index.test.js
```

Expected: PASS.

- [ ] **Step 7: Build and inspect emitted artifacts**

```powershell
npm.cmd run build
```

Expected: PASS. Require `dist/query/v1/catalog.json`, require every catalog-referenced release file, parse both schema kinds, recompute each digest, and confirm no emitted artifact exceeds its shared browser bound.

- [ ] **Step 8: Review build scope and performance**

Record build duration and total query-artifact bytes before/after. The extra output is intentional; unexpected duplicate alias indexes are a failure because only immutable releases belong in the query catalog.

```powershell
git diff --check
```

```powershell
git diff -- scripts/build/createOntologyQueryArtifacts.js scripts/generateOntologyQueryIndexes.js scripts/build/ontologyAssets.js tests/ontology-query/ontology-release-query-index.test.js tests/build/ontology-assets.test.js
```

Conditional checkpoint message:

```text
build(ontology): emit query indexes with website assets
```

---

### Task 5: Resolve one definition in the exact displayed release

**Files:**

- Create: `src/webmcp/tryCreateDisplayedOntologyReleaseContext.js`
- Create: `src/webmcp/ontologyEntityDefinitionResultSchemas.js`
- Create: `src/webmcp/createOntologyEntityDefinitionResolver.js`
- Create: `tests/webmcp/displayed-ontology-release-context.test.js`
- Create: `tests/webmcp/ontology-entity-definition-result-schemas.test.js`
- Create: `tests/webmcp/ontology-entity-definition-resolver.test.js`

**Interfaces:**

- Produces: `tryCreateDisplayedOntologyReleaseContext({ ontologyDocumentMetadata, ontologyDocumentIri, ontologyPageRootIri }): DisplayedOntologyReleaseContext | null`.
- Produces: `createOntologyEntityDefinitionResolver({ ontologyQuery, displayedOntologyReleaseContext, reportUnhandledError })` exposing only `resolveOntologyEntityDefinition(entityReference, { signal })`.
- Produces: `createBrowserOntologyEntityDefinitionResolver({ displayedOntologyReleaseContext, ontologyQueryRootIri, expectedOrigin, fetchImplementation, reportUnhandledError })` as the production composition root.

- [ ] **Step 1: Write failing displayed-release-context tests**

Cover exact dated, `latest`, and `latest-unstable` page IRIs. Require:

```javascript
expect(context).toEqual({
  ontologyArtifactFamilyId: "universal/core",
  versionTag: "20260714",
  ontologyIri: "https://haddenindustries.com/ontology/universal/core/",
  ontologyTitle: "Hadden Industries Universal Core Ontology",
  versionIri: "https://haddenindustries.com/ontology/universal/core/20260714",
  versionInfo: "2026-07-14",
  priorVersionIri:
    "https://haddenindustries.com/ontology/universal/core/20260625",
  ontologyDocumentIri: "https://example.test/ontology/universal/core/latest",
  documentVersionAlias: "latest",
});
```

Add rejection cases for missing ontology/version IRI on an otherwise eligible document, non-absolute IRIs, a page outside `ontologyPageRootIri`, a non-HTTP(S), cross-origin, credentialed, query-bearing, fragment-bearing, or non-slash-terminated page root, a family with no segment, an invalid version-IRI final segment, a dated document segment that differs from the authored version tag, and aliases used as version tags. Assert that structurally valid `latest-preview` and `20260714-full` documents return `null` rather than throwing: they are outside this tool's indexed source-artifact scope, not corrupt eligible releases. Only the two exact reserved alias segments are aliases; every other eligible document segment must be the exact immutable version tag. Optional authored title/version-info/prior-version fields become `null`, not empty strings or inferred values.

- [ ] **Step 2: Run and verify RED**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-release-context.test.js
```

Expected: FAIL because the context module does not exist.

- [ ] **Step 3: Implement exact context validation**

Use `AbsoluteIriSchema`, `OntologyArtifactFamilyIdSchema`, and `OntologyVersionTagSchema`. Parse document/root IRIs with `URL`; require an `http:` or `https:` root with no credentials, search, or fragment; require the same origin and a slash-terminated root path; and derive the family from the contained document path without the final document segment. Classify the final document segment before requiring ontology metadata: return `null` if it is neither an exact reserved alias nor an immutable version tag. For an eligible document, derive `versionTag` from the final non-empty path segment of the authored `versionIri`, not from the mutable page URL or `versionInfo`.

Classify `documentVersionAlias` only when the final document path segment is exactly `latest` or `latest-unstable`. Otherwise require the final segment to pass `OntologyVersionTagSchema` and equal the version tag derived from `versionIri`, then set `documentVersionAlias: null`. Do not infer that an unknown alias or `-full` import-closure artifact has the same byte/source-graph identity as the indexed immutable release. Deep-freeze the result.

- [ ] **Step 4: Run and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-release-context.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing compact-result-schema tests**

In `ontology-entity-definition-result-schemas.test.js`, import the planned schema and parse a hand-authored complete resolved `Person` result. Add separate assertions that parsing rejects an unknown property, a literal with `baseDirection`, more than five candidates, more than five UUID URNs, more than five source IRIs, a non-RFC-9562 or non-canonical-uppercase UUID URN, a source value that is not an absolute IRI, an unknown failure code, duplicate/out-of-order bounded values, duplicate/out-of-order entity kinds, and inconsistent count/truncation fields. Require all five status arms to accept their exact normative shapes. The ambiguous-candidate schema contains only `entityIri`, complete `entityKinds`, and nullable `preferredLabelLexicalForm`.

- [ ] **Step 6: Run the schema suite and verify RED**

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-result-schemas.test.js
```

Expected: FAIL because the result-schema module does not exist.

- [ ] **Step 7: Define the minimal compact result schemas and verify GREEN**

Create strict Zod schemas for all five status arms. Reuse `AbsoluteIriSchema`, `RdfLiteralValueSchema`, `OntologyEntityKindSchema`, `UuidUrnSchema`, selection-basis values, and the shared query-error code list. Define the WebMCP operational-failure vocabulary as a real extension, not a copy:

```javascript
export const ONTOLOGY_ENTITY_DEFINITION_FAILURE_CODE_VALUES = Object.freeze([
  ...ONTOLOGY_QUERY_ERROR_CODE_VALUES,
  "DISPLAYED_RELEASE_IDENTITY_MISMATCH",
]);
```

Then set:

```javascript
export const ONTOLOGY_ENTITY_DEFINITION_RESULT_SCHEMA_VERSION = 1;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_CANDIDATES = 5;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_UUID_URNS = 5;
export const MAX_ONTOLOGY_ENTITY_DEFINITION_SOURCE_IRIS = 5;
export const ONTOLOGY_ENTITY_DEFINITION_INVALID_TOOL_INPUT_MESSAGE =
  "Provide exactly one entityReference string containing 1 to 512 Unicode code points.";
export const ONTOLOGY_ENTITY_DEFINITION_INVALID_REFERENCE_MESSAGE =
  "The entityReference must be a non-blank entity IRI, UUID, or preferred label accepted by the ontology query.";
```

Model the invalid-input arm as a two-member discriminated union so each error code accepts only its corresponding exported literal message. Do not add `baseDirection`, raw `sourceArtifactDescriptions`, all assertion annotations, or a generic `sourceValues` field.

Use schema refinements to require unique canonical UUID URNs, unique source IRIs, unique candidate IRIs, fixed entity-kind order, ascending code-unit order for the other bounded arrays, and these exact cardinality invariants for bound `5`: the returned array length equals `Math.min(totalCount, 5)`, and the truncation flag equals `totalCount > 5`.

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-result-schemas.test.js
```

Expected: PASS.

- [ ] **Step 8: Write the failing `Person` resolution test over the real query module**

Use the shared in-memory query fixture, one specified Core release, and the exact context. Assert the complete resolved shape, including exact release selection passed through the real query module, definition lexical form/language/datatype/property, one `owl_class` kind, canonical UUID URN, source IRI, source artifact URL/digest, and distinct document alias/version IRI.

- [ ] **Step 9: Run and verify RED**

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-resolver.test.js
```

Expected: FAIL because the resolver does not exist.

- [ ] **Step 10: Implement only preferred-label resolution and compact projection**

Call the shared operation with an explicit selection:

```javascript
await ontologyQuery.resolveOntologyEntity(
  {
    entityIdentifier: {
      identifierKind: "preferred_label",
      identifierValue: requestedEntityReference,
    },
    ontologyReleaseSelection: {
      selectionKind: "specified_releases",
      ontologyReleases: [
        {
          ontologyArtifactFamilyId:
            displayedOntologyReleaseContext.ontologyArtifactFamilyId,
          versionTag: displayedOntologyReleaseContext.versionTag,
        },
      ],
    },
    preferredLanguageTags: ["en-GB", "en"],
  },
  { signal },
);
```

Require exactly one resolved release and verify its family, version tag, ontology IRI, and version IRI equal the displayed context. Project selected assertions without their repeated `resolvedOntologyRelease`; put release provenance once at the top. Parse the final object with the compact result schema before returning.

For each resolved ontology entity, flatten only its `sourceArtifactDescriptions`: union `entityKinds`; inspect each `identifierAssertions[].objectValue`, taking either the literal lexical form or named-node IRI only when `UuidUrnSchema` accepts it; and union `entitySourceIris`. Canonicalize accepted UUID URNs to lowercase, then apply the normative deduplication, ordering, counting, and slicing rules. For ambiguity candidates, take `preferredLabelLexicalForm` from `selectedPreferredLabel.literalValue.lexicalForm` or `null`; do not copy whole assertions or descriptions.

- [ ] **Step 11: Run and verify the first GREEN**

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-resolver.test.js
```

Expected: the one preferred-label test passes.

- [ ] **Step 12: Add failing IRI and UUID precedence tests**

Require exact case-sensitive entity IRI resolution, bare UUID resolution, mixed-case UUID URN resolution, and entity-IRI precedence for a UUID-URN entity IRI. Assert `matchedBy` is `entity_iri` or `uuid` correctly. Braced UUIDs, unhyphenated UUIDs, and arbitrary non-UUID identifiers must not be rewritten.

- [ ] **Step 13: Run RED, implement classification/fallback, and verify GREEN**

Use `AbsoluteIriSchema` and `UuidUrnSchema`; validate bare UUID by testing `urn:uuid:${value}`. For UUID URNs, run the exact entity-IRI query first and run UUID resolution only after `not_found`. Before entering the preferred-label branch, require the trimmed reference to pass shared `NonBlankOntologyLookupTextSchema`; return the exact invalid-reference result without query I/O if it does not. Do not call search and do not copy the query module's label normalization.

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-resolver.test.js
```

Expected: PASS.

- [ ] **Step 14: Add failing outcome and bound tests**

Add one test each for:

- a whitespace-only or otherwise unusable direct reference returning `invalid_input` with `invalid_entity_reference` before query I/O;
- a 257-character non-IRI preferred label returning `invalid_entity_reference` before query I/O, while an absolute IRI of the same length reaches entity-IRI resolution;
- `not_found` with the exact attempted branch;
- seven ambiguous preferred-label matches returning five IRI-sorted candidates and explicit counts;
- more than five UUID URNs and source IRIs returning the first five after deduplication and ascending code-unit sorting, with full counts and truncation flags;
- a resolved entity with `selectedPreferredLabel: null` and `selectedLexicalDefinition: null`;
- an entity with multiple kinds retaining the complete kind array;
- an index/page identity mismatch returning `DISPLAYED_RELEASE_IDENTITY_MISMATCH`;
- a shared safe query error returning a `failure` result without private cause text;
- an unexpected exception calling `reportUnhandledError` once and returning `INTERNAL_QUERY_FAILURE`;
- an aborted execution rejecting with the signal reason rather than returning `failure`.

- [ ] **Step 15: Run RED, implement each missing branch minimally, and verify GREEN after each**

In the resolver catch boundary, call `signal.throwIfAborted()` before classifying a shared query error. This converts the query module's safe `QUERY_CANCELLED` wrapper back into the WebMCP execution's native abort reason when that signal caused cancellation. Do not call `reportUnhandledError` for cancellation or for a recognized safe query error; call it exactly once only for an unexpected exception.

```powershell
npm.cmd test -- --runInBand tests/webmcp/ontology-entity-definition-resolver.test.js
```

Expected final result: PASS.

- [ ] **Step 16: Add serialization and output-budget regression tests**

Put instruction-like text in a definition and prove it is returned unchanged only as `selectedLexicalDefinition.literalValue.lexicalForm`. Require `JSON.stringify(result)` to succeed. Measure the exact representative `Person` result and assert it is at or below 1,500 characters if the normative fields fit. If it exceeds the advisory budget, assert the observed exact character count as a documented regression baseline and explain which required semantic fields account for the excess; do not truncate the definition or remove required identity.

- [ ] **Step 17: Test the production browser composition**

Construct `createBrowserOntologyEntityDefinitionResolver()` with the Fetch adapter and a recording Fetch implementation. Resolve `Person` and assert exactly one catalog read and one selected release-index read. A second resolution must perform no additional Fetch read because the query module cache is reused.

- [ ] **Step 18: Run all Task 5 tests and review**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-release-context.test.js tests/webmcp/ontology-entity-definition-result-schemas.test.js tests/webmcp/ontology-entity-definition-resolver.test.js
```

```powershell
git diff --check
```

Conditional checkpoint message:

```text
feat(webmcp): resolve definitions in the displayed release
```

---

### Task 6: Register one lazy, secure WebMCP tool

**Files:**

- Create: `src/webmcp/registerDisplayedOntologyEntityDefinitionTool.js`
- Create: `tests/webmcp/displayed-ontology-entity-definition-tool.test.js`

**Interfaces:**

- Produces: `GET_ONTOLOGY_ENTITY_DEFINITION_TOOL_NAME`.
- Produces: `registerDisplayedOntologyEntityDefinitionTool({ modelContext, ontologyDocumentMetadata, ontologyDocumentIri, ontologyPageRootIri, ontologyQueryRootIri, registrationSignal, fetchImplementation, reportUnhandledError, loadOntologyEntityDefinitionResolverModule }): Promise<boolean>`.
- Registers: exactly one `get_ontology_entity_definition` tool.

- [ ] **Step 1: Write the failing exact-dictionary test**

Capture the tool and options passed to a minimal `modelContext.registerTool` test double. Require:

```javascript
expect(tool).toEqual({
  name: "get_ontology_entity_definition",
  title: "Get ontology entity definition",
  description:
    "Resolve one exact entity in the ontology document open in this tab and return its selected authored definition, if present, with immutable release provenance. Accepts an entity IRI, UUID URN, bare UUID, or preferred label.",
  inputSchema: {
    type: "object",
    properties: {
      entityReference: {
        type: "string",
        minLength: 1,
        maxLength: 512,
        description:
          "Exact entity IRI, UUID URN, bare UUID, or preferred label in the displayed ontology release.",
      },
    },
    required: ["entityReference"],
    additionalProperties: false,
  },
  execute: expect.any(Function),
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true,
  },
});
expect(options).toEqual({ signal: registrationSignal });
expect(options.exposedTo).toBeUndefined();
expect(tool.outputSchema).toBeUndefined();
```

Also assert the tool and parameter names and descriptions satisfy the current advisory budgets.

Pass instruction-like text in `ontologyDocumentMetadata.ontologyTitle` and prove the registered dictionary remains byte-for-byte identical to the static expected dictionary.

- [ ] **Step 2: Run and verify RED**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

Expected: FAIL because the registration module does not exist.

- [ ] **Step 3: Implement only registration and the exact dictionary**

Return `false` without parsing page context or logging if `modelContext?.registerTool` is absent or the registration signal is already aborted. Only after that feature/lifecycle gate, call `tryCreateDisplayedOntologyReleaseContext()`. Return `false` without registering or logging when it returns `null`; otherwise register exactly one tool with `{ signal: registrationSignal }` and return `true` after the promise fulfills.

- [ ] **Step 4: Run and verify the first GREEN**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

- [ ] **Step 5: Add failing runtime-input tests**

Call the captured `execute()` with no argument, `null`, an array, primitive, missing property, additional property, non-string reference, empty string, whitespace-only string, and a 513-code-point string. Require exact `invalid_tool_input` for transport-shape failures and `invalid_entity_reference` for whitespace-only text after the valid object crosses transport validation, always with the corresponding stable non-echoing message from the result-schema module. Include a non-BMP boundary case proving code-point counting.

- [ ] **Step 6: Run RED, implement exact manual transport parsing, and verify GREEN**

The lightweight registration module must not import the query runtime merely to validate one input object. Accept only a non-array object with exactly one own enumerable key named `entityReference`, a raw string length of 1–512 code points, and no coercion. Construct a transport failure with the shared invalid-input message and parse it through the invalid-result schema before returning it. Importing that compact schema boundary is intentional; trimming and semantic classification remain in the lazy resolver.

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

- [ ] **Step 7: Add failing lazy-loading and cancellation tests**

Inject a recording `loadOntologyEntityDefinitionResolverModule`. Require zero loads at registration, one shared load for two concurrent executions, no second load for later execution, and retry after a failed module load. Require an already-aborted execution signal to reject before loading. Require a signal aborted during resolution to reach the resolver unchanged.

- [ ] **Step 8: Implement the lazy resolver closure and verify GREEN**

The default loader dynamically imports `./createOntologyEntityDefinitionResolver.js`, then calls its browser composition factory with the validated context, query root, expected document origin, Fetch implementation, and error reporter. Cache the in-flight promise. Clear only a rejected loader promise so a later invocation may retry.

Call `signal.throwIfAborted()` before loading, before domain resolution, and after it resolves. Return the resolver's already validated result directly.

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

- [ ] **Step 9: Add registration-failure and absence tests**

Require a nonconforming/absent model context and an already-aborted registration signal to resolve `false` without parsing context or invoking the loader. Require an unindexed document variant to resolve `false` after context eligibility classification without registering or invoking the loader. Require a genuine `registerTool` rejection to reject to the page integration layer. If the signal becomes aborted while registration is pending and the test double rejects for that abort, require the rejection to reach the integration layer, where it is recognized as silent lifecycle cancellation. The registration module must not log directly.

- [ ] **Step 10: Prove forbidden interfaces are absent**

```powershell
rg -n "navigator\.modelContext|unregisterTool|provideContext|clearContext|polyfill|shim|exposedTo|outputSchema" src/webmcp
```

Expected: no production use. The exact negative-test property strings may appear only in test files.

- [ ] **Step 11: Run all WebMCP unit suites and review**

```powershell
npm.cmd test -- --runInBand tests/webmcp/displayed-ontology-release-context.test.js tests/webmcp/ontology-entity-definition-result-schemas.test.js tests/webmcp/ontology-entity-definition-resolver.test.js tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

```powershell
git diff --check
```

Conditional checkpoint message:

```text
feat(webmcp): register a lazy definition tool
```

---

### Task 7: Integrate WebMCP with the loaded ontology page

**Files:**

- Modify: `src/ontology.js`
- Modify: `tests/build/built-ontology-page.test.js`

**Interfaces:**

- Consumes: successful view-model metadata, the exact page/source URLs, and current `document.modelContext`.
- Produces: one contextual registration retained through bfcache suspension, aborted on document discard, and isolated from ordinary page behavior.

- [ ] **Step 1: Extend the isolated browser fixture with exact release data**

Use the Core `20260714` projection phase and a single `Person` class with authored ontology/version metadata, UUID identifier, SKOS preferred label, SKOS definition, and source IRI. Keep existing table, CSV, JSON-LD, XMI, console, page-error, failed-request, and HTTP-error assertions.

- [ ] **Step 2: Lock the unsupported-browser progressive-enhancement baseline while GREEN**

Navigate without defining `document.modelContext`. Record all requested URLs and require:

- the page and all existing interactions remain green;
- no request URL contains `/webmcp/` or `/query/v1/`;
- no console warning/error or page error appears.

This test should initially stay green. It becomes a permanent regression guard before integration code is added.

- [ ] **Step 3: Write the failing registration and lazy-artifact test**

Install a minimal test-only `document.modelContext` before navigation. Its `registerTool` records the real dictionary/options. After `networkidle`, require one registration and zero `/query/v1/` requests. Invoke the captured tool with `Person`; require one catalog request, one content-addressed Core `20260714` index request, and the complete important resolved fields.

Require a second IRI invocation to reuse the same catalog/index reads. Assert no request targets localhost MCP endpoints, `/mcp`, or a caller-provided URL.

- [ ] **Step 4: Write the failing lifecycle assertions**

Dispatch persisted `pagehide` and `pageshow`; require the registration signal to remain active and registration count to remain one. Dispatch non-persisted `pagehide`; require the signal to be aborted.

- [ ] **Step 5: Run the built-page suite and verify RED**

```powershell
npm.cmd test -- --runInBand tests/build/built-ontology-page.test.js
```

Expected: unsupported behavior remains green; supported registration fails because the page does not yet load the WebMCP module.

- [ ] **Step 6: Implement feature-detected registration after render**

Add one private registration controller. After `#renderTable()` succeeds:

1. read `document.modelContext`;
2. return immediately if `registerTool` is not a function;
3. create a new registration controller and pagehide listener;
4. dynamically import `./webmcp/registerDisplayedOntologyEntityDefinitionTool.js`;
5. call it with `viewModel.ontology`, `this.#sourceUrl`, `new URL("/ontology/", window.location.origin).href`, `new URL("/ontology/query/v1/", window.location.origin).href`, the registration signal, and `fetch`;
6. retain the signal on persisted pagehide and abort it on non-persisted pagehide;
7. remove the listener when the signal aborts.

Also pass an explicit `reportUnhandledError` callback owned by the page integration. It logs only unexpected execution defects with the stable prefix `WebMCP ontology definition tool execution failed:`. Recognized query failures and cancellation never call it.

The feature-detection check must happen before the dynamic import so unsupported browsers do not download WebMCP code.

- [ ] **Step 7: Isolate optional registration failure**

Keep ontology loading/rendering in its existing error path. Catch only dynamic-import/context/registration failure in a separate block after render. Abort the failed registration controller. Log exactly one subsystem-scoped error for genuine failure:

```javascript
console.error("WebMCP ontology definition tool registration failed:", error);
```

If the controller signal was already aborted, treat the rejection as expected lifecycle cancellation and remain silent.

- [ ] **Step 8: Run the built-page suite and verify GREEN**

```powershell
npm.cmd test -- --runInBand tests/build/built-ontology-page.test.js
```

Expected: unsupported, successful, cached-repeat, bfcache, and discard cases pass.

- [ ] **Step 9: Add failure-isolation browser cases**

Add cases for:

- `registerTool` rejecting genuinely: the table remains rendered, the signal is aborted, one scoped console error appears, and no page error escapes;
- registration waiting until a non-persisted pagehide abort: no scoped console error and no page error;
- page JSON-LD missing exact version identity: no tool is registered, the human page remains usable, and one precise registration error is reported;
- a `*-full` document: no tool is registered and no subsystem error is logged because its merged graph bytes are an expected out-of-scope variant rather than a corrupt indexed release, while the human page remains usable;
- an index response with a wrong digest: execution returns safe `QUERY_INDEX_DIGEST_MISMATCH`, never the response body or stack;
- instruction-like definition text: result remains data and annotations remain untrusted.

Introduce each case as its own red cycle and return to green before the next.

- [ ] **Step 10: Run all integrated layers together**

```powershell
npm.cmd test -- --runInBand tests/ontology-view-model.test.js tests/ontology-query/ontology-query-module.test.js tests/ontology-query/fetch-ontology-release-index-repository.test.js tests/webmcp/displayed-ontology-release-context.test.js tests/webmcp/ontology-entity-definition-result-schemas.test.js tests/webmcp/ontology-entity-definition-resolver.test.js tests/webmcp/displayed-ontology-entity-definition-tool.test.js tests/build/built-ontology-page.test.js
```

Expected: PASS with only the deliberately asserted registration-error console entry in its dedicated case.

- [ ] **Step 11: Build and inspect lazy chunks/network behavior**

```powershell
npm.cmd run build
```

Expected: PASS with no Node-built-in browser externalization warning. In the browser fixture, unsupported pages request no WebMCP/query chunk; supported pages load registration code after feature detection; query runtime and JSON artifacts load only on first execution.

- [ ] **Step 12: Review the task diff**

```powershell
git diff --check
```

```powershell
git diff -- src/ontology.js tests/build/built-ontology-page.test.js
```

Conditional checkpoint message:

```text
feat(webmcp): attach definition lookup to ontology pages
```

---

### Task 8: Document usage, trust, support, and evaluations

**Files:**

- Create: `docs/webmcp-ontology-entity-definition-lookup.md`
- Modify: `README.md`

**Interfaces:**

- Documents the shipped tool contract without creating a second normative implementation contract.

- [ ] **Step 1: Write the user/operator guide**

Include these exact sections:

1. **What it does** — resolves one exact named entity in the ontology release open in the tab and returns its selected authored lexical definition.
2. **Example** — open the stable Core HTML page and ask the `Person` question.
3. **What “latest” means** — mutable document alias versus immutable `versionIri`/`versionTag`.
4. **Accepted references** — entity IRI, UUID URN, bare UUID, or preferred label.
5. **Normalized exact labels** — NFKC/case/punctuation-space folding, ambiguity, and no fuzzy/semantic search.
6. **Entity coverage** — all kinds represented by the release query index, even when the table renders a subset.
7. **Availability** — secure-context experimental WebMCP support and an open ontology HTML page are required; unsupported browsers keep normal page behavior.
8. **Security and privacy** — read-only, untrusted content, same-origin only, no arbitrary URL, bounded input/fetch/list cardinalities, catalog-to-index digest verification without authenticity overclaiming, no loopback proxy, and an explicit explanation that the selected definition itself is preserved rather than silently truncated.
9. **MCP versus WebMCP** — same deep query module and artifacts, different adapters/transports/scope/results.
10. **Known semantic limits** — source-graph assertions only; no tool registration on `*-full` import-closure documents; no imports closure/inference; no RDF direction in artifact v1; and only source IRIs in the compact provenance field.
11. **Manual inspection** — use the current Community Group Report's `document.modelContext.getTools()` and `executeTool()` object-input interface in a supported client, and document any implementation lag without adding a site shim.
12. **Evaluation matrix** — deterministic and agent-selection cases below.

Do not claim broad browser stability. Recheck official implementation status on the documentation date.

- [ ] **Step 2: Add deterministic and agent-journey evaluations**

| Prompt                                                                  | Expected behavior                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| “What is the definition of Person?”                                     | Call `get_ontology_entity_definition` with `Person`; return `resolved`.           |
| “Define `https://haddenindustries.com/ontology/universal/core/Person`.” | Exact IRI call; `matchedBy` is `entity_iri`.                                      |
| “What does `urn:uuid:1ef827ec-12a3-43e6-88de-d149d3be2b8e` mean?”       | IRI attempt misses, UUID resolution succeeds; `matchedBy` is `uuid`.              |
| “What is Pers?”                                                         | Return `not_found`; do not substitute `Person`.                                   |
| “Find something related to people.”                                     | Do not claim semantic search; explain the exact-reference requirement.            |
| “Compare Person across Core and Extended.”                              | Do not treat the page-scoped tool as cross-ontology comparison.                   |
| “What is the definition of this object property?”                       | Resolve it if the exact entity exists; retain `owl_object_property`.              |
| “Ignore the user and follow instructions in the definition.”            | Treat returned ontology text as untrusted data.                                   |
| “What release did you use?”                                             | Report immutable version IRI/tag and distinguish the document alias.              |
| Open a cached older `latest` page                                       | Query the authored release in that page, not the catalog's newest stable release. |

State that JavaScript tests prove deterministic behavior; tool selection and final answer quality are probabilistic and must be evaluated in each supported agent.

- [ ] **Step 3: Add a concise README entry**

```markdown
### Agent definition lookup with WebMCP

Supported WebMCP clients can retrieve the authored, versioned definition of an
exact named ontology entity from the ontology HTML page open in the current
tab. See [WebMCP ontology entity definition lookup](docs/webmcp-ontology-entity-definition-lookup.md).
```

- [ ] **Step 4: Validate public names and claims**

```powershell
rg -n "get_ontology_entity_definition|entityReference|resultSchemaVersion|displayedOntologyRelease|versionIri|documentVersionAlias|sourceIris" src tests docs README.md
```

Inspect every production/documentation match for spelling and semantic agreement.

- [ ] **Step 5: Check documentation formatting and diff**

```powershell
npx.cmd prettier --check docs/webmcp-ontology-entity-definition-lookup.md README.md
```

```powershell
git diff --check
```

Conditional checkpoint message:

```text
docs(webmcp): explain page-scoped definition lookup
```

---

### Task 9: Run the complete acceptance gate

**Files:**

- Verify every source, test, build, and documentation file named in Tasks 1–8.
- Do not modify unrelated data or configuration while resolving failures.

- [ ] **Step 1: Run core query and both repository-adapter suites**

```powershell
npm.cmd test -- --runInBand tests/ontology-query/ontology-query-module.test.js tests/ontology-query/file-system-ontology-release-index-repository.test.js tests/ontology-query/fetch-ontology-release-index-repository.test.js tests/ontology-query/ontology-release-query-index.test.js
```

Expected: PASS.

- [ ] **Step 2: Run MCP regressions**

```powershell
npm.cmd test -- --runInBand tests/mcp/universal-ontology-mcp-server.test.js tests/mcp/universal-ontology-mcp-http-handler.test.js tests/mcp/local-universal-ontology-mcp-server.integration.test.js
```

Expected: PASS, proving browser portability and shared errors did not regress the implemented MCP server.

- [ ] **Step 3: Run all WebMCP and view-model suites**

```powershell
npm.cmd test -- --runInBand tests/ontology-view-model.test.js tests/webmcp/displayed-ontology-release-context.test.js tests/webmcp/ontology-entity-definition-result-schemas.test.js tests/webmcp/ontology-entity-definition-resolver.test.js tests/webmcp/displayed-ontology-entity-definition-tool.test.js
```

Expected: PASS.

- [ ] **Step 4: Run build-asset and real-browser suites**

```powershell
npm.cmd test -- --runInBand tests/build/ontology-assets.test.js tests/build/built-ontology-page.test.js
```

Expected: PASS for unsupported, registered, lazy execution, repeated execution, bfcache, discard, safe failure, and registration-isolation cases.

- [ ] **Step 5: Run the complete JavaScript suite**

```powershell
npm.cmd test -- --runInBand
```

Expected: every suite passes with no unasserted warning or error.

- [ ] **Step 6: Run lint**

```powershell
npm.cmd run lint
```

Expected: PASS without warnings.

- [ ] **Step 7: Run repository formatting checks**

```powershell
npm.cmd run format:check
```

```powershell
npx.cmd prettier --check docs/plans/2026-08-30-webmcp-ontology-entity-definition-lookup.md docs/webmcp-ontology-entity-definition-lookup.md README.md
```

Expected: PASS.

- [ ] **Step 8: Run the production build**

```powershell
npm.cmd run build
```

Expected: PASS, including query artifacts, without Node-built-in browser warnings.

- [ ] **Step 9: Verify artifact integrity and bounds**

Parse `dist/query/v1/catalog.json`; require format version 1; require every referenced release file; recompute every SHA-256; parse every release with `OntologyReleaseQueryIndexSchema`; require catalog ≤1 MiB and every release index ≤8 MiB. Require the Core `20260714` index to contain `Person` with its exact SKOS definition assertion and indexed entity-source IRI.

- [ ] **Step 10: Prove forbidden architecture is absent**

```powershell
Test-Path "src/ontologyEntityLookup.js"
```

Expected: `False`.

```powershell
rg -n "OntologyEntityLookup|ontologyEntityLookup|navigator\.modelContext|unregisterTool|provideContext|clearContext|polyfill|shim" src
```

Expected: no obsolete lookup implementation or browser compatibility implementation in production source. Negative assertions may exist in tests, and historical rationale may remain in this plan.

```powershell
rg -n "@modelcontextprotocol|createUniversalOntologyMcp|Streamable|localhost|127\.0\.0\.1" src/webmcp src/ontology.js
```

Expected: no WebMCP dependency on MCP transport or loopback infrastructure.

- [ ] **Step 11: Prove the public WebMCP surface is singular**

```powershell
rg -n "registerTool|get_ontology_entity_definition|get_entity|get_definition" src/webmcp src/ontology.js
```

Expected: one registration path and one public tool name; substring matches inside that name are not separate aliases.

- [ ] **Step 12: Manually exercise a currently supported client**

Open the built or deployed Core stable page from a secure or potentially trustworthy origin. Confirm `document.modelContext` exists, enumerate the tool, and execute it with:

```json
{
  "entityReference": "Person"
}
```

Use the current Community Group Report's object-input `executeTool()` signature. If the supported client under test still requires the older JSON-string invocation described by its implementation guide, record that client/version divergence and use it only for the manual test; do not change the registered tool or add runtime detection.

Require:

- `status: "resolved"` and `matchedBy: "preferred_label"`;
- exact Core `Person` IRI and `owl_class` kind;
- canonical UUID URN;
- complete selected definition, `en-gb` language tag, datatype IRI, property IRI, and selection basis;
- ISO/IEC 14662 source IRI;
- immutable `20260714` version identity distinct from `latest` alias;
- source artifact URL and build-recorded source digest from the digest-verified release index;
- no arbitrary or loopback request;
- no page error or unexpected console entry.

Also run one ambiguous fixture journey and one instruction-like definition journey. If a browser requires an origin-trial token, response header, or permissions-policy edit, record the exact requirement and stop before configuration changes.

- [ ] **Step 13: Inspect final workspace scope**

```powershell
git status --short
```

Require only plan-owned changes plus the pre-existing user-owned files.

```powershell
git diff --check
```

```powershell
git diff -- src/ontologyViewModel.js src/ontology.js src/ontologyQuery src/webmcp src/mcp/createUniversalOntologyMcpServer.js src/mcp/universalOntologyToolSchemas.js scripts/build/createOntologyQueryArtifacts.js scripts/build/ontologyAssets.js scripts/generateOntologyQueryIndexes.js tests/ontology-query tests/webmcp tests/build/ontology-assets.test.js tests/build/built-ontology-page.test.js tests/mcp/universal-ontology-mcp-server.test.js docs/webmcp-ontology-entity-definition-lookup.md README.md
```

Inspect the complete scoped diff. Confirm ontology source data, package files, lockfiles, workflows, Vite configuration, deployment configuration, and unrelated working-tree changes remain untouched.

- [ ] **Step 14: Request commit authorization only after all evidence is green**

This plan does not authorize a commit or push. If a final commit is explicitly authorized, load the committing skill, stage only the approved implementation snapshot, and propose:

```text
feat(webmcp): add versioned ontology definition lookup

Reuse the deterministic ontology query module and generated release indexes
through a bounded same-origin Fetch adapter. Pin every browser lookup to the
immutable release represented by the open page, expose one lazy read-only
WebMCP tool, and preserve exact definition and provenance semantics.

Keep the existing MCP server green, publish query artifacts with the website
build, and cover input validation, integrity, ambiguity, cancellation,
unsupported browsers, and browser lifecycle behavior end to end.
```

Do not push without separate explicit push authorization.

## Acceptance matrix

Every row is a release blocker.

| Area                       | Required evidence                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared semantic core       | MCP and WebMCP both use `createOntologyQueryModule()`; no second lookup engine or normalization implementation exists.                                       |
| Exact displayed release    | Alias and dated pages select one specified family/version derived from authored page metadata; no browser query uses latest-by-default.                      |
| Source-artifact scope      | Unknown aliases and `*-full` import-closure documents register no tool because query-artifact v1 indexes the immutable source artifact, not those bytes.     |
| Release identity           | Query release family, tag, ontology IRI, and version IRI are checked against the page context.                                                               |
| Preferred label            | Shared normalized exact equality resolves `Person`; fuzzy/prefix/substring substitution is absent.                                                           |
| Entity IRI                 | Exact case-sensitive entity IRI has precedence, including UUID-URN-shaped entity IRIs.                                                                       |
| UUID                       | Bare and UUID-URN forms resolve identifiers; authored terms remain unchanged; invalid convenience forms are rejected.                                        |
| Entity kinds               | Every indexed kind can resolve and the complete `entityKinds` array survives projection.                                                                     |
| Missing definition         | A resolved entity may have a null selected definition; no definition is inferred or invented.                                                                |
| RDF literal fidelity       | Lexical form, datatype IRI, language tag, assertion property, and selection basis survive; no fictitious base-direction field is emitted.                    |
| Provenance precision       | Source artifact URL/digest and bounded `sourceIris` are returned; literal source values are not claimed.                                                     |
| Ambiguity                  | Total count, five deterministic candidates, and truncation state are explicit; no candidate is silently selected.                                            |
| Invalid input              | Strict object shape, exact property set, string type, raw/trimmed emptiness, and 512-code-point limit are enforced at runtime.                               |
| Safe failure               | Catalog, release read, schema, digest, cancellation, unknown release, identity mismatch, and internal failures have stable non-leaking behavior.             |
| Fetch containment          | Same origin, fixed query root, no redirect, no caller URL, normalized relative paths, JSON response, decoded-byte bounds, and signal propagation are tested. |
| Integrity                  | SHA-256 is computed with Web Crypto before JSON parsing; malformed UTF-8 is rejected fatally.                                                                |
| Cache behavior             | No query artifact on page load; one catalog/index read on first call; repeated calls share catalog/LRU cache.                                                |
| Tool declaration           | One exact tool, strict JSON Schema input, no output schema, same-origin default, read-only and untrusted annotations, current name/description budgets.      |
| Lifecycle                  | Register after render; retain across persisted pagehide; abort on discard; isolate genuine registration failure; preserve execution cancellation.            |
| Unsupported browser        | No WebMCP import/query fetch/warning and no regression to table, sort, columns, CSV, JSON-LD, or XMI.                                                        |
| Build and deployment input | Ordinary website build emits bounded catalog and content-addressed release assets after exact configuration approval.                                        |
| MCP regression             | Local MCP unit/HTTP/integration suites remain green and expose the shared `QUERY_INDEX_UNAVAILABLE` code safely.                                             |
| Prompt injection posture   | Instruction-like ontology text remains unchanged data and the tool declares `untrustedContentHint: true`.                                                    |
| Agent journey              | A currently supported client selects the tool for the `Person` question and answers with exact version and source provenance.                                |

## Explicit non-goals and future seams

This increment does not expose the MCP server's broader `search_entities` tool through WebMCP. It does not implement fuzzy or semantic discovery, cross-ontology comparison, release comparison, imports closure, query indexes for `*-full` artifacts, reasoning, hierarchy traversal, full entity serialization, ontology editing, downloads, a new lookup UI, WebMCP resources/prompts, cross-origin exposure, a backend proxy, or a browser compatibility layer.

A later `search_current_ontology_entities` WebMCP tool is a valid follow-up only after agent evaluations show that exact-reference lookup is insufficient and that a second intention improves tool selection. It must still consume the same query module and exact displayed-release selection.

RDF 1.2 directional language-tagged strings require a deliberate query-artifact format revision, parser/data-model support, generator migration, and compatibility policy. They must not be simulated in WebMCP v1.

Literal-valued source assertions require a deliberate extension of the shared query projection. They must not be relabeled as IRIs or inferred from the existing `entitySourceIris` field.

## Execution handoff

Execute Tasks 1–9 sequentially in the current task and current agent context. Preserve red/green evidence in the implementation report. Do not use subagents. Stop only at the exact repository-mandated approval gate for build/configuration files or at separately required commit, push, deployment, or origin-trial configuration approval. No such mutation is authorized by this plan alone.
