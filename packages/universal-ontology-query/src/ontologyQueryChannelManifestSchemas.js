import * as z from "zod";

import { MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH } from "./ontologyQueryArtifactLimits.js";

export const ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAME_VALUES = Object.freeze([
  "stable",
  "development",
]);

export const OntologyQueryArtifactChannelNameSchema = z.enum(
  ONTOLOGY_QUERY_ARTIFACT_CHANNEL_NAME_VALUES,
);

const LowercaseSha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);

/**
 * An immutable catalog reference binds its normalized path, digest, and exact
 * decoded byte length. HTTP validators are deliberately excluded because they
 * are transport metadata rather than artifact identity.
 */
export const OntologyQueryCatalogReferenceSchema = z
  .strictObject({
    relativePath: z.string(),
    sha256: LowercaseSha256Schema,
    byteLength: z
      .number()
      .int()
      .positive()
      .max(MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH),
  })
  .superRefine(({ relativePath, sha256 }, context) => {
    if (relativePath !== `catalogs/${sha256}.json`) {
      context.addIssue({
        code: "custom",
        path: ["relativePath"],
        message:
          "Catalog relativePath must exactly identify the declared SHA-256 digest.",
      });
    }
  });

/** Exact v1 document used to select one immutable catalog by channel. */
export const OntologyQueryChannelManifestSchema = z.strictObject({
  queryArtifactKind: z.literal("universal_ontology_query_channel_manifest"),
  queryArtifactFormatVersion: z.literal(1),
  ontologyQueryArtifactChannelName: OntologyQueryArtifactChannelNameSchema,
  ontologyQueryCatalogReference: OntologyQueryCatalogReferenceSchema,
});
