import {
  AbsoluteIriSchema,
  OntologyArtifactFamilyIdSchema,
  OntologyVersionTagSchema,
  deepFreeze,
} from "../ontologyQuery/ontologyQuerySchemas.js";

const INDEXED_DOCUMENT_VERSION_ALIASES = new Set(["latest", "latest-unstable"]);

function parseAbsoluteUrl(value, valueName) {
  if (typeof value !== "string") {
    throw new TypeError(`${valueName} must be an absolute URL string.`);
  }

  try {
    return new URL(value);
  } catch (cause) {
    throw new TypeError(`${valueName} must be an absolute URL string.`, {
      cause,
    });
  }
}

function requireEligiblePageRoot(ontologyPageRootIri) {
  const pageRoot = parseAbsoluteUrl(ontologyPageRootIri, "ontologyPageRootIri");

  if (
    !["http:", "https:"].includes(pageRoot.protocol) ||
    pageRoot.username !== "" ||
    pageRoot.password !== "" ||
    pageRoot.search !== "" ||
    pageRoot.hash !== "" ||
    !pageRoot.pathname.endsWith("/")
  ) {
    throw new TypeError(
      "ontologyPageRootIri must be a slash-terminated HTTP(S) URL " +
        "without credentials, a query, or a fragment.",
    );
  }

  return pageRoot;
}

function requireContainedOntologyDocumentUrl({
  ontologyDocumentIri,
  pageRoot,
}) {
  const ontologyDocumentUrl = parseAbsoluteUrl(
    ontologyDocumentIri,
    "ontologyDocumentIri",
  );

  if (
    !["http:", "https:"].includes(ontologyDocumentUrl.protocol) ||
    ontologyDocumentUrl.username !== "" ||
    ontologyDocumentUrl.password !== "" ||
    ontologyDocumentUrl.search !== "" ||
    ontologyDocumentUrl.hash !== "" ||
    ontologyDocumentUrl.origin !== pageRoot.origin ||
    !ontologyDocumentUrl.pathname.startsWith(pageRoot.pathname)
  ) {
    throw new TypeError(
      "ontologyDocumentIri must be a contained same-origin HTTP(S) " +
        "document URL without credentials, a query, or a fragment.",
    );
  }

  const relativePath = ontologyDocumentUrl.pathname.slice(
    pageRoot.pathname.length,
  );
  const pathSegments = relativePath.split("/");

  if (
    relativePath === "" ||
    pathSegments.some((pathSegment) => pathSegment === "")
  ) {
    throw new TypeError(
      "ontologyDocumentIri must identify one ontology document below the page root.",
    );
  }

  return { ontologyDocumentUrl, pathSegments };
}

function normalizeOptionalString(value, valueName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new TypeError(`${valueName} must be a string or null.`);
  }

  return value;
}

function normalizeOptionalAbsoluteIri(value, valueName) {
  const normalizedValue = normalizeOptionalString(value, valueName);
  return normalizedValue === null
    ? null
    : AbsoluteIriSchema.parse(normalizedValue);
}

function deriveVersionTag(versionIri) {
  const parsedVersionIri = parseAbsoluteUrl(versionIri, "versionIri");
  const versionPathSegments = parsedVersionIri.pathname
    .split("/")
    .filter(Boolean);
  const finalVersionPathSegment = versionPathSegments.at(-1);

  return OntologyVersionTagSchema.parse(finalVersionPathSegment);
}

/**
 * Map the exact source document represented by the page to one immutable
 * query-artifact release. Structurally valid but unindexed document variants
 * return null; malformed documents that claim an indexed identity throw.
 *
 * @param {object} options
 * @param {object} options.ontologyDocumentMetadata
 * @param {string} options.ontologyDocumentIri
 * @param {string} options.ontologyPageRootIri
 * @returns {Readonly<object>|null}
 */
export function tryCreateDisplayedOntologyReleaseContext({
  ontologyDocumentMetadata,
  ontologyDocumentIri,
  ontologyPageRootIri,
}) {
  const pageRoot = requireEligiblePageRoot(ontologyPageRootIri);
  const { ontologyDocumentUrl, pathSegments } =
    requireContainedOntologyDocumentUrl({ ontologyDocumentIri, pageRoot });
  const documentVersionSegment = pathSegments.at(-1);
  const documentVersionAlias = INDEXED_DOCUMENT_VERSION_ALIASES.has(
    documentVersionSegment,
  )
    ? documentVersionSegment
    : null;
  const immutableDocumentVersion = OntologyVersionTagSchema.safeParse(
    documentVersionSegment,
  );

  // Classification deliberately precedes metadata validation: a full-closure
  // or preview document is outside artifact v1, not a malformed release.
  if (documentVersionAlias === null && !immutableDocumentVersion.success) {
    return null;
  }

  const ontologyArtifactFamilyId = OntologyArtifactFamilyIdSchema.parse(
    pathSegments.slice(0, -1).join("/"),
  );

  if (
    !ontologyDocumentMetadata ||
    typeof ontologyDocumentMetadata !== "object" ||
    Array.isArray(ontologyDocumentMetadata)
  ) {
    throw new TypeError("ontologyDocumentMetadata must be an object.");
  }

  const ontologyIri = AbsoluteIriSchema.parse(
    ontologyDocumentMetadata.ontologyIri,
  );
  const versionIri = AbsoluteIriSchema.parse(
    ontologyDocumentMetadata.versionIri,
  );
  const versionTag = deriveVersionTag(versionIri);

  if (documentVersionAlias === null && documentVersionSegment !== versionTag) {
    throw new TypeError(
      `The ontology document version "${documentVersionSegment}" does not ` +
        `match authored version "${versionTag}".`,
    );
  }

  return deepFreeze({
    ontologyArtifactFamilyId,
    versionTag,
    ontologyIri,
    ontologyTitle: normalizeOptionalString(
      ontologyDocumentMetadata.ontologyTitle,
      "ontologyTitle",
    ),
    versionIri,
    versionInfo: normalizeOptionalString(
      ontologyDocumentMetadata.versionInfo,
      "versionInfo",
    ),
    priorVersionIri: normalizeOptionalAbsoluteIri(
      ontologyDocumentMetadata.priorVersionIri,
      "priorVersionIri",
    ),
    ontologyDocumentIri: ontologyDocumentUrl.href,
    documentVersionAlias,
  });
}
