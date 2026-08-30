import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileSystemOntologyReleaseIndexRepository } from "../../src/ontologyQuery/fileSystemOntologyReleaseIndexRepository.js";

describe("filesystem ontology release-index repository", () => {
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

      const repository = createFileSystemOntologyReleaseIndexRepository({
        queryRoot: temporaryRoot,
      });

      expect(
        Buffer.from(await repository.readOntologyQueryCatalog({})).toString(
          "utf8",
        ),
      ).toBe("catalog");
      expect(
        Buffer.from(
          await repository.readOntologyReleaseQueryIndex({
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
      const repository = createFileSystemOntologyReleaseIndexRepository({
        queryRoot: temporaryRoot,
      });

      for (const relativePath of [
        "../outside.json",
        "releases/../catalog.json",
        "releases\\catalog.json",
        join(temporaryRoot, "catalog.json"),
        "linked.json",
      ]) {
        await expect(
          repository.readOntologyReleaseQueryIndex({ relativePath }),
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
      const repository = createFileSystemOntologyReleaseIndexRepository({
        queryRoot: temporaryRoot,
      });
      const controller = new AbortController();
      controller.abort();

      await expect(
        repository.readOntologyQueryCatalog({ signal: controller.signal }),
      ).rejects.toMatchObject({ name: "AbortError" });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
