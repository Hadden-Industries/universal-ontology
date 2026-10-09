import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function json(path) {
  const bytes = await readFile(path);
  return { path, sha256: sha256(bytes), value: JSON.parse(bytes) };
}
async function files(root, prefix = "") {
  const result = [];
  for (const entry of await readdir(join(root, prefix), {
    withFileTypes: true,
  })) {
    const path = join(prefix, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Qualification package cannot contain symlinks");
    if (entry.isDirectory()) result.push(...(await files(root, path)));
    else if (entry.isFile())
      result.push({ path, sha256: sha256(await readFile(join(root, path))) });
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

/** Locate package metadata without assuming the exported entry point's directory layout. */
export async function findOwlapiPackageRoot() {
  let directory = dirname(fileURLToPath(import.meta.resolve("owlapi/model")));
  for (;;) {
    try {
      const metadata = await json(join(directory, "package.json"));
      if (metadata.value.name !== "@hadden-industries/owlapi")
        throw new Error("Unexpected owlapi package identity");
      return directory;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error("Cannot locate owlapi package metadata");
    directory = parent;
  }
}

/** Bind only the historical 2 October rc.1 prepublication snapshot, never the maintained Git dependency. */
export async function collectHistoricalRcQualificationIdentity({
  sourceRoot,
  candidateDirectory,
  upstreamEvidencePath,
  consumerRoot,
  packageRoot,
}) {
  const manifest = await json(
    join(candidateDirectory, "candidate-manifest.json"),
  );
  const { fileName, sha256: expectedHash } = manifest.value.tarball;
  if (basename(fileName) !== fileName)
    throw new Error("Candidate tarball must be a basename");
  const tarball = await readFile(join(candidateDirectory, fileName));
  const tarballSha256 = sha256(tarball);
  if (tarballSha256 !== expectedHash)
    throw new Error("Candidate tarball digest mismatch");
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  const installed = await json(join(packageRoot, "package.json"));
  const lockfile = await json(join(consumerRoot, "package-lock.json"));
  const locked = lockfile.value.packages["node_modules/owlapi"];
  if (
    installed.value.name !== "@hadden-industries/owlapi" ||
    installed.value.version !== "0.1.0-rc.1" ||
    manifest.value.package.name !== installed.value.name ||
    manifest.value.package.version !== installed.value.version ||
    locked?.integrity !== integrity ||
    locked?.version !== installed.value.version
  )
    throw new Error("Installed/locked candidate identity mismatch");
  const apiRegistry = await json(
    join(packageRoot, "docs/compatibility/java-api-surface.json"),
  );
  const upstream = await json(upstreamEvidencePath);
  if (
    !/^[a-f0-9]{40}$/u.test(upstream.value.snapshot?.baseCommit ?? "") ||
    !/^[a-f0-9]{40}$/u.test(upstream.value.snapshot?.tree ?? "")
  )
    throw new Error("Missing upstream source identity");
  // This handoff is a local qualification snapshot, not the earlier CI artifact.
  // Bind its base commit and exact tree without inventing a snapshot commit/tag.
  // Pin the independently checked acquisition record too: contradictory signature
  // or per-file observations must not be embedded as accepted upstream evidence.
  if (
    upstream.sha256 !==
      "d234d64536fd4f4b8e54f335b935a7e5044c87ddf25b63759f1f1a5b2ee775cb" ||
    tarballSha256 !==
      "4e18d8a1d2f41af0f31f0426a24d57ddfa25316fba6be550adf2edd6202cabf8" ||
    tarball.length !== 262167 ||
    manifest.value.sourceState !== "UNCOMMITTED_QUALIFICATION_SNAPSHOT" ||
    apiRegistry.sha256 !==
      "cf367d97cea09eb9fe99b6f0e68f8ddb8ded8555259a4cc956b16bb19218ba6a" ||
    upstream.value.kind !== "LOCAL_PREPUBLICATION_HANDOFF" ||
    upstream.value.snapshot.kind !== "UNCOMMITTED_QUALIFICATION_SNAPSHOT" ||
    upstream.value.snapshot.baseCommit !==
      "c45f07719e0d846be354c818d281a38281913c38" ||
    upstream.value.snapshot.tree !==
      "dc0f1784407f5f89df0aedd1adf68c9d32127a5b" ||
    upstream.value.candidate?.sha256 !== tarballSha256 ||
    upstream.value.apiRegistrySha256 !== apiRegistry.sha256 ||
    upstream.value.snapshot.commit !== undefined ||
    upstream.value.candidate?.id !== undefined ||
    upstream.value.actionsArtifactEvidence !== null ||
    upstream.value.registryEvidence !== null ||
    upstream.value.releaseTag !== null
  )
    throw new Error(
      "Retained candidate/source/API evidence differs from the accepted handoff",
    );
  const tarballPath = join(candidateDirectory, fileName);
  const archiveFiles = execFileSync("tar", ["-tf", tarballPath], {
    maxBuffer: 8 * 1024 * 1024,
  })
    .toString()
    .split(/\r?\n/u)
    .filter((path) => path && !path.endsWith("/"));
  const installedFiles = await files(packageRoot);
  if (
    new Set(archiveFiles).size !== archiveFiles.length ||
    archiveFiles.length !== installedFiles.length
  )
    throw new Error("Installed candidate inventory differs from tarball");
  for (const path of archiveFiles) {
    if (!path.startsWith("package/") || path.split("/").includes(".."))
      throw new Error("Invalid candidate archive path");
    const installedFile = installedFiles.find(
      (file) => file.path.replaceAll("\\", "/") === path.slice(8),
    );
    if (
      !installedFile ||
      installedFile.sha256 !==
        sha256(
          execFileSync("tar", ["-xOf", tarballPath, path], {
            maxBuffer: 16 * 1024 * 1024,
          }),
        )
    )
      throw new Error(`Installed candidate file differs: ${path}`);
  }
  const executedScripts = await files(join(consumerRoot, "scripts"));
  for (const file of executedScripts) {
    if (
      sha256(await readFile(join(sourceRoot, "scripts", file.path))) !==
      file.sha256
    )
      throw new Error(
        `Executed consumer script differs from authored source: ${file.path}`,
      );
  }
  const git = (...args) => execFileSync("git", ["-C", sourceRoot, ...args]);
  const paths = git(
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const workingFiles = [];
  for (const path of paths) {
    try {
      workingFiles.push({
        path,
        sha256: sha256(await readFile(join(sourceRoot, path))),
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      workingFiles.push({ path, deleted: true });
    }
  }
  return {
    capturedAt: new Date().toISOString(),
    command: [process.execPath, ...process.argv.slice(1)],
    node: process.version,
    executed: {
      consumerRoot,
      scripts: executedScripts,
      entryPoint: process.argv[1]
        ? {
            path: resolve(process.argv[1]),
            sha256: sha256(await readFile(resolve(process.argv[1]))),
          }
        : undefined,
    },
    uo: {
      root: sourceRoot,
      head: git("rev-parse", "HEAD").toString().trim(),
      headTree: git("rev-parse", "HEAD^{tree}").toString().trim(),
      status: git("status", "--porcelain=v1").toString(),
      workingFilesSha256: sha256(JSON.stringify(workingFiles)),
      workingFiles,
    },
    candidate: { manifest, tarballSha256, integrity, bytes: tarball.length },
    installed: {
      metadata: installed,
      lockfileSha256: lockfile.sha256,
      files: installedFiles,
      tarballFilesVerified: archiveFiles.length,
      apiRegistrySha256: apiRegistry.sha256,
    },
    upstreamEvidence: upstream,
    limitation:
      "Local artifact observation and retained upstream evidence; not registry or provenance acceptance",
  };
}
