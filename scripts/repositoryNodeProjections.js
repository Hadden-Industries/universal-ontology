/** .node-version owns the Node runtime shipped with the MCP server. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nodeTarget } from "./nodeTarget.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const DOCKERFILE_PATH = "packages/universal-ontology-mcp-server/Dockerfile";
const NODE_DISTRIBUTION_URL = "https://nodejs.org/dist";
const IMAGE_MANIFEST_URL =
  "https://registry-1.docker.io/v2/library/node/manifests";
const IMAGE_TOKEN_URL =
  "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull";
const IMAGE_INDEX_TYPES =
  "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json";

function replaceExactly(source, pattern, expectedCount, replacement, label) {
  let count = 0;
  const updated = source.replace(pattern, (...match) => {
    count++;
    return replacement(...match);
  });
  if (count !== expectedCount)
    throw new Error(`Expected ${expectedCount} ${label}; found ${count}.`);
  return updated;
}

function projectReleaseInputs(source, version, release) {
  const targetCount = JSON.parse(source).nodeRuntime.targets.length;
  const selected = replaceExactly(
    source,
    /("nodeRuntime": \{\r?\n {4}"version": ")[^"]+(",\r?\n {4}"bundledNpmVersion": ")([^"]+)/gu,
    1,
    (_match, prefix, separator, npmVersion) =>
      `${prefix}${version}${separator}${release?.npmVersion ?? npmVersion}`,
    "Node runtime selection",
  );
  const archives = replaceExactly(
    selected,
    /("runtimeArchiveUrl": "https:\/\/nodejs\.org\/dist\/)v[^/"]+\/node-v[^-"]+-([^"]+)(",\r?\n\s+"runtimeArchiveSha256": ")([0-9a-f]{64})/gu,
    targetCount,
    (_match, prefix, platform, separator, digest) => {
      const archive = `node-v${version}-${platform}`;
      const sha256 = release ? release.archiveSha256[archive] : digest;
      if (!sha256) throw new Error(`Node.js ${version} has no ${archive}.`);
      return `${prefix}v${version}/${archive}${separator}${sha256}`;
    },
    "runtime archive selections",
  );
  const paths = replaceExactly(
    archives,
    /("upstreamRuntime(?:Executable|License)Path": ")node-v[^-"]+-/gu,
    targetCount * 2,
    (_match, prefix) => `${prefix}node-v${version}-`,
    "runtime archive paths",
  );
  return replaceExactly(
    paths,
    /("ociBaseImage": \{\r?\n {4}"reference": "node:)[^-"]+(-[^@"]+@sha256:)([0-9a-f]{64})(",\r?\n {4}"indexSha256": ")[0-9a-f]{64}/gu,
    1,
    (_match, prefix, variant, digest, separator) => {
      const sha256 = release?.imageDigest ?? digest;
      return `${prefix}${version}${variant}${sha256}${separator}${sha256}`;
    },
    "Node base image reference",
  );
}

function projectDockerfile(source, version, release) {
  return replaceExactly(
    source,
    /^(FROM node:)[^-\s]+(-[^@\s]+@sha256:)([0-9a-f]{64})/gmu,
    1,
    (_match, prefix, variant, digest) =>
      `${prefix}${version}${variant}${release?.imageDigest ?? digest}`,
    "Node base image",
  );
}

function projectInstallationGuide(source, version) {
  return replaceExactly(
    source,
    /(pinned Node\.js )\S+( runtime\.)/gu,
    1,
    (_match, prefix, suffix) => `${prefix}${version}${suffix}`,
    "installation runtime statement",
  );
}

const PROJECTIONS = [
  [
    "scripts/distribution/universalOntologyMcpReleaseInputs.json",
    projectReleaseInputs,
  ],
  [DOCKERFILE_PATH, projectDockerfile],
  ["docs/mcp/local-installation.md", projectInstallationGuide],
];

/** Check offline; given upstream release facts, write every projection together. */
export function syncNodeProjections({ root = repositoryRoot, release } = {}) {
  const version = nodeTarget(root);
  const changes = PROJECTIONS.flatMap(([path, project]) => {
    const file = join(root, path);
    const source = readFileSync(file, "utf8");
    const updated = project(source, version, release);
    return source === updated ? [] : [{ file, path, updated }];
  });
  if (!release && changes.length > 0)
    throw new Error(
      `Stale Node projection in ${changes.map(({ path }) => path).join(", ")}; run node scripts/repositoryNodeProjections.js --write.`,
    );
  for (const { file, updated } of changes) writeFileSync(file, updated);
}

/** Read what a version selection cannot derive; only --write uses the network. */
export async function fetchNodeRelease({
  root = repositoryRoot,
  fetchUrl = fetch,
} = {}) {
  const read = async (url, options) => {
    const response = await fetchUrl(url, options);
    if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
    return response;
  };
  const version = nodeTarget(root);
  const variant = /^FROM node:[^-\s]+-([^@\s]+)@/mu.exec(
    readFileSync(join(root, DOCKERFILE_PATH), "utf8"),
  )?.[1];
  if (!variant) throw new Error("The Dockerfile selects no Node base image.");

  // This records the npm inside Node's download, not the repository's selected npm.
  const index = await (
    await read(`${NODE_DISTRIBUTION_URL}/index.json`)
  ).json();
  const npmVersion = index.find(
    (entry) => entry.version === `v${version}`,
  )?.npm;
  if (!npmVersion) throw new Error(`Node.js ${version} is not published.`);

  const checksums = await (
    await read(`${NODE_DISTRIBUTION_URL}/v${version}/SHASUMS256.txt`)
  ).text();
  const archiveSha256 = Object.fromEntries(
    [...checksums.matchAll(/^([0-9a-f]{64}) {2}(\S+)$/gmu)].map(
      ([, digest, archive]) => [archive, digest],
    ),
  );

  const { token } = await (await read(IMAGE_TOKEN_URL)).json();
  const manifest = await read(`${IMAGE_MANIFEST_URL}/${version}-${variant}`, {
    method: "HEAD",
    headers: { Accept: IMAGE_INDEX_TYPES, Authorization: `Bearer ${token}` },
  });
  const imageDigest = /^sha256:([0-9a-f]{64})$/u.exec(
    manifest.headers.get("docker-content-digest") ?? "",
  )?.[1];
  if (!imageDigest)
    throw new Error("Docker Hub did not identify the Node base image.");

  return { npmVersion, archiveSha256, imageDigest };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (
    process.argv.slice(2).some((arg) => arg !== "--write" && arg !== "--check")
  )
    throw new Error("Use --check or --write.");
  syncNodeProjections({
    release: process.argv.includes("--write")
      ? await fetchNodeRelease()
      : undefined,
  });
}
