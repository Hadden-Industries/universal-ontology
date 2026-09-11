import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function runRepositoryPython(
  args,
  { root = repositoryRoot, platform = process.platform } = {},
) {
  const executable = join(
    root,
    ".venv",
    ...(platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]),
  );
  if (!existsSync(executable)) {
    throw new Error(
      "Repository .venv is missing; run npm run setup:development.",
    );
  }
  if (!args.length) {
    throw new Error("Provide a repository Python script or module arguments.");
  }
  const result = spawnSync(executable, ["-B", "-X", "utf8", ...args], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.signal)
    throw new Error(`Python was terminated by ${result.signal}.`);
  return result.status ?? 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    process.exitCode = runRepositoryPython(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
