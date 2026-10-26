import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadCollapsedOntology } from "./ontology/loadCollapsedOntology.js";
import { writeVerifiedOntology } from "./ontology/atomicOntologyWriter.js";

/** Preserve the existing CLI publication contract while sharing the collapsed model seam. */
export async function materializeImportClosure(options) {
  if (
    !options.inputPath ||
    !options.outputPath ||
    resolve(options.inputPath) === resolve(options.outputPath)
  )
    throw Object.assign(
      new Error(
        "Provide distinct INPUT OUTPUT paths and --format rdfxml|functional",
      ),
      { stage: "usage" },
    );
  const model = await loadCollapsedOntology(options);
  await writeVerifiedOntology({ ...model, outputPath: options.outputPath });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  let options;
  try {
    const { values, positionals } = parseArgs({
      options: { catalog: { type: "string" }, format: { type: "string" } },
      allowPositionals: true,
    });
    if (positionals.length !== 2)
      throw new Error(
        "Usage: node scripts/materializeImportClosure.js INPUT OUTPUT [--catalog PATH] [--format rdfxml|functional]",
      );
    options = {
      inputPath: positionals[0],
      outputPath: positionals[1],
      catalogPath: values.catalog,
      format: values.format,
    };
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
  if (options) {
    try {
      await materializeImportClosure(options);
    } catch (error) {
      console.error(error.message);
      process.exitCode =
        {
          usage: 2,
          root: 3,
          imports: 4,
          serialization: 5,
          verification: 6,
          publication: 7,
        }[error.stage] ?? 4;
    }
  }
}
