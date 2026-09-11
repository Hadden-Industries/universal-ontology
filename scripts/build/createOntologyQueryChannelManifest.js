import { freezeJsonValueDeeply } from "universal-ontology-query/json-value-immutability";
import {
  serializeCanonicalOntologyQueryJsonDocument,
  MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH,
  OntologyQueryChannelManifestSchema,
} from "universal-ontology-query/artifacts";

/**
 * Build the canonical v1 channel document that binds one mutable channel name
 * to one immutable catalog identity. Publication and filesystem durability are
 * intentionally outside this pure construction boundary.
 */
export function createOntologyQueryChannelManifest({
  ontologyQueryArtifactChannelName,
  ontologyQueryCatalogReference,
}) {
  const channelManifest = freezeJsonValueDeeply(
    OntologyQueryChannelManifestSchema.parse({
      queryArtifactKind: "universal_ontology_query_channel_manifest",
      queryArtifactFormatVersion: 1,
      ontologyQueryArtifactChannelName,
      ontologyQueryCatalogReference,
    }),
  );
  const channelManifestContent = Buffer.from(
    serializeCanonicalOntologyQueryJsonDocument(channelManifest),
  );

  if (
    channelManifestContent.byteLength >
    MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH
  ) {
    throw new RangeError(
      "The ontology query channel manifest exceeds its decoded-byte limit.",
    );
  }

  return Object.freeze({ channelManifest, channelManifestContent });
}
