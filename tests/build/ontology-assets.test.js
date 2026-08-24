import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createOntologyBuildAssets } from "../../scripts/build/ontologyAssets.js";

const RDF_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xml:base="https://haddenindustries.com/ontology/universal/core/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Ontology rdf:about="">
    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/20260101" />
  </owl:Ontology>
  <owl:Class rdf:about="Thing">
    <dcterms:identifier>urn:uuid:6cc43e8b-3eb3-43f1-80bd-b643a27f1c32</dcterms:identifier>
    <skos:prefLabel xml:lang="en">Thing</skos:prefLabel>
  </owl:Class>
</rdf:RDF>
`;

const EXPECTED_CSV = [
  "Entity Type,UUID,URI,Preferred Label,Definition,Sources,Creator,Created At,Modified At,Superclasses,Class of Named Individual",
  "Class,6cc43e8b-3eb3-43f1-80bd-b643a27f1c32,https://haddenindustries.com/ontology/universal/core/Thing,Thing,,,,,,,",
].join("\n");

async function ontologySource(root, outputPath, content = RDF_XML) {
  const sourcePath = join(root, ...outputPath.split("/"));
  await mkdir(dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, content);
  return { sourcePath, outputPath };
}

test("renders JSON-LD and CSV for every current source and generated alias", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-jsonld-assets-"));

  try {
    const source = await ontologySource(root, "universal/core/20260101");
    const assets = await createOntologyBuildAssets({
      ontologySources: [source],
      workerCount: 2,
    });

    expect([...assets.keys()].sort()).toEqual([
      "universal/core/20260101.csv",
      "universal/core/20260101.jsonld",
      "universal/core/latest",
      "universal/core/latest-unstable",
      "universal/core/latest-unstable.csv",
      "universal/core/latest-unstable.jsonld",
      "universal/core/latest.csv",
      "universal/core/latest.jsonld",
    ]);
    expect(assets.get("universal/core/latest")).toEqual(
      Buffer.from(RDF_XML, "utf8"),
    );

    for (const outputPath of [
      "universal/core/20260101.jsonld",
      "universal/core/latest.jsonld",
      "universal/core/latest-unstable.jsonld",
    ]) {
      const content = assets.get(outputPath);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(() => JSON.parse(content.toString("utf8"))).not.toThrow();
    }

    for (const outputPath of [
      "universal/core/20260101.csv",
      "universal/core/latest.csv",
      "universal/core/latest-unstable.csv",
    ]) {
      expect(assets.get(outputPath)).toEqual(Buffer.from(EXPECTED_CSV, "utf8"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an invalid ontology asset worker count", async () => {
  await expect(
    createOntologyBuildAssets({ ontologySources: [], workerCount: 0 }),
  ).rejects.toThrow(/workerCount must be a positive integer/u);
});

test("derives a build-time base IRI for a baseless full ontology", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-baseless-full-"));
  const baselessRdfXml = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="Term" />
</rdf:RDF>
`;

  try {
    const source = await ontologySource(
      root,
      "iso-iec/11179/-3/ed-4/20260714-full",
      baselessRdfXml,
    );
    const assets = await createOntologyBuildAssets({
      ontologySources: [source],
    });
    const document = JSON.parse(
      assets.get("iso-iec/11179/-3/ed-4/20260714-full.jsonld").toString("utf8"),
    );

    expect(document).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@id":
            "https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/Term",
        }),
      ]),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
