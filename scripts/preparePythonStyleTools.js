/** Extract Ruff's exact installer input without resolving or installing packages. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** Preserve the single pinned Ruff entry and every hash; reject unsafe lock syntax.
 * The output must not already exist. Pip verifies wheel integrity and dependency
 * closure during installation; this helper never rewrites the repository lock.
 */
export function preparePythonStyleTools({
  root = fileURLToPath(new URL("../", import.meta.url)),
  outputDirectory,
}) {
  if (!outputDirectory) throw new Error("A new output directory is required.");
  const lines = readFileSync(join(root, "requirements.lock.txt"), "utf8")
    .replaceAll("\r\n", "\n")
    .split("\n");
  const starts = lines.flatMap((line, index) =>
    /^ruff(?:\W|$)/iu.test(line) ? [index] : [],
  );
  if (starts.length !== 1)
    throw new Error("Exactly one locked Ruff entry is required.");
  let index = starts[0];
  if (!/^ruff==\d+\.\d+\.\d+\s+\\$/u.test(lines[index]))
    throw new Error("Ruff must have an exact version and wheel hashes.");
  const entry = [lines[index++]];
  while (true) {
    const line = lines[index++];
    if (!/^[ \t]+--hash=sha256:[a-f0-9]{64}[ \t]*\\?$/u.test(line ?? ""))
      throw new Error("Ruff must have a complete SHA-256 hash list.");
    entry.push(line);
    if (!line.endsWith("\\")) break;
  }
  if (/^[ \t]+--/u.test(lines[index] ?? ""))
    throw new Error("Unreviewed Ruff installer option.");
  mkdirSync(outputDirectory);
  writeFileSync(
    join(outputDirectory, "requirements.txt"),
    `${entry.join("\n")}\n`,
    { flag: "wx" },
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({ options: { output: { type: "string" } } });
    preparePythonStyleTools({ outputDirectory: values.output });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
