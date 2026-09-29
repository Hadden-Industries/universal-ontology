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
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function fixture() {
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((s) => [s, s === "product_tests"]),
  );
  return {
    plan: {
      schemaVersion: 1,
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

test.each([
  "valid",
  "missing-output",
  "stale-output",
  "cancelled",
  "empty",
  "stale-plan",
  "extra-result",
  "selected-internal-skip",
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
    if (scenario === "selected-internal-skip") {
      plan.scopes.python_tests = true;
      plan.requiredJobs = requiredJobsForScopes(plan.scopes);
      args.push("--consumer", "development");
      env.PR_CHECK_RESULTS = JSON.stringify(
        Object.fromEntries(
          Object.entries(consumerJobs(plan, "development")).map(
            ([id, required]) => [
              id,
              {
                result:
                  id === "python-tests"
                    ? "skipped"
                    : required
                      ? "success"
                      : "skipped",
              },
            ],
          ),
        ),
      );
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
    p.schemaVersion = 2;
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
