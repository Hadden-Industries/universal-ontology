// SPDX-License-Identifier: AGPL-3.0-only
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
const python = process.env.MARKDOWN_OBSERVER_PYTHON;
if (!python || !isAbsolute(python))
  throw new Error("Missing pinned observer Python");
const env = {};
for (const name of [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "RUNNER_TEMP",
  "MARKDOWN_CANDIDATE_REPOSITORY",
  "MARKDOWN_CANDIDATE_SHA",
  "MARKDOWN_TRUSTED_SHA",
  "GITHUB_REPOSITORY",
  "GITHUB_WORKFLOW_REF",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
  "GITHUB_JOB",
  "GITHUB_EVENT_NAME",
])
  if (process.env[name]) env[name] = process.env[name];
env.MARKDOWN_WINDOW_NODE = process.execPath;
const probes = spawnSync(
  python,
  [
    "-I",
    "-B",
    "-X",
    "utf8",
    fileURLToPath(
      new URL("observe-markdown-window.probes.py", import.meta.url),
    ),
  ],
  { env, stdio: "inherit", timeout: 30000, windowsHide: true },
);
if (probes.error || probes.signal || probes.status !== 0)
  throw new Error("Process observation probes failed");
const result = spawnSync(
  python,
  [
    "-I",
    "-B",
    "-X",
    "utf8",
    fileURLToPath(new URL("observe-markdown-window.py", import.meta.url)),
  ],
  {
    env,
    stdio: "inherit",
    timeout: 600000,
    windowsHide: true,
  },
);
if (result.error || result.signal || result.status === null)
  throw new Error("Observer completion was not proven");
process.exitCode = result.status;
