// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

/** Resolve native cache policy once for acquisition and payload checking. */
export function nativeQualityCachePath(toolingRoot, npmExecutable) {
  return execFileSync(
    process.execPath,
    [npmExecutable, "config", "get", "cache"],
    {
      cwd: toolingRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 16384,
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
  const toolingRoot = fileURLToPath(
    new URL(`../tooling/${kind}/`, import.meta.url),
  );
  const jsonCache =
    kind === "json" ? nativeQualityCachePath(toolingRoot, npm) : null;
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
      maxRetries: 3,
      retryDelay: 100,
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
        ...(kind === "json" ? ["--allow-git=root"] : []),
        `--cache=${cachePath}`,
      ],
      {
        cwd: toolingRoot,
        env,
        stdio: "inherit",
        windowsHide: true,
        timeout: 300000,
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
      });
    }
  } finally {
    removeAcquisitionWorkspace(scratch);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await acquire();
