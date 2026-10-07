import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import validate from "../scripts/pullRequestCheckPlanValidator.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  CORE_CHECK_CONSUMER_IDS,
} from "../scripts/selectPullRequestChecks.js";
test("generated validator matches its reviewed schema", () => {
  execFileSync(process.execPath, [
    "scripts/generatePullRequestCheckPlanValidator.js",
    "--check",
  ]);
});
test("full plan requires every scope and unique consumers", () => {
  const plan = {
    schemaVersion: 4,
    packageMode: "manual",
    mode: "full",
    revision: "a".repeat(40),
    comparisonBase: null,
    scopes: Object.fromEntries(CORE_CHECK_SCOPE_NAMES.map((s) => [s, true])),
    requiredJobs: [...CORE_CHECK_CONSUMER_IDS],
  };
  expect(validate(plan)).toBe(true);
  const old = structuredClone(plan);
  old.schemaVersion = 3;
  expect(validate(old)).toBe(false);
  const missing = structuredClone(plan);
  delete missing.scopes.ci_control;
  expect(validate(missing)).toBe(false);
  const missingSetup = structuredClone(plan);
  delete missingSetup.scopes.python_setup_tests;
  expect(validate(missingSetup)).toBe(false);
  const disabledSetup = structuredClone(plan);
  disabledSetup.scopes.python_setup_tests = false;
  expect(validate(disabledSetup)).toBe(false);
  plan.scopes.documentation = false;
  expect(validate(plan)).toBe(false);
});
test("control path loads in a clean directory without node_modules", () => {
  const root = mkdtempSync(join(tmpdir(), "uo-control-plane-"));
  try {
    writeFileSync(join(root, "package.json"), '{"type":"module"}');
    for (const name of [
      "selectPullRequestChecks.js",
      "pullRequestNodeFamilies.js",
      "evaluatePullRequestChecks.js",
      "pullRequestCheckPlanValidator.js",
    ])
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(root, name),
      );
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import {evaluatePullRequestChecks} from "./evaluatePullRequestChecks.js"; if(evaluatePullRequestChecks({},{}).ok) process.exit(1);',
      ],
      { cwd: root },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
