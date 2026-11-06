// Consumer checks exercise repository-owned behavior through root npm commands.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run these consumer checks through npm.");
const scripts = JSON.parse(
  readFileSync(join(repository, "package.json"), "utf8"),
).scripts;
const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});
function npm(args, root = repository) {
  const child = spawnSync(process.execPath, [npmCli, "--silent", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  assert.ifError(child.error);
  assert.equal(child.signal, null, child.stderr);
  return child;
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "universal-ontology-markdown-"));
  roots.push(root);
  for (const path of [
    ".markdown-quality.json",
    ".markdown-quality-execution.json",
  ]) {
    if (existsSync(join(repository, path))) {
      copyFileSync(join(repository, path), join(root, path));
    }
  }
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      private: true,
      scripts: {
        "check:markdown": scripts["check:markdown"],
        "format:markdown": scripts["format:markdown"],
      },
    }),
  );
  symlinkSync(
    join(repository, "node_modules"),
    join(root, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  return root;
}
test("root commands select maintained documents and independently exclude preserved records", () => {
  const git = spawnSync("git", ["ls-files", "-z", "--", "*.md"], {
    cwd: repository,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.ifError(git.error);
  assert.equal(git.status, 0, git.stderr);
  const tracked = git.stdout.split("\0").filter(Boolean);
  const preserved = tracked.filter((path) =>
    /^docs\/(?:plans|reviews|research|sdlc)\//u.test(path),
  );
  assert.ok(
    preserved.length > 0,
    "The ownership assertion needs real preserved records.",
  );
  const child = npm(["run", "inspect:markdown"]);
  assert.equal(child.status, 0, child.stderr);
  const selection = JSON.parse(child.stdout).selection;
  for (const path of ["README.md", "AGENTS.md", "docs/development.md"]) {
    assert.ok(selection.files.includes(path), path);
  }
  for (const path of preserved) {
    assert.ok(!selection.files.includes(path), path);
    assert.ok(
      selection.omissions.some(
        (item) => item.path === path && item.reason === "excluded",
      ),
      path,
    );
  }
});
test("root check and format preserve domain literals and excluded historical bytes", () => {
  const root = fixture();
  const path = join(root, "README.md");
  mkdirSync(dirname(path), { recursive: true });
  const original = Buffer.from(
    '#   Guide\n\n```turtle\n<urn:example:Policy> <urn:example:label> "literal  bytes" .  \n```\n',
  );
  const expected =
    '# Guide\n\n```turtle\n<urn:example:Policy> <urn:example:label> "literal  bytes" .  \n```\n';
  const retained = join(root, "docs/plans/retained.md");
  mkdirSync(dirname(retained), { recursive: true });
  const historical = Buffer.from("#   Retained historical record\n");
  writeFileSync(retained, historical);
  writeFileSync(path, original);
  const check = npm(["run", "check:markdown"], root);
  assert.equal(check.status, 1, check.stderr);
  assert.deepEqual(readFileSync(path), original);
  assert.deepEqual(readFileSync(retained), historical);
  const format = npm(["run", "format:markdown"], root);
  assert.equal(format.status, 0, format.stderr);
  assert.equal(readFileSync(path, "utf8"), expected);
  assert.deepEqual(readFileSync(retained), historical);
  const clean = npm(["run", "check:markdown"], root);
  assert.equal(clean.status, 0, clean.stderr);
});
test("root check propagates native success, quality failure and configuration failure without writes", () => {
  const root = fixture();
  const path = join(root, "README.md");
  for (const [content, expected] of [
    ["# Guide\n\nA clear sentence.\n", 0],
    ["# Guide\n\n[Missing target](absent.md).\n", 1],
    ["# Guide\n", 2],
  ]) {
    writeFileSync(path, content);
    if (expected === 2) {
      writeFileSync(join(root, ".markdown-quality.json"), "{invalid");
    }
    const child = npm(["run", "check:markdown"], root);
    assert.equal(child.status, expected, child.stderr);
    assert.equal(readFileSync(path, "utf8"), content);
  }
});
