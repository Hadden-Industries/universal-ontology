import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parentPort } from "node:worker_threads";
import rdfCanonize from "rdf-canonize";
import oxigraph from "oxigraph";

import {
  createOntologyReleaseQueryIndex,
  serializeCanonicalOntologyQueryJsonDocument,
} from "universal-ontology-query/artifacts";

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
    const rdfXml =
      input.content !== undefined
        ? Buffer.from(input.content)
        : await readFile(input.sourcePath);
    const requestedAssetKinds = new Set(input.requestedAssetKinds);
    const quads =
      input.sourceFormat === "text/turtle"
        ? [
            ...oxigraph.parse(rdfXml, {
              format: "text/turtle",
              base_iri: input.sourceArtifactUrl,
            }),
          ]
        : await parseRdfXmlToQuads({
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
      const dataset = Buffer.from(
        await rdfCanonize.canonize([...quads], {
          algorithm: "RDFC-1.0",
          maxWorkFactor: 3,
        }),
      );
      if (dataset.byteLength > 8 * 1024 * 1024 || quads.length > 200000) {
        throw new RangeError("Ontology dataset exceeds its admission limit.");
      }
      response.datasetContent = createTransferableBuffer(dataset);
      transferList.push(response.datasetContent);
      response.datasetQuadCount = quads.length;
      response.declaredImports = [
        ...new Set(
          quads
            .filter(
              ({ predicate, object }) =>
                predicate.value === "http://www.w3.org/2002/07/owl#imports" &&
                object.termType === "NamedNode",
            )
            .map(({ object }) => object.value),
        ),
      ].sort();
      const queryIndex = createOntologyReleaseQueryIndex({
        quads: [...quads],
        ontologyArtifactFamilyId: input.ontologyArtifactFamilyId,
        versionTag: input.versionTag,
        sourceArtifactRelativePath: input.outputPath,
        sourceArtifactUrl: input.sourceArtifactUrl,
        sourceArtifactSha256: createHash("sha256").update(rdfXml).digest("hex"),
      });
      const queryIndexBytes = Buffer.from(
        serializeCanonicalOntologyQueryJsonDocument(queryIndex),
      );
      response.queryIndexContent = createTransferableBuffer(queryIndexBytes);
      transferList.push(response.queryIndexContent);
    }

    parentPort.postMessage(response, transferList);
  } catch (error) {
    parentPort.postMessage({ taskId, error: serializeError(error) });
  }
});
