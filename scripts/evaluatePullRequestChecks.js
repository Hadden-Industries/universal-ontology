/** Fail-closed control-plane evaluation; deliberately needs no installed packages. */
import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertCheckPlan,
  CORE_CHECK_CONSUMER_IDS,
} from "./selectPullRequestChecks.js";

/** Evaluate every known result, including unselected consumers that ran and failed. */
export function evaluatePullRequestChecks(plan, results) {
  const failures = [];
  try {
    assertCheckPlan(plan);
  } catch (error) {
    return { ok: false, failures: [error.message] };
  }
  const ids = ["select", ...CORE_CHECK_CONSUMER_IDS];
  if (
    !results ||
    typeof results !== "object" ||
    Array.isArray(results) ||
    JSON.stringify(Object.keys(results).sort()) !==
      JSON.stringify([...ids].sort())
  )
    return {
      ok: false,
      failures: ["Result keys must match the complete consumer set."],
    };
  for (const id of ids) {
    const required = id === "select" || plan.requiredJobs.includes(id);
    if (results[id] !== "success" && !(results[id] === "skipped" && !required))
      failures.push(`${id}: ${String(results[id])}`);
  }
  return { ok: failures.length === 0, failures };
}

/** Check immutable source identity before any product execution. */
export function verifyPlanRevision(plan, env = process.env) {
  assertCheckPlan(plan);
  if (
    env.GITHUB_SHA !== plan.revision ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
      plan.revision
  )
    throw new Error("Plan revision does not match event and checkout.");
}

/** Expected internal conclusions come from the validated plan, never caller input. */
export function consumerJobs(plan, consumer) {
  const s = plan.scopes;
  const jobs = {
    development: {
      scope: true,
      documentation: s.documentation || s.style_tooling,
      "python-style": s.python_style && !s.style_tooling,
      "python-tests": s.python_tests,
      "agent-skills-lock": s.agent_skills_lock,
      "style-tooling": s.style_tooling,
      checks: s.development,
    },
    ontology: {
      "validate-ontologies": true,
      "policy-qa": s.ontology_policy_qa || s.ontology_entity_contracts,
      qualify: s.ontology_qualification,
    },
    distribution: {
      scope: true,
      validate: true,
      archive: s.mcp_artifacts,
      container: s.mcp_artifacts,
      assemble: s.mcp_artifacts,
    },
  };
  if (!jobs[consumer]) throw new Error("Unknown reusable consumer.");
  return jobs[consumer];
}

/** CLI modes: check input identity, expose scopes, complete a consumer, or gate all consumers. */
export function runCheckEvaluation(
  env = process.env,
  args = process.argv.slice(2),
) {
  const plan = JSON.parse(env.PR_CHECK_PLAN ?? "");
  verifyPlanRevision(plan, env);
  if (env.PR_CHECK_CANCELLED === "true") throw new Error("Workflow cancelled.");
  if (args[0] === "--verify") {
    if (args.length !== 1) throw new Error("Invalid verification arguments.");
    return;
  }
  if (args[0] === "--scopes") {
    if (!env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
    appendFileSync(
      env.GITHUB_OUTPUT,
      Object.entries(plan.scopes)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
    return;
  }
  const needs = JSON.parse(env.PR_CHECK_RESULTS ?? "");
  if (args[0] === "--consumer") {
    const consumer = args[1];
    const expected = consumerJobs(plan, consumer);
    if (
      !plan.requiredJobs.includes(consumer) ||
      JSON.stringify(Object.keys(needs).sort()) !==
        JSON.stringify(Object.keys(expected).sort()) ||
      Object.entries(expected).some(
        ([id, required]) =>
          needs[id]?.result !== "success" &&
          !(needs[id]?.result === "skipped" && !required),
      )
    )
      throw new Error("Consumer completion is incomplete.");
    let candidateOutput = "";
    if (consumer === "distribution" && plan.scopes.mcp_artifacts) {
      const output = needs.assemble.outputs ?? {};
      const patterns = {
        "software-version":
          /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u,
        "candidate-sha256": /^[a-f0-9]{64}$/u,
        "artifact-id": /^[1-9][0-9]*$/u,
        "artifact-digest": /^[a-f0-9]{64}$/u,
      };
      for (const [key, pattern] of Object.entries(patterns)) {
        if (typeof output[key] !== "string" || !pattern.test(output[key]))
          throw new Error(`Missing qualified candidate output: ${key}`);
        candidateOutput += `${key}=${output[key]}\n`;
      }
    }
    if (!env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
    appendFileSync(
      env.GITHUB_OUTPUT,
      `verified-revision=${plan.revision}\n${candidateOutput}`,
    );
    return;
  }
  if (args.length) throw new Error("Unknown evaluation arguments.");
  const result = evaluatePullRequestChecks(
    plan,
    Object.fromEntries(
      Object.entries(needs).map(([id, value]) => [id, value?.result]),
    ),
  );
  for (const id of plan.requiredJobs)
    if (needs[id]?.outputs?.["verified-revision"] !== plan.revision)
      result.failures.push(`${id}: absent or stale completion proof`);
  if (result.failures.length) throw new Error(result.failures.join("\n"));
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `verified-revision=${plan.revision}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    runCheckEvaluation();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
