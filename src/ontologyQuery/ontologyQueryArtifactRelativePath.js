/**
 * Parses repository-relative query-artifact paths without runtime-specific
 * path semantics. Filesystem and HTTP adapters add independent containment
 * checks after this shared lexical boundary.
 */

import {
  OntologyArtifactFamilyIdSchema,
  OntologyVersionTagSchema,
} from "./ontologyQuerySchemas.js";
import { OntologyQueryArtifactChannelNameSchema } from "./ontologyQueryChannelManifestSchemas.js";

export const ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE =
  "The repository relative path must be a normalized contained POSIX path.";

const CATALOG_RELATIVE_PATH_PATTERN = /^catalogs\/([0-9a-f]{64})\.json$/u;
const SHA_256_FILE_NAME_PATTERN = /^([0-9a-f]{64})\.json$/u;

/**
 * Return immutable POSIX path segments for a normalized contained reference.
 * Percent signs and URL delimiters remain valid at this transport-neutral seam;
 * an HTTP adapter must reject them before URL resolution can reinterpret them.
 */
export function parseContainedOntologyQueryArtifactRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    relativePath.startsWith("/") ||
    /^[A-Za-z]:\//u.test(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
  }

  const segments = relativePath.split("/");

  if (segments.some((segment) => ["", ".", ".."].includes(segment))) {
    throw new TypeError(ONTOLOGY_QUERY_ARTIFACT_RELATIVE_PATH_ERROR_MESSAGE);
  }

  return Object.freeze(segments);
}

/** Parse one immutable content-addressed catalog path and its digest. */
export function parseOntologyQueryCatalogRelativePath(relativePath) {
  const segments =
    parseContainedOntologyQueryArtifactRelativePath(relativePath);
  const match = CATALOG_RELATIVE_PATH_PATTERN.exec(relativePath);

  if (!match) {
    throw new TypeError(
      "The ontology query catalog relative path must contain one lowercase SHA-256 identity.",
    );
  }

  return Object.freeze({ segments, sha256: match[1] });
}

/** Parse one mutable stable or development channel-manifest path. */
export function parseOntologyQueryChannelManifestRelativePath(relativePath) {
  const segments =
    parseContainedOntologyQueryArtifactRelativePath(relativePath);

  if (segments.length !== 2 || segments[0] !== "channels") {
    throw new TypeError(
      "The ontology query channel-manifest relative path is unsupported.",
    );
  }

  const fileNameMatch = /^(.*)\.json$/u.exec(segments[1]);
  const parsedChannelName = OntologyQueryArtifactChannelNameSchema.safeParse(
    fileNameMatch?.[1],
  );

  if (!parsedChannelName.success) {
    throw new TypeError(
      "The ontology query channel-manifest relative path is unsupported.",
    );
  }

  return Object.freeze({
    segments,
    ontologyQueryArtifactChannelName: parsedChannelName.data,
  });
}

/** Parse one content-addressed release-index path and embedded identity. */
export function parseOntologyReleaseQueryIndexRelativePath(relativePath) {
  const segments =
    parseContainedOntologyQueryArtifactRelativePath(relativePath);

  if (segments.length < 4 || segments[0] !== "releases") {
    throw new TypeError(
      "The ontology release query-index relative path is unsupported.",
    );
  }

  const sha256Match = SHA_256_FILE_NAME_PATTERN.exec(segments.at(-1));
  const versionTag = segments.at(-2);
  const ontologyArtifactFamilyId = segments.slice(1, -2).join("/");
  const parsedFamilyId = OntologyArtifactFamilyIdSchema.safeParse(
    ontologyArtifactFamilyId,
  );
  const parsedVersionTag = OntologyVersionTagSchema.safeParse(versionTag);

  if (!sha256Match || !parsedFamilyId.success || !parsedVersionTag.success) {
    throw new TypeError(
      "The ontology release query-index relative path is unsupported.",
    );
  }

  return Object.freeze({
    segments,
    ontologyArtifactFamilyId: parsedFamilyId.data,
    versionTag: parsedVersionTag.data,
    sha256: sha256Match[1],
  });
}
