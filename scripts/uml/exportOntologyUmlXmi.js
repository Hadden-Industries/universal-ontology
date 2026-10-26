import { XMLSerializer } from "@xmldom/xmldom";
import rdfCanonize from "rdf-canonize";
import { canonicalOntologyStructure } from "../ontology/ontologyStructuralFingerprint.js";
import { UML_METADATA_CONTRACT as contract } from "./umlMetadataContract.js";
import {
  encodeScalar,
  serializeMetadataDocument,
  sha256,
} from "./umlMetadataXml.js";
import { recoverOntologyMetadata } from "./recoverOntologyMetadata.js";
import { projectOntologyUml } from "./projectOntologyUml.js";
import { createCompactMetadataDocument } from "./compactMetadataProfile.js";

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
  const writer = createCompactMetadataDocument(dataset);
  const { instance, slot, nodes, rootId } = writer;
  const manifest = instance("manifest", "ExportManifest");
  slot(manifest, "ExportManifest_root", [encodeScalar(rootId)]);
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
