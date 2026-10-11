/** Generated tool metadata follows the one maintained repository Python pin. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export function pythonTarget(root = repositoryRoot) {
  const version = readFileSync(join(root, ".python-version"), "utf8").trim();
  if (!/^[1-9]\d*\.\d+\.\d+$/u.test(version))
    throw new Error(
      ".python-version must contain a stable major.minor.patch version.",
    );
  const [major, minor] = version.split(".");
  return { version, ruff: `py${major}${minor}` };
}

export function syncPythonProjections({
  root = repositoryRoot,
  write = false,
} = {}) {
  const target = pythonTarget(root);
  const path = join(root, "ruff.toml");
  const original = readFileSync(path, "utf8");
  let count = 0;
  const updated = original.replace(/^target-version = ".*"$/gmu, () => {
    count++;
    return `target-version = "${target.ruff}"`;
  });
  if (count !== 1)
    throw new Error("Expected exactly one generated Ruff target.");
  if (original !== updated) {
    if (!write)
      throw new Error(
        "Stale Python target; run node scripts/pythonTarget.js --write.",
      );
    writeFileSync(path, updated);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  syncPythonProjections({ write: process.argv.includes("--write") });
