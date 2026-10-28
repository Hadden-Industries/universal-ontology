/** Render validated Mermaid definitions with the locked engine and existing browser.
 * stdin/stdout carry only a bounded request and exact image bytes; no downloads,
 * dependency installation or output-file writes occur in this operation.
 */
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const request = JSON.parse(readFileSync(0, "utf8"));
if (
  !readFileSync(
    new URL("../docs/editing-policy/source/fonts/LICENSE.txt", import.meta.url),
  ).equals(
    readFileSync(
      new URL("../node_modules/@fontsource/open-sans/LICENSE", import.meta.url),
    ),
  )
)
  throw new Error(
    "The reviewed font licence differs from the installed font payload.",
  );
if (
  !readFileSync(
    new URL(
      "../docs/editing-policy/source/fonts/open-sans-latin-400-normal.woff2",
      import.meta.url,
    ),
  ).equals(
    readFileSync(
      new URL(
        "../node_modules/@fontsource/open-sans/files/open-sans-latin-400-normal.woff2",
        import.meta.url,
      ),
    ),
  )
)
  throw new Error(
    "The reviewed font bytes differ from the installed locked font payload.",
  );
const fontFamily = "UO Editing Policy Open Sans";
if (!Array.isArray(request.diagrams) || request.diagrams.length !== 7)
  throw new Error("Exactly seven validated diagram definitions are required.");
// Playwright selects its headless-shell executable for headless launches.
// executablePath() names the separate full browser, which need not be usable.
// Resolve the actual installed selection through the public launch-server API.
const selection = await chromium.launchServer({
  headless: true,
  timeout: 30000,
});
const executablePath = selection.process().spawnfile;
// On Linux, retain the sandbox policy of the successful Playwright launch.
// Ubuntu's AppArmor can reject Puppeteer's different default namespace setup.
const sandboxArgs =
  process.platform === "linux"
    ? selection.process().spawnargs.filter((arg) => arg === "--no-sandbox")
    : [];
await selection.close();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: sandboxArgs,
});
const outputs = {};
try {
  for (const diagram of request.diagrams) {
    if (
      !/^[a-z-]+$/.test(diagram.id) ||
      typeof diagram.definition !== "string" ||
      diagram.definition.length > 20000
    )
      throw new Error("Invalid diagram definition.");
    for (const theme of ["light", "dark"]) {
      const dark = theme === "dark";
      for (const format of ["svg", "png"]) {
        const { data } = await renderMermaid(
          browser,
          diagram.definition,
          format,
          {
            svgId: `editing-policy-${diagram.id}-${theme}`,
            backgroundColor: dark ? "#171b20" : "#ffffff",
            viewport: { width: 1200, height: 1200, deviceScaleFactor: 1 },
            fontEmbed: true,
            // Upstream adds its normal/italic stylesheets concurrently. A unique
            // single-face family avoids their non-deterministic embedding order.
            customFontCSS: [
              {
                cssUrl: new URL(
                  "../docs/editing-policy/source/fonts/open-sans.css",
                  import.meta.url,
                ),
                allowParentDirectoryLevel: 0,
              },
            ],
            mermaidConfig: {
              securityLevel: "strict",
              htmlLabels: false,
              deterministicIds: true,
              deterministicIDSeed: diagram.id,
              theme: "base",
              fontFamily,
              themeVariables: {
                fontFamily,
                fontSize: "18px",
                primaryColor: dark ? "#252d36" : "#f1f3f5",
                primaryTextColor: dark ? "#f5f7fa" : "#17202a",
                primaryBorderColor: dark ? "#b8c3d0" : "#485563",
                lineColor: dark ? "#b8c3d0" : "#485563",
                secondaryColor: dark ? "#252d36" : "#f1f3f5",
                tertiaryColor: dark ? "#252d36" : "#f1f3f5",
                edgeLabelBackground: dark ? "#171b20" : "#ffffff",
              },
              flowchart: {
                useMaxWidth: true,
                curve: "linear",
              },
            },
          },
        );
        outputs[`${diagram.id}-${theme}.${format}`] =
          Buffer.from(data).toString("base64");
      }
    }
  }
  const toolchain = {
    nodeVersion: process.version,
    browserVersion: await browser.version(),
    mermaidCliVersion: JSON.parse(
      readFileSync(
        new URL(
          "../node_modules/@mermaid-js/mermaid-cli/package.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ).version,
    fontVersion: JSON.parse(
      readFileSync(
        new URL(
          "../node_modules/@fontsource/open-sans/package.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ).version,
  };
  process.stdout.write(JSON.stringify({ outputs, toolchain }));
} finally {
  await browser.close();
}
