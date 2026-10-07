// SPDX-License-Identifier: AGPL-3.0-only
// Explicit Node probes stay outside the application Jest discovery contract.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import {
  stageCandidate,
  checkCandidate,
  dataDigest,
  metadataGit,
} from "./check-markdown-candidate.mjs";

const artifacts = process.env.MARKDOWN_TEST_ARTIFACT_ROOT ?? tmpdir();
const cli =
  process.env.MARKDOWN_TEST_CLI ??
  fileURLToPath(
    new URL(
      "../tooling/markdown/node_modules/@hadden-industries/markdown-quality/src/cli.js",
      import.meta.url,
    ),
  );
const policy = {
  schemaVersion: 1,
  preset: "authored-gfm@1",
  include: ["**/*.md"],
  exclude: [],
  ignoreFiles: [],
  lint: {},
  links: { localFiles: true, rootRelative: "reject" },
  layout: { endOfLine: "lf", tabWidth: 2 },
};
function fixture() {
  const root = mkdtempSync(join(artifacts, "candidate-staging-test-"));
  const sourceRoot = join(root, "candidate"),
    trustedRoot = join(root, "trusted"),
    outputRoot = join(root, "staged");
  mkdirSync(sourceRoot);
  mkdirSync(trustedRoot);
  writeFileSync(
    join(trustedRoot, ".markdown-quality.json"),
    JSON.stringify(policy) + "\n",
  );
  writeFileSync(join(trustedRoot, ".gitignore"), "");
  writeFileSync(join(trustedRoot, ".prettierignore"), "");
  return { sourceRoot, trustedRoot, outputRoot };
}
test("metadata executable requires an absolute host path outside both checkouts", () => {
  const paths = fixture();
  assert.throws(() =>
    metadataGit(undefined, paths.sourceRoot, paths.trustedRoot),
  );
  assert.throws(() => metadataGit("git", paths.sourceRoot, paths.trustedRoot));
  for (const root of [paths.sourceRoot, paths.trustedRoot]) {
    const executable = join(root, "git.exe");
    writeFileSync(executable, "not a host tool");
    assert.throws(() =>
      metadataGit(executable, paths.sourceRoot, paths.trustedRoot),
    );
  }
});
test("repository metadata and dependency environments are excluded from derived data", () => {
  const paths = fixture();
  writeFileSync(
    join(paths.sourceRoot, "README.md"),
    "# Candidate\n\nSafe prose.\n",
  );
  for (const name of [
    ".git",
    "node_modules",
    ".venv",
    ".development-tools",
    ".release",
  ]) {
    mkdirSync(join(paths.sourceRoot, name));
    writeFileSync(
      join(paths.sourceRoot, name, "README.md"),
      "[not authored](missing.md)\n",
    );
  }
  stageCandidate(paths);
  for (const name of [
    ".git",
    "node_modules",
    ".venv",
    ".development-tools",
    ".release",
  ])
    assert.equal(existsSync(join(paths.outputRoot, name)), false, name);
  assert.equal(
    readFileSync(join(paths.outputRoot, "README.md"), "utf8"),
    "# Candidate\n\nSafe prose.\n",
  );
});
test("malicious candidate policy cannot hide a broken authored target; exit and independent native report survive", async () => {
  const paths = fixture();
  const original = "# Candidate\n\n[Missing target](missing.md).\n";
  writeFileSync(join(paths.sourceRoot, "README.md"), original);
  writeFileSync(
    join(paths.sourceRoot, ".markdown-quality.json"),
    JSON.stringify({
      ...policy,
      exclude: ["**/*.md"],
      links: { localFiles: false },
    }),
  );
  writeFileSync(join(paths.sourceRoot, ".gitignore"), "*.md\n");
  writeFileSync(join(paths.sourceRoot, ".prettierignore"), "*.md\n");
  writeFileSync(
    join(paths.sourceRoot, "prettier.config.js"),
    'throw new Error("candidate config executed")',
  );
  writeFileSync(
    join(paths.sourceRoot, "eslint.config.js"),
    'throw new Error("candidate config executed")',
  );
  writeFileSync(
    join(paths.sourceRoot, ".npmrc"),
    "//registry.npmjs.org/:_authToken=FAKE_CANDIDATE_SENTINEL\n",
  );
  const staging = stageCandidate(paths);
  const result = await checkCandidate({
    outputRoot: paths.outputRoot,
    cli,
    staging,
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.exitCode, 1);
  assert.equal(result.report.operation, "check");
  assert.deepEqual(result.report.selection.files, ["README.md"]);
  assert.ok(
    result.report.diagnostics.some(
      (value) => value.source === "links" && value.rule === "local-target",
    ),
  );
  assert.ok(
    result.suppliedEnvironmentNames.every((name) =>
      ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"].includes(name),
    ),
  );
  assert.equal(
    readFileSync(join(paths.sourceRoot, "README.md"), "utf8"),
    original,
  );
  assert.equal(
    readFileSync(join(paths.outputRoot, "README.md"), "utf8"),
    original,
  );
});
test("fresh output boundary rejects ancestor, reuse and reserved policy collisions", () => {
  const paths = fixture();
  assert.throws(() =>
    stageCandidate({ ...paths, outputRoot: resolve(paths.sourceRoot, "..") }),
  );
  mkdirSync(paths.outputRoot);
  assert.throws(() => stageCandidate(paths));
  const collision = fixture();
  mkdirSync(join(collision.sourceRoot, ".markdown-quality-trusted-inputs"));
  assert.throws(() => stageCandidate(collision));
});
test("corpus identity detects same-length edits and renamed local targets", async () => {
  const paths = fixture();
  writeFileSync(
    join(paths.sourceRoot, "README.md"),
    "# Candidate\n\nSafe prose.\n",
  );
  const staging = stageCandidate(paths);
  assert.equal(dataDigest(paths.outputRoot), staging.stagedDataSha256);
  writeFileSync(
    join(paths.outputRoot, "README.md"),
    "# Candidate\n\nNext prose.\n",
  );
  assert.notEqual(dataDigest(paths.outputRoot), staging.stagedDataSha256);
  await assert.rejects(
    checkCandidate({ outputRoot: paths.outputRoot, cli, staging }),
    /Staged inputs changed/,
  );
  const first = fixture();
  const second = fixture();
  writeFileSync(join(first.sourceRoot, "first.txt"), "same");
  writeFileSync(join(second.sourceRoot, "other.txt"), "same");
  assert.notEqual(
    stageCandidate(first).stagedDataSha256,
    stageCandidate(second).stagedDataSha256,
  );
});
