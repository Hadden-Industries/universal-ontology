/** Parse the generated policy's restricted GFM using the maintained Marked parser.
 * Policy-specific checks reject broken anchors, malformed disclosures, active
 * HTML and unclosed fences before any preview enters a browser.
 */
import { Marked } from "marked";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Return HTML for the bounded generated grammar; throw on structural drift. */
export function renderEditingPolicyGfm(markdown) {
  const headings = new Set();
  const links = [];
  let previousDepth = 0;
  let disclosures = 0;
  const parser = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type === "link" && token.href.startsWith("#"))
        links.push(token.href.slice(1));
      if (token.type === "code" && /^ {0,3}(`{3,}|~{3,})/.test(token.raw)) {
        const fence = token.raw.match(/^ {0,3}(`{3,}|~{3,})/)[1];
        const ending = token.raw.trimEnd().split("\n").at(-1);
        if (
          !new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(ending)
        )
          throw new Error("Unclosed Markdown code fence.");
      }
      if (token.type === "html") {
        for (const match of token.raw.matchAll(
          /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi,
        )) {
          const tag = match[1].toLowerCase();
          if (!["details", "summary", "picture", "source", "img"].includes(tag))
            throw new Error(`Unsupported authored HTML: ${tag}`);
          if (/\son[a-z]+\s*=/i.test(match[0]))
            throw new Error("Inline HTML event handlers are forbidden.");
          if (tag === "details") {
            disclosures += match[0].startsWith("</") ? -1 : 1;
            if (disclosures < 0 || disclosures > 1)
              throw new Error("Malformed or nested disclosures.");
          }
          if (tag === "img" && !/\balt="[^"]+"/.test(match[0]))
            throw new Error("Informative images need alt text.");
        }
      }
    },
    renderer: {
      heading({ text, tokens, depth }) {
        if (!text.trim() || depth > previousDepth + 1)
          throw new Error("Invalid heading hierarchy.");
        previousDepth = depth;
        // Generated headings deliberately use ASCII words and stable EP IDs.
        if (!/^[A-Za-z0-9 -]+$/.test(text))
          throw new Error(`Unsupported generated heading: ${text}`);
        const slug = text.toLowerCase().replaceAll(" ", "-");
        if (headings.has(slug)) throw new Error(`Duplicate heading: ${slug}`);
        headings.add(slug);
        return `<h${depth} id="${slug}">${this.parser.parseInline(tokens)}</h${depth}>`;
      },
    },
  });
  const html = parser.parse(markdown);
  if (disclosures !== 0) throw new Error("Unclosed disclosure.");
  for (const anchor of links)
    if (!headings.has(anchor))
      throw new Error(`Broken policy anchor: ${anchor}`);
  return html;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.slice(2).join(" ") !== "--check-stdin")
    throw new Error("Use --check-stdin for the bounded generated-page check.");
  const markdown = readFileSync(0, "utf8");
  if (Buffer.byteLength(markdown) > 2097152)
    throw new Error("Generated policy exceeds the bounded GFM check input.");
  renderEditingPolicyGfm(markdown);
  process.stdout.write('{"gfmValid":true}\n');
}
