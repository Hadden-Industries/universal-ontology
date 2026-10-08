import { execFileSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
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
      [cli, "check", "--root", directory, "--inventory", "git", "--json"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.selection.files).toEqual(["README.md"]);
    expect(report.selection.inventory.map(({ path }) => path).sort()).toEqual(
      ["README.md", excluded].sort(),
    );
    expect(report.selection.exclusions).toContainEqual({
      path: excluded,
      pattern: "docs/reviews/*",
      matchedPath: "docs/reviews/nested/",
      reason: "excluded",
    });
    expect(readFileSync(join(directory, excluded))).toEqual(bytes);
    expect(report.written).toEqual([]);
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
  const report = JSON.parse(result.stdout);
  expect(report.errors).toContainEqual({
    code: "ERR_PARSE_ARGS_UNKNOWN_OPTION",
    message: expect.stringContaining("--base"),
  });
  expect(report.written).toEqual([]);
});
