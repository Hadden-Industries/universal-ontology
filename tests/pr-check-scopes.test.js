import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

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
  const job = workflow.jobs["validate-ontologies"];
  expect(job.name).toBe("OWL Differential Analysis");
  expect(job.env).toEqual({
    ONTOLOGY_DIFF_BASE:
      "${{ github.event.pull_request.base.sha || github.event.before }}",
    ONTOLOGY_DIFF_HEAD: "${{ github.sha }}",
  });
  const scopeIndex = job.steps.findIndex(({ id }) => id === "scope");
  const installationIndex = job.steps.findIndex(
    ({ name }) => name === "Install ontology validation dependencies",
  );
  expect(scopeIndex).toBeGreaterThanOrEqual(0);
  expect(installationIndex).toBeGreaterThan(scopeIndex);
  expect(job.steps[scopeIndex].run).toContain('--plan >> "$GITHUB_OUTPUT"');
  expect(job.steps[scopeIndex].run).toContain("args=(--all-current)");
  expect(job.steps[installationIndex]).toMatchObject({
    if: "steps.scope.outputs.validation_required == 'true'",
    run: ".venv/bin/python -m pip install -r requirements.txt",
  });
  expect(
    job.steps.find(({ name }) => name === "Test ontology validation runner"),
  ).toMatchObject({
    if: "steps.scope.outputs.validator_changed == 'true'",
    run: ".venv/bin/python -B -m unittest discover -s tests -p test_validate_ontologies.py -v",
  });
  const validation = job.steps.find(
    ({ name }) => name === "Validate selected ontology files",
  );
  expect(validation.if).toBe(
    "steps.scope.outputs.validation_required == 'true'",
  );
  expect(validation.run).toContain(
    'scripts/validate_ontologies.py "${args[@]}" --github-actions',
  );
  expect(job.steps.at(-1).if).toBe(
    "steps.scope.outputs.validation_required == 'false'",
  );
});

describe("native Git PR check selection", () => {
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
      [selectorPath, ...scopes.flatMap((scope) => ["--scope", scope])],
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
    ["core/universal-core.owl", []],
    ["src/universal/core/20260907", []],
    ["docs/sdlc/baselines/issue-1/v1.json", []],
    ["docs/sdlc/verification.md", []],
    ["scripts/set_up_sdlc.py", ["sdlc"]],
    ["scripts/_sdlc_resource_disposition.py", ["sdlc"]],
    ["scripts/setUpDevelopmentEnvironment.js", ["sdlc"]],
    [".codex/agents/verifier.toml", ["sdlc"]],
    ["docs/sdlc/engineering-principles.md", ["sdlc"]],
    [".github/workflows/sdlc-control-tests.yml", ["sdlc"]],
    ["README.md", ["mcp_docs"]],
    ["docs/mcp/usage.md", ["mcp_docs"]],
    ["packages/universal-ontology-mcp-server/README.md", ["mcp_docs"]],
    ["src/mcp/example.js", ["product_tests", "mcp_artifacts"]],
    ["scripts/distribution/example.js", ["product_tests", "mcp_artifacts"]],
    [
      "packages/universal-ontology-mcp-server/package.json",
      ["product_tests", "mcp_artifacts"],
    ],
    ["src/ontology.js", ["product_tests", "website_build"]],
    ["scripts/build/example.js", ["product_tests", "website_build"]],
    [
      "src/ontologyQuery/example.js",
      ["product_tests", "mcp_artifacts", "website_build"],
    ],
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
    const paths = ["scripts/set_up_sdlc.py", "src/mcp/example.js", "README.md"];
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
        ? "src/mcp/quoted ' and café.js"
        : "src/mcp/quoted ' and café\nline.js";
    write(path);
    commit([path]);
    expectSelection(["product_tests", "mcp_artifacts"]);
  });

  test("a relevant input after more than 3000 other files is still selected", () => {
    const paths = Array.from(
      { length: 3005 },
      (_, index) => `notes/${index}.md`,
    );
    paths.push("src/mcp/last-relevant-input.js");
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

  test.each(["pull_request_target", "schedule", "issues"])(
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
