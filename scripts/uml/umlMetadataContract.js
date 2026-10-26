/** Version-one UO metadata carriers. Source data lives in ordinary UML slots. */
export const UML_METADATA_CONTRACT = Object.freeze({
  version: "1",
  profile: "https://haddenindustries.com/ontology/uml-metadata/1",
  uml: "http://schema.omg.org/spec/UML/2.1.1",
  umlDocument: "http://schema.omg.org/spec/UML/2.1.1/uml.xml",
  xmi: "http://schema.omg.org/spec/XMI/2.1",
  maxXmlBytes: 256 * 1024 * 1024,
  maxStructureBytes: 64 * 1024 * 1024,
  maxNodes: 500000,
  maxDepth: 128,
  maxElements: 3000000,
  maxAttributeBytes: 2 * 1024 * 1024,
  canonicalizationMilliseconds: 120000,
});

/** Neutral carrier declarations; inverse code shares vocabulary, never traversal. */
export const UML_METADATA_TYPES = Object.freeze({
  StructuralTerm: {},
  StructuralNode: { identity: "String" },
  ScalarValue: { payload: "String" },
  ExportManifest: {
    root: "StructuralNode",
    contractVersion: "String",
    semanticModelSha256: "String",
    pairedOwlSha256: "String",
    owlapi: "String",
    behaviorProfileId: "String",
    profileSha256: "String",
  },
  ProjectionCorrespondence: {
    source: "StructuralNode",
    umlElementId: "String",
    rule: "String",
  },
});
