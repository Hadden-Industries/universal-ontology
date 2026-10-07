// SPDX-License-Identifier: AGPL-3.0-only
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run npm run install:markdown.");
const scratch = mkdtempSync(join(tmpdir(), "uo-markdown-install-"));
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
      cwd: fileURLToPath(new URL("../tooling/markdown/", import.meta.url)),
      env,
      stdio: "inherit",
      windowsHide: true,
      timeout: 300000,
    },
  );
  if (result.error || result.signal || result.status === null)
    throw new Error("Isolated Markdown acquisition did not complete.");
  process.exitCode = result.status;
} finally {
  rmSync(scratch, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
