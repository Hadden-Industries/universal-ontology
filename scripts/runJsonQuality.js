/** One policy-derived entry point for native JSON checks and safe formatting. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as prettier from "prettier";
import { inspectJsonInventory } from "./checkJsonInventory.js";
import { checkJsonPresentation } from "./jsonQuality.js";

async function lint({ root, policy, linter }) {
  const results = await linter.lintFiles(
    policy.files.map((file) => join(root, file.path)),
  );
  const formatter = await linter.loadFormatter("stylish");
  process.stdout.write(formatter.format(results));
  if (results.some((result) => result.errorCount || result.warningCount))
    throw new Error("JSON lint failed; no JSON fixes are permitted.");
  process.stdout.write(
    `JSON lint: ${results.length} files; zero errors or warnings.\n`,
  );
}

async function presentation(
  { root, policy, formatOptions },
  producersOnly = false,
) {
  const selected = policy.files.filter(
    (file) => !producersOnly || !file.allowFormatWrites,
  );
  const failures = [];
  for (const file of selected)
    if (
      !(await checkJsonPresentation(
        readFileSync(join(root, file.path)),
        file.formatContract,
        formatOptions,
      ))
    )
      failures.push(file.path);
  if (failures.length)
    throw new Error(
      `JSON formatting differs from its declared contract:\n${failures.join("\n")}`,
    );
  process.stdout.write(
    `JSON presentation: ${selected.length} files checked read-only against native/producer contracts.\n`,
  );
}

/** Native Prettier owns debug checking and writing; its temporary ignore selection
 * is derived from the same policy as the exact argument list, never maintained.
 */
async function format(context) {
  const { root, policy } = context;
  const writable = policy.files.filter((file) => file.allowFormatWrites);
  // Native ignore patterns are relative to the ignore file's directory.
  const ignorePath = join(root, `.json-quality-write-${randomUUID()}.ignore`);
  let created = false;
  try {
    writeFileSync(
      ignorePath,
      `**/*.json\n${writable.map((file) => `!/${file.path}`).join("\n")}\n`,
      { flag: "wx" },
    );
    created = true;
    for (const file of policy.files) {
      const info = await prettier.getFileInfo(join(root, file.path), {
        ignorePath,
      });
      if (info.ignored === file.allowFormatWrites)
        throw new Error(
          `Native JSON write selection differs from policy: ${file.path}`,
        );
    }
    const executable = fileURLToPath(
      import.meta.resolve("prettier/bin/prettier.cjs"),
    );
    for (const mode of ["--debug-check", "--write"])
      execFileSync(
        process.execPath,
        [
          executable,
          mode,
          "--ignore-path",
          ignorePath,
          "--",
          ...writable.map((file) => file.path),
        ],
        { cwd: root, stdio: "inherit", windowsHide: true },
      );
  } finally {
    if (created) unlinkSync(ignorePath);
  }
}

export async function runJsonQuality(operation, options) {
  if (
    ![
      "inventory",
      "lint",
      "check-format",
      "check",
      "format",
      "producers",
    ].includes(operation)
  )
    throw new Error(
      "Expected inventory, lint, check-format, check, format or producers.",
    );
  const context = await inspectJsonInventory(options);
  const { tracked, linted, formatted, preserved } = context.counts;
  process.stdout.write(
    `JSON inventory: ${tracked} classified; ${linted} linted; ${formatted} writable; ${preserved} protected.\n`,
  );
  if (["lint", "check", "format"].includes(operation)) await lint(context);
  if (["check-format", "check", "producers", "format"].includes(operation))
    await presentation(
      context,
      operation === "producers" || operation === "format",
    );
  if (operation === "format") {
    await format(context);
    // Reconcile after writes as well: the final check covers every classified file.
    const after = await inspectJsonInventory(options);
    await lint(after);
    await presentation(after);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length !== 3)
      throw new Error("Expected one JSON quality operation.");
    await runJsonQuality(process.argv[2]);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
