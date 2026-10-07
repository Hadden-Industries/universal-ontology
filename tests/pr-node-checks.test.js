import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  nodeCheckArguments,
  discoverNodeSuites,
  validateNodeResults,
  createNativeNodeCoverage,
  CI_CONTROL_SUITES,
} from "../scripts/runPullRequestNodeChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  requiredJobsForScopes,
} from "../scripts/selectPullRequestChecks.js";

function plan(selected = ["ci_control"]) {
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((scope) => [scope, selected.includes(scope)]),
  );
  return {
    schemaVersion: 4,
    packageMode: "disabled",
    mode: "changed",
    revision: "a".repeat(40),
    comparisonBase: "b".repeat(40),
    scopes,
    requiredJobs: requiredJobsForScopes(scopes),
  };
}

test("native discovery exactly matches the closed control inventory", () => {
  expect(discoverNodeSuites(plan())).toEqual([...CI_CONTROL_SUITES].sort());
});

test("full Node ownership preserves actual development exclusions", () => {
  const args = nodeCheckArguments(
    plan(["product_tests", "development", "style_tooling"]),
  );
  expect(args[0]).toContain("pr-check-scopes");
  expect(args[0]).toContain("documentation-tools");
  expect(nodeCheckArguments(plan(["product_tests"]))[0]).not.toContain(
    "pr-check-scopes",
  );
  expect(() => nodeCheckArguments(plan([]))).toThrow(/not selected/u);
  expect(() =>
    nodeCheckArguments(plan(["ci_control", "documentation"])),
  ).toThrow(/mixed/u);
});

describe("real native Jest assertion accounting", () => {
  let directory;
  let report;
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "uo-native-accounting-"));
    const testPath = join(directory, "native.test.cjs");
    const reportPath = join(directory, "results.json");
    writeFileSync(
      testPath,
      "test('first obligation', () => expect(1).toBe(1));\ntest('second obligation', () => expect(2).toBe(2));\ntest.each([1, 2])('parameterized obligation', (value) => expect(value).toBeGreaterThan(0));\n",
    );
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../node_modules/jest/bin/jest.js", import.meta.url),
        ),
        "--config",
        JSON.stringify({
          rootDir: directory,
          testEnvironment: "node",
          transform: {},
          testMatch: ["**/*.test.cjs"],
        }),
        "--runInBand",
        "--json",
        `--outputFile=${reportPath}`,
      ],
      {
        encoding: "utf8",
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      },
    );
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  });
  afterAll(() => {
    // This fixture owns its named files and verified temporary directory.
    rmSync(join(directory, "native.test.cjs"));
    rmSync(join(directory, "results.json"));
    rmdirSync(directory);
  });
  const expected = ["native.test.cjs"];
  test("accepts complete real native results", () => {
    expect(validateNodeResults(report, expected, { root: directory })).toEqual({
      suiteCount: 1,
      assertionCount: 4,
    });
  });
  test("accepts distinct native parameterized cases sharing a title", () => {
    const cases = report.testResults[0].assertionResults.filter(
      (assertion) => assertion.fullName === "parameterized obligation",
    );
    expect(cases).toHaveLength(2);
    expect(() =>
      validateNodeResults(report, expected, { root: directory }),
    ).not.toThrow();
  });
  test("retained coverage preserves actual native labels and producing identity", () => {
    const identity = {
      root: directory,
      revision: "a".repeat(40),
      runId: 100,
      runAttempt: 2,
      environment: { producingHost: "fixture" },
    };
    const coverage = createNativeNodeCoverage(report, expected, identity);
    expect(coverage.environment).toEqual(identity.environment);
    expect(coverage).toMatchObject({
      schemaVersion: 1,
      proof: "DIRECT_EXECUTION",
      revision: identity.revision,
      runId: 100,
      runAttempt: 2,
      suiteCount: 1,
      assertionCount: 4,
    });
    expect(
      coverage.suites[0].assertions.filter(
        (label) => label === "parameterized obligation",
      ),
    ).toHaveLength(2);
    expect(() =>
      createNativeNodeCoverage(report, expected, {
        ...identity,
        runAttempt: 0,
      }),
    ).toThrow();
    expect(() =>
      createNativeNodeCoverage(report, expected, {
        ...identity,
        revision: "foreign",
      }),
    ).toThrow();
  });
  test.each([
    "missing-suite",
    "foreign-suite",
    "skipped",
    "todo",
    "missing-assertion",
    "missing-title",
    "duplicate-suite",
    "empty",
    "forged-total",
    "runtime-error",
    "false-success",
  ])("rejects native result mutation %s", (scenario) => {
    const changed = structuredClone(report);
    if (scenario === "missing-suite") changed.testResults = [];
    if (scenario === "foreign-suite")
      changed.testResults[0].name = join(tmpdir(), "foreign.test.cjs");
    if (["skipped", "todo"].includes(scenario))
      changed.testResults[0].assertionResults[0].status =
        scenario === "skipped" ? "pending" : "todo";
    if (scenario === "missing-assertion")
      changed.testResults[0].assertionResults.pop();
    if (scenario === "missing-title")
      changed.testResults[0].assertionResults[0].fullName = "";
    if (scenario === "duplicate-suite")
      changed.testResults.push(structuredClone(changed.testResults[0]));
    if (scenario === "empty") changed.testResults[0].assertionResults = [];
    if (scenario === "forged-total") changed.numPassedTests++;
    if (scenario === "runtime-error") changed.numRuntimeErrorTestSuites = 1;
    if (scenario === "false-success") changed.success = false;
    expect(() =>
      validateNodeResults(changed, expected, { root: directory }),
    ).toThrow();
  });
});
