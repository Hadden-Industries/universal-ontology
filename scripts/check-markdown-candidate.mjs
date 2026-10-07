// SPDX-License-Identifier: AGPL-3.0-only
// Adapted from OwlAPI; see tooling/markdown/NOTICE.md for source and rights.
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  lstatSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  realpathSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { resolve, relative, isAbsolute, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const execute = promisify(execFile);
const reserved = ".markdown-quality-trusted-inputs";
const excludedDirectoryNames = new Set([
  ".git",
  "node_modules",
  ".venv",
  ".development-tools",
  ".release",
]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inside = (root, path) => {
  const rel = relative(root, path);
  return (
    rel === "" ||
    (!isAbsolute(rel) &&
      rel !== ".." &&
      !rel.startsWith("..\\") &&
      !rel.startsWith("../"))
  );
};
/** Bind every staged path and byte without buffering the candidate corpus. */
export function dataDigest(root) {
  const digest = createHash("sha256");
  const chunk = Buffer.alloc(65536);
  let entries = 0;
  let bytes = 0;
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      if (++entries > 110000) throw new Error("Staged entry bound");
      const path = join(directory, name);
      const stat = lstatSync(path);
      const relativePath = relative(root, path).split("\\").join("/");
      if (stat.isSymbolicLink()) throw new Error("Linked staged data");
      if (stat.isDirectory()) {
        digest.update(JSON.stringify(["directory", relativePath]) + "\n");
        visit(path);
      } else if (stat.isFile()) {
        bytes += stat.size;
        if (bytes > 137363456) throw new Error("Staged byte bound");
        digest.update(JSON.stringify(["file", relativePath, stat.size]) + "\n");
        const file = openSync(path, "r");
        let observed = 0;
        try {
          let size;
          while ((size = readSync(file, chunk, 0, chunk.length, null)) > 0) {
            observed += size;
            if (observed > stat.size) throw new Error("Staged file grew");
            digest.update(chunk.subarray(0, size));
          }
        } finally {
          closeSync(file);
        }
        if (observed !== stat.size) throw new Error("Staged file shrank");
      } else throw new Error("Nonregular staged data");
    }
  }
  visit(root);
  return digest.digest("hex");
}
function regular(root, input, optional = false) {
  const path = resolve(root, input);
  if (!inside(root, path))
    throw new Error("Policy path outside trusted input root");
  if (optional && !existsSync(path)) return null;
  let current = root;
  for (const part of relative(root, path).split(/[\\/]/u).filter(Boolean)) {
    current = join(current, part);
    if (
      lstatSync(current).isSymbolicLink() ||
      !inside(root, realpathSync(current))
    )
      throw new Error("Linked policy input");
  }
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.size > 262144)
    throw new Error("Unbounded or nonregular policy input");
  return readFileSync(path);
}
/** Derive bounded candidate data with trusted policy/ignores at their original paths. */
export function stageCandidate({ sourceRoot, trustedRoot, outputRoot }) {
  sourceRoot = realpathSync(sourceRoot);
  trustedRoot = realpathSync(trustedRoot);
  outputRoot = resolve(outputRoot);
  if (inside(sourceRoot, trustedRoot) || inside(trustedRoot, sourceRoot))
    throw new Error("Trusted and candidate roots must be separate");
  if (
    inside(sourceRoot, outputRoot) ||
    inside(trustedRoot, outputRoot) ||
    existsSync(outputRoot)
  )
    throw new Error("Output must be a fresh separate directory");
  if (existsSync(resolve(sourceRoot, reserved)))
    throw new Error("Reserved trusted policy path exists in candidate");
  const policyBytes = regular(trustedRoot, ".markdown-quality.json");
  const policy = JSON.parse(policyBytes.toString("utf8"));
  const ignoreNames = policy.ignoreFiles ?? [".gitignore", ".prettierignore"];
  if (
    !Array.isArray(ignoreNames) ||
    ignoreNames.length > 10 ||
    new Set(ignoreNames).size !== ignoreNames.length ||
    ignoreNames.some(
      (name) =>
        typeof name !== "string" || name.length === 0 || name.length > 512,
    )
  )
    throw new Error("Invalid trusted ignore inputs");
  const ignores = ignoreNames.map((name) => ({
    name,
    bytes: regular(trustedRoot, name, true) ?? Buffer.alloc(0),
  }));
  let entries = 0,
    bytes = 0;
  mkdirSync(outputRoot);
  function copy(directory, target) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++entries > 100000) throw new Error("Candidate entry bound");
      // Git/dependency state is runner-owned execution metadata, never authored input.
      if (excludedDirectoryNames.has(entry.name)) continue;
      const source = resolve(directory, entry.name);
      const destination = resolve(target, entry.name);
      if (!inside(sourceRoot, source) || !inside(outputRoot, destination))
        throw new Error("Candidate path escape");
      const stat = lstatSync(source);
      if (stat.isSymbolicLink())
        throw new Error("Linked candidate data is unsupported");
      if (stat.isDirectory()) {
        mkdirSync(destination);
        copy(source, destination);
      } else if (stat.isFile()) {
        bytes += stat.size;
        if (bytes > 134217728) throw new Error("Candidate data byte bound");
        copyFileSync(source, destination);
      } else
        throw new Error("Candidate member is not a regular file or directory");
    }
  }
  copy(sourceRoot, outputRoot);
  const policyRoot = resolve(outputRoot, reserved);
  mkdirSync(policyRoot);
  // Preserve each trusted ignore file's original directory: Prettier resolves its patterns there.
  const effective = { ...policy, ignoreFiles: ignoreNames };
  for (const input of ignores) {
    const destination = resolve(outputRoot, input.name);
    if (!inside(outputRoot, destination))
      throw new Error("Trusted ignore overlay escapes data root");
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, input.bytes);
  }
  const derived = Buffer.from(JSON.stringify(effective) + "\n");
  writeFileSync(resolve(policyRoot, "policy.json"), derived, { flag: "wx" });
  return {
    entries,
    dataBytes: bytes,
    stagedDataSha256: dataDigest(outputRoot),
    originalPolicySha256: hash(policyBytes),
    derivedPolicySha256: hash(derived),
    ignoreInputs: ignores.map((input) => ({
      path: input.name,
      sha256: hash(input.bytes),
    })),
    configPath: `${reserved}/policy.json`,
  };
}
/** Invoke the installed canonical full check without inherited credentials or configuration. */
export async function checkCandidate({ outputRoot, cli, staging }) {
  if (dataDigest(outputRoot) !== staging.stagedDataSha256)
    throw new Error("Staged inputs changed before the full check");
  cli = realpathSync(cli);
  if (inside(realpathSync(outputRoot), cli))
    throw new Error("Checker must be outside candidate data");
  const packageRoot = dirname(dirname(cli));
  const metadata = JSON.parse(
    readFileSync(resolve(packageRoot, "package.json"), "utf8"),
  );
  if (
    metadata.name !== "@hadden-industries/markdown-quality" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(metadata.version)
  )
    throw new Error("Unexpected capability identity");
  const require = createRequire(cli);
  const Ajv = require("ajv");
  const validateResult = new Ajv({ allErrors: true, strict: true }).compile(
    JSON.parse(
      readFileSync(resolve(packageRoot, "schemas/result.schema.json"), "utf8"),
    ),
  );
  const env = {};
  // npm, GitHub, OIDC, package configuration and Node injection variables are not inherited.
  for (const name of ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"])
    if (process.env[name]) env[name] = process.env[name];
  const args = [
    resolve(cli),
    "check",
    "--root",
    resolve(outputRoot),
    "--config",
    staging.configPath,
    "--json",
  ];
  let result,
    exitCode = 0;
  try {
    result = await execute(process.execPath, args, {
      cwd: dirname(resolve(cli)),
      env,
      timeout: 300000,
      maxBuffer: 8000000,
      windowsHide: true,
    });
  } catch (error) {
    if (![1, 2].includes(error.code) || typeof error.stdout !== "string")
      throw error;
    exitCode = error.code;
    result = { stdout: error.stdout, stderr: error.stderr };
  }
  const report = JSON.parse(result.stdout);
  if (
    !validateResult(report) ||
    report.exitCode !== exitCode ||
    report.package.name !== metadata.name ||
    report.package.version !== metadata.version ||
    report.operation !== "check" ||
    report.selection.mode !== "full" ||
    report.written.length !== 0
  )
    throw new Error("Invalid or inconsistent canonical checker result");
  if (report.configDigest !== staging.derivedPolicySha256)
    throw new Error("Checker used an unexpected policy");
  if (dataDigest(outputRoot) !== staging.stagedDataSha256)
    throw new Error("Full check changed staged inputs");
  return {
    exitCode,
    report,
    suppliedEnvironmentNames: Object.keys(env).sort(),
    trustedExecutableSha256: hash(readFileSync(cli)),
    trustedPackage: { name: metadata.name, version: metadata.version },
  };
}

export function metadataGit(executable, sourceRoot, trustedRoot) {
  if (!executable || !isAbsolute(executable))
    throw new Error("Missing bound native host Git");
  const bound = realpathSync(executable);
  if (
    !lstatSync(bound).isFile() ||
    inside(sourceRoot, bound) ||
    inside(trustedRoot, bound)
  )
    throw new Error(
      "Metadata Git must be outside candidate and trusted source",
    );
  return bound;
}
function revision(root, git) {
  // rev-parse reads checkout identity; it runs no candidate program or hook.
  return execFileSync(git, ["-C", root, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  }).trim();
}

async function main() {
  const trustedRoot = fileURLToPath(new URL("../", import.meta.url));
  const sourceRoot = resolve(trustedRoot, "../candidate");
  const git = metadataGit(
    process.env.MARKDOWN_WINDOW_GIT,
    sourceRoot,
    trustedRoot,
  );
  const scratch = process.env.RUNNER_TEMP;
  const expectedHead = process.env.MARKDOWN_CANDIDATE_SHA;
  const expectedTrusted = process.env.MARKDOWN_TRUSTED_SHA;
  const candidateRepository = process.env.MARKDOWN_CANDIDATE_REPOSITORY;
  if (
    !scratch ||
    !/^[a-f0-9]{40}$/u.test(expectedHead ?? "") ||
    !/^[a-f0-9]{40}$/u.test(expectedTrusted ?? "") ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(candidateRepository ?? "")
  )
    throw new Error("Missing bounded candidate/trusted identity");
  if (
    revision(sourceRoot, git) !== expectedHead ||
    revision(trustedRoot, git) !== expectedTrusted
  )
    throw new Error(
      "Checkout identities do not match the requested exact revisions",
    );
  const reportDirectory = resolve(scratch, "markdown-evidence");
  if (existsSync(reportDirectory))
    throw new Error("Evidence destination must be fresh");
  mkdirSync(reportDirectory);
  const outputRoot = resolve(scratch, "markdown-candidate-data");
  const toolingRoot = resolve(trustedRoot, "tooling/markdown");
  const manifest = JSON.parse(
    readFileSync(join(toolingRoot, "package.json"), "utf8"),
  );
  const lockBytes = readFileSync(join(toolingRoot, "package-lock.json"));
  const lock = JSON.parse(lockBytes.toString("utf8"));
  const expectedVersion =
    manifest.devDependencies?.["@hadden-industries/markdown-quality"];
  if (
    lock.packages?.[""]?.devDependencies?.[
      "@hadden-industries/markdown-quality"
    ] !== expectedVersion
  )
    throw new Error("Trusted manifest and lock disagree");
  const staging = stageCandidate({ sourceRoot, trustedRoot, outputRoot });
  const cli = join(
    toolingRoot,
    "node_modules/@hadden-industries/markdown-quality/src/cli.js",
  );
  const started = performance.now();
  const result = await checkCandidate({ outputRoot, cli, staging });
  if (result.trustedPackage.version !== expectedVersion)
    throw new Error("Installed capability differs from the exact trusted pin");
  const nativeManifest = JSON.parse(
    readFileSync(
      join(dirname(dirname(cli)), "assets/tool-manifest.json"),
      "utf8",
    ),
  );
  const native =
    nativeManifest.platforms[`${process.platform}-${process.arch}`];
  if (!native) throw new Error("Unsupported qualified platform");
  const nativePackagePath = createRequire(cli).resolve(
    native.package + "/package.json",
  );
  const observedNativeSha256 = hash(
    readFileSync(join(dirname(nativePackagePath), native.executable)),
  );
  if (observedNativeSha256 !== native.sha256)
    throw new Error(
      "Native executable identity disagrees with the trusted manifest",
    );
  const nativePackage = lock.packages[`node_modules/${native.package}`];
  const corePackage =
    lock.packages["node_modules/@hadden-industries/markdown-quality"];
  if (
    nativePackage?.version !== expectedVersion ||
    corePackage?.version !== expectedVersion ||
    !nativePackage.integrity ||
    !corePackage.integrity
  )
    throw new Error("Locked tuple evidence is incomplete");
  const receipt = {
    schemaVersion: 1,
    candidate: {
      repository: candidateRepository,
      head: expectedHead,
      tree: execFileSync(git, ["-C", sourceRoot, "rev-parse", "HEAD^{tree}"], {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      }).trim(),
    },
    trusted: {
      source: expectedTrusted,
      metadataGitSha256: hash(readFileSync(git)),
      lockSha256: hash(lockBytes),
      executableSha256: result.trustedExecutableSha256,
      core: { version: corePackage.version, integrity: corePackage.integrity },
      native: {
        package: native.package,
        version: nativePackage.version,
        integrity: nativePackage.integrity,
        executableSha256: observedNativeSha256,
      },
    },
    staging,
    suppliedEnvironmentNames: result.suppliedEnvironmentNames,
    host: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
    },
    workflow: {
      repository: process.env.GITHUB_REPOSITORY,
      ref: process.env.GITHUB_WORKFLOW_REF,
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
      job: process.env.GITHUB_JOB,
      event: process.env.GITHUB_EVENT_NAME,
    },
    checkerElapsedMs: Math.round(performance.now() - started),
    result: result.report,
    acceptance:
      "Owner must join actual provider job/check IDs and required statuses to these exact inputs; this receipt alone is not merge approval.",
  };
  writeFileSync(
    join(reportDirectory, "trusted-markdown-run.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  process.stdout.write(
    `Canonical full check: exit ${result.exitCode}; ${result.report.selection.files.length} documents; evidence retained.\n`,
  );
  process.exitCode = result.exitCode;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch(() => {
    process.stderr.write(
      "Trusted candidate check failed; no acceptance recorded.\n",
    );
    process.exitCode = 2;
  });
}
