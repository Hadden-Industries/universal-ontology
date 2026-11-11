/** The repository Node pin owns CI identity. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const stableVersion = /^[1-9]\d*\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

/** Read a stable, exact runtime selection without importing the development graph. */
export function nodeTarget(root = repositoryRoot) {
  const version = readFileSync(join(root, ".node-version"), "utf8").trim();
  if (!stableVersion.test(version)) {
    throw new Error(
      ".node-version must contain a stable major.minor.patch version.",
    );
  }
  return version;
}

/** Validate an observed Node version before the development graph is installed. */
export function meetsNodeTarget(version) {
  if (typeof version !== "string" || !version.startsWith("v")) return false;
  const candidate = version.slice(1);
  if (!stableVersion.test(candidate)) return false;

  const observed = candidate.split(".").map(Number);
  if (!observed.every(Number.isSafeInteger)) return false;
  const minimum = nodeTarget().split(".").map(Number);
  const difference = observed.findIndex(
    (part, index) => part !== minimum[index],
  );
  return difference === -1 || observed[difference] > minimum[difference];
}
