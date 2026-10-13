/** UO owns its root and generated-output obligations; the installed engine owns quality. */
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  runJsonQuality,
  validateJsonQualityResult,
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
  return validateJsonQualityResult(
    await runJsonQuality(operation, {
      ...options,
      root,
      requiredOutputs: requireGenerated ? requiredGeneratedOutputs : [],
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const [operation, ...arguments_] = process.argv.slice(2);
    const requireGenerated = arguments_.includes("--require-generated");
    const sourcePaths = arguments_.filter(
      (argument) => argument !== "--require-generated",
    );
    if (operation !== "normalize" && sourcePaths.length)
      throw new Error("Only normalize accepts explicit source paths.");
    const result = await runRepositoryJsonQuality(operation, {
      requireGenerated,
      sourcePaths,
    });
    for (const finding of result.findings)
      process.stdout.write(
        `${finding.path}:${finding.line}:${finding.column}: ${finding.phase}/${finding.ruleId ?? finding.messageId}\n`,
      );
    process.stdout.write(
      `${result.status}; ${result.counts.physical} physical files; ${result.counts.logical} logical documents; ${result.counts.checked} checked; ${result.writes.changed.length} written.\n`,
    );
    process.exitCode = result.status === "passed" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
