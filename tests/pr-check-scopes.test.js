import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const SCOPES = [
  "sdlc",
  "product_tests",
  "mcp_artifacts",
  "website_build",
  "mcp_docs",
];

test("ontology-only PRs do not unconditionally launch the SDLC control matrix", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/sdlc-control-tests.yml", import.meta.url),
      "utf8",
    ),
  );

  expect(workflow.jobs.controls.needs).toBe("scope");
  expect(workflow.jobs.controls.if).toBe("needs.scope.outputs.sdlc == 'true'");
  expect(workflow.jobs.scope.steps.at(-1).run).toBe(
    "node scripts/selectPullRequestChecks.js --scope sdlc",
  );
});

test("Windows and Ubuntu controls exercise the complete development setup before Python tests", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/sdlc-control-tests.yml", import.meta.url),
      "utf8",
    ),
  );
  const job = workflow.jobs.controls;
  expect(job.strategy.matrix.os).toEqual(["ubuntu-24.04", "windows-latest"]);
  const setupIndex = job.steps.findIndex(
    ({ run }) => run === "npm run setup:development",
  );
  const ontologyIndex = job.steps.findIndex(
    ({ run }) =>
      run ===
      "node scripts/runRepositoryPython.js -m unittest tests.test_validate_ontologies -v",
  );
  expect(setupIndex).toBeGreaterThan(0);
  expect(ontologyIndex).toBeGreaterThan(setupIndex);
  expect(
    job.steps
      .slice(0, setupIndex)
      .some(({ uses }) => uses?.startsWith("actions/setup-python@")),
  ).toBe(true);
  expect(
    job.steps
      .slice(0, setupIndex)
      .some(({ run }) => run?.includes("npm install --global")),
  ).toBe(true);
  for (const { run = "" } of job.steps) {
    expect(run).not.toMatch(/npm ci|python -m venv|pip install/);
  }
});

test("the stable ontology check selects files before installing its dependencies", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/ontology-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  expect(workflow.on).toEqual({
    push: { branches: ["main"] },
    pull_request: { branches: ["**"] },
    workflow_dispatch: null,
  });
  expect(workflow.permissions).toEqual({ contents: "read" });
  for (const [jobId, scope] of [["qualify", "ontology_qualification"]]) {
    expect(workflow.jobs[jobId].needs).toBe("validate-ontologies");
    expect(workflow.jobs[jobId].if).toBe(
      `\${{ !cancelled() && needs.validate-ontologies.outputs.${scope} == 'true' }}`,
    );
    expect(workflow.jobs["validate-ontologies"].outputs[scope]).toBe(
      `\${{ steps.ontology_jobs.outputs.${scope} }}`,
    );
  }
  const policyJob = workflow.jobs["policy-qa"];
  const generalPolicy =
    "needs.validate-ontologies.outputs.ontology_policy_qa == 'true'";
  const entityContracts =
    "needs.validate-ontologies.outputs.ontology_entity_contracts == 'true'";
  expect(policyJob.needs).toBe("validate-ontologies");
  expect(policyJob.if).toBe(
    `\${{ !cancelled() && (${generalPolicy} || ${entityContracts}) }}`,
  );
  for (const name of [
    "Generated policy is current",
    "Policy, rendering, authority, change and publication-gate contracts",
  ]) {
    expect(policyJob.steps.find((step) => step.name === name).if).toBe(
      generalPolicy,
    );
  }
  expect(
    policyJob.steps.find(
      (step) => step.name === "Entity change and publication gate contracts",
    ).if,
  ).toBe(`${generalPolicy} || ${entityContracts}`);
  for (const scope of ["ontology_policy_qa", "ontology_entity_contracts"]) {
    expect(workflow.jobs["validate-ontologies"].outputs[scope]).toBe(
      `\${{ steps.ontology_jobs.outputs.${scope} }}`,
    );
  }
  const selectionStep = workflow.jobs["validate-ontologies"].steps.find(
    ({ id }) => id === "ontology_jobs",
  );
  expect(selectionStep.if).toBeUndefined();
  expect(selectionStep["continue-on-error"]).toBeUndefined();
  expect(selectionStep.run).toBe(
    "node scripts/selectPullRequestChecks.js --scope ontology_policy_qa --scope ontology_entity_contracts --scope ontology_qualification --scope ontology_validation_workflow",
  );
  const job = workflow.jobs["validate-ontologies"];
  expect(job.name).toBe("OWL Differential Analysis");
  expect(job.env).toEqual({
    ONTOLOGY_DIFF_BASE:
      "${{ github.event.pull_request.base.sha || github.event.before }}",
    ONTOLOGY_DIFF_HEAD: "${{ github.sha }}",
  });
  const scopeIndex = job.steps.findIndex(({ id }) => id === "scope");
  const installationIndex = job.steps.findIndex(
    ({ name }) => name === "Install the hash-locked Python environment",
  );
  expect(scopeIndex).toBeGreaterThanOrEqual(0);
  expect(installationIndex).toBeGreaterThan(scopeIndex);
  expect(job.steps[scopeIndex].run).toContain('--plan >> "$GITHUB_OUTPUT"');
  expect(job.steps[scopeIndex].run).toContain("args=(--all-current)");
  expect(job.steps[installationIndex]).toMatchObject({
    if: "steps.scope.outputs.validation_required == 'true'",
    run: '.venv/bin/python -m pip install --require-hashes "--only-binary=:all:" -r requirements.lock.txt',
  });
  expect(
    job.steps.find(({ name }) => name === "Test ontology validation runner"),
  ).toMatchObject({
    if: "steps.scope.outputs.validator_changed == 'true'",
    run: ".venv/bin/python -B -m unittest discover -s tests -p test_validate_ontologies.py -v",
  });
  // The SHACL editing policy is the only validator; the legacy per-file
  // invariant step no longer exists.
  expect(
    job.steps.find(({ name }) => name === "Validate selected ontology files"),
  ).toBeUndefined();
  const validation = job.steps.find(
    ({ name }) =>
      name === "Editing-policy draft diagnostics for the changed sources",
  );
  expect(validation.if).toBe(
    "steps.scope.outputs.validation_required == 'true'",
  );
  expect(validation.run).toContain(
    'scripts/validate_ontologies.py "${args[@]}" --purpose draft --github-actions',
  );
  for (const step of [job.steps[scopeIndex], validation]) {
    expect(step.run).toContain(
      'args=(--diff-base "$ONTOLOGY_DIFF_BASE" --diff-head "$ONTOLOGY_DIFF_HEAD")',
    );
    expect(step.run).toContain(
      'if [[ "${{ steps.ontology_jobs.outputs.ontology_validation_workflow }}" == "true" ]]; then\n  args+=(--validation-workflow-changed)\nfi',
    );
  }
  expect(job.steps.at(-1).if).toBe(
    "steps.scope.outputs.validation_required == 'false'",
  );
});

test("CodeQL consumes the selected languages and keeps privileged uploads in analysis", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/codeql.yml", import.meta.url),
      "utf8",
    ),
  );
  expect(workflow.permissions).toEqual({});
  expect(workflow.jobs.scope.permissions).toEqual({ contents: "read" });
  expect(workflow.jobs.scope.if).toBe(
    "github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository",
  );
  expect(workflow.jobs.scope.steps[0].with).toMatchObject({
    "fetch-depth": 0,
    "persist-credentials": false,
  });
  expect(workflow.jobs.scope.steps.at(-1).run).toBe(
    "node scripts/selectPullRequestChecks.js --scope codeql_actions --scope codeql_python --scope codeql_javascript --codeql-matrix",
  );
  expect(workflow.jobs.scope.outputs.languages).toBe(
    "${{ steps.languages.outputs.codeql_languages }}",
  );
  expect(workflow.jobs.analyze.needs).toBe("scope");
  expect(workflow.jobs.analyze.if).toBe(
    "needs.scope.outputs.languages != '[]'",
  );
  expect(workflow.jobs.analyze.strategy.matrix.language).toBe(
    "${{ fromJSON(needs.scope.outputs.languages) }}",
  );
  expect(workflow.jobs.analyze.permissions).toEqual({
    contents: "read",
    "security-events": "write",
  });
  expect(workflow.jobs.analyze.steps.at(-1).with.category).toBe(
    "/language:${{ matrix.language }}",
  );
  expect(workflow.on).toHaveProperty("schedule");
  expect(workflow.on).toHaveProperty("workflow_dispatch");
});

describe("native Git PR check selection", () => {
  const ontologyScopes = ["ontology_policy_qa", "ontology_qualification"];
  let root;
  let environment;
  let base;
  let selectorPath;

  function write(relativePath, content = "changed input\n") {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }

  function git(args, input) {
    const result = spawnSync("git", args, {
      cwd: root,
      env: environment,
      encoding: "utf8",
      windowsHide: true,
      input,
    });
    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message ?? result.stderr);
    }
    return result.stdout.trim();
  }

  function commit(paths) {
    git(["add", "--", ...paths]);
    git([
      "-c",
      "user.name=PR selection fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "Record fixture inputs",
    ]);
    return git(["rev-parse", "HEAD"]);
  }

  function runSelection({
    eventName = "pull_request",
    head = git(["rev-parse", "HEAD"]),
    comparisonBase = base,
    scopes = SCOPES,
    env = {},
    codeqlMatrix = false,
  } = {}) {
    write(
      "event.json",
      JSON.stringify({
        pull_request: { base: { sha: comparisonBase } },
        before: comparisonBase,
      }),
    );
    return spawnSync(
      process.execPath,
      [
        selectorPath,
        ...scopes.flatMap((scope) => ["--scope", scope]),
        ...(codeqlMatrix ? ["--codeql-matrix"] : []),
      ],
      {
        cwd: root,
        env: {
          ...environment,
          GITHUB_EVENT_NAME: eventName,
          GITHUB_REF: "refs/heads/main",
          GITHUB_SHA: head,
          GITHUB_EVENT_PATH: join(root, "event.json"),
          GITHUB_OUTPUT: join(root, "github-output.txt"),
          GITHUB_STEP_SUMMARY: join(root, "github-summary.md"),
          ...env,
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );
  }

  function expectSelection(requiredScopes, options) {
    const result = runSelection(options);
    expect({ status: result.status, error: result.stderr }).toEqual({
      status: 0,
      error: "",
    });
    const scopes = options?.scopes ?? SCOPES;
    expect(readFileSync(join(root, "github-output.txt"), "utf8")).toBe(
      scopes
        .map((scope) => `${scope}=${requiredScopes.includes(scope)}\n`)
        .join(""),
    );
    const summary = readFileSync(join(root, "github-summary.md"), "utf8");
    for (const scope of scopes) {
      expect(summary).toContain(
        `- ${scope}: ${requiredScopes.includes(scope) ? "selected" : "not applicable; inputs unchanged"}`,
      );
    }
  }

  function expectFailureWithoutOutputs(options) {
    write("github-output.txt", "prior-output=retained\n");
    const result = runSelection(options);
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toBe("");
    expect(result.stdout).not.toContain("PR check selection");
    expect(readFileSync(join(root, "github-output.txt"), "utf8")).toBe(
      "prior-output=retained\n",
    );
    expect(existsSync(join(root, "github-summary.md"))).toBe(false);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "ontology-pr-checks-"));
    symlinkSync(
      fileURLToPath(new URL("../node_modules", import.meta.url)),
      join(root, "node_modules"),
      "junction",
    );
    environment = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) => !/^(?:GIT|GITHUB)_/iu.test(name),
        ),
      ),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: join(root, "empty-global-config"),
    };
    write("empty-global-config", "");
    git(["init", "--initial-branch=main"]);
    write("package.json", '{"type":"module"}\n');
    // The actual approved CLI is copied to give its repository-root discovery
    // a real disposable checkout. Neither its decisions nor Git are mocked.
    write(
      "scripts/selectPullRequestChecks.js",
      readFileSync(
        new URL("../scripts/selectPullRequestChecks.js", import.meta.url),
        "utf8",
      ),
    );
    selectorPath = join(root, "scripts/selectPullRequestChecks.js");
    base = commit(["package.json", "scripts/selectPullRequestChecks.js"]);
  });

  afterEach(() => {
    const target = resolve(root);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("ontology-pr-checks-")
    ) {
      throw new Error("Refusing cleanup outside the owned PR check fixture.");
    }
    rmSync(target, { recursive: true, force: true });
  });

  test.each([
    "requirements.txt",
    "requirements-sdlc.txt",
    "requirements.lock.txt",
    "scripts/validate_ontologies.py",
    "tests/test_validate_ontologies.py",
  ])("Python setup input %s selects the onboarding checks", (path) => {
    write(path);
    commit([path]);
    expectSelection(["sdlc"], { scopes: ["sdlc"] });
  });

  test.each([
    ["README.md", []],
    ["scripts/setUpDevelopmentEnvironment.js", []],
    ["tests/set-up-development-environment.test.js", []],
    ["package.json", []],
    ["core/universal-core.owl", ontologyScopes],
    ["policy/authorities/example.ttl", ontologyScopes],
    ["scripts/ontology_policy/validation.py", ontologyScopes],
    ["requirements.lock.txt", ontologyScopes],
    ["requirements.txt", ontologyScopes],
    [".python-version", ontologyScopes],
    ["tests/fixtures/ontology-policy/example.ttl", ontologyScopes],
    ["tests/test_ontology_entity_changes.py", ontologyScopes],
    ["scripts/render_editing_policy.py", ["ontology_policy_qa"]],
    ["docs/policy/Editing-Policy.generated.md", ["ontology_policy_qa"]],
    ["tests/test_publication_gate.py", ["ontology_policy_qa"]],
    ["tests/test_ontology_policy_engines.py", ontologyScopes],
    [".java-version", ["ontology_qualification"]],
    [".github/workflows/ontology-validation.yml", ontologyScopes],
  ])("selects ontology jobs for %s", (path, selected) => {
    write(
      path,
      path === "package.json"
        ? '{"type":"module","private":true}\n'
        : "changed input\n",
    );
    commit([path]);
    expectSelection(selected, { scopes: ontologyScopes });
  });

  test("invalid ontology comparisons fail closed", () => {
    expectFailureWithoutOutputs({
      scopes: ontologyScopes,
      comparisonBase: "f".repeat(40),
    });
  });

  const workflowScopes = [
    "ontology_policy_qa",
    "ontology_entity_contracts",
    "ontology_qualification",
    "ontology_validation_workflow",
  ];
  const ontologyWorkflowPath = ".github/workflows/ontology-validation.yml";

  function changeWorkflow(mutate) {
    const contents = readFileSync(
      new URL(`../${ontologyWorkflowPath}`, import.meta.url),
      "utf8",
    );
    write(ontologyWorkflowPath, contents);
    base = commit([ontologyWorkflowPath]);
    const workflow = parseYaml(contents);
    mutate(workflow);
    write(ontologyWorkflowPath, stringifyYaml(workflow));
    commit([ontologyWorkflowPath]);
  }

  test("the warning-filter command change selects only entity contracts", () => {
    // Replay the before/after command from 196b02a without depending on
    // unreachable historical objects or a non-shallow developer checkout.
    const workflow = parseYaml(
      readFileSync(
        new URL(`../${ontologyWorkflowPath}`, import.meta.url),
        "utf8",
      ),
    );
    const entityStep = workflow.jobs["policy-qa"].steps.find(
      (step) => step.name === "Entity change and publication gate contracts",
    );
    const suite =
      "-m unittest tests.test_ontology_entity_changes tests.test_publication_gate -v";
    entityStep.run = `.venv/bin/python -B ${suite}`;
    write(ontologyWorkflowPath, stringifyYaml(workflow));
    base = commit([ontologyWorkflowPath]);
    entityStep.run = `.venv/bin/python -B -W "ignore:'count' is passed as positional argument:DeprecationWarning:rdflib.plugins.sparql.operators" ${suite}`;
    write(ontologyWorkflowPath, stringifyYaml(workflow));
    commit([ontologyWorkflowPath]);
    expectSelection([], { scopes: ontologyScopes });
    unlinkSync(join(root, "github-output.txt"));
    expectSelection(["ontology_entity_contracts"], { scopes: workflowScopes });
  });

  test.each(["unchanged", "changed", "manual", "invalid comparison"])(
    "workflow parser provisioning handles %s inputs with native Git",
    (scenario) => {
      const workflow = parseYaml(
        readFileSync(
          new URL(`../${ontologyWorkflowPath}`, import.meta.url),
          "utf8",
        ),
      );
      const script = workflow.jobs["validate-ontologies"].steps.find(
        (step) =>
          step.name ===
          "Install the locked workflow parser only for workflow comparisons",
      ).run;
      write(ontologyWorkflowPath, "name: initial\n");
      base = commit([ontologyWorkflowPath]);
      if (scenario === "changed") {
        write(ontologyWorkflowPath, "name: changed\n");
        commit([ontologyWorkflowPath]);
      }
      // Intercept only the installation side effect; execute the production
      // Bash gate and actual Git comparison, including its failure path.
      const result = spawnSync(
        process.platform === "win32"
          ? "C:/Program Files/Git/bin/bash.exe"
          : "bash",
        [
          "-c",
          `npm() { printf '%s\\n' "$*" > npm-invocation.txt; }\n${script}`,
        ],
        {
          cwd: root,
          env: {
            ...environment,
            GITHUB_EVENT_NAME:
              scenario === "manual" ? "workflow_dispatch" : "pull_request",
            ONTOLOGY_DIFF_BASE:
              scenario === "invalid comparison" || scenario === "manual"
                ? "f".repeat(40)
                : base,
            ONTOLOGY_DIFF_HEAD: git(["rev-parse", "HEAD"]),
          },
          encoding: "utf8",
          windowsHide: true,
        },
      );
      expect(result.error).toBeUndefined();
      if (scenario === "invalid comparison") expect(result.status).not.toBe(0);
      else expect(result.status).toBe(0);
      expect(existsSync(join(root, "npm-invocation.txt"))).toBe(
        scenario === "changed",
      );
      if (scenario === "changed")
        expect(readFileSync(join(root, "npm-invocation.txt"), "utf8")).toBe(
          "ci --ignore-scripts --no-audit --no-fund\n",
        );
    },
  );

  test.each([
    [
      "entity command",
      (w) => {
        w.jobs["policy-qa"].steps.find(
          (s) => s.name === "Entity change and publication gate contracts",
        ).run += " --buffer";
      },
      ["ontology_entity_contracts"],
    ],
    [
      "policy command",
      (w) => {
        w.jobs["policy-qa"].steps.find(
          (s) =>
            s.name ===
            "Policy, rendering, authority, change and publication-gate contracts",
        ).run += " --buffer";
      },
      ["ontology_policy_qa", "ontology_entity_contracts"],
    ],
    [
      "qualification command",
      (w) => {
        w.jobs.qualify.steps.find(
          (s) => s.name === "Cross-engine parity (Apache Jena)",
        ).run += " --buffer";
      },
      ["ontology_qualification"],
    ],
    [
      "validator command",
      (w) => {
        w.jobs["validate-ontologies"].steps.find(
          (s) =>
            s.name ===
            "Editing-policy draft diagnostics for the changed sources",
        ).run += "\necho checked";
      },
      workflowScopes,
    ],
    [
      "shared environment",
      (w) => {
        w.env.JENA_VERSION = "different";
      },
      workflowScopes,
    ],
    [
      "permissions",
      (w) => {
        w.permissions.contents = "write";
      },
      workflowScopes,
    ],
    [
      "unknown job",
      (w) => {
        w.jobs.extra = { "runs-on": "ubuntu-latest", steps: [{ run: "true" }] };
      },
      workflowScopes,
    ],
  ])("workflow selection follows %s impact", (_label, mutate, expected) => {
    changeWorkflow(mutate);
    expectSelection(expected, { scopes: workflowScopes });
  });

  test("malformed changed workflow fails before writing selection outputs", () => {
    changeWorkflow((w) => {
      w.name += " changed";
    });
    write(ontologyWorkflowPath, "jobs: [broken\n");
    commit([ontologyWorkflowPath]);
    expectFailureWithoutOutputs({ scopes: workflowScopes });
  });

  test("a YAML-only reformat does not select ontology executions", () => {
    changeWorkflow(() => {});
    expectSelection([], { scopes: workflowScopes });
  });

  test("duplicate workflow keys fail closed", () => {
    changeWorkflow((w) => {
      w.name += " changed";
    });
    write(ontologyWorkflowPath, "name: first\nname: second\njobs: {}\n");
    commit([ontologyWorkflowPath]);
    expectFailureWithoutOutputs({ scopes: workflowScopes });
  });

  test("deleted workflow selects every affected ontology scope", () => {
    changeWorkflow((w) => {
      w.name += " changed";
    });
    unlinkSync(join(root, ontologyWorkflowPath));
    commit([ontologyWorkflowPath]);
    expectSelection(workflowScopes, { scopes: workflowScopes });
  });

  test("an entity command plus changed policy still selects broad validation", () => {
    changeWorkflow((w) => {
      w.jobs["policy-qa"].steps.find(
        (s) => s.name === "Entity change and publication gate contracts",
      ).run += " --buffer";
    });
    write("policy/entity-policy.ttl");
    commit(["policy/entity-policy.ttl"]);
    expectSelection(
      [
        "ontology_policy_qa",
        "ontology_entity_contracts",
        "ontology_qualification",
      ],
      { scopes: workflowScopes },
    );
  });

  const codeqlScopes = ["codeql_actions", "codeql_python", "codeql_javascript"];
  test.each([
    [ontologyWorkflowPath, ["codeql_actions"]],
    ["scripts/example.py", ["codeql_python"]],
    ["src/example.js", ["codeql_javascript"]],
    ["requirements.lock.txt", ["codeql_python"]],
    [".github/workflows/codeql.yml", codeqlScopes],
    [".github/codeql/queries/example.ql", codeqlScopes],
    ["README.md", []],
  ])("selects CodeQL language inputs for %s", (path, expected) => {
    write(path);
    commit([path]);
    expectSelection(expected, { scopes: codeqlScopes });
  });

  test.each(["workflow_dispatch", "schedule"])(
    "%s selects all CodeQL languages",
    (eventName) => {
      const result = runSelection({
        eventName,
        scopes: codeqlScopes,
        codeqlMatrix: true,
      });
      expect({ status: result.status, error: result.stderr }).toEqual({
        status: 0,
        error: "",
      });
      expect(readFileSync(join(root, "github-output.txt"), "utf8")).toContain(
        'codeql_languages=["actions","python","javascript-typescript"]\n',
      );
    },
  );

  test("CodeQL workflow-only changes produce an actions-only matrix", () => {
    write(ontologyWorkflowPath);
    commit([ontologyWorkflowPath]);
    const result = runSelection({ scopes: codeqlScopes, codeqlMatrix: true });
    expect({ status: result.status, error: result.stderr }).toEqual({
      status: 0,
      error: "",
    });
    expect(readFileSync(join(root, "github-output.txt"), "utf8")).toContain(
      'codeql_languages=["actions"]\n',
    );
  });

  test("CodeQL docs-only changes produce an empty matrix", () => {
    write("README.md");
    commit(["README.md"]);
    const result = runSelection({ scopes: codeqlScopes, codeqlMatrix: true });
    expect({ status: result.status, error: result.stderr }).toEqual({
      status: 0,
      error: "",
    });
    expect(readFileSync(join(root, "github-output.txt"), "utf8")).toContain(
      "codeql_languages=[]\n",
    );
  });

  test("manual ontology checks are comprehensive", () => {
    expectSelection(ontologyScopes, {
      scopes: ontologyScopes,
      eventName: "workflow_dispatch",
    });
  });

  test("removed policy inputs still select both jobs on a main push", () => {
    const path = "policy/removed.ttl";
    write(path);
    const comparisonBase = commit([path]);
    unlinkSync(join(root, path));
    commit([path]);
    expectSelection(ontologyScopes, {
      scopes: ontologyScopes,
      eventName: "push",
      comparisonBase,
    });
  });

  test.each([
    ["core/universal-core.owl", []],
    ["src/universal/core/20260907", []],
    ["docs/sdlc/baselines/issue-1/v1.json", []],
    ["docs/sdlc/verification.md", []],
    ["scripts/set_up_sdlc.py", ["sdlc"]],
    ["scripts/_sdlc_resource_disposition.py", ["sdlc"]],
    ["scripts/_sdlc_baseline.py", ["sdlc"]],
    ["scripts/setUpDevelopmentEnvironment.js", ["sdlc"]],
    [".codex/agents/verifier.toml", ["sdlc"]],
    ["docs/sdlc/engineering-principles.md", ["sdlc"]],
    [".github/workflows/sdlc-control-tests.yml", ["sdlc"]],
    ["README.md", ["mcp_docs"]],
    ["docs/mcp/usage.md", ["mcp_docs"]],
    ["packages/universal-ontology-mcp-server/README.md", ["mcp_docs"]],
    [
      "packages/universal-ontology-mcp-server/src/example.js",
      ["product_tests", "mcp_artifacts"],
    ],
    ["scripts/distribution/example.js", ["product_tests", "mcp_artifacts"]],
    [
      "packages/universal-ontology-mcp-server/package.json",
      ["product_tests", "mcp_artifacts"],
    ],
    ["src/ontology.js", ["product_tests", "website_build"]],
    ["scripts/build/example.js", ["product_tests", "website_build"]],
    ...[
      "package.json",
      "src/createOntologyQueryModule.js",
      "tests/ontology-query-module.test.js",
      "tests/fixtures/persistent-cache-worker.js",
    ].map((path) => [
      `packages/universal-ontology-query/${path}`,
      ["product_tests", "mcp_artifacts", "website_build"],
    ]),
    ...[
      "package.json",
      "src/ontologyProjectionProperties.js",
      "tests/ontology-projection-properties.test.js",
      "data/field-property-history.v1.json",
      "data/field-property-history.v1.schema.json",
    ].map((path) => [
      `packages/universal-ontology-projection-policy/${path}`,
      ["product_tests", "mcp_artifacts", "website_build"],
    ]),
    ["tests/mcp/example.test.js", ["product_tests"]],
    ["package-lock.json", SCOPES],
    [".node-version", SCOPES],
    ["tests/pr-check-scopes.test.js", SCOPES],
    [
      ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
      ["product_tests", "mcp_artifacts", "website_build"],
    ],
  ])("routes a change to %s by its approved consumers", (path, expected) => {
    write(path);
    commit([path]);
    expectSelection(expected);
  });

  test.each([
    "tests/fixtures/ontology-query/run-query-browser-build.js",
    "tests/fixtures/ontology-query/ontology-query-browser-entries.js",
  ])(
    "runs product checks when only query browser helper %s changes",
    (path) => {
      // Use the actual helper at its maintained location, so a stale fixture
      // path cannot silently stand in for the consuming browser test's input.
      const contents = readFileSync(
        new URL(`../${path}`, import.meta.url),
        "utf8",
      );
      expect(contents.length).toBeGreaterThan(0);
      write(path, contents);
      commit([path]);
      expectSelection(["product_tests"]);
    },
  );

  test("an ontology plus its accepted baseline does not select unrelated checks", () => {
    const paths = [
      "core/universal-core.owl",
      "docs/sdlc/baselines/issue-7/v1.json",
    ];
    paths.forEach((path) => write(path));
    commit(paths);
    expectSelection([]);
  });

  test("mixed changes take the union of their applicable checks", () => {
    const paths = [
      "scripts/set_up_sdlc.py",
      "packages/universal-ontology-mcp-server/src/example.js",
      "README.md",
    ];
    paths.forEach((path) => write(path));
    commit(paths);
    expectSelection(["sdlc", "product_tests", "mcp_artifacts", "mcp_docs"]);
  });

  test.each([true, false])(
    "a rename into/out of SDLC remains applicable (into=%s)",
    (into) => {
      const [oldPath, newPath] = into
        ? ["notes/requirements.md", ".sdlc/requirements.md"]
        : [".sdlc/requirements.md", "notes/requirements.md"];
      write(oldPath);
      base = commit([oldPath]);
      mkdirSync(dirname(join(root, newPath)), { recursive: true });
      renameSync(join(root, oldPath), join(root, newPath));
      commit([oldPath, newPath]);
      expectSelection(["sdlc"]);
    },
  );

  test("deleting a relevant path still selects its checks", () => {
    const path = ".sdlc/requirements.md";
    write(path);
    base = commit([path]);
    unlinkSync(join(root, path));
    commit([path]);
    expectSelection(["sdlc"]);
  });

  test("unusual filenames are passed through native Git without line parsing", () => {
    const path =
      process.platform === "win32"
        ? "packages/universal-ontology-mcp-server/src/quoted ' and café.js"
        : "packages/universal-ontology-mcp-server/src/quoted ' and café\nline.js";
    write(path);
    commit([path]);
    expectSelection(["product_tests", "mcp_artifacts"]);
  });

  test("a relevant input after more than 3000 other files is still selected", () => {
    const paths = Array.from(
      { length: 3005 },
      (_, index) => `notes/${index}.md`,
    );
    paths.push(
      "packages/universal-ontology-mcp-server/src/last-relevant-input.js",
    );
    paths.forEach((path) => write(path));
    // Batches keep Windows command lines bounded; all paths enter one commit.
    for (let index = 0; index < paths.length; index += 200) {
      git(["add", "--", ...paths.slice(index, index + 200)]);
    }
    commit([paths.at(-1)]);
    expect(
      Number(git(["diff", "--numstat", base, "HEAD"]).split("\n").length),
    ).toBe(3006);
    expectSelection(["product_tests", "mcp_artifacts"]);
  });

  test.each([undefined, "", "HEAD^", "a".repeat(40), "0".repeat(40)])(
    "an unavailable or incomplete base produces no successful output (%s)",
    (comparisonBase) => {
      expectFailureWithoutOutputs({ comparisonBase: comparisonBase ?? null });
    },
  );

  test("a checkout different from the event head fails closed", () => {
    write("notes/changed.md");
    commit(["notes/changed.md"]);
    expectFailureWithoutOutputs({ head: base });
  });

  test.each(["pull_request_target", "issues"])(
    "an unsupported event produces no applicability output (%s)",
    (eventName) => expectFailureWithoutOutputs({ eventName }),
  );

  test("a feature-branch push cannot silently bypass the PR comparison", () => {
    expectFailureWithoutOutputs({
      eventName: "push",
      env: { GITHUB_REF: "refs/heads/feature" },
    });
  });

  test("a main push compares its before SHA", () => {
    write("docs/mcp/changed.md");
    commit(["docs/mcp/changed.md"]);
    expectSelection(["mcp_docs"], { eventName: "push" });
  });

  test("manual dispatch selects only the workflow's requested full set", () => {
    expectSelection(["sdlc"], {
      eventName: "workflow_dispatch",
      scopes: ["sdlc"],
    });
  });

  test("unknown scopes cannot publish a partial successful result", () => {
    expectFailureWithoutOutputs({ scopes: ["sdlc", "unknown"] });
  });

  test("a native Git diff error cannot publish applicability", () => {
    write("notes/changed.md");
    const head = commit(["notes/changed.md"]);
    const tree = git(["rev-parse", `${head}^{tree}`]);
    const treeObject = join(
      root,
      ".git/objects",
      tree.slice(0, 2),
      tree.slice(2),
    );
    expect(existsSync(treeObject)).toBe(true);
    unlinkSync(treeObject);
    // The commits still resolve, but their actual tree comparison must fail.
    expect(git(["rev-parse", "--verify", `${head}^{commit}`])).toBe(head);
    expectFailureWithoutOutputs({ head });
  });
});
