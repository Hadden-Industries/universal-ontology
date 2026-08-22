import { execFile } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { FileSystemConfigLoader, HtmlValidate } from "html-validate";

const execFileAsync = promisify(execFile);

const RDF_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xml:base="https://haddenindustries.com/ontology/universal/core/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Ontology rdf:about="">
    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/20260101" />
  </owl:Ontology>
</rdf:RDF>
`;

async function put(root, relativePath, content = relativePath) {
  const path = join(root, ...relativePath.split("/"));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function expectExisting(root, relativePaths) {
  for (const relativePath of relativePaths) {
    await expect(
      access(join(root, ...relativePath.split("/"))),
    ).resolves.toBeUndefined();
  }
}

async function expectMissing(root, relativePaths) {
  for (const relativePath of relativePaths) {
    await expect(
      access(join(root, ...relativePath.split("/"))),
    ).rejects.toMatchObject({ code: "ENOENT" });
  }
}

async function createWebsiteFixture() {
  const root = await mkdtemp(join(tmpdir(), "uo-vite-build-"));
  const sourceDirectory = join(root, "src");
  const outputDirectory = join(root, "dist");
  const headPartialPath = join(root, "templates", "head-icons.html");

  await put(
    sourceDirectory,
    "ontology.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Ontology</title>
    <link rel="stylesheet" href="./ontology.css" />
  </head>
  <body>
    <main id="app">Ontology fixture</main>
    <script type="module" src="./ontology.js"></script>
  </body>
</html>
`,
  );
  await put(
    sourceDirectory,
    "ontology.js",
    `// REMOVE_FROM_PRODUCTION_JS
const descriptiveFixtureVariableName = "loaded";
document.querySelector("#app").dataset.state = descriptiveFixtureVariableName;
window.loadConverter = () => import("./OwlToUmlXmiConverter.js");
`,
  );
  await put(
    sourceDirectory,
    "ontology.css",
    `/* REMOVE_FROM_PRODUCTION_CSS */
#app {
  color: red;
}
`,
  );
  await put(
    sourceDirectory,
    "OwlToUmlXmiConverter.js",
    "export class OwlToUmlXmiConverter {}\n",
  );
  await put(
    sourceDirectory,
    "nested/about.html",
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>About</title></head><body><script type="module" src="./about.js"></script></body></html>`,
  );
  await put(
    sourceDirectory,
    "nested/about.js",
    "document.body.dataset.about='yes';\n",
  );
  await put(
    sourceDirectory,
    "owl-to-uml-xmi.xsl",
    '<xsl:stylesheet version="1.0" />',
  );
  await put(sourceDirectory, "external/kept.rdf", Buffer.from([0, 255, 1]));
  await put(sourceDirectory, "external/.editorconfig", "excluded");
  await put(sourceDirectory, "external/source.url", "excluded");
  await put(sourceDirectory, "external/nested/source.url", "excluded");
  await put(sourceDirectory, "universal/core/20260101", RDF_XML);
  await put(
    root,
    "templates/head-icons.html",
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
`,
  );
  await put(outputDirectory, "sentinel.txt", "preserve me");

  return { root, sourceDirectory, outputDirectory, headPartialPath };
}

async function runViteBuild(fixture) {
  await execFileAsync(
    process.execPath,
    [
      join(process.cwd(), "tests", "build", "run-vite-build.js"),
      fixture.root,
      fixture.sourceDirectory,
      fixture.outputDirectory,
      fixture.headPartialPath,
    ],
    { cwd: process.cwd() },
  );
}

test("builds multi-page website and ontology assets with stable public paths", async () => {
  const fixture = await createWebsiteFixture();

  try {
    await runViteBuild(fixture);

    await expectExisting(fixture.outputDirectory, [
      "ontology.html",
      "ontology.js",
      "ontology.css",
      "OwlToUmlXmiConverter.js",
      "nested/about.html",
      "nested/about.js",
      "owl-to-uml-xmi.xsl",
      "external/kept.rdf",
      "universal/core/20260101",
      "universal/core/20260101.jsonld",
      "universal/core/latest",
      "universal/core/latest.jsonld",
      "universal/core/latest-unstable",
      "universal/core/latest-unstable.jsonld",
      "sentinel.txt",
    ]);
    await expectMissing(fixture.outputDirectory, [
      "external/.editorconfig",
      "external/source.url",
      "external/nested/source.url",
      "favicon.svg",
      "favicon.ico",
    ]);

    const html = await readFile(
      join(fixture.outputDirectory, "ontology.html"),
      "utf8",
    );
    const htmlValidator = new HtmlValidate(new FileSystemConfigLoader());
    const htmlReport = await htmlValidator.validateString(
      html,
      join(process.cwd(), "dist", "ontology.html"),
    );
    expect(htmlReport.results.flatMap(({ messages }) => messages)).toEqual([]);
    expect(html).toContain('src="/ontology/ontology.js"');
    expect(html).toContain('href="/ontology/ontology.css"');
    expect(html.match(/href="\/favicon\.svg"/gu)).toHaveLength(1);
    expect(html.match(/href="\/favicon\.ico"/gu)).toHaveLength(1);
    expect(
      await readFile(join(fixture.outputDirectory, "sentinel.txt"), "utf8"),
    ).toBe("preserve me");

    const builtJavaScript = await readFile(
      join(fixture.outputDirectory, "ontology.js"),
      "utf8",
    );
    const builtCss = await readFile(
      join(fixture.outputDirectory, "ontology.css"),
      "utf8",
    );
    expect(builtJavaScript).not.toContain("REMOVE_FROM_PRODUCTION_JS");
    expect(builtJavaScript).not.toContain("descriptiveFixtureVariableName");
    expect(builtCss).not.toContain("REMOVE_FROM_PRODUCTION_CSS");
    expect(builtCss).toContain("color:red");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("preserves mtimes for byte-identical outputs on a second build", async () => {
  const fixture = await createWebsiteFixture();

  try {
    await runViteBuild(fixture);
    const oldTime = new Date("2001-02-03T04:05:06.000Z");
    const unchangedPaths = [
      "ontology.html",
      "ontology.js",
      "ontology.css",
      "external/kept.rdf",
      "universal/core/latest",
      "universal/core/latest.jsonld",
      "sentinel.txt",
    ].map((relativePath) =>
      join(fixture.outputDirectory, ...relativePath.split("/")),
    );

    for (const path of unchangedPaths) {
      await utimes(path, oldTime, oldTime);
    }

    await runViteBuild(fixture);

    for (const path of unchangedPaths) {
      expect((await stat(path)).mtimeMs).toBe(oldTime.getTime());
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("writes changed output while preserving unrelated and stale files", async () => {
  const fixture = await createWebsiteFixture();

  try {
    await runViteBuild(fixture);
    const oldTime = new Date("2001-02-03T04:05:06.000Z");
    const cssPath = join(fixture.outputDirectory, "ontology.css");
    const javaScriptPath = join(fixture.outputDirectory, "ontology.js");
    const orphanPath = join(fixture.outputDirectory, "orphan.jsonld");
    const originalCss = await readFile(cssPath);
    await writeFile(orphanPath, "preserve stale output");

    for (const path of [cssPath, javaScriptPath, orphanPath]) {
      await utimes(path, oldTime, oldTime);
    }

    await writeFile(
      join(fixture.sourceDirectory, "ontology.css"),
      "#app { color: blue; }\n",
    );
    await runViteBuild(fixture);

    expect(await readFile(cssPath)).not.toEqual(originalCss);
    expect((await stat(cssPath)).mtimeMs).not.toBe(oldTime.getTime());
    expect((await stat(javaScriptPath)).mtimeMs).toBe(oldTime.getTime());
    expect((await stat(orphanPath)).mtimeMs).toBe(oldTime.getTime());
    expect(await readFile(orphanPath, "utf8")).toBe("preserve stale output");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
