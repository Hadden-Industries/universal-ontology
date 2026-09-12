# Universal Ontology Editing Policy

Structural editing requirements for every owned entity, ontology header and axiom in each latest active ontology version and in every replacement candidate. Human conceptual review remains separate and is documented here as explicit human clauses.

Generated from the canonical policy graph (policy identity `sha256:7e14dbc4a16eca9a61153eaacf9f8ea04b01839f891d9c6a9da00588ce37a260`). Do not edit this page by hand; change the policy sources under `policy/` and regenerate.

## Entity metadata

Metadata every owned Class, NamedIndividual, ObjectProperty and DatatypeProperty must carry.

### EP-ENTITY-CREATED — Creation timestamp (MUST)

Every owned Class, NamedIndividual, ObjectProperty and DatatypeProperty has exactly one `dcterms:created` value. The value is an `xsd:dateTime` with a real calendar date and time, written in UTC with the lexical `Z` designator (for example `2026-01-02T03:04:05Z`). A missing value, two different values, a plain string, an impossible date such as 30 February, a numeric offset such as `+00:00`, or a date without a time all fail.

**Applies to:** every owned Class, NamedIndividual, ObjectProperty and DatatypeProperty in the validated module set

**Executable constraints:**

- `dcterms:created`: exactly one value
- `dcterms:created`: datatype `xsd:dateTime`
- `dcterms:created`: matches the pattern `^-?[0-9]{4,}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$`

**Source:** Editing Policy Wiki W05 (lines 41-49); DEC-022

## Human review

Obligations whose truth is established by human review, not by SHACL.

### EP-HUMAN-CONCEPT-REUSE — Search for an existing concept before adding one (MUST, human review)

Before creating a new Class, NamedIndividual or property, search the latest active ontologies for an existing concept with the same meaning, including synonyms and differently spelled designations. If a concept exists, reuse it; if a broader concept exists, add the new one beneath it. A graph that passes every executable rule can still duplicate an existing concept, so this obligation is discharged only by the reviewer's search and judgement, which the pull request must describe.

**Review obligation:** this clause is discharged by human review and recorded in the pull request; no executable check establishes it.

**Source:** Editing Policy Wiki W02 (lines 27-29)
