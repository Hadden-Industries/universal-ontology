import { execFileSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const sdkUrl = import.meta.resolve("@hadden-industries/markdown-quality");
const packageRoot = fileURLToPath(new URL("../", sdkUrl));
const { validateQualityResult } = await import(sdkUrl);
const metadata = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);
const cli = resolve(packageRoot, metadata.bin["markdown-quality"]);
function validate(report) {
  expect(report.schemaVersion).toBe(5);
  validateQualityResult(report);
  return report;
}
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-markdown-contract-"));
  execFileSync("git", ["init", "--quiet", directory]);
  writeFileSync(
    join(directory, ".markdown-quality.json"),
    readFileSync(join(root, ".markdown-quality.json")),
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
    expect(validate(JSON.parse(clean.stdout)).selection.files).toEqual([
      "README.md",
    ]);
    rmSync(join(directory, "target.txt"));
    const missing = check(),
      report = validate(JSON.parse(missing.stdout));
    expect(missing.status).toBe(1);
    expect(
      report.diagnostics.some(
        (d) => d.source === "links" && d.rule === "local-target",
      ),
    ).toBe(true);
    expect(readFileSync(join(directory, "README.md"))).toEqual(before);
    expect(report.writtenPaths).toEqual([]);
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
    const report = validate(JSON.parse(result.stdout));
    expect(result.status).toBe(2);
    expect(report.exitCode).toBe(2);
    expect(report.errors.map((e) => e.code)).toContain("INVALID_UTF8");
    expect(report.writtenPaths).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
test("full inventory explains policy-excluded review bytes without changing them", () => {
  const directory = fixture();
  try {
    mkdirSync(join(directory, "docs/reviews/nested"), { recursive: true });
    const excluded = "docs/reviews/nested/private.md";
    const bytes = Buffer.from([255, 13, 10, 128]);
    writeFileSync(join(directory, excluded), bytes);
    execFileSync("git", ["-C", directory, "add", excluded]);
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "check",
        "--root",
        directory,
        "--reconcile-inventory",
        "git",
        "--json",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    const report = validate(JSON.parse(result.stdout));
    expect(report.selection.files).toEqual(["README.md"]);
    expect(
      report.selection.reconciliationDecisions.map(({ path }) => path).sort(),
    ).toEqual(["README.md", excluded].sort());
    expect(report.selection.omissions).toContainEqual({
      path: excluded,
      pattern: "docs/reviews/**",
      matchedPath: excluded,
      reason: "excluded",
    });
    expect(readFileSync(join(directory, excluded))).toEqual(bytes);
    expect(report.writtenPaths).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
test("canonical command rejects changed-path shortcuts", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "check", "--base", "HEAD", "--json"],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(2);
  const report = validate(JSON.parse(result.stdout));
  expect(report.errors).toContainEqual({
    code: "CLI_INPUT",
    message: expect.stringContaining("--base"),
  });
  expect(report.writtenPaths).toEqual([]);
});

test("installed repair modes preserve previews and converge to the predicted bytes", () => {
  const directory = fixture();
  try {
    const path = join(directory, "README.md");
    const before = Buffer.from("#   Corpus\r\n");
    const after = Buffer.from("# Corpus\n");
    writeFileSync(path, before);
    const format = (flags) => {
      const child = spawnSync(
        process.execPath,
        [cli, "format", "--root", directory, "--json", ...flags],
        { encoding: "utf8" },
      );
      expect(child.error).toBeUndefined();
      expect(child.stderr).toBe("");
      return {
        status: child.status,
        report: validate(JSON.parse(child.stdout)),
      };
    };
    for (const flags of [[], ["--write", "--dry-run"]]) {
      expect(format(flags).status).toBe(2);
      expect(readFileSync(path)).toEqual(before);
    }
    const preview = format(["--dry-run"]);
    expect(preview.status).toBe(0);
    expect(preview.report.operationStatus).toBe("previewed");
    expect(preview.report.writtenPaths).toEqual([]);
    expect(readFileSync(path)).toEqual(before);
    const written = format(["--write"]);
    expect(written.status).toBe(0);
    expect(written.report.documentResults[0].candidate).toEqual(
      preview.report.documentResults[0].candidate,
    );
    expect(written.report.writtenPaths).toEqual(["README.md"]);
    expect(readFileSync(path)).toEqual(after);
    expect(format(["--write"]).report.writtenPaths).toEqual([]);
  } finally {
    expect(dirname(directory)).toBe(resolve(tmpdir()));
    rmSync(directory, { recursive: true });
  }
});

test("external npm prefix inspection retains this repository and literal scope", () => {
  const directory = fixture();
  try {
    expect(process.env.npm_execpath).toBeDefined();
    const child = spawnSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "--prefix",
        root,
        "run",
        "--silent",
        "inspect:markdown",
        "--",
        "--",
        "README.md",
      ],
      { cwd: directory, encoding: "utf8", timeout: 60000 },
    );
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    const report = validate(JSON.parse(child.stdout));
    expect(resolve(report.root)).toBe(resolve(root));
    expect(report.selection.files).toEqual(["README.md"]);
    expect(report.selection.reconciliationDecisions).toEqual([]);
    expect(report.writtenPaths).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
