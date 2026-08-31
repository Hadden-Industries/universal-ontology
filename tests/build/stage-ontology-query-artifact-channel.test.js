import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createOntologyQueryArtifacts } from "../../scripts/build/createOntologyQueryArtifacts.js";
import { stageOntologyQueryArtifactChannel } from "../../scripts/stageOntologyQueryArtifactChannel.js";
import { parseOntologyQueryChannelManifestBytes } from "../../src/ontologyQuery/ontologyQueryArtifactParsing.js";

const MINIMAL_ONTOLOGY_RELEASE_URL = new URL(
  "../fixtures/ontology-query/minimal-ontology-release",
  import.meta.url,
);

async function createArtifactSet(sourceRoot, versionTag) {
  const sourcePath = join(sourceRoot, versionTag);
  await writeFile(sourcePath, await readFile(MINIMAL_ONTOLOGY_RELEASE_URL));

  return createOntologyQueryArtifacts({
    ontologySources: [
      {
        sourcePath,
        outputPath: `universal/test/${versionTag}`,
      },
    ],
    workerCount: 1,
  });
}

async function materializeArtifactSet(queryRoot, artifactSet) {
  for (const [
    relativePath,
    content,
  ] of artifactSet.artifactContentsByRelativePath) {
    const destinationPath = join(queryRoot, ...relativePath.split("/"));
    await mkdir(dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, content);
  }
}

function createRecordingFileSystem(events) {
  return {
    async readFile(path, options) {
      events.push({ operation: "readFile", path });
      return readFile(path, options);
    },
    async mkdir(path, options) {
      events.push({ operation: "mkdir", path });
      return mkdir(path, options);
    },
    async open(path, flags, mode) {
      events.push({ operation: "open", path, flags, mode });
      const fileHandle = await open(path, flags, mode);

      return {
        async writeFile(content) {
          events.push({ operation: "writeFile", path });
          return fileHandle.writeFile(content);
        },
        async sync() {
          events.push({ operation: "sync", path });
          return fileHandle.sync();
        },
        async close() {
          events.push({ operation: "close", path });
          return fileHandle.close();
        },
      };
    },
    async rename(sourcePath, destinationPath) {
      events.push({ operation: "rename", sourcePath, destinationPath });
      return rename(sourcePath, destinationPath);
    },
    async unlink(path) {
      events.push({ operation: "unlink", path });
      return unlink(path);
    },
  };
}

describe("ontology query-artifact channel staging", () => {
  let sourceRoot;
  let firstArtifactSet;
  let secondArtifactSet;

  beforeAll(async () => {
    sourceRoot = await mkdtemp(join(tmpdir(), "uo-channel-source-"));
    firstArtifactSet = await createArtifactSet(sourceRoot, "20260829");
    secondArtifactSet = await createArtifactSet(sourceRoot, "20260830");
  });

  afterAll(async () => {
    await rm(sourceRoot, { recursive: true, force: true });
  });

  test("rejects a missing compatibility catalog without creating a channel", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-missing-"));

    try {
      await expect(
        stageOntologyQueryArtifactChannel({
          queryRoot,
          ontologyQueryArtifactChannelName: "development",
        }),
      ).rejects.toThrow();
      await expect(readdir(join(queryRoot, "channels"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("rejects a corrupt immutable catalog before replacing the manifest", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-corrupt-"));

    try {
      await materializeArtifactSet(queryRoot, firstArtifactSet);
      await writeFile(
        join(queryRoot, ...firstArtifactSet.catalogRelativePath.split("/")),
        Buffer.from("{}\n", "utf8"),
      );

      await expect(
        stageOntologyQueryArtifactChannel({
          queryRoot,
          ontologyQueryArtifactChannelName: "stable",
        }),
      ).rejects.toThrow(/immutable catalog/u);
      await expect(
        readFile(join(queryRoot, "channels", "stable.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("rejects a catalog whose referenced immutable release index is absent", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-incomplete-"));

    try {
      await materializeArtifactSet(queryRoot, firstArtifactSet);
      const [catalogRelease] = firstArtifactSet.catalog.releases;
      await unlink(
        join(queryRoot, ...catalogRelease.queryIndexRelativePath.split("/")),
      );

      await expect(
        stageOntologyQueryArtifactChannel({
          queryRoot,
          ontologyQueryArtifactChannelName: "development",
        }),
      ).rejects.toThrow(/release query index/u);
      await expect(
        readFile(join(queryRoot, "channels", "development.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("isolates stable and development promotion to their selected files", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-isolation-"));

    try {
      await materializeArtifactSet(queryRoot, firstArtifactSet);
      await stageOntologyQueryArtifactChannel({
        queryRoot,
        ontologyQueryArtifactChannelName: "stable",
      });
      const stableBytes = await readFile(
        join(queryRoot, "channels", "stable.json"),
      );

      await materializeArtifactSet(queryRoot, secondArtifactSet);
      await stageOntologyQueryArtifactChannel({
        queryRoot,
        ontologyQueryArtifactChannelName: "development",
      });

      expect(
        await readFile(join(queryRoot, "channels", "stable.json")),
      ).toEqual(stableBytes);
      expect(parseOntologyQueryChannelManifestBytes(stableBytes)).toMatchObject(
        {
          ontologyQueryArtifactChannelName: "stable",
          ontologyQueryCatalogReference: {
            sha256: firstArtifactSet.catalogSha256,
          },
        },
      );
      expect(
        parseOntologyQueryChannelManifestBytes(
          await readFile(join(queryRoot, "channels", "development.json")),
        ),
      ).toMatchObject({
        ontologyQueryArtifactChannelName: "development",
        ontologyQueryCatalogReference: {
          sha256: secondArtifactSet.catalogSha256,
        },
      });

      const developmentBytes = await readFile(
        join(queryRoot, "channels", "development.json"),
      );
      await stageOntologyQueryArtifactChannel({
        queryRoot,
        ontologyQueryArtifactChannelName: "stable",
      });
      expect(
        await readFile(join(queryRoot, "channels", "development.json")),
      ).toEqual(developmentBytes);
      expect(
        parseOntologyQueryChannelManifestBytes(
          await readFile(join(queryRoot, "channels", "stable.json")),
        ),
      ).toMatchObject({
        ontologyQueryArtifactChannelName: "stable",
        ontologyQueryCatalogReference: {
          sha256: secondArtifactSet.catalogSha256,
        },
      });
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("cleans only its temporary file when writing is interrupted", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-interrupted-"));

    try {
      await materializeArtifactSet(queryRoot, firstArtifactSet);
      await stageOntologyQueryArtifactChannel({
        queryRoot,
        ontologyQueryArtifactChannelName: "development",
      });
      const precedingManifestBytes = await readFile(
        join(queryRoot, "channels", "development.json"),
      );
      await materializeArtifactSet(queryRoot, secondArtifactSet);
      const interruptedFileSystem = {
        readFile,
        mkdir,
        rename,
        unlink,
        async open(path, flags, mode) {
          const fileHandle = await open(path, flags, mode);

          return {
            async writeFile(content) {
              await fileHandle.writeFile(content.subarray(0, 8));
              throw new Error("simulated interrupted temporary write");
            },
            sync: () => fileHandle.sync(),
            close: () => fileHandle.close(),
          };
        },
      };

      await expect(
        stageOntologyQueryArtifactChannel({
          queryRoot,
          ontologyQueryArtifactChannelName: "development",
          fileSystem: interruptedFileSystem,
        }),
      ).rejects.toThrow("simulated interrupted temporary write");
      expect(
        await readFile(join(queryRoot, "channels", "development.json")),
      ).toEqual(precedingManifestBytes);
      expect(await readdir(join(queryRoot, "channels"))).toEqual([
        "development.json",
      ]);
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("flushes a same-directory temporary file and renames the manifest last", async () => {
    const queryRoot = await mkdtemp(join(tmpdir(), "uo-channel-order-"));
    const events = [];

    try {
      await materializeArtifactSet(queryRoot, firstArtifactSet);
      const result = await stageOntologyQueryArtifactChannel({
        queryRoot,
        ontologyQueryArtifactChannelName: "development",
        fileSystem: createRecordingFileSystem(events),
      });
      const renameEvent = events.at(-1);
      const openEvent = events.find(({ operation }) => operation === "open");

      expect(renameEvent).toMatchObject({
        operation: "rename",
        destinationPath: join(queryRoot, "channels", "development.json"),
      });
      expect(dirname(renameEvent.sourcePath)).toBe(
        dirname(renameEvent.destinationPath),
      );
      expect(events.map(({ operation }) => operation)).toEqual([
        "readFile",
        "readFile",
        "readFile",
        "mkdir",
        "open",
        "writeFile",
        "sync",
        "close",
        "rename",
      ]);
      expect(openEvent.flags).toBe("wx");
      expect(result.channelManifest).toEqual(
        parseOntologyQueryChannelManifestBytes(result.channelManifestContent),
      );
    } finally {
      await rm(queryRoot, { recursive: true, force: true });
    }
  });

  test("requires an absolute query root and a declared channel name", async () => {
    await expect(
      stageOntologyQueryArtifactChannel({
        queryRoot: "dist/query/v1",
        ontologyQueryArtifactChannelName: "development",
      }),
    ).rejects.toThrow(/absolute/u);
    await expect(
      stageOntologyQueryArtifactChannel({
        queryRoot: join(tmpdir(), "uo-channel-invalid-name"),
        ontologyQueryArtifactChannelName: "latest_stable_releases",
      }),
    ).rejects.toThrow();
  });
});
