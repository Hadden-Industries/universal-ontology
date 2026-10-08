import { execFileSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const runner = join(root, "scripts/runMarkdownQuality.mjs");
const packageRoot = join(
  root,
  "tooling/markdown/node_modules/@hadden-industries/markdown-quality",
);
const metadata = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);
const cli = resolve(packageRoot, metadata.bin["markdown-quality"]);
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-markdown-contract-"));
  execFileSync("git", ["init", "--quiet", directory]);
  // This junction is installed test infrastructure, not repository documents.
  writeFileSync(join(directory, ".gitignore"), "tooling/markdown/\n");
  writeFileSync(
    join(directory, ".markdown-quality.json"),
    readFileSync(join(root, ".markdown-quality.json")),
  );
  mkdirSync(join(directory, "tooling"));
  symlinkSync(
    resolve(root, "tooling/markdown"),
    join(directory, "tooling/markdown"),
    "junction",
  );
  writeFileSync(
    join(directory, "README.md"),
    "# Corpus\n\n[Data](target.txt).\n",
  );
  writeFileSync(join(directory, "target.txt"), "A linked target.\n");
  execFileSync("git", [
    "-C",
    directory,
    "add",
    ".markdown-quality.json",
    "README.md",
    "target.txt",
  ]);
  return directory;
}
test("native full check is read-only and catches a target-only deletion", () => {
  const directory = fixture();
  try {
    const before = readFileSync(join(directory, "README.md"));
    const check = () =>
      spawnSync(
        process.execPath,
        [cli, "check", "--root", directory, "--json"],
        { encoding: "utf8" },
      );
    const clean = check();
    expect(clean.status).toBe(0);
    expect(JSON.parse(clean.stdout).selection.files).toEqual(["README.md"]);
    rmSync(join(directory, "target.txt"));
    const missing = check(),
      report = JSON.parse(missing.stdout);
    expect(missing.status).toBe(1);
    expect(
      report.diagnostics.some(
        (d) => d.source === "links" && d.rule === "local-target",
      ),
    ).toBe(true);
    expect(readFileSync(join(directory, "README.md"))).toEqual(before);
    expect(report.written).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
test("real native operation failure preserves exit 2 and its result schema", () => {
  const directory = fixture();
  try {
    writeFileSync(join(directory, "README.md"), Buffer.from([255]));
    const result = spawnSync(
      process.execPath,
      [cli, "check", "--root", directory, "--json"],
      { encoding: "utf8" },
    );
    const report = JSON.parse(result.stdout);
    expect(result.status).toBe(2);
    expect(report.exitCode).toBe(2);
    expect(report.errors.map((e) => e.code)).toContain("INVALID_UTF8");
    expect(report.written).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
test("format admission rejects tracked Markdown in infrastructure before changing other documents", () => {
  const directory = fixture();
  try {
    mkdirSync(join(directory, ".sdlc"));
    writeFileSync(join(directory, ".sdlc/hidden.md"), "# Hidden\n");
    execFileSync("git", ["-C", directory, "add", ".sdlc/hidden.md"]);
    const text = "# Corpus\n\nFirst sentence. Second sentence.\n";
    writeFileSync(join(directory, "README.md"), text);
    // Import the actual orchestration with an explicit temporary repository root.
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import {runMarkdownQuality} from ${JSON.stringify(new URL("../scripts/runMarkdownQuality.mjs", import.meta.url).href)};process.exitCode=runMarkdownQuality('format',${JSON.stringify(directory)});`,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'escaped full selection: [".sdlc/hidden.md"]',
    );
    expect(readFileSync(join(directory, "README.md"), "utf8")).toBe(text);
    const writable = spawnSync(
      process.execPath,
      [cli, "format", "--root", directory, "--json"],
      { encoding: "utf8" },
    );
    expect(writable.status).toBe(0);
    expect(JSON.parse(writable.stdout).written).toContain("README.md");
    expect(readFileSync(join(directory, "README.md"), "utf8")).not.toBe(text);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
test("canonical command rejects changed-path shortcuts", () => {
  const result = spawnSync(
    process.execPath,
    [runner, "check", "--base", "HEAD"],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("full selection is mandatory");
});
