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
import { verifyPullRequestPolicyGraph } from "../../scripts/distribution/verifyUniversalOntologyMcpRelease.js";
const files = [
  ".github/workflows/pr-validation.yml",
  ".github/workflows/full-qualification.yml",
  ".github/workflows/pr-development-consumer.yml",
  ".github/workflows/pr-ontology-consumer.yml",
  ".github/workflows/pr-distribution-consumer.yml",
  "scripts/selectPullRequestChecks.js",
  "scripts/evaluatePullRequestChecks.js",
  "scripts/pullRequestCheckPlan.schema.json",
  "scripts/pullRequestCheckPlanValidator.js",
  "scripts/generatePullRequestCheckPlanValidator.js",
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
      step.run?.includes("evaluatePullRequestChecks.js"),
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
    workflow.jobs.node.steps.some((step) =>
      step.run?.includes(
        'npm test -- --runInBand --testPathIgnorePatterns="$ignored"',
      ),
    ),
  ).toBe(true);
});

test("full shadow plan assigns each discovered Jest suite exactly one Linux test owner", () => {
  const entry = parse(
    readFileSync(
      new URL("../../.github/workflows/pr-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  const development = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/pr-development-consumer.yml",
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
  const productScript = entry.jobs.node.steps.find((step) =>
    step.run?.includes("console.log(ignored"),
  ).run;
  // Run the actual workflow's exclusion calculation, then discover its suites.
  const selectionSource = productScript
    .split("\n")
    .slice(1, productScript.split("\n").indexOf("NODE"))
    .join("\n");
  const ignored = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", selectionSource],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PR_CHECK_PLAN: JSON.stringify({
          scopes: { development: true, style_tooling: true },
        }),
      },
    },
  ).trim();
  const product = listing([`--testPathIgnorePatterns=${ignored}`]);
  const tooling = development.jobs.checks.steps
    .find((step) => step.run?.startsWith("npm test"))
    .run.split(" ")
    .slice(3);
  const installers = development.jobs["style-tooling"].steps
    .find((step) => step.run?.startsWith("npm test"))
    .run.split(" ")
    .slice(3);
  const groups = [
    product,
    listing(tooling),
    listing(installers),
    listing(["tests/prose-formatting.test.js"]),
  ];
  const owned = groups.flat();
  expect([...new Set(owned)].sort()).toEqual(discovered.sort());
  for (const file of discovered)
    expect(owned.filter((candidate) => candidate === file)).toHaveLength(1);
});
test("reviewed graph accepts every entry point and control input", async () => {
  await expect(verifyPullRequestPolicyGraph()).resolves.toEqual({
    verifiedFileCount: 10,
  });
});
test.each(files)("rejects a semantic modification to %s", async (changed) => {
  const root = mkdtempSync(join(tmpdir(), "uo-pr-policy-"));
  try {
    for (const file of files) {
      let text = readFileSync(
        new URL(`../../${file}`, import.meta.url),
        "utf8",
      );
      if (file === changed) {
        if (file.endsWith(".yml")) {
          const value = parse(text);
          value.permissions = { contents: "write" };
          text = stringify(value);
        } else if (file.endsWith(".json")) {
          const value = JSON.parse(text);
          value.additionalProperties = true;
          text = JSON.stringify(value);
        } else text += "\n// unreviewed control change\n";
      }
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    await expect(verifyPullRequestPolicyGraph({ root })).rejects.toThrow(
      /Unreviewed PR execution policy/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("shadow graph has one unconditional PR gate and closed consumer completion sets", () => {
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
        new URL(
          `../../.github/workflows/pr-${consumer}-consumer.yml`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(Object.keys(workflow.on)).toEqual(["workflow_call"]);
    expect(workflow.concurrency).toBeUndefined();
    // Disposable trial deliberately suppresses the development receipt.
    expect(workflow.jobs.complete.if).toBe(
      workflow.name === "PR development consumer"
        ? "${{ false }}"
        : "${{ always() }}",
    );
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
  expect(full.on.push).toBeUndefined();
});
