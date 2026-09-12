import * as nodeFileSystem from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runOntologyMcpDevelopment } from "../../scripts/runOntologyMcpDevelopment.js";

test("refreshes the selected artifact root before the real workspace listener becomes ready", async () => {
  const projectRoot = await nodeFileSystem.mkdtemp(
    join(tmpdir(), "uo-mcp-development-"),
  );
  const queryRoot = join(projectRoot, "selected-query-artifacts");
  const signalListeners = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [
      signal,
      new Set(process.listeners(signal)),
    ]),
  );
  let localServer;
  try {
    // Startup's accepted default selection includes all three Universal families.
    for (const family of ["core", "extended", "reference-data"]) {
      const sourceDirectory = join(projectRoot, "src/universal", family);
      await nodeFileSystem.mkdir(sourceDirectory, { recursive: true });
      await nodeFileSystem.copyFile(
        new URL(
          "../fixtures/ontology-query/minimal-ontology-release",
          import.meta.url,
        ),
        join(sourceDirectory, "20260830"),
      );
    }
    // The public configuration requires a positive port. Ask the OS for a free
    // loopback port immediately before starting the real configured listener.
    const portProbe = createServer();
    await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
    const { port } = portProbe.address();
    await new Promise((resolve, reject) =>
      portProbe.close((error) => (error ? reject(error) : resolve())),
    );
    localServer = await runOntologyMcpDevelopment({
      projectRoot,
      environment: {
        UNIVERSAL_ONTOLOGY_QUERY_ROOT: queryRoot,
        UNIVERSAL_ONTOLOGY_MCP_PORT: String(port),
      },
      arguments: ["--refresh-index"],
    });
    expect(
      await (await fetch(`http://127.0.0.1:${port}/healthz`)).json(),
    ).toMatchObject({ status: "ready", catalogReady: true });
    const catalog = JSON.parse(
      await nodeFileSystem.readFile(join(queryRoot, "catalog.json"), "utf8"),
    );
    expect(catalog.releases).toHaveLength(3);
    expect(catalog.releases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ontologyArtifactFamilyId: "universal/core",
          versionTag: "20260830",
          sourceArtifactSha256:
            "efbb5401bbe45464f916875b81777c9132fac63f56c8d34b0b3af27601aa163b",
        }),
      ]),
    );
    await expect(
      nodeFileSystem.stat(join(projectRoot, "dist")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    await localServer?.shutdown();
    // Remove only signal listeners installed by this invocation, preserving
    // listeners owned by Jest or another consumer in the process.
    for (const [signal, previousListeners] of signalListeners) {
      for (const listener of process.listeners(signal)) {
        if (!previousListeners.has(listener))
          process.removeListener(signal, listener);
      }
    }
    await nodeFileSystem.rm(projectRoot, { recursive: true, force: true });
  }
}, 30_000);

test("rejects unknown development arguments before reading or generating artifacts", async () => {
  await expect(
    runOntologyMcpDevelopment({ arguments: ["--unknown"], environment: {} }),
  ).rejects.toThrow("Unknown local MCP runner argument: --unknown");
});
