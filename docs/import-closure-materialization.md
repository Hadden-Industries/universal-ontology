# Self-contained OWL import closures

The JavaScript materializer replaces the Python import merger.
It uses the exact registry-published dependency qualified against all four distributions in both supported formats, with strict offline reload and independent Java OWLAPI comparisons.
Repository-wide verification and independent review remain separate from these consumer checks.
The [registry artifact record](import-closure/registry-artifact-verification.json) captures identity, signature, provenance and signed-tag checks.
The [registry consumer record](import-closure/registry-consumer-qualification.json) binds the eight real cases, input digests, Java comparisons and focused tests to their executed source observation.
HISEW retains the final candidate's full verification receipt and completion decision separately; these qualification observations do not claim deployment.

## Qualification and dependency boundary

The maintained development dependency is `"owlapi": "npm:@hadden-industries/owlapi@>=0.1.0-rc.1"`.
The manifest uses the repository's floating minimum policy; the lockfile and installed package remain bound to the independently qualified `0.1.0-rc.1` artifact.
The retained registry record describes the exact artifact fetched during qualification, so its original exact specifier remains unchanged.
Application code imports only `owlapi/apibinding`, `owlapi/model`, `owlapi/io`, `owlapi/formats`, and `owlapi/util`.
The lockfile must identify the accepted public registry artifact and integrity.
An identity-verified retained tarball may be tested in the separately approved external consumer; it must not become a maintained dependency.

Before registry acceptance, verify the retained candidate manifest, closed inventory, package identity, source identity, API registry, and tarball digest.
After publication, independently fetch the exact package through the native alias with a fresh cache and verify integrity, signature, provenance, and byte equality with the qualified candidate.
Keep these records outside ontology outputs.
An accepted release candidate may be used for production without waiting for a stable version; a later package version or different candidate bytes require explicit adoption and requalification.

`scripts/qualifyImportClosure.js` discovers all import-declaring roots dated `20260714` or later and exercises them in Functional Syntax and RDF/XML, writing to an external output root.
Its report records document bytes and identities but does not itself establish registry acceptance or run the independent Java comparison.
Combine it with focused consumer tests and pinned Java evidence, keeping each result's actual scope explicit.
The retained-candidate identity collector intentionally remains a prepublication observer; it is not a registry attestation verifier.

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
