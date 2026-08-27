import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { serializeOntologyRowsAsCsv } from "../src/ontologyCsv.js";
import { createOntologyViewModel } from "../src/ontologyViewModel.js";

/**
 * Renders an ontology JSON-LD document as CSV bytes.
 *
 * @param {Object|Object[]} jsonLdDocument - The materialized ontology.
 * @param {Object} [options]
 * @param {string} [options.ontologyPath] - Published path used for historical fields.
 * @returns {{ content: Buffer, rowCount: number }}
 */
export function renderOntologyCsvFromJsonLd(
  jsonLdDocument,
  { ontologyPath } = {},
) {
  const { rows } = createOntologyViewModel(jsonLdDocument, { ontologyPath });

  return {
    content: Buffer.from(serializeOntologyRowsAsCsv(rows), "utf8"),
    rowCount: rows.length,
  };
}

/**
 * Writes a CSV projection of a local ontology JSON-LD file.
 *
 * @param {object} options
 * @param {string} options.inputPath
 * @param {string} options.outputPath
 * @returns {Promise<{ outputPath: string, rowCount: number }>}
 */
export async function convertJsonLdToCsv({ inputPath, outputPath }) {
  if (!inputPath) {
    throw new TypeError("inputPath is required.");
  }

  if (!outputPath) {
    throw new TypeError("outputPath is required.");
  }

  const jsonLdDocument = JSON.parse(await readFile(inputPath, "utf8"));
  const rendered = renderOntologyCsvFromJsonLd(jsonLdDocument, {
    ontologyPath: inputPath,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered.content);

  return {
    outputPath,
    rowCount: rendered.rowCount,
  };
}
