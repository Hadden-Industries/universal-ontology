/** Version-two UO metadata: typed profile values plus ordinary manifest slots. */
export const UML_METADATA_CONTRACT = Object.freeze({
  version: "2",
  profile: "https://haddenindustries.com/ontology/uml-metadata/2",
  uml: "http://schema.omg.org/spec/UML/2.1.1/uml.xml",
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
  ExportManifest: {
    root: "String",
    contractVersion: "String",
    semanticModelSha256: "String",
    pairedOwlSha256: "String",
    owlapi: "String",
    behaviorProfileId: "String",
    profileSha256: "String",
  },
});
