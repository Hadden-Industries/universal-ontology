/** Copyright (c) 2026 Hadden Industries Ltd. SPDX-License-Identifier: MIT.
 * Adapted with owner-approved MIT reuse from OwlAPI scripts/ci-verification-command.mjs
 * at 4f6adbd3a925ad2e0ccfc98550f216642957f870; bounded native readers retained.
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  realpathSync,
  lstatSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { decodeNodeQualificationProof } from "./runPullRequestNodeChecks.js";
import {
  PR_WORKFLOW,
  eligiblePrQualificationPlan,
  createPrQualificationRecord,
} from "./prQualification.js";
/** Read exact commit identity with a bounded native Git call budget. */
export const readGitSnapshot = (
  directory = process.cwd(),
  { deadline = Date.now() + 30000 } = {},
) => {
  const git = (...args) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw Object.assign(new Error("Git snapshot deadline elapsed."), {
        code: "LOOKUP_LIMIT_EXCEEDED",
      });
    const result = spawnSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      timeout: Math.min(10000, remaining),
    });
    if (["ETIMEDOUT", "ENOBUFS"].includes(result.error?.code))
      throw Object.assign(
        new Error("Git snapshot lookup exceeded its budget."),
        {
          code: "LOOKUP_LIMIT_EXCEEDED",
        },
      );
    if (result.status !== 0)
      throw new Error("Could not establish the exact Git checkout.");
    return result.stdout.trim();
  };
  // Read the raw commit: shallow checkouts hide parents in pretty-printed logs.
  const headers = git("cat-file", "-p", "HEAD").split("\n\n", 1)[0];
  return {
    commit: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    parents: headers
      .split("\n")
      .filter((line) => /^parent [a-f0-9]{40}$/u.test(line))
      .map((line) => line.slice(7)),
    workflow: git("rev-parse", `HEAD:${PR_WORKFLOW}`),
  };
};

export const createRepositoryReader = ({
  repository,
  token,
  fetchImpl = fetch,
  deadline = Date.now() + 60_000,
}) => {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "") || !token) {
    throw new Error("Read-only GitHub evidence access is unavailable.");
  }
  const requestDeadline = Math.min(deadline, Date.now() + 60_000);
  let requests = 0;
  return async (path) => {
    if (
      !/^\/(?:commits|actions|git)\/[A-Za-z0-9_./?=&-]+$/u.test(path) ||
      path.includes("..")
    ) {
      throw new Error("Unexpected GitHub evidence path.");
    }
    const remaining = requestDeadline - Date.now();
    if (++requests > 32 || remaining <= 0)
      throw Object.assign(
        new Error("GitHub evidence lookup budget exhausted."),
        { code: "LOOKUP_LIMIT_EXCEEDED" },
      );
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}${path}`,
      {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(10_000, remaining)),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2026-03-10",
        },
      },
    );
    if (!response.ok)
      throw new Error(`GitHub evidence read returned HTTP ${response.status}.`);
    const chunks = [];
    let bytes = 0;
    if (!response.body)
      throw new Error("GitHub evidence response has no JSON body.");
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > 2 * 1024 * 1024 || Date.now() > requestDeadline)
        throw Object.assign(
          new Error("GitHub evidence response exceeded its budget."),
          { code: "LOOKUP_LIMIT_EXCEEDED" },
        );
      chunks.push(chunk);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  };
};

function readJson(path, maximumBytes = 512 * 1024) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes)
    throw Error("Invalid bounded record input.");
  return JSON.parse(readFileSync(path, "utf8"));
}
function emit(env, values, message) {
  for (const [key, value] of Object.entries(values)) {
    if (!/^[a-z_]+$/.test(key) || /[\r\n]/.test(String(value)))
      throw Error("Unsafe producer output.");
    if (env.GITHUB_OUTPUT)
      appendFileSync(env.GITHUB_OUTPUT, key + "=" + value + "\n");
  }
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, message + "\n");
  console.log(JSON.stringify({ ...values, message }));
}
export async function recordPrQualification({
  env = process.env,
  root = process.cwd(),
  fetchImpl = fetch,
  now = Date.now(),
} = {}) {
  try {
    const plan = JSON.parse(env.PR_CHECK_PLAN || "null");
    if (
      env.GITHUB_EVENT_NAME !== "pull_request" ||
      !eligiblePrQualificationPlan(plan)
    ) {
      emit(
        env,
        { recorded: "false" },
        "Fresh qualification completed; this plan has no reusable Node record.",
      );
      return null;
    }
    const npm = spawnSync(
      process.execPath,
      [
        realpathSync(
          env.npm_execpath ||
            join(
              dirname(process.execPath),
              process.platform === "win32"
                ? "node_modules/npm/bin/npm-cli.js"
                : "npm",
            ),
        ),
        "--version",
      ],
      { encoding: "utf8", windowsHide: true, timeout: 10000, maxBuffer: 4096 },
    );
    if (npm.error || npm.status !== 0)
      throw Error("Native npm identity is unavailable.");
    const context = {
      eventName: env.GITHUB_EVENT_NAME,
      ref: env.GITHUB_REF,
      sha: env.GITHUB_SHA,
      repository: env.GITHUB_REPOSITORY,
      repositoryId: Number(env.GITHUB_REPOSITORY_ID),
      runId: Number(env.GITHUB_RUN_ID),
      runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
      event: readJson(env.GITHUB_EVENT_PATH),
      snapshot: readGitSnapshot(root),
      plan,
      environment: {
        os: env.RUNNER_OS,
        architecture: env.RUNNER_ARCH,
        image: env.ImageOS,
        imageVersion: env.ImageVersion,
        node: process.version,
        npm: npm.stdout.trim(),
        nodeOptions: env.NODE_OPTIONS || "",
        timezone: env.TZ || "",
        language: env.LANG || "",
        externalInputs: "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
      },
    };
    const read = createRepositoryReader({
      repository: context.repository,
      token: env.GH_TOKEN,
      fetchImpl,
    });
    const run = await read("/actions/runs/" + context.runId);
    const jobs = await read(
      "/actions/runs/" + context.runId + "/jobs?filter=latest&per_page=100",
    );
    const record = createPrQualificationRecord({
      context,
      needs: JSON.parse(env.PR_CHECK_RESULTS || "null"),
      nativeNode: decodeNodeQualificationProof(env.PR_NATIVE_NODE_COVERAGE),
      run,
      jobs,
      now,
    });
    if (!env.RUNNER_TEMP)
      throw Error("Owned runner evidence directory is unavailable.");
    const directory = join(
      env.RUNNER_TEMP,
      "uo-pr-qualification-" + context.runId + "-" + context.runAttempt,
    );
    mkdirSync(directory);
    writeFileSync(
      join(directory, "qualification.json"),
      JSON.stringify(record) + "\n",
      { encoding: "utf8", flag: "wx" },
    );
    emit(
      env,
      { recorded: "true" },
      "Retained selected Node qualification with original native discovery, assertion and job identities. Eligible main integrations may reuse only this Node proof.",
    );
    return record;
  } catch (error) {
    emit(
      env,
      { recorded: "false" },
      "No reusable PR record retained: " +
        String(error.message)
          .replace(/[\r\n]/g, " ")
          .slice(0, 300),
    );
    return null;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.length !== 3 || process.argv[2] !== "record")
    throw Error("Expected record mode.");
  await recordPrQualification();
}
