/** Cold CI bootstrap: install and verify the root manifest's exact npm selection. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { repositoryNpmTarget } from "./repositoryNpmTarget.js";

export function installRepositoryNpm({
  root = fileURLToPath(new URL("../", import.meta.url)),
  platform = process.platform,
  run = spawnSync,
} = {}) {
  const version = repositoryNpmTarget(root);
  const executable = platform === "win32" ? "npm.cmd" : "npm";
  // The selector is validated before Windows invokes its native command shim.
  const options = { cwd: root, windowsHide: true, shell: platform === "win32" };
  const check = (result) => {
    if (result.error) throw result.error;
    if (result.status !== 0 || result.signal)
      throw new Error(
        `npm bootstrap failed (status=${result.status}, signal=${result.signal}).`,
      );
    return result;
  };
  check(
    run(
      executable,
      ["install", "--global", "--no-audit", "--no-fund", `npm@${version}`],
      { ...options, stdio: "inherit" },
    ),
  );
  const observed = check(
    run(executable, ["--version"], { ...options, encoding: "utf8" }),
  );
  if (observed.stdout.trim() !== version)
    throw new Error(
      `Selected npm differs from package.json.packageManager: expected ${version}.`,
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    installRepositoryNpm();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
