# Self-contained OWL import closures

The JavaScript materializer replaces the Python import merger.
Current generation uses the owner-approved exact OwlAPI Git source for readable RDF/XML, retaining strict offline reload and the existing closure contract.
Repository-wide verification and independent review remain separate from these consumer checks.
The historical [registry artifact record](import-closure/registry-artifact-verification.json) captures the original rc.1 identity, signature, provenance and signed-tag checks.
The historical [registry consumer record](import-closure/registry-consumer-qualification.json) binds the eight real cases, input digests, Java comparisons and focused tests to that executed source observation.
Neither record qualifies the newer Git source or asserts a new npm publication.
HISEW retains the final candidate's full verification receipt and completion decision separately; these qualification observations do not claim deployment.

## Qualification and dependency boundary

The maintained development dependency is `"owlapi": "git+https://github.com/Hadden-Industries/owlapi.git#e15320d6438b27c5aaa7aa9302b6919749873ec9"`.
For RDF/XML output, the materializer copies the authored root's prefix preferences through `RDFXMLDocumentFormat.copyPrefixesFrom` before saving.
Imported documents' unused prefixes do not replace the root's choices; Functional Syntax output retains its existing format selection.
This is an owner-approved exception to registry ranges; the full commit and installed package bytes identify the implementation, whose manifest version remains `0.1.0-rc.1`.
The lockfile must resolve that exact Git source; package-boundary tests verify installed metadata, public API-registry identity and the complete payload against the independently qualified producer archive.
Root `.npmrc` admits direct Git dependencies under npm 12 while setup and CI retain disabled lifecycle scripts.
Application code imports only `owlapi/apibinding`, `owlapi/model`, `owlapi/io`, `owlapi/formats`, and `owlapi/util`.
Run `npm run check:qualification` for current consumer acceptance: it includes exact package identity, all eight real-source closure cases, atomic/failure regressions, wider repository checks and fresh generated assets.
Then `node scripts/verifyFullOntologyBuild.js --repository . --output dist` verifies the current output receipt without regeneration.
Keep qualification records outside ontology outputs; a new commit or different package bytes require explicit adoption and requalification.

`scripts/qualifyHistoricalRcImportClosure.js` and `collectHistoricalRcQualificationIdentity` retain the earlier snapshot-specific prepublication observer for historical reproduction in its separately qualified disposable environment.
They are not current qualification entry points and intentionally cannot qualify the maintained Git dependency.
Their original candidate, source, API-registry and archive identities remain fixed; historical evidence is preserved.
The current supported replacement is the maintained qualification and generated-output verification commands above.

## Commands

The following table records the completed command migration.

| Removed command                                                      | Required command                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `python scripts/merge_owl_imports.py INPUT OUTPUT --catalog CATALOG` | `node scripts/materializeImportClosure.js INPUT OUTPUT --catalog CATALOG --format rdfxml` |
| `python scripts/create_full_versions.py`                             | `npm run generate:full-ontologies`                                                        |

The batch and ordinary website build share source-driven discovery and local-only materialization.
Every ordinary extensionless release with a valid date at or after `20260714` is considered, including future dates and newly added families.
A parsed root with imports gets all three fresh representations; a root without imports gets none of the three full counterparts.
The current corpus has eight importing roots across ISO/IEC 11179-3, reference data, core and extended, at dates `20260714` and `20260912`; ISO 31073 `20260912` has no imports and is skipped.
This observation is not an allowlist.
Release mappings come from checked-in source identities, combined with existing local catalogs; conflicting mappings, missing local imports, malformed sources and linked paths fail.
Ordinary distributions, existing alias rewriting, earlier releases and query artifact admission retain their contracts.
The batch stops at the first failure and leaves no usable build receipt.
The ignored `full-ontology-build.json` product receipt binds candidate selection, source and catalog inputs, producer and installed OWLAPI bytes, and all required output hashes.
Read-only publication admission recomputes selection, checks required outputs and forbids full counterparts for no-import roots.
Normal and forced uploads use the same gate and an isolated snapshot of the entire built tree.
There is no compatibility wrapper; Git history is the recovery path for the removed Python implementation.

The one-root command accepts `--format rdfxml` or `--format functional`.
RDF/XML is the default.
There is no automatic fallback: an unrepresentable literal or non-injective RDF/XML mapping fails, and the operator must explicitly choose Functional Syntax if appropriate.
Changing the output syntax does not rewrite authored format annotations.

## Preserved information and input policy

The result retains the root ontology IRI and version IRI, or its anonymous status; root ontology annotations; and the structural set union of direct axioms throughout the imports closure.
Axiom annotations, nested annotations, declarations, annotation assertions, and OWL literal lexical forms and metadata remain intact.
Anonymous individuals retain sharing within a source and remain distinct across sources.

The result drops imports, imported ontology headers and ontology-level annotations, import topology, and module membership.
It adds no inferred axioms, repair declarations, provenance annotations, or merge markers.
An authored `file:` IRI inside an axiom remains content.
There are no output sidecars.

The current owner-approved exception accepts Java OWLAPI 5.5.1's default JSON-LD direction conversion: text and language survive, but source `@direction` may not.
This is a known source-to-model limitation, not a claim of direction preservation.
Durable policy and mechanism work is deferred in [UO issue 117](https://github.com/Hadden-Industries/universal-ontology/issues/117) and [owlapi issue 28](https://github.com/Hadden-Industries/owlapi/issues/28).
All other invariants remain in force.

## Resolution, failure, and offline proof

Catalog resolution follows the accepted OASIS URI rules, including exact mappings, rewrites, delegates, next catalogs, and XML bases.
Unreadable mapped documents fall through to the authored import IRI after bounded attempts; successfully read malformed content is fatal.
An authored HTTP IRI is attempted before HTTPS promotion.
Transport retries, redirects, response size, and attempt duration are bounded.
The general one-root CLI may use the network when loading the source; verifying the standalone output cannot.
The website and batch production paths disable network acquisition for both phases.

Missing imports, unsupported constructs, unconsumed RDF, ambiguous headers, conflicting identities, ambiguous RDF datasets, resource limits, and output verification failures stop publication.
Warnings do not waive structural invariants.
CLI exit codes are 2 for usage, 3 for root loading, 4 for imports, 5 for serialization, 6 for verification, and 7 for publication failure.

The writer serializes to a unique sibling temporary file, flushes it, and reloads those exact bytes in a fresh manager with a rejecting external loader.
It checks root identity, root annotations, the complete structural fingerprint, no imports, and a closure containing only the output ontology.
Only verified bytes replace the destination atomically.
On failure the previous destination remains unchanged and the temporary file is cleaned up.

The full normative boundary and acceptance matrix are in the [consumer contract](specs/2026-08-22-self-contained-owl-import-closure-contract.md).
