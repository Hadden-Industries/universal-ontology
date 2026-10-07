import {
  evaluatePullRequestChecks,
  consumerJobs,
} from "../scripts/evaluatePullRequestChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  CORE_CHECK_CONSUMER_IDS,
  requiredJobsForScopes,
} from "../scripts/selectPullRequestChecks.js";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function fixture() {
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((s) => [s, s === "product_tests"]),
  );
  return {
    plan: {
      schemaVersion: 4,
      packageMode: "disabled",
      mode: "changed",
      revision: "a".repeat(40),
      comparisonBase: "b".repeat(40),
      scopes,
      requiredJobs: requiredJobsForScopes(scopes),
    },
    results: {
      select: "success",
      ...Object.fromEntries(
        CORE_CHECK_CONSUMER_IDS.map((id) => [
          id,
          id === "node" ? "success" : "skipped",
        ]),
      ),
    },
  };
}

test("native control route requires node success and rejects mixed omission", () => {
  const { plan, results } = fixture();
  plan.scopes.product_tests = false;
  plan.scopes.ci_control = true;
  expect(evaluatePullRequestChecks(plan, results).ok).toBe(true);
  expect(
    evaluatePullRequestChecks(plan, { ...results, node: "skipped" }).ok,
  ).toBe(false);
  plan.scopes.documentation = true;
  plan.requiredJobs = requiredJobsForScopes(plan.scopes);
  expect(
    evaluatePullRequestChecks(plan, { ...results, development: "success" }).ok,
  ).toBe(false);
});

test("development completion requires the separately selected Node-backed Python owner", () => {
  const { plan } = fixture();
  plan.scopes.product_tests = false;
  plan.scopes.python_tests = true;
  expect(consumerJobs(plan, "development")["python-tests"]).toBe(true);
  expect(consumerJobs(plan, "development")["python-node-tests"]).toBe(false);
  plan.scopes.python_setup_tests = true;
  expect(consumerJobs(plan, "development")["python-node-tests"]).toBe(true);
});

test.each(["valid", "missing-id", "digest-newline", "skipped-archive"])(
  "distribution completion publishes candidate outputs only for %s",
  (scenario) => {
    const directory = mkdtempSync(join(tmpdir(), "uo-candidate-completion-"));
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const scopes = Object.fromEntries(
      CORE_CHECK_SCOPE_NAMES.map((name) => [name, true]),
    );
    const plan = {
      schemaVersion: 4,
      packageMode: "manual",
      mode: "full",
      comparisonBase: null,
      revision,
      scopes,
      requiredJobs: requiredJobsForScopes(scopes),
    };
    const needs = Object.fromEntries(
      Object.keys(consumerJobs(plan, "distribution")).map((name) => [
        name,
        { result: "success" },
      ]),
    );
    needs.assemble.outputs = {
      "software-version": "1.0.0",
      "candidate-sha256": "a".repeat(64),
      "artifact-id": "42",
      "artifact-digest": "b".repeat(64),
    };
    if (scenario === "missing-id") delete needs.assemble.outputs["artifact-id"];
    if (scenario === "digest-newline")
      needs.assemble.outputs["artifact-digest"] += "\ninjected=true";
    if (scenario === "skipped-archive") needs.archive.result = "skipped";
    const output = join(directory, "output");
    try {
      const result = spawnSync(
        process.execPath,
        ["scripts/evaluatePullRequestChecks.js", "--consumer", "distribution"],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            GITHUB_SHA: revision,
            GITHUB_OUTPUT: output,
            PR_CHECK_PLAN: JSON.stringify(plan),
            PR_CHECK_RESULTS: JSON.stringify(needs),
          },
        },
      );
      expect(result.status).toBe(scenario === "valid" ? 0 : 1);
      if (scenario === "valid")
        expect(readFileSync(output, "utf8")).toBe(
          `verified-revision=${revision}\nsoftware-version=1.0.0\ncandidate-sha256=${"a".repeat(64)}\nartifact-id=42\nartifact-digest=${"b".repeat(64)}\n`,
        );
      else expect(existsSync(output)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test.each([
  "valid",
  "missing-output",
  "stale-output",
  "cancelled",
  "empty",
  "stale-plan",
  "extra-result",
  "selected-internal-skip",
  "selected-node-backed-skip",
  "selected-node-backed-failure",
  "selected-node-backed-cancelled",
  "selected-node-backed-missing",
])("CLI enforces %s", (scenario) => {
  const { plan, results } = fixture();
  plan.revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const needs = Object.fromEntries(
    Object.entries(results).map(([id, result]) => [
      id,
      { result, outputs: { "verified-revision": plan.revision } },
    ]),
  );
  const env = {
    ...process.env,
    GITHUB_SHA: plan.revision,
    PR_CHECK_CANCELLED: "false",
  };
  const args = ["scripts/evaluatePullRequestChecks.js"];
  if (scenario === "missing-output") delete needs.node.outputs;
  if (scenario === "stale-output")
    needs.node.outputs["verified-revision"] = "b".repeat(40);
  if (scenario === "cancelled") env.PR_CHECK_CANCELLED = "true";
  if (scenario === "stale-plan") plan.revision = "c".repeat(40);
  if (scenario === "extra-result") needs.unknown = { result: "success" };
  const root = mkdtempSync(join(tmpdir(), "uo-gate-cli-"));
  try {
    env.GITHUB_OUTPUT = join(root, "output");
    if (
      scenario === "selected-internal-skip" ||
      scenario.startsWith("selected-node-backed-")
    ) {
      plan.scopes.python_tests = true;
      plan.scopes.python_setup_tests = scenario.startsWith(
        "selected-node-backed-",
      );
      plan.requiredJobs = requiredJobsForScopes(plan.scopes);
      args.push("--consumer", "development");
      env.PR_CHECK_RESULTS = JSON.stringify(
        Object.fromEntries(
          Object.entries(consumerJobs(plan, "development")).map(
            ([id, required]) => [
              id,
              {
                result:
                  id ===
                  (plan.scopes.python_setup_tests
                    ? "python-node-tests"
                    : "python-tests")
                    ? scenario.endsWith("failure")
                      ? "failure"
                      : scenario.endsWith("cancelled")
                        ? "cancelled"
                        : "skipped"
                    : required
                      ? "success"
                      : "skipped",
              },
            ],
          ),
        ),
      );
      if (scenario === "selected-node-backed-missing") {
        const incomplete = JSON.parse(env.PR_CHECK_RESULTS);
        delete incomplete["python-node-tests"];
        env.PR_CHECK_RESULTS = JSON.stringify(incomplete);
      }
    } else env.PR_CHECK_RESULTS = JSON.stringify(needs);
    env.PR_CHECK_PLAN = scenario === "empty" ? "" : JSON.stringify(plan);
    const result = spawnSync(process.execPath, args, { env, encoding: "utf8" });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(scenario === "valid" ? 0 : 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("complete valid selected work succeeds", () => {
  const { plan, results } = fixture();
  expect(evaluatePullRequestChecks(plan, results)).toEqual({
    ok: true,
    failures: [],
  });
});
test.each(["failure", "cancelled", "skipped", "unknown", undefined])(
  "selected work rejects %s",
  (value) => {
    const { plan, results } = fixture();
    results.node = value;
    expect(evaluatePullRequestChecks(plan, results).ok).toBe(false);
  },
);
test.each(["failure", "cancelled", "unknown"])(
  "unselected work cannot conceal %s",
  (value) => {
    const { plan, results } = fixture();
    results.website = value;
    expect(evaluatePullRequestChecks(plan, results).ok).toBe(false);
  },
);
test.each([
  (p) => {
    p.schemaVersion = 1;
  },
  (p) => {
    p.mode = "bad";
  },
  (p) => {
    p.scopes.product_tests = "false";
  },
  (p) => {
    delete p.scopes.documentation;
  },
  (p) => {
    p.scopes.extra = false;
  },
  (p) => {
    p.requiredJobs = [];
  },
  (p) => {
    p.requiredJobs.push("node");
  },
  (p) => {
    p.revision = "short";
  },
  (p) => {
    p.mode = "full";
    p.comparisonBase = null;
  },
])("malformed plan cannot pass (%#)", (mutate) => {
  const { plan, results } = fixture();
  mutate(plan);
  expect(evaluatePullRequestChecks(plan, results).ok).toBe(false);
});
test.each(["select", ...CORE_CHECK_CONSUMER_IDS])(
  "missing %s fails even when unselected",
  (id) => {
    const { plan, results } = fixture();
    delete results[id];
    expect(evaluatePullRequestChecks(plan, results).ok).toBe(false);
  },
);
test("a green wrapper cannot change required internal work", () => {
  const { plan } = fixture();
  plan.scopes.python_tests = true;
  expect(consumerJobs(plan, "development")["python-tests"]).toBe(true);
  expect(consumerJobs(plan, "development")["style-tooling"]).toBe(false);
});
