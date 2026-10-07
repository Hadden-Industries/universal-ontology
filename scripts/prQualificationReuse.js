/** Copyright (c) 2026 Hadden Industries Ltd. SPDX-License-Identifier: MIT.
 * Adapted with owner-approved MIT reuse from OwlAPI ci-verification.mjs
 * at4f6adbd3a925ad2e0ccfc98550f216642957f870. Admit only original selected proof.
 */
import { isDeepStrictEqual } from "node:util";
import {
  assertPrQualificationRecord,
  eligiblePrQualificationPlan,
  PR_WORKFLOW,
  PR_QUALIFICATION_JOB_NAMES,
  PR_QUALIFICATION_SUCCESS_JOB_NAMES,
} from "./prQualification.js";
import { assertCheckPlan } from "./selectPullRequestChecks.js";
export const FULL_WORKFLOW = ".github/workflows/full-qualification.yml";
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const id = (value) => Number.isSafeInteger(value) && value > 0;
const fact = (condition, message) => {
  if (!condition) throw Error(message);
};
const sameRepository = (observed, context) =>
  observed?.id === context.repositoryId &&
  observed?.full_name === context.repository;
const artifactName = (run) =>
  `uo-pr-qualification-${run.id}-${run.run_attempt}`;

/** Admit only a single ordinary merge into this top-level workflow. */
export function assertOrdinaryMainContext(context) {
  const { event, snapshot } = context;
  fact(
    context.repository === "Hadden-Industries/universal-ontology" &&
      context.repositoryId === 168553222 &&
      context.eventName === "push" &&
      context.ref === "refs/heads/main" &&
      context.workflowRef ===
        `${context.repository}/${FULL_WORKFLOW}@refs/heads/main` &&
      context.disabled === false &&
      id(context.runId) &&
      id(context.runAttempt) &&
      event.ref === context.ref &&
      event.after === context.sha &&
      event.deleted === false &&
      event.created === false &&
      event.forced === false &&
      sameRepository(event.repository, context) &&
      event.repository.default_branch === "main" &&
      snapshot.commit === context.sha &&
      sha(snapshot.commit) &&
      sha(snapshot.tree) &&
      sha(snapshot.workflow) &&
      snapshot.parents.length === 2 &&
      snapshot.parents.every(sha) &&
      snapshot.parents[0] === event.before &&
      eligiblePrQualificationPlan(context.plan) &&
      context.plan.revision === context.sha &&
      context.plan.comparisonBase === event.before,
    "This event, caller, package policy or integration requires fresh selected work.",
  );
  return context;
}
function assertMainRun(run, context) {
  fact(
    run?.id === context.runId &&
      run.run_attempt === context.runAttempt &&
      run.event === "push" &&
      run.path === FULL_WORKFLOW &&
      run.head_branch === "main" &&
      run.head_sha === context.sha &&
      sameRepository(run.repository, context) &&
      sameRepository(run.head_repository, context) &&
      ["in_progress", "completed"].includes(run.status) &&
      (run.status !== "completed" || run.conclusion === "success"),
    "Current native main workflow identity disagrees.",
  );
}
function assertSourceRun(run, context, pr, now) {
  fact(
    id(run?.id) &&
      id(run.run_attempt) &&
      run.event === "pull_request" &&
      run.path === PR_WORKFLOW &&
      run.status === "completed" &&
      run.conclusion === "success" &&
      run.head_sha === pr.head.sha &&
      sameRepository(run.repository, context) &&
      sameRepository(run.head_repository, context) &&
      Date.parse(run.created_at) <= now &&
      Number.isFinite(Date.parse(run.run_started_at)),
    "Latest original PR run is foreign, incomplete or unsuccessful.",
  );
}
function assertArtifact(artifact, run, context, now) {
  fact(
    id(artifact?.id) &&
      artifact.name === artifactName(run) &&
      artifact.expired === false &&
      Date.parse(artifact.expires_at) > now &&
      /^sha256:[a-f0-9]{64}$/u.test(artifact.digest ?? "") &&
      Number.isSafeInteger(artifact.size_in_bytes) &&
      artifact.size_in_bytes > 0 &&
      artifact.size_in_bytes <= 128 * 1024 &&
      artifact.workflow_run?.id === run.id &&
      artifact.workflow_run.repository_id === context.repositoryId &&
      artifact.workflow_run.head_repository_id === context.repositoryId &&
      artifact.workflow_run.head_sha === run.head_sha,
    "Original artifact is missing, foreign, expired or outside its native byte/digest bound.",
  );
}
const completePage = (document, key) => {
  fact(
    Array.isArray(document?.[key]) &&
      Number.isSafeInteger(document.total_count) &&
      document.total_count === document[key].length &&
      document.total_count <= 100,
    "Native lookup page is incomplete.",
  );
  return document[key];
};

const latestOriginalRun = (runs) => {
  fact(
    runs.length > 0 &&
      runs.every((run) => id(run?.id)) &&
      new Set(runs.map((run) => run.id)).size === runs.length,
    "Native source inventory has invalid or ambiguous run identities.",
  );
  return [...runs].sort((a, b) => b.id - a.id)[0];
};

/** Select the latest original run only; an older convenient success is never proof. */
export async function selectOriginalPrQualification({
  context,
  read,
  now = Date.now,
}) {
  assertOrdinaryMainContext(context);
  assertMainRun(await read(`/actions/runs/${context.runId}`), context);
  const landed = await read(`/git/commits/${context.sha}`);
  fact(
    landed.sha === context.sha &&
      landed.tree?.sha === context.snapshot.tree &&
      isDeepStrictEqual(
        landed.parents?.map((p) => p.sha),
        context.snapshot.parents,
      ),
    "Native landed Git identity disagrees.",
  );
  const prs = await read(`/commits/${context.sha}/pulls?per_page=100`);
  fact(
    Array.isArray(prs) && prs.length < 100,
    "Native merged-PR lookup is incomplete.",
  );
  const matches = prs.filter(
    (pr) =>
      id(pr.number) &&
      pr.state === "closed" &&
      Date.parse(pr.merged_at) <= now() &&
      pr.base?.ref === "main" &&
      pr.base.sha === context.snapshot.parents[0] &&
      pr.head?.sha === context.snapshot.parents[1] &&
      sameRepository(pr.base.repo, context) &&
      sameRepository(pr.head.repo, context),
  );
  fact(
    matches.length === 1,
    "No unique same-repository PR matches both landed parents.",
  );
  const pr = matches[0];
  const runs = completePage(
    await read(
      `/actions/workflows/pr-validation.yml/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`,
    ),
    "workflow_runs",
  );
  const run = latestOriginalRun(runs);
  assertSourceRun(run, context, pr, now());
  const proofs = completePage(
    await read(`/actions/runs/${run.id}/artifacts?per_page=100`),
    "artifacts",
  ).filter((a) => a.name === artifactName(run));
  fact(
    proofs.length === 1,
    "Latest original run has no unique attempt-bound proof.",
  );
  assertArtifact(proofs[0], run, context, now());
  return { pr, run, artifact: proofs[0] };
}

/** Recheck original native run, jobs, Git tree and artifact after authenticated transfer. */
export async function verifyOriginalPrQualification({
  context,
  selection,
  record,
  read,
  now = Date.now,
}) {
  assertOrdinaryMainContext(context);
  assertPrQualificationRecord(record);
  const { pr, artifact } = selection;
  const run = await read(`/actions/runs/${selection.run.id}`);
  assertSourceRun(run, context, pr, now());
  fact(
    run.run_attempt === selection.run.run_attempt,
    "Original source was rerun during transfer.",
  );
  const currentArtifact = await read(`/actions/artifacts/${artifact.id}`);
  assertArtifact(currentArtifact, run, context, now());
  fact(
    currentArtifact.id === artifact.id &&
      currentArtifact.digest === artifact.digest &&
      currentArtifact.size_in_bytes === artifact.size_in_bytes,
    "Original artifact identity changed.",
  );
  fact(
    record.repository === context.repository &&
      record.repositoryId === context.repositoryId &&
      record.runId === run.id &&
      record.runAttempt === run.run_attempt &&
      record.pullRequest === pr.number &&
      Date.parse(record.recordedAt) >= Date.parse(run.run_started_at) &&
      Date.parse(record.recordedAt) <= now() &&
      isDeepStrictEqual(record.environment, context.environment) &&
      record.snapshot.tree === context.snapshot.tree &&
      record.snapshot.workflow === context.snapshot.workflow &&
      isDeepStrictEqual(record.snapshot.parents, context.snapshot.parents) &&
      record.plan.comparisonBase === context.plan.comparisonBase &&
      record.plan.packageMode === context.plan.packageMode &&
      isDeepStrictEqual(record.plan.scopes, context.plan.scopes) &&
      isDeepStrictEqual(record.plan.requiredJobs, context.plan.requiredJobs),
    "Original direct proof does not establish these exact current inputs.",
  );
  const tested = await read(`/git/commits/${record.snapshot.commit}`);
  fact(
    tested.sha === record.snapshot.commit &&
      tested.tree?.sha === context.snapshot.tree &&
      isDeepStrictEqual(
        tested.parents?.map((p) => p.sha),
        context.snapshot.parents,
      ),
    "Native original Git merge disagrees with the landed tree.",
  );
  let tree = context.snapshot.tree;
  for (const [path, type] of [
    [".github", "tree"],
    ["workflows", "tree"],
    ["pr-validation.yml", "blob"],
  ]) {
    const observed = await read(`/git/trees/${tree}`);
    fact(
      observed.sha === tree &&
        observed.truncated === false &&
        Array.isArray(observed.tree),
      "Native workflow tree is incomplete.",
    );
    const matches = observed.tree.filter(
      (e) => e.path === path && e.type === type && sha(e.sha),
    );
    fact(
      matches.length === 1,
      "Native original workflow blob is absent or ambiguous.",
    );
    tree = matches[0].sha;
  }
  fact(
    tree === record.snapshot.workflow,
    "Original workflow identity disagrees with the authenticated tree.",
  );
  const observed = await read(
    `/actions/runs/${run.id}/jobs?filter=latest&per_page=100`,
  );
  const jobs = completePage(observed, "jobs");
  fact(
    jobs.length === PR_QUALIFICATION_JOB_NAMES.length &&
      new Set(jobs.map((j) => j.id)).size === jobs.length &&
      isDeepStrictEqual(
        jobs.map((j) => j.name).sort(),
        [...PR_QUALIFICATION_JOB_NAMES].sort(),
      ) &&
      jobs.every((job) => {
        const original = record.jobs.find((j) => j.name === job.name);
        return (
          job.id === original.id &&
          job.run_id === run.id &&
          job.head_sha === run.head_sha &&
          job.run_attempt === original.runAttempt &&
          job.run_attempt <= run.run_attempt &&
          job.status === "completed" &&
          job.conclusion ===
            (PR_QUALIFICATION_SUCCESS_JOB_NAMES.includes(job.name)
              ? "success"
              : "skipped")
        );
      }),
    "Latest native original job or producing-attempt inventory disagrees.",
  );
  const finalRun = await read(`/actions/runs/${run.id}`);
  assertSourceRun(finalRun, context, pr, now());
  fact(
    finalRun.run_attempt === run.run_attempt,
    "Original source was rerun during job verification.",
  );
  const finalArtifact = await read(`/actions/artifacts/${artifact.id}`);
  assertArtifact(finalArtifact, finalRun, context, now());
  fact(
    finalArtifact.id === artifact.id &&
      finalArtifact.digest === artifact.digest &&
      finalArtifact.size_in_bytes === artifact.size_in_bytes,
    "Original artifact changed during readback.",
  );
  const finalRuns = completePage(
    await read(
      `/actions/workflows/pr-validation.yml/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`,
    ),
    "workflow_runs",
  );
  const latest = latestOriginalRun(finalRuns);
  assertSourceRun(latest, context, pr, now());
  fact(
    latest.id === run.id && latest.run_attempt === run.run_attempt,
    "A newer original source appeared during readback.",
  );
  assertMainRun(await read(`/actions/runs/${context.runId}`), context);
  return {
    schemaVersion: 1,
    proof: "ORIGINAL_PR_REUSE",
    main: {
      runId: context.runId,
      runAttempt: context.runAttempt,
      revision: context.sha,
    },
    artifact: { id: artifact.id, digest: artifact.digest },
    record,
  };
}

/** The completion gate checks the source proof and current checkout independently
 * before accepting only the selected Node omission. It does not claim new execution.
 */
export function assertMainReuseCompletion(context, qualification, needs) {
  assertOrdinaryMainContext(context);
  assertCheckPlan(context.plan);
  fact(
    qualification?.schemaVersion === 1 &&
      qualification.proof === "ORIGINAL_PR_REUSE" &&
      isDeepStrictEqual(
        Object.keys(qualification).sort(),
        ["schemaVersion", "proof", "main", "artifact", "record"].sort(),
      ) &&
      isDeepStrictEqual(qualification.main, {
        runId: context.runId,
        runAttempt: context.runAttempt,
        revision: context.sha,
      }) &&
      id(qualification.artifact?.id) &&
      /^sha256:[a-f0-9]{64}$/u.test(qualification.artifact.digest ?? "") &&
      isDeepStrictEqual(
        Object.keys(qualification.artifact).sort(),
        ["id", "digest"].sort(),
      ),
    "Current reuse decision is absent, foreign or malformed.",
  );
  const record = assertPrQualificationRecord(qualification.record);
  fact(
    record.snapshot.tree === context.snapshot.tree &&
      record.snapshot.workflow === context.snapshot.workflow &&
      isDeepStrictEqual(record.snapshot.parents, context.snapshot.parents) &&
      record.plan.comparisonBase === context.plan.comparisonBase &&
      record.plan.packageMode === context.plan.packageMode &&
      isDeepStrictEqual(record.plan.scopes, context.plan.scopes) &&
      isDeepStrictEqual(record.plan.requiredJobs, context.plan.requiredJobs),
    "Source proof does not match the exact current checkout and selected contract.",
  );
  const names = [
    "select",
    "node",
    "development",
    "ontology",
    "website",
    "distribution",
  ];
  fact(
    needs &&
      isDeepStrictEqual(Object.keys(needs).sort(), [...names].sort()) &&
      needs.select.result === "success" &&
      needs.development.result === "success" &&
      needs.development.outputs?.["verified-revision"] === context.sha &&
      names
        .filter((n) => !["select", "development"].includes(n))
        .every((n) => needs[n].result === "skipped"),
    "Reused completion has unexpected, failed or cancelled consumers.",
  );
  return context.sha;
}
