/** UO owns its root and generated-output obligations; the installed engine owns quality. */
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  runJsonQuality,
  runJsonQualityCli,
} from "../tooling/json/public-api.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const requiredGeneratedOutputs = [
  "dist/**/*.jsonld",
  "dist/query/v1/catalog.json",
];

export async function runRepositoryJsonQuality(
  operation,
  { root = repositoryRoot, requireGenerated = false, ...options } = {},
) {
  return runJsonQuality(operation, {
    ...options,
    root,
    requiredOutputs: requireGenerated ? requiredGeneratedOutputs : [],
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  let requireGenerated = false;
  let sourceArguments = false;
  const args = process.argv.slice(2).filter((argument) => {
    if (argument === "--") sourceArguments = true;
    if (!sourceArguments && argument === "--require-generated") {
      requireGenerated = true;
      return false;
    }
    return true;
  });
  process.exitCode = await runJsonQualityCli(args, {
    root: repositoryRoot,
    requiredOutputs: requireGenerated ? requiredGeneratedOutputs : [],
  });
}
