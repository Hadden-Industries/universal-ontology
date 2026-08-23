# Self-Contained OWL Import Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two Python import-merging scripts with a JavaScript generation workflow that resolves a root ontology's complete imports closure and atomically publishes one structurally faithful, independently loadable ontology document.

**Architecture:** The independently published `owlapi` package remains a
Java-OWLAPI-compatible ontology library: it loads the closure and supplies only
registry-approved manager, merger, change, document, format, and storage APIs.
A private `universal-ontology` runner consumes exact public package subpaths,
composes those APIs with application-owned catalog and network policies, builds
a one-ontology distribution artifact, performs a strict offline structural
round trip, and publishes only after the proof passes.

**Tech Stack:** Native ESM JavaScript on Node.js 24 LTS; exact public-registry
`owlapi@1.4.0`; RDF/JS; W3C OWL 2 structural semantics and OWL-to-RDF mapping;
OASIS XML Catalogs; Jest; the pinned Java OWLAPI 5.5.1 differential harness.

**Spec:** `docs/specs/2026-08-22-self-contained-owl-import-closure-contract.md`
is the normative consumer-owned contract. The canonical
`Hadden-Industries/owlapi` Public API Surface Registry, capability matrix, and
post-1.0 capability plan govern the package boundary and upstream feature
implementation; this plan does not duplicate them.

## Global Constraints

- This plan is **normative for execution order and gates**. Implementers **MUST** follow it task-by-task. A semantic deviation requires an approved spec amendment; an execution deviation requires an approved plan amendment before code relies on it.
- BCP 14 terms **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are normative only when capitalized.
- W3C OWL 2 structural semantics govern ontology meaning. Public Java OWLAPI 5.5.1 contracts and the upstream Public API Surface Registry govern any new `owlapi` public class or method. ROBOT, Protege, and current Python behavior are comparative evidence, not normative authorities.
- `owlapi` **MUST NOT** expose `materializeImportClosure`, `collapseImports`, or any other project-invented convenience method. The materialization policy belongs only to `universal-ontology`.
- Except for the curated bare aggregate, a public `owlapi` subpath **MUST** map exactly to a separately approved package beneath `org.semanticweb.owlapi`. A public binding **MUST** retain its Java responsibility, have an approved registry row and focused parity tests, and own one canonical definition in the matching Java-shaped namespace. If no corresponding upstream namespace exists, keep the helper private to `universal-ontology` or stop for an approved architecture amendment.
- `universal-ontology` **MUST** consume exact public-registry `owlapi@1.4.0` through only `owlapi/apibinding`, `owlapi/model`, `owlapi/io`, `owlapi/formats`, and `owlapi/util`. Relative, `file:`, `link:`, workspace, Git, copied-source, package-alias, resolver-alias, `owlapi/internal/*`, unexported deep, and nominal `owlapi/rdf` imports are forbidden.
- Functional Syntax and RDF/XML storage **MUST** be selected through `OWLOntologyManager.saveOntology`; this consumer neither requires nor directly imports `FunctionalSyntaxStorer` or `RDFXMLStorer` constructors.
- There **MUST NOT** be a compatibility shim, wrapper, forwarding module, deprecated alias, Python launcher for JavaScript, or parallel old/new implementation in either repository.
- Import resolution during generation **MUST** enable remote imports, catalog mappings, redirects, retries, and HTTP-to-HTTPS retry promotion. Missing, unreadable, unsupported, or unparsed input **MUST** fail generation.
- The output **MUST** load in a fresh manager with no catalog, no network loader, no local import resolver, and an imports closure of exactly one ontology.
- Root ontology identity and root ontology annotations **MUST** be retained. Imported ontology-level annotations **MUST** be dropped to preserve attribution purity.
- All direct axioms from every ontology in the complete input closure **MUST** be retained, including declarations, annotation assertion axioms, axiom annotations, and nested annotations. The workflow **MUST NOT** infer, repair, sanitize, normalize literal values, or invent provenance axioms.
- All imports declarations **MUST** be absent from the output. Import topology, module boundaries, imported ontology IDs as document headers, and source-document provenance **MUST NOT** be encoded as sidecars or synthetic ontology content.
- Prefix spellings, comments, source locations, concrete-syntax order, duplicate textual axiom occurrences, RDF named-graph membership, and document IRIs are not OWL structural information and are not output invariants.
- Anonymous individuals **MUST** retain identity within their source ontology and **MUST** be standardized apart across source ontologies. Verification **MUST** compare them modulo one consistent bijective renaming.
- RDF-based inputs **MUST** either reconstruct completely into the supported OWL structural model or fail. An ignored RDF statement is not a successful conversion.
- If the selected output syntax cannot represent the structural ontology losslessly, storage **MUST** fail without changing the destination. There is no literal sanitization and no silent format fallback.
- Publishing **MUST** use a temporary file in the destination directory, strict offline reload, structural verification, file flush, and same-directory atomic replacement. A failure **MUST** leave an existing destination unchanged and remove its temporary file.
- Existing working-tree changes are user-owned. Every implementation task **MUST** preserve unrelated modifications.
- Configuration files **MUST NOT** be changed without explicit approval for the exact file and setting. The only planned configuration changes are the exact package, lockfile, and generation-script settings called out in Task 1.
- Commits and pushes require their own explicit authorization. Conditional checkpoint commands in this plan **MUST NOT** be run merely because implementation was authorized.
- Before any authorized checkpoint, the executor **MUST** load and follow the repository's `committing-to-git` skill, stage only the approved plan-owned snapshot, and exclude overlapping unrelated hunks.
- Every shell command in this plan **MUST** be executed as its own command action and its exit status inspected before the next command; adjacent lines in a code block are not authorization to batch commands.

---

## Contract authority and non-duplication

The complete semantic, retention, exclusion, resolution, serialization, acceptance, and conformance requirements live only in `docs/specs/2026-08-22-self-contained-owl-import-closure-contract.md`. The machine-readable policy lives at `docs/import-closure/contract.v1.json`.

Before starting any task, read both artifacts in full. When this plan and the spec appear to differ, the spec controls and implementation stops until the owner approves a plan correction. This plan repeats only the global constraints needed to make an individual task safe; it does not create a second application contract.

The narrow upstream capability note is maintained at
`Hadden-Industries/owlapi: docs/compatibility/standalone-import-closure-prerequisites.md`.
It records only Java-compatible prerequisites and explicitly does not define or
export the application-owned materialization operation. During repository
extraction, its planning source is
`Hadden-Industries/webvowl: docs/owlapi-js/compatibility/standalone-import-closure-prerequisites.md`;
that WebVOWL path is not a consumer import or a second maintained authority.

## Delivery gates and file map

### Prerequisites

This consumer plan starts only after all of these upstream gates are complete:

1. the extraction/publication plan has completed with verified public
   `owlapi@1.0.1` and WebVOWL consuming that exact package;
2. the separate post-1.0 capability plan has implemented the complete
   imports-closure, mutation, merger, strict reconstruction, and Functional
   Syntax/RDF/XML storage slice in the canonical `Hadden-Industries/owlapi`
   repository;
3. the Public API Surface Registry and capability matrix classify every
   consumed binding as complete and public at its exact Java-backed subpath;
4. the exact retained `owlapi@1.4.0` artifact has passed installed-package,
   browser, Node, Java differential, round-trip, provenance, and public-registry
   verification.

The upstream work is a prerequisite, not an executable task group in this
consumer plan.
`universal-ontology` does not edit WebVOWL staging paths, the canonical package
source, its registry, or its capability matrix while executing this plan.

The executor must inspect the `universal-ontology` working tree before every
task. A dirty tree is not a blocker, but overlapping user changes must be
preserved and raised before editing. The released `owlapi` artifact and its
canonical registry evidence are immutable inputs, not a second working tree
modified by this plan.

### Planned file responsibilities

#### External `Hadden-Industries/owlapi` prerequisite

- `docs/compatibility/standalone-import-closure-prerequisites.md` — narrow Java-compatible prerequisites and a reference to the consumer-owned contract.
- `docs/compatibility/capabilities.json` — authoritative behavioral capability status.
- `docs/compatibility/java-api-surface.json` and `.md` — machine-readable registry and human compatibility/gap view.
- `owlapi/apibinding` — public manager bootstrap.
- `owlapi/model` — public ontology, manager, change, loader-configuration, and storage-operation bindings.
- `owlapi/io` — public document source/target and typed I/O failure bindings.
- `owlapi/formats` — public Functional Syntax and RDF/XML format identities.
- `owlapi/util` — public closure provider and ontology merger.
- package-private `internal/loading`, `internal/mapping`, `internal/rdfjs`, and `internal/storage` engines — upstream implementation details that this repository never imports.

This list describes accepted public responsibilities, not source filenames.
The canonical package registry owns the exact symbol-to-source mapping. Direct
concrete-storer constructors are not a consumer prerequisite.

#### `universal-ontology`

- `docs/specs/2026-08-22-self-contained-owl-import-closure-contract.md` — canonical normative output contract.
- `docs/plans/2026-08-22-self-contained-owl-import-closure.md` — canonical task-by-task implementation plan.
- `docs/import-closure/contract.v1.json` — machine-readable retention, exclusion, and verification policy; repository governance input, not an output sidecar.
- `scripts/ontology/oasisXmlCatalogIRIMapper.js` — application-owned OASIS catalog policy implementing `getDocumentIRI`.
- `scripts/ontology/ontologyDocumentLoader.js` — aggressive local/network document loading, decoding, redirect, retry, and HTTPS-promotion behavior.
- `scripts/ontology/collapseImportsClosure.js` — private composition of the standard OWLAPI-compatible closure provider, merger, ID change, and annotation changes.
- `scripts/ontology/ontologyStructuralFingerprint.js` — verification-only canonical structural encoding modulo anonymous-individual names.
- `scripts/ontology/verifyStandaloneOntology.js` — fresh-manager offline proof.
- `scripts/ontology/atomicOntologyWriter.js` — temp write, flush, verify, atomic replace, and cleanup.
- `scripts/materializeImportClosure.js` — one-root CLI.
- `scripts/createFullVersions.js` — explicit four-target batch.
- `tests/import-closure/**/*.test.js` and `tests/import-closure/fixtures/**` — contract, resolver, loader, atomicity, and end-to-end fixtures.
- `docs/import-closure-materialization.md` — command migration and operator failure guidance.
- `scripts/merge_owl_imports.py` and `scripts/create_full_versions.py` — deleted at hard cutover, with no replacements at those paths.

---

## Upstream library prerequisite gate

The implementation formerly described here as Tasks 1–6 is owned exclusively
by the canonical `Hadden-Industries/owlapi` post-1.0 capability plan. It is not
executed from this repository, and this consumer plan deliberately does not
duplicate upstream source paths, internal architecture, commits, or task
instructions.

Before Task 1 begins, the released package must provide these complete
capability IDs:

```text
manager.imports-closure-query
ontology.change-required-surface
util.imports-closure-set-provider
util.ontology-merger
manager.save-ontology
storer.functional
storer.rdfxml
rdf.strict-complete-reconstruction
```

The upstream gate is satisfied only when:

1. all eight capability rows are `COMPLETE` and agree with the Public API
   Surface Registry;
2. every binding consumed here is `PUBLIC` at one of the five exact package
   subpaths listed in the contract, has one canonical Java-shaped source owner,
   and passes installed-package tests;
3. the closure provider, merger, manager changes, document target, format
   identities, and manager storage operation have focused Java OWLAPI parity
   evidence;
4. Functional Syntax and RDF/XML storage pass exhaustive structural round trips
   and explicit representability-failure tests through
   `OWLOntologyManager.saveOntology`;
5. strict RDF reconstruction rejects rather than drops an unconsumed authored
   statement;
6. the complete composition agrees with the pinned Java OWLAPI 5.5.1 oracle on
   full ontology identity, root annotations, empty imports, axiom set, and
   anonymous-individual relationships; and
7. the exact retained artifact is publicly published as `owlapi@1.4.0` and
   verified from a fresh registry cache.

Direct `FunctionalSyntaxStorer` or `RDFXMLStorer` constructors are not part of
this gate. If the package publishes either under its exact Java package path for
another consumer, this workflow still uses manager-mediated storage. If any
gate above is absent, implementation stops; it must not reach into a sibling
checkout, reintroduce the former WebVOWL staging tree, or create a consumer shim.

---

### Task 1: Lock the consumer contract and add the exact `owlapi` dependency boundary

**Files:**

- Modify with explicit configuration approval: `C:\Users\maksy\GitHub\universal-ontology\package.json`
- Modify with explicit configuration approval: `C:\Users\maksy\GitHub\universal-ontology\package-lock.json`
- Verify: `C:\Users\maksy\GitHub\universal-ontology\docs\specs\2026-08-22-self-contained-owl-import-closure-contract.md`
- Verify: `C:\Users\maksy\GitHub\universal-ontology\docs\import-closure\contract.v1.json`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\contract-policy.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\owlapi-package-boundary.test.js`

**Interfaces:**

- Consumes: the approved consumer contract, its versioned machine-readable policy, and exact public-registry `owlapi@1.4.0` after the upstream prerequisite gate.
- Produces: a contract-lock test, one exact development dependency, and a test proving the consumer uses only published Java-compatible exports.

- [ ] **Step 1: Verify the package release before changing consumer configuration**

From a clean temporary consumer with the canonical public npm registry selected,
verify that `owlapi@1.4.0` resolves, its registry integrity/provenance and source
tag match the accepted retained artifact, and its installed-package tests expose
the five required subpaths. Confirm the upstream registry marks every consumed
symbol public and complete. Do not install a workspace path, `file:`, `link:`,
Git URL, unpublished tarball, symlink, copied source tree, package alias, local
re-export, or resolver alias as a substitute for the release.

- [ ] **Step 2: Request exact configuration approval**

Ask for approval to make only these changes:

- add `"owlapi": "1.4.0"` to `devDependencies` in `universal-ontology/package.json` because the package is used by repository generation tooling and tests, not browser runtime code;
- add `"generate:full-ontologies": "node scripts/createFullVersions.js"` to `scripts`;
- update `universal-ontology/package-lock.json` to pin the resolved package and integrity tree.

Behavioral impact: the repository gains one JavaScript ontology-generation command and one exact package dependency. Pipeline impact: `npm install` resolves the package; no build, lint, hosting, or CI setting changes.

Stop this task until that exact approval is granted.

- [ ] **Step 3: Write the contract-lock and failing package-boundary tests**

In `contract-policy.test.js`, load `docs/import-closure/contract.v1.json` relative to the repository root and pin every governance value:

```javascript
import { readFile } from "node:fs/promises";

const contractURL = new URL(
  "../../docs/import-closure/contract.v1.json",
  import.meta.url,
);

test("locks the approved standalone import-closure policy", async () => {
  const contract = JSON.parse(await readFile(contractURL, "utf8"));

  expect(contract).toEqual({
    schemaVersion: 1,
    owlapiBoundary: {
      packageName: "owlapi",
      sourceRepository: "https://github.com/Hadden-Industries/owlapi",
      registry: "https://registry.npmjs.org/",
      exactVersion: "1.4.0",
      dependencySection: "devDependencies",
      publicSubpathAuthority: "public-api-surface-registry",
      publicSubpathRule: "exact-approved-org.semanticweb.owlapi-package",
      publicBindingSourceOwnership:
        "single-canonical-definition-in-java-shaped-namespace",
      privateImplementationLayout: "cohesive-non-mirrored-internal",
      requiredPublicSpecifiers: [
        "owlapi/apibinding",
        "owlapi/model",
        "owlapi/io",
        "owlapi/formats",
        "owlapi/util",
      ],
      storageAccess: "OWLOntologyManager.saveOntology",
      concreteStorerConstructors: "not-required",
      unregisteredOrInternalImports: "forbid",
      localSourceTreeOrNonRegistryDependency: "forbid",
    },
    axiomPolicy: "union-direct-axioms-of-complete-imports-closure",
    rootOntologyID: "preserve",
    rootOntologyAnnotations: "preserve",
    importedOntologyAnnotations: "drop",
    importsDeclarations: "drop-all",
    anonymousIndividuals: "standardize-apart-by-source",
    inferredOrSyntheticAxioms: "forbid",
    literalMutation: "forbid",
    ignoredInput: "fatal",
    sidecars: "forbid",
    verification: "strict-offline-structural-round-trip-before-publish",
  });
});
```

In `owlapi-package-boundary.test.js`, import only the released,
registry-approved Java-compatible surfaces:

```javascript
import { OWLManager } from "owlapi/apibinding";
import {
  AddOntologyAnnotation,
  OWLOntologyLoaderConfiguration,
  SetOntologyID,
} from "owlapi/model";
import { StringDocumentSource, StringDocumentTarget } from "owlapi/io";
import { OWLDocumentFormats } from "owlapi/formats";
import {
  OWLOntologyImportsClosureSetProvider,
  OWLOntologyMerger,
} from "owlapi/util";

test("uses only the released Java-compatible package boundary", () => {
  const manager = OWLManager.createOWLOntologyManager();
  expect(typeof OWLManager.createOWLOntologyManager).toBe("function");
  expect(typeof manager.saveOntology).toBe("function");
  expect(typeof OWLOntologyImportsClosureSetProvider).toBe("function");
  expect(typeof OWLOntologyMerger).toBe("function");
  expect(typeof AddOntologyAnnotation).toBe("function");
  expect(typeof OWLOntologyLoaderConfiguration).toBe("function");
  expect(typeof SetOntologyID).toBe("function");
  expect(typeof StringDocumentSource).toBe("function");
  expect(typeof StringDocumentTarget).toBe("function");
  expect(OWLDocumentFormats.RDF_XML).toBeDefined();
  expect(OWLDocumentFormats.FUNCTIONAL).toBeDefined();
});
```

Add an import-graph assertion over `scripts/` and `tests/import-closure/` that
rejects the bare `owlapi` aggregate (unused by this consumer), relative or
source-tree reach-in, `owlapi/internal/*`, unexported subpaths, and nominal
`owlapi/rdf`. Do not assert that independently approved
future deep Java-package exports can never exist; assert only that this consumer
does not depend on them.

- [ ] **Step 4: Run both tests before package installation**

Run from `C:\Users\maksy\GitHub\universal-ontology`:

```powershell
npm test -- --runInBand tests/import-closure/contract-policy.test.js tests/import-closure/owlapi-package-boundary.test.js
```

Expected: the contract-policy test passes, and the package-boundary test fails
because `owlapi` is not installed.

- [ ] **Step 5: Apply the approved package and lockfile changes**

Run this as one command:

```powershell
npm install --save-dev --save-exact owlapi@1.4.0
```

Then add the one approved `generate:full-ontologies` script entry with a targeted edit. Inspect both configuration diffs and reject any unrelated dependency update or script rewrite.

- [ ] **Step 6: Run the boundary test and dependency audit**

```powershell
npm test -- --runInBand tests/import-closure/contract-policy.test.js tests/import-closure/owlapi-package-boundary.test.js
```

Expected: both tests PASS.

Run:

```powershell
npm audit --omit=optional
```

Expected: no new unresolved vulnerability that violates the dependency-governance policy. Record a real advisory rather than suppressing it.

- [ ] **Step 7: Request checkpoint authorization**

If authorized:

```powershell
git add package.json package-lock.json tests/import-closure/contract-policy.test.js tests/import-closure/owlapi-package-boundary.test.js
git commit -m "build: consume released owlapi tooling"
```

### Task 2: Implement the application-owned OASIS XML Catalog IRI mapper

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\oasisXmlCatalogIRIMapper.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\oasis-xml-catalog-iri-mapper.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\catalog\catalog-v001.xml`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\catalog\delegated.xml`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\catalog\next.xml`

**Interfaces:**

- Consumes: an absolute filesystem path or file URL for an OASIS XML Catalog and an optional asynchronous `loadCatalogDocument(catalogIRI)` callback for delegated/next catalogs.
- Produces: `OasisXmlCatalogIRIMapper.fromFile(catalogPath, options): Promise<OasisXmlCatalogIRIMapper>`, `mapper.getDocumentIRI(ontologyIRI): IRI | undefined`, and `findCatalog(startPath): Promise<string | undefined>`.

- [ ] **Step 1: Write failing catalog-resolution tests**

The fixtures must cover exact `uri`, URI-reference normalization, inherited `xml:base`, nested `group`, longest `rewriteURI`, longest `delegateURI`, `nextCatalog`, relative catalog references, no match, malformed URI, duplicate exact mappings, and catalog cycles.

```javascript
const mapper = await OasisXmlCatalogIRIMapper.fromFile(catalogPath);
expect(
  mapper.getDocumentIRI(IRI.create("https://example.test/exact")).value,
).toBe(pathToFileURL(expectedFile).href);
expect(
  mapper.getDocumentIRI(IRI.create("https://example.test/rewrite/item")).value,
).toBe(pathToFileURL(rewrittenFile).href);
expect(mapper.getDocumentIRI(IRI.create("urn:missing"))).toBeUndefined();
```

`findCatalog` starts at the root input document's directory and walks parent directories for `catalog-v001.xml`; it stops at the filesystem root.

- [ ] **Step 2: Run the focused test and confirm the module is absent**

```powershell
npm test -- --runInBand tests/import-closure/oasis-xml-catalog-iri-mapper.test.js
```

Expected: FAIL on the missing module.

- [ ] **Step 3: Parse catalogs without entity or network expansion**

Use the already-approved `@xmldom/xmldom` dependency to parse catalog bytes. Accept only the OASIS namespace `urn:oasis:names:tc:entity:xmlns:xml:catalog`. Resolve `xml:base` at each `catalog`, `group`, and entry element with `new URL(relative, inheritedBase)`.

Do not fetch a DTD or expand external entities. The default catalog-document callback reads `file:` URLs only. Tests inject a callback for HTTP catalogs. Task 3 supplies `OntologyDocumentLoader.loadCatalogDocument`; Task 6 wires it into the production catalog mapper so `delegateURI` and `nextCatalog` use the same bounded file/HTTP policy as ontology documents, never XML-parser ambient I/O.

- [ ] **Step 4: Implement URI-resolution precedence exactly**

Normalize the requested URI and catalog URI keys according to the OASIS URI-resolution rules before matching. Represent compiled entries as immutable records and resolve in this order:

```javascript
resolve(uri) {
  const exact = this.exactUriEntries.get(uri);
  if (exact) return exact;
  const rewrite = longestPrefix(this.rewriteEntries, uri);
  if (rewrite) return rewrite.rewrite(uri);
  const delegation = longestPrefix(this.delegateEntries, uri);
  if (delegation) return delegation.catalog.resolve(uri);
  for (const next of this.nextCatalogs) {
    const resolved = next.resolve(uri);
    if (resolved) return resolved;
  }
  return undefined;
}
```

Two conflicting exact `uri` entries at the same effective catalog priority are fatal instead of using document order silently. Detect catalog recursion by canonical catalog URL and report the entire cycle.

An unimplemented URI-resolution entry in the OASIS namespace is fatal; it is never silently ignored. `public`, `system`, and their external-identifier variants may be skipped because `owl:imports` supplies a URI, not a public/system identifier.

- [ ] **Step 5: Test the four repository catalogs**

Load:

```text
iso-iec11179-3/catalog-v001.xml
reference-data/catalog-v001.xml
core/catalog-v001.xml
extended/catalog-v001.xml
```

Assert that every `uri` entry maps to an existing local file or a valid HTTP(S) URL and that the effective local paths honor each catalog's own directory and `xml:base`.

- [ ] **Step 6: Run focused tests**

```powershell
npm test -- --runInBand tests/import-closure/oasis-xml-catalog-iri-mapper.test.js
```

Expected: PASS.

- [ ] **Step 7: Request checkpoint authorization**

If authorized:

```powershell
git add scripts/ontology/oasisXmlCatalogIRIMapper.js tests/import-closure/oasis-xml-catalog-iri-mapper.test.js tests/import-closure/fixtures/catalog
git commit -m "feat: resolve ontology IRIs through OASIS catalogs"
```

### Task 3: Implement maximally enabled, bounded ontology document loading

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\ontologyDocumentLoader.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\ontology-document-loader.test.js`

**Interfaces:**

- Consumes: `IRI`, loader `{ signal, config }`, an optional `OWLOntologyIRIMapper`, local `file:` URLs, and HTTP(S) URLs.
- Produces: `new OntologyDocumentLoader(options).load(documentIRI, context): Promise<StringDocumentSource>`, `loader.loadCatalogDocument(documentIRI, context): Promise<string>`, and `loader.loadRootDocument(inputPath, context): Promise<StringDocumentSource>`.

- [ ] **Step 1: Write failing local-file and decoding tests**

Cover UTF-8, UTF-8 BOM, UTF-16LE/BE XML byte signatures, explicit HTTP/XML charset, invalid byte sequences, missing files, exact `documentIRI`, content type, and file-name metadata. Invalid decoding must throw without inserting `U+FFFD`.

- [ ] **Step 2: Write failing network-policy tests with a local HTTP server**

Use a test server, not the public internet. Cover direct success, 20 redirects, redirect 21 failure, redirect loop, transient retry success, retry exhaustion, both delta-seconds and HTTP-date `Retry-After`, cancellation, 30-second attempt timeout via fake timers, streamed byte-limit overflow, HTTP 404, HTTP-to-HTTPS promotion through injected `fetchImpl`, and final attempt diagnostics.

```javascript
expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
  "http://example.test/ontology",
  "http://example.test/ontology",
  "http://example.test/ontology",
  "http://example.test/ontology",
  "https://example.test/ontology",
]);
```

The exact authored HTTP URL receives its initial attempt plus three retries before HTTPS promotion. A successful earlier attempt stops the sequence.

Add a mapped-candidate test: an unreadable catalog-mapped file falls through to the authored HTTP IRI, while successfully read malformed mapped bytes are returned to the manager and produce a fatal parse error rather than content substitution.

- [ ] **Step 3: Run the focused test and confirm failure**

```powershell
npm test -- --runInBand tests/import-closure/ontology-document-loader.test.js
```

Expected: FAIL on the missing loader.

- [ ] **Step 4: Implement bounded file and byte decoding**

Use `node:fs/promises`, `fileURLToPath`, `TextDecoder` with `{ fatal: true }`, and an explicit encoding detector. Return a `StringDocumentSource` whose document IRI is the exact resolved file/URL. The root loader resolves the supplied path to an absolute file URL before reading.

`loadCatalogDocument` reuses the same byte, redirect, retry, timeout, cancellation, and decoding primitives but returns decoded XML text instead of `StringDocumentSource`.

- [ ] **Step 5: Implement redirects, retries, and HTTPS promotion**

Use `fetch(currentUrl, { redirect: "manual", signal })`. Resolve each `Location` against the current URL, track visited URLs, and enforce the fixed limits in Section 7 of the canonical spec. Combine caller cancellation and per-attempt timeout without swallowing the caller's abort reason.

Send `User-Agent: universal-ontology-import-closure/1.0` and this explicit content-negotiation header on ontology requests:

```text
Accept: application/rdf+xml, application/owl+xml, text/owl-functional, text/owl-manchester, text/turtle, application/ld+json, application/n-triples, application/n-quads, application/trig, */*;q=0.1
```

Classify all exhausted outcomes into the existing typed `MissingImportError`, `UnloadableImportError`, `ResourceLimitError`, or `SecurityPolicyError` contracts. Attach attempt summaries as error data; do not persist them beside the ontology.

- [ ] **Step 6: Enforce maximum input bytes while streaming**

Read `response.body` chunks, increment encoded bytes, cancel immediately above `config.maxInputBytes`, and throw `ResourceLimitError` with `resource: "maxInputBytes"`, configured limit, and observed count. Do not call `response.arrayBuffer()` before enforcing the bound.

- [ ] **Step 7: Run loader tests with real timers restored**

```powershell
npm test -- --runInBand tests/import-closure/ontology-document-loader.test.js
```

Expected: PASS with no open server handles or pending timers.

- [ ] **Step 8: Request checkpoint authorization**

If authorized:

```powershell
git add scripts/ontology/ontologyDocumentLoader.js tests/import-closure/ontology-document-loader.test.js
git commit -m "feat: load ontology imports with retries and redirects"
```

### Task 4: Compose the closure collapse policy outside `owlapi`

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\collapseImportsClosure.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\collapse-imports-closure.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\closure\root.ofn`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\closure\imported-a.ofn`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\closure\imported-b.ofn`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\fixtures\closure\catalog-v001.xml`

**Interfaces:**

- Consumes: `{ inputManager, outputManager, rootOntology }`.
- Produces: `collapseImportsClosure({ inputManager, outputManager, rootOntology }): OWLOntology` as a private repository module; this name is never exported from `owlapi`.

- [ ] **Step 1: Write the complete policy test before implementation**

Load the fixture closure in strict mode and assert all four contract components:

```javascript
const collapsed = collapseImportsClosure({
  inputManager,
  outputManager,
  rootOntology: root,
});

expect(collapsed.getOntologyID().equals(root.getOntologyID())).toBe(true);
expect(collapsed.getAnnotations()).toEqual(root.getAnnotations());
expect(collapsed.getImportsDeclarations()).toEqual(new Set());
expect(collapsed.getAxioms()).toEqual(expectedClosureAxiomUnion);
```

Also assert that imported ontology annotations are absent, annotation assertion axioms about imported ontology IRIs remain, and no synthetic axiom or annotation appears.

- [ ] **Step 2: Add anonymous-individual scope and duplicate tests**

Both imports use the source label `_:same`; each also uses that individual more than once. The collapsed ontology must contain two distinct individuals, preserve each source's internal sharing, and structurally deduplicate only genuinely equal axioms.

- [ ] **Step 3: Run the focused test and confirm the module is absent**

```powershell
npm test -- --runInBand tests/import-closure/collapse-imports-closure.test.js
```

Expected: FAIL on the missing private composition function.

- [ ] **Step 4: Implement only standard OWLAPI-compatible composition**

```javascript
export function collapseImportsClosure({
  inputManager,
  outputManager,
  rootOntology,
}) {
  const provider = new OWLOntologyImportsClosureSetProvider(
    inputManager,
    rootOntology,
  );
  const merger = new OWLOntologyMerger(provider);
  const rootID = rootOntology.getOntologyID();
  const collapsed = merger.createMergedOntology(
    outputManager,
    rootID.ontologyIRI,
  );

  outputManager.applyChange(new SetOntologyID(collapsed, rootID));
  outputManager.applyChanges(
    [...rootOntology.getAnnotations()].map(
      (annotation) => new AddOntologyAnnotation(collapsed, annotation),
    ),
  );
  return collapsed;
}
```

Do not inspect RDF triples, ontology-header subjects, or source filenames here. This module deals only in structural OWL objects.

- [ ] **Step 5: Add in-memory postcondition assertions**

Before returning, compute the direct-axiom structural union from `inputManager.getImportsClosure(rootOntology)` and throw if ID, root annotations, imports, or axioms differ. Use ordinary structural equality here because the same in-memory anonymous objects are copied by the merger.

- [ ] **Step 6: Run policy tests**

```powershell
npm test -- --runInBand tests/import-closure/collapse-imports-closure.test.js
```

Expected: PASS.

- [ ] **Step 7: Request checkpoint authorization**

If authorized:

```powershell
git add scripts/ontology/collapseImportsClosure.js tests/import-closure/collapse-imports-closure.test.js tests/import-closure/fixtures/closure
git commit -m "feat: collapse imports with root attribution policy"
```

### Task 5: Implement strict structural fingerprinting and offline verification

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\ontologyStructuralFingerprint.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\verifyStandaloneOntology.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\ontology-structural-fingerprint.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\verify-standalone-ontology.test.js`

**Interfaces:**

- Consumes: an expected collapsed `OWLOntology`, serialized UTF-8 text, and one exact `OWLDocumentFormat`.
- Produces: `ontologyStructuralFingerprint(ontology): Promise<string>` and `verifyStandaloneOntology({ expectedOntology, serializedText, format }): Promise<OWLOntology>`.

- [ ] **Step 1: Write failing alpha-equivalence fingerprint tests**

Create pairs that differ only by anonymous-individual identifiers and document scopes; their fingerprints must match. Then independently change one IRI, literal lexical form, datatype, language tag, annotation nesting, axiom kind, operand, anonymous-individual sharing relationship, ontology annotation, or ontology ID; each fingerprint must differ.

- [ ] **Step 2: Encode OWL structure into a verification-only RDF dataset**

Use a fixed private vocabulary `urn:universal-ontology:structural-verification:`. Encode every structural object kind, field name, primitive value, array index, and unordered-set membership. Preserve exact IRI strings and literal lexical/datatype/language fields. Represent each distinct anonymous individual as a shared RDF blank node; never include its source label or document scope. Encode an ontology ID from ontology IRI, version IRI, and an explicit anonymous boolean; never include its process-local anonymous token or `structuralKey()`.

For every other structural object, allocate a fresh encoding node per structural occurrence, even when the same JavaScript object instance is reused. Object-identity sharing is not OWL structure except for anonymous-individual references. Ordered duplicate occurrences therefore remain distinct by their index edges, while unordered associations remain duplicate-free under the ontology model's structural set semantics.

Canonicalize the generated N-Quads with the repository's existing `rdf-canonize` dependency:

```javascript
const canonical = await rdfCanonize.canonize(nquads, {
  algorithm: "RDFC-1.0",
  inputFormat: "application/n-quads",
});
return createHash("sha256").update(canonical, "utf8").digest("hex");
```

Emit the private verification dataset with a small local N-Quads encoder whose tests cover IRI escaping, literal quotes/backslashes/control characters, Unicode, datatype IRIs, language tags, and valid blank-node labels. Do not import a transitive RDF data-model package or add a dependency solely for this verification encoding.

This dataset exists only in memory for equality proof. It is not an ontology representation, output format, public API, cache file, or sidecar.

- [ ] **Step 3: Make taxonomy coverage exhaustive**

The encoder dispatches on every `OWLObjectKind`. A test iterates the exported taxonomy and requires an encoder for each supported kind. Unsupported/deferred kinds cannot be silently stringified.

- [ ] **Step 4: Run fingerprint tests**

```powershell
npm test -- --runInBand tests/import-closure/ontology-structural-fingerprint.test.js
```

Expected: PASS after implementation.

- [ ] **Step 5: Write the failing offline-verifier tests**

Inject a document loader whose `load()` increments a counter and throws. Verify a correct Functional and RDF/XML artifact succeeds with zero loader calls. Separately mutate/remove/add an axiom, root annotation, version IRI, imports declaration, anonymous sharing edge, literal datatype, or language tag; each must fail.

```javascript
expect(loader.load).not.toHaveBeenCalled();
expect(offlineManager.getImportsClosure(reloaded).size).toBe(1);
expect(await ontologyStructuralFingerprint(reloaded)).toBe(
  await ontologyStructuralFingerprint(expectedOntology),
);
```

- [ ] **Step 6: Implement the fresh-manager verifier**

Construct a new manager with no IRI mapper and a loader that always throws. Load from a `StringDocumentSource` with strict configuration:

```javascript
const configuration = new OWLOntologyLoaderConfiguration({
  format,
  parsingMode: "strict",
  loadAnnotationAxioms: true,
  remoteImports: false,
  remoteJsonLdContexts: false,
  missingImportHandling: "throw",
  rdfDatasetGraphPolicy: "requireSingleGraph",
  collectWarnings: true,
});
```

Reject any diagnostic whose code denotes ignored, recovered-with-loss, or unsupported content. Check full root ID fields and anonymous status separately, check root annotations and axioms via the fingerprint, require empty imports declarations, require closure size one, and assert the rejecting loader was never called.

- [ ] **Step 7: Run verifier tests**

```powershell
npm test -- --runInBand tests/import-closure/ontology-structural-fingerprint.test.js tests/import-closure/verify-standalone-ontology.test.js
```

Expected: PASS.

- [ ] **Step 8: Request checkpoint authorization**

If authorized:

```powershell
git add scripts/ontology/ontologyStructuralFingerprint.js scripts/ontology/verifyStandaloneOntology.js tests/import-closure/ontology-structural-fingerprint.test.js tests/import-closure/verify-standalone-ontology.test.js
git commit -m "test: prove standalone ontology structure offline"
```

### Task 6: Add verified atomic publication and the one-root CLI

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\ontology\atomicOntologyWriter.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\materializeImportClosure.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\atomic-ontology-writer.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\materialize-import-closure-cli.test.js`

**Interfaces:**

- Consumes: collapsed ontology, output manager, exact format, destination path, and process arguments.
- Produces: `writeVerifiedOntology({ ontology, manager, format, outputPath }): Promise<void>`, `materializeImportClosure(options): Promise<void>`, and CLI `node scripts/materializeImportClosure.js INPUT OUTPUT [--catalog PATH] [--format rdfxml|functional]`.

- [ ] **Step 1: Write failing atomicity tests**

Create a pre-existing destination containing `sentinel`. Force serializer failure, verifier failure, temporary write failure, and rename failure independently. After each:

```javascript
expect(await readFile(outputPath, "utf8")).toBe("sentinel");
expect(await readdir(outputDirectory)).toEqual(["output.owl"]);
```

Then prove success replaces the destination and leaves no temporary file. Run on the repository's Windows environment so same-directory replacement behavior is exercised directly.

- [ ] **Step 2: Implement temp-write, flush, verify, and replace in that order**

Resolve the destination to an absolute path and create only its parent directory with `mkdir(parent, { recursive: true })`. Use a collision-resistant temp basename in that exact destination directory. Serialize to `StringDocumentTarget`, write UTF-8 bytes through a file handle opened with `wx`, call `sync()`, close it, read the temp bytes, verify those exact bytes offline, then call `rename(tempPath, outputPath)`. A `finally` block removes only the validated temp path when it still exists.

Validate the resolved temp and destination paths are both direct children of the intended output directory before any cleanup or rename.

- [ ] **Step 3: Run atomic writer tests**

```powershell
npm test -- --runInBand tests/import-closure/atomic-ontology-writer.test.js
```

Expected: PASS.

- [ ] **Step 4: Write failing CLI contract tests**

Cover positional arguments, explicit/auto-discovered catalog, default RDF/XML, explicit Functional Syntax, unknown option, unknown format, missing input, identical resolved input/output paths, closure cycle, missing import, malformed imported ontology, strict ignored-RDF failure, RDF/XML representability failure, successful output, and stable exit categories:

```text
0 success
2 command usage
3 root load/parse
4 import resolution/load/parse
5 serialization/representability
6 offline verification
7 filesystem publication
```

The tests spawn Node for exit-code coverage and call the exported function for focused assertions.

- [ ] **Step 5: Implement the library function with the fixed generation configuration**

```javascript
export async function materializeImportClosure({
  inputPath,
  outputPath,
  catalogPath,
  format = "rdfxml",
}) {
  const catalogLoader = new OntologyDocumentLoader();
  const selectedCatalog = catalogPath ?? (await findCatalog(inputPath));
  const mapper = selectedCatalog
    ? await OasisXmlCatalogIRIMapper.fromFile(selectedCatalog, {
        loadCatalogDocument: (catalogIRI) =>
          catalogLoader.loadCatalogDocument(catalogIRI, {
            config: generationConfiguration,
          }),
      })
    : undefined;
  const loader = new OntologyDocumentLoader({ iriMapper: mapper });
  const inputManager = OWLManager.createOWLOntologyManager({
    documentLoader: loader,
  });
  const rootSource = await loader.loadRootDocument(inputPath, {
    config: generationConfiguration,
  });
  const rootOntology = await inputManager.loadOntologyFromOntologyDocument(
    rootSource,
    generationConfiguration,
  );
  const outputManager = OWLManager.createOWLOntologyManager();
  const ontology = collapseImportsClosure({
    inputManager,
    outputManager,
    rootOntology,
  });
  const outputFormat =
    format === "rdfxml"
      ? OWLDocumentFormats.RDF_XML
      : OWLDocumentFormats.FUNCTIONAL;
  await writeVerifiedOntology({
    format: outputFormat,
    manager: outputManager,
    ontology,
    outputPath,
  });
}
```

Construct a catalog-document loader before compiling the catalog and pass a callback that invokes its `loadCatalogDocument` method with `generationConfiguration`. Then construct the ontology-document loader with the compiled mapper. Keep the manager's own `iriMappers` list empty so the application loader receives the authored import IRI and can try mapped, authored, and HTTPS-promoted candidates in the required order.

Use `node:util.parseArgs` for the CLI. The public CLI exposes no flag for missing-import diagnostics, literal sanitization, logical-axiom-only merging, imported annotation copying, sidecar generation, arbitrary graph merging, or disabling verification.

Before loading, resolve both positional paths and reject equality as exit category 2. The distribution command is not an in-place ontology editor.

- [ ] **Step 6: Assert strict load configuration**

The generation manager configuration is fixed to:

```javascript
const generationConfiguration = new OWLOntologyLoaderConfiguration({
  parsingMode: "strict",
  loadAnnotationAxioms: true,
  remoteImports: true,
  remoteJsonLdContexts: true,
  missingImportHandling: "throw",
  rdfDatasetGraphPolicy: "requireSingleGraph",
  maxRedirects: 20,
  maxRetries: 3,
  collectWarnings: true,
  sourceLocations: true,
});
```

Use the finite byte/axiom/import/depth ceilings supplied by the completed
`owlapi@1.4.0` resource contract. Do not replace them with infinity.

- [ ] **Step 7: Run CLI tests**

```powershell
npm test -- --runInBand tests/import-closure/materialize-import-closure-cli.test.js
```

Expected: PASS with no output file on any unsuccessful case.

- [ ] **Step 8: Request checkpoint authorization**

If authorized:

```powershell
git add scripts/ontology/atomicOntologyWriter.js scripts/materializeImportClosure.js tests/import-closure/atomic-ontology-writer.test.js tests/import-closure/materialize-import-closure-cli.test.js
git commit -m "feat: publish verified standalone ontologies atomically"
```

### Task 7: Replace the four-target Python batch with direct JavaScript composition

**Files:**

- Create: `C:\Users\maksy\GitHub\universal-ontology\scripts\createFullVersions.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\create-full-versions.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\tests\import-closure\real-distribution-contract.test.js`
- Create: `C:\Users\maksy\GitHub\universal-ontology\docs\import-closure-materialization.md`
- Modify: `C:\Users\maksy\GitHub\universal-ontology\README.md`

**Interfaces:**

- Consumes: `materializeImportClosure(options)` directly, without subprocess or forwarding wrapper.
- Produces: `createFullVersions(): Promise<void>` and `npm run generate:full-ontologies`.

- [ ] **Step 1: Write the failing target-table test**

Require this exact ordered target table, resolved relative to `scripts/createFullVersions.js`:

```javascript
export const targets = Object.freeze([
  Object.freeze({
    input: "../dist/iso-iec/11179/-3/ed-4/20260714",
    output: "../dist/iso-iec/11179/-3/ed-4/20260714-full",
    catalog: "../iso-iec11179-3/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/reference-data/20260714",
    output: "../dist/universal/reference-data/20260714-full",
    catalog: "../reference-data/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/core/20260714",
    output: "../dist/universal/core/20260714-full",
    catalog: "../core/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/extended/20260714",
    output: "../dist/universal/extended/20260714-full",
    catalog: "../extended/catalog-v001.xml",
    format: "rdfxml",
  }),
]);
```

This corrects the Python batch's ineffective catalog auto-discovery from under `dist/` by supplying each repository catalog explicitly.

- [ ] **Step 2: Write the failing direct-composition and fail-fast tests**

Mock `materializeImportClosure`, require calls in table order, and make the second call fail. Assert calls three and four do not occur and no child process is started.

- [ ] **Step 3: Implement the batch as one ESM module**

Resolve all three paths in each record with `fileURLToPath(new URL(relative, import.meta.url))`, call `materializeImportClosure` sequentially, log input/output/catalog for auditability, and let the first typed failure set a nonzero process exit code. Do not duplicate loader, collapse, serializer, verifier, or atomic-write logic.

- [ ] **Step 4: Run the batch unit test**

```powershell
npm test -- --runInBand tests/import-closure/create-full-versions.test.js
```

Expected: PASS.

- [ ] **Step 5: Generate the real four outputs**

```powershell
npm run generate:full-ontologies
```

Expected: all four targets report a fully resolved closure and pass their embedded offline proof. No import fetch should be required when the four catalogs cover the closure; network remains enabled as fallback.

- [ ] **Step 6: Add and run the real-distribution contract test**

For each source/output/catalog triple, load the source closure strictly, compute the expected contract ontology, load the generated output with a rejecting loader, and assert the complete contract fingerprint, empty imports, closure size one, exact root ID, and exact root annotations.

```powershell
npm test -- --runInBand tests/import-closure/real-distribution-contract.test.js
```

Expected: PASS for all four distributions.

- [ ] **Step 7: Document the hard command migration**

Add this exact operator table:

| Removed command                                                      | Required command                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `python scripts/merge_owl_imports.py INPUT OUTPUT --catalog CATALOG` | `node scripts/materializeImportClosure.js INPUT OUTPUT --catalog CATALOG --format rdfxml` |
| `python scripts/create_full_versions.py`                             | `npm run generate:full-ontologies`                                                        |

Document retained/dropped information, fatal conditions, HTTPS promotion, no-sidecar policy, output-format choice, and the offline proof. State that there is no compatibility wrapper and that Git history is the only recovery path for the Python implementation.

- [ ] **Step 8: Run docs-adjacent and full consumer tests**

```powershell
npm test -- --runInBand tests/import-closure
```

Expected: PASS.

- [ ] **Step 9: Request checkpoint authorization**

Generated `dist/**/20260714-full` files are ignored build artifacts and are not staged. If authorized:

```powershell
git add scripts/createFullVersions.js tests/import-closure/create-full-versions.test.js tests/import-closure/real-distribution-contract.test.js docs/import-closure-materialization.md README.md
git commit -m "feat: generate full ontologies with owlapi"
```

### Task 8: Hard cutover, delete Python, and run final acceptance

**Files:**

- Delete: `C:\Users\maksy\GitHub\universal-ontology\scripts\merge_owl_imports.py`
- Delete: `C:\Users\maksy\GitHub\universal-ontology\scripts\create_full_versions.py`
- Modify: any discovered documentation or automation reference only after exact configuration approval where applicable
- Verify: all files created or modified by Tasks 1–7

**Interfaces:**

- Consumes: the green JavaScript runner and real-distribution proof.
- Produces: one supported generation path with no shim or legacy implementation.

- [ ] **Step 1: Search for every legacy reference before deletion**

Run:

```powershell
rg -n "merge_owl_imports|create_full_versions|sanitise_graph_literals|canonicalise_graph" .
```

Classify every match. Source/docs references must move to the new command. Historical plan text may remain only when clearly labeled historical. If a CI, package, build, lint, or repository-policy configuration reference is found, stop and request explicit approval for that exact file and setting before editing it.

- [ ] **Step 2: Delete both Python files in the same change**

Delete `scripts/merge_owl_imports.py` and `scripts/create_full_versions.py`. Do not leave a Python script that invokes Node, a same-name JavaScript alias, a deprecation message, or a copied RDFLib fallback.

- [ ] **Step 3: Prove there is one implementation path**

Run:

```powershell
rg -n "rdflib|saniti[sz]e.*literal|get_bnode_hash|deterministic_xml_formatting|subprocess.*merge" scripts tests
```

Expected: no import-closure implementation match. A match belonging to an unrelated script must be documented in the task report and left untouched.

Run:

```powershell
rg -n "materializeImportClosure|collapseImportsClosure" scripts tests
```

Expected: matches identify only the private `universal-ontology` implementation and its tests.

Run the focused installed-package boundary test again:

```powershell
npm test -- --runInBand tests/import-closure/owlapi-package-boundary.test.js
```

Expected: PASS. Its import-graph assertion proves application source uses only
the five approved package subpaths and never reaches a package-internal module.
The upstream release gate, rather than a sibling source-tree search, proves that
`owlapi` exports no project-owned collapse/materialization operation.

- [ ] **Step 4: Run the complete `universal-ontology` verification gate**

```powershell
npm test -- --runInBand
```

```powershell
npm run lint
```

```powershell
npm run format:check
```

```powershell
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Regenerate and independently inspect all four outputs**

```powershell
npm run generate:full-ontologies
```

Expected: PASS.

For each output, verify with the exact installed public-registry
`owlapi@1.4.0` package in a fresh Node process that:

```text
imports declarations = 0
imports closure size  = 1
root ontology ID      = source root ontology ID
root annotations      = source root annotations
axiom fingerprint     = source closure axiom-union fingerprint
external loader calls = 0
```

Run the independent pinned Java OWLAPI oracle for the same four artifacts, one
command at a time from a clean checkout of `Hadden-Industries/owlapi` at the
source tag recorded for `owlapi@1.4.0`:

```powershell
node util/owlapi-reference/run-import-closure-contract.mjs --root C:\Users\maksy\GitHub\universal-ontology\dist\iso-iec\11179\-3\ed-4\20260714 --catalog C:\Users\maksy\GitHub\universal-ontology\iso-iec11179-3\catalog-v001.xml --verify-output C:\Users\maksy\GitHub\universal-ontology\dist\iso-iec\11179\-3\ed-4\20260714-full
```

```powershell
node util/owlapi-reference/run-import-closure-contract.mjs --root C:\Users\maksy\GitHub\universal-ontology\dist\universal\reference-data\20260714 --catalog C:\Users\maksy\GitHub\universal-ontology\reference-data\catalog-v001.xml --verify-output C:\Users\maksy\GitHub\universal-ontology\dist\universal\reference-data\20260714-full
```

```powershell
node util/owlapi-reference/run-import-closure-contract.mjs --root C:\Users\maksy\GitHub\universal-ontology\dist\universal\core\20260714 --catalog C:\Users\maksy\GitHub\universal-ontology\core\catalog-v001.xml --verify-output C:\Users\maksy\GitHub\universal-ontology\dist\universal\core\20260714-full
```

```powershell
node util/owlapi-reference/run-import-closure-contract.mjs --root C:\Users\maksy\GitHub\universal-ontology\dist\universal\extended\20260714 --catalog C:\Users\maksy\GitHub\universal-ontology\extended\catalog-v001.xml --verify-output C:\Users\maksy\GitHub\universal-ontology\dist\universal\extended\20260714-full
```

Expected: all four Java oracle comparisons PASS without creating files beside the artifacts.

- [ ] **Step 6: Re-prove the exact public `owlapi` consumer boundary**

From `C:\Users\maksy\GitHub\universal-ontology`:

```powershell
npm ls owlapi --depth=0
```

Expected: exactly `owlapi@1.4.0`, with no invalid, extraneous, linked, or
deduplicated alternate copy.

```powershell
npm test -- --runInBand tests/import-closure/owlapi-package-boundary.test.js tests/import-closure/real-distribution-contract.test.js
```

Expected: PASS through package specifiers only. Inspect `package-lock.json` and
the installed package metadata to confirm the resolved registry URL and
integrity match the accepted public artifact. Re-running upstream source tests
is not a substitute for this installed-consumer proof and is not owned by this
plan.

- [ ] **Step 7: Review diffs and generated behavior before declaring completion**

In `universal-ontology`, run `git status --short`, `git diff --check`, and a
scoped `git diff` over files touched by this plan. Confirm unrelated user
changes remain intact, no configuration changed beyond exact approvals, no
sidecar is generated, no literal sanitization exists, and no imported ontology
annotation is copied.

- [ ] **Step 8: Request final `universal-ontology` commit authorization**

No commit is implied. If the user authorizes the `universal-ontology` cutover commit:

```powershell
git add scripts/merge_owl_imports.py scripts/create_full_versions.py scripts/materializeImportClosure.js scripts/createFullVersions.js scripts/ontology tests/import-closure docs/import-closure-materialization.md README.md package.json package-lock.json
git commit -m "refactor: replace Python import merger with verified JS"
```

Do not push without separate explicit push authorization.

---

## Acceptance authority

Every row in Section 11 of
`docs/specs/2026-08-22-self-contained-owl-import-closure-contract.md` is a
release blocker. Tasks 1–7 introduce the package-boundary and focused consumer
proofs; Task 8 runs the complete matrix against every real distribution and
checks every completion criterion in Section 13 of the spec.

A passing happy path never compensates for a missing acceptance row. If a task
discovers that the released public `owlapi` surface or registry classification
cannot satisfy the Java-compatible contract, or that the output contract cannot
be verified without adding sidecar information, stop and request an approved
spec and plan amendment. Do not work around the package through a private or
local source path.

## Execution handoff

Implement one task at a time in the listed order. Use test-driven development
for every behavior change, inspect the `universal-ontology` working tree before
each task, and stop at every explicit approval gate. The plan does not authorize
configuration edits, commits, pushes, or publication on its own.
