import { spawnSync } from "node:child_process";
import { globSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import * as prettier from "prettier";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const snapper = join(
  repositoryRoot,
  ".venv",
  ...(process.platform === "win32"
    ? ["Scripts", "snapper-fmt.exe"]
    : ["bin", "snapper-fmt"]),
);

export async function selectDocumentationFiles(root = repositoryRoot) {
  const selected = [];
  for (const relative of globSync(["*.md", "docs/**/*.md", "packages/*/*.md"], {
    cwd: root,
  })) {
    const path = resolve(root, relative);
    if (!lstatSync(path).isFile()) continue;
    const info = await prettier.getFileInfo(path, {
      ignorePath: [join(root, ".gitignore"), join(root, ".prettierignore")],
      resolveConfig: false,
    });
    if (!info.ignored) selected.push(path);
  }
  return selected.sort();
}

function runSnapper(root, args, input) {
  const result = spawnSync(
    snapper,
    ["--native", "--config", join(root, ".snapperrc.toml"), ...args],
    {
      cwd: root,
      input,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.signal || ![0, 1].includes(result.status)) {
    throw new Error(
      `Snapper failed: ${result.stderr || result.signal || result.status}`,
    );
  }
  return result;
}

export async function processDocumentation({
  root = repositoryRoot,
  write = false,
} = {}) {
  const paths = await selectDocumentationFiles(root);
  let failed = false;
  for (const path of paths) {
    const options = { ...(await prettier.resolveConfig(path)), filepath: path };
    const original = readFileSync(path, "utf8");
    const layout = await prettier.format(original, options);
    const native = runSnapper(root, ["--stdin-filepath", path], layout);
    if (native.status !== 0)
      throw new Error(`Snapper could not format ${path}: ${native.stderr}`);
    // Prettier owns layout (notably task-list indentation); Snapper owns prose.
    const formatted = await prettier.format(native.stdout, options);
    if (write) {
      if (formatted !== original) writeFileSync(path, formatted);
    } else if (formatted !== original) {
      process.stderr.write(`Would reformat: ${path}\n`);
      failed = true;
    }
    const checked = runSnapper(root, [
      "--check",
      "--output-format",
      "json",
      path,
    ]);
    const reports = JSON.parse(checked.stdout);
    if (
      !Array.isArray(reports) ||
      reports.length > 1 ||
      (!reports.length && checked.status !== 0)
    )
      throw new Error(`Invalid Snapper report for ${path}`);
    for (const diagnostic of reports.flatMap((report) => report.diagnostics)) {
      if (diagnostic.kind === "long") continue;
      // Native 0.11.2 counts a quoted list marker as a sentence. Recheck the
      // complete line without quote prefixes so real fused prose still fails,
      // including within nested blockquotes.
      const line = (write ? formatted : original).split("\n")[
        diagnostic.line - 1
      ];
      if (
        diagnostic.kind === "fused" &&
        /^(?:[ \t]*>[ \t]?)+\d+[.)]\s+/u.test(line)
      ) {
        const item = runSnapper(
          root,
          ["--check", "--output-format", "json", "--stdin-filepath", path],
          `${line.replace(/^(?:[ \t]*>[ \t]?)+/u, "")}\n`,
        );
        const itemReports = JSON.parse(item.stdout);
        if (
          item.status === 0 &&
          Array.isArray(itemReports) &&
          itemReports.every((report) =>
            report.diagnostics.every((finding) => finding.kind === "long"),
          )
        )
          continue;
      }
      // 0.11.2 misidentifies some adjacent list items as one wrapped sentence.
      if (
        diagnostic.kind === "wrap" &&
        /^\s*(?:[-+*]|\d+[.)])\s+/u.test(diagnostic.excerpt)
      )
        continue;
      process.stderr.write(
        `${path}:${diagnostic.line}: ${diagnostic.kind}: ${diagnostic.excerpt}\n`,
      );
      failed = true;
    }
  }
  process.stdout.write(
    `${write ? "Formatted" : "Checked"} ${paths.length} authored Markdown documents.\n`,
  );
  return failed ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({
      options: { check: { type: "boolean" }, write: { type: "boolean" } },
    });
    if (Boolean(values.check) === Boolean(values.write))
      throw new Error("Choose exactly one of --check or --write.");
    process.exitCode = await processDocumentation({
      write: Boolean(values.write),
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
