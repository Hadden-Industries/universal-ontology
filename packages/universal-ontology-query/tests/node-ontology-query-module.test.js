import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createOntologyQueryArtifacts } from "../../../scripts/build/createOntologyQueryArtifacts.js";
import { createFileSystemOntologyQueryArtifactRepository } from "../src/fileSystemOntologyQueryArtifactRepository.js";
import { createNodeOntologyQueryModule } from "../src/node.js";
import { generateOntologyQueryIndexes } from "../../../scripts/generateOntologyQueryIndexes.js";

test("retains a working snapshot across regeneration and a new reader process boundary", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-working-snapshot-"));
  let first;
  let second;
  try {
    const sourceFile = join(root, "working.owl");
    const source = await readFile(
      new URL(
        "../../../tests/fixtures/ontology-query/minimal-ontology-release",
        import.meta.url,
      ),
      "utf8",
    );
    await writeFile(sourceFile, source);
    const outputDirectory = join(root, "query");
    const options = {
      sourceDirectory: root,
      repositoryRoot: root,
      sourceFile,
      outputDirectory,
      ontologyArtifactFamilyId: "universal/working",
      workerCount: 1,
    };
    const oldCatalog = await generateOntologyQueryIndexes(options);
    const createReader = () =>
      createNodeOntologyQueryModule({
        ontologyQueryArtifactRepository:
          createFileSystemOntologyQueryArtifactRepository({
            queryRoot: outputDirectory,
          }),
      });
    first = createReader();
    await expect(first.checkReadiness()).resolves.toBeUndefined();
    const entityIdentifier = {
      identifierKind: "preferred_label",
      identifierValue: "Person",
    };
    const oldResult = await first.getOntologyEntityContext({
      entityIdentifier,
      rootSnapshotId: oldCatalog.releases[0].snapshotId,
      depth: 0,
    });
    await first.close();
    await writeFile(
      sourceFile,
      source
        .replaceAll(">Person<", ">Updated Person<")
        .replace(
          "A natural or legal person recognised by law.",
          "Updated working definition.",
        ),
    );
    const newCatalog = await generateOntologyQueryIndexes(options);
    expect(newCatalog.releases[0].snapshotId).not.toBe(
      oldCatalog.releases[0].snapshotId,
    );
    second = createReader();
    const pinned = await second.getOntologyEntityContext({
      entityIdentifier,
      snapshotRef: oldResult.snapshotRef,
      depth: 0,
    });
    expect(
      pinned.context.nodes[0].definitions.some(
        (definition) =>
          definition.term.value ===
          "A natural or legal person recognised by law.",
      ),
    ).toBe(true);
    const updated = await second.getOntologyEntityContext({
      entityIdentifier: {
        identifierKind: "preferred_label",
        identifierValue: "Updated Person",
      },
      rootSnapshotId: newCatalog.releases[0].snapshotId,
      depth: 0,
    });
    expect(
      updated.context.nodes[0].definitions.some(
        (definition) => definition.term.value === "Updated working definition.",
      ),
    ).toBe(true);
  } finally {
    await first?.close();
    await second?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 20000);

test("pins a filesystem snapshot and rejects mixing it with fresh graph selection", async () => {
  const root = await mkdtemp(join(tmpdir(), "uo-context-module-"));
  let query;
  try {
    const artifacts = await createOntologyQueryArtifacts({
      ontologySources: [
        {
          sourcePath: fileURLToPath(
            new URL("../../../src/universal/core/20260912", import.meta.url),
          ),
          outputPath: "universal/core/20260912",
        },
      ],
      workerCount: 1,
    });
    for (const [path, bytes] of artifacts.artifactContentsByRelativePath) {
      const output = join(root, path);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
    query = createNodeOntologyQueryModule({
      ontologyQueryArtifactRepository:
        createFileSystemOntologyQueryArtifactRepository({ queryRoot: root }),
    });
    const entityIdentifier = {
      identifierKind: "entity_iri",
      identifierValue:
        "https://haddenindustries.com/ontology/universal/core/AddressRelationship",
    };
    const first = await query.getOntologyEntityContext({
      entityIdentifier,
      graphSelection: "source_graph",
      depth: 1,
    });
    expect(first.snapshotRef.rootSnapshotId).toBe(
      artifacts.catalog.releases[0].snapshotId,
    );
    expect(
      first.context.connections.filter(
        ({ role }) => role === "restriction_filler",
      ),
    ).toHaveLength(3);
    const second = await query.getOntologyEntityContext({
      entityIdentifier,
      snapshotRef: first.snapshotRef,
      depth: 0,
    });
    expect(second.snapshotRef).toEqual(first.snapshotRef);
    expect(second.context.connections).toEqual([]);
    const found = await query.searchOntologyEntities({
      queryText: "AddressRelationship",
      definitionSourceStatus: "no_recorded_source",
      graphSelection: "source_graph",
    });
    expect(
      found.matches.some(
        ({ ontologyEntity, matchingDefinitions }) =>
          ontologyEntity.entityIri === entityIdentifier.identifierValue &&
          matchingDefinitions.some(
            ({ sourceStatus }) => sourceStatus === "no_recorded_source",
          ),
      ),
    ).toBe(true);
    const page = await query.searchOntologyEntities({
      definitionSourceStatus: "no_recorded_source",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
      graphSelection: "source_graph",
      maximumResultCount: 1,
    });
    expect(page.returnedEntityCount).toBe(1);
    expect(page.matches[0].lexicalMatch).toBeUndefined();
    expect(page.nextCursor).not.toBeNull();
    const next = await query.searchOntologyEntities({
      cursor: page.nextCursor,
      definitionSourceStatus: "no_recorded_source",
      ontologyReleaseSelection: {
        selectionKind: "latest_stable_releases",
        ontologyArtifactFamilyIds: ["universal/core"],
      },
      graphSelection: "source_graph",
      maximumResultCount: 1,
    });
    expect(next.snapshotRef).toEqual(page.snapshotRef);
    expect(next.matches[0].ontologyEntity.entityIri).not.toBe(
      page.matches[0].ontologyEntity.entityIri,
    );
    await expect(
      query.searchOntologyEntities({
        cursor: page.nextCursor,
        queryText: "changed",
      }),
    ).rejects.toThrow();
    await expect(
      query.getOntologyEntityContext({
        entityIdentifier,
        snapshotRef: first.snapshotRef,
        graphSelection: "source_graph",
      }),
    ).rejects.toThrow();
  } finally {
    await query?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 20000);
