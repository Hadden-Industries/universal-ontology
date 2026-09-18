# Universal Ontology Editing Policy: experience design

**Design basis:** the supplied `Editing-Policy [2026-09-12].md`; the June snapshot is a historical usability comparison, not the normative source for this redesign.  
**Status:** proposed presentation architecture and review prototype, 12 September 2026. No repository or Wiki has been modified.

## 1. Recommendation

Keep one policy and give it two reading paths: **Contributor guide** and **Technical reference**. Retain the existing `Editing-Policy` page identity. Place the contributor guide first, with an immediate link that lets an experienced reader skip it. Keep every technical clause, exception, executable-constraint bullet, scope statement and lineage reference inside the technical section of that same page.

The design should resemble a well-composed field guide and reference manual, not a compliance dashboard. Its visual distinction comes from clear hierarchy, generous separation, consistent rule presentation and explanatory diagrams. Do not substitute decorative banners, badges or an enormous graph for intelligible content.

The supplied new snapshot contains **35 clauses, 32 executable-constraint blocks and 77 constraint bullets**. The prototype preserves every original non-title text block, including the publication identity and repository-authority statement. A repeatable preservation check is included in the package.

## 2. What changed, and what the redesign must not undo

The June document was organised around contributor activities: adding and modifying entities, followed by specialist dataset, distribution and axiom topics. It explained the purpose of several annotation properties and supplied examples and external references. Its presentation was still quite normative, but its structure helped a reader start from a task.

The September document makes much more explicit the distinction between owned and foreign subjects, current validation scope, literal and IRI identifiers, canonical formats, warning-only recommendations, unavailable comparison context and human judgement. It gives each clause a stable identifier and detailed provenance. However, it opens with a policy hash and version mechanics, repeats similar structural metadata throughout, and places concept reuse—the first action needed when proposing a concept—at the end.

**Reorganise the September policy; do not reconstruct current requirements from the June text.** In particular, preserve these boundaries:

| Boundary | What the current source actually says |
| --- | --- |
| Definitions | Required for owned Classes and NamedIndividuals; properties may omit them. Constraints still apply to supplied definitions. |
| English preferred labels | English variants are allowed, not only `en` and `en-GB`. Each preferred label must also be an identical ordinary label. |
| IRI and literal identifiers | IRI identifier uniqueness is enforced across distinct owned entities in the validated set. Literal enumeration codes are exempt. |
| Contributor metadata | Graph presence is optional, supplied values are constrained, and a different editor has a human obligation to add contributor attribution. |
| Modification | Changed existing entities require a valid value under the comparison-based obligation. An unchanged valid value can be accepted; absent comparison context yields unevaluated. |
| ORCID | Format is checked offline; checksum, registration and identity are not established. |
| DCAT profiles | Dedicated namespaces and explicit types matter. Generic entity rules must not be imposed indiscriminately. |
| Predicate spelling | `dcat:downloadURL` is not `dcat:downloadUrl`; the axiom position predicate uses the actual `http://schema.org/` namespace. |
| Vocabulary terms | Pinned snapshot membership and exact authority IRIs must not be reduced to URL-prefix checks. |

These are examples of high-risk simplification, not a replacement for the full reference.

## 3. Information architecture

### Opening

Use the existing title, then a short purpose sentence: **Make the model clearer. Keep its structure trustworthy.** Follow it with two strong text links, each with one sentence explaining the destination. Neither route changes conformance requirements.

Avoid labels such as “basic users” and “advanced users”. “Contributor guide” recognises that a domain expert can understand the subject deeply without knowing SHACL. “Technical reference” identifies a reading need, not a superior category of contributor.

### Contributor guide

Order the guide around decisions and work:

1. Search for an existing meaning and decide whether to reuse or extend it.
2. Choose the kind of edit: ordinary entity, modification, dataset/distribution, module header or axiom.
3. Prepare the ordinary entity’s meaning, names, identity, attribution and sources.
4. Handle modification and contributor attribution.
5. Use the separate dataset/distribution profile when relevant.
6. Review the result and record relevant human judgements.

Keep the central checklist visible. Use plain-language labels followed by a property name only when it is useful for locating the actual field. Include the important conditional and exception statements; omit regexes, UUID bit terminology, SPARQL mechanics and historical decision codes from this path. Each topic links directly to the owning technical clauses.

Do not invent a promise that automation supplies identifiers, timestamps or review evidence. The current policy does not establish such a workflow. A separate “propose a concept without editing RDF” issue form could be a later, explicitly approved contribution mechanism; it is not required for this presentation redesign, nor does it waive the final ontology-edit requirements.

### Technical reference

Start with the policy’s scope and the distinction between requirement strength, property presence and assessment. Include a scope diagram, then arrange the existing groups as follows:

| Order | Existing content retained |
| --- | --- |
| 1 | Human review |
| 2 | Naming |
| 3 | Labels, definitions and descriptive text |
| 4 | Entity metadata |
| 5 | Optional annotations |
| 6 | Datasets |
| 7 | Distributions |
| 8 | Ontology header |
| 9 | Axiom annotations |

Human-only obligations remain visible. Mixed clauses stay in their subject area: contributor attribution under contributors, definition adequacy under definitions, and external derivation under optional annotations. Cross-links may expose them in a human-review navigation summary without creating independent copies of the requirements.

The initial prototype retains source prose verbatim, so it is intentionally conservative. A subsequent source-level editorial pass can split long descriptions into shorter paragraphs and separately authored examples, provided field-by-field semantic review preserves every exception and qualification.

## 4. The technical rule component

Present every rule in the same order:

**Human-readable title.** Do not begin every visible heading with a long code. Keep the clause identifier immediately below it and provide an explicit stable anchor derived only from that identifier.

**Scope and applicability.** State the exact target and any exclusions. Keep conditions needed to apply the rule visible.

**Requirement.** Preserve the full normative description. A summary may precede it but may not replace it.

**Example or relationship illustration.** Show a conforming and a near-miss value where that distinction genuinely helps. Label a fragment as partial; do not describe it as a complete conforming ontology.

**Executable constraints.** Keep the complete existing list in the technical section. A single native disclosure may hold the detailed projection where the visible requirement already states the obligation and exceptions.

**Provenance.** A separate disclosure contains all source text, legacy references, decision references, source links and the original clause heading. Nothing is discarded merely because it appears historical.

Do not nest disclosures, hide an entire rule, or put its anchor inside a closed disclosure. The title, requirement, applicability and human-review obligation remain directly readable.

### Four dimensions that must not be conflated

| Dimension | Meaning | Example |
| --- | --- | --- |
| Normative strength | The force of an obligation | MUST versus SHOULD |
| Presence | Whether a property must occur | Optional `dcat:mediaType`, at most once |
| Assessment | How compliance is established | Executable, human, or mixed |
| Evaluation state | Whether a check could be evaluated in a run | Unevaluated change obligation without a snapshot |

“MUST” does not mean “this property is mandatory”. “Human review” does not mean “optional”. “Unevaluated” does not mean “passed”. A non-blocking automated warning does not remove the underlying recommendation.

For mixed clauses, attach assessment metadata to the relevant sub-obligation rather than assigning a misleading single label to the entire clause. Likewise, “presence” can be predicate-specific when one clause discusses several fields.

## 5. Visual system

### Style

Use GitHub’s own typography and body layout. Do not depend on custom fonts, CSS cards or JavaScript in the Wiki. Use restrained accent colours inside diagram assets: blue for structural information, teal for supporting context and amber for an explicit warning or unevaluated state. The words and shapes must communicate the same distinction without colour.

Use one diagram to answer one question. Avoid a single all-policy graph, broad multi-column page layouts, screenshots of prose, tiny labels, decorative badge collections and graph-node counts masquerading as insight.

The prototype includes seven diagrams, each in light and dark PNG and SVG variants:

| Diagram | Audience and purpose |
| --- | --- |
| Contribution journey | Guide: search, reuse/place, describe, review |
| Entity anatomy | Guide: the five information groups associated with an ordinary entry |
| Dataset access guide | Guide: distinguish the collection, its distribution and an access route |
| Validation scope | Reference: overlapping selectors, ownership and generic-profile exclusions |
| Label correspondence | Reference: separate local-name correspondence from exact label-term equality |
| Modification obligation | Reference: new, changed and unavailable-comparison cases; validity still applies |
| DCAT profile constraints | Reference: explicit types, required metadata, cardinalities and local target declarations |

These diagrams are illustrative views of selected requirements, not an independent policy. In particular, their displayed cardinalities describe validation constraints; they do not assert the existence of corresponding OWL cardinality axioms.

### Asset strategy

Use **native Mermaid for simple graphs** where its standard layout is sufficient. GitHub explicitly supports Mermaid in Wikis; check the version of the actual renderer rather than assuming the latest Mermaid release is deployed there. [1]

Use **generated external image assets for the most carefully composed diagrams**. GitHub’s Wiki guidance explicitly documents PNG, JPEG and GIF images, making PNG an appropriate publication fallback. Retain SVG as the editable/vector companion and use an SVG embed only after verifying the exact publication surface. [2]

The supplied prototype embeds PNG variants with `<picture>` and an `<img>` fallback. GitHub documents this light/dark approach; it still needs a Wiki-specific smoke test, including a manually chosen GitHub theme that differs from the operating system preference. A fallback image must remain usable if theme selection does not behave as expected. [3]

For production, publish Markdown and generated assets together. Prefer immutable or content-addressed image names; do not overwrite an old diagram URL with an image describing a different policy revision. Source-code lineage links should resolve to the exact source revision used for publication, not moving `main` links. The supplied Markdown uses staging-relative asset paths; a production renderer must emit the correct Wiki asset URLs.

## 6. GitHub-native interaction choices

| Feature | Recommendation |
| --- | --- |
| Heading anchors | Use explicit clause-ID anchors and stable audience anchors; preserve legacy fragment aliases where feasible. |
| Wiki sidebar | Add a small editing-policy navigation fragment rather than a second list of all 35 clauses. |
| Native details/summary | Use for lower-priority implementation detail and lineage; keep the essential requirement visible. |
| Tables | Use small tables for comparisons, applicability and cardinality. Avoid page-layout tables and very wide matrices. |
| Alerts | Reserve one or two for information critical to success; no alert for every MUST. |
| Code fences | Use exact syntax and labelled partial examples. Keep regexes and namespace spellings copyable. |
| Theme-aware images | Supply light/dark alternatives and a robust fallback; verify on the actual Wiki. |
| Custom tabs, filters and interactive graphs | Do not promise these inside GitHub Wiki Markdown. They require a different presentation surface. |

GitHub documents native disclosures, heading anchors, sidebars and alerts. Its formatting guidance recommends limiting alerts to one or two per article. GitHub-flavoured Markdown and GitHub’s complete rendering pipeline are not the same thing: the platform applies additional processing and sanitisation. [4][5][6][7]

Progressive disclosure should expose complexity when needed, not make essential requirements difficult to discover. GOV.UK’s design guidance explicitly cautions against hiding content that most users need and against nested accordions. It also recommends trying simpler headings, navigation or page structure before introducing hiding mechanisms. [8][9]

Provide a generated fully expanded technical edition for readers who prefer uninterrupted searching, copying or printing. It must come from the same content model, not become a separately maintained policy. Browser Find, fragment navigation and print handling of closed details should be tested rather than assumed.

## 7. Accessibility and usability acceptance criteria

Every diagram needs concise alternative text plus an adjacent textual account of the important relationships and constraints. Complex images need more than a generic “ontology diagram” label. W3C recommends short identification together with an appropriate detailed textual equivalent. Mermaid provides `accTitle` and `accDescr`, but those do not remove the need to verify the final rendering. [10][11]

For the authored material, target WCAG 2.2 AA: normal text contrast of at least 4.5:1, meaningful non-text graphics at least 3:1, no colour-only distinctions, keyboard operation and visible focus, and usable reflow. Test body content at 320 CSS pixels and with zoom. A diagram may legitimately require a two-dimensional layout, but its textual equivalent must remain usable when the scaled image is too small to read. [12]

The review tasks should be concrete: locate what is needed to add a Class; determine whether a property needs a definition; explain why a differently tagged ordinary label does not match a preferred label; establish whether media type is mandatory; find the source of a named clause; explain what missing comparison context means. Test with both a subject-matter contributor and an implementer, not only policy authors. Any proposed time-to-answer threshold is a project acceptance target, not an established research result.

The local prototype was checked for source-block preservation, internal fragment links, image loading, disclosure operation and mobile document width. Those tests do **not** certify GitHub rendering, screen-reader compatibility, WCAG conformance or the ontology validator.

## 8. Preserve generation without making prose a second policy

The live canonical root inspected for this proposal already uses `sh:name`, `sh:description`, `sh:group`, `sh:order`, requirement identity, normative strength and source metadata. Extend that documentation model rather than hand-editing the Wiki. The root inspection confirms the metadata arrangement; it is not an audit of the renderer implementation. [13]

A suitable publication architecture is:

```text
Canonical policy graph + trusted validation context
        ├── executable validation
        └── lossless policy documentation model
                    + reviewed reader guidance
                    + diagram-view definitions and example fixtures
                    ├── contributor guide
                    ├── complete technical reference
                    ├── expanded technical edition
                    ├── diagrams and textual equivalents
                    └── coverage and publication manifest
```

SHACL is already designed to carry non-validating display characteristics as well as constraints, and the W3C specification recognises uses such as interface building. This supports the architectural direction, but it does not imply that arbitrary plain-language explanations can be mechanically inferred from arbitrary SPARQL. [14]

Author reader guidance once, alongside the policy, link it to stable requirement IRIs, and review it when those requirements change. Do not generate publication prose with an unconstrained language-model call on each build. New presentation metadata must not accidentally enter a validation target or alter the validator configuration.

Suggested logical artefact names—**proposed, not claims about current repository files**—are `reader-guidance.ttl`, `reader-guidance-shapes.ttl`, `diagram-views.ttl`, `policy-documentation-model`, `technical-reference-renderer`, `contributor-guide-renderer` and `policy-documentation-coverage.json`. Resolve the actual language and paths against the existing generator before implementation.

Keep these concepts separate: the canonical policy identity already used by the project; the source-snapshot file hash used by the prototype’s preservation test; and a presentation/publication identity covering guidance, renderer configuration and assets. A display-only change can alter a full graph hash even when executable constraint semantics do not change. Do not silently redefine the existing policy-identity algorithm to avoid that fact.

### Guardrails against documentation drift

The production build should establish coverage at the clause and sub-constraint level. Clause-ID counts alone are insufficient: a renderer could preserve all IDs while losing one branch of `sh:or` or a SPARQL qualification. Preserve targets, exclusions, logical branches, cardinalities, datatypes, node kinds, lexical patterns, severity, snapshot dependencies and human obligations.

In particular, the September snapshot’s UUID clause has no “Executable constraints” block, and some clauses’ descriptions are richer than their projected bullet lists. Therefore the absence of a list must never be interpreted as the absence of an executable obligation, and the 77 bullets are not a proven inventory of the entire policy graph.

Use the original technical snapshot as a migration baseline, not the ongoing production source. The prototype deliberately parses that snapshot to demonstrate a lossless layout. The real implementation must render from the canonical graph and reviewed documentation metadata.

Generate positive and negative examples from reviewed fixtures and run them in a validation context that actually targets their subjects. An example outside every ownership target can otherwise appear to pass vacuously. Assert the expected constraint and severity, not just a global exit code. A “negative” illustration should violate the intended rule rather than fail because required unrelated metadata was omitted. The included Turtle fragment is intentionally labelled partial and has not been described as a conforming fixture.

Natural-language fidelity still needs human review. Mechanical preservation and fixture tests catch omission and regression; they cannot prove every explanatory sentence is semantically equivalent to the whole policy.

## 9. Implementation sequence

**First, freeze and inventory the baseline.** Preserve all 35 clauses and their complete source detail. Establish stable anchors and the source-block/semantic-field coverage checks.

**Then, build the two reading paths.** Reuse the existing policy metadata. Introduce the contributor guidance and the consistent technical rule component without changing constraint semantics. Preserve the repository-authority statement and all provenance in the technical section.

**Next, add the diagrams and tested examples.** Use explicit diagram views, editorial review and real validation contexts. Publish light/dark assets with accessible textual equivalents.

**Finally, verify on GitHub Wiki.** Check the real renderer, source links, Wiki asset paths, keyboard use, narrow views, theme changes, fragment navigation, disclosure and expanded output. Publish the Markdown and assets together only after the preservation and usability checks pass.

This is a presentation and documentation-generation change. Changes to what contributors must supply or to how the validator judges it belong in a separate policy decision.

## Sources

The two supplied Markdown snapshots are the policy basis. External sources below support the presentation recommendations, not amendments to that policy. Accessed 12 September 2026.

1. [GitHub Docs — Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
2. [GitHub Docs — Editing wiki content](https://docs.github.com/en/communities/documenting-your-project-with-wikis/editing-wiki-content)
3. [GitHub Blog — Light/dark images in Markdown](https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/)
4. [GitHub Docs — Organizing information with collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)
5. [GitHub Docs — Basic writing and formatting syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
6. [GitHub Docs — Creating a footer or sidebar for your wiki](https://docs.github.com/en/communities/documenting-your-project-with-wikis/creating-a-footer-or-sidebar-for-your-wiki)
7. [GitHub Flavored Markdown specification](https://github.github.com/gfm/)
8. [GOV.UK Design System — Details](https://design-system.service.gov.uk/components/details/)
9. [GOV.UK Design System — Accordion](https://design-system.service.gov.uk/components/accordion/)
10. [W3C WAI — Complex images](https://www.w3.org/WAI/tutorials/images/complex/)
11. [Mermaid — Accessibility options](https://mermaid.js.org/config/accessibility.html)
12. [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
13. [Universal Ontology — Canonical editing-policy root](https://github.com/Hadden-Industries/universal-ontology/blob/main/policy/editing-policy.ttl), inspected through the connected GitHub tool; retrieved blob SHA `418f7d4442df37b9913e081c02890911ef399490`.
14. [W3C — Shapes Constraint Language](https://www.w3.org/TR/shacl/)
15. [Diátaxis — Start here](https://diataxis.fr/start-here/) and [Reference](https://www.diataxis.fr/reference/), supporting the distinction between goal-oriented guidance and information-oriented reference.
