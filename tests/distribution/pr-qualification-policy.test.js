import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyPullRequestPolicyGraph } from "../../scripts/distribution/verifyUniversalOntologyMcpRelease.js";
import {
  discoverNodeSuites,
  CI_CONTROL_SUITES,
} from "../../scripts/runPullRequestNodeChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  requiredJobsForScopes,
} from "../../scripts/selectPullRequestChecks.js";
import { PR_QUALIFICATION_JOB_NAMES } from "../../scripts/prQualification.js";
const files = [
  ".github/workflows/pr-validation.yml",
  ".github/workflows/full-qualification.yml",
  ".github/workflows/development-checks.yml",
  ".github/workflows/ontology-validation.yml",
  ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
  "scripts/selectPullRequestChecks.js",
  "scripts/evaluatePullRequestChecks.js",
  "scripts/pullRequestCheckPlan.schema.json",
  "scripts/pullRequestCheckPlanValidator.js",
  "scripts/generatePullRequestCheckPlanValidator.js",
  ".github/workflows/manual-mcp-packages.yml",
  "scripts/distribution/prepareManualMcpRelease.js",
  "scripts/runPullRequestNodeChecks.js",
  "scripts/prQualification.js",
  "scripts/prQualificationReuse.js",
  "scripts/prQualificationReuseCommand.js",
  "scripts/prQualificationCommand.js",
  "scripts/pullRequestNodeFamilies.js",
  "scripts/runTestsInParallel.py",
  ".markdown-quality.json",
  "tooling/markdown/package.json",
  "tooling/markdown/package-lock.json",
  ".github/workflows/markdown-quality.yml",
  "scripts/installMarkdownTools.mjs",
  "scripts/render_editing_policy.py",
  "scripts/setUpDevelopmentEnvironment.js",
  ".markdown-quality-execution.json",
  "package.json",
  "tests/markdown-quality.test.js",
  "tooling/markdown/archives/hadden-industries-markdown-quality-1.0.3.tgz",
  "tooling/markdown/archives/hadden-industries-markdown-quality-win32-x64-1.0.3.tgz",
  "tooling/markdown/archives/hadden-industries-markdown-quality-linux-x64-1.0.3.tgz",
];

test.each(files.slice(0, 5))(
  "%s uses supported cancellation contexts",
  (file) => {
    const workflow = parse(
      readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
    );
    const checkExpressions = (value, path = []) => {
      if (
        typeof value === "string" &&
        /\b(?:always|cancelled|success|failure)\(\)/u.test(value)
      ) {
        expect(path.at(-1)).toBe("if");
      } else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value))
          checkExpressions(child, [...path, key]);
      }
    };
    checkExpressions(workflow);
    const completion = workflow.jobs.gate ?? workflow.jobs.complete;
    const rejectIndex = completion.steps.findIndex(
      (step) => step.if === "${{ cancelled() }}" && step.run === "exit 1",
    );
    const evaluateIndex = completion.steps.findIndex((step) =>
      file === ".github/workflows/full-qualification.yml"
        ? step.run === "node scripts/prQualificationReuseCommand.js gate"
        : step.run?.startsWith("node scripts/evaluatePullRequestChecks.js"),
    );
    expect(rejectIndex).toBeGreaterThanOrEqual(0);
    expect(rejectIndex).toBeGreaterThan(evaluateIndex);
    expect(completion.steps[evaluateIndex].if).toBe(
      "${{ success() && !cancelled() }}",
    );
  },
);

test.each(files.slice(0, 2))("%s preserves npm's test environment", (file) => {
  const workflow = parse(
    readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
  );
  expect(
    workflow.jobs.node.steps.some(
      (step) => step.run === "node scripts/runPullRequestNodeChecks.js",
    ),
  ).toBe(true);
});

test("full plan assigns each discovered Jest suite exactly one Linux test owner", () => {
  const entry = parse(
    readFileSync(
      new URL("../../.github/workflows/pr-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  const development = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/development-checks.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const listing = (args) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "node_modules/jest/bin/jest.js",
          ...args,
          "--listTests",
          "--json",
          "--runInBand",
        ],
        { encoding: "utf8" },
      ),
    );
  const discovered = listing([]);
  expect(
    entry.jobs.node.steps.some(
      (step) => step.run === "node scripts/runPullRequestNodeChecks.js",
    ),
  ).toBe(true);
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((scope) => [scope, true]),
  );
  const plan = {
    schemaVersion: 5,
    packageMode: "manual",
    mode: "full",
    revision: "a".repeat(40),
    comparisonBase: null,
    scopes,
    requiredJobs: requiredJobsForScopes(scopes),
  };
  const repository = fileURLToPath(new URL("../../", import.meta.url));
  const product = discoverNodeSuites(plan, { root: repository }).map((path) =>
    join(repository, path),
  );
  const tooling = development.jobs.checks.steps
    .find((step) => step.run?.startsWith("npm test"))
    .run.split(" ")
    .slice(3);
  const installers = development.jobs["style-tooling"].steps
    .find((step) => step.run?.startsWith("npm test"))
    .run.split(" ")
    .slice(3);
  const groups = [product, listing(tooling), listing(installers)];
  const owned = groups.flat();
  expect([...new Set(owned)].sort()).toEqual(discovered.sort());
  for (const file of discovered)
    expect(owned.filter((candidate) => candidate === file)).toHaveLength(1);
});
test("reviewed graph accepts every entry point and control input", async () => {
  await expect(verifyPullRequestPolicyGraph()).resolves.toEqual({
    verifiedFileCount: 32,
  });
});

test("skipped development-control identity comes from a static workflow name", () => {
  const workflow = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/development-checks.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(workflow.jobs.checks.name).toBe("Development controls");
  expect(PR_QUALIFICATION_JOB_NAMES).toContain(
    `development / ${workflow.jobs.checks.name}`,
  );
  expect(workflow.jobs.checks.name).not.toContain("${{");
});

test("narrow native route owns exactly its eleven required control suites", () => {
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((scope) => [scope, scope === "ci_control"]),
  );
  const plan = {
    schemaVersion: 5,
    packageMode: "disabled",
    mode: "changed",
    revision: "a".repeat(40),
    comparisonBase: "b".repeat(40),
    scopes,
    requiredJobs: ["development", "node"],
  };
  expect(discoverNodeSuites(plan)).toEqual([...CI_CONTROL_SUITES].sort());
});
test.each(files)("rejects a semantic modification to %s", async (changed) => {
  const root = mkdtempSync(join(tmpdir(), "uo-pr-policy-"));
  try {
    for (const file of files) {
      let bytes = readFileSync(new URL(`../../${file}`, import.meta.url));
      if (file === changed) {
        if (file.endsWith(".tgz")) {
          bytes = Buffer.from(bytes);
          bytes[bytes.length - 1] = (bytes[bytes.length - 1] + 1) % 256;
        } else if (file.endsWith(".yml")) {
          const text = bytes.toString("utf8");
          const value = parse(text);
          value.permissions = { contents: "write" };
          bytes = Buffer.from(stringify(value));
        } else if (file.endsWith(".json")) {
          const text = bytes.toString("utf8");
          const value = JSON.parse(text);
          value.additionalProperties = true;
          bytes = Buffer.from(JSON.stringify(value));
        } else
          bytes = Buffer.concat([
            bytes,
            Buffer.from("\n// unreviewed control change\n"),
          ]);
      }
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), bytes);
    }
    await expect(verifyPullRequestPolicyGraph({ root })).rejects.toThrow(
      /Unreviewed PR execution policy/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("graph has one unconditional PR gate and closed consumer completion sets", () => {
  const entry = parse(
    readFileSync(
      new URL("../../.github/workflows/pr-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  expect(entry.jobs.gate.name).toBe("PR validation");
  expect(entry.jobs.gate.if).toBe("${{ always() }}");
  expect([...entry.jobs.gate.needs].sort()).toEqual(
    Object.keys(entry.jobs)
      .filter((id) => id !== "gate")
      .sort(),
  );
  for (const consumer of ["development", "ontology", "distribution"]) {
    const workflow = parse(
      readFileSync(
        new URL(`../../${entry.jobs[consumer].uses.slice(2)}`, import.meta.url),
        "utf8",
      ),
    );
    expect(Object.keys(workflow.on)).toEqual(["workflow_call"]);
    expect(workflow.concurrency).toBeUndefined();
    expect(workflow.jobs.complete.if).toBe("${{ always() }}");
    expect([...workflow.jobs.complete.needs].sort()).toEqual(
      Object.keys(workflow.jobs)
        .filter((id) => id !== "complete")
        .sort(),
    );
    expect(workflow.on.workflow_call.outputs["verified-revision"].value).toBe(
      "${{ jobs.complete.outputs.verified-revision }}",
    );
    for (const job of Object.values(workflow.jobs)) {
      expect(job.permissions).toEqual({ contents: "read" });
      expect(job["continue-on-error"]).toBeUndefined();
      expect(
        job.steps.some((s) => s.run?.includes("evaluatePullRequestChecks.js")),
      ).toBe(true);
    }
  }
  const full = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/full-qualification.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(full.on.schedule).toEqual([{ cron: "17 4 * * 3" }]);
  expect(full.concurrency).toBeUndefined();
  expect(full.on.push).toEqual({ branches: ["main"] });
  expect(Object.keys(full.on).sort()).toEqual([
    "push",
    "schedule",
    "workflow_call",
    "workflow_dispatch",
  ]);
  expect(entry.on).toEqual({
    pull_request: { types: ["opened", "synchronize", "reopened"] },
  });
  expect(entry.name).toBe("PR validation");
  for (const consumer of ["development", "ontology", "distribution"])
    expect(full.jobs[consumer].uses).toBe(entry.jobs[consumer].uses);
});

test("ordinary main admission has a bounded read-only selector and stable closed gate", () => {
  const full = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/full-qualification.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(full.jobs.select.permissions).toEqual({
    contents: "read",
    actions: "read",
  });
  expect(full.jobs.gate.permissions).toEqual({ contents: "read" });
  const reuse = full.jobs.select.steps.find((step) => step.id === "reuse");
  expect(reuse.run).toBe("node scripts/prQualificationReuseCommand.js select");
  expect(reuse.env).toEqual({
    GH_TOKEN: "${{ github.token }}",
    PR_CHECK_PLAN: "${{ steps.select.outputs.plan }}",
    UO_PR_QUALIFICATION_REUSE_DISABLED:
      "${{ vars.UO_PR_QUALIFICATION_REUSE_DISABLED }}",
  });
  expect(full.jobs.select.outputs.reuse).toBe(
    "${{ steps.reuse.outputs.reuse }}",
  );
  expect(full.jobs.select.outputs.qualification).toBe(
    "${{ steps.reuse.outputs.qualification }}",
  );
  expect(full.jobs.node.if).toContain("needs.select.outputs.reuse != 'true'");
  for (const [id, job] of Object.entries(full.jobs))
    if (id !== "select") expect(job.permissions).toEqual({ contents: "read" });
  expect(full.jobs.gate.if).toBe("${{ always() }}");
  expect([...full.jobs.gate.needs].sort()).toEqual(
    Object.keys(full.jobs)
      .filter((id) => id !== "gate")
      .sort(),
  );
  expect(full.jobs.gate.env.UO_PR_QUALIFICATION_REUSE_DISABLED).toBe(
    "${{ vars.UO_PR_QUALIFICATION_REUSE_DISABLED }}",
  );
});

function reusablePermissionFailures(workflows) {
  const rank = { none: 0, read: 1, write: 2 };
  const failures = [];
  for (const [path, caller] of Object.entries(workflows)) {
    for (const [id, job] of Object.entries(caller.jobs)) {
      if (!job.uses?.startsWith("./.github/workflows/")) continue;
      const target = job.uses.slice(2),
        callee = workflows[target];
      if (!callee) throw Error("Missing actual local reusable workflow");
      const allowed = job.permissions ?? caller.permissions ?? {};
      for (const [consumer, called] of Object.entries(callee.jobs)) {
        for (const [permission, value] of Object.entries(
          called.permissions ?? callee.permissions ?? {},
        )) {
          if (rank[value] > rank[allowed[permission] ?? "none"])
            failures.push({ path, id, target, consumer, permission });
        }
      }
    }
  }
  return failures;
}
function actualPolicyWorkflows() {
  return Object.fromEntries(
    files
      .filter((path) => path.endsWith(".yml"))
      .map((path) => [
        path,
        parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")),
      ]),
  );
}
test("every actual reusable caller permits its callees without token elevation", () => {
  const workflows = actualPolicyWorkflows();
  expect(
    workflows[".github/workflows/manual-mcp-packages.yml"].jobs.qualify
      .permissions,
  ).toEqual({ contents: "read", actions: "read" });
  expect(reusablePermissionFailures(workflows)).toEqual([]);
});
test.each(["caller-actions", "caller-contents", "callee-write"])(
  "rejects reusable permission escalation %s",
  (scenario) => {
    const workflows = actualPolicyWorkflows();
    const caller =
      workflows[".github/workflows/manual-mcp-packages.yml"].jobs.qualify;
    if (scenario === "caller-actions") caller.permissions.actions = "none";
    if (scenario === "caller-contents") caller.permissions.contents = "none";
    if (scenario === "callee-write")
      workflows[
        ".github/workflows/full-qualification.yml"
      ].jobs.node.permissions.contents = "write";
    expect(reusablePermissionFailures(workflows).length).toBeGreaterThan(0);
  },
);
