import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileSystemOntologyQueryArtifactRepository } from "../../src/ontologyQuery/fileSystemOntologyQueryArtifactRepository.js";

describe("filesystem ontology query-artifact repository", () => {
  test("reads catalog and contained immutable index bytes", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "uo-index-repository-"));

    try {
      const releaseDirectory = join(
        temporaryRoot,
        "releases",
        "universal",
        "core",
        "20260714",
      );
      await mkdir(releaseDirectory, { recursive: true });
      await writeFile(join(temporaryRoot, "catalog.json"), "catalog", "utf8");
      await writeFile(join(releaseDirectory, "digest.json"), "index", "utf8");

      const ontologyQueryArtifactRepository =
        createFileSystemOntologyQueryArtifactRepository({
          queryRoot: temporaryRoot,
        });

      expect(
        Buffer.from(
          await ontologyQueryArtifactRepository.readOntologyQueryCatalog({}),
        ).toString("utf8"),
      ).toBe("catalog");
      expect(
        Buffer.from(
          await ontologyQueryArtifactRepository.readOntologyReleaseQueryIndex({
            relativePath: "releases/universal/core/20260714/digest.json",
          }),
        ).toString("utf8"),
      ).toBe("index");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("rejects absolute, non-normalized, escaping, and symlinked paths", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "uo-index-repository-"));
    const outsideRoot = await mkdtemp(join(tmpdir(), "uo-index-outside-"));

    try {
      await writeFile(join(temporaryRoot, "catalog.json"), "catalog", "utf8");
      await writeFile(join(outsideRoot, "outside.json"), "outside", "utf8");
      await symlink(
        join(outsideRoot, "outside.json"),
        join(temporaryRoot, "linked.json"),
        "file",
      );
      const ontologyQueryArtifactRepository =
        createFileSystemOntologyQueryArtifactRepository({
          queryRoot: temporaryRoot,
        });

      for (const relativePath of [
        "",
        ".",
        "../outside.json",
        "releases/../catalog.json",
        "releases\\catalog.json",
        "/query/v1/catalog.json",
        "C:/query/v1/catalog.json",
        "C:\\query\\v1\\catalog.json",
        "\\\\server\\share\\catalog.json",
        join(temporaryRoot, "catalog.json"),
        "linked.json",
      ]) {
        await expect(
          ontologyQueryArtifactRepository.readOntologyReleaseQueryIndex({
            relativePath,
          }),
        ).rejects.toThrow(/contained|normalized|symlink/u);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  test("forwards AbortSignal cancellation to filesystem reads", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "uo-index-repository-"));

    try {
      await writeFile(join(temporaryRoot, "catalog.json"), "catalog", "utf8");
      const ontologyQueryArtifactRepository =
        createFileSystemOntologyQueryArtifactRepository({
          queryRoot: temporaryRoot,
        });
      const controller = new AbortController();
      controller.abort();

      await expect(
        ontologyQueryArtifactRepository.readOntologyQueryCatalog({
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
