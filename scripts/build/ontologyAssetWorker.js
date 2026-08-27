import { readFile } from "node:fs/promises";
import { parentPort } from "node:worker_threads";

import { renderOntologyCsvFromJsonLd } from "../jsonLdToCsv.js";
import { renderRdfXmlAsJsonLd } from "../rdfXmlToJsonLd.js";

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function createTransferableBuffer(content) {
  if (
    content.byteOffset === 0 &&
    content.byteLength === content.buffer.byteLength
  ) {
    return content.buffer;
  }

  return Uint8Array.from(content).buffer;
}

parentPort.on("message", async ({ taskId, input }) => {
  try {
    const rdfXml = input.sourcePath
      ? await readFile(input.sourcePath)
      : Buffer.from(input.content);
    const renderedJsonLd = await renderRdfXmlAsJsonLd({
      rdfXml,
      sourceName: input.outputPath,
      fallbackBaseIRI: input.fallbackBaseIRI,
    });
    const renderedCsv = renderOntologyCsvFromJsonLd(
      renderedJsonLd.jsonLdDocument,
      { ontologyPath: input.outputPath },
    );
    const jsonLdContent = createTransferableBuffer(renderedJsonLd.content);
    const csvContent = createTransferableBuffer(renderedCsv.content);

    parentPort.postMessage({ taskId, jsonLdContent, csvContent }, [
      jsonLdContent,
      csvContent,
    ]);
  } catch (error) {
    parentPort.postMessage({ taskId, error: serializeError(error) });
  }
});
