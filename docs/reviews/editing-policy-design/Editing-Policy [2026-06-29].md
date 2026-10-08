> [!IMPORTANT]
> This policy outlines the strict metadata, naming, and structural requirements for contributing to the Universal Ontology. All contributions must adhere to the instructions below to maintain consistency and standards compliance.

## Table of Contents
- [Ontology Versioning](#ontology-versioning)
- [Adding Entities](#adding-entities)
  - [Naming Conventions](#naming-conventions)
  - [Required Properties](#required-properties)
  - [Optional Annotation Properties](#optional-annotation-properties)
- [Modifying Entities](#modifying-entities)
- [Datasets and Distributions](#datasets-and-distributions)
  - [Datasets](#datasets)
  - [Distributions](#distributions)
- [Within owl:Axiom](#within-owlaxiom)

---

## Ontology Versioning

When creating or updating an ontology document, the version metadata **MUST** align.

> [!WARNING]
> The tail of the `owl:versionIRI` **MUST** exactly match both the de-hyphenated `owl:versionInfo` text and the de-hyphenated `dcterms:modified` date on the `owl:Ontology` element.

---

## Adding Entities

Before adding a new entity (`owl:Class`, `owl:NamedIndividual`, `owl:ObjectProperty`, or `owl:DatatypeProperty`), perform a thorough search of the available entities to identify if the new concept is sufficiently described by an existing one. If one is found, then a synonym of the proposed entity name **MAY** be added to the existing entity. The top-level entity should cover most disciplines, so if there is no entity that exactly matches the definition, it may be a subclass of an existing entity. For example, if the concept being described is a 'thing which has physical extension in space and time', it will necessarily be a subclass of [`uc:MaterialObject`](https://haddenindustries.com/ontology/universal/core/MaterialObject) at some depth.

### Naming Conventions

If a new entity is added, its URI fragment (local name) **MUST** adhere to the following naming conventions:

* `owl:Class` and `owl:NamedIndividual` elements **MUST** use [PascalCase](https://en.wiktionary.org/wiki/PascalCase).

* `owl:ObjectProperty` and `owl:DatatypeProperty` elements **MUST** use [camelCase](https://en.wiktionary.org/wiki/CamelCase) (or lower [snake_case](https://en.wikipedia.org/wiki/Snake_case) if belonging to an ISO ontology namespace).

### Required Properties

Every new entity **MUST** have the following annotation properties:

* [`dcterms:created`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/created/)

  >The date and time that the entity was added to the Ontology

  **MUST** be specified only once.

  **MUST** have the data type of [`xsd:dateTime`](https://www.w3.org/TR/xmlschema11-2/#dateTime), and be in [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) (ending with 'Z'). e.g. `2026-04-11T12:58:18Z`

* [`dcterms:creator`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/creator/)

  >The person who added the entity to the Ontology

  **MUST** be specified only once.

  **MUST** be a URI of the creator's [ORCID](https://orcid.org/). e.g. `https://orcid.org/0000-0001-8017-8797`

* [`dcterms:identifier`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/identifier/)

  **MUST** have at least one [(version 4) Universally Unique IDentifier (UUID)](https://datatracker.ietf.org/doc/html/rfc9562#name-uuid-version-4), expressed as a [Uniform Resource Name (URN)](https://tools.ietf.org/html/rfc8141) in the [UUID namespace](https://tools.ietf.org/html/rfc4122). e.g. `urn:uuid:700de2be-ede3-4ec6-b031-6248e70881a1`

  **MAY** be specified multiple times, but **MUST** be unique throughout the Ontology.

* [`rdfs:label`](https://www.w3.org/TR/rdf-schema/#ch_label)

  >A human-readable version of the entity's name

  One of the labels **MUST** be an exact match to the `skos:prefLabel` in the same language.

  **MUST** have a language attribute (`xml:lang`) to specify the language of the label.

  **MAY** be specified multiple times, but **MUST** be unique by text and language combination.

* [`skos:definition`](https://www.w3.org/2004/02/skos/core#definition)

  >"Representation of a concept by an expression that describes it and differentiates it from related concepts"
  ><div align="right">Source: <a href="https://www.iso.org/obp/ui/#iso:std:iso-iec:11179:-1:ed-4:v1:en:term:3.2.11">ISO/IEC 11179-1:2023</a></div>

  **MUST** have a language attribute (`xml:lang`) to specify the language of the definition.

  **MAY** be specified multiple times, but **MUST** be unique by language.

* [`skos:prefLabel`](https://www.w3.org/2004/02/skos/core#prefLabel)

  >The preferred, canonical name of the entity

  **MUST** correspond to the local part of the entity's `rdf:about` URI. To comply with the W3C XML specification for QNames (which cannot start with a digit), if the local part of the URI would conceptually start with a digit, the digit **MUST** be spelled out as a word in the label (e.g., '0' becomes 'Zero').

    _Note: For named individuals and properties, any prefix up to and including the first underscore is ignored during URI correspondence testing if the first character of the identifier is capitalised e.g. `OccupationalClassification_hasOccupationCategory`._

  **MUST** have a language attribute (`xml:lang`) to specify the language of the preferred label. An English (`en` or `en-gb`) label is mandatory.

  **MAY** be specified multiple times, but **MUST** be unique by language.

### Optional Annotation Properties

* [`dcterms:references`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/references/)

  >A related resource that is referenced, cited, or otherwise pointed to by the described resource

  **MAY** be specified multiple times.

* [`dcterms:source`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/source/)

  >The related resource from which the described resource is derived, that enables traceability of the origin of the entity

  **MAY** be specified multiple times.

  **SHOULD** be be specified at least once if the definition is derived externally. e.g. `urn:iso:std:iso:31073:ed-1:v1:term:3.3.11`

* [`rdfs:seeAlso`](https://www.w3.org/TR/rdf-schema/#ch_seealso)

  >Uniform Resource Locator or another type of link to a resource that clarifies the origin of the term, or provides useful supplemental information

  **MAY** be specified multiple times.

* `uc:acronym`

  >"Abbreviation made up of the initial letters of the components of the full form of the designation or from syllables of the full form and pronounced syllabically"
  ><div align="right">Source: <a href="https://www.iso.org/obp/ui#iso:std:iso-iec:15944:-7:ed-1:v1:en:term:3.2">ISO/IEC 15944-7:2009</a></div>

  **MUST** have a language attribute (`xml:lang`) to specify the language of the acronym.

  **MAY** be specified multiple times, but **MUST** be unique by text and language combination.

---

## Modifying Entities

When changing any information about an existing entity, the following annotation properties **MUST** be added:

* [`dcterms:modified`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/modified/)

  >The date and time that the entity was changed in the Ontology

  **MUST** be specified only once.

  **MUST** have the data type of [`xsd:dateTime`](https://www.w3.org/TR/xmlschema11-2/#dateTime) (or [`xsd:date`](https://www.w3.org/TR/xmlschema11-2/#date)), and be in [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) (ending with 'Z' if it is a dateTime). e.g. `2026-06-25T09:03:00Z`

The following annotation properties **MAY** be added:

* [`dcterms:contributor`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/contributor/)

  *If* the person who changed this entity in the Ontology is different to the one referenced in `dcterms:creator`.

  **MUST** be a URI of the contributor's [ORCID](https://orcid.org/). e.g. `https://orcid.org/0000-0002-8538-9195`

---

## Datasets and Distributions

When adding datasets and their corresponding distributions, they are modelled as `owl:NamedIndividual` elements but have strict structural (some of which come from a conformance to [DCAT-AP](https://semiceu.github.io/DCAT-AP/releases/3.0.1/)) and URI requirements:

### Datasets

A dataset **MUST** declare an `@rdf:type` of [`dcat:Dataset`](<http://www.w3.org/ns/dcat#Dataset>).

> [!NOTE]
> **URI Structure:** `https://haddenindustries.com/ontology/dataset/{version4Uuid}` where `version4Uuid` is the [(version 4) Universally Unique IDentifier (UUID)](https://datatracker.ietf.org/doc/html/rfc9562#name-uuid-version-4) in the lowercase [canonical string format](https://datatracker.ietf.org/doc/html/rfc9562#sampleStringUUID)

**Required Annotation Properties:**

* [`dcat:theme`](https://www.w3.org/TR/vocab-dcat-3/#Property:resource_theme)

  >A category of the Dataset

  **MUST** contain a non-empty `rdf:resource`. e.g. `https://haddenindustries.com/ontology/universal/reference-data/Currency`

* [`dcterms:description`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/description/)

  >A free-text account of the Dataset

  This property can be repeated for parallel language versions of the description.

  **MUST** have a language attribute (`xml:lang`) to specify the language of the description.

  **MAY** be specified multiple times, but **MUST** be unique by language.

* [`dcterms:title`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/title/)

  >A name given to the Dataset

  **MUST** have a language attribute (`xml:lang`) to specify the language of the title.

  **MAY** be specified multiple times, but **MUST** be unique by text and language combination.

* [`rdfs:label`](https://www.w3.org/TR/rdf-schema/#ch_label)

  >A human-readable version of the Dataset's name

  **MUST** have a language attribute (`xml:lang`) to specify the language of the label.

  **MAY** be specified multiple times, but **MUST** be unique by text and language combination.

**Optional Annotation Properties:**

* [`dcat:distribution`](https://www.w3.org/TR/vocab-dcat-3/#Property:dataset_distribution)

  >An available Distribution for the Dataset

  **MUST** contain a non-empty `rdf:resource` referencing a `owl:NamedIndividual` with `@rdf:type` of [`dcat:Distribution`](<http://www.w3.org/ns/dcat#Distribution>).

  **MAY** be specified multiple times.

* [`dcat:landingPage`](https://www.w3.org/TR/vocab-dcat-3/#Property:resource_landing_page)

  >A web page that provides access to the Dataset, its Distributions and/or additional information

  It is intended to point to a landing page at the original data provider, not to a page on a site of a third party, such as an aggregator.

  **MAY** be specified multiple times.

* [`dcterms:accessRights`](https://www.w3.org/TR/vocab-dcat-3/#Property:resource_access_rights)

  >Information that indicates whether the Dataset is publicly accessible, has access restrictions or is not public

  **MUST** be specified only once.

  **SHOULD** contain a non-empty `rdf:resource`. e.g `http://publications.europa.eu/resource/authority/access-right/PUBLIC`

### Distributions

A distribution **MUST** declare an `@rdf:type` of [`dcat:Distribution`](<http://www.w3.org/ns/dcat#Distribution>).

> [!NOTE]
> **URI Structure:** `https://haddenindustries.com/ontology/distribution/{Version 4 UUID}` where `version4Uuid` is the [(version 4) Universally Unique IDentifier (UUID)](https://datatracker.ietf.org/doc/html/rfc9562#name-uuid-version-4) in the lowercase [canonical string format](https://datatracker.ietf.org/doc/html/rfc9562#sampleStringUUID)

**Required Annotation Properties:**

* [`dcat:accessURL`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_access_url)

  >A URL that gives access to a Distribution of the Dataset

  The resource at the access URL may contain information about how to get the Dataset.

  **MUST** contain a non-empty `rdf:resource`. e.g. `https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html`

  **MAY** be specified multiple times.  

* [`rdfs:label`](https://www.w3.org/TR/rdf-schema/#ch_label)

  >A human-readable version of the Distribution's name

  **MUST** have a language attribute (`xml:lang`) to specify the language of the label.

  **MAY** be specified multiple times, but **MUST** be unique by text and language combination.

**Optional Annotation Properties:**

* [`dcat:downloadUrl`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_download_url)

  >A URL that is a direct link to a downloadable file in a given format

  **MUST** contain a non-empty `rdf:resource`. e.g. `https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-three.xml`

  **MAY** be specified multiple times.      

* [`dcat:mediaType`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_media_type)

  >The media type of the Distribution as defined in the official register of media types managed by IANA

  **MUST** be specified only once.

  **MUST** be a URI from the [Internet Assigned Numbers Authority (IANA)](https://www.iana.org/) [Media Types register](https://www.iana.org/assignments/media-types/media-types.xhtml) e.g. `https://www.iana.org/assignments/media-types/image/gif`.

* [`dcterms:format`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_format)

  >The file format of the Distribution

  **MUST** be specified only once.

  **SHOULD** be a URI from the [Publications Office of the European Union's](https://op.europa.eu/web/eu-vocabularies/concept/-/resource?uri=http://publications.europa.eu/resource/authority/corporate-body/PUBL) [File type Controlled Vocabulary](https://op.europa.eu/en/web/eu-vocabularies/dataset/-/resource?uri=http://publications.europa.eu/resource/dataset/file-type#) e.g. `http://publications.europa.eu/resource/authority/file-type/GIF`.

* [`dcterms:language`](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/language/)

  >A language used in the Distribution

  This property can be repeated if the metadata is provided in multiple languages.

  **MUST** be a URI from the [Library of Congress Linked Data Service's](https://id.loc.gov/) [ISO639-1 Languages](https://id.loc.gov/vocabulary/iso639-1) vocabulary e.g. `http://id.loc.gov/vocabulary/iso639-1/en`.

* [`dcterms:license`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_license)

  >A licence under which the Distribution is made available

  **MUST** be specified only once.

  **MUST** contain a non-empty `rdf:resource`. e.g. `https://spdx.org/licenses/OGL-UK-3.0`      

* [`dcterms:rights`](https://www.w3.org/TR/vocab-dcat-3/#Property:distribution_rights)

  >A statement that specifies rights associated with the Distribution

  **MAY** be specified multiple times.

  **SHOULD** contain a non-empty `rdf:resource`. e.g. `https://www.six-group.com/en/services/legal/terms-and-conditions/terms-of-use.html`

---

## Within owl:Axiom

* [`schema:position`](https://schema.org/position)

  >Specifies the position of an item in a series or sequence of items

  **MUST** have the data type of [`xsd:integer`](https://www.w3.org/TR/xmlschema11-2/#integer).