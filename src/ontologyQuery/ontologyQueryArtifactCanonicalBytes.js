import { OntologyQueryError } from "./ontologyQueryErrors.js";
import { OntologyQueryChannelManifestSchema } from "./ontologyQueryChannelManifestSchemas.js";
import {
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
} from "./ontologyQuerySchemas.js";

const UTF_8_ENCODER = new TextEncoder();
const SHA_256_HEXADECIMAL_PATTERN = /^[0-9a-f]{64}$/u;

function rebuildRdfLiteralValue(value) {
  return {
    lexicalForm: value.lexicalForm,
    datatypeIri: value.datatypeIri,
    languageTag: value.languageTag,
  };
}

function rebuildRdfObjectValue(value) {
  if (value.termKind === "named_node") {
    return {
      termKind: value.termKind,
      iri: value.iri,
    };
  }

  return {
    termKind: value.termKind,
    value: rebuildRdfLiteralValue(value.value),
  };
}

function rebuildAssertionAnnotation(annotation) {
  return {
    annotationPropertyIri: annotation.annotationPropertyIri,
    annotationValue: rebuildRdfObjectValue(annotation.annotationValue),
  };
}

function rebuildRdfObjectAssertion(assertion) {
  return {
    assertionPropertyIri: assertion.assertionPropertyIri,
    objectValue: rebuildRdfObjectValue(assertion.objectValue),
    assertionAnnotations: assertion.assertionAnnotations.map(
      rebuildAssertionAnnotation,
    ),
  };
}

function rebuildLexicalAssertion(assertion) {
  return {
    assertionPropertyIri: assertion.assertionPropertyIri,
    literalValue: rebuildRdfLiteralValue(assertion.literalValue),
    assertionAnnotations: assertion.assertionAnnotations.map(
      rebuildAssertionAnnotation,
    ),
  };
}

function rebuildResolvedOntologyRelease(release) {
  return {
    ontologyArtifactFamilyId: release.ontologyArtifactFamilyId,
    versionTag: release.versionTag,
    sourceArtifactUrl: release.sourceArtifactUrl,
    sourceArtifactSha256: release.sourceArtifactSha256,
    ontologyIri: release.ontologyIri,
    versionIri: release.versionIri,
  };
}

function rebuildIndexedOntologyEntityDescription(description) {
  return {
    entityIri: description.entityIri,
    resolvedOntologyRelease: rebuildResolvedOntologyRelease(
      description.resolvedOntologyRelease,
    ),
    assertionScope: description.assertionScope,
    entityKinds: [...description.entityKinds],
    identifierAssertions: description.identifierAssertions.map(
      rebuildRdfObjectAssertion,
    ),
    creatorAssertions: description.creatorAssertions.map(
      rebuildRdfObjectAssertion,
    ),
    preferredLabelAssertions: description.preferredLabelAssertions.map(
      rebuildLexicalAssertion,
    ),
    alternativeLabelAssertions: description.alternativeLabelAssertions.map(
      rebuildLexicalAssertion,
    ),
    lexicalDefinitionAssertions: description.lexicalDefinitionAssertions.map(
      rebuildLexicalAssertion,
    ),
    scopeNoteAssertions: description.scopeNoteAssertions.map(
      rebuildLexicalAssertion,
    ),
    entitySourceIris: [...description.entitySourceIris],
    seeAlsoIris: [...description.seeAlsoIris],
    directNamedSuperclassIris: [...description.directNamedSuperclassIris],
    assertedClassMembershipIris: [...description.assertedClassMembershipIris],
  };
}

function rebuildOntologyQueryCatalogRelease(release) {
  return {
    ontologyArtifactFamilyId: release.ontologyArtifactFamilyId,
    versionTag: release.versionTag,
    latestStableRelease: release.latestStableRelease,
    sourceArtifactRelativePath: release.sourceArtifactRelativePath,
    sourceArtifactUrl: release.sourceArtifactUrl,
    sourceArtifactSha256: release.sourceArtifactSha256,
    queryIndexRelativePath: release.queryIndexRelativePath,
    queryIndexSha256: release.queryIndexSha256,
  };
}

function rebuildOntologyQueryCatalog(document) {
  const catalog = OntologyQueryCatalogSchema.parse(document);

  return {
    queryArtifactKind: catalog.queryArtifactKind,
    queryArtifactFormatVersion: catalog.queryArtifactFormatVersion,
    releases: catalog.releases.map(rebuildOntologyQueryCatalogRelease),
  };
}

function rebuildOntologyQueryChannelManifest(document) {
  const manifest = OntologyQueryChannelManifestSchema.parse(document);

  return {
    queryArtifactKind: manifest.queryArtifactKind,
    queryArtifactFormatVersion: manifest.queryArtifactFormatVersion,
    ontologyQueryArtifactChannelName: manifest.ontologyQueryArtifactChannelName,
    ontologyQueryCatalogReference: {
      relativePath: manifest.ontologyQueryCatalogReference.relativePath,
      sha256: manifest.ontologyQueryCatalogReference.sha256,
      byteLength: manifest.ontologyQueryCatalogReference.byteLength,
    },
  };
}

function rebuildOntologyReleaseQueryIndex(document) {
  const queryIndex = OntologyReleaseQueryIndexSchema.parse(document);

  return {
    queryArtifactKind: queryIndex.queryArtifactKind,
    queryArtifactFormatVersion: queryIndex.queryArtifactFormatVersion,
    resolvedOntologyRelease: rebuildResolvedOntologyRelease(
      queryIndex.resolvedOntologyRelease,
    ),
    ontologyEntityDescriptions: queryIndex.ontologyEntityDescriptions.map(
      rebuildIndexedOntologyEntityDescription,
    ),
  };
}

function rebuildOntologyQueryArtifact(document) {
  switch (document?.queryArtifactKind) {
    case "universal_ontology_query_channel_manifest":
      return rebuildOntologyQueryChannelManifest(document);
    case "universal_ontology_query_catalog":
      return rebuildOntologyQueryCatalog(document);
    case "universal_ontology_release_query_index":
      return rebuildOntologyReleaseQueryIndex(document);
    default:
      throw new TypeError(
        `Unsupported ontology query artifact kind: ${String(document?.queryArtifactKind)}`,
      );
  }
}

function asUint8Array(bytes) {
  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  throw new TypeError("bytes must be an ArrayBuffer or an ArrayBuffer view.");
}

/**
 * Serialize one supported ontology query artifact to its versioned wire form.
 *
 * Strict schema parsing rejects undeclared fields. Rebuilding every object in
 * schema order makes byte identity independent of caller insertion order and,
 * in particular, avoids JavaScript's special enumeration of integer-like
 * property names. Arrays retain their schema-defined semantic order.
 */
export function serializeCanonicalOntologyQueryJsonDocument(document) {
  const canonicalDocument = rebuildOntologyQueryArtifact(document);
  return UTF_8_ENCODER.encode(
    `${JSON.stringify(canonicalDocument, null, 2)}\n`,
  );
}

/** Return the lowercase SHA-256 hexadecimal digest of the exact input bytes. */
export async function calculateSha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    asUint8Array(bytes),
  );

  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify an immutable artifact reference before any semantic interpretation.
 * Length and digest failures deliberately share the existing public integrity
 * error so callers never receive storage- or transport-specific details.
 */
export async function verifyCanonicalArtifactReference({
  bytes,
  expectedByteLength,
  expectedSha256,
}) {
  const byteView = asUint8Array(bytes);

  if (!Number.isSafeInteger(expectedByteLength) || expectedByteLength < 0) {
    throw new TypeError(
      "expectedByteLength must be a non-negative safe integer.",
    );
  }

  if (!SHA_256_HEXADECIMAL_PATTERN.test(expectedSha256)) {
    throw new TypeError(
      "expectedSha256 must be a lowercase SHA-256 hexadecimal digest.",
    );
  }

  if (byteView.byteLength !== expectedByteLength) {
    throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
  }

  if ((await calculateSha256(byteView)) !== expectedSha256) {
    throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
  }
}
