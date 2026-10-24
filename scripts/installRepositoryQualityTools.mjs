// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

// BEGIN GENERATED RESOURCE DEFAULTS
export const ACQUISITION_RESOURCE_DEFAULTS = Object.freeze({
  maxFiles: 50000,
  maxFileBytes: 33554432,
  maxTotalBytes: 268435456,
  maxLogicalDocuments: 100000,
  maxRecords: 100000,
  maxDiagnostics: 10000,
  maxPolicyBytes: 1048576,
  maxGitOutputBytes: 67108864,
  maxToolOutputBytes: 67108864,
  maxToolTimeMs: 120000,
  maxGitTimeMs: 120000,
  maxAcquisitionTimeMs: 1200000,
  maxCacheLookupTimeMs: 60000,
  maxCacheOutputBytes: 1048576,
  maxRequestIdCharacters: 1024,
  maxRequestBytes: 50331648,
  maxRequestPathCharacters: 32768,
});
// END GENERATED RESOURCE DEFAULTS

/** Only the explicitly scoped capacity environment contract is admitted. */
export function capacityLimitsEnvironment() {
  if (process.env.JSON_QUALITY_LIMITS !== undefined)
    throw new TypeError(
      "Use JSON_QUALITY_CAPACITY_LIMITS; JSON_QUALITY_LIMITS is not supported.",
    );
  return process.env.JSON_QUALITY_CAPACITY_LIMITS;
}

/** Native cleanup retry strategy is independently configurable, including zero retries. */
export function acquisitionCleanupOptions(
  overrides = JSON.parse(process.env.JSON_QUALITY_CLEANUP ?? "{}"),
) {
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides) ||
    Object.entries(overrides).some(
      ([name, value]) =>
        !["maxRetries", "retryDelay"].includes(name) ||
        !Number.isSafeInteger(value) ||
        value < 0,
    )
  )
    throw new TypeError("Invalid acquisition cleanup retry options.");
  return { maxRetries: 3, retryDelay: 100, ...overrides };
}

/** The cold bootstrap cannot import the not-yet-installed package/schema.
 * Its defaults are a checked projection; native validation matches the closed
 * positive-safe-integer resource object. Only capacity controls are accepted.
 */
export function acquisitionResourceLimits(
  overrides = JSON.parse(capacityLimitsEnvironment() ?? "{}"),
) {
  if (overrides === true) return { ...ACQUISITION_RESOURCE_DEFAULTS };
  if (overrides === false)
    return Object.fromEntries(
      Object.keys(ACQUISITION_RESOURCE_DEFAULTS).map((name) => [
        name,
        Infinity,
      ]),
    );
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides) ||
    Object.entries(overrides).some(
      ([name, value]) =>
        !Object.hasOwn(ACQUISITION_RESOURCE_DEFAULTS, name) ||
        !Number.isSafeInteger(value) ||
        value < 1,
    )
  )
    throw new TypeError("Invalid JSON resource-limit overrides.");
  return { ...ACQUISITION_RESOURCE_DEFAULTS, ...overrides };
}

/** Resolve native cache policy once for acquisition and payload checking. */
export function nativeQualityCachePath(toolingRoot, npmExecutable, overrides) {
  const capacityLimits = acquisitionResourceLimits(overrides);
  return execFileSync(
    process.execPath,
    [npmExecutable, "config", "get", "cache"],
    {
      cwd: toolingRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: Math.min(
        capacityLimits.maxCacheLookupTimeMs,
        ACQUISITION_RESOURCE_DEFAULTS.maxCacheLookupTimeMs,
      ),
      maxBuffer: Math.min(
        capacityLimits.maxCacheOutputBytes,
        ACQUISITION_RESOURCE_DEFAULTS.maxCacheOutputBytes,
      ),
    },
  ).trim();
}

async function acquire() {
  const kind = process.argv[2];
  if (!["markdown", "json"].includes(kind) || process.argv.length !== 3)
    throw new Error("Expected markdown or json tool project.");
  const npm = process.env.npm_execpath;
  if (!npm)
    throw new Error("Run npm run install:markdown or npm run install:json.");
  const overrides = JSON.parse(capacityLimitsEnvironment() ?? "{}");
  const capacityLimits = acquisitionResourceLimits(overrides);
  const cleanup = acquisitionCleanupOptions();
  const toolingRoot = fileURLToPath(
    new URL(`../tooling/${kind}/`, import.meta.url),
  );
  const jsonCache =
    kind === "json"
      ? nativeQualityCachePath(toolingRoot, npm, overrides)
      : null;
  const scratch = mkdtempSync(join(tmpdir(), "repository-quality-install-"));
  const cachePath = jsonCache ?? join(scratch, "cache");
  /** Remove only the task-owned real temporary acquisition workspace. */
  function removeAcquisitionWorkspace(path) {
    const target = realpathSync(path);
    const contained = relative(realpathSync(tmpdir()), target);
    if (
      isAbsolute(contained) ||
      contained === ".." ||
      contained.startsWith(`..${sep}`) ||
      !contained.startsWith("repository-quality-install-")
    )
      throw new Error(
        "Refusing cleanup outside the temporary acquisition workspace.",
      );
    rmSync(target, {
      recursive: true,
      force: true,
      ...cleanup,
    });
  }
  try {
    const user = join(scratch, "user.npmrc"),
      global = join(scratch, "global.npmrc");
    writeFileSync(user, "");
    writeFileSync(global, "");
    const env = {};
    for (const name of [
      "PATH",
      "Path",
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "TEMP",
      "TMP",
      "HOME",
      "USERPROFILE",
      "LOCALAPPDATA",
    ])
      if (process.env[name]) env[name] = process.env[name];
    const result = spawnSync(
      process.execPath,
      [
        npm,
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org/",
        `--userconfig=${user}`,
        `--globalconfig=${global}`,
        ...(kind === "json" ? ["--allow-git=none"] : []),
        `--cache=${cachePath}`,
      ],
      {
        cwd: toolingRoot,
        env,
        stdio: "inherit",
        windowsHide: true,
        timeout: Math.min(
          capacityLimits.maxAcquisitionTimeMs,
          ACQUISITION_RESOURCE_DEFAULTS.maxAcquisitionTimeMs,
        ),
      },
    );
    if (result.error || result.signal || result.status === null)
      throw new Error("Isolated quality-tool acquisition did not complete.");
    process.exitCode = result.status;
    if (kind === "json" && result.status === 0) {
      const { verifyJsonQualityInstallation } = await import(
        new URL("../tooling/json/public-api.mjs", import.meta.url)
      );
      await verifyJsonQualityInstallation({
        toolingRoot: fileURLToPath(
          new URL("../tooling/json/", import.meta.url),
        ),
        cachePath,
        bootstrapPath: fileURLToPath(import.meta.url),
        capacityLimits: overrides,
      });
    }
  } finally {
    removeAcquisitionWorkspace(scratch);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await acquire();
