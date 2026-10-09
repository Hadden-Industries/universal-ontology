/** Native suite discovery and execution for the existing Node CI consumer. */
import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  realpathSync,
  mkdtempSync,
  rmSync,
  rmdirSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import { assertCheckPlan } from "./selectPullRequestChecks.js";
import { verifyPlanRevision } from "./evaluatePullRequestChecks.js";
import {
  changedNodeFamilies,
  suitesForNodeFamilies,
} from "./pullRequestNodeFamilies.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** Keep both proof handoffs below the runner's per-environment-string limit.
 * Decoded admission limits remain independent of compressibility. */
export function encodeNodeQualificationProof(proof, maximumBytes = 256 * 1024) {
  const bytes = Buffer.from(JSON.stringify(proof));
  if (bytes.length > maximumBytes) return null;
  const encoded = "gzip-base64:" + gzipSync(bytes).toString("base64");
  return encoded.length <= 64 * 1024 ? encoded : null;
}

/** Decode only canonical bounded transport; malformed proofs cannot authorize reuse. */
export function decodeNodeQualificationProof(text, maximumBytes = 256 * 1024) {
  if (
    typeof text !== "string" ||
    text.length > 64 * 1024 ||
    !text.startsWith("gzip-base64:")
  )
    throw Error("Absent or oversized Node qualification transport.");
  const encoded = text.slice("gzip-base64:".length);
  const compressed = Buffer.from(encoded, "base64");
  if (!encoded || compressed.toString("base64") !== encoded)
    throw Error("Invalid Node qualification base64.");
  const bytes = gunzipSync(compressed, { maxOutputLength: maximumBytes });
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export const CI_CONTROL_SUITES = Object.freeze([
  "tests/pr-check-scopes.test.js",
  "tests/pr-check-results.test.js",
  "tests/pr-check-plan-schema.test.js",
  "tests/pr-node-checks.test.js",
  "tests/pr-node-families.test.js",
  "tests/pr-qualification.test.js",
  "tests/pr-qualification-reuse.test.js",
  "tests/distribution/pr-qualification-policy.test.js",
  "tests/distribution/manual-mcp-packages.test.js",
  "tests/distribution/manual-mcp-cache-budget.test.js",
  "tests/distribution/universal-ontology-mcp-release-verifier.test.js",
]);

export function nodeCheckArguments(plan, { families = null } = {}) {
  assertCheckPlan(plan);
  if (!plan.requiredJobs.includes("node"))
    throw new Error("The Node consumer is not selected.");
  const narrow =
    plan.scopes.ci_control &&
    Object.entries(plan.scopes).every(
      ([scope, selected]) => scope === "ci_control" || !selected,
    );
  if (narrow) return ["--runTestsByPath", ...CI_CONTROL_SUITES];
  if (
    plan.mode === "changed" &&
    plan.packageMode === "disabled" &&
    plan.scopes.product_tests &&
    families &&
    Object.entries(plan.scopes).every(
      ([scope, selected]) => scope === "product_tests" || !selected,
    )
  )
    return ["--runTestsByPath", ...suitesForNodeFamilies(families)];
  // The isolated style-tooling job owns this suite. Ordinary product jobs do
  // not install the private Markdown graph, even when their scopes are mixed.
  const ignored = [
    "/node_modules/",
    "/.sdlc/runtime/",
    "/tests/markdown-quality.test.js$",
  ];
  if (plan.scopes.development)
    ignored.push(
      "/tests/(configure-git-hooks|set-up-development-environment|run-repository-python|development-workflow|pr-check-scopes).test.js$",
    );
  if (plan.scopes.style_tooling)
    ignored.push("/tests/python-style-tools.test.js$");
  return [`--testPathIgnorePatterns=${ignored.join("|")}`];
}

function suitePath(path, root) {
  if (typeof path !== "string" || !isAbsolute(path))
    throw new Error("Native suite identity is not an absolute path.");
  const name = relative(root, path).replaceAll("\\", "/");
  if (!name || name === ".." || name.startsWith("../") || isAbsolute(name))
    throw new Error("Native suite identity leaves the checkout.");
  return name;
}

function selectedNodeSuites(plan, root) {
  const families =
    plan.mode === "changed" &&
    plan.packageMode === "disabled" &&
    plan.scopes.product_tests &&
    Object.entries(plan.scopes).every(
      ([scope, selected]) => scope === "product_tests" || !selected,
    )
      ? changedNodeFamilies({
          root,
          base: plan.comparisonBase,
          revision: plan.revision,
        })
      : null;
  const args = nodeCheckArguments(plan, { families });
  const inventory =
    args[0] !== "--runTestsByPath"
      ? null
      : families
        ? suitesForNodeFamilies(families)
        : [...CI_CONTROL_SUITES].sort();
  return { args, inventory, families };
}
export function discoverNodeSuites(plan, { root = ROOT } = {}) {
  const { args, inventory } = selectedNodeSuites(plan, root);
  const discovered = JSON.parse(
    execFileSync(
      process.execPath,
      [
        join(root, "node_modules/jest/bin/jest.js"),
        ...args,
        "--listTests",
        "--json",
        "--runInBand",
      ],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
      },
    ),
  );
  if (!Array.isArray(discovered) || !discovered.length)
    throw new Error("Selected native suite inventory is empty.");
  const names = discovered.map((path) => suitePath(path, root)).sort();
  if (new Set(names).size !== names.length)
    throw new Error("Selected native suite inventory has duplicates.");
  if (
    args[0] === "--runTestsByPath" &&
    JSON.stringify(names) !== JSON.stringify(inventory)
  )
    throw new Error("Selected control suite inventory is incomplete.");
  return names;
}

/** Compare native suite discovery with report completion and assertion totals.
 * Jest titles are labels, not unique identities: test.each may repeat a title.
 * This checks native report consistency, not an independent assertion registry.
 */
export function validateNodeResults(report, expected, { root = ROOT } = {}) {
  if (
    !report ||
    report.success !== true ||
    !Array.isArray(report.testResults) ||
    !expected.length ||
    new Set(expected).size !== expected.length ||
    report.numTotalTestSuites !== expected.length ||
    report.numPassedTestSuites !== expected.length ||
    report.numFailedTestSuites !== 0 ||
    report.numPendingTestSuites !== 0 ||
    report.numRuntimeErrorTestSuites !== 0
  )
    throw new Error("Native suite completion is incomplete or unsuccessful.");
  const names = report.testResults.map((suite) => suitePath(suite.name, root));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expected].sort())
  )
    throw new Error("Native results disagree with discovered suite ownership.");
  let assertions = 0;
  for (const suite of report.testResults) {
    if (
      suite.status !== "passed" ||
      !Array.isArray(suite.assertionResults) ||
      !suite.assertionResults.length
    )
      throw new Error("Selected native suite has no passing assertions.");
    for (const assertion of suite.assertionResults) {
      if (
        assertion.status !== "passed" ||
        typeof assertion.fullName !== "string" ||
        !assertion.fullName
      )
        throw new Error("Selected native assertion is missing or skipped.");
      assertions++;
    }
  }
  if (
    report.numTotalTests !== assertions ||
    report.numPassedTests !== assertions ||
    report.numFailedTests !== 0 ||
    report.numPendingTests !== 0 ||
    report.numTodoTests !== 0
  )
    throw new Error("Native assertion totals disagree with executed results.");
  return { suiteCount: names.length, assertionCount: assertions };
}

/** Retain native executed labels/counts, not an independent assertion registry. */
export function createNativeNodeCoverage(
  report,
  expected,
  {
    root = ROOT,
    revision,
    runId,
    runAttempt,
    environment,
    arguments: args = ["--runTestsByPath", ...expected],
    families = null,
  } = {},
) {
  const counts = validateNodeResults(report, expected, { root });
  if (
    !/^[a-f0-9]{40}$/.test(revision ?? "") ||
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(runAttempt) ||
    runAttempt <= 0
  )
    throw Error("Native coverage identity is incomplete.");
  return {
    schemaVersion: 2,
    proof: "DIRECT_EXECUTION",
    revision,
    runId,
    runAttempt,
    environment,
    arguments: args,
    families,
    discoveredSuites: [...expected].sort(),
    ...counts,
    suites: report.testResults
      .map((suite) => ({
        path: suitePath(suite.name, root),
        assertions: suite.assertionResults.map(
          (assertion) => assertion.fullName,
        ),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}
export function runNodeChecks(plan, { root = ROOT, env = process.env } = {}) {
  verifyPlanRevision(plan, env);
  const { args, families } = selectedNodeSuites(plan, root);
  const expected = discoverNodeSuites(plan, { root });
  // Resolve npm's own CLI beside the selected Node runtime without a shell.
  const npmCli = realpathSync(
    env.npm_execpath ||
      join(
        dirname(process.execPath),
        process.platform === "win32"
          ? "node_modules/npm/bin/npm-cli.js"
          : "npm",
      ),
  );
  const directory = mkdtempSync(
    join(env.RUNNER_TEMP || tmpdir(), "uo-node-results-"),
  );
  const reportPath = join(directory, "results.json");
  const result = spawnSync(
    process.execPath,
    [
      npmCli,
      "test",
      "--",
      "--runInBand",
      ...args,
      "--json",
      `--outputFile=${reportPath}`,
    ],
    {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "inherit",
      timeout: 25 * 60 * 1000,
    },
  );
  try {
    if (result.error || result.status !== 0)
      throw new Error(
        result.error?.message || `Native tests exited ${result.status}.`,
      );
    const size = statSync(reportPath).size;
    if (size > 32 * 1024 * 1024)
      throw new Error("Native result exceeds 32 MiB.");
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const coverage = validateNodeResults(report, expected, { root });
    console.log(
      JSON.stringify({
        coverage:
          args[0] === "--runTestsByPath"
            ? families
              ? "node-families"
              : "ci_control"
            : "selected-node",
        families,
        revision: plan.revision,
        ...coverage,
      }),
    );
    if (
      env.GITHUB_OUTPUT &&
      plan.mode === "changed" &&
      plan.packageMode === "disabled"
    ) {
      // Capture the runtime that executed the assertions, including retained attempts.
      const npmVersion = spawnSync(process.execPath, [npmCli, "--version"], {
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
        maxBuffer: 4096,
      });
      if (npmVersion.error || npmVersion.status !== 0)
        throw Error("Native producing npm identity is unavailable.");
      const native = createNativeNodeCoverage(report, expected, {
        root,
        revision: plan.revision,
        runId: Number(env.GITHUB_RUN_ID),
        runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
        environment: {
          os: env.RUNNER_OS,
          architecture: env.RUNNER_ARCH,
          image: env.ImageOS,
          imageVersion: env.ImageVersion,
          node: process.version,
          npm: npmVersion.stdout.trim(),
          nodeOptions: env.NODE_OPTIONS || "",
          timezone: env.TZ || "",
          language: env.LANG || "",
          externalInputs: "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
        },
        arguments: args,
        families,
      });
      const serialized = encodeNodeQualificationProof(native);
      // Retention is optional: large successful suites must still pass fresh CI.
      if (serialized !== null)
        appendFileSync(
          env.GITHUB_OUTPUT,
          "native-coverage=" + serialized + "\n",
        );
      else
        console.log(
          "Node checks passed; retained coverage exceeds transport limits, so main will run fresh.",
        );
    }
    // Remove only this process's two spent temporary resources after validation.
    rmSync(reportPath);
    rmdirSync(directory);
    return coverage;
  } catch (error) {
    console.error(
      existsSync(reportPath)
        ? `Temporary native diagnostics: ${reportPath} (not uploaded; runner cleanup may remove them).`
        : "Native execution failed before producing a result report.",
    );
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 2)
      throw new Error("No command arguments are accepted.");
    runNodeChecks(JSON.parse(process.env.PR_CHECK_PLAN || ""));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
