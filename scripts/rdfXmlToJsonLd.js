import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function readDocumentBaseIri(sourceText, sourceName, fallbackBaseIRI) {
  const parser = new SaxesParser({ xmlns: true });
  const stopAfterDocumentElement = new Error("document element inspected");
  let baseIRI;
  let documentElementFound = false;
  let inspectionError;

  parser.on("opentag", (element) => {
    documentElementFound = true;

    const xmlBase = Object.values(element.attributes).find(
      (attribute) =>
        attribute.uri === XML_NAMESPACE && attribute.local === "base",
    );

    if (!xmlBase && fallbackBaseIRI === undefined) {
      inspectionError = new Error(
        `RDF/XML document "${sourceName}" does not declare ` +
          "xml:base on its document element.",
      );
    } else if (!xmlBase && !isAbsoluteIri(fallbackBaseIRI)) {
      inspectionError = new Error(
        `RDF/XML document "${sourceName}" received a non-absolute ` +
          `fallback base IRI: "${fallbackBaseIRI}".`,
      );
    } else if (!xmlBase) {
      baseIRI = fallbackBaseIRI;
    } else if (!isAbsoluteIri(xmlBase.value)) {
      inspectionError = new Error(
        `RDF/XML document "${sourceName}" declares a non-absolute ` +
          `document xml:base: "${xmlBase.value}".`,
      );
    } else {
      baseIRI = xmlBase.value;
    }

    throw stopAfterDocumentElement;
  });

  parser.on("error", (error) => {
    inspectionError = new Error(
      `Unable to inspect RDF/XML document "${sourceName}": ${error.message}`,
      { cause: error },
    );
  });

  try {
    parser.write(sourceText).close();
  } catch (error) {
    if (error !== stopAfterDocumentElement && !inspectionError) {
      inspectionError = new Error(
        `Unable to inspect RDF/XML document "${sourceName}": ${error.message}`,
        { cause: error },
      );
    }
  }

  if (inspectionError) {
    throw inspectionError;
  }

  if (!documentElementFound) {
    throw new Error(
      `RDF/XML document "${sourceName}" does not contain an XML ` +
        "document element.",
    );
  }

  return baseIRI;
}

async function parseRdfXmlTextToQuads(sourceText, baseIRI) {
  const parser = new RdfXmlParser({
    baseIRI,
    strict: true,
    trackPosition: true,
    allowDuplicateRdfIds: false,
    validateUri: true,
    parseUnsupportedVersions: false,
  });
  const quads = [];

  for await (const quad of parser.import(Readable.from([sourceText]))) {
    quads.push(quad);
  }

  return quads;
}

/**
 * Parse an RDF/XML source artifact into an immutable RDF/JS quad sequence.
 *
 * The parser is intentionally the single source-reading seam shared by the
 * website serializers and the ontology query-index projector. Callers may
 * derive several artifacts from these quads without parsing the source again.
 * No parser, stream, or iterator is retained after this promise settles.
 *
 * @param {object} options
 * @param {Buffer | string} options.rdfXml
 * @param {string} options.sourceName - Safe diagnostic name for parser errors.
 * @param {string} [options.fallbackBaseIri]
 * @returns {Promise<ReadonlyArray<import('@rdfjs/types').Quad>>}
 */
export async function parseRdfXmlToQuads({
  rdfXml,
  sourceName,
  fallbackBaseIri,
}) {
  if (!Buffer.isBuffer(rdfXml) && typeof rdfXml !== "string") {
    throw new TypeError("rdfXml must be a Buffer or string.");
  }

  if (!sourceName) {
    throw new TypeError("sourceName is required.");
  }

  const sourceText = Buffer.isBuffer(rdfXml) ? rdfXml.toString("utf8") : rdfXml;
  const baseIri = readDocumentBaseIri(sourceText, sourceName, fallbackBaseIri);
  const quads = await parseRdfXmlTextToQuads(sourceText, baseIri);

  return Object.freeze(quads);
}

/**
 * Render already-parsed RDF/JS quads as the same verified JSON-LD bytes used
 * by the existing RDF/XML wrapper.
 *
 * @param {object} options
 * @param {ReadonlyArray<import('@rdfjs/types').Quad>} options.quads
 * @param {string} options.sourceName
 * @param {object} [options.context]
 * @param {boolean} [options.verify=true]
 * @returns {Promise<{
 *   quadCount: number,
 *   jsonLdDocument: object | object[],
 *   content: Buffer
 * }>}
 */
export async function renderRdfQuadsAsJsonLd({
  quads,
  sourceName,
  context,
  verify = true,
}) {
  if (!Array.isArray(quads)) {
    throw new TypeError("quads must be an array of RDF/JS quads.");
  }

  if (!sourceName) {
    throw new TypeError("sourceName is required.");
  }

  try {
    const jsonLdDocument = await serializeJsonLd(quads, context);

    if (verify) {
      await verifySemanticEquivalence(quads, jsonLdDocument);
    }

    return {
      quadCount: quads.length,
      jsonLdDocument,
      content: Buffer.from(
        `${JSON.stringify(jsonLdDocument, null, 2)}\n`,
        "utf8",
      ),
    };
  } catch (error) {
    throw new Error(
      `Unable to render RDF quads from "${sourceName}" as JSON-LD: ${error.message}`,
      { cause: error },
    );
  }
}

export async function renderRdfXmlAsJsonLd({
  rdfXml,
  sourceName,
  fallbackBaseIRI,
  context,
  verify = true,
}) {
  if (!Buffer.isBuffer(rdfXml) && typeof rdfXml !== "string") {
    throw new TypeError("rdfXml must be a Buffer or string.");
  }

  if (!sourceName) {
    throw new TypeError("sourceName is required.");
  }

  const sourceText = Buffer.isBuffer(rdfXml) ? rdfXml.toString("utf8") : rdfXml;
  const baseIRI = readDocumentBaseIri(sourceText, sourceName, fallbackBaseIRI);
  const quads = await parseRdfXmlToQuads({
    rdfXml,
    sourceName,
    fallbackBaseIri: fallbackBaseIRI,
  });
  const rendered = await renderRdfQuadsAsJsonLd({
    quads,
    sourceName,
    context,
    verify,
  });

  return {
    baseIRI,
    ...rendered,
  };
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

  const rendered = await renderRdfXmlAsJsonLd({
    rdfXml: await readFile(inputPath),
    sourceName: inputPath,
    context,
    verify,
  });

  await mkdir(dirname(outputPath), { recursive: true });

  await writeFile(outputPath, rendered.content);

  return {
    baseIRI: rendered.baseIRI,
    quadCount: rendered.quadCount,
    outputPath,
  };
}
