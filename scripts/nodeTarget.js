/** The repository Node pin owns CI identity and the compatible local LTS floor. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

/** Read a stable, exact runtime selection without importing the development graph. */
export function nodeTarget(root = repositoryRoot) {
  const version = readFileSync(join(root, ".node-version"), "utf8").trim();
  if (!/^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(version)) {
    throw new Error(
      ".node-version must contain a stable major.minor.patch version.",
    );
  }
  return version;
}
