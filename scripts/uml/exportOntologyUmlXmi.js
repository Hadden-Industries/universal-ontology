import { XMLSerializer } from "@xmldom/xmldom";
import rdfCanonize from "rdf-canonize";
import { canonicalOntologyStructure } from "../ontology/ontologyStructuralFingerprint.js";
import { ONTOLOGY_STRUCTURE_NAMESPACE as vocabulary } from "../ontology/ontologyStructuralVocabulary.js";
import { UML_METADATA_CONTRACT as contract } from "./umlMetadataContract.js";
import {
  createMetadataDocument,
  encodeScalar,
  fieldId,
  serializeMetadataDocument,
  sha256,
  stableId,
} from "./umlMetadataXml.js";
import { recoverOntologyMetadata } from "./recoverOntologyMetadata.js";
import { projectOntologyUml } from "./projectOntologyUml.js";

/** Export one already-collapsed model; loading and publication belong to callers. */
export async function exportOntologyUmlXmi({ ontology, context }) {
  const started = performance.now();
  if (ontology.getImportsDeclarations().size)
    throw new Error("UML export requires a collapsed ontology without imports");
  if (
    !context ||
    !/^[a-f0-9]{64}$/u.test(context.pairedOwlSha256) ||
    typeof context.owlapi !== "string" ||
    context.behaviorProfileId !== "normative-v1"
  )
    throw new Error(
      "UML export requires exact paired OWL, dependency and normative profile identities",
    );
  const canonicalStructure = await canonicalOntologyStructure(ontology, {
    maxNodes: contract.maxNodes,
    maxDepth: contract.maxDepth,
    maxBytes: contract.maxStructureBytes,
    signal: AbortSignal.timeout(contract.canonicalizationMilliseconds),
  });
  const dataset = canonicalStructure
    .trim()
    .split("\n")
    .filter(Boolean)
    .flatMap((row) => rdfCanonize.NQuads.parse(`${row}\n`));
  const writer = createMetadataDocument(
    new Set(dataset.map((q) => q.predicate.value)),
  );
  const { element, root, instance, slot } = writer;
  const nodes = new Map();
  const scalars = new Map();
  const identities = new Map();
  const nodeKey = (term) => `${term.termType}:${term.value}`;
  const allocate = (role, key) => {
    const id = stableId(role, key);
    if (identities.has(id) && identities.get(id) !== key)
      throw new Error("XMI identity hash collision");
    identities.set(id, key);
    return id;
  };
  for (const { subject, object } of dataset) {
    for (const term of [subject, object]) {
      if (term.termType === "Literal") {
        if (
          term.datatype.value !== "http://www.w3.org/2001/XMLSchema#string" ||
          term.language
        )
          throw new Error("Unexpected abstract-syntax scalar datatype");
        if (!scalars.has(term.value))
          scalars.set(term.value, allocate("scalar", term.value));
      } else if (!nodes.has(nodeKey(term)))
        nodes.set(nodeKey(term), {
          id: allocate("node", nodeKey(term)),
          fields: new Map(),
        });
    }
  }
  if (nodes.size + scalars.size > contract.maxNodes)
    throw new Error("Preservation record limit exceeded");
  let rootId;
  for (const { subject, predicate, object } of dataset) {
    const node = nodes.get(nodeKey(subject));
    if (!node.fields.has(predicate.value)) node.fields.set(predicate.value, []);
    node.fields
      .get(predicate.value)
      .push(
        object.termType === "Literal"
          ? scalars.get(object.value)
          : nodes.get(nodeKey(object)).id,
      );
    if (predicate.value === `${vocabulary}kind` && object.value === "Ontology")
      rootId = node.id;
  }
  for (const [identity, node] of [...nodes].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const carrier = instance(node.id, "StructuralNode");
    slot(carrier, "StructuralNode_identity", [encodeScalar(identity)]);
    for (const [predicate, values] of [...node.fields].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ))
      slot(carrier, fieldId(predicate), [...values].sort(), true);
  }
  for (const [value, id] of [...scalars].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  ))
    slot(instance(id, "ScalarValue"), "ScalarValue_payload", [
      encodeScalar(value),
    ]);
  const manifest = instance("manifest", "ExportManifest");
  slot(manifest, "ExportManifest_root", [rootId], true);
  const profile = [
    ...writer.document.getElementsByTagNameNS(contract.uml, "Profile"),
  ][0];
  const manifestFields = {
    contractVersion: contract.version,
    semanticModelSha256: sha256(canonicalStructure),
    pairedOwlSha256: context.pairedOwlSha256,
    owlapi: context.owlapi,
    behaviorProfileId: context.behaviorProfileId,
    profileSha256: sha256(new XMLSerializer().serializeToString(profile)),
  };
  for (const [field, value] of Object.entries(manifestFields))
    slot(manifest, `ExportManifest_${field}`, [encodeScalar(value)]);
  for (const target of [rootId, "manifest"])
    element(root, "uo:SourceRecord", null, `application_${target}`, {
      base_InstanceSpecification: target,
    });
  const projection = projectOntologyUml({
    ontology,
    context,
    dataset,
    nodes,
    writer,
  });
  const xmi = serializeMetadataDocument(writer.document);
  const recovery = await recoverOntologyMetadata(xmi);
  if (recovery.canonicalStructure !== canonicalStructure)
    throw new Error("UML metadata inverse differs from the selected model");
  return {
    xmi,
    recovery,
    diagnostics: {
      projection,
      ...recovery.counts,
      seconds: (performance.now() - started) / 1000,
      observedRssBytes: process.memoryUsage().rss,
    },
    validation: {
      xml: true,
      recovery: true,
      nativeUml: "qualification-required",
    },
  };
}
