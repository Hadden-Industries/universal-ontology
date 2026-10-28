# Editing policy documentation

Canonical policy meaning belongs to [`policy/`](../../policy/).
The [generated page](../policy/Editing-Policy.generated.md) offers a contributor guide and a complete technical reference with stable `EP-*` anchors.
Edit source inputs here or the renderer; never edit generated output.

`source/reader-guidance.ttl` is a separate documentation graph.
Its SHACL contract requires non-normative summaries and active requirement references.
`source/guidance-reviews.json` records the exact linked rule fingerprints checked when the explanations were authored.
An independent final review must assess their fidelity; fingerprints establish freshness, not correctness of an explanation.
The diagram manifest applies the same freshness rule to the seven explanatory diagram families.

The extractor retains language tags, datatype identity, shared anonymous nodes, targets, logical expressions, SPARQL, messages and severity.
The generated model contains the entire canonical graph as well as per-rule projections.
Anonymous numeric references are local to each projection; they are not stable public identifiers.
Property presence is recorded separately from normative strength and assessment.
Constraint-local presence does not override another conditional obligation.

```sh
npm run generate:editing-policy
npm run check:editing-policy
npm run test:policy-rendering
npm run test:ontology-policy
npm run check:editing-policy:accessibility
```

Generation writes the page, sidebar fragment, model, preservation report, manifest and all diagram variants under `docs/policy/`.
`--check` renders fresh bytes offline and changes no tracked inputs.
`--output FILE` retains the original single-page interface; `--output-dir DIRECTORY` renders or checks the complete bundle elsewhere.
Formatting, dependency installation and browser acquisition are separate operations.

The locked Mermaid CLI 12.0.0 (MIT) renders accessible SVG with the existing Playwright Chromium headless shell and embedded Open Sans 5.3.0 fonts (SIL OFL 1.1).
SVG text uses geometric precision, and branch conditions are explicit in node text to avoid platform-dependent edge-label bounds.
The locked resvg WebAssembly 2.6.2 (MPL-2.0) converts those exact SVGs to PNG with the same pinned font, without system fonts or browser screenshots.
SVGs retain selectable text and embedded fonts; alt text and complete text equivalents accompany every diagram.
Marked 18.1.2 (MIT) supplies GFM parsing, and Axe Playwright 4.14.0 (MPL-2.0) checks the local preview.
Versions are minimum declarations with exact npm-lock selections, following repository policy.
The Mermaid Node API is not covered by upstream semantic versioning; the lock and deterministic rendering tests protect its use.
No package or browser is downloaded by a generation or verification command.
For a separately authorised browser installation, use `npm run install:editing-policy-browser`.
CI provisions that locked browser in the existing consumers.

Native reuse and API references: [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli#use-nodejs-api), [resvg WebAssembly](https://github.com/thx/resvg-js/blob/main/wasm/index.d.ts), [Marked](https://marked.js.org/using_pro), [Axe Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright), and [SHACL](https://www.w3.org/TR/shacl/).
Open Sans licence text accompanies generated assets.
The pinned authority snapshots used by policy fixtures remain independent of diagram tooling.

The historical September report names a digest that does not match the available snapshot.
The original evidence is retained unchanged.
The new preservation report checks the identified retained bytes, including all 35 clauses, 77 constraint bullets and 224 non-title blocks; it does not retroactively validate the old digest claim.

`ontology_policy.publish_wiki.prepare_publication` prepares only manifest-owned files and a bounded sidebar fragment in an owned disposable Wiki checkout.
It refuses unowned collisions, path/link escape, changed managed files and ambiguous navigation markers, and journals interrupted writes for replay.
The caller must authenticate exact successful main qualification and verify the generated manifest before supplying bytes.
`prepare_verified_publication` admits the externally qualified manifest digest and checks every declared source/output before writing.
`assert_wiki_base` refuses changed local or remote Wiki revisions; the eventual push must still use ordinary non-forcing Git semantics.
Adopting an existing legacy page requires exact prior file digests and a separately accepted ownership decision.
Deployment credentials, remote concurrency checks, signed Wiki commits and pushing belong to the separately authorised release orchestrator.
No live Wiki publication is enabled by this implementation.

Local browser checks cover eight viewport/theme combinations and native disclosure keyboard activation.
They approximate the authored content, rather than certify GitHub's renderer.
Live Wiki smoke testing, assistive-technology checks and participant usability acceptance remain separate release requirements; see [the test script](usability/test-script.md).
