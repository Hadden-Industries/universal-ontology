import { access, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { parseArgs } from "node:util";
import { extname, join } from "node:path";

import { convertRdfXmlToJsonLd } from "./rdfXmlToJsonLd.js";

const DEFAULT_INPUT_ROOTS = ["dist/universal", "dist/iso", "dist/iso-iec"];

const JSON_LD_EXTENSION = ".jsonld";

const {
  values: {
    input,
    output,
    "missing-only": missingOnly,
    "ignore-errors": ignoreErrors,
    help,
  },
} = parseArgs({
  options: {
    input: {
      type: "string",
      short: "i",
    },
    output: {
      type: "string",
      short: "o",
    },
    "missing-only": {
      type: "boolean",
      default: false,
    },
    "ignore-errors": {
      type: "boolean",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
  },
  strict: true,
});

if (help) {
  console.log(
    `
Generate JSON-LD from RDF/XML ontology files.

Usage:
  node scripts/generateJsonLd.js [options]

Options:
  -i, --input <path>   Generate JSON-LD for a specific source file.
  -o, --output <path>  Output path for --input.
                       Defaults to <input>.jsonld.
      --missing-only   Generate only when the matching .jsonld file
                       does not already exist.
      --ignore-errors  Report conversion errors and continue processing
                       remaining source files.
  -h, --help           Show this help.

Default behavior:
  Recursively regenerate JSON-LD for every source file under:

    dist/universal/**
    dist/iso/**
    dist/iso-iec/**

  Each generated file is written beside its source with ".jsonld"
  appended to the source path.

Examples:
  node scripts/generateJsonLd.js

  node scripts/generateJsonLd.js --missing-only

  node scripts/generateJsonLd.js --ignore-errors

  node scripts/generateJsonLd.js \\
    --missing-only \\
    --ignore-errors

  node scripts/generateJsonLd.js \\
    --input dist/universal/core/20260714

  node scripts/generateJsonLd.js \\
    --input dist/universal/core/20260714 \\
    --output dist/universal/core/20260714.jsonld
`.trim(),
  );

  process.exit(0);
}

if (output && !input) {
  throw new Error("--output can only be used together with --input.");
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findSourceFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findSourceFiles(path)));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === "") {
      files.push(path);
    }
  }

  return files;
}

async function generate(inputPath, outputPath) {
  if (missingOnly && (await fileExists(outputPath))) {
    console.log(`Skipped ${inputPath}: ${outputPath} already exists.`);

    return "skipped";
  }

  try {
    const result = await convertRdfXmlToJsonLd({
      inputPath,
      outputPath,
    });

    console.log(
      `Generated ${result.outputPath} from ${result.quadCount} quads ` +
        `using base IRI ${result.baseIRI}.`,
    );

    return "generated";
  } catch (error) {
    if (!ignoreErrors) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    console.warn(`Ignored error for ${inputPath}: ${message}`);

    return "error";
  }
}

async function generateSingleFile() {
  const inputStats = await stat(input);

  if (!inputStats.isFile()) {
    throw new Error(`Input path is not a file: ${input}`);
  }

  if (extname(input) !== "") {
    throw new Error(`Input source file must not have an extension: ${input}`);
  }

  await generate(input, output ?? `${input}${JSON_LD_EXTENSION}`);
}

async function generateDefaultFiles() {
  const sourceFiles = (
    await Promise.all(DEFAULT_INPUT_ROOTS.map(findSourceFiles))
  )
    .flat()
    .sort();

  if (sourceFiles.length === 0) {
    throw new Error(
      "No RDF/XML source files were found under the default roots.",
    );
  }

  let generatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const inputPath of sourceFiles) {
    const status = await generate(
      inputPath,
      `${inputPath}${JSON_LD_EXTENSION}`,
    );

    switch (status) {
      case "generated":
        generatedCount += 1;
        break;
      case "skipped":
        skippedCount += 1;
        break;
      case "error":
        errorCount += 1;
        break;
    }
  }

  console.log("");

  console.log(
    `Generated ${generatedCount} JSON-LD ` +
      `${generatedCount === 1 ? "file" : "files"}; ` +
      `skipped ${skippedCount}; ` +
      `ignored ${errorCount} ` +
      `${errorCount === 1 ? "error" : "errors"}.`,
  );

  if (errorCount > 0) {
    console.warn(
      `${errorCount} source ` +
        `${errorCount === 1 ? "file was" : "files were"} not generated ` +
        "because --ignore-errors was enabled.",
    );
  }
}

if (input) {
  await generateSingleFile();
} else {
  await generateDefaultFiles();
}
