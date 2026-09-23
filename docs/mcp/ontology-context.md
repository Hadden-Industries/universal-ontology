# Bounded ontology context and definition review

Local filesystem MCP exposes asserted RDF context through a private Oxigraph 0.5.11 worker.
Clients cannot submit SPARQL, filesystem paths, or remote import URLs.
The browser package entry remains free of Node and WASM imports.

## Select and retain a snapshot

Select one root with `ontologyReleaseSelection`, then choose `graphSelection`: `source_graph`, `catalogued_imports` (default), or `selected_graphs` with explicit `selectedSnapshotIds`.
At most 16 graphs are admitted; two versions of the same ontology are rejected.
Import resolution uses the captured local catalog only.
Unavailable imports are reported as coverage gaps, never fetched from the network.

`latest_stable_releases` selects dated releases; `active_publications` selects the existing activation-policy publication.
A saved authoring file is a separate `working` snapshot.
These selections are not interchangeable.

Every context/search result carries `snapshotRef`.
Reuse that entire value for follow-up requests instead of making a fresh selection.
It binds the immutable catalog, root, graph set, and dataset digests.
Retained content-addressed artifacts allow an old reference to survive regeneration and process restart.
Deleting those artifacts removes that ability; requests fail rather than silently selecting new content.

Version-1 catalogs and indexes must be regenerated.
The existing `dist/query/v1` directory name and channel-manifest version are transport conventions; catalog/index document format is now 2.

## Ask for known-entity context directly

Call `get_entity_context` without a preliminary search when the entity is already known:

```json
{
  "entityIdentifier": {
    "identifierKind": "preferred_label",
    "identifierValue": "Address relationship"
  },
  "ontologyReleaseSelection": {
    "selectionKind": "latest_stable_releases",
    "ontologyArtifactFamilyIds": ["universal/core"]
  },
  "depth": 1,
  "direction": "both"
}
```

Use `entity_iri` for an exact IRI or `uuid_urn` for an authored identifier.
Ambiguous labels require selection.
`depth` counts named-entity connections, not RDF list cells or restriction blank nodes.
`relationProfile` is `definition_review` by default; `all_asserted` and explicit `predicateIris` support broader inspection.

Results distinguish asserted statements from projected OWL structure.
Restrictions preserve property, filler, operator, qualification, cardinality, expression path, and raw witnesses.
They never assert an ordinary property fact or an existing instance.
Incoming traversal preserves the authored direction.
Source graphs and statement references remain attached to evidence.

`find_entity_connections` accepts the same selection and source `entityIdentifier`, plus `targetEntityIdentifier` and `maximumPaths`.
It returns bounded shortest structural paths.
`no_path` applies only to a complete search under the stated bounds.
Truncation produces `search_incomplete`; it does not establish global disconnection or entailment.

## Select definitions for review

Call `search_entities` with this metadata-only request:

```json
{
  "ontologyReleaseSelection": {
    "selectionKind": "active_publications",
    "ontologyArtifactFamilyIds": ["universal/core"]
  },
  "graphSelection": "source_graph",
  "ownership": "root_module",
  "definitionSourceStatus": "no_recorded_source",
  "maximumResultCount": 10
}
```

Continue with `nextCursor` and unchanged selection/filter criteria.
Cursor continuation may repeat an entity with different matching definitions.
To hand one definition to a reviewer, pass its `definitionAssertionRef`, entity IRI, and returned `snapshotRef` to `get_entity_context`.

Definition evidence matches the complete RDF assertion: subject, predicate, literal spelling, language, and datatype.
Exact `owl:Axiom` annotations may come from another selected graph.
An entity-level citation is reported separately and does not establish citation of the definition assertion.
Sources may be IRIs, literals, or bounded structured blank nodes.
Incomplete source descriptions are explicit.
Source quality is always unassessed; recorded citation presence is not authority assessment.

## Explicit working-file refresh

Save the authoring file, generate a separate output directory, and restart the local server with that directory as `UNIVERSAL_ONTOLOGY_QUERY_ROOT`:

```powershell
npm run generate:ontology-indexes -- --source core/universal-core.owl --family universal/core --catalog core/catalog-v001.xml --output dist/query/working
$env:UNIVERSAL_ONTOLOGY_QUERY_ROOT = "dist/query/working"
npm run serve:mcp-development
```

Use the actual saved authoring filename in `--source`.
Generation is explicit, has no watcher, and never rewrites the source.
The catalog accepts contained local RDF/XML and Turtle imports. It rejects remote mappings, ambiguous entries, unsupported directives, and escaping paths. Capture and pre-publication checks detect changed source/catalog/policy inputs.
Immutable objects are written before the catalog is replaced.

## Bounds and interpretation

| Resource                                      | Default or fixed bound | Maximum requested |
| --------------------------------------------- | ---------------------- | ----------------- |
| Named-entity depth                            | 1                      | 4                 |
| Nodes                                         | 40                     | 200               |
| Connections                                   | 120                    | 1,000             |
| Paths                                         | 3                      | 10                |
| Combined MCP text and structured result       | 32 KiB                 | 128 KiB           |
| Selected graphs                               | 16                     | 16                |
| Dataset bytes per graph                       | 8 MiB                  | 8 MiB             |
| Admitted serialized dataset bytes             | 64 MiB                 | 64 MiB            |
| Candidate statements                          | 10,000                 | 10,000            |
| Expression nesting / statements               | 16 / 256               | 16 / 256          |
| Active worker / queued requests               | 1 / 8                  | 1 / 8             |
| Query evaluation / complete request lifecycle | 1 s / 10 s             | 1 s / 10 s        |

Cancellation and deadlines terminate the worker before the next request starts.
A replacement worker reloads the selected snapshot.
Admission bounds and worker heap limits do not constitute a hard process-RSS or WASM-memory cap.

Oversized context can omit raw expression details or neighbour descriptions while preserving the seed and retained relationships; `detailsOmitted`, diagnostics, and completeness reasons identify the loss.
Reduce scope or request a focused follow-up.
Search does not silently prune definitions past its cursor.
An indivisible oversized result returns a safe size error.

## Local qualification observations

On Windows with Node 24.21.0, the generated core/import selection contained six graphs.
Address relationship retained its three exact-cardinality-one roles, including Address and Reference data type targets, through source stdio, an isolated bundled executable, and loopback HTTP.
Activity retained two recorded definition sources, Event as parent, Payment and Process as children, and a qualified minimum of zero for Resource.
That minimum does not imply existence.

The defining-concepts handoff has two distinct review triggers.
For an uncited definition, retain its exact assertion and snapshot, then review its wording and seek external authority separately.
For a recorded-source definition such as Activity, audit the exact source association and compare wording with the cited authority before deciding quality.
These transport checks establish the handoff and local structural evidence; they do not claim external authority validation or a metered model trial.
No ontology definition was rewritten.

Exhausting the active, source-graph, root-owned `no_recorded_source` filter returned 40 core, 198 extended, and 301 reference-data definition assertions.
The corresponding `skos:definition` counts are 39, 197, and 161; shared historical `dcterms:description` policy contributes 1, 1, and 140 respectively.
Entity source assertions remain separate from these counts.

A representative six-graph context measured 473 ms cold and 48–57 ms warm in the query facade.
Actual stdio startup measured 152 ms; its first context call took 586 ms and three warm calls took 51–60 ms.
The combined MCP result was 29,203 bytes with explicit expression/neighbour-detail omissions.
Peak observed process RSS during three inventories and context calls was 375,066,624 bytes.
These are local observations, not percentile guarantees or cross-platform qualification.
