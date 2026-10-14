// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const kind = process.argv[2];
if (!["markdown", "json"].includes(kind) || process.argv.length !== 3)
  throw new Error("Expected markdown or json tool project.");
const npm = process.env.npm_execpath;
if (!npm)
  throw new Error("Run npm run install:markdown or npm run install:json.");
const scratch = mkdtempSync(join(tmpdir(), "uo-quality-install-"));
/** Remove only the task-owned real temporary acquisition workspace. */
function removeAcquisitionWorkspace(path) {
  const target = realpathSync(path);
  const contained = relative(realpathSync(tmpdir()), target);
  if (
    isAbsolute(contained) ||
    contained === ".." ||
    contained.startsWith(`..${sep}`) ||
    !contained.startsWith("uo-quality-install-")
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
      `--cache=${join(scratch, "cache")}`,
    ],
    {
      cwd: fileURLToPath(new URL(`../tooling/${kind}/`, import.meta.url)),
      env,
      stdio: "inherit",
      windowsHide: true,
      timeout: 300000,
    },
  );
  if (result.error || result.signal || result.status === null)
    throw new Error("Isolated quality-tool acquisition did not complete.");
  process.exitCode = result.status;
} finally {
  removeAcquisitionWorkspace(scratch);
}
