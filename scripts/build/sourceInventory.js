import { readdir } from "node:fs/promises";
import {
  basename,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

const ONTOLOGY_ROOTS = new Set(["universal", "iso", "iso-iec"]);
const GENERATED_ALIAS_NAMES = new Set(["latest", "latest-unstable"]);

function toPosix(path) {
  return path.split(sep).join("/");
}

async function findRegularFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findRegularFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

export function resolveOutputPath(outputDirectory, outputPath) {
  if (typeof outputPath !== "string" || outputPath === "") {
    throw new TypeError("outputPath must be a non-empty relative path.");
  }

  if (isAbsolute(outputPath)) {
    throw new Error(`Output path must be a relative path: ${outputPath}`);
  }

  const segments = outputPath.split("/");

  if (
    outputPath.includes("\\") ||
    segments.some((segment) => ["", ".", ".."].includes(segment))
  ) {
    throw new Error(
      `Output path must be a normalized relative path: ${outputPath}`,
    );
  }

  const outputRoot = resolve(outputDirectory);
  const destination = resolve(outputRoot, ...segments);
  const rootPrefix = `${outputRoot}${sep}`;

  if (!destination.startsWith(rootPrefix)) {
    throw new Error(
      `Output path resolves outside the output directory: ${outputPath}`,
    );
  }

  return destination;
}

export async function inventorySourceTree({ sourceDirectory }) {
  const htmlEntries = [];
  const staticAssets = [];
  const ontologySources = [];
  const files = (await findRegularFiles(sourceDirectory)).sort();

  for (const sourcePath of files) {
    const outputPath = toPosix(relative(sourceDirectory, sourcePath));
    const parts = outputPath.split("/");
    const name = basename(outputPath);
    const extension = extname(name);
    const isExternalUrl = parts[0] === "external" && extension === ".url";
    const isOntologySource = ONTOLOGY_ROOTS.has(parts[0]) && extension === "";

    if (name === ".editorconfig" || isExternalUrl) {
      continue;
    }

    if (isOntologySource && GENERATED_ALIAS_NAMES.has(name)) {
      continue;
    }

    if (extension === ".html") {
      htmlEntries.push(sourcePath);
      continue;
    }

    if (extension === ".js" || extension === ".css") {
      continue;
    }

    const asset = { sourcePath, outputPath };
    staticAssets.push(asset);

    if (isOntologySource) {
      ontologySources.push(asset);
    }
  }

  return { htmlEntries, staticAssets, ontologySources };
}
