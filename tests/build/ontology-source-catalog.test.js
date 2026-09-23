import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readOntologySourceCatalog } from "../../scripts/build/readOntologySourceCatalog.js";

test("resolves exact catalog names through inherited XML bases without remote acquisition", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-source-catalog-"));
  try {
    await mkdir(join(root, "sources"));
    await writeFile(
      join(root, "sources", "dependency.ttl"),
      "<urn:a> <urn:p> <urn:b> .",
    );
    await writeFile(
      join(root, "catalog.xml"),
      '<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog" xml:base="sources/"><group xml:base="./"><uri name="urn:exact:1" uri="dependency.ttl"/></group></catalog>',
    );
    const result = await readOntologySourceCatalog({
      catalogPath: join(root, "catalog.xml"),
      repositoryRoot: root,
    });
    expect(result.bindings.get("urn:exact:1")).toBe(
      join(root, "sources", "dependency.ttl"),
    );
    expect(result.bindings.has("urn:exact:2")).toBe(false);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/u);
    await writeFile(
      join(root, "catalog.xml"),
      '<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog"><rewriteURI uriStartString="urn:" rewritePrefix="https://example.com/"/></catalog>',
    );
    await expect(
      readOntologySourceCatalog({
        catalogPath: join(root, "catalog.xml"),
        repositoryRoot: root,
      }),
    ).rejects.toThrow("Unsupported catalog directive");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
