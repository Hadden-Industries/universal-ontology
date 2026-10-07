import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import yazl from "yazl";
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
  PR_QUALIFICATION_JOB_NAMES,
} from "../scripts/prQualification.js";
import {
  selectOriginalPrQualification,
  verifyOriginalPrQualification,
  assertMainReuseCompletion,
} from "../scripts/prQualificationReuse.js";
import {
  readOriginalQualificationArchive,
  selectMainQualificationReuse,
} from "../scripts/prQualificationReuseCommand.js";
const hash = (c) => c.repeat(40),
  time = Date.parse("2026-10-06T20:00:00Z"),
  clone = (v) => JSON.parse(JSON.stringify(v));
let nativeRoot, report;
beforeAll(() => {
  nativeRoot = mkdtempSync(join(tmpdir(), "uo-original-proof-native-"));
  for (const path of CI_CONTROL_SUITES) {
    const destination = join(nativeRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(
      destination,
      "test.each([1,2])('original fixture obligation',n=>expect(n).toBeGreaterThan(0));\n",
    );
  }
  const output = join(nativeRoot, "native.json");
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/jest/bin/jest.js", import.meta.url),
      ),
      "--config",
      JSON.stringify({
        rootDir: nativeRoot,
        testEnvironment: "node",
        transform: {},
        testMatch: ["**/*.test.js"],
      }),
      "--runInBand",
      "--json",
      `--outputFile=${output}`,
    ],
    { encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 1048576 },
  );
  report = JSON.parse(readFileSync(output, "utf8"));
});
afterAll(() => rmSync(nativeRoot, { recursive: true, force: true }));
function fixture() {
  const repository = {
    id: 168553222,
    full_name: "Hadden-Industries/universal-ontology",
    default_branch: "main",
  };
  const snapshot = {
    commit: hash("c"),
    tree: hash("d"),
    parents: [hash("a"), hash("b")],
    workflow: hash("e"),
  };
  const environment = {
    os: "Linux",
    architecture: "X64",
    image: "ubuntu24",
    imageVersion: "20261001.1",
    node: "v24.21.0",
    npm: "12.2.0",
    nodeOptions: "",
    timezone: "",
    language: "C.UTF-8",
    externalInputs: "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
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
  const pr = {
    number: 123,
    state: "closed",
    merged_at: "2026-10-06T19:59:00Z",
    base: { ref: "main", sha: hash("a"), repo: repository },
    head: { sha: hash("b"), repo: repository },
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
    path: ".github/workflows/pr-validation.yml",
    head_sha: hash("b"),
    repository,
    head_repository: repository,
    status: "completed",
    conclusion: "success",
    created_at: "2026-10-06T19:50:00Z",
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
      status: "completed",
      conclusion: ["select", "node", "PR validation"].includes(name)
        ? "success"
        : "skipped",
    })),
  };
  const original = {
    eventName: "pull_request",
    ref: "refs/pull/123/merge",
    sha: snapshot.commit,
    repository: repository.full_name,
    repositoryId: repository.id,
    runId: 100,
    runAttempt: 2,
    event: { number: 123, pull_request: pr },
    snapshot,
    plan,
    environment,
  };
  const nativeNode = createNativeNodeCoverage(
    report,
    [...CI_CONTROL_SUITES].sort(),
    {
      root: nativeRoot,
      revision: snapshot.commit,
      runId: 100,
      runAttempt: 1,
      environment: { ...environment },
    },
  );
  const record = createPrQualificationRecord({
    context: original,
    needs,
    nativeNode,
    run,
    jobs,
    now: time - 30000,
  });
  const context = {
    ...original,
    eventName: "push",
    ref: "refs/heads/main",
    workflowRef:
      "Hadden-Industries/universal-ontology/.github/workflows/full-qualification.yml@refs/heads/main",
    sha: hash("f"),
    runId: 200,
    runAttempt: 1,
    disabled: false,
    snapshot: { ...snapshot, commit: hash("f") },
    plan: { ...plan, revision: hash("f") },
    event: {
      ref: "refs/heads/main",
      before: hash("a"),
      after: hash("f"),
      deleted: false,
      created: false,
      forced: false,
      repository,
    },
  };
  const artifact = {
    id: 300,
    name: "uo-pr-qualification-100-2",
    size_in_bytes: 1000,
    digest: `sha256:${"1".repeat(64)}`,
    expired: false,
    expires_at: "2026-10-06T20:05:00Z",
    workflow_run: {
      id: 100,
      repository_id: repository.id,
      head_repository_id: repository.id,
      head_sha: hash("b"),
    },
  };
  const mainRun = {
    id: 200,
    run_attempt: 1,
    event: "push",
    path: ".github/workflows/full-qualification.yml",
    head_sha: hash("f"),
    head_branch: "main",
    repository,
    head_repository: repository,
    status: "in_progress",
    conclusion: null,
  };
  const data = {
    context,
    record,
    pr,
    run,
    jobs,
    artifact,
    mainRun,
    clock: time,
    calls: [],
    sourceReads: 0,
    artifactReads: 0,
  };
  data.read = async (path) => {
    data.calls.push(path);
    if (path === "/actions/runs/200") return clone(data.mainRun);
    if (path === `/git/commits/${hash("f")}`)
      return {
        sha: hash("f"),
        tree: { sha: hash("d") },
        parents: [{ sha: hash("a") }, { sha: hash("b") }],
      };
    if (path.startsWith("/commits/")) return [clone(data.pr)];
    if (path.startsWith("/actions/workflows/"))
      return {
        total_count: data.newer ? 2 : 1,
        workflow_runs: [
          clone(data.run),
          ...(data.newer ? [clone(data.newer)] : []),
        ],
      };
    if (path === "/actions/runs/100/artifacts?per_page=100")
      return { total_count: 1, artifacts: [clone(data.artifact)] };
    if (path === "/actions/runs/100") {
      data.sourceReads++;
      return {
        ...clone(data.run),
        ...(data.rerun && data.sourceReads > 1 ? { run_attempt: 3 } : {}),
      };
    }
    if (path === "/actions/artifacts/300") {
      data.artifactReads++;
      return {
        ...clone(data.artifact),
        ...(data.changedDigest && data.artifactReads > 1
          ? { digest: `sha256:${"2".repeat(64)}` }
          : {}),
      };
    }
    if (path === `/git/commits/${hash("c")}`)
      return {
        sha: hash("c"),
        tree: { sha: data.foreignTree ? hash("0") : hash("d") },
        parents: [{ sha: hash("a") }, { sha: hash("b") }],
      };
    const trees = {
      [hash("d")]: [".github", "tree", hash("1")],
      [hash("1")]: ["workflows", "tree", hash("2")],
      [hash("2")]: ["pr-validation.yml", "blob", hash("e")],
    };
    if (path.startsWith("/git/trees/")) {
      const tree = path.split("/").at(-1),
        [name, type, sha] = trees[tree];
      return { sha: tree, truncated: false, tree: [{ path: name, type, sha }] };
    }
    if (path === "/actions/runs/100/jobs?filter=latest&per_page=100") {
      if (data.expireDuringJobs) data.clock = time + 600000;
      if (data.invalidFinalRow) data.newer = { ...data.run, id: undefined };
      if (data.newerDuringJobs)
        data.newer = {
          ...data.run,
          id: 101,
          status: "in_progress",
          conclusion: null,
        };
      return clone(data.jobs);
    }
    throw Error(`Unexpected fixture native API path: ${path}`);
  };
  return data;
}
async function admit(data) {
  const now = () => data.clock,
    selection = await selectOriginalPrQualification({
      context: data.context,
      read: data.read,
      now,
    });
  return verifyOriginalPrQualification({
    context: data.context,
    selection,
    record: data.record,
    read: data.read,
    now,
  });
}
test("admits only the original directly executed assertions after equivalent normal integration", async () => {
  const data = fixture(),
    accepted = await admit(data);
  expect(accepted.proof).toBe("ORIGINAL_PR_REUSE");
  expect(accepted.record.proof).toBe("DIRECT_EXECUTION");
  expect(accepted.record.nativeNode.runAttempt).toBe(1);
  expect(accepted.record.runAttempt).toBe(2);
  expect(data.calls).toHaveLength(16);
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
      { result: name === "select" ? "success" : "skipped" },
    ]),
  );
  expect(assertMainReuseCompletion(data.context, accepted, needs)).toBe(
    hash("f"),
  );
  needs.node.result = "cancelled";
  expect(() =>
    assertMainReuseCompletion(data.context, accepted, needs),
  ).toThrow();
});
test.each([
  "manual",
  "schedule",
  "publication-caller",
  "disabled",
  "direct",
  "squash",
  "multi-push",
  "fork",
  "failed-latest",
  "pending-latest",
  "record-reused",
  "record-tree",
  "record-environment",
  "native-tree",
  "producing-attempt",
  "job-failure",
  "extra-job",
  "artifact-expired",
  "artifact-identity",
  "rerun-during-readback",
  "digest-during-readback",
  "expiry-during-readback",
  "new-run-during-readback",
  "missing-run-id",
  "negative-run-id",
  "duplicate-run-id",
  "invalid-final-run-id",
])("fresh path required for %s", async (scenario) => {
  const data = fixture();
  if (["manual", "schedule"].includes(scenario))
    data.context.eventName =
      scenario === "manual" ? "workflow_dispatch" : "schedule";
  if (scenario === "publication-caller")
    data.context.workflowRef =
      "Hadden-Industries/universal-ontology/.github/workflows/manual-mcp-packages.yml@refs/heads/main";
  if (scenario === "disabled") data.context.disabled = true;
  if (["direct", "squash"].includes(scenario))
    data.context.snapshot.parents = [hash("a")];
  if (scenario === "multi-push") data.context.event.before = hash("0");
  if (scenario === "fork")
    data.pr.head.repo = { id: 1, full_name: "foreign/repo" };
  if (["failed-latest", "pending-latest"].includes(scenario))
    data.newer = {
      ...data.run,
      id: 101,
      status: scenario === "pending-latest" ? "in_progress" : "completed",
      conclusion: "failure",
    };
  if (scenario === "record-reused") data.record.proof = "REUSED";
  if (scenario === "record-tree") data.record.snapshot.tree = hash("0");
  if (scenario === "record-environment")
    data.context.environment = {
      ...data.context.environment,
      imageVersion: "20261002.1",
    };
  if (scenario === "native-tree") data.foreignTree = true;
  if (scenario === "producing-attempt")
    data.jobs.jobs.find((j) => j.name === "node").run_attempt = 2;
  if (scenario === "job-failure")
    data.jobs.jobs.find((j) => j.name === "node").conclusion = "failure";
  if (scenario === "extra-job") {
    data.jobs.jobs.push({ ...data.jobs.jobs[0], id: 999, name: "foreign" });
    data.jobs.total_count++;
  }
  if (scenario === "artifact-expired") data.artifact.expired = true;
  if (scenario === "artifact-identity")
    data.artifact.workflow_run.repository_id = 1;
  if (scenario === "rerun-during-readback") data.rerun = true;
  if (scenario === "digest-during-readback") data.changedDigest = true;
  if (scenario === "expiry-during-readback") data.expireDuringJobs = true;
  if (scenario === "new-run-during-readback") data.newerDuringJobs = true;
  if (scenario === "missing-run-id")
    data.newer = { ...data.run, id: undefined };
  if (scenario === "negative-run-id") data.newer = { ...data.run, id: -1 };
  if (scenario === "duplicate-run-id") data.newer = { ...data.run };
  if (scenario === "invalid-final-run-id") data.invalidFinalRow = true;
  await expect(admit(data)).rejects.toThrow();
});
test.each([
  "missing-consumer",
  "extra-consumer",
  "failed-selector",
  "executed-node",
  "foreign-main",
  "foreign-artifact",
  "reissued-proof",
  "changed-checkout",
  "disabled-gate",
])("completion rejects %s", async (scenario) => {
  const data = fixture(),
    accepted = await admit(data);
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
      { result: name === "select" ? "success" : "skipped" },
    ]),
  );
  if (scenario === "missing-consumer") delete needs.website;
  if (scenario === "extra-consumer") needs.extra = { result: "skipped" };
  if (scenario === "failed-selector") needs.select.result = "failure";
  if (scenario === "executed-node") needs.node.result = "success";
  if (scenario === "foreign-main") accepted.main.runId++;
  if (scenario === "foreign-artifact") accepted.artifact.extra = true;
  if (scenario === "reissued-proof")
    accepted.record.proof = "ORIGINAL_PR_REUSE";
  if (scenario === "changed-checkout") data.context.snapshot.tree = hash("0");
  if (scenario === "disabled-gate") data.context.disabled = true;
  expect(() =>
    assertMainReuseCompletion(data.context, accepted, needs),
  ).toThrow();
});

test.each([
  "valid-fresh",
  "failed-fresh",
  "skipped-selected",
  "missing-decision",
])("native CLI gate preserves fresh selected completion: %s", (scenario) => {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const data = fixture(),
    plan = { ...data.context.plan, revision };
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
          name === "node"
            ? { "verified-revision": revision }
            : { reuse: "false" },
      },
    ]),
  );
  if (scenario === "failed-fresh") needs.node.result = "failure";
  if (scenario === "skipped-selected") needs.node.result = "skipped";
  if (scenario === "missing-decision") delete needs.select.outputs.reuse;
  const directory = mkdtempSync(join(tmpdir(), "uo-main-gate-cli-"));
  try {
    const output = join(directory, "output");
    writeFileSync(output, "");
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../scripts/prQualificationReuseCommand.js", import.meta.url),
        ),
        "gate",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
        maxBuffer: 65536,
        env: {
          ...process.env,
          GITHUB_SHA: revision,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: "",
          PR_CHECK_PLAN: JSON.stringify(plan),
          PR_CHECK_RESULTS: JSON.stringify(needs),
        },
      },
    );
    expect(result.status).toBe(scenario === "valid-fresh" ? 0 : 1);
    expect(readFileSync(output, "utf8")).toBe(
      scenario === "valid-fresh" ? `verified-revision=${revision}\n` : "",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unsupported selector callers emit fresh without any API or archive operation", async () => {
  let calls = 0;
  expect(
    await selectMainQualificationReuse({
      env: { GITHUB_EVENT_NAME: "schedule" },
      fetchImpl: async () => {
        calls++;
      },
      download: () => {
        calls++;
      },
    }),
  ).toBeNull();
  expect(calls).toBe(0);
});
async function archive(entries) {
  const zip = new yazl.ZipFile(),
    chunks = [];
  const done = new Promise((resolve, reject) => {
    zip.outputStream.on("data", (b) => chunks.push(b));
    zip.outputStream.on("end", resolve);
    zip.outputStream.on("error", reject);
  });
  for (const [name, bytes, mode = 0o100644] of entries)
    zip.addBuffer(bytes, name, { mode });
  zip.end();
  await done;
  return Buffer.concat(chunks);
}
test.each([
  "regular",
  "symlink",
  "extra",
  "duplicate",
  "expanded",
  "digest",
  "invalid-json",
])("bounded native ZIP transport: %s", async (scenario) => {
  const directory = mkdtempSync(join(tmpdir(), "uo-original-zip-"));
  try {
    const entries = [
      [
        "qualification.json",
        Buffer.from(
          scenario === "invalid-json" ? "invalid" : '{"fixtureOnly":true}\n',
        ),
        scenario === "symlink" ? 0o120777 : 0o100644,
      ],
    ];
    if (scenario === "extra") entries.push(["extra.json", Buffer.from("{}")]);
    if (scenario === "duplicate") entries.push(entries[0]);
    if (scenario === "expanded") entries[0][1] = Buffer.alloc(524289, 97);
    const bytes = await archive(entries),
      artifact = {
        id: 300,
        size_in_bytes: bytes.length,
        digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      };
    if (scenario === "digest") artifact.digest = `sha256:${"0".repeat(64)}`;
    const run = (program, args, options) =>
      program === "gh"
        ? { status: 0, stdout: bytes }
        : spawnSync(program, args, options);
    const operation = () =>
      readOriginalQualificationArchive({
        context: {
          repository: "Hadden-Industries/universal-ontology",
          runId: 200,
          runAttempt: 1,
        },
        artifact,
        env: { ...process.env, RUNNER_TEMP: directory },
        deadline: Date.now() + 10000,
        run,
        unzip:
          process.platform === "win32"
            ? "C:/Program Files/Git/usr/bin/unzip.exe"
            : "/usr/bin/unzip",
      });
    if (scenario === "regular")
      expect(operation()).toEqual({ fixtureOnly: true });
    else expect(operation).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
