import { serializeCanonicalOntologyQueryJsonDocument } from "../../src/ontologyQuery/ontologyQueryArtifactCanonicalBytes.js";
import { MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH } from "../../src/ontologyQuery/ontologyQueryArtifactLimits.js";
import { OntologyQueryChannelManifestSchema } from "../../src/ontologyQuery/ontologyQueryChannelManifestSchemas.js";
import { deepFreeze } from "../../src/ontologyQuery/ontologyQuerySchemas.js";

/**
 * Build the canonical v1 channel document that binds one mutable channel name
 * to one immutable catalog identity. Publication and filesystem durability are
 * intentionally outside this pure construction boundary.
 */
export function createOntologyQueryChannelManifest({
  ontologyQueryArtifactChannelName,
  ontologyQueryCatalogReference,
}) {
  const channelManifest = deepFreeze(
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
