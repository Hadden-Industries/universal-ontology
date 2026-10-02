# Self-contained OWL import closures

The JavaScript materializer is under prepublication qualification.
The maintained npm dependency, batch npm entry point, and Python removal have not yet been activated.
Use the approved isolated consumer and external output locations until registry acceptance and production qualification are complete.

## Qualification and dependency boundary

The intended maintained development dependency is exactly `"owlapi": "npm:@hadden-industries/owlapi@0.1.0-rc.1"`.
Application code imports only `owlapi/apibinding`, `owlapi/model`, `owlapi/io`, `owlapi/formats`, and `owlapi/util`.
The lockfile must identify the accepted public registry artifact and integrity.
An identity-verified retained tarball may be tested in the separately approved external consumer; it must not become a maintained dependency.

Before registry acceptance, verify the retained candidate manifest, closed inventory, package identity, source identity, API registry, and tarball digest.
After publication, independently fetch the exact package through the native alias with a fresh cache and verify integrity, signature, provenance, and byte equality with the qualified candidate.
Keep these records outside ontology outputs.
An accepted release candidate may be used for production without waiting for a stable version; a later package version or different candidate bytes require explicit adoption and requalification.

`scripts/qualifyImportClosure.js` exercises the four accepted roots in Functional Syntax and RDF/XML, writing to an external output root.
Its report records document bytes and identities but does not itself establish registry acceptance or run the independent Java comparison.
Combine it with focused consumer tests and pinned Java evidence, keeping each result's actual scope explicit.

## Commands after the approved cutover

The following table describes the planned hard migration, not commands already removed in this prepublication checkout.

| Removed command                                                      | Required command                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `python scripts/merge_owl_imports.py INPUT OUTPUT --catalog CATALOG` | `node scripts/materializeImportClosure.js INPUT OUTPUT --catalog CATALOG --format rdfxml` |
| `python scripts/create_full_versions.py`                             | `npm run generate:full-ontologies`                                                        |

The batch directly composes the materializer for the four `20260714` distributions: ISO/IEC 11179-3, reference data, core, and extended.
It supplies each family's catalog explicitly and stops at the first failure.
After cutover there will be no compatibility wrapper; Git history will be the recovery path for the removed Python implementation.

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
Successfully loading the source may use the network; verifying the standalone output cannot.

Missing imports, unsupported constructs, unconsumed RDF, ambiguous headers, conflicting identities, ambiguous RDF datasets, resource limits, and output verification failures stop publication.
Warnings do not waive structural invariants.
CLI exit codes are 2 for usage, 3 for root loading, 4 for imports, 5 for serialization, 6 for verification, and 7 for publication failure.

The writer serializes to a unique sibling temporary file, flushes it, and reloads those exact bytes in a fresh manager with a rejecting external loader.
It checks root identity, root annotations, the complete structural fingerprint, no imports, and a closure containing only the output ontology.
Only verified bytes replace the destination atomically.
On failure the previous destination remains unchanged and the temporary file is cleaned up.

The full normative boundary and acceptance matrix are in the [consumer contract](specs/2026-08-22-self-contained-owl-import-closure-contract.md).
