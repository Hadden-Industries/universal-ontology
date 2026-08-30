import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";

function validateContainedRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    isAbsolute(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new TypeError(
      "The repository relative path must be a normalized contained POSIX path.",
    );
  }

  const segments = relativePath.split("/");

  if (segments.some((segment) => ["", ".", ".."].includes(segment))) {
    throw new TypeError(
      "The repository relative path must be a normalized contained POSIX path.",
    );
  }

  return segments;
}

function throwIfAborted(signal) {
  signal?.throwIfAborted();
}

/**
 * Create the local adapter for the two-method byte repository port.
 *
 * The adapter owns filesystem containment and symlink rejection only. Digest
 * verification, JSON parsing, schema validation, and catalog/index identity
 * checks remain in the query module so a future S3 adapter crosses the same
 * integrity boundary with the same raw bytes.
 */
export function createFileSystemOntologyReleaseIndexRepository({ queryRoot }) {
  if (typeof queryRoot !== "string" || queryRoot === "") {
    throw new TypeError("queryRoot must be a non-empty path.");
  }

  const absoluteQueryRoot = resolve(queryRoot);

  async function readContainedFile(relativePath, { signal } = {}) {
    throwIfAborted(signal);
    const segments = validateContainedRelativePath(relativePath);
    const targetPath = resolve(absoluteQueryRoot, ...segments);
    const rootPrefix = `${absoluteQueryRoot}${sep}`;

    if (!targetPath.startsWith(rootPrefix)) {
      throw new Error(
        "The repository path resolves outside the contained root.",
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
        throw new Error("Ontology query repository paths cannot use symlinks.");
      }
    }

    const [resolvedRoot, resolvedTarget] = await Promise.all([
      realpath(absoluteQueryRoot),
      realpath(targetPath),
    ]);
    const resolvedRootPrefix = `${resolvedRoot}${sep}`;

    if (!resolvedTarget.startsWith(resolvedRootPrefix)) {
      throw new Error(
        "The repository path resolves outside the contained root.",
      );
    }

    throwIfAborted(signal);
    return readFile(resolvedTarget, { signal });
  }

  return Object.freeze({
    /** Read the generated catalog as untrusted bytes. */
    readOntologyQueryCatalog({ signal } = {}) {
      return readContainedFile("catalog.json", { signal });
    },

    /** Read one catalog-selected immutable release index as untrusted bytes. */
    readOntologyReleaseQueryIndex({ relativePath, signal }) {
      return readContainedFile(relativePath, { signal });
    },
  });
}
