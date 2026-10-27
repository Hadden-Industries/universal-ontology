import { PUBLIC_ONTOLOGY_ROOT_IRI } from "./ontologyPublication.js";

/** Explicit page-to-full-export associations from this build's complete asset inventory. */
export function createOntologyXmiDownloadBindings(receipt) {
  if (receipt?.schemaVersion !== 2 || !receipt.validation?.umlMetadataRecovery)
    return { schemaVersion: 1, exports: [] };
  const url = (path) => new URL(path, PUBLIC_ONTOLOGY_ROOT_IRI).pathname;
  return {
    schemaVersion: 1,
    exports: receipt.candidates
      .filter((c) => c.imports.length)
      .map((candidate) => {
        const full = `${candidate.outputPath}-full`;
        const output = receipt.outputs.find((o) => o.path === `${full}.xmi`);
        if (!output) throw new Error("Missing generated XMI download binding");
        return {
          source: url(candidate.outputPath),
          full: url(full),
          href: url(output.path),
          sha256: output.sha256,
          scope: "full",
        };
      }),
  };
}
