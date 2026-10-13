/** One policy-derived entry point for native JSON checks and safe formatting. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as prettier from "prettier";
import { inspectJsonInventory } from "./checkJsonInventory.js";
import {
  checkJsonPresentation,
  decodeJsonBytes,
  normalizeJsonSource,
  STRICT_JSON_GLOBS,
} from "./jsonQuality.js";

async function lint({ root, files, linter }, replacements = new Map()) {
  const results = [];
  if (replacements.size) {
    // Prospective source bytes must pass the whole gate before the first write.
    for (const { path } of files)
      results.push(
        ...(await linter.lintText(
          replacements.get(path) ??
            decodeJsonBytes(readFileSync(join(root, path))),
          { filePath: join(root, path) },
        )),
      );
  } else
    results.push(
      ...(await linter.lintFiles(files.map((file) => join(root, file.path)))),
    );
  const formatter = await linter.loadFormatter("stylish");
  process.stdout.write(formatter.format(results));
  if (results.some((result) => result.errorCount || result.warningCount))
    throw new Error("JSON lint failed; no JSON fixes are permitted.");
  process.stdout.write(
    `JSON lint: ${results.length} files; zero errors or warnings.\n`,
  );
}

/** Explicit authored-source repair. Producers use the same pure planner at their
 * input boundary and retain their own semantic/digest/graph validation.
 */
async function normalize(context, sourcePaths) {
  if (!Array.isArray(sourcePaths) || !sourcePaths.length)
    throw new Error(
      "NFC normalization requires explicit repository-relative source paths.",
    );
  if (new Set(sourcePaths).size !== sourcePaths.length)
    throw new Error("Duplicate NFC source path.");
  const selected = sourcePaths.map((path) => {
    const file = context.files.find((candidate) => candidate.path === path);
    if (!file?.allowFormatWrites || file.normalization !== "NFC")
      throw new Error(
        `Protected or undiscovered JSON source: ${path}; fix its owning source or producer.`,
      );
    return file;
  });
  const before = new Map();
  const replacements = new Map();
  for (const file of selected) {
    const { path } = file;
    const bytes = readFileSync(join(context.root, path));
    decodeJsonBytes(bytes);
    before.set(path, bytes);
    try {
      replacements.set(
        path,
        await normalizeJsonSource(bytes.toString("utf8"), file),
      );
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error });
    }
  }
  await lint(context, replacements);
  await presentation(context, true);
  const fresh = await inspectJsonInventory({ root: context.root });
  if (JSON.stringify(fresh.policy) !== JSON.stringify(context.policy))
    throw new Error(
      "JSON policy changed during NFC preflight; no source writes permitted.",
    );
  for (const { path } of selected) {
    const file = fresh.files.find((candidate) => candidate.path === path);
    if (
      !file?.allowFormatWrites ||
      file.normalization !== "NFC" ||
      !readFileSync(join(context.root, path)).equals(before.get(path))
    )
      throw new Error(`JSON source changed during NFC preflight: ${path}`);
  }
  let changed = 0;
  for (const [path, text] of replacements) {
    if (!readFileSync(join(context.root, path)).equals(before.get(path)))
      throw new Error(
        `JSON source changed before NFC write: ${path}; inspect any completed writes.`,
      );
    if (!Buffer.from(text).equals(before.get(path))) {
      writeFileSync(join(context.root, path), text);
      changed++;
    }
  }
  await lint(await inspectJsonInventory({ root: context.root }));
  process.stdout.write(
    `JSON NFC source normalization: ${selected.length} selected; ${changed} changed.\n`,
  );
}

async function presentation(
  { root, files, formatOptions },
  producersOnly = false,
) {
  const selected = files.filter(
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
  const { root, files } = context;
  const writable = files.filter((file) => file.allowFormatWrites);
  if (!writable.length) return;
  // Native ignore patterns are relative to the ignore file's directory.
  const ignorePath = join(root, `.json-quality-write-${randomUUID()}.ignore`);
  let created = false;
  try {
    writeFileSync(
      ignorePath,
      `${STRICT_JSON_GLOBS.join("\n")}\n${writable.map((file) => `!/${file.path}`).join("\n")}\n`,
      { flag: "wx" },
    );
    created = true;
    for (const file of files) {
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
      "normalize",
    ].includes(operation)
  )
    throw new Error(
      "Expected inventory, lint, check-format, check, format, producers or normalize.",
    );
  const context = await inspectJsonInventory(options);
  const { discovered, tracked, linted, formatted, preserved } = context.counts;
  process.stdout.write(
    `JSON inventory: ${discovered} discovered (${tracked} tracked); ${linted} linted; ${formatted} writable; ${preserved} protected.\n`,
  );
  if (operation === "normalize")
    return normalize(context, options?.sourcePaths);
  if (operation === "inventory")
    for (const boundary of context.boundaries)
      process.stdout.write(
        `External JSON boundary: ${boundary.path}: ${boundary.exceptions.map((rule) => rule.reason).join("; ")}\n`,
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
    const operation = process.argv[2];
    if (
      operation !== "normalize" &&
      (process.argv.length < 3 ||
        process.argv.length > 4 ||
        (process.argv[3] && process.argv[3] !== "--require-generated"))
    )
      throw new Error(
        "Expected a JSON quality operation and optional --require-generated.",
      );
    await runJsonQuality(operation, {
      requireGenerated: process.argv[3] === "--require-generated",
      sourcePaths:
        operation === "normalize" ? process.argv.slice(3) : undefined,
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
