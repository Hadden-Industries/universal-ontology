import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { verifyFullOntologyBuild } from "./build/fullOntologyAssets.js";

// Publication deliberately validates an explicitly chosen candidate; it never regenerates outputs.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({
      options: {
        repository: { type: "string" },
        output: { type: "string" },
        reports: { type: "string" },
      },
    });
    if (!values.repository || !values.output)
      throw new Error(
        "Require --repository PATH --output PATH [--reports PATH]",
      );
    const receipt = await verifyFullOntologyBuild({
      repositoryDirectory: values.repository,
      outputDirectory: values.output,
      reportDirectory: values.reports,
    });
    console.log(
      `Verified ${receipt.outputs.length} full ontology representation files.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
