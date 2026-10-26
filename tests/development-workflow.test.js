import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { installRepositoryNpm } from "../scripts/installRepositoryNpm.js";
import {
  repositoryNpmTarget,
  syncNpmProjections,
} from "../scripts/repositoryNpmTarget.js";

const WORKFLOW_URL = new URL(
  "../.github/workflows/development-checks.yml",
  import.meta.url,
);
const SELECTOR_COMMAND = "node scripts/evaluatePullRequestChecks.js --scopes";
const PYTHON_PROVISIONING_ACTION = "./.github/actions/setup-python";
const ONTOLOGY_RUNNER_COMMAND =
  "node scripts/runRepositoryPython.js -m unittest tests.test_validate_ontologies -v";
const PYTHON_SETUP_TOOL_COMMAND =
  'node scripts/runRepositoryPython.js -m unittest discover -s tests -p "test_set_up_*.py"';
const JAVASCRIPT_DEVELOPMENT_COMMAND =
  "npm test -- --runInBand tests/configure-git-hooks.test.js tests/set-up-development-environment.test.js tests/run-repository-python.test.js tests/development-workflow.test.js tests/pr-check-scopes.test.js";

function readWorkflow() {
  return parseYaml(readFileSync(WORKFLOW_URL, "utf8"));
}

test("shared Python setup keeps a pinned native provider and isolated repository selection", () => {
  const action = parseYaml(
    readFileSync(
      new URL("../.github/actions/setup-python/action.yml", import.meta.url),
      "utf8",
    ),
  );
  expect(action.runs.using).toBe("composite");
  expect(action.runs.steps).toHaveLength(1);
  const step = action.runs.steps[0];
  expect(step.uses).toMatch(/^astral-sh\/setup-uv@[0-9a-f]{40}$/u);
  expect(step.with).toEqual({
    version: expect.stringMatching(/^\d+\.\d+\.\d+$/u),
    "activate-environment": true,
    "venv-path": "${{ runner.temp }}/python",
    "no-project": true,
    "enable-cache": false,
  });
});

/** Native fixture files keep selector tests independent of the repository's current version. */
function removeNpmSelectorFixture(root, parent) {
  if (dirname(root) !== parent || !basename(root).startsWith("uo-ci-settings-"))
    throw new Error("Unexpected fixture cleanup target.");
  rmSync(root, { recursive: true, force: true });
}

function withNpmSelector(packageManager, action) {
  const parent = realpathSync(tmpdir());
  const root = mkdtempSync(join(parent, "uo-ci-settings-"));
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ packageManager }),
    );
    return action(root);
  } finally {
    removeNpmSelectorFixture(root, parent);
  }
}

test.each(["linux", "darwin", "win32"])(
  "%s installs and verifies the manifest-selected npm before continuing",
  (platform) => {
    withNpmSelector("npm@99.2.3", (root) => {
      const calls = [];
      installRepositoryNpm({
        root,
        platform,
        run: (...args) => {
          calls.push(args);
          return { status: 0, stdout: "99.2.3\n" };
        },
      });
      const executable = platform === "win32" ? "npm.cmd" : "npm";
      expect(calls).toEqual([
        [
          executable,
          ["install", "--global", "--no-audit", "--no-fund", "npm@99.2.3"],
          {
            cwd: root,
            windowsHide: true,
            shell: platform === "win32",
            stdio: "inherit",
          },
        ],
        [
          executable,
          ["--version"],
          {
            cwd: root,
            windowsHide: true,
            shell: platform === "win32",
            encoding: "utf8",
          },
        ],
      ]);
    });
  },
);

test.each([
  undefined,
  "pnpm@99.2.3",
  "npm@latest",
  "npm@99.2.3-beta.1",
  "npm@99.2.3 & echo injected",
  "npm@099.2.3",
])("invalid npm selector %j cannot start installation", (selector) => {
  withNpmSelector(selector, (root) => {
    let invoked = false;
    expect(() =>
      installRepositoryNpm({
        root,
        run: () => {
          invoked = true;
        },
      }),
    ).toThrow("package.json.packageManager");
    expect(invoked).toBe(false);
  });
});

test.each([
  [{ status: 17 }, /bootstrap failed/u],
  [{ status: null, signal: "SIGTERM" }, /bootstrap failed/u],
  [{ status: 0, stdout: "99.2.4\n" }, /differs from package.json/u],
  [{ error: new Error("unavailable") }, /unavailable/u],
])(
  "npm bootstrap preserves failed or mismatched observations: %j",
  (result, message) => {
    withNpmSelector("npm@99.2.3", (root) => {
      expect(() => installRepositoryNpm({ root, run: () => result })).toThrow(
        message,
      );
    });
  },
);

test("the release npm projection reports drift and changes only its declared field", () => {
  expect(() => syncNpmProjections()).not.toThrow();
  withNpmSelector("npm@99.2.3", (root) => {
    const directory = join(root, "scripts/distribution");
    mkdirSync(directory, { recursive: true });
    const file = join(directory, "universalOntologyMcpReleaseInputs.json");
    const original =
      '{\r\n  "selectedNpmVersion": "1.2.3",\r\n  "sentinel": "unchanged"\r\n}\r\n';
    writeFileSync(file, original);
    expect(repositoryNpmTarget(root)).toBe("99.2.3");
    expect(() => syncNpmProjections({ root })).toThrow(
      "Stale release npm projection",
    );
    expect(readFileSync(file, "utf8")).toBe(original);
    syncNpmProjections({ root, write: true });
    expect(readFileSync(file, "utf8")).toBe(
      original.replace('"1.2.3"', '"99.2.3"'),
    );
    expect(() => syncNpmProjections({ root })).not.toThrow();
  });
});

test.each([
  [
    "development-checks.yml",
    [
      "python-style",
      "python-tests",
      "python-node-tests",
      "agent-skills-lock",
      "style-tooling",
      "checks",
    ],
  ],
  ["ontology-validation.yml", ["validate-ontologies", "policy-qa", "qualify"]],
])(
  "%s provisions repository-selected Python in an isolated uv environment",
  (fileName, jobNames) => {
    const workflow = parseYaml(
      readFileSync(
        new URL(`../.github/workflows/${fileName}`, import.meta.url),
        "utf8",
      ),
    );
    for (const jobName of jobNames) {
      const steps = workflow.jobs[jobName].steps;
      const provisioning = steps.filter(
        ({ uses }) => uses === PYTHON_PROVISIONING_ACTION,
      );
      expect(provisioning).toHaveLength(1);
      expect(provisioning[0].with).toBeUndefined();
      expect(
        steps.some(({ uses }) => uses?.startsWith("actions/setup-python@")),
      ).toBe(false);
      if (jobName === "validate-ontologies") {
        expect(provisioning[0].if).toBe(
          "steps.ontology_jobs.outputs.ontology_validation == 'true'",
        );
      }
    }
  },
);

test.each([
  [
    "development-checks.yml",
    {
      scope: 5,
      documentation: 10,
      "json-quality": 15,
      "python-style": 10,
      "python-tests": 30,
      "python-node-tests": 30,
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
    "json-quality",
    "python-style",
    "python-tests",
    "python-node-tests",
    "agent-skills-lock",
    "style-tooling",
    "checks",
    "complete",
  ]);
  for (const job of Object.values(workflow.jobs)) {
    for (const { uses } of job.steps) {
      if (uses) {
        // Immutable action references: an owner/repo@<40-hex-sha> pin.
        if (uses !== PYTHON_PROVISIONING_ACTION) {
          expect(uses).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/u);
        }
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
    python_setup_tests: "${{ steps.scope.outputs.python_setup_tests }}",
    agent_skills_lock: "${{ steps.scope.outputs.agent_skills_lock }}",
    style_tooling: "${{ steps.scope.outputs.style_tooling }}",
  });
  expect(workflow.jobs.scope.steps.at(-1).run).toBe(SELECTOR_COMMAND);
  expect(workflow.jobs.checks.needs).toBe("scope");
  expect(workflow.jobs.checks.if).toBe(
    "needs.scope.outputs.development == 'true'",
  );
});

test("JSON quality always checks the full corpus on both platforms before consumer completion", () => {
  const workflow = readWorkflow();
  const job = workflow.jobs["json-quality"];
  expect(job.if).toBeUndefined();
  expect(job.needs).toBe("scope");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  expect(job.permissions).toEqual({ contents: "read" });
  const runs = job.steps.map((step) => step.run).filter(Boolean);
  expect(
    runs.indexOf("node scripts/evaluatePullRequestChecks.js --verify"),
  ).toBeLessThan(runs.indexOf("npm ci --include=dev --ignore-scripts"));
  expect(runs.indexOf("npm run build:verify")).toBeGreaterThan(
    runs.indexOf("npm ci --include=dev --ignore-scripts"),
  );
  expect(runs.indexOf("npm run install:json")).toBeGreaterThan(
    runs.indexOf("npm ci --include=dev --ignore-scripts"),
  );
  expect(runs.indexOf("npm run install:json")).toBeLessThan(
    runs.indexOf("npm run build:verify"),
  );
  expect(runs.at(-1)).toBe("npm run check:json:generated");
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const command = manifest.scripts["check:json:generated"];
  expect(command).toMatch(/^npm run check:json -- /u);
  const args = command.split(" ").slice(4);
  expect(args).toContain("--require-generated");
  expect(args).not.toContain("--max-check-time-ms");
  const policy = JSON.parse(
    readFileSync(new URL("../.json-quality.json", import.meta.url), "utf8"),
  );
  const budget = policy.runtimeControls.maxCheckTimeMs;
  expect(Number.isSafeInteger(budget)).toBe(true);
  expect(budget).toBeGreaterThan(0);
  expect(budget).toBeLessThan(job["timeout-minutes"] * 60_000);
  expect(manifest.scripts["check:qualification"].split(" && ").at(-1)).toBe(
    runs.at(-1),
  );
  expect(workflow.jobs.complete.needs).toContain("json-quality");
});

test("Python-only work retains both platforms without installing Node dependencies", () => {
  const job = readWorkflow().jobs["python-tests"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.python_tests == 'true'");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  const npmBootstrap = "node scripts/installRepositoryNpm.js";
  expect(runs).toContain(npmBootstrap);
  expect(
    runs
      .filter((run) => run !== npmBootstrap)
      .some((run) => /npm (?:ci|install)|set-up:development/u.test(run)),
  ).toBe(false);
  const setup = job.steps.find(
    (step) => step.name === "Set up only the locked Python environment",
  );
  expect(setup.run).toContain(
    "--require-hashes --only-binary=:all: --no-binary=pyyaml -r requirements.lock.txt",
  );
  expect(setup.run).toContain('"$python_executable" -m pip check');
  expect(setup.run).toContain(".venv/Scripts/python.exe");
  expect(setup.run).toContain(".venv/bin/python");
  expect(runs.at(-1)).toBe("npm run test:python -- --family python-only");
});

test("Node-backed Python work retains full setup and both platforms", () => {
  const workflow = readWorkflow();
  const job = workflow.jobs["python-node-tests"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.python_setup_tests == 'true'");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  expect(runs.indexOf("npm run set-up:development")).toBeGreaterThan(
    runs.indexOf("node scripts/evaluatePullRequestChecks.js --verify"),
  );
  expect(runs.indexOf("npm run set-up:development")).toBeLessThan(
    runs.indexOf("npm run test:python -- --family node-backed"),
  );
  expect(runs.at(-1)).toBe("npm run test:python -- --family node-backed");
  expect(workflow.jobs.complete.needs).toContain("python-node-tests");
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
    "python -I -B tools/repository-skills.pyz check",
  ]);
  expect(
    job.steps.some(({ uses }) => uses === PYTHON_PROVISIONING_ACTION),
  ).toBe(true);
});

test("toolchain changes retain a Windows and Ubuntu owner for formatter regressions", () => {
  const job = readWorkflow().jobs["style-tooling"];
  expect(job.needs).toBe("scope");
  expect(job.if).toBe("needs.scope.outputs.style_tooling == 'true'");
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-2025"]);
  expect(
    job.steps.some(({ uses }) => uses === PYTHON_PROVISIONING_ACTION),
  ).toBe(true);
  expect(
    job.steps.some(({ uses }) => uses?.startsWith("actions/setup-node@")),
  ).toBe(true);
  const runs = job.steps.map(({ run }) => run).filter(Boolean);
  expect(runs.indexOf("npm run set-up:development")).toBeLessThan(
    runs.indexOf("npm run lint:python && npm run format:python:check"),
  );
  expect(runs).toContain(
    "npm test -- --runInBand --runTestsByPath tests/python-style-tools.test.js tests/markdown-quality.test.js tests/json-quality.test.js",
  );
});

test("every route checks the full Markdown corpus on Windows and Linux", () => {
  const job = readWorkflow().jobs.documentation;
  expect(job["runs-on"]).toBe("${{ matrix.os }}");
  expect(job.strategy).toEqual({
    "fail-fast": false,
    matrix: { os: ["ubuntu-24.04", "windows-2025"] },
  });
  expect(job.if).toBeUndefined();
  expect(job.steps.map((step) => step.run).filter(Boolean)).toEqual([
    "node scripts/evaluatePullRequestChecks.js --verify",
    "node scripts/installRepositoryNpm.js",
    "npm run install:markdown",
    "npm run check:markdown",
  ]);
  expect(
    job.steps.some((step) => step.uses?.startsWith("actions/setup-python@")),
  ).toBe(false);
  expect(
    job.steps.some(({ uses }) => uses === PYTHON_PROVISIONING_ACTION),
  ).toBe(false);
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
    PYTHON_PROVISIONING_ACTION,
  ]) {
    expect(before.some(({ uses }) => uses?.startsWith(prefix))).toBe(true);
  }
  expect(
    before.some(({ run }) => run === "node scripts/installRepositoryNpm.js"),
  ).toBe(true);
  for (const run of runs) {
    // Dependency installation belongs to the setup command, not ad hoc steps.
    expect(run).not.toMatch(/npm ci|python -m venv|pip install/u);
    expect(run).not.toMatch(/sdlc/iu);
  }
});
