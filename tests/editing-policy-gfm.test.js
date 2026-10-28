import { describe, expect, test } from "@jest/globals";
import { renderEditingPolicyGfm } from "../scripts/editingPolicyGfm.js";

describe("generated policy GFM admission", () => {
  test("stable ID anchors and native disclosures survive parsing", () => {
    const source =
      "# Policy\n\n## Technical reference\n\n### EP-ONE\n\n[EP-ONE](#ep-one)\n\n<details>\n<summary>Source and provenance</summary>\n\nA source.\n\n</details>\n";
    const html = renderEditingPolicyGfm(source);
    expect(html).toContain('<h3 id="ep-one">EP-ONE</h3>');
    expect(html).toContain("<summary>Source and provenance</summary>");
  });
  test.each([
    ["skipped heading", "# Policy\n\n### Skipped\n"],
    ["duplicate anchor", "# Policy\n\n## Same\n\n## Same\n"],
    ["broken anchor", "# Policy\n\n[EP-ONE](#ep-one)\n"],
    ["unclosed fence", "# Policy\n\n```json\n{}\n"],
    [
      "unclosed disclosure",
      "# Policy\n\n<details>\n<summary>Source</summary>\n",
    ],
    ["script", "# Policy\n\n<script>alert(1)</script>\n"],
    ["layout table", "# Policy\n\n<table><tr><td>layout</td></tr></table>\n"],
    ["missing alt", '# Policy\n\n<img src="assets/diagram.png">\n'],
  ])("rejects %s before browser execution", (_name, source) => {
    expect(() => renderEditingPolicyGfm(source)).toThrow();
  });
});
