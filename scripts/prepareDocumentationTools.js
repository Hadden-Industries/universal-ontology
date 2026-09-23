/** Prepare a minimal npm/pip installation from the repository's existing locks.
 * This writes installer inputs only; npm ci and pip retain responsibility for
 * validating and installing packages. No version or integrity hash is resolved.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

/** Write only Prettier and Snapper's locked installer inputs to a new directory.
 * Reject incomplete locks, Prettier dependencies, and existing output.
 * Native installers validate package integrity and any Snapper dependencies.
 */
export function prepareDocumentationTools({
  root = repositoryRoot,
  outputDirectory,
}) {
  if (!outputDirectory) throw new Error("A new output directory is required.");
  const lock = JSON.parse(
    readFileSync(join(root, "package-lock.json"), "utf8"),
  );
  const prettier = lock.packages?.["node_modules/prettier"];
  if (
    lock.lockfileVersion !== 3 ||
    !prettier?.version ||
    !prettier.resolved ||
    !prettier.integrity
  )
    throw new Error(
      "The npm lock must contain Prettier's version, URL and integrity hash.",
    );
  if (
    ["dependencies", "optionalDependencies", "peerDependencies"].some(
      (field) => Object.keys(prettier[field] ?? {}).length,
    )
  )
    throw new Error(
      "Prettier dependencies changed; update the reviewed documentation installation inputs.",
    );
  const pythonLock = readFileSync(
    join(root, "requirements.lock.txt"),
    "utf8",
  ).replaceAll("\r\n", "\n");
  const snapper = pythonLock.match(
    /^snapper-fmt==[^\n]+(?:\n[ \t]+--hash=sha256:[a-f0-9]{64}[ \t]*\\?)+/mu,
  )?.[0];
  if (!snapper)
    throw new Error(
      "The Python lock must contain Snapper and its wheel hashes.",
    );
  const manifest = {
    name: "universal-ontology-documentation-tools",
    version: "0.0.0",
    private: true,
    dependencies: { prettier: prettier.version },
  };
  const documentationLock = {
    name: manifest.name,
    version: manifest.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies,
      },
      "node_modules/prettier": { ...prettier, dev: undefined },
    },
  };
  // Exclusive creation protects retained installer inputs and avoids clobbering
  // a developer's environment when the command is run outside a clean CI job.
  mkdirSync(outputDirectory);
  for (const [name, document] of [
    ["package.json", manifest],
    ["package-lock.json", documentationLock],
  ])
    writeFileSync(
      join(outputDirectory, name),
      JSON.stringify(document, null, 2) + "\n",
      { flag: "wx" },
    );
  writeFileSync(join(outputDirectory, "requirements.txt"), snapper + "\n", {
    flag: "wx",
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({ options: { output: { type: "string" } } });
    prepareDocumentationTools({ outputDirectory: values.output });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
