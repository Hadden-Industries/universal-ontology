import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const WORKFLOW_URL = new URL(
  "../.github/workflows/development-checks.yml",
  import.meta.url,
);
const SELECTOR_COMMAND = "node scripts/evaluatePullRequestChecks.js --scopes";
const ONTOLOGY_RUNNER_COMMAND =
  "node scripts/runRepositoryPython.js -m unittest tests.test_validate_ontologies -v";
const PYTHON_SETUP_TOOL_COMMAND =
  'node scripts/runRepositoryPython.js -m unittest discover -s tests -p "test_set_up_*.py"';
const JAVASCRIPT_DEVELOPMENT_COMMAND =
  "npm test -- --runInBand tests/configure-git-hooks.test.js tests/set-up-development-environment.test.js tests/run-repository-python.test.js tests/development-workflow.test.js tests/pr-check-scopes.test.js";

function readWorkflow() {
  return parseYaml(readFileSync(WORKFLOW_URL, "utf8"));
}

test.each([
  [
    "development-checks.yml",
    {
      scope: 5,
      documentation: 10,
      "python-style": 10,
      "python-tests": 30,
      "agent-skills-lock": 5,
      "style-tooling": 30,
      checks: 30,
      complete: 5,
    },
  ],
  [
    "ontology-validation.yml",
    { "validate-ontologies": 20, "policy-qa": 30, qualify: 45, complete: 5 },
  ],
  [
    "verify-universal-ontology-mcp-distribution.yml",
    {
      scope: 5,
      validate: 30,
      archive: 30,
      container: 30,
      assemble: 20,
      complete: 5,
    },
  ],
  ["codeql.yml", { scope: 5, analyze: 20 }],
])(
  "%s bounds every job with its approved timeout",
  (fileName, expectedTimeouts) => {
    const workflow = parseYaml(
      readFileSync(
        new URL(`../.github/workflows/${fileName}`, import.meta.url),
        "utf8",
      ),
    );
    expect(
      Object.fromEntries(
        Object.entries(workflow.jobs).map(([name, job]) => [
          name,
          job["timeout-minutes"],
        ]),
      ),
    ).toEqual(expectedTimeouts);
  },
);

test.each([["codeql.yml", "codeql"]])(
  "%s cancels only PR runs and isolates every non-PR run attempt",
  (fileName, prefix) => {
    const workflow = parseYaml(
      readFileSync(
        new URL(`../.github/workflows/${fileName}`, import.meta.url),
        "utf8",
      ),
    );
    // A shared non-PR group replaces pending runs even when cancellation is false.
    // This exact approved Actions expression isolates runs and their reruns.
    expect(workflow.concurrency).toEqual({
      group: `${prefix}-\${{ github.event_name }}-\${{ github.event.pull_request.number || format('{0}-{1}', github.run_id, github.run_attempt) }}`,
      "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
    });
    for (const job of Object.values(workflow.jobs)) {
      expect(job.concurrency).toBeUndefined();
    }
  },
);

test("the ontology gate excludes Python provisioning when no ontology input changed", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/ontology-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs["validate-ontologies"].steps;
  for (const name of [
    "Provision Python Runtime",
    "Create isolated Python environment",
    "Select ontology validation before installing dependencies",
  ]) {
    expect(steps.find((step) => step.name === name).if).toBe(
      "steps.ontology_jobs.outputs.ontology_validation == 'true'",
    );
  }
});

test("development checks accept only a revision-bound reusable plan", () => {
  const workflow = readWorkflow();
  expect(workflow.name).toBe("Development checks");
  expect(Object.keys(workflow.on)).toEqual(["workflow_call"]);
  expect(workflow.on.workflow_call.inputs.plan).toEqual({
    required: true,
    type: "string",
  });
  expect(workflow.permissions).toEqual({});
  expect(Object.keys(workflow.jobs)).toEqual([
    "scope",
    "documentation",
    "python-style",
    "python-tests",
    "agent-skills-lock",
    "style-tooling",
    "checks",
    "complete",
  ]);
  for (const job of Object.values(workflow.jobs)) {
    for (const { uses } of job.steps) {
      if (uses) {
        // Immutable action references: an owner/repo@<40-hex-sha> pin.
        expect(uses).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/u);
      }
    }
  }
});

test("unrelated PRs do not unconditionally launch the development matrix", () => {
  const workflow = readWorkflow();
  expect(workflow.jobs.scope.outputs).toEqual({
    development: "${{ steps.scope.outputs.development }}",
    documentation: "${{ steps.scope.outputs.documentation }}",
    python_style: "${{ steps.scope.outputs.python_style }}",
    python_tests: "${{ steps.scope.outputs.python_tests }}",
    agent_skills_lock: "${{ steps.scope.outputs.agent_skills_lock }}",
    style_tooling: "${{ steps.scope.outputs.style_tooling }}",
  });
  expect(workflow.jobs.scope.steps.at(-1).run).toBe(SELECTOR_COMMAND);
  expect(workflow.jobs.checks.needs).toBe("scope");
  expect(workflow.jobs.checks.if).toBe(
    "needs.scope.outputs.development == 'true'",
  );
});

test("Python changes run the whole Python suite on Windows and Ubuntu", () => {
  const job = readWorkflow().jobs["python-tests"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.python_tests == 'true'");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  expect(runs.indexOf("npm run set-up:development")).toBeLessThan(
    runs.indexOf("npm run test:python"),
  );
  expect(runs.at(-1)).toBe("npm run test:python");
});

test("a lock change validates the committed Agent Skills lock without the development setup", () => {
  const job = readWorkflow().jobs["agent-skills-lock"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.agent_skills_lock == 'true'");
  expect(job["runs-on"]).toBe("ubuntu-24.04");
  expect(job.strategy).toBeUndefined();
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  expect(runs).toEqual([
    "node scripts/evaluatePullRequestChecks.js --verify",
    "python -B -m unittest tests.test_set_up_agent_skills.CommittedSkillsLockTests -v",
  ]);
  expect(
    job.steps.some(({ uses }) => uses?.startsWith("actions/setup-python@")),
  ).toBe(true);
});

test("toolchain changes retain a Windows and Ubuntu owner for formatter regressions", () => {
  const job = readWorkflow().jobs["style-tooling"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.style_tooling == 'true'");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  expect(
    job.steps.some(({ uses }) => uses?.startsWith("actions/setup-python@")),
  ).toBe(true);
  expect(
    job.steps.some(({ uses }) => uses?.startsWith("actions/setup-node@")),
  ).toBe(true);
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  expect(runs.indexOf("npm run set-up:development")).toBeLessThan(
    runs.indexOf(
      "npm run lint:python && npm run format:python:check && npm run test:prose",
    ),
  );
  expect(runs).toContain(
    "npm test -- --runInBand --runTestsByPath tests/documentation-tools.test.js tests/python-style-tools.test.js",
  );
});

test("documentation content owns one Linux job with only the locked formatters", () => {
  const job = readWorkflow().jobs.documentation;
  expect(job["runs-on"]).toBe("ubuntu-24.04");
  expect(job.strategy).toBeUndefined();
  expect(job.if).toBe(
    "needs.scope.outputs.documentation == 'true' || needs.scope.outputs.style_tooling == 'true'",
  );
  const installation = job.steps.find(
    (step) => step.name === "Install only the locked documentation tools",
  );
  expect(installation.run).toContain("--ignore-scripts --no-audit --no-fund");
  expect(installation.run).toContain("--require-hashes --only-binary=:all:");
  const runs = job.steps
    .map((step) => step.run)
    .filter(Boolean)
    .join("\n");
  expect(runs).not.toMatch(
    /set-up:development|check:style|npm test|lint:python/u,
  );
  const check = job.steps.at(-1);
  expect(check.env.DOCUMENTATION_CHECK_ALL).toBe(
    "${{ fromJSON(inputs.plan).mode == 'full' || needs.scope.outputs.style_tooling == 'true' }}",
  );
  expect(check.run).toContain(
    '--base "$DOCUMENTATION_DIFF_BASE" --head "$DOCUMENTATION_DIFF_HEAD"',
  );
});

test("Windows and Ubuntu checks exercise the complete development setup before the retained tests", () => {
  const job = readWorkflow().jobs.checks;
  expect(job.strategy).toEqual({
    "fail-fast": false,
    matrix: { os: ["ubuntu-24.04", "windows-2025"] },
  });
  expect(job["runs-on"]).toBe("${{ matrix.os }}");
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  const setupIndex = runs.indexOf("npm run set-up:development");
  expect(setupIndex).toBeGreaterThan(0);
  // Every retained command formerly owned by the SDLC control workflow keeps a
  // CI owner and runs after the real dependency installation.
  expect(runs.slice(setupIndex + 1)).toEqual([
    ONTOLOGY_RUNNER_COMMAND,
    PYTHON_SETUP_TOOL_COMMAND,
    JAVASCRIPT_DEVELOPMENT_COMMAND,
  ]);
  const before = job.steps.slice(
    0,
    job.steps.findIndex(({ run }) => run === "npm run set-up:development"),
  );
  for (const prefix of [
    "actions/checkout@",
    "actions/setup-node@",
    "actions/setup-python@",
  ]) {
    expect(before.some(({ uses }) => uses?.startsWith(prefix))).toBe(true);
  }
  expect(before.some(({ run }) => run?.includes("npm install --global"))).toBe(
    true,
  );
  for (const run of runs) {
    // Dependency installation belongs to the setup command, not ad hoc steps.
    expect(run).not.toMatch(/npm ci|python -m venv|pip install/u);
    expect(run).not.toMatch(/sdlc/iu);
  }
});
