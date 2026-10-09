import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createOntologyBuildAssets } from "../../scripts/build/ontologyAssets.js";

const base = "https://haddenindustries.com/ontology/";
function ontology(path, imports = []) {
  return `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Ontology rdf:about="${base}${dirname(path)}/"><owl:versionIRI rdf:resource="${base}${path}"/>${imports.map((p) => `<owl:imports rdf:resource="${base}${p}"/>`).join("")}</owl:Ontology>
  <owl:Class rdf:about="${base}${path}#Class"/></rdf:RDF>`;
}

test("normal asset generation includes the closure trio and skips an import-free dated root", async () => {
  const repositoryDirectory = await mkdtemp(join(tmpdir(), "uo-full-assets-"));
  const sourceDirectory = join(repositoryDirectory, "src");
  const outputDirectory = join(repositoryDirectory, "dist");
  const paths = ["universal/core/20260714", "iso/example/20260714"];
  try {
    const ontologySources = [];
    for (const [index, outputPath] of paths.entries()) {
      const sourcePath = join(sourceDirectory, outputPath);
      await mkdir(dirname(sourcePath), { recursive: true });
      await writeFile(
        sourcePath,
        ontology(outputPath, index === 0 ? [paths[1]] : []),
      );
      ontologySources.push({ sourcePath, outputPath });
    }
    const assets = await createOntologyBuildAssets({
      ontologySources,
      workerCount: 1,
      fullOntologyContext: {
        repositoryDirectory,
        sourceDirectory,
        outputDirectory,
      },
    });
    expect(assets.has(`${paths[0]}-full`)).toBe(true);
    expect(assets.has(`${paths[0]}-full.jsonld`)).toBe(true);
    expect(assets.has(`${paths[0]}-full.csv`)).toBe(true);
    const full = assets.get(`${paths[0]}-full`).toString();
    for (const path of paths)
      expect(full).toContain(`<owl:Class rdf:about="${base}${path}#Class"`);
    expect(full).toMatch(/^ {4}<owl:Class /mu);
    expect(full).not.toContain("<owl:imports");
    for (const suffix of ["-full", "-full.jsonld", "-full.csv"])
      expect(assets.has(`${paths[1]}${suffix}`)).toBe(false);
  } finally {
    await rm(repositoryDirectory, { recursive: true, force: true });
  }
});
