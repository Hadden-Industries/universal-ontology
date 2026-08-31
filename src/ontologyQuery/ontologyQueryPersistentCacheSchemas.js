import * as z from "zod";

import {
  MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH,
  MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH,
} from "./ontologyQueryArtifactLimits.js";
import {
  OntologyQueryArtifactChannelNameSchema,
  OntologyQueryCatalogReferenceSchema,
} from "./ontologyQueryChannelManifestSchemas.js";
import { deepFreeze } from "./ontologyQuerySchemas.js";

const UTF_8_DECODER = new TextDecoder("utf-8", { fatal: true });
const UTF_8_ENCODER = new TextEncoder();
const SHA_256_HEXADECIMAL_PATTERN = /^[0-9a-f]{64}$/u;
const HTTP_ENTITY_TAG_PATTERN = /^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/u;
const IMF_FIXDATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u;

function isValidImfFixdate(value) {
  if (!IMF_FIXDATE_PATTERN.test(value)) {
    return false;
  }

  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toUTCString() === value
  );
}

const LowercaseSha256Schema = z.string().regex(SHA_256_HEXADECIMAL_PATTERN);

export const OntologyQueryChannelManifestCacheReferenceSchema = z.strictObject({
  sha256: LowercaseSha256Schema,
  byteLength: z
    .number()
    .int()
    .positive()
    .max(MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH),
});

export const OntologyQueryChannelManifestHttpValidatorSchema = z.strictObject({
  entityTag: z.string().max(1_024).regex(HTTP_ENTITY_TAG_PATTERN).nullable(),
  lastModifiedHttpDate: z
    .string()
    .max(128)
    .refine(isValidImfFixdate, "Expected an IMF-fixdate HTTP date.")
    .nullable(),
});

/** Exact append-only state persisted below one base-URL digest namespace. */
export const OntologyQueryChannelLastKnownGoodStateSchema = z.strictObject({
  persistentCacheStateKind: z.literal(
    "universal_ontology_query_channel_last_known_good_state",
  ),
  persistentCacheStateFormatVersion: z.literal(1),
  ontologyQueryArtifactBaseUrlSha256: LowercaseSha256Schema,
  ontologyQueryArtifactChannelName: OntologyQueryArtifactChannelNameSchema,
  ontologyQueryChannelManifestReference:
    OntologyQueryChannelManifestCacheReferenceSchema,
  ontologyQueryCatalogReference: OntologyQueryCatalogReferenceSchema,
  channelManifestHttpValidator: OntologyQueryChannelManifestHttpValidatorSchema,
});

function rebuildState(state) {
  const parsed = OntologyQueryChannelLastKnownGoodStateSchema.parse(state);

  return {
    persistentCacheStateKind: parsed.persistentCacheStateKind,
    persistentCacheStateFormatVersion: parsed.persistentCacheStateFormatVersion,
    ontologyQueryArtifactBaseUrlSha256:
      parsed.ontologyQueryArtifactBaseUrlSha256,
    ontologyQueryArtifactChannelName: parsed.ontologyQueryArtifactChannelName,
    ontologyQueryChannelManifestReference: {
      sha256: parsed.ontologyQueryChannelManifestReference.sha256,
      byteLength: parsed.ontologyQueryChannelManifestReference.byteLength,
    },
    ontologyQueryCatalogReference: {
      relativePath: parsed.ontologyQueryCatalogReference.relativePath,
      sha256: parsed.ontologyQueryCatalogReference.sha256,
      byteLength: parsed.ontologyQueryCatalogReference.byteLength,
    },
    channelManifestHttpValidator: {
      entityTag: parsed.channelManifestHttpValidator.entityTag,
      lastModifiedHttpDate:
        parsed.channelManifestHttpValidator.lastModifiedHttpDate,
    },
  };
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

/** Serialize one state with fixed field order, indentation, and final LF. */
export function serializeCanonicalOntologyQueryChannelLastKnownGoodState(
  state,
) {
  return UTF_8_ENCODER.encode(
    `${JSON.stringify(rebuildState(state), null, 2)}\n`,
  );
}

/** Parse one strict canonical state and recursively freeze the result. */
export function parseOntologyQueryChannelLastKnownGoodStateBytes(bytes) {
  let parsedJson;

  try {
    parsedJson = JSON.parse(UTF_8_DECODER.decode(asUint8Array(bytes)));
  } catch (error) {
    throw new TypeError(
      "The ontology query channel last-known-good state is not valid UTF-8 JSON.",
      { cause: error },
    );
  }

  let parsedState;

  try {
    parsedState =
      OntologyQueryChannelLastKnownGoodStateSchema.parse(parsedJson);
  } catch (error) {
    throw new TypeError(
      "The ontology query channel last-known-good state schema is unsupported.",
      { cause: error },
    );
  }

  if (
    !haveIdenticalBytes(
      bytes,
      serializeCanonicalOntologyQueryChannelLastKnownGoodState(parsedState),
    )
  ) {
    throw new TypeError(
      "The ontology query channel last-known-good state bytes are not canonical.",
    );
  }

  return deepFreeze(parsedState);
}

export const MAX_ONTOLOGY_QUERY_CHANNEL_LAST_KNOWN_GOOD_STATE_BYTE_LENGTH =
  Math.min(65_536, MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH);
