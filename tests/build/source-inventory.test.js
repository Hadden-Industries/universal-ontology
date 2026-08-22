import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  inventorySourceTree,
  resolveOutputPath,
} from "../../scripts/build/sourceInventory.js";

async function put(root, relativePath, content = relativePath) {
  const path = join(root, ...relativePath.split("/"));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

test("classifies pages, passthrough files, exclusions, and ontology sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-inventory-"));

  try {
    await put(root, "ontology.html");
    await put(root, "nested/about.html");
    await put(root, "ontology.js");
    await put(root, "ontology.css");
    await put(root, "assets/blob.bin", Buffer.from([0, 255, 1]));
    await put(root, "external/.editorconfig");
    await put(root, "nested/.editorconfig");
    await put(root, "external/vendor.url");
    await put(root, "external/nested/vendor.url");
    await put(root, "downloads/kept.url");
    await put(root, "universal/core/20260714");
    await put(root, "universal/core/20260714-full");
    await put(root, "universal/core/latest", "stale stable alias");
    await put(root, "universal/core/latest-unstable", "stale unstable alias");
    await put(root, "iso-iec/11179/-3/ed-3/v1");

    const inventory = await inventorySourceTree({ sourceDirectory: root });

    expect(
      inventory.htmlEntries.map((path) => path.replaceAll("\\", "/")),
    ).toEqual([
      expect.stringMatching(/\/nested\/about\.html$/u),
      expect.stringMatching(/\/ontology\.html$/u),
    ]);
    expect(inventory.staticAssets.map(({ outputPath }) => outputPath)).toEqual([
      "assets/blob.bin",
      "downloads/kept.url",
      "iso-iec/11179/-3/ed-3/v1",
      "universal/core/20260714",
      "universal/core/20260714-full",
    ]);
    expect(
      inventory.ontologySources.map(({ outputPath }) => outputPath),
    ).toEqual([
      "iso-iec/11179/-3/ed-3/v1",
      "universal/core/20260714",
      "universal/core/20260714-full",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolves only normalized relative output paths beneath the output root", () => {
  const outputDirectory = join("C:\\", "build-fixture", "dist");

  expect(resolveOutputPath(outputDirectory, "nested/asset.bin")).toBe(
    join(outputDirectory, "nested", "asset.bin"),
  );
  expect(() => resolveOutputPath(outputDirectory, "../escape.bin")).toThrow(
    /normalized relative path/u,
  );
  expect(() => resolveOutputPath(outputDirectory, "/absolute.bin")).toThrow(
    /relative path/u,
  );
  expect(() =>
    resolveOutputPath(outputDirectory, "nested/../../escape.bin"),
  ).toThrow(/normalized relative path/u);
  expect(() =>
    resolveOutputPath(outputDirectory, "nested/../asset.bin"),
  ).toThrow(/normalized relative path/u);
  expect(() => resolveOutputPath(outputDirectory, "nested\\asset.bin")).toThrow(
    /normalized relative path/u,
  );
});
