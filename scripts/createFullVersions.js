import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeImportClosure } from "./materializeImportClosure.js";

/** The accepted four distributions, with catalogs explicitly owned by each family. */
export const targets = Object.freeze([
  Object.freeze({
    input: "../dist/iso-iec/11179/-3/ed-4/20260714",
    output: "../dist/iso-iec/11179/-3/ed-4/20260714-full",
    catalog: "../iso-iec11179-3/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/reference-data/20260714",
    output: "../dist/universal/reference-data/20260714-full",
    catalog: "../reference-data/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/core/20260714",
    output: "../dist/universal/core/20260714-full",
    catalog: "../core/catalog-v001.xml",
    format: "rdfxml",
  }),
  Object.freeze({
    input: "../dist/universal/extended/20260714",
    output: "../dist/universal/extended/20260714-full",
    catalog: "../extended/catalog-v001.xml",
    format: "rdfxml",
  }),
]);

/** Generate accepted production distributions sequentially, stopping on any failure. */
export async function createFullVersions() {
  for (const target of targets) {
    const inputPath = fileURLToPath(new URL(target.input, import.meta.url));
    const outputPath = fileURLToPath(new URL(target.output, import.meta.url));
    const catalogPath = fileURLToPath(new URL(target.catalog, import.meta.url));
    console.log(`${inputPath} -> ${outputPath}; catalog=${catalogPath}`);
    await materializeImportClosure({
      inputPath,
      outputPath,
      catalogPath,
      format: target.format,
    });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await createFullVersions();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
