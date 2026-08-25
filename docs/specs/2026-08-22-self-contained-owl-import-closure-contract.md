# Self-Contained OWL Import Closure Contract

**Status:** Normative and approved for implementation

**Owner:** `universal-ontology`

**Implementation plan:** `docs/plans/2026-08-22-self-contained-owl-import-closure.md`

**Machine-readable policy:** `docs/import-closure/contract.v1.json`

**Required library release:** exact public-registry dependency `owlapi@0.2.0`
from `https://github.com/Hadden-Industries/owlapi`

## 1. Purpose and conformance

This contract defines the ontology artifact produced when a root ontology and its complete imports closure are materialized as one self-contained distribution document. The result must preserve the authored OWL structural content selected by this contract and must not require a network, catalog, import mapper, local source tree, or other ontology document when it is loaded later.

The desired result is not a byte-preserving copy, an RDF graph concatenation, an inference closure, or a record of the source module topology. It is one OWL ontology whose identity and ontology-level attribution come from the root and whose axioms are the structural set union of all ontologies in the resolved closure.

This document is normative. Implementers **MUST** follow it. A deviation requires the repository owner's explicit approval and an amendment to this document before code relies on the deviation.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are to be interpreted as described by BCP 14 when, and only when, they appear in all capitals.

The machine-readable policy is repository governance input. It is not an ontology-output sidecar and **MUST NOT** be copied beside generated ontology artifacts.

## 2. Terms and closure definition

Let `O0` be the root ontology parsed from the requested root document. Let `imports(O)` be the direct imports declarations of ontology `O`, and let `resolve(i)` be the ontology document successfully loaded for import IRI `i` under the generation resolver policy.

The complete input closure is the least fixed point:

```text
C(O0) = least X such that
        O0 is in X, and
        for every O in X and i in imports(O), resolve(i) is in X
```

The run is successful only if every `resolve(i)` operation terminates in exactly one completely parsed ontology. Duplicate import paths and cycles are allowed. A missing import, ambiguous ontology identity, unsupported construct, ignored RDF statement, or parse loss is fatal.

In this contract:

- a **direct axiom** is an axiom contained directly in one ontology, excluding axioms available only through its imports;
- an **ontology annotation** is an `OWLAnnotation` attached to an ontology header;
- an **annotation assertion axiom** is an `OWLAnnotationAssertionAxiom` and remains an axiom even if its subject is an ontology IRI;
- **structural equality** means OWL structural equality, not source text, RDF serialization bytes, JavaScript object identity, or RDF blank-node labels;
- **offline** means no catalog, network loader, local import resolver, or source-document fallback is available.

## 3. Required output ontology

For a successful run, construct output ontology `F` with exactly these components:

```text
ID(F)          = ID(O0)
Annotations(F) = direct ontology annotations of O0
Imports(F)     = empty set
Axioms(F)      = structural set union of direct axioms of every O in C(O0)
```

The axiom union is an OWL structural set union. It is not an RDF triple union and it is not an inference closure.

The persisted artifact is conforming only if a strict offline reload in a fresh ontology manager produces `F'` satisfying:

```text
ID(F')                = ID(F), including ontology IRI, version IRI, and anonymous status
Annotations(F')       = Annotations(F), structurally
Imports(F')           = empty set
ImportsClosure(F')    = { F' }
Axioms(F')            = Axioms(F), modulo bijective anonymous-individual renaming
additional axioms     = empty set
missing axioms        = empty set
external loader calls = 0
```

For an anonymous root, “same ID” means that both ontology IRI and version IRI remain absent and the ontology remains anonymous. A process-local generated anonymous-ID token is not serializable and is not compared.

The output **MUST NOT** contain an imports declaration. Its imports closure **MUST** contain exactly the reloaded output ontology, and loading it **MUST NOT** need external or disk-based ontology inputs.

## 4. Authored-information policy

| Information category                                                                                     | Required output treatment                                                                       | Reason                                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Root ontology IRI and version IRI                                                                        | Preserve exactly                                                                                | They are the root ontology's full structural identity.                                                                 |
| Anonymous root status                                                                                    | Preserve                                                                                        | Inventing an ontology IRI would change identity.                                                                       |
| Root ontology annotations, including nested annotations and exact literal lexical forms                  | Preserve exactly                                                                                | They are authored metadata attributable to the distributed root.                                                       |
| Imported ontology-level annotations                                                                      | Drop                                                                                            | Copying them onto the root would falsely attribute imported metadata to the root.                                      |
| Direct axioms from the root and every imported ontology                                                  | Preserve as one structural set                                                                  | This is the W3C axiom closure selected for the standalone distribution.                                                |
| Declaration axioms                                                                                       | Preserve                                                                                        | They are axioms even when a consumer could infer entity kinds.                                                         |
| Annotation assertion axioms                                                                              | Preserve                                                                                        | They are axioms, including assertions whose subject is an imported ontology IRI.                                       |
| Axiom annotations and nested annotations                                                                 | Preserve exactly                                                                                | Dropping them loses authored qualification or provenance attached to the axiom.                                        |
| Named entities and IRIs                                                                                  | Preserve exact absolute IRI values                                                              | Prefix spellings are presentation; expanded IRIs are structural.                                                       |
| Literals                                                                                                 | Preserve lexical form, datatype IRI, language tag, and direction representation where supported | Sanitization or value repair changes authored information.                                                             |
| Anonymous individuals                                                                                    | Preserve sharing within each source and standardize apart across sources                        | Source-local blank-node labels must not cause accidental cross-document identity.                                      |
| Duplicate textual axiom occurrences                                                                      | Collapse under structural set equality                                                          | An OWL ontology contains a set of axioms, not a multiset of source lines.                                              |
| Imports declarations at every closure level                                                              | Drop all                                                                                        | The artifact must have no external ontology dependency.                                                                |
| Imported ontology IDs and version IDs as ontology headers                                                | Drop                                                                                            | The output is one ontology with the root identity.                                                                     |
| Import topology and axiom-to-module membership                                                           | Drop                                                                                            | Retaining them would require provenance or sidecar constructs outside this contract.                                   |
| Source document IRIs, redirects, catalog paths, response headers, diagnostics, and fetch history         | Do not serialize                                                                                | They are generation context, not ontology content. Logs may report them during the run.                                |
| Authored `file:` IRIs used as entity or annotation values inside axioms                                  | Preserve                                                                                        | An IRI value is ontology content; it is not an import fetch merely because its scheme is `file:`.                      |
| Prefix declarations, comments, entity spellings, XML entity spelling, source order, and source locations | Not invariant                                                                                   | They belong to concrete syntax and cannot be preserved uniformly across formats.                                       |
| RDF dataset named-graph membership                                                                       | Do not serialize; reject ambiguous multi-graph inputs under the single-graph policy             | Named-graph context is not part of an OWL structural ontology and would require a sidecar or a different output model. |
| Inferences, repaired declarations, normalized literals, provenance annotations, and merge markers        | Forbid                                                                                          | They were not authored axioms in the loaded closure.                                                                   |

The ontology-annotation/annotation-assertion distinction is structural, not heuristic. An imported `OWLAnnotation` attached to its ontology header is dropped. An imported `OWLAnnotationAssertionAxiom`, including one whose subject is that imported ontology's IRI, is retained.

Dropping imported ontology annotations is intentional attribution hygiene. Those annotations describe their source ontology as a separate ontology; attaching them to the materialized root would change their subject and misattribute them. The policy does not authorize dropping any imported axiom.

## 5. Anonymous individuals and structural set semantics

Anonymous individuals **MUST** retain their identity relationships within each source ontology. Anonymous individuals originating in different source ontologies **MUST** be standardized apart, even when their source labels have identical spelling.

Verification **MUST** compare anonymous individuals modulo one consistent bijective renaming. It **MUST NOT** compare raw blank-node labels, assign identity from neighborhood hashes, or permit one source individual to map to multiple output individuals.

Structurally equal axioms contributed by more than one source ontology appear once in the output set. This deduplication must follow OWL structural equality, including axiom annotations. Two axioms that differ in annotations are not equal merely because their unannotated logical forms match.

## 6. API compatibility, package, and ownership boundary

The materialization workflow is private application behavior owned by
`universal-ontology`. `owlapi` is the independently published,
Java-OWLAPI-compatible library and **MUST NOT** expose a project-invented
`materializeImportClosure`, `collapseImports`, or equivalent convenience
method.

The consumer implementation starts only after the canonical
`Hadden-Industries/owlapi` repository has published the complete required
capability slice as `owlapi@0.2.0` to the public npm registry. The dependency
**MUST** be declared exactly as `"owlapi": "0.2.0"`; a relative source-tree
path, `file:`, `link:`, workspace alias, Git URL, copied source, package alias,
resolver alias, or unpublished tarball is non-conforming.

This consumer contract does not authorize or create an `owlapi` release. The
ontology-lifecycle programme owns publication of `0.2.0`; this workflow starts
only after that exact immutable registry artefact is accepted. If the required
capability slice is not available at `0.2.0`, implementation stops for an
explicit contract/version decision rather than selecting or publishing a
different coordinate from `universal-ontology`.

Except for `owlapi`'s curated bare aggregate, every public package subpath is
the exact slash-form of a separately approved package beneath
`org.semanticweb.owlapi`. Java package existence is necessary but does not by
itself authorize publication: the upstream Public API Surface Registry,
capability matrix, `exports` map, canonical source module, and installed-package
tests must agree. `universal-ontology` **MUST NOT** import an unregistered
subpath, `owlapi/internal/*`, an unexported deep module, or the nominal
`owlapi/rdf` prefix.

The upstream package owns its source architecture. Public bindings have one
canonical definition in their registered Java-shaped namespace; private
parsing, mapping, RDF/JS, loading, storage, and platform engines may remain in
cohesive non-mirrored `internal/` directories. This consumer depends only on
the public package contract and **MUST NOT** couple itself to either layout.

Any new public `owlapi` class or method required by this workflow **MUST** have
a matching public Java OWLAPI class or method, retain the same responsibility,
be approved in the upstream registry, and have focused parity tests. A
JavaScript adaptation may live only in an already registered Java-backed
namespace. If no corresponding public namespace exists, the helper stays
private to `universal-ontology` or implementation stops for an approved
architecture amendment.

The private runner composes established Java OWLAPI concepts:

```text
input OWLOntologyManager
    └── getImportsClosure(root)
          └── OWLOntologyImportsClosureSetProvider
                └── OWLOntologyMerger(mergeOnlyLogicalAxioms = false)
                      └── output OWLOntologyManager
                            ├── SetOntologyID(full root ID)
                            ├── AddOntologyAnnotation(root annotations only)
                            └── saveOntology(format, target)
```

The consumer imports the permitted capability slice from these exact public
specifiers:

| Public specifier | Required binding or operation | Java OWLAPI authority | Required semantics |
| --- | --- | --- | --- |
| `owlapi/apibinding` | `OWLManager.createOWLOntologyManager` | `org.semanticweb.owlapi.apibinding.OWLManager` | Creates independent input, output, and verification managers. |
| `owlapi/model` | `OWLOntologyManager.importsClosure` and `getImportsClosure` | Same Java manager methods | Cycle-safe closure including the managed root; defensive set result. |
| `owlapi/model` | `addAxiom(s)`, `applyChange(s)`, and `saveOntology` | `HasAddAxioms` and the same Java manager methods | Applies managed changes atomically and stores through exact format/target selection. |
| `owlapi/model` | `SetOntologyID`, `AddOntologyAnnotation`, and `OWLOntologyLoaderConfiguration` | Same Java model classes | Restores the complete root identity, adds only root annotations, and fixes strict loading policy. |
| `owlapi/io` | `StringDocumentSource`, `StringDocumentTarget`, and typed I/O/storage failures | Corresponding `org.semanticweb.owlapi.io` classes | Carries complete document text and captures stored UTF-8 text without granting ambient filesystem authority. |
| `owlapi/formats` | Functional Syntax and RDF/XML document-format identities | Corresponding `org.semanticweb.owlapi.formats` classes | Selects one exact registered storage behavior with no fallback. |
| `owlapi/util` | `OWLOntologyImportsClosureSetProvider` and `OWLOntologyMerger` | Corresponding `org.semanticweb.owlapi.util` classes | Supplies the root closure and copies every direct axiom without copying ontology annotations or imports declarations. |

Functional Syntax and RDF/XML storage are required **behaviors through
`OWLOntologyManager.saveOntology`**, not requirements to construct or import
`FunctionalSyntaxStorer` or `RDFXMLStorer` directly. Their Java classes remain
the behavioral authorities for the two storage engines. If upstream later
approves direct constructor exposure, the only corresponding public subpaths
are `owlapi/functional/renderer` and `owlapi/rdf/rdfxml/renderer`; this consumer
does not require or import them, and their existence would not make
`owlapi/rdf` importable.

Java streams map to JavaScript iterables, and Java overloads map to the repository's approved JavaScript argument conventions. Names and responsibilities do not change. No nominal class may be added without implemented behavior and parity tests.

`OWLOntologyMerger` is deliberately insufficient by itself: its Java contract copies axioms only and accepts at most a target ontology IRI. The private runner therefore restores the complete root `OWLOntologyID` and then adds only the root ontology annotations.

There **MUST NOT** be a compatibility shim, forwarding module, deprecated alias, Python launcher for JavaScript, or parallel old/new implementation in either repository.

## 7. Generation resolution policy

Generation is deliberately connectivity-first. Remote imports are enabled from the first attempt. The implementation uses catalogs and local sources when supplied but does not limit itself to them.

Resolution order is fixed:

1. Resolve the import IRI through the explicitly supplied or root-discovered OASIS XML Catalog and try the mapped document candidate first.
2. If the catalog has no mapping, or the mapped candidate cannot be read after its retries, request the authored import IRI exactly. A mapped document that is read successfully but fails ontology parsing is fatal because the loader cannot substitute different content after parsing has begun.
3. If an authored `http:` request fails after its retries, retry the same URL with only the scheme promoted to `https:`.
4. Follow at most 20 redirects per candidate URL and retry a failed candidate at most 3 times after the first attempt.
5. Treat HTTP 408, 425, 429, 500, 502, 503, and 504, plus transport interruption, as retryable. Respect `Retry-After` up to 30 seconds; otherwise use delays of 250 ms, 1 second, and 4 seconds.
6. Permit `file:`, `http:`, and `https:` document IRIs. Another scheme must be mapped by the catalog to one of these or fail as unsupported.

Each network attempt has a 30-second timeout. Redirects may cross hosts and may move between HTTP and HTTPS. There is no generation allowlist, offline generation mode, or “continue with partial closure” option. Resource limits remain finite.

The loader decodes bytes without replacement characters. A byte-order mark, HTTP `charset`, and XML declaration are honored in that order; UTF-8 is the default. Invalid byte sequences are fatal. Response bodies are streamed into the manager's configured byte ceiling rather than buffered without a bound.

The OASIS catalog resolver handles the URI-resolution constructs `uri`, `rewriteURI`, `delegateURI`, and `nextCatalog`, including nested `catalog`/`group` elements and inherited `xml:base`. Exact `uri` entries win; the longest matching rewrite/delegate prefix wins; `nextCatalog` is consulted only after local entries fail. Catalog cycles and malformed mappings are fatal. Public/system entity entries are not ontology-import URI mappings.

## 8. Fatal conditions

Each of the following is fatal and occurs before publication:

- the root document is missing, unreadable, undecodable, or unparsable;
- an imports declaration remains unresolved after all configured attempts;
- an imported document is unreadable, undecodable, unparsable, or unsupported;
- an RDF statement remains outside the supported OWL reconstruction;
- two documents produce the same ontology ID, or one document ambiguously serves incompatible import identities;
- a resource limit, cancellation, catalog cycle, redirect cycle, or network-exhaustion condition occurs;
- the selected output syntax cannot represent an IRI, literal, axiom, or ontology header exactly;
- serialization, temporary-file creation, flush, reload, structural comparison, or atomic replacement fails.

Warnings may be logged, but a warning cannot waive a contract invariant. There is no partial-success output.

## 9. Serialization and publication policy

The generation CLI supports exactly two explicit output formats:

```text
rdfxml      default; preserves the current universal-ontology distribution format
functional  lossless OWL structural alternative selected explicitly by the caller
```

There is no automatic format fallback. If RDF/XML cannot represent a legal OWL literal or cannot derive a legal XML QName for an RDF predicate, RDF/XML storage fails. The caller may run again with `--format functional` and a knowingly selected output target. The workflow never removes control characters, substitutes Unicode replacement characters, rewrites datatypes, or changes language tags.

Choosing Functional Syntax does not rewrite a root `dcterms:format` annotation or any other authored annotation. Aligning authored metadata with a chosen concrete syntax is a separate ontology-authoring decision outside this materializer.

Serialization determinism is desirable for reviewable diffs, but byte identity is not the semantic acceptance criterion. Namespace-prefix order, blank-node labels, element order, and pretty-print layout may change between valid runs. Strict offline structural equality is the gate.

Publication **MUST** follow this sequence:

1. construct the expected in-memory output ontology under Sections 3–5;
2. serialize to a uniquely named temporary file in the destination directory;
3. flush the file contents and file metadata required by the platform;
4. load the temporary file in a fresh manager with no catalog, network loader, or local import resolver;
5. verify every invariant in Section 3, including zero external-loader calls;
6. replace the destination atomically within the same directory;
7. remove temporary material on every failure path.

A failed run **MUST** leave an existing destination byte-for-byte unchanged. A successful run **MUST NOT** leave a temporary file or sidecar.

## 10. Deliberately excluded information

This contract excludes information that cannot remain in the one-ontology result without changing attribution or introducing a sidecar/provenance model:

- imported ontology-level annotations;
- imported ontology IDs used as separate ontology headers;
- the import graph and module boundaries;
- axiom-to-source-module membership;
- source document IRIs and fetch history;
- RDF named-graph membership;
- concrete-syntax layout, comments, prefixes, and ordering.

These exclusions do not permit dropping OWL axioms, axiom annotations, annotation assertion axioms, declarations, literal metadata, or identity relationships among anonymous individuals.

## 11. Required acceptance matrix

Every row is a release blocker. A passing happy path does not compensate for an untested row.

| Case                                                                | Required assertion                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| No imports                                                          | Output is structurally equal to the root except it is freshly serialized; closure size is one.                                 |
| Direct import                                                       | Root and imported direct axioms are present; imports are absent.                                                               |
| Transitive import                                                   | All reachable direct axioms are present exactly once under set semantics.                                                      |
| Duplicate import                                                    | Imported ontology loads once; structural union is unchanged.                                                                   |
| Cyclic imports                                                      | Resolution terminates; each ontology contributes once.                                                                         |
| Missing import                                                      | Fatal; existing output unchanged.                                                                                              |
| Imported parse error                                                | Fatal; existing output unchanged.                                                                                              |
| Unsupported OWL construct                                           | Fatal; no partial output.                                                                                                      |
| Unconsumed RDF statement                                            | Fatal in strict mode.                                                                                                          |
| Multiple or ambiguous ontology headers                              | Fatal unless W3C-defined reconstruction selects one unambiguously.                                                             |
| Root ontology IRI only                                              | Exact IRI retained.                                                                                                            |
| Root ontology IRI and version IRI                                   | Both retained.                                                                                                                 |
| Anonymous root                                                      | Remains anonymous after reload.                                                                                                |
| Root ontology annotations                                           | All retained, including nested annotations and exact literals.                                                                 |
| Imported ontology annotations                                       | All absent from output ontology annotations.                                                                                   |
| Annotation assertion about imported ontology IRI                    | Retained as an axiom.                                                                                                          |
| Declaration axioms                                                  | Retained.                                                                                                                      |
| Every supported axiom kind                                          | Retained and exhaustively dispatched.                                                                                          |
| Axiom annotations and nested annotations                            | Retained exactly.                                                                                                              |
| Equal axiom in two modules                                          | One structural axiom in output.                                                                                                |
| Same anonymous source label in two modules                          | Two distinct output individuals.                                                                                               |
| Repeated anonymous individual within one module                     | Sharing remains intact.                                                                                                        |
| Typed, language-tagged, or directional literal                      | Lexical value and metadata retained exactly.                                                                                   |
| XML-forbidden literal under RDF/XML                                 | Typed storage failure; no sanitization; old output unchanged.                                                                  |
| RDF/XML-non-injective ontology-annotation/annotation-assertion case | Typed storage failure; caller may explicitly choose Functional Syntax.                                                         |
| Same ontology through two document mappings                         | One load when identity is compatible; fatal when identities conflict.                                                          |
| Catalog exact mapping                                               | Local mapped document wins.                                                                                                    |
| Unreadable catalog mapping                                          | Loader retries it, then tries the authored import IRI; successfully read malformed mapped content remains a fatal parse error. |
| Catalog rewrite, delegate, and next entries                         | OASIS URI precedence and bases are honored.                                                                                    |
| Catalog cycle                                                       | Fatal with a cycle trace.                                                                                                      |
| HTTP redirect and retry                                             | Fixed bounds and retry classes are honored.                                                                                    |
| HTTP-to-HTTPS promotion                                             | Happens only after exact HTTP attempts fail; success resolves the import.                                                      |
| Network exhaustion                                                  | Fatal with an attempt summary; no partial output.                                                                              |
| Multi-graph RDF dataset                                             | Rejected by `requireSingleGraph`; graph membership is never silently flattened.                                                |
| Functional output                                                   | Strict offline structural round trip passes.                                                                                   |
| RDF/XML output                                                      | Strict offline structural round trip passes or storage fails explicitly.                                                       |
| Verifier loader trap                                                | Zero external-loader calls.                                                                                                    |
| Verifier detects added axiom                                        | Fatal.                                                                                                                         |
| Verifier detects missing axiom                                      | Fatal.                                                                                                                         |
| Verifier detects ID, annotation, or import change                   | Fatal.                                                                                                                         |
| Atomic failure                                                      | Previous destination remains byte-for-byte unchanged; no temporary file remains.                                               |
| Atomic success                                                      | Verified temporary file replaces target; no temporary file or sidecar remains.                                                 |
| Four real distributions                                             | Each exact source closure equals its offline full artifact under this contract.                                                |

## 12. Forbidden shortcuts

An implementation is non-conforming if it does any of the following, even when current distribution files appear usable:

- unions RDF triples and calls the graph an ontology merge;
- locates imports by URL basename guessing;
- strips every triple whose subject resembles an imported ontology IRI;
- copies imported ontology annotations onto the root;
- drops annotation assertion axioms or declaration axioms;
- copies only logical axioms;
- treats parser warnings or missing imports as success;
- hashes blank-node neighborhoods to assign identity;
- lets same-spelled blank-node labels from different documents collide;
- rewrites, deletes, normalizes, or replaces literal characters;
- serializes first and assumes success without strict reload;
- compares RDF/XML bytes instead of structural OWL content;
- verifies with the same catalog or network resolver used for generation;
- records import topology or provenance in an output annotation or sidecar;
- automatically switches output formats;
- adds a convenience collapse/materialization method to `owlapi`;
- exposes a nominal Java-compatible class whose behavior is not implemented;
- depends on a concrete storer constructor instead of the manager storage
  operation required by this contract;
- keeps either Python file as a wrapper, alias, fallback, or deprecation launcher;
- uses a local path, workspace/link, Git dependency, copied source, package or
  resolver alias, internal/deep import, or re-export shim in place of exact
  public-registry `owlapi@0.2.0` package specifiers;
- publishes a temporary file before every contract equality check passes.

## 13. Conformance completion criteria

The migration is complete only when all of the following are true:

- the machine-readable policy and relevant capability matrix entries are green;
- exact public-registry `owlapi@0.2.0` is declared and all consumer imports use
  only `owlapi/apibinding`, `owlapi/model`, `owlapi/io`, `owlapi/formats`, and
  `owlapi/util`;
- the upstream Public API Surface Registry, capability matrix, package exports,
  canonical source bindings, and installed-package evidence agree for every
  consumed symbol;
- every new `owlapi` public surface has a Java OWLAPI counterpart and parity test;
- no materialization or collapse convenience API exists in `owlapi`;
- storage is exercised through `OWLOntologyManager.saveOntology`; direct
  concrete-storer construction is not a consumer prerequisite;
- a Java OWLAPI differential fixture agrees on full ID, root annotations, empty imports, axioms, and anonymous-individual relationships;
- manager-selected Functional Syntax and RDF/XML storage behaviors pass exhaustive strict round trips, with explicit RDF/XML representability failure;
- the application catalog mapper passes OASIS URI-resolution tests and all repository catalogs;
- generation enables remote imports, redirects, retries, and HTTP-to-HTTPS promotion while retaining finite resource bounds;
- missing or unparsed input aborts before publication;
- the in-memory output satisfies the four-equation contract in Section 3;
- the serialized artifact passes fresh-manager offline structural verification with zero external-loader calls;
- atomicity tests prove existing outputs survive every simulated failure;
- every real distribution artifact equals its source closure under this contract;
- imported ontology annotations are absent and imported annotation assertion axioms remain;
- no sidecar, provenance axiom, inference, repair, or literal sanitization is produced;
- `scripts/merge_owl_imports.py` and `scripts/create_full_versions.py` are deleted together;
- no shim, alias, fallback, or stale command reference remains;
- focused tests, complete tests, lint, formatting checks, and builds pass in
  `universal-ontology`, while the accepted release evidence remains valid for
  the exact consumed `owlapi@0.2.0` artifact;
- unrelated working-tree changes remain intact;
- no commit or push occurs without separate explicit authorization.

## 14. Authority and comparative references

Use these sources in this order when resolving an implementation question:

1. This approved contract and `docs/import-closure/contract.v1.json`.
2. [OWL 2 Structural Specification — Ontologies](https://www.w3.org/TR/owl2-syntax/#Ontologies), including imports and axiom closure.
3. [OWL 2 Mapping to RDF Graphs](https://www.w3.org/TR/owl2-mapping-to-rdf/) for OWL-to-RDF behavior.
4. [OWL 2 Conformance](https://www.w3.org/TR/owl2-conformance/) for structural and semantic comparison expectations.
5. The canonical `Hadden-Industries/owlapi` Public API Surface Registry,
   capability matrix, ontology-lifecycle capability plan, and public package
   documentation for the exact `owlapi@0.2.0` consumer boundary.
6. Public Java OWLAPI 5.5.1 contracts and the pinned local source at `C:\Users\maksy\GitHub\owlcs\owlapi`, especially `OWLOntologyManager`, `OWLOntologyImportsClosureSetProvider`, `OWLOntologyMerger`, `SetOntologyID`, `AddOntologyAnnotation`, `OWLStorer`, `FunctionalSyntaxStorer`, and `RDFXMLStorer`.
7. [OASIS XML Catalogs 1.0](https://www.oasis-open.org/committees/entity/specs/cs-entity-xml-catalogs-1.0.html) for URI catalog precedence and `xml:base`.
8. [RDF/XML Syntax](https://www.w3.org/TR/rdf-syntax-grammar/) for concrete output constraints.
9. [ROBOT merge documentation](https://robot.obolibrary.org/merge) as secondary evidence for collapsing the imports closure, removing import declarations, and retaining first/root ontology annotations.
10. [Protege Desktop](https://github.com/protegeproject/protege) as evidence that ordinary ontology loading retains a managed closure of separate ontologies. Protege's normal load/save behavior is not authority for flattening a closure into one distribution ontology.

If two normative sources appear to conflict, implementation stops until the owner approves an amendment. The implementer must not choose behavior locally and document it afterward.

## 15. Artifact ownership

There is one canonical copy of the contract and one canonical implementation plan:

```text
universal-ontology/
  docs/specs/2026-08-22-self-contained-owl-import-closure-contract.md
  docs/plans/2026-08-22-self-contained-owl-import-closure.md
  docs/import-closure/contract.v1.json
```

`owlapi` documentation may retain only the narrow Java-compatible capability
requirements needed by this consumer and a repository-qualified reference to
these canonical artifacts. It must not contain a second copy of the application
contract or implement application-owned materialization policy. Conversely,
these consumer artifacts do not govern the package's private source layout or
duplicate its Public API Surface Registry.
