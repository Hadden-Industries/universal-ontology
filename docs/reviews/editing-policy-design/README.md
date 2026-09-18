# Editing-policy design review pack

Start with **`editing-policy-preview.html`**. It is a self-contained local HTML preview: download and open it in a browser. It does not need external image requests. Its CSS approximates a Markdown reading surface and is not proposed as CSS for GitHub Wiki.

Read **`editing-policy-experience-design.md`** for the proposed architecture, source-based rationale, implementation guardrails and research sources.

The `wiki/` directory contains the redesigned **`Editing-Policy.md`**, an optional fully expanded technical edition, a sidebar fragment, and seven pairs of light/dark diagrams in PNG and SVG. The supplied page is a design-review prototype, not a deployed or operationally regenerated policy. Remove prototype-only notices only as part of an approved production-generation change. Staging-relative image paths must be emitted as valid Wiki asset URLs by the production renderer. Merge the sidebar fragment with any existing sidebar rather than replacing the whole sidebar blindly.

The technical section preserves all 35 clauses and 77 executable-constraint bullets from the supplied 12 September 2026 snapshot. Its original source statements, exception wording, scope descriptions, historical references and policy identity remain present. The guide and diagrams are proposed explanatory material; they do not introduce a separate conformance profile.

## Verification

Run `python verification/verify-preservation.py` from any directory. It uses only Python's standard library and the included source snapshot. It checks the snapshot's non-title text blocks, all clause anchors and the executable-bullet count. See `verification/preservation-report.json` and `verification/clause-inventory.json` for the initial results.

`verification/local-preview-report.json` records local rendering checks. The preview's internal fragment links, image loading, disclosure toggle and 390-pixel document width were checked in local Chromium. Screenshots are included for desktop, dark mode and a mobile-width view.

**Not performed:** live GitHub Wiki publication or rendering, repository modifications, repository validator execution, comprehensive assistive-technology testing or a claim of WCAG conformance. The included Turtle is a partial illustration, not a complete validated entity fixture. The Markdown and image assets are review material to implement through the existing policy generator, not a reason to resume hand-maintaining the Wiki.

The raw source-file hash in the verification report is not the canonical policy graph identity. Both are kept distinct.
