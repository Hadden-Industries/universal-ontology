/**
 * Defines decoded-byte ceilings shared by query-artifact producers and browser
 * consumers. These are abuse and memory bounds, not ontology semantic limits.
 */

export const MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH = 1_048_576;
export const MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH = 65_536;
export const MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH = 8_388_608;
