import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parentPort } from "node:worker_threads";

import { createOntologyReleaseQueryIndex } from "../../src/ontologyQuery/createOntologyReleaseQueryIndex.js";
import { renderOntologyCsvFromJsonLd } from "../jsonLdToCsv.js";
import {
  parseRdfXmlToQuads,
  renderRdfQuadsAsJsonLd,
} from "../rdfXmlToJsonLd.js";

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
    const requestedAssetKinds = new Set(input.requestedAssetKinds);
    const quads = await parseRdfXmlToQuads({
      rdfXml,
      sourceName: input.outputPath,
      fallbackBaseIri: input.fallbackBaseIRI,
    });
    const response = { taskId };
    const transferList = [];

    if (requestedAssetKinds.has("json_ld") || requestedAssetKinds.has("csv")) {
      const renderedJsonLd = await renderRdfQuadsAsJsonLd({
        quads,
        sourceName: input.outputPath,
      });

      if (requestedAssetKinds.has("json_ld")) {
        response.jsonLdContent = createTransferableBuffer(
          renderedJsonLd.content,
        );
        transferList.push(response.jsonLdContent);
      }

      if (requestedAssetKinds.has("csv")) {
        const renderedCsv = renderOntologyCsvFromJsonLd(
          renderedJsonLd.jsonLdDocument,
          { ontologyPath: input.outputPath },
        );
        response.csvContent = createTransferableBuffer(renderedCsv.content);
        transferList.push(response.csvContent);
      }
    }

    if (requestedAssetKinds.has("query_index")) {
      const queryIndex = createOntologyReleaseQueryIndex({
        quads: [...quads],
        ontologyArtifactFamilyId: input.ontologyArtifactFamilyId,
        versionTag: input.versionTag,
        sourceArtifactRelativePath: input.outputPath,
        sourceArtifactUrl: input.sourceArtifactUrl,
        sourceArtifactSha256: createHash("sha256").update(rdfXml).digest("hex"),
      });
      const queryIndexBytes = Buffer.from(
        `${JSON.stringify(queryIndex, null, 2)}\n`,
        "utf8",
      );
      response.queryIndexContent = createTransferableBuffer(queryIndexBytes);
      transferList.push(response.queryIndexContent);
    }

    parentPort.postMessage(response, transferList);
  } catch (error) {
    parentPort.postMessage({ taskId, error: serializeError(error) });
  }
});
