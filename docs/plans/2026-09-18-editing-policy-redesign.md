# Editing Policy Redesign Implementation Plan (Finalized Architecture)

## Overview & Background

The Universal Ontology editing policy is a machine-enforceable, SHACL-based specification governing owned entities, ontology headers, axioms, and DCAT dataset/distribution records. 

Following the review in [`docs/reviews/editing-policy-design/`](../reviews/editing-policy-design) and synthesis with **Apple Design Principles** (WWDC 2018–2026) and **Authoritative Standards** (W3C SHACL, W3C WCAG 2.2 AA, GFM, Diátaxis), this plan establishes the architecture and execution slices to transition the policy documentation into a fluid, two-path contributor guide and technical reference.

All architectural and frontier decisions have been settled via the design tree protocol:
- **Reader Guidance Storage**: RDF in `policy/reader-guidance.ttl` with formal SHACL validation in `policy/policy-metadata-shapes.ttl`.
- **Asset Pipeline**: Authoritative source in `universal-ontology/docs/policy/assets/` with automated synchronization to `universal-ontology.wiki/assets/`. Zero hand-maintained duplicates.
- **Visual Presentation**: Dark and Light theme adaptability using native `<picture>` tags with existing assets from the review pack.
- **Cryptographic Identity**: Canonical SHACL policy hash (`sha256:...`) decoupled from presentation/publication digest.
- **Deliverables**: Dual-edition generation (`Editing-Policy.md` and `Editing-Policy-Technical-Expanded.md`) and nested Wiki sidebar integration.

---

## Settled Architecture & First-Principles Decisions

```text
Canonical Policy Graph (policy/*.ttl)
    ├── Executable Constraints (entity-policy, ontology-policy, axiom-policy, dataset-distribution)
    └── Reader Guidance & Diagram Metadata (reader-guidance.ttl)
            │
            ├── SHACL Validation (policy-metadata-shapes.ttl)
            │
            └── Rendering Pipeline (scripts/render_editing_policy.py)
                    │
                    ├── docs/policy/Editing-Policy.generated.md (Interactive / Progressive Disclosure)
                    ├── docs/policy/Editing-Policy-Technical-Expanded.generated.md (Unbroken Search/Print)
                    ├── docs/policy/assets/ (Authoritative PNG & SVG source assets)
                    │
                    └── [Automated Wiki Sync Target]
                            ├── universal-ontology.wiki/Editing-Policy.md
                            ├── universal-ontology.wiki/Editing-Policy-Technical-Expanded.md
                            ├── universal-ontology.wiki/assets/ (Copied automatically)
                            └── universal-ontology.wiki/_Sidebar.md (Nested Contributing tree)
```

### 1. Dark Mode & Visual Polish (Zero Extra Overhead)
The design pack in `docs/reviews/editing-policy-design/` already supplied the full suite of **7 light and 7 dark diagrams in both PNG and SVG formats**. 
In the generated Markdown, theme switching is handled purely at the browser/platform level using GFM-compliant HTML:
```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/contribution-journey-dark.png">
  <img src="assets/contribution-journey-light.png" alt="..." width="980">
</picture>
```
This requires zero custom CSS, zero JavaScript, and adapts instantaneously when a user or GitHub switches between light and dark themes.

### 2. Disentangling the Four Semantic Dimensions
Every rule in the technical reference is rendered using a standardized component that cleanly separates:
1. **Normative Strength**: MUST vs. SHOULD (RFC 2119).
2. **Presence**: Mandatory, Optional, or Conditional.
3. **Assessment Method**: Executable SHACL check, Human review obligation, or Hybrid.
4. **Evaluation State**: Evaluated vs. Unevaluated (e.g. when comparison snapshot is missing).

### 3. Cryptographic Boundary & Audience-Based Hierarchy
- **Canonical Policy Hash**: Covers strictly the normative shapes (`ep:EntityPolicy`, `ep:OntologyPolicy`, `ep:AxiomPolicy`, `ep:DatasetDistributionPolicy`). Displayed as the primary identity anchor in the **Technical Reference** section for implementers and automated consumers.
- **Publication Digest**: Covers the composite documentation model (guidance prose, diagram URLs, renderer version). Displayed in a subtle, single-line footer at the bottom of the document. Editorial tweaks to guidance do not invalidate the normative policy hash.

---

## Proposed Changes

### Phase 1: Policy Graph & Validation (`policy/`)

#### [NEW] `policy/reader-guidance.ttl`
- Defines the contributor guide sections, step-by-step checklists, and diagram bindings in RDF.
- Declares the text equivalents and `alt` descriptions for all 7 diagrams for WCAG 2.2 AA accessibility.
- Cross-references each guidance section to active `ep:EP-*` rule IRIs.

#### [MODIFY] `policy/policy-metadata-shapes.ttl`
- Adds `uop:GuideSectionShape` and `uop:DiagramAssetShape`.
- Asserts that every guidance section has an English title and body text.
- Asserts that every diagram node defines both light and dark variants plus a non-empty text equivalent.
- Asserts that section cross-references resolve to active policy rules.

#### [MODIFY] `policy/editing-policy.ttl`
- Imports/links `reader-guidance.ttl` into the documentation graph model without affecting `ep:OwnedEntityTarget` validation targets.

---

### Phase 2: Authoritative Asset Pipeline (`docs/policy/assets/`)

#### [NEW] `docs/policy/assets/`
- Establish canonical asset home in the main repo:
  - Copy all 14 PNGs (7 light, 7 dark) and 14 SVGs from `docs/reviews/editing-policy-design/wiki/assets/` to `docs/policy/assets/`.
- Authoritative for all PR reviews and continuous integration checks.

---

### Phase 3: Generator Engine (`scripts/ontology_policy/`)

#### [MODIFY] `scripts/ontology_policy/rendering.py`
- Refactor rendering into distinct, modular emitters:
  1. `render_contributor_guide()`: Formats task-oriented sections, decision tables, and `<picture>` embeds.
  2. `render_technical_reference()`: Emits the standardized rule component with stable anchors (`<a id="...">`), four-dimension badges, normative text, tested examples, and native `<details>` for constraints and provenance.
  3. `render_technical_expanded()`: Emits the fully expanded reference without collapsed sections.
  4. `render_sidebar_fragment()`: Emits the nested sidebar fragment.
- Guarantee byte determinism, UTF-8 encoding, and LF line endings.

#### [MODIFY] `scripts/render_editing_policy.py`
- Support `--check` mode verifying both standard and expanded documents.
- Add `--sync-wiki <path>` flag to automatically copy the generated documents and assets into the target wiki repository directory.

---

### Phase 4: Test Suite & Verification (`tests/`)

#### [MODIFY] `tests/test_editing_policy_rendering.py`
- Assert 100% preservation of all 35 clauses, 77 executable constraint bullets, and 224 non-title source text blocks.
- Assert uniqueness and presence of `<a id="ep-...">` and `<a name="ep-...">` anchors.
- Assert presence and validity of all referenced diagram assets (light & dark).
- Assert GFM formatting rules (blank lines around `<details>` and `<summary>`).
- Assert `--check` pass on clean build and fail on manual tampering.

#### [MODIFY] `tests/test_ontology_policy.py`
- Verify `reader-guidance.ttl` passes SHACL metadata shapes validation.

---

### Phase 5: Wiki Integration (`universal-ontology.wiki/`)

#### [MODIFY] `universal-ontology.wiki/Editing-Policy.md`
- Updated with the generated two-path policy.

#### [NEW] `universal-ontology.wiki/Editing-Policy-Technical-Expanded.md`
- Deployed expanded technical reference.

#### [NEW] `universal-ontology.wiki/assets/`
- Diagram assets automatically synced from `docs/policy/assets/`.

#### [MODIFY] `universal-ontology.wiki/_Sidebar.md`
- Integrate nested navigation under Contributing:
  ```markdown
  ### Contributing
  * [Editing Policy](Editing-Policy)
    * [Contributor guide](Editing-Policy#contributor-guide)
    * [Technical reference](Editing-Policy#technical-reference)
    * [Human review](Editing-Policy#human-review)
    * [Dataset profile](Editing-Policy#datasets)
    * [Distribution profile](Editing-Policy#distributions)
  ```

---

## Verification Plan

### Automated Verification
```powershell
# 1. Validate SHACL policy & metadata shapes
.venv\Scripts\python -m unittest tests/test_ontology_policy.py

# 2. Validate rendered output & preservation constraints
.venv\Scripts\python -m unittest tests/test_editing_policy_rendering.py

# 3. Check generator determinism
.venv\Scripts\python scripts/render_editing_policy.py --check
```

### Manual & Visual Verification
1. **Theme Switching**: Open preview in browser, toggle OS/browser dark mode, and verify all 7 diagrams switch instantly without layout shift.
2. **Reflow & Mobile**: Inspect in DevTools at 320px and 390px widths; verify no horizontal document-level scrolling.
3. **Usability Walkthrough**: Verify that a contributor can complete the 5 core tasks (Add Class, Add Property, Match Labels, Modify Entity, Declare Dataset/Distribution) using solely the Contributor Guide.
