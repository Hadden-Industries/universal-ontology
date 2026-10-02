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

/** Bind observed installed bytes and Git state to retained candidate evidence; never assert registry acceptance. */
export async function collectQualificationIdentity({
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
    !/^[a-f0-9]{40}$/u.test(upstream.value.snapshot?.commit ?? "") ||
    !/^[a-f0-9]{40}$/u.test(upstream.value.snapshot?.tree ?? "")
  )
    throw new Error("Missing upstream source identity");
  // Pins come from the previously verified retained same-run candidate handoff.
  // The archive digest is an upstream artifact identity, not the tarball digest.
  if (
    tarballSha256 !==
      "59744b8d3a65ee8b6c0e41b963ada4132a128f083f7612442bd4abb46da96b7a" ||
    apiRegistry.sha256 !==
      "1807e113c5db152417e62a56ba7feb95f4bb7e8f2775fa37e76d100303f4bb41" ||
    upstream.value.snapshot.commit !==
      "53fccadca283c1184d3f9b0c090782b185b715a5" ||
    upstream.value.snapshot.tree !==
      "55111092290a538a3a9eee710a75ac45ffbab951" ||
    upstream.value.candidate?.id !== 11218050915 ||
    upstream.value.candidate?.digest !==
      "sha256:e0bc8d419182a5ec5a452c348b4b82c4cccf1c1671ed755a55a57e7298e04093"
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
      status: git("status", "--porcelain=v1").toString(),
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
