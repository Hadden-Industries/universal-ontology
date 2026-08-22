import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createContentAwareStaticCopyTargets,
  injectGlobalHead,
  pruneUnchangedBundle,
} from "../../scripts/build/vitePlugins.js";

const ICONS = `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />`;

test("injects the reusable icon partial exactly once before the closing head", () => {
  const html =
    "<!doctype html><html><head><title>A</title></head><body></body></html>";
  const output = injectGlobalHead({
    html,
    partial: ICONS,
    filename: "a.html",
  });

  expect(output).toBe(
    "<!doctype html><html><head><title>A</title>\n" +
      `${ICONS}\n</head><body></body></html>`,
  );
  expect(output.match(/href="\/favicon\.svg"/gu)).toHaveLength(1);
  expect(output.match(/href="\/favicon\.ico"/gu)).toHaveLength(1);
});

test("preserves head indentation without creating whitespace-only lines", () => {
  const html = `<!doctype html>
<html>
  <head>
    <title>A</title>
  </head>
  <body></body>
</html>`;

  const output = injectGlobalHead({
    html,
    partial: ICONS,
    filename: "indented.html",
  });

  expect(output).toBe(`<!doctype html>
<html>
  <head>
    <title>A</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
  </head>
  <body></body>
</html>`);
  expect(output).not.toMatch(/^[\t ]+$/gmu);
});

test("rejects documents without exactly one head region", () => {
  for (const html of [
    "<!doctype html><html><body></body></html>",
    "<html><head></head><head></head><body></body></html>",
  ]) {
    expect(() =>
      injectGlobalHead({ html, partial: ICONS, filename: "invalid.html" }),
    ).toThrow(/exactly one <head> region/u);
  }
});

test("rejects a page-local icon declaration", () => {
  const html =
    '<html><head><link href="/old.ico" rel="shortcut icon" /></head><body></body></html>';

  expect(() =>
    injectGlobalHead({ html, partial: ICONS, filename: "legacy.html" }),
  ).toThrow(/legacy\.html already declares an icon link/u);
});

test("skips only byte-identical production passthrough outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-static-copy-"));

  try {
    const sourcePath = join(root, "src", "external", "binary.rdf");
    const outputDirectory = join(root, "dist");
    const destination = join(outputDirectory, "external", "binary.rdf");
    await mkdir(join(root, "src", "external"), { recursive: true });
    await mkdir(join(outputDirectory, "external"), { recursive: true });
    await writeFile(sourcePath, Buffer.from([0, 1, 2, 255]));

    const [buildTarget] = createContentAwareStaticCopyTargets({
      staticAssets: [{ sourcePath, outputPath: "external/binary.rdf" }],
      outputDirectory,
      command: "build",
    });
    const [serveTarget] = createContentAwareStaticCopyTargets({
      staticAssets: [{ sourcePath, outputPath: "external/binary.rdf" }],
      outputDirectory,
      command: "serve",
    });
    const sourceBytes = Buffer.from([0, 1, 2, 255]);

    await writeFile(destination, sourceBytes);
    await expect(
      buildTarget.transform.handler(sourceBytes),
    ).resolves.toBeNull();

    await writeFile(destination, Buffer.from([9]));
    await expect(buildTarget.transform.handler(sourceBytes)).resolves.toEqual(
      sourceBytes,
    );
    await expect(serveTarget.transform.handler(sourceBytes)).resolves.toEqual(
      sourceBytes,
    );
    await rm(destination);
    await expect(buildTarget.transform.handler(sourceBytes)).resolves.toEqual(
      sourceBytes,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("removes only byte-identical final Vite outputs from the pending bundle", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "uo-bundle-prune-"));

  try {
    await writeFile(join(outputDirectory, "same.js"), "export const x=1;\n");
    await writeFile(join(outputDirectory, "same.bin"), Buffer.from([0, 255]));
    await writeFile(join(outputDirectory, "changed.css"), "old");

    const bundle = {
      "same.js": {
        type: "chunk",
        fileName: "same.js",
        code: "export const x=1;\n",
      },
      "same.bin": {
        type: "asset",
        fileName: "same.bin",
        source: Uint8Array.from([0, 255]),
      },
      "changed.css": {
        type: "asset",
        fileName: "changed.css",
        source: "new",
      },
      "missing.html": {
        type: "asset",
        fileName: "missing.html",
        source: "<p>new</p>",
      },
    };

    await pruneUnchangedBundle({ bundle, outputDirectory });

    expect(Object.keys(bundle)).toEqual(["changed.css", "missing.html"]);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
