import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA256 = /^[a-f0-9]{64}$/u;
const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const MAX_ASSET_BYTES = 268_435_456;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const binaryOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

/** Bind native artifact metadata and the downloaded ZIP digest to qualified
 * outputs, then verify every extracted subject without executing candidate code.
 * fileNames comes from the qualified checkout's release inputs, never the artifact.
 */
export async function verifyManualMcpCandidate({
  directory,
  fileNames,
  revision,
  version,
  candidateSha256,
  artifactId,
  artifactDigest,
  archiveDigest,
  runId,
  metadata,
}) {
  if (
    !/^[a-f0-9]{40}$/u.test(revision ?? "") ||
    !VERSION.test(version ?? "") ||
    !SHA256.test(candidateSha256 ?? "") ||
    !SHA256.test(artifactDigest ?? "") ||
    !/^[1-9][0-9]*$/u.test(artifactId ?? "") ||
    !/^[1-9][0-9]*$/u.test(runId ?? "")
  )
    throw new Error("Invalid qualified candidate identity.");
  if (
    metadata?.id?.toString() !== artifactId ||
    metadata.expired !== false ||
    metadata.name !==
      `universal-ontology-mcp-server-development-candidate-${candidateSha256}` ||
    metadata.digest !== `sha256:${artifactDigest}` ||
    archiveDigest !== artifactDigest ||
    metadata.workflow_run?.id?.toString() !== runId ||
    metadata.workflow_run.head_sha !== revision ||
    metadata.workflow_run.head_branch !== "main"
  )
    throw new Error(
      "Artifact identity, archive digest or main source disagrees.",
    );
  if (
    !Array.isArray(fileNames) ||
    !fileNames.length ||
    new Set(fileNames).size !== fileNames.length ||
    fileNames.some(
      (name) =>
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(name) || name === "SHA256SUMS",
    )
  )
    throw new Error("Unsafe candidate file inventory.");
  const expected = [...fileNames, "SHA256SUMS"].sort(binaryOrder);
  if (
    !(await lstat(directory)).isDirectory() ||
    JSON.stringify((await readdir(directory)).sort(binaryOrder)) !==
      JSON.stringify(expected)
  )
    throw new Error("Candidate file inventory disagrees.");
  for (const name of expected) {
    const stat = await lstat(join(directory, name));
    if (!stat.isFile() || stat.size > MAX_ASSET_BYTES)
      throw new Error(
        "Candidate contains a symlink, non-file or oversized subject.",
      );
  }
  const manifest = await readFile(join(directory, "SHA256SUMS"));
  if (manifest.length > 16_384 || digest(manifest) !== candidateSha256)
    throw new Error("Candidate checksum manifest identity disagrees.");
  const lines = manifest.toString("utf8").split("\n");
  if (lines.pop() !== "" || lines.length !== fileNames.length)
    throw new Error("Candidate checksum manifest is incomplete.");
  for (const [index, name] of [...fileNames].sort(binaryOrder).entries()) {
    const line = /^([a-f0-9]{64}) {2}([a-zA-Z0-9][a-zA-Z0-9._-]*)$/u.exec(
      lines[index],
    );
    if (line?.[2] !== name)
      throw new Error("Candidate checksum inventory disagrees.");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(join(directory, name)))
      hash.update(chunk);
    if (hash.digest("hex") !== line[1])
      throw new Error(`Candidate checksum mismatch: ${name}`);
  }
  return expected;
}

/** Native GitHub API boundary: only an actual HTTP 404 means absence. */
export function githubJson(path, { optional = false } = {}) {
  const result = spawnSync("gh", ["api", path], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1_048_576,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (optional && result.status === 1 && /\(HTTP 404\)/u.test(result.stderr))
      return null;
    throw new Error(`GitHub request failed: ${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout);
}

/** Stream the native uploaded ZIP into SHA-256; no extraction or scratch needed. */
async function githubArchiveDigest(path) {
  return new Promise((fulfil, reject) => {
    const child = spawn("gh", ["api", path], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const hash = createHash("sha256");
    let size = 0;
    let stderr = "";
    child.on("error", reject);
    child.stdout.on("data", (bytes) => {
      size += bytes.length;
      if (size > 1_073_741_824) {
        child.kill();
        reject(new Error("Artifact ZIP exceeds its byte ceiling."));
      } else hash.update(bytes);
    });
    child.stderr.on("data", (bytes) => {
      stderr = (stderr + bytes.toString()).slice(-8192);
    });
    child.on("close", (code) => {
      if (code !== 0 || size === 0)
        reject(new Error(`Artifact ZIP download failed: ${stderr}`));
      else fulfil(hash.digest("hex"));
    });
  });
}

/** Create only a draft; native arguments prevent shell expansion and asset clobber.
 * A partial draft after a failed upload is retained for deliberate operator recovery.
 */
export function createManualMcpDraft(
  { repository, revision, version, directory, files },
  request = githubJson,
  run = spawnSync,
) {
  if (
    !/^Hadden-Industries\/universal-ontology$/u.test(repository ?? "") ||
    !/^[a-f0-9]{40}$/u.test(revision ?? "") ||
    !VERSION.test(version ?? "")
  )
    throw new Error("Invalid draft target identity.");
  const tag = `universal-ontology-mcp-server-v${version}`;
  if (request(`repos/${repository}/git/ref/tags/${tag}`, { optional: true }))
    throw new Error(
      "Release tag or draft already exists; refuse to overwrite.",
    );
  // The release-by-tag endpoint does not reliably expose unpublished drafts.
  // Paginate the maintainer-visible collection; exhaustion must be established.
  let exhausted = false;
  for (let page = 1; page <= 20; page++) {
    const releases = request(
      `repos/${repository}/releases?per_page=100&page=${page}`,
    );
    if (!Array.isArray(releases))
      throw new Error("Invalid release collection.");
    if (releases.some((release) => release.tag_name === tag))
      throw new Error(
        "Release tag or draft already exists; refuse to overwrite.",
      );
    if (releases.length < 100) {
      exhausted = true;
      break;
    }
  }
  if (!exhausted)
    throw new Error("Release collision inspection exceeded its page ceiling.");
  const result = run(
    "gh",
    [
      "release",
      "create",
      tag,
      "--repo",
      repository,
      "--draft",
      "--target",
      revision,
      "--title",
      `Universal Ontology MCP server ${version}`,
      "--notes",
      `Manually qualified source: ${revision}. Ontology data is supplied separately. Inspect checksums, SBOMs and provenance before manually publishing this draft.`,
      ...files.map((name) => join(directory, name)),
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "Draft creation failed; inspect any partial draft before retrying.",
    );
}

/** The privileged CLI accepts identity only from successful reusable outputs and
 * the caller's exact main dispatch, not arbitrary refs or artifact-supplied scripts.
 */
async function runManualCandidate(env, mode) {
  const repository = env.GITHUB_REPOSITORY;
  const revision = env.QUALIFIED_REVISION;
  if (
    repository !== "Hadden-Industries/universal-ontology" ||
    env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env.GITHUB_REF !== "refs/heads/main" ||
    revision !== env.GITHUB_SHA ||
    env.GITHUB_WORKFLOW_REF !==
      `${repository}/.github/workflows/manual-mcp-packages.yml@refs/heads/main`
  )
    throw new Error("Manual candidate requires the dedicated main dispatch.");
  const checkedOut = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (checkedOut.status !== 0 || checkedOut.stdout.trim() !== revision)
    throw new Error("Manual candidate checkout disagrees with qualification.");
  const publicPackage = JSON.parse(
    await readFile(
      "packages/universal-ontology-mcp-server/package.json",
      "utf8",
    ),
  );
  if (publicPackage.version !== env.QUALIFIED_VERSION)
    throw new Error("Qualified version disagrees with source.");
  const releaseInputs = JSON.parse(
    await readFile(
      "scripts/distribution/universalOntologyMcpReleaseInputs.json",
      "utf8",
    ),
  );
  const base = `${publicPackage.name}-v${publicPackage.version}`;
  const fileNames = [
    `${publicPackage.name}-${publicPackage.version}.tgz`,
    ...releaseInputs.nodeRuntime.targets.map(
      ({ targetName, releaseArchiveFormat }) =>
        `${base}-${targetName}.${releaseArchiveFormat === "zip" ? "zip" : "tar.gz"}`,
    ),
    `${base}-npm.spdx.json`,
    `${base}-release.spdx.json`,
    `${base}-oci-metadata.json`,
    `${base}-development-candidate-notes.md`,
    "server.json",
  ];
  // Validate identifiers before placing them in API paths.
  if (!/^[1-9][0-9]*$/u.test(env.QUALIFIED_ARTIFACT_ID ?? ""))
    throw new Error("Invalid candidate artifact ID.");
  const path = `repos/${repository}/actions/artifacts/${env.QUALIFIED_ARTIFACT_ID}`;
  const metadata = githubJson(path);
  const archiveDigest = await githubArchiveDigest(`${path}/zip`);
  const directory = "dist/manual-candidate";
  const files = await verifyManualMcpCandidate({
    directory,
    fileNames,
    revision,
    version: env.QUALIFIED_VERSION,
    candidateSha256: env.QUALIFIED_CANDIDATE_SHA256,
    artifactId: env.QUALIFIED_ARTIFACT_ID,
    artifactDigest: env.QUALIFIED_ARTIFACT_DIGEST,
    runId: env.GITHUB_RUN_ID,
    metadata,
    archiveDigest,
  });
  if (mode === "--draft") {
    if (env.CREATE_DRAFT_RELEASE !== "true")
      throw new Error("Draft publication was not explicitly selected.");
    createManualMcpDraft({
      repository,
      revision,
      version: env.QUALIFIED_VERSION,
      directory,
      files,
    });
  }
  console.log(
    `Verified manual candidate ${env.QUALIFIED_CANDIDATE_SHA256} from ${revision}; ${files.length} files.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (
      process.argv.length !== 3 ||
      !["--verify", "--draft"].includes(process.argv[2])
    )
      throw new Error("Use --verify or --draft.");
    await runManualCandidate(process.env, process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
