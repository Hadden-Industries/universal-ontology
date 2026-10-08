// SPDX-License-Identifier: AGPL-3.0-only
// Canonical CLI orchestration only; formatting and link rules belong to the capability.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export function runMarkdownQuality(mode, repositoryRoot = root, json = false) {
  if (!["check", "format"].includes(mode))
    throw new Error("Use check or format.");
  const packageRoot = resolve(
    repositoryRoot,
    "tooling/markdown/node_modules/@hadden-industries/markdown-quality",
  );
  // Consume the installed public bin declaration rather than its implementation path.
  const metadata = JSON.parse(
    readFileSync(resolve(packageRoot, "package.json"), "utf8"),
  );
  const bin = metadata.bin?.["markdown-quality"];
  if (
    metadata.name !== "@hadden-industries/markdown-quality" ||
    typeof bin !== "string"
  )
    throw new Error("Installed Markdown package has no supported public bin.");
  const cli = resolve(packageRoot, bin);
  const binRelativePath = relative(packageRoot, cli);
  if (
    isAbsolute(binRelativePath) ||
    binRelativePath === ".." ||
    binRelativePath.startsWith(".." + sep)
  )
    throw new Error("Installed Markdown public bin is outside its package.");
  const requireInventory = execFileSync(
    "git",
    [
      "-C",
      repositoryRoot,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 10000, maxBuffer: 8000000 },
  )
    .split("\0")
    .filter((path) => path.endsWith(".md"));
  // Checking never installs or downloads missing tooling.
  readFileSync(cli);
  const require = createRequire(resolve(packageRoot, "package.json"));
  const Ajv = require("ajv");
  const validate = new Ajv({ allErrors: true, strict: true }).compile(
    JSON.parse(
      readFileSync(
        require.resolve("@hadden-industries/markdown-quality/result-schema"),
        "utf8",
      ),
    ),
  );
  const env = {};
  for (const name of ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"])
    if (process.env[name]) env[name] = process.env[name];
  function invoke(operation) {
    const result = spawnSync(
      process.execPath,
      [
        "--max-old-space-size=256",
        cli,
        operation,
        "--root",
        repositoryRoot,
        "--json",
      ],
      {
        cwd: dirname(cli),
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 300000,
        maxBuffer: 8000000,
      },
    );
    if (result.error || result.signal || ![0, 1, 2].includes(result.status))
      throw new Error("Canonical Markdown process did not complete.");
    const report = JSON.parse(result.stdout);
    if (
      !validate(report) ||
      report.exitCode !== result.status ||
      report.operation !== operation ||
      report.selection.mode !== "full"
    )
      throw new Error("Canonical Markdown report disagrees with its process.");
    if (result.status !== 2) {
      const omitted = requireInventory.filter(
        (path) => !report.selection.files.includes(path),
      );
      if (omitted.length)
        throw new Error(
          `Tracked or new repository Markdown escaped full selection: ${JSON.stringify(omitted)}`,
        );
    }
    return { result, report };
  }
  // Inventory admission precedes formatting, so omitted documents cannot admit a partial write.
  if (mode === "format") {
    const inspection = invoke("inspect");
    if (inspection.result.status !== 0)
      throw new Error("Full selection inspection failed before formatting.");
  }
  const { result, report } = invoke(mode);
  if (json) {
    process.stdout.write(result.stdout);
    return result.status;
  }
  for (const d of report.diagnostics)
    process.stdout.write(
      `${JSON.stringify(d.path)}:${d.line}:${d.column}: ${d.source}/${d.rule}: ${d.message}\n`,
    );
  for (const error of report.errors)
    process.stderr.write(`${error.code}: ${error.message}\n`);
  process.stdout.write(
    `Canonical ${mode}: ${report.selection.files.length} documents; exit ${result.status}.\n`,
  );
  return result.status;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (
      process.argv.length > 4 ||
      (process.argv[3] && process.argv[3] !== "--json")
    )
      throw new Error(
        "Use check or format with optional --json; full selection is mandatory.",
      );
    process.exitCode = runMarkdownQuality(
      process.argv[2],
      root,
      process.argv[3] === "--json",
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
