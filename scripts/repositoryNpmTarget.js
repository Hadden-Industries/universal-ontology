/** The root packageManager selector owns reproducible CI and release npm. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

/** Read only an exact stable npm selector, including during cold CI bootstrap. */
export function repositoryNpmTarget(root = repositoryRoot) {
  const { packageManager } = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const match = /^npm@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/u.exec(
    packageManager,
  );
  if (!match)
    throw new Error(
      "package.json.packageManager must select an exact stable npm version.",
    );
  return match[1];
}

/** Check or narrowly regenerate the release projection; preserve every other byte. */
export function syncNpmProjections({
  root = repositoryRoot,
  write = false,
} = {}) {
  const version = repositoryNpmTarget(root);
  const target = join(
    root,
    "scripts/distribution/universalOntologyMcpReleaseInputs.json",
  );
  const source = readFileSync(target, "utf8");
  let count = 0;
  const updated = source.replace(
    /^( {2}"selectedNpmVersion": ")[^"]+(",\r?)$/gmu,
    (_line, prefix, suffix) => {
      count++;
      return `${prefix}${version}${suffix}`;
    },
  );
  if (count !== 1)
    throw new Error("Expected exactly one release npm projection.");
  if (source !== updated) {
    if (!write)
      throw new Error(
        "Stale release npm projection; run node scripts/repositoryNpmTarget.js --write.",
      );
    writeFileSync(target, updated);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (
    process.argv.slice(2).some((arg) => arg !== "--write" && arg !== "--check")
  )
    throw new Error("Use --check or --write.");
  syncNpmProjections({ write: process.argv.includes("--write") });
}
