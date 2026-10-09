/** Copyright (c) 2026 Hadden Industries Ltd. SPDX-License-Identifier: MIT.
 * Uses the owner-approved OwlAPI bounded native reader and UO's existing
 * exact-ID gh archive transport. Admission consumes data, never extracted code.
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  readFileSync,
  lstatSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  rmdirSync,
  realpathSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  readGitSnapshot,
  createRepositoryReader,
} from "./prQualificationCommand.js";
import {
  selectOriginalPrQualification,
  verifyOriginalPrQualification,
  assertMainReuseCompletion,
} from "./prQualificationReuse.js";
import { runCheckEvaluation } from "./evaluatePullRequestChecks.js";
import {
  encodeNodeQualificationProof,
  decodeNodeQualificationProof,
} from "./runPullRequestNodeChecks.js";
function readJson(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024)
    throw Error("Invalid bounded native event.");
  return JSON.parse(readFileSync(path, "utf8"));
}
function emit(env, values, message) {
  for (const [key, value] of Object.entries(values)) {
    if (!/^[a-z_]+$/u.test(key) || /[\r\n]/u.test(String(value)))
      throw Error("Unsafe admission output.");
    if (env.GITHUB_OUTPUT)
      appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, message + "\n");
  console.log(JSON.stringify({ ...values, message }));
}
function nativeVersion(env, deadline) {
  const npm = realpathSync(
    env.npm_execpath ||
      join(
        dirname(process.execPath),
        process.platform === "win32"
          ? "node_modules/npm/bin/npm-cli.js"
          : "npm",
      ),
  );
  const result = spawnSync(process.execPath, [npm, "--version"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: Math.min(10000, deadline - Date.now()),
    maxBuffer: 4096,
  });
  if (result.error || result.status !== 0)
    throw Error("Current native npm identity is unavailable.");
  return {
    os: env.RUNNER_OS,
    architecture: env.RUNNER_ARCH,
    image: env.ImageOS,
    imageVersion: env.ImageVersion,
    node: process.version,
    npm: result.stdout.trim(),
    nodeOptions: env.NODE_OPTIONS || "",
    timezone: env.TZ || "",
    language: env.LANG || "",
    externalInputs: "NO_LIVE_EXTERNAL_SOURCE_OBLIGATIONS",
  };
}
function contextFromEnvironment(
  env,
  root,
  deadline,
  { observeEnvironment = false } = {},
) {
  if (
    !["", "false", "true"].includes(
      env.UO_PR_QUALIFICATION_REUSE_DISABLED || "",
    )
  )
    throw Error("Invalid independent reuse disablement.");
  return {
    eventName: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    sha: env.GITHUB_SHA,
    repository: env.GITHUB_REPOSITORY,
    repositoryId: Number(env.GITHUB_REPOSITORY_ID),
    workflowRef: env.GITHUB_WORKFLOW_REF,
    runId: Number(env.GITHUB_RUN_ID),
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    disabled: env.UO_PR_QUALIFICATION_REUSE_DISABLED === "true",
    event: readJson(env.GITHUB_EVENT_PATH),
    snapshot: readGitSnapshot(root, {
      deadline: Math.min(deadline, Date.now() + 30000),
    }),
    plan: JSON.parse(env.PR_CHECK_PLAN || "null"),
    ...(observeEnvironment
      ? { environment: nativeVersion(env, deadline) }
      : {}),
  };
}

/** Fixed native GitHub transport, SHA-256 admission and closed regular-file ZIP.
 * Never extract any member to a caller-selected destination or trust a redirect
 * URL from JSON. Native gh owns authenticated archive redirects for this exact ID.
 */
export function readOriginalQualificationArchive({
  context,
  artifact,
  env,
  deadline,
  run = spawnSync,
  unzip = "/usr/bin/unzip",
}) {
  const remaining = () => {
    const value = deadline - Date.now();
    if (value <= 0) throw Error("Evidence transport deadline elapsed.");
    return Math.min(10000, value);
  };
  const temp = lstatSync(env.RUNNER_TEMP);
  if (!temp.isDirectory() || temp.isSymbolicLink())
    throw Error("Owned native runner temporary directory is unavailable.");
  const result = run(
    "gh",
    [
      "api",
      "--hostname",
      "github.com",
      `repos/${context.repository}/actions/artifacts/${artifact.id}/zip`,
    ],
    {
      encoding: null,
      windowsHide: true,
      timeout: remaining(),
      maxBuffer: 128 * 1024,
      env: { ...env, GH_HOST: "github.com" },
    },
  );
  if (
    result.error ||
    result.status !== 0 ||
    !Buffer.isBuffer(result.stdout) ||
    result.stdout.length === 0 ||
    result.stdout.length > 128 * 1024
  )
    throw Error("Native original ZIP transfer failed or exceeded its bound.");
  const bytes = result.stdout;
  if (
    bytes.length !== artifact.size_in_bytes ||
    "sha256:" + createHash("sha256").update(bytes).digest("hex") !==
      artifact.digest
  )
    throw Error("Native ZIP bytes disagree with the authenticated artifact.");
  const directory = join(
    env.RUNNER_TEMP,
    `uo-original-proof-${context.runId}-${context.runAttempt}`,
  );
  mkdirSync(directory);
  const path = join(directory, "original.zip");
  writeFileSync(path, bytes, { flag: "wx" });
  const options = {
    windowsHide: true,
    timeout: remaining(),
    maxBuffer: 8192,
    encoding: "utf8",
    env: {
      ...env,
      UNZIP: "",
      UNZIPOPT: "",
      ZIPINFO: "",
      ZIPINFOOPT: "",
      LC_ALL: "C",
    },
  };
  const version = run(unzip, ["-v"], options);
  if (
    version.error ||
    version.status !== 0 ||
    !version.stdout.startsWith("UnZip 6.00 ")
  )
    throw Error("Supported native ZIP inspection is unavailable.");
  const listing = run(unzip, ["-Z", "-l", path], {
    ...options,
    timeout: remaining(),
  });
  if (listing.error || listing.status !== 0)
    throw Error("Native ZIP inventory inspection failed.");
  const lines = listing.stdout.trimEnd().split(/\r?\n/u);
  if (
    lines.length !== 4 ||
    !/^Zip file size: [0-9]+ bytes, number of entries: 1$/u.test(lines[1]) ||
    !/^1 file, [0-9]+ bytes uncompressed, [0-9]+ bytes compressed: /u.test(
      lines[3],
    )
  )
    throw Error("Original ZIP has an unsupported or non-singleton inventory.");
  const entry =
    /^-[rwxstST-]{9}\s+[0-9]+\.[0-9]+\s+unx\s+([0-9]+)\s+[bt][xl-]\s+[0-9]+\s+(?:defN|stor)\s+[0-9]{2}-[A-Za-z]{3}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}\s+qualification\.json$/u.exec(
      lines[2],
    );
  if (!entry || Number(entry[1]) <= 0 || Number(entry[1]) > 512 * 1024)
    throw Error(
      "Original ZIP member is foreign, linked, encrypted or outside its bound.",
    );
  const plain = run(unzip, ["-p", path, "qualification.json"], {
    ...options,
    encoding: null,
    timeout: remaining(),
    maxBuffer: 512 * 1024,
  });
  if (
    plain.error ||
    plain.status !== 0 ||
    !Buffer.isBuffer(plain.stdout) ||
    plain.stdout.length !== Number(entry[1]) ||
    plain.stdout.length > 512 * 1024
  )
    throw Error(
      "Native original JSON decompression failed or exceeded its bound.",
    );
  const record = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(plain.stdout),
  );
  // These two exact resources are spent only after successful native decoding.
  rmSync(path);
  rmdirSync(directory);
  return record;
}

/** Optional lookup never masks a selected execution failure: it precedes jobs. */
export async function selectMainQualificationReuse({
  env = process.env,
  root = process.cwd(),
  fetchImpl = fetch,
  download = readOriginalQualificationArchive,
} = {}) {
  const deadline = Date.now() + 60000;
  try {
    // Publication/reusable callers and other events never contact the service.
    if (
      env.GITHUB_EVENT_NAME !== "push" ||
      env.GITHUB_REF !== "refs/heads/main" ||
      env.GITHUB_WORKFLOW_REF !==
        `${env.GITHUB_REPOSITORY}/.github/workflows/full-qualification.yml@refs/heads/main` ||
      env.UO_PR_QUALIFICATION_REUSE_DISABLED === "true"
    )
      throw Error("This caller or event requires fresh selected work.");
    const context = contextFromEnvironment(env, root, deadline, {
      observeEnvironment: true,
    });
    const nativeRead = createRepositoryReader({
      repository: context.repository,
      token: env.GH_TOKEN,
      fetchImpl,
      deadline,
    });
    let operations = 0;
    const read = async (path) => {
      if (++operations > 32 || Date.now() >= deadline)
        throw Error("Original proof lookup budget exhausted.");
      return nativeRead(path);
    };
    const selection = await selectOriginalPrQualification({ context, read });
    if (++operations > 32)
      throw Error("Native archive operation budget exhausted.");
    const record = await download({
      context,
      artifact: selection.artifact,
      env,
      deadline,
    });
    const qualification = await verifyOriginalPrQualification({
      context,
      selection,
      record,
      read,
    });
    const serialized = encodeNodeQualificationProof(qualification, 400 * 1024);
    if (Date.now() >= deadline || serialized === null)
      throw Error(
        "Original admission output exceeded its deadline or native output bound.",
      );
    emit(
      env,
      { reuse: "true", qualification: serialized },
      `Reuse original selected Node assertions from PR run ${record.runId}/attempt ${record.nativeNode.runAttempt}; no new execution is claimed. Every other selected consumer remains fresh.`,
    );
    return qualification;
  } catch (error) {
    emit(
      env,
      { reuse: "false" },
      "Fresh selected qualification: " +
        String(error.message)
          .replace(/[\r\n]/gu, " ")
          .slice(0, 300),
    );
    return null;
  }
}

/** Stable completion gate admits only the original-proof Node omission. */
export function completeMainQualification(
  env = process.env,
  root = process.cwd(),
) {
  const needs = JSON.parse(env.PR_CHECK_RESULTS || "null");
  const reuse = needs?.select?.outputs?.reuse;
  if (reuse !== "true") {
    if (reuse !== "false") throw Error("Main selection output is missing.");
    return runCheckEvaluation(env, []);
  }
  const context = contextFromEnvironment(env, root, Date.now() + 30000);
  const text = needs.select.outputs.qualification;
  const revision = assertMainReuseCompletion(
    context,
    decodeNodeQualificationProof(text, 400 * 1024),
    needs,
  );
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `verified-revision=${revision}\n`);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      "Current tree accepted through authenticated original PR execution; selected Node checks were reused.\n",
    );
  return revision;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (
    process.argv.length !== 3 ||
    !["select", "gate"].includes(process.argv[2])
  )
    throw Error("Expected select or gate mode.");
  if (process.argv[2] === "select") await selectMainQualificationReuse();
  else completeMainQualification();
}
