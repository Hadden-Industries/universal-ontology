# Direct document loading qualification

The first implementation slice exercises the public OwlAPI loader and the existing MCP `get_entity_context` handler.
This probe measures a cold load, the first context call, 100 warm requests and three replacement loads.

```powershell
node packages/universal-ontology-mcp-server/tests/fixtures/qualifyDirectOntologyContext.js FILE FORMAT MODE ENTITY_IRI
```

The client and server exchange MCP messages over the SDK's in-memory transport.

| Source                    | Mode       | Classes | Cold load (ms) | Four context requests (ms) | Peak RSS (KiB) |
| ------------------------- | ---------- | ------: | -------------: | -------------------------- | -------------: |
| ISO 21506, first entry    | preserve   |     100 |            782 | 110, 23, 5, 4              |         198836 |
| ISO 19439, first entry    | preserve   |      64 |            803 | 78, 5, 13, 4               |         160372 |
| UO core 20260912, Address | compatible |     138 |           1242 | 66, 11, 10, 11             |         284112 |
| UO core 20240729, Address | compatible |     146 |           1234 | 72, 3, 3, 3                |         257060 |

These Windows observations used four concurrent processes, one per document, and source graphs.
The historical Address returned no SKOS definition.
The UO parity slice must check its historical property mappings.
The ISO files had the exact digests recorded in the [implementation plan](../plans/2026-11-13-direct-ontology-file-mcp-browsing.md).
Private text stays on its source share.

The synthetic Turtle case has two OWL axiom resources annotating the same literal.
Each carries its own position and source.
Both mapping modes return the two pairs through the MCP schema.
A separate test loads the real OWL-Time RDF/XML as a bound import.
The preserve attempt returns `RDF_LEGACY_CLASS_RECOVERY` and the compatible attempt admits the import.
A failed attempt in both modes keeps the prior term handle usable.

On Windows with Node 26.13.1 and an Intel Core i5-10600K, core 20260912 took 445 ms to open in a fresh process.
The first context request took 48 ms.
Across 100 subsequent calls the median was 3.1 ms and p95 was 7 ms.
Three cycles of loading and closing a replacement and querying the retained original took 299–360 ms each.
The original still answered after each replacement closed.
Peak process RSS with overlapping views was 538 MiB.
This includes the temporary OwlAPI model, Oxigraph store, runtimes and allocator.
Closing the store releases its logical contents.
RSS need not fall immediately.

On the reference machine, the cold-load budget is 2 seconds, followed by 200 ms for the first context call.
For 100 warm depth-zero context calls, the p95 budget is 25 ms.
Across three replacement loads, the peak process RSS budget is 700 MiB.
Time budgets include scheduling variation.
Other hardware requires recorded measurements.
Each closure initially allows 32 MiB of captured UTF-8 input, 16 documents and 200,000 quads.
The workspace allows one open operation at a time and up to eight views.
The worker and capacity slice must test mixed queries, cancellation and aggregate memory in the installed product.

The packaging probe compiled a CommonJS Node worker using esbuild and the public `owlapi/apibinding`, `owlapi/io` and `owlapi/model` imports.
A fresh Node process outside the checkout loaded both RDF/XML and Turtle using those bundled bytes.
The candidate includes 22 npm components.
Production packaging needs the measured component list and the exact licences and notices.
Package tests must exercise the installed worker alongside Oxigraph's WASM asset.

The OwlAPI developer granted use of OwlAPI within the UO MCP server in the implementation chat on 13 November 2026.
OwlAPI retains its own `AGPL-3.0-only` licence within the software.
Retain its licence, author notice and component notices when bundling it.

## Installed Windows qualification

The local installer activated the stdio executable, worker, WASM and notices in `.agent-tools/bin/`.
A fresh MCP client launched that executable for each row on Windows x64 with Node 26.13.1 on the Intel Core i5-10600K.
Each run checked an exact resolution, a term card with at least one definition and a self-connection.
It made 100 warm calls, rotating through search, resolution, context and connections, then checked view closure.
The timing columns use milliseconds.
Peak memory is the server process's Windows peak working set in MiB and includes its worker threads.

| Source             | Mapping    | Classes | Cold to list | First context | Warm p50 | Warm p95 | Peak MiB |
| ------------------ | ---------- | ------: | -----------: | ------------: | -------: | -------: | -------: |
| UO core 20260912   | compatible |     138 |          953 |            34 |        7 |       11 |      321 |
| UO core 20190201   | compatible |     122 |          729 |            25 |        3 |        7 |      258 |
| Community glossary | compatible |       3 |          692 |           170 |       20 |       51 |      121 |
| ISO 21506:2024     | preserve   |     100 |          759 |            27 |        3 |        7 |      229 |
| ISO 19439:2006     | preserve   |      64 |          445 |            41 |        3 |        7 |      157 |

The current-core run also opened three successive generations of a separate Turtle file.
A single-view filter returned only its own term.
A search of two selected views continued across pages after a third view opened.
Each generation had its own definition, which remained readable through its pinned handle after refresh.
Closing the prior generation left the two expected view IDs.
Malformed replacement bytes produced a diagnostic in both mapping modes.
The latest accepted Turtle definition and the original core term remained readable after each refusal.
Final closure left zero views.
The community glossary qualified in compatible mode.
A preserve-mode startup attempt did not open it.
Both unmodified ISO exports qualified in preserve mode.

During the production website build, ISO 21506 took 2,481 ms to load cold, exceeding the 2 s reference budget.
Mixed-query p95 was 184 ms.
The table records a subsequent sequential corpus run after that build.
The community glossary reached 51 ms mixed-query p95 in the sequential run and 16 ms in the earlier run.
The 25 ms reference value applies to context-only calls.
The measurements do not establish a uniform 25 ms mixed-query latency guarantee.

### Reproduce from the checkout

Run `npm run set-up:mcp-servers -- --ontology-only` and `npm run set-up:mcp-servers -- --ontology-only --check`.
Pass the installed executable, source path, search text, expected SHA-256 and mapping mode to the client.
Use `-` in place of the expected SHA-256 to record the digest.
The optional final `lifecycle` argument exercises refresh and recovery using a temporary directory.
The client checks the root snapshot against the file URL, format, parsing mode and preflight digest.
The script emits counts and measurements without copying ontology text into the report.
Use `Address` for both UO releases and `G.1` for `community-glossary.ttl`.
For each private ISO export, use the text of the first `skos:prefLabel` element in file order.

```powershell
node packages/universal-ontology-mcp-server/tests/fixtures/qualifyInstalledOntology.js .agent-tools/bin/universal-ontology-mcp-server.mjs src/universal/core/20260912 Address - compatible lifecycle
```

| Installed asset                   | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| universal-ontology-mcp-server.mjs | `70f3aedb9d62a6c7089f7b3d3a7353f7f86ec276a88eff86bad3975826968d3a` |
| ontologyStoreWorker.cjs           | `09b76c3a04479d00900304df5b2cbeb3d5f896114b5ef313e06cf2da60644db5` |
| node_bg.wasm                      | `fb50ae07d695b144047a2d97555ae7ae8eebc8688126a28dae05831185fbe4fa` |

| Input              | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| UO core 20260912   | `214f21e9116c0515bd52e5e8e893c83fcf93eb4ce586a49dbd8afc8a05e2c190` |
| UO core 20190201   | `d8eae4fec4e034e1fa6d7cf619fdf17c8e88560c437caa59d124c21142856064` |
| Community glossary | `4d113e2ba9689f333aab0574210868964bbb16c4e757fb64683dae37927fb5be` |
| ISO 21506:2024     | `055ce1e21d18c5ed6c69d67390e453f0925bee09ee275e13c67eadb785978d3e` |
| ISO 19439:2006     | `1a72d37fce049b7cab0dda8d767b726373debcc26e6f556fb8ab2e4e67d3577a` |

The repository-local stdio host grants the current release and the approved `src/universal` root.
The development HTTP listener defaults to the current file.
The real-client tests open two ontologies under an explicitly authorized fixture root.
On both transports, they open a third view between pages, follow citations and check each source's definitions.

The workspace admits one capture at a time and up to eight ready views.
It allows 32 MiB of input per closure and 64 MiB in total across ready views and the candidate.
It retains up to 64 continuations.
Source-byte limits supplement the per-worker heap cap.
Working-set observations apply to this corpus.

This checkout supplied Windows runtime evidence.
Linux execution remains open because WSL has no installed distribution and no container runtime was available.
Platform archive and SBOM tests on Windows check packaging and metadata only.
The combined installer previously reached a Windows sharing violation replacing the in-use GitHub executable.
UO-only activation preserved its running consumers.
Restart each consuming chat or host to adopt the new transport.
