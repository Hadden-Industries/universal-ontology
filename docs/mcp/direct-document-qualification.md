# Direct document loading qualification

The first implementation slice exercises the public OwlAPI loader and the existing MCP `get_entity_context` handler. Run `node packages/universal-ontology-mcp-server/tests/fixtures/qualifyDirectOntologyContext.js FILE FORMAT MODE ENTITY_IRI` to measure a cold load, the first context call, 100 warm requests and three replacement loads. The client and server exchange MCP messages over the SDK's in-memory transport.

| Source                    | Mode       | Classes | Cold load (ms) | Four context requests (ms) | Peak RSS (KiB) |
| ------------------------- | ---------- | ------: | -------------: | -------------------------- | -------------: |
| ISO 21506, first entry    | preserve   |     100 |            782 | 110, 23, 5, 4              |         198836 |
| ISO 19439, first entry    | preserve   |      64 |            803 | 78, 5, 13, 4               |         160372 |
| UO core 20260912, Address | compatible |     138 |           1242 | 66, 11, 10, 11             |         284112 |
| UO core 20240729, Address | compatible |     146 |           1234 | 72, 3, 3, 3                |         257060 |

These Windows observations used four concurrent processes, one per document, and source graphs. The historical Address returned no SKOS definition. The UO parity slice must check its historical property mappings. The ISO files had the exact digests recorded in the [implementation plan](../plans/2026-11-13-direct-ontology-file-mcp-browsing.md). Private text stays on its source share.

The synthetic Turtle case has two OWL axiom resources annotating the same literal. Each carries its own position and source. Both mapping modes return the two pairs through the MCP schema. A separate test loads the real OWL-Time RDF/XML as a bound import. The preserve attempt returns `RDF_LEGACY_CLASS_RECOVERY` and the compatible attempt admits the import. A failed attempt in both modes keeps the prior term handle usable.

On Windows with Node 26.13.1 and an Intel Core i5-10600K, core 20260912 took 445 ms to open in a fresh process. The first context request took 48 ms. Across 100 subsequent calls the median was 3.1 ms and p95 was 7 ms. Three cycles of loading and closing a replacement and querying the retained original took 299–360 ms each. The original still answered after each replacement closed. Peak process RSS with overlapping views was 538 MiB. This includes the temporary OwlAPI model, Oxigraph store, runtimes and allocator. Closing the store releases its logical contents. RSS need not fall immediately.

For this corpus on the reference machine, budget 2 seconds per cold load, 200 ms to first context after opening, 25 ms p95 for 100 warm depth-zero context calls, and 700 MiB peak process RSS across three replacement loads. Time budgets include scheduling variation. Other hardware requires recorded measurements. The initial admission limits are 32 MiB of captured UTF-8 input per closure, 16 documents, 200,000 quads, one in-flight open and eight views. The later worker and capacity slice must qualify mixed queries, cancellation and aggregate memory against the installed product.

The packaging probe compiled a CommonJS Node worker using esbuild and the public `owlapi/apibinding`, `owlapi/io` and `owlapi/model` imports. A fresh Node process outside the checkout loaded both RDF/XML and Turtle using those bundled bytes. The candidate includes 22 npm components. Production packaging needs the measured component list, exact licences and notices, and tests of the installed worker alongside Oxigraph's WASM asset.

The OwlAPI developer granted use of OwlAPI within the UO MCP server in the implementation chat on 13 November 2026. OwlAPI retains its own `AGPL-3.0-only` licence within the software. Retain its licence, author notice and component notices when bundling it.
