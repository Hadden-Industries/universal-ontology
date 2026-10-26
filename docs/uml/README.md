# Full ontology UML/XMI metadata contract

The build exports a self-contained UML/XMI file for each eligible collapsed full ontology.
The same in-memory OwlAPI ontology produces the verified OWL and XMI counterparts.
Source annotations are authoritative typed UML data; readable names and comments are projections.

## Coordinates and standards

The semantic baseline is [UML 2.1.2](https://www.omg.org/spec/UML/2.1.2/About-UML), serialized as [XMI 2.1](https://www.omg.org/spec/XMI/2.1).
The declared UML namespace is `http://schema.omg.org/spec/UML/2.1.1/uml.xml`, as specified by the `org.omg.xmi.nsURI` tag in the [normative merged CMOF](https://www.omg.org/spec/UML/20061012/L2.merged.cmof).
That URI also identifies the metamodel document used for metaclass references.
The XMI namespace is `http://schema.omg.org/spec/XMI/2.1`.
The version-two preservation profile URI is `https://haddenindustries.com/ontology/uml-metadata/2`.

The profile and its complete definition are embedded alongside the Model in one document.
Its SourceRecord stereotype extends InstanceSpecification and identifies the root and export manifest.
Complete source structure resides in typed, composite stereotype values owned by that application.
The ordinary ExportManifest InstanceSpecification uses required LiteralString slots.
Projection applications extend Element and link each readable UML role to its retained source node and named projection rule.
The Node, Value and Default tag types are stereotypes used as structured values; they do not themselves extend UML metaclasses.
The Ecore definition under xmi:Extension is a native dynamic-profile loading hint; it contains no source payload.
The native validator explicitly registers OMG's normative namespace in Eclipse's local package registry, since Eclipse's convenience namespace omits `/uml.xml`.
The sole schema location selects the embedded profile definition; it does not alias the UML namespace to a newer metamodel.
The profile URI is recorded in that definition, and namespace packages use ordinary names without later-version Package URI attributes.
Recovery requires no network retrieval.

Eclipse UML2 5.6.1's native XMI212 resource loads the older serialization and validates the result using its maintained UML metamodel, including the profile, applications, containment, typing and references.
This includes native migration behavior; it is not a separate formal validation of every clause of the 2006 CMOF specification.
PyEcore independently loads the ordinary Model using Eclipse's published UML/Types Ecore metamodels.
Its declared coverage excludes dynamic profile applications and loading hints.
Both implementations must load the same number of ordinary InstanceSpecifications.
Desktop editing, vendor round-trip and re-export preservation remain unqualified.

ODM was considered as vocabulary precedent.
This contract does not adopt an ODM profile: its versions and OWL/RDF commitments do not establish this exact serialization or lexical/attachment contract.
A small versioned profile plus ordinary typed UML data keeps those commitments explicit.

## Source selection and identity

The source is the selected collapsed ontology, with imports resolved by the existing offline catalog policy.
Imported headers absent from that model are not reconstructed.
An ontology still containing imports is rejected.
No-import roots have no full XMI download.

The only dependency selector is root package.json's immutable OwlAPI Git commit.
The public manager and loader explicitly select `behaviorProfileId: "normative-v1"`.
The XMI manifest records this selector and profile, the paired OWL SHA-256, structural model SHA-256, contract version and embedded profile SHA-256.
No timestamps, local paths or worker identities enter artifact content.

Projected element IDs use a role-sensitive 96-bit SHA-256 prefix encoded as a legal XML ID.
The final inverse rejects duplicate XML IDs before accepting the document; collisions fail rather than aliasing roles.
Graph-node IDs use deterministic sorted source-term ordinals; all integrity digests retain full SHA-256.
Punned class, datatype and individual roles remain distinct even when their IRI is equal.
Ground structure receives a digest identity; anonymous individuals use RDFC-1.0 canonical identity.
Renaming anonymous labels and reordering sets do not change export bytes; distinct anonymous individuals remain distinct.
Property chains and ordered data-property operands have explicit zero-based sequence edges; native OWL sets have member edges.

## Carriers and inverse

| UML classifier or profile type         | Fields                                                                                                | Meaning                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| ExportManifest                         | root, contractVersion, semanticModelSha256, pairedOwlSha256, owlapi, behaviorProfileId, profileSha256 | Ordinary UML export binding                               |
| SourceRecord                           | base_InstanceSpecification, root, kind-specific composite node lists, optional v/d/a                  | Owns the complete typed source graph                      |
| Node and concrete native-kind subtypes | sN/rN/vN for declared structural field N                                                              | Inline scalar, node reference or shared scalar reference  |
| Value                                  | p                                                                                                     | One exact shared structural scalar                        |
| Default                                | k, f and r/v/s values                                                                                 | Explicit repeated field values for one concrete node kind |
| Projection                             | base_Element, source, rule                                                                            | Source-role link to a readable UML element                |

The neutral structural vocabulary is `urn:universal-ontology:structural-verification:`.
A structural property name is that namespace plus the URI-encoded native field name.
The Model's StructuralFields enumeration maps each local field ID to that URI-encoded name.
Each observed field has typed String, Node-reference and Value-reference properties on the abstract Node tag type.
The concrete kind is encoded by the owning kind-specific containment property, avoiding repeated kind strings.
Repeated scalar values are interned only when their use saves bytes.
Explicit per-kind defaults may replace repeated complete field value sets only when every source node of that kind has the field.
An explicit node value overrides that default; this is an encoding rule, not a domain constraint or inferred OWL statement.
The optional SourceRecord.a references the `axiom` field descriptor and declares root membership to be exactly all retained axiom-kind nodes.
The producer checks that complete membership before using this shorthand; the inverse reconstructs every root edge.
Collections have `collection = set|sequence`, with `member` or `index:N` references.

Ground nodes have `g` IDs and anonymous nodes have `n` IDs.
The inverse independently reconstructs the existing ground-node URI from its complete outgoing typed edges: sort the unique JSON tuples of N-Quads predicate/object spellings, join with LF, and SHA-256 under the structural vocabulary's `structure:` prefix.
Ground nodes cannot refer to anonymous structure; cycles or unresolved ground references fail.
Anonymous node identities are canonicalized with the complete recovered graph.
No original source value is replaced by a hash-only surrogate.

The [inverse](../../scripts/uml/recoverOntologyMetadata.js) and its [compact graph reader](../../scripts/uml/readCompactMetadataGraph.js) share only neutral vocabulary/contract declarations with the producer.
It does not call source capture code or infer source values from comments, labels, hashes or a sidecar.
It checks finite offline XML, IDs, containment, features and required slots, decodes scalars, resolves graph references, and canonicalizes the recovered graph.
The recovered graph must match the manifest digest; the producer additionally compares it with the complete original canonical structure before accepting bytes.
Returned records expose field references and decoded scalars; literals expose lexical, datatype and language independently.
The root retains the ontology ID, annotations and every axiom with recursive annotation/expression context.

Manifest scalars use canonical padded RFC 4648 base64 of valid UTF-8.
Profile scalars begin with `s` when the original structural value starts with `string:` (that prefix is reconstructed), or `r` otherwise.
Printable ASCII excluding XML-sensitive `<`, `>`, `&` and double quote follows that lowercase prefix directly.
Other payloads use the corresponding uppercase `S` or `R` followed by canonical UTF-8 base64.
The inverse enforces this choice and rejects noncanonical or malformed encodings.
Structural scalar tags include `string:`, `number:`, `boolean:` and `undefined`; kind values are unprefixed.
Literal lexicalForm, datatype IRI and language are separate fields.
Empty strings, CR/LF, tabs, supplementary characters and decomposed Unicode are retained without normalization.
IRI values, anonymous individuals and anyURI-typed literals remain different native terms.
Unpaired surrogates, noncanonical base64 and malformed UTF-8 fail.

The [mapping register](mapping-register.v1.json) enumerates all 99 commissioning rows: M01–M45, D01–D09, H01–H10, E01 and S01–S34.
It is a coverage index, never an allowlist.
Unknown metadata predicates and datatypes use the same typed retention.
New unsupported native OWL kinds fail explicitly rather than dropping attached metadata.
Every S row identifies its owning native syntax and inverse; RDF list cell spelling is outside scope.
E01 preserves declarations without inventing values; H06 rejects uncollapsed input.
Real OwlAPI register fixtures cover all rows, including historical structural positives.
The frozen corpus and current cohort supply observed source counts and exact recovery diffs.

The [independent source oracle](../../scripts/uml/qualification/compareOntologyMetadata.js) reads original RDF/XML as RDF/JS terms and compares metadata tuples with the documented inverse graph.
Subject/predicate, node kind, lexical text, datatype, language and complete axiom/nested annotation signature must agree.
Unspecified anonymous RDF contexts fail explicitly.
It does not certify arbitrary RDF graphs or syntax reconstruction.
The upstream parser currently merges different reification groups for the same base triple.
A negative test retains this limitation and the oracle reports its attachment difference; it is not relabelled as a pass.

## Conservative readable projection

Asserted named classes and datatypes become role-specific Class/DataType elements grouped by IRI namespace.
The existing applicable label/definition policy supplies names and comments; colliding names include role and IRI.
Readable comments use one deterministic preferred definition, preferring English, with an 80-code-point excerpt and an ellipsis when truncated.
Every complete definition, language and other source annotation remains in the authoritative typed profile values.
These strings never supply recovered metadata.
Named subclass assertions form a deterministic acyclic UML subset; omitted OWL cycles remain fully preserved.
One unambiguous named domain and range can become an association or datatype attribute.
Both ends remain 0..*: qualified restrictions are not total multiplicities.
Named class assertions can become InstanceSpecifications.
Other structures remain typed preservation data.
Diagnostics count projected roles and preservation-only kinds; they do not imply OWL reasoning.

## Build and download behavior

Each selected closure produces `-full`, `-full.jsonld`, `-full.csv` and `-full.xmi`.
The schema-2 build receipt binds the quartet, producer/source identities, paired OWL/XMI association, profile and recovery counts.
Artifact hashes remain verified by the existing publication gate.
Schema-1 receipts support only historical cleanup ownership, never current publication admission.

Generated HTML embeds explicit verified-receipt XMI associations.
Authored and full page routes point to the materialized full artifact; the button describes that scope.
Missing mappings disable the control.
Failed availability checks produce live errors and allow retry.
The browser never recreates XMI from fetched OWL or falls back to the retired converter.

## Qualification and limits

Normal generation performs one bounded XML/inverse check on final XMI bytes.
The existing OWL writer retains its independent strict readback; XMI adds no OWL reload.
Native consumers and the independent corpus oracle run through `npm run qualify:uml-xmi -- --dependencies DIR --corpus-root DIR --output DIR --existing-output-root dist` after a normal build.
Current output bindings are mandatory: the existing publication verifier checks their receipt against current sources, imported dependencies, producer and quartet hashes before any native acquisition or execution.
The corpus root must contain the eight exact paths/hashes in [corpus.v1.json](corpus.v1.json).
Changed current outputs are separate cases, never relabelled historical fixtures.
Every frozen control and current export must be at most the byte size of its paired full OWL.
Qualification enforces this ceiling and reports both byte counts and their ratio.
Tiny unit/native witnesses retain the fixed self-contained profile overhead and do not establish a size guarantee; the hard gate covers the actual corpus and current output cohort.
Reports retain missing/extra tuples, native errors/warnings, counts, elapsed time and end-of-process RSS.
Both native readers count InstanceSpecification and its UML subclasses, including EnumerationLiteral.
A failed case retains evidence and produces a failing exit status.

Only `--acquire` permits downloads of the SHA-pinned JARs and pure Python wheels in [qualification-dependencies.v1.json](qualification-dependencies.v1.json).
Acquisition uses explicit HTTPS origins, time/byte limits and no redirects; it installs nothing.
Java reads only the input and registered local classpath bundles; PyEcore reads only its two registered metamodel files.
XML consumers reject DTD/entity/network resolution.
Python uses the existing repository .venv with process-local wheel imports.

Limits are 256 MiB XML, 64 MiB canonical structure, 500,000 preservation records, 128 nested levels, 3,000,000 XML elements, 2 MiB per attribute and 120 seconds canonicalization.
As each explicit or default field is applied, the inverse charges every expanded edge, including each occurrence of shared lexical text, against the 64 MiB graph budget before growing that node's field map, deriving identities or canonicalizing.
Its conservative serialized-size estimate may reject a near-limit graph before the final exact byte check.
Qualification uses separate processes with a 6 GiB Node heap ceiling, 4 GiB Java heap ceiling and three-minute timeout.
These are fail-closed capacity bounds, not performance SLAs.
The superseded slot-per-edge prototype produced about 16–90 MB XMI; that failed the accepted lightweight interchange requirement.
Version two retains the same complete canonical graph without those repeated wrappers.
Complete exploratory small and largest exports measured 577,164/584,060 and 2,858,155/3,023,054 XMI/OWL bytes respectively, with zero independent source-oracle differences.
Those pilots are scoped evidence, not the final all-case qualification or a deployment capacity claim.

## Rights and dependency disposition

UO's existing project license and source attribution remain in place.
OwlAPI remains a build-time AGPL dependency; its selected Git payload and transitive lock are retained.
No new exporter package, desktop application or modified third-party binary is redistributed.

Qualification-only Eclipse UML2/EMF JAR manifests declare EPL-2.0.
Some legacy UML2 about.html files label EPL-1.0 while linking EPL-2.0; preserve the notices and this observed discrepancy.
PyEcore declares BSD-3-Clause, ordered-set MIT, RestrictedPython ZPL-2.1, and future-fstrings MIT.
lxml is the already locked repository dependency with its existing notices.
Qualification reads published metamodel resources without modifying the JARs.
Redistribution or embedding these validators in a shipped package requires a fresh rights decision.
Local qualification establishes no separate release or legal-clearance claim.

## Local property definitions

H08, H09 and H10 refer to historical UO core properties `idIntegerPositive`, `name` and `synonym`.
Their declarations and definitions occur in authored versions under [universal/core](../../src/universal/core).
The register retains those original IRIs and commissioning observations; it does not replace them with newer property names.
