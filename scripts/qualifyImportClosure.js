import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { targets } from "./createFullVersions.js";
import { materializeImportClosure } from "./materializeImportClosure.js";
import {
  collectQualificationIdentity,
  findOwlapiPackageRoot,
} from "./ontology/qualificationIdentity.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function inventory(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await inventory(path)));
    else if (entry.isFile())
      result.push({ path, sha256: hash(await readFile(path)) });
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
function describe(error) {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    stage: error.stage,
    documentIRI: error.documentIRI,
    attempts: error.attempts,
    subject: error.subject,
    predicate: error.predicate,
    object: error.object,
    quad: error.quad,
    cause: error.cause ? describe(error.cause) : undefined,
  };
}

/** Exercise both formats on all four roots without touching maintained distributions. */
export async function qualifyImportClosure({
  sourceRoot,
  outputRoot,
  candidateDirectory,
  upstreamEvidencePath,
}) {
  sourceRoot = resolve(sourceRoot);
  outputRoot = resolve(outputRoot);
  const within = relative(sourceRoot, outputRoot);
  if (
    !within ||
    (!isAbsolute(within) && !within.startsWith(`..${sep}`) && within !== "..")
  )
    throw new Error(
      "Qualification output must be outside the maintained source root",
    );
  await mkdir(outputRoot, { recursive: true });
  const directory = await mkdtemp(join(outputRoot, "qualification-"));
  const identity = await collectQualificationIdentity({
    sourceRoot,
    candidateDirectory,
    upstreamEvidencePath,
    consumerRoot: fileURLToPath(new URL("../", import.meta.url)),
    packageRoot: await findOwlapiPackageRoot(),
  });
  const inputInventory = await inventory(join(sourceRoot, "src"));
  const results = [];
  for (const [index, target] of targets.entries()) {
    const inputPath = resolve(sourceRoot, "scripts", target.input);
    const catalogPath = resolve(sourceRoot, "scripts", target.catalog);
    const inputSha256 = hash(await readFile(inputPath));
    const catalogSha256 = hash(await readFile(catalogPath));
    for (const format of ["functional", "rdfxml"]) {
      const outputPath = join(directory, `${index}-${format}.owl`);
      await writeFile(outputPath, "qualification-sentinel");
      const documents = [];
      try {
        await materializeImportClosure({
          inputPath,
          catalogPath,
          outputPath,
          format,
          onDocument: (document) => documents.push(document),
        });
        results.push({
          inputPath,
          inputSha256,
          catalogPath,
          catalogSha256,
          format,
          outputPath,
          status: "PASS",
          documents,
          outputSha256: hash(await readFile(outputPath)),
        });
      } catch (error) {
        results.push({
          inputPath,
          inputSha256,
          catalogPath,
          catalogSha256,
          format,
          outputPath,
          status: "FAIL",
          documents,
          destinationPreserved:
            (await readFile(outputPath, "utf8")) === "qualification-sentinel",
          error: describe(error),
        });
      }
    }
  }
  return {
    stage: "PREPUBLICATION",
    status: results.every((result) => result.status === "PASS")
      ? "PARTIAL"
      : "FAIL",
    identity,
    inputInventory,
    results,
    gaps: [
      "Registry acceptance and provenance verification not performed",
      "Pinned Java differential comparison is outside this runner; assess separately recorded evidence",
      "Complete acceptance matrix and independent reviews require separately recorded evidence",
      ...(results.some((result) => result.status === "FAIL")
        ? [
            "Failed cases do not establish end-to-end real-distribution acceptance",
          ]
        : []),
      "Remote policy and format representability coverage require separate matrix evidence",
    ],
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { values } = parseArgs({
    options: {
      "source-root": { type: "string" },
      "output-root": { type: "string" },
      "candidate-directory": { type: "string" },
      "upstream-evidence": { type: "string" },
    },
  });
  if (
    !values["source-root"] ||
    !values["output-root"] ||
    !values["candidate-directory"] ||
    !values["upstream-evidence"]
  )
    throw new Error(
      "Required: --source-root PATH --output-root PATH --candidate-directory PATH --upstream-evidence PATH",
    );
  const report = await qualifyImportClosure({
    sourceRoot: values["source-root"],
    outputRoot: values["output-root"],
    candidateDirectory: values["candidate-directory"],
    upstreamEvidencePath: values["upstream-evidence"],
  });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === "FAIL" ? 1 : 0;
}
