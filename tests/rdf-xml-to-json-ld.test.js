import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  convertRdfXmlToJsonLd,
  parseRdfXmlToQuads,
  renderRdfQuadsAsJsonLd,
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

const RDF_TERM_KINDS_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xml:base="https://example.com/ontology/"
  xmlns:ex="https://example.com/ontology/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:owl="http://www.w3.org/2002/07/owl#"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Class rdf:about="Person">
    <skos:prefLabel xml:lang="en-GB">Person</skos:prefLabel>
    <ex:population rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">42</ex:population>
    <rdfs:subClassOf>
      <owl:Restriction>
        <owl:onProperty rdf:resource="hasName" />
      </owl:Restriction>
    </rdfs:subClassOf>
  </owl:Class>
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

test("parses RDF/XML once into default-graph RDF/JS quads without losing term kinds", async () => {
  const quads = await parseRdfXmlToQuads({
    rdfXml: Buffer.from(RDF_TERM_KINDS_XML, "utf8"),
    sourceName: "term-kinds.rdf",
  });

  expect(quads.length).toBeGreaterThan(0);
  expect(new Set(quads.map(({ graph }) => graph.termType))).toEqual(
    new Set(["DefaultGraph"]),
  );
  expect(new Set(quads.map(({ subject }) => subject.termType))).toEqual(
    new Set(["NamedNode", "BlankNode"]),
  );
  expect(new Set(quads.map(({ object }) => object.termType))).toEqual(
    new Set(["NamedNode", "BlankNode", "Literal"]),
  );

  const languageLiteral = quads.find(
    ({ object }) => object.termType === "Literal" && object.language,
  ).object;
  expect(languageLiteral.value).toBe("Person");
  expect(languageLiteral.language).toBe("en-gb");
  expect(languageLiteral.datatype.value).toBe(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  );

  const typedLiteral = quads.find(
    ({ object }) =>
      object.termType === "Literal" &&
      object.datatype.value.endsWith("integer"),
  ).object;
  expect(typedLiteral.value).toBe("42");
});

test("renders the exact existing JSON-LD bytes from reusable quads", async () => {
  // This regression source intentionally contains no blank nodes. RDF blank
  // node labels are local serializer identifiers, so independently parsing a
  // blank-node graph twice need not assign the same incidental labels.
  const rdfXml = Buffer.from(RDF_XML, "utf8");
  const quads = await parseRdfXmlToQuads({
    rdfXml,
    sourceName: "parse-once.rdf",
  });
  const fromQuads = await renderRdfQuadsAsJsonLd({
    quads,
    sourceName: "parse-once.rdf",
  });
  const fromXml = await renderRdfXmlAsJsonLd({
    rdfXml,
    sourceName: "parse-once.rdf",
  });

  expect(fromQuads.content).toEqual(fromXml.content);
  expect(fromQuads.quadCount).toBe(fromXml.quadCount);
  expect(fromQuads.jsonLdDocument).toEqual(fromXml.jsonLdDocument);
});
