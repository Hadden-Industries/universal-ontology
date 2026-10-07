/** Copyright (c) 2026 Hadden Industries Ltd. SPDX-License-Identifier: MIT.
 * UO adapter of OwlAPI original-PR identity concepts, with owner-approved MIT reuse
 * at 4f6adbd3a925ad2e0ccfc98550f216642957f870. This initial producer never omits work.
 */
import { isDeepStrictEqual } from "node:util";
import { assertCheckPlan } from "./selectPullRequestChecks.js";
import { evaluatePullRequestChecks } from "./evaluatePullRequestChecks.js";
import { CI_CONTROL_SUITES } from "./runPullRequestNodeChecks.js";
export const PR_WORKFLOW = ".github/workflows/pr-validation.yml";
export const PR_QUALIFICATION_JOB_NAMES = Object.freeze([
  "select",
  "node",
  "development / Select relevant checks",
  "development / Markdown documents (ubuntu-24.04)",
  "development / Markdown documents (windows-2025)",
  "development / Python style",
  "development / Python-only tests (${{ matrix.os }})",
  "development / Node-backed Python tests (${{ matrix.os }})",
  "development / Agent Skills lock",
  "development / Style toolchain (${{ matrix.os }})",
  "development / Development controls",
  "development / Verify internal completion",
  "ontology",
  "website",
  "distribution",
  "PR validation",
]);
export const PR_QUALIFICATION_SUCCESS_JOB_NAMES = Object.freeze([
  "select",
  "node",
  "PR validation",
  "development / Select relevant checks",
  "development / Markdown documents (ubuntu-24.04)",
  "development / Markdown documents (windows-2025)",
  "development / Verify internal completion",
]);
export const PR_QUALIFICATION_POLICY =
  "uo-selected-ci-control-fresh-markdown-v2";
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const id = (value) => Number.isSafeInteger(value) && value > 0;
const fact = (condition, message) => {
  if (!condition) throw Error(message);
};
const closed = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
export const eligiblePrQualificationPlan = (plan) => {
  assertCheckPlan(plan);
  return (
    plan.mode === "changed" &&
    plan.packageMode === "disabled" &&
    plan.scopes.ci_control &&
    isDeepStrictEqual(plan.requiredJobs, ["development", "node"]) &&
    Object.entries(plan.scopes).every(
      ([scope, selected]) => scope === "ci_control" || !selected,
    )
  );
};
export function assertNativeControlCoverage(coverage, identity) {
  fact(
    closed(coverage, [
      "schemaVersion",
      "proof",
      "revision",
      "runId",
      "runAttempt",
      "environment",
      "suiteCount",
      "assertionCount",
      "suites",
    ]) &&
      coverage.schemaVersion === 1 &&
      coverage.proof === "DIRECT_EXECUTION" &&
      coverage.revision === identity.revision &&
      coverage.runId === identity.runId &&
      id(coverage.runAttempt) &&
      coverage.runAttempt === identity.runAttempt,
    "Native direct execution identity disagrees.",
  );
  fact(
    Array.isArray(coverage.suites) &&
      coverage.suiteCount === CI_CONTROL_SUITES.length &&
      coverage.suites.length === CI_CONTROL_SUITES.length &&
      isDeepStrictEqual(
        coverage.suites.map((suite) => suite.path).sort(),
        [...CI_CONTROL_SUITES].sort(),
      ),
    "Native control suite inventory is incomplete.",
  );
  fact(
    Buffer.byteLength(JSON.stringify(coverage)) <= 256 * 1024,
    "Native retained coverage exceeds 256KiB.",
  );
  let count = 0;
  for (const suite of coverage.suites) {
    fact(
      closed(suite, ["path", "assertions"]) &&
        Array.isArray(suite.assertions) &&
        suite.assertions.length > 0 &&
        suite.assertions.length <= 10000 &&
        suite.assertions.every(
          (label) =>
            typeof label === "string" &&
            label.length > 0 &&
            label.length <= 4096,
        ),
      "Native assertion labels are missing.",
    );
    count += suite.assertions.length;
  }
  fact(
    count === coverage.assertionCount && count > 0,
    "Native assertion accounting disagrees.",
  );
  return coverage;
}
export function assertPrQualificationRecord(record) {
  fact(
    closed(record, [
      "schemaVersion",
      "role",
      "proof",
      "coverage",
      "policy",
      "repository",
      "repositoryId",
      "runId",
      "runAttempt",
      "pullRequest",
      "recordedAt",
      "snapshot",
      "environment",
      "plan",
      "nativeNode",
      "jobs",
    ]) &&
      record.schemaVersion === 1 &&
      record.role === "PR" &&
      record.proof === "DIRECT_EXECUTION" &&
      record.coverage === "SELECTED_CI_CONTROL" &&
      record.policy === PR_QUALIFICATION_POLICY,
    "Unsupported or reused qualification record.",
  );
  fact(
    record.repository === "Hadden-Industries/universal-ontology" &&
      record.repositoryId === 168553222 &&
      id(record.runId) &&
      id(record.runAttempt) &&
      id(record.pullRequest) &&
      Number.isFinite(Date.parse(record.recordedAt)),
    "Qualification origin is invalid.",
  );
  fact(
    closed(record.snapshot, ["commit", "tree", "parents", "workflow"]) &&
      sha(record.snapshot.commit) &&
      sha(record.snapshot.tree) &&
      sha(record.snapshot.workflow) &&
      Array.isArray(record.snapshot.parents) &&
      record.snapshot.parents.length === 2 &&
      record.snapshot.parents.every(sha),
    "Exact tested merge identity is absent.",
  );
  fact(
    eligiblePrQualificationPlan(record.plan) &&
      record.plan.revision === record.snapshot.commit &&
      record.plan.comparisonBase === record.snapshot.parents[0],
    "Selected plan disagrees with its native inputs.",
  );
  const environment = record.environment;
  fact(
    closed(environment, [
      "os",
      "architecture",
      "image",
      "imageVersion",
      "node",
      "npm",
      "nodeOptions",
      "timezone",
      "language",
      "externalInputs",
    ]) &&
      environment.os === "Linux" &&
      environment.architecture === "X64" &&
      environment.image === "ubuntu24" &&
      /^\d{8}\.\d+(?:\.\d+)?$/.test(environment.imageVersion ?? "") &&
      environment.node === "v24.21.0" &&
      /^\d+\.\d+\.\d+$/.test(environment.npm ?? "") &&
      environment.nodeOptions === "" &&
      typeof environment.timezone === "string" &&
      typeof environment.language === "string" &&
      environment.externalInputs === "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
    "Unsupported qualification environment.",
  );
  fact(
    Array.isArray(record.jobs) &&
      record.jobs.length === PR_QUALIFICATION_JOB_NAMES.length &&
      isDeepStrictEqual(
        record.jobs.map((job) => job.name).sort(),
        [...PR_QUALIFICATION_JOB_NAMES].sort(),
      ) &&
      new Set(record.jobs.map((job) => job.id)).size === record.jobs.length &&
      record.jobs.every(
        (job) =>
          closed(job, ["id", "name", "runId", "runAttempt"]) &&
          id(job.id) &&
          job.runId === record.runId &&
          id(job.runAttempt) &&
          job.runAttempt <= record.runAttempt,
      ),
    "Native job identity inventory disagrees.",
  );
  fact(
    isDeepStrictEqual(record.nativeNode?.environment, record.environment),
    "Original test-producing environment is missing or differs from the record.",
  );
  const node = record.jobs.find((job) => job.name === "node");
  const gate = record.jobs.find((job) => job.name === "PR validation");
  fact(
    gate.runAttempt === record.runAttempt,
    "Record producer attempt disagrees.",
  );
  assertNativeControlCoverage(record.nativeNode, {
    revision: record.snapshot.commit,
    runId: record.runId,
    runAttempt: node.runAttempt,
  });
  fact(
    Buffer.byteLength(JSON.stringify(record)) <= 512 * 1024,
    "Qualification record exceeds 512KiB.",
  );
  return record;
}
export function createPrQualificationRecord({
  context,
  needs,
  nativeNode,
  run,
  jobs,
  now = Date.now(),
}) {
  const { event, snapshot } = context;
  const pr = event.pull_request;
  fact(
    context.eventName === "pull_request" &&
      pr?.base?.ref === "main" &&
      id(event.number) &&
      context.ref === "refs/pull/" + event.number + "/merge" &&
      context.sha === snapshot.commit &&
      isDeepStrictEqual(snapshot.parents, [pr.base.sha, pr.head.sha]) &&
      pr.base.repo?.id === context.repositoryId &&
      pr.head.repo?.id === context.repositoryId &&
      pr.base.repo.full_name === context.repository &&
      pr.head.repo.full_name === context.repository,
    "Record requires an exact same-repository PR merge.",
  );
  fact(
    eligiblePrQualificationPlan(context.plan),
    "This selected plan is not covered by the initial producer.",
  );
  fact(
    evaluatePullRequestChecks(
      context.plan,
      Object.fromEntries(
        Object.entries(needs).map(([name, value]) => [name, value.result]),
      ),
    ).ok &&
      needs.node?.outputs?.["verified-revision"] === snapshot.commit &&
      needs.development?.outputs?.["verified-revision"] === snapshot.commit,
    "Selected qualification did not complete.",
  );
  fact(
    run?.id === context.runId &&
      run.run_attempt === context.runAttempt &&
      run.event === "pull_request" &&
      run.path === PR_WORKFLOW &&
      run.head_sha === pr.head.sha &&
      run.repository?.id === context.repositoryId &&
      run.head_repository?.id === context.repositoryId &&
      run.repository.full_name === context.repository &&
      run.head_repository.full_name === context.repository &&
      ["in_progress", "completed"].includes(run.status) &&
      (run.status !== "completed" || run.conclusion === "success") &&
      Date.parse(run.run_started_at) <= now,
    "Native producer workflow identity disagrees.",
  );
  fact(
    jobs?.total_count === PR_QUALIFICATION_JOB_NAMES.length &&
      jobs.jobs?.length === PR_QUALIFICATION_JOB_NAMES.length &&
      jobs.jobs.every(
        (job) =>
          job.run_id === context.runId &&
          job.head_sha === pr.head.sha &&
          id(job.run_attempt) &&
          job.run_attempt <= context.runAttempt &&
          (job.name === "PR validation"
            ? job.run_attempt === context.runAttempt &&
              ["in_progress", "completed"].includes(job.status) &&
              (job.status !== "completed" || job.conclusion === "success")
            : job.status === "completed" &&
              job.conclusion ===
                (PR_QUALIFICATION_SUCCESS_JOB_NAMES.includes(job.name)
                  ? "success"
                  : "skipped")),
      ),
    "Native producer jobs are incomplete.",
  );
  return assertPrQualificationRecord({
    schemaVersion: 1,
    role: "PR",
    proof: "DIRECT_EXECUTION",
    coverage: "SELECTED_CI_CONTROL",
    policy: PR_QUALIFICATION_POLICY,
    repository: context.repository,
    repositoryId: context.repositoryId,
    runId: context.runId,
    runAttempt: context.runAttempt,
    pullRequest: event.number,
    recordedAt: new Date(now).toISOString(),
    snapshot,
    environment: context.environment,
    plan: context.plan,
    nativeNode,
    jobs: jobs.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      runId: job.run_id,
      runAttempt: job.run_attempt,
    })),
  });
}
