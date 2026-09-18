import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const WORKFLOW_URL = new URL(
  "../.github/workflows/development-checks.yml",
  import.meta.url,
);
const SELECTOR_COMMAND =
  "node scripts/selectPullRequestChecks.js --scope development";
const ONTOLOGY_RUNNER_COMMAND =
  "node scripts/runRepositoryPython.js -m unittest tests.test_validate_ontologies -v";
const PYTHON_SETUP_TOOL_COMMAND =
  'node scripts/runRepositoryPython.js -m unittest discover -s tests -p "test_set_up_*.py"';
const JAVASCRIPT_DEVELOPMENT_COMMAND =
  "npm test -- --runInBand tests/configure-git-hooks.test.js tests/set-up-development-environment.test.js tests/run-repository-python.test.js tests/development-workflow.test.js tests/pr-check-scopes.test.js";

function readWorkflow() {
  return parseYaml(readFileSync(WORKFLOW_URL, "utf8"));
}

test("development checks run on pull requests and manual dispatch with read-only permissions", () => {
  const workflow = readWorkflow();
  expect(workflow.name).toBe("Development checks");
  expect(workflow.on).toEqual({ pull_request: null, workflow_dispatch: null });
  expect(workflow.permissions).toEqual({ contents: "read" });
  expect(Object.keys(workflow.jobs)).toEqual(["scope", "checks"]);
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
  });
  expect(workflow.jobs.scope.steps.at(-1).run).toBe(SELECTOR_COMMAND);
  expect(workflow.jobs.checks.needs).toBe("scope");
  expect(workflow.jobs.checks.if).toBe(
    "needs.scope.outputs.development == 'true'",
  );
});

test("Windows and Ubuntu checks exercise the complete development setup before the retained tests", () => {
  const job = readWorkflow().jobs.checks;
  expect(job.strategy).toEqual({
    "fail-fast": false,
    matrix: { os: ["ubuntu-24.04", "windows-latest"] },
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
