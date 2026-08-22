import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { promisify } from "node:util";

import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

const RDF_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xml:base="https://haddenindustries.com/ontology/universal/core/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Ontology rdf:about="">
    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/20260101" />
  </owl:Ontology>
  <owl:Class rdf:about="Thing">
    <rdfs:label xml:lang="en">Thing</rdfs:label>
  </owl:Class>
</rdf:RDF>
`;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jsonld", "application/ld+json; charset=utf-8"],
  [".xsl", "application/xml; charset=utf-8"],
]);

async function put(root, relativePath, content) {
  const path = join(root, ...relativePath.split("/"));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function copySourceFile(sourceDirectory, fixtureSource, relativePath) {
  const destination = join(fixtureSource, ...relativePath.split("/"));
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(
    join(sourceDirectory, ...relativePath.split("/")),
    destination,
  );
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "uo-built-page-"));
  const sourceDirectory = join(root, "src");
  const outputDirectory = join(root, "dist");
  const headPartialPath = join(root, "templates", "head-icons.html");
  const repositorySource = join(process.cwd(), "src");

  for (const relativePath of [
    "ontology.html",
    "ontology.js",
    "ontology.css",
    "OwlToUmlXmiConverter.js",
    "owl-to-uml-xmi.xsl",
  ]) {
    await copySourceFile(repositorySource, sourceDirectory, relativePath);
  }

  await put(sourceDirectory, "universal/core/20260101", RDF_XML);
  await put(
    root,
    "templates/head-icons.html",
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
`,
  );

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

async function startServer(outputDirectory) {
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (
      requestUrl.pathname === "/favicon.svg" ||
      requestUrl.pathname === "/favicon.ico"
    ) {
      response.writeHead(204, { "cache-control": "public, max-age=3600" });
      response.end();
      return;
    }

    let outputPath;

    if (
      /^\/ontology\/(?:universal|iso|iso-iec)\/.*\.html$/u.test(
        requestUrl.pathname,
      )
    ) {
      outputPath = join(outputDirectory, "ontology.html");
    } else if (requestUrl.pathname.startsWith("/ontology/")) {
      outputPath = join(
        outputDirectory,
        ...requestUrl.pathname.slice("/ontology/".length).split("/"),
      );
    }

    if (!outputPath) {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const content = await readFile(outputPath);
      response.writeHead(200, {
        "content-type":
          CONTENT_TYPES.get(extname(outputPath)) ?? "application/octet-stream",
      });
      response.end(content);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test("loads the built master page at a deeply nested ontology URL", async () => {
  const fixture = await createFixture();
  let browser;
  let server;

  try {
    await runViteBuild(fixture);
    await expect(
      access(join(fixture.outputDirectory, "OwlToUmlXmiConverter.js")),
    ).resolves.toBeUndefined();
    server = await startServer(fixture.outputDirectory);
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage();
    const failures = [];
    const responses = [];

    await page.route("https://fonts.googleapis.com/**", async (route) => {
      await route.fulfill({ contentType: "text/css", body: "" });
    });

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        failures.push(`console ${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) =>
      failures.push(`pageerror: ${error.message}`),
    );
    page.on("requestfailed", (request) =>
      failures.push(`request failed: ${request.url()}`),
    );
    page.on("response", (response) => {
      responses.push(response.url());
      if (response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${server.origin}/ontology/universal/core/20260101.html`, {
      waitUntil: "networkidle",
    });

    expect(await page.locator("#table-body tr").count()).toBeGreaterThan(0);
    expect(failures).toEqual([]);
    expect(responses).toContain(
      `${server.origin}/ontology/universal/core/20260101.jsonld`,
    );
    expect(responses).not.toContain(
      `${server.origin}/ontology/ontology.jsonld`,
    );
    expect(await page.locator('link[href="/favicon.svg"]').count()).toBe(1);
    expect(await page.locator('link[href="/favicon.ico"]').count()).toBe(1);
    expect(
      await page.evaluate(() => document.styleSheets.length),
    ).toBeGreaterThan(0);
  } finally {
    await browser?.close();
    await server?.close();
    await rm(fixture.root, { recursive: true, force: true });
  }
}, 30_000);
