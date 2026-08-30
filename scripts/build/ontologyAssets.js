import { stat } from "node:fs/promises";
import { posix } from "node:path";

import { createOntologyQueryArtifacts } from "./createOntologyQueryArtifacts.js";
import { renderOntologyAssetsWithWorkers } from "./ontologyAssetWorkerPool.js";
import { generateOntologyAliases } from "./ontologyAliases.js";

const PUBLIC_ONTOLOGY_ROOT = new URL("https://haddenindustries.com/ontology/");

function buildFallbackBaseIri(outputPath) {
  return new URL(`${posix.dirname(outputPath)}/`, PUBLIC_ONTOLOGY_ROOT).href;
}

export async function createOntologyBuildAssets({
  ontologySources,
  workerCount,
}) {
  const aliases = await generateOntologyAliases({ ontologySources });
  const assets = new Map(aliases);
  const currentInputs = await Promise.all(
    ontologySources.map(async (source) => ({
      outputPath: source.outputPath,
      sourcePath: source.sourcePath,
      size: (await stat(source.sourcePath)).size,
      fallbackBaseIRI: buildFallbackBaseIri(source.outputPath),
    })),
  );

  for (const [outputPath, content] of aliases) {
    currentInputs.push({
      outputPath,
      content,
      size: content.byteLength,
      fallbackBaseIRI: buildFallbackBaseIri(outputPath),
    });
  }

  currentInputs.sort(({ outputPath: left }, { outputPath: right }) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  const renderedInputs = await renderOntologyAssetsWithWorkers({
    inputs: currentInputs,
    workerCount,
  });

  for (const { outputPath, jsonLdContent, csvContent } of renderedInputs) {
    assets.set(`${outputPath}.jsonld`, jsonLdContent);
    assets.set(`${outputPath}.csv`, csvContent);
  }

  const { artifactContentsByRelativePath } = await createOntologyQueryArtifacts(
    { ontologySources, workerCount },
  );

  for (const [relativePath, content] of artifactContentsByRelativePath) {
    const outputPath = `query/v1/${relativePath}`;

    if (assets.has(outputPath)) {
      // A collision means two independent build producers claim one deployed
      // URL. Failing closed prevents a query document from silently replacing
      // another ontology asset (or vice versa).
      throw new Error(`Ontology build asset path collision: "${outputPath}".`);
    }

    assets.set(outputPath, content);
  }

  return assets;
}
