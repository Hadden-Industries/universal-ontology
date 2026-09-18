> [@Deep Research](plugin://deep-research-work@openai-curated-remote) I have improved the process by which the GitHub wiki for an editing policy for an ontology is produced - it now is programmatically produced from a dedicated SHACL design. It used to look like the attached "Editing-Policy [2026-06-29].md", that was hand-authored. Now it looks like "Editing-Policy [2026-09-12].md". The updated version is much more functional and arguably more complete and with great lineage details, but its user-friendliness leaves a LOT to be desired; it is extremely terse and technical, which may satisfy some consumers of it, but will be massively off-putting to those users that may want to contribute to the ontology design but be overwhelmed by the excessive process implied by the updated editing policy. Therefore, I think we need to overhaul the Wiki page; split the document into a for-technical-readers and for-non-technical readers section, with appropriate detail in each. The usability/UX point still stands for both the the technical and non-technical versions; I am certain there are modern best-practice UI/UX approaches for GitHub-flavored Markdown we could utilize (including by linking in diagrams from *outside* the Markdown itself). We need visualizations of the structures and constraints in each of the sections regardless, to be more easily grasp the concepts. Propose a design that would look AMAZING, AND follow the most modern UI/UX best practice, while retaining all the detail appropriate to each section. Note that ALL the detail in the for-technical section needs to be preserved in that section, just arranged differently. Some detail may be trimmed in the non-technical section for readability, but preserve the important need-to-knows.


Max, I recommend redesigning this as **a contributor guide backed by a complete technical reference—not two competing policies, and not the same intimidating document hidden behind accordions.**

The governing principle should be:

> **Make it easy to understand what to contribute, then easy to inspect exactly what the policy requires.**

I have prepared a working design prototype, rather than only describing the approach.

| Deliverable | What it contains |
|---|---|
| **:chatgpt-content-reference{index="19"}** | A self-contained preview of the proposed page, including both reading paths, diagrams, navigation and expandable details. |
| **:chatgpt-content-reference{index="20"}** | The design specification, Markdown, seven diagrams in light/dark PNG and SVG variants, expanded technical edition, sidebar fragment and verification reports. |
| **:chatgpt-content-reference{index="21"}** | The complete redesigned page, based on your September snapshot. |
| **:chatgpt-content-reference{index="22"}** | The rationale, information architecture, generation approach, accessibility requirements and implementation safeguards. |

The prototype’s technical section retains **all 35 clauses, all 77 executable-constraint bullets, and all 224 non-title source-text blocks** from the September document. This was checked programmatically. The prototype is generated from your supplied snapshot to demonstrate the presentation—not from the live policy graph—and has not been published to GitHub.

## 1. What needs to change—and what must not

The older document organised its main content around contributor activities: **adding entities**, **modifying entities**, and then specialist cases. It also explained what several properties meant. That gave readers a recognisable task to start from, despite its fairly strict tone. 

The September document introduces valuable precision: ownership and validation scope, conditional obligations, warning-only recommendations, exact lexical requirements, human-review boundaries and detailed lineage. However, it starts with publication machinery and ontology versioning, gives implementation detail almost the same prominence as contributor guidance, and puts “search for an existing concept” at the end—even though that is the first meaningful action when proposing a new concept. 

**The solution is to recover the older document’s task orientation without recovering its superseded requirements.**

For example, the redesign must preserve that definitions are required for Classes and NamedIndividuals but may be omitted for properties; English preferred labels can use regional variants; every preferred label needs an identical ordinary label; and literal identifiers are exempt from the identifier-uniqueness rule. Those distinctions must not disappear during simplification. 

The document should therefore separate **understanding the contribution**, **applying the requirements**, and **auditing their implementation**. This is consistent with Diátaxis’s distinction between goal-oriented guidance and information-oriented reference; the important point is their different purposes, not mechanically adopting a documentation framework’s entire structure. 

## 2. Recommended information architecture

Keep the existing **Editing Policy** page identity, with two clearly named sections:

**Contributor guide**  
Understand what your contribution needs, why it matters, and which rules apply.

**Technical reference**  
Inspect every exact requirement, exception, executable constraint and source.

I would avoid headings such as “For non-technical users” and “For advanced users”. A domain expert may understand the ontology’s subject matter exceptionally well without knowing SHACL. Name the reading task, not the presumed ability of the reader.

The proposed page structure is:

```text
Universal Ontology Editing Policy
│
├── Brief purpose and two immediate navigation links
│
├── Contributor guide
│   ├── Start with the meaning
│   ├── Choose the kind of change
│   ├── Understand an ordinary ontology entry
│   ├── Change an existing entry
│   ├── Describe datasets and their distributions
│   └── Review the contribution
│
└── Technical reference
    ├── Scope and interpretation
    ├── Human review
    ├── Naming
    ├── Labels, definitions and descriptive text
    ├── Entity metadata
    ├── Optional annotations
    ├── Datasets
    ├── Distributions
    ├── Ontology header
    └── Axiom annotations
```

The contributor guide comes first, but a technical reader can bypass it immediately. Ontology-header mechanics move later because they are not the natural starting point for most conceptual contributions.

**All technical content remains inside the technical section.** Links to repository sources supplement the reference; they do not replace details that currently appear on the page.

### The opening should explain the value, not advertise the machinery

Suggested opening:

> **Make the model clearer. Keep its structure trustworthy.**
>
> Use the contributor guide to understand what your change needs. Use the technical reference for exact rules, exceptions and validation details.
>
> Both describe the same policy. The guide is an explanation, not a weaker set of requirements.

The full policy identity, generation statement and repository-authority statement remain in the technical section. They no longer occupy the contributor’s first encounter with the page.

## 3. Contributor guide: organise around meaning and decisions

The guide should answer practical questions before introducing formal machinery:

**Does this concept already exist? What kind of thing am I adding? What information does it need? What changes when I edit an existing entry? What still requires human judgement?**

For an ordinary entity, group the information into recognisable areas rather than presenting an uninterrupted inventory of RDF predicates:

!:chatgpt-content-reference{index="23"}

This is an explanatory grouping, not a new schema. The detailed conditions remain in the linked technical clauses.

### Keep the important exceptions in the guide

Plain language must not become inaccurate language. The contributor path should still make these distinctions clear:

| Topic | What the contributor needs to understand |
|---|---|
| Meaning and reuse | Search for the meaning, including synonyms and alternative spellings. Reuse an existing concept where appropriate, or place a new one beneath a broader concept. Record the review judgement. |
| Names and definitions | Names need language tags and the relevant naming conventions. Classes and NamedIndividuals need definitions; properties may omit them. |
| Identity and attribution | Ordinary entities need a qualifying UUID identifier, creator attribution and a creation timestamp. Use the canonical formats linked from the guide. |
| Existing entries | A changed existing entity needs modification metadata when comparison context establishes the change. A different editor also has a human obligation to add contributor attribution. |
| Special profiles | Datasets and distributions follow their own profiles; do not copy the ordinary-entity checklist onto them. |
| Review | Automated conformance does not establish conceptual adequacy or prove that a concept has not been duplicated. |

These are simplifications of the September policy, not additional process requirements. 

What can leave this reading path? UUID bit terminology, regular expressions, SPARQL mechanics, historical decision codes and repeated target descriptions. A contributor should be able to reach those details when needed without encountering all of them before understanding the change.

I would also **avoid promising an easier contribution workflow that does not yet exist**. For example, “just describe the concept and automation will fill everything else in” would require a separately designed and approved workflow. This redesign should reduce the *reading burden*, not silently invent or waive obligations.

## 4. Technical reference: preserve everything, change its visual priority

The technical section needs more than prettier headings. It needs a consistent component for each rule.

### Proposed rule layout

Each rule should present:

1. A readable title, with its clause identifier immediately beneath it.
2. The complete normative description and exact applicability.
3. A focused example or illustration where it materially improves understanding.
4. The complete executable-constraint detail.
5. The complete provenance and source references.

Only the last two are candidates for collapsed presentation. **The rule itself, its applicability, its exceptions and its human-review obligations stay visible.**

Here is the technical-reference treatment in the prototype:

!:chatgpt-content-reference{index="24"}

The illustration above distinguishes two easily confused requirements: local-name correspondence uses the policy’s normalisation rules, whereas copying a preferred label into an ordinary label requires the same text and language tag. These are not the same comparison. 

### Separate four dimensions that the current presentation makes easy to confuse

This is the most important semantic improvement to the interface:

| Dimension | What it answers | Example |
|---|---|---|
| **Normative strength** | How strong is this obligation? | MUST or SHOULD |
| **Presence** | Does this property have to be supplied? | Required, optional or conditional |
| **Assessment** | How is compliance established? | Executable check, human review or a combination |
| **Evaluation state** | Could the obligation be evaluated in this run? | Evaluated or unevaluated |

Consider **Media type**:

> **Clause:** `EP-DISTRIBUTION-MEDIA`  
> **Normative strength:** MUST  
> **Presence:** Optional; at most one value  
> **When supplied:** The value must be an IRI belonging to the pinned IANA Media Types snapshot.

That is substantially clearer than a heading ending in “(MUST)” followed by a paragraph beginning “is optional”. Both statements are correct; the interface should explain why they are not contradictory. 

Likewise:

**Human review is not another word for optional.**  
**Unevaluated is not another word for passed.**  
**A SHOULD warning does not mean the recommendation has disappeared.**

For clauses containing several obligations, attach these distinctions to the relevant sub-obligation. A single “automated” badge on a mixed clause would be misleading.

### Use progressive disclosure selectively

I recommend native `<details>` blocks for:

- **Executable constraints — `EP-…`**
- **Source and original clause heading — `EP-…`**

I do **not** recommend putting every whole rule inside an accordion, nesting disclosures, or hiding the main contributor checklist.

GitHub documents native collapsed sections. GOV.UK’s design guidance cautions against hiding information most users need and recommends considering simpler structure and headings first. That supports using disclosure for supporting detail—not as the main information architecture. 

The pack also includes a **fully expanded technical edition**, generated from the same content. That provides an alternative for uninterrupted reading, searching, copying and printing without creating another manually maintained policy.

## 5. Visualisations: explain specific relationships, not the entire policy at once

I recommend seven focused diagrams, included in the prototype:

| Diagram | Reading path | What it makes easier to understand |
|---|---|---|
| **Contribution journey** | Contributor | Search → reuse or place → describe → review |
| **Entity anatomy** | Contributor | The information associated with an ordinary ontology entry |
| **Dataset access guide** | Contributor | The difference between a dataset, its distribution and an access route |
| **Validation scope** | Technical | Ownership, ordinary-entity exclusions and overlapping selectors |
| **Label correspondence** | Technical | Normalised name correspondence versus exact label equality |
| **Modification obligation** | Technical | New entities, changed entities and unavailable comparison context |
| **DCAT profile constraints** | Technical | Explicit types, required metadata, cardinalities and local target declarations |

Two modelling safeguards matter here.

First, the scope diagram must **not** present all selectors as mutually exclusive branches. The inspected policy root has a broad owned-subject target as well as more specific targets; ordinary entity targets exclude the dataset and distribution namespaces, while the descriptive-language rule reaches owned subjects more broadly. 

Second, displayed cardinalities must be identified as **validation constraints**, not presented as though they were necessarily OWL cardinality axioms.

Each diagram should answer one question. An enormous graph containing every property, exception, severity and lineage link would reproduce the original problem in visual form.

### Visual style

My recommendation is an **editorial reference style**: GitHub-native typography, clear spacing, compact comparisons and carefully composed diagrams.

Use restrained colour inside the diagrams, with consistent meanings, but ensure the text and shapes convey the same distinctions. Avoid decorative badge collections, emoji-led headings, page-layout tables and screenshots containing essential prose.

The aim is not to make the page look like an application dashboard. It is to make a sophisticated specification unusually easy to enter and navigate.

## 6. What GitHub Wiki can actually support

The production design should be based on GitHub’s rendering capabilities, not on what a custom HTML mock-up can do.

| Capability | Recommended use |
|---|---|
| **Headings and explicit anchors** | Stable clause links based on `EP-…` identifiers, independent of future title wording. |
| **Wiki sidebar** | A compact route into the contributor guide, technical reference and major topics. |
| **Native disclosures** | Supporting constraint detail and lineage. |
| **Small tables** | Comparisons and cardinality summaries—not page layout. |
| **Mermaid** | Simple relationship or decision diagrams. |
| **External diagram images** | More carefully composed explanatory graphics. |
| **Alerts** | Exceptional information, not every normative statement. |
| **Custom tabs, filters or interactive graph controls** | Do not make them a dependency of the Wiki design. |

GitHub explicitly supports Mermaid in Wikis. Its documentation also recommends checking the renderer’s actual Mermaid version, rather than assuming every feature in the latest Mermaid release is available. 

For the more polished illustrations, **generate assets outside Markdown and embed them**. GitHub’s Wiki documentation explicitly describes PNG, JPEG and GIF images; I therefore use PNG as the publication fallback and supply SVG companions for vector-quality editing or embedding after verification. 

The prototype supplies light and dark variants using `<picture>` with an `<img>` fallback. GitHub documents this theme-aware image approach, but it still needs testing on the actual Wiki, including a manually selected GitHub theme that differs from the operating-system preference. 

Explicit anchors, sidebars and restrained alerts are documented GitHub features. Arbitrary CSS and JavaScript should not be assumed: GitHub applies processing and sanitisation beyond the GFM specification itself. 

### Accessibility is part of the design

Every diagram needs both meaningful alternative text and an adjacent textual account of its important relationships. W3C’s guidance for complex images supports that combination; a generic “ontology diagram” description is insufficient. 

For authored content, target WCAG 2.2 AA: adequate text and graphical contrast, no colour-only distinctions, keyboard usability, visible focus and usable reflow. On narrow screens, shrinking a complex diagram is not enough—the textual equivalent must remain useful when the image labels become small. 

## 7. Preserve generation: improve the documentation model, not the generated Wiki

**Do not implement this by manually polishing the generated Markdown after each build.** That would undermine the improvement you have already made.

The canonical policy root I inspected already includes display-oriented metadata such as `sh:name`, `sh:description`, `sh:group` and `sh:order`, alongside requirement identifiers, normative strength and sources. That provides a suitable foundation. This inspection was of the policy root, not an audit of the renderer implementation. 

The recommended architecture is:

```text
Canonical policy graph
        │
        ├── Executable validation
        │
        └── Lossless policy documentation model
                    +
             Reviewed reader guidance
                    +
             Diagram definitions and example fixtures
                    │
                    ├── Contributor guide
                    ├── Complete technical reference
                    ├── Expanded technical edition
                    ├── Diagram assets and text equivalents
                    └── Coverage and publication manifest
```

SHACL already provides non-validating characteristics for names, descriptions and presentation organisation, and its specification recognises uses beyond validation, including interface building. That supports this direction; it does not imply that arbitrary SPARQL can be automatically translated into faithful explanatory prose. 

### Author explanations once, alongside the policy

The contributor-facing explanations should be reviewed source material linked to stable requirement identities. They should not be an unconstrained language-model paraphrase generated afresh on every publication.

Proposed logical artefact names include:

`reader-guidance.ttl`, `reader-guidance-shapes.ttl`, `diagram-views.ttl`, `policy-documentation-model`, `technical-reference-renderer`, `contributor-guide-renderer` and `policy-documentation-coverage.json`.

These are **proposed names**, not claims about existing repository files. Their actual paths and implementation language should follow inspection of your current generator.

Keep presentation metadata from accidentally affecting validation targets or execution. Also distinguish the existing canonical policy identity from a publication identity covering guidance, renderer configuration and diagram assets.

### Make completeness a build property

Preserving clause counts is necessary but insufficient. A renderer could retain every `EP-…` identifier while dropping a condition, target exclusion or logical branch.

The production coverage check should account for full descriptions, targets, exclusions, cardinalities, datatypes, node kinds, patterns, severities, logical branches, comparison-context dependencies, human obligations and provenance.

This is especially important because the September document’s UUID clause has no “Executable constraints” block, while some other descriptions contain details not reproduced in their bullets. **The 77 bullets are not a proven inventory of the entire executable policy.** 

Examples also need real testing. A supposedly conforming example outside every ownership target could pass vacuously. Positive and negative fixtures should therefore use the real validation context and assert the expected rule and severity—not merely a successful process exit.

## 8. Implementation and acceptance

I would deliver this as a **presentation and documentation-generation change**, with changes to policy semantics handled separately.

Start by freezing the current baseline and inventorying every clause and source detail. Then implement the two reading paths and stable anchors. Add the diagrams and reviewed examples next. Finally, verify the generated output on the actual Wiki before publishing Markdown and assets together.

Usability testing should ask readers to perform concrete tasks:

> Find what is needed to add a Class. Determine whether a property needs a definition. Explain why two differently tagged labels do not match. Establish whether media type is mandatory. Find the source of a clause. Explain what “unevaluated” means when comparison context is missing.

Those tasks test whether the redesign works for both subject-matter contributors and implementers, rather than merely whether policy authors like its appearance.

### What has been verified in the supplied prototype

The included checks confirm preservation of the September source blocks, unique clause anchors and the constraint-bullet count. Local Chromium checks confirmed internal navigation, image loading, disclosure operation and a 390-pixel-wide layout without document-level horizontal overflow.

**Not yet verified:** live GitHub Wiki rendering, production asset URLs, repository validator execution, comprehensive assistive-technology behaviour or WCAG conformance. The HTML uses local preview styling, not GitHub’s actual CSS, and the supplied Turtle fragment is explicitly a partial illustration rather than a validated complete entity.

**My recommendation is to adopt this two-path structure and visual system, then implement it through the existing policy generator.** It preserves your strongest improvement—a traceable, executable policy—while making the reader’s first encounter about contributing meaningfully, rather than deciphering the machinery that checks the contribution.