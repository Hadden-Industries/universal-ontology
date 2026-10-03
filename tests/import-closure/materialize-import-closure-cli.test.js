import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeImportClosure } from "../../scripts/materializeImportClosure.js";
import { OWLManager } from "owlapi/apibinding";
import { StringDocumentSource } from "owlapi/io";
const directories = [];
const cli = fileURLToPath(
  new URL("../../scripts/materializeImportClosure.js", import.meta.url),
);

// Owner accepted Java 5.5.1 parity for this input conversion on 2026-10-02.
// Stronger source preservation is deferred in universal-ontology#117 and owlapi#28.
test("JSON-LD directional annotation follows the accepted Java-parity baseline", async () => {
  const { directory, outputPath } = await fixture();
  const inputPath = join(directory, "direction.jsonld");
  await writeFile(
    inputPath,
    JSON.stringify({
      "@graph": [
        {
          "@id": "urn:root",
          "@type": "http://www.w3.org/2002/07/owl#Ontology",
          "urn:label": {
            "@value": "مرحبا",
            "@language": "ar",
            "@direction": "rtl",
          },
        },
        {
          "@id": "urn:label",
          "@type": "http://www.w3.org/2002/07/owl#AnnotationProperty",
        },
      ],
    }),
  );
  await writeFile(outputPath, "sentinel");
  await materializeImportClosure({
    inputPath,
    outputPath,
    format: "functional",
  });
  const ontology =
    await OWLManager.createOWLOntologyManager().loadOntologyFromOntologyDocument(
      new StringDocumentSource(await readFile(outputPath, "utf8")),
    );
  const value = [...ontology.getAnnotations()][0].value;
  expect(value.lexicalForm).toBe("مرحبا");
  expect(value.language).toBe("ar");
  expect(value.datatype.iri.value).toBe(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  );
});

test.each([false, true])(
  "catalog aliases preserve one identity or reject conflict (conflict: %s)",
  async (conflict) => {
    const { directory, inputPath, outputPath } = await fixture(
      "Ontology(<urn:root> Import(<urn:alias1>) Import(<urn:alias2>))",
    );
    await writeFile(
      join(directory, "shared.ofn"),
      "Ontology(<urn:shared> ClassAssertion(<urn:C> _:one))",
    );
    if (conflict)
      await writeFile(
        join(directory, "conflict.ofn"),
        "Ontology(<urn:shared> ClassAssertion(<urn:D> _:two))",
      );
    const catalogPath = join(directory, "catalog.xml");
    await writeFile(
      catalogPath,
      `<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog"><uri name="urn:alias1" uri="shared.ofn"/><uri name="urn:alias2" uri="${conflict ? "conflict.ofn" : "shared.ofn"}"/></catalog>`,
    );
    await writeFile(outputPath, "sentinel");
    const run = materializeImportClosure({
      inputPath,
      outputPath,
      catalogPath,
      format: "functional",
    });
    if (conflict) {
      await expect(run).rejects.toMatchObject({ stage: "imports" });
      expect(await readFile(outputPath, "utf8")).toBe("sentinel");
    } else {
      await run;
      const ontology =
        await OWLManager.createOWLOntologyManager().loadOntologyFromOntologyDocument(
          new StringDocumentSource(await readFile(outputPath, "utf8")),
        );
      // Parsing twice would standardize the blank individual apart, producing two assertions.
      expect(ontology.getAxioms().size).toBe(1);
      expect(ontology.getImportsDeclarations().size).toBe(0);
    }
  },
);
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});
async function fixture(
  text = "Ontology(<urn:root> Declaration(Class(<urn:C>)))",
) {
  const directory = await mkdtemp(join(tmpdir(), "uo-cli-test-"));
  directories.push(directory);
  const inputPath = join(directory, "root.ofn");
  const outputPath = join(directory, "full.owl");
  await writeFile(inputPath, text);
  return { directory, inputPath, outputPath };
}
test.each(["rdfxml", "functional"])(
  "writes a verified %s artifact",
  async (format) => {
    const { inputPath, outputPath } = await fixture();
    await materializeImportClosure({ inputPath, outputPath, format });
    expect(await readFile(outputPath, "utf8")).toContain("urn:root");
  },
);
test.each([
  [[]],
  [["--unknown"]],
  [["input", "output", "--format", "invalid"]],
])("usage failure %# returns 2", (args) => {
  expect(spawnSync(process.execPath, [cli, ...args]).status).toBe(2);
});
test("root parse failure returns 3 without output", async () => {
  const { directory, inputPath, outputPath } = await fixture("malformed root");
  expect(spawnSync(process.execPath, [cli, inputPath, outputPath]).status).toBe(
    3,
  );
  expect(await readdir(directory)).toEqual(["root.ofn"]);
});
test("identical resolved paths are rejected", async () => {
  const { inputPath } = await fixture();
  expect(spawnSync(process.execPath, [cli, inputPath, inputPath]).status).toBe(
    2,
  );
});
test.each([false, true])(
  "import failure returns 4 (document exists: %s)",
  async (exists) => {
    const { directory, inputPath, outputPath } = await fixture();
    const importedPath = join(directory, "import.ofn");
    await writeFile(
      inputPath,
      `Ontology(<urn:root> Import(<${pathToFileURL(importedPath).href}>))`,
    );
    if (exists) await writeFile(importedPath, "malformed import");
    await writeFile(outputPath, "sentinel");
    const result = spawnSync(process.execPath, [cli, inputPath, outputPath]);
    expect(result.status).toBe(4);
    expect(result.stderr.toString()).toContain("Ontology imports failed");
    expect(await readFile(outputPath, "utf8")).toBe("sentinel");
    expect(
      (await readdir(directory)).some((name) => name.endsWith(".tmp")),
    ).toBe(false);
  },
  // The required three backoff delays alone total 5.25 seconds.
  10000,
);

test.each([
  [
    "unsupported construct",
    "ofn",
    "Ontology(<urn:root> DLSafeRule(Body() Head()))",
  ],
  [
    "unconsumed RDF",
    "ttl",
    '<urn:root> a <http://www.w3.org/2002/07/owl#Ontology> . <urn:s> <urn:undeclared> "value" .',
  ],
  [
    "ambiguous headers",
    "ttl",
    "<urn:a> a <http://www.w3.org/2002/07/owl#Ontology> . <urn:b> a <http://www.w3.org/2002/07/owl#Ontology> .",
  ],
  [
    "multiple dataset graphs",
    "nq",
    "<urn:a> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Ontology> <urn:g1> .\n<urn:C> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Class> <urn:g2> .",
  ],
])(
  "rejects %s without replacing the destination",
  async (_label, extension, text) => {
    const { directory, outputPath } = await fixture();
    const inputPath = join(directory, `invalid.${extension}`);
    await writeFile(inputPath, text);
    await writeFile(outputPath, "sentinel");
    await expect(
      materializeImportClosure({ inputPath, outputPath }),
    ).rejects.toMatchObject({ stage: "root" });
    expect(await readFile(outputPath, "utf8")).toBe("sentinel");
    expect(
      (await readdir(directory)).some((name) => name.endsWith(".tmp")),
    ).toBe(false);
  },
);
test("CLI success returns zero", async () => {
  const { inputPath, outputPath } = await fixture();
  execFileSync(process.execPath, [
    cli,
    inputPath,
    outputPath,
    "--format",
    "functional",
  ]);
  expect(await readFile(outputPath, "utf8")).toContain("urn:root");
});
test("records exact root and import bytes even when imported parsing fails", async () => {
  const { directory, inputPath, outputPath } = await fixture();
  const importedPath = join(directory, "import.ofn");
  await writeFile(
    inputPath,
    `Ontology(<urn:root> Import(<${pathToFileURL(importedPath).href}>))`,
  );
  await writeFile(importedPath, "malformed import");
  const documents = [];
  await expect(
    materializeImportClosure({
      inputPath,
      outputPath,
      onDocument: (document) => documents.push(document),
    }),
  ).rejects.toMatchObject({ stage: "imports" });
  expect(documents.map(({ kind }) => kind)).toEqual(["root", "import"]);
  for (const [index, path] of [inputPath, importedPath].entries()) {
    expect(documents[index].resolved).toBe(pathToFileURL(path).href);
    expect(documents[index].sha256).toBe(
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    );
  }
});

test.each([
  'Ontology(<urn:root> Annotation(<urn:label> "same") Declaration(AnnotationProperty(<urn:label>)) AnnotationAssertion(<urn:label> <urn:root> "same"))',
  'Ontology(<urn:root> Annotation(<urn:label> "a\u0001b") Declaration(AnnotationProperty(<urn:label>)))',
])(
  "RDF/XML representability failure preserves the destination %#",
  async (text) => {
    const { directory, inputPath, outputPath } = await fixture(text);
    await writeFile(outputPath, "sentinel");
    await expect(
      materializeImportClosure({ inputPath, outputPath, format: "rdfxml" }),
    ).rejects.toMatchObject({
      stage: "serialization",
      cause: { reason: "ONTOLOGY_NOT_REPRESENTABLE" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("sentinel");
    expect((await readdir(directory)).sort()).toEqual(["full.owl", "root.ofn"]);
    await materializeImportClosure({
      inputPath,
      outputPath,
      format: "functional",
    });
    expect(await readFile(outputPath, "utf8")).not.toBe("sentinel");
  },
);
