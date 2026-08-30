import * as z from "zod";

const GREGORIAN_DATE_VERSION_PATTERN = /^(\d{4})(\d{2})(\d{2})$/u;

export const RDF_LANG_STRING_DATATYPE_IRI =
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString";
export const XSD_STRING_DATATYPE_IRI =
  "http://www.w3.org/2001/XMLSchema#string";

// RFC 5646 permits grandfathered tags in addition to the common language,
// script, region, variant, extension, and private-use productions. Keeping
// the grammar as a regular expression makes it available to advertised JSON
// Schema instead of hiding validation inside a runtime-only transform.
const BCP_47_LANGUAGE_TAG_PATTERN = new RegExp(
  "^(?:" +
    "(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4}|[A-Za-z]{5,8})" +
    "(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?" +
    "(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*" +
    "(?:-[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+)*" +
    "(?:-x(?:-[A-Za-z0-9]{1,8})+)?" +
    "|x(?:-[A-Za-z0-9]{1,8})+" +
    "|(?:en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|" +
    "i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|" +
    "sgn-BE-NL|sgn-CH-DE|art-lojban|cel-gaulish|no-bok|no-nyn|" +
    "zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang)" +
    ")$",
  "u",
);

function isGregorianDateVersion(value) {
  const match = GREGORIAN_DATE_VERSION_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/**
 * A family identifier is a stable repository-relative path, not an ontology
 * IRI or a release identifier. Requiring normalized POSIX segments keeps the
 * same value safe for catalogs, cache keys, and contained filesystem paths.
 */
export const OntologyArtifactFamilyIdSchema = z
  .string()
  .min(1)
  .regex(/^(?!(?:.*\/)?\.{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u);

/** One immutable ontology release name supported by the source repository. */
export const OntologyVersionTagSchema = z
  .string()
  .regex(/^(?:\d{8}|v[1-9][0-9]*)$/u)
  .refine(
    (value) => value.startsWith("v") || isGregorianDateVersion(value),
    "Eight-digit ontology version tags must be valid Gregorian dates.",
  );

/**
 * Absolute IRI syntax used by this repository. Full RFC 3987 normalization is
 * deliberately not performed: authored IRIs are identifiers and presentation
 * values whose spelling must survive a query unchanged.
 */
export const AbsoluteIriSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/u);

/** RFC 9562 UUID URN, accepting case-insensitive hexadecimal authored forms. */
export const UuidUrnSchema = z
  .string()
  .regex(
    /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,
  );

/** A syntactically valid RFC 5646/BCP 47 language tag. */
export const Bcp47LanguageTagSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(BCP_47_LANGUAGE_TAG_PATTERN);

export const ONTOLOGY_ENTITY_KIND_VALUES = Object.freeze([
  "owl_class",
  "owl_object_property",
  "owl_datatype_property",
  "owl_annotation_property",
  "owl_named_individual",
  "rdfs_datatype",
]);

export const OntologyEntityKindSchema = z.enum(ONTOLOGY_ENTITY_KIND_VALUES);

export const DEFAULT_ONTOLOGY_ARTIFACT_FAMILY_IDS = Object.freeze([
  "universal/core",
  "universal/extended",
  "universal/reference-data",
]);

export const NonBlankOntologyLookupTextSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/u);

export const PreferredLanguageTagsSchema = z
  .array(Bcp47LanguageTagSchema)
  .min(1)
  .max(16);

const SpecifiedOntologyReleaseSchema = z.strictObject({
  ontologyArtifactFamilyId: OntologyArtifactFamilyIdSchema,
  versionTag: OntologyVersionTagSchema,
});

export const OntologyReleaseSelectionSchema = z.discriminatedUnion(
  "selectionKind",
  [
    z.strictObject({
      selectionKind: z.literal("latest_stable_releases"),
      ontologyArtifactFamilyIds: z
        .array(OntologyArtifactFamilyIdSchema)
        .min(1)
        .max(16)
        .optional(),
    }),
    z.strictObject({
      selectionKind: z.literal("specified_releases"),
      ontologyReleases: z.array(SpecifiedOntologyReleaseSchema).min(1).max(16),
    }),
  ],
);

/**
 * This schema is both the runtime validation seam and the Standard Schema
 * source from which MCP emits JSON Schema 2020-12. It deliberately contains
 * no trimming transform; validation must apply to the raw caller value.
 */
export const SearchOntologyEntitiesInputSchema = z.strictObject({
  queryText: NonBlankOntologyLookupTextSchema,
  ontologyReleaseSelection: OntologyReleaseSelectionSchema.optional(),
  entityKinds: z
    .array(OntologyEntityKindSchema)
    .min(1)
    .max(ONTOLOGY_ENTITY_KIND_VALUES.length)
    .optional(),
  preferredLanguageTags: PreferredLanguageTagsSchema.default(["en-GB", "en"]),
  maximumResultCount: z.number().int().min(1).max(20).default(10),
});

export const OntologyEntityIdentifierSchema = z.discriminatedUnion(
  "identifierKind",
  [
    z.strictObject({
      identifierKind: z.literal("entity_iri"),
      identifierValue: AbsoluteIriSchema,
    }),
    z.strictObject({
      identifierKind: z.literal("uuid_urn"),
      identifierValue: UuidUrnSchema,
    }),
    z.strictObject({
      identifierKind: z.literal("preferred_label"),
      identifierValue: NonBlankOntologyLookupTextSchema,
    }),
  ],
);

export const ResolveOntologyEntityInputSchema = z.strictObject({
  entityIdentifier: OntologyEntityIdentifierSchema,
  ontologyReleaseSelection: OntologyReleaseSelectionSchema.optional(),
  preferredLanguageTags: PreferredLanguageTagsSchema.default(["en-GB", "en"]),
});

/**
 * RDF literal values preserve the exact lexical form. RDF assigns
 * `rdf:langString` to language-tagged strings and forbids language tags on
 * every other datatype; treating those as independent optional fields would
 * permit RDF terms that cannot exist.
 */
export const RdfLiteralValueSchema = z
  .strictObject({
    lexicalForm: z.string(),
    datatypeIri: AbsoluteIriSchema,
    languageTag: Bcp47LanguageTagSchema.nullable(),
  })
  .superRefine(({ datatypeIri, languageTag }, context) => {
    const carriesLanguageTag = languageTag !== null;
    const isLanguageString = datatypeIri === RDF_LANG_STRING_DATATYPE_IRI;

    if (carriesLanguageTag !== isLanguageString) {
      context.addIssue({
        code: "custom",
        message:
          "Only rdf:langString literals carry a language tag, and every " +
          "rdf:langString literal must carry one.",
      });
    }
  });

export const RdfObjectValueSchema = z.discriminatedUnion("termKind", [
  z.strictObject({
    termKind: z.literal("named_node"),
    iri: AbsoluteIriSchema,
  }),
  z.strictObject({
    termKind: z.literal("literal"),
    value: RdfLiteralValueSchema,
  }),
]);

export const AssertionAnnotationSchema = z.strictObject({
  annotationPropertyIri: AbsoluteIriSchema,
  annotationValue: RdfObjectValueSchema,
});

export const RdfObjectAssertionSchema = z.strictObject({
  assertionPropertyIri: AbsoluteIriSchema,
  objectValue: RdfObjectValueSchema,
  assertionAnnotations: z.array(AssertionAnnotationSchema),
});

export const LexicalAssertionSchema = z.strictObject({
  assertionPropertyIri: AbsoluteIriSchema,
  literalValue: RdfLiteralValueSchema,
  assertionAnnotations: z.array(AssertionAnnotationSchema),
});

export const ResolvedOntologyReleaseSchema = z.strictObject({
  ontologyArtifactFamilyId: OntologyArtifactFamilyIdSchema,
  versionTag: OntologyVersionTagSchema,
  sourceArtifactUrl: AbsoluteIriSchema,
  sourceArtifactSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  ontologyIri: AbsoluteIriSchema,
  versionIri: AbsoluteIriSchema,
});

export const SelectedLexicalAssertionSchema = z.strictObject({
  resolvedOntologyRelease: ResolvedOntologyReleaseSchema,
  assertionPropertyIri: AbsoluteIriSchema,
  literalValue: RdfLiteralValueSchema,
  selectionBasis: z.enum([
    "preferred_language_exact",
    "preferred_language_lookup",
    "untagged",
    "deterministic_fallback",
  ]),
});

export const OntologyEntityDescriptionSchema = z.strictObject({
  resolvedOntologyRelease: ResolvedOntologyReleaseSchema,
  assertionScope: z.literal("source_artifact_graph"),
  entityKinds: z.array(OntologyEntityKindSchema).min(1),
  identifierAssertions: z.array(RdfObjectAssertionSchema),
  creatorAssertions: z.array(RdfObjectAssertionSchema),
  preferredLabelAssertions: z.array(LexicalAssertionSchema),
  alternativeLabelAssertions: z.array(LexicalAssertionSchema),
  lexicalDefinitionAssertions: z.array(LexicalAssertionSchema),
  scopeNoteAssertions: z.array(LexicalAssertionSchema),
  entitySourceIris: z.array(AbsoluteIriSchema),
  seeAlsoIris: z.array(AbsoluteIriSchema),
  directNamedSuperclassIris: z.array(AbsoluteIriSchema),
  assertedClassMembershipIris: z.array(AbsoluteIriSchema),
});

/**
 * A release artifact stores one source-graph description per entity. The
 * entity IRI is adjacent to that description on disk; runtime aggregation can
 * then group the same IRI across releases without losing graph provenance.
 */
export const IndexedOntologyEntityDescriptionSchema = z.strictObject({
  entityIri: AbsoluteIriSchema,
  ...OntologyEntityDescriptionSchema.shape,
});

export const OntologyEntitySchema = z.strictObject({
  entityIri: AbsoluteIriSchema,
  selectedPreferredLabel: SelectedLexicalAssertionSchema.nullable(),
  selectedLexicalDefinition: SelectedLexicalAssertionSchema.nullable(),
  sourceArtifactDescriptions: z.array(OntologyEntityDescriptionSchema).min(1),
});

export const OntologyQueryCatalogReleaseSchema = z.strictObject({
  ontologyArtifactFamilyId: OntologyArtifactFamilyIdSchema,
  versionTag: OntologyVersionTagSchema,
  latestStableRelease: z.boolean(),
  sourceArtifactRelativePath: z
    .string()
    .regex(/^(?!(?:.*\/)?\.{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u),
  sourceArtifactUrl: AbsoluteIriSchema,
  sourceArtifactSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  queryIndexRelativePath: z
    .string()
    .regex(/^(?!(?:.*\/)?\.{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u),
  queryIndexSha256: z.string().regex(/^[0-9a-f]{64}$/u),
});

export const OntologyQueryCatalogSchema = z.strictObject({
  queryArtifactKind: z.literal("universal_ontology_query_catalog"),
  queryArtifactFormatVersion: z.literal(1),
  releases: z.array(OntologyQueryCatalogReleaseSchema),
});

export const OntologyReleaseQueryIndexSchema = z.strictObject({
  queryArtifactKind: z.literal("universal_ontology_release_query_index"),
  queryArtifactFormatVersion: z.literal(1),
  resolvedOntologyRelease: ResolvedOntologyReleaseSchema,
  ontologyEntityDescriptions: z.array(IndexedOntologyEntityDescriptionSchema),
});

export const MatchedOntologyValueSchema = z.discriminatedUnion(
  "matchedValueKind",
  [
    z.strictObject({
      matchedValueKind: z.literal("rdf_literal"),
      assertionPropertyIri: AbsoluteIriSchema,
      literalValue: RdfLiteralValueSchema,
    }),
    z.strictObject({
      matchedValueKind: z.literal("named_node_iri"),
      assertionPropertyIri: AbsoluteIriSchema.nullable(),
      iri: AbsoluteIriSchema,
    }),
  ],
);

export const ONTOLOGY_ENTITY_MATCH_BASIS_VALUES = Object.freeze([
  "preferred_label_exact",
  "alternative_label_exact",
  "identifier_exact",
  "iri_local_name_exact",
  "preferred_label_prefix",
  "alternative_label_prefix",
  "preferred_label_substring",
  "alternative_label_substring",
  "lexical_definition_exact",
  "lexical_definition_token_coverage",
  "lexical_definition_substring",
]);

export const OntologyEntitySearchMatchSchema = z.strictObject({
  matchRank: z.number().int().positive(),
  matchBasis: z.enum(ONTOLOGY_ENTITY_MATCH_BASIS_VALUES),
  matchedOntologyValue: MatchedOntologyValueSchema,
  ontologyEntity: OntologyEntitySchema,
});

export const OntologyEntitySearchSuccessSchema = z.strictObject({
  outcome: z.literal("success"),
  resultKind: z.literal("ontology_entity_search"),
  queryText: NonBlankOntologyLookupTextSchema,
  preferredLanguageTags: PreferredLanguageTagsSchema,
  resolvedOntologyReleases: z.array(ResolvedOntologyReleaseSchema).min(1),
  totalMatchedEntityCount: z.number().int().nonnegative(),
  returnedEntityCount: z.number().int().nonnegative(),
  resultSetTruncated: z.boolean(),
  matches: z.array(OntologyEntitySearchMatchSchema),
});

export const OntologyEntityResolutionSuccessSchema = z.strictObject({
  outcome: z.literal("success"),
  resultKind: z.literal("ontology_entity_resolution"),
  resolutionStatus: z.enum(["found", "ambiguous", "not_found"]),
  requestedEntityIdentifier: OntologyEntityIdentifierSchema,
  preferredLanguageTags: PreferredLanguageTagsSchema,
  resolvedOntologyReleases: z.array(ResolvedOntologyReleaseSchema).min(1),
  ontologyEntities: z.array(OntologyEntitySchema),
});

function hasCaseInsensitiveDuplicates(values) {
  const normalizedValues = values.map((value) => value.toLowerCase());
  return new Set(normalizedValues).size !== normalizedValues.length;
}

function validateVersionTagSemantics(versionTag) {
  if (!versionTag.startsWith("v") && !isGregorianDateVersion(versionTag)) {
    throw new TypeError(
      `Ontology version tag "${versionTag}" is not a valid Gregorian date.`,
    );
  }
}

function validateOntologyReleaseSelectionSemantics(selection) {
  if (!selection) {
    return;
  }

  if (selection.selectionKind === "latest_stable_releases") {
    const familyIds = selection.ontologyArtifactFamilyIds ?? [];

    if (new Set(familyIds).size !== familyIds.length) {
      throw new TypeError("Ontology artifact family IDs must be unique.");
    }

    return;
  }

  const releaseKeys = new Set();

  for (const release of selection.ontologyReleases) {
    validateVersionTagSemantics(release.versionTag);
    const key = `${release.ontologyArtifactFamilyId}\u0000${release.versionTag}`;

    if (releaseKeys.has(key)) {
      throw new TypeError("Specified ontology releases must be unique.");
    }

    releaseKeys.add(key);
  }
}

function validateCommonQueryInputSemantics(parsedInput) {
  if (hasCaseInsensitiveDuplicates(parsedInput.preferredLanguageTags)) {
    throw new TypeError(
      "Preferred language tags must be unique case-insensitively.",
    );
  }

  validateOntologyReleaseSelectionSemantics(
    parsedInput.ontologyReleaseSelection,
  );
}

/** Deep-freeze a validated JSON value so cacheable query inputs cannot drift. */
export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

/** Parse and deeply freeze one raw search request. */
export function parseSearchOntologyEntitiesInput(value) {
  const parsedInput = SearchOntologyEntitiesInputSchema.parse(value);
  validateCommonQueryInputSemantics(parsedInput);

  if (
    parsedInput.entityKinds &&
    new Set(parsedInput.entityKinds).size !== parsedInput.entityKinds.length
  ) {
    throw new TypeError("Entity kinds must be unique.");
  }

  return deepFreeze(parsedInput);
}

/** Parse and deeply freeze one exact-resolution request. */
export function parseResolveOntologyEntityInput(value) {
  const parsedInput = ResolveOntologyEntityInputSchema.parse(value);
  validateCommonQueryInputSemantics(parsedInput);
  return deepFreeze(parsedInput);
}

/** Parse an ontology artifact family identifier at a trust boundary. */
export function parseOntologyArtifactFamilyId(value) {
  return OntologyArtifactFamilyIdSchema.parse(value);
}
