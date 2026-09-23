import { lstat, open, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { parseContainedOntologyQueryArtifactRelativePath } from "./ontologyQueryArtifactRelativePath.js";

function throwIfAborted(signal) {
  signal?.throwIfAborted();
}

/**
 * Create the local adapter for the ontology query-artifact repository port.
 *
 * The adapter owns filesystem containment and symlink rejection only. Digest
 * verification, JSON parsing, schema validation, and catalog/index identity
 * checks remain in the query module so a future S3 adapter crosses the same
 * integrity boundary with the same raw bytes.
 */
export function createFileSystemOntologyQueryArtifactRepository({ queryRoot }) {
  if (typeof queryRoot !== "string" || queryRoot === "") {
    throw new TypeError("queryRoot must be a non-empty path.");
  }

  const absoluteQueryRoot = resolve(queryRoot);

  async function readContainedFile(relativePath, { signal } = {}) {
    throwIfAborted(signal);
    const segments =
      parseContainedOntologyQueryArtifactRelativePath(relativePath);
    const targetPath = resolve(absoluteQueryRoot, ...segments);
    const rootPrefix = `${absoluteQueryRoot}${sep}`;

    if (!targetPath.startsWith(rootPrefix)) {
      throw new Error(
        "The ontology query-artifact repository path resolves outside the contained root.",
      );
    }

    // Checking every component blocks a release path from escaping through an
    // otherwise lexically contained symlink. The realpath comparison below is
    // a second independent containment check against platform path behavior.
    const rootStats = await lstat(absoluteQueryRoot);

    if (rootStats.isSymbolicLink()) {
      throw new Error("The ontology query root cannot be a symlink.");
    }

    let currentPath = absoluteQueryRoot;

    for (const segment of segments) {
      currentPath = resolve(currentPath, segment);
      const pathStats = await lstat(currentPath);

      if (pathStats.isSymbolicLink()) {
        throw new Error(
          "Ontology query-artifact repository paths cannot use symlinks.",
        );
      }
    }

    const [resolvedRoot, resolvedTarget] = await Promise.all([
      realpath(absoluteQueryRoot),
      realpath(targetPath),
    ]);
    const resolvedRootPrefix = `${resolvedRoot}${sep}`;

    if (!resolvedTarget.startsWith(resolvedRootPrefix)) {
      throw new Error(
        "The ontology query-artifact repository path resolves outside the contained root.",
      );
    }

    throwIfAborted(signal);
    const maximum =
      relativePath === "catalog.json" || relativePath.startsWith("catalogs/")
        ? 1024 * 1024
        : 8 * 1024 * 1024;
    const handle = await open(resolvedTarget, "r");
    try {
      const size = (await handle.stat()).size;
      if (size > maximum)
        throw new RangeError(
          "Ontology artifact exceeds its byte admission limit.",
        );
      const bytes = Buffer.alloc(Math.min(size + 1, maximum + 1));
      let length = 0;
      while (length < bytes.length) {
        throwIfAborted(signal);
        const { bytesRead } = await handle.read(
          bytes,
          length,
          bytes.length - length,
          null,
        );
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > size)
        throw new Error("Ontology artifact grew while being read.");
      return bytes.subarray(0, length);
    } finally {
      await handle.close();
    }
  }

  return Object.freeze({
    /** Read an admitted catalog-selected canonical RDF dataset. */
    readOntologyDataset({ relativePath, signal }) {
      return readContainedFile(relativePath, { signal });
    },
    /** Read the generated catalog as untrusted bytes. */
    readOntologyQueryCatalog({ signal, catalogSha256 } = {}) {
      if (catalogSha256 !== undefined && !/^[0-9a-f]{64}$/u.test(catalogSha256))
        throw new TypeError("Invalid catalog digest.");
      return readContainedFile(
        catalogSha256 ? `catalogs/${catalogSha256}.json` : "catalog.json",
        { signal },
      );
    },

    /** Read one catalog-selected immutable release index as untrusted bytes. */
    readOntologyReleaseQueryIndex({ relativePath, signal }) {
      return readContainedFile(relativePath, { signal });
    },
  });
}
