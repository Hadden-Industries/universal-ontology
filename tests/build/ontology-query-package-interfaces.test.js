import { execFile } from "node:child_process";
import { isBuiltin } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { OntologyQueryError } from "universal-ontology-query";
import { verifyCanonicalArtifactReference } from "universal-ontology-query/artifacts";

const execFileAsync = promisify(execFile);

describe("query package consumer interfaces", () => {
  test("bundles every browser export without Node repositories or builtins", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      fileURLToPath(
        new URL(
          "../fixtures/ontology-query/run-query-browser-build.js",
          import.meta.url,
        ),
      ),
    ]);
    const { moduleIds, entryChunkCount } = JSON.parse(stdout);

    // Demand all browser entry exports, including ones the website might
    // otherwise tree-shake away, and inspect the native bundler's actual graph.
    expect(entryChunkCount).toBeGreaterThan(0);
    for (const moduleFileName of [
      "createOntologyQueryModule.js",
      "ontologyQuerySchemas.js",
      "fetchOntologyQueryArtifactRepository.js",
      "jsonValueImmutability.js",
    ]) {
      expect(moduleIds.some((id) => id.endsWith(`/${moduleFileName}`))).toBe(
        true,
      );
    }
    expect(
      moduleIds.filter(
        (id) => isBuiltin(id) || id.includes("__vite-browser-external"),
      ),
    ).toEqual([]);
    for (const moduleFileName of [
      "fileSystemOntologyQueryArtifactRepository.js",
      "httpOntologyQueryArtifactReader.js",
      "persistentOntologyQueryArtifactCache.js",
      "persistentHttpOntologyQueryArtifactRepository.js",
      "persistentHttpRepository.js",
    ]) {
      expect(moduleIds.some((id) => id.endsWith(`/${moduleFileName}`))).toBe(
        false,
      );
    }
  });

  test("recognizes artifact integrity failures as the public query error identity", async () => {
    await expect(
      verifyCanonicalArtifactReference({
        bytes: new Uint8Array([1]),
        expectedByteLength: 2,
        expectedSha256: "0".repeat(64),
      }),
    ).rejects.toBeInstanceOf(OntologyQueryError);
  });
});
