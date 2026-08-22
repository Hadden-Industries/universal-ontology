import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { generateOntologyAliases } from "../../scripts/build/ontologyAliases.js";

async function ontologySource(root, outputPath, content) {
  const sourcePath = join(root, ...outputPath.split("/"));
  await mkdir(dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, content);
  return { sourcePath, outputPath };
}

test("selects the binary-greatest exact eight-digit version for each stable alias", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-aliases-"));

  try {
    const sources = [
      await ontologySource(root, "iso-iec/11179/-3/ed-3/20230510", "older"),
      await ontologySource(
        root,
        "iso-iec/11179/-3/ed-3/20230808",
        "correct latest",
      ),
      await ontologySource(
        root,
        "iso-iec/11179/-3/ed-3/20240101-full",
        "newer full variant",
      ),
      await ontologySource(root, "iso-iec/11179/-3/ed-3/v1", "named version"),
      await ontologySource(root, "iso/example/20250101", "first iso"),
      await ontologySource(root, "iso/example/20251231", "last iso"),
    ];

    const aliases = await generateOntologyAliases({
      ontologySources: sources,
    });

    expect([...aliases.keys()]).toEqual([
      "iso-iec/11179/-3/ed-3/latest",
      "iso/example/latest",
    ]);
    expect(aliases.get("iso-iec/11179/-3/ed-3/latest").toString("utf8")).toBe(
      "correct latest",
    );
    expect(aliases.get("iso/example/latest").toString("utf8")).toBe("last iso");
    expect(aliases.has("iso-iec/11179/-3/ed-3/latest-unstable")).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rewrites every internal import in Universal unstable aliases without changing other bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-unstable-alias-"));
  const stable = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#">',
    '  <owl:Ontology rdf:about="https://haddenindustries.com/ontology/universal/core/">',
    '    <owl:versionIRI rdf:resource="https://haddenindustries.com/ontology/universal/core/20260714"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/20260714"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/extended/20260626"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/20260714"/>',
    '    <owl:imports rdf:resource="https://www.w3.org/2002/07/owl"/>',
    '    <owl:imports rdf:resource="https://haddenindustriesXcom/ontology/universal/core/20260714"/>',
    "  </owl:Ontology>",
    "</rdf:RDF>",
    "",
  ].join("\r\n");
  const expectedUnstable = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#">',
    '  <owl:Ontology rdf:about="https://haddenindustries.com/ontology/universal/core/">',
    '    <owl:versionIRI rdf:resource="https://haddenindustries.com/ontology/universal/core/20260714"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/latest-unstable"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/universal/extended/latest-unstable"/>',
    '    <owl:imports rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/latest"/>',
    '    <owl:imports rdf:resource="https://www.w3.org/2002/07/owl"/>',
    '    <owl:imports rdf:resource="https://haddenindustriesXcom/ontology/universal/core/20260714"/>',
    "  </owl:Ontology>",
    "</rdf:RDF>",
    "",
  ].join("\r\n");

  try {
    const source = await ontologySource(
      root,
      "universal/core/20260714",
      stable,
    );
    const aliases = await generateOntologyAliases({
      ontologySources: [source],
    });

    expect(aliases.get("universal/core/latest")).toEqual(
      Buffer.from(stable, "utf8"),
    );
    expect(aliases.get("universal/core/latest-unstable")).toEqual(
      Buffer.from(expectedUnstable, "utf8"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a Universal unstable alias with no eligible internal import", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-empty-unstable-alias-"));

  try {
    const source = await ontologySource(
      root,
      "universal/core/20260714",
      '<owl:Ontology xmlns:owl="http://www.w3.org/2002/07/owl#" />',
    );

    await expect(
      generateOntologyAliases({ ontologySources: [source] }),
    ).rejects.toThrow(
      /universal\/core\/latest-unstable: no eligible internal owl:imports/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
