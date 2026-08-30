/**
 * Parses repository-relative query-index paths without using runtime-specific
 * path semantics. Filesystem and Fetch adapters add their own containment
 * checks after this shared lexical boundary.
 */

export const ONTOLOGY_RELEASE_INDEX_RELATIVE_PATH_ERROR_MESSAGE =
  "The repository relative path must be a normalized contained POSIX path.";

/**
 * Return immutable POSIX path segments for a normalized contained reference.
 * Percent signs and URL delimiters remain valid at this transport-neutral seam;
 * the Fetch adapter rejects them before URL resolution can reinterpret them.
 */
export function parseContainedOntologyReleaseIndexRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    relativePath.startsWith("/") ||
    /^[A-Za-z]:\//u.test(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new TypeError(ONTOLOGY_RELEASE_INDEX_RELATIVE_PATH_ERROR_MESSAGE);
  }

  const segments = relativePath.split("/");

  if (segments.some((segment) => ["", ".", ".."].includes(segment))) {
    throw new TypeError(ONTOLOGY_RELEASE_INDEX_RELATIVE_PATH_ERROR_MESSAGE);
  }

  return Object.freeze(segments);
}
