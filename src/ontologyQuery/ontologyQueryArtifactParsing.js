import { serializeCanonicalOntologyQueryJsonDocument } from "./ontologyQueryArtifactCanonicalBytes.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
import { OntologyQueryChannelManifestSchema } from "./ontologyQueryChannelManifestSchemas.js";
import {
  OntologyQueryCatalogSchema,
  OntologyReleaseQueryIndexSchema,
  deepFreeze,
} from "./ontologyQuerySchemas.js";

const UTF_8_DECODER = new TextDecoder("utf-8", { fatal: true });

function asUint8Array(bytes) {
  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  throw new TypeError("bytes must be an ArrayBuffer or an ArrayBuffer view.");
}

function haveIdenticalBytes(left, right) {
  const leftView = asUint8Array(left);
  const rightView = asUint8Array(right);

  if (leftView.byteLength !== rightView.byteLength) {
    return false;
  }

  for (let index = 0; index < leftView.byteLength; index += 1) {
    if (leftView[index] !== rightView[index]) {
      return false;
    }
  }

  return true;
}

function parseJsonBytes(bytes, invalidJsonMessage) {
  try {
    // Fatal decoding prevents corrupt UTF-8 from being repaired with U+FFFD
    // before the schema and canonical-byte invariants are evaluated.
    return JSON.parse(UTF_8_DECODER.decode(asUint8Array(bytes)));
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: invalidJsonMessage,
      cause: error,
    });
  }
}

function parseCanonicalArtifactBytes({
  bytes,
  expectedArtifactKind,
  schema,
  invalidJsonMessage,
  unsupportedFormatMessage,
  unsupportedSchemaMessage,
  noncanonicalBytesMessage,
}) {
  const parsedJson = parseJsonBytes(bytes, invalidJsonMessage);

  if (
    parsedJson?.queryArtifactKind !== expectedArtifactKind ||
    parsedJson?.queryArtifactFormatVersion !== 1
  ) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: unsupportedFormatMessage,
    });
  }

  let parsedArtifact;

  try {
    parsedArtifact = schema.parse(parsedJson);
  } catch (error) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: unsupportedSchemaMessage,
      cause: error,
    });
  }

  const canonicalBytes =
    serializeCanonicalOntologyQueryJsonDocument(parsedArtifact);

  if (!haveIdenticalBytes(bytes, canonicalBytes)) {
    throw new OntologyQueryError("QUERY_INDEX_SCHEMA_UNSUPPORTED", {
      message: noncanonicalBytesMessage,
    });
  }

  return deepFreeze(parsedArtifact);
}

/** Parse and freeze one canonical ontology query-index catalog. */
export function parseOntologyQueryCatalogBytes(bytes) {
  return parseCanonicalArtifactBytes({
    bytes,
    expectedArtifactKind: "universal_ontology_query_catalog",
    schema: OntologyQueryCatalogSchema,
    invalidJsonMessage:
      "The ontology query-index catalog is not valid UTF-8 JSON.",
    unsupportedFormatMessage:
      "The ontology query-index catalog format is unsupported.",
    unsupportedSchemaMessage:
      "The ontology query-index catalog schema is unsupported.",
    noncanonicalBytesMessage:
      "The ontology query-index catalog bytes are not canonical.",
  });
}

/** Parse and freeze one canonical stable or development channel manifest. */
export function parseOntologyQueryChannelManifestBytes(bytes) {
  return parseCanonicalArtifactBytes({
    bytes,
    expectedArtifactKind: "universal_ontology_query_channel_manifest",
    schema: OntologyQueryChannelManifestSchema,
    invalidJsonMessage:
      "The ontology query channel manifest is not valid UTF-8 JSON.",
    unsupportedFormatMessage:
      "The ontology query channel-manifest format is unsupported.",
    unsupportedSchemaMessage:
      "The ontology query channel-manifest schema is unsupported.",
    noncanonicalBytesMessage:
      "The ontology query channel-manifest bytes are not canonical.",
  });
}

/** Parse and freeze one canonical ontology release query index. */
export function parseOntologyReleaseQueryIndexBytes(bytes) {
  return parseCanonicalArtifactBytes({
    bytes,
    expectedArtifactKind: "universal_ontology_release_query_index",
    schema: OntologyReleaseQueryIndexSchema,
    invalidJsonMessage:
      "The ontology release query index is not valid UTF-8 JSON.",
    unsupportedFormatMessage:
      "The ontology release query-index format is unsupported.",
    unsupportedSchemaMessage:
      "The ontology release query-index schema is unsupported.",
    noncanonicalBytesMessage:
      "The ontology release query-index bytes are not canonical.",
  });
}
