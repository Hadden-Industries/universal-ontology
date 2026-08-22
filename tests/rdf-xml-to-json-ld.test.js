import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  convertRdfXmlToJsonLd,
  renderRdfXmlAsJsonLd,
} from "../scripts/rdfXmlToJsonLd.js";

const RDF_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xml:base="https://example.com/ontology/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="Thing" />
</rdf:RDF>
`;

test("renders verified JSON-LD bytes without writing an output file", async () => {
  const result = await renderRdfXmlAsJsonLd({
    rdfXml: Buffer.from(RDF_XML, "utf8"),
    sourceName: "memory-fixture.rdf",
  });

  expect(result.baseIRI).toBe("https://example.com/ontology/");
  expect(result.quadCount).toBeGreaterThan(0);
  expect(Buffer.isBuffer(result.content)).toBe(true);
  expect(result.content.toString("utf8").endsWith("\n")).toBe(true);
  expect(JSON.parse(result.content.toString("utf8"))).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "@id": "https://example.com/ontology/Thing",
      }),
    ]),
  );
});

test("writes the same verified bytes through the file-oriented wrapper", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uo-jsonld-"));

  try {
    const inputPath = join(directory, "20260101");
    const outputPath = `${inputPath}.jsonld`;
    await writeFile(inputPath, RDF_XML, "utf8");

    const rendered = await renderRdfXmlAsJsonLd({
      rdfXml: Buffer.from(RDF_XML, "utf8"),
      sourceName: inputPath,
    });
    const written = await convertRdfXmlToJsonLd({ inputPath, outputPath });

    expect(written.outputPath).toBe(outputPath);
    expect(await readFile(outputPath)).toEqual(rendered.content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
