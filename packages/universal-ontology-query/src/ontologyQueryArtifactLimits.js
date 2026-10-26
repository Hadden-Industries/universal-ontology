/**
 * Defines decoded-byte ceilings and default cache capacities shared by query
 * implementations and their hosts. Artifact ceilings are abuse and memory
 * bounds; cache defaults remain overridable capacity choices.
 */

/** Default cache capacities, shared by query implementations and their hosts. */
export const DEFAULT_MAXIMUM_IN_MEMORY_QUERY_INDEX_CACHE_BYTE_SIZE =
  64 * 1024 * 1024;
export const DEFAULT_MAXIMUM_PERSISTENT_QUERY_ARTIFACT_CACHE_BYTE_SIZE = 536_870_912;

export const MAX_ONTOLOGY_QUERY_CATALOG_BYTE_LENGTH = 1_048_576;
export const MAX_ONTOLOGY_QUERY_CHANNEL_MANIFEST_BYTE_LENGTH = 65_536;
export const MAX_ONTOLOGY_RELEASE_QUERY_INDEX_BYTE_LENGTH = 8_388_608;
