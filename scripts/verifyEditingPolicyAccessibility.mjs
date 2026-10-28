/** Verify authored GFM in a local approximation of the Wiki renderer.
 * All requests are fulfilled from digest-checked local assets. This is not live
 * GitHub acceptance or participant usability evidence.
 */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { renderEditingPolicyGfm } from "./editingPolicyGfm.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const policyRoot = resolve(root, "docs/policy");
const { values } = parseArgs({ options: { "output-dir": { type: "string" } } });
const manifest = JSON.parse(
  readFileSync(resolve(policyRoot, "Editing-Policy.manifest.json"), "utf8"),
);
const assets = new Map();
for (const [name, identity] of Object.entries(manifest.outputs)) {
  if (
    name !== "Editing-Policy.generated.md" &&
    !/^assets\/editing-policy\/[a-z-]+\.(svg|png)$/.test(name)
  )
    continue;
  const path = realpathSync(resolve(policyRoot, name));
  const local = relative(policyRoot, path);
  if (local.startsWith("..") || isAbsolute(local))
    throw new Error("Asset escapes the policy bundle.");
  const raw = readFileSync(path);
  if (
    createHash("sha256").update(raw).digest("hex") !== identity.sha256 ||
    raw.length !== identity.bytes
  )
    throw new Error(`Stale publication asset: ${name}`);
  assets.set(name, raw);
}
const markdown = assets.get("Editing-Policy.generated.md")?.toString("utf8");
if (!markdown) throw new Error("The verified policy page is missing.");
const content = renderEditingPolicyGfm(markdown);
const outputDir = values["output-dir"] && resolve(values["output-dir"]);
if (outputDir) mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, timeout: 30000 });
const results = [];
try {
  const decodingPage = await browser.newPage();
  for (const [name, raw] of assets) {
    if (!name.endsWith(".png")) continue;
    const decoded = await decodingPage.evaluate(
      async (source) => {
        const image = new globalThis.Image();
        image.src = source;
        await image.decode();
        return image.naturalWidth > 0 && image.naturalHeight > 0;
      },
      `data:image/png;base64,${raw.toString("base64")}`,
    );
    if (!decoded) throw new Error(`Undecodable PNG: ${name}`);
  }
  await decodingPage.close();
  for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const name = url.pathname.slice(1);
      if (url.origin !== "https://editing-policy.invalid" || !assets.has(name))
        return route.abort();
      return route.fulfill({
        body: assets.get(name),
        contentType: name.endsWith(".svg") ? "image/svg+xml" : "image/png",
      });
    });
    const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://editing-policy.invalid data:; style-src 'unsafe-inline'; font-src data:; script-src 'none'; base-uri https://editing-policy.invalid"><base href="https://editing-policy.invalid/"><title>Universal Ontology Editing Policy</title><style>
      :root{color-scheme:light dark}body{font:16px/1.6 system-ui,sans-serif;margin:0;background:${colorScheme === "dark" ? "#171b20" : "#ffffff"};color:${colorScheme === "dark" ? "#f5f7fa" : "#17202a"}}
      main{max-width:960px;margin:auto;padding:24px;overflow-wrap:anywhere}h1,h2,h3{line-height:1.25}a{color:${colorScheme === "dark" ? "#91caff" : "#0969da"}}pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px}img{max-width:100%;height:auto}summary{cursor:pointer;padding:8px 0}details{margin:16px 0}table{display:block;max-width:100%;overflow:auto}
      </style></head><body><main>${content}</main></body></html>`;
    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [768, 1024],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await page.setContent(html, { waitUntil: "networkidle" });
      const structure = await page.evaluate(() => {
        const problems = [];
        if (
          globalThis.document.documentElement.scrollWidth >
          globalThis.window.innerWidth
        )
          problems.push("page-level horizontal overflow");
        if (
          globalThis.document.querySelector(
            "main script,main style,main iframe,main object,main embed,main form,main link",
          )
        )
          problems.push("unsupported active HTML");
        for (const element of globalThis.document.querySelectorAll("main *")) {
          if (
            [...element.attributes].some((attribute) =>
              /^on/i.test(attribute.name),
            )
          )
            problems.push("inline event handler");
        }
        for (const image of globalThis.document.images) {
          if (!image.alt.trim() || !image.complete || image.naturalWidth === 0)
            problems.push("missing informative image");
        }
        for (const anchor of globalThis.document.querySelectorAll("a")) {
          const href = anchor.getAttribute("href") || "";
          if (
            !anchor.textContent.trim() ||
            /^click here$/i.test(anchor.textContent.trim())
          )
            problems.push("uninformative link");
          if (/^(?:javascript|vbscript|data):/i.test(href))
            problems.push("active link URL");
          if (
            href.startsWith("#") &&
            !globalThis.document.getElementById(href.slice(1))
          )
            problems.push(`broken anchor ${href}`);
        }
        return {
          problems,
          diagrams: globalThis.document.querySelectorAll("picture").length,
          disclosures: globalThis.document.querySelectorAll("details").length,
        };
      });
      if (structure.problems.length || structure.diagrams !== 7)
        throw new Error(JSON.stringify(structure));
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = axe.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      );
      if (serious.length)
        throw new Error(
          JSON.stringify(
            serious.map(({ id, nodes }) => ({
              id,
              targets: nodes.map(({ target }) => target),
            })),
          ),
        );
      // Native controls must respond to real keyboard activation. Focusing each
      // summary isolates authored disclosure behaviour from host tab ordering.
      for (const summary of await page.locator("summary").all()) {
        await summary.focus();
        await page.keyboard.press("Enter");
        if (!(await summary.evaluate((element) => element.parentElement.open)))
          throw new Error("Disclosure did not open from keyboard.");
        await page.keyboard.press("Space");
        if (await summary.evaluate((element) => element.parentElement.open))
          throw new Error("Disclosure did not close from keyboard.");
      }
      await page.evaluate(() => globalThis.window.scrollTo(0, 0));
      if (outputDir && (width === 390 || width === 1440))
        await page.screenshot({
          path: resolve(
            outputDir,
            `editing-policy-${colorScheme}-${width}.png`,
          ),
        });
      results.push({
        colorScheme,
        width,
        height,
        ...structure,
        seriousAxeViolations: 0,
      });
    }
    await context.close();
  }
  const report = {
    scope:
      "local authored-content approximation; live Wiki and human usability acceptance pending",
    inputDigest: manifest.inputDigest,
    browserVersion: browser.version(),
    results,
  };
  if (outputDir)
    writeFileSync(
      resolve(outputDir, "accessibility.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  process.stdout.write(JSON.stringify(report) + "\n");
} finally {
  await browser.close();
}
