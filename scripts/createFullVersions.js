import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  beginFullOntologyBuild,
  createFullOntologyAssets,
  completeFullOntologyBuild,
  endFullOntologyBuild,
  checkFullOntologyOutputPaths,
} from "./build/fullOntologyAssets.js";
import { resolveOutputPath } from "./build/sourceInventory.js";

/** Generate the same discovered dated full sets as the website build; stop without a receipt on failure. */
export async function createFullVersions(options = {}) {
  const context = {
    repositoryDirectory: fileURLToPath(new URL("../", import.meta.url)),
    ...options,
  };
  const state = await beginFullOntologyBuild(context);
  try {
    const { assets, receipt } = await createFullOntologyAssets(context);
    await checkFullOntologyOutputPaths(context, assets.keys());
    for (const [path, bytes] of assets) {
      const destination = resolveOutputPath(state.ctx.outputDirectory, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    await completeFullOntologyBuild(state, receipt);
    return receipt;
  } finally {
    await endFullOntologyBuild(state);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const receipt = await createFullVersions();
    console.log(
      `Generated ${receipt.outputs.length} full ontology representation files.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
