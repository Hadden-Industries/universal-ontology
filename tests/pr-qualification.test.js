import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  realpathSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  CI_CONTROL_SUITES,
  createNativeNodeCoverage,
} from "../scripts/runPullRequestNodeChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  requiredJobsForScopes,
} from "../scripts/selectPullRequestChecks.js";
import {
  createPrQualificationRecord,
  assertPrQualificationRecord,
  eligiblePrQualificationPlan,
  PR_QUALIFICATION_JOB_NAMES,
  PR_WORKFLOW,
} from "../scripts/prQualification.js";
import {
  createRepositoryReader,
  readGitSnapshot,
  recordPrQualification,
} from "../scripts/prQualificationCommand.js";
const hash = (letter) => letter.repeat(40),
  now = Date.parse("2026-10-06T20:00:00Z");
test("writer is confined to the existing successful PR gate and immutable pinned upload", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/pr-validation.yml", import.meta.url),
      "utf8",
    ),
  );
  expect(workflow.permissions).toEqual({});
  expect(workflow.jobs.gate.permissions).toEqual({
    contents: "read",
    actions: "read",
  });
  for (const [name, job] of Object.entries(workflow.jobs))
    if (name !== "gate") expect(job.permissions).toEqual({ contents: "read" });
  expect(workflow.jobs.node.outputs["native-coverage"]).toBe(
    "${{ steps.node-tests.outputs.native-coverage }}",
  );
  expect(
    workflow.jobs.node.steps.find((step) => step.id === "node-tests").run,
  ).toBe("node scripts/runPullRequestNodeChecks.js");
  const gate = workflow.jobs.gate,
    record = gate.steps.find((step) => step.id === "record");
  expect(gate.needs).toEqual([
    "select",
    "development",
    "ontology",
    "node",
    "website",
    "distribution",
  ]);
  expect(record.if).toBe(
    "${{ success() && !cancelled() && github.event.pull_request.head.repo.full_name == github.repository }}",
  );
  expect(record.env).toEqual({
    GH_TOKEN: "${{ github.token }}",
    PR_NATIVE_NODE_COVERAGE: "${{ needs.node.outputs.native-coverage }}",
  });
  const upload = gate.steps.find(
    (step) => step.name === "Retain selected PR qualification",
  );
  expect(upload.uses).toBe(
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  );
  expect(upload.if).toBe(
    "${{ success() && !cancelled() && steps.record.outputs.recorded == 'true' }}",
  );
  expect(upload.with).toEqual({
    name: "uo-pr-qualification-${{ github.run_id }}-${{ github.run_attempt }}",
    path: "${{ runner.temp }}/uo-pr-qualification-${{ github.run_id }}-${{ github.run_attempt }}/qualification.json",
    "if-no-files-found": "error",
    "retention-days": 3,
  });
  expect(
    gate.steps.findIndex(
      (step) => step.run === "node scripts/evaluatePullRequestChecks.js",
    ),
  ).toBeLessThan(gate.steps.indexOf(record));
  expect(gate.steps.at(-1)).toEqual({
    name: "Reject workflow cancellation",
    if: "${{ cancelled() }}",
    run: "exit 1",
  });
});
let directory, nativeReport;
beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "uo-pr-record-native-"));
  for (const path of CI_CONTROL_SUITES) {
    const file = join(directory, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      "test.each([1,2])('native parameterized fixture',value=>expect(value).toBeGreaterThan(0));\n",
    );
  }
  const reportPath = join(directory, "native.json");
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/jest/bin/jest.js", import.meta.url),
      ),
      "--config",
      JSON.stringify({
        rootDir: directory,
        testEnvironment: "node",
        transform: {},
        testMatch: ["**/*.test.js"],
      }),
      "--runInBand",
      "--json",
      `--outputFile=${reportPath}`,
    ],
    {
      windowsHide: true,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    },
  );
  nativeReport = JSON.parse(readFileSync(reportPath, "utf8"));
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));
function fixture() {
  const repository = {
    id: 168553222,
    full_name: "Hadden-Industries/universal-ontology",
  };
  const snapshot = {
    commit: hash("c"),
    tree: hash("d"),
    parents: [hash("a"), hash("b")],
    workflow: hash("e"),
  };
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((name) => [name, name === "ci_control"]),
  );
  const plan = {
    schemaVersion: 4,
    mode: "changed",
    packageMode: "disabled",
    revision: snapshot.commit,
    comparisonBase: snapshot.parents[0],
    scopes,
    requiredJobs: requiredJobsForScopes(scopes),
  };
  const context = {
    eventName: "pull_request",
    ref: "refs/pull/123/merge",
    sha: snapshot.commit,
    repository: repository.full_name,
    repositoryId: repository.id,
    runId: 100,
    runAttempt: 2,
    event: {
      number: 123,
      pull_request: {
        base: { ref: "main", sha: hash("a"), repo: repository },
        head: { sha: hash("b"), repo: repository },
      },
    },
    snapshot,
    plan,
    environment: {
      os: "Linux",
      architecture: "X64",
      image: "ubuntu24",
      imageVersion: "20261001.1",
      node: "v24.21.0",
      npm: "12.0.0",
      nodeOptions: "",
      timezone: "",
      language: "C.UTF-8",
      externalInputs: "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
    },
  };
  const needs = Object.fromEntries(
    [
      "select",
      "node",
      "development",
      "ontology",
      "website",
      "distribution",
    ].map((name) => [
      name,
      {
        result: ["select", "node"].includes(name) ? "success" : "skipped",
        outputs:
          name === "node" ? { "verified-revision": snapshot.commit } : {},
      },
    ]),
  );
  const run = {
    id: 100,
    run_attempt: 2,
    event: "pull_request",
    path: PR_WORKFLOW,
    head_sha: hash("b"),
    repository,
    head_repository: repository,
    status: "in_progress",
    conclusion: null,
    run_started_at: "2026-10-06T19:55:00Z",
  };
  const jobs = {
    total_count: 7,
    jobs: PR_QUALIFICATION_JOB_NAMES.map((name, index) => ({
      id: 1000 + index,
      name,
      run_id: 100,
      run_attempt: name === "PR validation" ? 2 : 1,
      head_sha: hash("b"),
      status: name === "PR validation" ? "in_progress" : "completed",
      conclusion:
        name === "PR validation"
          ? null
          : ["select", "node"].includes(name)
            ? "success"
            : "skipped",
    })),
  };
  const nativeNode = createNativeNodeCoverage(
    nativeReport,
    [...CI_CONTROL_SUITES].sort(),
    {
      root: directory,
      revision: snapshot.commit,
      runId: 100,
      runAttempt: 1,
      environment: { ...context.environment },
    },
  );
  return { context, needs, nativeNode, run, jobs, now };
}
test("retains original native assertions and exact producing attempts after partial rerun", () => {
  const input = fixture(),
    record = createPrQualificationRecord(input);
  expect(record.coverage).toBe("SELECTED_CI_CONTROL");
  expect(record.proof).toBe("DIRECT_EXECUTION");
  expect(record.nativeNode.assertionCount).toBe(2 * CI_CONTROL_SUITES.length);
  expect(record.nativeNode.runAttempt).toBe(1);
  expect(record.runAttempt).toBe(2);
  expect(record.nativeNode.suites[0].assertions).toEqual([
    "native parameterized fixture",
    "native parameterized fixture",
  ]);
  expect(assertPrQualificationRecord(record)).toBe(record);
});
test.each([
  "fork",
  "wrong-parent",
  "wrong-plan",
  "node-failed",
  "node-skipped",
  "stale-output",
  "wrong-run",
  "wrong-workflow",
  "run-failed",
  "future-run",
  "missing-job",
  "duplicate-job",
  "node-attempt",
  "job-failed",
  "unexpected-success",
  "gate-cancelled",
  "coverage-count",
  "coverage-suite",
  "coverage-empty",
  "coverage-version",
  "reused-coverage",
  "unknown-host",
  "node-options",
  "missing-producing-environment",
  "changed-producing-image",
  "changed-producing-npm",
  "changed-producing-language",
])("rejects producer mutation %s", (caseName) => {
  const input = fixture();
  if (caseName === "fork")
    input.context.event.pull_request.head.repo = {
      id: 2,
      full_name: "fork/repo",
    };
  if (caseName === "wrong-parent")
    input.context.snapshot.parents[0] = hash("f");
  if (caseName === "wrong-plan") input.context.plan.scopes.product_tests = true;
  if (caseName === "node-failed") input.needs.node.result = "failure";
  if (caseName === "node-skipped") input.needs.node.result = "skipped";
  if (caseName === "stale-output")
    input.needs.node.outputs["verified-revision"] = hash("f");
  if (caseName === "wrong-run") input.run.id = 101;
  if (caseName === "wrong-workflow")
    input.run.path = ".github/workflows/other.yml";
  if (caseName === "run-failed") {
    input.run.status = "completed";
    input.run.conclusion = "failure";
  }
  if (caseName === "future-run")
    input.run.run_started_at = "2027-01-01T00:00:00Z";
  if (caseName === "missing-job") input.jobs.jobs.pop();
  if (caseName === "duplicate-job")
    input.jobs.jobs[1].id = input.jobs.jobs[0].id;
  if (caseName === "node-attempt")
    input.jobs.jobs.find((job) => job.name === "node").run_attempt = 2;
  if (caseName === "job-failed")
    input.jobs.jobs.find((job) => job.name === "node").conclusion = "failure";
  if (caseName === "unexpected-success")
    input.jobs.jobs.find((job) => job.name === "website").conclusion =
      "success";
  if (caseName === "gate-cancelled")
    input.jobs.jobs.find((job) => job.name === "PR validation").status =
      "cancelled";
  if (caseName === "coverage-count") input.nativeNode.assertionCount++;
  if (caseName === "coverage-suite")
    input.nativeNode.suites[0].path = "tests/foreign.test.js";
  if (caseName === "coverage-empty") input.nativeNode.suites[0].assertions = [];
  if (caseName === "coverage-version") input.nativeNode.schemaVersion = 2;
  if (caseName === "reused-coverage") input.nativeNode.proof = "REUSED";
  if (caseName === "unknown-host") input.context.environment.image = "unknown";
  if (caseName === "missing-producing-environment")
    delete input.nativeNode.environment;
  if (caseName === "changed-producing-image")
    input.nativeNode.environment.imageVersion = "20261002.1";
  if (caseName === "changed-producing-npm")
    input.nativeNode.environment.npm = "12.0.1";
  if (caseName === "changed-producing-language")
    input.nativeNode.environment.language = "en_US.UTF-8";
  if (caseName === "node-options")
    input.context.environment.nodeOptions = "--require ./unowned.js";
  expect(() => createPrQualificationRecord(input)).toThrow();
});
test("refuses native coverage above256KiB even when the overall record fits512KiB", () => {
  const input = fixture();
  input.nativeNode.suites[0].assertions = Array(100).fill("x".repeat(3000));
  input.nativeNode.assertionCount = input.nativeNode.suites.reduce(
    (sum, suite) => sum + suite.assertions.length,
    0,
  );
  expect(Buffer.byteLength(JSON.stringify(input.nativeNode))).toBeGreaterThan(
    256 * 1024,
  );
  expect(() => createPrQualificationRecord(input)).toThrow(/256KiB/);
});
test.each(["role", "proof", "version", "extra-field", "job-inventory"])(
  "rejects foreign record %s",
  (caseName) => {
    const record = createPrQualificationRecord(fixture());
    if (caseName === "role") record.role = "MAIN";
    if (caseName === "proof") record.proof = "REUSED";
    if (caseName === "version") record.schemaVersion = 0;
    if (caseName === "extra-field") record.source = { runId: 99 };
    if (caseName === "job-inventory") record.jobs[0].name = "foreign";
    expect(() => assertPrQualificationRecord(record)).toThrow();
  },
);
test("unsupported plans retain fresh behavior without metadata lookup or a file", async () => {
  let requests = 0;
  const input = fixture();
  input.context.plan.scopes.ci_control = false;
  input.context.plan.scopes.product_tests = true;
  expect(eligiblePrQualificationPlan(input.context.plan)).toBe(false);
  expect(
    await recordPrQualification({
      env: {
        GITHUB_EVENT_NAME: "push",
        PR_CHECK_PLAN: JSON.stringify(input.context.plan),
      },
      fetchImpl: () => {
        requests++;
        throw Error("unexpected lookup");
      },
    }),
  ).toBeNull();
  expect(requests).toBe(0);
});
test("bounded reader rejects unsafe paths and preserves authenticated read-only request options", async () => {
  const observations = [];
  const read = createRepositoryReader({
    repository: "Hadden-Industries/universal-ontology",
    token: "fixture-token",
    fetchImpl: async (url, options) => {
      observations.push({ url, options });
      return new Response("{}");
    },
  });
  await read("/actions/runs/100");
  expect(observations[0].options.redirect).toBe("error");
  expect(observations[0].options.cache).toBe("no-store");
  expect(observations[0].options.headers.Authorization).toBe(
    "Bearer fixture-token",
  );
  await expect(read("/actions/../../foreign")).rejects.toThrow();
  await expect(read("https://foreign.invalid/")).rejects.toThrow();
  await expect(
    read("/actions/%2e%2e/%2e%2e/other/actions/runs/1"),
  ).rejects.toThrow();
  expect(observations).toHaveLength(1);
});
test("bounded reader enforces body, deadline, request and HTTP ceilings", async () => {
  const fetchImpl = async () => new Response("{}");
  const expired = createRepositoryReader({
    repository: "Hadden-Industries/universal-ontology",
    token: "fixture",
    fetchImpl,
    deadline: Date.now() - 1,
  });
  await expect(expired("/actions/runs/100")).rejects.toThrow(/budget/);
  const counted = createRepositoryReader({
    repository: "Hadden-Industries/universal-ontology",
    token: "fixture",
    fetchImpl,
  });
  for (let i = 0; i < 32; i++) await counted("/actions/runs/100");
  await expect(counted("/actions/runs/100")).rejects.toThrow(/budget/);
  const oversized = createRepositoryReader({
    repository: "Hadden-Industries/universal-ontology",
    token: "fixture",
    fetchImpl: async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1)),
  });
  await expect(oversized("/actions/runs/100")).rejects.toThrow(/budget/);
  const failed = createRepositoryReader({
    repository: "Hadden-Industries/universal-ontology",
    token: "fixture",
    fetchImpl: async () => new Response("{}", { status: 500 }),
  });
  await expect(failed("/actions/runs/100")).rejects.toThrow(/500/);
});
test("native producer binds a real Git merge and retains one closed private record", async () => {
  const root = mkdtempSync(join(tmpdir(), "uo-pr-snapshot-"));
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(root, "empty-global-config"),
  };
  writeFileSync(env.GIT_CONFIG_GLOBAL, "");
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      env,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  const commit = (message) =>
    git([
      "-c",
      "user.name=PR identity fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      message,
    ]);
  try {
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    writeFileSync(join(root, PR_WORKFLOW), "name: native fixture\n");
    git(["init", "--initial-branch=main"]);
    git(["add", "--", PR_WORKFLOW]);
    commit("Base");
    const base = git(["rev-parse", "HEAD"]);
    git(["switch", "-c", "fixture-head"]);
    writeFileSync(join(root, "head.txt"), "native");
    git(["add", "--", "head.txt"]);
    commit("Head");
    const head = git(["rev-parse", "HEAD"]);
    git(["switch", "main"]);
    git([
      "-c",
      "user.name=PR identity fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "merge",
      "--no-ff",
      "fixture-head",
      "-m",
      "Native merge",
    ]);
    const snapshot = readGitSnapshot(root);
    expect(snapshot.parents).toEqual([base, head]);
    expect(snapshot.commit).toBe(git(["rev-parse", "HEAD"]));
    expect(snapshot.workflow).toBe(git(["rev-parse", `HEAD:${PR_WORKFLOW}`]));
    expect(() => readGitSnapshot(root, { deadline: Date.now() - 1 })).toThrow(
      /deadline/,
    );
    const input = fixture();
    input.context.snapshot = snapshot;
    input.context.sha = snapshot.commit;
    input.context.plan.revision = snapshot.commit;
    input.context.plan.comparisonBase = base;
    input.context.event.pull_request.base.sha = base;
    input.context.event.pull_request.head.sha = head;
    input.needs.node.outputs["verified-revision"] = snapshot.commit;
    input.nativeNode.revision = snapshot.commit;
    input.nativeNode.environment.node = process.version;
    input.nativeNode.environment.npm = execFileSync(
      process.execPath,
      [
        realpathSync(
          join(
            dirname(process.execPath),
            process.platform === "win32"
              ? "node_modules/npm/bin/npm-cli.js"
              : "npm",
          ),
        ),
        "--version",
      ],
      { encoding: "utf8", windowsHide: true, timeout: 10000 },
    ).trim();
    input.run.head_sha = head;
    input.jobs.jobs.forEach((job) => {
      job.head_sha = head;
    });
    const eventPath = join(root, "event.json"),
      outputPath = join(root, "output.txt");
    writeFileSync(eventPath, JSON.stringify(input.context.event));
    let lookups = 0;
    const retained = await recordPrQualification({
      root,
      now,
      env: {
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_REF: "refs/pull/123/merge",
        GITHUB_SHA: snapshot.commit,
        GITHUB_REPOSITORY: input.context.repository,
        GITHUB_REPOSITORY_ID: String(input.context.repositoryId),
        GITHUB_RUN_ID: "100",
        GITHUB_RUN_ATTEMPT: "2",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        RUNNER_TEMP: root,
        RUNNER_OS: "Linux",
        RUNNER_ARCH: "X64",
        ImageOS: "ubuntu24",
        ImageVersion: "20261001.1",
        LANG: "C.UTF-8",
        GH_TOKEN: "fixture-token",
        PR_CHECK_PLAN: JSON.stringify(input.context.plan),
        PR_CHECK_RESULTS: JSON.stringify(input.needs),
        PR_NATIVE_NODE_COVERAGE: JSON.stringify(input.nativeNode),
      },
      fetchImpl: async (url) => {
        lookups++;
        return new Response(
          JSON.stringify(url.includes("/jobs?") ? input.jobs : input.run),
        );
      },
    });
    expect(retained?.snapshot).toEqual(snapshot);
    expect(lookups).toBe(2);
    expect(readFileSync(outputPath, "utf8")).toBe("recorded=true\n");
    const stored = JSON.parse(
      readFileSync(
        join(root, "uo-pr-qualification-100-2", "qualification.json"),
        "utf8",
      ),
    );
    expect(assertPrQualificationRecord(stored)).toEqual(retained);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
