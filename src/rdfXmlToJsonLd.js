import { Buffer } from "node:buffer";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";

import SerializerJsonLd from "@rdfjs/serializer-jsonld-ext";
import SerializerNTriples from "@rdfjs/serializer-ntriples";
import jsonld from "jsonld";
import rdfCanonize from "rdf-canonize";
import { SaxesParser } from "@rubensworks/saxes";
import { RdfXmlParser } from "rdfxml-streaming-parser";

const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";

function isAbsoluteIri(value) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

/**
 * Read the document-level xml:base from an RDF/XML document.
 *
 * The xml:base MUST be declared on the XML document element itself.
 * Nested xml:base declarations are deliberately not considered because
 * their scope is limited to their respective subtrees and they therefore
 * cannot establish the base IRI of the document as a whole.
 *
 * @param {string} inputPath
 * @returns {Promise<string>}
 */
async function readDocumentBaseIri(inputPath) {
  return new Promise((resolve, reject) => {
    const parser = new SaxesParser({ xmlns: true });
    const stream = createReadStream(inputPath, { encoding: "utf8" });

    let settled = false;

    function succeed(value) {
      if (settled) {
        return;
      }

      settled = true;
      stream.destroy();
      resolve(value);
    }

    function fail(error) {
      if (settled) {
        return;
      }

      settled = true;
      stream.destroy();
      reject(error);
    }

    parser.on("opentag", (element) => {
      const xmlBase = Object.values(element.attributes).find(
        (attribute) =>
          attribute.uri === XML_NAMESPACE && attribute.local === "base",
      );

      if (!xmlBase) {
        fail(
          new Error(
            `RDF/XML document "${inputPath}" does not declare ` +
              "xml:base on its document element.",
          ),
        );
        return;
      }

      if (!isAbsoluteIri(xmlBase.value)) {
        fail(
          new Error(
            `RDF/XML document "${inputPath}" declares a non-absolute ` +
              `document xml:base: "${xmlBase.value}".`,
          ),
        );
        return;
      }

      succeed(xmlBase.value);
    });

    parser.on("error", (error) => {
      fail(
        new Error(
          `Unable to inspect RDF/XML document "${inputPath}": ${error.message}`,
          { cause: error },
        ),
      );
    });

    stream.on("data", (chunk) => {
      if (!settled) {
        parser.write(chunk);
      }
    });

    stream.on("end", () => {
      if (settled) {
        return;
      }

      try {
        parser.close();
      } catch (error) {
        fail(error);
        return;
      }

      if (!settled) {
        fail(
          new Error(
            `RDF/XML document "${inputPath}" does not contain an XML ` +
              "document element.",
          ),
        );
      }
    });

    stream.on("error", fail);
  });
}

/**
 * Parse an RDF/XML document into RDF/JS quads.
 *
 * The document MUST declare an absolute xml:base on its document element.
 *
 * @param {string} inputPath
 * @returns {Promise<{
 *   baseIRI: string,
 *   quads: import('@rdfjs/types').Quad[],
 * }>}
 */
async function parseRdfXml(inputPath) {
  const baseIRI = await readDocumentBaseIri(inputPath);

  const parser = new RdfXmlParser({
    baseIRI,
    strict: true,
    trackPosition: true,
    allowDuplicateRdfIds: false,
    validateUri: true,
    parseUnsupportedVersions: false,
  });

  const quads = [];

  for await (const quad of parser.import(createReadStream(inputPath))) {
    quads.push(quad);
  }

  return {
    baseIRI,
    quads,
  };
}

/**
 * Serialize RDF/JS quads to JSON-LD.
 *
 * Expanded JSON-LD is produced by default. A caller may supply an explicit
 * JSON-LD context if compact output is required.
 *
 * @param {import('@rdfjs/types').Quad[]} quads
 * @param {object | undefined} context
 * @returns {Promise<object | object[]>}
 */
async function serializeJsonLd(quads, context) {
  const options = {
    encoding: "object",
  };

  if (context !== undefined) {
    options.context = context;
    options.compact = true;
  }

  const serializer = new SerializerJsonLd(options);
  const output = serializer.import(Readable.from(quads));

  const documents = [];

  for await (const chunk of output) {
    if (typeof chunk === "string" || Buffer.isBuffer(chunk)) {
      documents.push(JSON.parse(chunk.toString()));
    } else {
      documents.push(chunk);
    }
  }

  if (documents.length !== 1) {
    throw new Error(
      `Expected exactly one JSON-LD document, received ${documents.length}.`,
    );
  }

  return documents[0];
}

/**
 * Serialize RDF/JS quads to N-Triples.
 *
 * RDF/XML represents a single RDF graph, so N-Triples is sufficient here.
 *
 * @param {import('@rdfjs/types').Quad[]} quads
 * @returns {Promise<string>}
 */
async function serializeNTriples(quads) {
  const serializer = new SerializerNTriples();
  const output = serializer.import(Readable.from(quads));

  let result = "";

  for await (const chunk of output) {
    result += chunk.toString();
  }

  return result;
}

/**
 * Verify that the generated JSON-LD represents exactly the same RDF graph as
 * the source RDF/XML.
 *
 * Blank-node identifiers cannot be compared directly because they are local
 * identifiers. RDFC-1.0 canonicalization provides stable identifiers for
 * semantic comparison.
 *
 * @param {import('@rdfjs/types').Quad[]} sourceQuads
 * @param {object | object[]} jsonLdDocument
 * @returns {Promise<void>}
 */
async function verifySemanticEquivalence(sourceQuads, jsonLdDocument) {
  const sourceNTriples = await serializeNTriples(sourceQuads);

  const generatedNQuads = await jsonld.toRDF(jsonLdDocument, {
    format: "application/n-quads",
  });

  const canonicalizationOptions = {
    algorithm: "RDFC-1.0",
    inputFormat: "application/n-quads",
  };

  const canonicalSource = await rdfCanonize.canonize(
    sourceNTriples,
    canonicalizationOptions,
  );

  const canonicalGenerated = await rdfCanonize.canonize(
    generatedNQuads,
    canonicalizationOptions,
  );

  if (canonicalSource !== canonicalGenerated) {
    throw new Error(
      "Generated JSON-LD is not semantically equivalent to the source RDF/XML.",
    );
  }
}

/**
 * Convert an RDF/XML OWL document to semantically equivalent JSON-LD.
 *
 * The output file is written only after the generated JSON-LD has successfully
 * round-tripped back to an RDF graph identical to the source graph.
 *
 * @param {object} options
 * @param {string} options.inputPath
 * @param {string} options.outputPath
 * @param {string} options.baseIRI
 * @param {object} [options.context]
 * @param {boolean} [options.verify=true]
 * @returns {Promise<{ quadCount: number, outputPath: string }>}
 */
export async function convertRdfXmlToJsonLd({
  inputPath,
  outputPath,
  context,
  verify = true,
}) {
  if (!inputPath) {
    throw new TypeError("inputPath is required.");
  }

  if (!outputPath) {
    throw new TypeError("outputPath is required.");
  }

  const { baseIRI, quads } = await parseRdfXml(inputPath);

  const jsonLdDocument = await serializeJsonLd(quads, context);

  if (verify) {
    await verifySemanticEquivalence(quads, jsonLdDocument);
  }

  await mkdir(dirname(outputPath), { recursive: true });

  await writeFile(
    outputPath,
    `${JSON.stringify(jsonLdDocument, null, 2)}\n`,
    "utf8",
  );

  return {
    baseIRI,
    quadCount: quads.length,
    outputPath,
  };
}
